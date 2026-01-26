# ✅ Como Verificar se as Variáveis Estão Configuradas

Este guia mostra como verificar se as variáveis de ambiente estão configuradas corretamente após subir o devcontainer.

## 🔍 Método 1: Script Automático (Recomendado)

Execute o script de verificação:

```bash
./scripts/verify-dev-studio.sh
```

Este script verifica:
- ✅ `GEMINI_API_KEY` configurada
- ✅ `GITHUB_TOKEN` configurada (opcional)
- ✅ `GITHUB_REPO` configurada (opcional)
- ✅ Tabelas do Dev Studio no banco
- ✅ Perfil DEVELOPER do usuário admin

## 🔍 Método 2: Verificação Manual

### 2.1 Verificar Variáveis de Ambiente

```bash
# Verificar Gemini API
echo $GEMINI_API_KEY
# Deve mostrar: gAIzaSy... (ou similar)

# Verificar GitHub Token
echo $GITHUB_TOKEN
# Deve mostrar: ghp_... (se configurado)

# Verificar GitHub Repo
echo $GITHUB_REPO
# Deve mostrar: usuario/ceialmilk (se configurado)
```

### 2.2 Verificar Arquivo .env

```bash
# Ver conteúdo do .env (sem mostrar valores completos por segurança)
cat .env | grep -E "GEMINI_API_KEY|GITHUB_TOKEN|GITHUB_REPO"
```

### 2.3 Verificar Logs do Backend

Ao iniciar o backend, procure por estas mensagens nos logs:

**Se Gemini estiver configurado:**
```
✅ Rotas do Dev Studio registradas
```

**Se GitHub estiver configurado:**
```
✅ GitHub Service configurado repo=usuario/ceialmilk
```

**Se GitHub NÃO estiver configurado:**
```
⚠️ GitHub não configurado (GITHUB_TOKEN ou GITHUB_REPO não definidos). Funcionalidade de PRs desabilitada.
```

## 🔍 Método 3: Teste Prático

### 3.1 Testar Dev Studio (Chat)

1. Inicie o backend:
   ```bash
   ./scripts/start-backend-dev-studio.sh
   ```

2. Inicie o frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Acesse: `http://localhost:3000/dev-studio`

4. Faça login e teste gerar código:
   - Se funcionar: ✅ Gemini configurado
   - Se der erro: ❌ Verifique `GEMINI_API_KEY`

### 3.2 Testar Criação de PR

1. Gere código via chat
2. Valide o código
3. Clique em "Criar PR"

**Se funcionar:**
- ✅ GitHub configurado corretamente
- ✅ PR será criado no GitHub

**Se der erro:**
- ❌ Verifique `GITHUB_TOKEN` e `GITHUB_REPO`
- ❌ Verifique se o token tem permissão `repo`
- ❌ Verifique se o formato do repositório está correto

## 📋 Checklist de Verificação

Após subir o devcontainer, verifique:

- [ ] `GEMINI_API_KEY` está definida
  ```bash
  echo $GEMINI_API_KEY
  ```

- [ ] `GITHUB_TOKEN` está definida (opcional)
  ```bash
  echo $GITHUB_TOKEN
  ```

- [ ] `GITHUB_REPO` está definida (opcional)
  ```bash
  echo $GITHUB_REPO
  ```

- [ ] Arquivo `.env` existe e tem os valores
  ```bash
  cat .env
  ```

- [ ] Backend inicia sem erros
  ```bash
  ./scripts/start-backend-dev-studio.sh
  ```

- [ ] Logs mostram "Rotas do Dev Studio registradas"
- [ ] Logs mostram "GitHub Service configurado" (se GitHub configurado)

## 🐛 Problemas Comuns

### Variáveis não aparecem após subir devcontainer

**Causa**: Variáveis não foram configuradas no sistema local ou no `.env`

**Solução**:
1. Verifique se configurou no `.env`:
   ```bash
   cat .env
   ```

2. Se usar `remoteEnv` no devcontainer.json, verifique se configurou no sistema local:
   ```bash
   # Linux/macOS
   echo $GITHUB_TOKEN
   
   # Se vazio, adicione ao ~/.bashrc ou ~/.zshrc
   ```

3. Reinicie o devcontainer após configurar

### Script de verificação mostra variáveis vazias

**Causa**: Arquivo `.env` não está sendo carregado

**Solução**:
1. Verifique se o arquivo `.env` existe:
   ```bash
   ls -la .env
   ```

2. Carregue manualmente:
   ```bash
   export $(grep -v '^#' .env | xargs)
   ```

3. Verifique novamente:
   ```bash
   echo $GITHUB_TOKEN
   ```

### Backend não reconhece variáveis do .env

**Causa**: O backend Go não carrega `.env` automaticamente

**Solução**: Use o script que carrega o `.env`:
```bash
./scripts/start-backend-dev-studio.sh
```

Ou carregue manualmente antes:
```bash
export $(grep -v '^#' .env | xargs)
cd backend
go run ./cmd/api
```

## 🔒 Segurança

⚠️ **Nunca** mostre valores completos de tokens em logs ou mensagens públicas!

Para verificar sem expor o token completo:
```bash
# Mostrar apenas primeiros e últimos caracteres
TOKEN=$GITHUB_TOKEN
echo "${TOKEN:0:7}...${TOKEN: -4}"
```

---

**Última atualização**: 2026-01-26
