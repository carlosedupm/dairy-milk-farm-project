#!/bin/bash

echo "🚀 Iniciando configuração do CeialMilk..."

# Verificar se estamos no diretório correto
if [ ! -f "pom.xml" ]; then
    echo "❌ Erro: Não está no diretório raiz do projeto (pom.xml não encontrado)"
    exit 1
fi

# Criar estrutura de pastas para código fonte (apenas se não existir)
if [ ! -d "src/main/java/com/ceialmilk" ]; then
    echo "📁 Criando estrutura de pastas do projeto..."
    mkdir -p src/main/java/com/ceialmilk/{config,controller,service,repository,model,security,exception}
    mkdir -p src/main/resources
    mkdir -p src/test/java/com/ceialmilk

    echo "✅ Estrutura de pastas criada!"
else
    echo "ℹ️  Estrutura de pastas já existe, pulando criação..."
fi

# Verificar se as pastas .devcontainer e .vscode já existem
if [ ! -d ".devcontainer" ] || [ ! -d ".vscode" ]; then
    echo "⚠️  Aviso: Pastas .devcontainer ou .vscode não encontradas"
    echo "📦 Certifique-se de que os arquivos de configuração do devcontainer estão presentes"
fi

# Dar permissões de execução (opcional, apenas se necessário)
if [ -f "setup.sh" ]; then
    chmod +x setup.sh
fi

echo "🎉 Configuração concluída!"
echo "🐳 Para iniciar: VS Code → Reopen in Container"
echo "📋 Comandos úteis:"
echo "   mvn clean compile -DskipTests"
echo "   mvn spring-boot:run"
