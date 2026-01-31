-- Preencher nome a partir da parte local do email para usuários com nome vazio
UPDATE usuarios
SET nome = INITCAP(REPLACE(SPLIT_PART(email, '@', 1), '.', ' '))
WHERE TRIM(COALESCE(nome, '')) = '';
