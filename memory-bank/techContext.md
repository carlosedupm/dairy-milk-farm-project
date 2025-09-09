## Configuração do Swagger

### Rotas liberadas no SecurityConfig.java:
- `/swagger-ui/**`
- `/v3/api-docs/**` 
- `/swagger-ui.html`
- `/webjars/**` (adicionado para corrigir redirecionamento)

### Dependências no pom.xml:
```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webflux-ui</artifactId>
    <version>2.5.0</version>
</dependency>
```

### Solução implementada:
- Adicionada rota `/webjars/**` no SecurityConfig.java para permitir o redirecionamento correto do Swagger UI
- Configuração JWT (bearerAuth) mantida para autenticação via Swagger

### URLs de acesso:
- Swagger UI: http://localhost:8080/swagger-ui.html
- API Docs: http://localhost:8080/v3/api-docs
