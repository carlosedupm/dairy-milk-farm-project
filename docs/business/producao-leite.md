# Regras de negócio — Produção de leite

Registro diário de **volume de leite** por animal na fazenda.

**Implementação principal**

- Backend: `backend/internal/service/producao_service.go`, `backend/internal/handlers/producao_handler.go`.
- API: `POST /api/v1/producao` (entre outras rotas de consulta/edição para perfis autorizados).
- Frontend: `frontend/src/app/producao/*`, `ProducaoForm.tsx`.
- RBAC: FUNCIONARIO com `POST` — [acessos-perfil.md](./acessos-perfil.md) BR-ACESSO-015.

---

### BR-PRODUCAO-001 — Animal existente na fazenda

- **Enunciado**: `animal_id` obrigatório; animal deve existir e o utilizador deve ter acesso à fazenda do animal.
- **Efeito**: bloqueio no servidor.
- **Estado**: implementado.

### BR-PRODUCAO-002 — Quantidade e qualidade

- **Enunciado**: `quantidade` > 0; `qualidade` opcional entre 1 e 10.
- **Efeito**: bloqueio no servidor.
- **Estado**: implementado.

### BR-PRODUCAO-003 — Produção exige lactação ativa

- **Enunciado**: Não é permitido registrar produção para animal **sem** lactação ativa na fazenda (`data_fim` nula; status nulo ou `EM_ANDAMENTO`).
- **Escopo**: `POST` criação; alinhado a [leite-restricoes.md](./leite-restricoes.md) BR-LEITE-005.
- **Efeito**: bloqueio no servidor (400); aviso na UI antes do envio.
- **Implementação**: `ProducaoService.Create` + `LactacaoRepository.ExistsAtivaNaFazenda`; `ProducaoForm` lista apenas animais de `GET .../animais/em-lactacao` (mesmo critério que restrições de leite); [ciclo-rebanho.md](./ciclo-rebanho.md) BR-CICLO-007.
- **Estado**: implementado.

---

**Última atualização**: 2026-05-19
