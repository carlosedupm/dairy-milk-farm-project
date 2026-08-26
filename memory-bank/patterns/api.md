# Padrões de API

**RESTful Design**

- **Resources**: Entidades como recursos (`/api/v1/fazendas`, `/api/v1/animais`)
- **Sub-recursos de ação**: operações de domínio que não são CRUD genérico usam rotas dedicadas — ex.: `POST /api/v1/animais/:id/baixa` e `POST .../baixa/reverter` (`AnimalBaixaService`, transação única espelhando `SecagemService`). Campos de saída (`data_saida`, `motivo_saida`, `observacao_saida`) **não** vão no `PUT` genérico do animal.
- **Sub-recursos de domínio (CRUD contextual)**: quando o dado pertence intrinsecamente ao animal, usar sub-recurso em `/api/v1/animais/:id/*` (ex.: saúde animal em `/saude`) com validação de acesso via fazenda do animal e guarda de rebanho no service.
- **Filtro operacional em listagem**: query `rebanho=ativos|baixa|todos` (alias `no_rebanho` boolean) em `GET /api/v1/animais` — default **ativos** = `(data_saida IS NULL OR data_saida > CURRENT_DATE)`; busca por identificação e M2M seguem o mesmo critério por defeito.
- **Guarda transversal**: `EnsureAnimalNoRebanho` nos services de ciclo/produção → HTTP 400 com `ANIMAL_FORA_REBANHO`.
- **Conformidade (auditoria + preventiva)**: `ConformidadeService` — INT-001 a INT-006 com `repository.SQLNoRebanhoFor("a")` (painel, BR-AUDIT-009); INT-007 pós-baixa. **Escrita**: `ciclo_integridade.go` + `RespondIfIntegridadeCiclo` bloqueiam novas violações (BR-AUDIT-010) — produção na data (INT-002), PRENHE com gestação (INT-005), parto encerra lactação antes da nova (INT-001), toque+/restrição/baixa já cobertos nos respetivos services.
- **HTTP Verbs**: GET, POST, PUT, DELETE, PATCH
- **Status Codes**: Uso apropriado de códigos HTTP (200, 201, 400, 401, 404, 500)
- **JSON**: Formato padrão de request/response

### **Versioning**

- **URL Path**: `/api/v1/{recurso}`
- **Backward Compatibility**: Mantida por pelo menos 1 versão

### **Response Format**

- **Escopo**: padrão oficial para respostas de sucesso das rotas de domínio (`/api/auth/*` e `/api/v1/*`) via `internal/response`.
- **Exceções técnicas documentadas**: `GET /health` e fallback degradado de `/api/*` em `cmd/api/main.go` usam payload técnico simplificado (fora do envelope `data/message/timestamp`) por objetivo operacional.

```json
{
  "data": { ... },
  "message": "Success",
  "timestamp": "2026-01-24T10:00:00Z"
}
```

### **Error Response Format**

- **Escopo**: padrão oficial para erros das rotas de domínio (`/api/auth/*` e `/api/v1/*`) via `internal/response`.
- **Exceções técnicas documentadas**: `GET /health` e fallback degradado de `/api/*` em `cmd/api/main.go` seguem payload técnico simplificado para diagnóstico de disponibilidade.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { ... }
  },
  "timestamp": "2026-01-24T10:00:00Z"
}
```

# Referência de rotas e serviços auxiliares

**Rotas API (referência)**:

- `POST /api/auth/login|logout|refresh|validate`
- `GET|POST|PUT|DELETE /api/v1/fazendas` (+ /count, /exists, /search/by-\*)
- `GET|POST /api/v1/fazendas/:id/fornecedores` + `GET|PUT|DELETE /api/v1/fornecedores/:id`
- `GET|POST /api/v1/fazendas/:id/areas` + `GET|PUT|DELETE /api/v1/areas/:id`
- `GET|POST /api/v1/areas/:id/analises-solo`
- `GET /api/v1/areas/:id/safras/:ano` + `POST|GET|PUT|DELETE /api/v1/safras-culturas`
- `GET|POST /api/v1/safras-culturas/:id/custos|producoes|receitas`
- `GET /api/v1/areas/:id/resultado/:ano` + `GET /api/v1/fazendas/:id/resultado-agricola/:ano`
- `GET /api/v1/fazendas/:id/fornecedores/comparativo/:ano`
- `GET /api/v1/fazendas/:id/usuarios-vinculados` (usuários com vínculo N:N à fazenda; acesso: vínculo ou gestão/admin/dev via `ValidateFazendaAccessOrGestao`)
- `GET|PUT /api/v1/fazendas/:id/folgas/config` | `GET /api/v1/fazendas/:id/folgas/escala` (resposta: `linhas` + `rodizio_por_dia` por data) | `GET /api/v1/fazendas/:id/folgas/resumo-equidade?inicio&fim` (GESTAO/ADMIN/DEVELOPER: registradas vs previstas do 5x1 por slot) | `POST /api/v1/fazendas/:id/folgas/gerar` | `POST /api/v1/fazendas/:id/folgas/alteracoes` | `POST /api/v1/fazendas/:id/folgas/justificativas` | `GET /api/v1/fazendas/:id/folgas/alteracoes` | `GET /api/v1/fazendas/:id/folgas/alertas`
- `GET|POST|PUT|DELETE /api/v1/producao` (+ `GET /count`, `GET /filter/by-date?start&end&fazenda_id&lactacao_id`) — listagens filtradas pelas fazendas do usuário; query `fazenda_id` opcional restringe a uma fazenda vinculada; `lactacao_id` opcional filtra registos vinculados à lactação (valida acesso à fazenda da lactação)
- `GET /api/v1/animais/:id/producao` (+ `/count`, `/resumo`) — histórico e resumo por animal; resposta inclui `lactacao_id`; UI agrupada em `/animais/:id/producao`; `POST /api/v1/producao` preenche `lactacao_id` automaticamente (ver `docs/business/producao-leite.md` BR-PRODUCAO-006)
- `GET|POST /api/v1/animais/:id/saude` + `GET|PUT|DELETE /api/v1/animais/:id/saude/:saudeId` — CRUD de saúde animal por sub-recurso; create/update/delete recalculam `animais.status_saude` com base nos casos ativos (`EM_TRATAMENTO` > `DOENTE` > `SAUDAVEL`)
- `GET /api/v1/animais/:id/contexto` — estado atual, gestação, lactação, restrição, `tratamentos_ativos[]` (TRATAMENTO/CIRURGIA ATIVOS), `animal.status_saude`, próximas ações (sem timeline)
- `GET /api/v1/animais/:id/timeline?limit=&offset=&tipo=` — histórico paginado (`todos|ciclo|saude|alertas|vacinas`); resposta `{ timeline, total }`
- `GET|POST /api/v1/animais/:id/vacinas` + `GET|PUT|DELETE /api/v1/animais/:id/vacinas/:vacinaId` + `PATCH .../:vacinaId/aplicar` — calendário de vacinação (BRF-001, BR-SAUDE-007–011); status derivado (`PREVISTA|APLICADA|ATRASADA|REFORCO_VENCIDO`); aplicar → auto-resolve alertas + caso PREVENTIVO em `animal_saude` (`vacina_id`); FUNCIONARIO: GET + POST aplicada + PATCH aplicar (agendar/PUT/DELETE → 403, BR-ACESSO-022)
- `GET /api/v1/fazendas/:id/animais/em-lactacao` (animais com lactação ativa; mesma autorização que listagem por fazenda)
- `GET /api/v1/fazendas/:id/animais/para-cobertura` | `para-toque` | `para-parto` | `para-abertura-lactacao` — listagens de elegibilidade por marco do ciclo (BR-CICLO-015); `AnimalSelect` com `cicloContext` no frontend
- `GET /api/v1/fazendas/:id/restricoes-leite/ativas` | `POST /api/v1/fazendas/:id/restricoes-leite` | `PATCH /api/v1/fazendas/:id/restricoes-leite/:restricaoId/liberar` (descarte até laboratório; ver `docs/business/leite-restricoes.md`)
- `GET /api/v1/dev-studio/usage` | `POST /api/v1/dev-studio/chat|refine|validate|implement` | `GET /history|/status/:id`

**Dev Studio – contexto da IA**:

- **Contexto tipo Cursor**: `loadTargetFilesForPrompt` infere arquivos-alvo (menu, Header, rota, link, dev-studio) e inclui o **estado atual** no contexto. Instruções no prompt: usar como base, preservar o resto; trabalhar como IDE.
- **Contexto do repositório**: Com `GITHUB_TOKEN` + `GITHUB_REPO` configurados, exemplos de código e arquivos-alvo vêm sempre da **branch de produção** (`GITHUB_CONTEXT_BRANCH`, default `main`) via `GitHubService.GetFileContent`. Fallback para disco local quando GitHub não está configurado.

**Assistente Virtual Multimodal Live**:
- **Acesso (UI)**: **FAB (botão flutuante)** fixo no canto inferior direito (`AssistenteFab`), visível apenas em rotas autenticadas; um toque abre o modal. O assistente **não fica no Header**; estado em `AssistenteContext`; modal em `AssistenteDialog` renderizado no layout (ConditionalHeader).
- **Arquitetura**: Streaming bidirecional via WebSocket (`/api/v1/assistente/live`).
- **Backend**: Proxy entre Frontend e Gemini API; Function Calling para acesso ao banco (`assistente_live_service.go` → services de domínio); controle de turno ativo por sessão (`BeginTurn`, `InterruptTurn`, `FinishTurn`) com contexto cancelável para barge-in real. Processa mensagens de texto `{ "text": "..." }` e sinal de interrupção `{ "type": "interrupt" }`; áudio bruto não é utilizado. Escritas no WebSocket são condicionadas ao turno ativo (`WriteWSJSONForTurn`/`WriteWSMessageForTurn`) para bloquear respostas antigas. Em falha (Gemini/rede), envia `{"type": "error", "content": "<mensagem amigável>"}`. **CheckOrigin**: em produção usa `CORS_ORIGIN`; em dev (localhost) aceita qualquer origem.
- **Function Calling (Live)**: tools em `getFunctionDeclarations()`; execução em `ExecuteFunction(ctx, call, userID, perfil, fazendaAtivaID)`. Domínios: fazendas, animais, produção, ciclo reprodutivo, lotes, **saúde** (`consultar_saude`, `registrar_saude` → `AnimalSaudeService`), **alertas** (`listar_alertas`, `resolver_alerta` → `AlertaService` + RBAC BR-ALERTA-007 via `perfil`). Animais identificados por `identificacao` (string falada). Sem tools de exclusão de saúde/alertas. Público: GERENTE+ (`FUNCIONARIO` bloqueado na API/UI).
- **Frontend**: Hook `useGeminiLive` abre o WebSocket, envia `interrupt` antes de novos comandos no Live, trata reconexão com backoff (1s, 2s, 4s, máx. 3 tentativas), offline (`navigator.onLine` + eventos `online`/`offline`) e reconexão ao voltar à aba (`visibilitychange`). Callbacks `onReconnecting`/`onReconnected` para feedback em texto; tratamento de `type: "error"` para exibir e falar mensagem amigável.
- **Compatibilidade**: Funciona em qualquer navegador com WebSocket (incluindo mobile). Voz quando há `SpeechRecognition`/`webkitSpeechRecognition`; TTS quando há `speechSynthesis`. Fallback gracioso para texto quando voz não está disponível.
- **Contexto**: Injeção automática de `user_id` e `fazenda_id` (ativa) na inicialização da sessão.
- **Exibição da resposta (modo Live)**: Texto exibido como texto puro (`whitespace-pre-wrap`), sem interpretação de markdown (sem negrito a partir de `*`), para que o usuário não precise "falar" asterisco e TTS/visual permaneçam consistentes. Implementação: `AssistenteInput.tsx` — `<p className="text-foreground whitespace-pre-wrap">` em vez de ReactMarkdown.
- **Formato de resposta (API)**: O system instruction do Assistente Live e o prompt do endpoint interpretar instruem o modelo a responder em texto puro, sem markdown e sem asteriscos (*), para exibição e TTS consistentes.
- **UX uso sem fone**: Fala do usuário é prioridade. Barge-in no frontend ocorre em dois níveis: detecção precoce de fala (interim) para cortar TTS rapidamente e envio final do texto reconhecido. Anti-eco usa `isEchoTranscript` + `ECHO_PHRASES`, janela pós-TTS maior no mobile e reabertura inteligente do microfone no Live (respeitando fim do TTS/janela anti-eco). Prewarm de microfone usa `echoCancellation`, `noiseSuppression` e `autoGainControl`. UI mantém dicas: "Pode falar agora" e mensagem para uso com alto-falante.
