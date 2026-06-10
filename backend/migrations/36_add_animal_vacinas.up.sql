-- BRF-001: calendário de vacinação por animal (BR-SAUDE-007 a 011, BR-ALERTA-016/017).

CREATE TABLE IF NOT EXISTS animal_vacinas (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    tipo_vacina VARCHAR(20) NOT NULL CHECK (tipo_vacina IN (
        'AFTOSA',
        'BRUCELOSE',
        'RAIVA',
        'CLOSTRIDIOSES',
        'IBR_BVD',
        'LEPTOSPIROSE',
        'OUTRO'
    )),
    dose VARCHAR(60) NULL,
    data_prevista DATE NOT NULL,
    data_aplicacao DATE NULL,
    validade_dias INT NULL CHECK (validade_dias > 0),
    data_proximo_reforco DATE NULL,
    lote VARCHAR(60) NULL,
    veterinario VARCHAR(120) NULL,
    observacoes TEXT NULL,
    created_by BIGINT REFERENCES usuarios(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NULL,
    -- Reforço só faz sentido após a aplicação (BR-SAUDE-011).
    CONSTRAINT chk_vacina_reforco_aplicada CHECK (
        data_aplicacao IS NOT NULL OR data_proximo_reforco IS NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_vacinas_animal ON animal_vacinas (animal_id, data_prevista);
CREATE INDEX IF NOT EXISTS idx_vacinas_fazenda ON animal_vacinas (fazenda_id);
CREATE INDEX IF NOT EXISTS idx_vacinas_prevista
    ON animal_vacinas (fazenda_id, data_prevista)
    WHERE data_aplicacao IS NULL;
CREATE INDEX IF NOT EXISTS idx_vacinas_reforco
    ON animal_vacinas (fazenda_id, data_proximo_reforco)
    WHERE data_aplicacao IS NOT NULL AND data_proximo_reforco IS NOT NULL;

ALTER TABLE animal_vacinas ENABLE ROW LEVEL SECURITY;

-- BR-SAUDE-010: aplicar vacina cria caso PREVENTIVO vinculado.
ALTER TABLE animal_saude
    ADD COLUMN IF NOT EXISTS vacina_id BIGINT NULL REFERENCES animal_vacinas(id) ON DELETE SET NULL;

-- BR-ALERTA-016/017: novos tipos automáticos de alerta.
ALTER TABLE alertas DROP CONSTRAINT IF EXISTS alertas_tipo_check;
ALTER TABLE alertas ADD CONSTRAINT alertas_tipo_check CHECK (tipo IN (
    'TRATAMENTO_VENCIDO',
    'PARTO_PREVISTO',
    'RESTRICAO_LEITE_ATIVA',
    'NAO_CONFORMIDADE',
    'GESTACAO_SEM_SECAGEM',
    'CIO_DETECTADO',
    'VACINA_VENCIDA',
    'VACINA_REFORCO_VENCIDA',
    'MANUAL'
));
