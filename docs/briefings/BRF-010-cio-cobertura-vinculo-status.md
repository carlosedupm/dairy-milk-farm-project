# Briefing BRF-010 — Cio obrigatório na cobertura e status

> Fluxo, papéis e gates: [`docs/briefings/README.md`](./README.md). O briefing é uma **ordem de serviço**: referencia regras por ID, não as copia.

## Metadados

| Campo | Valor |
|-------|-------|
| ID | `BRF-010` |
| Data | 2026-08-26 |
| Analista | Agente (análise cio/cobertura) |
| Status | aprovado |
| Aprovado por (G1) | desenvolvedor (decisões 1a/2a + ordem de implementação, 2026-08-26) |
| PR vinculado (G2) | — |

## 1. Objetivo

Garantir que toda cobertura (IA, IATF, monta ou TE) fique **ligada a um cio** do mesmo animal; permitir **nova cobertura em animal prenhe** quando o diagnóstico anterior estiver errado e o animal der cio de novo; expor no MVP os campos de sêmen/técnico/protocolo; e, ao **apagar** uma cobertura sem vínculos, **recalcular** o status reprodutivo (`VAZIA` / `SERVIDA`). O registo de cio que altera status (ex.: `SERVIDA` → `VAZIA`) permanece **sem confirmação extra** na UI.

## 2. Regras de negócio (fonte de verdade)

| ID | Módulo | Estado atual | O que muda |
|----|--------|--------------|------------|
| `BR-COBERTURAS-008` | [`coberturas.md`](../business/coberturas.md) | implementado | `cio_id` obrigatório na escrita (JWT/M2M/UI) |
| `BR-COBERTURAS-009` | [`coberturas.md`](../business/coberturas.md) | implementado | Cobertura permitida em animal `PRENHE` + gestação `PERDA` |
| `BR-COBERTURAS-010` | [`coberturas.md`](../business/coberturas.md) | implementado | Campos MVP `semen_partida`, `tecnico`, `protocolo_id` na UI |
| `BR-COBERTURAS-011` | [`coberturas.md`](../business/coberturas.md) | implementado | Delete de cobertura recalcula status |
| `BR-CIOS-006` | [`cios.md`](../business/cios.md) | implementado | Atualização de status ao cio é silenciosa na UI |
| `BR-COBERTURAS-006` | [`coberturas.md`](../business/coberturas.md) | implementado (ajustado) | Aponta escrita para 008 |
| `BR-CICLO-002` | [`ciclo-rebanho.md`](../business/ciclo-rebanho.md) | implementado (nota) | Referências às extensões 008/009/011 e CIOS-006 |
| `BR-CIOS-003` | [`cios.md`](../business/cios.md) | implementado (nota) | Explicitar `SERVIDA` → `VAZIA`; UX em 006 |

**Invariantes e validações aplicáveis**:

- `TMP-001` / `TMP-002` — data da cobertura e do cio (já em BR-CICLO-012/013)
- `TMP-003` — cobertura ≥ cio vinculado (passa a aplicar sempre que `cio_id` for obrigatório)
- `INT-008` — elegibilidade NOVILHA/MATRIZ (BR-CICLO-016/017)
- `INT-003` / `INT-005` — gestação `CONFIRMADA` fecha como `PERDA` na TX da cobertura em prenhe (resposta G1 #1a)
- `BR-COBERTURAS-004` — exclusão ainda bloqueada com gestação/toque

**Perfis autorizados** (conforme [`acessos-perfil.md`](../business/acessos-perfil.md)):

- `FUNCIONARIO` e perfis com gestão reprodutiva: POST/PUT/DELETE cios e coberturas — **BR-ACESSO-002**
- M2M: scopes `coberturas:write` / leitura — [`integracoes.md`](../business/integracoes.md)

## 3. Escopo da implementação

### Backend

- **Endpoints**: `POST|PUT|DELETE /api/v1/coberturas`; `POST /api/v1/integracoes/coberturas` (+ lote); sem mudança de contrato de cios além de garantir UX alinhada a BR-CIOS-006
- **Camadas tocadas**: `cobertura_service.go` (validação `cio_id`, delete→status, prenhe permitido); handlers JWT/M2M; OpenAPI integrações; possivelmente `animal_ciclo_service.go` (`proximas_acoes` só com cio aberto)
- **Migration/constraint**: índice único parcial `coberturas(cio_id) WHERE cio_id IS NOT NULL` (sem `NOT NULL` — legado); escritas novas exigem `cio_id`
- **Códigos de erro**: 400 com mensagem clara para cio ausente/inválido/já vinculado; 409 mantém `ErrCoberturaTemVinculos` (BR-COBERTURAS-004)

### Frontend

- **Páginas/rotas**: `/gestao/coberturas/novo`, `/gestao/coberturas/[id]/editar`
- **Componentes**: `CoberturaFormFields` (enviar `cio_id`; campos sêmen/técnico/protocolo); validação em `form-validation.ts`; deep link / `proximas_acoes` alinhados
- (Checklist de UI: seguir `.cursor/rules/frontend-ui-patterns.mdc` — não repetir aqui)

### O que NÃO mexer

- Regras de toque positivo sem cobertura e módulo toques/gestações (exceto o efeito decidido na pergunta #1)
- Fluxo de parto / secagem / lactação / produção
- `BR-CIOS-003` exceção que **não** altera status se já `PRENHE` (cio em prenhe continua permitido e silencioso quanto a status)
- Cadastro CRUD completo de protocolos IATF (só **seleção** de protocolo existente no form de cobertura)
- Alterar RBAC de FUNCIONARIO (BR-ACESSO-002) além do necessário para os novos campos

## 4. Casos de teste exigidos

- [ ] Caminho feliz: cio → cobertura com `cio_id` → status `SERVIDA`; cio some da elegibilidade `para-cobertura`
- [ ] Bordas temporais (`TMP-003`): cobertura com data civil anterior ao cio vinculado → 400
- [ ] Cobertura sem `cio_id` (JWT e M2M) → 400
- [ ] Cio de outro animal / cio já vinculado a outra cobertura → 400
- [ ] Animal `PRENHE` com cio → cobertura permitida → `SERVIDA` (e efeito na gestação conforme resposta da pergunta #1)
- [ ] Delete cobertura sem vínculos → status `VAZIA`; delete com outra cobertura ainda “aberta” → permanece `SERVIDA` (BR-COBERTURAS-011)
- [ ] Delete com toque/gestação → 409 (regressão BR-COBERTURAS-004)
- [ ] UI: campos `semen_partida` / `tecnico` / `protocolo_id` visíveis para IA/IATF/TE; opcionais no submit
- [ ] UI: registo de cio em animal `SERVIDA` sem modal extra de status (BR-CIOS-006)
- [ ] RBAC: FUNCIONARIO continua a poder POST cobertura com `cio_id` (BR-ACESSO-002)

## 5. Perguntas em aberto (obrigatório)

> Dúvida não respondida **bloqueia** o gate G1.

| # | Pergunta | Resposta (desenvolvedor) |
|---|----------|--------------------------|
| 1 | Ao registar cobertura em animal com gestação `CONFIRMADA` ativa (caso de correção após cio em prenhe — BR-COBERTURAS-009), a gestação deve: **(a)** passar a `PERDA` na mesma transação; **(b)** bloquear a cobertura até existir toque `NEGATIVO` (ou outro encerramento); **(c)** outra regra? | **(a)** — gestação → `PERDA` na mesma TX; status → `SERVIDA`. |
| 2 | Registos legados de cobertura **sem** `cio_id`: na migration, **backfill** impossível sem inventar cio — preferir **(a)** só exigir `cio_id` em escritas novas (legado read-only sem NOT NULL); **(b)** exigir limpeza manual antes do deploy? | **(a)** — exigir `cio_id` só em Create/Update; GET legado `nullable`; sem `NOT NULL`. |

## 6. Critérios de aceite (gate G3)

- [ ] `cd backend && go test ./... -count=1` OK
- [ ] `cd frontend && npm run lint && npm run typecheck && npm run validate:tokens` OK
- [ ] `node scripts/validate-br-refs.mjs` OK
- [ ] Casos de teste da seção 4 existem e passam
- [ ] Comportamento validado no fluxo completo (manual): cio → cobertura vinculada → toque; prenhe+cio → cobertura; delete → status
- [ ] `BR-*` da seção 2 atualizadas para `implementado` com ponteiros ao código
- [ ] `memory-bank/activeContext.md` atualizado
- [ ] Status deste briefing → `implementado`

## 7. Notas adicionais

Decisões de negócio já tomadas (chat 2026-08-26):

1. Cobertura **exige** cio vinculado (inclui IATF).
2. Animal `PRENHE` **pode** receber cobertura (erro de veterinário + retorno de cio).
3. Cio que altera status (`SERVIDA` → `VAZIA`): **só** atualização silenciosa.
4. Campos sêmen/técnico/protocolo: **MVP** (opcionais, visíveis).
5. Exclusão de cobertura: **sim**, recalcular status (`VAZIA` / `SERVIDA` se restar cobertura aberta).

Lacuna de produto que motivou o briefing: a UI actual **não enviava** `cio_id`, enquanto `para-cobertura` filtrava por cio sem vínculo — ver análise prévia no chat.
