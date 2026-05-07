-- Restrições de leite (descarte / aguardando laboratório) por animal e fazenda.

CREATE TABLE IF NOT EXISTS restricoes_leite (
    id BIGSERIAL PRIMARY KEY,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    animal_id BIGINT NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    motivo VARCHAR(50) NOT NULL CHECK (motivo IN (
        'TRATAMENTO_ANTIBIOTICO',
        'POS_PARTO_AMOSTRA',
        'SINTOMA_ORDENHA',
        'OUTRO'
    )),
    inicio_em DATE NOT NULL DEFAULT CURRENT_DATE,
    observacao TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'AGUARDANDO_LAB' CHECK (status IN (
        'AGUARDANDO_LAB',
        'LIBERADO',
        'CANCELADO'
    )),
    liberado_em DATE,
    liberado_observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restricoes_leite_fazenda_status
    ON restricoes_leite (fazenda_id, status);

CREATE INDEX IF NOT EXISTS idx_restricoes_leite_animal_id
    ON restricoes_leite (animal_id);

-- No máximo um episódio aberto por animal.
CREATE UNIQUE INDEX IF NOT EXISTS uq_restricoes_leite_animal_aguardando
    ON restricoes_leite (animal_id)
    WHERE status = 'AGUARDANDO_LAB';

ALTER TABLE restricoes_leite ENABLE ROW LEVEL SECURITY;
