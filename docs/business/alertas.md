# Regras de negócio — Alertas proativos

Notificações automáticas e manuais para a equipe da fazenda (tratamentos, partos, restrições de leite, conformidade, gestação, cios).

**Implementação principal**

- Banco: migrations `backend/migrations/31_add_alertas.up.sql`, `32_alertas_geracao_automatica.up.sql`, `33_push_subscriptions_fazenda_ativa.up.sql` — tabela `alertas`, `alertas_geracao_estado`, `push_subscriptions`, coluna `usuarios.fazenda_ativa_id`, índice único parcial `uq_alertas_aberto_tipo_animal`, utilizador técnico `sistema@interno.ceialmilk`.
- Backend: `backend/internal/models/alerta.go`, `backend/internal/repository/alerta_repository.go`, `backend/internal/service/alerta_service.go`, `backend/internal/service/alerta_geracao_service.go`, `backend/internal/service/alerta_cron.go`, `backend/internal/service/push_notification_service.go`, `backend/internal/handlers/alerta_handler.go`, `backend/internal/handlers/alerta_admin_handler.go`, `backend/internal/handlers/push_handler.go`, rotas em `backend/cmd/api/main.go`.
- Frontend: `frontend/src/services/alertas.ts`, `frontend/src/services/pushNotifications.ts`, `frontend/src/hooks/useAlertasPage.ts`, `frontend/src/hooks/useAlertasAbertosCount.ts`, `frontend/src/components/alertas/` (`AlertasListToolbar`, `AlertasTable`, `CriarAlertaDialog`, `alertas-utils.ts`), `frontend/src/app/alertas/page.tsx`, `frontend/src/components/dashboard/AlertasHomePanel.tsx`, `frontend/src/components/layout/HeaderNavLink.tsx` (badge Bell), `frontend/src/components/layout/PushPermissionBanner.tsx`, `frontend/src/app/sw.js/route.ts`.
- **Assistente Live (GERENTE+)**: function calling `listar_alertas` e `resolver_alerta` em `backend/internal/service/assistente_live_service.go` (`ExecuteFunction` → `AlertaService.UpdateStatus` com `perfil` — BR-ALERTA-007); sem tool de exclusão.
- RBAC API (FUNCIONARIO): `backend/internal/auth/perfil_access.go` — `GET` e `PATCH .../status`; `POST`/`DELETE` negados na whitelist (403).

---

## Regras CRUD e RBAC

### BR-ALERTA-001 — Vínculo fazenda / animal

- **Enunciado**: Todo alerta pertence a uma `fazenda_id`. `animal_id` é opcional; quando informado, o animal deve pertencer à mesma fazenda e estar no rebanho ativo (`EnsureAnimalNoRebanho`). **Web Push (BR-ALERTA-012)**: o utilizador só recebe push de alertas da fazenda em que tem vínculo **e** cuja `fazenda_id` coincide com `usuarios.fazenda_ativa_id` sincronizada via `PUT /api/v1/me/fazenda-ativa`.
- **Escopo**: Criação manual e geração automática.
- **Perfis / permissões**: validação no servidor para qualquer escrita.
- **Efeito**: bloqueio 400/403 (`ErrAlertaAnimalFazenda`, `ErrAnimalNotFound`, regras de baixa).
- **Implementação**: `AlertaService.Create`; `AnimalRepository.GetByID`.
- **Estado**: implementado.

### BR-ALERTA-002 — Severidade padrão derivada do tipo

- **Enunciado**: Cada tipo de alerta de sistema tem severidade padrão (ver matriz abaixo). Alertas **MANUAL** exigem severidade informada no `POST`.
- **Escopo**: Tipos definidos na migration; geração automática usa `SeveridadePadraoPorTipo` em `alerta.go`.
- **Efeito**: bloqueio na criação manual se severidade inválida ou ausente.
- **Implementação**: `models.SeveridadePadraoPorTipo`, `AlertaService.Create`, `AlertaGeracaoService.tryCreateAlerta`.
- **Estado**: implementado.

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
- **Implementação**: `models.PodeMarcarAlertaEmAndamento`, `PodeResolverOuIgnorarAlerta`; `frontend/src/config/appAccess.ts` (`canMarcarAlertaEmAndamento`, `canResolverAlerta`); assistente Live `resolver_alerta` (mesma matriz via `AlertaService.UpdateStatus` + `session.Perfil`).
- **Estado**: implementado.

### BR-ALERTA-013 — Alertas na timeline da ficha

- **Enunciado**: alertas vinculados ao animal (`animal_id`) aparecem na timeline paginada da ficha com `tipo=ALERTA`, ordenados por `created_at` DESC; filtro dedicado `tipo=alertas` no endpoint.
- **Escopo**: `GET /api/v1/animais/:id/timeline`; UI `AnimalTimelineSection` (ícone Bell, link para `/alertas`).
- **Efeito**: informativo; não altera regras de edição de alertas (BR-ALERTA-005).
- **Implementação**: `TimelineRepository` (UNION `alertas`), `AnimalTimelineSection.tsx`.
- **Estado**: implementado.

### BR-ALERTA-014 — Filtro de período na listagem

- **Enunciado**: `GET /api/v1/fazendas/:id/alertas` aceita query params opcionais `start` e `end` (YYYY-MM-DD). Ambos devem ser informados juntos; `start` ≤ `end`. Um alerta entra no resultado se **`created_at::date`** **ou** **`data_prevista`** (quando não nula) cair no intervalo inclusivo.
- **Escopo**: Listagem JWT e M2M (`GET /integracoes/alertas`).
- **Perfis / permissões**: mesma matriz de leitura de alertas.
- **Efeito**: filtro server-side; combina com status/tipo/severidade.
- **Implementação**: `AlertaHandler.List`, `AlertaRepository.buildAlertaListWhere`, `AlertasListToolbar` (dois `DatePicker`), `useAlertasPage`, `alertas-utils.ts`.
- **Estado**: implementado.

### BR-ALERTA-015 — Badge de alertas abertos no Header

- **Enunciado**: O link **Alertas** no Header (desktop e drawer mobile) exibe badge numérico quando existem alertas com `status = ABERTO` na fazenda ativa (todas severidades). Contagem via `listAlertas` com `limit=1` (`total`). Badge oculto se zero; exibe até `99+`; `aria-label` no badge (ex.: «5 alertas pendentes»). Clique com badge leva a `/alertas?status=ABERTO`.
- **Escopo**: Navegação global autenticada com fazenda ativa.
- **Efeito**: informativo; atualiza via invalidação TanStack Query (`["alertas", fazendaId]`) após mutações e `refetchOnWindowFocus`.
- **Implementação**: `useAlertasAbertosCount`, `HeaderNavLink`, `HeaderDesktopNav`, `HeaderMobileNavSections`.
- **Estado**: implementado.

---

## Geração automática e ciclo de vida

### BR-ALERTA-008 — Geração automática diária

- **Enunciado**: O sistema executa diariamente (cron in-process + `POST /api/v1/admin/alertas/gerar`) e cria alertas de sistema conforme as regras da tabela «Geração automática» abaixo.
- **Escopo**: Todas as fazendas; `created_by` = utilizador técnico `sistema@interno.ceialmilk` (migration 32).
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

- **Enunciado**: Ao concluir tratamento (`animal_saude.status = CONCLUIDO` + `tipo_caso = TRATAMENTO`), alertas `TRATAMENTO_VENCIDO` do animal passam a `RESOLVIDO`. Ao registrar secagem, `GESTACAO_SEM_SECAGEM` → `RESOLVIDO`. Ao liberar restrição de leite, `RESTRICAO_LEITE_ATIVA` → `RESOLVIDO`. Resolução automática usa `resolvido_por` nulo (actor sistema).
- **Escopo**: Eventos de escrita nos serviços de saúde, secagem e restrição.
- **Efeito**: atualização em `alertas`; falha na resolução automática não bloqueia a operação principal.
- **Implementação**: `AnimalSaudeService.maybeResolveTratamentoVencido`, `SecagemService`, `RestricaoLeiteService` + `AlertaGeracaoService.ResolveOpenByAnimal`.
- **Estado**: implementado.

---

## Web Push

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

## Anexos operacionais

### Matriz tipo × severidade × Web Push

| Tipo | Severidade padrão | Web Push | Origem |
|------|-------------------|----------|--------|
| `TRATAMENTO_VENCIDO` | ALTA | Sim | `SeveridadePadraoPorTipo` + BR-ALERTA-011 |
| `PARTO_PREVISTO` | ALTA | Sim | idem |
| `GESTACAO_SEM_SECAGEM` | ALTA | Sim | idem |
| `RESTRICAO_LEITE_ATIVA` | MEDIA | Não | idem |
| `NAO_CONFORMIDADE` | CRITICA | Sim | idem |
| `CIO_DETECTADO` | BAIXA | Não | idem |
| `MANUAL` | Informada no POST | Conforme severidade escolhida | BR-ALERTA-002 |

Fonte: `backend/internal/models/alerta.go` — `SeveridadePadraoPorTipo`, `ShouldNotifyPushForSeveridade`.

### Regras de geração automática (Onda 2.2)

Executadas por fazenda, em sequência, em `AlertaGeracaoService.gerarPorFazenda`. Constantes em `alerta_geracao_service.go`.

| # | Tipo alerta | Condição (código) | Limiar |
|---|-------------|-------------------|--------|
| 1 | `TRATAMENTO_VENCIDO` | `animal_saude`: `status=ATIVO`, `tipo_caso=TRATAMENTO`, `data_fim IS NULL`, animal no rebanho | `data_inicio` ≤ ref − **14** dias |
| 2 | `PARTO_PREVISTO` | Gestação confirmada com parto previsto na janela | ref … ref + **14** dias |
| 3 | `RESTRICAO_LEITE_ATIVA` | Restrição `AGUARDANDO_LAB` antiga | ≥ **7** dias |
| 4 | `NAO_CONFORMIDADE` | Nova chave `{codigo}:{animal_id}` no snapshot vs execução anterior | ver tabela INT abaixo |
| 5 | `GESTACAO_SEM_SECAGEM` | Gestação confirmada sem secagem registada | confirmação ≤ ref − **250** dias |
| 6 | `CIO_DETECTADO` | Cio registado na data de referência | dia civil **America/Sao_Paulo** |

**Triggers**: cron in-process (`RunAlertasCron`); admin `POST /api/v1/admin/alertas/gerar`. `created_by` = utilizador sistema (migration 32).

### INT-001–007 → alertas de conformidade

Alertas `NAO_CONFORMIDADE` (severidade CRITICA) são criados quando a geração diária detecta **novas** anomalias em relação ao snapshot anterior em `alertas_geracao_estado.conformidade_chaves`.

- **Chave dedup**: `{codigo}:{animal_id}` (ex.: `INT-002:42`)
- **Fonte**: `ConformidadeService.ListByFazenda` — mesmos checks do painel de auditoria ([auditoria.md](./auditoria.md) BR-AUDIT-003)
- **Nota**: INT-* são códigos de **conformidade** do ciclo pecuário; **não** confundir com BR-INTEG-* da [API M2M](./integracoes.md)

| Código | Descrição (one-liner) | Âmbito |
|--------|----------------------|--------|
| INT-001 | Múltiplas lactações ativas no mesmo animal | Rebanho ativo |
| INT-002 | Produção sem lactação ativa na data | Rebanho ativo |
| INT-003 | Gestação confirmada sem toque positivo | Rebanho ativo |
| INT-004 | Restrição de leite sem lactação ativa | Rebanho ativo |
| INT-005 | Animal PRENHE sem gestação confirmada | Rebanho ativo |
| INT-006 | Toque positivo sem cobertura vinculada | Rebanho ativo |
| INT-007 | Animal baixado com ciclo ainda aberto (lactação, gestação ou restrição) | Pós-baixa |

Detalhe completo: [auditoria.md](./auditoria.md) BR-AUDIT-003, BR-AUDIT-009, BR-AUDIT-010.

### Fluxograma — transição de status

```
                    ┌─────────────┐
                    │   ABERTO    │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
   ┌───────────────┐ ┌──────────┐   ┌──────────┐
   │ EM_ANDAMENTO  │ │ RESOLVIDO│   │ IGNORADO │
   │ (FUNCIONARIO+ │ │(GERENTE+ │   │(GERENTE+ │
   │  GERENTE+)    │ │ ou auto) │   │ ou auto) │
   └───────┬───────┘ └────┬─────┘   └────┬─────┘
           │              │              │
           ▼              │              │
   ┌───────────────┐     │              │
   │ RESOLVIDO ou  │─────┴──────────────┘
   │ IGNORADO      │        (terminais)
   │ (GERENTE+)    │
   └───────────────┘
```

- **FUNCIONARIO+**: qualquer perfil operacional (`PodeMarcarAlertaEmAndamento`) — `ABERTO` → `EM_ANDAMENTO`
- **GERENTE+**: `PodeResolverOuIgnorarAlerta` — resolve/ignora a partir de `ABERTO` ou `EM_ANDAMENTO`
- **Auto-resolve (BR-ALERTA-010)**: evento-fonte concluído → `RESOLVIDO` com `resolvido_por` nulo
- Estados terminais (`RESOLVIDO`, `IGNORADO`) são imutáveis; `resolvido_em` obrigatório (constraint `chk_alertas_resolvido`)

Implementação: `models.IsTransicaoAlertaStatusValida`, `AlertaService.UpdateStatus`.

---

## Referências cruzadas

| Módulo | Relação |
|--------|---------|
| [saude-animal.md](./saude-animal.md) | BR-SAUDE-004 (sync status); BR-ALERTA-010 resolve `TRATAMENTO_VENCIDO` ao concluir tratamento |
| [ciclo-rebanho.md](./ciclo-rebanho.md) | Alertas ligados a marcos do ciclo (parto, secagem, cio, restrição leite) — BR-CICLO-006, BR-CICLO-009 |
| [auditoria.md](./auditoria.md) | INT-001–007 alimentam alertas `NAO_CONFORMIDADE` (BR-AUDIT-003) |
| [leite-restricoes.md](./leite-restricoes.md) | Alerta e auto-resolve de `RESTRICAO_LEITE_ATIVA` |
| [secagens.md](./secagens.md) | Auto-resolve de `GESTACAO_SEM_SECAGEM` ao registrar secagem |
| [integracoes.md](./integracoes.md) | BR-INTEG-* (API M2M) — distinto dos códigos INT-* de conformidade |

---

**Última atualização**: 2026-05-31 (BR-ALERTA-014 filtro período; BR-ALERTA-015 badge Header)
