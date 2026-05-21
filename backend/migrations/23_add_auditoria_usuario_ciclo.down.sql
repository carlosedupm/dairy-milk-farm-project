DROP INDEX IF EXISTS idx_producao_leite_created_by;
DROP INDEX IF EXISTS idx_diagnosticos_gestacao_created_by;
DROP INDEX IF EXISTS idx_coberturas_created_by;

ALTER TABLE restricoes_leite DROP COLUMN IF EXISTS liberado_por;
ALTER TABLE restricoes_leite DROP COLUMN IF EXISTS created_by;
ALTER TABLE producao_leite DROP COLUMN IF EXISTS created_by;
ALTER TABLE lactacoes DROP COLUMN IF EXISTS created_by;
ALTER TABLE secagens DROP COLUMN IF EXISTS created_by;
ALTER TABLE partos DROP COLUMN IF EXISTS created_by;
ALTER TABLE gestacoes DROP COLUMN IF EXISTS created_by;
ALTER TABLE diagnosticos_gestacao DROP COLUMN IF EXISTS created_by;
ALTER TABLE coberturas DROP COLUMN IF EXISTS created_by;
