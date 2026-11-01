-- SistemaMaestro - estrutura inicial PostgreSQL
-- Execute conectado ao banco SistemaMaestro, em um esquema public sem estas tabelas.
-- Este script nao apaga nem substitui tabelas existentes.
BEGIN;

CREATE TABLE usuario (
    id_usuario INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome_completo VARCHAR(150) NOT NULL,
    cpf VARCHAR(11) NOT NULL UNIQUE CHECK (cpf ~ '^[0-9]{11}$'),
    situacao BOOLEAN NOT NULL DEFAULT TRUE,
    data_inicio DATE NOT NULL,
    tipo_contratacao VARCHAR(50) NOT NULL,
    tipo_acesso VARCHAR(50) NOT NULL,
    senha_hash TEXT NOT NULL,
    email VARCHAR(254) NOT NULL,
    data_nascimento DATE NOT NULL
);
CREATE UNIQUE INDEX uq_usuario_email ON usuario (LOWER(email));

CREATE TABLE despesa (
    id_despesa INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_despesa VARCHAR(100) NOT NULL,
    valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
    data_pagamento DATE NOT NULL,
    id_usuario INTEGER NOT NULL REFERENCES usuario (id_usuario)
);

CREATE TABLE venda (
    id_venda INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_hora_venda TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valor_total NUMERIC(12,2) NOT NULL CHECK (valor_total >= 0),
    confirmacao_maior_idade BOOLEAN NOT NULL DEFAULT FALSE,
    id_usuario INTEGER NOT NULL REFERENCES usuario (id_usuario)
);

CREATE TABLE produtos (
    id_produto INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_produto VARCHAR(100) NOT NULL,
    nome_produto VARCHAR(150) NOT NULL,
    quantidade_produto INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_produto >= 0),
    valor_unitario NUMERIC(12,2) NOT NULL CHECK (valor_unitario >= 0)
);

CREATE TABLE item_venda (
    id_venda INTEGER NOT NULL REFERENCES venda (id_venda),
    id_produto INTEGER NOT NULL REFERENCES produtos (id_produto),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    valor_unitario NUMERIC(12,2) NOT NULL CHECK (valor_unitario >= 0),
    PRIMARY KEY (id_venda, id_produto)
);

CREATE TABLE controle_estoque (
    id_estoque INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_compra DATE NOT NULL,
    quantidade_adquirida INTEGER NOT NULL CHECK (quantidade_adquirida > 0),
    valor_total NUMERIC(12,2) NOT NULL CHECK (valor_total >= 0),
    id_produto INTEGER NOT NULL REFERENCES produtos (id_produto)
);

CREATE TABLE mesa_sinuca (
    id_mesa INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    numero_mesa INTEGER NOT NULL UNIQUE CHECK (numero_mesa > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'disponivel'
        CHECK (status IN ('ocupada', 'disponivel', 'manutencao'))
);

CREATE TABLE reserva_mesa (
    id_reserva INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome_cliente VARCHAR(150) NOT NULL,
    telefone_cliente VARCHAR(20) NOT NULL,
    data_horario_reserva TIMESTAMPTZ NOT NULL,
    duracao_minutos INTEGER NOT NULL CHECK (duracao_minutos > 0)
);

CREATE TABLE reserva_mesa_item (
    id_reserva INTEGER NOT NULL REFERENCES reserva_mesa (id_reserva),
    id_mesa INTEGER NOT NULL REFERENCES mesa_sinuca (id_mesa),
    PRIMARY KEY (id_reserva, id_mesa)
);

CREATE INDEX idx_despesa_usuario ON despesa (id_usuario);
CREATE INDEX idx_venda_usuario ON venda (id_usuario);
CREATE INDEX idx_item_venda_produto ON item_venda (id_produto);
CREATE INDEX idx_controle_estoque_produto ON controle_estoque (id_produto);
CREATE INDEX idx_reserva_item_mesa ON reserva_mesa_item (id_mesa);
CREATE INDEX idx_reserva_horario ON reserva_mesa (data_horario_reserva);

COMMENT ON COLUMN usuario.senha_hash IS 'Hash gerado pela aplicacao; nunca armazenar a senha original.';
COMMENT ON COLUMN usuario.situacao IS 'TRUE = ativo; FALSE = inativo.';
COMMENT ON COLUMN mesa_sinuca.status IS 'Estado atual da mesa, atualizado pelo atendente: ocupada, disponivel ou manutencao. Reservas futuras devem ser consultadas pela agenda.';
COMMENT ON COLUMN item_venda.valor_unitario IS 'Preco praticado no momento da venda.';

COMMIT;

-- Regras a implementar na proxima etapa, em operacoes transacionais:
-- 1. Venda deve ter pelo menos um item; reserva deve ter pelo menos uma mesa.
-- 2. Impedir reservas sobrepostas para a mesma mesa, inclusive com cadastros simultaneos.
-- 3. Impedir agendamento de mesas em manutencao.
-- 4. Calcular total da venda e atualizar estoque nas entradas e vendas.
-- A estrutura acima, sozinha, NAO garante essas quatro regras.

