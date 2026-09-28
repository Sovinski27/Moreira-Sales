import { Cliente, Compra, ConfiguracaoFidelidade, Categoria, Produto, Fornecedor, Insumo, FichaTecnica, HistoricoCompraInsumo } from '../types';

/**
 * Configuração padrão inicial do sistema de fidelidade.
 */
export const INITIAL_CONFIG: ConfiguracaoFidelidade = {
  id: 1,
  meta_compras_mes: 10,
  valor_minimo_pontuacao: 5.00,
  premio_descricao: '1 Café Especial com Pão na Chapa Crocante',
  mensagem_whatsapp: 'Olá, {NOME}! 🥖🎉 Que alegria! Você acabou de atingir a meta de {COMPRAS} compras este mês na Panificadora! Seu brinde especial ({PREMIO}) já está liberado no balcão. Muito obrigado pela sua preferência diária!',
  mensagem_resgate: 'Olá {NOME}! 🥖 Sentimos muito a sua falta aqui no café fresquinho da panificadora. Notamos que faz alguns dias que você não passa por aqui. Preparamos um delicioso pão na chapa quentinho como cortesia na sua próxima visita! Te esperamos hoje mesmo! ☕❤️',
  webhook_whatsapp_url: '',
};

/**
 * Clientes iniciam limpos (sem clientes falsos afetando KPIs).
 * O cliente do sistema cadastra os clientes reais no caixa ou admin.
 */
export const INITIAL_CLIENTES: Cliente[] = [];

/**
 * Compras iniciam limpas (faturamento R$ 0,00, 0 visitas, KPIs reais e limpos).
 */
export const INITIAL_COMPRAS: Compra[] = [];

/**
 * Categorias base de balcão para panificadora.
 */
export const INITIAL_CATEGORIAS: Categoria[] = [
  { id: 'cat-1', nome: 'Bebidas Quentes', icone: 'Coffee', ordem: 1 },
  { id: 'cat-2', nome: 'Pães Frescos', icone: 'Croissant', ordem: 2 },
  { id: 'cat-3', nome: 'Salgados', icone: 'Pizza', ordem: 3 },
  { id: 'cat-4', nome: 'Doces & Bolos', icone: 'Cake', ordem: 4 },
];

/**
 * Produtos base para agilizar o lançamento inicial no caixa.
 */
export const INITIAL_PRODUTOS: Produto[] = [
  { id: 'prod-1', categoria_id: 'cat-1', nome: 'Café Expresso', preco: 4.50, custo: 1.50, controlar_estoque: false, ativo: true },
  { id: 'prod-2', categoria_id: 'cat-1', nome: 'Pingado Média', preco: 6.00, custo: 2.20, controlar_estoque: false, ativo: true },
  { id: 'prod-3', categoria_id: 'cat-1', nome: 'Cappuccino', preco: 8.50, custo: 3.20, controlar_estoque: false, ativo: true },
  
  { id: 'prod-4', categoria_id: 'cat-2', nome: 'Pão Francês', preco: 0.80, custo: 0.25, controlar_estoque: false, ativo: true },
  { id: 'prod-5', categoria_id: 'cat-2', nome: 'Pão de Queijo', preco: 3.50, custo: 1.30, controlar_estoque: true, estoque_atual: 0, ativo: true },
  { id: 'prod-6', categoria_id: 'cat-2', nome: 'Pão na Chapa c/ Manteiga', preco: 5.00, custo: 1.80, controlar_estoque: false, ativo: true },
  
  { id: 'prod-7', categoria_id: 'cat-3', nome: 'Coxinha de Frango', preco: 7.00, custo: 2.80, controlar_estoque: true, estoque_atual: 0, ativo: true },
  { id: 'prod-8', categoria_id: 'cat-3', nome: 'Esfiha de Carne', preco: 6.50, custo: 2.50, controlar_estoque: true, estoque_atual: 0, ativo: true },
  
  { id: 'prod-9', categoria_id: 'cat-4', nome: 'Fatia Bolo de Cenoura', preco: 8.00, custo: 3.00, controlar_estoque: true, estoque_atual: 0, ativo: true },
  { id: 'prod-10', categoria_id: 'cat-4', nome: 'Sonho de Creme', preco: 6.00, custo: 2.40, controlar_estoque: true, estoque_atual: 0, ativo: true },
];

/**
 * Fornecedores não devem ser chumbados no código!
 * O usuário/cliente insere seus próprios fornecedores no banco de dados.
 */
export const INITIAL_FORNECEDORES: Fornecedor[] = [];

/**
 * Insumos iniciam vazios para cadastro pelo cliente.
 */
export const INITIAL_INSUMOS: Insumo[] = [];

/**
 * Fichas técnicas iniciam vazias para cadastro pelo cliente.
 */
export const INITIAL_FICHAS_TECNICAS: FichaTecnica[] = [];

/**
 * Histórico de compras de insumos inicia vazio.
 */
export const INITIAL_HISTORICO_COMPRAS: HistoricoCompraInsumo[] = [];
