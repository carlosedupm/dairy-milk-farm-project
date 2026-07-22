# Briefing BRF-009 — Modo ordenha com turno

> Fluxo, papéis e gates: [`docs/briefings/README.md`](./README.md). O briefing é uma **ordem de serviço**: referencia regras por ID, não as copia.

## Metadados

| Campo | Valor |
|-------|-------|
| ID | `BRF-009` |
| Data | 2026-07-21 |
| Analista | Cursor Agent (analista funcional — avaliação de negócio + plano modo ordenha) |
| Status | implementado |
| Aprovado por (G1) | Desenvolvedor humano (respostas §5, 2026-07-21) |
| PR vinculado (G2) | — |

## 1. Objetivo

Na sala de ordenha, o **funcionário** precisa registar o volume de leite de várias vacas em sequência, no **turno** correto (**manhã** ou **tarde**), vendo **quem ainda falta** e avisos operacionais (já registada neste turno; leite com restrição / descarte), sem voltar ao menu nem escolher animal num formulário genérico a cada vaca. O registo contínuo em `/producao/novo` (BR-PRODUCAO-007) reduz atrito do form, mas não oferece checklist de sessão nem noção explícita de turno.

## 2. Regras de negócio (fonte de verdade)

| ID | Módulo | Estado atual | O que muda |
|----|--------|--------------|------------|
| `BR-PRODUCAO-008` | [`producao-leite.md`](../business/producao-leite.md) | planejado | Criação: modo ordenha UI + turno Manhã/Tarde + bloqueio de duplicata no turno |
| `BR-PRODUCAO-009` | [`producao-leite.md`](../business/producao-leite.md) | planejado | Criação: badge restrição de leite na lista da ordenha (**neste BRF**) |
| `BR-ACESSO-015` | [`acessos-perfil.md`](../business/acessos-perfil.md) | implementado | Path UI `/producao/ordenha` (+ `/producao` listagem) |
| `BR-LEITE-008` | [`leite-restricoes.md`](../business/leite-restricoes.md) | planejado | Ponteiro: restrições ativas visíveis no modo ordenha |

**Invariantes e validações aplicáveis** (sem alteração de semântica TMP/INT no servidor nesta entrega):

- `BR-PRODUCAO-001`–`006` — animal, quantidade, lactação ativa, escopo fazenda, temporal, `lactacao_id`
- `TMP-001` — `data_hora` = **sempre `now`** (não futura)
- `INT-002` / `BR-CICLO-007` — produção exige lactação ativa na data
- `BR-PRODUCAO-007` — permanece para registo avulso / deep-link da ficha; **não** remover
- `BR-LEITE-002` — fonte de dados das restrições ativas

**Perfis autorizados** ([`acessos-perfil.md`](../business/acessos-perfil.md)):

- Quem pode `POST /api/v1/producao` (incl. **FUNCIONARIO** — BR-ACESSO-015) acede a `/producao/ordenha`
- Sem novos privilegios de PUT/DELETE produção

## 3. Escopo da implementação

### Backend

- **Endpoints novos**: nenhum
- **Reutilizar**: `GET .../animais/em-lactacao`; `POST /api/v1/producao`; filtro de produção por data (`start`/`end`); `GET .../restricoes-leite/ativas`
- **Migration/constraint**: nenhuma (bloqueio de duplicata no turno é **UI do modo ordenha** nesta fase; sem UNIQUE no banco)
- **Códigos de erro**: os já existentes em produção (INT-002, TMP-*, validação quantidade)

### Frontend

- **Páginas/rotas**: `/producao/ordenha` (nova); atalho Dashboard e `/producao`; KPI leite FUNCIONARIO → ordenha
- **Novos**: `lib/ordenha-turno.ts` (`MANHA` \| `TARDE` apenas); `hooks/useOrdenhaSession.ts`; `OrdenhaSessionView`; `OrdenhaAnimalCard`
- **Allowlist**: `appAccess.ts` — `/producao/ordenha` (BR-ACESSO-015)
- **Sessão**: `sessionStorage` `ceialmilk:ordenha:v1:{fazendaId}:{dia}:{turno}` — puladas, foco, litros; **«já neste turno» / bloqueio** recalculados da API ao carregar
- **Turno**: default inferido da hora; escolha explícita Manhã/Tarde no setup; janelas: MANHA `00:00–11:59`, TARDE `12:00–23:59` (Noite absorvida na Tarde — decisão G1 #1)
- **`data_hora`**: sempre **`now`** no POST; o turno escolhido classifica a **sessão** e o critério «já neste turno» / bloqueio (decisão G1 #2)
- **Bloqueio**: se o animal já tem produção no dia civil com `data_hora` na janela do **turno da sessão**, desabilitar registo nessa vaca com mensagem clara (decisão G1 #3)
- **Badge**: restrição `AGUARDANDO_LAB` (BR-PRODUCAO-009 / BR-LEITE-008) — decisão G1 #4
- Se turno da sessão ≠ turno inferido de `now`, aviso informativo: o registo será gravado com a hora atual e, em sessões futuras, classificado pela janela dessa hora
- Manter `/producao/novo` (BR-PRODUCAO-007) — sem o bloqueio de turno deste modo

### O que NÃO mexer

- Schema `producao_leite` (sem coluna `turno`)
- `POST /producao/lote` / batch
- Entidade `sessao_ordenha` no servidor
- Ordem por lote/posição na sala
- Offline / Wake Lock / PWA
- Remover ou alterar comportamento contínuo de `/producao/novo` para além de atalhos de entrada
- Regras TMP/INT no `ProducaoService` (salvo bug)

## 4. Casos de teste exigidos

- [x] Unit: `ordenha-turno.ts` (só MANHA/TARDE; janelas; `isSameTurno`) — `frontend/src/lib/ordenha-turno.test.ts`
- [x] Caminho feliz / turno / bloqueio / badge / reload / RBAC — validação manual G3 (2026-07-21, desenvolvedor)
## 5. Perguntas em aberto (obrigatório)

> Respondidas em G1 (2026-07-21). Nenhuma pendente.

| # | Pergunta | Resposta (desenvolvedor) |
|---|----------|--------------------------|
| 1 | Turnos na v1: só **Manhã + Tarde**, ou **Manhã + Tarde + Noite**? | **Manhã + Tarde**. Janelas: MANHA `00:00–11:59`, TARDE `12:00–23:59` (sem turno Noite dedicado). |
| 2 | `data_hora` no lançamento com turno ≠ janela atual: âncora vs sempre `now`? | **`data_hora` = sempre `now`**. O utilizador **escolhe o turno da sessão** (checklist / bloqueio / «já neste turno»); a hora gravada não é inventada. |
| 3 | Segundo registo do mesmo animal no mesmo turno: aviso ou bloqueio? | **Bloqueio** no modo ordenha (UI): não permitir novo POST para esse animal nesse turno/dia. |
| 4 | BR-PRODUCAO-009 (badge restrição) neste BRF ou v1.1? | **Neste BRF** (badge obrigatório). |

## 6. Critérios de aceite (gate G3)

- [x] `cd frontend && npm run typecheck` + unit `ordenha-turno` OK
- [x] `node scripts/validate-br-refs.mjs` OK (após sync docs)
- [x] `BR-PRODUCAO-008`, `BR-PRODUCAO-009`, `BR-LEITE-008`, extensão `BR-ACESSO-015` → `implementado` com ponteiros ao código
- [x] `memory-bank/activeContext.md` atualizado
- [x] Status deste briefing → `implementado`
- [x] Fluxo manual G3 (desenvolvedor, 2026-07-21)
- [x] `npm run lint` + `validate:tokens` no frontend (ficheiros da feature)
## 7. Notas adicionais

- **G1 (2026-07-21)**: turnos binários; `now` + escolha de sessão; bloqueio UI; badge no escopo.
- **Implementação (2026-07-21)**: `/producao/ordenha`; FUNCIONARIO também com allowlist `/producao` para Encerrar → listagem.
- **Limite Fase 1**: bloqueio não se aplica a `/producao/novo` nem a UNIQUE no servidor.

**Última atualização**: 2026-07-21 (BRF-009 G3 OK — sync docs/atalhos)
