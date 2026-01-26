-- Rollback: reverter perfil do admin para ADMIN
UPDATE usuarios 
SET perfil = 'ADMIN' 
WHERE email = 'admin@ceialmilk.com' AND perfil = 'DEVELOPER';
