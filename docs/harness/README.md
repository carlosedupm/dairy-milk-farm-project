# Harness multi-tool — CeialMilk

Mapa dos entry points de agentes de IA. **Política portável** vive em [`AGENTS.md`](../../AGENTS.md); adapters só traduzem para o formato nativo de cada ferramenta.

## Fonte única vs adapters

| Conteúdo | Onde editar |
|----------|-------------|
| Roteamento, gates, invariantes | [`AGENTS.md`](../../AGENTS.md) |
| Regras de produto (`BR-*`) | [`docs/business/`](../business/) + [`INDEX.md`](../business/INDEX.md) |
| Padrões técnicos | [`memory-bank/patterns/`](../../memory-bank/patterns/) (índice: [`systemPatterns.md`](../../memory-bank/systemPatterns.md)) |
| Deploy | [`memory-bank/deploy/`](../../memory-bank/deploy/) (índice: [`deploy-notes.md`](../../memory-bank/deploy-notes.md)) |
| Workflows (skills) | [`.cursor/skills/`](../../.cursor/skills/) — Claude espelha via symlink |

Ao mudar uma **regra path-scoped**, atualize no **mesmo PR**: `.cursor/rules/*.mdc`, `.claude/rules/*.md` e `.github/instructions/*.instructions.md`.

## Por ferramenta

| Ferramenta | Entry point | Rules / instructions | Skills / commands |
|------------|-------------|----------------------|-------------------|
| **Cursor** | `AGENTS.md` + `.cursor/rules/project-context.mdc` (always) | `.cursor/rules/*.mdc` | `.cursor/skills/`, `.cursor/commands/`, hooks `.cursor/hooks.json` |
| **Claude Code** | [`CLAUDE.md`](../../CLAUDE.md) (`@AGENTS.md`) | `.claude/rules/*.md` (`paths`) | `.claude/skills/*` → symlink; `.claude/commands/`; hooks em `.claude/settings.json` |
| **GitHub Copilot** | [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md) | `.github/instructions/*.instructions.md` (`applyTo`) | — (seguir skills documentadas em AGENTS) |
| **Codex / Windsurf / outros** | `AGENTS.md` | — | — |

## MCP

- **TestSprite**: só Cursor ([`.cursor/mcp.json`](../../.cursor/mcp.json)); testes M2M na porta **`:8080`**. Não espelhado noutros tools.

## Validadores

```bash
node scripts/validate-br-refs.mjs   # IDs formais, INDEX, briefing↔estado
node scripts/validate-docs.mjs      # links, ponteiros, tetos memory-bank
node scripts/generate-br-index.mjs  # regenera docs/business/INDEX.md
```

**Última atualização**: 2026-08-25
