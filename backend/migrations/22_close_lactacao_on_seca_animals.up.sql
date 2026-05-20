-- Encerra lactações abertas em fêmeas já marcadas como SECA (dados legados pré BR-CICLO-006).
UPDATE lactacoes l
SET
    data_fim = COALESCE(
        (SELECT MAX(s.data_secagem) FROM secagens s WHERE s.animal_id = l.animal_id),
        l.data_inicio
    ),
    dias_lactacao = GREATEST(
        1,
        (COALESCE(
            (SELECT MAX(s.data_secagem)::date FROM secagens s WHERE s.animal_id = l.animal_id),
            l.data_inicio::date
        ) - l.data_inicio::date) + 1
    ),
    status = 'ENCERRADA',
    updated_at = NOW()
FROM animais a
WHERE l.animal_id = a.id
  AND l.data_fim IS NULL
  AND (l.status IS NULL OR l.status = 'EM_ANDAMENTO')
  AND a.status_reprodutivo = 'SECA';
