#!/bin/bash
# Corrige pg_hba no Postgres em execução para aceitar conexões do devcontainer.
# Rodar no HOST (fora do devcontainer), na raiz do projeto.
set -e
cd "$(dirname "$0")/.."
echo "Ajustando pg_hba no container ceialmilk-db..."
docker exec ceialmilk-db sh -c 'echo "host all all 0.0.0.0/0 md5" >> /var/lib/postgresql/data/pgdata/pg_hba.conf && psql -U ceialmilk -d postgres -c "SELECT pg_reload_conf();"'
echo "Feito. Reinicie o backend (cd backend && go run ./cmd/api) e teste o Login no Postman."
