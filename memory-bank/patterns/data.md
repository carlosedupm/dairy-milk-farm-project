# Padrões de dados

**Modelagem de Domínio**

```go
// Estrutura principal de entidades
Fazenda (1) ─── (N) Animal (1) ─── (N) ProduçãoLeite
Usuario (N) ─── (N) Fazenda  // via tabela usuarios_fazendas (vínculo N:N)
Fazenda (1) ─── (N) Área (1) ─── (N) SafraCultura
SafraCultura (1) ─── (N) CustoAgricola
SafraCultura (1) ─── (N) ProducaoAgricola
SafraCultura (1) ─── (N) ReceitaAgricola
Fazenda (1) ─── (N) Fornecedor (referenciado por custos/receitas)
```

- **Vínculo usuário–fazenda**: Tabela `usuarios_fazendas` (`usuario_id`, `fazenda_id`, **`papel`**: `TITULAR` | `OPERACIONAL`). Um usuário pode ter várias fazendas vinculadas; quando há apenas uma, o sistema a considera automaticamente em formulários e atalhos. **Titularidade de exploração** (para relatórios e regras): filtrar por `papel = TITULAR`; vínculos criados só pelo admin (`PUT .../usuarios/:id/fazendas`) usam **`OPERACIONAL`** no MVP; `POST /me/fazendas` por **PROPRIETARIO** grava **`TITULAR`**.
- **Registo público e vínculo manual**: `POST /api/auth/register` cria utilizador com perfil **`USER`** e **sem** linhas em `usuarios_fazendas`. **Não** há auto-vínculo por “fazenda única” em Register, Login, Validate nem em `POST /api/v1/admin/usuarios` — a provisão é feita por **ADMIN/DEVELOPER** (`PUT /api/v1/admin/usuarios/:id/fazendas` e alteração de `perfil`).
- **Catálogo global de fazendas (API)**: `GET /api/v1/fazendas` (raiz), pesquisas (`/search/*`), `GET /count` e `GET /exists` exigem **`RequireAdmin()`** (ADMIN ou DEVELOPER). Utilizadores não-admin listam apenas **as suas** fazendas via `GET /api/v1/me/fazendas`. Perfil do utilizador logado: `GET /api/v1/me` → `{ id, nome, email, perfil }`.
- **Atribuição de fazendas**: Somente o perfil **ADMIN** (ou DEVELOPER) pode atribuir fazendas a usuários, na tela de administração (editar usuário → seção "Fazendas vinculadas").
- **Perfil não editável**: Na edição de usuário, o campo perfil não pode ser alterado quando o usuário já for ADMIN ou DEVELOPER (somente leitura no frontend e preservação no backend).
- **Módulo agrícola**: domínio separado por safra/cultura para permitir cálculo de resultado agrícola por área/ano e consolidado por fazenda/ano, além de comparativo de fornecedores.

### **Reclassificação automática de categoria (gestão pecuária)**

A categoria do animal (BEZERRA, NOVILHA, MATRIZ, etc.) pode ser atualizada automaticamente por duas regras:

1. **Por primeiro parto**: Ao registrar um parto de uma fêmea com categoria BEZERRA ou NOVILHA, o sistema reclassifica para **MATRIZ** (implementado em `PartoService.Create`).
2. **Por idade (job/endpoint)**: Bezerras com `data_nascimento` preenchida e idade ≥ N meses são reclassificadas para **NOVILHA**. Execução via `POST /api/v1/animais/reclassificar-categoria?meses=12` (parâmetro `meses` opcional; padrão 12). Serviço: `ReclassificacaoCategoriaService.RunReclassificacaoPorIdade`. Animais já com `data_saida` preenchida são ignorados.

Para agendamento periódico (cron), chamar o endpoint acima (ex.: diariamente ou semanalmente) com um job externo ou scheduler.

### **Alertas automáticos (geração diária — Onda 2.2)**

- **Serviço**: `AlertaGeracaoService.GerarAlertasDiarios` — seis regras (tratamento vencido, parto previsto, restrição leite, não-conformidade INT-*, gestação sem secagem, cio do dia).
- **Deduplicação**: `ExistsOpenByFazendaTipoAnimal` + índice parcial `uq_alertas_aberto_tipo_animal` (migration 32).
- **Resolução automática**: `ResolveOpenByAnimal` após concluir tratamento, registrar secagem ou liberar restrição (`AlertaAutoResolver` injetado nos services).
- **Agendamento**: goroutine `RunAlertasCron` no startup (`ALERTAS_CRON_ENABLED`, `ALERTAS_CRON_HOUR`, `ALERTAS_TZ`); disparo manual `POST /api/v1/admin/alertas/gerar` (ADMIN/DEVELOPER).
- **Actor sistema**: `created_by` = utilizador `sistema@interno.ceialmilk` (migration 32); snapshot INT em `alertas_geracao_estado`.
- **Catálogo**: `docs/business/alertas.md` (BR-ALERTA-008 a BR-ALERTA-010).

### **Origem de aquisição (animais)**

O cadastro de animais distingue dois cenários via `origem_aquisicao` (NASCIDO | COMPRADO):

- **NASCIDO**: Animal nascido na propriedade — `data_nascimento` é obrigatória.
- **COMPRADO**: Animal comprado — `data_nascimento` não é obrigatória (muitas vezes desconhecida). Usar `data_entrada` como referência (data de aquisição).

Validação em `AnimalService.Create` e `AnimalService.Update`: para origem NASCIDO, exige `data_nascimento != nil`. Coluna `origem_aquisicao` com DEFAULT 'NASCIDO' para retrocompatibilidade (migration 13).

### **Vinculação do reprodutor em cobertura (monta natural)**

Para coberturas de tipo **MONTA_NATURAL**, o reprodutor (touro/boi) deve ser registrado. O sistema aceita:

- **`touro_animal_id`** (FK para `animais`): vincula diretamente ao animal cadastrado; validações: animal existe, sexo M, categoria TOURO ou BOI, mesma fazenda.
- **`touro_info`** (texto livre): alternativa quando o touro não está cadastrado (ex.: touro de aluguel).

Regras em `CoberturaService.Create` e `Update`: para MONTA_NATURAL, exige pelo menos um de `touro_animal_id` ou `touro_info`. A coluna `touro_animal_id` foi adicionada na migration 14.

Frontend: formulário de nova cobertura exibe `AnimalSelect` (reprodutoresOnly) para MONTA_NATURAL; CoberturaTable exibe coluna "Reprodutor" (identificação do animal ou `touro_info`).

### **Padrões de Acesso a Dados**

- **pgx/v5**: Driver PostgreSQL nativo com type safety e performance otimizada
- **Prepared Statements**: Todas as queries parametrizadas (proteção SQL Injection)
- **Connection Pooling**: Gerenciado pelo `pgxpool.Pool`
- **Transactions**: Suporte nativo para transações

### **Padrões de Migração de Banco de Dados**

- **golang-migrate**: Migrações versionadas em `/backend/migrations`
- **Execução Automática**: Migrações executadas no startup do servidor
- **Versionamento**: Migrações versionadas em formato `{número}_{descrição}.up.sql` e `.down.sql`

