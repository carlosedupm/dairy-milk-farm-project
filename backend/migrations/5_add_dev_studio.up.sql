-- Tabela de requests do Dev Studio
CREATE TABLE dev_studio_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    code_changes JSONB,
    error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para dev_studio_requests
CREATE INDEX idx_dev_studio_requests_user_id ON dev_studio_requests(user_id);
CREATE INDEX idx_dev_studio_requests_status ON dev_studio_requests(status);
CREATE INDEX idx_dev_studio_requests_code_changes ON dev_studio_requests USING GIN (code_changes);

-- Tabela de auditoria do Dev Studio
CREATE TABLE dev_studio_audit (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT REFERENCES dev_studio_requests(id) ON DELETE SET NULL,
    user_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    details JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para dev_studio_audit
CREATE INDEX idx_dev_studio_audit_request_id ON dev_studio_audit(request_id);
CREATE INDEX idx_dev_studio_audit_user_id ON dev_studio_audit(user_id);
CREATE INDEX idx_dev_studio_audit_action ON dev_studio_audit(action);
