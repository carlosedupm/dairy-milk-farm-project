-- Uma fazenda mínima quando a base está vazia: permite VincularFazendaUnicaSeAplicavel e testes E2E/TestSprite.
INSERT INTO fazendas (nome, localizacao, quantidade_vacas)
SELECT 'Fazenda Desenvolvimento', 'Dev', 0
WHERE NOT EXISTS (SELECT 1 FROM fazendas LIMIT 1);
