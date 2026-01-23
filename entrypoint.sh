#!/bin/sh
set -e

echo "=== Iniciando processo de deploy ==="

# Extrai host, port, database, user, password de DATABASE_URL
# Formatos: postgresql://user:pass@host:port/db ou r2dbc:postgresql://user:pass@host:port/db
parse_database_url() {
    local url="$1"
    [ -z "$url" ] && return 1

    # Remove apenas o prefixo do protocolo (até :// inclusive)
    url="${url#*://}"

    # user:password@host:port/database ou user:password@host/database
    local userinfo="${url%%@*}"
    local hostportdb="${url#*@}"
    [ "$hostportdb" = "$url" ] && return 1

    # password pode conter ':', usar apenas primeira ocorrência para user
    DB_USERNAME="${userinfo%%:*}"
    DB_PASSWORD="${userinfo#*:}"
    [ "$DB_PASSWORD" = "$userinfo" ] && DB_PASSWORD=""

    # host:port/database
    local db_part="${hostportdb#*/}"
    db_part="${db_part%%\?*}"   # remove ?params
    DB_NAME="$db_part"

    local hostport="${hostportdb%%/*}"
    DB_PORT="${hostport##*:}"
    if [ "$DB_PORT" = "$hostport" ]; then
        DB_PORT="5432"
    fi
    DB_HOST="${hostport%:*}"

    # CRÍTICO: Render internal URL usa host curto (ex: dpg-xxx-a) que causa UnknownHostException.
    # Se host não tem ponto, usar hostname completo (external-style).
    case "$DB_HOST" in
        *.*) ;;
        *)
            # Host curto - sufixo padrão Render Oregon; override com DB_HOST_SUFFIX se definir
            DB_HOST="${DB_HOST}${DB_HOST_SUFFIX:-.oregon-postgres.render.com}"
            echo "Host curto detectado; usando host completo: $DB_HOST"
            ;;
    esac

    export DB_HOST DB_PORT DB_NAME DB_USERNAME DB_PASSWORD
    return 0
}

# Usar DATABASE_URL se disponível; senão usar DB_* individuais
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
    # Garantir host completo se for curto
    case "$DB_HOST" in
        *.*) ;;
        *) DB_HOST="${DB_HOST}${DB_HOST_SUFFIX:-.oregon-postgres.render.com}"; export DB_HOST;;
    esac
fi

# Função para aguardar banco estar pronto
wait_for_db() {
    echo "Aguardando banco de dados estar pronto..."
    max_attempts=60
    attempt=1

    while [ $attempt -le $max_attempts ]; do
        if command -v pg_isready > /dev/null 2>&1; then
            if pg_isready -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" > /dev/null 2>&1; then
                echo "✅ Banco de dados está pronto!"
                return 0
            fi
        elif command -v nc > /dev/null 2>&1; then
            if nc -z "${DB_HOST}" "${DB_PORT:-5432}" > /dev/null 2>&1; then
                echo "✅ Banco de dados está acessível (porta aberta)"
                sleep 2
                return 0
            fi
        else
            if (echo > "/dev/tcp/${DB_HOST}/${DB_PORT:-5432}") 2>/dev/null; then
                echo "✅ Banco de dados está acessível (porta aberta)"
                sleep 2
                return 0
            fi
        fi

        echo "⏳ Tentativa $attempt/$max_attempts - Aguardando banco de dados (host=$DB_HOST)..."
        sleep 1
        attempt=$((attempt + 1))
    done

    echo "❌ ERRO: Banco de dados não está acessível após $max_attempts segundos"
    echo "Host: ${DB_HOST}"
    echo "Porta: ${DB_PORT:-5432}"
    exit 1
}

# Função para executar migrações Flyway
run_migrations() {
    echo "=== Executando migrações Flyway ==="

    JDBC_URL="jdbc:postgresql://${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}?sslmode=require&ssl=true&sslfactory=org.postgresql.ssl.NonValidatingFactory&connectTimeout=10&socketTimeout=30"

    echo "Executando Flyway CLI..."
    echo "Host: ${DB_HOST}"
    echo "Porta: ${DB_PORT:-5432}"
    echo "Database: ${DB_NAME}"
    echo "User: ${DB_USERNAME}"

    flyway \
        -url="${JDBC_URL}" \
        -user="${DB_USERNAME}" \
        -password="${DB_PASSWORD}" \
        -locations="filesystem:/app/migrations" \
        -baselineOnMigrate=true \
        -baselineVersion=1 \
        migrate

    if [ $? -eq 0 ]; then
        echo "✅ Migrações executadas com sucesso!"
    else
        echo "❌ ERRO: Falha ao executar migrações Flyway"
        exit 1
    fi
}

start_app() {
    echo "=== Iniciando aplicação Spring Boot ==="
    exec java \
        -Dspring.profiles.active=prod \
        -jar /app/app.jar
}

echo "Iniciando processo de deploy..."
wait_for_db
run_migrations
start_app
