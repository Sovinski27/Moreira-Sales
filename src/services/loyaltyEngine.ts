import { 
  Cliente, 
  Compra, 
  ConfiguracaoFidelidade, 
  ClienteResumoMensal, 
  NivelEngajamento, 
  MetricasGerais,
  UrgenciaChurn
} from '../types';

/**
 * Determina o nível de engajamento com base nas compras válidas do mês.
 * Bronze: 1 a 5 compras/mês
 * Prata: 6 a 12 compras/mês
 * Ouro: > 12 compras/mês
 */
export function determinarNivelEngajamento(comprasValidas: number): NivelEngajamento {
  if (comprasValidas > 12) {
    return 'Ouro';
  } else if (comprasValidas >= 6) {
    return 'Prata';
  }
  return 'Bronze';
}

/**
 * Avalia o status e a urgência de churn:
 * Cliente com >= 5 compras no mês anterior que está há >= 15 dias sem compras.
 * Urgência amarela: 15 a 29 dias.
 * Urgência vermelha: >= 30 dias.
 */
export function calcularStatusChurn(
  comprasMesAnterior: number, 
  diasSemComprar: number
): { statusChurn: boolean; urgencia?: UrgenciaChurn } {
  const statusChurn = comprasMesAnterior >= 5 && diasSemComprar >= 15;
  const urgencia: UrgenciaChurn | undefined = statusChurn
    ? (diasSemComprar >= 30 ? 'vermelho' : 'amarelo')
    : undefined;

  return { statusChurn, urgencia };
}

/**
 * Avalia uma nova compra em relação às regras de fidelidade:
 * - Se pontua (valor >= valor_minimo_pontuacao)
 * - Novo total de compras válidas no mês
 * - Se atingiu a meta exatamente agora (para disparar celebração)
 */
export function avaliarCompra(
  resumoAntes: ClienteResumoMensal | null, 
  valor: number, 
  config: ConfiguracaoFidelidade
): { pontuou: boolean; totalValidasAtualizado: number; atingiuMetaAgora: boolean } {
  const validasAntes = resumoAntes ? resumoAntes.compras_validas_fidelidade : 0;
  const minValor = config.valor_minimo_pontuacao || 0;
  const pontuou = valor >= minValor;
  const totalValidasAtualizado = pontuou ? validasAntes + 1 : validasAntes;
  const atingiuMetaAgora = pontuou && totalValidasAtualizado === config.meta_compras_mes;

  return {
    pontuou,
    totalValidasAtualizado,
    atingiuMetaAgora
  };
}

/**
 * Calcula os resumos mensais de todos os clientes.
 * Suporta data de referência customizada para testes determinísticos.
 */
export function calcularResumosMensais(
  clientes: Cliente[],
  compras: Compra[],
  config: ConfiguracaoFidelidade,
  referenceDate?: Date
): ClienteResumoMensal[] {
  const now = referenceDate ? new Date(referenceDate) : new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  
  // Mês anterior
  const prevDate = new Date(currentYear, currentMonth - 1, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth();

  const minValor = config.valor_minimo_pontuacao || 0;

  return clientes.map((cliente) => {
    const clienteCompras = compras.filter((c) => c.cliente_id === cliente.id);
    
    let comprasMesAtual = 0;
    let comprasValidasFidelidade = 0;
    let comprasMesAnterior = 0;
    let valorTotalMes = 0;
    let ultimaData: string | null = null;
    let ultimaDataTimestamp = 0;

    for (const comp of clienteCompras) {
      const compDate = new Date(comp.data_compra ? comp.data_compra + 'T00:00:00' : comp.criado_em);
      const compYear = compDate.getFullYear();
      const compMonth = compDate.getMonth();
      const compTime = compDate.getTime();
      const valorComp = Number(comp.valor) || 0;

      if (compTime > ultimaDataTimestamp) {
        ultimaDataTimestamp = compTime;
        ultimaData = comp.data_compra;
      }

      if (compYear === currentYear && compMonth === currentMonth) {
        comprasMesAtual++;
        valorTotalMes += valorComp;
        if (comp.pontuou_fidelidade !== false && valorComp >= minValor) {
          comprasValidasFidelidade++;
        }
      } else if (compYear === prevYear && compMonth === prevMonth) {
        if (valorComp >= minValor) {
          comprasMesAnterior++;
        }
      }
    }

    // Dias sem comprar
    let diasSemComprar = 999;
    if (ultimaDataTimestamp > 0) {
      const diffMs = now.getTime() - ultimaDataTimestamp;
      diasSemComprar = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    const nivel = determinarNivelEngajamento(comprasValidasFidelidade);
    const atingiuMeta = comprasValidasFidelidade >= config.meta_compras_mes;
    const { statusChurn, urgencia } = calcularStatusChurn(comprasMesAnterior, diasSemComprar);
    const finalStatusChurn = cliente.ativo === false ? false : statusChurn;

    return {
      cliente,
      compras_mes_atual: comprasMesAtual,
      compras_validas_fidelidade: comprasValidasFidelidade,
      compras_mes_anterior: comprasMesAnterior,
      valor_total_mes: valorTotalMes,
      ultima_compra_data: ultimaData,
      dias_sem_comprar: diasSemComprar,
      nivel,
      atingiu_meta: atingiuMeta,
      status_churn: finalStatusChurn,
      urgencia_churn: urgencia,
      ultimo_contato: cliente.ultimo_contato_resgate
    };
  });
}

/**
 * Filtra e ordena a lista de clientes em risco de abandono (Anti-Churn)
 */
export function calcularClientesSumidos(resumos: ClienteResumoMensal[]): ClienteResumoMensal[] {
  return resumos
    .filter((r) => r.status_churn)
    .sort((a, b) => b.dias_sem_comprar - a.dias_sem_comprar);
}

/**
 * Calcula métricas gerais e KPIs para o painel de administração
 */
export function calcularMetricas(
  resumos: ClienteResumoMensal[], 
  clientesSumidos?: ClienteResumoMensal[]
): MetricasGerais {
  const sumidos = clientesSumidos || calcularClientesSumidos(resumos);

  let totalVisitasMes = 0;
  let faturamentoMes = 0;
  let clientesAtivos = 0;
  let premiosEntregues = 0;

  for (const resumo of resumos) {
    if (resumo.compras_mes_atual > 0) {
      clientesAtivos++;
      totalVisitasMes += resumo.compras_mes_atual;
      faturamentoMes += resumo.valor_total_mes;
    }
    if (resumo.atingiu_meta) {
      premiosEntregues++;
    }
  }

  const ticketMedioMes = totalVisitasMes > 0 ? faturamentoMes / totalVisitasMes : 0;

  return {
    totalVisitasMes,
    faturamentoMes,
    clientesAtivosMes: clientesAtivos,
    clientesEmRisco: sumidos.length,
    premiosEntregues,
    ticketMedioMes
  };
}
