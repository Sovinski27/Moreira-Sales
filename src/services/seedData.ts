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
  emissao_automatica_pdv: false,
  enviar_whatsapp_automatico: false,
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

export const INITIAL_CATEGORIAS: Categoria[] = [
  { id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Pães e panificação', icone: 'Wheat', ordem: 1 },
  { id: 'a7f4f509-60d7-4f5c-9518-0e5c186154a2', nome: 'Salgados', icone: 'Utensils', ordem: 2 },
  { id: '1f134a89-a989-4ea6-81a6-f16982a52b26', nome: 'Lanches', icone: 'Sandwich', ordem: 3 },
  { id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Doces e confeitaria', icone: 'Cake', ordem: 4 },
  { id: 'ad935d5c-c917-4e0f-8202-2f3489a5ae51', nome: 'Cafés', icone: 'Coffee', ordem: 5 },
  { id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Sucos 300 ml', icone: 'GlassWater', ordem: 6 },
  { id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Bebidas', icone: 'Cup', ordem: 7 }
];

export const UNIDADES_VENDA_MAP: Record<string, string> = {
  // Pães e panificação
  'torrada': 'kg',
  'cueca virada': 'kg',
  'pao frances': 'kg',
  'pão francês': 'kg',
  'nozinho': 'kg',
  'sonho': 'kg',
  'pao de queijo pequeno': 'kg',
  'pão de queijo pequeno': 'kg',
  'pao de queijo recheado': 'unidade',
  'pão de queijo recheado': 'unidade',
  'pao de queijo tradicional': 'unidade',
  'pão de queijo tradicional': 'unidade',
  'biscoito mineiro': 'unidade',
  'pao doce': '100 g',
  'pão doce': '100 g',
  'cuca': '100 g',
  'fatia hungra': '100 g',
  'pao de forma': '100 g',
  'pão de forma': '100 g',
  'pao caseiro': '100 g',
  'pão caseiro': '100 g',
  'chocotone grande': 'unidade',
  'mini chocotone': 'unidade',
  'panetone': 'unidade',
  'mini panetone': 'unidade',

  // Salgados
  'lanchinhos assados': 'kg',
  'pizza': 'unidade',
  'empadao': '100 g',
  'empadão': '100 g',
  'bauru (pao de forma)': 'unidade',
  'bauru (pão de forma)': 'unidade',
  'bauru de forno': 'unidade',
  'assados (sabores)': 'unidade',
  'assados da casa': 'unidade',
  'rocambole de calabresa': '100 g',
  'rocambole de frango com catupiry': '100 g',
  'coxinha': 'unidade',
  'coxinha especial': 'unidade',
  'salgadinho 60 g': 'unidade',
  'salgadinho': 'unidade',
  'pastelzinho': 'unidade',
  'bolinha de carne': 'unidade',
  'bolinha de carne seca': 'unidade',

  // Lanches
  'x-burguer': 'unidade',
  'x-búrguer': 'unidade',
  'x burguer': 'unidade',
  'x-salada': 'unidade',
  'x salada': 'unidade',
  'x-bacon': 'unidade',
  'x bacon': 'unidade',
  'x-calabresa': 'unidade',
  'x calabresa': 'unidade',
  'x-frango': 'unidade',
  'x frango': 'unidade',
  'x-egg': 'unidade',
  'x egg': 'unidade',
  'x-tudo': 'unidade',
  'x tudo': 'unidade',
  'pao com manteiga': 'unidade',
  'pão com manteiga': 'unidade',
  'misto quente simples': 'unidade',
  'misto quente duplo': 'unidade',
  'bauru': 'unidade',
  'pao com 1 ovo': 'unidade',
  'pão com 1 ovo': 'unidade',
  'pao com ovo': 'unidade',

  // Doces e confeitaria
  'suspiro': 'kg',
  'bolacha mantecal': '100 g',
  'bolacha beliscao': '100 g',
  'bolacha beliscão': '100 g',
  'bolacha de nata': '100 g',
  'bolacha pet four': '100 g',
  'cocadinha': '100 g',
  'cocada': 'unidade',
  'carolina de limao': '100 g',
  'carolina de limão': '100 g',
  'carolina de doce de leite': '100 g',
  'carolina de chocolate': '100 g',
  'carolina de brigadeiro': '100 g',
  'carolina de maracuja': '100 g',
  'carolina de maracujá': '100 g',
  'brigadeiro grande': 'unidade',
  'brigadeiro pequeno': 'unidade',
  'beijinho grande': 'unidade',
  'beijinho pequeno': 'unidade',
  'docinho de ninho com nutella grande': 'unidade',
  'docinho de ninho com nutella pequeno': 'unidade',
  'bomba de morango': 'unidade',
  'bomba de nutella': 'unidade',
  'bomba de chocolate': 'unidade',
  'bomba de chocolate branco': 'unidade',
  'cone trufado': 'unidade',
  'pao de mel': 'unidade',
  'pão de mel': 'unidade',
  'copinho de beijinho': 'unidade',
  'copinho de brigadeiro': 'unidade',
  'tortinha de brigadeiro': 'unidade',
  'tortinha de limao': 'unidade',
  'tortinha de limão': 'unidade',
  'morango de amor trufado': 'unidade',
  'bolo ingles 300 g (sabores)': 'unidade',
  'bolo inglês 300 g (sabores)': 'unidade',
  'banofe': '100 g',

  // Cafés
  'cafe pequeno': 'unidade',
  'café pequeno': 'unidade',
  'cafe medio': 'unidade',
  'café médio': 'unidade',
  'cafe grande': 'unidade',
  'café grande': 'unidade',
  'pingado': 'unidade',
  'pingado grande': 'unidade',
  'achocolatado': 'unidade',
  'achocolatado grande': 'unidade',
  'cappuccino': 'unidade',
  'cappuccino grande': 'unidade',
  'cappuccino com chantilly': 'unidade',

  // Sucos 300 ml
  'abacaxi com agua': '300 ml',
  'abacaxi com água': '300 ml',
  'abacaxi com leite': '300 ml',
  'abacaxi com hortela com agua': '300 ml',
  'abacaxi com hortelã com água': '300 ml',
  'abacaxi com hortela com leite': '300 ml',
  'abacaxi com hortelã com leite': '300 ml',
  'acerola com agua': '300 ml',
  'acerola com água': '300 ml',
  'acerola com leite': '300 ml',
  'cupuacu com agua': '300 ml',
  'cupuaçu com água': '300 ml',
  'cupuacu com leite': '300 ml',
  'cupuaçu com leite': '300 ml',
  'goiaba com agua': '300 ml',
  'goiaba com água': '300 ml',
  'goiaba com leite': '300 ml',
  'laranja natural com agua': '300 ml',
  'laranja natural com água': '300 ml',
  'laranja natural com leite': '300 ml',
  'limao com agua': '300 ml',
  'limão com água': '300 ml',
  'limao com leite': '300 ml',
  'limão com leite': '300 ml',
  'morango com agua': '300 ml',
  'morango com água': '300 ml',
  'morango com leite': '300 ml',
  'uva com agua': '300 ml',
  'uva com água': '300 ml',
  'uva com leite': '300 ml',
  'frutas vermelhas com agua': '300 ml',
  'frutas vermelhas com água': '300 ml',
  'frutas vermelhas com leite': '300 ml',
  'salada de frutas com agua': '300 ml',
  'salada de frutas com água': '300 ml',
  'salada de frutas com leite': '300 ml',

  // Bebidas (46 itens)
  'coca-cola ks 290 ml': 'unidade',
  'coca-cola lata 350 ml': 'unidade',
  'coca-cola lata 220 ml': 'unidade',
  'coca-cola pet 200 ml': 'unidade',
  'coca-cola pet 2 l': 'unidade',
  'coca-cola pet 1 l': 'unidade',
  'coca-cola retornavel 1 l': 'unidade',
  'coca-cola retornável 1 l': 'unidade',
  'coca-cola retornavel 2 l': 'unidade',
  'coca-cola retornável 2 l': 'unidade',
  'coca-cola 600 ml': 'unidade',
  'sprite lata 220 ml': 'unidade',
  'sprite lata 350 ml': 'unidade',
  'sprite pet 200 ml': 'unidade',
  'sprite pet 600 ml': 'unidade',
  'sprite pet 2 l': 'unidade',
  'agua saborizada': 'unidade',
  'água saborizada': 'unidade',
  'schweppes citrus': 'unidade',
  'schweppes tonica': 'unidade',
  'schweppes tônica': 'unidade',
  'guarana lata 350 ml': 'unidade',
  'guaraná lata 350 ml': 'unidade',
  'guarana pet 200 ml': 'unidade',
  'guaraná pet 200 ml': 'unidade',
  'guarana pet 600 ml': 'unidade',
  'guaraná pet 600 ml': 'unidade',
  'guarana pet 1 l': 'unidade',
  'guaraná pet 1 l': 'unidade',
  'guarana pet 2 l': 'unidade',
  'guaraná pet 2 l': 'unidade',
  'pepsi lata 350 ml': 'unidade',
  'pepsi pet 200 ml': 'unidade',
  'pepsi pet 600 ml': 'unidade',
  'pepsi pet 1 l': 'unidade',
  'pepsi pet 2 l': 'unidade',
  'gatorade (sabores)': 'unidade',
  'gatorade': 'unidade',
  'h2o limao': 'unidade',
  'h2o limão': 'unidade',
  'h2o limoneto': 'unidade',
  'del valle caixa 1 l (sabores)': 'unidade',
  'del valle caixa 1 l': 'unidade',
  'del valle lata 290 ml': 'unidade',
  'del valle kapo (sabores)': 'unidade',
  'del valle kapo': 'unidade',
  'del valle pet 450 ml': 'unidade',
  'tampico 450 ml': 'unidade',
  'tampico 2 l': 'unidade',
  'suco skinka 450 ml': 'unidade',
  'prats 300 ml': 'unidade',
  'prats 900 ml': 'unidade',
  'prats 1,5 l': 'unidade',
  'fruitz 300 ml': 'unidade',
  'fruitz 900 ml': 'unidade',
  'fruitz 1,5 l': 'unidade',
  'powerade (sabores)': 'unidade',
  'powerade': 'unidade',
  'agua sem gas': 'unidade',
  'água sem gás': 'unidade',
  'agua com gas': 'unidade',
  'água com gás': 'unidade',
  // Frios e Itens por Peso comuns
  'mussarela': 'kg',
  'muçarela': 'kg',
  'queijo mussarela': 'kg',
  'presunto': 'kg',
  'apresuntado': 'kg',
  'mortadela': 'kg',
  'salame': 'kg',
  'peito de peru': 'kg'
};

export function obterUnidadeVendaPadrao(nomeProduto: string): string {
  if (!nomeProduto) return 'unidade';
  const clean = nomeProduto.trim().toLowerCase();
  if (UNIDADES_VENDA_MAP[clean]) return UNIDADES_VENDA_MAP[clean];
  
  const normalized = clean
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (UNIDADES_VENDA_MAP[normalized]) return UNIDADES_VENDA_MAP[normalized];

  if (normalized.includes('kg') || normalized.includes('quilo') || normalized.includes('mussarela') || normalized.includes('mucarela') || normalized.includes('presunto') || normalized.includes('mortadela')) return 'kg';
  if (normalized.includes('100 g') || normalized.includes('100g')) return '100 g';
  if (normalized.includes('300 ml') || normalized.includes('suco')) return '300 ml';
  return 'unidade';
}

/**
 * Produtos Oficiais da Panificadora Moreira Sales
 * 107 itens com Categoria, Nome, Preço e Unidade de Venda
 */
export const INITIAL_PRODUTOS: Produto[] = [
  // --- PÃES E PANIFICAÇÃO ---
  { id: 'prod-paes-01', categoria_id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Torrada', preco: 39.90, unidade_venda: 'kg', ativo: true },
  { id: 'prod-paes-02', categoria_id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Cueca virada', preco: 39.90, unidade_venda: 'kg', ativo: true },
  { id: 'prod-paes-03', categoria_id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Pão francês', preco: 21.90, unidade_venda: 'kg', ativo: true },
  { id: 'prod-paes-04', categoria_id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Nozinho', preco: 39.90, unidade_venda: 'kg', ativo: true },
  { id: 'prod-paes-05', categoria_id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Sonho', preco: 39.90, unidade_venda: 'kg', ativo: true },
  { id: 'prod-paes-06', categoria_id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Pão de queijo pequeno', preco: 54.90, unidade_venda: 'kg', ativo: true },
  { id: 'prod-paes-07', categoria_id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Pão de queijo recheado', preco: 5.50, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-paes-08', categoria_id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Pão de queijo tradicional', preco: 2.50, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-paes-09', categoria_id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Biscoito mineiro', preco: 5.50, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-paes-10', categoria_id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Pão doce', preco: 2.59, unidade_venda: '100 g', ativo: true },
  { id: 'prod-paes-11', categoria_id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Cuca', preco: 2.90, unidade_venda: '100 g', ativo: true },
  { id: 'prod-paes-12', categoria_id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Fatia hungra', preco: 2.90, unidade_venda: '100 g', ativo: true },
  { id: 'prod-paes-13', categoria_id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Pão de forma', preco: 2.49, unidade_venda: '100 g', ativo: true },
  { id: 'prod-paes-14', categoria_id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Pão caseiro', preco: 2.90, unidade_venda: '100 g', ativo: true },
  { id: 'prod-paes-15', categoria_id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Chocotone grande', preco: 14.99, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-paes-16', categoria_id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Mini chocotone', preco: 5.99, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-paes-17', categoria_id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Panetone', preco: 12.99, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-paes-18', categoria_id: 'd48e004a-5942-467b-b0de-a8cad865636f', nome: 'Mini panetone', preco: 4.99, unidade_venda: 'unidade', ativo: true },

  // --- SALGADOS ---
  { id: 'prod-salg-01', categoria_id: 'a7f4f509-60d7-4f5c-9518-0e5c186154a2', nome: 'Lanchinhos assados', preco: 44.90, unidade_venda: 'kg', ativo: true },
  { id: 'prod-salg-02', categoria_id: 'a7f4f509-60d7-4f5c-9518-0e5c186154a2', nome: 'Pizza', preco: 10.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-salg-03', categoria_id: 'a7f4f509-60d7-4f5c-9518-0e5c186154a2', nome: 'Empadão', preco: 5.90, unidade_venda: '100 g', ativo: true },
  { id: 'prod-salg-04', categoria_id: 'a7f4f509-60d7-4f5c-9518-0e5c186154a2', nome: 'Bauru (pão de forma)', preco: 12.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-salg-05', categoria_id: 'a7f4f509-60d7-4f5c-9518-0e5c186154a2', nome: 'Bauru de forno', preco: 15.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-salg-06', categoria_id: 'a7f4f509-60d7-4f5c-9518-0e5c186154a2', nome: 'Assados (sabores)', preco: 12.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-salg-07', categoria_id: 'a7f4f509-60d7-4f5c-9518-0e5c186154a2', nome: 'Rocambole de calabresa', preco: 5.90, unidade_venda: '100 g', ativo: true },
  { id: 'prod-salg-08', categoria_id: 'a7f4f509-60d7-4f5c-9518-0e5c186154a2', nome: 'Rocambole de frango com Catupiry', preco: 5.90, unidade_venda: '100 g', ativo: true },
  { id: 'prod-salg-09', categoria_id: 'a7f4f509-60d7-4f5c-9518-0e5c186154a2', nome: 'Coxinha', preco: 10.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-salg-10', categoria_id: 'a7f4f509-60d7-4f5c-9518-0e5c186154a2', nome: 'Coxinha especial', preco: 12.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-salg-11', categoria_id: 'a7f4f509-60d7-4f5c-9518-0e5c186154a2', nome: 'Salgadinho 60 g', preco: 2.50, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-salg-12', categoria_id: 'a7f4f509-60d7-4f5c-9518-0e5c186154a2', nome: 'Pastelzinho', preco: 2.50, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-salg-13', categoria_id: 'a7f4f509-60d7-4f5c-9518-0e5c186154a2', nome: 'Bolinha de carne', preco: 12.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-salg-14', categoria_id: 'a7f4f509-60d7-4f5c-9518-0e5c186154a2', nome: 'Bolinha de carne seca', preco: 12.00, unidade_venda: 'unidade', ativo: true },

  // --- LANCHES ---
  { id: 'prod-lan-01', categoria_id: '1f134a89-a989-4ea6-81a6-f16982a52b26', nome: 'X-búrguer', preco: 19.90, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-lan-02', categoria_id: '1f134a89-a989-4ea6-81a6-f16982a52b26', nome: 'X-salada', preco: 22.90, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-lan-03', categoria_id: '1f134a89-a989-4ea6-81a6-f16982a52b26', nome: 'X-bacon', preco: 28.90, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-lan-04', categoria_id: '1f134a89-a989-4ea6-81a6-f16982a52b26', nome: 'X-calabresa', preco: 28.90, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-lan-05', categoria_id: '1f134a89-a989-4ea6-81a6-f16982a52b26', nome: 'X-frango', preco: 26.90, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-lan-06', categoria_id: '1f134a89-a989-4ea6-81a6-f16982a52b26', nome: 'X-egg', preco: 26.90, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-lan-07', categoria_id: '1f134a89-a989-4ea6-81a6-f16982a52b26', nome: 'X-tudo', preco: 38.90, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-lan-08', categoria_id: '1f134a89-a989-4ea6-81a6-f16982a52b26', nome: 'Pão com manteiga', preco: 4.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-lan-09', categoria_id: '1f134a89-a989-4ea6-81a6-f16982a52b26', nome: 'Misto quente simples', preco: 10.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-lan-10', categoria_id: '1f134a89-a989-4ea6-81a6-f16982a52b26', nome: 'Misto quente duplo', preco: 12.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-lan-11', categoria_id: '1f134a89-a989-4ea6-81a6-f16982a52b26', nome: 'Bauru', preco: 14.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-lan-12', categoria_id: '1f134a89-a989-4ea6-81a6-f16982a52b26', nome: 'Pão com 1 ovo', preco: 6.00, unidade_venda: 'unidade', ativo: true },

  // --- DOCES E CONFEITARIA ---
  { id: 'prod-doc-01', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Suspiro', preco: 99.90, unidade_venda: 'kg', ativo: true },
  { id: 'prod-doc-02', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Bolacha mantecal', preco: 6.50, unidade_venda: '100 g', ativo: true },
  { id: 'prod-doc-03', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Bolacha beliscão', preco: 6.50, unidade_venda: '100 g', ativo: true },
  { id: 'prod-doc-04', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Bolacha de nata', preco: 6.50, unidade_venda: '100 g', ativo: true },
  { id: 'prod-doc-05', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Bolacha pet four', preco: 6.50, unidade_venda: '100 g', ativo: true },
  { id: 'prod-doc-06', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Cocadinha', preco: 6.50, unidade_venda: '100 g', ativo: true },
  { id: 'prod-doc-07', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Cocada', preco: 6.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-08', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Carolina de limão', preco: 7.90, unidade_venda: '100 g', ativo: true },
  { id: 'prod-doc-09', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Carolina de doce de leite', preco: 7.90, unidade_venda: '100 g', ativo: true },
  { id: 'prod-doc-10', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Carolina de chocolate', preco: 7.90, unidade_venda: '100 g', ativo: true },
  { id: 'prod-doc-11', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Carolina de brigadeiro', preco: 7.90, unidade_venda: '100 g', ativo: true },
  { id: 'prod-doc-12', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Carolina de maracujá', preco: 7.90, unidade_venda: '100 g', ativo: true },
  { id: 'prod-doc-13', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Brigadeiro grande', preco: 7.90, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-14', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Brigadeiro pequeno', preco: 2.50, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-15', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Beijinho grande', preco: 8.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-16', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Beijinho pequeno', preco: 2.50, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-17', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Docinho de Ninho com Nutella grande', preco: 10.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-18', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Docinho de Ninho com Nutella pequeno', preco: 3.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-19', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Bomba de morango', preco: 15.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-20', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Bomba de Nutella', preco: 16.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-21', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Bomba de chocolate', preco: 12.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-22', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Bomba de chocolate branco', preco: 12.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-23', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Cone trufado', preco: 14.90, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-24', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Pão de mel', preco: 8.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-25', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Copinho de beijinho', preco: 8.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-26', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Copinho de brigadeiro', preco: 8.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-27', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Tortinha de brigadeiro', preco: 12.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-28', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Tortinha de limão', preco: 12.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-29', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Morango de amor trufado', preco: 18.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-30', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Bolo inglês 300 g (sabores)', preco: 18.90, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-doc-31', categoria_id: '5a6d4bbd-2bec-4783-b656-7228805fee24', nome: 'Banofe', preco: 6.00, unidade_venda: '100 g', ativo: true },

  // --- CAFÉS ---
  { id: 'prod-caf-01', categoria_id: 'ad935d5c-c917-4e0f-8202-2f3489a5ae51', nome: 'Café pequeno', preco: 3.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-caf-02', categoria_id: 'ad935d5c-c917-4e0f-8202-2f3489a5ae51', nome: 'Café médio', preco: 5.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-caf-03', categoria_id: 'ad935d5c-c917-4e0f-8202-2f3489a5ae51', nome: 'Café grande', preco: 7.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-caf-04', categoria_id: 'ad935d5c-c917-4e0f-8202-2f3489a5ae51', nome: 'Pingado', preco: 5.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-caf-05', categoria_id: 'ad935d5c-c917-4e0f-8202-2f3489a5ae51', nome: 'Pingado grande', preco: 7.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-caf-06', categoria_id: 'ad935d5c-c917-4e0f-8202-2f3489a5ae51', nome: 'Achocolatado', preco: 8.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-caf-07', categoria_id: 'ad935d5c-c917-4e0f-8202-2f3489a5ae51', nome: 'Achocolatado grande', preco: 10.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-caf-08', categoria_id: 'ad935d5c-c917-4e0f-8202-2f3489a5ae51', nome: 'Cappuccino', preco: 8.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-caf-09', categoria_id: 'ad935d5c-c917-4e0f-8202-2f3489a5ae51', nome: 'Cappuccino grande', preco: 10.00, unidade_venda: 'unidade', ativo: true },
  { id: 'prod-caf-10', categoria_id: 'ad935d5c-c917-4e0f-8202-2f3489a5ae51', nome: 'Cappuccino com chantilly', preco: 13.00, unidade_venda: 'unidade', ativo: true },

  // --- SUCOS 300 ML ---
  { id: 'prod-suc-01', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Abacaxi com água', preco: 12.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-02', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Abacaxi com leite', preco: 13.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-03', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Abacaxi com hortelã com água', preco: 12.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-04', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Abacaxi com hortelã com leite', preco: 13.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-05', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Acerola com água', preco: 12.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-06', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Acerola com leite', preco: 13.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-07', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Cupuaçu com água', preco: 12.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-08', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Cupuaçu com leite', preco: 13.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-09', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Goiaba com água', preco: 12.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-10', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Goiaba com leite', preco: 13.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-11', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Laranja natural com água', preco: 12.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-12', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Laranja natural com leite', preco: 13.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-13', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Limão com água', preco: 12.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-14', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Limão com leite', preco: 13.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-15', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Morango com água', preco: 12.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-16', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Morango com leite', preco: 13.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-17', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Uva com água', preco: 12.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-18', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Uva com leite', preco: 13.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-19', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Frutas vermelhas com água', preco: 12.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-20', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Frutas vermelhas com leite', preco: 13.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-21', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Salada de frutas com água', preco: 12.00, unidade_venda: '300 ml', ativo: true },
  { id: 'prod-suc-22', categoria_id: '618f4cea-bab4-4be1-ab76-fc44d35f4393', nome: 'Salada de frutas com leite', preco: 13.00, unidade_venda: '300 ml', ativo: true },

  // --- BEBIDAS (46 ITENS) ---
  { id: 'f0c18403-224c-482d-a0de-23fe08f4d34b', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Coca-Cola KS 290 ml', preco: 6.00, unidade_venda: 'unidade', ativo: true },
  { id: 'e6536022-a0b4-40ce-a551-33974971d20b', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Coca-Cola lata 350 ml', preco: 6.00, unidade_venda: 'unidade', ativo: true },
  { id: 'eec2d7a8-c243-4dd1-bcf8-63aee0d24c24', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Coca-Cola lata 220 ml', preco: 4.99, unidade_venda: 'unidade', ativo: true },
  { id: '09097140-363e-412c-8d50-ab2487679f15', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Coca-Cola PET 200 ml', preco: 3.50, unidade_venda: 'unidade', ativo: true },
  { id: '36886ba8-43de-44fc-a272-40b5f6b8d999', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Coca-Cola PET 2 L', preco: 15.00, unidade_venda: 'unidade', ativo: true },
  { id: '9b214fdd-2488-42b7-97c8-26e010ffd41d', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Coca-Cola PET 1 L', preco: 9.90, unidade_venda: 'unidade', ativo: true },
  { id: 'db2d7f5f-da64-4adb-a5f9-2af8a33ad0bf', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Coca-Cola retornável 1 L', preco: 9.00, unidade_venda: 'unidade', ativo: true },
  { id: 'c949c5ed-fea3-4f61-864b-857b7fb45c67', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Coca-Cola retornável 2 L', preco: 10.00, unidade_venda: 'unidade', ativo: true },
  { id: '38cbd2bb-c711-4b03-849a-e4c631cc6ada', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Coca-Cola 600 ml', preco: 8.00, unidade_venda: 'unidade', ativo: true },
  { id: '033cc816-e0ef-40dd-a622-33720f33801c', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Sprite lata 220 ml', preco: 4.99, unidade_venda: 'unidade', ativo: true },
  { id: 'ed9b555f-258d-4660-8e57-388f33f93be3', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Sprite lata 350 ml', preco: 6.00, unidade_venda: 'unidade', ativo: true },
  { id: '126e24c5-a0e8-4582-99a3-15b86ae2d361', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Sprite PET 200 ml', preco: 3.50, unidade_venda: 'unidade', ativo: true },
  { id: 'dc170d32-7679-4408-b89f-c0b0d368b614', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Sprite PET 600 ml', preco: 8.00, unidade_venda: 'unidade', ativo: true },
  { id: '81a4e425-b733-429f-8e41-7f583e43d6a6', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Sprite PET 2 L', preco: 12.00, unidade_venda: 'unidade', ativo: true },
  { id: '754b6d7b-8eb3-43a8-bfbc-8b6b365f8a9d', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Água saborizada', preco: 8.00, unidade_venda: 'unidade', ativo: true },
  { id: '643cc3bb-80af-44cf-92c4-1213777df8c8', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Schweppes Citrus', preco: 7.00, unidade_venda: 'unidade', ativo: true },
  { id: '4cb3a424-a975-4121-9526-39fc346710e6', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Schweppes Tônica', preco: 7.00, unidade_venda: 'unidade', ativo: true },
  { id: 'f546e13b-f81b-4f2d-9713-fcaa98d26e2f', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Guaraná lata 350 ml', preco: 6.00, unidade_venda: 'unidade', ativo: true },
  { id: '2f634f9b-3971-48d8-bfd4-d328cb1f60b7', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Guaraná PET 200 ml', preco: 3.50, unidade_venda: 'unidade', ativo: true },
  { id: 'caf27ae0-9b77-4a79-abb3-2508a97fa400', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Guaraná PET 600 ml', preco: 8.00, unidade_venda: 'unidade', ativo: true },
  { id: '902e2a67-248a-4a09-8d13-b77570fd5bc2', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Guaraná PET 1 L', preco: 9.99, unidade_venda: 'unidade', ativo: true },
  { id: 'a64909b3-e90c-4e79-8bc4-e90dd109c494', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Guaraná PET 2 L', preco: 12.00, unidade_venda: 'unidade', ativo: true },
  { id: 'fff65e90-5f1f-4a24-8146-633338af31b6', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Pepsi lata 350 ml', preco: 6.00, unidade_venda: 'unidade', ativo: true },
  { id: '8b39611a-56c2-4ae3-b831-688b31705a42', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Pepsi PET 200 ml', preco: 3.50, unidade_venda: 'unidade', ativo: true },
  { id: '1e7c4a7a-b5c3-4cee-8cb5-9d432d3964c7', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Pepsi PET 600 ml', preco: 8.00, unidade_venda: 'unidade', ativo: true },
  { id: '39ad6a9e-f9d6-448e-b66c-154f508aeeab', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Pepsi PET 1 L', preco: 9.99, unidade_venda: 'unidade', ativo: true },
  { id: '18c6ef83-a6f7-42a4-862b-ad003dc314e6', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Pepsi PET 2 L', preco: 12.00, unidade_venda: 'unidade', ativo: true },
  { id: 'c291205e-a2b9-4757-8adf-fac5a5e5ef4c', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Gatorade (sabores)', preco: 7.99, unidade_venda: 'unidade', ativo: true },
  { id: '5aa3804d-476b-46f5-9ca7-c5bfe50ff102', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'H2O limão', preco: 7.99, unidade_venda: 'unidade', ativo: true },
  { id: '2451e985-1289-4d55-be05-42d28b7209c6', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'H2O limoneto', preco: 7.99, unidade_venda: 'unidade', ativo: true },
  { id: '1cbdb4c6-0ce0-4aa5-bbe8-b3e5363e12c6', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Del Valle caixa 1 L (sabores)', preco: 12.00, unidade_venda: 'unidade', ativo: true },
  { id: 'd2957058-4349-46be-be35-7dc33d7a32fe', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Del Valle lata 290 ml', preco: 7.99, unidade_venda: 'unidade', ativo: true },
  { id: 'a58b52a7-6f5d-4e3b-8bf7-d7ebe1f4b10a', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Del Valle Kapo (sabores)', preco: 3.75, unidade_venda: 'unidade', ativo: true },
  { id: '7cec4955-ac23-409b-9244-58ffbd47c6fe', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Del Valle PET 450 ml', preco: 5.99, unidade_venda: 'unidade', ativo: true },
  { id: 'bd8f15c6-b56f-4b62-bbb5-8c1e47190478', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Tampico 450 ml', preco: 7.00, unidade_venda: 'unidade', ativo: true },
  { id: '95417ebb-aa54-46b4-8238-46eaa934f381', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Tampico 2 L', preco: 16.00, unidade_venda: 'unidade', ativo: true },
  { id: '37f1205d-c91c-4541-8223-28ad9ec192a0', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Suco Skinka 450 ml', preco: 5.99, unidade_venda: 'unidade', ativo: true },
  { id: '3deee62e-3f98-4d7d-ad2f-7a11d9770e90', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Prats 300 ml', preco: 9.99, unidade_venda: 'unidade', ativo: true },
  { id: '5a186a1a-41a8-412d-905a-b52a93a352d7', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Prats 900 ml', preco: 18.99, unidade_venda: 'unidade', ativo: true },
  { id: '42e9e642-ea81-4931-b40b-85dd5e340b99', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Prats 1,5 L', preco: 32.90, unidade_venda: 'unidade', ativo: true },
  { id: 'd9696f41-463b-4898-b52f-a75298161593', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Fruitz 300 ml', preco: 6.99, unidade_venda: 'unidade', ativo: true },
  { id: 'e9472729-338d-49af-bb10-8669c3bf8c79', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Fruitz 900 ml', preco: 13.90, unidade_venda: 'unidade', ativo: true },
  { id: '579f9352-5025-4a7c-a13a-9336a1517858', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Fruitz 1,5 L', preco: 20.00, unidade_venda: 'unidade', ativo: true },
  { id: 'bb107031-48ca-4caf-a47b-e03707425ffa', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Powerade (sabores)', preco: 7.99, unidade_venda: 'unidade', ativo: true },
  { id: '5d5833d4-aae8-489c-90b1-846c3987cf1d', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Água sem gás', preco: 3.50, unidade_venda: 'unidade', ativo: true },
  { id: '226e1b39-8315-40ce-85fe-6d6f24b93e17', categoria_id: 'b85a5b17-b222-40a3-9d2a-c4de3948ded1', nome: 'Água com gás', preco: 4.00, unidade_venda: 'unidade', ativo: true }
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
