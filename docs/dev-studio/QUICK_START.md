# ⚡ Quick Start - Dev Studio

## ✅ Configuração Completa

Tudo já está configurado! Siga estes passos:

### 1. Verificar Variável de Ambiente

A `GEMINI_API_KEY` já foi adicionada ao `devcontainer.json`. Se você estiver usando o devcontainer, ela já está disponível.

**Para verificar:**
```bash
echo $GEMINI_API_KEY
```

**Se estiver vazia, configure:**
```bash
export GEMINI_API_KEY="sua-chave-gemini-aqui"
```
**Obtenha sua chave em**: https://ai.google.dev/

### 2. Iniciar o Backend

**Opção 1: Debug no VS Code (recomendado para desenvolvimento)**
1. Abra o painel de Debug (F5 ou Ctrl+Shift+D)
2. Selecione "Debug Backend (Go)"
3. Pressione F5 para iniciar

A configuração já inclui todas as variáveis de ambiente necessárias, incluindo `GEMINI_API_KEY`.

**Opção 2: Usando o script**
```bash
./scripts/start-backend-dev-studio.sh
```

**Opção 3: Manualmente**
```bash
cd /workspace/backend
export GEMINI_API_KEY="sua-chave-gemini-aqui"
go run ./cmd/api
```

**Você deve ver:**
```
✅ Rotas do Dev Studio registradas
```

**Se aparecer:**
```
⚠️ GEMINI_API_KEY não configurada: Dev Studio desabilitado
```

Configure a variável de ambiente (passo 1).

### 3. Iniciar o Frontend (em outro terminal)

```bash
cd /workspace/frontend
npm run dev
```

### 4. Acessar o Dev Studio

1. Abra `http://localhost:3000`
2. Faça login:
   - **Email**: `admin@ceialmilk.com`
   - **Senha**: `admin123`
3. Acesse `/dev-studio` na URL ou pelo menu

### 5. Testar

No chat do Dev Studio, digite:
```
Crie um endpoint GET /api/v1/animais para listar todos os animais
```

A IA deve gerar o código seguindo os padrões do CeialMilk!

### 6. Criar Pull Request (Opcional - Fase 1)

Se você configurou `GITHUB_TOKEN` e `GITHUB_REPO`:

1. **Gerar código** via chat
2. **Validar código** clicando em "Validar Código"
3. **Criar PR** clicando em "Criar PR" (aparece após validação bem-sucedida)
4. O sistema criará automaticamente:
   - Uma branch `dev-studio/request-{id}-{timestamp}`
   - Arquivos no GitHub
   - Um Pull Request apontando para `main`
5. **Ver PR no GitHub** através do link exibido

**Contexto do repositório**: Com GitHub configurado, a IA usa sempre o estado da **branch de produção** (`GITHUB_CONTEXT_BRANCH`, default `main`) para exemplos de código e arquivos-alvo (ex.: menu, Header). O resultado aprovado segue para essa branch (PR → merge).

## 🔍 Verificação Rápida

Execute o script de verificação:
```bash
./scripts/verify-dev-studio.sh
```

## 📝 Notas Importantes

1. **Migrações**: São executadas automaticamente ao iniciar o backend
2. **Perfil DEVELOPER**: A migração `6_update_admin_to_developer.up.sql` atualiza automaticamente o admin para DEVELOPER
3. **Rate Limiting**: 5 requests/hora por usuário (MVP)
4. **Memory Bank**: O sistema carrega automaticamente os arquivos de `memory-bank/` para contexto
5. **Pull Requests Automáticos (Fase 1)**: Após validar código, você pode criar um PR automaticamente no GitHub. Configure `GITHUB_TOKEN` e `GITHUB_REPO` para habilitar.
6. **Contexto do repositório**: Com GitHub configurado, exemplos e arquivos-alvo vêm da branch de produção (`GITHUB_CONTEXT_BRANCH`). Use **Refinar código** se o resultado divergir da estrutura do projeto.

## 🐛 Problemas Comuns

### Backend não inicia
- Verifique se o banco está rodando: `docker ps`
- Verifique `DATABASE_URL` no devcontainer

### "Acesso negado. Perfil DEVELOPER necessário"
- Execute manualmente:
  ```sql
  UPDATE usuarios SET perfil = 'DEVELOPER' WHERE email = 'admin@ceialmilk.com';
  ```

### Erro ao gerar código
- Verifique se `GEMINI_API_KEY` está correta
- Verifique os logs do backend para detalhes
- Limite do free tier: 1.500 requests/dia

### Erro ao criar PR
- Verifique se `GITHUB_TOKEN` está configurado
- Verifique se `GITHUB_REPO` está no formato `owner/repo` (ex: `usuario/ceialmilk`)
- Verifique se o token tem permissão `repo`
- Opcional: `GITHUB_CONTEXT_BRANCH` (default `main`) — branch usada para contexto da IA e base do PR
- Verifique os logs do backend para detalhes

## 🎉 Pronto!

O Dev Studio está configurado e pronto para uso!

---

**Última atualização**: 2026-01-26 (contexto do repositório e GITHUB_CONTEXT_BRANCH)
