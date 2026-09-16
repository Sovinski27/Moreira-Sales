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

// Gerador auxiliar de datas
const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth(); // 0-11

const getIsoDate = (year: number, month: number, day: number) => {
  const d = new Date(year, month, day, 12, 0, 0);
  return d.toISOString().split('T')[0];
};

// Dias no mês anterior para cálculo determinístico de anti-churn
const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
const prevMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
const targetValdomiroDaysAgo = 20; // Alvo entre 18 e 22 dias atrás
const targetValdomiroDate = new Date(today.getTime() - targetValdomiroDaysAgo * 24 * 60 * 60 * 1000);
const valdomiroLastDay = (targetValdomiroDate.getMonth() === prevMonthIndex)
  ? targetValdomiroDate.getDate()
  : Math.min(prevMonthDays, 22);

export const INITIAL_CLIENTES: Cliente[] = [
  {
    id: 'cli-01',
    nome: 'Dona Marlene Silva',
    whatsapp: '44998765432',
    total_compras_historico: 34,
    criado_em: '2026-01-10T07:30:00Z',
    ultimo_contato_resgate: null
  },
  {
    id: 'cli-02',
    nome: 'Seu Antônio Moreira',
    whatsapp: '44991234567',
    total_compras_historico: 48,
    criado_em: '2026-01-05T06:45:00Z',
    ultimo_contato_resgate: null
  },
  {
    id: 'cli-03',
    nome: 'Dr. Carlos Eduardo Mendes',
    whatsapp: '44988112233',
    total_compras_historico: 26,
    criado_em: '2026-02-01T08:15:00Z',
    ultimo_contato_resgate: null
  },
  {
    id: 'cli-04',
    nome: 'Prof. Renata Guimarães',
    whatsapp: '44997788990',
    total_compras_historico: 19,
    criado_em: '2026-02-14T07:10:00Z',
    ultimo_contato_resgate: null
  },
  {
    id: 'cli-05',
    nome: 'Felipe Takahashi',
    whatsapp: '44996655443',
    total_compras_historico: 15,
    criado_em: '2026-03-01T09:20:00Z',
    ultimo_contato_resgate: null
  },
  {
    id: 'cli-06',
    nome: 'Luciana Albuquerque',
    whatsapp: '44984321098',
    total_compras_historico: 11,
    criado_em: '2026-03-10T16:40:00Z',
    ultimo_contato_resgate: null
  },
  {
    id: 'cli-07',
    nome: 'Sr. Valdomiro Souza',
    whatsapp: '44991827364',
    total_compras_historico: 22,
    criado_em: '2026-01-15T07:00:00Z',
    ultimo_contato_resgate: null
  },
  {
    id: 'cli-08',
    nome: 'Dra. Beatriz Fontana',
    whatsapp: '44988776655',
    total_compras_historico: 18,
    criado_em: '2026-01-20T17:30:00Z',
    ultimo_contato_resgate: '2026-09-08'
  },
  {
    id: 'cli-09',
    nome: 'Tiago Barbosa',
    whatsapp: '44995544332',
    total_compras_historico: 4,
    criado_em: '2026-04-02T11:00:00Z',
    ultimo_contato_resgate: null
  },
  {
    id: 'cli-10',
    nome: 'Camila Nogueira',
    whatsapp: '44992233445',
    total_compras_historico: 3,
    criado_em: '2026-04-12T15:10:00Z',
    ultimo_contato_resgate: null
  }
];

const formasPagamento = ['pix', 'cartao_credito', 'pix', 'cartao_debito', 'pix', 'dinheiro'];

export const INITIAL_COMPRAS: Compra[] = [
  // Dona Marlene: 12 compras este mês (já bateu a meta de 10!)
  ...Array.from({ length: 12 }, (_, i) => {
    const valor = 14.50 + (i % 3) * 4;
    return {
      id: `comp-marlene-${i + 1}`,
      cliente_id: 'cli-01',
      valor,
      custo_total: Number((valor * 0.42).toFixed(2)),
      data_compra: getIsoDate(currentYear, currentMonth, Math.max(1, today.getDate() - (12 - i))),
      criado_em: new Date(currentYear, currentMonth, Math.max(1, today.getDate() - (12 - i)), 7, 30).toISOString(),
      pontuou_fidelidade: true,
      forma_pagamento: formasPagamento[i % formasPagamento.length]
    };
  }),

  // Seu Antônio: 9 compras este mês (na 9ª compra, a próxima vai dar brinde!)
  ...Array.from({ length: 9 }, (_, i) => {
    const valor = 9.00 + (i % 2) * 6.5;
    return {
      id: `comp-antonio-${i + 1}`,
      cliente_id: 'cli-02',
      valor,
      custo_total: Number((valor * 0.40).toFixed(2)),
      data_compra: getIsoDate(currentYear, currentMonth, Math.max(1, today.getDate() - (9 - i))),
      criado_em: new Date(currentYear, currentMonth, Math.max(1, today.getDate() - (9 - i)), 6, 45).toISOString(),
      pontuou_fidelidade: true,
      forma_pagamento: formasPagamento[(i + 1) % formasPagamento.length]
    };
  }),

  // Dr. Carlos: 7 compras este mês
  ...Array.from({ length: 7 }, (_, i) => {
    const valor = 22.00;
    return {
      id: `comp-carlos-${i + 1}`,
      cliente_id: 'cli-03',
      valor,
      custo_total: Number((valor * 0.45).toFixed(2)),
      data_compra: getIsoDate(currentYear, currentMonth, Math.max(1, today.getDate() - (7 - i) * 2)),
      criado_em: new Date(currentYear, currentMonth, Math.max(1, today.getDate() - (7 - i) * 2), 8, 15).toISOString(),
      pontuou_fidelidade: true,
      forma_pagamento: formasPagamento[(i + 2) % formasPagamento.length]
    };
  }),

  // Felipe Takahashi: 6 compras este mês
  ...Array.from({ length: 6 }, (_, i) => {
    const valor = 18.50;
    return {
      id: `comp-felipe-${i + 1}`,
      cliente_id: 'cli-05',
      valor,
      custo_total: Number((valor * 0.38).toFixed(2)),
      data_compra: getIsoDate(currentYear, currentMonth, Math.max(1, today.getDate() - (6 - i) * 2)),
      criado_em: new Date(currentYear, currentMonth, Math.max(1, today.getDate() - (6 - i) * 2), 9, 20).toISOString(),
      pontuou_fidelidade: true,
      forma_pagamento: formasPagamento[(i + 3) % formasPagamento.length]
    };
  }),

  // Luciana Albuquerque: 3 compras este mês
  ...Array.from({ length: 3 }, (_, i) => {
    const valor = 35.00;
    return {
      id: `comp-luciana-${i + 1}`,
      cliente_id: 'cli-06',
      valor,
      custo_total: Number((valor * 0.44).toFixed(2)),
      data_compra: getIsoDate(currentYear, currentMonth, Math.max(1, today.getDate() - (3 - i) * 3)),
      criado_em: new Date(currentYear, currentMonth, Math.max(1, today.getDate() - (3 - i) * 3), 16, 40).toISOString(),
      pontuou_fidelidade: true,
      forma_pagamento: 'pix'
    };
  }),

  // Tiago Barbosa: 2 compras este mês
  ...Array.from({ length: 2 }, (_, i) => {
    const valor = 8.50;
    return {
      id: `comp-tiago-${i + 1}`,
      cliente_id: 'cli-09',
      valor,
      custo_total: Number((valor * 0.40).toFixed(2)),
      data_compra: getIsoDate(currentYear, currentMonth, Math.max(1, today.getDate() - (2 - i) * 4)),
      criado_em: new Date(currentYear, currentMonth, Math.max(1, today.getDate() - (2 - i) * 4), 11, 0).toISOString(),
      pontuou_fidelidade: true,
      forma_pagamento: 'dinheiro'
    };
  }),

  // --- CLIENTES SUMIDOS (ANTI-CHURN) ---
  // Sr. Valdomiro Souza: 14 compras no mês passado, NENHUMA compra neste mês
  ...Array.from({ length: 14 }, (_, i) => {
    const day = Math.max(1, Math.min(prevMonthDays, Math.round(1 + (i / 13) * (valdomiroLastDay - 1))));
    const valor = 12.00;
    return {
      id: `comp-valdomiro-ant-${i + 1}`,
      cliente_id: 'cli-07',
      valor,
      custo_total: Number((valor * 0.42).toFixed(2)),
      data_compra: getIsoDate(currentYear, currentMonth - 1, day),
      criado_em: new Date(currentYear, currentMonth - 1, day, 7, 0).toISOString(),
      pontuou_fidelidade: true,
      forma_pagamento: formasPagamento[i % formasPagamento.length]
    };
  }),

  // Dra. Beatriz Fontana: 8 compras no mês passado, NENHUMA compra nos últimos 24 dias (+30 dias alerta vermelho!)
  ...Array.from({ length: 8 }, (_, i) => {
    const valor = 25.00;
    return {
      id: `comp-beatriz-ant-${i + 1}`,
      cliente_id: 'cli-08',
      valor,
      custo_total: Number((valor * 0.40).toFixed(2)),
      data_compra: getIsoDate(currentYear, currentMonth - 1, 1 + i * 1),
      criado_em: new Date(currentYear, currentMonth - 1, 1 + i * 1, 17, 30).toISOString(),
      pontuou_fidelidade: true,
      forma_pagamento: 'cartao_credito'
    };
  })
];

import { Categoria, Produto, Fornecedor, Insumo, FichaTecnica, HistoricoCompraInsumo } from '../types';

export const INITIAL_CATEGORIAS: Categoria[] = [
  { id: 'cat-1', nome: 'Bebidas Quentes', icone: 'Coffee', ordem: 1 },
  { id: 'cat-2', nome: 'Pães Frescos', icone: 'Croissant', ordem: 2 },
  { id: 'cat-3', nome: 'Salgados', icone: 'Pizza', ordem: 3 },
  { id: 'cat-4', nome: 'Doces & Bolos', icone: 'Cake', ordem: 4 },
];

export const INITIAL_PRODUTOS: Produto[] = [
  { id: 'prod-1', categoria_id: 'cat-1', nome: 'Café Expresso', preco: 4.50, custo: 1.50, controlar_estoque: false, ativo: true },
  { id: 'prod-2', categoria_id: 'cat-1', nome: 'Pingado Média', preco: 6.00, custo: 2.20, controlar_estoque: false, ativo: true },
  { id: 'prod-3', categoria_id: 'cat-1', nome: 'Cappuccino', preco: 8.50, custo: 3.20, controlar_estoque: false, ativo: true },
  
  { id: 'prod-4', categoria_id: 'cat-2', nome: 'Pão Francês', preco: 0.80, custo: 0.25, controlar_estoque: false, ativo: true },
  { id: 'prod-5', categoria_id: 'cat-2', nome: 'Pão de Queijo', preco: 3.50, custo: 1.30, controlar_estoque: true, estoque_atual: 18, ativo: true },
  { id: 'prod-6', categoria_id: 'cat-2', nome: 'Pão na Chapa c/ Manteiga', preco: 5.00, custo: 1.80, controlar_estoque: false, ativo: true },
  
  { id: 'prod-7', categoria_id: 'cat-3', nome: 'Coxinha de Frango', preco: 7.00, custo: 2.80, controlar_estoque: true, estoque_atual: 3, ativo: true },
  { id: 'prod-8', categoria_id: 'cat-3', nome: 'Esfiha de Carne', preco: 6.50, custo: 2.50, controlar_estoque: true, estoque_atual: 22, ativo: true },
  
  { id: 'prod-9', categoria_id: 'cat-4', nome: 'Fatia Bolo de Cenoura', preco: 8.00, custo: 3.00, controlar_estoque: true, estoque_atual: 0, ativo: true },
  { id: 'prod-10', categoria_id: 'cat-4', nome: 'Sonho de Creme', preco: 6.00, custo: 2.40, controlar_estoque: true, estoque_atual: 8, ativo: true },
];

export const INITIAL_FORNECEDORES: Fornecedor[] = [
  { id: 'forn-1', nome_empresa: 'Moinho Real', contato_whatsapp: '11999998888', cidade: 'São Paulo' },
  { id: 'forn-2', nome_empresa: 'Laticínios Fazenda da Serra', contato_whatsapp: '19988887777', cidade: 'Campinas' },
  { id: 'forn-3', nome_empresa: 'Grãos do Cerrado Café Especial', contato_whatsapp: '35998871122', cidade: 'Varginha' },
  { id: 'forn-4', nome_empresa: 'Distribuidora Avícola Prime', contato_whatsapp: '44997658899', cidade: 'Maringá' },
  { id: 'forn-5', nome_empresa: 'Distribuidora Doce Sabor', contato_whatsapp: '41984563322', cidade: 'Curitiba' }
];

export const INITIAL_INSUMOS: Insumo[] = [
  { id: 'insumo-1', nome: 'Farinha de Trigo Especial', unidade_medida: 'kg', preco_custo: 4.20, quantidade_estoque: 85, estoque_minimo: 20, fornecedor_id: 'forn-1' },
  { id: 'insumo-2', nome: 'Leite Integral Pasteurizado', unidade_medida: 'l', preco_custo: 3.80, quantidade_estoque: 42, estoque_minimo: 15, fornecedor_id: 'forn-2' },
  { id: 'insumo-3', nome: 'Açúcar Cristal Refinado', unidade_medida: 'kg', preco_custo: 3.60, quantidade_estoque: 50, estoque_minimo: 15, fornecedor_id: 'forn-1' },
  { id: 'insumo-4', nome: 'Café em Grãos Gourmet', unidade_medida: 'kg', preco_custo: 68.00, quantidade_estoque: 14, estoque_minimo: 4, fornecedor_id: 'forn-3' },
  { id: 'insumo-5', nome: 'Manteiga Primeira Linha', unidade_medida: 'kg', preco_custo: 38.00, quantidade_estoque: 10, estoque_minimo: 3, fornecedor_id: 'forn-2' },
  { id: 'insumo-6', nome: 'Queijo Minas Meia Cura', unidade_medida: 'kg', preco_custo: 44.00, quantidade_estoque: 15, estoque_minimo: 5, fornecedor_id: 'forn-2' },
  { id: 'insumo-7', nome: 'Polvilho Azedo', unidade_medida: 'kg', preco_custo: 8.50, quantidade_estoque: 25, estoque_minimo: 8, fornecedor_id: 'forn-1' },
  { id: 'insumo-8', nome: 'Ovos Caipiras Selecionados', unidade_medida: 'un', preco_custo: 0.75, quantidade_estoque: 150, estoque_minimo: 30, fornecedor_id: 'forn-4' },
  { id: 'insumo-9', nome: 'Peito de Frango Desfiado Temperado', unidade_medida: 'kg', preco_custo: 22.00, quantidade_estoque: 20, estoque_minimo: 6, fornecedor_id: 'forn-4' },
  { id: 'insumo-10', nome: 'Carne Bovina Moída Temperada', unidade_medida: 'kg', preco_custo: 26.00, quantidade_estoque: 18, estoque_minimo: 5, fornecedor_id: 'forn-4' },
  { id: 'insumo-11', nome: 'Chocolate em Pó 50% Cacau', unidade_medida: 'kg', preco_custo: 32.00, quantidade_estoque: 12, estoque_minimo: 3, fornecedor_id: 'forn-5' },
  { id: 'insumo-12', nome: 'Creme Confeiteiro Tradicional', unidade_medida: 'kg', preco_custo: 18.00, quantidade_estoque: 14, estoque_minimo: 4, fornecedor_id: 'forn-5' },
  { id: 'insumo-13', nome: 'Cenoura Fresca', unidade_medida: 'kg', preco_custo: 4.50, quantidade_estoque: 16, estoque_minimo: 5, fornecedor_id: 'forn-1' }
];

export const INITIAL_FICHAS_TECNICAS: FichaTecnica[] = [
  // 1. Café Expresso: 12g de café gourmet
  { id: 'ficha-1', produto_id: 'prod-1', insumo_id: 'insumo-4', quantidade_utilizada: 0.012 },

  // 2. Pingado Média: 10g café + 150ml leite
  { id: 'ficha-2', produto_id: 'prod-2', insumo_id: 'insumo-4', quantidade_utilizada: 0.010 },
  { id: 'ficha-3', produto_id: 'prod-2', insumo_id: 'insumo-2', quantidade_utilizada: 0.150 },

  // 3. Cappuccino: 12g café + 150ml leite + 25g chocolate
  { id: 'ficha-4', produto_id: 'prod-3', insumo_id: 'insumo-4', quantidade_utilizada: 0.012 },
  { id: 'ficha-5', produto_id: 'prod-3', insumo_id: 'insumo-2', quantidade_utilizada: 0.150 },
  { id: 'ficha-6', produto_id: 'prod-3', insumo_id: 'insumo-11', quantidade_utilizada: 0.025 },

  // 4. Pão Francês: 50g farinha + 3g açúcar
  { id: 'ficha-7', produto_id: 'prod-4', insumo_id: 'insumo-1', quantidade_utilizada: 0.050 },
  { id: 'ficha-8', produto_id: 'prod-4', insumo_id: 'insumo-3', quantidade_utilizada: 0.003 },

  // 5. Pão de Queijo: 35g polvilho + 25g queijo minas + 20ml leite + 0.2 un ovo
  { id: 'ficha-9', produto_id: 'prod-5', insumo_id: 'insumo-7', quantidade_utilizada: 0.035 },
  { id: 'ficha-10', produto_id: 'prod-5', insumo_id: 'insumo-6', quantidade_utilizada: 0.025 },
  { id: 'ficha-11', produto_id: 'prod-5', insumo_id: 'insumo-2', quantidade_utilizada: 0.020 },
  { id: 'ficha-12', produto_id: 'prod-5', insumo_id: 'insumo-8', quantidade_utilizada: 0.2 },

  // 6. Pão na Chapa c/ Manteiga: 50g farinha + 20g manteiga
  { id: 'ficha-13', produto_id: 'prod-6', insumo_id: 'insumo-1', quantidade_utilizada: 0.050 },
  { id: 'ficha-14', produto_id: 'prod-6', insumo_id: 'insumo-5', quantidade_utilizada: 0.020 },

  // 7. Coxinha de Frango: 40g farinha + 80g frango desfiado + 30ml leite
  { id: 'ficha-15', produto_id: 'prod-7', insumo_id: 'insumo-1', quantidade_utilizada: 0.040 },
  { id: 'ficha-16', produto_id: 'prod-7', insumo_id: 'insumo-9', quantidade_utilizada: 0.080 },
  { id: 'ficha-17', produto_id: 'prod-7', insumo_id: 'insumo-2', quantidade_utilizada: 0.030 },

  // 8. Esfiha de Carne: 45g farinha + 70g carne moída
  { id: 'ficha-18', produto_id: 'prod-8', insumo_id: 'insumo-1', quantidade_utilizada: 0.045 },
  { id: 'ficha-19', produto_id: 'prod-8', insumo_id: 'insumo-10', quantidade_utilizada: 0.070 },

  // 9. Fatia Bolo de Cenoura: 40g farinha + 30g açúcar + 50g cenoura + 0.3 un ovo + 25g chocolate
  { id: 'ficha-20', produto_id: 'prod-9', insumo_id: 'insumo-1', quantidade_utilizada: 0.040 },
  { id: 'ficha-21', produto_id: 'prod-9', insumo_id: 'insumo-3', quantidade_utilizada: 0.030 },
  { id: 'ficha-22', produto_id: 'prod-9', insumo_id: 'insumo-13', quantidade_utilizada: 0.050 },
  { id: 'ficha-23', produto_id: 'prod-9', insumo_id: 'insumo-8', quantidade_utilizada: 0.3 },
  { id: 'ficha-24', produto_id: 'prod-9', insumo_id: 'insumo-11', quantidade_utilizada: 0.025 },

  // 10. Sonho de Creme: 45g farinha + 20g açúcar + 60g creme confeiteiro + 0.2 un ovo
  { id: 'ficha-25', produto_id: 'prod-10', insumo_id: 'insumo-1', quantidade_utilizada: 0.045 },
  { id: 'ficha-26', produto_id: 'prod-10', insumo_id: 'insumo-3', quantidade_utilizada: 0.020 },
  { id: 'ficha-27', produto_id: 'prod-10', insumo_id: 'insumo-12', quantidade_utilizada: 0.060 },
  { id: 'ficha-28', produto_id: 'prod-10', insumo_id: 'insumo-8', quantidade_utilizada: 0.2 }
];

export const INITIAL_HISTORICO_COMPRAS: HistoricoCompraInsumo[] = [];
