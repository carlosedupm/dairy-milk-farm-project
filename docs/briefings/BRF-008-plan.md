# BRF-008 - Plano de Implementação

| Campo | Valor |
|-------|-------|
| ID | `BRF-008` |
| Status | aprovado |
| Relacionado | [BR-CICLO-019](../business/BR-CICLO-019.md), [BR-ANIMAIS-013](../business/animais.md) |

## 1. Tarefas Principais (em ordem)

### 1.1. Verificar endpoints existentes (Backend)
- [ ] Verificar se endpoints para detalhe de vacina, hormônio lactação e parto já existem
- [ ] Verificar se `ref_id` é retornado para todos os tipos de evento no endpoint `GET /api/v1/animais/:id/timeline`

### 1.2. Criar rotas de detalhe (se necessário)
- [ ] Criar endpoint `GET /api/v1/animais/:animalId/hormonios-lactacao/:eventoId` (se não existir)
- [ ] Criar endpoint `GET /api/v1/animais/:animalId/partos/:eventoId` (se não existir)
- [ ] Verificar se endpoints de detalhe já existem para vacina e hormônio lactação (se sim, pular)

### 1.3. Atualizar backend para retornar `ref_id` (se necessário)
- [ ] Verificar se `ref_id` é retornado para todos os tipos de evento na timeline
- [ ] Corrigir backend se `ref_id` não existir para eventos que precisam de link

### 1.4. Criar/atualizar helper de links no frontend
- [ ] Criar/atualizar `frontend/src/services/animalLinks.ts` com função `getEventoLink(animalId, event, perfil)`
- [ ] Implementar lógica para:
  - Vacina → `/animais/:animalId/vacinas/:eventoId`
  - Hormônio lactação → `/animais/:animalId/hormonios-lactacao/:eventoId`
  - Parto → `/animais/:animalId/partos/:eventoId` (usar rota existente de gestão)
  - Lactação → `/animais/:animalId/lactacoes/:eventoId`
  - Saúde → `/animais/:animalId/saude/editar/:eventoId` (já existente)
  - Alertas → `/alertas` (lista)
  - Baixa → `/animais/baixa?animal_id=...` (já existente)

### 1.5. Atualizar componentes frontend
- [ ] `AnimalTimelineList.tsx`: adicionar links para eventos com `ref_id` válido
- [ ] `AnimalCicloTimelineVisual.tsx`: adicionar links para marcos do ciclo
- [ ] `AnimalFichaTabCiclo.tsx`: atualizar renderização de eventos da timeline visual
- [ ] `AnimalCicloMiniPreview.tsx`: tornar cards clicáveis para detalhe

### 1.6. Criar páginas de detalhe (se necessário)
- [ ] Criar página `VacinaDetail.tsx` (se não existir)
- [ ] Criar página `HormonioLactacaoDetail.tsx` (se não existir)
- [ ] Criar página `PartoDetail.tsx` (se não existir)
- [ ] Criar página `LactacaoDetail.tsx` (se não existir)

### 1.7. Atualizar documentação
- [ ] Atualizar `docs/business/BR-CICLO-019.md` com novos links
- [ ] Atualizar `docs/business/animais.md` com BR-ANIMAIS-013
- [ ] Atualizar `docs/business/ciclo-rebanho.md` com BR-CICLO-019

### 1.8. Testes de aceitação
- [ ] Validar todos os critérios de aceite (C1–C7) do BRF-008
- [ ] Testar permissões de RBAC para cada tipo de evento
- [ ] Testar performance da timeline (tempo de renderização)

## 2. Cronograma (estimativa)

| Tarefa | Duração | Responsável | Data prevista |
|--------|---------|-------------|---------------|
| Verificar endpoints existentes | 1 dia | Analista | 2026-07-16 |
| Criar rotas de detalhe (se necessário) | 2 dias | Backend | 2026-07-17 |
| Atualizar backend para `ref_id` | 1 dia | Backend | 2026-07-18 |
| Criar/atualizar helper de links | 1 dia | Frontend | 2026-07-18 |
| Atualizar `AnimalTimelineList.tsx` | 1 dia | Frontend | 2026-07-19 |
| Atualizar `AnimalCicloTimelineVisual.tsx` | 1 dia | Frontend | 2026-07-19 |
| Atualizar `AnimalFichaTabCiclo.tsx` | 1 dia | Frontend | 2026-07-20 |
| Atualizar `AnimalCicloMiniPreview.tsx` | 0.5 dia | Frontend | 2026-07-20 |
| Criar páginas de detalhe (se necessário) | 2-3 dias | Frontend | 2026-07-21-2026-07-23 |
| Testes de aceitação e validação | 2 dias | QA | 2026-07-24-2026-07-25 |
| Atualizar documentação | 1 dia | Analista | 2026-07-26 |
| Finalização e merge | 1 dia | Todos | 2026-07-27 |

## 3. Riscos e Mitigações

| Risco | Mitigação |
|--------|-----------|
| Eventos sem `ref_id` no backend | Validar antes de criar links; exibir "Ver detalhes" desabilitado se não houver `ref_id` |
| Rotas de detalhe não existirem | Criar endpoints de detalhe se necessário; validar com testes de integração |
| Incompatibilidade de RBAC entre frontend e backend | Usar helper `canEditEvent(type, perfil)` em todos os lugares; testar com perfis diferentes |
| Performance da timeline com muitos links | Otimizar renderização com `React.memo` e `useMemo` |

## 8. Dependências

- **Dependências de código**: 
  - `frontend/src/services/animalLinks.ts` (novo arquivo)
  - `backend/internal/service/animal_ciclo_service.go` (atualizar se necessário)
  - `frontend/src/components/animais/ficha/` (todos os componentes listados)

- **Dependências de sistema**:
  - Acesso à API backend para endpoints de detalhe
  - Permissão para criar novas rotas no backend

## 8.1. Dependências de projeto
- [x] Repositório sincronizado (git pull concluído)
- [x] Perfil `ceialmilk` ativo
- [x] `cursor-agent` skill carregado (para consultas de API)
- [x] Acesso à documentação (`docs/business/`, `memory-bank/`)

## 8.2. Dependências de ferramentas
- [x] Cursor CLI (v2026.06.12)
- [x] Node.js 18+ (para frontend)
- [x] Go 1.19+ (para backend)
- [x] PostgreSQL 14+ (banco de dados)

## 8.3. Riscos críticos
- **Risco 1**: Rotas de detalhe não existirem → Solução: validar endpoints antes de implementar UI
- **Risco 2**: Inconsistência de RBAC → Solução: usar helper central `canEditEvent()` em todos os pontos de acesso
- **Risco 3**: Performance do timeline com muitos links → Solução: otimizar com `React.memo` e `React.memo` nos componentes de evento

## 8.4. Dependências de outros times
- Nenhuma dependência cruzada com outros projetos

## 8.4. Dependências de outros perfis
- **Analista funcional**: validar requisitos e aceitar o briefing
- **Devs de frontend**: implementar UI
- **Devs de backend**: criar endpoints e validar `ref_id`
- **QA**: validar fluxo completo e RBAC

## 8.5. Dependências de ambiente
- [x] Ambiente de desenvolvimento configurado (Node.js, Go, PostgreSQL)
- [x] Variável de ambiente `CURSOR_API_KEY` válida (já corrigida)
- [x] Acesso à documentação (`docs/business/`, `memory-bank/`)
- [x] Acesso à API do backend para testes

## 9. Dependências de outros projetos
- Nenhuma dependência direta com outros projetos.

---

## 9.1. Checklist de Finalização

- [ ] Todas as rotas de detalhe verificadas/existentes
- [ ] `ref_id` presente para todos os eventos que precisam de link
- [ ] Helper `animalEventoLinks.ts` implementado e testado
- [ ] Todos os componentes frontend atualizados com links
- [ ] Páginas de detalhe criadas (se necessário)
- [ ] Documentação atualizada (BR-CICLO-019, BR-ANIMAIS-013, BRF-008)
- [ ] Testes de aceitação validados
- [ ] PR revisado e aprovado por G1 (analista funcional)

## 9.4. Próximos passos após plano
1. **Fase 4 (Plano)**: Executar as tarefas acima com os responsáveis designados
2. **Fase 5 (Execução)**: Implementar as tarefas em paralelo (frontend e backend)
3. **Fase 6 (Validação)**: Testar, validar e documentar
4. **Fase 7 (Entrega)**: Atualizar docs, commit, PR e merge

---

**Próximo passo imediato**: Iniciar a **Fase 4** com a criação do plano de ação detalhado (tarefas 1.1 a 1.8) e atribuição de responsáveis.