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
- **Regra nova nasce na análise funcional**: requisitos novos entram aqui com estado `planejado` **antes** da implementação, junto com o briefing correspondente — ver fluxo em [`docs/briefings/README.md`](../briefings/README.md). A implementação só muda o estado para `implementado` e adiciona os ponteiros ao código.
- **Verificação automatizada**: `node scripts/validate-br-refs.mjs` (CI) garante que todo `BR-*`/`TMP-*`/`INT-*` citado em código ou briefing existe neste catálogo.

## Índice de módulos

### Transversal e visibilidade

| Módulo | Arquivo | Regras | Estado |
|--------|---------|--------|--------|
| **Ciclo do rebanho (mestre)** | [ciclo-rebanho.md](./ciclo-rebanho.md) | `BR-CICLO-*` | ✅ Referência mestre |
| **Saúde animal** | [saude-animal.md](./saude-animal.md) | `BR-SAUDE-001`–`005` | ✅ |
| **Alertas proativos** | [alertas.md](./alertas.md) | `BR-ALERTA-001`–`018` | ✅ (+ `018` planejado) |
| **Auditoria e conformidade** | [auditoria.md](./auditoria.md) | `BR-AUDIT-*`, INT-001–007 | ✅ |

### Ciclo reprodutivo e produção

| Módulo | Arquivo | Estado do catálogo |
|--------|---------|-------------------|
| Animais (busca contextual) | [animais.md](./animais.md) | ✅ |
| Cios (detecção) | [cios.md](./cios.md) | ✅ |
| Coberturas (reprodução) | [coberturas.md](./coberturas.md) | ✅ |
| Toques (diagnóstico gestação) | [toques.md](./toques.md) | ✅ |
| Gestações | [gestacoes.md](./gestacoes.md) | ✅ |
| Secagens | [secagens.md](./secagens.md) | ✅ |
| Partos e crias | [partos.md](./partos.md) | ✅ |
| Lactações | [lactacoes.md](./lactacoes.md) | ✅ |
| Produção de leite | [producao-leite.md](./producao-leite.md) | ✅ |
| Hormônios de lactação (Lactropin, Bust) | [hormonios-lactacao.md](./hormonios-lactacao.md) | ✅ `BR-HORM-001`–`011` implementado |
| Leite — descarte / laboratório | [leite-restricoes.md](./leite-restricoes.md) | ✅ |
| Baixa do rebanho | [baixa-rebanho.md](./baixa-rebanho.md) | ✅ |

### Agricultura

| Módulo | Arquivo | Regras | Estado |
|--------|---------|--------|--------|
| **Agricultura (safras, custos, solo)** | [agricultura.md](./agricultura.md) | `BR-AGRI-001`–`004` | ✅ |

### Operação e plataforma

| Módulo | Arquivo | Estado do catálogo |
|--------|---------|-------------------|
| Folgas (escala 5x1) | [folgas.md](./folgas.md) | ✅ |
| Acessos por perfil (RBAC) | [acessos-perfil.md](./acessos-perfil.md) | ✅ |
| Integrações externas (API M2M) | [integracoes.md](./integracoes.md) | ✅ |
| Lotes | [lotes.md](./lotes.md) | `BR-LOTE-001`–`004` | ✅ |

---

**Última atualização**: 2026-06-14 (lotes.md + BRF-006 backlog)
