# Guia de integração — CeialMilk API M2M

## Autenticação

```http
Authorization: Bearer cmk_live_<segredo>
```

A chave é gerada em **Admin → Integrações** (`/admin/integracoes`). Só é exibida na criação ou na rotação.

## Base URL

- Desenvolvimento: `http://localhost:8080`
- Produção: URL do backend Render (ver `memory-bank/deploy-notes.md`)

Todas as rotas abaixo usam o prefixo `/api/v1/integracoes`.

## Documentação interativa (OpenAPI / Swagger)

Acesso **público** (não exige API key para ver a documentação):

| Recurso | URL (dev) |
|---------|-----------|
| **Swagger UI** | [http://localhost:8080/api/v1/integracoes/docs](http://localhost:8080/api/v1/integracoes/docs) |
| **OpenAPI YAML** | [http://localhost:8080/api/v1/integracoes/openapi.yaml](http://localhost:8080/api/v1/integracoes/openapi.yaml) |
| Atalho | `/api/v1/integracoes/swagger` → redireciona para `/docs` |

Ficheiro versionado no repositório: [`docs/openapi/integracoes-v1.openapi.yaml`](../openapi/integracoes-v1.openapi.yaml) (cópia de [`backend/internal/openapi/integracoes-v1.openapi.yaml`](../../backend/internal/openapi/integracoes-v1.openapi.yaml) usada no embed).

No Swagger UI: **Authorize** → cole a chave completa `cmk_live_...` → use **Try it out**. Para `GET /animais/search`, preencha os parâmetros na secção **Parameters** (query), não em headers.

A spec OpenAPI declara o servidor como URL relativa `/` — o dropdown **Servers** usa o **mesmo host** onde abriu o Swagger (dev `localhost:8080` ou URL de produção do Render).

**Postman:** Import → Link → `http://localhost:8080/api/v1/integracoes/openapi.yaml`

## Scopes (v1)

| Scope | Endpoints |
|-------|-----------|
| `animais:read` | `GET /animais/search`, `GET /animais/:id` |
| `coberturas:read` | `GET /coberturas?animal_id=` |
| `coberturas:write` | `POST /coberturas`, `POST /coberturas/lote` |
| `toques:write` | `POST /toques`, `POST /toques/lote` |
| `saude:read` | `GET /saude?fazenda_id=&animal_id=` |
| `saude:write` | `POST /saude` |
| `alertas:read` | `GET /alertas?fazenda_id=` (filtro opcional `status`) |

## Fluxo recomendado — laboratório / saúde animal

1. (Opcional) `GET /animais/search?fazenda_id=&identificacao=` para obter `animal_id`.
2. Consultar histórico: `GET /saude?fazenda_id=1&animal_id=5` (scope `saude:read`).
3. Registar resultado com idempotência:

```bash
curl -s -X POST "$BASE/api/v1/integracoes/saude" \
  -H "Authorization: Bearer $CMK_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: lab-result-animal-5-2026-05-30" \
  -d '{
    "animal_id": 5,
    "fazenda_id": 1,
    "tipo_caso": "TRATAMENTO",
    "data_inicio": "2026-05-30",
    "status": "ATIVO",
    "observacoes": "Resultado laboratorial — exame X"
  }'
```

4. Monitorizar não-conformidades: `GET /alertas?fazenda_id=1&status=ABERTO` (scope `alertas:read`).

## Fluxo recomendado — importar coberturas (IA / monta)

1. Extrair do sistema externo: identificação (brinco), `tipo` (`IA`, `IATF`, `MONTA_NATURAL`, `TE`), `data` (RFC3339), opcionais `semen_partida`, `touro_animal_id`, `touro_info`, `tecnico`, `observacoes`.
2. (Opcional) `GET /animais/search?fazenda_id=&identificacao=` para validar animal antes do lote.
3. Enviar lote com idempotência:

```bash
curl -s -X POST "$BASE/api/v1/integracoes/coberturas/lote" \
  -H "Authorization: Bearer $CMK_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: import-ia-2026-05-23-fazenda-1" \
  -d '{
    "fazenda_id": 1,
    "itens": [
      {
        "identificacao": "BR-042",
        "tipo": "IA",
        "data": "2026-05-20T08:00:00Z",
        "semen_partida": "LOTE-2026-A",
        "tecnico": "Dr. Silva"
      }
    ]
  }'
```

**Unitário** (quando já tem `animal_id`):

```bash
curl -s -X POST "$BASE/api/v1/integracoes/coberturas" \
  -H "Authorization: Bearer $CMK_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: cobertura-animal-5-2026-05-20" \
  -d '{
    "animal_id": 5,
    "fazenda_id": 1,
    "tipo": "IA",
    "data": "2026-05-20T10:00:00Z",
    "semen_partida": "LOTE-2026-A"
  }'
```

Depois das coberturas registadas, seguir o fluxo de toques (abaixo) para diagnósticos de gestação.

## Fluxo recomendado — relatório veterinário (toques)

1. Extrair do PDF (OCR/IA externa) uma lista: identificação, data, e **ou** `resultado` (`POSITIVO` / `NEGATIVO` / `INCONCLUSIVO`) **ou** `classificacao_operacional` (`PRENHA`, `VAZIA`, `VAZIA_PEV`, `CLOE`, `CL`, `RETOQUE`). Opcionais: `cobertura_id`, `dias_gestacao_estimados`, `metodo`, `veterinario`, `observacoes`.
2. (Opcional) Para cada identificação ambígua, `GET /animais/search?fazenda_id=&identificacao=`.
3. Para toques positivos, `GET /coberturas?animal_id=` e escolher `cobertura_id`.
4. Enviar lote com idempotência:

```bash
curl -s -X POST "$BASE/api/v1/integracoes/toques/lote" \
  -H "Authorization: Bearer $CMK_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: relatorio-vet-2026-05-21-fazenda-1" \
  -d '{
    "fazenda_id": 1,
    "itens": [
      {
        "identificacao": "148",
        "data": "2026-05-20T10:00:00Z",
        "classificacao_operacional": "PRENHA",
        "dias_gestacao_estimados": 150,
        "observacoes": "5 MESES"
      },
      {
        "identificacao": "71",
        "data": "2026-05-20T10:00:00Z",
        "classificacao_operacional": "VAZIA",
        "observacoes": "PROTOCOLO"
      },
      {
        "identificacao": "BR-099",
        "data": "2026-05-20T10:00:00Z",
        "resultado": "NEGATIVO"
      }
    ]
  }'
```

Use o mesmo `Idempotency-Key` ao reenviar o **mesmo** payload; alterações no body exigem nova chave.

## Resposta do lote (toques)

```json
{
  "data": {
    "total": 2,
    "sucesso": 1,
    "falhas": [
      {
        "linha": 2,
        "identificacao": "BR-099",
        "code": "ANIMAL_NAO_ENCONTRADO",
        "message": "animal nao encontrado na fazenda"
      }
    ],
    "toques_criados": [{ "id": 1, "animal_id": 5, "resultado": "POSITIVO" }]
  }
}
```

## Resposta do lote (coberturas)

```json
{
  "data": {
    "total": 1,
    "sucesso": 1,
    "falhas": [],
    "coberturas_criadas": [{ "id": 12, "animal_id": 5, "tipo": "IA", "fazenda_id": 1 }]
  }
}
```

## Códigos de erro por linha (toques)

| Code | Significado |
|------|-------------|
| `ANIMAL_NAO_ENCONTRADO` | Nenhum animal na fazenda com essa identificação |
| `ANIMAL_AMBIGUO` | Mais de um animal; ver `animal_ids` |
| `TOQUE_POSITIVO_SEM_COBERTURA` | Positivo sem cobertura vinculada |
| `TOQUE_POSITIVO_GESTACAO_ATIVA` | Animal já com gestação confirmada |
| `DATA_INVALIDA` | Data não está em RFC3339 |
| `RESULTADO_INVALIDO` | Campo obrigatório ou resultado inválido |

## Códigos de erro por linha (coberturas)

| Code | Significado |
|------|-------------|
| `ANIMAL_NAO_ENCONTRADO` | Nenhum animal na fazenda com essa identificação |
| `ANIMAL_AMBIGUO` | Mais de um animal; ver `animal_ids` |
| `TIPO_INVALIDO` | Tipo ausente ou inválido |
| `FEMEA_OBRIGATORIA` | Animal não é fêmea |
| `REPRODUTOR_OBRIGATORIO` | `MONTA_NATURAL` sem `touro_animal_id` nem `touro_info` |
| `REPRODUTOR_INVALIDO` | Reprodutor inexistente ou inválido (sexo/categoria/fazenda) |
| `DATA_INVALIDA` | Data não está em RFC3339 |
| `RESULTADO_INVALIDO` | Identificação obrigatória em falta |
| `ERRO_INTERNO` | Erro inesperado no servidor |

## Rate limit

Variável de ambiente `INTEGRATION_RATE_LIMIT_PER_HOUR` (default **300** requisições/hora por cliente). Resposta **429** quando excedido.

## Administração

| Método | Rota (JWT admin) | Descrição |
|--------|------------------|-----------|
| `GET` | `/api/v1/admin/integracoes` | Listar clientes |
| `POST` | `/api/v1/admin/integracoes` | Criar (+ `api_key` uma vez) |
| `GET` | `/api/v1/admin/integracoes/:id` | Detalhe + chamadas recentes |
| `PATCH` | `/api/v1/admin/integracoes/:id` | Nome, fazendas, scopes |
| `POST` | `/api/v1/admin/integracoes/:id/rotacionar-chave` | Nova chave |
| `POST` | `/api/v1/admin/integracoes/:id/revogar` | Revogar |

## Postman

Importe a spec OpenAPI (recomendado para integrações) ou `docs/postman/CeialMilk-Postman-Collection.json` (API geral). Defina `integration_api_key` no ambiente. Ver `docs/postman/POSTMAN-README.md`.

---

**Última atualização**: 2026-05-30
