# Regras de negócio — Animais

Regras de consulta de animais por identificação com foco em retorno rápido e contextual para o usuário após login.

**Implementação principal**

- Backend: `backend/internal/handlers/animal_handler.go`, `backend/internal/service/animal_service.go`, rotas em `backend/cmd/api/main.go`.
- Frontend: `frontend/src/components/animais/AnimalSearchHome.tsx`, `frontend/src/services/animais.ts`, home em `frontend/src/app/page.tsx`.
- Produção (resumo contextual): `backend/internal/service/producao_service.go`.

---

### BR-ANIMAIS-001 — Busca inteligente por identificação na home

- **Enunciado**: Usuário autenticado pode pesquisar o animal na tela inicial por identificação e obter informações contextualizadas para decisão rápida.
- **Escopo**: Home (`/`) para perfis com acesso padrão completo.
- **Perfis / permissões**: perfis autenticados com `mode=full`; acesso aos resultados é limitado às fazendas vinculadas ao usuário.
- **Efeito**: bloqueio no servidor para fazendas não vinculadas; UI exibe apenas resultados autorizados.
- **Implementação**:
  - Busca por identificação (parcial + equivalência número ↔ por extenso): `GET /api/v1/animais/search/by-identificacao`.
  - Contexto do animal: `GET /api/v1/animais/:id/contexto` (animal + resumo de produção).
  - Validação de acesso: `ValidateFazendaAccess` + filtro por `GetByUsuarioID` na busca.
- **Estado**: Implementado.

### BR-ANIMAIS-002 — Contexto mínimo obrigatório no resultado inteligente

- **Enunciado**: Ao selecionar um resultado, o sistema deve apresentar dados essenciais do animal e indicadores de produção consolidados.
- **Escopo**: Resumo exibido na home após busca.
- **Efeito**: informativo na UI; consulta consolidada no backend.
- **Dados exibidos**:
  - identificação do animal;
  - status de saúde e status reprodutivo;
  - data de nascimento (quando disponível);
  - resumo de produção (`total_litros`, `media_litros`, `total_registros`).
- **Regra de exibição da fazenda na busca**: na lista de resultados da home, **não** exibir nome/ID da fazenda, pois o contexto já é da fazenda ativa do usuário logado.
- **Implementação**: payload `data.animal` + `data.resumo_producao` do endpoint `GET /api/v1/animais/:id/contexto`.
- **Estado**: Implementado.

---

**Última atualização**: 2026-05-07
