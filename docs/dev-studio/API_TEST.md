# 🧪 Teste da API Gemini

## Script de Teste

Use o script para testar a API diretamente:

```bash
./scripts/test-gemini-api.sh
```

Ou com variáveis customizadas:

```bash
GEMINI_API_KEY="sua-chave" \
GEMINI_MODEL="gemini-2.0-flash" \
GEMINI_API_VERSION="v1" \
./scripts/test-gemini-api.sh
```

## Modelos Disponíveis

### Versão v1 (Estável - Recomendado)

- ✅ `gemini-2.0-flash` - **Recomendado para free tier**
- ✅ `gemini-2.0-flash-001` - Versão estável específica
- ✅ `gemini-2.5-flash` - Melhor performance
- ✅ `gemini-2.5-flash-lite` - Mais rápido e econômico
- ✅ `gemini-2.5-pro` - Melhor qualidade (pode ter custo)

### Versão v1beta (Experimental)

- ⚠️ `gemini-2.0-flash-exp` - Experimental, pode ter problemas
- ⚠️ `gemini-3-flash-preview` - Preview, pode mudar

## Configuração Atual

O código está configurado para usar:
- **Versão**: `v1` (estável)
- **Modelo**: `gemini-2.0-flash`
- **Endpoint**: `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent`

## Teste Manual

```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=SUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Diga apenas: OK"
      }]
    }]
  }'
```

## Verificar Modelos Disponíveis

```bash
curl "https://generativelanguage.googleapis.com/v1/models?key=SUA_CHAVE" | jq '.models[] | .name'
```

## Troubleshooting

### Erro 404: Modelo não encontrado

**Causa**: Modelo não disponível na versão da API usada

**Solução**: 
- Use `v1` em vez de `v1beta`
- Use modelos estáveis: `gemini-2.0-flash`, `gemini-2.5-flash`

### Erro 429: Quota excedida

**Causa**: Limite do free tier atingido

**Solução**: Ver `docs/dev-studio/GEMINI_QUOTA_FIX.md`

### Erro 401: API key inválida

**Causa**: Chave da API inválida ou expirada

**Solução**: 
- Gere nova chave em [Google AI Studio](https://aistudio.google.com/)
- Atualize `GEMINI_API_KEY` no `devcontainer.json` e `launch.json`

---

**Última atualização**: 2026-01-26
