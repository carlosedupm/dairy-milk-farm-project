# Dev Container – Troubleshooting

Se o **Reopen in Container** falhar com `"Command failed: docker compose ... up -d"`, rode estes comandos **no host** (fora do container) para localizar o erro.

## Erro: `ceialmilk-db exited (1)` / `dependency failed to start`

O PostgreSQL não sobe; o dev container depende dele. Faça **nesta ordem**:

### A. Ver o log do banco

```bash
docker compose logs db
# ou, se o container já foi removido:
docker logs ceialmilk-db 2>&1
```

### B. Limpar volume e subir de novo (resolve na maioria dos casos)

Volume corrompido ou de outra versão costuma causar saída 1. **Remove o volume e recria**:

```bash
docker compose down -v
docker compose up -d
```

Confira se o `db` sobe: `docker compose ps`. Só então use **Reopen in Container**.

### C. Porta 5432 em uso

Se outro Postgres (ou serviço) estiver na 5432, o container falha:

```bash
# Linux/WSL
ss -tlnp | grep 5432
```

Se estiver em uso, pare o outro processo ou mude a porta no `docker-compose` (ex.: `"5433:5432"`).

---

## 1. Testar apenas o nosso compose (sem overrides do Cursor)

Na raiz do projeto:

```bash
# Build da imagem do dev container
docker compose build ceialmilk-dev

# Subir os serviços
docker compose up -d
```

- Se **build** ou **up** falharem, o problema está no `Dockerfile` ou no `docker-compose.yml`.
- Se ambos passarem, o problema provavelmente está nos **overrides** que o Cursor gera (`docker-compose.devcontainer.build-*.yml`, `docker-compose.devcontainer.containerFeatures-*.yml`).

## 2. Ver o erro exato do Dev Container (CLI)

```bash
npx -y @devcontainers/cli build --workspace-folder . --log-level debug
```

Ou, se usar o `devcontainer` global:

```bash
devcontainer build --workspace-folder . --log-level debug
```

A saída deve mostrar em que etapa ocorre a falha (build, merge do compose, etc.).

## 3. Portas em uso

Confirme se nada está usando 5432, 8080 ou 3000:

```bash
# Linux/WSL
ss -tlnp | grep -E '5432|8080|3000'
```

## 4. Limpar e tentar de novo

O **`-v`** remove os volumes (incl. dados do Postgres). Use se o `db` estiver falhando com exited (1):

```bash
docker compose down -v
docker compose up -d
docker compose ps   # confirmar que db e ceialmilk-dev estão Up
# Em seguida: Reopen in Container
```

---

**Última atualização**: 2026-01-24
