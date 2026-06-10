-- Rollback BRF-001: remove vacinas, FK em animal_saude e tipos novos de alerta.

DELETE FROM alertas WHERE tipo IN ('VACINA_VENCIDA', 'VACINA_REFORCO_VENCIDA');

ALTER TABLE alertas DROP CONSTRAINT IF EXISTS alertas_tipo_check;
ALTER TABLE alertas ADD CONSTRAINT alertas_tipo_check CHECK (tipo IN (
    'TRATAMENTO_VENCIDO',
    'PARTO_PREVISTO',
    'RESTRICAO_LEITE_ATIVA',
    'NAO_CONFORMIDADE',
    'GESTACAO_SEM_SECAGEM',
    'CIO_DETECTADO',
    'MANUAL'
));

ALTER TABLE animal_saude DROP COLUMN IF EXISTS vacina_id;

DROP TABLE IF EXISTS animal_vacinas;
