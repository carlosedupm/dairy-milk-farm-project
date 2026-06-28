-- Preenche lactacao_id em producao_leite legado quando existe lactação cujo intervalo cobre a data.
-- Alinhado a FindLactacaoForProducaoDate (numero_lactacao DESC por animal).
UPDATE producao_leite p
SET lactacao_id = sub.lactacao_id
FROM (
  SELECT DISTINCT ON (p2.id) p2.id AS producao_id, l.id AS lactacao_id
  FROM producao_leite p2
  INNER JOIN animais a ON a.id = p2.animal_id
  INNER JOIN lactacoes l ON l.animal_id = p2.animal_id AND l.fazenda_id = a.fazenda_id
  WHERE p2.lactacao_id IS NULL
    AND l.data_inicio <= p2.data_hora::date
    AND (l.data_fim IS NULL OR l.data_fim >= p2.data_hora::date)
  ORDER BY p2.id, l.numero_lactacao DESC
) sub
WHERE p.id = sub.producao_id;
