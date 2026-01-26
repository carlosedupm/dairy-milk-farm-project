#!/bin/bash

# Script para iniciar o backend com Dev Studio habilitado

cd /workspace

# Carregar variáveis de ambiente do arquivo .env se existir
if [ -f .env ]; then
    echo "📄 Carregando variáveis de ambiente de .env..."
    export $(grep -v '^#' .env | xargs)
fi

cd backend

# Verificar se GEMINI_API_KEY está configurada
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  GEMINI_API_KEY não está configurada"
    echo "   Configure com: export GEMINI_API_KEY='sua-chave'"
    echo "   Ou adicione ao arquivo .env na raiz do projeto"
    echo ""
    echo "Iniciando backend sem Dev Studio..."
    go run ./cmd/api
else
    echo "✅ GEMINI_API_KEY configurada"
    
    # Verificar GitHub (opcional)
    if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_REPO" ]; then
        echo "✅ GitHub configurado (PRs automáticos habilitados)"
    else
        echo "ℹ️  GitHub não configurado (PRs automáticos desabilitados)"
        echo "   Configure GITHUB_TOKEN e GITHUB_REPO no .env para habilitar"
    fi
    
    echo "🚀 Iniciando backend com Dev Studio habilitado..."
    go run ./cmd/api
fi
