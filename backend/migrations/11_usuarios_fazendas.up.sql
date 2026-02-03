-- Tabela de vínculo N:N entre usuários e fazendas
CREATE TABLE IF NOT EXISTS usuarios_fazendas (
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, fazenda_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_fazendas_usuario_id ON usuarios_fazendas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_fazendas_fazenda_id ON usuarios_fazendas(fazenda_id);

-- Seed: vincular usuários ADMIN/DEVELOPER à primeira fazenda (só se existir ao menos uma fazenda)
INSERT INTO usuarios_fazendas (usuario_id, fazenda_id)
SELECT u.id, f.id
FROM usuarios u
INNER JOIN (SELECT id FROM fazendas ORDER BY id ASC LIMIT 1) f ON true
WHERE u.perfil IN ('ADMIN', 'DEVELOPER')
ON CONFLICT (usuario_id, fazenda_id) DO NOTHING;
