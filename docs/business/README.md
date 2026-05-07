# Catálogo de negócio CeialMilk

Documentação **viva** das regras de domínio: decisões de produto que aparecem na API, nas validações e na experiência do usuário.

## Relação com outros documentos

| Documento | Papel |
|-----------|--------|
| [memory-bank/productContext.md](../../memory-bank/productContext.md) | Visão de mercado, jornada, métricas — **sem** repetir o detalhe operacional das regras |
| [memory-bank/systemPatterns.md](../../memory-bank/systemPatterns.md) | Padrões técnicos e onde código deve ficar (handlers, services, UI) |
| **`docs/business/*.md`** | Regras com ID estável, escopo, perfis e ponteiros ao código |

## Quando atualizar

Qualquer **mudança de comportamento de produto** ou **política de domínio** deve atualizar este catálogo **no mesmo ciclo** que o código. Ver também [AGENTS.md](../../AGENTS.md) e `.cursor/rules/documentation-maintenance.mdc`.

## Convenções

- **ID de regra**: `BR-<DOMINIO>-NNN` (ex.: `BR-FOLGAS-003`). Não reaproveite nem renumerie IDs ao reescrever texto; crie um novo ID para uma regra nova.
- **Campos recomendados por regra**: enunciado; escopo (fazenda, período, entidades); perfis; bloqueio no servidor vs apenas informativo na UI; ponteiros a arquivos no repositório; migration/constraint quando aplicável.
- **Estado** (opcional): implementado | parcial | planejado.

## Índice de módulos

| Módulo | Arquivo |
|--------|---------|
| Folgas (escala 5x1) | [folgas.md](./folgas.md) |

---

**Última atualização**: 2026-05-06
