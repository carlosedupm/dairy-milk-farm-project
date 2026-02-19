-- Adiciona coluna touro_animal_id para vincular cobertura ao animal reprodutor (touro/boi) em monta natural
ALTER TABLE coberturas ADD COLUMN IF NOT EXISTS touro_animal_id BIGINT REFERENCES animais(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_coberturas_touro_animal_id ON coberturas(touro_animal_id);
