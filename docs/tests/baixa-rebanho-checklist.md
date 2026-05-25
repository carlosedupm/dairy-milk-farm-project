# Checklist manual — Baixa do rebanho

Referência: `docs/business/baixa-rebanho.md` (BR-BAIXA-001 a BR-BAIXA-009); conformidade: `auditoria.md` (BR-AUDIT-009).

## Registo de baixa

- [ ] Gestão regista venda com lactação ativa → lactação encerrada na ficha
- [ ] FUNCIONARIO só consegue motivo **Morte** (API e UI)
- [ ] Tentativa de segunda baixa no mesmo animal → erro 409
- [ ] `POST /api/v1/producao` em animal baixado → 400 `ANIMAL_FORA_REBANHO`

## Listagens e busca

- [ ] Lista `/animais` por defeito só animais no rebanho
- [ ] Filtro «Com baixa» mostra apenas animais com `data_saida` passada
- [ ] Busca por identificação não sugere animal baixado (com `no_rebanho` default)
- [ ] `AnimalSelect` no fluxo de baixa não lista animais já baixados

## Conformidade (home)

- [ ] Após baixa de vaca **PRENHE** (gestação → PERDA na TX): painel **sem** INT-005 para esses animais
- [ ] Animal **no rebanho** PRENHE sem gestação confirmada: INT-005 **continua** a aparecer
- [ ] Baixa com lactação ainda aberta (legado): **INT-007** ALTA, não INT-005

## Ficha e reversão

- [ ] Ficha mostra badge «Fora do rebanho» + motivo/data + «Baixa registada por» (timeline e `saida_resumo`)
- [ ] Reversão (gestão) limpa saída; INT-007 aparece se lactação ainda aberta
- [ ] FUNCIONARIO não vê botão «Reverter baixa»

## Gestão e produção (rótulos pós-baixa — BR-BAIXA-009)

- [ ] Baixar vaca com coberturas/toques visíveis → `/gestao/coberturas` (e demais listagens) mostram **brinco correto** + badge **«Baixado»** (não `Animal {id}`)
- [ ] Formulário «Novo cio» / «Nova cobertura» **não** lista o animal baixado no `AnimalSelect`
- [ ] Lista de produção da fazenda (coluna animal) idem: identificação + badge quando aplicável
- [ ] Após reversão da baixa, badge desaparece nas listagens após refetch (invalidação operacional + todos)
- [ ] Linha de cobertura/cio/parto de animal baixado: **sem** Editar/Excluir; botão **Ver ficha**; URL `/gestao/coberturas/:id/editar` mostra aviso (não formulário)
- [ ] `PUT`/`DELETE` de cio de animal baixado → 400 `ANIMAL_FORA_REBANHO`

## Integrações M2M

- [ ] `GET` busca animal exclui baixados por defeito
- [ ] OpenAPI schema `Animal` inclui `data_saida`, `motivo_saida`, `observacao_saida`

**Última atualização**: 2026-05-24 (BR-BAIXA-009)
