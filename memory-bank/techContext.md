# 🛠️ Technical Context - CeialMilk

## Stack Tecnológica

- **Java**: 17 (Eclipse Temurin)
- **Framework**: Spring Boot 3.3.0
- **Web**: Spring WebFlux (Programação Reativa)
- **Banco de Dados**: PostgreSQL 15
- **Acesso a Dados**: Spring Data R2DBC (Não-bloqueante)
- **Migrações**: Flyway CLI (Executado no deploy)
- **Segurança**: Spring Security 6 + JWT
- **Container**: Docker (Debian-based)
- **Cloud**: Render

## Configurações de Produção (Render)

### Docker & Sistema Operacional
- **Imagem Base**: `eclipse-temurin:17-jdk` (Debian)
- **Motivo**: Debian provê resolução de DNS estável para hosts internos do Render, evitando `UnknownHostException`.

### Conectividade de Banco de Dados
- **Tipo de Conexão**: Rede Interna do Render (Host curto: `dpg-xxxx`)
- **Segurança**: SSL `sslmode=require`.
- **Drivers**:
  - **JDBC**: Usado apenas pelo Flyway CLI no startup.
  - **R2DBC**: Usado pela aplicação em tempo de execução para reatividade total.

## Dependências Principais (pom.xml)

- `spring-boot-starter-webflux`: Core reativo.
- `spring-boot-starter-data-r2dbc`: Repositórios reativos.
- `r2dbc-postgresql`: Driver R2DBC para Postgres.
- `spring-boot-starter-security`: Segurança básica.
- `jjwt-api`, `jjwt-impl`, `jjwt-jackson`: Implementação de JWT.
- `springdoc-openapi-starter-webflux-ui`: Documentação Swagger.

## Configuração do Swagger

### Rotas liberadas no SecurityConfig.java:
- `/swagger-ui/**`
- `/v3/api-docs/**` 
- `/swagger-ui.html`
- `/webjars/**`

### URLs de acesso:
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **API Docs**: http://localhost:8080/v3/api-docs

## Estratégia de Deploy

1. **Build**: Maven constrói o JAR.
2. **Flyway CLI**: O `entrypoint.sh` detecta a `DATABASE_URL`, converte para JDBC e roda as migrações usando o binário oficial do Flyway.
3. **Startup**: A aplicação inicia após as migrações, recebendo a `SPRING_R2DBC_URL` via variável de ambiente para garantir conectividade interna.
