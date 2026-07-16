# BR-CICLO-019 — Links de navegação para eventos do ciclo na ficha do animal

## Enunciado
Na ficha do animal (`/animais/:id`), cada evento exibido na timeline (tab **Histórico** e tab **Ciclo**) deve ter um **link de navegação** para acessar os detalhes completos do respectivo evento, permitindo ao usuário visualizar e/ou editar as informações relacionadas.

## Escopo
- **Tab Histórico** (`AnimalTimelineSection`): eventos de saúde, vacinas, hormônio lactação, alertas, baixa.
- **Tab Ciclo** (`AnimalFichaTabCiclo` / `AnimalCicloTimelineSection` / `AnimalCicloTimelineVisual`): eventos do ciclo reprodutivo (cio, cobertura, toque, gestação, secagem, parto, lactação, produção).
- **Sidebar / Mini-preview** (`AnimalCicloMiniPreview`): marcos do ciclo com links rápidos.

## Requisitos funcionais

### 1. Tipos de eventos com link
| Tipo de evento | Rota de detalhe | Notas |
|---|---|---|
| **Saúde** (`SAUDE`) | `/animais/:animalId/saude/editar/:eventoId` | Já implementado (BR-SAUDE-005) |
| **Vacina** (`VACINA`) | `/animais/:animalId/vacinas/:eventoId` | **NOVO** - criar rota |
| **Hormônio lactação** (`HORMONIO_LACTACAO`) | `/animais/:animalId/hormonios-lactacao/:eventoId` | **NOVO** - criar rota |
| **Parto** (`PARTO`) | `/animais/:animalId/partos/:eventoId` | **NOVO** - criar rota |
| **Gestação** (`GESTACAO`) | `/gestao/gestacoes/:eventoId` | Já existe |
| **Cobertura** (`COBERTURA`) | `/gestao/coberturas/:eventoId` | Já existe |
| **Toque** (`TOQUE`) | `/gestao/toques/:eventoId` | Já existe |
| **Cio** (`CIO`) | `/gestao/cios/:eventoId` | Já existe |
| **Secagem** (`SECAGEM`) | `/gestao/secagens/:eventoId` | Já existe |
| **Lactação** (`LACTACAO`) | `/animais/:animalId/lactacoes/:eventoId` | **NOVO** - criar rota |
| **Produção** (`PRODUCAO`) | `/producao/:eventoId` | Já existe (edição de registro) |
| **Alerta** (`ALERTA`) | `/alertas/:eventoId` | Já implementado (link para lista de alertas) |
| **Baixa** (`BAIXA`) | `/animais/baixa?animal_id=:animalId` | Já implementado |

### 2. Comportamento do link
- **Clique no título do evento** na timeline → navega para a página de detalhe/edição do evento.
- **Eventos sem rota de detalhe** (ex.: alertas já linkam para lista) → manter comportamento atual ou melhorar.
- **Permissões**: respeitar RBAC existente (ex.: FUNCIONARIO só edita toques/produção; vacinas/hormônio/parto conforme perfil).

### 3. Indicador visual
- Eventos com link de detalhe: título sublinhado ao hover + cursor pointer (padrão Shadcn `Link`).
- Tooltip opcional: "Ver detalhes do [tipo de evento]".

## Requisitos não-funcionais
- **Performance**: não carregar dados extras na timeline; link usa `ref_id` já retornado pela API.
- **Acessibilidade**: links com `aria-label` descritivo.
- **Consistência**: seguir padrão de rotas existente (`/animais/:id/recurso/:eventoId` para recursos do animal; `/gestao/recurso/:eventoId` para recursos de gestão).

## Estado
- **planejado**

## Implementação
### Frontend
1. **`frontend/src/services/animais.ts`**: adicionar `'parto' | 'lactacao' | 'vacina' | 'hormonio_lactacao'` ao `TimelineFilterTipo` (se necessário para filtro).
2. **`frontend/src/components/animais/AnimalTimelineList.tsx`**: adicionar lógica de `href` por `item.tipo` usando `item.ref_id`.
3. **`frontend/src/components/animais/ficha/AnimalFichaTabCiclo.tsx`** e **`AnimalCicloTimelineVisual.tsx`**: adicionar links nos eventos da timeline visual.
4. **Criar páginas de detalhe** para vacinas, hormônio lactação, partos, lactações (se não existirem).

### Backend
1. Verificar se endpoints `GET /api/v1/partos/:id`, `GET /api/v1/lactacoes/:id`, `GET /api/v1/vacinas/:id`, `GET /api/v1/hormonios-lactacao/:id` existem; criar se necessário.
2. Garantir que `GET /api/v1/animais/:id/timeline` retorna `ref_id` preenchido para todos os tipos de evento.

## Critérios de aceite
1. Na tab **Histórico**, ao clicar em um evento de vacina/hormônio/parto, abre a página de detalhe correspondente.
2. Na tab **Ciclo**, ao clicar em um evento de parto/secagem/lactação, abre a página de detalhe correspondente.
3. No `AnimalCicloMiniPreview` (sidebar), marcos clicáveis navegam para o detalhe.
4. Links respeitam permissões do usuário (RBAC).
5. Documentação atualizada em `docs/business/animais.md` e `docs/business/ciclo-rebanho.md`.

## Relacionado
- BR-CICLO-008 (Ficha do animal com histórico unificado)
- BR-SAUDE-005 (Timeline de saúde na ficha)
- BR-ANIMAIS-008 (Ficha animal - tabs + sidebar)
- BRF-001 (Vacinas), BRF-006 (Hormônio lactação), BR-CICLO-004 (Parto)

---

**Criado em**: 2026-07-15  
**Autor**: Agente Hermes (análise funcional)  
**Próximo passo**: Briefing (BRF-NNN) → Plano → Execução