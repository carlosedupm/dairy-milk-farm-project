# 🛠️ Tech Context - CeialMilk

## 📋 Stack Tecnológica

### **Linguagens & Frameworks**
```yaml
# Backend Principal
language: Java 17
framework: Spring Boot 3.3.0
web_framework: Spring WebFlux
data_framework: Spring Data R2DBC
security: Spring Security 6 + JWT

# Futuro Frontend
frontend_framework: React/Next.js ou Vue.js
mobile_framework: React Native (futuro)
styling: Tailwind CSS
```

### **Banco de Dados & Cache**
```yaml
database: PostgreSQL 15
driver: R2DBC PostgreSQL
orm: Spring Data R2DBC
cache: Redis 7
local_cache: Caffeine
```

### **Infraestrutura & Deploy**
```yaml
containerization: Docker
orchestration: Docker Compose (dev), Kubernetes (prod)
cloud_platform: Fly.io (planejado)
ci_cd: GitHub Actions
monitoring: Prometheus + Grafana
logging: ELK Stack (planejado)
```

## 📦 Dependências Principais

### **Spring Boot Starters**
```xml
<!-- Core Web -->
<dependency>spring-boot-starter-webflux</dependency>

<!-- Database -->
<dependency>spring-boot-starter-data-r2dbc</dependency>
<dependency>r2dbc-postgresql</dependency>

<!-- Security -->
<dependency>spring-boot-starter-security</dependency>

<!-- Validation -->
<dependency>spring-boot-starter-validation</dependency>

<!-- Test -->
<dependency>spring-boot-starter-test</dependency>
<dependency>reactor-test</dependency>
```

### **JWT & Auth**
```xml
<!-- JWT -->
<dependency>jjwt-api</dependency>
<dependency>jjwt-impl</dependency>
<dependency>jjwt-jackson</dependency>
```

### **Utilitários**
```xml
<!-- Lombok -->
<dependency>lombok</dependency>

<!-- Cache -->
<dependency>spring-boot-starter-cache</dependency>
<dependency>cache-api</dependency>
```

### **Ferramentas de Desenvolvimento**
```xml
<!-- Dev Tools -->
<dependency>spring-boot-devtools</dependency>

<!-- Actuator -->
<dependency>spring-boot-starter-actuator</dependency>
```

## 🏗️ Estrutura do Projeto

### **Layout do Código Fonte**
```
src/
├── main/
│   ├── java/
│   │   └── com/
│   │       └── ceialmilk/
│   │           ├── config/          # Configurações
│   │           ├── controller/      # Controladores REST
│   │           ├── service/         # Serviços de negócio
│   │           ├── repository/      # Repositórios de dados
│   │           ├── model/           # Entidades de domínio
│   │           ├── security/        # Configuração de segurança
│   │           ├── exception/       # Handlers de exceção
│   │           └── CeialMilkApplication.java
│   └── resources/
│       ├── application.yml          # Configuração principal
│       ├── application-dev.yml      # Config dev
│       ├── application-prod.yml     # Config prod
│       └── static/                  # Arquivos estáticos
└── test/
    └── java/
        └── com/
            └── ceialmilk/           # Testes
```

### **Configuração Principal**
```yaml
# application.yml
spring:
  application:
    name: ceialmilk
  r2dbc:
    url: r2dbc:postgresql://localhost:5432/ceialmilk
    username: ceialmilk
    password: ceialmilk
  data:
    redis:
      host: localhost
      port: 6379
  webflux:
    base-path: /api/v1
```

## ⚙️ Configuração de Ambiente

### **Perfis do Spring**
- **dev**: Desenvolvimento local com Docker Compose
- **test**: Ambiente de teste com H2 em memória
- **prod**: Produção com PostgreSQL managed e Redis cloud

### **Variáveis de Ambiente**
```bash
# Database
DATABASE_URL=r2dbc:postgresql://host:port/db
DB_USERNAME=username
DB_PASSWORD=password

# Redis
REDIS_URL=redis://host:port
REDIS_PASSWORD=password

# JWT
JWT_SECRET=secret-key
JWT_EXPIRATION=86400000

# App
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=dev
```

### **Docker Compose**
```yaml
services:
  ceialmilk-dev:
    build: .devcontainer/
    ports: ["8080:8080"]
    environment:
      - SPRING_PROFILES_ACTIVE=dev
      - DATABASE_URL=jdbc:postgresql://postgres:5432/ceialmilk

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ceialmilk
      POSTGRES_USER: ceialmilk
      POSTGRES_PASSWORD: ceialmilk

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

## 🔧 Ferramentas de Desenvolvimento

### **IDE & Extensões**
```yaml
ide: VS Code
extensions:
  - vscjava.vscode-java-pack
  - vmware.vscode-spring-boot
  - pivotal.vscode-spring-boot
  - ms-azuretools.vscode-docker
  - redhat.java
  - github.copilot
```

### **Dev Container**
```json
{
  "name": "CeialMilk Development",
  "dockerComposeFile": "../docker-compose.yml",
  "service": "ceialmilk-dev",
  "forwardPorts": [8080, 5432, 6379],
  "postCreateCommand": "mvn clean compile -DskipTests"
}
```

### **Ferramentas CLI**
```bash
# Build
mvn clean compile
mvn package

# Run
mvn spring-boot:run
./mvnw spring-boot:run

# Test
mvn test
mvn verify

# Docker
docker-compose up -d
docker-compose down
```

## 📊 Performance & Otimização

### **Configurações de Performance**
```yaml
server:
  tomcat:
    threads:
      max: 200
      min-spare: 20
  netty:
    connection-timeout: 5000ms

spring:
  reactor:
    debug-agent: false # Production
```

### **Configurações de Banco**
```yaml
spring:
  r2dbc:
    pool:
      initial-size: 5
      max-size: 20
      max-idle-time: 30m
```

### **Configurações de Cache**
```yaml
spring:
  cache:
    type: redis
    redis:
      time-to-live: 1h
      cache-null-values: false
```

## 🧪 Testing Setup

### **Test Containers**
```java
@Testcontainers
class IntegrationTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine");
}
```

### **Test Configuration**
```yaml
spring:
  test:
    database:
      replace: any
  r2dbc:
    url: r2dbc:tc:postgresql:///test?TC_IMAGE=postgres:15-alpine
```

### **Code Coverage**
```yaml
tools:
  jacoco:
    version: 0.8.10
    reports:
      xml: true
      html: true
    excludes:
      - "**/config/**"
      - "**/model/**"
```

## 🚀 Deploy & Production

### **Fly.io Configuration**
```toml
# fly.toml
app = "ceialmilk"
primary_region = "gru"

[env]
  SPRING_PROFILES_ACTIVE = "prod"
  DATABASE_URL = "jdbc:postgresql://localhost:5432/ceialmilk"

[[services]]
  internal_port = 8080
  protocol = "tcp"
```

### **Production Dockerfile**
```dockerfile
FROM eclipse-temurin:17-jre-alpine
COPY target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

### **Health Checks**
```yaml
management:
  endpoint:
    health:
      show-details: always
      probes:
        enabled: true
  endpoints:
    web:
      exposure:
        include: health, info, metrics
```

## 🔐 Security Configuration

### **JWT Setup**
```java
@Bean
public ReactiveJwtDecoder jwtDecoder() {
    return ReactiveJwtDecoders.fromIssuerLocation(issuerUri);
}
```

### **Security Config**
```java
@EnableWebFluxSecurity
public class SecurityConfig {
    @Bean
    public SecurityWebFilterChain securityFilterChain(ServerHttpSecurity http) {
        return http
            .csrf().disable()
            .authorizeExchange()
            .pathMatchers("/api/auth/**").permitAll()
            .anyExchange().authenticated()
            .and().build();
    }
}
```

---

**Última atualização**: 2025-09-08
**Versão do Tech Context**: 1.0
