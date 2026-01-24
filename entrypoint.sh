#!/bin/bash
set -e

# Função para extrair dados da DATABASE_URL
parse_database_url() {
    local url=$1
    # Remove prefixos comuns
    url="${url#*://}"
    
    local userpass_hostport_db="${url}"
    local userpass="${userpass_hostport_db%%@*}"
    local hostport_db="${userpass_hostport_db#*@}"
    
    export DB_USERNAME="${userpass%%:*}"
    export DB_PASSWORD="${userpass#*:}"
    
    local hostport="${hostport_db%%/*}"
    export DB_NAME="${hostport_db#*/}"
    export DB_NAME="${DB_NAME%%\?*}"
    
    export DB_HOST="${hostport%:*}"
    export DB_PORT="${hostport##*:}"
    [[ "$DB_PORT" == "$DB_HOST" ]] && export DB_PORT=5432
}

echo "=== Iniciando processo de deploy (Padrão Render Interno) ==="

if [ -n "$DATABASE_URL" ]; then
    parse_database_url "$DATABASE_URL"
    # Remover sufixos externos se existirem para garantir uso do host interno
    # O Debian resolverá o host curto (interno) sem problemas.
    DB_HOST="${DB_HOST%.oregon-postgres.render.com}"
    DB_HOST="${DB_HOST%.frankfurt-postgres.render.com}"
    echo "Usando Host Interno: $DB_HOST"
else
    echo "❌ ERRO: DATABASE_URL não encontrada."
    exit 1
fi

# 1. Executar Migrações Flyway
if [ "$SKIP_FLYWAY_MIGRATE" = "true" ]; then
    echo "SKIP_FLYWAY_MIGRATE=true: pulando migrações."
else
    echo "=== Executando Flyway CLI ==="
    # JDBC URL simplificada para o Render (Interna)
    JDBC_URL="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"
    
    /app/flyway/flyway \
        -url="${JDBC_URL}" \
        -user="${DB_USERNAME}" \
        -password="${DB_PASSWORD}" \
        -locations="filesystem:/app/migrations" \
        -baselineOnMigrate=true \
        -baselineVersion=1 \
        migrate || { echo "❌ Erro nas migrações"; exit 1; }
    
    echo "✅ Migrações concluídas."
fi

# 2. Iniciar Aplicação
echo "=== Iniciando CeialMilk Application ==="
# Garantir que a app use o mesmo host interno para R2DBC
export SPRING_R2DBC_URL="r2dbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}?sslMode=require"
export SPRING_R2DBC_USERNAME="${DB_USERNAME}"
export SPRING_R2DBC_PASSWORD="${DB_PASSWORD}"

exec java -jar app.jar
