# 🚀 Active Context - CeialMilk

## 📋 Estado Atual do Projeto

### **Status Geral**
O projeto está em **migração arquitetural** da stack Java/Spring para uma solução moderna e eficiente com **Go** no backend e **Next.js** no frontend. Esta mudança visa resolver problemas de consumo de recursos, complexidade de deploy e melhorar a experiência de desenvolvimento.

### ✅ O que está funcionando:
- **Backend Go**: API com Gin, health, auth (login/logout/refresh/validate) e CRUD + search de fazendas
- **Autenticação**: JWT RS256, middleware, bcrypt; refresh tokens no banco; cookies HttpOnly (SameSite=Strict em dev, SameSite=None em produção cross-origin Vercel+Render)
- **Formato de Resposta**: Padronizado com `data`, `message`, `timestamp` em todas as respostas
- **Formato de Erro**: Padronizado com `error.code`, `error.message`, `error.details`, `timestamp`
- **Observabilidade**: 
  - Correlation IDs automáticos para cada request (UUID)
  - Logging estruturado JSON com correlation IDs, método, path, status, latency
  - Sentry integrado para captura de erros e panics
  - Middleware de logging automático para todas as requisições
- **Migrações**: golang-migrate no startup; seed do usuário admin (V3); refresh tokens (V4); Dev Studio (V5, V6)
- **Postman**: Rotas compatíveis com a collection (`/api/auth/*`, `/api/v1/fazendas/*`)
- **Frontend + Backend**: Integração validada — login, listagem, criar/editar/excluir fazendas (dev e **produção** Vercel + Render)
- **Devcontainer**: `DATABASE_URL` e `PORT` pré-configurados; backend via `go run ./cmd/api`
- **Resiliência**: Se o Postgres falhar (ex.: pg_hba), o backend sobe e expõe apenas `GET /health`; auth/fazendas ficam inativos até o DB estar ok
- **Postgres no compose**: `scripts/db/init-pg-hba.sh` + `ssl=off` para aceitar conexões do devcontainer (após recriar o volume)
- **Dev Studio (Fase 0 + Fase 1)**: Área de desenvolvimento interativa com IA integrada — geração de código via Gemini API, validação sintática, preview, histórico e criação automática de Pull Requests via GitHub API

### 🚧 Em andamento:
- **Testes**: Backend e frontend

### ✅ Concluído desde a última atualização:
1. ✅ **Frontend**: Login, rotas protegidas, CRUD de fazendas (listagem, nova, editar, excluir)
2. ✅ **Shadcn/UI**: init + button, input, card, label, table, dialog
3. ✅ **API**: interceptors Bearer + 401 → /login; serviços auth e fazendas
4. ✅ **TanStack Query + AuthContext**: Providers, ProtectedRoute, Header
5. ✅ **Backend Render**: `render.yaml` e `Dockerfile` ajustados (JWT `sync: false`, PORT injetado, `buildFilter`, `autoDeployTrigger`); CI com build Docker
6. ✅ **Deploy Produção**: Backend configurado e funcionando no Render (banco PostgreSQL + variáveis de ambiente + chaves JWT)
7. ✅ **Atualização Next.js**: Migrado de Next.js 14.1.0 para 16.1.4 com React 19.2.3 e todas as dependências atualizadas
8. ✅ **Deploy Vercel (preparação)**: Build de produção validado; `deploy-notes.md` com checklist e passos para deploy manual via Dashboard
9. ✅ **401 pós-login em produção**: Cookies com SameSite=None quando `CORS_ORIGIN` ≠ localhost; `AuthHandler` recebe `cookieSameSite`; `deploy-notes` com troubleshooting
10. ✅ **Deploy frontend Vercel**: Deploy manual concluído; login, validate e CRUD validados em produção
11. ✅ **Dev Studio MVP (Fase 0)**: Implementação completa do Dev Studio — backend (Go) com integração Gemini API, frontend (Next.js) com chat e preview, validação sintática, rate limiting, auditoria completa. Funcional e testado em produção.
12. ✅ **Dev Studio Fase 1**: Automação de PRs via GitHub API — criação automática de branches, commits e Pull Requests. Integração completa com GitHub API REST, componente PRStatus no frontend, fluxo completo de validação → PR.

### 📋 Próximos passos imediatos:
1. **Dev Studio - Fase 2**: RAG dinâmico e monitoramento
2. Testes automatizados (E2E ou unitários)

## 🛠️ Decisões Técnicas Ativas

### **Arquitetura e Stack**
- ✅ **Decidido**: Backend em **Go** usando framework **Gin**
- ✅ **Decidido**: Frontend em **Next.js 16.1.4** com App Router e Turbopack
- ✅ **Decidido**: **React 19.2.3** para melhor performance e novas features
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

### **Completude Geral**: 75%
- **Infraestrutura**: 95% ✅ (backend + frontend em produção + Dev Studio)
- **Documentação**: 95% ✅ (incluindo Dev Studio)
- **Implementação**: 75% 🚧 (Dev Studio MVP concluído)
- **Testes**: 0% 🚧
- **Deploy**: 90% ✅ (backend Render + frontend Vercel; login e CRUD validados no ar)

---

**Última atualização**: 2026-01-26
**Contexto Ativo**: Go + Next.js 16 | Backend (Render) + Frontend (Vercel) em produção | Login e CRUD validados no ar | Dev Studio Fase 0 + Fase 1 implementado e funcionando
