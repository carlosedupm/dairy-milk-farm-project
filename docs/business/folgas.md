# Regras de negócio — Folgas (escala 5x1)

Organização de folgas da **equipe por fazenda**, com rodízio **5x1** (três profissionais em slots sequenciais no ciclo).

**Implementação principal**

- Backend: `backend/internal/service/folgas_service.go`, `backend/internal/handlers/folgas_handler.go`; rotas em `backend/cmd/api/main.go` sob `/api/v1/fazendas/:id/folgas/*`.
- Permissões de escrita de escala/config: `backend/internal/models/perfil.go` (`PodeGerenciarFolgas`), middleware `RequireGestaoFolgas` em `backend/internal/auth/middleware.go`.
- Acesso restrito FUNCIONARIO ao restante da API: `backend/internal/auth/perfil_access.go` (alinhar com `frontend/src/config/appAccess.ts`).
- Frontend: `frontend/src/app/folgas/page.tsx`, `frontend/src/components/folgas/*`, `frontend/src/hooks/useFolgasPage.ts`, `frontend/src/services/folgas.ts`.
- Persistência (tabelas de domínio): migration `backend/migrations/16_add_folgas_escala.up.sql`; RLS em `backend/migrations/19_enable_row_level_security_public_tables.up.sql`.

---

### BR-FOLGAS-001 — Escopo por fazenda

- **Enunciado**: Configuração, escala e alertas referem-se sempre à **fazenda** no contexto da requisição/UI.
- **Escopo**: Por `fazenda_id`; usuários enxergam fazendas conforme vínculo N:N (`usuarios_fazendas`); admin atribui vínculos.
- **Perfis**: Conforme rotas e guards do módulo.
- **Efeito**: Bloqueio por autorização e por vínculo à fazenda onde aplicável.
- **Estado**: Implementado.

### BR-FOLGAS-002 — Configuração do rodízio

- **Enunciado**: A escala depende de **data âncora** do ciclo e de **três usuários** nos slots do rodízio.
- **Perfis elegíveis** (configuração na UI/API): principalmente **FUNCIONARIO** e **GERENTE**, com **GESTAO** como compatível (ver telas e contratos atuais).
- **Efeito**: Sem configuração válida, operações dependentes seguem comportamento documentado na API (ex.: mensagens ao obter config).
- **Estado**: Implementado.

### BR-FOLGAS-003 — Geração automática pelo mês visualizado

- **Enunciado**: A geração automática preenche o intervalo do **mês que o usuário está visualizando** no calendário (primeiro ao último dia desse mês), **preservando** dias já marcados como ajuste **MANUAL**.
- **Escopo**: Intervalo `inicio`/`fim` enviado pela UI — **não** está fixado ao “mês civil atual” do relógio se o usuário navegou para outro mês.
- **API**: `POST /api/v1/fazendas/:id/folgas/gerar` (corpo com período conforme implementação).
- **Efeito**: Persistência conforme serviço; conflitos de unicidade devem ser tratados com mensagens amigáveis (ver notas em `memory-bank/activeContext.md`).
- **Estado**: Implementado.

### BR-FOLGAS-004 — Alteração pela gestão e natureza dos alertas

- **Enunciado**: Perfis **GERENTE**, **GESTAO**, **ADMIN** e **DEVELOPER** podem alterar dia de folga (substituir dia inteiro ou adicionar segunda folga com motivo de exceção quando aplicável). **Equidade** e **alertas** são **informativos** — não bloqueiam a operação no backend.
- **API**: Alterações e resumo de equidade sob `/folgas/alteracoes`, `/folgas/resumo-equidade`, `/folgas/alertas` (ver handler).
- **Efeito**: Bloqueio apenas por perfil/autorização, não por “equidade” calculada.
- **Estado**: Implementado.

### BR-FOLGAS-005 — Papel do funcionário

- **Enunciado**: O funcionário vê a escala da fazenda vinculada; pode enviar **justificativa** apenas no **próprio** dia de folga; vê **exceção do dia** só quando é **folguista** naquela data.
- **Efeito**: Regras de visibilidade e de envio de justificativa na API e na UI.
- **Estado**: Implementado.

### BR-FOLGAS-006 — Transparência operacional

- **Enunciado**: O sistema expõe indicadores de divergência em relação ao previsto (ex.: “fora do rodízio”) e alertas quando há inconsistências (ex.: mais de uma folga no mesmo dia sem exceção ou sem justificativas completas), conforme implementação atual do serviço de alertas.
- **Efeito**: Informativo na UI; não substitui BR-FOLGAS-004 sobre bloqueios.
- **Estado**: Implementado.

### BR-FOLGAS-007 — Experiência mobile

- **Enunciado**: Manter **grade mensal**; concentrar textos longos (rodízio completo, motivos) em **painel/detalhe por dia** para reduzir ruído na grade.
- **Efeito**: Apresentação na UI; deve permanecer consistente com os dados da API.
- **Estado**: Implementado.

---

**Última atualização**: 2026-05-06
