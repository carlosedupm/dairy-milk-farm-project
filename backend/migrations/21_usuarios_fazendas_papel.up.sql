-- Papel do vínculo N:N: distingue titular da exploração de acesso operacional (admin/equipa).
ALTER TABLE usuarios_fazendas
    ADD COLUMN IF NOT EXISTS papel VARCHAR(32) NOT NULL DEFAULT 'OPERACIONAL';

ALTER TABLE usuarios_fazendas
    ADD CONSTRAINT chk_usuarios_fazendas_papel
    CHECK (papel IN ('TITULAR', 'OPERACIONAL'));

-- Heurística de backfill: vínculos de utilizadores com perfil PROPRIETARIO passam a TITULAR.
-- Casos em que um PROPRIETARIO seja só colaborador noutra fazenda podem ser corrigidos pelo admin (regravar vínculos).
UPDATE usuarios_fazendas uf
SET papel = 'TITULAR'
FROM usuarios u
WHERE u.id = uf.usuario_id
  AND u.perfil = 'PROPRIETARIO';
