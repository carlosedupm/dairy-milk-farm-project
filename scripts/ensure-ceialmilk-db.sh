#!/bin/bash
# Cria o banco ceialmilk no Postgres se não existir. Rodar no HOST, na raiz do projeto.
set -e
cd "$(dirname "$0")/.."
echo "Verificando banco ceialmilk no container ceialmilk-db..."
docker exec ceialmilk-db psql -U ceialmilk -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='ceialmilk'" | grep -q 1 \
  && echo "Banco ceialmilk já existe." \
  || { docker exec ceialmilk-db psql -U ceialmilk -d postgres -c "CREATE DATABASE ceialmilk OWNER ceialmilk;"; echo "Banco ceialmilk criado."; }
echo "Feito. Reinicie o backend (cd backend && go run ./cmd/api) e teste o Login no Postman."
