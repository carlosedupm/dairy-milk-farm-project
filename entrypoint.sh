#!/bin/sh
set -e

echo "=== Iniciando processo de deploy ==="

# Função para aguardar banco estar pronto
wait_for_db() {
    echo "Aguardando banco de dados estar pronto..."
    max_attempts=60
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        # Tenta conectar ao banco usando psql (se disponível) ou netcat
        if command -v pg_isready > /dev/null 2>&1; then
            if pg_isready -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" > /dev/null 2>&1; then
                echo "✅ Banco de dados está pronto!"
                return 0
            fi
        elif command -v nc > /dev/null 2>&1; then
            if nc -z "${DB_HOST}" "${DB_PORT:-5432}" > /dev/null 2>&1; then
                echo "✅ Banco de dados está acessível (porta aberta)"
                # Aguarda mais um pouco para garantir que está totalmente pronto
                sleep 2
                return 0
            fi
        else
            # Fallback: tenta conexão TCP simples
            if (echo > /dev/tcp/${DB_HOST}/${DB_PORT:-5432}) 2>/dev/null; then
                echo "✅ Banco de dados está acessível (porta aberta)"
                sleep 2
                return 0
            fi
        fi
        
        echo "⏳ Tentativa $attempt/$max_attempts - Aguardando banco de dados..."
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
    
    # Verifica se variáveis necessárias estão presentes
    if [ -z "${DB_HOST}" ] || [ -z "${DB_NAME}" ] || [ -z "${DB_USERNAME}" ] || [ -z "${DB_PASSWORD}" ]; then
        echo "❌ ERRO: Variáveis de ambiente do banco não estão configuradas"
        echo "DB_HOST: ${DB_HOST:-não definido}"
        echo "DB_NAME: ${DB_NAME:-não definido}"
        echo "DB_USERNAME: ${DB_USERNAME:-não definido}"
        echo "DB_PASSWORD: ${DB_PASSWORD:+definido (oculto)}"
        exit 1
    fi
    
    # Constrói URL JDBC
    JDBC_URL="jdbc:postgresql://${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}?sslmode=require&ssl=true&sslfactory=org.postgresql.ssl.NonValidatingFactory&connectTimeout=10&socketTimeout=30"
    
    echo "Executando Flyway CLI..."
    echo "Host: ${DB_HOST}"
    echo "Porta: ${DB_PORT:-5432}"
    echo "Database: ${DB_NAME}"
    echo "User: ${DB_USERNAME}"
    
    # Executa Flyway CLI
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

# Função para iniciar aplicação
start_app() {
    echo "=== Iniciando aplicação Spring Boot ==="
    exec java \
        -Dspring.profiles.active=prod \
        -jar /app/app.jar
}

# Fluxo principal
echo "Iniciando processo de deploy..."
wait_for_db
run_migrations
start_app
