ALTER TABLE usuarios_fazendas DROP CONSTRAINT IF EXISTS chk_usuarios_fazendas_papel;
ALTER TABLE usuarios_fazendas DROP COLUMN IF EXISTS papel;
