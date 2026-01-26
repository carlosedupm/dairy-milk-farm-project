# 🔧 Troubleshooting - Dev Studio

## Erro: 404 Not Found na rota `/api/v1/dev-studio/chat`

### Causa
O backend não está rodando com a variável `GEMINI_API_KEY` configurada, então as rotas do Dev Studio não são registradas.

### Solução

**1. Pare o backend atual:**
```bash
pkill -f "go run.*cmd/api"
```

**2. Configure a variável de ambiente e reinicie:**
```bash
export GEMINI_API_KEY="sua-chave-gemini-aqui"
cd /workspace/backend
go run ./cmd/api
```
**Obtenha sua chave em**: https://ai.google.dev/

**OU use o script:**
```bash
./scripts/start-backend-dev-studio.sh
```

**3. Verifique se as rotas foram registradas:**
Você deve ver no log:
```
✅ Rotas do Dev Studio registradas
```

Se aparecer:
```
⚠️ GEMINI_API_KEY não configurada: Dev Studio desabilitado
```

A variável não está configurada. Configure antes de iniciar.

### Verificação Rápida

```bash
# Verificar se a variável está configurada
echo $GEMINI_API_KEY

# Verificar se o backend está rodando
curl http://localhost:8080/health

# Testar a rota (deve retornar 401, não 404)
curl -X POST http://localhost:8080/api/v1/dev-studio/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}'
```

- **404**: Backend não tem a rota registrada (GEMINI_API_KEY não configurada)
- **401**: Rota existe, mas precisa de autenticação (correto!)

## Erro: 429 - Quota Excedida da API Gemini

### Causa
A quota do free tier da Gemini foi excedida ou não está habilitada no projeto do Google Cloud.

### Solução

**1. Verificar no Google Cloud Console:**
- Acesse [Google Cloud Console](https://console.cloud.google.com/)
- Vá em **APIs & Services** > **Enabled APIs**
- Certifique-se de que **Generative Language API** está habilitada
- Verifique quotas em **APIs & Services** > **Quotas**

**2. Verificar no Google AI Studio:**
- Acesse [Google AI Studio](https://aistudio.google.com/)
- Verifique se a chave está ativa
- Gere uma nova chave se necessário

**3. Modelo alternativo (já implementado):**
O código foi atualizado para usar `gemini-1.5-flash` em vez de `gemini-2.0-flash-exp`, que é mais estável.

**4. Habilitar Billing (se necessário):**
Alguns recursos podem requerer billing habilitado mesmo no free tier:
- Acesse **Billing** no Google Cloud Console
- Adicione método de pagamento (não será cobrado no free tier)

### Mensagem de Erro Melhorada

O sistema agora retorna uma mensagem mais clara quando a quota é excedida:

```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Quota da API Gemini excedida. Verifique sua conta no Google Cloud Console ou aguarde o reset da quota.",
    "details": {
      "help": "Acesse https://ai.google.dev/gemini-api/docs/rate-limits para mais informações"
    }
  }
}
```

**Ver documentação completa**: `docs/dev-studio/GEMINI_QUOTA_FIX.md`

## Erro: "Unable to add filesystem: <illegal path>"

Este erro geralmente vem do browser/frontend e pode ser ignorado. Não afeta o funcionamento do Dev Studio.

## Erro: "Acesso negado. Perfil DEVELOPER necessário"

### Causa
O usuário não tem perfil `DEVELOPER`.

### Solução

**Opção 1: Executar migração (automático)**
As migrações são executadas automaticamente ao iniciar o backend. A migração `6_update_admin_to_developer.up.sql` atualiza o admin automaticamente.

**Opção 2: Manualmente**
```sql
UPDATE usuarios SET perfil = 'DEVELOPER' WHERE email = 'admin@ceialmilk.com';
```

## Erro ao gerar código

### Possíveis causas:
1. **Chave da API inválida**: Verifique se `GEMINI_API_KEY` está correta
2. **Limite atingido**: Free tier tem limite de 1.500 requests/dia
3. **Problema de conectividade**: Verifique logs do backend
4. **Quota não habilitada**: Verifique no Google Cloud Console

### Verificar logs:
```bash
# Ver logs do backend em tempo real
tail -f /tmp/backend.log
```

## Backend não inicia

### Verificar:
1. Banco de dados está rodando: `docker ps` (dentro do devcontainer)
2. `DATABASE_URL` está configurada corretamente
3. Porta 8080 não está em uso: `lsof -i :8080`

## Rotas de Auth retornam 404

### Causa
O backend não consegue conectar ao banco de dados ou as chaves JWT não estão configuradas.

### Solução

**1. Verificar conexão com banco:**
```bash
# Dentro do devcontainer, o banco está em 'db:5432'
psql postgres://ceialmilk:password@db:5432/ceialmilk -c "SELECT 1;"
```

**2. Verificar DATABASE_URL no debug:**
No `.vscode/launch.json`, deve estar:
```json
"DATABASE_URL": "postgres://ceialmilk:password@db:5432/ceialmilk?sslmode=disable"
```

**3. Reiniciar o debug:**
- Pare o debug atual
- Reinicie com F5

---

**Última atualização**: 2026-01-26
