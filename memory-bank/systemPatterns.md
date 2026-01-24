# 🏗️ System Patterns - CeialMilk

## 🏛️ Arquitetura do Sistema

### **Padrão Arquitetural**
- **Arquitetura**: Monorepo com separação clara backend/frontend
- **Estilo**: API-centric RESTful com backend-for-frontend
- **Comunicação**: RESTful APIs com JSON
- **Estado**: Stateless com token JWT para sessão

### **Camadas da Aplicação (Backend Go)**
```
┌─────────────────────────────────────────────────┐
│                  Handlers                        │  ← HTTP Endpoints (Gin)
├─────────────────────────────────────────────────┤
│                   Services                       │  ← Lógica de Negócio
├─────────────────────────────────────────────────┤
│                 Repositories                     │  ← Acesso a Dados (pgx/pgxpool)
├─────────────────────────────────────────────────┤
│                   Models                         │  ← Structs de Domínio
├─────────────────────────────────────────────────┤
│                 Database                         │  ← PostgreSQL (pgx)
└─────────────────────────────────────────────────┘
```

### **Camadas da Aplicação (Frontend Next.js)**
```
┌─────────────────────────────────────────────────┐
│                  Pages/App                       │  ← Rotas e Layouts
├─────────────────────────────────────────────────┤
│                 Components                        │  ← UI Components (Shadcn)
├─────────────────────────────────────────────────┤
│                   Services                        │  ← API Client (Axios)
├─────────────────────────────────────────────────┤
│              TanStack Query                       │  ← State Management
└─────────────────────────────────────────────────┘
```

## 🔄 Padrões de Design Implementados

### **Padrões Estruturais**
- **MVC**: Separação clara entre Handlers (Controllers), Services e Repositories
- **Dependency Injection**: Injeção manual ou via container simples
- **Repository Pattern**: Abstração da camada de acesso a dados

### **Padrões Comportamentais**
- **Middleware Pattern**: Middleware chain no Gin para autenticação, logging, CORS
- **Strategy Pattern**: Para diferentes algoritmos de validação e processamento
- **Observer Pattern**: Para sistema de notificações e eventos (futuro)

### **Padrões Criacionais**
- **Builder Pattern**: Para construção complexa de objetos de domínio
- **Factory Method**: Para criação de serviços específicos
- **Singleton**: Para conexão de banco de dados (pool de conexões)

## 🗃️ Padrões de Dados

### **Modelagem de Domínio**
```go
// Estrutura principal de entidades
Fazenda (1) ─── (N) Animal (1) ─── (N) ProduçãoLeite
Usuario (N) ─── (1) Fazenda
```

### **Padrões de Acesso a Dados**
- **pgx/v5**: Driver PostgreSQL nativo com type safety e performance otimizada
- **Prepared Statements**: Todas as queries parametrizadas (proteção SQL Injection)
- **Connection Pooling**: Gerenciado pelo `pgxpool.Pool`
- **Transactions**: Suporte nativo para transações

### **Padrões de Migração de Banco de Dados**
- **golang-migrate**: Migrações versionadas em `/backend/migrations`
- **Execução Automática**: Migrações executadas no startup do servidor
- **Versionamento**: Migrações versionadas em formato `{número}_{descrição}.up.sql` e `.down.sql`

## 🌐 Padrões de API

### **RESTful Design**
- **Resources**: Entidades como recursos (`/api/v1/fazendas`, `/api/v1/animais`)
- **HTTP Verbs**: GET, POST, PUT, DELETE, PATCH
- **Status Codes**: Uso apropriado de códigos HTTP (200, 201, 400, 401, 404, 500)
- **JSON**: Formato padrão de request/response

### **Versioning**
- **URL Path**: `/api/v1/{recurso}`
- **Backward Compatibility**: Mantida por pelo menos 1 versão

### **Response Format**
```json
{
  "data": { ... },
  "message": "Success",
  "timestamp": "2026-01-24T10:00:00Z"
}
```

### **Error Response Format**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { ... }
  },
  "timestamp": "2026-01-24T10:00:00Z"
}
```

## 🔐 Padrões de Segurança

### **Autenticação**
- **JWT RS256**: Tokens assinados com chave privada, verificados com chave pública
- **Access Tokens**: Vida curta (15 minutos), armazenados em cookies HttpOnly
- **Refresh Tokens**: Armazenados no banco de dados, vida longa (7 dias), em cookies HttpOnly
- **Password Hashing**: BCrypt com custo 10
- **Token Refresh**: Endpoint `/api/auth/refresh` para renovar access tokens usando refresh tokens

### **Autorização**
- **Role-Based**: Controle de acesso baseado em roles (USER, ADMIN)
- **Resource Ownership**: Verificação de propriedade de recursos
- **Middleware de Autenticação**: Verificação de token em todas as rotas protegidas

### **Proteção**
- **CORS**: Configurado estritamente para domínio da Vercel
- **Rate Limiting**: Limitação de requisições por IP (futuro)
- **Input Validation**: Validação em todas as entradas (struct tags)
- **SQL Injection**: Prevenido com prepared statements
- **XSS**: Prevenido com sanitização no frontend

### **Armazenamento de Tokens**
- **HttpOnly Cookies**: Tokens armazenados em cookies HttpOnly (não acessíveis via JavaScript)
  - `ceialmilk_token`: Access token (15 minutos)
  - `ceialmilk_refresh_token`: Refresh token (7 dias)
- **Secure Flag**: Cookies enviados apenas via HTTPS em produção (detectado automaticamente)
- **SameSite**: Proteção CSRF com SameSite=Strict
- **Frontend**: Usa `withCredentials: true` no Axios para enviar cookies automaticamente

## ⚡ Padrões de Performance

### **Backend (Go)**
- **Goroutines**: Concorrência nativa para operações paralelas
- **Connection Pooling**: Pool de conexões gerenciado pelo pgx
- **Caching**: Cache em memória para dados frequentes (futuro: Redis)

### **Frontend (Next.js)**
- **Server-Side Rendering (SSR)**: Renderização no servidor quando necessário
- **Static Site Generation (SSG)**: Páginas estáticas pré-renderizadas
- **Image Optimization**: Otimização automática de imagens pela Vercel
- **Code Splitting**: Divisão automática de código por rotas

### **Database Optimization**
- **Indexing**: Índices apropriados para queries frequentes
- **Query Optimization**: Consultas otimizadas com EXPLAIN
- **Connection Pooling**: Pool gerenciado pelo driver

## 🧪 Padrões de Teste

### **Test Pyramid**
- **Unit Tests**: 70% - Testes de unidades isoladas
- **Integration Tests**: 20% - Testes de integração
- **E2E Tests**: 10% - Testes end-to-end

### **Testing Patterns**
- **Table-Driven Tests**: Padrão Go para testes com múltiplos casos
- **Mocking**: Mock de dependências externas
- **Test Containers**: Containers para testes de integração (futuro)

## 🔧 Padrões de Configuração

### **Configuration Management**
- **Environment Variables**: Configuração por variáveis de ambiente
- **Config Struct**: Struct centralizada para configuração
- **Secrets Management**: Gerenciamento de segredos via variáveis de ambiente

### **Logging Patterns**
- **Structured Logging**: JSON format para logs (slog)
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Correlation IDs**: IDs únicos para cada request (UUID), incluídos em todos os logs
- **Request Logging**: Middleware de logging estruturado com método, path, status, latency, IP, user agent
- **Centralized Logging**: Logs estruturados em JSON prontos para agregação (BetterStack/Logtail via stdout)

## 🚀 Padrões de Deploy

### **Deployment Patterns**
- **Containerization**: Docker com multi-stage build
- **Orquestração**: Render para backend, Vercel para frontend
- **Environment Driven**: Configuração total via variáveis de ambiente
- **Health Checks**: Endpoints `/health` para verificação de saúde

### **CI/CD Patterns**
- **GitHub Actions**: Pipeline de CI/CD
- **Automated Testing**: Testes automáticos no pipeline
- **Docker Builds**: Builds automatizados de containers
- **Infrastructure as Code**: Terraform-ready

## 📊 Padrões de Monitoramento

### **Observability**
- **Metrics**: Prometheus para métricas de performance (futuro)
- **Tracing**: Distributed tracing com correlation IDs (implementado)
  - Correlation ID gerado automaticamente para cada request
  - Incluído em todos os logs e respostas HTTP (header `X-Correlation-ID`)
- **Logging**: Log aggregation via BetterStack/Logtail
  - Logs estruturados em JSON com correlation IDs
  - Middleware de logging automático para todas as requisições
  - Logs incluem: método, path, status, latency, IP, user agent, correlation ID
- **Health Checks**: Endpoints `/health` para verificação de saúde

### **Alerting Patterns**
- **Error Tracking**: Sentry para captura de erros em tempo real (implementado)
  - Captura automática de panics
  - Captura manual de erros nos handlers com contexto
  - Inclui correlation ID, path, método, user context
- **Threshold-based**: Alertas baseados em thresholds (futuro)
- **Notification Channels**: Email, Slack (futuro)

---

**Última atualização**: 2026-01-24
**Versão dos Padrões**: 2.0 (Go + Next.js)
