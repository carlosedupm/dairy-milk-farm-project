@AGENTS.md

# Claude Code — camada específica

- Skills do projeto: `.claude/skills/` (symlinks para `.cursor/skills/` — mesma fonte).
- Rules path-scoped: `.claude/rules/`.
- Commands: `.claude/commands/` (`validar`, `contexto`, `briefing`).
- Política e roteamento: **só** em `AGENTS.md` / `docs/business/` / `memory-bank/patterns/` — não duplique aqui.
- Ao mudar regra Cursor (`.cursor/rules/`), espelhe o corpo em `.claude/rules/` no mesmo PR (ver `docs/harness/README.md`).
