#!/bin/bash

# Script para iniciar o backend com Dev Studio habilitado

cd /workspace/backend

# Verificar se GEMINI_API_KEY está configurada
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  GEMINI_API_KEY não está configurada"
    echo "   Configure com: export GEMINI_API_KEY='sua-chave'"
    echo "   Ou adicione ao devcontainer.json"
    echo ""
    echo "Iniciando backend sem Dev Studio..."
    go run ./cmd/api
else
    echo "✅ GEMINI_API_KEY configurada"
    echo "🚀 Iniciando backend com Dev Studio habilitado..."
    go run ./cmd/api
fi
