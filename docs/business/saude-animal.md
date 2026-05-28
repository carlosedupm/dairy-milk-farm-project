# Saúde animal

Módulo de registo de casos clínicos por animal (`animal_saude`) com CRUD no backend e sincronização automática de `animais.status_saude`.

## Regras

### BR-SAUDE-001 — CRUD por sub-recurso de animal
- **Enunciado**: cada caso de saúde pertence a um animal e é gerido por sub-recurso.
- **Escopo**: animal individual dentro da fazenda do utilizador.
- **Perfis / permissões**: segue matriz existente de `/api/v1/animais/*` (leituras permitidas para perfis com leitura de animais; escritas conforme RBAC atual).
- **Efeito**: bloqueio no servidor para animal/caso inexistente ou fora de escopo.
- **Implementação**:
  - Rotas: `GET|POST /api/v1/animais/:id/saude`, `GET|PUT|DELETE /api/v1/animais/:id/saude/:saudeId`
  - Arquivos: `backend/internal/handlers/animal_saude_handler.go`, `backend/internal/service/animal_saude_service.go`, `backend/internal/repository/animal_saude_repository.go`
- **Estado**: implementado.

### BR-SAUDE-002 — Validação de domínio do caso de saúde
- **Enunciado**: `tipo_caso` e `status` aceitam apenas valores permitidos; `data_fim` não pode ser anterior à `data_inicio`.
- **Escopo**: criação e edição de casos de saúde.
- **Perfis / permissões**: qualquer perfil com permissão de escrita na rota.
- **Efeito**: bloqueio no servidor com erro de validação.
- **Implementação**:
  - Tipos: `TRATAMENTO`, `PREVENTIVO`, `CIRURGIA`, `OUTRO`
  - Status: `ATIVO`, `CONCLUIDO`, `CANCELADO`
  - Arquivos: `backend/internal/models/animal_saude.go`, `backend/internal/service/animal_saude_service.go`
  - Banco: migration `backend/migrations/30_add_animal_saude.up.sql` (`CHECK` + `chk_animal_saude_data_fim`)
- **Estado**: implementado.

### BR-SAUDE-003 — Só animal no rebanho pode receber registo de saúde
- **Enunciado**: o CRUD de saúde exige animal existente e no rebanho operacional.
- **Escopo**: listagem, detalhe, criação, edição e exclusão dos casos.
- **Perfis / permissões**: todos os perfis com acesso à rota; respeita acesso à fazenda.
- **Efeito**: bloqueio no servidor (erro de domínio `ANIMAL_FORA_REBANHO`/não encontrado).
- **Implementação**:
  - Guardas: `ensureAnimalAtivo` + `EnsureAnimalNoRebanho`
  - Arquivo: `backend/internal/service/animal_saude_service.go`
- **Estado**: implementado.

### BR-SAUDE-004 — Sincronização automática do status de saúde do animal
- **Enunciado**: após criar, editar ou excluir caso de saúde, o sistema recalcula `animais.status_saude`.
- **Escopo**: todos os casos ativos (`status=ATIVO`) do animal.
- **Perfis / permissões**: automático no servidor, sem ação manual.
- **Efeito**: atualização de estado persistida no servidor.
- **Regra de cálculo**:
  1. Se existir caso ativo `TRATAMENTO` ou `CIRURGIA` -> `EM_TRATAMENTO`
  2. Senão, se existir qualquer caso ativo -> `DOENTE`
  3. Senão -> `SAUDAVEL`
- **Implementação**:
  - Serviço: `deriveAnimalStatusSaudeFromCasosAtivos` e `syncAnimalStatusSaude`
  - Repositório animal: `UpdateStatusSaude`
  - Arquivos: `backend/internal/service/animal_saude_service.go`, `backend/internal/repository/animal_repository.go`
- **Estado**: implementado.

---

**Última atualização**: 2026-05-28
