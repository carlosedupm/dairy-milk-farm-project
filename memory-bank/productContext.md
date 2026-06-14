# 🐄 Product Context - CeialMilk

## 🌍 Contexto do Mercado

### **Problema Identificado**
As fazendas leiteiras brasileiras, especialmente as pequenas e médias, enfrentam desafios significativos na gestão operacional:
- Controle manual de rebanhos usando planilhas ou papel
- **Informação do ciclo da vaca espalhada** (cio num caderno, produção noutro, prenhez na memória do gerente)
- Dificuldade em acompanhar a saúde individual e o **leite descartável** (laboratório / antibiótico)
- Falta de visão para decisão (partos previstos, vacas a secar, produção do período)
- Custo elevado de sistemas de gestão existentes
- Conectividade limitada em áreas rurais

### **Oportunidade**
Criar uma solução acessível e especializada que **siga cada animal no rebanho** — do nascimento ou compra à produção e nova gestação — com dados **consistentes** para o curral e para a gestão, em stack Go + Next.js.

## 🎯 Propósito do Produto

### **Missão**
Transformar a gestão de fazendas leiteiras com tecnologia que **respeita o ciclo real da vaca** e reduz retrabalho administrativo, aumentando eficiência e rentabilidade.

### **Visão**
Ser a plataforma de referência em gestão leiteira no Brasil, na qual **cada fazenda confia na ficha do animal** e nos alertas derivados dos registros de campo.

### **Valores**
- **Acessibilidade**: Tecnologia ao alcance de pequenos produtores
- **Simplicidade**: Curral primeiro; gestão vê o consolidado
- **Integridade**: Um registro, um efeito coerente no estado do animal
- **Rastreabilidade**: Requisitos de negócio (`BR-*`) alinhados ao código
- **Performance**: Resposta rápida em dispositivos móveis

### **Perfis e papéis (produto)**

- **Administrador da plataforma** (`ADMIN` / `DEVELOPER`): provisão de utilizadores, fazendas globais, `/admin`.
- **Titular da exploração** (`PROPRIETARIO`): fazendas vinculadas; pode criar exploração (`POST /api/v1/me/fazendas`).
- **Gerente** (`GERENTE`, `GESTAO`): operação e equipe por fazenda (vínculo obrigatório).
- **Campo** (`FUNCIONARIO`): curral — cios, coberturas, toques, partos, secagens, registo de produção e consulta de animais; ver [acessos-perfil.md](../docs/business/acessos-perfil.md) BR-ACESSO-015.

## 🐄 Ciclo do rebanho (eixo do produto)

O CeialMilk organiza-se em torno do **ciclo da vaca de leite**, não de menus isolados:

| Fase | O que o utilizador precisa | Estado no produto |
|------|----------------------------|-------------------|
| Identificar no curral | Busca por brinco/nome + contexto imediato | ✅ Home + `GET .../contexto` |
| Reproduzir | Cio → cobertura → toque → gestação | ✅ Encadeado (toque positivo + cobertura → PRENHE e gestação na busca/ficha/home) |
| Preparar parto | Secagem, data prevista | ✅ Secagem encerra lactação ativa |
| Parir e lactar | Parto, crias, lactação, produção | ✅ Produção exige lactação ativa |
| Qualidade do leite | Restrição até laboratório | ✅ Painel home |
| Gerir | Prenhes, partos previstos, produção, integridade dos dados | ✅ Resumo pecuário + painel **Conformidade** (gestão) |

Detalhe transversal: **[docs/business/ciclo-rebanho.md](../docs/business/ciclo-rebanho.md)**.

## 👥 Jornada do Usuário

### **Proprietário / Gerente**
1. **Provisão**: Conta e fazenda(s) vinculadas (admin ou fluxo titular).
2. **Visão do rebanho**: Lista/filtros; home com resumo pecuário, restrições de leite e **conformidade dos dados** (anomalias INT-*).
3. **Decisão**: Relatórios e alertas derivados dos registros (não duplicar planilhas).

### **Campo / Ordenhador**
1. **Entrada rápida**: Buscar vaca → ver gestação, restrição de leite, última produção.
2. **Registar**: Produção do dia, restrição de leite, eventos reprodutivos permitidos ao perfil.
3. **Meta**: Mesmo fluxo na ficha da vaca, sem saltar entre oito ecrãs de gestão.

### **Veterinário** *(roadmap)*
1. Histórico de saúde, vacinas e tratamentos por animal.
2. Hoje: apenas `status_saude` no cadastro.

## 🏗️ Arquitetura da Experiência

### **Princípios de Design**
- **Animal-first**: Contexto e ações na ficha e na busca, não só listas globais.
- **Mobile-first**: Curral e folgas; zoom/reflow em `systemPatterns.md`.
- **Progressive disclosure**: Resumo na home; detalhe na ficha.
- **Requisitos explícitos**: Toda política de domínio com ID `BR-*` em `docs/business/`.

### **Fluxos Principais (alvo)**
1. **Onboarding** e provisão (`USER` → perfil operacional).
2. **Busca → contexto → ação** (registar produção, restrição, evento reprodutivo).
3. **Gestão reprodutiva encadeada** (cobertura → toque → parto).
4. **Painel gerencial** (alertas e indicadores da fazenda ativa).

### **Módulos complementares**
- **Folgas 5x1**: [folgas.md](../docs/business/folgas.md)
- **Agricultura**: custos/safras (mesma conta, domínio separado do ciclo da vaca)

## 📊 Métricas de Valor

### **Para o Produtor**
- Menos erros de identificação e de estado reprodutivo desatualizado
- Menos tempo a procurar informação entre cadernos e módulos
- Decisões de secagem/parto e de descarte de leite com dados centralizados

### **Para o Sistema**
- Performance &lt; 200 ms; disponibilidade 99,9%
- Documentação de negócio atualizada em cada entrega de comportamento

## 🔄 Ciclo de Feedback e Documentação

- Feedback de campo prioriza **ficha do animal**, **dashboard pecuário** e **perfis de ordenha**.
- Entregas de produto incluem atualização de `docs/business/` e, se transversal, `ciclo-rebanho.md`.
- Memory bank (`activeContext`, `progress`, `projectbrief`) revisado nos marcos.

## 🌱 Estratégia de Crescimento

### **Fase 1 (0–100 fazendas)**
- Pequenas fazendas; ciclo reprodutivo + leite + folgas; catálogo `BR-*` completo.

### **Fase 2 (100–500 fazendas)**
- Dashboard, saúde animal, alertas automáticos — **entregue em código (2026-06)**.

### **Fase 3 (500+ fazendas)**
- Saúde animal, alertas automáticos, predições; offline avançado.
- **Integrações M2M (parcial — 2026-05-21)**: API dedicada para sistemas/agentes externos (toques pós-vet, busca animal, coberturas); gestão em `/admin/integracoes`; docs OpenAPI em `/api/v1/integracoes/docs`. Escopos e módulos adicionais (produção, webhooks, OAuth) permanecem backlog.

---

**Última atualização**: 2026-06-14  
**Versão do Contexto**: 3.3 (Fase 2 produto alinhada a entregas de saúde/alertas)
