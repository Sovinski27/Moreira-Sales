const fs = require('fs');
let code = fs.readFileSync('src/services/db.ts', 'utf8');

const regex = /export async function registerCompra\([\s\S]*?return newCompra;\n\}/;

const newImplementation = \export async function registerCompra(
  clienteId: string, 
  valor: number, 
  pontuouFidelidade: boolean,
  detalhes?: string | null,
  carrinho?: any[],
  forma_pagamento?: string
): Promise<Compra> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayIso = \\-\-\\;

  let custo_total = 0;
  
  if (carrinho && carrinho.length > 0) {
    custo_total = carrinho.reduce((acc, item) => acc + ((item.produto.custo || 0) * item.quantidade), 0);
    
    const produtosDb = getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []);
    let produtosUpdated = false;
    
    const newProdutos = produtosDb.map(p => {
      const itemCaixa = carrinho.find(i => i.produto.id === p.id);
      if (itemCaixa && p.controlar_estoque && p.estoque_atual !== undefined) {
        produtosUpdated = true;
        return { ...p, estoque_atual: p.estoque_atual - itemCaixa.quantidade };
      }
      return p;
    });
    
    if (produtosUpdated) {
      setLocal(STORAGE_KEYS.PRODUTOS, newProdutos);
    }
  }

  const newCompra: Compra = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'comp-' + Date.now(),
    cliente_id: clienteId,
    valor: Number(valor.toFixed(2)),
    custo_total: Number(custo_total.toFixed(2)),
    data_compra: todayIso,
    criado_em: now.toISOString(),
    detalhes: detalhes || null,
    pontuou_fidelidade: pontuouFidelidade,
    forma_pagamento: forma_pagamento
  };

  const compras = getLocal<Compra[]>(STORAGE_KEYS.COMPRAS, []);
  const updatedCompras = [newCompra, ...compras];
  setLocal(STORAGE_KEYS.COMPRAS, updatedCompras);

  const clientes = getLocal<Cliente[]>(STORAGE_KEYS.CLIENTES, []);
  const updatedClientes = clientes.map((c) =>
    c.id === clienteId
      ? { ...c, total_compras_historico: (c.total_compras_historico || 0) + 1 }
      : c
  );
  setLocal(STORAGE_KEYS.CLIENTES, updatedClientes);

  return newCompra;
}\;

code = code.replace(regex, newImplementation);
fs.writeFileSync('src/services/db.ts', code);
