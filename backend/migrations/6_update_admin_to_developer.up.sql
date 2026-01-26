-- Atualizar perfil do admin para DEVELOPER (permite acesso ao Dev Studio)
UPDATE usuarios 
SET perfil = 'DEVELOPER' 
WHERE email = 'admin@ceialmilk.com' AND perfil = 'ADMIN';
