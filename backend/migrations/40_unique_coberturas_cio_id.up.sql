-- BR-COBERTURAS-008: um cio só pode vincular-se a uma cobertura.
-- NULLs (legado sem cio_id) são permitidos — sem NOT NULL.
CREATE UNIQUE INDEX IF NOT EXISTS uq_coberturas_cio_id
  ON coberturas (cio_id)
  WHERE cio_id IS NOT NULL;
