CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_animais_identificacao_trgm
  ON animais USING gin (identificacao gin_trgm_ops);
