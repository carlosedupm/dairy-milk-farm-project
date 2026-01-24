# 🐄 CeialMilk - Sistema de Gestão para Fazendas Leiteiras

Sistema completo de gestão para fazendas leiteiras com arquitetura moderna usando Go no backend e Next.js no frontend.

## 🏗️ Arquitetura

Este projeto utiliza uma arquitetura **monorepo** com separação clara entre backend e frontend:

```
/dairy-milk-farm-project
  ├── /backend          # API em Go (Gin)
  ├── /frontend         # App Next.js (React)
  └── /memory-bank     # Documentação do projeto
```

## 🚀 Stack Tecnológica

### Backend
- **Linguagem**: Go 1.21+
- **Framework**: Gin (HTTP router)
- **Banco de Dados**: PostgreSQL 15
- **Acesso a Dados**: pgx (driver PostgreSQL)
- **Autenticação**: JWT RS256
- **Logging**: slog (logs estruturados JSON)

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **Componentes**: Shadcn/UI
- **State Management**: TanStack Query

### Infraestrutura
- **Backend Deploy**: Render (Docker)
- **Frontend Deploy**: Vercel
- **Banco de Dados**: PostgreSQL (Render Managed ou Neon.tech)

## 📋 Pré-requisitos

- Go 1.21 ou superior
- Node.js 18+ e npm
- Docker e Docker Compose
- PostgreSQL 15 (ou usar Docker Compose)

## 🛠️ Desenvolvimento Local

### Backend

```bash
cd backend

# Instalar dependências
go mod download

# Rodar migrações (quando implementado)
# go run cmd/migrate/main.go

# Iniciar servidor
go run cmd/api/main.go
```

O servidor estará disponível em `http://localhost:8080`

### Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

O frontend estará disponível em `http://localhost:3000`

### Banco de Dados

```bash
# Iniciar PostgreSQL via Docker Compose
docker-compose up -d db

# O banco estará disponível em:
# Host: localhost
# Port: 5432
# User: ceialmilk
# Password: password
# Database: ceialmilk
```

## 📚 Documentação

Consulte a documentação completa no diretório `memory-bank/`:

- **`activeContext.md`**: Estado atual do projeto
- **`techContext.md`**: Stack tecnológica e configurações
- **`systemPatterns.md`**: Padrões arquiteturais
- **`deploy-notes.md`**: Notas sobre deploy
- **`AGENTS.md`**: Guia para desenvolvedores e AI assistants

## 🔐 Segurança

- JWT com algoritmo RS256 (chaves pública/privada)
- Cookies HttpOnly e Secure para armazenamento de tokens
- Bcrypt para hashing de senhas
- CORS configurado estritamente
- Prepared statements para prevenir SQL Injection

## 📊 Observabilidade

- **Sentry**: Captura de erros em tempo real
- **BetterStack**: Agregação de logs estruturados
- **Prometheus**: Métricas de performance (futuro)

## 🚀 Deploy

### Backend (Render)

O deploy é automático via `render.yaml`. O backend será deployado no Render usando Docker.

### Frontend (Vercel)

O deploy é automático via integração com GitHub. O frontend será deployado na Vercel.

## 📝 Licença

Este projeto é privado e proprietário.

---

**Última atualização**: 2026-01-24
