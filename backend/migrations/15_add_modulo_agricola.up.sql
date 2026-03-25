-- Fornecedores/cooperativas da fazenda (compra de insumos, entrega de grãos)
CREATE TABLE fornecedores (
    id BIGSERIAL PRIMARY KEY,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'COOPERATIVA',
    contato VARCHAR(255),
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_fornecedores_fazenda_id ON fornecedores(fazenda_id);

-- Áreas/talhões da fazenda
CREATE TABLE areas (
    id BIGSERIAL PRIMARY KEY,
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    hectares DECIMAL(10,2) NOT NULL CHECK (hectares > 0),
    descricao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_areas_fazenda_id ON areas(fazenda_id);

-- Análises de solo por área
CREATE TABLE analises_solo (
    id BIGSERIAL PRIMARY KEY,
    area_id BIGINT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    data_coleta DATE NOT NULL,
    data_resultado DATE,
    ph DECIMAL(3,1),
    fosforo_p VARCHAR(50),
    potassio_k VARCHAR(50),
    materia_organica VARCHAR(50),
    outros_resultados JSONB,
    recomendacoes TEXT,
    laboratorio VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_analises_solo_area_id ON analises_solo(area_id);
CREATE INDEX idx_analises_solo_data ON analises_solo(data_coleta);

-- Culturas por área e safra (safra = ano)
CREATE TABLE safras_culturas (
    id BIGSERIAL PRIMARY KEY,
    area_id BIGINT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    ano INTEGER NOT NULL,
    cultura VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'PLANTADA',
    data_plantio DATE,
    data_colheita DATE,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(area_id, ano, cultura)
);
CREATE INDEX idx_safras_culturas_area_ano ON safras_culturas(area_id, ano);

-- Custos (insumos, serviços próprios, terceirizados)
CREATE TABLE custos_agricolas (
    id BIGSERIAL PRIMARY KEY,
    safra_cultura_id BIGINT NOT NULL REFERENCES safras_culturas(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    subcategoria VARCHAR(100),
    descricao TEXT,
    valor DECIMAL(12,2) NOT NULL CHECK (valor >= 0),
    data DATE NOT NULL,
    quantidade DECIMAL(10,2),
    unidade VARCHAR(20),
    fornecedor_id BIGINT REFERENCES fornecedores(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_custos_safra_cultura ON custos_agricolas(safra_cultura_id);
CREATE INDEX idx_custos_fornecedor ON custos_agricolas(fornecedor_id);

-- Produções agrícolas (silagem, grão)
CREATE TABLE producoes_agricolas (
    id BIGSERIAL PRIMARY KEY,
    safra_cultura_id BIGINT NOT NULL REFERENCES safras_culturas(id) ON DELETE CASCADE,
    destino VARCHAR(50) NOT NULL,
    quantidade_kg DECIMAL(12,2) NOT NULL CHECK (quantidade_kg > 0),
    data DATE NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_producoes_safra_cultura ON producoes_agricolas(safra_cultura_id);

-- Receitas (venda de grão)
CREATE TABLE receitas_agricolas (
    id BIGSERIAL PRIMARY KEY,
    safra_cultura_id BIGINT NOT NULL REFERENCES safras_culturas(id) ON DELETE CASCADE,
    descricao TEXT,
    valor DECIMAL(12,2) NOT NULL CHECK (valor >= 0),
    quantidade_kg DECIMAL(12,2),
    preco_por_kg DECIMAL(10,4),
    data DATE NOT NULL,
    fornecedor_id BIGINT REFERENCES fornecedores(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_receitas_safra_cultura ON receitas_agricolas(safra_cultura_id);
CREATE INDEX idx_receitas_fornecedor ON receitas_agricolas(fornecedor_id);
