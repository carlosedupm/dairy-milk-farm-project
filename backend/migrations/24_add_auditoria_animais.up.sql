-- Rastreabilidade: quem cadastrou o animal (BR-AUDIT-005).
ALTER TABLE animais
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_animais_created_by ON animais (created_by);
