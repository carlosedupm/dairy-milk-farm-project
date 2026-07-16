# Briefing BRF-008 — Links de navegação para eventos do ciclo na ficha do animal

> Fluxo, papéis e gates: [`docs/briefings/README.md`](./README.md). O briefing é uma **ordem de serviço**: referencia regras por ID, não as copia.

## Metadados

| Campo | Valor |
|-------|-------|
| ID | `BRF-008` |
| Data | 2026-07-16 |
| Analista | Cursor Agent (análise frontend + API) |
| Status | implementado |
| Aprovado por (G1) | Desenvolvedor humano (implementação solicitada 2026-07-15) |
| PR vinculado (G2) | — |

## 1. Objetivo

Na ficha do animal (`/animais/:id`), o pecuarista precisa abrir o **detalhe/edição** de cada evento da timeline (tabs **Histórico** e **Ciclo**, e mini-preview na Visão Geral) com um clique no título — sem rebuscar o animal nas listagens de gestão. Hoje só **Saúde** (se pode editar) e **Alerta** (lista genérica) têm link; marcos **concluídos** do ciclo são texto estático.

## 2. Regras de negócio (fonte de verdade)

| ID | Módulo | Estado atual | O que muda |
|----|--------|--------------|------------|
| `BR-CICLO-019` | [`ciclo-rebanho.md`](../business/ciclo-rebanho.md) / [`BR-CICLO-019.md`](../business/BR-CICLO-019.md) | planejado | Implementar links; **corrigir tabela de rotas** para paths reais (ver §7) |
| `BR-ANIMAIS-013` | [`animais.md`](../business/animais.md) | planejado | Mesmo comportamento na ficha; ponteiro de implementação |

**Invariantes e validações aplicáveis:**

- Sem alteração de regras TMP/INT — apenas navegação UI + CRUD de detalhe onde ainda não existe página/GET.
- `ref_id` já preenchido pela timeline (não inventar IDs no front).

**Perfis autorizados** (conforme [`acessos-perfil.md`](../business/acessos-perfil.md) + `frontend/src/config/appAccess.ts`):

- Exibir link **somente** se `isPathAllowedForPerfil(perfil, href)` for verdadeiro **após** eventuais ajustes de allowlist de leitura (§3 Read-only).
- FUNCIONARIO: gestão parcial (cios/coberturas/toques/partos/secagens/hormônio); **sem** PUT de vacina/produção — link de **visualização** permitido; submit/PUT bloqueado.
- USER: sem PUT; link de **visualização** nas rotas `/editar` com formulário desabilitado (quando o path estiver no allowlist de leitura).

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

#### Rotas de detalhe (decisão consolidada pós-§5)

| Tipo | Rota frontend | Backend GET por id | Ação neste BRF |
|------|---------------|--------------------|----------------|
| `SAUDE` | `/animais/:id/saude/editar/:saudeId` | `GET .../animais/:id/saude/:saudeId` | Wire + **read-only** se sem PUT |
| `VACINA` | `/animais/:id/vacinas/editar/:vacinaId` | `GET .../vacinas/:vacinaId` | **Só wire** + read-only se sem PUT |
| `HORMONIO_LACTACAO` | `/animais/:id/hormonios-lactacao/:aplicacaoId/editar` | `GET .../hormonios-lactacao/:aplicacaoId` | **Só wire** + read-only se sem PUT |
| `PARTO` | `/gestao/partos/:id/editar` | `GET /api/v1/partos/:id` | **Só wire** — **não** criar `/animais/:id/partos/...` |
| `CIO` | `/gestao/cios/:id/editar` | `GET /api/v1/cios/:id` | Wire |
| `COBERTURA` | `/gestao/coberturas/:id/editar` | `GET /api/v1/coberturas/:id` | Wire |
| `PRODUCAO` | `/producao/:id/editar` | `GET /api/v1/producao/:id` | Wire + read-only se sem PUT (FUNCIONARIO: allowlist de leitura) |
| `ALERTA` | `/alertas` | (lista; sem deep-link no UI) | **Manter lista** (§5 #5) |
| `BAIXA` | — | N/A (`ref_id` = animal) | **Sem link** — texto informativo (§5 #6) |
| `TOQUE` | `/gestao/toques/:id/editar` (**NOVO**) | `GET /api/v1/toques/:id` (**NOVO**) | Criar GET + página |
| `GESTACAO` | `/gestao/gestacoes/:id/editar` (**NOVO**) | `GET /api/v1/gestacoes/:id` (**NOVO**) | Criar GET + página |
| `SECAGEM` | `/gestao/secagens/:id/editar` (**NOVO**) | `GET /api/v1/secagens/:id` (**NOVO**) | Criar GET + página |
| `LACTACAO` | `/gestao/lactacoes/:id/editar` (**NOVO**) | `GET /api/v1/lactacoes/:id` (**NOVO**) | Criar GET + página (sob `/gestao`, não `/animais`) |

**Conclusão:** vacina, hormônio e parto **já têm** UI de edição — só ligar. Criar detalhe para **toque, gestação, secagem e lactação**.

### Backend

- **Endpoints novos (obrigatórios):**
  - `GET /api/v1/toques/:id`
  - `GET /api/v1/gestacoes/:id`
  - `GET /api/v1/secagens/:id`
  - `GET /api/v1/lactacoes/:id`
- **Camadas:** Handlers → Services → Repositories existentes; timeline já OK (`ref_id`); não alterar union salvo bug.
- **PUT/POST:** reutilizar padrões de update já existentes quando houver; se o recurso hoje só tem POST (criação), a página `/editar` pode ser leitura+edição mínima alinhada ao form de criação — sem mudar regras TMP/INT.
- **Migration:** nenhuma.
- **Whitelist RBAC backend:** incluir os novos GET em `perfil_access.go` conforme matriz de gestão (FUNCIONARIO já acessa toques/secagens na listagem; gestação/lactação — alinhar a quem vê as listagens hoje).

### Frontend

- **Novo helper:** `frontend/src/lib/animalEventoLinks.ts` — `timelineItemHref(animalId, item, perfil) → string | null` (mapper único Histórico / Ciclo / mini-preview). Preferir arquivo dedicado; não misturar com tabs da ficha em `animalFichaLinks.ts`.
- **Alterar:** `AnimalTimelineList.tsx`, `AnimalCicloTimelineVisual.tsx` (`MarcoConcluidoCard`); garantir que mini-preview herda via `AnimalCicloTimelineSection`.
- **Páginas novas:** `/gestao/toques/[id]/editar`, `/gestao/gestacoes/[id]/editar`, `/gestao/secagens/[id]/editar`, `/gestao/lactacoes/[id]/editar` — reutilizar `*Form` / `*FormFields` de criação quando existirem.
- **Unit tests:** mapper `tipo → path` (+ casos `ref_id` ausente, BAIXA → null, ALERTA → `/alertas`).

### Read-only (decisão §5 #4)

**Abordagem:** reutilizar as rotas `/editar` existentes (e as novas); **não** criar `/visualizar` nem `?mode=view`.

1. **Link na timeline:** emitir `href` se o perfil pode **abrir** a rota (`isPathAllowedForPerfil`), mesmo sem capacidade de PUT.
2. **Página de detalhe:** se `!canEdit*` (helpers em `appAccess.ts`), renderizar formulário com inputs/`DatePicker` **desabilitados**, ocultar/desabilitar botão Salvar e mutations PUT/DELETE.
3. **Allowlist (`appAccess.ts`) — ajustes necessários para leitura:**
   - FUNCIONARIO hoje **não** tem `/animais/:id/saude/editar/...`, `/animais/:id/vacinas/editar/...`, `/producao/:id/editar`, nem `/gestao/gestacoes` / `/gestao/lactacoes`. Incluir esses paths (e subpaths `/editar`) no allowlist de **navegação** sem alterar helpers `canEditar*` (PUT continua negado no front e no backend).
   - USER: se o modo de áreas já for `full` ou incluir animais/gestão, o path já passa; se não, alinhar só leitura das rotas de detalhe listadas no §7 — **sem** liberar mutações.
4. **Saúde:** substituir o gate atual `canEditSaude` no `AnimalTimelineList` pelo mapper + `isPathAllowedForPerfil` (read-only quando `!canEditarRegistroSaude`).

### O que NÃO mexer

- Regras de geração de timeline / filtros `tipo`.
- Deep-link de alerta por id (`/alertas/:id`).
- Criar rotas duplicadas `/animais/:id/partos|vacinas/:id` “só detalhe” se as de edição atuais bastarem.
- Link para formulário de baixa quando o animal já está baixado.
- Rascunho inválido `docs/business/BRF-001/frontend-links-eventos-cycle-na-ficha.md` (conflito de ID com BRF-001 vacinas).

## 4. Casos de teste exigidos

- [ ] Caminho feliz: `PARTO` / `CIO` / `VACINA` com `ref_id` → href correto e formulário preenchido
- [ ] Novos: `TOQUE` / `GESTACAO` / `SECAGEM` / `LACTACAO` → GET + página `/editar` com dados
- [ ] `ref_id` ausente → sem link
- [ ] `BAIXA` → texto sem link; `ALERTA` → `/alertas`
- [ ] RBAC: FUNCIONARIO / USER abrem detalhe em modo read-only onde não há PUT; gestores editam
- [ ] Histórico + Ciclo + mini-preview com o mesmo mapper
- [ ] Marcos previstos sem regressão
- [ ] Unit do mapper `tipo → path`

## 5. Perguntas em aberto (respondidas — não bloqueiam após consolidação)

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | `TOQUE`/`GESTACAO`/`SECAGEM`: (A) sem link neste BRF; (B) GET+editar; (C) só listagem? | **B — criar GET+editar** |
| 2 | `LACTACAO`: (A) GET+página; (B) link para ficha; (C) fora do escopo? | **A — GET+página** (`/gestao/lactacoes/:id/editar`) |
| 3 | Corrigir rotas em BR-CICLO-019 / BR-ANIMAIS-013 para paths reais? | **Sim** (mesmo PR de implementação) |
| 4 | Saúde/vacina: link só se pode editar, ou também visualização? | **visualização (read-only)** — ver §3 Read-only |
| 5 | Alerta: deep-link ou manter `/alertas`? | **manter lista** |
| 6 | Baixa já registrada: link para formulário ou só texto? | **texto informativo** (sem link) |

> Nenhuma pergunta em aberto restante. Escopo consolidado nas seções 3 e 7. Gate G1 aprovado; implementação concluída (Status: implementado).

## 6. Critérios de aceite (gate G3)

- [ ] `go test`, lint/typecheck/tokens, `validate-br-refs`
- [ ] Casos §4 + validação manual
- [ ] BR-CICLO-019 / BR-ANIMAIS-013 → `implementado` (tabela de rotas corrigida)
- [ ] memory-bank + status briefing → `implementado`

## 7. Riscos e mapeamento congelado

1. BR-CICLO-019 desatualizado (páginas "NOVO" que já existem; paths inventados) — corrigir no PR
2. Allowlist FUNCIONARIO incompleta para rotas de leitura — ajustar em `appAccess.ts` sem liberar PUT
3. Assimetria saúde (`canEditSaude` apenas) — unificar no mapper + read-only
4. Alerta sem deep-link; `BAIXA` com `ref_id = animal_id` → nunca linkar
5. Mapper único Histórico/Ciclo; sem payload extra na timeline
6. Novos GET/páginas aumentam superfície — reutilizar forms e padrões de RBAC existentes

```text
CIO                 → /gestao/cios/{ref_id}/editar
COBERTURA           → /gestao/coberturas/{ref_id}/editar
PARTO               → /gestao/partos/{ref_id}/editar
PRODUCAO            → /producao/{ref_id}/editar
SAUDE               → /animais/{animalId}/saude/editar/{ref_id}
VACINA              → /animais/{animalId}/vacinas/editar/{ref_id}
HORMONIO_LACTACAO   → /animais/{animalId}/hormonios-lactacao/{ref_id}/editar
TOQUE               → /gestao/toques/{ref_id}/editar
GESTACAO            → /gestao/gestacoes/{ref_id}/editar
SECAGEM             → /gestao/secagens/{ref_id}/editar
LACTACAO            → /gestao/lactacoes/{ref_id}/editar
ALERTA              → /alertas
BAIXA               → null (texto informativo; sem link)
```

---

**Próximo passo:** gate G3 (validação manual §4 + CI); em seguida `arquivado` se desejado.
