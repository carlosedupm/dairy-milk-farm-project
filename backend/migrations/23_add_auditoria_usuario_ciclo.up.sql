-- Rastreabilidade: quem registrou eventos do ciclo pecuário e leite (BR-AUDIT-001).

ALTER TABLE coberturas
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE diagnosticos_gestacao
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE gestacoes
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE partos
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE secagens
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE lactacoes
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE producao_leite
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE restricoes_leite
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS liberado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coberturas_created_by ON coberturas (created_by);
CREATE INDEX IF NOT EXISTS idx_diagnosticos_gestacao_created_by ON diagnosticos_gestacao (created_by);
CREATE INDEX IF NOT EXISTS idx_producao_leite_created_by ON producao_leite (created_by);
