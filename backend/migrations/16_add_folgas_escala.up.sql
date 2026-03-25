-- Configuração da escala 5x1 por fazenda (âncora + ordem dos 3 usuários no rodízio)
CREATE TABLE IF NOT EXISTS folgas_escala_config (
    fazenda_id BIGINT PRIMARY KEY REFERENCES fazendas(id) ON DELETE CASCADE,
    data_anchor DATE NOT NULL,
    usuario_slot_0 BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    usuario_slot_1 BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    usuario_slot_2 BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_folgas_escala_config_slots ON folgas_escala_config (usuario_slot_0, usuario_slot_1, usuario_slot_2);

-- Um registro por (fazenda, data, usuário de folga). Permite mais de um por dia apenas em exceção.
CREATE TABLE IF NOT EXISTS escala_folgas (
    id BIGSERIAL PRIMARY KEY,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    origem VARCHAR(20) NOT NULL CHECK (origem IN ('AUTO', 'MANUAL')),
    justificada BOOLEAN NOT NULL DEFAULT false,
    motivo TEXT,
    observacoes TEXT,
    created_by BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (fazenda_id, data, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_escala_folgas_fazenda_data ON escala_folgas (fazenda_id, data);

-- Justificativa registrada pelo próprio funcionário (trilha)
CREATE TABLE IF NOT EXISTS folgas_justificativas (
    id BIGSERIAL PRIMARY KEY,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    motivo TEXT NOT NULL,
    created_by BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (fazenda_id, data, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_folgas_justificativas_fazenda_data ON folgas_justificativas (fazenda_id, data);

-- Exceção explícita do dia (ex.: mais de um de folga autorizado pela gestão)
CREATE TABLE IF NOT EXISTS folgas_excecoes_dia (
    id BIGSERIAL PRIMARY KEY,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    motivo TEXT NOT NULL,
    created_by BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (fazenda_id, data)
);

-- Histórico de alterações pela gestão
CREATE TABLE IF NOT EXISTS folgas_alteracoes (
    id BIGSERIAL PRIMARY KEY,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    actor_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo VARCHAR(50) NOT NULL,
    detalhes JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_folgas_alteracoes_fazenda ON folgas_alteracoes (fazenda_id, created_at DESC);
