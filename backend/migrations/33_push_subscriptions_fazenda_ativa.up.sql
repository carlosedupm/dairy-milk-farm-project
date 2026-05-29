-- Web Push: fazenda ativa server-side + subscriptions por utilizador/dispositivo

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS fazenda_ativa_id BIGINT NULL REFERENCES fazendas(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_push_subscriptions_endpoint UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_usuario_id ON push_subscriptions (usuario_id);
