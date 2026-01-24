#!/bin/bash
set -e

# Função robusta para extrair dados da DATABASE_URL
parse_database_url() {
    local url=$1
    url="${url#jdbc:}" # Remove jdbc: se existir
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

echo "=== Iniciando processo de deploy (Resiliência Render) ==="

if [ -n "$DATABASE_URL" ]; then
    parse_database_url "$DATABASE_URL"
    INTERNAL_HOST="$DB_HOST"
    # Prepara host externo como fallback se o atual for curto
    if [[ ! "$DB_HOST" == *"."* ]]; then
        EXTERNAL_HOST="${DB_HOST}${DB_HOST_SUFFIX:-.oregon-postgres.render.com}"
        echo "Host Interno detectado: $INTERNAL_HOST"
        echo "Fallback Externo preparado: $EXTERNAL_HOST"
    else
        EXTERNAL_HOST="$DB_HOST"
        echo "Host completo detectado: $DB_HOST"
    fi
else
    echo "❌ ERRO: DATABASE_URL não encontrada."
    exit 1
fi

run_flyway() {
    local host=$1
    local jdbc="jdbc:postgresql://${host}:${DB_PORT}/${DB_NAME}?sslmode=require"
    echo "--- Tentativa Flyway com Host: $host ---"
    
    /app/flyway/flyway \
        -url="${jdbc}" \
        -user="${DB_USERNAME}" \
        -password="${DB_PASSWORD}" \
        -locations="filesystem:/app/migrations" \
        -baselineOnMigrate=true \
        -baselineVersion=1 \
        migrate
}

# 1. Executar Migrações com Retries e Fallback
if [ "$SKIP_FLYWAY_MIGRATE" = "true" ]; then
    echo "SKIP_FLYWAY_MIGRATE=true: pulando migrações."
else
    echo "=== Executando Flyway CLI (com retries e fallback) ==="
    max_attempts=15
    attempt=1
    success=false
    
    while [ $attempt -le $max_attempts ]; do
        echo "Tentativa $attempt/$max_attempts..."
        
        # Tenta Host Interno primeiro
        if run_flyway "$INTERNAL_HOST"; then
            DB_HOST="$INTERNAL_HOST"
            success=true
            break
        fi
        
        # Se falhou e temos host externo diferente, tenta externo imediatamente
        if [[ "$INTERNAL_HOST" != "$EXTERNAL_HOST" ]]; then
            echo "Host interno falhou; tentando fallback externo..."
            if run_flyway "$EXTERNAL_HOST"; then
                DB_HOST="$EXTERNAL_HOST"
                success=true
                break
            fi
        fi
        
        echo "⏳ Falha na tentativa $attempt. Aguardando 10s para próxima tentativa (DNS/Banco iniciando)..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    if [ "$success" = false ]; then
        echo "❌ ERRO: Não foi possível conectar ao banco após $max_attempts tentativas."
        exit 1
    fi
    echo "✅ Migrações concluídas com sucesso usando host: $DB_HOST"
fi

# 2. Iniciar Aplicação
echo "=== Iniciando CeialMilk Application ==="
# Configurar R2DBC para a aplicação
export SPRING_R2DBC_URL="r2dbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}?sslMode=require"
export SPRING_R2DBC_USERNAME="${DB_USERNAME}"
export SPRING_R2DBC_PASSWORD="${DB_PASSWORD}"

exec java -jar app.jar
