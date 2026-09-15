# Integração de Testes E2E para o Novo Frente de Caixa e Catálogo

O Frente de Caixa (PDV) foi significativamente expandido para além do escopo original de MVP (que apenas recebia valores para pontuar fidelidade). Agora, ele engloba gestão de catálogo, carrinho de compras, baixa de estoque, formas de pagamento e vendas anônimas. Precisamos cobrir tudo com a mesma qualidade de testes *opaque-box* da infraestrutura atual.

## User Review Required

> [!IMPORTANT]
> Verifique se as **5 novas Features (F20 a F24)** cobrem totalmente as expectativas do que deve ser testado.

## Proposed Changes

Vamos mapear as novas funcionalidades como Features F20 a F24 e expandir os testes em todos os 4 Tiers existentes, sem criar falsos positivos.

### 1. Extensão do Driver de Teste (e2e/driver.ts)
Precisamos ensinar o nosso robô de testes (`CashierSession` e `AdminSession`) a interagir com os novos elementos:
- **`driver.ts`**:
  - `CashierSession.searchProduct(term)`: Digitar na busca de produtos.
  - `CashierSession.addToCart(produtoNome)`: Clicar num produto do catálogo.
  - `CashierSession.changeCartQuantity(tempId, delta)`: Usar os botões `+` e `-` no carrinho.
  - `CashierSession.selectPaymentMethod(method)`: Clicar nos botões de forma de pagamento (Pix, Crédito, Débito, Dinheiro).
  - `CashierSession.confirmAnonymousSale()`: Confirmar compra como "Venda Rápida (Cliente Anônimo)".
  - `AdminSession.navigateToTab(tabName)`: Navegar para a nova aba de Catálogo.
  - `AdminSession.createProduct(data)` e `AdminSession.createCategory(data)`: Preencher o modal de CRUD.

### 2. Tier 1: Feature Coverage (tier1-features.ts)
Criar dezenas de testes isolados para as novas regras de negócio:
- **F20 - Catálogo & Categorias no PDV**: Filtragem via busca, alteração de abas de categorias.
- **F21 - Carrinho de Compras**: Somatório de subtotais, deleção de item, agrupamento de produtos iguais.
- **F22 - Controle de Estoque Rigoroso**: UI de "Esgotado", impossibilidade de adicionar além do estoque máximo.
- **F23 - Novo Checkout e Venda Anônima**: Venda para "Cliente Não Identificado" não pontuando no ranking. Registro correto das formas de pagamento no histórico.
- **F24 - CRUD Catálogo Admin**: Criação, deleção e edição de produtos e categorias no `AdminDashboard.tsx`.

### 3. Tier 2: Boundary & Corner Cases (tier2-boundaries.ts)
Testar os limites do sistema:
- Tentar confirmar compra com carrinho vazio (deve ser bloqueado).
- Adicionar estoque = 1 e clicar em `+` no carrinho duas vezes.
- Venda de valores extremos, ou itens avulsos com valores decimais.
- Deleção de Categoria que já tem Produtos atrelados (comportamento de orfandade).

### 4. Tier 3: Cross-Feature Combinations (tier3-combinations.ts)
Cruzar os novos recursos com a fidelidade:
- Carrinho cuja soma é R$ 4,99 (não atinge F05 Regra Compra Mínima).
- Carrinho cuja soma é R$ 5,00 pagando no Dinheiro (pontua e ganha brinde se for a 10ª compra).
- Compra com itens customizados + produtos cadastrados com baixa de estoque na mesma transação.

### 5. Tier 4: Real-World Application Scenarios (tier4-scenarios.ts)
Cenários completos de ponta a ponta:
- Proprietário acessa Admin -> cria categoria "Doces" -> cria "Bolo" com 2 unidades -> vai pro Caixa -> atende cliente Fidelidade (leva 1 Bolo) -> atende cliente anônimo (leva 1 Bolo) -> o próximo cliente Fidelidade tenta comprar Bolo e vê que está "Esgotado".

## Verification Plan

### Automated Tests
Os testes atuais estão em 220. Nossa estimativa é de que subiremos para perto de **300 testes**.
- Rodar `npm run build` para garantir sanidade do TypeScript (já que vamos mexer no driver).
- Rodar `node e2e/runner.js` e comprovar **100% PASS**.

### Manual Verification
Nenhuma alteração no código fonte da aplicação em si (apenas na pasta `e2e/`), logo não há risco de quebra da interface gráfica.

---
**Podemos prosseguir com essa implementação? (Clique em Proceed ou responda no chat).**