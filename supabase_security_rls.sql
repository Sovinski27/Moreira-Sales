-- ==============================================================================
-- PANIFICADORA MOREIRA SALES - POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
-- Supabase PostgreSQL
-- ==============================================================================
-- Este script blinda o banco de dados para lançamento ao público:
-- 1. Clientes no celular (chave pública 'anon'):
--    - PODEM: Consultar produtos e categorias do cardápio.
--    - PODEM: Criar pedidos para a cozinha e acompanhar status da comanda.
--    - NUNCA PODEM: Consultar relatórios financeiros, faturamento, custos de insumos,
--                   fornecedores, configurações fiscais (CSC) ou lista geral de clientes.
-- 2. Administrador / Caixa (usuário 'authenticated'):
--    - Acesso total administrativo para faturamento, CMV, estoque e relatórios.
-- ==============================================================================

-- 1. HABILITAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS SENSÍVEIS
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
ALTER TABLE IF EXISTS configuracoes_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS configuracoes_fidelidade ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas para evitar duplicidade
DROP POLICY IF EXISTS "Publico pode ver produtos ativos" ON produtos;
DROP POLICY IF EXISTS "Admin tem acesso total aos produtos" ON produtos;
DROP POLICY IF EXISTS "Publico pode ver categorias" ON categorias;
DROP POLICY IF EXISTS "Admin tem acesso total as categorias" ON categorias;
DROP POLICY IF EXISTS "Clientes podem enviar pedidos cozinha" ON pedidos_cozinha;
DROP POLICY IF EXISTS "Leitura de pedidos da cozinha" ON pedidos_cozinha;
DROP POLICY IF EXISTS "Admin gerencia pedidos da cozinha" ON pedidos_cozinha;
DROP POLICY IF EXISTS "Mesas abertas publico" ON mesas_abertas;
DROP POLICY IF EXISTS "Admin gerencia mesas abertas" ON mesas_abertas;
DROP POLICY IF EXISTS "Bloqueio publico fornecedores" ON fornecedores;
DROP POLICY IF EXISTS "Admin gerencia fornecedores" ON fornecedores;
DROP POLICY IF EXISTS "Bloqueio publico insumos" ON insumos;
DROP POLICY IF EXISTS "Admin gerencia insumos" ON insumos;
DROP POLICY IF EXISTS "Bloqueio publico fichas_tecnicas" ON fichas_tecnicas;
DROP POLICY IF EXISTS "Admin gerencia fichas_tecnicas" ON fichas_tecnicas;
DROP POLICY IF EXISTS "Bloqueio publico custos_fixos" ON custos_fixos;
DROP POLICY IF EXISTS "Admin gerencia custos_fixos" ON custos_fixos;
DROP POLICY IF EXISTS "Bloqueio publico config fiscal" ON configuracoes_fiscais;
DROP POLICY IF EXISTS "Admin gerencia config fiscal" ON configuracoes_fiscais;
DROP POLICY IF EXISTS "Admin gerencia compras" ON compras;
DROP POLICY IF EXISTS "Admin gerencia clientes" ON clientes;

-- ==============================================================================
-- 2. TABELA: PRODUTOS & CATEGORIAS (Público pode ler, Admin pode alterar)
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
-- 3. TABELA: PEDIDOS DA COZINHA (Clientes enviam, Cozinha/Caixa gerenciam)
-- ==============================================================================
-- Clientes no celular podem registrar novos pedidos para a cozinha
CREATE POLICY "Clientes podem enviar pedidos cozinha"
ON pedidos_cozinha FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Clientes podem consultar o andamento dos pedidos
CREATE POLICY "Leitura de pedidos da cozinha"
ON pedidos_cozinha FOR SELECT
TO anon, authenticated
USING (true);

-- Apenas operadores autenticados podem atualizar status ou excluir
CREATE POLICY "Admin gerencia pedidos da cozinha"
ON pedidos_cozinha FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- 4. TABELA: MESAS ABERTAS (Comandas das mesas)
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
-- 5. TABELAS CRÍTICAS E CONFIDENCIAIS: BLINDAGEM 100% CONTRA O PÚBLICO
-- Clientes no celular NÃO têm permissão de leitura nem escrita.
-- ==============================================================================

-- A) FORNECEDORES (Nomes, contatos, CNPJ de distribuidores)
CREATE POLICY "Admin gerencia fornecedores"
ON fornecedores FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- B) INSUMOS (Preços de compra, estoque de farinha, café, embalagens)
CREATE POLICY "Admin gerencia insumos"
ON insumos FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- C) FICHAS TÉCNICAS (Composição, custos unitários e receitas)
CREATE POLICY "Admin gerencia fichas_tecnicas"
ON fichas_tecnicas FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- D) CUSTOS FIXOS (Aluguel, folha de pagamento, luz, pró-labore)
CREATE POLICY "Admin gerencia custos_fixos"
ON custos_fixos FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- E) CONFIGURAÇÕES FISCAIS (CSC Token SEFAZ, Certificado Digital A1)
CREATE POLICY "Admin gerencia config fiscal"
ON configuracoes_fiscais FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- F) HISTÓRICO DE COMPRAS E VENDAS (Faturamento bruto, margens, DRE)
CREATE POLICY "Admin gerencia compras"
ON compras FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- G) BASE DE CLIENTES (Telefones, aniversários, pontos de fidelidade)
CREATE POLICY "Admin gerencia clientes"
ON clientes FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- 6. VERIFICAÇÃO FINAL
-- ==============================================================================
-- Todas as tabelas confidenciais agora rejeitam automaticamente qualquer
-- tentativa de consulta pública vinda de DevTools/cURL/Postman sem login.
