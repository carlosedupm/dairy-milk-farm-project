# Plano — Assistente por capacidades (FUNCIONARIO)

Plano de liberação incremental do Assistente Virtual para o perfil **FUNCIONARIO**, conforme **BR-ACESSO-006** e jornada de campo em [`memory-bank/productContext.md`](../../memory-bank/productContext.md).

**Estado atual:** `FUNCIONARIO` com capability `assistente.consulta` (BRF-007 implementado, 2026-06-14). Fases 2–4 pendentes.

## Princípios

1. **Capability-based** — cada fase libera tools/intents explícitas, não o assistente completo.
2. **Espelhar RBAC existente** — só capacidades já permitidas na API JWT (`BR-ACESSO-015`, produção, consulta animais).
3. **Sem escrita destrutiva** — excluir animal, editar cadastro, resolver alertas como GERENTE permanecem bloqueados nas fases iniciais.

## Fases propostas

### Fase 1 — Consulta no curral (MVP)

**Objetivo:** Buscar animal e ver contexto por voz/texto sem sair do fluxo de campo.

| Capability | Tools / intents | RBAC já existente |
|------------|-----------------|-------------------|
| `assistente.consulta` | `detalhar_animal`, `consultar_animais_fazenda` (contagem), reuso `AnimalSearchPanel` via intent | GET animais, GET contexto |

**Alterações técnicas:**

- `appAccess.ts`: `FUNCIONARIO: ["assistente.consulta"]`; `showAssistenteForPerfil` true quando capability não vazia.
- `perfil_access.go`: whitelist `GET`-equivalente no assistente Live para FUNCIONARIO (interpretar + live WS).
- `assistente_live_service.go`: filtrar `ExecuteFunction` — só tools da fase 1.
- UI: FAB visível; mensagem de boas-vindas «Modo consulta».

**Critério de aceite:** FUNCIONARIO pergunta «quantas vacas na fazenda?» e «detalhes do animal 123»; 403 em `cadastrar_animal`, `registrar_producao_animal`.

### Fase 2 — Registro de produção

| Capability | Tools | RBAC |
|------------|-------|------|
| `assistente.producao` | `registrar_producao_animal` | POST `/api/v1/producao` (BR-ACESSO-015) |

**Pré-requisito:** Fase 1 estável.

**Validação:** só animais em lactação ativa (BR-CICLO-007); confirmação por voz antes de gravar.

### Fase 3 — Alertas operacionais (somente leitura + em andamento)

| Capability | Tools | RBAC |
|------------|-------|------|
| `assistente.alertas` | `listar_alertas`; opcional `resolver_alerta` **apenas** `EM_ANDAMENTO` | BR-ALERTA-007 |

**Nota:** `resolver_alerta` → RESOLVIDO permanece GERENTE+.

### Fase 4 — Saúde (registo simples)

| Capability | Tools | RBAC |
|------------|-------|------|
| `assistente.saude` | `consultar_saude`, `registrar_saude` (POST, sem PUT/DELETE) | BR-SAUDE-001 FUNCIONARIO |

### Fora do escopo inicial

- Gestão reprodutiva (cio, cobertura, toque) via assistente — usar UI `/gestao`.
- Agricultura, folgas, admin.
- FUNCIONARIO com assistente em modo Live **apenas texto** no mobile se voz falhar (já suportado globalmente).

## Sequência de entrega recomendada

```mermaid
flowchart LR
  F1[Fase1_Consulta] --> F2[Fase2_Producao]
  F2 --> F3[Fase3_Alertas]
  F3 --> F4[Fase4_Saude]
```

## Briefing sugerido

Após aprovação deste plano, criar **BRF-007** (Fase 1 apenas) referenciando extensão de **BR-ACESSO-006** com sub-regra ou nota de capabilities implementadas.

## Riscos

- **IDOR / tenant:** manter `ensureAnimalAccess` em todos os resolvers (BR-ACESSO-023).
- **Ruído em campo:** TTS opcional desligado por defeito para FUNCIONARIO na fase 1.
- **Custo Gemini:** rate limit por perfil se necessário (futuro).

**Última atualização**: 2026-06-14
