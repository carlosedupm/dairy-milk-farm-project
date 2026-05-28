# Catálogo de negócio CeialMilk

Documentação **viva** das regras de domínio: decisões de produto que aparecem na API, nas validações e na experiência do usuário.

## Relação com outros documentos

| Documento | Papel |
|-----------|--------|
| [memory-bank/projectbrief.md](../../memory-bank/projectbrief.md) | Objetivos, fases e definição de pronto |
| [memory-bank/productContext.md](../../memory-bank/productContext.md) | Visão de mercado, jornada, métricas — **sem** repetir o detalhe operacional das regras |
| [memory-bank/systemPatterns.md](../../memory-bank/systemPatterns.md) | Padrões técnicos e onde código deve ficar (handlers, services, UI) |
| **[ciclo-rebanho.md](./ciclo-rebanho.md)** | **Fluxo transversal da vaca**, lacunas, backlog e regras `BR-CICLO-*` |
| **`docs/business/*.md`** | Regras por módulo com ID estável (`BR-<DOMINIO>-NNN`) |

## Quando atualizar

Qualquer **mudança de comportamento de produto** ou **política de domínio** deve atualizar este catálogo **no mesmo ciclo** que o código:

1. Módulo afetado → ficheiro correspondente abaixo (criar se não existir).
2. Impacto em mais de um módulo ou no fluxo da vaca → **[ciclo-rebanho.md](./ciclo-rebanho.md)**.
3. Novo marco ou foco → `memory-bank/projectbrief.md`, `activeContext.md`, `progress.md`.

Ver também [AGENTS.md](../../AGENTS.md) e `.cursor/rules/documentation-maintenance.mdc`.

## Convenções

- **ID de regra**: `BR-<DOMINIO>-NNN` (ex.: `BR-FOLGAS-003`, `BR-CICLO-006`). Não renumerar IDs; criar novo ID para regra nova.
- **Campos por regra**: enunciado; escopo; perfis; bloqueio no servidor vs informativo na UI; ponteiros ao código; migration/constraint quando aplicável.
- **Estado**: `implementado` | `parcial` | `planejado`.

## Índice de módulos

| Módulo | Arquivo | Estado do catálogo |
|--------|---------|-------------------|
| **Ciclo do rebanho (transversal)** | [ciclo-rebanho.md](./ciclo-rebanho.md) | ✅ Referência mestre |
| Folgas (escala 5x1) | [folgas.md](./folgas.md) | ✅ |
| Coberturas (reprodução) | [coberturas.md](./coberturas.md) | ✅ |
| Cios (detecção) | [cios.md](./cios.md) | ✅ |
| Animais (busca contextual) | [animais.md](./animais.md) | ✅ |
| Baixa do rebanho | [baixa-rebanho.md](./baixa-rebanho.md) | ✅ |
| Leite — descarte / laboratório | [leite-restricoes.md](./leite-restricoes.md) | ✅ |
| Saúde animal | [saude-animal.md](./saude-animal.md) | ✅ |
| Acessos por perfil (RBAC) | [acessos-perfil.md](./acessos-perfil.md) | ✅ |
| Partos e crias | [partos.md](./partos.md) | ✅ |
| Toques (diagnóstico gestação) | [toques.md](./toques.md) | ✅ |
| Gestações | [gestacoes.md](./gestacoes.md) | ✅ |
| Secagens | [secagens.md](./secagens.md) | ✅ |
| Lactações | [lactacoes.md](./lactacoes.md) | ✅ |
| Produção de leite | [producao-leite.md](./producao-leite.md) | ✅ |
| Lotes | *a criar* `lotes.md` | 🚧 |
| Auditoria e conformidade | [auditoria.md](./auditoria.md) | ✅ |
| Integrações externas (API M2M) | [integracoes.md](./integracoes.md) | ✅ |

---

**Última atualização**: 2026-05-28
