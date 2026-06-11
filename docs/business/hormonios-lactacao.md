# Regras de negócio — Hormônios de lactação

Registro de **aplicações de somatotropina bovina recombinante** (ex.: Lactropin, Bust) em matrizes **lactando e prenhes**, com protocolo periódico a cada 14 dias conforme recomendação veterinária da fazenda.

**Briefing**: [`BRF-005`](../briefings/BRF-005-hormonios-lactacao.md) — estado `implementado` (G3, 2026-06-10).

**Implementação**:

- Banco: [`backend/migrations/37_add_hormonios_lactacao.up.sql`](../../backend/migrations/37_add_hormonios_lactacao.up.sql)
- Backend: [`animal_hormonio_lactacao.go`](../../backend/internal/models/animal_hormonio_lactacao.go), [`animal_hormonio_lactacao_repository.go`](../../backend/internal/repository/animal_hormonio_lactacao_repository.go), [`animal_hormonio_lactacao_service.go`](../../backend/internal/service/animal_hormonio_lactacao_service.go), [`animal_hormonio_lactacao_handler.go`](../../backend/internal/handlers/animal_hormonio_lactacao_handler.go)
- Frontend: tab **Hormônio lactação** (`?tab=hormonio-lactacao`); [`/gestao/hormonios-lactacao/pendentes`](../../frontend/src/app/gestao/hormonios-lactacao/pendentes/page.tsx)

---

## Regras

### BR-HORM-001 — CRUD de aplicações por sub-recurso de animal

- **Enunciado**: cada aplicação de hormônio de lactação pertence a um animal e a um protocolo da lactação; gerida por sub-recurso REST.
- **Escopo**: animal individual dentro da fazenda do utilizador.
- **Perfis / permissões**: ver **BR-ACESSO-025**.
- **Efeito**: bloqueio no servidor para animal/caso inexistente, fora de escopo ou perfil sem permissão.
- **Implementação**: rotas em [`backend/cmd/api/main.go`](../../backend/cmd/api/main.go); handler [`animal_hormonio_lactacao_handler.go`](../../backend/internal/handlers/animal_hormonio_lactacao_handler.go)
- **Estado**: implementado.

### BR-HORM-002 — Catálogo de produtos

- **Enunciado**: campo `produto` obrigatório em cada aplicação, com valores `LACTROPIN`, `BUST` ou `OUTRO` (CHECK no banco). O protocolo guarda o `produto` da **1ª dose** como referência informativa; doses subsequentes **podem** usar produto diferente (decisão G1 #2 BRF-005).
- **Efeito**: bloqueio 400 `PRODUTO_INVALIDO` se valor fora do catálogo.
- **Implementação**: CHECK migration 37; `IsValidHormonioProduto` em [`animal_hormonio_lactacao.go`](../../backend/internal/models/animal_hormonio_lactacao.go)
- **Estado**: implementado.

### BR-HORM-003 — Elegibilidade: rebanho e lactação ativa

- **Enunciado**: só animal **no rebanho** (BR-SAUDE-003) com **lactação ativa** (BR-LACTACAO-002).
- **Efeito**: bloqueio 400 (`ANIMAL_FORA_REBANHO`, `SEM_LACTACAO_ATIVA`).
- **Implementação**: `ensureAnimalAtivo` + `GetEmAndamentoByAnimalID` em [`animal_hormonio_lactacao_service.go`](../../backend/internal/service/animal_hormonio_lactacao_service.go)
- **Estado**: implementado.

### BR-HORM-004 — 1ª dose após 1º toque prenhe da lactação

- **Enunciado**: 1ª aplicação exige 1º toque POSITIVO/PRENHA com `data >= lactacoes.data_inicio`; `data_aplicacao >= data` do toque (TMP-003).
- **Efeito**: bloqueio 400 `HORMONIO_SEM_TOQUE_PRENHE` ou `TMP-003`.
- **Implementação**: `GetPrimeiroPositivoAposData` em [`diagnostico_gestacao_repository.go`](../../backend/internal/repository/diagnostico_gestacao_repository.go); `validateHormonioAplicacaoAposToque`
- **Estado**: implementado.

### BR-HORM-005 — Gestação confirmada e vínculos

- **Enunciado**: toda aplicação exige gestação `CONFIRMADA` ativa com `data_prevista_parto`. Protocolo vincula `gestacao_id` e `lactacao_id`.
- **Efeito**: bloqueio 400 `SEM_GESTACAO_ATIVA`.
- **Implementação**: `GestacaoRepository.GetAtivaConfirmadaByAnimalID`
- **Estado**: implementado.

### BR-HORM-006 — Intervalo mínimo de 14 dias

- **Enunciado**: entre doses consecutivas, `data_aplicacao` ≥ dose anterior + 14 dias civis.
- **Efeito**: bloqueio 400 `HORMONIO_INTERVALO_MINIMO`.
- **Estado**: implementado.

### BR-HORM-007 — Teto pré-parto (70 dias)

- **Enunciado**: não registrar `data_aplicacao > data_prevista_parto - 70 dias`; `data_proxima_aplicacao = min(+14d, teto)` ou `NULL` se ultrapassar.
- **Efeito**: bloqueio 400 `HORMONIO_JANELA_PRE_PARTO`.
- **Implementação**: `calcDataProximaAplicacao`, `validateHormonioJanelaPreParto`
- **Estado**: implementado.

### BR-HORM-008 — Protocolo por lactação

- **Enunciado**: 1 protocolo `ATIVO` por `lactacao_id`; 1ª dose abre protocolo; encerramento manual GERENTE+ (`BAIXA_PRODUCAO`|`OUTRO`); secagem → `ENCERRADO`/`SECAGEM`.
- **Efeito**: POST bloqueado se protocolo `ENCERRADO` (`PROTOCOLO_ENCERRADO`).
- **Implementação**: `EncerrarProtocolo`; hook em [`secagem_service.go`](../../backend/internal/service/secagem_service.go) (`encerrarProtocoloHormonioSeExistirTx`)
- **Estado**: implementado.

### BR-HORM-009 — Listagem de pendentes (sem alerta automático)

- **Enunciado**: `GET /api/v1/fazendas/:id/hormonios-lactacao/pendentes` retorna animais elegíveis (BR-HORM-003/004/005/007) **sem protocolo na lactação** (1ª dose pendente) **ou** com protocolo `ATIVO` e `data_proxima_aplicacao <= hoje`, excluindo janela de 70d e protocolos encerrados. **Não** gera alertas.
- **Escopo**: UI `/gestao/hormonios-lactacao/pendentes`.
- **Implementação**: `ListPendentesByFazendaID` em [`animal_hormonio_lactacao_repository.go`](../../backend/internal/repository/animal_hormonio_lactacao_repository.go)
- **Estado**: implementado.

### BR-HORM-010 — Aplicações na timeline da ficha

- **Enunciado**: filtro `tipo=hormonio_lactacao` na timeline; eventos `HORMONIO_LACTACAO` com produto, dose e data.
- **Implementação**: UNION em [`timeline_repository.go`](../../backend/internal/repository/timeline_repository.go); chip em [`AnimalTimelineSection.tsx`](../../frontend/src/components/animais/AnimalTimelineSection.tsx)
- **Estado**: implementado.

### BR-HORM-011 — Aplicação cria caso PREVENTIVO concluído

- **Enunciado**: POST cria `animal_saude` PREVENTIVO CONCLUIDO com FK `hormonio_lactacao_aplicacao_id`; falha não bloqueia (log warning).
- **Implementação**: `createCasoPreventivo`; coluna migration 37; padrão BR-SAUDE-010
- **Estado**: implementado.

---

## Referências cruzadas

| Regra | Relação |
|-------|---------|
| [BR-TOQUES-002](./toques.md) | Toque positivo — pré-requisito da 1ª dose |
| [BR-GESTACOES-001](./gestacoes.md) | Gestação confirmada — `data_prevista_parto` |
| [BR-LACTACAO-002](./lactacoes.md) / [BR-LACTACAO-003](./lactacoes.md) | Lactação ativa; secagem encerra protocolo |
| [BR-SECAGENS-002](./secagens.md) | Secagem dispara encerramento `SECAGEM` |
| [BR-SAUDE-003](./saude-animal.md) / [BR-SAUDE-010](./saude-animal.md) | Rebanho; caso PREVENTIVO |
| [BR-ACESSO-025](./acessos-perfil.md) | RBAC API/UI |

---

**Última atualização**: 2026-06-10 (BR-HORM-001–011 implementado — BRF-005 G3)
