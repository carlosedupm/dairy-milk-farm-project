# Regras de negócio — Auditoria e rastreabilidade

Rastreio de **quem persistiu** cada evento do ciclo pecuário e verificação de **conformidade** dos dados com as regras `BR-*`.

**Implementação principal**

- Migration ciclo/leite: `backend/migrations/23_add_auditoria_usuario_ciclo.up.sql` (`created_by`, `liberado_por`).
- Migration animais: `backend/migrations/24_add_auditoria_animais.up.sql` (`animais.created_by`); baixa: `backend/migrations/28_add_auditoria_baixa_animais.up.sql` (`baixa_registrado_por`, `baixa_revertido_por`).
- Utilizador autenticado: `handlers.GetActorUserID` ← JWT `user_id`.
- Conformidade: `backend/internal/service/conformidade_service.go`, `GET /api/v1/fazendas/:id/auditoria/conformidade`.
- Referência de padrão maduro: módulo Folgas (`created_by`, `folgas_alteracoes`).

---

### BR-AUDIT-001 — Escrita identifica o utilizador

- **Enunciado**: Ao criar registos de ciclo pecuário, leite e **cadastro de animal** (cio, cobertura, toque, parto, secagem, lactação automática no parto, produção, restrição de leite, **animal**), o servidor grava `created_by` (ou `usuario_id` em cios) com o ID do utilizador autenticado, **sem** aceitar esse campo no body do cliente. Inclui criação via **assistente** (texto e Live) e bezerra/bezerro gerados no parto (herdam `parto.created_by`). A **baixa do rebanho** usa colunas dedicadas — ver BR-AUDIT-008.
- **Escopo**: Fazenda; entidades das migrations 23 e 24.
- **Perfis**: conforme módulo (ex.: FUNCIONARIO em toques/produção — BR-ACESSO-015).
- **Efeito**: bloqueio implícito (sem auth não há escrita); rastreio em banco.
- **Implementação**: handlers de gestão, produção e restrições; repositórios com coluna `created_by`.
- **Estado**: implementado.

### BR-AUDIT-002 — Liberação de restrição de leite

- **Enunciado**: `PATCH .../restricoes-leite/:id/liberar` grava `liberado_por` com o utilizador autenticado (perfis autorizados em `PodeLiberarRestricaoLeite`).
- **Efeito**: bloqueio de perfil; rastreio de quem liberou após laboratório.
- **Implementação**: `RestricaoLeiteService.Liberar`, `RestricaoLeiteRepository.Liberar`.
- **Estado**: implementado.

### BR-AUDIT-003 — Relatório de conformidade por fazenda

- **Enunciado**: Gestão pode consultar anomalias de integridade (dados que violam regras transversais) via API, com código, animal, severidade e descrição.
- **Escopo**: Fazenda ativa; leitura apenas.
- **Perfis**: acesso à fazenda (vínculo ou ADMIN/DEVELOPER/GESTAO conforme `ValidateFazendaAccessOrGestao`); **não** exposto a FUNCIONARIO na UI (evolução futura).
- **Efeito**: informativo; não altera dados automaticamente.
- **Checks (dois âmbitos)**:
  - **Rebanho ativo** (INT-001 a INT-006): só animais com `data_saida` nula ou futura — ver BR-AUDIT-009.
  - **Pós-baixa** (INT-007): animal com `data_saida` passada e ciclo ainda aberto (BR-BAIXA-003 / reversão parcial).
- Detalhe: INT-001 (múltiplas lactações ativas), INT-002 (produção sem lactação), INT-003 (gestação sem toque+), INT-004 (restrição sem lactação), INT-005 (PRENHE sem gestação), INT-006 (toque+ sem cobertura), INT-007 (baixa incompleta).
- **Implementação**: `ConformidadeService.ListByFazenda`, rota `GET /api/v1/fazendas/:id/auditoria/conformidade`; UI `ConformidadeHomePanel` na home (`frontend/src/components/dashboard/ConformidadeHomePanel.tsx`), serviço `frontend/src/services/auditoria.ts`; oculto para `FUNCIONARIO` e `USER` (`showConformidadePanelForPerfil` em `appAccess.ts`).
- **Estado**: implementado.

### BR-AUDIT-006 — Exibição de «Registado por» na ficha do animal

- **Enunciado**: Na ficha `/animais/:id`, o histórico do ciclo e o cadastro do animal mostram o nome do utilizador que registou o evento, quando `created_by` / `usuario_id` estiver preenchido.
- **Escopo**: Timeline em `GET /api/v1/animais/:id/contexto` (`registrado_por` por item); cadastro com `registrado_por_cadastro` quando `animais.created_by` não for nulo.
- **Perfis**: quem pode ver a ficha do animal.
- **Efeito**: informativo.
- **Implementação**: `AnimalCicloService.enrichRegistradoPor`, repositórios `GetByAnimalID` com `created_by`; `AnimalFichaCiclo.tsx`.
- **Estado**: implementado.

### BR-AUDIT-004 — Logs técnicos vs auditoria de domínio

- **Enunciado**: Correlation ID e logs JSON (`X-Correlation-ID`) complementam suporte técnico; a **fonte de verdade** para «quem registrou» no produto é a coluna `created_by` / `usuario_id` na entidade.
- **Estado**: implementado (processo).

### BR-AUDIT-005 — Cadastro de animal identifica o utilizador

- **Enunciado**: `POST /api/v1/animais` e intents do assistente `cadastrar_animal` gravam `animais.created_by` com o utilizador autenticado (JWT). O campo **não** é aceito no body JSON nem no payload do assistente.
- **Escopo**: Fazenda; criação manual, assistente texto/Live e animal gerado no parto (via `parto.created_by`).
- **Perfis**: conforme módulo animais / assistente.
- **Efeito**: rastreio em banco; registos anteriores à migration 24 permanecem com `created_by` NULL.
- **Implementação**: `AnimalHandler.Create` + `SetCreatedBy`; `AssistenteService` / `AssistenteLiveService`; `CriaService.insertCriaVivaComAnimalGeradoTx`; migration 24.
- **Integrações API futuras**: reutilizar os mesmos handlers/services com token que carregue `user_id` (utilizador real ou conta de serviço); não expor `created_by` em DTOs de entrada.
- **Estado**: implementado.

---

### BR-AUDIT-008 — Baixa do rebanho identifica o utilizador

- **Enunciado**: `POST /api/v1/animais/:id/baixa` grava `baixa_registrado_por` com o utilizador autenticado (JWT). `POST .../baixa/reverter` grava `baixa_revertido_por` e limpa `baixa_registrado_por` junto com os campos de saída. Campos **não** são aceites no body.
- **Escopo**: Por animal; UI e `GET .../contexto`.
- **Efeito**: rastreio em banco; timeline tipo **BAIXA** com `registrado_por`; `saida_resumo.registrado_por` na ficha.
- **Implementação**: `AnimalBaixaService`, `AnimalRepository.UpdateSaidaTx` / `ClearSaidaTx`, `GetActorUserID`, `AnimalCicloService.PrependBaixaTimeline`; migration 28.
- **Estado**: implementado.

### BR-AUDIT-009 — Conformidade operacional vs animais baixados

- **Enunciado**: Os checks **INT-001 a INT-006** aplicam-se apenas a animais **no rebanho** (`data_saida IS NULL OR data_saida > CURRENT_DATE`), alinhado a BR-BAIXA-002. Animais fora do rebanho **não** entram em INT-005 (ex.: PRENHE após baixa com gestação passada a PERDA — arquivo histórico, não anomalia operacional). O check **INT-007** é o único voltado a baixados: lactação, gestação `CONFIRMADA` ou restrição `AGUARDANDO_LAB` ainda aberta após baixa.
- **Escopo**: `ConformidadeService.ListByFazenda`; constante partilhada `repository.SQLNoRebanho`.
- **Efeito**: painel de conformidade acionável para o curral; sem falsos positivos pós-baixa.
- **Implementação**: `conformidade_service.go` (filtro em cada query INT-001–006).
- **Estado**: implementado.

### BR-AUDIT-007 — Conformidade: animal baixado com ciclo aberto (INT-007)

- **Enunciado**: O relatório de conformidade inclui **INT-007** quando um animal tem `data_saida <= hoje` mas ainda possui lactação ativa, gestação `CONFIRMADA` ou restrição de leite `AGUARDANDO_LAB` (dados legados ou reversão parcial de baixa).
- **Escopo**: Fazenda; leitura apenas (BR-AUDIT-003).
- **Efeito**: informativo; orienta correção manual.
- **Implementação**: `ConformidadeService` — consulta INT-007.
- **Estado**: implementado.

---

**Última atualização**: 2026-05-24 (BR-AUDIT-009 — conformidade só no rebanho ativo)
