-- ==============================================================================
-- PANIFICADORA MOREIRA SALES - POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
-- Supabase PostgreSQL (Versão Validada com todas as tabelas)
-- ==============================================================================

-- 1. GARANTIR QUE TODAS AS TABELAS EXISTAM ANTES DE APLICAR AS POLÍTICAS
CREATE TABLE IF NOT EXISTS custos_fixos (
  id text PRIMARY KEY DEFAULT '1',
  tipo text DEFAULT 'percentual',
  valor numeric DEFAULT 0,
  atualizado_em timestamptz DEFAULT now()
);

-- 2. HABILITAR ROW LEVEL SECURITY (RLS) NAS TABELAS REAIS DO SISTEMA
ALTER TABLE IF EXISTS produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pedidos_cozinha ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mesas_abertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fichas_tecnicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS custos_fixos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS configuracao_fiscal ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS configuracoes_fidelidade ENABLE ROW LEVEL SECURITY;

-- 3. LIMPEZA DE POLÍTICAS ANTERIORES PARA EVITAR CONFLITOS
DROP POLICY IF EXISTS "Publico pode ver produtos ativos" ON produtos;
DROP POLICY IF EXISTS "Admin tem acesso total aos produtos" ON produtos;
DROP POLICY IF EXISTS "Publico pode ver categorias" ON categorias;
DROP POLICY IF EXISTS "Admin tem acesso total as categorias" ON categorias;
DROP POLICY IF EXISTS "Clientes podem enviar pedidos cozinha" ON pedidos_cozinha;
DROP POLICY IF EXISTS "Leitura de pedidos da cozinha" ON pedidos_cozinha;
DROP POLICY IF EXISTS "Admin gerencia pedidos da cozinha" ON pedidos_cozinha;
DROP POLICY IF EXISTS "Mesas abertas publico" ON mesas_abertas;
DROP POLICY IF EXISTS "Mesas abertas insert publico" ON mesas_abertas;
DROP POLICY IF EXISTS "Admin gerencia mesas abertas" ON mesas_abertas;
DROP POLICY IF EXISTS "Admin gerencia fornecedores" ON fornecedores;
DROP POLICY IF EXISTS "Admin gerencia insumos" ON insumos;
DROP POLICY IF EXISTS "Admin gerencia fichas_tecnicas" ON fichas_tecnicas;
DROP POLICY IF EXISTS "Admin gerencia custos_fixos" ON custos_fixos;
DROP POLICY IF EXISTS "Admin gerencia configuracao_fiscal" ON configuracao_fiscal;
DROP POLICY IF EXISTS "Admin gerencia config fiscal" ON configuracao_fiscal;
DROP POLICY IF EXISTS "Admin gerencia compras" ON compras;
DROP POLICY IF EXISTS "Admin gerencia clientes" ON clientes;
DROP POLICY IF EXISTS "Admin gerencia fidelidade" ON configuracoes_fidelidade;
DROP POLICY IF EXISTS "Publico le fidelidade" ON configuracoes_fidelidade;

-- ==============================================================================
-- 4. PRODUTOS & CATEGORIAS: O público pode ver no cardápio do celular
-- ==============================================================================
CREATE POLICY "Publico pode ver produtos ativos"
ON produtos FOR SELECT
TO anon, authenticated
USING (ativo = true OR auth.role() = 'authenticated');

CREATE POLICY "Admin tem acesso total aos produtos"
ON produtos FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Publico pode ver categorias"
ON categorias FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admin tem acesso total as categorias"
ON categorias FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- 5. PEDIDOS DA COZINHA: Clientes no celular enviam e acompanham seus pedidos
-- ==============================================================================
CREATE POLICY "Clientes podem enviar pedidos cozinha"
ON pedidos_cozinha FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Leitura de pedidos da cozinha"
ON pedidos_cozinha FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admin gerencia pedidos da cozinha"
ON pedidos_cozinha FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- 6. MESAS ABERTAS: Comandas em atendimento
-- ==============================================================================
CREATE POLICY "Mesas abertas publico"
ON mesas_abertas FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Mesas abertas insert publico"
ON mesas_abertas FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admin gerencia mesas abertas"
ON mesas_abertas FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- 7. REGRAS DE FIDELIDADE (Público pode ler as regras; Admin pode alterar)
-- ==============================================================================
CREATE POLICY "Publico le fidelidade"
ON configuracoes_fidelidade FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admin gerencia fidelidade"
ON configuracoes_fidelidade FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- 8. TABELAS CONFIDENCIAIS: BLINDAGEM 100% CONTRA O PÚBLICO
-- Clientes no celular NUNCA terão acesso de leitura ou escrita a esses dados.
-- ==============================================================================

-- A) FORNECEDORES
CREATE POLICY "Admin gerencia fornecedores"
ON fornecedores FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- B) INSUMOS (Preços de compra e estoque)
CREATE POLICY "Admin gerencia insumos"
ON insumos FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- C) FICHAS TÉCNICAS (Receitas e custos unitários)
CREATE POLICY "Admin gerencia fichas_tecnicas"
ON fichas_tecnicas FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- D) CUSTOS FIXOS (Aluguel, folha, contas da panificadora)
CREATE POLICY "Admin gerencia custos_fixos"
ON custos_fixos FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- E) CONFIGURAÇÃO FISCAL (Token CSC, Certificado SEFAZ)
CREATE POLICY "Admin gerencia configuracao_fiscal"
ON configuracao_fiscal FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- F) VENDAS E FATURAMENTO GERAL
CREATE POLICY "Admin gerencia compras"
ON compras FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- G) CLIENTES (Dados pessoais protegidos pela LGPD)
CREATE POLICY "Admin gerencia clientes"
ON clientes FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
