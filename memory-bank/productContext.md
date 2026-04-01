# 🐄 Product Context - CeialMilk

## 🌍 Contexto do Mercado

### **Problema Identificado**
As fazendas leiteiras brasileiras, especialmente as pequenas e médias, enfrentam desafios significativos na gestão operacional:
- Controle manual de rebanhos usando planilhas ou papel
- Dificuldade em acompanhar a saúde individual de cada animal
- Falta de insights sobre produção e eficiência operacional
- Custo elevado de sistemas de gestão existentes
- Conectividade limitada em áreas rurais

### **Oportunidade**
Criar uma solução acessível, especializada e de alta performance para democratizar a tecnologia no agronegócio leiteiro, combinando:
- Baixo custo de entrada (open source)
- Alta performance técnica (stack Go + Next.js)
- Experiência simplificada para usuários não técnicos
- Funcionalidade offline para áreas rurais

## 🎯 Propósito do Produto

### **Missão**
Transformar a gestão de fazendas leiteiras através de tecnologia acessível e especializada, aumentando a eficiência operacional e a rentabilidade dos produtores.

### **Visão**
Ser a plataforma de referência em gestão leiteira no Brasil, atingindo 1.000+ fazendas nos primeiros 2 anos.

### **Valores**
- **Acessibilidade**: Tecnologia ao alcance de todos os produtores
- **Simplicidade**: Interface intuitiva para usuários não técnicos
- **Performance**: Experiência rápida e responsiva
- **Inovação**: Preparado para integração com IA e IoT

## 👥 Jornada do Usuário

### **Proprietário da Fazenda**
1. **Cadastro**: Registro simples da fazenda e dados básicos
2. **Visão Geral**: Dashboard com indicadores-chave (produção, saúde, financeiro)
3. **Relatórios**: Análises automáticas de performance
4. **Decisões**: Insights para melhorar rentabilidade

### **Gerente/Ordenhador**
1. **Operação Diária**: Registro rápido de produção de leite
2. **Controle Animal**: Acompanhamento individual de cada vaca
3. **Alertas**: Notificações sobre saúde e reprodução
4. **Tarefas**: Gestão de atividades da equipe

### **Veterinário**
1. **Histórico Saúde**: Acesso completo ao histórico médico
2. **Tratamentos**: Registro de medicamentos e procedimentos
3. **Prevenção**: Alertas para vacinas e cuidados preventivos
4. **Relatórios**: Análises de saúde do rebanho

## 🏗️ Arquitetura da Experiência

### **Princípios de Design**
- **Mobile-first**: Interface otimizada para dispositivos móveis
- **Offline-first**: Funcionalidade completa sem internet
- **Progressive Disclosure**: Informações mostradas gradualmente
- **Contextual Actions**: Ações relevantes para cada contexto

### **Fluxos Principais**
1. **Onboarding**: Cadastro simplificado em menos de 5 minutos
2. **Registro Produção**: Interface rápida para registro diário
3. **Controle Saúde**: Fluxo intuitivo para acompanhamento veterinário
4. **Relatórios**: Visualizações claras e acionáveis

## 📅 Requisitos de negócio — Folgas (escala 5x1)

Módulo voltado a **organizar folgas da equipe por fazenda** com rodízio **5x1** (três profissionais em slots sequenciais de folga no ciclo).

- **Escopo por fazenda**: configuração, escala e alertas são sempre da fazenda selecionada (vínculo N:N usuário–fazenda; admin atribui vínculos).
- **Configuração**: data âncora do ciclo + três usuários nos slots do rodízio (perfis elegíveis na UI/API: principalmente **FUNCIONARIO** e **GERENTE**, com **GESTAO** como compatibilidade).
- **Geração automática**: preenche o **mês que o usuário está visualizando** no calendário (primeiro ao último dia desse mês), **preservando** dias já marcados como ajuste **MANUAL**; não está amarrado ao “mês atual” do relógio se o usuário navegou para outro mês.
- **Alteração pelo gestor**: perfis **GERENTE**, **GESTAO**, **ADMIN** e **DEVELOPER** podem alterar dia (substituir dia inteiro ou adicionar segunda folga com motivo de exceção do dia quando aplicável). **Equidade** e **alertas** são **informativos** (não bloqueiam a operação no backend).
- **Funcionário**: vê a escala da fazenda vinculada; pode enviar **justificativa** apenas no **próprio** dia de folga; vê **exceção do dia** só quando é folguista naquela data.
- **Transparência operacional**: indicadores de divergência em relação ao previsto (ex.: “fora do rodízio”) e lista de alertas quando há inconsistências (ex.: mais de uma folga no dia sem exceção/justificativas completas).
- **Experiência mobile**: grade mensal mantida; detalhes longos (texto completo do rodízio, motivos) concentrados em **painel por dia** para reduzir ruído visual na grade.

## 📊 Métricas de Valor

### **Para o Produtor**
- ⏰ **Economia de tempo**: Redução de 40% em tarefas administrativas
- 💰 **Aumento de receita**: +15% na produção através de insights
- 🐄 **Melhoria na saúde**: -20% em custos veterinários
- 📈 **Melhor decisão**: Acesso a dados em tempo real

### **Para o Sistema**
- 🚀 **Performance**: <200ms response time
- 📱 **Disponibilidade**: 99.9% uptime
- 🔄 **Escalabilidade**: Suporte a 1000+ usuários simultâneos
- 💾 **Eficiência**: Baixo consumo de recursos

## 🔄 Ciclo de Feedback

### **Coleta de Dados**
- Analytics anônimos de uso
- Feedback direto dos usuários
- Métricas de performance técnica
- Dados de erro e exceções

### **Processamento**
- Análise trimestral de feedback
- Priorização baseada em impacto
- Iterações rápidas (sprints quinzenais)
- Testes A/B para novas funcionalidades

### **Implementação**
- Deploy contínuo com feature flags
- Rollout gradual para usuários
- Monitoramento rigoroso de performance
- Rollback rápido em caso de problemas

## 🌱 Estratégia de Crescimento

### **Fase 1 (0-100 fazendas)**
- Foco em pequenas fazendas (10-50 animais)
- Onboarding assistido
- Suporte prioritário
- Coleta intensiva de feedback

### **Fase 2 (100-500 fazendas)**
- Expansão para médias fazendas
- Automação de onboarding
- Sistema de suporte escalável
- Introdução de funcionalidades premium

### **Fase 3 (500+ fazendas)**
- Atração de grandes fazendas
- API pública para integrações
- Ecossistema de parceiros
- Modelo de negócio sustentável

---

**Última atualização**: 2026-04-01
**Versão do Contexto**: 2.1 (Go + Next.js — Folgas 5x1 e UX mobile documentadas)
