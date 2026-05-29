-- Onda 2.2: geração automática de alertas (usuário sistema, estado de conformidade, deduplicação).

INSERT INTO usuarios (nome, email, senha, perfil, enabled)
VALUES (
    'Sistema CeialMilk',
    'sistema@interno.ceialmilk',
    '$2a$10$XURPShQNCsLjp1ESc2laoObo9QZDhxz73hJPaEv7/cBha4pk0AgP.',
    'INTEGRACAO',
    false
)
ON CONFLICT (email) DO NOTHING;

CREATE TABLE IF NOT EXISTS alertas_geracao_estado (
    fazenda_id BIGINT PRIMARY KEY REFERENCES fazendas(id) ON DELETE CASCADE,
    ultima_execucao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    conformidade_chaves JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_alertas_aberto_tipo_animal
    ON alertas (fazenda_id, tipo, animal_id)
    WHERE status IN ('ABERTO', 'EM_ANDAMENTO')
      AND tipo <> 'MANUAL'
      AND animal_id IS NOT NULL;

ALTER TABLE alertas_geracao_estado ENABLE ROW LEVEL SECURITY;
