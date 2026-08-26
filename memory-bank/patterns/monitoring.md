# Monitoramento e sincronização do memory bank

## 📊 Padrões de Monitoramento

### **Observability**

- **Metrics**: Prometheus (implementado) — `internal/middleware/metrics.go`, exposto em `/metrics` e protegido por `METRICS_TOKEN` em produção
- **Tracing**: Distributed tracing com correlation IDs (implementado)
  - Correlation ID gerado automaticamente para cada request
  - Incluído em todos os logs e respostas HTTP (header `X-Correlation-ID`)
- **Logging**: Log aggregation via BetterStack/Logtail
  - Logs estruturados em JSON com correlation IDs
  - Middleware de logging automático para todas as requisições
  - Logs incluem: método, path, status, latency, IP, user agent, correlation ID
- **Health Checks**: Endpoints `/health` para verificação de saúde

### **Alerting Patterns**

- **Error Tracking**: Sentry para captura de erros em tempo real (implementado)
  - Captura automática de panics
  - Captura manual de erros nos handlers com contexto
  - Inclui correlation ID, path, método, user context
- **Threshold-based**: Alertas baseados em thresholds (futuro)
- **Notification Channels**: Email, Slack (futuro)

## Fluxo de sincronização do Memory Bank

Toda alteração de comportamento relevante atualiza a documentação **no mesmo PR**, para evitar drift entre código e memória do projeto.

O roteiro completo (qual arquivo atualizar para cada tipo de mudança, formato de regra `BR-*`, checklist de fechamento) está na skill **`atualizar-documentacao`** — [`.cursor/skills/atualizar-documentacao/SKILL.md`](../../.cursor/skills/atualizar-documentacao/SKILL.md). Não duplicar o checklist aqui.

---

**Versão dos Padrões**: 2.32 (Go + Next.js)

**Última atualização**: 2026-08-25
