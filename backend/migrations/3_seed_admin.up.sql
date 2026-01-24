INSERT INTO usuarios (nome, email, senha, perfil)
VALUES ('Admin', 'admin@ceialmilk.com', '$2a$10$XURPShQNCsLjp1ESc2laoObo9QZDhxz73hJPaEv7/cBha4pk0AgP.', 'ADMIN')
ON CONFLICT (email) DO NOTHING;
