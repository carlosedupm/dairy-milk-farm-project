-- Impede cadastro de mais de uma fazenda com o mesmo nome e localização.
-- LOWER() para comparação case-insensitive (ignora maiúsculas/minúsculas).
-- COALESCE(localizacao, '') trata NULL e string vazia como mesma localização.
CREATE UNIQUE INDEX IF NOT EXISTS idx_fazendas_nome_localizacao_unique
ON fazendas (LOWER(nome), LOWER(COALESCE(localizacao, '')));
