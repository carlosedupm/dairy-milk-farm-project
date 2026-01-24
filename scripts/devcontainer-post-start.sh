#!/bin/bash
# Inicia o backend ao abrir o devcontainer. Postgres já está configurado (trust + tmpfs).
set -e
cd /workspace
nohup bash -c "cd backend && go run ./cmd/api" > /tmp/ceialmilk-backend.log 2>&1 &
sleep 3
echo "Backend em http://localhost:8080 — Postman: Login -> Farms. Logs: /tmp/ceialmilk-backend.log"
