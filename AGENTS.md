# 🤖 AGENTS.md - CeialMilk

Este arquivo orienta o Cursor AI sobre o projeto CeialMilk e como usar a documentação existente para tomar decisões informadas.

## 📚 Documentação do Projeto

### Memory Bank (`memory-bank/`)

O projeto mantém documentação estruturada no diretório `memory-bank/`. **SEMPRE consulte estes arquivos antes de tomar decisões técnicas ou fazer mudanças significativas:**

- **`activeContext.md`**: Estado atual do projeto, o que está funcionando, em andamento e próximos passos
- **`projectbrief.md`**: Objetivos principais, público-alvo, métricas de sucesso e fases de desenvolvimento
- **`techContext.md`**: Stack tecnológica, configurações e decisões técnicas
- **`systemPatterns.md`**: Padrões arquiteturais, design patterns, padrões de API, segurança e performance
- **`productContext.md`**: Contexto de mercado, jornada do usuário, métricas de valor
- **`progress.md`**: Status geral, completude, histórico de progresso e próximos marcos
- **`deploy-notes.md`**: Notas sobre deploy, configurações de produção e variáveis de ambiente

### Documentação Técnica (`docs/`)

- **`docs/postman/`**: Coleção Postman com exemplos da API JWT e variáveis de ambiente
- **`docs/integracoes/README.md`**: Guia operacional da **API M2M** (chaves, scopes, testes, erros comuns)
- **`docs/openapi/integracoes-v1.openapi.yaml`**: Cópia da spec OpenAPI 3.0 (fonte embed: `backend/internal/openapi/`)

### Catálogo de negócio (`docs/business/`)

Catálogo **versionado** de regras de domínio (IDs estáveis, escopo, perfis, bloqueio vs informativo, ponteiros ao código). **`memory-bank/productContext.md`** mantém visão de produto e jornada; o **detalhe operacional** das regras fica em `docs/business/*.md`.

**Obrigatório:** qualquer **mudança de comportamento de produto** (nova regra, alteração de política de domínio ou UX que reflita decisão de negócio) deve incluir **no mesmo trabalho** a atualização do arquivo correspondente em `docs/business/` (novo módulo = novo `.md` + entrada no `docs/business/README.md`). Impacto **transversal no ciclo da vaca** → atualizar também **`docs/business/ciclo-rebanho.md`**. Para contexto no chat do Cursor, use `@docs/business/...` quando implementar aquele domínio.

## 🎯 Visão Geral do Projeto

CeialMilk é um sistema de gestão para **fazendas leiteiras** centrado no **ciclo de vida de cada animal no rebanho** (reprodução, lactação, produção, restrições de leite, equipe), com stack Go + Next.js e requisitos versionados em `docs/business/` (IDs `BR-*`).

**Consulte `memory-bank/projectbrief.md`** (objetivos e fases) e **`docs/business/ciclo-rebanho.md`** (fluxo transversal e backlog de requisitos).

## 🔌 API de integrações M2M (externa)

Sistemas externos (ERP, laboratório, agentes de IA pós-visita veterinária) consomem uma **API dedicada**, separada do JWT de utilizadores da UI.

| Tópico | Detalhe |
|--------|---------|
| **Autenticação** | `Authorization: Bearer cmk_live_...` — **não** usar cookies/JWT da UI |
| **Gestão** | UI admin `/admin/integracoes` (perfis ADMIN/DEVELOPER); API `/api/v1/admin/integracoes` |
| **Rotas M2M** | Prefixo `/api/v1/integracoes/*` — `me`, busca/detalhe animal, coberturas, toque unitário, lote de toques |
| **Scopes v1** | `animais:read`, `toques:write`, `coberturas:read` + fazendas vinculadas ao cliente |
| **Idempotência** | Header `Idempotency-Key` em escritas (especialmente lote de toques) |
| **Docs públicas** | `GET /api/v1/integracoes/openapi.yaml`, `GET /api/v1/integracoes/docs` (Swagger UI — **sem** API key) |
| **Regras de negócio** | `docs/business/integracoes.md` (`BR-INTEG-001`–`006`) |
| **Padrões de código** | `memory-bank/systemPatterns.md` — secção **Integrações M2M** |

**Ao implementar ou alterar integrações:** consulte `docs/business/integracoes.md`, `docs/integracoes/README.md` e `systemPatterns.md`; atualize a spec OpenAPI embed **e** `docs/openapi/integracoes-v1.openapi.yaml` no mesmo trabalho. Testes manuais contra o **backend** (`localhost:8080` em dev, não porta 3000 do Next.js); parâmetros de filtro (`fazenda_id`, `identificacao`, `animal_id`) vão na **query string**.

**Fora de escopo atual:** OpenAPI da API JWT completa; admin de integrações no OpenAPI; upload de PDF; webhooks; OAuth2.

## 🏗️ Arquitetura e Stack

### Stack Tecnológica

#### Backend
- **Linguagem**: Go 1.21+
- **Framework**: Gin (HTTP router)
- **Database**: PostgreSQL 15
- **Acesso a Dados**: sqlx (SQL puro)
- **Autenticação**: JWT RS256 (golang-jwt/jwt/v5)
- **Logging**: slog (nativo Go)
- **Deploy**: Render (Docker)

#### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **Componentes**: Shadcn/UI
- **State Management**: TanStack Query
- **Deploy**: Vercel

**Consulte `memory-bank/techContext.md` para configurações detalhadas e `memory-bank/systemPatterns.md` para padrões arquiteturais.**

### Padrões Arquiteturais

O projeto segue uma arquitetura em camadas:

**Backend (Go)**:
```
Handlers → Services → Repositories → Database (PostgreSQL)
```

**Frontend (Next.js)**:
```
Pages/App → Components → Services → API (Backend)
```

**SEMPRE consulte `memory-bank/systemPatterns.md` antes de implementar novos componentes para garantir consistência com os padrões estabelecidos.**

## 📊 Estado Atual do Projeto

**SEMPRE verifique `memory-bank/activeContext.md` e `memory-bank/progress.md` antes de começar qualquer trabalho para entender:**
- O que já está implementado
- O que está em andamento
- Próximos passos planejados
- Problemas conhecidos
- Decisões técnicas ativas

### Status Atual (Resumo)

Produção **Render + Vercel**; **Fase 2** (ciclo integrado + auditoria UI) fechada em código; **API M2M de integrações** v1 entregue (2026-05-21). Métricas vivas (~97% implementação) em **`memory-bank/progress.md`** e **`memory-bank/activeContext.md`** — não confiar nos percentuais históricos deste ficheiro sem consultar o memory bank.

## 🔧 Padrões e Convenções

### Código Go

**Ao trabalhar com arquivos `.go`, siga os padrões em `memory-bank/systemPatterns.md`:**

1. **Estrutura de Pastas**: Seguir layout padrão Go (`/cmd`, `/internal`, `/pkg`)
2. **Handlers**: Usar Gin para rotas HTTP
3. **Services**: Lógica de negócio isolada
4. **Repositories**: Acesso a dados com sqlx
5. **Models**: Structs simples para entidades
6. **Error Handling**: Retornar erros explicitamente
7. **Logging**: Usar slog para logs estruturados JSON

### Código TypeScript/Next.js

**Ao trabalhar com arquivos `.tsx`/`.ts`, siga os padrões:**

1. **App Router**: Usar App Router do Next.js 14+
2. **Components**: Componentes funcionais com TypeScript
3. **API Calls**: Usar TanStack Query para gerenciamento de estado
4. **Styling**: Tailwind CSS para estilização
5. **Type Safety**: TypeScript strict mode habilitado
6. **Zoom e reflow**: Toda UI deve assumir zoom do navegador e/ou fonte do SO ampliados; evitar layouts que cortem informação essencial (especialmente no mobile). Detalhe e checklist em `memory-bank/systemPatterns.md` — secção **Padrões de UX e Acessibilidade** (zoom, reflow, modais, tabelas).

### API Design

**Ao trabalhar com Handlers e rotas, siga os padrões em `memory-bank/systemPatterns.md`:**

1. **Versionamento**: `/api/v1/{recurso}`
2. **HTTP Verbs**: GET, POST, PUT, DELETE, PATCH
3. **Status Codes**: Use códigos HTTP apropriados
4. **JSON**: Formato padrão de request/response
5. **Error Format**: Formato padronizado de erros
6. **Dois modos de auth**: (a) **JWT** — UI e maioria dos endpoints `/api/v1/*`; (b) **API key M2M** — apenas `/api/v1/integracoes/*` autenticadas; rotas de documentação OpenAPI/Swagger são **públicas**

## 📝 Manutenção de Documentação

**É CRÍTICO manter a documentação atualizada.** Sempre que fizer mudanças significativas:

### Quando Atualizar Cada Arquivo

1. **`activeContext.md`**: 
   - Ao mudar o estado do projeto
   - Ao completar ou iniciar novas funcionalidades
   - Ao identificar novos problemas ou riscos
   - Ao tomar novas decisões técnicas

2. **`progress.md`**:
   - Ao completar tarefas ou sprints
   - Ao atingir marcos importantes
   - Ao atualizar métricas de completude

3. **`techContext.md`**:
   - Ao adicionar novas dependências ou tecnologias
   - Ao mudar configurações importantes
   - Ao documentar novas decisões técnicas

4. **`systemPatterns.md`**:
   - Ao estabelecer novos padrões arquiteturais
   - Ao definir novos padrões de código
   - Ao mudar estratégias de API ou segurança

5. **`deploy-notes.md`**:
   - Ao modificar configurações de deploy
   - Ao adicionar novas variáveis de ambiente
   - Ao documentar processos de deploy

6. **`docs/business/`** (catálogo de negócio):
   - **Sempre** que alterar ou criar **comportamento de produto** / regra de domínio visível na API ou na UI
   - Ao introduzir um novo módulo com políticas próprias: novo arquivo sob `docs/business/` + índice em `docs/business/README.md`
   - Ao mudar invariantes garantidas por migração ou constraint: cite o identificador da migration ou da constraint na regra afetada

**Consulte a regra `.cursor/rules/documentation-maintenance.mdc` para instruções detalhadas.**

## 🚀 Fluxo de Trabalho Recomendado

1. **Antes de começar qualquer tarefa**:
   - Leia `memory-bank/activeContext.md` para entender o estado atual
   - Consulte `memory-bank/systemPatterns.md` para padrões relevantes
   - Verifique `memory-bank/progress.md` para contexto de progresso
   - Se a tarefa tocar **regras de domínio**: leia `docs/business/README.md` e o módulo relevante (ex.: `docs/business/folgas.md`)
   - Se a tarefa tocar **integrações externas**: leia `docs/business/integracoes.md`, `docs/integracoes/README.md` e a secção M2M em `systemPatterns.md`

2. **Durante o desenvolvimento**:
   - Siga os padrões estabelecidos em `systemPatterns.md`
   - Mantenha consistência com código existente
   - Use TypeScript strict mode no frontend
   - Use error handling explícito no backend Go

3. **Após completar mudanças significativas**:
   - Atualize `activeContext.md` se o estado mudou
   - Atualize `progress.md` se completou tarefas
   - Atualize `systemPatterns.md` se estabeleceu novos padrões
   - Atualize `techContext.md` se adicionou tecnologias
   - Atualize **`docs/business/`** se mudou **comportamento de produto** ou política de domínio (mesmo PR / mesmo ciclo de tarefa)

## 📖 Referências Rápidas

- **Catálogo de negócio**: `docs/business/README.md`
- **Integrações M2M**: `docs/business/integracoes.md` · `docs/integracoes/README.md` · Swagger `GET /api/v1/integracoes/docs`
- **Estado Atual**: `memory-bank/activeContext.md`
- **Padrões Arquiteturais**: `memory-bank/systemPatterns.md`
- **Stack Tecnológica**: `memory-bank/techContext.md`
- **Progresso**: `memory-bank/progress.md`
- **Objetivos do Projeto**: `memory-bank/projectbrief.md`
- **Contexto de Produto**: `memory-bank/productContext.md`
- **Deploy**: `memory-bank/deploy-notes.md`

## ⚠️ Importante

- **NUNCA** faça mudanças que contradigam padrões estabelecidos sem primeiro atualizar a documentação
- **SEMPRE** consulte a documentação antes de tomar decisões técnicas
- **SEMPRE** atualize a documentação quando fizer mudanças significativas
- **SEMPRE** atualize **`docs/business/`** quando a mudança for de **comportamento de produto** ou **regra de negócio** (definição de “pronto” inclui o catálogo alinhado ao código)
- **MANTENHA** consistência com os padrões arquiteturais documentados
- **USE** TypeScript strict mode no frontend
- **USE** error handling explícito no backend Go

---

**Última atualização**: 2026-05-21
**Versão**: 2.3 (API M2M integrações + OpenAPI/Swagger; referências `docs/integracoes` e `docs/openapi`)
