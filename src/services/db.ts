import {
  Cliente,
  Compra,
  ConfiguracaoFidelidade,
  Categoria,
  Produto,
  ItemCarrinho,
  Fornecedor,
  Insumo,
  FichaTecnica,
  HistoricoCompraInsumo,
  CustosFixosConfig,
  MesaAberta,
  PedidoCozinha,
  PedidoCozinhaStatus,
  ItemPedidoCozinha,
  ConfiguracaoFiscal,
  NotaFiscal
} from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { 
  INITIAL_CLIENTES, 
  INITIAL_COMPRAS, 
  INITIAL_CONFIG, 
  INITIAL_CATEGORIAS, 
  INITIAL_PRODUTOS, 
  INITIAL_FORNECEDORES, 
  INITIAL_INSUMOS, 
  INITIAL_FICHAS_TECNICAS,
  INITIAL_CONFIG_FISCAL
} from './seedData';
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
  CUSTOS_FIXOS: 'panificadora_custos_fixos',
  PEDIDOS_COZINHA: 'panificadora_pedidos_cozinha',
  MESAS_ABERTAS: 'panificadora_mesas_abertas',
  CONFIG_FISCAL: 'panificadora_config_fiscal',
  NOTAS_FISCAIS: 'panificadora_notas_fiscais',
};

// --- MOCK / LOCAL STORAGE ENGINE ---
const CLEANUP_KEY = 'panificadora_cleaned_v3';
const CLEANUP_KEY_CATALOGO_V5 = 'panificadora_pure_dono_v5';

function runInitialCleanupIfNeeded(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const isClean = localStorage.getItem(CLEANUP_KEY);
    if (!isClean) {
      const rawClientes = localStorage.getItem(STORAGE_KEYS.CLIENTES);
      const rawCompras = localStorage.getItem(STORAGE_KEYS.COMPRAS);
      const rawFornecedores = localStorage.getItem(STORAGE_KEYS.FORNECEDORES);
      
      const hasDemoClientes = rawClientes && (rawClientes.includes('cli-01') || rawClientes.includes('Marlene') || rawClientes.includes('Valdomiro'));
      const hasDemoCompras = rawCompras && (rawCompras.includes('comp-marlene') || rawCompras.includes('comp-antonio') || rawCompras.includes('comp-valdomiro'));
      const hasDemoFornecedores = rawFornecedores && (rawFornecedores.includes('forn-1') || rawFornecedores.includes('Moinho Real') || rawFornecedores.includes('Laticínios Fazenda'));
      
      if (hasDemoClientes || hasDemoCompras || hasDemoFornecedores || !rawClientes || !rawCompras) {
        localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.COMPRAS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.FORNECEDORES, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.INSUMOS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.FICHAS_TECNICAS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.HISTORICO_COMPRAS, JSON.stringify([]));
      }
      localStorage.setItem(CLEANUP_KEY, 'true');
    }

    // Limpeza de catálogo: garantir que o PDV e o Cardápio sejam 100% EXCLUSIVAMENTE cadastrados pelo dono
    const isCleanCatalogoV5 = localStorage.getItem(CLEANUP_KEY_CATALOGO_V5);
    if (!isCleanCatalogoV5) {
      const rawCategorias = localStorage.getItem(STORAGE_KEYS.CATEGORIAS);
      if (rawCategorias) {
        try {
          const cats = JSON.parse(rawCategorias) as Categoria[];
          const userCats = cats.filter(c => !['cat-bebidas-quentes', 'cat-paes-salgados', 'cat-doces', 'cat-1', 'cat-2', 'cat-3', 'cat-4'].includes(c.id));
          localStorage.setItem(STORAGE_KEYS.CATEGORIAS, JSON.stringify(userCats));
        } catch {
          localStorage.setItem(STORAGE_KEYS.CATEGORIAS, JSON.stringify([]));
        }
      }

      const rawProdutos = localStorage.getItem(STORAGE_KEYS.PRODUTOS);
      if (rawProdutos) {
        try {
          const prods = JSON.parse(rawProdutos) as Produto[];
          const userProds = prods.filter(p => 
            !p.id.startsWith('prod-cafe-') &&
            !p.id.startsWith('prod-cappuccino') &&
            !p.id.startsWith('prod-chocolate-') &&
            !p.id.startsWith('prod-pao-') &&
            !['prod-torta-holandesa', 'prod-suco-laranja', 'prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5', 'prod-6', 'prod-7', 'prod-8', 'prod-9', 'prod-10'].includes(p.id)
          );
          localStorage.setItem(STORAGE_KEYS.PRODUTOS, JSON.stringify(userProds));
        } catch {
          localStorage.setItem(STORAGE_KEYS.PRODUTOS, JSON.stringify([]));
        }
      }

      localStorage.setItem(CLEANUP_KEY_CATALOGO_V5, 'true');

      if (isSupabaseConfigured && supabase) {
        (async () => {
          try {
            await supabase.from('produtos').delete().in('id', [
              'prod-cafe-expresso',
              'prod-cappuccino',
              'prod-cafe-leite',
              'prod-chocolate-quente',
              'prod-pao-chapa',
              'prod-pao-queijo',
              'prod-torta-holandesa',
              'prod-suco-laranja'
            ]);
            await supabase.from('categorias').delete().in('id', [
              'cat-bebidas-quentes',
              'cat-paes-salgados',
              'cat-doces'
            ]);
          } catch (e) {
            // ignore
          }
        })();
      }
    }
  } catch (e) {
    console.warn('Erro ao verificar limpeza do localStorage:', e);
  }
}
runInitialCleanupIfNeeded();

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

export function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Erro ao gravar localStorage [${key}]:`, err);
  }
}

export function resetToDemoData(): void {
  localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.COMPRAS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(INITIAL_CONFIG));
  localStorage.setItem(STORAGE_KEYS.CATEGORIAS, JSON.stringify(INITIAL_CATEGORIAS));
  localStorage.setItem(STORAGE_KEYS.PRODUTOS, JSON.stringify(INITIAL_PRODUTOS));
  localStorage.setItem(STORAGE_KEYS.FORNECEDORES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.INSUMOS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.FICHAS_TECNICAS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.HISTORICO_COMPRAS, JSON.stringify([]));
  localStorage.setItem('panificadora_mesas_abertas', JSON.stringify([]));
  localStorage.setItem(CLEANUP_KEY, 'true');
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
  let clientesList: Cliente[] = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome');
      if (!error && data) {
        clientesList = data as Cliente[];
      }
    } catch (e) {
      console.warn('Falha ao buscar clientes no Supabase, usando local:', e);
    }
  }

  if (clientesList.length === 0) {
    clientesList = getLocal<Cliente[]>(STORAGE_KEYS.CLIENTES, INITIAL_CLIENTES);
  }

  // Correlacionar com compras e pedidos de cozinha para garantir cálculo real de visitas
  try {
    const compras = getLocal<Compra[]>(STORAGE_KEYS.COMPRAS, INITIAL_COMPRAS);
    const pedidos = getLocal<PedidoCozinha[]>('panificadora_pedidos_cozinha', []);

    clientesList = clientesList.map(c => {
      const cNome = c.nome ? c.nome.trim().toLowerCase() : '';
      const cTel = c.whatsapp ? cleanPhone(c.whatsapp) : '';

      const countCompras = compras.filter(cp => cp.cliente_id === c.id).length;
      const countPedidos = pedidos.filter(p => 
        (p.cliente_id && p.cliente_id === c.id) ||
        (cNome && p.cliente_nome && p.cliente_nome.trim().toLowerCase() === cNome) ||
        (cTel && p.cliente_telefone && cleanPhone(p.cliente_telefone) === cTel)
      ).length;

      const totalReal = Math.max(c.total_compras_historico || 0, countCompras, countPedidos);

      return {
        ...c,
        total_compras_historico: totalReal
      };
    });
  } catch (err) {
    console.warn('Erro ao correlacionar histórico de visitas:', err);
  }

  return clientesList;
}

export async function fetchCompras(): Promise<Compra[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('compras')
        .select('*')
        .order('criado_em', { ascending: false });
      if (!error && data && data.length > 0) return data as Compra[];
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
  let novoTotalCli = 1;
  const updatedClientes = clientes.map((c) => {
    if (c.id === clienteId) {
      novoTotalCli = (c.total_compras_historico || 0) + 1;
      return { ...c, total_compras_historico: novoTotalCli };
    }
    return c;
  });
  setLocal(STORAGE_KEYS.CLIENTES, updatedClientes);

  // Sincronizar compra e histórico no Supabase
  if (isSupabaseConfigured && supabase) {
    (async () => {
      try {
        await supabase.from('compras').insert([{
          id: newCompra.id,
          cliente_id: newCompra.cliente_id,
          valor: newCompra.valor,
          custo_total: newCompra.custo_total,
          data_compra: newCompra.data_compra,
          criado_em: newCompra.criado_em,
          detalhes: newCompra.detalhes,
          pontuou_fidelidade: newCompra.pontuou_fidelidade,
          forma_pagamento: newCompra.forma_pagamento
        }]);

        await supabase
          .from('clientes')
          .update({ total_compras_historico: novoTotalCli })
          .eq('id', clienteId);
      } catch (e) {
        console.warn('Erro ao salvar compra/histórico no Supabase:', e);
      }
    })();
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('clientes_atualizados'));
    window.dispatchEvent(new Event('compras_atualizadas'));
  }

  return newCompra;
}

// --- CATALOGO (PRODUTOS & CATEGORIAS) ---

const isUuid = (str?: string): boolean => 
  Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

const generateUuid = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export async function fetchCategorias(): Promise<Categoria[]> {
  const localCats = getLocal<Categoria[]>(STORAGE_KEYS.CATEGORIAS, []);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('ordem');

      if (!error && data) {
        setLocal(STORAGE_KEYS.CATEGORIAS, data);
        return data as Categoria[];
      }
    } catch (e) {
      console.warn('Falha ao buscar categorias no Supabase:', e);
    }
  }

  return localCats;
}

export async function saveCategoria(categoria: Omit<Categoria, 'id'> & { id?: string }): Promise<Categoria> {
  const catId = (categoria.id && isUuid(categoria.id)) ? categoria.id : generateUuid();
  const newCategoria: Categoria = {
    nome: categoria.nome || '',
    icone: categoria.icone || 'Tag',
    ordem: typeof categoria.ordem === 'number' ? categoria.ordem : 0,
    id: catId
  };

  // 1. Salvar no Supabase com colunas compatíveis com o banco
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .upsert({
          id: newCategoria.id,
          nome: newCategoria.nome,
          icone: newCategoria.icone,
          ordem: newCategoria.ordem
        })
        .select()
        .single();
      
      if (!error && data) {
        newCategoria.id = data.id;
      }
      if (error) {
        console.warn('Erro ao salvar categoria no Supabase:', error.message);
      }
    } catch (e) {
      console.warn('Falha ao salvar categoria no Supabase:', e);
    }
  }

  // 2. Salvar imediatamente no localStorage
  const categorias = getLocal<Categoria[]>(STORAGE_KEYS.CATEGORIAS, []);
  const exists = categorias.some(c => c.id === newCategoria.id);
  const updatedList = exists 
    ? categorias.map(c => c.id === newCategoria.id ? newCategoria : c)
    : [...categorias, newCategoria];
  setLocal(STORAGE_KEYS.CATEGORIAS, updatedList);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('catalogo_atualizado'));
    window.dispatchEvent(new CustomEvent('categorias_atualizadas'));
  }

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

  const categorias = getLocal<Categoria[]>(STORAGE_KEYS.CATEGORIAS, []);
  setLocal(STORAGE_KEYS.CATEGORIAS, categorias.filter(c => c.id !== id));

  const produtos = getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []);
  const updatedProdutos = produtos.filter(p => p.categoria_id !== id);
  if (produtos.length !== updatedProdutos.length) {
    setLocal(STORAGE_KEYS.PRODUTOS, updatedProdutos);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('catalogo_atualizado'));
    window.dispatchEvent(new CustomEvent('categorias_atualizadas'));
    window.dispatchEvent(new CustomEvent('produtos_atualizados'));
  }
}

export async function fetchProdutos(): Promise<Produto[]> {
  const localProds = getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome');

      if (!error && data) {
        setLocal(STORAGE_KEYS.PRODUTOS, data);
        return data as Produto[];
      }
    } catch (e) {
      console.warn('Falha ao buscar produtos no Supabase:', e);
    }
  }

  return localProds;
}

export async function saveProduto(produto: Omit<Produto, 'id'> & { id?: string }): Promise<Produto> {
  const prodId = (produto.id && isUuid(produto.id)) ? produto.id : generateUuid();
  const catId = (produto.categoria_id && isUuid(produto.categoria_id)) ? produto.categoria_id : null;

  const newProduto: Produto = {
    ...produto,
    ativo: produto.ativo !== false,
    id: prodId,
    categoria_id: catId || produto.categoria_id
  };

  // 1. Salvar na nuvem do Supabase com colunas compatíveis com o banco (UUID e colunas existentes)
  if (isSupabaseConfigured && supabase) {
    try {
      const payload: any = {
        id: prodId,
        nome: newProduto.nome,
        preco: Number(newProduto.preco) || 0,
        ativo: newProduto.ativo !== false
      };
      if (catId) {
        payload.categoria_id = catId;
      }

      const { data, error } = await supabase
        .from('produtos')
        .upsert(payload)
        .select()
        .single();
      
      if (!error && data) {
        newProduto.id = data.id;
      }
      if (error) {
        console.warn('Erro ao salvar produto no Supabase:', error.message);
      }
    } catch (e) {
      console.warn('Falha ao salvar produto no Supabase:', e);
    }
  }

  // 2. Salvar imediatamente no localStorage
  const produtos = getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []);
  const exists = produtos.some(p => p.id === newProduto.id);
  const updatedList = exists 
    ? produtos.map(p => p.id === newProduto.id ? newProduto : p)
    : [...produtos, newProduto];
  setLocal(STORAGE_KEYS.PRODUTOS, updatedList);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('catalogo_atualizado'));
    window.dispatchEvent(new CustomEvent('produtos_atualizados'));
  }

  return newProduto;
}

export async function deleteProduto(id: string): Promise<void> {
  const produtos = getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []);
  setLocal(STORAGE_KEYS.PRODUTOS, produtos.filter(p => p.id !== id));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('catalogo_atualizado'));
    window.dispatchEvent(new CustomEvent('produtos_atualizados'));
  }

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
}
// --- MESAS ABERTAS ---
export async function fetchMesasAbertas(): Promise<MesaAberta[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('mesas_abertas').select('*');
      if (!error && data) {
        setLocal(STORAGE_KEYS.MESAS_ABERTAS, data);
        return data as MesaAberta[];
      }
    } catch (e) {
      console.warn('Falha ao buscar mesas abertas no Supabase:', e);
    }
  }
  return getLocal<MesaAberta[]>(STORAGE_KEYS.MESAS_ABERTAS, []);
}

export async function saveMesaAberta(mesa: any): Promise<MesaAberta> {
  const newMesa: MesaAberta = {
    ...mesa,
    id: mesa.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'mesa-' + Date.now())
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('mesas_abertas').upsert(newMesa);
    } catch (e) {
      console.warn('Falha ao salvar mesa aberta no Supabase:', e);
    }
  }

  const mesas = getLocal<MesaAberta[]>(STORAGE_KEYS.MESAS_ABERTAS, []);
  const updatedList = mesa.id 
    ? mesas.map((m: MesaAberta) => m.id === mesa.id ? newMesa : m)
    : [...mesas, newMesa];
  setLocal(STORAGE_KEYS.MESAS_ABERTAS, updatedList);
  return newMesa;
}

export async function deleteMesaAberta(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('mesas_abertas').delete().eq('id', id);
    } catch (e) {
      console.warn('Falha ao deletar mesa aberta no Supabase:', e);
    }
  }
  const mesas = getLocal<MesaAberta[]>(STORAGE_KEYS.MESAS_ABERTAS, []);
  setLocal(STORAGE_KEYS.MESAS_ABERTAS, mesas.filter((m: MesaAberta) => m.id !== id));
}

// --- PEDIDOS DA COZINHA (KDS) ---
export async function fetchPedidosCozinha(): Promise<PedidoCozinha[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('pedidos_cozinha')
        .select('*')
        .order('criado_em', { ascending: false });
      if (!error && data) {
        setLocal(STORAGE_KEYS.PEDIDOS_COZINHA, data);
        return data as PedidoCozinha[];
      }
    } catch (e) {
      console.warn('Falha ao buscar pedidos da cozinha no Supabase:', e);
    }
  }
  return getLocal<PedidoCozinha[]>(STORAGE_KEYS.PEDIDOS_COZINHA, []);
}

export async function savePedidoCozinha(pedido: Partial<PedidoCozinha>): Promise<PedidoCozinha> {
  const newPedido: PedidoCozinha = {
    id: pedido.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'ped-' + Date.now()),
    mesa_numero: pedido.mesa_numero || 1,
    cliente_nome: pedido.cliente_nome || 'Cliente',
    cliente_telefone: pedido.cliente_telefone || '',
    itens: pedido.itens || [],
    total: pedido.total !== undefined ? pedido.total : (pedido.itens || []).reduce((acc, i) => acc + (i.subtotal || 0), 0),
    status: pedido.status || 'pendente',
    observacoes: pedido.observacoes || '',
    alerta_silenciado: pedido.alerta_silenciado !== undefined ? pedido.alerta_silenciado : false,
    criado_em: pedido.criado_em || new Date().toISOString(),
    atualizado_em: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('pedidos_cozinha').upsert(newPedido);
    } catch (e) {
      console.warn('Falha ao salvar pedido da cozinha no Supabase:', e);
    }
  }

  const pedidos = getLocal<PedidoCozinha[]>(STORAGE_KEYS.PEDIDOS_COZINHA, []);
  const exists = pedidos.some(p => p.id === newPedido.id);
  const updatedList = exists ? pedidos.map(p => p.id === newPedido.id ? newPedido : p) : [newPedido, ...pedidos];
  setLocal(STORAGE_KEYS.PEDIDOS_COZINHA, updatedList);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pedidos_cozinha_atualizados', { detail: newPedido }));
  }

  return newPedido;
}

export async function updateStatusPedidoCozinha(id: string, status: PedidoCozinhaStatus): Promise<void> {
  const pedidos = await fetchPedidosCozinha();
  const pedido = pedidos.find(p => p.id === id);
  if (!pedido) return;
  const updated = { ...pedido, status, atualizado_em: new Date().toISOString() };
  await savePedidoCozinha(updated);
}

export const updatePedidoCozinhaStatus = updateStatusPedidoCozinha;

export async function silenciarAlertaPedido(id: string): Promise<void> {
  const pedidos = await fetchPedidosCozinha();
  const pedido = pedidos.find(p => p.id === id);
  if (!pedido) return;
  const updated = { ...pedido, alerta_silenciado: true, atualizado_em: new Date().toISOString() };
  await savePedidoCozinha(updated);
}

export async function silenciarTodosAlertas(): Promise<void> {
  const pedidos = await fetchPedidosCozinha();
  const updatedList = pedidos.map(p => ({ ...p, alerta_silenciado: true }));
  setLocal(STORAGE_KEYS.PEDIDOS_COZINHA, updatedList);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('pedidos_cozinha').update({ alerta_silenciado: true }).eq('alerta_silenciado', false);
    } catch (e) {
      console.warn('Falha ao silenciar alertas no Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pedidos_cozinha_atualizados'));
  }
}

export async function identificarOuCadastrarCliente(
  nomeSobrenome: string,
  whatsapp?: string
): Promise<{ cliente: Cliente; isNovo: boolean }> {
  const digits = whatsapp ? cleanPhone(whatsapp) : '';
  const nomeLimpo = nomeSobrenome ? nomeSobrenome.trim() : '';
  const clientes = await fetchClientes();

  let match: Cliente | undefined;

  // 1. Se informou telefone (WhatsApp), busca pelo telefone primeiro
  if (digits && digits.length >= 8) {
    match = clientes.find((c) => {
      const cDigits = cleanPhone(c.whatsapp);
      return cDigits === digits || (digits.length >= 8 && (cDigits.endsWith(digits) || digits.endsWith(cDigits)));
    });
  }

  // 2. Se não encontrou por telefone ou não informou telefone, busca pelo nome exato (case-insensitive)
  if (!match && nomeLimpo) {
    match = clientes.find((c) => c.nome.trim().toLowerCase() === nomeLimpo.toLowerCase());
  }

  if (match) {
    // Se o cliente já existe, correlacionar com compras e pedidos de cozinha para calcular o total REAL de visitas
    const compras = await fetchCompras();
    const pedidos = await fetchPedidosCozinha();
    const countCompras = compras.filter(cp => cp.cliente_id === match!.id).length;
    const countPedidos = pedidos.filter(p => 
      (p.cliente_id && p.cliente_id === match!.id) ||
      (nomeLimpo && p.cliente_nome && p.cliente_nome.trim().toLowerCase() === nomeLimpo.toLowerCase()) ||
      (digits && p.cliente_telefone && cleanPhone(p.cliente_telefone) === digits)
    ).length;

    const totalReal = Math.max(match.total_compras_historico || 0, countCompras, countPedidos);

    const updates: Partial<Cliente> = {};
    if (totalReal !== match.total_compras_historico) {
      match.total_compras_historico = totalReal;
      updates.total_compras_historico = totalReal;
    }
    if (nomeLimpo && nomeLimpo.length > match.nome.length) {
      updates.nome = nomeLimpo;
      match.nome = nomeLimpo;
    }
    if (digits && (!match.whatsapp || match.whatsapp.length < 8)) {
      updates.whatsapp = digits;
      match.whatsapp = digits;
    }
    if (Object.keys(updates).length > 0) {
      await updateCliente(match.id, updates);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('clientes_atualizados'));
      }
    }
    return { cliente: match, isNovo: false };
  }

  // 3. Se não tem cadastro, cria automaticamente com Nome e WhatsApp informados
  const novoCliente = await createCliente(nomeLimpo || 'Cliente da Mesa', digits || '');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('clientes_atualizados'));
  }
  return { cliente: novoCliente, isNovo: true };
}

export async function criarPedidoCardapio(params: {
  mesaNumero: number;
  clienteNome: string;
  clienteTelefone?: string;
  clienteId?: string;
  itens: ItemPedidoCozinha[];
  observacoes?: string;
}): Promise<PedidoCozinha> {
  const total = params.itens.reduce((acc, i) => acc + (i.subtotal || 0), 0);

  // 1. Salvar o pedido para a cozinha (KDS) com alerta ativo (alerta_silenciado: false)
  const pedido = await savePedidoCozinha({
    mesa_numero: params.mesaNumero,
    cliente_id: params.clienteId,
    cliente_nome: params.clienteNome,
    cliente_telefone: params.clienteTelefone,
    itens: params.itens,
    total,
    status: 'pendente',
    observacoes: params.observacoes,
    alerta_silenciado: false
  });

  // 2. Vincular com o sistema de Mesas Abertas do Caixa
  const mesas = await fetchMesasAbertas();
  const mesaExistente = mesas.find((m: MesaAberta) => m.mesa_numero === params.mesaNumero);

  const novosItensCarrinho: ItemCarrinho[] = params.itens.map(item => ({
    id_temp: item.id_temp,
    produto: {
      id: item.produto_id,
      categoria_id: '',
      nome: item.nome,
      preco: item.preco_unitario,
      ativo: true
    },
    quantidade: item.quantidade,
    subtotal: item.subtotal
  }));

  if (mesaExistente) {
    const carrinhoAtualizado = [...(mesaExistente.carrinho || []), ...novosItensCarrinho];
    const totalAtualizado = carrinhoAtualizado.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const pedidosIds = [...(mesaExistente.pedidos_ids || []), pedido.id];

    await saveMesaAberta({
      ...mesaExistente,
      cliente_id: params.clienteId || mesaExistente.cliente_id,
      cliente_nome: mesaExistente.cliente_nome || params.clienteNome,
      cliente_telefone: mesaExistente.cliente_telefone || params.clienteTelefone,
      carrinho: carrinhoAtualizado,
      total: totalAtualizado,
      pedidos_ids: pedidosIds
    });
  } else {
    await saveMesaAberta({
      mesa_id: `mesa-${params.mesaNumero}`,
      mesa_numero: params.mesaNumero,
      cliente_id: params.clienteId,
      cliente_nome: params.clienteNome,
      cliente_telefone: params.clienteTelefone,
      carrinho: novosItensCarrinho,
      total: total,
      pedidos_ids: [pedido.id],
      criado_em: new Date().toISOString()
    });
  }

  // 3. Registrar compra e vincular ao histórico do cliente automaticamente
  let targetCliId = params.clienteId;
  if (!targetCliId && params.clienteNome) {
    const clientes = await fetchClientes();
    const found = clientes.find(c => c.nome.trim().toLowerCase() === params.clienteNome.trim().toLowerCase());
    if (found) targetCliId = found.id;
  }

  if (targetCliId) {
    try {
      await registerCompra(
        targetCliId,
        total,
        true,
        `Mesa ${params.mesaNumero} (Cardápio Digital): ${params.itens.map(i => `${i.quantidade}x ${i.nome}`).join(', ')}`,
        novosItensCarrinho,
        `Mesa ${params.mesaNumero}`
      );
    } catch (err) {
      console.warn('Erro ao registrar histórico de compra do cliente:', err);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('novo_pedido_cozinha', { detail: pedido }));
    window.dispatchEvent(new CustomEvent('pedidos_cozinha_atualizados'));
  }

  return pedido;
}

// --- CMV ---
export async function fetchFornecedores(): Promise<Fornecedor[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .order('nome_empresa');
      if (!error && data) return data as Fornecedor[];
    } catch (e) {
      console.warn('Falha ao buscar fornecedores no Supabase, usando local:', e);
    }
  }
  const v = localStorage.getItem(STORAGE_KEYS.FORNECEDORES);
  return v ? JSON.parse(v) : [];
}

export async function saveFornecedor(f: Fornecedor): Promise<Fornecedor> {
  const id = f.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'forn-' + Date.now());
  const newF: Fornecedor = { ...f, id };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('fornecedores').upsert({
        id: newF.id,
        nome_empresa: newF.nome_empresa,
        contato_whatsapp: newF.contato_whatsapp,
        cnpj: newF.cnpj || null,
        cidade: newF.cidade || null,
      });
    } catch (e) {
      console.warn('Falha ao salvar fornecedor no Supabase:', e);
    }
  }

  const list = await fetchFornecedores();
  const exists = list.some(x => x.id === newF.id);
  const updated = exists ? list.map(x => x.id === newF.id ? newF : x) : [...list, newF];
  localStorage.setItem(STORAGE_KEYS.FORNECEDORES, JSON.stringify(updated));
  return newF;
}

export async function deleteFornecedor(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('fornecedores').delete().eq('id', id);
    } catch (e) {
      console.warn('Falha ao excluir fornecedor no Supabase:', e);
    }
  }
  const list = await fetchFornecedores();
  localStorage.setItem(STORAGE_KEYS.FORNECEDORES, JSON.stringify(list.filter(x => x.id !== id)));
}

export async function fetchInsumos(): Promise<Insumo[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('insumos')
        .select('*')
        .order('nome');
      if (!error && data) return data as Insumo[];
    } catch (e) {
      console.warn('Falha ao buscar insumos no Supabase, usando local:', e);
    }
  }
  const v = localStorage.getItem(STORAGE_KEYS.INSUMOS);
  return v ? JSON.parse(v) : [];
}

export async function saveInsumo(i: Insumo): Promise<Insumo> {
  const id = i.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'insumo-' + Date.now());
  const newI: Insumo = { ...i, id };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('insumos').upsert(newI);
    } catch (e) {
      console.warn('Falha ao salvar insumo no Supabase:', e);
    }
  }

  const list = await fetchInsumos();
  const exists = list.some(x => x.id === newI.id);
  const updated = exists ? list.map(x => x.id === newI.id ? newI : x) : [...list, newI];
  localStorage.setItem(STORAGE_KEYS.INSUMOS, JSON.stringify(updated));
  return newI;
}

export async function deleteInsumo(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('insumos').delete().eq('id', id);
    } catch (e) {
      console.warn('Falha ao excluir insumo no Supabase:', e);
    }
  }
  const list = await fetchInsumos();
  localStorage.setItem(STORAGE_KEYS.INSUMOS, JSON.stringify(list.filter(x => x.id !== id)));
}

export async function fetchFichasTecnicas(): Promise<FichaTecnica[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('fichas_tecnicas')
        .select('*');
      if (!error && data) return data as FichaTecnica[];
    } catch (e) {
      console.warn('Falha ao buscar fichas no Supabase, usando local:', e);
    }
  }
  const v = localStorage.getItem(STORAGE_KEYS.FICHAS_TECNICAS);
  return v ? JSON.parse(v) : [];
}

export async function saveFichaTecnica(f: FichaTecnica): Promise<FichaTecnica> {
  const id = f.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'ficha-' + Date.now());
  const newF: FichaTecnica = { ...f, id };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('fichas_tecnicas').upsert(newF);
    } catch (e) {
      console.warn('Falha ao salvar ficha no Supabase:', e);
    }
  }

  const list = await fetchFichasTecnicas();
  const exists = list.some(x => x.id === newF.id);
  const updated = exists ? list.map(x => x.id === newF.id ? newF : x) : [...list, newF];
  localStorage.setItem(STORAGE_KEYS.FICHAS_TECNICAS, JSON.stringify(updated));
  return newF;
}

export async function deleteFichaTecnica(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('fichas_tecnicas').delete().eq('id', id);
    } catch (e) {
      console.warn('Falha ao excluir ficha no Supabase:', e);
    }
  }
  const list = await fetchFichasTecnicas();
  localStorage.setItem(STORAGE_KEYS.FICHAS_TECNICAS, JSON.stringify(list.filter(x => x.id !== id)));
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

export async function fetchCustosFixos(): Promise<import('../types').CustosFixosConfig> {
  return getLocal<import('../types').CustosFixosConfig>(STORAGE_KEYS.CUSTOS_FIXOS, { tipo: 'percentual', valor: 0 });
}

export async function saveCustosFixos(config: import('../types').CustosFixosConfig): Promise<void> {
  setLocal(STORAGE_KEYS.CUSTOS_FIXOS, config);
}

// --- MÓDULO FISCAL (NF-e / NFC-e) ---

export { INITIAL_CONFIG_FISCAL };

export async function fetchConfigFiscal(): Promise<ConfiguracaoFiscal> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('configuracao_fiscal')
        .select('*')
        .eq('id', 1)
        .single();
      if (!error && data) return data as ConfiguracaoFiscal;
    } catch (e) {
      console.warn('Falha ao buscar config fiscal no Supabase, usando local:', e);
    }
  }
  return getLocal<ConfiguracaoFiscal>(STORAGE_KEYS.CONFIG_FISCAL, INITIAL_CONFIG_FISCAL);
}

export async function saveConfigFiscal(config: Partial<ConfiguracaoFiscal>): Promise<ConfiguracaoFiscal> {
  const current = await fetchConfigFiscal();
  const updated: ConfiguracaoFiscal = {
    ...current,
    ...config,
    atualizado_em: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('configuracao_fiscal')
        .upsert({ id: 1, ...updated, atualizado_em: new Date().toISOString() });
    } catch (e) {
      console.warn('Falha ao salvar config fiscal no Supabase:', e);
    }
  }

  setLocal(STORAGE_KEYS.CONFIG_FISCAL, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('config_fiscal_atualizada'));
  }
  return updated;
}

export async function fetchNotasFiscais(): Promise<NotaFiscal[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select('*')
        .order('data_emissao', { ascending: false });
      if (!error && data && data.length > 0) return data as NotaFiscal[];
    } catch (e) {
      console.warn('Falha ao buscar notas fiscais no Supabase, usando local:', e);
    }
  }
  return getLocal<NotaFiscal[]>(STORAGE_KEYS.NOTAS_FISCAIS, []);
}

export async function saveNotaFiscal(nota: NotaFiscal): Promise<NotaFiscal> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('notas_fiscais')
        .upsert(nota);
    } catch (e) {
      console.warn('Falha ao salvar nota fiscal no Supabase:', e);
    }
  }

  const notas = getLocal<NotaFiscal[]>(STORAGE_KEYS.NOTAS_FISCAIS, []);
  const exists = notas.some(n => n.id === nota.id);
  const updated = exists ? notas.map(n => n.id === nota.id ? nota : n) : [nota, ...notas];
  setLocal(STORAGE_KEYS.NOTAS_FISCAIS, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('notas_fiscais_atualizadas'));
  }
  return nota;
}

export async function updateCompraComFiscal(compraId: string, dadosFiscal: {
  nota_fiscal_id: string;
  nota_fiscal_chave: string;
  nota_fiscal_numero: number;
  danfe_url?: string;
  cpf_na_nota?: string;
}): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('compras')
        .update(dadosFiscal)
        .eq('id', compraId);
    } catch (e) {
      console.warn('Falha ao atualizar compra com dados fiscais no Supabase:', e);
    }
  }

  const compras = getLocal<Compra[]>(STORAGE_KEYS.COMPRAS, []);
  const updated = compras.map(c => c.id === compraId ? { ...c, ...dadosFiscal } : c);
  setLocal(STORAGE_KEYS.COMPRAS, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('compras_atualizadas'));
  }
}

