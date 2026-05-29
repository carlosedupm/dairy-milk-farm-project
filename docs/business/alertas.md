# Regras de negócio — Alertas proativos

Notificações automáticas e manuais para a equipe da fazenda (tratamentos, partos, restrições de leite, conformidade, gestação, cios).

**Implementação principal**

- Banco: migrations `backend/migrations/31_add_alertas.up.sql`, `32_alertas_geracao_automatica.up.sql`, `33_push_subscriptions_fazenda_ativa.up.sql` — tabela `alertas`, `alertas_geracao_estado`, `push_subscriptions`, coluna `usuarios.fazenda_ativa_id`, índice único parcial `uq_alertas_aberto_tipo_animal`, utilizador técnico `sistema@interno.ceialmilk`.
- Backend: `backend/internal/models/alerta.go`, `backend/internal/repository/alerta_repository.go`, `backend/internal/service/alerta_service.go`, `backend/internal/service/alerta_geracao_service.go`, `backend/internal/service/alerta_cron.go`, `backend/internal/service/push_notification_service.go`, `backend/internal/handlers/alerta_handler.go`, `backend/internal/handlers/alerta_admin_handler.go`, `backend/internal/handlers/push_handler.go`, rotas em `backend/cmd/api/main.go`.
- Frontend: `frontend/src/services/alertas.ts`, `frontend/src/services/pushNotifications.ts`, `frontend/src/app/alertas/page.tsx`, `frontend/src/components/dashboard/AlertasHomePanel.tsx`, `frontend/src/components/layout/PushPermissionBanner.tsx`, `frontend/src/app/sw.js/route.ts`.
- RBAC API (FUNCIONARIO): `backend/internal/auth/perfil_access.go` — `GET` e `PATCH .../status`; `POST`/`DELETE` negados na whitelist (403).

---

### BR-ALERTA-001 — Vínculo fazenda / animal

- **Enunciado**: Todo alerta pertence a uma `fazenda_id`. `animal_id` é opcional; quando informado, o animal deve pertencer à mesma fazenda e estar no rebanho ativo (`EnsureAnimalNoRebanho`). **Web Push (BR-ALERTA-012)**: o utilizador só recebe push de alertas da fazenda em que tem vínculo **e** cuja `fazenda_id` coincide com `usuarios.fazenda_ativa_id` sincronizada via `PUT /api/v1/me/fazenda-ativa`.
- **Escopo**: Criação manual e futura geração automática.
- **Perfis / permissões**: validação no servidor para qualquer escrita.
- **Efeito**: bloqueio 400/403 (`ErrAlertaAnimalFazenda`, `ErrAnimalNotFound`, regras de baixa).
- **Implementação**: `AlertaService.Create`; `AnimalRepository.GetByID`.
- **Estado**: implementado (CRUD manual).

### BR-ALERTA-002 — Severidade padrão derivada do tipo

- **Enunciado**: Cada tipo de alerta de sistema tem severidade padrão: `TRATAMENTO_VENCIDO`/`PARTO_PREVISTO`/`GESTACAO_SEM_SECAGEM` → ALTA; `RESTRICAO_LEITE_ATIVA` → MEDIA; `NAO_CONFORMIDADE` → CRITICA; `CIO_DETECTADO` → BAIXA. Alertas **MANUAL** exigem severidade informada no `POST`.
- **Escopo**: Tipos definidos na migration; geração automática usará `SeveridadePadraoPorTipo` em `alerta.go`.
- **Efeito**: bloqueio na criação manual se severidade inválida ou ausente.
- **Implementação**: `models.SeveridadePadraoPorTipo`, `AlertaService.Create`, `AlertaGeracaoService.tryCreateAlerta`.
- **Estado**: implementado (manual e geração automática).

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
- **Estado**: implementado.

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

### BR-ALERTA-008 — Geração automática diária

- **Enunciado**: O sistema executa diariamente (cron in-process + `POST /api/v1/admin/alertas/gerar`) e cria alertas de sistema quando detecta: tratamento `ATIVO` sem `data_fim` há >14 dias; parto previsto nos próximos 14 dias; restrição `AGUARDANDO_LAB` há >7 dias; nova não-conformidade INT-001–INT-007 desde a última verificação; gestação confirmada há >250 dias sem secagem; cio registrado no dia (timezone `America/Sao_Paulo`).
- **Escopo**: Todas as fazendas; `created_by` = utilizador técnico sistema.
- **Efeito**: persistência em `alertas`; erros numa regra não interrompem as demais (sem panic).
- **Implementação**: `AlertaGeracaoService.GerarAlertasDiarios`, `RunAlertasCron`, migration V32.
- **Estado**: implementado.

### BR-ALERTA-009 — Deduplicação de alertas abertos

- **Enunciado**: Não cria novo alerta se já existir registro `ABERTO` ou `EM_ANDAMENTO` com o mesmo `tipo` e `animal_id` na fazenda.
- **Escopo**: Tipos automáticos (≠ MANUAL).
- **Efeito**: skip silencioso; índice `uq_alertas_aberto_tipo_animal` reforça no banco.
- **Implementação**: `AlertaRepository.ExistsOpenByFazendaTipoAnimal`, `AlertaGeracaoService.tryCreateAlerta`.
- **Estado**: implementado.

### BR-ALERTA-010 — Resolução automática ao resolver evento-fonte

- **Enunciado**: Ao concluir tratamento (`animal_saude.status = CONCLUIDO`), alertas `TRATAMENTO_VENCIDO` do animal passam a `RESOLVIDO`. Ao registrar secagem, `GESTACAO_SEM_SECAGEM` → `RESOLVIDO`. Ao liberar restrição de leite, `RESTRICAO_LEITE_ATIVA` → `RESOLVIDO`. Resolução automática usa `resolvido_por` nulo (actor sistema).
- **Escopo**: Eventos de escrita nos serviços de saúde, secagem e restrição.
- **Efeito**: atualização em `alertas`; falha na resolução automática não bloqueia a operação principal.
- **Implementação**: `AnimalSaudeService`, `SecagemService`, `RestricaoLeiteService` + `AlertaGeracaoService.ResolveOpenByAnimal`.
- **Estado**: implementado.

### BR-ALERTA-011 — Web Push para severidade CRÍTICA e ALTA

- **Enunciado**: Ao criar alerta (manual ou automático) com severidade `CRITICA` ou `ALTA`, o sistema envia notificação Web Push aos destinatários elegíveis (BR-ALERTA-012). Severidades `MEDIA` e `BAIXA` **não** disparam push.
- **Escopo**: Criação em `AlertaService.Create` e `AlertaGeracaoService.tryCreateAlerta`.
- **Efeito**: push assíncrono; falha no envio não bloqueia a criação do alerta.
- **Implementação**: `PushNotificationService.NotifyAlertaCreated`, `models.ShouldNotifyPushForSeveridade`.
- **Estado**: implementado.

### BR-ALERTA-012 — Destinatários e conteúdo do push

- **Enunciado**: Push apenas se: (1) utilizador com vínculo em `usuarios_fazendas` à fazenda do alerta; (2) `usuarios.fazenda_ativa_id` = `alerta.fazenda_id`; (3) subscription em `push_subscriptions`; (4) perfil operacional (`≠ USER`, `≠ INTEGRACAO`); (5) permissão de notificação concedida no browser. Título: prefixo `[CRÍTICA]` ou `[ALTA]` + título; corpo: tipo + identificação do animal; ícone PWA; badge = contagem de alertas `CRITICA` abertos/em andamento na fazenda; clique abre `/alertas?tipo={tipo}`.
- **Escopo**: API `GET/PUT/DELETE /api/v1/me/push-*`, `PUT /api/v1/me/fazenda-ativa`; UI `PushPermissionBanner`; SW em `/sw.js`.
- **Efeito**: informativo no SO; utilizador pode negar permissão (sem insistência após `denied`).
- **Implementação**: `push_handler.go`, `FazendaContext` + `putFazendaAtiva`, migration V33.
- **Estado**: implementado.

---

**Última atualização**: 2026-05-29
