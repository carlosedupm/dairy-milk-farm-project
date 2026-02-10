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

O dev container monta duas coisas para SSH: (1) o socket do **ssh-agent** do host e (2) a pasta **~/.ssh** do host em `/home/vscode/.ssh`. O Git/SSH usam as chaves dessa pasta quando o agente não está disponível.

Se o erro continuar após Rebuild/Reopen:

### 1. Conferir se as chaves estão montadas

Dentro do container:

```bash
ls -la /home/vscode/.ssh/
# Deve listar id_ed25519 ou id_rsa (e .pub). Se estiver vazio, o mount de .ssh falhou.
```

### 2. Por que o mount de .ssh pode falhar (WSL2)

O `devcontainer.json` usa `${localEnv:HOME}/.ssh`. O Cursor/VS Code usa o ambiente do **processo que abriu o projeto**. Se você abriu pelo ícone do Windows (e não pelo terminal WSL), `HOME` pode ser do Windows e o Docker (WSL2) não enxerga esse caminho.

**Solução:** abra o projeto a partir do terminal WSL para que `HOME` seja o home do WSL (ex.: `/home/seu_usuario`):

```bash
cd /caminho/do/projeto
cursor .   # ou code .
```

Depois use **Reopen in Container**. O mount `~/.ssh` passará a apontar para `/home/seu_usuario/.ssh` no WSL.

### 3. Garantir chave e permissões no host (WSL)

No host (terminal WSL, fora do container):

```bash
ls -la ~/.ssh/
# A chave (id_ed25519 ou id_rsa) deve existir e ter permissão 600
chmod 600 ~/.ssh/id_ed25519   # ou id_rsa
ssh -T git@github.com        # deve autenticar
```

### 4. Testar dentro do container

Depois do Rebuild/Reopen:

```bash
ssh -T git@github.com
git pull --tags origin main
```

Se ainda falhar, use **HTTPS** em vez de SSH:

```bash
git remote set-url origin https://github.com/OWNER/REPO.git
# No primeiro push/pull, use seu usuário GitHub e um Personal Access Token como senha.
```

---

## Erro: Couldn't find dlv at the Go tools path

Ao iniciar o debug do backend Go, a extensão Go do VS Code/Cursor precisa do **Delve** (`dlv`), o debugger de Go. No dev container, o `dlv` é instalado automaticamente pelo `postCreateCommand` do `devcontainer.json` (em Create ou Rebuild).

Se o erro aparecer (por exemplo, se o container foi criado antes dessa configuração):

1. **Rebuild do container**: use **Dev Containers: Rebuild Container** para rodar o `postCreateCommand` de novo e instalar o `dlv`.
2. **Instalação manual** (dentro do container): abra um terminal no workspace e rode:

```bash
go install github.com/go-delve/delve/cmd/dlv@latest
```

Depois disso, o executável ficará em `$GOPATH/bin/dlv` (normalmente `/home/vscode/go/bin/dlv`), que já está no `PATH`. Inicie o debug novamente.

---

**Última atualização**: 2026-02-09
