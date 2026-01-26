# 🔧 Configuração de Variáveis no Debug do VS Code

## ✅ Solução Implementada

O backend agora **carrega automaticamente** o arquivo `.env` quando inicia, funcionando tanto no debug quanto na execução normal.

## 📋 Como Funciona

1. O backend tenta carregar `.env` de dois locais:
   - `../.env` (quando executado de `/workspace/backend`)
   - `.env` (quando executado da raiz `/workspace`)

2. Se o arquivo `.env` existir, as variáveis são carregadas automaticamente

3. Variáveis do `.env` têm prioridade sobre variáveis de ambiente do sistema

## 🔍 Verificar se Está Funcionando

### 1. Verificar Logs do Backend

Ao iniciar o backend (via debug ou script), procure por esta mensagem:

```
✅ Variáveis de ambiente carregadas de .env path=../.env
```

**Se aparecer**: ✅ `.env` foi carregado com sucesso!

**Se não aparecer**: O arquivo `.env` não foi encontrado ou não existe

### 2. Verificar se Dev Studio Está Habilitado

Procure por esta mensagem nos logs:

```
✅ Rotas do Dev Studio registradas
```

**Se aparecer**: ✅ `GEMINI_API_KEY` está configurada!

**Se aparecer esta mensagem:**

```
⚠️ GEMINI_API_KEY não configurada: Dev Studio desabilitado
```

**Solução**: Verifique se o `.env` tem `GEMINI_API_KEY` configurada

### 3. Verificar GitHub (Opcional)

Procure por esta mensagem:

```
✅ GitHub Service configurado repo=usuario/ceialmilk
```

**Se aparecer**: ✅ GitHub configurado!

**Se aparecer:**

```
⚠️ GitHub não configurado (GITHUB_TOKEN ou GITHUB_REPO não definidos). Funcionalidade de PRs desabilitada.
```

**Solução**: Configure `GITHUB_TOKEN` e `GITHUB_REPO` no `.env`. Opcionalmente, `GITHUB_CONTEXT_BRANCH` (default `main`) define a branch de produção usada para contexto da IA (exemplos e arquivos-alvo).

## 🐛 Troubleshooting

### Problema: "GEMINI_API_KEY não configurada" mesmo com .env

**Possíveis causas:**

1. **Arquivo `.env` não existe ou está no lugar errado**

   ```bash
   # Verificar se existe
   ls -la /workspace/.env

   # Deve estar na raiz do projeto
   ```

2. **Formato incorreto no `.env`**

   ```bash
   # ❌ ERRADO (com espaços ou aspas extras)
   GEMINI_API_KEY = "gAIzaSy..."
   GEMINI_API_KEY="gAIzaSy..."

   # ✅ CORRETO (sem espaços, sem aspas)
   GEMINI_API_KEY=gAIzaSy...
   ```

3. **Comentários ou linhas vazias causando problemas**
   ```bash
   # Verificar formato
   cat .env | grep GEMINI_API_KEY
   ```

**Solução:**

1. Verifique o formato do `.env`:

   ```bash
   cat .env
   ```

2. Certifique-se de que está no formato correto:

   ```bash
   GEMINI_API_KEY=sua-chave-aqui
   GITHUB_TOKEN=ghp_seu-token-aqui
   GITHUB_REPO=usuario/ceialmilk
   GITHUB_CONTEXT_BRANCH=main   # opcional; default main (branch de produção para contexto IA)
   ```

3. Reinicie o debug do VS Code

### Problema: Backend não encontra o .env

**Causa**: Caminho incorreto

**Solução**: O backend procura em:

- `../.env` (quando executado de `backend/`)
- `.env` (quando executado da raiz)

Certifique-se de que o `.env` está em `/workspace/.env`

### Problema: Variáveis não aparecem nos logs

**Causa**: Logs podem não mostrar valores por segurança

**Solução**: Verifique se as funcionalidades funcionam:

- Teste gerar código no Dev Studio
- Se funcionar, as variáveis estão carregadas!

## 📝 Exemplo de .env Correto

```bash
# Database
DATABASE_URL=postgres://ceialmilk:password@localhost:5432/ceialmilk?sslmode=disable

# Server
PORT=8080
ENV=development
LOG_LEVEL=INFO

# CORS
CORS_ORIGIN=http://localhost:3000

# Gemini API (Dev Studio)
GEMINI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxx

# GitHub API (Dev Studio - Fase 1: PRs Automáticos)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_REPO=usuario/ceialmilk
```

## ✅ Checklist de Verificação

Após configurar o `.env` e iniciar o debug:

- [ ] Arquivo `.env` existe em `/workspace/.env`
- [ ] Formato do `.env` está correto (sem espaços, sem aspas extras)
- [ ] Log mostra: "Variáveis de ambiente carregadas de .env"
- [ ] Log mostra: "Rotas do Dev Studio registradas" (se Gemini configurado)
- [ ] Log mostra: "GitHub Service configurado" (se GitHub configurado)
- [ ] Teste prático: Gerar código no Dev Studio funciona

---

**Última atualização**: 2026-01-26 (incl. GITHUB_CONTEXT_BRANCH e contexto do repositório)
