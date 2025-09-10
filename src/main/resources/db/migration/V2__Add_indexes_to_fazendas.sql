-- Adiciona índices para otimizar consultas frequentes na tabela fazendas
CREATE INDEX IF NOT EXISTS idx_fazendas_nome ON fazendas (LOWER(nome));
CREATE INDEX IF NOT EXISTS idx_fazendas_localizacao ON fazendas (localizacao);
CREATE INDEX IF NOT EXISTS idx_fazendas_quantidade_vacas ON fazendas (quantidade_vacas);
