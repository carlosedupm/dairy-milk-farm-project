# Regras de negócio — Ciclo do rebanho leiteiro (transversal)

Documento **mestre** do domínio pecuário: como o CeialMilk deve acompanhar a vida da vaca na fazenda, o que já está implementado, lacunas conhecidas e requisitos alvo. Regras por módulo continuam nos ficheiros específicos; aqui ficam invariantes e prioridades **entre** módulos.

**Documentos relacionados**

| Documento | Conteúdo |
|-----------|----------|
| [memory-bank/projectbrief.md](../../memory-bank/projectbrief.md) | Objetivos e fases do projeto |
| [memory-bank/productContext.md](../../memory-bank/productContext.md) | Jornada e princípios de experiência |
| [animais.md](./animais.md) | Busca contextual na home |
| [baixa-rebanho.md](./baixa-rebanho.md) | Saída do rebanho (morte, venda, doação, descarte) |
| [cios.md](./cios.md), [coberturas.md](./coberturas.md) | Detecção e inseminação/monta |
| [leite-restricoes.md](./leite-restricoes.md) | Descarte / laboratório |
| [acessos-perfil.md](./acessos-perfil.md) | Quem pode fazer o quê |

**Implementação transversal (referência)**

- Backend: `backend/internal/service/*_service.go` (cobertura, diagnostico_gestacao, gestacao, parto, secagem, lactacao, producao, restricao_leite, animal, cria).
- Frontend: `frontend/src/app/gestao/*`, `frontend/src/app/animais/[id]/page.tsx`, `frontend/src/components/animais/AnimalSearchPanel.tsx`, `frontend/src/components/dashboard/Dashboard.tsx`.
- Schema: `backend/migrations/12_add_gestao_pecuaria.up.sql` e migrations subsequentes (partos, crias, restricoes_leite, etc.).

---

## Fluxo alvo (visão de negócio)

```
Entrada/Nascimento → Recria → [Cio] → Cobertura → Toque → Gestação confirmada
    → [Secagem] → Parto → Lactação → Produção diária → Restrição leite (se aplicável)
    → Nova cobertura … → Saída do rebanho
```

Crias vivas do parto entram no rebanho como animais (`origem_aquisicao` NASCIDO), ligadas ao parto/cria.

---

### BR-CICLO-001 — Animal como unidade de verdade operacional

- **Enunciado**: Toda decisão no curral refere-se a um **animal identificado** na fazenda ativa; eventos (cio, cobertura, toque, parto, produção, restrição) gravam `animal_id` e `fazenda_id` coerentes.
- **Escopo**: Fazenda; todas as entidades do fluxo acima.
- **Perfis**: conforme módulo (ver [acessos-perfil.md](./acessos-perfil.md)).
- **Efeito**: bloqueio no servidor se animal de outra fazenda ou sexo inválido para o evento.
- **Implementação**: validações em cada `*Service.Create`; `ValidateFazendaAccess` nos handlers.
- **Estado**: **implementado** (por módulo).

### BR-CICLO-002 — Propagação de status reprodutivo por eventos

- **Enunciado**: O campo `animais.status_reprodutivo` deve refletir o **último marco reprodutivo relevante**, atualizado pelo servidor ao registrar:
  - cobertura → `SERVIDA`;
  - toque positivo com `cobertura_id` → `PRENHE` (+ gestação `CONFIRMADA`);
  - toque `NEGATIVO` → `VAZIA`;
  - cio detectado → `VAZIA` (exceto animal já `PRENHE`);
  - parto → `PARIDA`;
  - secagem → `SECA`.
- **Escopo**: Por animal.
- **Efeito**: bloqueio/atualização no servidor; UI exibe rótulo derivado do cadastro.
- **Implementação**: `CoberturaService`, `DiagnosticoGestacaoService`, `CioService`, `PartoService`, `SecagemService` → `AnimalRepository.UpdateStatusReprodutivo`.
- **Nota**: na UI/API de curral, o operador pode informar `classificacao_operacional` (`PRENHA`, `VAZIA`, … — ver [toques.md](./toques.md) BR-TOQUES-006); o servidor deriva `resultado` canônico antes de aplicar as regras acima.
- **Exceção — baixa do rebanho**: a **saída** do animal ([baixa-rebanho.md](./baixa-rebanho.md) BR-BAIXA-008) **não** propaga `status_reprodutivo`; o valor mantém-se como arquivo «estado ao sair».
- **Estado**: **implementado** (toque `INCONCLUSIVO` não altera status; edição manual no cadastro do animal ainda possível).

### BR-CICLO-003 — Gestação confirmada só após toque positivo

- **Enunciado**: Registro em `gestacoes` com `status = CONFIRMADA` apenas após toque `POSITIVO` vinculado a `cobertura_id`; resumo na busca usa esta fonte (não só `PRENHE` no animal).
- **Escopo**: Animal; gestação ativa mais recente por `data_confirmacao`.
- **Efeito**: informativo na UI; criação condicionada no servidor.
- **Implementação**: [animais.md](./animais.md) BR-ANIMAIS-003; `DiagnosticoGestacaoService.Create`.
- **Estado**: **implementado**.

### BR-CICLO-004 — Parto abre lactação e encerra gestação vinculada

- **Enunciado**: Ao registrar parto válido: criar lactação `EM_ANDAMENTO` com `data_inicio` = data do parto; se `gestacao_id` informado, gestação passa a `PARTO_REALIZADO`; primeiro parto pode reclassificar fêmea para `MATRIZ`.
- **Escopo**: Por parto; transação com crias quando `crias[]` no POST.
- **Efeito**: bloqueio/consistência no servidor.
- **Implementação**: `PartoService.applyAfterPartoCreate` / `CreateWithCrias`.
- **Estado**: **implementado**.

### BR-CICLO-005 — Uma lactação ativa por animal (requisito alvo)

- **Enunciado**: Por animal, no máximo **uma** lactação com `data_fim` nula e `status` nulo ou `EM_ANDAMENTO` na fazenda.
- **Escopo**: `lactacoes`; usado também em restrições de leite ([leite-restricoes.md](./leite-restricoes.md) BR-LEITE-005).
- **Efeito**: bloqueio ao abrir segunda lactação; secagem e **parto** encerram a lactação anterior antes de abrir nova (INT-001 / BR-AUDIT-010).
- **Implementação**: `LactacaoRepository.ExistsAtivaNaFazenda`; `EncerrarLactacaoAtiva` no `PartoService`; criação manual bloqueada (`ErrLactacaoAtivaJaExiste`).
- **Estado**: **implementado** — criação manual bloqueada se já houver lactação ativa; secagem encerra lactação (BR-SECAGENS-002).

### BR-CICLO-006 — Secagem encerra lactação ativa

- **Enunciado**: Ao registrar secagem, encerrar a lactação ativa do animal (`data_fim`, status encerrado) e atualizar `status_reprodutivo` para `SECA`.
- **Escopo**: Por secagem; transação única.
- **Efeito**: bloqueio/consistência no servidor; sem lactação ativa a secagem prossegue (pré-parto).
- **Implementação**: `SecagemService.Create`; [secagens.md](./secagens.md) BR-SECAGENS-002; migration `22_close_lactacao_on_seca_animals` para legado.
- **Estado**: **implementado**.

### BR-CICLO-007 — Produção de leite alinhada à lactação

- **Enunciado**: Registro de produção diária exige **lactação ativa na data do registo** (não apenas “existe lactação hoje” com início posterior à data da ordenha).
- **Escopo**: `producao_leite` + `lactacoes`; Create e Update.
- **Efeito**: bloqueio no servidor (400, INT-002); aviso na UI em `/producao/novo`.
- **Implementação**: `ValidateLactacaoAtivaParaProducao`; [producao-leite.md](./producao-leite.md) BR-PRODUCAO-003; [auditoria.md](./auditoria.md) BR-AUDIT-010.
- **Estado**: **implementado**.

### BR-CICLO-008 — Ficha do animal com histórico unificado

- **Enunciado**: Na ficha `/animais/:id`, o utilizador vê **timeline** de eventos reprodutivos, lactação atual, gestação ativa, restrição de leite aberta, resumo de produção e atalhos para a próxima ação esperada.
- **Escopo**: UI + `GET /api/v1/animais/:id/contexto` enriquecido.
- **Efeito**: informativo e navegação.
- **Implementação**: `AnimalCicloService`, `AnimalFichaCiclo`, [animais.md](./animais.md) BR-ANIMAIS-004.
- **Estado**: **implementado**.

### BR-CICLO-009 — Visibilidade gerencial na home

- **Enunciado**: Titular/gerente vê na home indicadores acionáveis: partos previstos em janela configurável, contagem de prenhes, restrições ativas, produção do dia/semana.
- **Escopo**: Fazenda ativa; oculto para FUNCIONARIO em modo restrito na UI.
- **Efeito**: informativo com **drill-down** — cada KPI do painel pecuário navega para a lista/fonte correspondente (gestações `CONFIRMADA`, âncora de restrições na home, produção filtrada por período); partos previstos com link à ficha do animal.
- **Implementação**: `GET /api/v1/fazendas/:id/resumo-pecuario`, `PecuarioResumoHomePanel`, `ResumoKpiTile`, `lib/resumoPecuarioLinks.ts`; [gestacoes.md](./gestacoes.md) BR-GESTACOES-003 e BR-GESTACOES-004.
- **Estado**: **implementado**.

### BR-CICLO-011 — Saída do rebanho (baixa)

- **Enunciado**: O fim da permanência do animal na exploração regista-se como **baixa** (`data_saida` + `motivo_saida`), com efeitos no ciclo (lactação, gestação confirmada, restrição de leite) e exclusão das operações correntes. Detalhe em [baixa-rebanho.md](./baixa-rebanho.md) (BR-BAIXA-001 a BR-BAIXA-010). Nas **listagens de Gestão**, o histórico permanece visível (BR-BAIXA-009); registos da fêmea baixada são só consulta — sem editar/excluir (BR-BAIXA-010).
- **Escopo**: Transversal; animal como unidade.
- **Efeito**: bloqueio de novos eventos; listagens operacionais por defeito só animais no rebanho.
- **Implementação**: `AnimalBaixaService`, `POST /api/v1/animais/:id/baixa`, `POST .../baixa/reverter`.
- **Estado**: **implementado**.

### BR-CICLO-010 — Sincronização documentação ↔ código

- **Enunciado**: Qualquer mudança de comportamento de produto no ciclo do rebanho atualiza este ficheiro (se transversal) e o módulo em `docs/business/*.md` no **mesmo PR/ciclo**, com estado da regra atualizado.
- **Escopo**: Processo de engenharia.
- **Efeito**: critério de aceite de entrega.
- **Implementação**: [AGENTS.md](../../AGENTS.md), `.cursor/rules/documentation-maintenance.mdc`.
- **Estado**: **implementado** (processo e catálogo dos módulos do ciclo pecuário na Fase 2).

### BR-CICLO-012 — Eventos do ciclo não podem ser futuros

- **Enunciado**: Ao registar ou alterar marcos do ciclo (cio, cobertura, toque, parto, secagem, início de lactação, produção, restrição de leite) e ao cadastrar **baixa** ou datas de **nascimento/entrada** do animal, a data (ou data/hora) do evento **não pode ser posterior a hoje** (data civil local no servidor; data/hora ≤ agora para campos com hora).
- **Escopo**: Escritas de ciclo e cadastro animal; integrações M2M passam pelos mesmos services.
- **Perfis**: conforme módulo.
- **Efeito**: bloqueio no servidor (400) com código **TMP-001** em `details.conformidade`; UI limita pickers com `maxDate` / `max` agora (`frontend/src/lib/date-limits.ts`).
- **Implementação**: `backend/internal/service/ciclo_integridade_temporal.go` (`ValidateDataNaoFutura`, `ValidateDateTimeNaoFuturo`); formulários em gestão, produção, baixa, animal, restrições.
- **Estado**: **implementado**.

### BR-CICLO-013 — Evento não anterior à entrada ou nascimento

- **Enunciado**: A data do evento deve ser **≥ `data_entrada`** quando preenchida e **≥ `data_nascimento`** quando preenchida. No cadastro do animal, `data_nascimento` e `data_entrada` não podem ser futuras; se ambas existirem, `data_nascimento` ≤ `data_entrada`.
- **Escopo**: Por animal; todas as escritas de ciclo listadas em BR-CICLO-012; baixa exige `data_saida` ≥ `data_entrada` (já em BR-BAIXA-001).
- **Efeito**: bloqueio no servidor com **TMP-002**.
- **Implementação**: `ValidateEventoAposReferenciaAnimal`, `ValidateAnimalDatasCadastro`; `AnimalBaixaService.ValidateBaixaRequest`.
- **Estado**: **implementado**.

### BR-CICLO-014 — Cronologia entre marcos vinculados

- **Enunciado**: Quando existir vínculo explícito entre registos, a data do evento posterior não pode ser **anterior** à do antecedente: cobertura ≥ cio (`cio_id`); toque ≥ cobertura (`cobertura_id`); parto ≥ confirmação da gestação (`gestacao_id`); secagem ≥ início da lactação ativa; produção ≤ `data_fim` da lactação quando encerrada (complementa INT-002 / BR-CICLO-007).
- **Escopo**: Por vínculo opcional em cada entidade.
- **Efeito**: bloqueio no servidor com **TMP-003** a **TMP-006** conforme o par de entidades.
- **Implementação**: `ValidateCoberturaAposCio`, `ValidateToqueAposCobertura`, `ValidatePartoAposGestacao`, `ValidateSecagemAposInicioLactacao`, `ValidateProducaoDentroLactacao`; chamadas nos `*Service` Create/Update.
- **Estado**: **implementado**.

---

## Matriz de aderência atual (resumo)

| Etapa | Estado produto | Notas |
|-------|----------------|-------|
| Cadastro / origem / cria no rebanho | Implementado | Parto → animal automático |
| Cio | Implementado | Atualiza `VAZIA` (exceto `PRENHE`) |
| Cobertura → servida | Implementado | [coberturas.md](./coberturas.md) |
| Toque → gestação | Implementado | FUNCIONARIO com toques (BR-ACESSO-015) |
| Gestação (lista) | Implementado | Partos previstos na home (BR-CICLO-009) |
| Secagem | Implementado | Encerra lactação ativa na mesma transação |
| Parto + lactação | Implementado | |
| Produção | Implementado | Lactação ativa obrigatória (BR-CICLO-007); FUNCIONARIO POST |
| Restrição leite | Implementado | [leite-restricoes.md](./leite-restricoes.md) |
| Saúde (vacinas/tratamentos) | Planejado | Só `status_saude` |
| Dashboard pecuário | Implementado | KPIs acionáveis (`ResumoKpiTile`, BR-GESTACOES-004) |
| Ficha animal (timeline) | Implementado | BR-CICLO-008 |
| Saída do rebanho (baixa) | Implementado | [baixa-rebanho.md](./baixa-rebanho.md) BR-CICLO-011; rótulos Gestão BR-BAIXA-009 |
| Validação temporal (escrita) | Implementado | BR-CICLO-012–014; TMP-001–006; ver [auditoria.md](./auditoria.md) BR-AUDIT-010 |

---

## Backlog de requisitos (próximos)

1. Paginação da timeline na ficha do animal  
3. Coluna `lactacao_id` em produção (relatórios por lactação) — opcional  
4. Módulo saúde (Fase 3)  

---

**Última atualização**: 2026-05-25 (validações temporais — BR-CICLO-012 a BR-CICLO-014)
