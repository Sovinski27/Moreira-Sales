import { Compra, Cliente, Produto, FichaTecnica, Insumo } from '../types';
import { calcularCustoUnitarioProduto } from './db';

export type DateFilter = 'hoje' | '7d' | '30d' | 'tudo';

/**
 * Converte data da compra (YYYY-MM-DD ou ISO timestamp) para Date local
 * evitando deslocamento de fuso horário UTC-3 (Brasil).
 */
export function parseCompraDate(c: Pick<Compra, 'data_compra' | 'criado_em'>): Date {
  if (c.criado_em) {
    const dt = new Date(c.criado_em);
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  const raw = c.data_compra || '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? new Date(0) : fallback;
}

export function getLocalDateKey(c: Pick<Compra, 'data_compra' | 'criado_em'>): string {
  const dt = parseCompraDate(c);
  if (dt.getTime() === 0) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function filterComprasByDate(compras: Compra[], filter: DateFilter): Compra[] {
  if (filter === 'tudo') return compras;

  const now = new Date();
  let startTime = 0;

  if (filter === 'hoje') {
    startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  } else if (filter === '7d') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    startTime = d.getTime();
  } else if (filter === '30d') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
    startTime = d.getTime();
  }

  return compras.filter(c => {
    const dt = parseCompraDate(c);
    return dt.getTime() >= startTime;
  });
}

export function calcReceitaMensal(compras: Compra[]) {
  // Agrupa por chave cronológica YYYY-MM-DD e formata label DD/MM
  const map: Record<string, { receita: number; custo: number }> = {};
  compras.forEach(c => {
    const isoKey = getLocalDateKey(c);
    if (!isoKey) return;
    if (!map[isoKey]) map[isoKey] = { receita: 0, custo: 0 };
    map[isoKey].receita += Number(c.valor) || 0;
    map[isoKey].custo += Number(c.custo_total) || 0;
  });

  return Object.keys(map)
    .sort()
    .map(isoKey => {
      const parts = isoKey.split('-');
      const label = `${parts[2]}/${parts[1]}`;
      const receita = Number(map[isoKey].receita.toFixed(2));
      const custo = Number(map[isoKey].custo.toFixed(2));
      return {
        data: label,
        receita,
        lucro: Number((receita - custo).toFixed(2))
      };
    });
}

export function calcHorariosDePico(compras: Compra[]) {
  const map: Record<string, number> = {};
  for (let i = 0; i <= 23; i++) {
    map[`${String(i).padStart(2, '0')}:00`] = 0;
  }

  compras.forEach(c => {
    const d = parseCompraDate(c);
    if (d.getTime() === 0) return;
    const horaStr = `${String(d.getHours()).padStart(2, '0')}:00`;
    map[horaStr] = (map[horaStr] || 0) + 1;
  });

  return Object.keys(map)
    .map(k => ({
      hora: k,
      volume: map[k]
    }))
    .filter(x => x.volume > 0 || (parseInt(x.hora.split(':')[0], 10) >= 6 && parseInt(x.hora.split(':')[0], 10) <= 20));
}

export function parseItensDetalhes(detalhes?: string | null): Array<{ nome: string; qtd: number }> {
  if (!detalhes) return [];
  const cleaned = detalhes
    .replace(/\s*\[(PIX|DINHEIRO|CARTAO_CREDITO|CARTAO_DEBITO|OUTROS)\]\s*/gi, '')
    .replace(/^Comanda\s+\d+:\s*/i, '')
    .replace(/^Mesa\s+\d+\s*\([^)]*\):\s*/i, '');

  const result: Array<{ nome: string; qtd: number }> = [];
  const parts = cleaned.split(', ');
  parts.forEach(part => {
    const trimmed = part.trim();
    const match = trimmed.match(/^(\d+(?:\.\d+)?)x\s+(.*)$/);
    if (match) {
      const qtd = parseFloat(match[1]);
      const nome = match[2].trim();
      if (nome && !Number.isNaN(qtd)) {
        result.push({ nome, qtd });
      }
    } else if (trimmed === 'Item Avulso' || trimmed.includes('Avulso')) {
      result.push({ nome: 'Itens Avulsos', qtd: 1 });
    }
  });
  return result;
}

export function calcProdutosMaisVendidos(compras: Compra[]) {
  const map: Record<string, number> = {};
  compras.forEach(c => {
    const itens = parseItensDetalhes(c.detalhes);
    itens.forEach(({ nome, qtd }) => {
      map[nome] = Number(((map[nome] || 0) + qtd).toFixed(2));
    });
  });

  return Object.keys(map)
    .map(nome => ({ nome, qtd: map[nome] }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 10);
}

export function calcTicketMedioMensal(compras: Compra[]) {
  const map: Record<string, { total: number; count: number }> = {};
  compras.forEach(c => {
    const isoKey = getLocalDateKey(c);
    if (!isoKey) return;
    if (!map[isoKey]) map[isoKey] = { total: 0, count: 0 };
    map[isoKey].total += Number(c.valor) || 0;
    map[isoKey].count += 1;
  });

  return Object.keys(map)
    .sort()
    .map(isoKey => {
      const parts = isoKey.split('-');
      const label = `${parts[2]}/${parts[1]}`;
      return {
        data: label,
        ticket: Number((map[isoKey].total / map[isoKey].count).toFixed(2))
      };
    });
}

export function calcFidelizados(compras: Compra[], clientes?: Cliente[]) {
  const anonIds = new Set<string>(['0', 'anonimo', 'balcao-anonimo', 'Cliente Não Identificado']);
  if (clientes && clientes.length > 0) {
    clientes.forEach(cli => {
      const tel = (cli.whatsapp || '').replace(/\D/g, '');
      const nome = (cli.nome || '').toLowerCase();
      if (
        tel === '0' ||
        tel === '' ||
        nome.includes('balcão') ||
        nome.includes('anônimo') ||
        nome.includes('não identificado')
      ) {
        anonIds.add(cli.id);
      }
    });
  }

  let fidelizados = 0;
  let anonimos = 0;
  compras.forEach(c => {
    if (c.cliente_id && !anonIds.has(c.cliente_id)) {
      fidelizados++;
    } else {
      anonimos++;
    }
  });

  return [
    { name: 'Fidelizados', value: fidelizados },
    { name: 'Não Identificados', value: anonimos }
  ].filter(item => item.value > 0);
}

function normalizarFormaPagamento(compra: Compra): string {
  let raw = (compra.forma_pagamento || '').toLowerCase().trim();
  if (!raw && compra.detalhes) {
    const match = compra.detalhes.match(/\[(PIX|DINHEIRO|CARTAO_CREDITO|CARTAO_DEBITO|OUTROS)\]/i);
    if (match) raw = match[1].toLowerCase();
  }
  if (raw.includes('pix')) return 'pix';
  if (raw.includes('credito') || raw.includes('crédito')) return 'cartao_credito';
  if (raw.includes('debito') || raw.includes('débito')) return 'cartao_debito';
  if (raw.includes('dinheiro') || raw.includes('espécie')) return 'dinheiro';
  return 'outros';
}

export function calcFormasPagamento(compras: Compra[]) {
  const map: Record<string, { count: number; total: number }> = {
    pix: { count: 0, total: 0 },
    cartao_credito: { count: 0, total: 0 },
    cartao_debito: { count: 0, total: 0 },
    dinheiro: { count: 0, total: 0 },
    outros: { count: 0, total: 0 }
  };

  compras.forEach(c => {
    const p = normalizarFormaPagamento(c);
    const val = Number(c.valor) || 0;
    map[p].count += 1;
    map[p].total += val;
  });

  return [
    { name: 'Pix', value: Number(map.pix.total.toFixed(2)), count: map.pix.count },
    { name: 'Crédito', value: Number(map.cartao_credito.total.toFixed(2)), count: map.cartao_credito.count },
    { name: 'Débito', value: Number(map.cartao_debito.total.toFixed(2)), count: map.cartao_debito.count },
    { name: 'Dinheiro', value: Number(map.dinheiro.total.toFixed(2)), count: map.dinheiro.count },
    { name: 'Outros', value: Number(map.outros.total.toFixed(2)), count: map.outros.count }
  ].filter(item => item.count > 0);
}

/**
 * Estima o CMV real de uma compra com base nos produtos, fichas técnicas e insumos
 * cadastrados na aba CMV quando o custo_total não veio salvo do banco.
 */
export function estimarCustoCompra(
  compra: Compra,
  produtos: Produto[],
  fichas: FichaTecnica[],
  insumos: Insumo[]
): number {
  if (compra.custo_total && Number(compra.custo_total) > 0) {
    return Number(compra.custo_total);
  }
  if (!compra.detalhes || produtos.length === 0) return 0;

  const itens = parseItensDetalhes(compra.detalhes);
  if (itens.length === 0) return 0;

  let totalCusto = 0;
  for (const item of itens) {
    const nomeNorm = item.nome.toLowerCase();
    const prod = produtos.find(p => p.nome.trim().toLowerCase() === nomeNorm)
      || produtos.find(p => nomeNorm.includes(p.nome.trim().toLowerCase()));
    if (!prod) continue;
    const unitCusto = (prod.custo !== undefined && prod.custo > 0)
      ? prod.custo
      : calcularCustoUnitarioProduto(prod.id, fichas, insumos, prod);
    totalCusto += unitCusto * item.qtd;
  }

  return Number(totalCusto.toFixed(2));
}