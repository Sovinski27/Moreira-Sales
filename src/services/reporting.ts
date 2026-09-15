import { ClienteResumoMensal } from '../types';
import { formatPhoneDisplay } from './whatsapp';

/**
 * Gera relatório CSV formatado em pt-BR com delimitador ponto e vírgula e BOM UTF-8 para Excel.
 */
export function gerarRelatorioCSV(resumosMensais: ClienteResumoMensal[]): string {
  const cabecalho = ['Nome', 'WhatsApp', 'Compras Válidas Mês', 'Valor Total Mês (R$)', 'Total Histórico', 'Nível Fidelidade', 'Última Visita'];
  
  const linhas = resumosMensais.map((r) => [
    `"${r.cliente.nome.replace(/"/g, '""')}"`,
    `"${formatPhoneDisplay(r.cliente.whatsapp)}"`,
    r.compras_validas_fidelidade,
    r.valor_total_mes.toFixed(2),
    r.cliente.total_compras_historico,
    `"${r.nivel}"`,
    r.ultima_compra_data || 'Sem registro'
  ]);

  return '\uFEFF' + [cabecalho.join(';'), ...linhas.map((l) => l.join(';'))].join('\n');
}
