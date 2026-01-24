# Verificando a Observabilidade do CeialMilk

O backend expõe **logs estruturados** (slog), **correlation IDs** e **Sentry** (erros). Abaixo, como conferir cada um.

---

## 1. Logs estruturados (slog)

Os logs vão para **stdout** em JSON. Quem roda o backend (terminal, Docker, Render) vê as linhas ali.

### Onde ver

- **Dev local**: terminal onde você rodou `go run ./cmd/api` ou o **Debug Backend (Go)**.
- **Devcontainer**: mesmo terminal do backend.
- **Docker/Render**: logs do serviço (ex.: `docker logs`, painel do Render).

### Nível de log

Configure `LOG_LEVEL`:

| Valor   | Uso típico      |
| ------- | --------------- |
| `DEBUG` | Desenvolvimento |
| `INFO`  | Padrão          |
| `WARN`  | Produção enxuta |
| `ERROR` | Só erros        |

Exemplo:

```bash
LOG_LEVEL=DEBUG go run ./cmd/api
# ou, no devcontainer:
export LOG_LEVEL=DEBUG
```

### O que aparece

- **Startup**: versão, porta, env, Sentry, rotas.
- **Por request**: `HTTP Request` com `method`, `path`, `status`, `latency_ms`, `correlation_id`, etc.
- **Erros 4xx/5xx**: `HTTP Error` com os mesmos campos.

Exemplo de linha:

```json
{
  "time": "...",
  "level": "INFO",
  "msg": "HTTP Request",
  "method": "GET",
  "path": "/api/v1/fazendas",
  "status": 200,
  "latency_ms": 12,
  "client_ip": "...",
  "correlation_id": "abc-123"
}
```

---

## 2. Correlation ID

Cada request recebe um **correlation ID** (ou usa o header `X-Correlation-ID` se o cliente enviar). Ele aparece nos logs e no header de resposta.

### Como verificar

1. **Header de resposta**  
   Em qualquer chamada à API, a resposta deve ter:

   ```http
   X-Correlation-ID: <uuid>
   ```

   Ver no DevTools do navegador (aba **Network** → requisição → **Headers** → **Response Headers**) ou com `curl -i`.

2. **Logs**  
   Todo log de request ou erro inclui `"correlation_id":"..."`. Use o mesmo valor para achar todas as entradas daquele request.

Exemplo com curl:

```bash
curl -i -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ceialmilk.com","password":"..."}'
# Procurar X-Correlation-ID na resposta
```

---

## 3. Sentry (erros)

O Sentry captura **panics** (via middleware de recovery) e **erros de handlers** (ex.: login, operações de auth).

### Configuração

Defina `SENTRY_DSN`:

1. Crie um projeto em [sentry.io](https://sentry.io).
2. Copie o **DSN** do projeto.
3. Configure no ambiente:
   ```bash
   export SENTRY_DSN="https://xxx@yyy.ingest.sentry.io/zzz"
   ```
   No devcontainer, inclua em `containerEnv` em `.devcontainer/devcontainer.json` ou use `export` no terminal antes de subir o backend.

Sem `SENTRY_DSN`, o backend só loga:

```text
Sentry DSN não configurado, captura de erros desabilitada
```

e não envia nada ao Sentry.

### Como provocar eventos

1. **Panic**  
   Force um panic em algum handler (ex.: `panic("teste")`), faça um request que passe por esse handler. O recovery middleware captura e envia ao Sentry.

2. **Erros de handler**  
   Ex.: login com email existente mas senha errada várias vezes, ou falha ao buscar usuário no banco. Esses erros são reportados via `CaptureHandlerError` (tags como `operation`, `path`, `method`, etc.).

### O que conferir no Sentry

- **Issues**: erros agrupados por stack trace.
- **Tags**: `correlation_id`, `path`, `method`, `operation`.
- **Contexto**: user_id, email, perfil quando disponível.

---

## Resumo rápido

| Recurso        | Onde ver                         | Variável / Config |
| -------------- | -------------------------------- | ----------------- |
| Logs JSON      | Stdout do processo do backend    | `LOG_LEVEL`       |
| Correlation ID | Header `X-Correlation-ID` + logs | (automático)      |
| Sentry         | Projeto no sentry.io             | `SENTRY_DSN`      |

**Última atualização**: 2026-01-24
