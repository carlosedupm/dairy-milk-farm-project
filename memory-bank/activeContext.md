# 🚀 Active Context - CeialMilk

## 📋 Estado Atual do Projeto

### **Status Geral**
O projeto está em **migração arquitetural** da stack Java/Spring para uma solução moderna e eficiente com **Go** no backend e **Next.js** no frontend. Esta mudança visa resolver problemas de consumo de recursos, complexidade de deploy e melhorar a experiência de desenvolvimento.

### ✅ O que está funcionando:
- **Backend Go**: API com Gin, health, auth (login/logout/refresh/validate) e CRUD + search de fazendas
- **Autenticação**: JWT RS256, middleware, bcrypt; refresh tokens no banco; cookies HttpOnly com SameSite Strict
- **Formato de Resposta**: Padronizado com `data`, `message`, `timestamp` em todas as respostas
- **Formato de Erro**: Padronizado com `error.code`, `error.message`, `error.details`, `timestamp`
- **Observabilidade**: 
  - Correlation IDs automáticos para cada request (UUID)
  - Logging estruturado JSON com correlation IDs, método, path, status, latency
  - Sentry integrado para captura de erros e panics
  - Middleware de logging automático para todas as requisições
- **Migrações**: golang-migrate no startup; seed do usuário admin (V3); refresh tokens (V4)
- **Postman**: Rotas compatíveis com a collection (`/api/auth/*`, `/api/v1/fazendas/*`)
- **Frontend + Backend**: Integração validada — login, listagem, criar/editar/excluir fazendas funcionando
- **Devcontainer**: `DATABASE_URL` e `PORT` pré-configurados; backend via `go run ./cmd/api`
- **Resiliência**: Se o Postgres falhar (ex.: pg_hba), o backend sobe e expõe apenas `GET /health`; auth/fazendas ficam inativos até o DB estar ok
- **Postgres no compose**: `scripts/db/init-pg-hba.sh` + `ssl=off` para aceitar conexões do devcontainer (após recriar o volume)

### 🚧 Em andamento:
- **Testes**: Backend e frontend

### ✅ Concluído desde a última atualização:
1. ✅ **Frontend**: Login, rotas protegidas, CRUD de fazendas (listagem, nova, editar, excluir)
2. ✅ **Shadcn/UI**: init + button, input, card, label, table, dialog
3. ✅ **API**: interceptors Bearer + 401 → /login; serviços auth e fazendas
4. ✅ **TanStack Query + AuthContext**: Providers, ProtectedRoute, Header
5. ✅ **Backend Render**: `render.yaml` e `Dockerfile` ajustados (JWT `sync: false`, PORT injetado, `buildFilter`, `autoDeployTrigger`); CI com build Docker
6. ✅ **Deploy Produção**: Backend configurado e funcionando no Render (banco PostgreSQL + variáveis de ambiente + chaves JWT)

### 📋 Próximos passos imediatos:
1. Deploy frontend (Vercel) e configurar `NEXT_PUBLIC_API_URL` apontando para o backend no Render
2. Testes automatizados (E2E ou unitários)

## 🛠️ Decisões Técnicas Ativas

### **Arquitetura e Stack**
- ✅ **Decidido**: Backend em **Go** usando framework **Gin**
- ✅ **Decidido**: Frontend em **Next.js 14+** com App Router
- ✅ **Decidido**: Banco de dados **PostgreSQL** mantido (schema existente)
- ✅ **Decidido**: Estrutura **Monorepo** com `/backend` e `/frontend`

### **Segurança**
- ✅ **Decidido**: JWT com algoritmo **RS256** (chaves pública/privada)
- ✅ **Decidido**: **Refresh Tokens** armazenados no banco de dados
- ✅ **Decidido**: Cookies **HttpOnly** e **Secure** para armazenamento de tokens
- ✅ **Decidido**: **Bcrypt** para hashing de senhas
- ✅ **Decidido**: **CORS estrito** configurado para domínio da Vercel

### **Observabilidade**
- ✅ **Decidido**: **Sentry** para captura de erros em tempo real
- ✅ **Decidido**: **BetterStack** (Logtail) para agregação de logs estruturados
- ✅ **Decidido**: **Prometheus** para métricas de performance
- ✅ **Decidido**: **slog** (Go) e **Pino** (Next.js) para logging estruturado

### **Infraestrutura**
- ✅ **Decidido**: Deploy no **Render** para backend Go
- ✅ **Decidido**: Deploy na **Vercel** para frontend Next.js
- ✅ **Decidido**: Banco de dados **PostgreSQL** (Render ou Neon.tech)

## 🐛 Problemas Conhecidos

### **Problemas Resolvidos**
- ✅ **Alto Consumo de Memória**: Resolvido migrando de Java (~300MB) para Go (~30MB)
- ✅ **Cold Start Lento**: Resolvido com Go (startup < 1s vs 15-30s do Java)
- ✅ **Complexidade de Deploy**: Resolvido com binário único de Go e deploy simplificado
- ✅ **Problemas de Conectividade**: Go com driver pgx mais robusto que R2DBC

## 📊 Métricas de Progresso

### **Completude Geral**: 65%
- **Infraestrutura**: 85% ✅ (backend em produção)
- **Documentação**: 90% ✅
- **Implementação**: 65% 🚧
- **Testes**: 0% 🚧
- **Deploy**: 70% ✅ (backend funcionando no Render; frontend pendente)

---

**Última atualização**: 2026-01-25
**Contexto Ativo**: Migração arquitetural em andamento - Go + Next.js | Backend em produção no Render
