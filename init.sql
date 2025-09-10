-- Script de inicialização do banco


CREATE TABLE IF NOT EXISTS fazendas (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    localizacao VARCHAR(500),
    quantidade_vacas INTEGER DEFAULT 0,
    fundacao DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de animais
CREATE TABLE IF NOT EXISTS animais (
    id BIGSERIAL PRIMARY KEY,
    identificacao VARCHAR(100) UNIQUE NOT NULL,
    raca VARCHAR(100),
    data_nascimento DATE,
    sexo VARCHAR(1) CHECK (sexo IN ('M', 'F')),
    status_saude VARCHAR(50) DEFAULT 'SAUDAVEL',
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de produção de leite
CREATE TABLE IF NOT EXISTS producao_leite (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    quantidade DECIMAL(5,2) NOT NULL CHECK (quantidade > 0),
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    qualidade INTEGER CHECK (qualidade BETWEEN 1 AND 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    perfil VARCHAR(50) DEFAULT 'USER',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_animais_fazenda_id ON animais(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_producao_animal_id ON producao_leite(animal_id);
CREATE INDEX IF NOT EXISTS idx_producao_data_hora ON producao_leite(data_hora);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Dados iniciais para desenvolvimento
INSERT INTO fazendas (nome, localizacao, quantidade_vacas, fundacao) VALUES
('Fazenda Leiteira São João', 'São Paulo - SP', 150, '2020-01-15'),
('Fazenda Esperança', 'Minas Gerais - MG', 200, '2018-05-20')
ON CONFLICT DO NOTHING;

INSERT INTO animais (identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id) VALUES
('V001', 'Holandesa', '2021-03-10', 'F', 'SAUDAVEL', 1),
('V002', 'Jersey', '2021-05-15', 'F', 'SAUDAVEL', 1),
('V003', 'Gir', '2020-12-20', 'F', 'EM_TRATAMENTO', 2)
ON CONFLICT DO NOTHING;

INSERT INTO usuarios (nome, email, senha, perfil) VALUES
('Admin', 'admin@ceialmilk.com', '$2a$10$XURPShQNCsLjp1ESc2laoObo9QZDhxz73hJPaEv7/cBha4pk0AgP.', 'ADMIN')
ON CONFLICT DO NOTHING;
