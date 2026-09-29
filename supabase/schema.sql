-- ==============================================================================
-- SCHEMA COMPLETO E RESILIENTE - PANIFICADORA MOREIRA SALES (SUPABASE POSTGRES)
-- ==============================================================================

-- 1. Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    whatsapp VARCHAR(30) UNIQUE NOT NULL,
    total_gasto NUMERIC(10, 2) DEFAULT 0.00,
    visitas INT DEFAULT 1,
    ultima_visita TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    primeira_visita TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    aniversario VARCHAR(10),
    observacoes TEXT,
    pontos_atual INT DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Compras
CREATE TABLE IF NOT EXISTS compras (
    id TEXT PRIMARY KEY,
    cliente_id TEXT,
    valor NUMERIC(10, 2) NOT NULL,
    data TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    tipo VARCHAR(20) DEFAULT 'compra',
    forma_pagamento VARCHAR(30),
    nota_fiscal_id TEXT,
    nota_fiscal_chave VARCHAR(60),
    nota_fiscal_numero INT,
    danfe_url TEXT,
    cpf_na_nota VARCHAR(20)
);

-- 3. Tabela de Configurações de Fidelidade
CREATE TABLE IF NOT EXISTS configuracoes_fidelidade (
    id INT PRIMARY KEY DEFAULT 1,
    meta_pontos INT DEFAULT 10,
    recompensa_nome VARCHAR(100) DEFAULT 'Café com Pão de Queijo',
    dias_inatividade INT DEFAULT 14,
    mensagem_retencao TEXT,
    mensagem_recompensa TEXT,
    pontos_por_real INT DEFAULT 1,
    webhook_whatsapp_url TEXT,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabela de Categorias
CREATE TABLE IF NOT EXISTS categorias (
    id TEXT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    icone VARCHAR(50),
    ordem INT DEFAULT 0
);

-- 5. Tabela de Produtos
CREATE TABLE IF NOT EXISTS produtos (
    id TEXT PRIMARY KEY,
    categoria_id TEXT,
    nome VARCHAR(150) NOT NULL,
    preco NUMERIC(10, 2) NOT NULL,
    custo NUMERIC(10, 2) DEFAULT 0.00,
    descricao TEXT,
    imagem_url TEXT,
    disponivel BOOLEAN DEFAULT true,
    tempo_preparo_min INT DEFAULT 5,
    destaque BOOLEAN DEFAULT false,
    ordem INT DEFAULT 0
);

-- 6. Tabela de Fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
    id TEXT PRIMARY KEY,
    nome VARCHAR(150),
    nome_empresa VARCHAR(150),
    contato VARCHAR(100),
    contato_whatsapp VARCHAR(50),
    telefone VARCHAR(30),
    email VARCHAR(100),
    cnpj VARCHAR(30),
    cidade VARCHAR(100),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Tabela de Insumos
CREATE TABLE IF NOT EXISTS insumos (
    id TEXT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    unidade_medida VARCHAR(20) NOT NULL DEFAULT 'kg',
    custo_unitario NUMERIC(10, 4) DEFAULT 0.00,
    preco_custo NUMERIC(10, 4) DEFAULT 0.00,
    fornecedor_id TEXT,
    estoque_atual NUMERIC(10, 3) DEFAULT 0.000,
    quantidade_estoque NUMERIC(10, 3) DEFAULT 0.000,
    estoque_minimo NUMERIC(10, 3) DEFAULT 0.000,
    perda_percentual NUMERIC(5, 2) DEFAULT 0.00,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Tabela de Fichas Técnicas (CMV / Precificação)
CREATE TABLE IF NOT EXISTS fichas_tecnicas (
    id TEXT PRIMARY KEY,
    produto_id TEXT,
    nome VARCHAR(150),
    rendimento_unidades NUMERIC(10, 2) DEFAULT 1.00,
    tempo_preparo_minutos INT DEFAULT 0,
    custo_mao_obra NUMERIC(10, 2) DEFAULT 0.00,
    margem_lucro_desejada NUMERIC(5, 2) DEFAULT 100.00,
    insumos JSONB DEFAULT '[]'::jsonb
);

-- 9. Tabela de Mesas Abertas
CREATE TABLE IF NOT EXISTS mesas_abertas (
    id TEXT PRIMARY KEY,
    mesa_id TEXT,
    mesa_numero INT NOT NULL,
    cliente_nome VARCHAR(150),
    cliente_telefone VARCHAR(30),
    carrinho JSONB DEFAULT '[]'::jsonb,
    itens JSONB DEFAULT '[]'::jsonb,
    total NUMERIC(10, 2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'ocupada',
    aberto_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. Tabela de Pedidos da Cozinha (KDS)
CREATE TABLE IF NOT EXISTS pedidos_cozinha (
    id TEXT PRIMARY KEY,
    mesa_numero INT NOT NULL,
    cliente_nome VARCHAR(150) NOT NULL,
    cliente_telefone VARCHAR(30),
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    total NUMERIC(10, 2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'pendente',
    observacao TEXT,
    observacoes TEXT,
    alerta_silenciado BOOLEAN DEFAULT false,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 11. Tabela de Configuração Fiscal
CREATE TABLE IF NOT EXISTS configuracao_fiscal (
    id INT PRIMARY KEY DEFAULT 1,
    provedor VARCHAR(50) DEFAULT 'focus_nfe',
    ambiente VARCHAR(20) DEFAULT 'homologacao',
    token_api TEXT,
    cnpj VARCHAR(30) DEFAULT '12.345.678/0001-90',
    cnpj_emitente VARCHAR(30) DEFAULT '12.345.678/0001-90',
    inscricao_estadual VARCHAR(30) DEFAULT '90812345-67',
    razao_social VARCHAR(200) DEFAULT 'Panificadora & Confeitaria Moreira Sales Ltda',
    nome_fantasia VARCHAR(200) DEFAULT 'Panificadora Moreira Sales',
    regime_tributario VARCHAR(50) DEFAULT 'simples_nacional',
    serie_nfe INT DEFAULT 1,
    ultimo_numero_nfe INT DEFAULT 100,
    serie_nfce INT DEFAULT 1,
    numero_atual_nfce INT DEFAULT 100,
    csc_id VARCHAR(50) DEFAULT '000001',
    csc_token TEXT,
    certificado_ativo BOOLEAN DEFAULT true,
    certificado_nome VARCHAR(150),
    certificado_validade VARCHAR(50),
    emissao_automatica_pdv BOOLEAN DEFAULT true,
    enviar_whatsapp_automatico BOOLEAN DEFAULT true,
    mensagem_whatsapp_nfe TEXT,
    ncm_padrao VARCHAR(30) DEFAULT '1905.90.90',
    cfop_padrao VARCHAR(10) DEFAULT '5.102',
    endereco JSONB DEFAULT '{"logradouro": "Av. Brasil", "numero": "1500", "bairro": "Centro", "municipio": "Moreira Sales", "uf": "PR", "cep": "87370-000", "ibge_municipio": "4116304"}'::jsonb,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 12. Tabela de Notas Fiscais Emitidas
CREATE TABLE IF NOT EXISTS notas_fiscais (
    id TEXT PRIMARY KEY,
    compra_id TEXT,
    numero INT NOT NULL,
    serie INT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'nfce',
    chave_acesso VARCHAR(60) NOT NULL,
    protocolo_autorizacao VARCHAR(60),
    status VARCHAR(30) DEFAULT 'autorizada',
    motivo_status TEXT,
    motivo_cancelamento TEXT,
    protocolo_cancelamento VARCHAR(60),
    ambiente VARCHAR(20) DEFAULT 'homologacao',
    data_emissao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    valor_total NUMERIC(10, 2) DEFAULT 0.00,
    valor_produtos NUMERIC(10, 2) DEFAULT 0.00,
    valor_desconto NUMERIC(10, 2) DEFAULT 0.00,
    valor_tributos_estimados NUMERIC(10, 2) DEFAULT 0.00,
    cliente_nome VARCHAR(150),
    cliente_cpf VARCHAR(20),
    cliente_cpf_cnpj VARCHAR(30),
    cliente_telefone VARCHAR(30),
    cliente_whatsapp VARCHAR(30),
    forma_pagamento VARCHAR(50),
    itens JSONB DEFAULT '[]'::jsonb,
    qr_code_url TEXT,
    danfe_url TEXT,
    xml_url TEXT,
    enviada_whatsapp BOOLEAN DEFAULT false,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_fidelidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_tecnicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesas_abertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_cozinha ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracao_fiscal ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Total para Operação pelo App (Chave Anon)
DROP POLICY IF EXISTS "Permitir tudo clientes" ON clientes;
CREATE POLICY "Permitir tudo clientes" ON clientes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo compras" ON compras;
CREATE POLICY "Permitir tudo compras" ON compras FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo configuracoes_fidelidade" ON configuracoes_fidelidade;
CREATE POLICY "Permitir tudo configuracoes_fidelidade" ON configuracoes_fidelidade FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo categorias" ON categorias;
CREATE POLICY "Permitir tudo categorias" ON categorias FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo produtos" ON produtos;
CREATE POLICY "Permitir tudo produtos" ON produtos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo fornecedores" ON fornecedores;
CREATE POLICY "Permitir tudo fornecedores" ON fornecedores FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo insumos" ON insumos;
CREATE POLICY "Permitir tudo insumos" ON insumos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo fichas_tecnicas" ON fichas_tecnicas;
CREATE POLICY "Permitir tudo fichas_tecnicas" ON fichas_tecnicas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo mesas_abertas" ON mesas_abertas;
CREATE POLICY "Permitir tudo mesas_abertas" ON mesas_abertas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo pedidos_cozinha" ON pedidos_cozinha;
CREATE POLICY "Permitir tudo pedidos_cozinha" ON pedidos_cozinha FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo configuracao_fiscal" ON configuracao_fiscal;
CREATE POLICY "Permitir tudo configuracao_fiscal" ON configuracao_fiscal FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo notas_fiscais" ON notas_fiscais;
CREATE POLICY "Permitir tudo notas_fiscais" ON notas_fiscais FOR ALL USING (true) WITH CHECK (true);
