import { Cliente, Compra, ConfiguracaoFidelidade } from '../types';

export const INITIAL_CONFIG: ConfiguracaoFidelidade = {
  id: 1,
  meta_compras_mes: 10,
  valor_minimo_pontuacao: 5.00,
  premio_descricao: '1 Café Especial com Pão na Chapa Crocante',
  mensagem_whatsapp: 'Olá, {NOME}! 🥖🎉 Que alegria! Você acabou de atingir a meta de {COMPRAS} compras este mês na Panificadora! Seu brinde especial ({PREMIO}) já está liberado no balcão. Muito obrigado pela sua preferência diária!',
  mensagem_resgate: 'Olá {NOME}! 🥖 Sentimos muito a sua falta aqui no café fresquinho da panificadora. Notamos que faz alguns dias que você não passa por aqui. Preparamos um delicioso pão na chapa quentinho como cortesia na sua próxima visita! Te esperamos hoje mesmo! ☕❤️',
  webhook_whatsapp_url: '',
};

export const INITIAL_CLIENTES: Cliente[] = [];

export const INITIAL_COMPRAS: Compra[] = [];

export const INITIAL_CATEGORIAS: any[] = [];

export const INITIAL_PRODUTOS: any[] = [];

export const INITIAL_FORNECEDORES: any[] = [];

export const INITIAL_INSUMOS: any[] = [];

export const INITIAL_FICHAS_TECNICAS: any[] = [];
