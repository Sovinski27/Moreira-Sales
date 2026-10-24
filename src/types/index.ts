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
  cpf_na_nota?: string | null;
  nota_fiscal_id?: string | null;
  nota_fiscal_chave?: string | null;
  nota_fiscal_numero?: number | null;
  danfe_url?: string | null;
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

export interface ReceitaMetadata {
  produto_id: string;
  responsavel?: string; // ex: "Marlene"
  codigo?: string; // ex: "FT-001"
  data?: string; // ex: "25/09/2026"
  rendimento_cru?: string; // ex: "1200g" ou "1.2 kg"
  rendimento_assado?: string; // ex: "1000g" ou "1.0 kg"
  rendimento_total?: string; // ex: "10 pedaços"
  quebra?: string; // ex: "16.7%"
  tipo_unidade?: string; // ex: "pedaço", "pão", "fatia", "unidade"
  peso_por_unidade?: string; // ex: "100g"
  tempo_preparo?: string; // ex: "10 minutos"
  modo_preparo?: string; // Instruções passo a passo
  observacoes?: string;
}

export interface FichaTecnica {
  id: string;
  produto_id: string;
  insumo_id: string;
  quantidade_utilizada: number;
  rendimento_unidades?: number;
  custo_direto?: number;
  unidade_medida?: 'g' | 'kg' | 'ml' | 'l' | 'un';
  quantidade_original?: number;
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

export interface PedidoOnlineEndereco {
  rua: string;
  numero: string;
  bairro: string;
  complemento?: string;
  ponto_referencia?: string;
}

export type FormaPagamentoOnline = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro';

export interface PedidoOnlineDetalhes {
  tipo: 'retirada' | 'entrega';
  endereco?: PedidoOnlineEndereco;
  forma_pagamento: FormaPagamentoOnline;
  troco_para?: string;
  mensagem_whatsapp?: string;
}

export interface PedidoOnline {
  id: string;
  numero_pedido: number;
  cliente_nome: string; // Nome e sobrenome obrigatório
  cliente_telefone: string;
  cliente_whatsapp?: string;
  tipo: 'retirada' | 'entrega';
  endereco?: PedidoOnlineEndereco;
  forma_pagamento: FormaPagamentoOnline;
  troco_para?: string;
  itens: ItemPedidoCozinha[];
  total: number;
  observacoes?: string;
  status: 'pendente' | 'em_preparo' | 'pronto' | 'saiu_para_entrega' | 'entregue' | 'pago' | 'cancelado';
  criado_em: string;
  mensagem_whatsapp?: string;
}

export interface MesaAberta {
  id: string;
  mesa_id: string;
  mesa_numero: number;
  criado_em: string;
  carrinho: ItemCarrinho[];
  total: number;
  cliente_id?: string;
  cliente_nome?: string;
  cliente_telefone?: string;
  pedidos_ids?: string[];
  itens?: any[];
  status?: string;
  aberto_em?: string;
  is_online?: boolean;
  online_detalhes?: PedidoOnlineDetalhes;
}

export type PedidoCozinhaStatus = 'pendente' | 'preparando' | 'pronto' | 'entregue' | 'cancelado';

export interface ItemPedidoCozinha {
  id_temp: string;
  produto_id: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  observacao?: string;
}

export interface PedidoCozinha {
  id: string;
  mesa_numero: number;
  cliente_id?: string;
  cliente_nome: string;
  cliente_telefone?: string;
  itens: ItemPedidoCozinha[];
  total: number;
  status: PedidoCozinhaStatus;
  criado_em: string;
  atualizado_em?: string;
  observacoes?: string;
  alerta_silenciado?: boolean;
  online_detalhes?: PedidoOnlineDetalhes;
}

export type TipoCustoFixo = 'mensal' | 'percentual';
export interface CustosFixosConfig {
  tipo: TipoCustoFixo;
  valor: number;
}

// ==========================================
// MÓDULO FISCAL (NF-e / NFC-e)
// ==========================================

export type ProvedorFiscal = 'focus_nfe' | 'nuvem_fiscal' | 'webmania' | 'custom_webhook' | 'simulador';
export type AmbienteFiscal = 'homologacao' | 'producao';
export type StatusNotaFiscal = 'autorizada' | 'processando' | 'cancelada' | 'erro';
export type TipoNotaFiscal = 'nfce' | 'nfe';

export interface EnderecoFiscal {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  ibge_municipio?: string;
}

export interface ConfiguracaoFiscal {
  id?: number;
  provedor: ProvedorFiscal;
  ambiente: AmbienteFiscal;
  token_api?: string;
  cnpj: string;
  cnpj_emitente?: string;
  inscricao_estadual?: string;
  razao_social: string;
  nome_fantasia: string;
  regime_tributario?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'mei';
  serie_nfe: number;
  ultimo_numero_nfe?: number;
  numero_atual_nfe?: number;
  serie_nfce?: number;
  numero_atual_nfce?: number;
  csc_id?: string; // Código de Segurança do Contribuinte (NFC-e)
  csc_token?: string;
  certificado_ativo?: boolean;
  certificado_nome?: string;
  certificado_validade?: string;
  endereco: EnderecoFiscal;
  emissao_automatica_pdv?: boolean;
  enviar_whatsapp_automatico?: boolean;
  mensagem_whatsapp_nfe?: string;
  ncm_padrao?: string;
  cfop_padrao?: string;
  atualizado_em?: string;
}

export interface ItemNotaFiscal {
  id?: string;
  numero_item: number;
  codigo_produto: string;
  nome: string;
  quantidade: number;
  unidade?: string;
  valor_unitario: number;
  subtotal: number;
  valor_total: number;
  ncm: string;
  cfop: string;
}

export interface NotaFiscal {
  id: string;
  compra_id: string;
  numero: number;
  serie: number;
  tipo: TipoNotaFiscal;
  chave_acesso: string; // 44 dígitos
  protocolo_autorizacao: string;
  status: StatusNotaFiscal;
  motivo_status?: string;
  motivo_cancelamento?: string;
  protocolo_cancelamento?: string;
  ambiente?: AmbienteFiscal;
  data_emissao: string;
  valor_total: number;
  valor_produtos: number;
  valor_desconto: number;
  valor_tributos_estimados: number;
  cliente_nome?: string;
  cliente_cpf?: string;
  cliente_cpf_cnpj?: string;
  cliente_telefone?: string;
  cliente_whatsapp?: string;
  forma_pagamento: string;
  itens: ItemNotaFiscal[];
  qr_code_url?: string;
  danfe_url?: string;
  xml_url?: string;
  enviada_whatsapp: boolean;
  criado_em: string;
}

// =========================================================================
// MÓDULO CHECKLIST OPERACIONAL & ROTINAS
// =========================================================================
export type PeriodicidadeChecklist = 'diario' | 'semanal' | 'mensal';
export type TurnoChecklist = 'abertura' | 'manha' | 'tarde' | 'fechamento' | 'livre';
export type PrioridadeChecklist = 'alta' | 'media' | 'baixa';

export interface CategoriaChecklist {
  id: string;
  nome: string;
  descricao?: string;
  cor?: string;
}

export interface ItemChecklist {
  id: string;
  titulo: string;
  categoria_id: string;
  periodicidade: PeriodicidadeChecklist;
  turno?: TurnoChecklist;
  responsavel?: string;
  prioridade?: PrioridadeChecklist;
  instrucoes?: string;
  ativo: boolean;
  concluido: boolean;
  concluido_em?: string;
  concluido_por?: string;
  observacao?: string;
  criado_em: string;
}

export interface RegistroHistoricoChecklist {
  id: string;
  data: string; // YYYY-MM-DD
  item_id: string;
  titulo: string;
  categoria: string;
  periodicidade: PeriodicidadeChecklist;
  responsavel?: string;
  concluido_em: string;
  concluido_por: string;
  observacao?: string;
}
