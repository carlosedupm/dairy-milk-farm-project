# Notas de Deploy - Ambiente de Produção

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

### Conversão Automática de DATABASE_URL

A aplicação possui uma classe de configuração (`R2dbcConfig.java`) que:
- Detecta automaticamente o `DATABASE_URL` no formato JDBC (`postgresql://`)
- Converte para o formato R2DBC (`r2dbc:postgresql://`) necessário pela aplicação
- Extrai e configura as variáveis `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME` e `DB_PASSWORD`
- Configura tanto o R2DBC (aplicação) quanto o Flyway (migrações)

**Nota**: Se você configurar manualmente as variáveis `DB_HOST`, `DB_NAME`, etc., elas terão prioridade sobre a conversão do `DATABASE_URL`.

## Configuração do Flyway

1. **Primeiro Deploy**:
   - O Flyway criará automaticamente a tabela `flyway_schema_history`
   - Migrações existentes serão marcadas como já aplicadas (baseline)
   - As migrações estão em `src/main/resources/db/migration/`

2. **Deploys Futuros**:
   - Novas migrações serão aplicadas automaticamente na ordem correta
   - Verifique sempre os logs do Flyway após o deploy

3. **Monitoramento**:
   - Endpoint: `/actuator/flyway` (status das migrações)
   - Logs: Buscar por "Flyway migrate" nos logs da aplicação

4. **Rollback**:
   - Em caso de falha, o Render fará rollback automático
   - Sempre tenha um backup recente do banco

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

**Solução**:
1. Verificar se o banco `ceialmilk-db` foi criado no Render
2. Verificar logs da aplicação para erros de conexão
3. Verificar se as variáveis de ambiente estão configuradas corretamente
4. Verificar se o `DATABASE_URL` está sendo convertido corretamente (ver logs: "Convertido DATABASE_URL de JDBC para R2DBC")

### Problema: Migrações Flyway falham

**Solução**:
1. Verificar logs do Flyway: `curl https://seu-app.onrender.com/actuator/flyway`
2. Verificar se o banco tem permissões para criar tabelas
3. Verificar se há migrações conflitantes
4. Em caso de erro, fazer rollback e corrigir a migração

### Problema: Health check falha

**Solução**:
1. Verificar se a aplicação está rodando: `curl https://seu-app.onrender.com/actuator/health`
2. Verificar logs da aplicação no dashboard do Render
3. Verificar se o banco de dados está acessível
4. Verificar se todas as variáveis de ambiente estão configuradas

---

**Última atualização**: 2025-01-23
