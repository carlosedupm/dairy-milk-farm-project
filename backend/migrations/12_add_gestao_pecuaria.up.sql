-- Lotes
CREATE TABLE IF NOT EXISTS lotes (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    tipo VARCHAR(30),
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE animais ADD COLUMN IF NOT EXISTS categoria VARCHAR(20);
ALTER TABLE animais ADD COLUMN IF NOT EXISTS status_reprodutivo VARCHAR(20);
ALTER TABLE animais ADD COLUMN IF NOT EXISTS mae_id BIGINT REFERENCES animais(id) ON DELETE SET NULL;
ALTER TABLE animais ADD COLUMN IF NOT EXISTS pai_info VARCHAR(255);
ALTER TABLE animais ADD COLUMN IF NOT EXISTS lote_id BIGINT REFERENCES lotes(id) ON DELETE SET NULL;
ALTER TABLE animais ADD COLUMN IF NOT EXISTS peso_nascimento DECIMAL(6,2);
ALTER TABLE animais ADD COLUMN IF NOT EXISTS data_entrada DATE;
ALTER TABLE animais ADD COLUMN IF NOT EXISTS data_saida DATE;
ALTER TABLE animais ADD COLUMN IF NOT EXISTS motivo_saida VARCHAR(20);

CREATE TABLE IF NOT EXISTS movimentacoes_lote (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    lote_origem_id BIGINT REFERENCES lotes(id) ON DELETE SET NULL,
    lote_destino_id BIGINT NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
    data TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo VARCHAR(255),
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cios (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    data_detectado TIMESTAMP NOT NULL,
    metodo_deteccao VARCHAR(20),
    intensidade VARCHAR(20),
    observacoes TEXT,
    usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS protocolos_iatf (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    dias_protocolo INTEGER,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coberturas (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    cio_id BIGINT REFERENCES cios(id) ON DELETE SET NULL,
    tipo VARCHAR(20) NOT NULL,
    data TIMESTAMP NOT NULL,
    touro_info VARCHAR(255),
    semen_partida VARCHAR(100),
    tecnico VARCHAR(255),
    protocolo_id BIGINT REFERENCES protocolos_iatf(id) ON DELETE SET NULL,
    observacoes TEXT,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diagnosticos_gestacao (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    cobertura_id BIGINT REFERENCES coberturas(id) ON DELETE SET NULL,
    data TIMESTAMP NOT NULL,
    resultado VARCHAR(20) NOT NULL,
    dias_gestacao_estimados INTEGER,
    metodo VARCHAR(20),
    veterinario VARCHAR(255),
    observacoes TEXT,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gestacoes (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    cobertura_id BIGINT NOT NULL REFERENCES coberturas(id) ON DELETE CASCADE,
    data_confirmacao DATE NOT NULL,
    data_prevista_parto DATE,
    status VARCHAR(20) NOT NULL,
    observacoes TEXT,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partos (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    gestacao_id BIGINT REFERENCES gestacoes(id) ON DELETE SET NULL,
    data TIMESTAMP NOT NULL,
    tipo VARCHAR(20),
    numero_crias INTEGER DEFAULT 1,
    complicacoes TEXT,
    observacoes TEXT,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crias (
    id BIGSERIAL PRIMARY KEY,
    parto_id BIGINT NOT NULL REFERENCES partos(id) ON DELETE CASCADE,
    animal_id BIGINT REFERENCES animais(id) ON DELETE SET NULL,
    sexo VARCHAR(1) NOT NULL CHECK (sexo IN ('M', 'F')),
    peso DECIMAL(6,2),
    condicao VARCHAR(20) NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS secagens (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    gestacao_id BIGINT REFERENCES gestacoes(id) ON DELETE SET NULL,
    data_secagem DATE NOT NULL,
    data_prevista_parto DATE,
    protocolo VARCHAR(255),
    motivo VARCHAR(30),
    observacoes TEXT,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lactacoes (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    numero_lactacao INTEGER NOT NULL,
    parto_id BIGINT REFERENCES partos(id) ON DELETE SET NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    dias_lactacao INTEGER,
    producao_total DECIMAL(10,2),
    media_diaria DECIMAL(8,2),
    status VARCHAR(20),
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lotes_fazenda_id ON lotes(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_animais_lote_id ON animais(lote_id);
CREATE INDEX IF NOT EXISTS idx_animais_categoria ON animais(categoria);
CREATE INDEX IF NOT EXISTS idx_animais_status_reprodutivo ON animais(status_reprodutivo);
CREATE INDEX IF NOT EXISTS idx_animais_mae_id ON animais(mae_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_animal_id ON movimentacoes_lote(animal_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_lote_destino ON movimentacoes_lote(lote_destino_id);
CREATE INDEX IF NOT EXISTS idx_cios_animal_id ON cios(animal_id);
CREATE INDEX IF NOT EXISTS idx_cios_data ON cios(data_detectado);
CREATE INDEX IF NOT EXISTS idx_cios_fazenda_id ON cios(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_coberturas_animal_id ON coberturas(animal_id);
CREATE INDEX IF NOT EXISTS idx_coberturas_data ON coberturas(data);
CREATE INDEX IF NOT EXISTS idx_coberturas_fazenda_id ON coberturas(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_diagnosticos_animal_id ON diagnosticos_gestacao(animal_id);
CREATE INDEX IF NOT EXISTS idx_diagnosticos_fazenda_id ON diagnosticos_gestacao(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_gestacoes_animal_id ON gestacoes(animal_id);
CREATE INDEX IF NOT EXISTS idx_gestacoes_status ON gestacoes(status);
CREATE INDEX IF NOT EXISTS idx_gestacoes_fazenda_id ON gestacoes(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_partos_animal_id ON partos(animal_id);
CREATE INDEX IF NOT EXISTS idx_partos_fazenda_id ON partos(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_crias_parto_id ON crias(parto_id);
CREATE INDEX IF NOT EXISTS idx_secagens_animal_id ON secagens(animal_id);
CREATE INDEX IF NOT EXISTS idx_secagens_fazenda_id ON secagens(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_lactacoes_animal_id ON lactacoes(animal_id);
CREATE INDEX IF NOT EXISTS idx_lactacoes_fazenda_id ON lactacoes(fazenda_id);
