#!/bin/bash
set -e

# Função para extrair dados da DATABASE_URL
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

echo "=== Iniciando processo de deploy ==="

if [ -n "$DATABASE_URL" ]; then
    parse_database_url "$DATABASE_URL"
    # Host externo: Render não resolve host interno (DNS) no container; externo evita UnknownHostException
    if [[ ! "$DB_HOST" == *"."* ]]; then
        DB_HOST="${DB_HOST}${DB_HOST_SUFFIX:-.oregon-postgres.render.com}"
    fi
    echo "Host de conexão: $DB_HOST"
else
    echo "❌ ERRO: DATABASE_URL não encontrada."
    exit 1
fi

# Flyway no container falha no Render (internal=UnknownHost, external=EOFException).
# Só roda se RUN_FLYWAY_IN_CONTAINER=true (opt-in). Padrão: pular migrações.
if [ "$RUN_FLYWAY_IN_CONTAINER" = "true" ]; then
    echo "=== Executando Flyway CLI (RUN_FLYWAY_IN_CONTAINER=true) ==="
    JDBC="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}?ssl=true&sslmode=require"
    /app/flyway/flyway -url="${JDBC}" -user="${DB_USERNAME}" -password="${DB_PASSWORD}" \
        -locations="filesystem:/app/migrations" -baselineOnMigrate=true -baselineVersion=1 migrate \
        || { echo "❌ Erro nas migrações"; exit 1; }
    echo "✅ Migrações concluídas."
else
    echo "Flyway no container desabilitado (padrão). Rodar migrações com: ./scripts/flyway-migrate-render.sh"
fi

echo "=== Iniciando CeialMilk Application ==="
export SPRING_R2DBC_URL="r2dbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}?sslMode=require"
export SPRING_R2DBC_USERNAME="${DB_USERNAME}"
export SPRING_R2DBC_PASSWORD="${DB_PASSWORD}"

exec java -jar app.jar
