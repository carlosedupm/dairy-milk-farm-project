# Regras de negócio — Acessos por perfil (RBAC)

Regras de autorização por perfil para navegação e operações na aplicação.

**Implementação principal**

- Frontend: `frontend/src/config/appAccess.ts`, `frontend/src/components/layout/RouteAccessGuard.tsx`, `frontend/src/app/page.tsx`, `frontend/src/app/gestao/page.tsx`, `frontend/src/app/animais/page.tsx`, `frontend/src/components/animais/AnimalTable.tsx`, `frontend/src/app/animais/[id]/page.tsx`, `frontend/src/app/onboarding/page.tsx`, `frontend/src/app/fazendas/criar-minha/page.tsx`, `frontend/src/app/registro/page.tsx`, `frontend/src/components/admin/PendentesProvisaoPanel.tsx`, `frontend/src/app/admin/usuarios/page.tsx`, `frontend/src/lib/perfilLabels.ts`, `frontend/src/components/layout/Header.tsx`.
- Backend: `backend/internal/auth/perfil_access.go` (middleware `RequirePerfilAPIAccess` aplicado em `/api/v1/*` autenticado); `backend/internal/auth/middleware.go` (`RequirePodeDeletarFazenda`); `backend/internal/handlers/admin_handler.go` (`ListPendentesProvisao`); `backend/internal/handlers/fazenda_handler.go` (`CreateMinha`, `Delete`); `backend/internal/handlers/access_helper.go` (`ValidateFazendaAccessOrGestao`); `backend/internal/repository/usuario_repository.go` (`ListPendentesProvisao`); `backend/internal/service/usuario_service.go`; `backend/internal/repository/fazenda_repository.go` (vínculos com `papel`); `backend/internal/models/vinculo_fazenda.go`; `backend/internal/models/perfil.go` (`PodeDeletarFazenda`).
- Rotas de domínio envolvidas: `backend/cmd/api/main.go` (`/api/v1/animais`, `/api/v1/cios`, `/api/v1/coberturas`, `/api/v1/partos`, `/api/v1/secagens`, `/api/v1/fazendas/:id/folgas/*`, `/api/v1/fazendas/:id/restricoes-leite*`, `/api/v1/fazendas/:id/animais/em-lactacao`, `/api/v1/fazendas/:id/animais/para-cobertura|para-toque|para-parto|para-abertura-lactacao`, `/api/v1/assistente/*`); listagem/pesquisa global de fazendas (`GET /api/v1/fazendas`, `/search/*`, `/count`, `/exists`) apenas **ADMIN/DEVELOPER**; `DELETE /api/v1/fazendas/:id` — ver **BR-ACESSO-020**; perfil `USER` com whitelist mínima em `perfil_access.go`, **sem** `POST /api/v1/me/fazendas` (ver BR-ACESSO-008/012).

---

### BR-ACESSO-001 — FUNCIONARIO com acesso à home e módulos permitidos

- **Enunciado**: O perfil `FUNCIONARIO` pode acessar a tela principal (`/`) e navegar apenas para as áreas permitidas do seu perfil.
- **Escopo**: Frontend (menu, guard de rotas e landing padrão).
- **Perfis / permissões**: `FUNCIONARIO`.
- **Efeito**: bloqueio de rotas não permitidas na UI via redirecionamento para a landing.
- **Implementação**:
  - Matriz em `PERFIL_AREAS` com `animais`, `alertas`, `gestao` e `folgas`.
  - Menu do Header: `getNavAreasForPerfil` + `getHeaderNavGroups`; label «Gestão reprodutiva» para `FUNCIONARIO` (`getNavAreaLabel` em `headerNav.ts`).
  - Landing padrão do perfil em `/`.
  - Validação de caminho por `isPathAllowedForPerfil`.
  - Nav operacional no header só com fazenda ativa quando o utilizador tem 2+ vínculos (`useHeaderVisibility`).
- **Estado**: Implementado.

### BR-ACESSO-002 — Gestão parcial para FUNCIONARIO

- **Enunciado**: No módulo Gestão, `FUNCIONARIO` pode acessar Cios, Coberturas, **Toques**, Partos e Secagens (sem gestações/lactações globais).
- **Escopo**: Frontend e API de gestão pecuária.
- **Perfis / permissões**: `FUNCIONARIO`.
- **Efeito**:
  - UI: cards/rotas de Gestão fora desse escopo ficam ocultos ou bloqueados.
  - API: endpoints fora da whitelist retornam 403.
- **Implementação**:
  - Rotas UI: `/gestao`, `/gestao/cios*`, `/gestao/coberturas*`, `/gestao/toques*`, `/gestao/partos*`, `/gestao/secagens*`.
  - API: `/api/v1/cios*`, `/api/v1/coberturas*`, `/api/v1/toques*`, `/api/v1/partos*`, `/api/v1/secagens*`, `GET|POST /api/v1/crias*`.
- **Estado**: Implementado.

### BR-ACESSO-003 — Animais em modo consulta para FUNCIONARIO

- **Enunciado**: No módulo Animais, `FUNCIONARIO` tem consulta (lista, detalhe, contexto) sem criar/editar/excluir animal.
- **Escopo**: Frontend e API de animais.
- **Perfis / permissões**: `FUNCIONARIO`.
- **Efeito**:
  - UI: sem CRUD de animal; atalho para `/producao/novo` na home (ver BR-ACESSO-015).
  - API: `GET` em `/api/v1/animais*`.
- **Implementação**:
  - UI: `/animais`, `/animais/:id`.
  - API: `funcionarioAnimaisPath` (GET).
- **Estado**: Implementado.

### BR-ACESSO-015 — FUNCIONARIO: produção e toques no curral

- **Enunciado**: `FUNCIONARIO` pode **registrar produção de leite** (`POST /api/v1/producao`) e **toques** (`POST /api/v1/toques`, `POST /api/v1/toques/lote`), fechando o ciclo cobertura → diagnóstico → ordenha no campo.
- **Escopo**: API e rotas UI `/producao/novo`, `/gestao/toques*`.
- **Perfis / permissões**: `FUNCIONARIO`; demais perfis inalterados.
- **Efeito**: bloqueio mantido em `PUT/DELETE` de produção, gestações, lactações e assistente.
- **Implementação**: `perfil_access.go` (`toques` em `funcionarioGestaoPath`, incl. `POST /api/v1/toques/lote`; `POST /api/v1/producao`); `appAccess.ts` (`/producao/novo`, `/gestao/toques`, `/gestao/toques/lote`); `Dashboard.tsx` atalho produção.
- **Estado**: Implementado.

### BR-ACESSO-004 — Folgas e endpoints auxiliares mantidos para FUNCIONARIO

- **Enunciado**: `FUNCIONARIO` mantém acesso às rotas de Folgas e endpoints auxiliares do próprio contexto (`/api/v1/me/*`).
- **Escopo**: API e UI de Folgas.
- **Perfis / permissões**: `FUNCIONARIO`.
- **Efeito**: continuidade do comportamento existente de Folgas, combinando com as novas permissões de Gestão/Animais.
- **Implementação**:
  - API permitida: `GET /api/v1/me/*` e `/api/v1/fazendas/:id/folgas/*`.
  - UI: rota `/folgas` e seus fluxos já existentes.
- **Estado**: Implementado.

### BR-ACESSO-005 — Restrições de leite (FUNCIONARIO: registrar, não liberar)

- **Enunciado**: O perfil `FUNCIONARIO` pode listar restrições ativas e **registrar** novo episódio de descarte/amostra na fazenda; não pode encerrar (`liberar`) após o laboratório.
- **Escopo**: API sob `/api/v1/fazendas/:id/restricoes-leite`.
- **Perfis / permissões**: `FUNCIONARIO` vs demais (ver [leite-restricoes.md](./leite-restricoes.md) — BR-LEITE-003).
- **Efeito**: bloqueio no servidor (`PATCH .../liberar` → 403 para FUNCIONARIO); `GET`/`POST` permitidos na whitelist.
- **Implementação**: `backend/internal/auth/perfil_access.go` (`funcionarioRestricoesLeitePath`); UI em `RestricoesLeiteHomePanel` oculta ação Liberar para FUNCIONARIO.
- **Estado**: Implementado.

### BR-ACESSO-006 — Assistente virtual bloqueado para FUNCIONARIO (com evolução por capacidades)

- **Enunciado**: O perfil `FUNCIONARIO` não visualiza nem aciona o Assistente Virtual no estado atual do produto.
- **Escopo**: Frontend (visibilidade do FAB/modal) e backend (rotas `/api/v1/assistente/*`).
- **Perfis / permissões**: `FUNCIONARIO` bloqueado; demais perfis seguem regra vigente.
- **Efeito**:
  - UI: FAB e modal do assistente não são renderizados para `FUNCIONARIO`.
  - API: acesso direto/manual às rotas do assistente retorna 403 para `FUNCIONARIO`.
- **Implementação**:
  - Frontend: `frontend/src/config/appAccess.ts` (`showAssistenteForPerfil`, `isAssistenteEnabledForPerfil`, `PERFIL_ASSISTENTE_CAPABILITIES`) e `frontend/src/components/layout/ConditionalHeader.tsx`.
  - Backend: `backend/internal/auth/perfil_access.go` (`funcionarioAssistentePath` + bloqueio explícito em `requestAllowedForFuncionario`).
  - UX de erro Live: `frontend/src/hooks/useGeminiLive.ts` (`RECONNECT_FAIL_MESSAGE` neutra).
- **Evolução planejada**: a liberação para `FUNCIONARIO` será incremental por capacidades de negócio (capability-based), sem liberar o assistente completo de uma só vez.

### BR-ACESSO-007 — Registo público: perfil USER sem vínculo a fazendas

- **Enunciado**: `POST /api/auth/register` cria utilizador com perfil `USER`, sem linhas em `usuarios_fazendas`. Não há vínculo automático à “única fazenda” do sistema.
- **Escopo**: Criação de conta pública; tabela `usuarios_fazendas`.
- **Perfis / permissões**: **ADMIN** / **DEVELOPER** provêem fazendas e perfil operacional (vínculos em `usuarios_fazendas` e elevação de `perfil`, incl. atribuição de **PROPRIETARIO** quando aplicável).
- **Efeito**: sem vínculo e com `USER`, o utilizador não acede a dados de fazendas alheias; provisão **exclusivamente** por administrador da plataforma até existir vínculo e perfil operacional adequado.
- **Implementação**: `backend/internal/handlers/auth_handler.go` (Register); **não** chamar `VincularFazendaUnicaSeAplicavel` em Register, Login nem Validate; `backend/internal/handlers/admin_handler.go` (CreateUsuario sem auto-vínculo).
- **Estado**: Implementado.

### BR-ACESSO-008 — USER: acesso mínimo à API e à UI até elevação de perfil

- **Enunciado**: Enquanto `perfil` for `USER`, o utilizador não acede a módulos operacionais nem a listagens globais de fazendas; só a rotas utilitárias da aplicação e a `GET /api/v1/me/fazendas` (e demais rotas sob `/api/v1/me/` permitidas pela whitelist, **exceto** `POST /api/v1/me/fazendas` — ver BR-ACESSO-012). Com fazendas já vinculadas por um admin mas `perfil` ainda `USER`, permanece restrito até o `perfil` deixar de ser `USER` (ex.: `FUNCIONARIO`, `GERENTE`, `GESTAO`, `PROPRIETARIO`).
- **Escopo**: API `/api/v1/*` com `RequirePerfilAPIAccess`; navegação e guards no frontend.
- **Perfis / permissões**: `USER` restrito; **ADMIN** / **DEVELOPER** para catálogo global `GET /api/v1/fazendas` (lista, pesquisas, count, exists) e manutenção já existente.
- **Efeito**: bloqueio no servidor (403 fora da whitelist); UI redireciona rotas não permitidas (`RouteAccessGuard`, modo `pending` em `appAccess.ts`).
- **Implementação**:
  - Backend: `backend/internal/auth/perfil_access.go` (`PerfilTemAcessoAPICompleta`, `requestAllowedForUser` com bloqueio explícito de `POST /api/v1/me/fazendas` para `USER`); `backend/cmd/api/main.go` (`RequireAdmin` nas rotas globais de listagem/pesquisa de fazendas; `POST /api/v1/me/fazendas` no grupo `me`).
  - Frontend: `frontend/src/config/appAccess.ts`, `frontend/src/components/dashboard/Dashboard.tsx`, `frontend/src/app/onboarding/page.tsx`, `frontend/src/app/fazendas/criar-minha/page.tsx`, `frontend/src/app/registro/page.tsx`.
- **Estado**: Implementado.

### BR-ACESSO-009 — Fila de provisão para administradores (contas USER)

- **Enunciado**: Administradores podem listar utilizadores com perfil `USER` ativos que ainda necessitam de provisão: sem fazendas vinculadas (`tipo_pendencia` = `SEM_VINCULO_FAZENDA`) ou com fazendas mas ainda com perfil apenas `USER` (`PERFIL_OPERACIONAL`). A listagem destina-se a priorizar trabalho de suporte e não altera regras de acesso do utilizador final.
- **Escopo**: API admin; UI em painel de utilizadores.
- **Perfis / permissões**: apenas **ADMIN** / **DEVELOPER** (rota sob `RequireAdmin`, mesmo grupo que `GET /api/v1/admin/usuarios`).
- **Efeito**: informativo para admin; operações de vínculo e perfil continuam em `PUT .../usuarios/:id` e `PUT .../usuarios/:id/fazendas`.
- **Implementação**:
  - `GET /api/v1/admin/usuarios/pendentes-provisao?limit=` — resposta `{ pendentes: UsuarioPendenteProvisao[], total }` onde **`total`** é a contagem completa de utilizadores `USER` ativos (não só os devolvidos na página); lista ordenada por `created_at` descendente, limitada por `limit` (máx. 200 no repositório); modelo `UsuarioPendenteProvisao` em `backend/internal/models/usuario.go`; query em `backend/internal/repository/usuario_repository.go` (`ListPendentesProvisao`, `CountPendentesProvisao`); registo da rota **antes** de rotas com `:id` em `backend/cmd/api/main.go`.
  - Frontend: `listPendentesProvisao` em `frontend/src/services/admin.ts`; painel `frontend/src/components/admin/PendentesProvisaoPanel.tsx` em `frontend/src/app/admin/usuarios/page.tsx`.
- **Estado**: Implementado.

### BR-ACESSO-010 — Convites e códigos de fazenda (planejado)

- **Enunciado** (alvo): permitir que um administrador gere um convite (link assinado ou código de uso único) associado a uma fazenda e, opcionalmente, a um perfil sugerido; o utilizador que aceita o convite passa a ter vínculo explícito sem listagem global de fazendas para `USER`, reduzindo fricção de provisão mantendo trilho auditável.
- **Escopo**: futuro — criação e resgate de convite, expiração, revogação; eventual email opcional.
- **Perfis / permissões**: criação/revogação apenas **ADMIN** / **DEVELOPER**; resgate por utilizador autenticado ou no fluxo de registo, conforme desenho futuro.
- **Efeito**: ainda não aplicado no produto; quando implementado, atualizar este ID, `perfil_access.go`, `appAccess.ts` e rotas em `main.go`.
- **Implementação**: planejado (sem código nesta entrega).
- **Estado**: planejado.

### BR-ACESSO-011 — Perfil PROPRIETARIO (titular da exploração)

- **Enunciado**: O perfil `PROPRIETARIO` identifica o **titular** da exploração: acesso operacional “completo” na UI nas mesmas áreas que `GERENTE`/`GESTAO` para fins de navegação, **sempre** limitado às fazendas em `usuarios_fazendas`. **Não** acede a rotas globais de administração da plataforma (`/api/v1/admin/*`, listagem global `GET /api/v1/fazendas`) reservadas a **ADMIN** / **DEVELOPER**.
- **Escopo**: RBAC; vínculo N:N; distinção semântica face a `GERENTE` (gestor contratado pode ser `GERENTE` sem ser dono).
- **Perfis / permissões**: `PROPRIETARIO`; atribuível via `PUT /api/v1/admin/usuarios/:id` (admin).
- **Efeito**: bloqueio fora do escopo de fazendas vinculadas; em folgas, **sem** atalho “qualquer fazenda” — apenas **ADMIN** / **DEVELOPER** / **GESTAO** usam `PodeAcessarFazendaSemVinculoGestao` em `ValidateFazendaAccessOrGestao` e `validarAcessoFazenda` (ver BR-ACESSO-013).
- **Implementação**: `backend/internal/models/perfil.go`; `frontend/src/config/appAccess.ts`; `frontend/src/components/admin/UsuarioForm.tsx`; `backend/internal/service/usuario_service.go` (`perfisAtribuiveisAPI`).
- **Estado**: Implementado.

### BR-ACESSO-012 — Titular: nova exploração via `POST /api/v1/me/fazendas`

- **Enunciado**: Apenas utilizador com perfil **`PROPRIETARIO`** pode chamar `POST /api/v1/me/fazendas` com os dados da exploração: cria a fazenda e insere vínculo em `usuarios_fazendas` (sem alterar o perfil). Perfil **`USER`** (e demais perfis não titulares) recebe **403** no middleware (`requestAllowedForUser`) e/ou no serviço (`ErrCriarMinhaFazendaPerfil`).
- **Escopo**: API `me`; transação em `backend/internal/repository/fazenda_repository.go` (`CreateFazendaAndLinkUsuario` com `papel = TITULAR`); serviço `FazendaService.CreateMinhaFazenda`; handler `FazendaHandler.CreateMinha`.
- **Efeito**: bloqueio no servidor para não titular; após sucesso, o cliente pode refrescar sessão (ex.: `GET /api/auth/validate`) para dados atualizados.
- **Implementação**: `backend/cmd/api/main.go` (rota `me.POST("/fazendas", ...)`); `frontend/src/services/fazendas.ts` (`createMinhaFazenda`); `frontend/src/app/fazendas/criar-minha/page.tsx` (UI apenas **PROPRIETARIO**; `appAccess.ts` não inclui esta rota no modo `pending` de **USER**); descoberta na UI: botão **Nova fazenda** no `Header` e no menu mobile para **PROPRIETARIO**; entrada no rodapé do `FazendaSelector` (várias fazendas); atalho na home (`Dashboard`) para **PROPRIETARIO**; campo `papel` em `GET /api/v1/me/fazendas` (ver BR-ACESSO-014).
- **Estado**: Implementado.

### BR-ACESSO-014 — Papel do vínculo usuário–fazenda (titular vs operacional)

- **Enunciado**: Cada linha em `usuarios_fazendas` possui coluna **`papel`** com valor **`TITULAR`** ou **`OPERACIONAL`**. “Fazendas em que o utilizador U é titular da exploração (para relatórios / regras de domínio)” corresponde a vínculos com `usuario_id = U` e `papel = TITULAR`. O acesso a dados da fazenda continua a exigir qualquer vínculo válido (incl. `OPERACIONAL`), alinhado às validações existentes por `fazenda_id` + `usuarios_fazendas`.
- **Escopo**: Tabela `usuarios_fazendas`; respostas que listam fazendas por utilizador (`GET /api/v1/me/fazendas` e listagens internas que reutilizam `GetFazendasByUsuarioID`).
- **Perfis / permissões**: **`POST /api/v1/me/fazendas`** (apenas **PROPRIETARIO**) cria o vínculo com **`TITULAR`**. **`PUT /api/v1/admin/usuarios/:id/fazendas`** (substituição do conjunto de fazendas) recria vínculos com **`OPERACIONAL`** para todas as fazendas indicadas (MVP; evolução futura: permitir marcar titular por fazenda no payload admin).
- **Efeito**: consultas analíticas e regras futuras podem filtrar por `papel` sem confundir com `usuarios.perfil` (perfil global RBAC).
- **Implementação**: migration `backend/migrations/21_usuarios_fazendas_papel.up.sql` (constraint `chk_usuarios_fazendas_papel`; backfill: vínculos de utilizadores com `perfil = 'PROPRIETARIO'` → `TITULAR`); `backend/internal/models/vinculo_fazenda.go` (`PapelVinculoTitular`, `PapelVinculoOperacional`); `backend/internal/models/fazenda.go` (campo JSON `papel` quando aplicável); `backend/internal/repository/fazenda_repository.go` (`GetFazendasByUsuarioID`, `SetFazendasForUsuario`, `CreateFazendaAndLinkUsuario`); `frontend/src/services/fazendas.ts` (tipo `Fazenda.papel`). **UI global do perfil RBAC** (nome + etiqueta “Proprietário”, etc.): `frontend/src/lib/perfilLabels.ts`, `frontend/src/components/layout/Header.tsx` — distinto do **`papel`** do vínculo.
- **Estado**: Implementado.

### BR-ACESSO-017 — Saúde animal: FUNCIONARIO regista e consulta

- **Enunciado**: `FUNCIONARIO` pode listar e consultar casos de saúde do animal (`GET /api/v1/animais/:id/saude` e `GET .../saude/:saudeId`) e **registar** novo caso (`POST .../saude`); não pode editar nem excluir (`PUT`/`DELETE` → 403). Perfis com API completa mantêm CRUD. `USER` sem acesso.
- **Escopo**: sub-recurso `/api/v1/animais/:id/saude*`; rotas UI `/animais/:id/saude`, `/animais/:id/saude/novo` (condicionamento visual de botões na Onda 1.4).
- **Perfis / permissões**: ver [saude-animal.md](./saude-animal.md) — BR-SAUDE-001.
- **Efeito**: bloqueio 403 no servidor; UI (1.4) usa `canCriarRegistroSaude` / `canEditarRegistroSaude` / `canExcluirRegistroSaude`.
- **Implementação**: `perfil_access.go` (`funcionarioAnimaisSaudePath`); `appAccess.ts` (`isFuncionarioAllowedPath`, helpers de escrita).
- **Estado**: Implementado.

### BR-ACESSO-016 — Baixa do rebanho: FUNCIONARIO só morte

- **Enunciado**: `FUNCIONARIO` pode `POST /api/v1/animais/:id/baixa` **apenas** com `motivo_saida = MORTE`. Outros motivos e `POST .../baixa/reverter` exigem perfis com API completa (gestão/titular/admin).
- **Escopo**: API e rota UI `/animais/baixa`.
- **Perfis / permissões**: `FUNCIONARIO` (morte); `GERENTE`, `GESTAO`, `PROPRIETARIO`, `ADMIN`, `DEVELOPER` (todos os motivos + reversão).
- **Efeito**: bloqueio 403/400 no servidor; UI limita opções de motivo.
- **Implementação**: `perfil_access.go` (`funcionarioAnimaisBaixaPath`); `AnimalBaixaService.RegistrarBaixa`; `appAccess.ts` (`canRegistrarBaixa`, `motivosBaixaParaPerfil`).
- **Estado**: Implementado.

### BR-ACESSO-018 — Onboarding frio (USER sem fazenda) e tours guiados

- **Enunciado**: Utilizador com perfil **USER** e **sem** fazendas vinculadas vê um wizard de três passos em `/onboarding` (boas-vindas → contactar administrador → resumo das áreas futuras). Após concluir, a página resume o estado de provisão sem repetir o wizard. **USER** com fazenda(s) mas perfil ainda **USER** mantém a página estática de “perfil pendente” (sem wizard). Perfis operacionais (**FUNCIONARIO**, **GERENTE**, **GESTAO**, **PROPRIETARIO**, **ADMIN**) não passam pelo wizard. Na **primeira visita** ao **Dashboard** (`/`), tour opcional destaca busca de animal, indicadores (KPIs) e acesso rápido (`ceialmilk:dashboard-tour:v1:{userId}` + flag global legada). Na **primeira visita** à **ficha do animal** (`/animais/:id`), tour de 5 passos destaca sidebar, mini-timeline (Visão Geral), tab Ciclo, próximas ações e tabs Saúde/Produção/Histórico (`ceialmilk:animal-ficha-tour:v1:{userId}`). O utilizador pode pular qualquer tour; estado persiste em `localStorage` por `userId`; reinício pelo menu da conta («Ver tour do início novamente» / «Ver tour da ficha novamente»).
- **Escopo**: UI `/onboarding`, `/`, `/animais/:id`, listagens iniciais em animais, produção e hub de gestão.
- **Perfis / permissões**: wizard só **USER** sem fazenda; tours em perfis operacionais (não modo `pending` — `getAreasMode !== "pending"`).
- **Efeito**: orientação na UI; sem alteração de permissões na API.
- **Implementação**: `frontend/src/components/wizard/*`, `frontend/src/components/onboarding/*`, `frontend/src/lib/onboardingStorage.ts`, `frontend/src/components/ui/tour.tsx` (`DashboardTourHost`, `AnimalFichaTourHost`), `frontend/src/components/dashboard/Dashboard.tsx`, `frontend/src/components/animais/ficha/AnimalFichaShell.tsx`, `frontend/src/app/onboarding/page.tsx`, `frontend/src/components/layout/HeaderAccountPopover.tsx`.
- **Estado**: Implementado.

### BR-ACESSO-013 — Folgas e rotas “OrGestão”: atalho sem vínculo só plataforma

- **Enunciado**: Em rotas que usam `ValidateFazendaAccessOrGestao` e na validação de acesso a folgas no serviço, apenas **ADMIN**, **DEVELOPER** e **GESTAO** podem aceder a uma fazenda **sem** linha em `usuarios_fazendas`. **GERENTE** e **PROPRIETARIO** exigem vínculo, garantindo isolamento de dados entre explorações.
- **Escopo**: `backend/internal/handlers/access_helper.go`; `backend/internal/service/folgas_service.go` (`validarAcessoFazenda`); `backend/internal/models/perfil.go` (`PodeAcessarFazendaSemVinculoGestao`).
- **Efeito**: bloqueio 403 quando ID de fazenda alheia é usado sem vínculo.
- **Estado**: Implementado.

### BR-ACESSO-019 — Perfil GESTAO (gestão global, perfil ativo)

- **Enunciado**: O perfil `GESTAO` **não é legado** — é atribuível via admin e usado em produção. Tem **acesso API completo** no middleware (`PerfilTemAcessoAPICompleta` = true), como `GERENTE` e `PROPRIETARIO`; **não** aparece em whitelists de `perfil_access.go` porque whitelists existem só para `FUNCIONARIO` e `USER`. Na UI, `getAreasMode("GESTAO")` devolve `"full"` (todas as áreas operacionais). Diferencial: junto com **ADMIN** e **DEVELOPER**, `GESTAO` pode aceder a fazendas **sem** vínculo em `usuarios_fazendas` (BR-ACESSO-013) e gerir folgas (`PodeGerenciarFolgas`).
- **Escopo**: `backend/internal/models/perfil.go`, `backend/internal/auth/perfil_access.go`, `frontend/src/config/appAccess.ts`.
- **Efeito**: sem restrição de whitelist; isolamento por fazenda aplicado via `ValidateFazendaAccessOrGestao` e regras de domínio (alertas, baixa, etc.).
- **Estado**: Implementado.

### BR-ACESSO-020 — Exclusão de fazenda (`DELETE /api/v1/fazendas/:id`)

- **Enunciado**: Apenas **ADMIN**, **DEVELOPER**, **GESTAO** e **PROPRIETARIO** podem excluir uma fazenda. **ADMIN**, **DEVELOPER** e **GESTAO** podem excluir qualquer fazenda existente (sem exigir vínculo em `usuarios_fazendas`). **PROPRIETARIO** só pode excluir fazendas às quais está vinculado. Demais perfis recebem **403** no middleware; requisição sem token recebe **401**; ID inexistente retorna **404**.
- **Escopo**: API `DELETE /api/v1/fazendas/:id`; tabela `fazendas`.
- **Perfis / permissões**: `PodeDeletarFazenda` em `backend/internal/models/perfil.go`; middleware `RequirePodeDeletarFazenda`; validação de escopo via `ValidateFazendaAccessOrGestao` no handler `Delete`.
- **Efeito**: bloqueio no servidor para perfis não autorizados ou fazenda fora do escopo do titular.
- **Implementação**: `backend/cmd/api/main.go`; `backend/internal/auth/middleware.go`; `backend/internal/handlers/fazenda_handler.go`; `backend/internal/handlers/access_helper.go`.
- **Estado**: Implementado.

### BR-ACESSO-021 — Perfil do utilizador autenticado (`GET /api/v1/me`)

- **Enunciado**: Todo utilizador autenticado via JWT pode consultar os seus próprios dados (`id`, `nome`, `email`, `perfil`) em `GET /api/v1/me`. Sem token ou com token inválido → **401**; utilizador inexistente ou desativado → **401**.
- **Escopo**: API JWT; tabela `usuarios`.
- **Perfis / permissões**: Todos os perfis JWT (incl. **USER** e **FUNCIONARIO**); whitelist em `isMeProfileRoute` / `requestAllowedForUser` / `requestAllowedForFuncionario`.
- **Efeito**: bloqueio no servidor para requisições não autenticadas; resposta não expõe `senha` nem campos internos.
- **Implementação**: `backend/internal/handlers/auth_handler.go` (`Me`); `backend/cmd/api/main.go` (`me.GET("", ...)`); `backend/internal/auth/perfil_access.go`.
- **Estado**: Implementado.

---

**Última atualização**: 2026-06-08 (BR-ACESSO-018: tour guiado na ficha do animal)
