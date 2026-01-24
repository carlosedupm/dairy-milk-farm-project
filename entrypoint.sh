#!/bin/sh
set -e

echo "=== Iniciando processo de deploy ==="

# Extrai host, port, database, user, password de DATABASE_URL
# Formatos: postgresql://user:pass@host:port/db ou r2dbc:postgresql://user:pass@host:port/db
parse_database_url() {
    local url="$1"
    [ -z "$url" ] && return 1

    url="${url#*://}"

    local userinfo="${url%%@*}"
    local hostportdb="${url#*@}"
    [ "$hostportdb" = "$url" ] && return 1

    DB_USERNAME="${userinfo%%:*}"
    DB_PASSWORD="${userinfo#*:}"
    [ "$DB_PASSWORD" = "$userinfo" ] && DB_PASSWORD=""

    local db_part="${hostportdb#*/}"
    db_part="${db_part%%\?*}"
    DB_NAME="$db_part"

    local hostport="${hostportdb%%/*}"
    DB_PORT="${hostport##*:}"
    if [ "$DB_PORT" = "$hostport" ]; then
        DB_PORT="5432"
    fi
    DB_HOST="${hostport%:*}"

    # Render: preferir sempre host INTERNO (curto) na mesma região – evita EOFException com externo.
    # Se DATABASE_URL vier com externo (ex: dpg-xxx-a.oregon-postgres.render.com), forçar interno (dpg-xxx-a).
    # Só usar externo se USE_EXTERNAL_DB_HOST=true.
    case "$DB_HOST" in
        *.oregon-postgres.render.com)
            if [ "${USE_EXTERNAL_DB_HOST}" = "true" ]; then
                echo "USE_EXTERNAL_DB_HOST=true; usando host externo: $DB_HOST"
            else
                DB_HOST="${DB_HOST%.oregon-postgres.render.com}"
                echo "Host externo detectado; forçando interno: $DB_HOST"
            fi
            ;;
        *.frankfurt-postgres.render.com)
            if [ "${USE_EXTERNAL_DB_HOST}" = "true" ]; then
                echo "USE_EXTERNAL_DB_HOST=true; usando host externo: $DB_HOST"
            else
                DB_HOST="${DB_HOST%.frankfurt-postgres.render.com}"
                echo "Host externo detectado; forçando interno: $DB_HOST"
            fi
            ;;
        *)
            if [ "${USE_EXTERNAL_DB_HOST}" = "true" ] && case "$DB_HOST" in *.*) false;; *) true;; esac; then
                DB_HOST="${DB_HOST}${DB_HOST_SUFFIX:-.oregon-postgres.render.com}"
                echo "USE_EXTERNAL_DB_HOST=true; usando host externo: $DB_HOST"
            else
                echo "Usando host da DATABASE_URL (interno): $DB_HOST"
            fi
            ;;
    esac

    export DB_HOST DB_PORT DB_NAME DB_USERNAME DB_PASSWORD
    return 0
}

if [ -n "$DATABASE_URL" ]; then
    echo "Extraindo configuração do DATABASE_URL..."
    if ! parse_database_url "$DATABASE_URL"; then
        echo "❌ ERRO: Não foi possível extrair dados do DATABASE_URL"
        exit 1
    fi
    echo "Host: $DB_HOST | Porta: $DB_PORT | Database: $DB_NAME | User: $DB_USERNAME"
else
    echo "Usando variáveis DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD"
    [ -z "$DB_HOST" ] && echo "❌ DB_HOST não definido" && exit 1
    [ -z "$DB_NAME" ] && echo "❌ DB_NAME não definido" && exit 1
    [ -z "$DB_USERNAME" ] && echo "❌ DB_USERNAME não definido" && exit 1
    [ -z "$DB_PASSWORD" ] && echo "❌ DB_PASSWORD não definido" && exit 1
    case "$DB_HOST" in
        *.oregon-postgres.render.com)
            [ "${USE_EXTERNAL_DB_HOST}" = "true" ] || DB_HOST="${DB_HOST%.oregon-postgres.render.com}"
            ;;
        *.frankfurt-postgres.render.com)
            [ "${USE_EXTERNAL_DB_HOST}" = "true" ] || DB_HOST="${DB_HOST%.frankfurt-postgres.render.com}"
            ;;
        *.*)
            ;;
        *)
            [ "${USE_EXTERNAL_DB_HOST}" = "true" ] && DB_HOST="${DB_HOST}${DB_HOST_SUFFIX:-.oregon-postgres.render.com}"
            ;;
    esac
    export DB_HOST
fi

# Executa Flyway com retries (evita dependência de pg_isready/nc que falham com SSL/rede no Render)
run_migrations_with_retry() {
    echo "=== Executando migrações Flyway (com retry) ==="
    # SSL: só sslmode=require (evitar NonValidatingFactory – pode causar EOFException com Render).
    # loglevel=2 para diagnóstico se falhar.
    JDBC_URL="jdbc:postgresql://${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}?sslmode=require&ssl=true&connectTimeout=30&socketTimeout=60&tcpKeepAlive=true&loglevel=2"

    max_attempts="${FLYWAY_RETRY_ATTEMPTS:-18}"
    retry_sleep="${FLYWAY_RETRY_SLEEP:-10}"
    attempt=1

    echo "Host: ${DB_HOST} | Porta: ${DB_PORT:-5432} | Database: ${DB_NAME} | User: ${DB_USERNAME}"
    echo "Máximo de tentativas: $max_attempts | Intervalo: ${retry_sleep}s"

    echo "Aguardando 10s antes da primeira tentativa (DB pode estar iniciando)..."
    sleep 10

    while [ $attempt -le $max_attempts ]; do
        echo "--- Tentativa $attempt/$max_attempts ---"
        if FLYWAY_HOME=/app/flyway /app/flyway/flyway \
            -url="${JDBC_URL}" \
            -user="${DB_USERNAME}" \
            -password="${DB_PASSWORD}" \
            -locations="filesystem:/app/migrations" \
            -baselineOnMigrate=true \
            -baselineVersion=1 \
            migrate; then
            echo "✅ Migrações executadas com sucesso!"
            return 0
        fi
        if [ $attempt -lt $max_attempts ]; then
            echo "⏳ Falha na tentativa $attempt; aguardando ${retry_sleep}s antes de retry..."
            sleep "$retry_sleep"
        fi
        attempt=$((attempt + 1))
    done

    echo "❌ ERRO: Flyway falhou após $max_attempts tentativas"
    exit 1
}

start_app() {
    echo "=== Iniciando aplicação Spring Boot ==="
    exec java \
        -Dspring.profiles.active=prod \
        -jar /app/app.jar
}

echo "Iniciando processo de deploy..."

if [ "${SKIP_FLYWAY_MIGRATE}" = "true" ]; then
    echo "SKIP_FLYWAY_MIGRATE=true: pulando migrações (rodar Flyway no CI ou manualmente)."
else
    run_migrations_with_retry
fi

start_app
