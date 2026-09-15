import { Compra } from '../types';

export type DateFilter = 'hoje' | '7d' | '30d' | 'tudo';

export function filterComprasByDate(compras: Compra[], filter: DateFilter): Compra[] {
  const now = new Date();
  let startTime = 0;

  if (filter === 'hoje') {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startTime = today.getTime();
  } else if (filter === '7d') {
    const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    startTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  } else if (filter === '30d') {
    const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    startTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  } else {
    return compras; // tudo
  }

  return compras.filter(c => new Date(c.data_compra).getTime() >= startTime);
}

export function calcReceitaMensal(compras: Compra[]) {
  // Retorna [{ data: '14/09', receita: 150, lucro: 50 }, ...]
  const map: Record<string, { receita: number; custo: number }> = {};
  compras.forEach(c => {
    // format YYYY-MM-DD to DD/MM
    const parts = c.data_compra.split('-');
    if (parts.length === 3) {
      const label = `${parts[2]}/${parts[1]}`;
      if (!map[label]) map[label] = { receita: 0, custo: 0 };
      map[label].receita += c.valor;
      map[label].custo += c.custo_total || 0;
    }
  });

  // Sort keys by date
  return Object.keys(map).sort().map(key => ({
    data: key,
    receita: map[key].receita,
    lucro: map[key].receita - map[key].custo
  }));
}

export function calcHorariosDePico(compras: Compra[]) {
  // Retorna [{ hora: '08:00', volume: 15 }, ...]
  const map: Record<string, number> = {};
  for (let i = 0; i <= 23; i++) {
    map[`${String(i).padStart(2, '0')}:00`] = 0;
  }

  compras.forEach(c => {
    const d = new Date(c.criado_em);
    const horaStr = `${String(d.getHours()).padStart(2, '0')}:00`;
    map[horaStr] += 1;
  });

  return Object.keys(map).map(k => ({
    hora: k,
    volume: map[k]
  })).filter(x => x.volume > 0 || (parseInt(x.hora.split(':')[0]) >= 6 && parseInt(x.hora.split(':')[0]) <= 20)); // manter h de expediente mesmo zero
}

export function calcProdutosMaisVendidos(compras: Compra[]) {
  // parse "2x Café Expresso, 1x Pão"
  const map: Record<string, number> = {};
  compras.forEach(c => {
    if (c.detalhes) {
      const parts = c.detalhes.split(', ');
      parts.forEach(part => {
        const match = part.match(/^(\d+)x (.*)$/);
        if (match) {
          const qtd = parseInt(match[1]);
          const nome = match[2];
          map[nome] = (map[nome] || 0) + qtd;
        } else if (part === 'Item Avulso' || part.includes('Avulso')) {
          map['Itens Avulsos'] = (map['Itens Avulsos'] || 0) + 1;
        }
      });
    }
  });

  return Object.keys(map)
    .map(nome => ({ nome, qtd: map[nome] }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 10);
}

export function calcTicketMedioMensal(compras: Compra[]) {
  const map: Record<string, { total: number, count: number }> = {};
  compras.forEach(c => {
    const parts = c.data_compra.split('-');
    if (parts.length === 3) {
      const label = `${parts[2]}/${parts[1]}`;
      if (!map[label]) map[label] = { total: 0, count: 0 };
      map[label].total += c.valor;
      map[label].count += 1;
    }
  });
  
  return Object.keys(map).sort().map(key => ({
    data: key,
    ticket: map[key].total / map[key].count
  }));
}

export function calcFidelizados(compras: Compra[]) {
  let fidelizados = 0;
  let anonimos = 0;
  compras.forEach(c => {
    // If it scored loyalty, or if the client is not '0', it's known. Wait, some purchases below min value don't score.
    // Let's just check if it's not anon
    if (c.cliente_id && c.cliente_id !== '0' && c.cliente_id !== 'anonimo' && c.cliente_id !== 'Cliente Não Identificado') {
      fidelizados++;
    } else {
      anonimos++;
    }
  });
  return [
    { name: 'Fidelizados', value: fidelizados },
    { name: 'Não Identificados', value: anonimos }
  ];
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
    const p = c.forma_pagamento || 'outros';
    if (map[p]) {
      map[p].count += 1;
      map[p].total += c.valor;
    } else {
      map.outros.count += 1;
      map.outros.total += c.valor;
    }
  });

  return [
    { name: 'Pix', value: map.pix.total, count: map.pix.count },
    { name: 'Crédito', value: map.cartao_credito.total, count: map.cartao_credito.count },
    { name: 'Débito', value: map.cartao_debito.total, count: map.cartao_debito.count },
    { name: 'Dinheiro', value: map.dinheiro.total, count: map.dinheiro.count },
  ].filter(item => item.count > 0);
}