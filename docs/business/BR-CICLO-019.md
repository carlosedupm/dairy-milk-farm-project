# BR-CICLO-019 — Links de navegação para eventos do ciclo na ficha do animal

## Enunciado
Na ficha do animal (`/animais/:id`), cada evento exibido na timeline (tab **Histórico** e tab **Ciclo**) deve ter um **link de navegação** para acessar os detalhes completos do respectivo evento, permitindo ao usuário visualizar e/ou editar as informações relacionadas.

## Escopo
- **Tab Histórico** (`AnimalTimelineSection` / `AnimalTimelineList`): saúde, vacinas, hormônio lactação, alertas, produção e demais tipos com `ref_id`.
- **Tab Ciclo** (`AnimalFichaTabCiclo` / `AnimalCicloTimelineSection` / `AnimalCicloTimelineVisual`): marcos concluídos do ciclo reprodutivo.
- **Sidebar / Mini-preview** (`AnimalCicloMiniPreview`): herda links via `AnimalCicloTimelineSection`.

## Requisitos funcionais

### 1. Tipos de eventos com link (paths reais)

| Tipo | Rota frontend | Notas |
|------|---------------|-------|
| `CIO` | `/gestao/cios/{ref_id}/editar` | Wire |
| `COBERTURA` | `/gestao/coberturas/{ref_id}/editar` | Wire |
| `PARTO` | `/gestao/partos/{ref_id}/editar` | Wire — não criar `/animais/:id/partos/...` |
| `PRODUCAO` | `/producao/{ref_id}/editar` | Wire + read-only se sem PUT |
| `SAUDE` | `/animais/{animalId}/saude/editar/{ref_id}` | Wire + read-only se sem PUT |
| `VACINA` | `/animais/{animalId}/vacinas/editar/{ref_id}` | Wire + read-only se sem PUT |
| `HORMONIO_LACTACAO` | `/animais/{animalId}/hormonios-lactacao/{ref_id}/editar` | Wire + read-only se sem PUT |
| `TOQUE` | `/gestao/toques/{ref_id}/editar` | GET + página detalhe |
| `GESTACAO` | `/gestao/gestacoes/{ref_id}/editar` | GET + página detalhe |
| `SECAGEM` | `/gestao/secagens/{ref_id}/editar` | GET + página detalhe |
| `LACTACAO` | `/gestao/lactacoes/{ref_id}/editar` | GET + página detalhe (sob `/gestao`) |
| `ALERTA` | `/alertas` | Lista (sem deep-link por id) |
| `BAIXA` | — | Texto informativo; sem link |

### 2. Comportamento
- Clique no título → navega para detalhe/edição.
- Link só se `isPathAllowedForPerfil` permitir o path (mesmo sem PUT — formulário read-only).
- Mapper único: `frontend/src/lib/animalEventoLinks.ts` (`timelineItemHref`).

### 3. Indicador visual
- Título com `Link` + hover underline; `aria-label` descritivo.

## Estado
- **implementado** (BRF-008)

## Implementação
- Frontend: `animalEventoLinks.ts`, `AnimalTimelineList`, `AnimalCicloTimelineVisual` (`MarcoConcluidoCard`), páginas `/gestao/{toques,gestacoes,secagens,lactacoes}/[id]/editar`, allowlist `appAccess.ts`, read-only em saúde/vacina/hormônio/produção.
- Backend: `GET /api/v1/toques|gestacoes|secagens|lactacoes/:id`; whitelist FUNCIONARIO leitura gestação/lactação + `GET /api/v1/producao/:id` em `perfil_access.go`.

## Critérios de aceite
1. Histórico / Ciclo / mini-preview usam o mesmo mapper.
2. `ref_id` ausente ou `BAIXA` → sem link; `ALERTA` → `/alertas`.
3. FUNCIONARIO abre detalhe em read-only onde não há PUT.
4. Marcos previstos sem regressão.

## Relacionado
- BR-ANIMAIS-013, BR-ACESSO-002, BRF-008

---

**Última atualização**: 2026-07-15
