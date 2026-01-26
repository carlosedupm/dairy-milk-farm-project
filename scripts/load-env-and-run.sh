#!/bin/bash

# Script para carregar .env e executar comando
# Usado pelo VS Code launch.json para carregar variáveis de ambiente

cd /workspace

# Carregar variáveis de ambiente do arquivo .env se existir
if [ -f .env ]; then
    echo "📄 Carregando variáveis de ambiente de .env..."
    export $(grep -v '^#' .env | xargs)
fi

# Executar o comando passado como argumento
exec "$@"
