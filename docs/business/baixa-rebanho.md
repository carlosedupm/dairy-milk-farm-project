# Regras de negócio — Baixa do rebanho

Registo formal de **saída do animal** da exploração (morte, venda, doação, descarte), com efeitos no ciclo pecuário e visibilidade operacional.

**Implementação principal**

- Backend: `backend/internal/service/animal_baixa_service.go`, `backend/internal/service/lactacao_encerramento.go`, `backend/internal/handlers/animal_handler.go` (`POST .../baixa`, `POST .../baixa/reverter`).
- Frontend: `frontend/src/app/animais/baixa/page.tsx`, `frontend/src/components/animais/RegistrarBaixaForm.tsx`.
- Migrations: `27_add_observacao_saida_animais` (`observacao_saida`); `28_add_auditoria_baixa_animais` (`baixa_registrado_por`, `baixa_revertido_por` — BR-AUDIT-008).
- Modelo: `backend/internal/models/animal.go` (`MotivoSaida*`).

---

### BR-BAIXA-001 — Dados obrigatórios da baixa

- **Enunciado**: Registrar baixa exige `data_saida` e `motivo_saida` válido (`VENDA`, `MORTE`, `DESCARTE`, `DOACAO`). Se `data_entrada` estiver preenchida, `data_saida` não pode ser anterior.
- **Escopo**: Por animal na fazenda.
- **Perfis**: conforme BR-BAIXA-006.
- **Efeito**: bloqueio no servidor (400).
- **Implementação**: `AnimalBaixaService.RegistrarBaixa`.
- **Estado**: implementado.

### BR-BAIXA-002 — Animal fora do rebanho

- **Enunciado**: Animal com `data_saida` preenchida e `data_saida <= CURRENT_DATE` está **fora do rebanho**. Por defeito, listagens operacionais, `AnimalSelect`, busca contextual e `proximas_acoes` excluem esses animais. Filtro explícito `no_rebanho=false` inclui todos.
- **Escopo**: Fazenda; listagens e seletores.
- **Efeito**: exclusão em queries; UI com filtro Ativos / Com baixa / Todos.
- **Implementação**: `AnimalListFilters.SomenteNoRebanho`, `ListEmLactacaoByFazendaID`, `SearchByIdentificacao` (escopo fazenda).
- **Estado**: implementado.

### BR-BAIXA-003 — Efeitos transacionais na baixa

- **Enunciado**: Ao registrar baixa, numa única transação: (1) grava `data_saida`, `motivo_saida`, `observacao_saida` opcional; (2) encerra lactação ativa (`data_fim`, status encerrado); (3) gestação `CONFIRMADA` → `PERDA`; (4) restrição de leite `AGUARDANDO_LAB` → `CANCELADO`.
- **Escopo**: Por animal.
- **Efeito**: bloqueio/consistência no servidor.
- **Implementação**: `AnimalBaixaService.RegistrarBaixa`; `EncerrarLactacaoAtivaTx`; `GestacaoRepository.CloseConfirmadaComoPerdaTx`; `RestricaoLeiteRepository.CancelAguardandoByAnimalTx`.
- **Estado**: implementado.

### BR-BAIXA-004 — Histórico e consulta

- **Enunciado**: Baixa não apaga o animal nem o histórico. Ficha `/animais/:id` consultável com badge de saída; `GET .../contexto` expõe `fora_do_rebanho` e `saida_resumo` (inclui **quem registou** a baixa quando disponível); timeline inclui evento **Baixa** com «Registado por» (BR-AUDIT-008).
- **Escopo**: UI + API contexto.
- **Efeito**: informativo; sem novos registos operacionais na ficha baixada.
- **Implementação**: `AnimalCicloService.PrependBaixaTimeline`, `AnimalHandler.GetContextoByID`.
- **Estado**: implementado.

### BR-BAIXA-005 — Reversão da baixa

- **Enunciado**: Gestão/titular pode reverter baixa (`POST .../baixa/reverter`), limpando `data_saida`, `motivo_saida` e `observacao_saida`. **Não** reabre automaticamente lactação, gestação ou restrição — o utilizador deve corrigir manualmente se necessário; INT-007 pode sinalizar inconsistências.
- **Escopo**: Perfis com API completa (não FUNCIONARIO).
- **Efeito**: bloqueio de perfil; limpeza de campos de saída.
- **Implementação**: `AnimalBaixaService.ReverterBaixa`.
- **Estado**: implementado.

### BR-BAIXA-006 — Permissões por motivo

- **Enunciado**: `FUNCIONARIO` só pode registrar baixa com motivo `MORTE`. Demais motivos: `GERENTE`, `GESTAO`, `PROPRIETARIO`, `ADMIN`, `DEVELOPER`. Reversão: apenas perfis com API completa (não FUNCIONARIO).
- **Escopo**: API e UI.
- **Efeito**: bloqueio 403/400.
- **Implementação**: `AnimalBaixaService.RegistrarBaixa`; `perfil_access.go`; `appAccess.ts` — ver BR-ACESSO-016.
- **Estado**: implementado.

### BR-BAIXA-008 — Estado reprodutivo na baixa (arquivo)

- **Enunciado**: Registrar ou reverter baixa **não** altera `animais.status_reprodutivo` (ex.: PRENHE permanece como registo do último marco reprodutivo ao sair). A saída do rebanho **não** é marco de BR-CICLO-002. A UI em animal baixado pode rotular o campo como **«Estado reprodutivo ao sair»**. O painel de conformidade **não** aplica INT-001 a INT-006 a animais fora do rebanho (BR-AUDIT-009).
- **Escopo**: Baixa, reversão v1, ficha e conformidade.
- **Efeito**: histórico preservado; INT-005 não dispara para baixados após gestação → PERDA na TX.
- **Implementação**: `AnimalBaixaService` (sem `UpdateStatusReprodutivo`); `ConformidadeService` + `SQLNoRebanho`.
- **Estado**: implementado.

### BR-BAIXA-007 — Bloqueio de novos eventos

- **Enunciado**: Animal fora do rebanho não pode receber **novos** registos de produção, cio, cobertura, toque, parto, secagem, cria em parto existente nem abertura de restrição de leite.
- **Escopo**: Serviços de ciclo e produção.
- **Efeito**: bloqueio 400 (`ANIMAL_FORA_REBANHO`).
- **Implementação**: `EnsureAnimalNoRebanho` / `EnsureAnimalIDNoRebanho` em `animal_rebanho_guard.go`; chamadas nos `*Service.Create` e em `CriaService.Create` (matriz do parto).
- **Estado**: implementado.

### BR-BAIXA-010 — Histórico do ciclo em Gestão (só consulta)

- **Enunciado**: Registos históricos de cio, cobertura e parto cuja **fêmea** está fora do rebanho **não** podem ser editados nem excluídos pela UI de Gestão nem pela API (`PUT`/`DELETE`). A listagem mantém a linha com identificação e badge «Baixado»; a ação disponível é **Ver ficha** do animal. Para corrigir o ciclo após erro de baixa, usar **Reverter baixa** (BR-BAIXA-005) e depois editar o necessário.
- **Escopo**: Gestão (cios, coberturas, partos) + API correspondente.
- **Perfis**: todos com acesso às listagens (bloqueio uniforme).
- **Efeito**: bloqueio 400 (`ANIMAL_FORA_REBANHO`) no servidor; UI sem Editar/Excluir e páginas `/gestao/*/editar` bloqueadas com mensagem informativa.
- **Implementação**: `CioService`/`CoberturaService`/`PartoService` Update e Delete; `RespondIfAnimalForaRebanho` nos handlers; `GestaoRegistroRowActions`, `GestaoEditarBloqueadoGuard`, `gestaoRebanhoUtils.ts`.
- **Estado**: implementado.

### BR-BAIXA-009 — Rótulos nas listagens de Gestão (histórico preservado)

- **Enunciado**: As listagens de Gestão (cios, coberturas, toques, gestações, partos, secagens, lactações) e a listagem de produção com coluna animal **mantêm** linhas históricas de animais baixados. O rótulo usa a identificação do cadastro completo da fazenda (`no_rebanho=false`) e exibe badge informativo **«Baixado»** quando `data_saida` efetiva. Formulários «Novo», edição operacional e filtros (`AnimalSelect` no toolbar de coberturas) continuam a listar **apenas** animais no rebanho ativo.
- **Escopo**: UI Gestão + Produção; cache TanStack Query por fazenda.
- **Perfis**: todos com acesso às respetivas listagens.
- **Efeito**: informativo na listagem; edição/exclusão de registos antigos bloqueada (BR-BAIXA-010).
- **Implementação**: `useGestaoAnimaisByIdMap` (lista `todos` + GET por ID) e `useGestaoAnimaisCacheRefresh` em `useAnimaisMap.ts`; `isAnimalForaDoRebanho` / `dataSaidaCivilISO` em `services/animais.ts` (data civil local, inclui baixa no dia corrente); `AnimalGestaoLabel.tsx`; tabelas em `components/gestao/*Table.tsx` e `ProducaoTable.tsx`; invalidação após baixa/reversão em `RegistrarBaixaForm.tsx` e ficha do animal.
- **Estado**: implementado.

---

**Última atualização**: 2026-05-25 (BR-BAIXA-009 — data civil no badge)
