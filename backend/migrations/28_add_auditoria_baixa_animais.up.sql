-- Rastreabilidade: quem registou ou reverteu a baixa do rebanho (BR-AUDIT-008).
ALTER TABLE animais
    ADD COLUMN IF NOT EXISTS baixa_registrado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS baixa_revertido_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_animais_baixa_registrado_por ON animais (baixa_registrado_por);
