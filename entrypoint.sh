#!/bin/bash
set -e

# Função robusta para extrair dados da DATABASE_URL
parse_database_url() {
    local url=$1
    url="${url#jdbc:}"
    local proto_removed="${url#*://}"
    local userpass="${proto_removed%%@*}"
    export DB_USERNAME="${userpass%%:*}"
    export DB_PASSWORD="${userpass#*:}"
    local rest="${proto_removed#*@}"
    local hostport="${rest%%/*}"
    local db_with_params="${rest#*/}"
    export DB_HOST="${hostport%:*}"
    export DB_PORT="${hostport##*:}"
    [[ "$DB_PORT" == "$DB_HOST" ]] && export DB_PORT=5432
    export DB_NAME="${db_with_params%%\?*}"
}

echo "=== Iniciando processo de deploy (Conectividade Render) ==="

if [ -n "$DATABASE_URL" ]; then
    parse_database_url "$DATABASE_URL"
    # SEMPRE usar o host externo no Render para Java/JDBC (interno falha DNS; externo requer SSL explícito)
    if [[ ! "$DB_HOST" == *"."* ]]; then
        DB_HOST="${DB_HOST}${DB_HOST_SUFFIX:-.oregon-postgres.render.com}"
    fi
    echo "Host de Conexão: $DB_HOST"
else
    echo "❌ ERRO: DATABASE_URL não encontrada."
    exit 1
fi

run_flyway() {
    # Parâmetros CRÍTICOS para evitar EOFException no Render:
    # ssl=true + sslmode=require, tcpKeepAlive para proxy
    local jdbc="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}?ssl=true&sslmode=require&tcpKeepAlive=true&targetServerType=primary"

    echo "--- Tentando Flyway (Host: ${DB_HOST}) ---"
    /app/flyway/flyway \
        -url="${jdbc}" \
        -user="${DB_USERNAME}" \
        -password="${DB_PASSWORD}" \
        -locations="filesystem:/app/migrations" \
        -baselineOnMigrate=true \
        -baselineVersion=1 \
        migrate
}

# 1. Executar Migrações
if [ "$SKIP_FLYWAY_MIGRATE" = "true" ]; then
    echo "SKIP_FLYWAY_MIGRATE=true: pulando migrações."
else
    echo "=== Executando Flyway CLI ==="
    max_attempts=5
    attempt=1
    success=false

    while [ $attempt -le $max_attempts ]; do
        if run_flyway; then
            success=true
            break
        fi
        echo "⏳ Falha na tentativa $attempt. Aguardando 5s..."
        sleep 5
        attempt=$((attempt + 1))
    done

    if [ "$success" = false ]; then
        echo "❌ ERRO: Falha definitiva na conexão com o banco."
        exit 1
    fi
    echo "✅ Migrações concluídas."
fi

# 2. Iniciar Aplicação
echo "=== Iniciando CeialMilk Application ==="
export SPRING_R2DBC_URL="r2dbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}?sslMode=require"
export SPRING_R2DBC_USERNAME="${DB_USERNAME}"
export SPRING_R2DBC_PASSWORD="${DB_PASSWORD}"

exec java -jar app.jar
