# Regras de negócio — Auditoria e rastreabilidade

Rastreio de **quem persistiu** cada evento do ciclo pecuário e verificação de **conformidade** dos dados com as regras `BR-*`.

**Implementação principal**

- Migration: `backend/migrations/23_add_auditoria_usuario_ciclo.up.sql` (`created_by`, `liberado_por`).
- Utilizador autenticado: `handlers.GetActorUserID` ← JWT `user_id`.
- Conformidade: `backend/internal/service/conformidade_service.go`, `GET /api/v1/fazendas/:id/auditoria/conformidade`.
- Referência de padrão maduro: módulo Folgas (`created_by`, `folgas_alteracoes`).

---

### BR-AUDIT-001 — Escrita identifica o utilizador

- **Enunciado**: Ao criar registos de ciclo pecuário e leite (cio, cobertura, toque, parto, secagem, lactação automática no parto, produção, restrição de leite), o servidor grava `created_by` (ou `usuario_id` em cios) com o ID do utilizador autenticado, **sem** aceitar esse campo no body do cliente.
- **Escopo**: Fazenda; entidades listadas na migration 23.
- **Perfis**: conforme módulo (ex.: FUNCIONARIO em toques/produção — BR-ACESSO-015).
- **Efeito**: bloqueio implícito (sem auth não há escrita); rastreio em banco.
- **Implementação**: handlers de gestão, produção e restrições; repositórios com coluna `created_by`.
- **Estado**: implementado.

### BR-AUDIT-002 — Liberação de restrição de leite

- **Enunciado**: `PATCH .../restricoes-leite/:id/liberar` grava `liberado_por` com o utilizador autenticado (perfis autorizados em `PodeLiberarRestricaoLeite`).
- **Efeito**: bloqueio de perfil; rastreio de quem liberou após laboratório.
- **Implementação**: `RestricaoLeiteService.Liberar`, `RestricaoLeiteRepository.Liberar`.
- **Estado**: implementado.

### BR-AUDIT-003 — Relatório de conformidade por fazenda

- **Enunciado**: Gestão pode consultar anomalias de integridade (dados que violam regras transversais) via API, com código, animal, severidade e descrição.
- **Escopo**: Fazenda ativa; leitura apenas.
- **Perfis**: acesso à fazenda (vínculo ou ADMIN/DEVELOPER/GESTAO conforme `ValidateFazendaAccessOrGestao`); **não** exposto a FUNCIONARIO na UI (evolução futura).
- **Efeito**: informativo; não altera dados automaticamente.
- **Checks**: INT-001 (múltiplas lactações ativas), INT-002 (produção sem lactação), INT-003 (gestação sem toque+), INT-004 (restrição sem lactação), INT-005 (PRENHE sem gestação), INT-006 (toque+ sem cobertura).
- **Implementação**: `ConformidadeService.ListByFazenda`, rota `GET /api/v1/fazendas/:id/auditoria/conformidade`.
- **Estado**: implementado.

### BR-AUDIT-004 — Logs técnicos vs auditoria de domínio

- **Enunciado**: Correlation ID e logs JSON (`X-Correlation-ID`) complementam suporte técnico; a **fonte de verdade** para «quem registrou» no produto é a coluna `created_by` / `usuario_id` na entidade.
- **Estado**: implementado (processo).

---

**Última atualização**: 2026-05-20
