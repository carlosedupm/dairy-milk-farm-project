ALTER TABLE diagnosticos_gestacao
  ADD COLUMN IF NOT EXISTS classificacao_operacional VARCHAR(32) NULL;
