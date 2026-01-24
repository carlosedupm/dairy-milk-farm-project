#!/usr/bin/env sh
# Roda Flyway contra o PostgreSQL do Render (URL externa).
# Use quando Flyway no container falhar com EOFException.
#
# 1. Render Dashboard → ceialmilk-db → Connect → External → copiar "External Database URL"
# 2. export RENDER_EXTERNAL_DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/DATABASE'
# 3. ./scripts/flyway-migrate-render.sh

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="$ROOT/src/main/resources/db/migration"
[ ! -d "$MIGRATIONS_DIR" ] && echo "❌ Diretório de migrações não encontrado: $MIGRATIONS_DIR" && exit 1

URL="${RENDER_EXTERNAL_DATABASE_URL:?Defina RENDER_EXTERNAL_DATABASE_URL (External Database URL do Render)}"
# Aceita postgresql:// ou r2dbc:postgresql://
URL="${URL#*://}"

userinfo="${URL%%@*}"
rest="${URL#*@}"
[ "$rest" = "$URL" ] && echo "❌ RENDER_EXTERNAL_DATABASE_URL inválido" && exit 1

DB_USER="${userinfo%%:*}"
DB_PASS="${userinfo#*:}"
[ "$DB_PASS" = "$userinfo" ] && DB_PASS=""

hostport="${rest%%/*}"
DB_NAME="${rest#*/}"
DB_NAME="${DB_NAME%%\?*}"

DB_PORT="${hostport##*:}"
[ "$DB_PORT" = "$hostport" ] && DB_PORT="5432"
DB_HOST="${hostport%:*}"

# Garantir host externo (com domínio)
case "$DB_HOST" in
  *.*) ;;
  *)   DB_HOST="${DB_HOST}.oregon-postgres.render.com" ;;
esac

JDBC="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require&ssl=true"

echo "=== Flyway migração (Render, URL externa) ==="
echo "Host: $DB_HOST | DB: $DB_NAME | User: $DB_USER"
echo ""

docker run --rm \
  -v "$ROOT/src/main/resources/db/migration:/flyway/sql" \
  flyway/flyway:10-alpine \
  -url="$JDBC" \
  -user="$DB_USER" \
  -password="$DB_PASS" \
  -locations=filesystem:/flyway/sql \
  -baselineOnMigrate=true \
  -baselineVersion=1 \
  migrate

echo ""
echo "✅ Migrações aplicadas. Faça deploy no Render com SKIP_FLYWAY_MIGRATE=true."
