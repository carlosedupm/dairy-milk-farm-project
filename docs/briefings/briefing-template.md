# Briefing BRF-NNN — [Título curto do requisito]

> Fluxo, papéis e gates: [`docs/briefings/README.md`](./README.md). O briefing é uma **ordem de serviço**: referencia regras por ID, não as copia.

## Metadados

| Campo | Valor |
|-------|-------|
| ID | `BRF-NNN` |
| Data | AAAA-MM-DD |
| Analista | [agente/humano que produziu a análise] |
| Status | rascunho |
| Aprovado por (G1) | — |
| PR vinculado (G2) | — |

## 1. Objetivo

[1 parágrafo: o que o usuário quer fazer, em linguagem de pecuária.]

## 2. Regras de negócio (fonte de verdade)

Regras em `docs/business/` que este trabalho implementa ou altera. Regras novas devem já existir no catálogo com estado `planejado` antes do gate G1.

| ID | Módulo | Estado atual | O que muda |
|----|--------|--------------|------------|
| `BR-XXX-NNN` | [`<modulo>.md`](../business/) | planejado | [criação/alteração] |

**Invariantes e validações aplicáveis** (citar apenas IDs, ex.: `TMP-001`, `TMP-002`, `INT-002`):

- [lista de IDs com 1 linha de justificativa cada]

**Perfis autorizados** (conforme [`acessos-perfil.md`](../business/acessos-perfil.md)):

- [perfis e restrições, citando `BR-ACESSO-*` quando existir]

## 3. Escopo da implementação

### Backend

- **Endpoints**: [método + rota + auth]
- **Camadas tocadas**: handler / service / repository [caminhos]
- **Migration/constraint**: [nº da migration ou "nenhuma"]
- **Códigos de erro**: [códigos esperados, ex.: `ANIMAL_FORA_REBANHO` 400]

### Frontend

- **Páginas/rotas**: [caminhos e o que muda]
- **Componentes**: [existentes a alterar / novos a criar]
- (Checklist de UI: seguir `.cursor/rules/frontend-ui-patterns.mdc` — não repetir aqui)

### O que NÃO mexer

- [arquivos/componentes/regras explicitamente fora do escopo]

## 4. Casos de teste exigidos

O implementador deve criar/apontar testes para cada caso. Regra sem teste correspondente não passa no gate G3.

- [ ] Caminho feliz: [descrever]
- [ ] Bordas temporais (`TMP-*`): [descrever]
- [ ] RBAC negado (perfil sem permissão): [descrever]
- [ ] [outros casos de borda]

## 5. Perguntas em aberto (obrigatório)

> Dúvida não respondida **bloqueia** o gate G1. O implementador deve recusar briefing com pergunta sem resposta. Se não houver dúvidas, escrever explicitamente: «Nenhuma — escopo completo».

| # | Pergunta | Resposta (desenvolvedor) |
|---|----------|--------------------------|
| 1 | | |

## 6. Critérios de aceite (gate G3)

- [ ] `cd backend && go test ./... -count=1` OK
- [ ] `cd frontend && npm run lint && npm run typecheck && npm run validate:tokens` OK
- [ ] `node scripts/validate-br-refs.mjs` OK
- [ ] Casos de teste da seção 4 existem e passam
- [ ] Comportamento validado no fluxo completo (manual)
- [ ] `BR-*` da seção 2 atualizadas para `implementado` com ponteiros ao código
- [ ] `memory-bank/activeContext.md` atualizado
- [ ] Status deste briefing → `implementado`

## 7. Notas adicionais

[Contexto extra, decisões de design já tomadas (com fonte), edge cases conhecidos.]
