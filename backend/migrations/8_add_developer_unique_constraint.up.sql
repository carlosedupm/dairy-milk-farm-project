-- Garantir que existe no máximo 1 usuário com perfil DEVELOPER
CREATE UNIQUE INDEX idx_usuarios_unique_developer
ON usuarios ((TRUE))
WHERE perfil = 'DEVELOPER';
