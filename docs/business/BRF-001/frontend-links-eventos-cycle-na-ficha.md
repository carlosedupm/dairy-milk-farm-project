# BRF-001 — Links de navegação para eventos do ciclo na ficha de animal

**Status do requisito**: BRF-001 concluído – detalhamento funcional norteia a implementação  
**Escopo**: Frontend – Ficha do Animal (`/animais/:id`)  
**Relacionado**: BR-CICLO-019, BR-ANIMAIS-013  

---

## Motivação
Permitir ao utilizador acessar rapidamente os detalhes de cada evento da timeline (Histórico) e da visualização de ciclo (Ciclo) mediante links nativos, especialmente para:

- Vacinas (`VACINA`)  
- Hormônio lactação (`HORMONIO_LACTACAO`)  
- Parto (`PARTO`)  
- Lactação ativa (`LACTACAO`)  
- Saúde (`SAUDE`) – já existente  

Facilitar a tomada de decisão, auditoria e gestão operacional na interface móvel e desktop.

---

## Fluxo Atual (Pré‑BRF)
| Página | Componentes | Eventos Representados | Links Existentes |
|--------|-------------|------------------------|-------------------|
| **Histórico** (`AnimalTimelineList`) | Lista de cards com ícones (💉, 🔔, 💉…) | `SAUDE`, `VACINA`, `HORMONIO_LACTACAO` | Somente `SAUDE` tem link de edição (`/animais/:id/saude/editar/:eventoId`). Outros permanecem como texto informativo. |
| **Ciclo (Visual)** (`AnimalCicloTimelineVisual`) | Timeline vertical/side‑bar com marcos (mini‑preview) | `COBERTURA`, `TOQUE`, `GESTACAO`, `PARTOS`… | Sem links para detalhes – somente ícones informativos. |
| **Sidebar Mini‑Preview** (`AnimalCicloMiniPreview`) | Cards resumidos dos próximos marcos | Diversos tipos de eventos | Sem links para detalhes. |
| **Tabs Ciclo** (`AnimalFichaTabCiclo`) | Timeline visual complet | Mesmo eventos da visualização | Sem links para detalhes. |

---

## Proposta de Solução (BRF‑001)

### 1. Tipo de Evento – Enlace
| Tipo de Evento (`evento.tipo`) | Rota de Detalha | Exemplo Completo | Observação |
|-------------------------------|----------------|------------------|-----------|
| **VACINA** | `/animais/:animalId/vacinas/:eventoId` | `/animais/12/vacinas/5` | Cria rotas de detalle no backend (`GET /api/v1/animais/:id/vacinas/:eventId`). |
| **HORMONIO_LACTACAO** | `/animais/:animalId/hormonios-lactacao/:eventoId` | `/animais/12/hormonios-lactacao/3` | Criar nova rota (`GET /api/v1/animais/:id/hormonios-lactacao/:eventoId`). |
| **PARTOS** | `/animais/:animalId/partos/:eventoId` | `/animais/12/partos/7` | Existe endpoint de detalhe (`GET /api/v1/partos/:eventId`), mas falta front‑end. |
| **LACTACAO** | `/animais/:animalId/lactacoes/:eventoId` | `/animais/12/lactacoes/9` | Criar nova rota (`GET /api/v1/animais/:id/lactacoes/:eventoId`). |
| **SAUDE** (já implementado) | `/animais/:animalId/saude/editar/:eventoId` | `/animais/12/saude/editar/4` | Mantido. |
| Outros (GESTACAO, COBERTURA, TOQUE, etc.) | Roteiro já existente (`/gestao/...oke`) | – | Não será modificado nesta fase. |

> **Nota:** Cada rota de detalhe deve retornar o registro específico (ex.: Vacina, Hormônio‑lactação, Parto, etc.) e, se permitido ao perfil do usuário, permitir edição (`PUT`/`POST`).

### 2. Alterações de UI
| Arquivo | Alteração | Exemplo de Código |
|---------|-----------|-------------------|
| `frontend/src/components/animais/AnimalTimelineList.tsx` | Renderizar `<Link href={eventoHref}>evento.titulo</Link>` quando `evento.ref_id` existir e a rota estiver mapeada. | ```tsx {eventoHref && <Link href={eventoHref} variant="inherit" className="text-primary">evento.titulo</Link> }``` |
| `frontend/src/components/animais/ficha/AnimalCicloTimelineVisual.tsx` | Envolver o título do evento em um Link com `eventoHref`. | ```tsx <h4 className="cursor-pointer"><Link href={eventoHref}>{evento.titulo}</Link></h4>``` |
| `frontend/src/components/animais/ficha/AnimalFichaTabCiclo.tsx` | Adicionar `onClick` ou `asChild` para navegar ao detalhe ao clicar no evento da timeline visual. | ```tsx <Link href={eventoHref}>Evento</Link>``` |
| `frontend/src/components/animais/AnimalCicloMiniPreview.tsx` | Tornar o card inteiro clicável para abrir o detalhe da fase correspondente. | ```tsx <Card onClick={() => navigate(event.Href)} …>``` |
| `frontend/src/components/animais/ficha/AnimalFichaTabVisaoGeral.tsx` (sidebar) | Adicionar link ao título “Eventos do ciclo” que leva ao detalhe da phase correta. | ```tsx <Link href={eventoHref}>Ver detalhes</Link>``` |

### 3. Dados da API
- **Endpoint Gamma:** `GET /api/v1/animais/:animalId/timeline?tipo=SAUDE|VACINA|HORMONIO_LACTACAO|PARTOS|LACTACAO|...`
- Resposta contém: `{timeline: [{tipo, data, titulo, ref_id, ...}]}`. O campo `ref_id` deve existir para **todos os eventos que precisam de detalhe**.
- Verificar se `ref_id` está presente para cada tipo de evento; caso não, adicionar fallback `null` (não exibir link).

### 4. Estrutura de Rotas Backend
```go
// Exemplo Go (Backend)
router.GET("/api/v1/animais/:animalId/vacinas/:eventId", GetVacinaById)
router.GET("/api/v1/animais/:animalId/hormonios-lactacao/:eventId", GetHormonioLactacaoById)
router.GET("/api/v1/animais/:animalId/partos/:eventId", GetPartoById)
router.GET("/api/v1/animais/:animalId/lactacoes/:eventId", GetLactacaoById)
```
- Todas devem validar `animalId` pertence à fazenda do usuário logado.
- Garantir que `ref_id` retorna correto tipo (`int64` para `vacinas`, `gestacões`, etc.) e que não haja 404 para eventos já existentes.

### 5. Roteamento React
```tsx
// routes.ts (pseudo‑code)
<Route path="/animais/:animalId/vacinas/:eventId" element={<VacinaDetail animalId={animalId} eventId={eventId} />} />
<Route path="/animais/:animalId/hormonios-lactacao/:eventId" element={<HormonioLactacaoDetail ... />} />
<Route path="/animais/:animalId/partos/:eventId" element={<PartoDetail ... />} />
<Route path="/animais/:animalId/lactacoes/:eventId" element={<LactacaoDetail ... />} />
```
- Usar `useParams` do React Router v6 para extrair parâmetros.

### 6. Validação de Perfil (RBAC)
- **Sensitive Types** (ex.: `LACTACAO`, `VACINA`) apenas **PRODUTIVO**/**FUNCIONARIO** podem editar.  
- No front‑end, desabilitar o botão `Editar` se `canEditVacina`/`canEditHormonio` for `false`.  
- No código backend, usar helper `CanEditSensitiveSensitiveType(user, tipo)`.

### 7. Testes de Aceite
| Critério | Descrição |
|----------|-----------|
| **C1** | Ao clicar no título de um evento de Vacina na tab *Histórico*, abre a página de edição de Vacina com dados preenchidos. |
| **C2** | Ao clicar em um evento de Hormônio‑lactação na timeline visual, abre página de detalhe do hormônio com campos editáveis. |
| **C3** | Ao clicar em um evento de Parto na sidebar mini‑preview, navega para `/animais/:id/partos/:eventoId`. |
| **C4** | O link não aparece para eventos sem `ref_id`. |
| **C5** | Permissões de edição refletem RBAC (ex.: Só funcionário pode editar Parto). |
| **C6** | Responsividade: links são sublinhados ao hover, possuem `aria-label` descritivo e `cursor: pointer`. |
| **C7** | Não há regressão em performance da timeline (tempo de renderização < 300 ms). |

### 8. Impacto em Produtos Anteriores
- **Tela de Histórico**: leve mudança visual (links adicionados).  
- **Dashboard Home KPI**: não afeta diretamente (já exibe KPI de partos, vacinas etc.).  
- **Search**: nenhum efeito (busca não altera).  

### 9. Riscos e Considerações
| Risco | Mitigação |
|-------|-----------|
| **Evento sem ref_id** – algum evento pode não ter sido registrado com `ref_id` no backend | Validar antes de montar o link; exibir “Ver detalhes” desabilitado ou tooltip informando que o detalhe ainda não está disponível. |
| **Rotas não existentes** – criar novas rotas (`vacina`, `hormonio-lactacao`, `lactacao`) | Criar endpoints backend primeiro; escrever testes unitários de API antes de implementar UI. |
| **Sobrecarga de navegação** – abrir muitos detalhes simultâneos pode poluir a UI | Limitar a apenas um detalhe aberto por vez; usar `useModal` ou `Dialog` quando a página de detalhe for rica. |
| **RBAC inconsistente** – esquecer de atualizar permissões | Implementar helper de permissões centralizado e testar com perfis diferentes nas rotas de detalhamento. |
| **Manutenção futura** – novos tipos de evento podem surgir | Documentar padrão `evento.tipo → rota` em arquivo `frontend/src/services/animal-links.ts` para evitar divergências. |

### 10. Checklist de Implementação
- [ ] Atualizar `export type TimelineFilterTipo` (se necessário).  
- [ ] Garantir que `API /timeline` retorna `ref_id` para todos os tipos de evento críticos.  
- [ ] Implementar rotas backend (`vacina`, `hormonio_lactacao`, `partos`, `lactacoes`).  
- [ ] Criar páginas de detalhe (`VacinaDetail`, `HormonioLactacaoDetail`, `PartoDetail`, `LactacaoDetail`).  
- [ ] Modificar `AnimalTimelineList` e `AnimalCicloTimelineVisual` para renderizar links condicionais.  
- [ ] Atualizar sidebar `AnimalCicloMiniPreview` para navegação.  
- [ ] Testar fluxo completo (frontend → backend → UI).  
- [ ] Atualizar documentação BR-CICLO-019 e BR-ANIMAIS-013 com a nova estrutura de links.  
- [ ] Commit, PR e revisão seguindo fluxo BR-* (incluindo link para este BRF-001 no PR description).

---

**Autor:** Agente Hermes – análise funcional e documentação  
**Data:** 2026‑07‑15