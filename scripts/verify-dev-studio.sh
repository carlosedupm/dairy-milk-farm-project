#!/bin/bash

echo "🔍 Verificando configuração do Dev Studio..."
echo ""

# Carregar .env se existir
if [ -f /workspace/.env ]; then
    echo "📄 Carregando variáveis de .env..."
    export $(grep -v '^#' /workspace/.env | xargs)
fi

# Verificar variável de ambiente Gemini
if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ GEMINI_API_KEY não está configurada"
    echo "   Configure com: export GEMINI_API_KEY='sua-chave'"
    echo "   Ou adicione ao arquivo .env"
    exit 1
else
    # Mostrar apenas primeiros e últimos caracteres por segurança
    GEMINI_MASKED="${GEMINI_API_KEY:0:7}...${GEMINI_API_KEY: -4}"
    echo "✅ GEMINI_API_KEY configurada ($GEMINI_MASKED)"
fi

# Verificar variáveis do GitHub (opcionais)
echo ""
echo "🔗 Verificando configuração do GitHub (opcional)..."
if [ -z "$GITHUB_TOKEN" ]; then
    echo "ℹ️  GITHUB_TOKEN não configurado (PRs automáticos desabilitados)"
    echo "   Configure GITHUB_TOKEN no .env para habilitar criação de PRs"
else
    GITHUB_MASKED="${GITHUB_TOKEN:0:7}...${GITHUB_TOKEN: -4}"
    echo "✅ GITHUB_TOKEN configurado ($GITHUB_MASKED)"
    
    if [ -z "$GITHUB_REPO" ]; then
        echo "⚠️  GITHUB_REPO não configurado"
        echo "   Configure GITHUB_REPO no formato owner/repo (ex: usuario/ceialmilk)"
    else
        echo "✅ GITHUB_REPO configurado: $GITHUB_REPO"
        if [ -n "$GITHUB_CONTEXT_BRANCH" ]; then
            echo "✅ GITHUB_CONTEXT_BRANCH: $GITHUB_CONTEXT_BRANCH (contexto da IA)"
        else
            echo "ℹ️  GITHUB_CONTEXT_BRANCH não definido (usa default: main)"
        fi
    fi
fi

# Verificar se o banco está acessível
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL não está configurada"
    exit 1
else
    echo "✅ DATABASE_URL configurada"
fi

# Verificar se as tabelas do Dev Studio existem
echo ""
echo "📊 Verificando tabelas do Dev Studio no banco..."

PGPASSWORD=$(echo $DATABASE_URL | grep -oP 'password=\K[^@]+' || echo "password")
PGUSER=$(echo $DATABASE_URL | grep -oP '://\K[^:]+' || echo "ceialmilk")
PGHOST=$(echo $DATABASE_URL | grep -oP '@\K[^:]+' || echo "localhost")
PGPORT=$(echo $DATABASE_URL | grep -oP ':\K[0-9]+' | tail -1 || echo "5432")
PGDB=$(echo $DATABASE_URL | grep -oP '/\K[^?]+' || echo "ceialmilk")

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDB" -c "\d dev_studio_requests" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Tabela dev_studio_requests existe"
else
    echo "❌ Tabela dev_studio_requests não existe - execute as migrações"
fi

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDB" -c "\d dev_studio_audit" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Tabela dev_studio_audit existe"
else
    echo "❌ Tabela dev_studio_audit não existe - execute as migrações"
fi

# Verificar perfil do usuário admin
echo ""
echo "👤 Verificando perfil do usuário admin..."
PERFIL=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDB" -t -c "SELECT perfil FROM usuarios WHERE email = 'admin@ceialmilk.com';" 2>/dev/null | xargs)
if [ "$PERFIL" = "DEVELOPER" ]; then
    echo "✅ Usuário admin tem perfil DEVELOPER"
elif [ "$PERFIL" = "ADMIN" ]; then
    echo "⚠️  Usuário admin tem perfil ADMIN - precisa ser atualizado para DEVELOPER"
    echo "   Execute: UPDATE usuarios SET perfil = 'DEVELOPER' WHERE email = 'admin@ceialmilk.com';"
else
    echo "❌ Usuário admin não encontrado"
fi

echo ""
echo "✅ Verificação concluída!"
