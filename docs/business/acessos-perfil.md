# Regras de negócio — Acessos por perfil (RBAC)

Regras de autorização por perfil para navegação e operações na aplicação.

**Implementação principal**

- Frontend: `frontend/src/config/appAccess.ts`, `frontend/src/components/layout/RouteAccessGuard.tsx`, `frontend/src/app/page.tsx`, `frontend/src/app/gestao/page.tsx`, `frontend/src/app/animais/page.tsx`, `frontend/src/components/animais/AnimalTable.tsx`, `frontend/src/app/animais/[id]/page.tsx`.
- Backend: `backend/internal/auth/perfil_access.go` (middleware `RequirePerfilAPIAccess` aplicado em `/api/v1/*` autenticado).
- Rotas de domínio envolvidas: `backend/cmd/api/main.go` (`/api/v1/animais`, `/api/v1/cios`, `/api/v1/coberturas`, `/api/v1/partos`, `/api/v1/secagens`, `/api/v1/fazendas/:id/folgas/*`).

---

### BR-ACESSO-001 — FUNCIONARIO com acesso à home e módulos permitidos

- **Enunciado**: O perfil `FUNCIONARIO` pode acessar a tela principal (`/`) e navegar apenas para as áreas permitidas do seu perfil.
- **Escopo**: Frontend (menu, guard de rotas e landing padrão).
- **Perfis / permissões**: `FUNCIONARIO`.
- **Efeito**: bloqueio de rotas não permitidas na UI via redirecionamento para a landing.
- **Implementação**:
  - Matriz em `PERFIL_AREAS` com `animais`, `gestao` e `folgas`.
  - Landing padrão do perfil em `/`.
  - Validação de caminho por `isPathAllowedForPerfil`.
- **Estado**: Implementado.

### BR-ACESSO-002 — Gestão parcial para FUNCIONARIO

- **Enunciado**: No módulo Gestão, `FUNCIONARIO` pode acessar apenas manutenção de Cios, Coberturas, Partos e Secagens.
- **Escopo**: Frontend e API de gestão pecuária.
- **Perfis / permissões**: `FUNCIONARIO`.
- **Efeito**:
  - UI: cards/rotas de Gestão fora desse escopo ficam ocultos ou bloqueados.
  - API: endpoints fora da whitelist retornam 403.
- **Implementação**:
  - Rotas UI permitidas: `/gestao`, `/gestao/cios*`, `/gestao/coberturas*`, `/gestao/partos*`, `/gestao/secagens*`.
  - API permitida: `/api/v1/cios*`, `/api/v1/coberturas*`, `/api/v1/partos*`, `/api/v1/secagens*`.
- **Estado**: Implementado.

### BR-ACESSO-003 — Animais em modo consulta para FUNCIONARIO

- **Enunciado**: No módulo Animais, `FUNCIONARIO` tem somente consulta, incluindo detalhe e histórico/resumo de produção.
- **Escopo**: Frontend e API de animais.
- **Perfis / permissões**: `FUNCIONARIO`.
- **Efeito**:
  - UI: sem ações de criar/editar/excluir animal e sem atalho para registrar produção.
  - API: apenas leitura (`GET`) em `/api/v1/animais*`.
- **Implementação**:
  - UI permitida: `/animais` e `/animais/:id`.
  - API leitura por método HTTP no middleware de perfil.
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

---

**Última atualização**: 2026-05-07
