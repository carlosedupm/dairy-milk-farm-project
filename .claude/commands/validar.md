# Validar (gates de merge)

Rode todos os gates que o CI aplica e conserte o que falhar. Não relate sucesso sem ter visto cada comando passar.

```bash
node scripts/validate-br-refs.mjs
node scripts/validate-docs.mjs
cd backend  && go test ./... -count=1 && go build -o /tmp/api ./cmd/api
cd frontend && npm run test:unit && npm run typecheck && npm run lint:ci && npm run validate:tokens
```

Se `golangci-lint` estiver instalado, rode também `cd backend && golangci-lint run` — o CI executa.

Ao final, informe em uma linha por gate: passou ou o que quebrou. Se algo falhar, corrija e rode de novo o comando que falhou antes de seguir.
