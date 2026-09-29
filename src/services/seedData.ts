import { Cliente, Compra, ConfiguracaoFidelidade, Categoria, Produto, Fornecedor, Insumo, FichaTecnica, HistoricoCompraInsumo, ConfiguracaoFiscal, NotaFiscal } from '../types';

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
 * Configuração Fiscal padrão para emissão de NF-e e NFC-e
 */
export const INITIAL_CONFIG_FISCAL: ConfiguracaoFiscal = {
  cnpj: '12.345.678/0001-90',
  cnpj_emitente: '12.345.678/0001-90',
  razao_social: 'Panificadora & Confeitaria Moreira Sales Ltda',
  nome_fantasia: 'Panificadora Moreira Sales',
  inscricao_estadual: '90812345-67',
  regime_tributario: 'simples_nacional',
  ambiente: 'homologacao', // Inicia em homologação / testes seguro
  serie_nfce: 1,
  numero_atual_nfce: 100,
  serie_nfe: 1,
  numero_atual_nfe: 1,
  ultimo_numero_nfe: 100,
  csc_id: '000001',
  csc_token: 'A8B9C0D1E2F3456789ABCDEF01234567',
  provedor: 'simulador',
  certificado_ativo: true,
  certificado_nome: 'Certificado A1 - Moreira Sales (Ativo)',
  certificado_validade: '2027-12-31',
  emissao_automatica_pdv: true,
  enviar_whatsapp_automatico: true,
  mensagem_whatsapp_nfe: 'Olá, {NOME}! 🥖📄 Segue o comprovante fiscal da sua compra na Panificadora Moreira Sales. Você pode acessar o Cupom Fiscal / DANFE eletrônico diretamente pelo link abaixo:\n\n🔗 *DANFE Online:* {LINK_DANFE}\n🔑 *Chave de Acesso:* {CHAVE_NFE}\n\nMuito obrigado pela sua preferência e volte sempre!',
  ncm_padrao: '1905.90.90',
  cfop_padrao: '5.102',
  endereco: {
    logradouro: 'Av. Brasil',
    numero: '1500',
    complemento: 'Térreo - Centro Comercial',
    bairro: 'Centro',
    municipio: 'Moreira Sales',
    uf: 'PR',
    cep: '87370-000',
    ibge_municipio: '4116304'
  }
};

export const INITIAL_NOTAS_FISCAIS: NotaFiscal[] = [];

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
 * Categorias iniciam limpas.
 * Alimentadas exclusivamente pelo catálogo de produtos cadastrados no painel administrativo.
 */
export const INITIAL_CATEGORIAS: Categoria[] = [];

/**
 * Produtos iniciam limpos.
 * O PDV é alimentado exclusivamente pelos produtos cadastrados e vinculados às categorias no painel administrativo.
 */
export const INITIAL_PRODUTOS: Produto[] = [];

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
