# Regras de negócio — Restrições de leite (descarte / laboratório)

Operação em que o leite do animal **não deve ir para o tanque** (ordenha em balde / descarte) até retorno do laboratório do laticínio — por exemplo corda no pescoço (antibiótico), sintomas na ordenha ou amostra pós-parto.

**Implementação principal**

- Banco: migration `backend/migrations/20_add_restricoes_leite.up.sql` — tabela `restricoes_leite`, índice único parcial `uq_restricoes_leite_animal_aguardando` (no máximo um `AGUARDANDO_LAB` por `animal_id`).
- Backend: `backend/internal/models/restricao_leite.go`, `backend/internal/repository/restricao_leite_repository.go`, `backend/internal/repository/lactacao_repository.go` (`ExistsAtivaNaFazenda`), `backend/internal/repository/animal_repository.go` (`ListEmLactacaoByFazendaID`), `backend/internal/service/restricao_leite_service.go`, `backend/internal/handlers/restricao_leite_handler.go`, `backend/internal/handlers/animal_handler.go` (`GET .../animais/em-lactacao`), rotas em `backend/cmd/api/main.go`; contexto do animal em `animal_handler.go` (`GET /api/v1/animais/:id/contexto`).
- Frontend: `frontend/src/services/restricoesLeite.ts`, `frontend/src/components/leite/RestricoesLeiteHomePanel.tsx`, home `frontend/src/app/page.tsx`; alerta na busca inteligente em `frontend/src/components/animais/AnimalSearchHome.tsx`.
- RBAC API (FUNCIONARIO): `backend/internal/auth/perfil_access.go` — `GET|POST` em `/api/v1/fazendas/:id/restricoes-leite` e `/ativas`; `GET` em `/api/v1/fazendas/:id/animais/em-lactacao` (mesma whitelist que animais por fazenda).

---

### BR-LEITE-005 — Apenas animais em lactação ativa

- **Enunciado**: Na abertura de episódio de descarte, só podem ser escolhidos animais com **lactação ativa** na fazenda: registro em `lactacoes` com `data_fim` nula e `status` nulo ou `EM_ANDAMENTO`. O `POST` de restrição recusa animal fora desse critério.
- **Escopo**: Fazenda ativa; alinhado ao módulo de lactações (`lactacoes`).
- **Perfis / permissões**: igual ao registro de restrição (todos com acesso à fazenda).
- **Efeito**: bloqueio no servidor (`ErrRestricaoLeiteAnimalSemLactacao` → validação 400); lista do formulário via `GET /api/v1/fazendas/:id/animais/em-lactacao`.
- **Implementação**: `AnimalRepository.ListEmLactacaoByFazendaID`, `LactacaoRepository.ExistsAtivaNaFazenda`, `RestricaoLeiteService.Create`; UI `RestricoesLeiteHomePanel` + `listEmLactacaoByFazenda` em `frontend/src/services/animais.ts`.
- **Estado**: implementado.

---

- **Enunciado**: Enquanto existir uma restrição com status `AGUARDANDO_LAB` para um animal, não é permitido abrir outra para o mesmo animal.
- **Escopo**: Por animal (independente da fazenda no vínculo; `fazenda_id` + `animal_id` alinhados na criação).
- **Perfis / permissões**: qualquer usuário com acesso à fazenda pode tentar registrar (`POST`).
- **Efeito**: bloqueio no servidor (constraint única parcial + resposta 409 em duplicidade).
- **Implementação**: migration `20_add_restricoes_leite.up.sql`; `RestricaoLeiteService.Create` mapeia violação `23505` para mensagem amigável.
- **Estado**: implementado.

### BR-LEITE-002 — Listagem ativa na home e leitura por fazenda

- **Enunciado**: Na fazenda ativa, todos os animais com restrição `AGUARDANDO_LAB` devem aparecer num painel na **home** (`/`), com identificação, motivo, data de início e observação.
- **Escopo**: Fazenda vinculada ao usuário; filtro `status = AGUARDANDO_LAB`.
- **Perfis / permissões**: qualquer perfil com acesso à home e à fazenda (inclui **FUNCIONARIO**).
- **Efeito**: informativo na UI; dados servidos por `GET /api/v1/fazendas/:id/restricoes-leite/ativas` com `ValidateFazendaAccess`.
- **Estado**: implementado.

### BR-LEITE-003 — Registrar vs liberar após laboratório

- **Enunciado**: Qualquer usuário com acesso à fazenda pode **registrar** um novo episódio (`POST .../restricoes-leite`). Apenas perfis **não FUNCIONARIO** (USER, GERENTE, GESTAO, PROPRIETARIO, ADMIN, DEVELOPER) podem **liberar** o episódio após retorno do laboratório (`PATCH .../restricoes-leite/:restricaoId/liberar`), encerrando com status `LIBERADO` e preservando histórico.
- **Escopo**: Mesma fazenda da restrição; `liberado_em` opcional (default data atual no servidor).
- **Efeito**: bloqueio no servidor (403 para FUNCIONARIO em liberar); registro mantido após liberação.
- **Implementação**: `PodeLiberarRestricaoLeite` em `backend/internal/models/restricao_leite.go`; handler `RestricaoLeiteHandler.Liberar`.
- **Estado**: implementado.

### BR-LEITE-004 — Contexto do animal na busca inteligente

- **Enunciado**: Se o animal tiver restrição ativa (`AGUARDANDO_LAB`), o endpoint de contexto deve incluir o bloco `restricao_leite_ativa` para a UI destacar na busca da home.
- **Escopo**: `GET /api/v1/animais/:id/contexto` com mesmo controle de acesso do animal.
- **Efeito**: informativo na UI.
- **Implementação**: `AnimalHandler.GetContextoByID` + `RestricaoLeiteService.GetAtivaByAnimalID`.
- **Estado**: implementado.

---

**Última atualização**: 2026-05-12 (BR-LEITE-003: inclusão de PROPRIETARIO em liberar)
