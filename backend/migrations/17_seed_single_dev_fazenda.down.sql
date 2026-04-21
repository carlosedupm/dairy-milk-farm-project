-- Remove apenas a fazenda seed se existir (nome fixo da migração 17).
DELETE FROM fazendas
WHERE nome = 'Fazenda Desenvolvimento' AND COALESCE(localizacao, '') = 'Dev';
