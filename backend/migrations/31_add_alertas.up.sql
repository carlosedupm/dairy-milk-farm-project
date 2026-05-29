-- Módulo de alertas proativos por fazenda (notificações automáticas e manuais).

CREATE TABLE IF NOT EXISTS alertas (
    id BIGSERIAL PRIMARY KEY,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    animal_id BIGINT NULL REFERENCES animais(id) ON DELETE SET NULL,
    tipo VARCHAR(40) NOT NULL CHECK (tipo IN (
        'TRATAMENTO_VENCIDO',
        'PARTO_PREVISTO',
        'RESTRICAO_LEITE_ATIVA',
        'NAO_CONFORMIDADE',
        'GESTACAO_SEM_SECAGEM',
        'CIO_DETECTADO',
        'MANUAL'
    )),
    severidade VARCHAR(10) NOT NULL CHECK (severidade IN ('CRITICA', 'ALTA', 'MEDIA', 'BAIXA')),
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT NULL,
    data_prevista DATE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ABERTO' CHECK (status IN (
        'ABERTO',
        'EM_ANDAMENTO',
        'RESOLVIDO',
        'IGNORADO'
    )),
    resolvido_por BIGINT NULL REFERENCES usuarios(id),
    resolvido_em TIMESTAMPTZ NULL,
    created_by BIGINT NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_alertas_resolvido CHECK (
        (status IN ('RESOLVIDO', 'IGNORADO') AND resolvido_em IS NOT NULL)
        OR (status NOT IN ('RESOLVIDO', 'IGNORADO') AND resolvido_em IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_alertas_fazenda_status ON alertas (fazenda_id, status);
CREATE INDEX IF NOT EXISTS idx_alertas_fazenda_tipo ON alertas (fazenda_id, tipo);
CREATE INDEX IF NOT EXISTS idx_alertas_animal_id ON alertas (animal_id);
CREATE INDEX IF NOT EXISTS idx_alertas_fazenda_severidade_aberto
    ON alertas (fazenda_id, severidade)
    WHERE status = 'ABERTO';

ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
