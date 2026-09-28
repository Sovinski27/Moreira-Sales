export interface Cliente {
  id: string;
  nome: string;
  whatsapp: string;
  data_nascimento?: string | null;
  email?: string | null;
  notas?: string | null;
  total_compras_historico: number;
  criado_em: string;
  ultimo_contato_resgate?: string | null;
  ativo?: boolean;
}

export interface Compra {
  id: string;
  cliente_id: string;
  valor: number;
  custo_total?: number; // Custo de todos os produtos comprados para margem de lucro
  data_compra: string; // YYYY-MM-DD
  criado_em: string;
  detalhes?: string | null;
  pontuou_fidelidade?: boolean;
  forma_pagamento?: string; // 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro'
}

export interface Categoria {
  id: string;
  nome: string;
  icone: string; // Ex: 'Coffee', 'Croissant'
  ordem: number;
}

export interface Produto {
  id: string;
  categoria_id: string;
  nome: string;
  preco: number;
  custo?: number; // Preço de custo
  controlar_estoque?: boolean;
  estoque_atual?: number;
  ativo: boolean;
}

export interface ItemCarrinho {
  id_temp: string;
  produto: Produto;
  quantidade: number;
  subtotal: number;
}

export interface ConfiguracaoFidelidade {
  id: number;
  meta_compras_mes: number;
  valor_minimo_pontuacao: number; // R$ mínimo para contar na meta
  premio_descricao: string;
  mensagem_whatsapp: string;
  mensagem_resgate: string;
  webhook_whatsapp_url?: string; // Opcional para Evolution API / Z-API
  atualizado_em?: string;
}

export type NivelEngajamento = 'Bronze' | 'Prata' | 'Ouro';
export type UrgenciaChurn = 'amarelo' | 'vermelho';

export interface ClienteResumoMensal {
  cliente: Cliente;
  compras_mes_atual: number;
  compras_validas_fidelidade: number; // Compras que atingiram o valor mínimo
  compras_mes_anterior: number;
  valor_total_mes: number;
  ultima_compra_data: string | null;
  dias_sem_comprar: number;
  nivel: NivelEngajamento;
  atingiu_meta: boolean;
  status_churn: boolean; // Mais de 5 compras no mês anterior e > 15 dias sem registros no mês atual
  urgencia_churn?: UrgenciaChurn; // Amarelo: 15-30 dias | Vermelho: +30 dias
  ultimo_contato?: string | null;
}

export interface MetricasGerais {
  totalVisitasMes: number;
  faturamentoMes: number;
  clientesAtivosMes: number;
  clientesEmRisco: number;
  premiosEntregues: number;
  ticketMedioMes: number;
}

export interface Fornecedor {
  id: string;
  nome_empresa: string;
  contato_whatsapp: string;
  cnpj?: string;
  cidade?: string;
}

export interface Insumo {
  id: string;
  nome: string;
  unidade_medida: 'g' | 'kg' | 'ml' | 'l' | 'un';
  preco_custo: number;
  quantidade_estoque: number;
  estoque_minimo: number;
  fornecedor_id: string;
}

export interface FichaTecnica {
  id: string;
  produto_id: string;
  insumo_id: string;
  quantidade_utilizada: number;
}

export interface HistoricoCompraInsumo {
  id: string;
  insumo_id: string;
  valor_pago: number;
  quantidade: number;
  data: string;
}

export interface Mesa {
  id: string;
  numero: number;
}

export interface MesaAberta {
  id: string;
  mesa_id: string;
  mesa_numero: number;
  criado_em: string;
  carrinho: ItemCarrinho[];
  total: number;
}

export type TipoCustoFixo = 'mensal' | 'percentual';
export interface CustosFixosConfig {
  tipo: TipoCustoFixo;
  valor: number;
}
