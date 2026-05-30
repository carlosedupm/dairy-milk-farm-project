DROP INDEX IF EXISTS idx_producao_leite_lactacao_id;

ALTER TABLE producao_leite
  DROP COLUMN IF EXISTS lactacao_id;
