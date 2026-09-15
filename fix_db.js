const fs = require('fs');

const code = 
// --- MESAS ABERTAS ---
export async function fetchMesasAbertas(): Promise<any[]> {
  const STORAGE_KEYS = { MESAS_ABERTAS: 'panificadora_mesas_abertas' };
  const getLocal = (k, d) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; };
  return getLocal(STORAGE_KEYS.MESAS_ABERTAS, []);
}

export async function saveMesaAberta(mesa: any): Promise<any> {
  const STORAGE_KEYS = { MESAS_ABERTAS: 'panificadora_mesas_abertas' };
  const getLocal = (k, d) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; };
  const setLocal = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  
  const newMesa = {
    ...mesa,
    id: mesa.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : \mesa-\\)
  };

  const mesas = getLocal(STORAGE_KEYS.MESAS_ABERTAS, []);
  const updatedList = mesa.id 
    ? mesas.map(m => m.id === mesa.id ? newMesa : m)
    : [...mesas, newMesa];
  setLocal(STORAGE_KEYS.MESAS_ABERTAS, updatedList);
  return newMesa;
}

export async function deleteMesaAberta(id: string): Promise<void> {
  const STORAGE_KEYS = { MESAS_ABERTAS: 'panificadora_mesas_abertas' };
  const getLocal = (k, d) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; };
  const setLocal = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  
  const mesas = getLocal(STORAGE_KEYS.MESAS_ABERTAS, []);
  setLocal(STORAGE_KEYS.MESAS_ABERTAS, mesas.filter(m => m.id !== id));
}

// --- CMV ---
export async function fetchFornecedores(): Promise<any[]> {
  const getLocal = (k, d) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; };
  return getLocal('panificadora_fornecedores', []);
}
export async function saveFornecedor(f: any): Promise<any> {
  const list = await fetchFornecedores();
  const id = f.id || \orn-\\;
  const newF = { ...f, id };
  const updated = f.id ? list.map(x => x.id === f.id ? newF : x) : [...list, newF];
  localStorage.setItem('panificadora_fornecedores', JSON.stringify(updated));
  return newF;
}
export async function deleteFornecedor(id: string): Promise<void> {
  const list = await fetchFornecedores();
  localStorage.setItem('panificadora_fornecedores', JSON.stringify(list.filter(x => x.id !== id)));
}
export async function fetchInsumos(): Promise<any[]> {
  const getLocal = (k, d) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; };
  return getLocal('panificadora_insumos', []);
}
export async function saveInsumo(i: any): Promise<any> {
  const list = await fetchInsumos();
  const id = i.id || \insumo-\\;
  const newI = { ...i, id };
  const updated = i.id ? list.map(x => x.id === i.id ? newI : x) : [...list, newI];
  localStorage.setItem('panificadora_insumos', JSON.stringify(updated));
  return newI;
}
export async function deleteInsumo(id: string): Promise<void> {
  const list = await fetchInsumos();
  localStorage.setItem('panificadora_insumos', JSON.stringify(list.filter(x => x.id !== id)));
}
export async function fetchFichasTecnicas(): Promise<any[]> {
  const getLocal = (k, d) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; };
  return getLocal('panificadora_fichas_tecnicas', []);
}
export async function saveFichaTecnica(f: any): Promise<any> {
  const list = await fetchFichasTecnicas();
  const id = f.id || \icha-\\;
  const newF = { ...f, id };
  const updated = f.id ? list.map(x => x.id === f.id ? newF : x) : [...list, newF];
  localStorage.setItem('panificadora_fichas_tecnicas', JSON.stringify(updated));
  return newF;
}
export async function deleteFichaTecnica(id: string): Promise<void> {
  const list = await fetchFichasTecnicas();
  localStorage.setItem('panificadora_fichas_tecnicas', JSON.stringify(list.filter(x => x.id !== id)));
}
export async function registrarCompraInsumo(insumoId: string, quantidade: number, valorTotalPago: number): Promise<void> {
  const insumos = await fetchInsumos();
  const insumo = insumos.find(i => i.id === insumoId);
  if (!insumo) return;
  const novoPrecoCusto = valorTotalPago / quantidade;
  await saveInsumo({
    ...insumo,
    preco_custo: novoPrecoCusto,
    quantidade_estoque: (insumo.quantidade_estoque||0) + quantidade
  });
  
  const getLocal = (k, d) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; };
  const historico = getLocal('panificadora_historico_compras_insumos', []);
  const novoRegistro = {
    id: \hist-\\,
    insumo_id: insumoId,
    valor_pago: valorTotalPago,
    quantidade: quantidade,
    data: new Date().toISOString()
  };
  localStorage.setItem('panificadora_historico_compras_insumos', JSON.stringify([novoRegistro, ...historico]));
}
\;

fs.appendFileSync('src/services/db.ts', code);
