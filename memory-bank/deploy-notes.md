# Notas de Deploy - Ambiente de Produção

## Configuração do Flyway

1. **Primeiro Deploy**:
   - O Flyway criará automaticamente a tabela `flyway_schema_history`
   - Migrações existentes serão marcadas como já aplicadas (baseline)

2. **Deploys Futuros**:
   - Novas migrações serão aplicadas automaticamente na ordem correta
   - Verifique sempre os logs do Flyway após o deploy

3. **Monitoramento**:
   - Endpoint: `/actuator/flyway` (status das migrações)
   - Logs: Buscar por "Flyway migrate" nos logs da aplicação

4. **Rollback**:
   - Em caso de falha, o Render fará rollback automático
   - Sempre tenha um backup recente do banco

## Variáveis de Ambiente Obrigatórias

```
DB_HOST=endpoint-do-banco
DB_NAME=nome-do-banco  
DB_USERNAME=usuário
DB_PASSWORD=senha
JWT_SECRET=chave-secreta
```

## Comandos Úteis

```bash
# Verificar migrações aplicadas
curl http://localhost:8080/actuator/flyway

# Verificar saúde da aplicação  
curl http://localhost:8080/actuator/health
