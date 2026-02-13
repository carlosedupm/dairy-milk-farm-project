-- Remover índices
DROP INDEX IF EXISTS idx_lactacoes_fazenda_id;
DROP INDEX IF EXISTS idx_lactacoes_animal_id;
DROP INDEX IF EXISTS idx_secagens_fazenda_id;
DROP INDEX IF EXISTS idx_secagens_animal_id;
DROP INDEX IF EXISTS idx_crias_parto_id;
DROP INDEX IF EXISTS idx_partos_fazenda_id;
DROP INDEX IF EXISTS idx_partos_animal_id;
DROP INDEX IF EXISTS idx_gestacoes_fazenda_id;
DROP INDEX IF EXISTS idx_gestacoes_status;
DROP INDEX IF EXISTS idx_gestacoes_animal_id;
DROP INDEX IF EXISTS idx_diagnosticos_fazenda_id;
DROP INDEX IF EXISTS idx_diagnosticos_animal_id;
DROP INDEX IF EXISTS idx_coberturas_fazenda_id;
DROP INDEX IF EXISTS idx_coberturas_data;
DROP INDEX IF EXISTS idx_coberturas_animal_id;
DROP INDEX IF EXISTS idx_cios_fazenda_id;
DROP INDEX IF EXISTS idx_cios_data;
DROP INDEX IF EXISTS idx_cios_animal_id;
DROP INDEX IF EXISTS idx_movimentacoes_lote_destino;
DROP INDEX IF EXISTS idx_movimentacoes_animal_id;
DROP INDEX IF EXISTS idx_animais_mae_id;
DROP INDEX IF EXISTS idx_animais_status_reprodutivo;
DROP INDEX IF EXISTS idx_animais_categoria;
DROP INDEX IF EXISTS idx_animais_lote_id;
DROP INDEX IF EXISTS idx_lotes_fazenda_id;

-- Remover tabelas (ordem inversa de dependências)
DROP TABLE IF EXISTS lactacoes;
DROP TABLE IF EXISTS secagens;
DROP TABLE IF EXISTS crias;
DROP TABLE IF EXISTS partos;
DROP TABLE IF EXISTS gestacoes;
DROP TABLE IF EXISTS diagnosticos_gestacao;
DROP TABLE IF EXISTS coberturas;
DROP TABLE IF EXISTS protocolos_iatf;
DROP TABLE IF EXISTS cios;
DROP TABLE IF EXISTS movimentacoes_lote;
DROP TABLE IF EXISTS lotes;

-- Remover colunas adicionadas em animais
ALTER TABLE animais DROP COLUMN IF EXISTS categoria;
ALTER TABLE animais DROP COLUMN IF EXISTS status_reprodutivo;
ALTER TABLE animais DROP COLUMN IF EXISTS mae_id;
ALTER TABLE animais DROP COLUMN IF EXISTS pai_info;
ALTER TABLE animais DROP COLUMN IF EXISTS lote_id;
ALTER TABLE animais DROP COLUMN IF EXISTS peso_nascimento;
ALTER TABLE animais DROP COLUMN IF EXISTS data_entrada;
ALTER TABLE animais DROP COLUMN IF EXISTS data_saida;
ALTER TABLE animais DROP COLUMN IF EXISTS motivo_saida;
