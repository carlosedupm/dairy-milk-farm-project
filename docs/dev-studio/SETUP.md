# 🚀 Guia de Configuração do Dev Studio

## Pré-requisitos

1. ✅ Backend Go compilando sem erros
2. ✅ Frontend Next.js funcionando
3. ✅ Banco de dados PostgreSQL rodando
4. ✅ Chave da API Gemini configurada

## Passo 1: Configurar Variáveis de Ambiente

### Gemini API (Obrigatório)

A variável `GEMINI_API_KEY` deve ser configurada no seu ambiente. O devcontainer usa a variável do seu sistema local.

**Para configurar:**

1. **No DevContainer**: Configure a variável `GEMINI_API_KEY` no seu ambiente local antes de abrir o container, ou use o arquivo `.env` na raiz do projeto.

2. **Manualmente**:
```bash
export GEMINI_API_KEY="sua-chave-gemini-aqui"
```

**Obtenha sua chave em**: https://ai.google.dev/

### GitHub API (Opcional - Para PRs Automáticos - Fase 1)

Para habilitar a criação automática de Pull Requests, configure:

1. **GITHUB_TOKEN**: Personal Access Token do GitHub com permissão `repo`
   - Crie em: https://github.com/settings/tokens
   - Permissões necessárias: `repo` (acesso completo ao repositório)

2. **GITHUB_REPO**: Repositório no formato `owner/repo`
   - Exemplo: `usuario/ceialmilk`

3. **GITHUB_CONTEXT_BRANCH** (opcional): Branch de produção usada como referência para o contexto da IA. Padrão: `main`.
   - Quando `GITHUB_TOKEN` e `GITHUB_REPO` estão configurados, **exemplos de código** e **arquivos-alvo** (menu, Header, etc.) são sempre buscados dessa branch no GitHub, pois o resultado aprovado pelo usuário irá para lá (PR → merge).

**Configurar:**
```bash
export GITHUB_TOKEN="ghp_seu-token-aqui"
export GITHUB_REPO="usuario/ceialmilk"
export GITHUB_CONTEXT_BRANCH="main"   # opcional; default main
```

**Nota**: Se não configurar GitHub, o Dev Studio funcionará normalmente (contexto via disco local), mas a funcionalidade de criar PRs estará desabilitada.

## Passo 2: Executar Migrações

As migrações serão executadas automaticamente quando o backend iniciar. Elas incluem:

- ✅ Tabela `dev_studio_requests`
- ✅ Tabela `dev_studio_audit`
- ✅ Atualização do perfil do admin para `DEVELOPER`

**Nota**: A migração `6_update_admin_to_developer.up.sql` atualiza automaticamente o perfil do usuário `admin@ceialmilk.com` para `DEVELOPER`.

## Passo 3: Iniciar o Backend

```bash
cd backend
go run ./cmd/api
```

Você deve ver a mensagem:
```
Rotas do Dev Studio registradas
```

Se não aparecer, verifique se `GEMINI_API_KEY` está configurada.

## Passo 4: Iniciar o Frontend

```bash
cd frontend
npm run dev
```

## Passo 5: Acessar o Dev Studio

1. Acesse `http://localhost:3000`
2. Faça login com:
   - **Email**: `admin@ceialmilk.com`
   - **Senha**: `admin123` (ou a senha configurada)
3. Acesse `/dev-studio` ou clique no menu (se disponível)

## Verificação Rápida

Execute o script de verificação:

```bash
./scripts/verify-dev-studio.sh
```

## Troubleshooting

### ❌ "GEMINI_API_KEY não configurada: Dev Studio desabilitado"

**Solução**: Configure a variável de ambiente:
```bash
export GEMINI_API_KEY="sua-chave-aqui"
```

### ❌ "Acesso negado. Perfil DEVELOPER necessário."

**Solução**: Atualize o perfil do usuário:
```sql
UPDATE usuarios SET perfil = 'DEVELOPER' WHERE email = 'admin@ceialmilk.com';
```

Ou execute a migração:
```bash
cd backend
go run ./cmd/api  # As migrações são executadas automaticamente
```

### ❌ Tabelas não existem

**Solução**: As migrações são executadas automaticamente ao iniciar o backend. Se não funcionar:

1. Verifique se `DATABASE_URL` está configurada
2. Verifique se o banco está acessível
3. Verifique os logs do backend para erros de migração

### ❌ Erro ao gerar código

**Possíveis causas**:
- Chave da API Gemini inválida ou expirada
- Limite de requests do free tier atingido (1.500/dia)
- Problema de conectividade com a API Gemini

**Solução**: Verifique os logs do backend para mais detalhes.

### ❌ Erro ao criar PR

**Possíveis causas**:
- `GITHUB_TOKEN` não configurado ou inválido
- `GITHUB_REPO` não configurado ou formato inválido (deve ser `owner/repo`)
- Token sem permissão `repo`
- Repositório não existe ou não tem acesso

**Solução**: 
1. Verifique se `GITHUB_TOKEN` e `GITHUB_REPO` estão configurados
2. Verifique se o token tem permissão `repo`
3. Verifique se o formato do repositório está correto (`owner/repo`)
4. Verifique os logs do backend para mais detalhes

## Teste Rápido

1. Acesse `/dev-studio`
2. Digite no chat: "Crie um endpoint para listar animais"
3. Aguarde a resposta da IA
4. Revise o código gerado no preview
5. **Se o código estiver divergente da estrutura do projeto**: use **Refinar código**. No campo de feedback, descreva o que ajustar (ex.: "Use `response.SuccessOK` como em fazenda_handler", "Siga o padrão Handler → Service → Repository"). Clique em **Refinar**; a IA regenera o código alinhado ao projeto.
6. Clique em "Validar Código"
7. **(Opcional)** Se configurou GitHub, clique em "Criar PR" para criar um Pull Request automaticamente

## API de Uso e Rate Limit (Fase 2)

### `GET /api/v1/dev-studio/usage`

Retorna métricas de uso do Dev Studio para o usuário autenticado (perfil DEVELOPER):

- **Auth**: Mesmo grupo `/api/v1/dev-studio` (JWT + RequireDeveloper).
- **Rate limit**: **Não consome** o limite de 5 requisições/hora. Consultar uso não gasta cota.

**Resposta** (exemplo):

```json
{
  "data": {
    "used_last_hour": 3,
    "limit_per_hour": 5,
    "used_today": 7
  },
  "message": "Uso recuperado com sucesso",
  "timestamp": "2026-01-26T12:00:00Z"
}
```

O frontend exibe essas métricas no componente **UsageAlert** (acima do chat) e desabilita o envio quando `used_last_hour >= limit_per_hour`.

### Contexto enviado à IA (chat e refine)

Antes de gerar ou refinar código, a IA recebe:

1. **Memory-bank** (RAG dinâmico): `systemPatterns`, `techContext` (sempre) + até 2 de `activeContext`, `progress`, `productContext`, `projectbrief` conforme o prompt. O memory-bank foi atualizado com a **estrutura atual do projeto** (pastas, rotas, padrões Handler/Service/Repository).
2. **Exemplos de código**: Trechos (até ~150 linhas por arquivo) de `fazenda_handler`, `fazenda_service`, `fazenda_repository`, `models/fazenda`, `response/response.go`. **Quando GitHub está configurado**, são sempre obtidos da **branch de produção** (`GITHUB_CONTEXT_BRANCH`, ex.: `main`) no repositório, pois o resultado aprovado irá para lá; caso contrário, do disco local.
3. **Estado atual dos arquivos a editar** (quando aplicável): O backend infere pelo prompt (ex.: "menu", "Header", "rota", "link", "dev-studio") quais arquivos a tarefa pode alterar e inclui o **código atual** deles (ex.: `Header.tsx`, `layout.tsx`). **Quando GitHub está configurado**, esse conteúdo vem da branch de produção no repositório; caso contrário, do disco local. A IA é instruída a **usar como base** e **preservar** o que não foi pedido para alterar, em linha com um fluxo tipo Cursor/IDE.

### Refinar código (`POST /api/v1/dev-studio/refine`)

Quando o código gerado estiver **divergente da estrutura do projeto**, você pode enviar feedback para a IA corrigir:

- **Body**: `{ "request_id": number, "feedback": string }`
- **Rate limit**: **Consome** o limite (mesmo que chat). Use com moderação.
- O request é **atualizado** com o novo código; status volta para `pending` e, se havia PR, os dados do PR são limpos (refine substitui o código).

No frontend, use a seção **Refinar código** no preview: descreva o que ajustar e clique em **Refinar**.

## Próximos Passos

- ✅ **Fase 0 (MVP)**: Concluída - Geração de código, validação sintática, histórico
- ✅ **Fase 1**: Concluída - Automação de PRs via GitHub
- ✅ **Fase 2**: Concluída - RAG dinâmico e monitoramento (GET /usage, alertas, 429)
- 🚧 **Fase 3**: Sandbox e segurança avançada (opcional)

---

**Última atualização**: 2026-01-26 (contexto tipo Cursor, contexto do repositório, GITHUB_CONTEXT_BRANCH)
