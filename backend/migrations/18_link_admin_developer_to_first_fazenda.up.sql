-- Vincular ADMIN/DEVELOPER à primeira fazenda (ex.: migração 11 sem fazendas no momento).
INSERT INTO usuarios_fazendas (usuario_id, fazenda_id)
SELECT u.id, f.id
FROM usuarios u
CROSS JOIN (SELECT id FROM fazendas ORDER BY id ASC LIMIT 1) AS f
WHERE u.perfil IN ('ADMIN', 'DEVELOPER')
ON CONFLICT DO NOTHING;
