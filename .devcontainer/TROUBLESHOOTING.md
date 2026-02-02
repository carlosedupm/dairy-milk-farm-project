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

## Erro: `Permission denied (publickey)` ao usar Git (git pull / git push)

O dev container encaminha o agente SSH do host. Se aparecer esse erro:

### No host (fora do container)

1. Garanta que o **ssh-agent** está rodando e que a chave está carregada:

   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519   # ou id_rsa, conforme sua chave
   ssh-add -l                  # deve listar a chave
   ```

2. Teste no host: `ssh -T git@github.com` deve responder com sucesso.

### Depois de Reopen in Container

Dentro do container, confira:

```bash
echo $SSH_AUTH_SOCK   # deve ser /ssh-agent
ssh -T git@github.com
git pull --tags origin main
```

Se `SSH_AUTH_SOCK` estiver vazio, o agente não estava ativo no host ao abrir o container. Feche o container, rode `ssh-add` no host e use **Reopen in Container** de novo.

**Alternativa (HTTPS):** troque o remote para HTTPS e use token/PAT quando o Git pedir credenciais:

```bash
git remote set-url origin https://github.com/OWNER/REPO.git
```

---

**Última atualização**: 2026-02-02
