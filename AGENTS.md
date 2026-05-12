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

- **`docs/postman/`**: Coleção Postman com exemplos de uso da API, endpoints documentados e variáveis de ambiente (será atualizada para nova API Go)

### Catálogo de negócio (`docs/business/`)

Catálogo **versionado** de regras de domínio (IDs estáveis, escopo, perfis, bloqueio vs informativo, ponteiros ao código). **`memory-bank/productContext.md`** mantém visão de produto e jornada; o **detalhe operacional** das regras fica em `docs/business/*.md`.

**Obrigatório:** qualquer **mudança de comportamento de produto** (nova regra, alteração de política de domínio ou UX que reflita decisão de negócio) deve incluir **no mesmo trabalho** a atualização do arquivo correspondente em `docs/business/` (novo módulo = novo `.md` + entrada no índice em `docs/business/README.md`). Para contexto no chat do Cursor, use `@docs/business/...` quando implementar aquele domínio.

## 🎯 Visão Geral do Projeto

CeialMilk é um sistema de gestão completo para fazendas leiteiras que combina alta performance técnica com funcionalidades práticas para o agronegócio, utilizando arquitetura moderna com Go e Next.js.

**Consulte `memory-bank/projectbrief.md` para detalhes completos sobre objetivos, público-alvo e métricas de sucesso.**

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
- 🚧 Infraestrutura: 20% (Estrutura sendo criada)
- ✅ Documentação: 90% (Atualizada para nova stack)
- 🚧 Implementação: 5% (Início da migração)
- 🚧 Testes: 0%
- 🚧 Deploy: 10% (Configuração pendente)

**Consulte `memory-bank/progress.md` para métricas detalhadas e histórico.**

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

**Última atualização**: 2026-05-11
**Versão**: 2.1 (Go + Next.js — catálogo `docs/business/`; padrão de zoom/reflow na UX documentado em `systemPatterns.md`)
