# Fluxo de Briefings — Análise Funcional → Implementação

Fluxo **agnóstico de ferramenta e de agente**: os papéis abaixo podem ser exercidos por qualquer agente de IA (OWL/Hermes, Cursor, CLI) ou por um humano. O que vale é o papel e o contrato, não o nome do agente.

## Princípio

**A fonte de verdade das regras de negócio é `docs/business/`** (IDs `BR-*`). O briefing é uma **ordem de serviço fina e descartável**: referencia regras por ID, nunca as copia. Isso evita duplicação e documentação desatualizada — e elimina a principal fonte de alucinação em agentes: decidir regra de domínio fora do catálogo.

## Papéis

| Papel | Quem pode exercer | Responsabilidade |
|-------|-------------------|------------------|
| **Analista Funcional** | Agente de IA ou humano | Traduzir requisito de negócio em: (a) regras `BR-*` novas/alteradas em `docs/business/` com estado `planejado`; (b) briefing `BRF-NNN` referenciando-as |
| **Desenvolvedor (humano)** | Você | Aprovar nos gates G1–G3; é o único que muda `Status` de um briefing |
| **Implementador** | Agente de IA ou humano | Executar o briefing aprovado, sem criar/alterar regra de negócio |

### Regras de conduta do Analista Funcional

1. **Consultar antes de escrever**: `docs/business/README.md` (índice), módulo afetado, `ciclo-rebanho.md` (invariantes), `auditoria.md` (TMP-001–006, INT-001–007), `acessos-perfil.md` (RBAC).
2. **Citar fonte em toda afirmação**: cada regra/invariante referida deve ter ID (`BR-*`, `TMP-*`, `INT-*`) ou caminho de arquivo. Afirmação sem fonte não entra no briefing.
3. **Regra nova nasce no catálogo**: criar `BR-*` em `docs/business/<modulo>.md` com estado `planejado` **no mesmo trabalho** que o briefing, seguindo o modelo mínimo do catálogo (enunciado, escopo, perfis, efeito, implementação prevista, migration/constraint se aplicável).
4. **Não decidir ambiguidade**: dúvida vai para a seção «Perguntas em aberto» do briefing — nunca assumir resposta.

### Regras de conduta do Implementador

1. **Recusar briefing não aprovado**: só implementar briefing com `Status: aprovado`.
2. **Recusar briefing com perguntas em aberto** sem resposta registrada.
3. **Proibido criar/alterar regra de negócio**: se descobrir lacuna ou conflito durante a implementação, **parar**, registrar em «Perguntas em aberto» e devolver ao gate G1.
4. **Não sair do escopo**: respeitar a seção «O que NÃO mexer».
5. Ao concluir: atualizar estado das `BR-*` para `implementado` (com ponteiros ao código), atualizar memory-bank conforme `.cursor/rules/documentation-maintenance.mdc`, e marcar isso no PR.

## Ciclo de vida e gates de aprovação

```
Análise ──► G1: briefing aprovado ──► Implementação ──► G2: PR revisado ──► G3: aceite ──► arquivado
(rascunho)        (aprovado)                                                (implementado)
```

| Gate | O que o desenvolvedor aprova | Mecanismo |
|------|------------------------------|-----------|
| **G1 — Análise** | `BR-*` planejadas + briefing (escopo, «não mexer», perguntas respondidas) | Desenvolvedor muda `Status: rascunho → aprovado` no briefing |
| **G2 — Implementação** | Código em PR pequeno, vinculado a **1** briefing (`BRF-NNN` no título/descrição) | Review humano + Bugbot comparando diff vs. briefing |
| **G3 — Aceite** | Comportamento real + docs sincronizadas (`BR-*` → `implementado`) | Checklist de aceite do briefing + CI verde; `Status → implementado` |

**Status possíveis**: `rascunho` → `aprovado` → `implementado` → `arquivado`.

## Convenções de arquivo

- **Local**: `docs/briefings/BRF-NNN-titulo-curto.md` (ex.: `BRF-001-secagem-em-lote.md`)
- **ID**: `BRF-NNN` sequencial; nunca reaproveitar número
- **Template**: [`briefing-template.md`](./briefing-template.md)
- Briefings `arquivado` permanecem no diretório (histórico auditável: PR → `BRF-NNN` → `BR-*`)

### Briefings ativos / recentes

| ID | Título | Status |
|----|--------|--------|
| BRF-006 | Alerta hormônio lactação pendente | rascunho |
| BRF-005 | Hormônios lactação | implementado |
| BRF-004 | Elegibilidade reprodutiva | implementado |
| BRF-003 | status_saude derivado | implementado |
| BRF-002 | Validação temporal saúde | implementado |
| BRF-001 | Vacinas / calendário | implementado |

## Verificação automatizada

```bash
node scripts/validate-br-refs.mjs
```

Executado no CI. Falha se:

- Código (`backend/`, `frontend/src/`) ou briefing referenciar `BR-*`/`TMP-*`/`INT-*` que **não existe** em `docs/business/`
- Briefing sem ID `BRF-NNN`, sem `Status` válido ou sem referência a nenhuma `BR-*`

## Referências para preencher um briefing

| Tema | Onde consultar (não copiar para o briefing) |
|------|---------------------------------------------|
| Invariantes do ciclo | `docs/business/ciclo-rebanho.md` |
| Validações temporais TMP-001–006 e integridade INT-001–007 | `docs/business/auditoria.md` |
| Perfis e permissões (RBAC) | `docs/business/acessos-perfil.md` |
| Formato de resposta/erro da API | `memory-bank/systemPatterns.md` (`response.go`: sucesso `{data, message, timestamp}`; erro `{error: {code, message, details?}, timestamp}`) |
| Checklist de UI obrigatório | `.cursor/rules/frontend-ui-patterns.mdc` e `frontend/AGENTS.md` |
| Camadas backend | `backend/AGENTS.md` (Handlers → Services → Repositories) |
| Integrações M2M (perfil `INTEGRACAO`) | `docs/business/integracoes.md` |

---

**Última atualização**: 2026-06-14
