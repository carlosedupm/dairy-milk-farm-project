# Configuração de Produção - CeialMilk

## 📋 Resumo da Configuração Atual

### ✅ O que está funcionando

1. **DatabaseEnvironmentPostProcessor**
   - ✅ Está sendo executado corretamente
   - ✅ Está processando o `DATABASE_URL` corretamente
   - ✅ Está extraindo credenciais corretamente (username: ceialmilk, password: 32 caracteres)
   - ✅ Está configurando a URL do Flyway corretamente

2. **Configuração de Variáveis de Ambiente**
   - ✅ `DATABASE_URL` está presente e no formato correto
   - ✅ `SPRING_PROFILES_ACTIVE=prod` está configurado
   - ✅ Credenciais estão sendo extraídas do `DATABASE_URL`

3. **URL do Flyway Configurada**
   - ✅ Host completo: `dpg-d43nrcali9vc73dapb50-a.oregon-postgres.render.com`
   - ✅ Porta: `5432`
   - ✅ Database: `ceialmilk_qqtf`
   - ✅ SSL: `sslmode=require&ssl=true&sslfactory=org.postgresql.ssl.NonValidatingFactory`

### ⚠️ Problema Atual

**Erro**: `EOFException` durante autenticação do Flyway

**Possíveis Causas**:
1. **Problema de rede/firewall no Render**: A conexão pode estar sendo bloqueada
2. **Problema com SSL/TLS handshake**: Pode haver incompatibilidade com certificados
3. **Problema com URL interna vs externa**: Render pode exigir URL interna quando aplicação e banco estão na mesma região
4. **Problema com credenciais**: Embora pareçam corretas, pode haver caracteres especiais ou encoding

## 🔧 Arquivos de Configuração

### 1. `render.yaml`

```yaml
services:
  - type: web
    name: ceialmilk
    runtime: docker
    env: docker
    branch: main
    healthCheckPath: /actuator/health
    envVars:
      - key: SPRING_PROFILES_ACTIVE
        value: prod
      - key: DATABASE_URL
        fromDatabase:
          name: ceialmilk-db
          property: connectionString
      - key: DB_USERNAME
        value: ceialmilk
      - key: DB_PASSWORD
        fromDatabase:
          name: ceialmilk-db
          property: password
      - key: JWT_SECRET
        generateValue: true
    autoDeploy: true

databases:
  - name: ceialmilk-db
    databaseName: ceialmilk
    user: ceialmilk
    plan: free
```

### 2. `application-prod.yml`

```yaml
spring:
  flyway:
    enabled: ${FLYWAY_ENABLED:true}
    locations: classpath:db/migration
    baseline-on-migrate: true
    baseline-version: 1
    validate-on-migrate: false
    url: ${FLYWAY_JDBC_URL:jdbc:postgresql://localhost:5432/ceialmilk?sslmode=require&ssl=true}
    user: ${FLYWAY_USER:${DB_USERNAME:ceialmilk}}
    password: ${FLYWAY_PASSWORD:${DB_PASSWORD:}}

  r2dbc:
    url: ${R2DBC_URL:r2dbc:postgresql://${DB_HOST}:${DB_PORT:5432}/${DB_NAME:ceialmilk}?sslmode=require}
    username: ${DB_USERNAME:}
    password: ${DB_PASSWORD:}
```

### 3. `DatabaseEnvironmentPostProcessor.java`

- **Localização**: `src/main/java/com/ceialmilk/config/DatabaseEnvironmentPostProcessor.java`
- **Registro**: `src/main/resources/META-INF/spring.factories`
- **Função**: Processa `DATABASE_URL` antes de qualquer bean ser criado
- **Ordem**: `Ordered.HIGHEST_PRECEDENCE + 10` (executa muito cedo)

## 🔍 Como Verificar a Configuração

### 1. Verificar Logs do Processador

Procure nos logs por:
```
=== DatabaseEnvironmentPostProcessor: INICIADO ===
DATABASE_URL encontrado (mascarado): r2dbc:postgresql://***:***@...
Configurado Flyway com URL JDBC completa: host=..., port=..., database=...
Verificação: spring.flyway.url após configuração = jdbc:postgresql://...
```

### 2. Verificar Variáveis de Ambiente (após aplicação iniciar)

```bash
curl https://seu-app.onrender.com/api/v1/env/check
```

Este endpoint retorna (sem expor senhas):
- Formato do `DATABASE_URL`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`
- Status das configurações Spring (R2DBC e Flyway)

### 3. Verificar Health da Aplicação

```bash
curl https://seu-app.onrender.com/actuator/health
```

## 🛠️ Soluções para o Problema de Conexão

### Opção 1: Desabilitar Flyway Temporariamente

Para isolar o problema e ver se a aplicação consegue pelo menos iniciar:

**No Render Dashboard**, adicione variável de ambiente:
```
FLYWAY_ENABLED=false
```

Isso permitirá que a aplicação inicie sem executar migrações. Você pode executar as migrações manualmente depois.

### Opção 2: Verificar URL Interna do Render

O Render fornece duas URLs para o banco:
- **URL Externa**: Para conexões de fora do Render
- **URL Interna**: Para conexões de serviços na mesma região (recomendada)

Verifique no dashboard do Render se há uma URL interna disponível e use-a se a aplicação e o banco estiverem na mesma região.

### Opção 3: Verificar Configuração do Banco no Render

1. Acesse o dashboard do Render
2. Vá para o banco `ceialmilk-db`
3. Verifique:
   - Se o banco está ativo
   - Se há restrições de acesso (IP whitelist)
   - Se as credenciais estão corretas
   - Se há logs de tentativas de conexão bloqueadas

### Opção 4: Testar Conexão Manualmente

Se tiver acesso SSH ao container ou puder executar comandos, teste a conexão:

```bash
# Testar conexão JDBC
psql "jdbc:postgresql://dpg-d43nrcali9vc73dapb50-a.oregon-postgres.render.com:5432/ceialmilk_qqtf?sslmode=require&ssl=true&user=ceialmilk&password=SUA_SENHA"
```

## 📊 Estado Atual da Configuração

### Variáveis de Ambiente no Render

```
DATABASE_URL=r2dbc:postgresql://ceialmilk:8xeL06lbURE4VGJ0LGxatAL4gQk6GFt0@dpg-d43nrcali9vc73dapb50-a.oregon-postgres.render.com/ceialmilk_qqtf
DB_HOST=dpg-d43nrcali9vc73dapb50-a
DB_NAME=ceialmilk_qqtf
DB_PASSWORD=8xeL06lbURE4VGJ0LGxatAL4gQk6GFt0
DB_USERNAME=ceialmilk
JWT_SECRET=07dde5757238550cb54b845893a3b42c
SPRING_PROFILES_ACTIVE=prod
```

### URL do Flyway Configurada (pelos logs)

```
jdbc:postgresql://dpg-d43nrcali9vc73dapb50-a.oregon-postgres.render.com:5432/ceialmilk_qqtf?sslmode=require&ssl=true&sslfactory=org.postgresql.ssl.NonValidatingFactory
```

### Credenciais Extraídas

- **Username**: `ceialmilk` ✅
- **Password**: 32 caracteres ✅
- **Host**: `dpg-d43nrcali9vc73dapb50-a.oregon-postgres.render.com` ✅
- **Port**: `5432` ✅
- **Database**: `ceialmilk_qqtf` ✅

## 🎯 Próximos Passos Recomendados

1. **Verificar no Render Dashboard**:
   - Se o banco `ceialmilk-db` está ativo e acessível
   - Se há restrições de acesso configuradas
   - Se há logs de tentativas de conexão bloqueadas

2. **Testar desabilitando Flyway temporariamente**:
   - Adicionar `FLYWAY_ENABLED=false` no Render
   - Ver se a aplicação consegue pelo menos iniciar
   - Se iniciar, o problema é específico do Flyway/conexão JDBC

3. **Verificar se aplicação e banco estão na mesma região**:
   - Se estiverem, considerar usar URL interna do banco
   - URLs internas geralmente têm melhor performance e menos problemas de rede

4. **Contatar suporte do Render**:
   - Se o problema persistir, pode ser um problema de infraestrutura
   - Fornecer logs completos e informações de configuração

## 📝 Notas Importantes

- O `DatabaseEnvironmentPostProcessor` está funcionando corretamente
- A configuração está sendo aplicada antes do Flyway tentar conectar
- O problema parece ser na camada de rede/SSL, não na configuração da aplicação
- O `EOFException` durante autenticação geralmente indica problema de rede ou SSL handshake

---

**Última atualização**: 2026-01-23
**Status**: Configuração correta, investigando problema de conexão de rede/SSL
