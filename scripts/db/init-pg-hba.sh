#!/bin/bash
# Permite conexões da rede Docker (devcontainer) sem SSL.
# Executado pelo Postgres em /docker-entrypoint-initdb.d/ apenas na primeira inicialização.
set -e
echo "host all all 0.0.0.0/0 md5" >> "$PGDATA/pg_hba.conf"
