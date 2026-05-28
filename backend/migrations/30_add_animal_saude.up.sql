-- Módulo de saúde animal: registo de casos clínicos por animal (tratamentos, preventivos e cirurgias).
CREATE TABLE IF NOT EXISTS animal_saude (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    tipo_caso VARCHAR(20) NOT NULL CHECK (tipo_caso IN ('TRATAMENTO', 'PREVENTIVO', 'CIRURGIA', 'OUTRO')),
    data_inicio DATE NOT NULL,
    data_fim DATE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'CONCLUIDO', 'CANCELADO')),
    observacoes TEXT NULL,
    created_by BIGINT REFERENCES usuarios(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NULL,
    CONSTRAINT chk_animal_saude_data_fim CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

CREATE INDEX IF NOT EXISTS idx_animal_saude_animal_status ON animal_saude (animal_id, status);
CREATE INDEX IF NOT EXISTS idx_animal_saude_animal_data ON animal_saude (animal_id, data_inicio);
