-- Uma fazenda mínima quando a base está vazia: desenvolvimento local e testes E2E/TestSprite (vínculos utilizador–fazenda são atribuídos pelo admin ou por migrações, não por auto-vínculo em registo).
INSERT INTO fazendas (nome, localizacao, quantidade_vacas)
SELECT 'Fazenda Desenvolvimento', 'Dev', 0
WHERE NOT EXISTS (SELECT 1 FROM fazendas LIMIT 1);
