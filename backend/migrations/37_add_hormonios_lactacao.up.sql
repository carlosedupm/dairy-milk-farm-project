-- BRF-005: hormônios de lactação (BR-HORM-001 a 011, BR-ACESSO-025).

CREATE TABLE IF NOT EXISTS animal_hormonio_lactacao_protocolos (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    lactacao_id BIGINT NOT NULL REFERENCES lactacoes(id) ON DELETE CASCADE,
    gestacao_id BIGINT NOT NULL REFERENCES gestacoes(id) ON DELETE CASCADE,
    toque_referencia_id BIGINT NOT NULL REFERENCES diagnosticos_gestacao(id) ON DELETE RESTRICT,
    produto VARCHAR(20) NOT NULL CHECK (produto IN ('LACTROPIN', 'BUST', 'OUTRO')),
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'ENCERRADO')),
    motivo_encerramento VARCHAR(20) NULL CHECK (
        motivo_encerramento IS NULL OR motivo_encerramento IN (
            'BAIXA_PRODUCAO', 'PRE_PARTO', 'SECAGEM', 'OUTRO'
        )
    ),
    data_inicio DATE NOT NULL,
    data_encerramento DATE NULL,
    observacoes_encerramento TEXT NULL,
    created_by BIGINT REFERENCES usuarios(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NULL,
    CONSTRAINT chk_hormonio_protocolo_encerramento CHECK (
        (status = 'ATIVO' AND motivo_encerramento IS NULL AND data_encerramento IS NULL)
        OR (status = 'ENCERRADO' AND motivo_encerramento IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hormonio_protocolo_ativo_lactacao
    ON animal_hormonio_lactacao_protocolos (lactacao_id)
    WHERE status = 'ATIVO';

CREATE INDEX IF NOT EXISTS idx_hormonio_protocolo_animal
    ON animal_hormonio_lactacao_protocolos (animal_id, status);
CREATE INDEX IF NOT EXISTS idx_hormonio_protocolo_fazenda
    ON animal_hormonio_lactacao_protocolos (fazenda_id, status);

CREATE TABLE IF NOT EXISTS animal_hormonio_lactacao_aplicacoes (
    id BIGSERIAL PRIMARY KEY,
    protocolo_id BIGINT NOT NULL REFERENCES animal_hormonio_lactacao_protocolos(id) ON DELETE CASCADE,
    animal_id BIGINT NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    produto VARCHAR(20) NOT NULL CHECK (produto IN ('LACTROPIN', 'BUST', 'OUTRO')),
    data_aplicacao DATE NOT NULL,
    data_proxima_aplicacao DATE NULL,
    numero_dose INT NOT NULL CHECK (numero_dose > 0),
    lote VARCHAR(60) NULL,
    observacoes TEXT NULL,
    created_by BIGINT REFERENCES usuarios(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_hormonio_aplicacao_protocolo
    ON animal_hormonio_lactacao_aplicacoes (protocolo_id, data_aplicacao DESC);
CREATE INDEX IF NOT EXISTS idx_hormonio_aplicacao_animal
    ON animal_hormonio_lactacao_aplicacoes (animal_id, data_aplicacao DESC);
CREATE INDEX IF NOT EXISTS idx_hormonio_aplicacao_fazenda_proxima
    ON animal_hormonio_lactacao_aplicacoes (fazenda_id, data_proxima_aplicacao)
    WHERE data_proxima_aplicacao IS NOT NULL;

ALTER TABLE animal_hormonio_lactacao_protocolos ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_hormonio_lactacao_aplicacoes ENABLE ROW LEVEL SECURITY;

-- BR-HORM-011: aplicação cria caso PREVENTIVO vinculado.
ALTER TABLE animal_saude
    ADD COLUMN IF NOT EXISTS hormonio_lactacao_aplicacao_id BIGINT NULL
    REFERENCES animal_hormonio_lactacao_aplicacoes(id) ON DELETE SET NULL;
