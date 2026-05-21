DROP INDEX IF EXISTS idx_animais_created_by;
ALTER TABLE animais DROP COLUMN IF EXISTS created_by;
