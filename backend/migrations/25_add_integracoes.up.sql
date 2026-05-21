-- API de integrações M2M (clientes, scopes, auditoria, idempotência).

CREATE TABLE integracao_clientes (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    actor_user_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    key_prefix VARCHAR(32) NOT NULL,
    key_hash TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    revogado_em TIMESTAMPTZ,
    criado_por_admin_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT integracao_clientes_key_prefix_unique UNIQUE (key_prefix)
);

CREATE INDEX idx_integracao_clientes_ativo ON integracao_clientes (ativo) WHERE revogado_em IS NULL;

CREATE TABLE integracao_cliente_fazendas (
    cliente_id BIGINT NOT NULL REFERENCES integracao_clientes(id) ON DELETE CASCADE,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    PRIMARY KEY (cliente_id, fazenda_id)
);

CREATE TABLE integracao_cliente_scopes (
    cliente_id BIGINT NOT NULL REFERENCES integracao_clientes(id) ON DELETE CASCADE,
    scope VARCHAR(64) NOT NULL,
    PRIMARY KEY (cliente_id, scope)
);

CREATE TABLE integracao_chamadas (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL REFERENCES integracao_clientes(id) ON DELETE CASCADE,
    method VARCHAR(16) NOT NULL,
    path VARCHAR(512) NOT NULL,
    status_code INT NOT NULL,
    correlation_id VARCHAR(64),
    idempotency_key VARCHAR(128),
    duracao_ms INT NOT NULL DEFAULT 0,
    erro_resumo VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_integracao_chamadas_cliente_created ON integracao_chamadas (cliente_id, created_at DESC);

CREATE TABLE integracao_idempotencia (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL REFERENCES integracao_clientes(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(128) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_body JSONB NOT NULL,
    status_code INT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT integracao_idempotencia_cliente_key_unique UNIQUE (cliente_id, idempotency_key)
);

CREATE INDEX idx_integracao_idempotencia_expires ON integracao_idempotencia (expires_at);
