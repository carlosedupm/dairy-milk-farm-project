# 📋 Project Brief - CeialMilk

## 🎯 Objetivo Principal

Desenvolver um sistema de gestão para **fazendas leiteiras** que acompanhe o **ciclo de vida de cada animal no rebanho** — da entrada ou nascimento à produção, reprodução, saúde do leite e saída — com **informação sincronizada** entre operação de campo, gestão da fazenda e documentação de requisitos.

A stack **Go + Next.js** serve esse objetivo de negócio: performance, deploy simples e base para assistente e alertas futuros. O produto **não** é um conjunto de CRUDs isolados; é uma plataforma em que **cada evento no curral atualiza o estado coerente da vaca** e fica visível para quem decide.

## 🧭 Norte do produto (2026)

| Princípio | Significado |
|-----------|-------------|
| **Centrado no animal** | A ficha da vaca é o hub: histórico reprodutivo, lactação, produção, restrições e próximas ações — não apenas listas por módulo. |
| **Ciclo contínuo** | Cio → cobertura → toque → gestação → secagem → parto → lactação → produção → nova cobertura, com regras no servidor e UX que guiam a ordem correta. |
| **Sincronização tripla** | Código, comportamento em produção e **`docs/business/`** (requisitos com IDs `BR-*`) evoluem **no mesmo ciclo de entrega**. |
| **Dia a dia no curral** | Mobile-first, busca por identificação, registro rápido (leite, restrições, eventos reprodutivos) conforme perfil. |
| **Visibilidade gerencial** | Dashboard e alertas (partos previstos, prenhes, restrições, produção) para titular e gerente — não só cadastros. |

**Referência de requisitos transversais:** [docs/business/ciclo-rebanho.md](../docs/business/ciclo-rebanho.md).

## 🎯 Objetivos Específicos

### **Ciclo do rebanho leiteiro** (prioridade de produto)

- Gestão **individualizada** por animal, com linhagem (mãe, origem NASCIDO/COMPRADO) e evolução de categoria.
- **Gestão reprodutiva** integrada: cios, coberturas, toques, gestações, partos, crias no rebanho, secagens e lactações.
- **Produção de leite** por animal, alinhada à lactação ativa quando aplicável.
- **Qualidade operacional do leite**: restrições de descarte / laboratório vinculadas à vaca em lactação.
- **Consistência de estado**: `status_reprodutivo`, lactação aberta/fechada e gestação confirmada derivados dos eventos (ver lacunas em `ciclo-rebanho.md`).

### **Operação da fazenda** (complementar)

- Equipe: escala de **folgas 5x1** por fazenda.
- **Lotes** e movimentação de animais.
- **Agricultura**: custos, safras e resultado (domínio separado, mesma conta/fazenda).

### **Controle de saúde** (roadmap)

- Hoje: `status_saude` no cadastro do animal.
- Planejado: vacinas, tratamentos e histórico veterinário (módulo dedicado).

### **Performance técnica**

- API REST Go (Gin); tempos de resposta &lt; 200 ms (meta 95% das requisições).
- Frontend Next.js responsivo; PWA instalável.
- Observabilidade (logs estruturados, Sentry, Prometheus).

### **Acessibilidade e deploy**

- Stack open source; deploy Render + Vercel.
- **Conectividade rural**: PWA e UI tolerante a latência; **offline-first completo** permanece objetivo de médio prazo (não entregue como promessa atual).

### **Experiência do usuário**

- Interface para trabalhadores rurais (zoom/reflow documentados em `systemPatterns.md`).
- Assistente virtual (perfis com acesso) para consultas e comandos; evolução por capacidades para `FUNCIONARIO`.
- Relatórios e alertas reprodutivos/produção — **em construção** (prioridade pós-consolidação do ciclo).

## 👥 Público-Alvo

### **Fazendas leiteiras**

- **Pequenas** (10–50 animais): foco principal.
- **Médias** (50–200): expansão natural.
- **Grandes** (200+): customizações e integrações futuras.

### **Perfis de usuário** (técnicos no sistema)

| Papel na fazenda | Perfil(is) | Expectativa no produto |
|------------------|------------|-------------------------|
| Titular | `PROPRIETARIO` | Visão da exploração, cadastro de fazenda, gestão completa nas fazendas vinculadas |
| Gerente | `GERENTE`, `GESTAO` | Operação, equipe, folgas, reprodução e indicadores |
| Campo / ordenha | `FUNCIONARIO` | Curral: busca, restrições de leite, eventos reprodutivos permitidos; **revisão de escopo** (produção e toques) — ver `acessos-perfil.md` |
| Plataforma | `ADMIN`, `DEVELOPER` | Provisão de contas e fazendas |
| Pré-provisão | `USER` | Onboarding até vínculo e perfil operacional |

## 📊 Métricas de Sucesso

### **Negócio (1º ano)**

- Redução de **erros de registro** (animal errado, gestação desatualizada, leite de vaca restrita).
- **Adoção diária** no curral (busca + produção + eventos reprodutivos por perfil).
- **Tempo até decisão** (ex.: lista de partos previstos e prenhes acessível em &lt; 2 cliques na home).

### **Técnicas (1º ano)**

- &lt; 200 ms response time (95%); 99,9% uptime; suporte a 1000+ utilizadores simultâneos.
- **100%** das mudanças de comportamento de produto com regra correspondente em `docs/business/`.

### **Operacionais (aspiracionais)**

- +30% eficiência administrativa; +15% produção via insights; -20% custos de saúde — dependentes de módulos ainda em roadmap.

## 🚀 Fases de Desenvolvimento

### **Fase 1 — Fundação e módulos (concluída em grande parte)**

- [x] Autenticação JWT, fazendas, vínculo usuário–fazenda, RBAC por perfil
- [x] CRUD animais, produção de leite, lotes
- [x] Gestão pecuária: cios, coberturas, toques, gestações, partos (+ crias), secagens, lactações
- [x] Restrições de leite (laboratório); busca contextual na home
- [x] Folgas 5x1; módulo agrícola (estrutura)
- [x] Deploy produção (Render + Vercel); catálogo `docs/business/` iniciado

### **Fase 2 — Ciclo integrado e gestão visível** *(concluída — 2026-05-20)*

- [x] **Ficha do animal** com timeline e estado (lactação, gestação, próximas ações)
- [x] **Invariantes de ciclo** no servidor (ex.: secagem encerra lactação; uma lactação ativa por animal)
- [x] **Fluxos encadeados** na UI (cobertura → toque → parto com `gestacao_id`)
- [x] **Dashboard pecuário**: partos previstos, prenhes, restrições, produção do período
- [x] **Perfis de campo** alinhados à ordenha e diagnóstico (`FUNCIONARIO` POST toques/produção — BR-ACESSO-015)
- [x] **Catálogo de negócio** completo para partos, lactações, gestações, toques, secagens, produção
- [x] **BR-CICLO-002** (cio / toque negativo → status) + **auditoria** (`docs/business/auditoria.md`, migration 23)
- [x] Regressão integrada ciclo (checklist) + UI conformidade + «Registado por»
- [ ] Recuperação de senha (adiado — aguarda SMTP)
- [x] **API de integrações M2M** (toques pós-vet, busca animal, coberturas; admin `/admin/integracoes`; OpenAPI/Swagger em `/api/v1/integracoes/docs`) — ver `docs/business/integracoes.md`

### **Fase 3 — Saúde, inteligência e escala**

- [ ] Módulo saúde (vacinas, tratamentos)
- [ ] Alertas automáticos reprodutivos e de produção
- [ ] Assistente por capacidades; gráficos e exportações
- [ ] Offline-first onde tecnicamente viável
- [ ] IoT; **escopos M2M adicionais** (produção, partos, webhooks) — backlog

## ✅ Definição de pronto (DoD) para entregas de produto

1. Comportamento implementado e testável (API + UI quando aplicável).
2. Regra(s) em **`docs/business/`** com ID estável, estado **implementado | parcial | planejado**.
3. Atualização de **`memory-bank/activeContext.md`** e **`progress.md`** se mudar foco ou marco.
4. Alinhamento **`appAccess.ts`** ↔ **`perfil_access.go`** se mudar permissões.
5. Atualização de **[ciclo-rebanho.md](../docs/business/ciclo-rebanho.md)** se afetar o fluxo transversal do animal.

## 💡 Diferenciais Competitivos

- **Especialização leiteira** com ciclo reprodutivo + leite no mesmo sistema.
- **Stack moderna** (Go + Next.js) e custo de entrada baixo.
- **Regras versionadas** (`BR-*`) — rastreabilidade negócio ↔ código.
- **Realidade brasileira** (perfis, folgas, fluxo de laboratório do leite).

## 📅 Timeline (orientativa)

| Período | Entrega alvo |
|---------|----------------|
| **Q2 2026** | Fase 2 concluída; integrações M2M v1; validar checklist + integrador em staging |
| **Q3 2026** | Fase 3: saúde animal mínimo + alertas; recuperação de senha (após SMTP) |
| **Q4 2026+** | Inteligência, offline, ecossistema |

---

**Última atualização**: 2026-05-21  
**Versão do Brief**: 3.2 (integrações M2M v1 entregue; Fase 3 saúde/alertas)
