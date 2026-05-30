# Saúde animal

Módulo de registo de casos clínicos por animal (`animal_saude`) com CRUD no backend e sincronização automática de `animais.status_saude`.

**Implementação principal**

- Banco: migration `backend/migrations/30_add_animal_saude.up.sql` — tabela `animal_saude`, coluna `animais.status_saude`.
- Backend: `backend/internal/models/animal_saude.go`, `backend/internal/service/animal_saude_service.go`, `backend/internal/repository/animal_saude_repository.go`, `backend/internal/handlers/animal_saude_handler.go`.
- Frontend: `frontend/src/services/animalSaude.ts`, `frontend/src/components/animais/AnimalSaudeForm.tsx`, `AnimalSaudeList.tsx`, rotas `/animais/:id/saude`, `/novo`, `/[saudeId]/editar`.
- Timeline: `appendCasosSaudeToTimeline` em `backend/internal/service/animal_ciclo_service.go`; UI `AnimalFichaCiclo.tsx`.

---

## Regras

### BR-SAUDE-001 — CRUD por sub-recurso de animal

- **Enunciado**: cada caso de saúde pertence a um animal e é gerido por sub-recurso.
- **Escopo**: animal individual dentro da fazenda do utilizador.
- **Perfis / permissões**:
  - `ADMIN`, `DEVELOPER`, `GESTAO`, `PROPRIETARIO`, `GERENTE`: CRUD completo (`GET|POST|PUT|DELETE`).
  - `FUNCIONARIO`: `GET` (listagem e detalhe) + `POST` (novo caso); `PUT` e `DELETE` → 403.
  - `USER`: sem acesso (403 em qualquer método).
- **Efeito**: bloqueio no servidor para animal/caso inexistente, fora de escopo ou perfil sem permissão de escrita.
- **Implementação**:
  - Rotas: `GET|POST /api/v1/animais/:id/saude`, `GET|PUT|DELETE /api/v1/animais/:id/saude/:saudeId`
  - RBAC API: `backend/internal/auth/perfil_access.go` (`funcionarioAnimaisSaudePath`); ver [acessos-perfil.md](./acessos-perfil.md) — BR-ACESSO-017.
  - RBAC UI: `frontend/src/config/appAccess.ts` (`isFuncionarioAllowedPath`, `canCriarRegistroSaude`, `canEditarRegistroSaude`, `canExcluirRegistroSaude`).
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
  - Banco: migration `30_add_animal_saude.up.sql` (`CHECK` + `chk_animal_saude_data_fim`)
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
- **Regra de cálculo** (`deriveAnimalStatusSaudeFromCasosAtivos`):
  1. Se existir caso ativo `TRATAMENTO` ou `CIRURGIA` → `EM_TRATAMENTO`
  2. Senão, se existir qualquer caso ativo → `DOENTE`
  3. Senão → `SAUDAVEL`
- **Implementação**:
  - Serviço: `syncAnimalStatusSaude` → `ListAtivosByAnimalID` → `UpdateStatusSaude`
  - Arquivos: `backend/internal/service/animal_saude_service.go`, `backend/internal/repository/animal_repository.go`
- **Estado**: implementado.

#### Fluxo de sincronização

```
Create / Update / Delete (AnimalSaudeService)
        │
        ▼
ListAtivosByAnimalID (status = ATIVO)
        │
        ▼
deriveAnimalStatusSaudeFromCasosAtivos
        │
        ▼
UpdateStatusSaude → animais.status_saude
```

- **Disparadores**: `Create`, `Update` e `Delete` em `AnimalSaudeService` chamam `syncAnimalStatusSaude` após persistir o caso.
- **Input**: apenas casos com `status = ATIVO`; casos `CONCLUIDO` ou `CANCELADO` **não** entram no cálculo.
- **Output**: `animais.status_saude` atualizado via `AnimalRepository.UpdateStatusSaude`.
- **Nuance — cadastro manual**: `status_saude` pode ser definido no cadastro/edição do animal (`AnimalService`, assistente virtual). Esse valor permanece até o **próximo** CRUD de caso de saúde, que **recalcula e sobrescreve** o campo. Não há sync bidirecional hoje.

### BR-SAUDE-005 — Casos de saúde na timeline da ficha

- **Enunciado**: cada caso de saúde do animal aparece na timeline do `GET /api/v1/animais/:id/contexto`, intercalado por data com eventos de ciclo.
- **Escopo**: ficha `/animais/:id`; um evento por caso na `data_inicio` (sem evento duplicado em `data_fim`).
- **Perfis / permissões**: quem pode consultar o contexto do animal.
- **Efeito**: informativo na timeline (`tipo=SAUDE`); link para edição na UI apenas para perfis com `canEditarRegistroSaude`.
- **Implementação**:
  - Backend: `appendCasosSaudeToTimeline` em `backend/internal/service/animal_ciclo_service.go` (`BuildTimeline`)
  - Frontend: `frontend/src/components/animais/AnimalFichaCiclo.tsx` (ícone Pill, badge «Saúde»)
- **Estado**: implementado.

---

## Cenários de exemplo

| # | Acção | Estado dos casos ATIVOS | `animais.status_saude` resultante | Efeito colateral |
|---|-------|-------------------------|-----------------------------------|------------------|
| 1 | POST caso `TRATAMENTO` + `ATIVO` | 1× TRATAMENTO | `EM_TRATAMENTO` | — |
| 2 | PUT `status=CONCLUIDO` no tratamento (sem outros ATIVOS) | nenhum | `SAUDAVEL` | Auto-resolve alerta `TRATAMENTO_VENCIDO` — [BR-ALERTA-010](./alertas.md) |
| 3 | POST caso `PREVENTIVO` + `ATIVO` (sem TRATAMENTO/CIRURGIA) | 1× PREVENTIVO | `DOENTE` | — |
| 4 | TRATAMENTO + PREVENTIVO ambos ATIVOS | 2 casos | `EM_TRATAMENTO` | TRATAMENTO/CIRURGIA têm prioridade sobre outros tipos |
| 5 | PUT `status=CANCELADO` no único caso ATIVO | nenhum | `SAUDAVEL` | Caso cancelado deixa de contar no cálculo |
| 6 | DELETE do último caso ATIVO | nenhum | `SAUDAVEL` | — |

**Alerta de tratamento vencido**: caso `TRATAMENTO` + `ATIVO` + `data_fim IS NULL` com `data_inicio` há mais de 14 dias gera alerta `TRATAMENTO_VENCIDO` na geração diária — ver [alertas.md](./alertas.md) BR-ALERTA-008.

---

## Referências cruzadas

| Regra | Relação |
|-------|---------|
| [BR-CICLO-005](./ciclo-rebanho.md) | **Independente** — saúde não altera lactações ativas |
| [BR-CICLO-007](./ciclo-rebanho.md) | **Independente** — produção de leite não exige `SAUDAVEL` |
| [BR-CICLO-008](./ciclo-rebanho.md) / BR-SAUDE-005 | Timeline unificada na ficha (`tipo=SAUDE`) |
| [BR-BAIXA-002](./baixa-rebanho.md) / BR-SAUDE-003 | CRUD de saúde só com animal no rebanho |
| [BR-ALERTA-008](./alertas.md) / [BR-ALERTA-010](./alertas.md) | Tratamento vencido (>14d) → alerta; conclusão do tratamento → resolve |
| [BR-ACESSO-017](./acessos-perfil.md) | Matriz RBAC API/UI para saúde animal |

---

## Backlog (planejado)

| Item | Estado | Notas |
|------|--------|-------|
| Vacinas / calendário preventivo | planejado | Meta 3 futura; fora do escopo BR-SAUDE-001–005 |
| Validação temporal BR-CICLO-012 em datas de caso | planejado | Datas de caso não validadas contra «hoje» ou entrada do animal |
| Bloqueio de edição manual de `status_saude` com casos ATIVOS | planejado | Gap opcional; hoje cadastro manual pode divergir até próximo CRUD de caso |

---

**Última atualização**: 2026-05-29 (Onda 3.3: fluxo sync, cenários, refs ciclo/alertas)
