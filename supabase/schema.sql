-- ==============================================================================
-- SISTEMA DE CRM, FIDELIZAÇÃO E ATENDIMENTO PARA PANIFICADORA
-- Arquitetura de Banco de Dados PostgreSQL / Supabase
-- Umuarama - PR
-- ==============================================================================

-- 1. Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    whatsapp VARCHAR(20) UNIQUE NOT NULL,
    data_nascimento DATE,
    email VARCHAR(150),
    notas TEXT,
    total_compras_historico INT DEFAULT 0,
    ultimo_contato_resgate DATE,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Compras / Visitas
CREATE TABLE IF NOT EXISTS compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    valor NUMERIC(10, 2) DEFAULT 0.00,
    data_compra DATE DEFAULT CURRENT_DATE,
    pontuou_fidelidade BOOLEAN DEFAULT true,
    detalhes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Configurações de Fidelidade
CREATE TABLE IF NOT EXISTS configuracoes_fidelidade (
    id INT PRIMARY KEY DEFAULT 1,
    meta_compras_mes INT DEFAULT 10,
    valor_minimo_pontuacao NUMERIC(10, 2) DEFAULT 5.00,
    premio_descricao VARCHAR(255) DEFAULT '1 Café Especial com Pão na Chapa Crocante',
    mensagem_whatsapp TEXT DEFAULT 'Parabéns {NOME}! 🎉 Você completou {COMPRAS} compras este mês na Panificadora! Venha retirar o seu brinde: {PREMIO} ☕🥖',
    mensagem_resgate TEXT DEFAULT 'Olá {NOME}! 🥖 Notamos que faz alguns dias que você não passa para tomar aquele cafezinho fresco com a gente. Preparamos um pão na chapa quentinho de presente na sua próxima visita! Te esperamos! ☕',
    webhook_whatsapp_url TEXT,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Inserir configuração padrão inicial caso não exista
INSERT INTO configuracoes_fidelidade (id, meta_compras_mes, valor_minimo_pontuacao, premio_descricao, mensagem_whatsapp, mensagem_resgate)
VALUES (
    1, 
    10,
    5.00, 
    '1 Café Especial com Pão na Chapa Crocante', 
    'Parabéns {NOME}! 🎉 Você completou {COMPRAS} compras este mês na Panificadora! Venha retirar o seu brinde: {PREMIO} ☕🥖',
    'Olá {NOME}! 🥖 Notamos que faz alguns dias que você não passa para tomar aquele cafezinho fresco com a gente. Preparamos um pão na chapa quentinho de presente na sua próxima visita! Te esperamos! ☕'
)
ON CONFLICT (id) DO NOTHING;

-- Índices de performance para busca em menos de 100ms no caixa
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp ON clientes (whatsapp);
CREATE INDEX IF NOT EXISTS idx_compras_cliente_id ON compras (cliente_id);
CREATE INDEX IF NOT EXISTS idx_compras_data_compra ON compras (data_compra);

-- Trigger para incrementar total_compras_historico automaticamente
CREATE OR REPLACE FUNCTION fn_atualiza_total_compras()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE clientes 
        SET total_compras_historico = total_compras_historico + 1
        WHERE id = NEW.cliente_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE clientes 
        SET total_compras_historico = GREATEST(0, total_compras_historico - 1)
        WHERE id = OLD.cliente_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualiza_total_compras ON compras;
CREATE TRIGGER trg_atualiza_total_compras
AFTER INSERT OR DELETE ON compras
FOR EACH ROW
EXECUTE FUNCTION fn_atualiza_total_compras();

-- Habilitar Row Level Security (RLS)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_fidelidade ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público para operação do Caixa & Admin (chave anon)
CREATE POLICY "Permitir leitura pública clientes" ON clientes FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública clientes" ON clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública clientes" ON clientes FOR UPDATE USING (true);

CREATE POLICY "Permitir leitura pública compras" ON compras FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública compras" ON compras FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir leitura pública configs" ON configuracoes_fidelidade FOR SELECT USING (true);
CREATE POLICY "Permitir atualização pública configs" ON configuracoes_fidelidade FOR UPDATE USING (true);

-- 4. Tabela de Categorias
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    icone VARCHAR(50),
    ordem INT DEFAULT 0
);

-- 5. Tabela de Produtos
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id UUID REFERENCES categorias(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    preco NUMERIC(10, 2) NOT NULL,
    ativo BOOLEAN DEFAULT true
);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública categorias" ON categorias FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública categorias" ON categorias FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública categorias" ON categorias FOR UPDATE USING (true);
CREATE POLICY "Permitir deleção pública categorias" ON categorias FOR DELETE USING (true);

CREATE POLICY "Permitir leitura pública produtos" ON produtos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública produtos" ON produtos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública produtos" ON produtos FOR UPDATE USING (true);
CREATE POLICY "Permitir deleção pública produtos" ON produtos FOR DELETE USING (true);

