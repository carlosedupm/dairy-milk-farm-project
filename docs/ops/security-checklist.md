# Checklist de Segurança Pré-Deploy — CeialMilk

Passar por este checklist antes de promover mudanças significativas para produção.

## Código

- [ ] Nenhum secret/credencial no diff (`git diff` revisado; `.env`, chaves, tokens)
- [ ] Endpoints novos validam vínculo do usuário com a fazenda (`ResolveFazendaIDsForList` / `ValidateFazendaAccess`)
- [ ] Funções novas do Assistente (texto e Live) usam resolvers com validação de tenant (`resolveAnimalForAssistente`, `resolveFazendaIDForUser`)
- [ ] Respostas de erro não vazam internals (usar `response.ErrorInternal` — detalhes vão só para log)
- [ ] Inputs validados nos handlers (binding tags) e regras de domínio nos services
- [ ] Redirects no frontend passam por `isSafeInternalPath`

## Dependências e CI

- [ ] CI verde: `golangci-lint`, `govulncheck`, `go test`, `npm audit --audit-level=high`, `test:unit`, `typecheck`, builds
- [ ] CodeQL sem novos alertas críticos
- [ ] Dependabot: só merge de PRs patch/minor (ou Actions) com CI verde; majors fechados/ignorados — ver `deploy-notes.md` § Dependabot

## Autenticação e sessão

- [ ] Tokens nunca no corpo JSON (somente cookies HttpOnly)
- [ ] Refresh tokens hasheados no banco; rotação ativa no `/refresh`
- [ ] Rate limits adequados em endpoints de auth novos

## Infra

- [ ] `render.yaml` com `autoDeployTrigger: checksPass`
- [ ] Ruleset `Protect main` ativo (mínimo: block force push + restrict deletions) — ver `memory-bank/deploy-notes.md`
- [ ] *(Opcional / fase posterior)* Ruleset completo: PR obrigatório + status checks do CI — só quando sair do push direto frequente na `main`
- [ ] `METRICS_TOKEN` configurado em produção
- [ ] Migrações testadas localmente (up e down) antes do deploy

## Pós-deploy

- [ ] `GET /health` ok
- [ ] Login + uma rota autenticada funcionando
- [ ] Sentry sem novos erros recorrentes nos primeiros 30 min

**Última atualização**: 2026-06-10
