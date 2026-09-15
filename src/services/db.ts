import { Cliente, Compra, ConfiguracaoFidelidade, Categoria, Produto, ItemCarrinho } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { INITIAL_CLIENTES, INITIAL_COMPRAS, INITIAL_CONFIG, INITIAL_CATEGORIAS, INITIAL_PRODUTOS } from './seedData';
import { cleanPhone } from './whatsapp';

export const STORAGE_KEYS = {
  CLIENTES: 'panificadora_clientes',
  COMPRAS: 'panificadora_compras',
  CONFIG: 'panificadora_config',
  CATEGORIAS: 'panificadora_categorias',
  PRODUTOS: 'panificadora_produtos',
  FORNECEDORES: 'panificadora_fornecedores',
  INSUMOS: 'panificadora_insumos',
  FICHAS_TECNICAS: 'panificadora_fichas_tecnicas',
  HISTORICO_COMPRAS: 'panificadora_historico_compras',
};

// --- MOCK / LOCAL STORAGE ENGINE ---
// Auxiliares LocalStorage
export const getLocal = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (err) {
    console.error(`Erro ao ler localStorage [${key}]:`, err);
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Erro ao gravar localStorage [${key}]:`, err);
  }
}

export function resetToDemoData(): void {
  localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(INITIAL_CLIENTES));
  localStorage.setItem(STORAGE_KEYS.COMPRAS, JSON.stringify(INITIAL_COMPRAS));
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(INITIAL_CONFIG));
  localStorage.setItem(STORAGE_KEYS.CATEGORIAS, JSON.stringify(INITIAL_CATEGORIAS));
  localStorage.setItem(STORAGE_KEYS.PRODUTOS, JSON.stringify(INITIAL_PRODUTOS));
}

// --- DATA ACCESS LAYER ---

export async function fetchConfiguracao(): Promise<ConfiguracaoFidelidade> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('configuracoes_fidelidade')
        .select('*')
        .eq('id', 1)
        .single();
      if (!error && data) return data as ConfiguracaoFidelidade;
    } catch (e) {
      console.warn('Falha ao buscar config no Supabase, usando local:', e);
    }
  }
  return getLocal<ConfiguracaoFidelidade>(STORAGE_KEYS.CONFIG, INITIAL_CONFIG);
}

export async function saveConfiguracao(
  config: Partial<ConfiguracaoFidelidade>
): Promise<ConfiguracaoFidelidade> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('configuracoes_fidelidade')
        .upsert({ id: 1, ...config, atualizado_em: new Date().toISOString() })
        .select()
        .single();
      if (!error && data) return data as ConfiguracaoFidelidade;
    } catch (e) {
      console.warn('Falha ao salvar config no Supabase:', e);
    }
  }
  const current = getLocal<ConfiguracaoFidelidade>(STORAGE_KEYS.CONFIG, INITIAL_CONFIG);
  const updated = { ...current, ...config, atualizado_em: new Date().toISOString() };
  setLocal(STORAGE_KEYS.CONFIG, updated);
  return updated;
}

export async function fetchClientes(): Promise<Cliente[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome');
      if (!error && data) return data as Cliente[];
    } catch (e) {
      console.warn('Falha ao buscar clientes no Supabase, usando local:', e);
    }
  }
  return getLocal<Cliente[]>(STORAGE_KEYS.CLIENTES, INITIAL_CLIENTES);
}

export async function fetchCompras(): Promise<Compra[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('compras')
        .select('*')
        .order('criado_em', { ascending: false });
      if (!error && data) return data as Compra[];
    } catch (e) {
      console.warn('Falha ao buscar compras no Supabase, usando local:', e);
    }
  }
  return getLocal<Compra[]>(STORAGE_KEYS.COMPRAS, INITIAL_COMPRAS);
}

export async function createCliente(nome: string, whatsapp: string, data_nascimento?: string | null, email?: string | null, notas?: string | null): Promise<Cliente> {
  const cleanNumber = cleanPhone(whatsapp);
  const newCliente: Cliente = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cli-${Date.now()}`,
    nome: nome.trim(),
    whatsapp: cleanNumber,
    data_nascimento: data_nascimento || null,
    email: email || null,
    notas: notas || null,
    total_compras_historico: 0,
    criado_em: new Date().toISOString(),
    ultimo_contato_resgate: null,
    ativo: true
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert([{
          nome: newCliente.nome,
          whatsapp: newCliente.whatsapp,
          data_nascimento: newCliente.data_nascimento,
          email: newCliente.email,
          notas: newCliente.notas,
          total_compras_historico: 0,
          ultimo_contato_resgate: null
        }])
        .select()
        .single();
      if (!error && data) return data as Cliente;
    } catch (e) {
      console.warn('Falha ao inserir cliente no Supabase, salvando local:', e);
    }
  }

  const clientes = getLocal<Cliente[]>(STORAGE_KEYS.CLIENTES, INITIAL_CLIENTES);
  const updated = [...clientes, newCliente];
  setLocal(STORAGE_KEYS.CLIENTES, updated);
  return newCliente;
}

export async function updateCliente(clienteId: string, updates: Partial<Cliente>): Promise<Cliente | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('id', clienteId)
        .select()
        .single();
      if (!error && data) return data as Cliente;
    } catch (e) {
      console.warn('Falha ao atualizar cliente no Supabase, atualizando local:', e);
    }
  }

  const clientes = getLocal<Cliente[]>(STORAGE_KEYS.CLIENTES, INITIAL_CLIENTES);
  let updatedCliente: Cliente | null = null;
  const updated = clientes.map((c) => {
    if (c.id === clienteId) {
      updatedCliente = { ...c, ...updates };
      return updatedCliente;
    }
    return c;
  });
  
  if (updatedCliente) {
    setLocal(STORAGE_KEYS.CLIENTES, updated);
  }
  
  return updatedCliente;
}

export async function updateClienteContato(clienteId: string, dataIso: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('clientes')
        .update({ ultimo_contato_resgate: dataIso })
        .eq('id', clienteId);
    } catch (e) {
      console.warn('Falha ao atualizar contato no Supabase:', e);
    }
  }

  const clientes = getLocal<Cliente[]>(STORAGE_KEYS.CLIENTES, INITIAL_CLIENTES);
  const updated = clientes.map((c) =>
    c.id === clienteId ? { ...c, ultimo_contato_resgate: dataIso } : c
  );
  setLocal(STORAGE_KEYS.CLIENTES, updated);
}

export async function registerCompra(
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
  const todayIso = `${year}-${month}-${day}`;

  let custo_total = 0;
  
  if (carrinho && carrinho.length > 0) {
    custo_total = carrinho.reduce((acc, item) => acc + ((item.produto.custo || 0) * item.quantidade), 0);
    const produtosDb = getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, INITIAL_PRODUTOS);
    let produtosUpdated = false;
    const newProdutos = produtosDb.map(p => {
      const itemCaixa = carrinho.find(i => i.produto.id === p.id);
      if (itemCaixa && p.controlar_estoque && p.estoque_atual !== undefined) {
        produtosUpdated = true;
        return { ...p, estoque_atual: p.estoque_atual - itemCaixa.quantidade };
      }
      return p;
    });
    if (produtosUpdated) setLocal(STORAGE_KEYS.PRODUTOS, newProdutos);
  }

  const newCompra: Compra = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `comp-${Date.now()}`,
    cliente_id: clienteId,
    valor: Number(valor.toFixed(2)),
    custo_total: Number(custo_total.toFixed(2)),
    data_compra: todayIso,
    criado_em: now.toISOString(),
    detalhes: detalhes || null,
    pontuou_fidelidade: pontuouFidelidade,
    forma_pagamento: forma_pagamento
  };

  const compras = getLocal<Compra[]>(STORAGE_KEYS.COMPRAS, INITIAL_COMPRAS);
  const updatedCompras = [newCompra, ...compras];
  setLocal(STORAGE_KEYS.COMPRAS, updatedCompras);

  const clientes = getLocal<Cliente[]>(STORAGE_KEYS.CLIENTES, INITIAL_CLIENTES);
  const updatedClientes = clientes.map((c) =>
    c.id === clienteId
      ? { ...c, total_compras_historico: (c.total_compras_historico || 0) + 1 }
      : c
  );
  setLocal(STORAGE_KEYS.CLIENTES, updatedClientes);

  return newCompra;
}

// --- CATALOGO (PRODUTOS & CATEGORIAS) ---

export async function fetchCategorias(): Promise<Categoria[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('ordem');
      if (!error && data) return data as Categoria[];
    } catch (e) {
      console.warn('Falha ao buscar categorias no Supabase, usando local:', e);
    }
  }
  return getLocal<Categoria[]>(STORAGE_KEYS.CATEGORIAS, INITIAL_CATEGORIAS);
}

export async function saveCategoria(categoria: Omit<Categoria, 'id'> & { id?: string }): Promise<Categoria> {
  const newCategoria = {
    ...categoria,
    id: categoria.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}`)
  } as Categoria;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .upsert({ ...newCategoria })
        .select()
        .single();
      if (!error && data) return data as Categoria;
    } catch (e) {
      console.warn('Falha ao salvar categoria no Supabase, salvando local:', e);
    }
  }

  const categorias = getLocal<Categoria[]>(STORAGE_KEYS.CATEGORIAS, INITIAL_CATEGORIAS);
  const updatedList = categoria.id 
    ? categorias.map(c => c.id === categoria.id ? newCategoria : c)
    : [...categorias, newCategoria];
  setLocal(STORAGE_KEYS.CATEGORIAS, updatedList);
  return newCategoria;
}

export async function deleteCategoria(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('categorias')
        .delete()
        .eq('id', id);
    } catch (e) {
      console.warn('Falha ao excluir categoria no Supabase:', e);
    }
  }

  const categorias = getLocal<Categoria[]>(STORAGE_KEYS.CATEGORIAS, INITIAL_CATEGORIAS);
  setLocal(STORAGE_KEYS.CATEGORIAS, categorias.filter(c => c.id !== id));

  // Remove produtos associados para manter consistência no fallback local (simulando ON DELETE CASCADE)
  const produtos = getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, INITIAL_PRODUTOS);
  const updatedProdutos = produtos.filter(p => p.categoria_id !== id);
  if (produtos.length !== updatedProdutos.length) {
    setLocal(STORAGE_KEYS.PRODUTOS, updatedProdutos);
  }
}

export async function fetchProdutos(): Promise<Produto[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome');
      if (!error && data) return data as Produto[];
    } catch (e) {
      console.warn('Falha ao buscar produtos no Supabase, usando local:', e);
    }
  }
  return getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, INITIAL_PRODUTOS);
}

export async function saveProduto(produto: Omit<Produto, 'id'> & { id?: string }): Promise<Produto> {
  const newProduto = {
    ...produto,
    id: produto.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `prod-${Date.now()}`)
  } as Produto;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .upsert({ ...newProduto })
        .select()
        .single();
      if (!error && data) return data as Produto;
    } catch (e) {
      console.warn('Falha ao salvar produto no Supabase, salvando local:', e);
    }
  }

  const produtos = getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, INITIAL_PRODUTOS);
  const updatedList = produto.id 
    ? produtos.map(p => p.id === produto.id ? newProduto : p)
    : [...produtos, newProduto];
  setLocal(STORAGE_KEYS.PRODUTOS, updatedList);
  return newProduto;
}

export async function deleteProduto(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('produtos')
        .delete()
        .eq('id', id);
    } catch (e) {
      console.warn('Falha ao excluir produto no Supabase:', e);
    }
  }

  const produtos = getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, INITIAL_PRODUTOS);
  setLocal(STORAGE_KEYS.PRODUTOS, produtos.filter(p => p.id !== id));
}
// --- MESAS ABERTAS ---
export async function fetchMesasAbertas(): Promise<any[]> {
  const STORAGE_KEYS = { MESAS_ABERTAS: 'panificadora_mesas_abertas' };
  const getLocal = (k: string, d: any) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; };
  return getLocal(STORAGE_KEYS.MESAS_ABERTAS, []);
}

export async function saveMesaAberta(mesa: any): Promise<any> {
  const STORAGE_KEYS = { MESAS_ABERTAS: 'panificadora_mesas_abertas' };
  const getLocal = (k: string, d: any) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; };
  const setLocal = (k: string, v: any) => localStorage.setItem(k, JSON.stringify(v));
  
  const newMesa = {
    ...mesa,
    id: mesa.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'mesa-' + Date.now())
  };

  const mesas = getLocal(STORAGE_KEYS.MESAS_ABERTAS, []);
  const updatedList = mesa.id 
    ? mesas.map((m: any) => m.id === mesa.id ? newMesa : m)
    : [...mesas, newMesa];
  setLocal(STORAGE_KEYS.MESAS_ABERTAS, updatedList);
  return newMesa;
}

export async function deleteMesaAberta(id: string): Promise<void> {
  const STORAGE_KEYS = { MESAS_ABERTAS: 'panificadora_mesas_abertas' };
  const getLocal = (k: string, d: any) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; };
  const setLocal = (k: string, v: any) => localStorage.setItem(k, JSON.stringify(v));
  
  const mesas = getLocal(STORAGE_KEYS.MESAS_ABERTAS, []);
  setLocal(STORAGE_KEYS.MESAS_ABERTAS, mesas.filter((m: any) => m.id !== id));
}

// --- CMV ---
export async function fetchFornecedores(): Promise<any[]> {
  const getLocal = (k: string, d: any) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; };
  return getLocal('panificadora_fornecedores', []);
}
export async function saveFornecedor(f: any): Promise<any> {
  const list = await fetchFornecedores();
  const id = f.id || 'forn-' + Date.now();
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
  const getLocal = (k: string, d: any) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; };
  return getLocal('panificadora_insumos', []);
}
export async function saveInsumo(i: any): Promise<any> {
  const list = await fetchInsumos();
  const id = i.id || 'insumo-' + Date.now();
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
  const getLocal = (k: string, d: any) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; };
  return getLocal('panificadora_fichas_tecnicas', []);
}
export async function saveFichaTecnica(f: any): Promise<any> {
  const list = await fetchFichasTecnicas();
  const id = f.id || 'ficha-' + Date.now();
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
  
  const getLocal = (k: string, d: any) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; };
  const historico = getLocal('panificadora_historico_compras_insumos', []);
  const novoRegistro = {
    id: 'hist-' + Date.now(),
    insumo_id: insumoId,
    valor_pago: valorTotalPago,
    quantidade: quantidade,
    data: new Date().toISOString()
  };
  localStorage.setItem('panificadora_historico_compras_insumos', JSON.stringify([novoRegistro, ...historico]));
}
