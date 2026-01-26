-- Rollback: Remover tabelas do Dev Studio
DROP INDEX IF EXISTS idx_dev_studio_audit_action;
DROP INDEX IF EXISTS idx_dev_studio_audit_user_id;
DROP INDEX IF EXISTS idx_dev_studio_audit_request_id;
DROP TABLE IF EXISTS dev_studio_audit;

DROP INDEX IF EXISTS idx_dev_studio_requests_code_changes;
DROP INDEX IF EXISTS idx_dev_studio_requests_status;
DROP INDEX IF EXISTS idx_dev_studio_requests_user_id;
DROP TABLE IF EXISTS dev_studio_requests;
