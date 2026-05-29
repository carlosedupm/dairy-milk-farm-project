# Regras de negócio — Alertas proativos

Notificações automáticas e manuais para a equipe da fazenda (tratamentos, partos, restrições de leite, conformidade, gestação, cios).

**Implementação principal**

- Banco: migration `backend/migrations/31_add_alertas.up.sql` — tabela `alertas`, constraint `chk_alertas_resolvido`, índices por fazenda/status/tipo/severidade (parcial em abertos).
- Backend: `backend/internal/models/alerta.go`, `backend/internal/repository/alerta_repository.go`, `backend/internal/service/alerta_service.go`, `backend/internal/handlers/alerta_handler.go`, rotas em `backend/cmd/api/main.go`.
- Frontend: `frontend/src/services/alertas.ts`, `frontend/src/app/alertas/page.tsx`, `frontend/src/components/dashboard/AlertasHomePanel.tsx`.
- RBAC API (FUNCIONARIO): `backend/internal/auth/perfil_access.go` — `GET` e `PATCH .../status`; `POST`/`DELETE` negados na whitelist (403).

---

### BR-ALERTA-001 — Vínculo fazenda / animal

- **Enunciado**: Todo alerta pertence a uma `fazenda_id`. `animal_id` é opcional; quando informado, o animal deve pertencer à mesma fazenda e estar no rebanho ativo (`EnsureAnimalNoRebanho`).
- **Escopo**: Criação manual e futura geração automática.
- **Perfis / permissões**: validação no servidor para qualquer escrita.
- **Efeito**: bloqueio 400/403 (`ErrAlertaAnimalFazenda`, `ErrAnimalNotFound`, regras de baixa).
- **Implementação**: `AlertaService.Create`; `AnimalRepository.GetByID`.
- **Estado**: implementado (CRUD manual).

### BR-ALERTA-002 — Severidade padrão derivada do tipo

- **Enunciado**: Cada tipo de alerta de sistema tem severidade padrão: `TRATAMENTO_VENCIDO`/`PARTO_PREVISTO`/`GESTACAO_SEM_SECAGEM` → ALTA; `RESTRICAO_LEITE_ATIVA` → MEDIA; `NAO_CONFORMIDADE` → CRITICA; `CIO_DETECTADO` → BAIXA. Alertas **MANUAL** exigem severidade informada no `POST`.
- **Escopo**: Tipos definidos na migration; geração automática usará `SeveridadePadraoPorTipo` em `alerta.go`.
- **Efeito**: bloqueio na criação manual se severidade inválida ou ausente.
- **Implementação**: `models.SeveridadePadraoPorTipo`, `AlertaService.Create`.
- **Estado**: implementado (manual); geração automática **planejada**.

### BR-ALERTA-003 — Transição válida de status

- **Enunciado**: Fluxo permitido: `ABERTO` → `EM_ANDAMENTO` → `RESOLVIDO` ou `IGNORADO`; também `ABERTO` → `RESOLVIDO`/`IGNORADO` (gestão). Estados terminais (`RESOLVIDO`, `IGNORADO`) não mudam. `resolvido_em` obrigatório iff status terminal (constraint `chk_alertas_resolvido`).
- **Escopo**: `PATCH /api/v1/fazendas/:id/alertas/:alertaId/status`.
- **Efeito**: bloqueio 400 (`ErrAlertaTransicaoInvalida`).
- **Implementação**: `models.IsTransicaoAlertaStatusValida`, `AlertaService.UpdateStatus`, migration V31.
- **Estado**: implementado.

### BR-ALERTA-004 — Só MANUAL pode ser excluído

- **Enunciado**: `DELETE` permitido apenas para alertas com `tipo = MANUAL`.
- **Escopo**: Exclusão física do registo.
- **Perfis / permissões**: GERENTE+ (`PodeExcluirAlerta`).
- **Efeito**: bloqueio 403 (`ErrAlertaSomenteManual`).
- **Implementação**: `AlertaService.Delete`.
- **Estado**: implementado.

### BR-ALERTA-005 — Alertas de sistema: leitura para edição de campos

- **Enunciado**: Alertas gerados pelo sistema (tipos ≠ MANUAL) não podem ser excluídos nem ter título/descrição alterados via API; apenas transição de status (`PATCH .../status`).
- **Escopo**: Tipos automáticos na tabela.
- **Efeito**: bloqueio em `DELETE`; ausência de endpoint de update de campos.
- **Implementação**: `AlertaService.Delete`; API expõe só list/get/create(manual)/patch status/delete(manual).
- **Estado**: implementado (infra); população automática **planejada**.

### BR-ALERTA-006 — Ordenação padrão da listagem

- **Enunciado**: Listagem prioriza alertas `ABERTO` e `EM_ANDAMENTO`, depois severidade (CRITICA → BAIXA), depois `created_at` desc.
- **Escopo**: `GET /api/v1/fazendas/:id/alertas`.
- **Efeito**: ordem fixa no servidor.
- **Implementação**: `AlertaRepository.ListByFazenda` (`ORDER BY` com `CASE`).
- **Estado**: implementado.

### BR-ALERTA-007 — Permissões de resolução por perfil

- **Enunciado**: **FUNCIONARIO** pode apenas `ABERTO` → `EM_ANDAMENTO`. **GERENTE+** (GERENTE, GESTAO, PROPRIETARIO, ADMIN, DEVELOPER) pode resolver ou ignorar (`→ RESOLVIDO` / `→ IGNORADO`). **USER** pending não opera alertas.
- **Escopo**: UI `/alertas` e `PATCH .../status`.
- **Efeito**: bloqueio 403 (`ErrAlertaForbidden`).
- **Implementação**: `models.PodeMarcarAlertaEmAndamento`, `PodeResolverOuIgnorarAlerta`; `frontend/src/config/appAccess.ts` (`canMarcarAlertaEmAndamento`, `canResolverAlerta`).
- **Estado**: implementado.

---

**Última atualização**: 2026-05-29
