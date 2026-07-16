# Briefing BRF-008 — Links de navegação para eventos do ciclo na ficha do animal

> Fluxo, papéis e gates: [`docs/briefings/README.md`](./README.md). O briefing é uma **ordem de serviço**: referencia regras por ID, não as copia.

## Metadados

| Campo | Valor |
|-------|-------|
| ID | `BRF-008` |
| Data | 2026-07-16 |
| Analista | Cursor Agent (análise frontend + API) |
| Status | aprovado |
| Aprovado por (G1) | — |
| PR vinculado (G2) | — |

## 1. Objetivo

Na ficha do animal (`/animais/:id`), o pecuarista precisa abrir o **detalhe/edição** de cada evento da timeline (tabs **Histórico** e **Ciclo**, e mini-preview na Visão Geral) com um clique no título — sem rebuscar o animal nas listagens de gestão. Hoje só **Saúde** (se pode editar) e **Alerta** (lista genérica) têm link; marcos **concluídos** do ciclo são texto estático.

## 2. Regras de negócio (fonte de verdade)

| ID | Módulo | Estado atual | O que muda |
|----|--------|--------------|------------|
| `BR-CICLO-019` | [`ciclo-rebanho.md`](../business/ciclo-rebanho.md) / [`BR-CICLO-019.md`](../business/BR-CICLO-019.md) | planejado | Implementar links; **corrigir tabela de rotas** para alinhar às páginas já existentes (ver §7) |
| `BR-ANIMAIS-013` | [`animais.md`](../business/animais.md) | planejado | Mesmo comportamento na ficha; ponteiro de implementação |

**Invariantes e validações aplicáveis:**

- Sem alteração de regras TMP/INT — apenas navegação UI.
- `ref_id` já preenchido pela timeline (não inventar IDs no front).

**Perfis autorizados** (conforme [`acessos-perfil.md`](../business/acessos-perfil.md) + `frontend/src/config/appAccess.ts`):

- Exibir link **somente** se `isPathAllowedForPerfil(perfil, href)` (e helpers de edição quando a rota for de edição).
- FUNCIONARIO: gestão parcial (cios/coberturas/toques/partos/secagens/hormônio); **sem** `/animais/:id/vacinas/editar/...` nem `/producao/:id/editar` no allowlist atual — não quebrar RBAC ao linkar.
- USER: sem edição; sem link para rotas de edição.

## 3. Escopo da implementação

### Achados da análise (estado atual)

#### Renderização frontend

| Componente | Papel | Links hoje |
|------------|-------|------------|
| `AnimalTimelineList.tsx` | Lista tab **Histórico** | `SAUDE` → `/animais/:id/saude/editar/:ref_id` se `canEditSaude`; `ALERTA` → `/alertas`; demais tipos = `<p>` |
| `AnimalCicloTimelineVisual.tsx` | Timeline visual | Marcos **previstos**: Link via `hrefPath` + `canProximaAcao`; marcos **concluídos**: título sem link (mesmo com `ref_id`) |
| `AnimalFichaTabCiclo.tsx` | Tab Ciclo | Só compõe `AnimalFichaCiclo` + `AnimalCicloTimelineSection` — sem lógica de href |
| `AnimalCicloMiniPreview.tsx` | Sidebar Visão Geral | Embed `AnimalCicloTimelineSection` (`bare`, max 5) — herda gap dos concluídos; CTA "Ver ciclo completo" → `?tab=ciclo` |
| `AnimalCicloTimelineSection.tsx` | Dados ciclo | `getTimeline(..., tipo: "ciclo")`; monta `CicloMarcoConcluido` com `ref_id` mas não passa href |

#### API `GET /api/v1/animais/:id/timeline`

- Query: `limit`, `offset`, `tipo` ∈ `todos|ciclo|saude|alertas|vacinas|hormonio_lactacao`.
- Item (`CicloTimelineItem` / `models.CicloTimelineItem`): `tipo`, `data`, `titulo`, `detalhe?`, **`ref_id`**, `created_by?`, `registrado_por?`.
- Union SQL em `timeline_repository.go` — **`ref_id` = PK do registro** para todos os tipos; para `BAIXA`, `ref_id` = `animais.id`.
- Tipos emitidos: `CIO`, `COBERTURA`, `TOQUE`, `GESTACAO`, `SECAGEM`, `PARTO`, `LACTACAO`, `PRODUCAO`, `SAUDE`, `ALERTA`, `VACINA`, `HORMONIO_LACTACAO`, `BAIXA`.

#### Rotas de detalhe (realidade vs BR-CICLO-019)

| Tipo | Rota frontend real | Backend GET por id | Ação neste BRF |
|------|--------------------|--------------------|----------------|
| `SAUDE` | `/animais/:id/saude/editar/:saudeId` | `GET .../animais/:id/saude/:saudeId` | Manter; avaliar link leitura se perfil sem PUT |
| `VACINA` | `/animais/:id/vacinas/editar/:vacinaId` (**já existe**) | `GET .../vacinas/:vacinaId` | **Só wire** — não criar página nova |
| `HORMONIO_LACTACAO` | `/animais/:id/hormonios-lactacao/:aplicacaoId/editar` (**já existe**) | `GET .../hormonios-lactacao/:aplicacaoId` | **Só wire** |
| `PARTO` | `/gestao/partos/:id/editar` (**já existe**) | `GET /api/v1/partos/:id` | **Só wire** — **não** criar `/animais/:id/partos/...` |
| `CIO` | `/gestao/cios/:id/editar` | `GET /api/v1/cios/:id` | Wire |
| `COBERTURA` | `/gestao/coberturas/:id/editar` | `GET /api/v1/coberturas/:id` | Wire |
| `PRODUCAO` | `/producao/:id/editar` | `GET /api/v1/producao/:id` | Wire (respeitar allowlist) |
| `ALERTA` | `/alertas` (lista; sem deep-link por id no UI) | `GET /fazendas/:id/alertas/:alertaId` | Melhorar se G1 decidir; senão manter lista |
| `BAIXA` | `/animais/baixa?animal_id=` | N/A (estado no animal) | Wire com cuidado se já baixado |
| `TOQUE` | Só lista/novo/lote — **sem** `.../editar` | **Sem** `GET /toques/:id` | Ver pergunta #1 |
| `GESTACAO` | Só lista `/gestao/gestacoes` | **Sem** `GET /gestacoes/:id` | Ver pergunta #1 |
| `SECAGEM` | Só lista/novo | **Sem** `GET /secagens/:id` | Ver pergunta #1 |
| `LACTACAO` | Lista → ficha do animal; **sem** detalhe | **Sem** `GET /lactacoes/:id` | Ver pergunta #2 |

**Conclusão sobre "páginas a criar":** **vacina, hormônio e parto já têm UI de edição**. O único gap claro entre os quatro citados em BR-CICLO-019 é **lactação**; toque/gestação/secagem também não têm detalhe.

### Backend

- **Endpoints:** preferência = **nenhum novo** se G1 aceitar reutilizar rotas existentes; apenas se G1 exigir detalhe de lactação/toque/gestação/secagem → criar `GET` por id + página.
- **Camadas:** timeline já OK (`ref_id`); não alterar union salvo bug.
- **Migration:** nenhuma.

### Frontend

- **Novo helper:** `animalEventoLinks.ts` (ou estender `animalFichaLinks.ts`) — `timelineItemHref(animalId, item, perfil) → string | null`.
- **Alterar:** `AnimalTimelineList.tsx`, `AnimalCicloTimelineVisual.tsx` (`MarcoConcluidoCard`).
- **Páginas novas:** só se G1 responder #1/#2 exigindo detalhe (lactação prioridade).

### O que NÃO mexer

- Regras de geração de timeline / filtros `tipo`.
- Criar rotas duplicadas `/animais/:id/partos|vacinas/:id` se as de edição atuais bastarem.
- Rascunho inválido `docs/business/BRF-001/frontend-links-eventos-cycle-na-ficha.md` (conflito de ID com BRF-001 vacinas).

## 4. Casos de teste exigidos

- [ ] Caminho feliz: `PARTO` / `CIO` / `VACINA` com `ref_id` → href correto e formulário preenchido
- [ ] `ref_id` ausente → sem link
- [ ] RBAC FUNCIONARIO / USER
- [ ] Histórico + Ciclo + mini-preview com o mesmo mapper
- [ ] Marcos previstos sem regressão
- [ ] Unit do mapper `tipo → path`

## 5. Perguntas em aberto (bloqueiam G1)

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | `TOQUE`/`GESTACAO`/`SECAGEM`: (A) sem link neste BRF; (B) GET+editar; (C) só listagem? | **B — criar GET+editar** |
| 2 | `LACTACAO`: (A) GET+página; (B) link para ficha; (C) fora do escopo? | **A — GET+página** |
| 3 | Corrigir rotas em BR-CICLO-019 / BR-ANIMAIS-013 para paths reais? | **Sim** |
| 4 | Saúde/vacina: link só se pode editar, ou também visualização? | **visualização (read-only)** |
| 5 | Alerta: deep-link ou manter `/alertas`? | **manter lista** |
| 6 | Baixa já registrada: link para formulário ou só texto? | **texto informativo** |

## 6. Critérios de aceite (gate G3)

- [ ] `go test`, lint/typecheck/tokens, `validate-br-refs`
- [ ] Casos §4 + validação manual
- [ ] BR-CICLO-019 / BR-ANIMAIS-013 → `implementado`
- [ ] memory-bank + status briefing → `implementado`

## 7. Riscos e mapeamento recomendado

1. BR-CICLO-019 desatualizado (páginas "NOVO" que já existem)
2. RBAC FUNCIONARIO sem vacina/produção editar no allowlist
3. Assimetria saúde (`canEditSaude` apenas)
4. Alerta sem deep-link; baixa com `ref_id = animal_id`
5. Mapper único Histórico/Ciclo; sem payload extra na timeline

```text
CIO                 → /gestao/cios/{ref_id}/editar
COBERTURA           → /gestao/coberturas/{ref_id}/editar
PARTO               → /gestao/partos/{ref_id}/editar
PRODUCAO            → /producao/{ref_id}/editar
SAUDE               → /animais/{animalId}/saude/editar/{ref_id}
VACINA              → /animais/{animalId}/vacinas/editar/{ref_id}
HORMONIO_LACTACAO   → /animais/{animalId}/hormonios-lactacao/{ref_id}/editar
ALERTA              → /alertas  (ou deep-link se #5)
BAIXA               → /animais/baixa?animal_id={animalId}
TOQUE|GESTACAO|SECAGEM|LACTACAO → conforme #1/#2
```

---

**Próximo passo:** responder as 6 perguntas da §5 para liberar G1 (`Status: aprovado`).