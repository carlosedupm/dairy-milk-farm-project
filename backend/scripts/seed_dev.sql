-- Seed operacional de desenvolvimento (somente via runSeedDev quando ENV=development).
-- Idempotente: re-runs não duplicam lote, animais DEV-* nem lactações ativas.
-- Pré-requisito: migrações 3/17/18 (admin + "Fazenda Desenvolvimento").

DO $$
DECLARE
  v_fazenda_id BIGINT;
  v_lote_id BIGINT;
  v_admin_id BIGINT;
  v_animal_id BIGINT;
BEGIN
  SELECT id INTO v_fazenda_id
  FROM fazendas
  WHERE nome = 'Fazenda Desenvolvimento'
  LIMIT 1;

  IF v_fazenda_id IS NULL THEN
    RAISE NOTICE 'seed_dev: Fazenda Desenvolvimento não encontrada; skip';
    RETURN;
  END IF;

  SELECT id INTO v_admin_id
  FROM usuarios
  WHERE email = 'admin@ceialmilk.com'
  LIMIT 1;

  SELECT id INTO v_lote_id
  FROM lotes
  WHERE fazenda_id = v_fazenda_id
    AND nome = 'Lote Lactação Dev'
  LIMIT 1;

  IF v_lote_id IS NULL THEN
    INSERT INTO lotes (nome, fazenda_id, tipo, descricao, ativo)
    VALUES ('Lote Lactação Dev', v_fazenda_id, 'LACTACAO', 'Lote seed de desenvolvimento', true)
    RETURNING id INTO v_lote_id;
  END IF;

  -- DEV-001: matriz em lactação
  SELECT id INTO v_animal_id FROM animais WHERE identificacao = 'DEV-001' LIMIT 1;
  IF v_animal_id IS NULL THEN
    INSERT INTO animais (
      identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id,
      categoria, status_reprodutivo, lote_id, origem_aquisicao, created_by
    ) VALUES (
      'DEV-001', 'Holandesa', DATE '2021-03-10', 'F', 'SAUDAVEL', v_fazenda_id,
      'MATRIZ', 'PARIDA', v_lote_id, 'NASCIDO', v_admin_id
    )
    RETURNING id INTO v_animal_id;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM lactacoes
    WHERE animal_id = v_animal_id
      AND data_fim IS NULL
      AND (status IS NULL OR status = 'EM_ANDAMENTO')
  ) THEN
    INSERT INTO lactacoes (
      animal_id, numero_lactacao, data_inicio, status, fazenda_id, created_by
    ) VALUES (
      v_animal_id, 1, CURRENT_DATE - 60, 'EM_ANDAMENTO', v_fazenda_id, v_admin_id
    );
  END IF;

  -- DEV-002: matriz em lactação
  SELECT id INTO v_animal_id FROM animais WHERE identificacao = 'DEV-002' LIMIT 1;
  IF v_animal_id IS NULL THEN
    INSERT INTO animais (
      identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id,
      categoria, status_reprodutivo, lote_id, origem_aquisicao, created_by
    ) VALUES (
      'DEV-002', 'Jersey', DATE '2020-08-22', 'F', 'SAUDAVEL', v_fazenda_id,
      'MATRIZ', 'PARIDA', v_lote_id, 'NASCIDO', v_admin_id
    )
    RETURNING id INTO v_animal_id;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM lactacoes
    WHERE animal_id = v_animal_id
      AND data_fim IS NULL
      AND (status IS NULL OR status = 'EM_ANDAMENTO')
  ) THEN
    INSERT INTO lactacoes (
      animal_id, numero_lactacao, data_inicio, status, fazenda_id, created_by
    ) VALUES (
      v_animal_id, 2, CURRENT_DATE - 45, 'EM_ANDAMENTO', v_fazenda_id, v_admin_id
    );
  END IF;

  -- DEV-003: matriz vazia (cio/cobertura)
  IF NOT EXISTS (SELECT 1 FROM animais WHERE identificacao = 'DEV-003') THEN
    INSERT INTO animais (
      identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id,
      categoria, status_reprodutivo, lote_id, origem_aquisicao, created_by
    ) VALUES (
      'DEV-003', 'Gir', DATE '2021-11-05', 'F', 'SAUDAVEL', v_fazenda_id,
      'MATRIZ', 'VAZIA', v_lote_id, 'NASCIDO', v_admin_id
    );
  END IF;

  -- DEV-004: novilha vazia
  IF NOT EXISTS (SELECT 1 FROM animais WHERE identificacao = 'DEV-004') THEN
    INSERT INTO animais (
      identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id,
      categoria, status_reprodutivo, origem_aquisicao, created_by
    ) VALUES (
      'DEV-004', 'Holandesa', DATE '2023-06-15', 'F', 'SAUDAVEL', v_fazenda_id,
      'NOVILHA', 'VAZIA', 'NASCIDO', v_admin_id
    );
  END IF;

  -- DEV-005: bezerra
  IF NOT EXISTS (SELECT 1 FROM animais WHERE identificacao = 'DEV-005') THEN
    INSERT INTO animais (
      identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id,
      categoria, origem_aquisicao, created_by
    ) VALUES (
      'DEV-005', 'Holandesa', DATE '2025-12-01', 'F', 'SAUDAVEL', v_fazenda_id,
      'BEZERRA', 'NASCIDO', v_admin_id
    );
  END IF;

  RAISE NOTICE 'seed_dev: concluído para fazenda_id=%', v_fazenda_id;
END $$;
