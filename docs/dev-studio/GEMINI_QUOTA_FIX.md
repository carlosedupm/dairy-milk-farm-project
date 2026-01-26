# 🔧 Solução: Erro 429 - Quota Excedida da API Gemini

## Problema

Ao tentar usar o Dev Studio, você recebe o erro:

```json
{
  "error": {
    "code": 429,
    "message": "You exceeded your current quota, please check your plan and billing details"
  }
}
```

## Causas Possíveis

1. **Free Tier não habilitado**: O projeto no Google Cloud não tem o free tier ativado
2. **Quota realmente excedida**: Limite de 1.500 requests/dia atingido
3. **Chave de API inválida ou sem permissões**: A chave não tem acesso ao modelo `gemini-2.0-flash-exp`
4. **Projeto sem billing habilitado**: Alguns recursos do Gemini requerem billing mesmo no free tier

## Soluções

### Solução 1: Verificar e Habilitar Free Tier no Google Cloud

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Vá em **APIs & Services** > **Enabled APIs**
3. Certifique-se de que a **Generative Language API** está habilitada
4. Vá em **APIs & Services** > **Quotas**
5. Procure por `generativelanguage.googleapis.com/generate_content_free_tier_requests`
6. Verifique se o limite está configurado (deve ser 1.500/dia)

### Solução 2: Verificar a Chave de API

1. Acesse [Google AI Studio](https://aistudio.google.com/)
2. Verifique se a chave está ativa
3. Gere uma nova chave se necessário
4. Atualize no `devcontainer.json` e `launch.json`

### Solução 3: Usar Outro Modelo (Temporário)

Se o modelo `gemini-2.0-flash-exp` não estiver disponível, você pode tentar:

- `gemini-1.5-flash` (mais estável, free tier)
- `gemini-1.5-pro` (melhor qualidade, pode ter custo)

**Para alterar o modelo**, edite `backend/internal/service/dev_studio_service.go`:

```go
// Linha ~113, altere:
url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=%s", s.geminiAPIKey)
```

### Solução 4: Habilitar Billing (Opcional)

Alguns recursos do Gemini podem requerer billing habilitado mesmo no free tier:

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Vá em **Billing**
3. Adicione um método de pagamento (não será cobrado se usar apenas free tier)
4. Habilite billing para o projeto

## Melhorias Implementadas

O código foi atualizado para:

1. ✅ **Detectar erros 429** e retornar mensagem mais clara
2. ✅ **Código de erro específico**: `QUOTA_EXCEEDED`
3. ✅ **Mensagem amigável** com link para documentação

## Verificação

Após aplicar as correções, teste novamente:

```bash
curl -X POST http://localhost:8080/api/v1/dev-studio/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: ceialmilk_token=seu-token" \
  -d '{"prompt":"teste"}'
```

## Alternativas

Se o problema persistir, considere:

1. **Usar Claude API** (Anthropic) - Paid tier, mas mais confiável
2. **Usar OpenAI API** - Paid tier, amplamente usado
3. **Aguardar reset da quota** - Free tier reseta diariamente

## Links Úteis

- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Google AI Studio](https://aistudio.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/)

---

**Última atualização**: 2026-01-26
