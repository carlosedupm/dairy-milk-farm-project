# Notas de Deploy - Ambiente de Produção

## Deploy no Render (fluxo recomendado)

Flyway (JDBC) no container falha com **EOFException** ao conectar ao Postgres do Render. Use migrações **fora** do container:

1. **Migrações**: Render Dashboard → **ceialmilk-db** → Connect → **External** → copiar External Database URL. Localmente:
   ```bash
   export RENDER_EXTERNAL_DATABASE_URL='postgresql://USER:PASS@HOST:5432/DB'
   ./scripts/flyway-migrate-render.sh
   ```
2. **Deploy**: O `render.yaml` define `SKIP_FLYWAY_MIGRATE=true`. O container sobe **sem** Flyway; a app conecta ao banco via R2DBC (host externo).
3. **Novas migrações**: rodar o script de novo, depois deploy.

## Configuração no Render

O projeto está configurado para deploy no Render usando Docker. O arquivo `render.yaml` define:
- **Serviço Web**: Aplicação Docker na branch `main`
- **Banco de Dados**: PostgreSQL gerenciado (`ceialmilk-db`)
- **Health Check**: `/actuator/health`
- **Auto Deploy**: Habilitado

## Variáveis de Ambiente

### Configuradas Automaticamente pelo Render

O `render.yaml` configura automaticamente as seguintes variáveis:

- `SPRING_PROFILES_ACTIVE=prod` - Ativa o perfil de produção
- `DATABASE_URL` - URL de conexão do banco (formato JDBC: `postgresql://user:pass@host:port/db`)
- `DB_HOST` - Host do banco de dados (extraído do banco gerenciado)
- `DB_PORT` - Porta do banco (geralmente 5432)
- `DB_NAME` - Nome do banco de dados (extraído do banco gerenciado)
- `DB_USERNAME` - Usuário do banco (`ceialmilk`)
- `DB_PASSWORD` - Senha do banco (gerada automaticamente pelo Render)
- `JWT_SECRET` - Chave secreta JWT (gerada automaticamente)

### Opcionais (Render / conexão ao banco)

- **Padrão**: Host **externo** (ex: `dpg-xxx-a.oregon-postgres.render.com`). O host interno (curto) **não resolve** em serviços Docker no Render → `UnknownHostException`.
- `USE_INTERNAL_DB_HOST=true` - Força host **interno** (curto). Só use se o seu ambiente resolver o host interno.
- `DB_HOST_SUFFIX` - Sufixo do externo (ex: `.frankfurt-postgres.render.com`) quando o host é curto.
- `FLYWAY_RETRY_ATTEMPTS`, `FLYWAY_RETRY_SLEEP` - Retries do Flyway (padrão: 18 tentativas, 10s entre cada).
- `SKIP_FLYWAY_MIGRATE=true` - Não executa Flyway no container; só inicia a app (migrações no CI/manual).

### Conversão Automática de DATABASE_URL

A aplicação possui um `EnvironmentPostProcessor` (`DatabaseEnvironmentPostProcessor.java`) que:
- **Executa muito cedo** no ciclo de vida do Spring Boot (antes de qualquer bean ser criado)
- Detecta automaticamente o `DATABASE_URL` nos formatos:
  - R2DBC: `r2dbc:postgresql://user:pass@host:port/db`
  - JDBC: `postgresql://user:pass@host:port/db` ou `jdbc:postgresql://...`
- Converte para os formatos necessários:
  - R2DBC: `r2dbc:postgresql://host:port/db?sslmode=require`
  - JDBC (Flyway): `jdbc:postgresql://host:port/db?sslmode=require&ssl=true&sslfactory=org.postgresql.ssl.NonValidatingFactory`
- Extrai e configura as variáveis `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME` e `DB_PASSWORD`
- Configura tanto o R2DBC (aplicação) quanto o Flyway (migrações) com alta prioridade

**Nota**: O processador está registrado em `META-INF/spring.factories` e executa automaticamente antes do Flyway tentar conectar.

**Logs de Debug**: O processador gera logs detalhados (incluindo `System.out.println`) para facilitar o diagnóstico:
- `=== DatabaseEnvironmentPostProcessor: INICIADO ===`
- `DATABASE_URL encontrado (mascarado): ...`
- `Configurado Flyway com URL JDBC completa: ...`
- `Verificação: spring.flyway.url após configuração = ...`

## Configuração do Flyway

### Nova Abordagem: Flyway CLI (Implementado em 2026-01-23)

**Migrações executadas ANTES da aplicação iniciar** usando Flyway CLI via script de inicialização (`entrypoint.sh`).

**Vantagens:**
- ✅ Mantém arquitetura reativa (aplicação nunca usa JDBC, apenas R2DBC)
- ✅ Separação de responsabilidades (migrações são responsabilidade do deploy)
- ✅ Retry no Flyway CLI (evita pg_isready/nc que falham com SSL/rede no Render)
- ✅ Melhor tratamento de erros

**Como Funciona:**

- **Padrão (Render)**: `SKIP_FLYWAY_MIGRATE=true` no `render.yaml`. Migrações rodam via `scripts/flyway-migrate-render.sh` (local); o container **não** executa Flyway.
- **Se `SKIP_FLYWAY_MIGRATE` não estiver definido**: o `entrypoint.sh` extrai host/port/db de `DATABASE_URL`, usa host **externo** por padrão, aguarda 10s e executa Flyway CLI com retries (18×10s). Se sucesso, inicia a app. Variáveis: `FLYWAY_RETRY_ATTEMPTS`, `FLYWAY_RETRY_SLEEP`.

2. **Primeiro Deploy**:
   - Flyway CLI criará automaticamente a tabela `flyway_schema_history`
   - Migrações existentes serão marcadas como já aplicadas (baseline)
   - As migrações estão em `src/main/resources/db/migration/` (copiadas para `/app/migrations` no container)

3. **Deploys Futuros**:
   - Novas migrações serão aplicadas automaticamente na ordem correta
   - Verifique sempre os logs do script de inicialização após o deploy
   - Logs aparecem antes da aplicação iniciar

4. **Monitoramento**:
   - Logs do script: Buscar por "Executando migrações Flyway (com retry)" e "Tentativa X/Y"
   - Logs da aplicação: Aplicação só inicia após migrações concluírem
   - Health check: `/actuator/health` (disponível após aplicação iniciar)

5. **Rollback**:
   - Se migração falhar, aplicação não inicia (comportamento desejado)
   - Render fará rollback automático do deploy
   - Sempre tenha um backup recente do banco

**Configuração:**
- Flyway está **desabilitado na aplicação** (`application-prod.yml`: `flyway.enabled: false`)
- Migrações executadas via Flyway CLI no script de inicialização
- Dockerfile inclui Flyway CLI e script de inicialização

## Conexões Necessárias

### PostgreSQL (Obrigatório)

- **Banco Gerenciado**: `ceialmilk-db` (definido no `render.yaml`)
- **Plano**: `free` (pode ser atualizado conforme necessário)
- **SSL**: Obrigatório (`sslmode=require`)

### Redis (Opcional)

- Redis **não está configurado** em produção atualmente
- Está disponível apenas no ambiente de desenvolvimento (`docker-compose.yml`)
- Se necessário adicionar Redis em produção:
  1. Criar serviço Redis no Render (ou usar Redis externo)
  2. Adicionar variável `REDIS_URL` no `render.yaml`
  3. Configurar Spring Data Redis no `application-prod.yml`
  4. Adicionar dependência no `pom.xml`

## Checklist de Deploy

Antes de fazer deploy no Render, verificar:

- [x] `render.yaml` configurado corretamente
- [ ] Banco de dados PostgreSQL criado no Render (via `render.yaml`)
- [x] Variáveis de ambiente definidas automaticamente (via `fromDatabase`)
- [x] `JWT_SECRET` configurado (gerado automaticamente)
- [x] Credenciais removidas do `application-prod.yml` (usando apenas variáveis de ambiente)
- [x] Health check endpoint configurado (`/actuator/health`)
- [ ] Flyway migrações testadas localmente
- [ ] Dockerfile testado localmente

## Comandos Úteis

```bash
# Verificar health da aplicação
curl https://seu-app.onrender.com/actuator/health

# Verificar migrações Flyway
curl https://seu-app.onrender.com/actuator/flyway

# Verificar logs no Render
# (via dashboard do Render: https://dashboard.render.com)
```

## Segurança

### Credenciais

- ✅ **Credenciais hardcoded removidas** do `application-prod.yml`
- ✅ Todas as credenciais vêm de variáveis de ambiente
- ✅ `JWT_SECRET` é gerado automaticamente pelo Render
- ✅ Senha do banco é gerenciada automaticamente pelo Render

### Recomendações

1. **Nunca commitar credenciais** no código
2. **Usar sempre variáveis de ambiente** para informações sensíveis
3. **Rotacionar JWT_SECRET** periodicamente em produção
4. **Configurar backups automáticos** do banco de dados no Render

## Troubleshooting

### Problema: Aplicação não conecta ao banco

**Sintomas**:
- `EOFException` durante autenticação
- `UnknownHostException` (host incompleto)
- `Connection refused` (tentando conectar em localhost)

**Solução**:
1. **Verificar logs do DatabaseEnvironmentPostProcessor**:
   - Deve aparecer: `=== DatabaseEnvironmentPostProcessor: INICIADO ===`
   - Deve aparecer: `Configurado Flyway com URL JDBC completa: host=..., port=..., database=...`
   - Deve aparecer: `Verificação: spring.flyway.url após configuração = ...`

2. **Verificar se o banco `ceialmilk-db` foi criado no Render**:
   - Acessar dashboard do Render
   - Verificar se o banco está ativo e acessível

3. **Verificar variáveis de ambiente no Render**:
   - `DATABASE_URL` deve estar presente
   - `DB_USERNAME` e `DB_PASSWORD` devem estar configuradas
   - Usar endpoint `/api/v1/env/check` para verificar (após aplicação iniciar)

4. **Verificar configuração SSL**:
   - Render PostgreSQL requer `sslmode=require`
   - O processador configura automaticamente com `sslfactory=org.postgresql.ssl.NonValidatingFactory`

5. **Se o problema persistir (EOFException)** - RESOLVIDO:
   - ✅ **Solução implementada**: Flyway CLI executa migrações ANTES da aplicação iniciar
   - ✅ Script de inicialização aguarda banco estar pronto antes de executar migrações
   - ✅ Problema de timing resolvido com health check e retry
   - Se ainda houver problemas:
     - Verificar se aplicação e banco estão na mesma região
     - Verificar logs do script de inicialização (antes dos logs da aplicação)
     - Verificar se variáveis de ambiente estão corretas (DB_HOST, DB_PORT, etc.)

### Problema: Migrações Flyway falham

**Solução**:
1. **Verificar logs do script de inicialização** (nos logs do container, antes da aplicação iniciar):
   - Buscar por "Executando migrações Flyway"
   - Verificar mensagens de erro do Flyway CLI
   - Logs aparecem com prefixo "===" ou "Executando Flyway CLI..."

2. **Verificar se o banco está pronto**:
   - Logs devem mostrar "✅ Banco de dados está pronto!" antes de executar migrações
   - Se não aparecer, problema de conectividade com banco

3. **Verificar variáveis de ambiente**:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` devem estar configuradas
   - Logs do script mostram essas variáveis (senha oculta)

4. **Verificar permissões do banco**:
   - Usuário deve ter permissão para criar tabelas
   - Verificar se banco está ativo no dashboard do Render

5. **Em caso de erro**:
   - Aplicação não iniciará (comportamento desejado)
   - Render fará rollback automático
   - Corrigir migração e fazer novo deploy

### Problema: UnknownHostException (host interno) ou EOFException (host externo)

**Comportamento**:
- **Padrão**: Host **externo** (ex: `...oregon-postgres.render.com`). O interno (curto) **não resolve** em Docker no Render → `UnknownHostException`.
- `USE_INTERNAL_DB_HOST=true`: força interno; use apenas se o host interno resolver no seu ambiente.
- Se `EOFException` com externo: SSL já simplificado (sem `NonValidatingFactory`); ver workaround abaixo.

**Fluxo recomendado (Flyway fora do container)** — JDBC → Render Postgres falha com EOFException no container:

1. **Render Dashboard** → **ceialmilk-db** → **Connect** → **External** → copiar **External Database URL** (ex.: `postgresql://user:pass@dpg-xxx-a.oregon-postgres.render.com:5432/ceialmilk_qqtf`).
2. **Localmente** (com Docker):
   ```bash
   export RENDER_EXTERNAL_DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/DATABASE'  # colar a URL
   ./scripts/flyway-migrate-render.sh
   ```
3. O **render.yaml** já define `SKIP_FLYWAY_MIGRATE=true`. O container sobe **sem** rodar Flyway; a app usa R2DBC (host externo).
4. **Deploy** no Render. O schema já foi aplicado no passo 2.

**Comando Flyway manual** (alternativa ao script):
```bash
docker run --rm -v "$(pwd)/src/main/resources/db/migration:/flyway/sql" flyway/flyway:10-alpine \
  -url="jdbc:postgresql://HOST:5432/DB?sslmode=require&ssl=true" \
  -user=ceialmilk -password=SENHA \
  -locations=filesystem:/flyway/sql -baselineOnMigrate=true migrate
```
Substituir `HOST`, `DB`, `SENHA` pelos valores da External Database URL.

### Problema: Health check falha

**Solução**:
1. Verificar se a aplicação está rodando: `curl https://seu-app.onrender.com/actuator/health`
2. Verificar logs da aplicação no dashboard do Render
3. Verificar se o banco de dados está acessível
4. Verificar se todas as variáveis de ambiente estão configuradas

## Arquivos de Migração

### Estrutura
- **Localização**: `src/main/resources/db/migration/`
- **Formato**: `V{versão}__{descrição}.sql`
- **Exemplos**:
  - `V1__Add_remaining_tables.sql`
  - `V2__Add_indexes_to_fazendas.sql`

### No Container Docker
- Migrações são copiadas para `/app/migrations` no container
- Flyway CLI executa migrações a partir deste diretório
- Ordem de execução: Versões numéricas em ordem crescente

---

**Última atualização**: 2026-01-23
**Mudança Principal**: Migração para Flyway CLI (execução antes da aplicação iniciar)
