ALTER TABLE producao_leite
  ADD COLUMN lactacao_id BIGINT NULL REFERENCES lactacoes(id);

CREATE INDEX idx_producao_leite_lactacao_id ON producao_leite(lactacao_id);
