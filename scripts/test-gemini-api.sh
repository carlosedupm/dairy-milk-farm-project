#!/bin/bash

# Script para testar a API Gemini diretamente

API_KEY="${GEMINI_API_KEY}"
if [ -z "$API_KEY" ]; then
  echo "❌ Erro: GEMINI_API_KEY não está configurada"
  echo "   Configure com: export GEMINI_API_KEY='sua-chave'"
  exit 1
fi
MODEL="${GEMINI_MODEL:-gemini-2.0-flash}"
API_VERSION="${GEMINI_API_VERSION:-v1}"

echo "🧪 Testando API Gemini..."
echo "Modelo: $MODEL"
echo "Versão: $API_VERSION"
echo ""

# Teste 1: Listar modelos disponíveis
echo "📋 Teste 1: Listar modelos disponíveis..."
curl -s "https://generativelanguage.googleapis.com/${API_VERSION}/models?key=${API_KEY}" | jq -r '.models[] | "\(.name) - \(.displayName // "N/A")"' 2>/dev/null | head -10 || echo "Erro ao listar modelos"

echo ""
echo ""

# Teste 2: Testar generateContent
echo "💬 Teste 2: Testar generateContent com prompt simples..."
RESPONSE=$(curl -s -X POST \
  "https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL}:generateContent?key=${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Diga apenas: OK"
      }]
    }]
  }')

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

echo ""
echo ""

# Verificar se houve erro
ERROR_CODE=$(echo "$RESPONSE" | jq -r '.error.code // "none"' 2>/dev/null)
if [ "$ERROR_CODE" != "none" ] && [ "$ERROR_CODE" != "null" ]; then
  echo "❌ Erro na API:"
  echo "$RESPONSE" | jq '.error' 2>/dev/null || echo "$RESPONSE"
  exit 1
else
  echo "✅ API funcionando corretamente!"
  TEXT=$(echo "$RESPONSE" | jq -r '.candidates[0].content.parts[0].text // "N/A"' 2>/dev/null)
  echo "Resposta: $TEXT"
fi
