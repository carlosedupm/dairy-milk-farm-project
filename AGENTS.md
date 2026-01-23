# 🤖 AGENTS.md - CeialMilk

Este arquivo orienta o Cursor AI sobre o projeto CeialMilk e como usar a documentação existente para tomar decisões informadas.

## 📚 Documentação do Projeto

### Memory Bank (`memory-bank/`)

O projeto mantém documentação estruturada no diretório `memory-bank/`. **SEMPRE consulte estes arquivos antes de tomar decisões técnicas ou fazer mudanças significativas:**

- **`activeContext.md`**: Estado atual do projeto, o que está funcionando, em andamento e próximos passos
- **`projectbrief.md`**: Objetivos principais, público-alvo, métricas de sucesso e fases de desenvolvimento
- **`techContext.md`**: Stack tecnológica, configurações e decisões técnicas
- **`systemPatterns.md`**: Padrões arquiteturais, design patterns, padrões de API, segurança e performance
- **`productContext.md`**: Contexto de mercado, jornada do usuário, métricas de valor
- **`progress.md`**: Status geral, completude, histórico de progresso e próximos marcos
- **`deploy-notes.md`**: Notas sobre deploy, configurações de produção e variáveis de ambiente

### Documentação Técnica (`docs/`)

- **`docs/postman/`**: Coleção Postman com exemplos de uso da API, endpoints documentados e variáveis de ambiente

## 🎯 Visão Geral do Projeto

CeialMilk é um sistema de gestão completo para fazendas leiteiras que combina alta performance técnica com funcionalidades práticas para o agronegócio, utilizando arquitetura reativa e preparado para integração com IA.

**Consulte `memory-bank/projectbrief.md` para detalhes completos sobre objetivos, público-alvo e métricas de sucesso.**

## 🏗️ Arquitetura e Stack

### Stack Tecnológica
- **Framework**: Spring Boot 3.3.0 + WebFlux (reativo)
- **Database**: PostgreSQL 15 + R2DBC (acesso reativo)
- **Autenticação**: JWT + Spring Security 6
- **Cache**: Redis
- **Build**: Maven
- **Java**: 17

**Consulte `memory-bank/techContext.md` para configurações detalhadas e `memory-bank/systemPatterns.md` para padrões arquiteturais.**

### Padrões Arquiteturais

O projeto segue uma arquitetura em camadas reativa:
```
Controllers → Services → Repositories → Database (R2DBC)
```

**SEMPRE consulte `memory-bank/systemPatterns.md` antes de implementar novos componentes para garantir consistência com os padrões estabelecidos.**

## 📊 Estado Atual do Projeto

**SEMPRE verifique `memory-bank/activeContext.md` e `memory-bank/progress.md` antes de começar qualquer trabalho para entender:**
- O que já está implementado
- O que está em andamento
- Próximos passos planejados
- Problemas conhecidos
- Decisões técnicas ativas

### Status Atual (Resumo)
- ✅ Infraestrutura: 95% completa
- ✅ Documentação: 80% completa
- 🚧 Implementação: 30% completa
- 🚧 Testes: 0% completo
- ✅ Deploy: 70% completo

**Consulte `memory-bank/progress.md` para métricas detalhadas e histórico.**

## 🔧 Padrões e Convenções

### Código Java/Spring

**Ao trabalhar com arquivos `.java`, siga os padrões em `memory-bank/systemPatterns.md`:**

1. **Programação Reativa**: Use `Mono<>` e `Flux<>` do Project Reactor
2. **Camadas**: Controller → Service → Repository
3. **Repositórios**: Use interfaces R2DBC reativas
4. **DTOs**: Separe Create, Update, Response e Summary DTOs
5. **Validações**: Use Bean Validation (`@Valid`, `@NotNull`, etc.)
6. **Tratamento de Erros**: Implemente handlers reativos globais

**Consulte a regra `.cursor/rules/java-spring-reactive.mdc` para detalhes específicos.**

### API Design

**Ao trabalhar com Controllers e DTOs, siga os padrões em `memory-bank/systemPatterns.md`:**

1. **Versionamento**: `/api/v1/{recurso}`
2. **HTTP Verbs**: GET, POST, PUT, DELETE, PATCH
3. **Status Codes**: Use códigos HTTP apropriados
4. **Documentação**: Mantenha OpenAPI/Swagger atualizado
5. **Testes**: Use a coleção Postman em `docs/postman/` como referência

**Consulte a regra `.cursor/rules/api-design.mdc` para detalhes específicos.**

## 📝 Manutenção de Documentação

**É CRÍTICO manter a documentação atualizada.** Sempre que fizer mudanças significativas:

### Quando Atualizar Cada Arquivo

1. **`activeContext.md`**: 
   - Ao mudar o estado do projeto
   - Ao completar ou iniciar novas funcionalidades
   - Ao identificar novos problemas ou riscos
   - Ao tomar novas decisões técnicas

2. **`progress.md`**:
   - Ao completar tarefas ou sprints
   - Ao atingir marcos importantes
   - Ao atualizar métricas de completude

3. **`techContext.md`**:
   - Ao adicionar novas dependências ou tecnologias
   - Ao mudar configurações importantes
   - Ao documentar novas decisões técnicas

4. **`systemPatterns.md`**:
   - Ao estabelecer novos padrões arquiteturais
   - Ao definir novos padrões de código
   - Ao mudar estratégias de API ou segurança

5. **`deploy-notes.md`**:
   - Ao modificar configurações de deploy
   - Ao adicionar novas variáveis de ambiente
   - Ao documentar processos de deploy

**Consulte a regra `.cursor/rules/documentation-maintenance.mdc` para instruções detalhadas.**

## 🚀 Fluxo de Trabalho Recomendado

1. **Antes de começar qualquer tarefa**:
   - Leia `memory-bank/activeContext.md` para entender o estado atual
   - Consulte `memory-bank/systemPatterns.md` para padrões relevantes
   - Verifique `memory-bank/progress.md` para contexto de progresso

2. **Durante o desenvolvimento**:
   - Siga os padrões estabelecidos em `systemPatterns.md`
   - Consulte `docs/postman/` para exemplos de API
   - Mantenha consistência com código existente

3. **Após completar mudanças significativas**:
   - Atualize `activeContext.md` se o estado mudou
   - Atualize `progress.md` se completou tarefas
   - Atualize `systemPatterns.md` se estabeleceu novos padrões
   - Atualize `techContext.md` se adicionou tecnologias

## 📖 Referências Rápidas

- **Estado Atual**: `memory-bank/activeContext.md`
- **Padrões Arquiteturais**: `memory-bank/systemPatterns.md`
- **Stack Tecnológica**: `memory-bank/techContext.md`
- **Progresso**: `memory-bank/progress.md`
- **Objetivos do Projeto**: `memory-bank/projectbrief.md`
- **Contexto de Produto**: `memory-bank/productContext.md`
- **Deploy**: `memory-bank/deploy-notes.md`
- **API Examples**: `docs/postman/POSTMAN-README.md`

## ⚠️ Importante

- **NUNCA** faça mudanças que contradigam padrões estabelecidos sem primeiro atualizar a documentação
- **SEMPRE** consulte a documentação antes de tomar decisões técnicas
- **SEMPRE** atualize a documentação quando fizer mudanças significativas
- **MANTENHA** consistência com os padrões arquiteturais documentados

---

**Última atualização**: 2025-01-23
**Versão**: 1.0
