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
  NotaFiscal,
  ReceitaMetadata,
  PedidoOnline,
  PedidoOnlineDetalhes,
  Colaborador
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
  INITIAL_CONFIG_FISCAL,
  obterUnidadeVendaPadrao
} from './seedData';
import { cleanPhone } from './whatsapp';

export const STORAGE_KEYS = {
  CLIENTES: 'panificadora_clientes',
  COMPRAS: 'panificadora_compras',
  CONFIG: 'panificadora_config',
  CATEGORIAS: 'panificadora_categorias',
  PRODUTOS: 'panificadora_produtos',
  UNIDADES_VENDA: 'panificadora_unidades_venda',
  FORNECEDORES: 'panificadora_fornecedores',
  INSUMOS: 'panificadora_insumos',
  FICHAS_TECNICAS: 'panificadora_fichas_tecnicas',
  RECEITAS_METADATA: 'panificadora_receitas_metadados',
  HISTORICO_COMPRAS: 'panificadora_historico_compras',
  CUSTOS_FIXOS: 'panificadora_custos_fixos',
  PEDIDOS_COZINHA: 'panificadora_pedidos_cozinha',
  PEDIDOS_ONLINE: 'panificadora_pedidos_online',
  MESAS_ABERTAS: 'panificadora_mesas_abertas',
  CONFIG_FISCAL: 'panificadora_config_fiscal',
  NOTAS_FISCAIS: 'panificadora_notas_fiscais',
  COLABORADORES: 'panificadora_colaboradores',
  GARCOM_SESSAO: 'panificadora_garcom_sessao',
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

function extrairFormaPagamentoDetalhes(detalhes?: string | null): string | undefined {
  if (!detalhes) return undefined;
  const match = detalhes.match(/\[(PIX|DINHEIRO|CARTAO_CREDITO|CARTAO_DEBITO|OUTROS)\]/i);
  if (match) return match[1].toLowerCase();
  return undefined;
}

export async function fetchCompras(): Promise<Compra[]> {
  const localCompras = getLocal<Compra[]>(STORAGE_KEYS.COMPRAS, INITIAL_COMPRAS);
  let remoteCompras: Compra[] = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const [comprasRes, notasRes, clientesRes] = await Promise.all([
        supabase
          .from('compras')
          .select('*')
          .order('criado_em', { ascending: false })
          .limit(2000),
        supabase
          .from('notas_fiscais')
          .select('id,compra_id,valor_total,cliente_nome,cliente_whatsapp,cliente_telefone,forma_pagamento,status,data_emissao,criado_em,itens')
          .order('criado_em', { ascending: false })
          .limit(2000),
        supabase
          .from('clientes')
          .select('id,nome,whatsapp')
      ]);

      if (!comprasRes.error && Array.isArray(comprasRes.data)) {
        remoteCompras = (comprasRes.data as Compra[]).map(c => ({
          ...c,
          valor: Number(c.valor) || 0,
          forma_pagamento: c.forma_pagamento || extrairFormaPagamentoDetalhes(c.detalhes)
        }));
      }

      // Recuperar vendas históricas registradas em notas_fiscais que não entraram em compras
      // (devido à antiga incompatibilidade da coluna custo_total no schema de compras)
      if (!notasRes.error && Array.isArray(notasRes.data) && notasRes.data.length > 0) {
        const clientesBase = (!clientesRes.error && Array.isArray(clientesRes.data))
          ? clientesRes.data as Array<{ id: string; nome?: string; whatsapp?: string }>
          : getLocal<Cliente[]>(STORAGE_KEYS.CLIENTES, INITIAL_CLIENTES);

        const clienteBalcao = clientesBase.find(c =>
          cleanPhone(c.whatsapp || '') === '0' ||
          (c.nome || '').toLowerCase().includes('balcão') ||
          (c.nome || '').toLowerCase().includes('anônimo')
        );
        const fallbackClienteId = clienteBalcao?.id || 'balcao-anonimo';

        const existingIds = new Set(remoteCompras.map(c => c.id));
        const existingNotaIds = new Set(remoteCompras.map(c => c.nota_fiscal_id).filter(Boolean));

        for (const nota of notasRes.data as any[]) {
          if (nota.status === 'cancelada') continue;
          const compId = nota.compra_id || nota.id;
          if (existingIds.has(compId) || existingNotaIds.has(nota.id)) continue;

          const telNota = cleanPhone(nota.cliente_whatsapp || nota.cliente_telefone || '');
          const nomeNota = (nota.cliente_nome || '').trim().toLowerCase();

          let matchedCli = telNota.length >= 8
            ? clientesBase.find(c => cleanPhone(c.whatsapp || '') === telNota)
            : undefined;

          if (!matchedCli && nomeNota && !nomeNota.startsWith('comanda') && !nomeNota.startsWith('mesa') && !nomeNota.includes('consumidor')) {
            matchedCli = clientesBase.find(c => (c.nome || '').trim().toLowerCase() === nomeNota);
          }

          const itensArr = Array.isArray(nota.itens) ? nota.itens : [];
          const detalhesItens = itensArr
            .map((it: any) => `${Number(it.quantidade) || 1}x ${it.nome || 'Produto'}`)
            .join(', ');
          const dataIso = (nota.criado_em || nota.data_emissao || new Date().toISOString());
          const dataCompra = String(dataIso).slice(0, 10);

          remoteCompras.push({
            id: compId,
            cliente_id: matchedCli?.id || fallbackClienteId,
            valor: Number(nota.valor_total) || 0,
            custo_total: 0,
            data_compra: dataCompra,
            criado_em: dataIso,
            detalhes: detalhesItens || (nota.cliente_nome ? `Venda ${nota.cliente_nome}` : 'Venda Balcão'),
            pontuou_fidelidade: true,
            forma_pagamento: nota.forma_pagamento || undefined,
            nota_fiscal_id: nota.id
          });
          existingIds.add(compId);
        }
      }

      // Mesclar compras locais que ainda não estejam na lista remota (sem duplicar)
      const byId = new Map<string, Compra>();
      for (const c of remoteCompras) {
        byId.set(c.id, c);
      }
      for (const lc of localCompras) {
        if (!byId.has(lc.id)) {
          byId.set(lc.id, {
            ...lc,
            valor: Number(lc.valor) || 0,
            forma_pagamento: lc.forma_pagamento || extrairFormaPagamentoDetalhes(lc.detalhes)
          });
        }
      }

      const merged = Array.from(byId.values()).sort(
        (a, b) => new Date(b.criado_em || b.data_compra).getTime() - new Date(a.criado_em || a.data_compra).getTime()
      );

      if (merged.length > 0) {
        setLocal(STORAGE_KEYS.COMPRAS, merged);
      }
      return merged;
    } catch (e) {
      console.warn('Falha ao buscar compras no Supabase, usando local:', e);
    }
  }
  return localCompras;
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
      // Reaproveitar cliente existente com o mesmo WhatsApp (evita duplicatas de balcão '0' ou telefone já cadastrado)
      if (cleanNumber === '0' || cleanNumber.length >= 8) {
        const { data: existing } = await supabase
          .from('clientes')
          .select('*')
          .eq('whatsapp', cleanNumber)
          .limit(1);
        if (existing && existing.length > 0) {
          const found = existing[0] as Cliente;
          const clientesLocais = getLocal<Cliente[]>(STORAGE_KEYS.CLIENTES, INITIAL_CLIENTES);
          if (!clientesLocais.some(c => c.id === found.id)) {
            setLocal(STORAGE_KEYS.CLIENTES, [...clientesLocais, found]);
          }
          return found;
        }
      }

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
      if (!error && data) {
        const created = data as Cliente;
        const clientesLocais = getLocal<Cliente[]>(STORAGE_KEYS.CLIENTES, INITIAL_CLIENTES);
        if (!clientesLocais.some(c => c.id === created.id)) {
          setLocal(STORAGE_KEYS.CLIENTES, [...clientesLocais, created]);
        }
        return created;
      }

      // Em caso de conflito (ex: unique constraint em whatsapp), recuperar o registro existente
      if (error && cleanNumber) {
        const { data: existingAfterErr } = await supabase
          .from('clientes')
          .select('*')
          .eq('whatsapp', cleanNumber)
          .limit(1);
        if (existingAfterErr && existingAfterErr.length > 0) {
          return existingAfterErr[0] as Cliente;
        }
      }
    } catch (e) {
      console.warn('Falha ao inserir cliente no Supabase, salvando local:', e);
    }
  }

  const clientes = getLocal<Cliente[]>(STORAGE_KEYS.CLIENTES, INITIAL_CLIENTES);
  const existingLocal = (cleanNumber === '0' || cleanNumber.length >= 8)
    ? clientes.find(c => cleanPhone(c.whatsapp || '') === cleanNumber)
    : undefined;
  if (existingLocal) return existingLocal;

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
    const fichasDb = getLocal<FichaTecnica[]>(STORAGE_KEYS.FICHAS_TECNICAS, []);
    const insumosDb = getLocal<Insumo[]>(STORAGE_KEYS.INSUMOS, []);
    let insumosUpdated = false;
    let newInsumos = [...insumosDb];

    custo_total = carrinho.reduce((acc, item) => {
      let unitCusto = (item.produto && item.produto.custo !== undefined && item.produto.custo > 0)
        ? item.produto.custo
        : calcularCustoUnitarioProduto(item.produto.id, fichasDb, insumosDb, item.produto);

      // Baixa automática proporcional de insumos consumidos pela receita da venda
      const fichasProd = fichasDb.filter(f => f.produto_id === item.produto.id);
      if (fichasProd.length > 0) {
        const rend = fichasProd[0]?.rendimento_unidades && fichasProd[0].rendimento_unidades > 0 ? fichasProd[0].rendimento_unidades : 1;
        fichasProd.forEach(f => {
          if (f.insumo_id && f.quantidade_utilizada > 0) {
            const ins = newInsumos.find(i => i.id === f.insumo_id);
            const qtdBase = converterParaUnidadeBase(f.quantidade_utilizada, f.unidade_medida, ins?.unidade_medida);
            const consumoUnidade = qtdBase / rend;
            const consumoTotalVenda = consumoUnidade * item.quantidade;
            const idxIns = newInsumos.findIndex(i => i.id === f.insumo_id);
            if (idxIns >= 0) {
              insumosUpdated = true;
              const insItem = newInsumos[idxIns];
              const novoEstoque = Math.max(0, (insItem.quantidade_estoque || 0) - consumoTotalVenda);
              newInsumos[idxIns] = { ...insItem, quantidade_estoque: Number(novoEstoque.toFixed(4)) };
            }
          }
        });
      }

      return acc + (unitCusto * item.quantidade);
    }, 0);

    if (insumosUpdated) {
      setLocal(STORAGE_KEYS.INSUMOS, newInsumos);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('insumos_atualizados'));
      }
    }

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

  // Sincronizar compra e histórico no Supabase (schema real de compras: id, cliente_id, valor, data_compra, criado_em, detalhes, pontuou_fidelidade)
  if (isSupabaseConfigured && supabase) {
    try {
      const pgtoLabel = forma_pagamento ? `[${forma_pagamento.toUpperCase()}]` : '';
      const detalhesSync = pgtoLabel && !(newCompra.detalhes || '').includes(pgtoLabel)
        ? `${newCompra.detalhes ? `${newCompra.detalhes} ` : ''}${pgtoLabel}`
        : (newCompra.detalhes || null);

      let targetClienteId = newCompra.cliente_id;
      const payloadCompra = {
        id: newCompra.id,
        cliente_id: targetClienteId,
        valor: newCompra.valor,
        data_compra: newCompra.data_compra,
        criado_em: newCompra.criado_em,
        detalhes: detalhesSync,
        pontuou_fidelidade: newCompra.pontuou_fidelidade
      };

      const { error: compErr } = await supabase.from('compras').insert([payloadCompra]);
      if (compErr) {
        console.warn('Erro ao inserir compra no Supabase, tentando fallback de cliente:', compErr.message);
        // Se falhou por chave estrangeira em cliente_id, vincular ao cliente padrão de balcão no Supabase
        const { data: cliBalcao } = await supabase
          .from('clientes')
          .select('id')
          .eq('whatsapp', '0')
          .limit(1);
        const fallbackId = cliBalcao && cliBalcao.length > 0 ? cliBalcao[0].id : null;
        if (fallbackId && fallbackId !== targetClienteId) {
          targetClienteId = fallbackId;
          newCompra.cliente_id = fallbackId;
          const { error: retryErr } = await supabase.from('compras').insert([{
            ...payloadCompra,
            cliente_id: fallbackId
          }]);
          if (retryErr) {
            console.warn('Falha definitiva ao inserir compra no Supabase:', retryErr.message);
          }
        }
      }

      if (isUuid(targetClienteId)) {
        await supabase
          .from('clientes')
          .update({ total_compras_historico: novoTotalCli })
          .eq('id', targetClienteId);
      }
    } catch (e) {
      console.warn('Erro ao salvar compra/histórico no Supabase:', e);
    }
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
  let localCats = getLocal<Categoria[]>(STORAGE_KEYS.CATEGORIAS, INITIAL_CATEGORIAS);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('ordem');

      if (!error && data && data.length > 0) {
        setLocal(STORAGE_KEYS.CATEGORIAS, data);
        return data as Categoria[];
      }
    } catch (e) {
      console.warn('Falha ao buscar categorias no Supabase:', e);
    }
  }

  if (!localCats || localCats.length === 0) {
    localCats = INITIAL_CATEGORIAS;
    setLocal(STORAGE_KEYS.CATEGORIAS, localCats);
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

// ============================================================================
// CÁLCULO DE CUSTO REAL DE PRODUÇÃO E CONVERSÕES DE UNIDADES (CMV / FICHAS)
// ============================================================================

export function converterParaUnidadeBase(
  quantidade: number,
  unidadeOrigem?: 'g' | 'kg' | 'ml' | 'l' | 'un',
  unidadeBaseInsumo: 'g' | 'kg' | 'ml' | 'l' | 'un' = 'kg'
): number {
  const qtd = Number(quantidade) || 0;
  if (qtd <= 0) return 0;

  // Se a unidade de origem não foi definida explicitamente:
  if (!unidadeOrigem || unidadeOrigem === unidadeBaseInsumo) {
    // Heurística de proteção caso a receita tenha sido informada em gramas (ex: 500) para insumo em kg
    if (unidadeBaseInsumo === 'kg' && qtd >= 20) {
      return qtd / 1000;
    }
    if (unidadeBaseInsumo === 'l' && qtd >= 50) {
      return qtd / 1000;
    }
    return qtd;
  }

  // Conversões de Massa (Peso)
  if (unidadeBaseInsumo === 'kg' && unidadeOrigem === 'g') return qtd / 1000;
  if (unidadeBaseInsumo === 'g' && unidadeOrigem === 'kg') return qtd * 1000;

  // Conversões de Volume (Líquido)
  if (unidadeBaseInsumo === 'l' && unidadeOrigem === 'ml') return qtd / 1000;
  if (unidadeBaseInsumo === 'ml' && unidadeOrigem === 'l') return qtd * 1000;

  return qtd;
}

export function calcularCustoUnitarioProduto(
  produtoId: string,
  fichas: FichaTecnica[],
  insumos: Insumo[],
  produtoBase?: Produto | null,
  visitedProducts: Set<string> = new Set()
): number {
  if (visitedProducts.has(produtoId)) {
    return 0; // Evita loop infinito em caso de referência circular
  }
  const currentVisited = new Set(visitedProducts);
  currentVisited.add(produtoId);

  const fichasProd = fichas.filter(f => f.produto_id === produtoId);
  if (fichasProd.length === 0) {
    return Number(produtoBase?.custo) || 0;
  }

  const rendimento = (fichasProd[0]?.rendimento_unidades && fichasProd[0].rendimento_unidades > 0)
    ? Number(fichasProd[0].rendimento_unidades)
    : 1;

  let custoBateladaTotal = 0;
  let possuiInsumoOuCustoValido = false;

  fichasProd.forEach(f => {
    if (f.insumo_id) {
      if (f.insumo_id.startsWith('receita:')) {
        // Sub-receita existente utilizada como ingrediente (ex: Massa de Salgado, Recheio, etc.)
        const subProdId = f.insumo_id.replace('receita:', '');
        const localProds = getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []);
        const subProd = localProds.find(p => p.id === subProdId);
        const subCusto = calcularCustoUnitarioProduto(subProdId, fichas, insumos, subProd, currentVisited);

        const subFicha = fichas.find(sf => sf.produto_id === subProdId);
        const subUnidadeBase = (subFicha?.unidade_medida || 'un') as 'g' | 'kg' | 'ml' | 'l' | 'un';

        const qtdBase = converterParaUnidadeBase(
          f.quantidade_utilizada,
          f.unidade_medida,
          subUnidadeBase
        );
        custoBateladaTotal += (Number(subCusto) || 0) * qtdBase;
        possuiInsumoOuCustoValido = true;
      } else {
        const ins = insumos.find(i => i.id === f.insumo_id);
        if (ins) {
          const qtdBase = converterParaUnidadeBase(
            f.quantidade_utilizada,
            f.unidade_medida,
            ins.unidade_medida
          );
          custoBateladaTotal += (Number(ins.preco_custo) || 0) * qtdBase;
          possuiInsumoOuCustoValido = true;
        }
      }
    }
    if (f.custo_direto && f.custo_direto > 0) {
      custoBateladaTotal += Number(f.custo_direto) * rendimento;
      possuiInsumoOuCustoValido = true;
    }
  });

  if (!possuiInsumoOuCustoValido && produtoBase?.custo !== undefined && produtoBase.custo > 0) {
    return produtoBase.custo;
  }

  const custoUnitario = rendimento > 0 ? (custoBateladaTotal / rendimento) : 0;
  return Number(custoUnitario.toFixed(2));
}

export function recalcularTodosCustosProdutos(): Produto[] {
  let localProds = getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []);
  const fichas = getLocal<FichaTecnica[]>(STORAGE_KEYS.FICHAS_TECNICAS, []);
  const insumos = getLocal<Insumo[]>(STORAGE_KEYS.INSUMOS, []);

  let houveAlteracao = false;
  // Executa 2 passadas para garantir que sub-receitas propaguem seus custos para as receitas pai
  for (let pass = 0; pass < 2; pass++) {
    localProds = localProds.map(p => {
      const temFicha = fichas.some(f => f.produto_id === p.id);
      if (!temFicha) return p;

      const custoCalculado = calcularCustoUnitarioProduto(p.id, fichas, insumos, p);
      if (p.custo !== custoCalculado) {
        houveAlteracao = true;
        return { ...p, custo: custoCalculado };
      }
      return p;
    });
  }

  if (houveAlteracao) {
    setLocal(STORAGE_KEYS.PRODUTOS, localProds);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('produtos_atualizados'));
      window.dispatchEvent(new CustomEvent('catalogo_atualizado'));
    }
  }

  return localProds;
}

export async function fetchProdutos(): Promise<Produto[]> {
  let localProds = getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, INITIAL_PRODUTOS);
  const unidadesMap = getLocal<Record<string, string>>(STORAGE_KEYS.UNIDADES_VENDA, {});
  const fichas = getLocal<FichaTecnica[]>(STORAGE_KEYS.FICHAS_TECNICAS, []);
  const insumos = getLocal<Insumo[]>(STORAGE_KEYS.INSUMOS, []);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome');

      if (!error && data && data.length > 0) {
        localProds = data.map((prod: any) => {
          const localItem = localProds.find(lp => lp.id === prod.id || lp.nome.trim().toLowerCase() === prod.nome.trim().toLowerCase());
          const unidadeResolvida = prod.unidade_venda 
            || localItem?.unidade_venda 
            || unidadesMap[prod.id]
            || unidadesMap[prod.nome.trim().toLowerCase()]
            || obterUnidadeVendaPadrao(prod.nome) 
            || 'unidade';

          return {
            ...localItem,
            ...prod,
            unidade_venda: unidadeResolvida,
            custo: prod.custo !== undefined && prod.custo !== null ? Number(prod.custo) : (localItem?.custo || 0)
          };
        });
      }
    } catch (e) {
      console.warn('Falha ao buscar produtos no Supabase:', e);
    }
  }

  // Garantir que a matemática real das fichas técnicas e unidade de venda estejam completas
  const produtosCompletos = localProds.map(p => {
    const temFicha = fichas.some(f => f.produto_id === p.id);
    const custoReal = temFicha ? calcularCustoUnitarioProduto(p.id, fichas, insumos, p) : (p.custo || 0);
    const unidadeResolvida = p.unidade_venda 
      || unidadesMap[p.id]
      || unidadesMap[p.nome.trim().toLowerCase()]
      || obterUnidadeVendaPadrao(p.nome) 
      || 'unidade';

    return { 
      ...p, 
      custo: custoReal, 
      unidade_venda: unidadeResolvida 
    };
  });

  setLocal(STORAGE_KEYS.PRODUTOS, produtosCompletos);
  return produtosCompletos;
}

export async function saveProduto(produto: Omit<Produto, 'id'> & { id?: string }): Promise<Produto> {
  const prodId = (produto.id && isUuid(produto.id)) ? produto.id : generateUuid();
  const catId = (produto.categoria_id && isUuid(produto.categoria_id)) ? produto.categoria_id : null;

  const fichas = getLocal<FichaTecnica[]>(STORAGE_KEYS.FICHAS_TECNICAS, []);
  const insumos = getLocal<Insumo[]>(STORAGE_KEYS.INSUMOS, []);
  const temFicha = fichas.some(f => f.produto_id === prodId);
  const custoCalculado = temFicha 
    ? calcularCustoUnitarioProduto(prodId, fichas, insumos, produto as any)
    : (produto.custo !== undefined ? Number(produto.custo) : 0);

  const unidadeDefinida = produto.unidade_venda || obterUnidadeVendaPadrao(produto.nome) || 'unidade';

  const newProduto: Produto = {
    ...produto,
    ativo: produto.ativo !== false,
    id: prodId,
    categoria_id: catId || produto.categoria_id,
    custo: custoCalculado,
    unidade_venda: unidadeDefinida
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

      // Se informou custo no produto e NÃO possui receita cadastrada, salvar custo direto em fichas_tecnicas
      if (!temFicha && newProduto.custo !== undefined && Number(newProduto.custo) > 0) {
        await supabase.from('fichas_tecnicas').upsert({
          id: 'ficha-' + prodId,
          produto_id: prodId,
          nome: 'Custo Direto - ' + newProduto.nome,
          rendimento_unidades: 1,
          custo_mao_obra: Number(newProduto.custo),
          insumos: []
        });
      }
    } catch (e) {
      console.warn('Falha ao salvar produto no Supabase:', e);
    }
  }

  // 2. Persistir unidade de venda no mapa local para garantir integridade
  const unidadesMap = getLocal<Record<string, string>>(STORAGE_KEYS.UNIDADES_VENDA, {});
  unidadesMap[newProduto.id] = unidadeDefinida;
  unidadesMap[newProduto.nome.trim().toLowerCase()] = unidadeDefinida;
  setLocal(STORAGE_KEYS.UNIDADES_VENDA, unidadesMap);

  // 3. Salvar imediatamente no localStorage
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
const mesasRecemLiberadas = new Map<number, number>();
const syncMesasInFlight = new Set<number>();
const LIBERACAO_GUARD_MS = 15000;

function limparGuardMesasLiberadas(): void {
  const agora = Date.now();
  for (const [num, ts] of mesasRecemLiberadas.entries()) {
    if (agora - ts > LIBERACAO_GUARD_MS) {
      mesasRecemLiberadas.delete(num);
    }
  }
}

function deduplicarItensPorTempId<T extends { id_temp?: string }>(itens: T[]): T[] {
  const vistos = new Set<string>();
  const resultado: T[] = [];
  for (const item of itens) {
    if (!item) continue;
    const key = item.id_temp ? String(item.id_temp) : '';
    if (key) {
      if (vistos.has(key)) continue;
      vistos.add(key);
    }
    resultado.push(item);
  }
  return resultado;
}

function converterParaItemCarrinho(it: any, idx: number): ItemCarrinho {
  if (it?.produto && typeof it.produto === 'object' && it.produto.nome) {
    const qtd = Number(it.quantidade) || 1;
    const preco = Number(it.produto.preco) || (Number(it.subtotal) / qtd) || 0;
    const subtotal = it.subtotal !== undefined && it.subtotal !== null ? Number(it.subtotal) : Number((qtd * preco).toFixed(2));
    return {
      id_temp: it.id_temp || `item-${idx}-${it.produto.id || it.produto.nome}`,
      produto: {
        ...it.produto,
        id: it.produto.id || `prod-${idx}`,
        categoria_id: it.produto.categoria_id || '',
        nome: it.produto.nome,
        preco,
        ativo: true,
        unidade_venda: it.produto.unidade_venda || it.unidade_venda
      },
      quantidade: qtd,
      subtotal: Number(subtotal.toFixed(2)),
      observacao: it.observacao,
      peso_gramas: it.peso_gramas,
      medida_label: it.medida_label
    };
  }

  const nome = it?.nome || 'Produto';
  const qtd = Number(it?.quantidade) || 1;
  const preco = Number(it?.preco_unitario) || Number(it?.preco) || (Number(it?.subtotal) / qtd) || 0;
  const subtotal = it?.subtotal !== undefined && it?.subtotal !== null ? Number(it.subtotal) : Number((qtd * preco).toFixed(2));
  return {
    id_temp: it?.id_temp || `item-${idx}-${it?.produto_id || nome}`,
    produto: {
      id: it?.produto_id || `prod-${idx}`,
      categoria_id: '',
      nome,
      preco,
      ativo: true,
      unidade_venda: it?.unidade_venda
    },
    quantidade: qtd,
    subtotal: Number(subtotal.toFixed(2)),
    observacao: it?.observacao,
    peso_gramas: it?.peso_gramas,
    medida_label: it?.medida_label
  };
}

function converterParaItemMeta(it: any, idx: number, mesa?: any): any {
  const garcomId = it?.garcom_id || mesa?.garcom_id;
  const garcomNome = it?.garcom_nome || mesa?.garcom_nome;
  if (it?.produto && typeof it.produto === 'object') {
    const qtd = Number(it.quantidade) || 1;
    const preco = Number(it.produto.preco) || (Number(it.subtotal) / qtd) || 0;
    const subtotal = it.subtotal !== undefined && it.subtotal !== null ? Number(it.subtotal) : Number((qtd * preco).toFixed(2));
    return {
      id_temp: it.id_temp || `item-${idx}-${it.produto.id || it.produto.nome}`,
      produto: it.produto,
      produto_id: it.produto.id,
      nome: it.produto.nome,
      preco_unitario: preco,
      quantidade: qtd,
      subtotal: Number(subtotal.toFixed(2)),
      observacao: it.observacao,
      unidade_venda: it.produto.unidade_venda || it.unidade_venda,
      peso_gramas: it.peso_gramas,
      medida_label: it.medida_label,
      garcom_id: garcomId,
      garcom_nome: garcomNome
    };
  }
  return {
    ...it,
    garcom_id: garcomId,
    garcom_nome: garcomNome
  };
}

function isNomeGenericoMesa(nome?: string): boolean {
  if (!nome) return true;
  const n = nome.trim().toLowerCase();
  return !n || /^mesa\s*\d+$/.test(n) || /^comanda\s*\d+$/.test(n) || n === 'consumidor' || n === 'cliente';
}

function consolidarMesasPorNumero(mesasBrutas: MesaAberta[]): {
  consolidadas: MesaAberta[];
  gruposComDuplicatas: Array<{ principal: MesaAberta; duplicataIds: string[] }>;
} {
  const porNumero = new Map<number, MesaAberta[]>();
  for (const m of mesasBrutas) {
    if (!m) continue;
    const num = typeof m.mesa_numero === 'number' ? m.mesa_numero : parseInt(String(m.mesa_numero), 10);
    if (isNaN(num) || num <= 0) continue;
    const lista = porNumero.get(num) || [];
    lista.push({ ...m, mesa_numero: num });
    porNumero.set(num, lista);
  }

  const consolidadas: MesaAberta[] = [];
  const gruposComDuplicatas: Array<{ principal: MesaAberta; duplicataIds: string[] }> = [];

  for (const [num, grupo] of porNumero.entries()) {
    // Ordenar para escolher registro principal determinístico (mais antigo primeiro ou UUID válido)
    const ordenado = [...grupo].sort((a, b) => {
      const tA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
      const tB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
      return tA - tB;
    });

    const base = ordenado[0];
    const todosCarrinhoRaw: ItemCarrinho[] = [];
    const todosPedidosIds = new Set<string>();
    let melhorNome = base.cliente_nome || `Mesa ${num}`;
    let melhorTelefone = base.cliente_telefone || '';
    let melhorGarcomId = base.garcom_id;
    let melhorGarcomNome = base.garcom_nome;
    let primeiroCriadoEm = base.criado_em || base.aberto_em || new Date().toISOString();

    for (const m of ordenado) {
      const listaFonte = (Array.isArray(m.carrinho) && m.carrinho.length > 0)
        ? m.carrinho
        : (Array.isArray(m.itens) ? m.itens : []);

      listaFonte.forEach((it: any, idx: number) => {
        todosCarrinhoRaw.push(converterParaItemCarrinho(it, idx));
      });

      if (Array.isArray(m.pedidos_ids)) {
        m.pedidos_ids.forEach(pid => { if (pid) todosPedidosIds.add(pid); });
      }
      if (isNomeGenericoMesa(melhorNome) && !isNomeGenericoMesa(m.cliente_nome)) {
        melhorNome = m.cliente_nome!;
      }
      if (!melhorTelefone && m.cliente_telefone) {
        melhorTelefone = m.cliente_telefone;
      }
      const itemGarcom = (m.itens || []).find((i: any) => i?.garcom_nome);
      if (!melhorGarcomNome && (m.garcom_nome || itemGarcom?.garcom_nome)) {
        melhorGarcomNome = m.garcom_nome || itemGarcom?.garcom_nome;
        melhorGarcomId = m.garcom_id || itemGarcom?.garcom_id;
      }
      if (m.criado_em && new Date(m.criado_em).getTime() < new Date(primeiroCriadoEm).getTime()) {
        primeiroCriadoEm = m.criado_em;
      }
    }

    const carrinhoLimpo = deduplicarItensPorTempId(todosCarrinhoRaw);
    const totalCalculado = carrinhoLimpo.length > 0
      ? Number(carrinhoLimpo.reduce((acc, i) => acc + (Number(i.subtotal) || 0), 0).toFixed(2))
      : Number(base.total || 0);

    const mesaConsolidada: MesaAberta = {
      ...base,
      mesa_id: base.mesa_id || `mesa-${num}`,
      mesa_numero: num,
      cliente_nome: melhorNome,
      cliente_telefone: melhorTelefone,
      garcom_id: melhorGarcomId,
      garcom_nome: melhorGarcomNome,
      carrinho: carrinhoLimpo,
      itens: carrinhoLimpo.map((c, idx) => converterParaItemMeta(c, idx, { garcom_id: melhorGarcomId, garcom_nome: melhorGarcomNome })),
      pedidos_ids: Array.from(todosPedidosIds),
      total: totalCalculado,
      status: 'ocupada',
      criado_em: primeiroCriadoEm,
      aberto_em: base.aberto_em || primeiroCriadoEm
    };

    consolidadas.push(mesaConsolidada);

    if (ordenado.length > 1) {
      const duplicataIds = ordenado.slice(1).map(m => m.id).filter(id => isUuid(id));
      gruposComDuplicatas.push({ principal: mesaConsolidada, duplicataIds });
    }
  }

  return { consolidadas, gruposComDuplicatas };
}

export async function fetchMesasAbertas(options?: { skipKitchenSync?: boolean }): Promise<MesaAberta[]> {
  limparGuardMesasLiberadas();

  let mesasBrutas: MesaAberta[] = [];
  let supabaseSuccess = false;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('mesas_abertas').select('*');
      if (!error && data) {
        supabaseSuccess = true;
        mesasBrutas = data as MesaAberta[];
      }
    } catch (e) {
      console.warn('Falha ao buscar mesas abertas no Supabase:', e);
    }
  }

  if (!supabaseSuccess) {
    mesasBrutas = getLocal<MesaAberta[]>(STORAGE_KEYS.MESAS_ABERTAS, []);
  }

  // Filtrar mesas recém-liberadas para evitar ressurreição durante propagação
  mesasBrutas = mesasBrutas.filter(m => !mesasRecemLiberadas.has(Number(m.mesa_numero)));

  // Consolidar linhas duplicadas da mesma comanda (ex: múltiplas linhas para mesa_numero 80)
  const { consolidadas: mesas, gruposComDuplicatas } = consolidarMesasPorNumero(mesasBrutas);

  if (supabaseSuccess && supabase && gruposComDuplicatas.length > 0) {
    for (const grupo of gruposComDuplicatas) {
      const num = grupo.principal.mesa_numero;
      if (syncMesasInFlight.has(num)) continue;
      syncMesasInFlight.add(num);
      (async () => {
        try {
          if (isUuid(grupo.principal.id)) {
            await supabase.from('mesas_abertas').upsert({
              id: grupo.principal.id,
              mesa_id: grupo.principal.mesa_id,
              mesa_numero: grupo.principal.mesa_numero,
              cliente_nome: grupo.principal.cliente_nome,
              cliente_telefone: grupo.principal.cliente_telefone,
              carrinho: grupo.principal.carrinho,
              itens: grupo.principal.itens,
              total: grupo.principal.total,
              status: 'ocupada'
            });
          }
          if (grupo.duplicataIds.length > 0) {
            await supabase.from('mesas_abertas').delete().in('id', grupo.duplicataIds);
          }
        } catch (errDup) {
          console.warn('Erro ao limpar duplicatas de mesa no Supabase:', errDup);
        } finally {
          syncMesasInFlight.delete(num);
        }
      })();
    }
  }

  // Sincronização inteligente com pedidos ativos da cozinha (KDS):
  // Apenas recria mesa se NÃO houver registro em mesas_abertas para aquele mesa_numero e não estiver em liberação recente.
  if (!options?.skipKitchenSync) {
    try {
      const pedidos = await fetchPedidosCozinha();
      const pedidosAtivos = pedidos.filter(
        p =>
          (p.status === 'pendente' || p.status === 'preparando' || p.status === 'pronto') &&
          !mesasRecemLiberadas.has(Number(p.mesa_numero))
      );

      const ativosPorMesa = new Map<number, PedidoCozinha[]>();
      for (const ped of pedidosAtivos) {
        const list = ativosPorMesa.get(ped.mesa_numero) || [];
        list.push(ped);
        ativosPorMesa.set(ped.mesa_numero, list);
      }

      for (const [numMesa, pedsMesa] of ativosPorMesa.entries()) {
        const mesaExistente = mesas.find(m => m.mesa_numero === numMesa);
        const pedMaisRecente = pedsMesa[0];
        const garcomNomePed = pedMaisRecente.garcom_nome || pedMaisRecente.itens?.[0]?.garcom_nome;
        const garcomIdPed = pedMaisRecente.garcom_id || pedMaisRecente.itens?.[0]?.garcom_id;

        if (!mesaExistente) {
          const itensCombinados = deduplicarItensPorTempId(
            pedsMesa.flatMap(p => p.itens || [])
          );
          const carrinhoCombinado = itensCombinados.map((i, idx) => converterParaItemCarrinho(i, idx));
          const totalCombinado = Number(
            carrinhoCombinado.reduce((acc, i) => acc + (Number(i.subtotal) || 0), 0).toFixed(2)
          );

          const novaMesa: MesaAberta = {
            id: generateUuid(),
            mesa_id: `mesa-${numMesa}`,
            mesa_numero: numMesa,
            cliente_nome: pedMaisRecente.cliente_nome || `Mesa ${numMesa}`,
            cliente_telefone: pedMaisRecente.cliente_telefone || '',
            garcom_id: garcomIdPed,
            garcom_nome: garcomNomePed,
            carrinho: carrinhoCombinado,
            itens: itensCombinados,
            pedidos_ids: pedsMesa.map(p => p.id),
            total: totalCombinado,
            status: 'ocupada',
            criado_em: pedsMesa[pedsMesa.length - 1]?.criado_em || new Date().toISOString(),
            aberto_em: pedsMesa[pedsMesa.length - 1]?.criado_em || new Date().toISOString()
          };
          mesas.push(novaMesa);

          if (!syncMesasInFlight.has(numMesa)) {
            syncMesasInFlight.add(numMesa);
            saveMesaAberta(novaMesa).finally(() => syncMesasInFlight.delete(numMesa));
          }
        } else if (garcomNomePed && !mesaExistente.garcom_nome) {
          mesaExistente.garcom_nome = garcomNomePed;
          mesaExistente.garcom_id = garcomIdPed;
        }
      }
    } catch (crossErr) {
      console.warn('Erro ao sincronizar mesas com pedidos ativos:', crossErr);
    }
  }

  setLocal(STORAGE_KEYS.MESAS_ABERTAS, mesas);
  return mesas;
}

export async function saveMesaAberta(mesa: any): Promise<MesaAberta> {
  const numMesa = typeof mesa.mesa_numero === 'number' ? mesa.mesa_numero : parseInt(mesa.mesa_numero, 10) || 1;
  mesasRecemLiberadas.delete(numMesa);

  let mesaId = (mesa.id && isUuid(mesa.id)) ? mesa.id : generateUuid();
  let duplicateIdsToDelete: string[] = [];

  // Verificar se já existe linha para este mesa_numero no Supabase para evitar linhas duplicadas
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: existentes } = await supabase
        .from('mesas_abertas')
        .select('id')
        .eq('mesa_numero', numMesa);

      if (existentes && existentes.length > 0) {
        const jaTemId = existentes.find((r: any) => r.id === mesaId);
        mesaId = jaTemId ? mesaId : existentes[0].id;
        duplicateIdsToDelete = existentes
          .filter((r: any) => r.id !== mesaId)
          .map((r: any) => r.id);
      }
    } catch (e) {
      // ignore lookup fallback
    }
  }

  // Usar sempre carrinho atualizado como fonte da verdade quando fornecido (evita itens antigos em mesa.itens)
  const fonteBruta = Array.isArray(mesa.carrinho)
    ? mesa.carrinho
    : (Array.isArray(mesa.itens) ? mesa.itens : []);

  const carrinhoLimpo: ItemCarrinho[] = deduplicarItensPorTempId<ItemCarrinho>(
    fonteBruta.map((it: any, idx: number) => converterParaItemCarrinho(it, idx))
  );

  const itensComMeta = carrinhoLimpo.map((c, idx) => converterParaItemMeta(c, idx, mesa));
  const totalCalculado = carrinhoLimpo.length > 0
    ? Number(carrinhoLimpo.reduce((acc, i) => acc + (Number(i.subtotal) || 0), 0).toFixed(2))
    : (typeof mesa.total === 'number' ? Number(mesa.total.toFixed(2)) : 0);

  const newMesa: MesaAberta = {
    ...mesa,
    id: mesaId,
    mesa_id: mesa.mesa_id || `mesa-${numMesa}`,
    mesa_numero: numMesa,
    cliente_nome: mesa.cliente_nome || `Mesa ${numMesa}`,
    cliente_telefone: mesa.cliente_telefone || '',
    carrinho: carrinhoLimpo,
    itens: itensComMeta,
    total: totalCalculado,
    status: 'ocupada',
    aberto_em: mesa.aberto_em || new Date().toISOString(),
    criado_em: mesa.criado_em || new Date().toISOString(),
    garcom_id: mesa.garcom_id,
    garcom_nome: mesa.garcom_nome
  };

  // 1. Salvar no Supabase estritamente com as colunas válidas da tabela
  if (isSupabaseConfigured && supabase) {
    try {
      const payload = {
        id: newMesa.id,
        mesa_id: newMesa.mesa_id,
        mesa_numero: newMesa.mesa_numero,
        cliente_nome: newMesa.cliente_nome,
        cliente_telefone: newMesa.cliente_telefone,
        carrinho: newMesa.carrinho,
        itens: newMesa.itens,
        total: newMesa.total,
        status: 'ocupada'
      };

      const { data, error } = await supabase
        .from('mesas_abertas')
        .upsert(payload)
        .select()
        .single();
      
      if (!error && data) {
        newMesa.id = data.id;
      }
      if (error) {
        console.warn('Erro ao salvar mesa aberta no Supabase:', error.message);
      }

      if (duplicateIdsToDelete.length > 0) {
        await supabase.from('mesas_abertas').delete().in('id', duplicateIdsToDelete);
      }
    } catch (e) {
      console.warn('Falha ao salvar mesa aberta no Supabase:', e);
    }
  }

  // 2. Salvar no localStorage garantindo no máximo 1 entrada por mesa_numero
  const mesasLocais = getLocal<MesaAberta[]>(STORAGE_KEYS.MESAS_ABERTAS, []);
  const semDuplicatas = mesasLocais.filter((m: MesaAberta) => m.mesa_numero !== newMesa.mesa_numero && m.id !== newMesa.id);
  setLocal(STORAGE_KEYS.MESAS_ABERTAS, [...semDuplicatas, newMesa]);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mesas_atualizadas'));
  }

  return newMesa;
}

export async function liberarMesaTotal(id: string, mesaNumero?: number): Promise<void> {
  // 1. Descobrir o número exato da mesa
  let num = mesaNumero;
  const mesasAtuais = getLocal<MesaAberta[]>(STORAGE_KEYS.MESAS_ABERTAS, []);
  if (!num) {
    const mesaEncontrada = mesasAtuais.find(m => m.id === id || m.mesa_id === id);
    if (mesaEncontrada) {
      num = mesaEncontrada.mesa_numero;
    } else if (!isUuid(id)) {
      const parsed = parseInt(id.replace(/\D/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 10000) {
        num = parsed;
      }
    }
  }

  // Registrar guarda imediata para que polling simultâneo não ressuscite a mesa durante a exclusão
  if (num) {
    mesasRecemLiberadas.set(num, Date.now());
  }

  // 2. PRIMEIRO concluir todos os pedidos ativos da cozinha dessa mesa (localStorage + Supabase)
  // Isso garante que fetchMesasAbertas nunca encontre pedido ativo sem linha em mesas_abertas.
  if (num) {
    const pedidosLocais = getLocal<PedidoCozinha[]>(STORAGE_KEYS.PEDIDOS_COZINHA, []);
    let alterou = false;
    const pedidosAtualizados = pedidosLocais.map(p => {
      if (p.mesa_numero === num && p.status !== 'entregue' && p.status !== 'cancelado') {
        alterou = true;
        return {
          ...p,
          status: 'entregue' as const,
          alerta_silenciado: true,
          atualizado_em: new Date().toISOString()
        };
      }
      return p;
    });
    if (alterou) {
      setLocal(STORAGE_KEYS.PEDIDOS_COZINHA, pedidosAtualizados);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('pedidos_cozinha')
          .update({
            status: 'entregue',
            alerta_silenciado: true,
            atualizado_em: new Date().toISOString()
          })
          .eq('mesa_numero', num)
          .neq('status', 'entregue')
          .neq('status', 'cancelado');
      } catch (errKds) {
        console.warn('Falha ao finalizar pedidos da cozinha no Supabase:', errKds);
      }
    }

    // Se for Comanda Online (#99), marcar pedidos online pendentes locais como entregues
    if (num === 99) {
      const onlineAtuais = getLocal<PedidoOnline[]>(STORAGE_KEYS.PEDIDOS_ONLINE, []);
      let alterouOnline = false;
      const onlineAtualizados = onlineAtuais.map(po => {
        if (po.status !== 'entregue' && po.status !== 'pago' && po.status !== 'cancelado') {
          alterouOnline = true;
          return { ...po, status: 'entregue' as const };
        }
        return po;
      });
      if (alterouOnline) {
        setLocal(STORAGE_KEYS.PEDIDOS_ONLINE, onlineAtualizados);
      }
    }
  }

  // 3. Remover mesa do localStorage imediatamente
  const mesasRestantes = mesasAtuais.filter((m: MesaAberta) => {
    if (m.id === id || m.mesa_id === id) return false;
    if (num && m.mesa_numero === num) return false;
    return true;
  });
  setLocal(STORAGE_KEYS.MESAS_ABERTAS, mesasRestantes);

  // 4. Deletar TODAS as linhas correspondentes em mesas_abertas no Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      if (isUuid(id)) {
        await supabase.from('mesas_abertas').delete().eq('id', id);
      }
      if (num) {
        await supabase.from('mesas_abertas').delete().eq('mesa_numero', num);
      }
    } catch (e) {
      console.warn('Falha ao deletar mesa aberta no Supabase:', e);
    }
  }

  // 5. Notificar todas as páginas e componentes
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mesas_atualizadas'));
    window.dispatchEvent(new CustomEvent('pedidos_cozinha_atualizados'));
    if (num === 99) {
      window.dispatchEvent(new CustomEvent('pedidos_online_atualizados'));
    }
  }
}

export async function deleteMesaAberta(id: string, mesaNumero?: number): Promise<void> {
  return liberarMesaTotal(id, mesaNumero);
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
        const mapped = (data as PedidoCozinha[]).map(p => {
          const itemGarcom = (p.itens || []).find(i => i.garcom_nome);
          return {
            ...p,
            garcom_nome: p.garcom_nome || itemGarcom?.garcom_nome,
            garcom_id: p.garcom_id || itemGarcom?.garcom_id
          };
        });
        setLocal(STORAGE_KEYS.PEDIDOS_COZINHA, mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Falha ao buscar pedidos da cozinha no Supabase:', e);
    }
  }
  return getLocal<PedidoCozinha[]>(STORAGE_KEYS.PEDIDOS_COZINHA, []);
}

export async function savePedidoCozinha(pedido: Partial<PedidoCozinha>): Promise<PedidoCozinha> {
  const pedId = (pedido.id && isUuid(pedido.id)) ? pedido.id : generateUuid();
  const itensComGarcom = (pedido.itens || []).map(i => ({
    ...i,
    garcom_id: i.garcom_id || pedido.garcom_id,
    garcom_nome: i.garcom_nome || pedido.garcom_nome
  }));

  const newPedido: PedidoCozinha = {
    id: pedId,
    mesa_numero: pedido.mesa_numero || 1,
    cliente_id: pedido.cliente_id,
    cliente_nome: pedido.cliente_nome || 'Cliente',
    cliente_telefone: pedido.cliente_telefone || '',
    itens: itensComGarcom,
    total: pedido.total !== undefined ? pedido.total : itensComGarcom.reduce((acc, i) => acc + (i.subtotal || 0), 0),
    status: pedido.status || 'pendente',
    observacoes: pedido.observacoes || '',
    alerta_silenciado: pedido.alerta_silenciado !== undefined ? pedido.alerta_silenciado : false,
    criado_em: pedido.criado_em || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    online_detalhes: pedido.online_detalhes,
    garcom_id: pedido.garcom_id || itensComGarcom[0]?.garcom_id,
    garcom_nome: pedido.garcom_nome || itensComGarcom[0]?.garcom_nome
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('pedidos_cozinha')
        .upsert({
          id: newPedido.id,
          mesa_numero: newPedido.mesa_numero,
          cliente_nome: newPedido.cliente_nome,
          cliente_telefone: newPedido.cliente_telefone,
          itens: newPedido.itens,
          total: newPedido.total,
          status: newPedido.status,
          observacoes: newPedido.observacoes,
          alerta_silenciado: newPedido.alerta_silenciado
        })
        .select()
        .single();
      
      if (!error && data) {
        newPedido.id = data.id;
      }
      if (error) {
        console.warn('Erro ao salvar pedido na cozinha:', error.message);
      }
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
  garcomId?: string;
  garcomNome?: string;
}): Promise<PedidoCozinha> {
  const total = params.itens.reduce((acc, i) => acc + (i.subtotal || 0), 0);

  const itensEnriquecidos = params.itens.map(i => ({
    ...i,
    garcom_id: params.garcomId || i.garcom_id,
    garcom_nome: params.garcomNome || i.garcom_nome
  }));

  // 1. Salvar o pedido para a cozinha (KDS) com alerta ativo (alerta_silenciado: false)
  const pedido = await savePedidoCozinha({
    mesa_numero: params.mesaNumero,
    cliente_id: params.clienteId,
    cliente_nome: params.clienteNome,
    cliente_telefone: params.clienteTelefone,
    itens: itensEnriquecidos,
    total,
    status: 'pendente',
    observacoes: params.observacoes,
    alerta_silenciado: false,
    garcom_id: params.garcomId,
    garcom_nome: params.garcomNome
  });

  // 2. Vincular com o sistema de Mesas Abertas do Caixa (skipKitchenSync evita duplicar itens recém-enviados à cozinha)
  const mesas = await fetchMesasAbertas({ skipKitchenSync: true });
  const mesaExistente = mesas.find((m: MesaAberta) => m.mesa_numero === params.mesaNumero);

  const novosItensCarrinho: ItemCarrinho[] = itensEnriquecidos.map(item => ({
    id_temp: item.id_temp,
    produto: {
      id: item.produto_id,
      categoria_id: '',
      nome: item.nome,
      preco: item.preco_unitario,
      ativo: true,
      unidade_venda: item.unidade_venda
    },
    quantidade: item.quantidade,
    subtotal: Number((item.subtotal || 0).toFixed(2)),
    observacao: item.observacao,
    peso_gramas: item.peso_gramas,
    medida_label: item.medida_label
  }));

  if (mesaExistente) {
    const carrinhoAtualizado = deduplicarItensPorTempId([
      ...(mesaExistente.carrinho || []),
      ...novosItensCarrinho
    ]);
    const totalAtualizado = Number(
      carrinhoAtualizado.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0).toFixed(2)
    );
    const pedidosIds = Array.from(new Set([...(mesaExistente.pedidos_ids || []), pedido.id]));

    await saveMesaAberta({
      ...mesaExistente,
      cliente_id: params.clienteId || mesaExistente.cliente_id,
      cliente_nome: isNomeGenericoMesa(mesaExistente.cliente_nome) ? (params.clienteNome || mesaExistente.cliente_nome) : mesaExistente.cliente_nome,
      cliente_telefone: mesaExistente.cliente_telefone || params.clienteTelefone,
      carrinho: carrinhoAtualizado,
      itens: undefined,
      total: totalAtualizado,
      pedidos_ids: pedidosIds,
      garcom_id: params.garcomId || mesaExistente.garcom_id,
      garcom_nome: params.garcomNome || mesaExistente.garcom_nome
    });
  } else {
    await saveMesaAberta({
      mesa_id: `mesa-${params.mesaNumero}`,
      mesa_numero: params.mesaNumero,
      cliente_id: params.clienteId,
      cliente_nome: params.clienteNome,
      cliente_telefone: params.clienteTelefone,
      carrinho: novosItensCarrinho,
      total: Number(total.toFixed(2)),
      pedidos_ids: [pedido.id],
      criado_em: new Date().toISOString(),
      garcom_id: params.garcomId,
      garcom_nome: params.garcomNome
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
      const origemAtendimento = params.garcomNome ? `Garçom ${params.garcomNome}` : 'Cardápio Digital';
      await registerCompra(
        targetCliId,
        total,
        true,
        `Mesa ${params.mesaNumero} (${origemAtendimento}): ${params.itens.map(i => `${i.quantidade}x ${i.nome}`).join(', ')}`,
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

export async function atualizarItensComandaGarcom(params: {
  mesaNumero: number;
  carrinhoAtualizado: ItemCarrinho[];
  garcomId?: string;
  garcomNome?: string;
}): Promise<{ mesa: MesaAberta | null; comandaEncerrada: boolean }> {
  const mesas = await fetchMesasAbertas({ skipKitchenSync: true });
  const mesaExistente = mesas.find((m: MesaAberta) => m.mesa_numero === params.mesaNumero);

  const idsOriginaisMesa = new Set(
    (mesaExistente?.carrinho || [])
      .map(i => i.id_temp)
      .filter((id): id is string => Boolean(id))
  );

  const carrinhoLimpo: ItemCarrinho[] = deduplicarItensPorTempId(
    (params.carrinhoAtualizado || [])
      .filter(item => item && Number(item.quantidade) > 0)
      .map((item, idx) => {
        const qtd = Number(item.quantidade) || 1;
        const preco = Number(item.produto?.preco) || 0;
        const obsLimpa = item.observacao?.trim() || undefined;
        return {
          ...item,
          id_temp: item.id_temp || `item-${idx}-${item.produto?.id || item.produto?.nome}`,
          quantidade: qtd,
          subtotal: Number((qtd * preco).toFixed(2)),
          observacao: obsLimpa
        };
      })
  );

  // Sincronizar alterações e remoções nos pedidos ativos da Cozinha (KDS)
  const pedidos = await fetchPedidosCozinha();
  const pedidosAtivosMesa = pedidos.filter(
    p =>
      p.mesa_numero === params.mesaNumero &&
      p.status !== 'entregue' &&
      p.status !== 'cancelado'
  );

  if (carrinhoLimpo.length === 0) {
    // Todos os itens foram removidos: cancelar pedidos ativos na cozinha e liberar a comanda
    for (const ped of pedidosAtivosMesa) {
      await savePedidoCozinha({
        ...ped,
        itens: [],
        total: 0,
        status: 'cancelado',
        alerta_silenciado: true
      });
    }

    await liberarMesaTotal(
      mesaExistente?.id || `mesa-${params.mesaNumero}`,
      params.mesaNumero
    );

    return { mesa: null, comandaEncerrada: true };
  }

  const mapaCarrinho = new Map<string, ItemCarrinho>();
  carrinhoLimpo.forEach(item => {
    if (item.id_temp) mapaCarrinho.set(item.id_temp, item);
  });

  for (const ped of pedidosAtivosMesa) {
    let alterouPedido = false;
    const itensAtualizadosPedido: ItemPedidoCozinha[] = [];

    for (const pi of ped.itens || []) {
      const editado = pi.id_temp ? mapaCarrinho.get(pi.id_temp) : undefined;
      if (editado) {
        const novaObs = editado.observacao?.trim() || undefined;
        const obsAnterior = pi.observacao?.trim() || undefined;
        if (
          pi.quantidade !== editado.quantidade ||
          Number(pi.subtotal) !== Number(editado.subtotal) ||
          obsAnterior !== novaObs
        ) {
          alterouPedido = true;
        }
        itensAtualizadosPedido.push({
          ...pi,
          quantidade: editado.quantidade,
          preco_unitario: Number(editado.produto.preco) || pi.preco_unitario,
          subtotal: editado.subtotal,
          observacao: novaObs
        });
      } else if (pi.id_temp && idsOriginaisMesa.has(pi.id_temp)) {
        // Item estava na comanda e foi explicitamente retirado pelo garçom
        alterouPedido = true;
      } else {
        // Preserva item caso pertença a estrutura sem id_temp mapeado na mesa
        itensAtualizadosPedido.push(pi);
      }
    }

    if (alterouPedido) {
      const novoTotalPed = Number(
        itensAtualizadosPedido.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0).toFixed(2)
      );
      await savePedidoCozinha({
        ...ped,
        itens: itensAtualizadosPedido,
        total: novoTotalPed,
        status: itensAtualizadosPedido.length === 0 ? 'cancelado' : ped.status,
        alerta_silenciado: itensAtualizadosPedido.length === 0 ? true : ped.alerta_silenciado
      });
    }
  }

  const totalAtualizado = Number(
    carrinhoLimpo.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0).toFixed(2)
  );

  const mesaSalva = await saveMesaAberta({
    ...(mesaExistente || {
      mesa_id: `mesa-${params.mesaNumero}`,
      mesa_numero: params.mesaNumero,
      cliente_nome: `Comanda ${params.mesaNumero}`,
      criado_em: new Date().toISOString()
    }),
    carrinho: carrinhoLimpo,
    itens: undefined,
    total: totalAtualizado,
    garcom_id: mesaExistente?.garcom_id || params.garcomId,
    garcom_nome: mesaExistente?.garcom_nome || params.garcomNome
  });

  return { mesa: mesaSalva, comandaEncerrada: false };
}

// ==========================================
// MÓDULO: GESTÃO DE ACESSOS (COLABORADORES / GARÇONS)
// ==========================================
const SUPABASE_COLABORADORES_ROW_ID = 999;

export async function fetchColaboradores(): Promise<Colaborador[]> {
  let listaLocal = getLocal<Colaborador[]>(STORAGE_KEYS.COLABORADORES, []);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('configuracoes_fidelidade')
        .select('mensagem_whatsapp')
        .eq('id', SUPABASE_COLABORADORES_ROW_ID)
        .single();

      if (!error && data && data.mensagem_whatsapp) {
        const parsed = JSON.parse(data.mensagem_whatsapp);
        if (Array.isArray(parsed)) {
          listaLocal = parsed as Colaborador[];
          setLocal(STORAGE_KEYS.COLABORADORES, listaLocal);
          return listaLocal;
        }
      }
    } catch (e) {
      // ignore if row 999 not yet created or offline
    }
  }

  return listaLocal;
}

async function syncColaboradoresToSupabase(lista: Colaborador[]): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('configuracoes_fidelidade')
        .upsert({
          id: SUPABASE_COLABORADORES_ROW_ID,
          meta_compras_mes: 0,
          valor_minimo_pontuacao: 5,
          premio_descricao: 'COLABORADORES_ACESSO',
          mensagem_whatsapp: JSON.stringify(lista),
          mensagem_resgate: 'v1',
          atualizado_em: new Date().toISOString()
        });
    } catch (e) {
      console.warn('Erro ao sincronizar colaboradores no Supabase:', e);
    }
  }
}

export async function saveColaborador(dados: {
  id?: string;
  nome: string;
  codigo_acesso: string;
  senha: string;
  cargo?: string;
  ativo?: boolean;
}): Promise<Colaborador> {
  const atuais = await fetchColaboradores();
  const idFinal = dados.id || generateUuid();

  const novo: Colaborador = {
    id: idFinal,
    nome: dados.nome.trim(),
    codigo_acesso: dados.codigo_acesso.trim(),
    senha: dados.senha.trim(),
    cargo: dados.cargo || 'Garçom / Atendente',
    ativo: dados.ativo !== false,
    criado_em: atuais.find(c => c.id === idFinal)?.criado_em || new Date().toISOString()
  };

  const jaExiste = atuais.some(c => c.id === idFinal);
  const novaLista = jaExiste
    ? atuais.map(c => c.id === idFinal ? novo : c)
    : [...atuais, novo];

  setLocal(STORAGE_KEYS.COLABORADORES, novaLista);
  await syncColaboradoresToSupabase(novaLista);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('colaboradores_atualizados'));
  }

  return novo;
}

export async function deleteColaborador(id: string): Promise<void> {
  const atuais = await fetchColaboradores();
  const novaLista = atuais.filter(c => c.id !== id);
  setLocal(STORAGE_KEYS.COLABORADORES, novaLista);
  await syncColaboradoresToSupabase(novaLista);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('colaboradores_atualizados'));
  }
}

export async function autenticarColaborador(codigoAcesso: string, senha: string): Promise<Colaborador | null> {
  const codigoLimpo = codigoAcesso.trim().toLowerCase();
  const senhaLimpa = senha.trim();
  if (!codigoLimpo || !senhaLimpa) return null;

  const colaboradores = await fetchColaboradores();
  const encontrado = colaboradores.find(
    c => c.ativo !== false &&
         c.codigo_acesso.trim().toLowerCase() === codigoLimpo &&
         c.senha.trim() === senhaLimpa
  );

  return encontrado || null;
}

// ==========================================
// MÓDULO: COMANDA ONLINE (PEDIDOS DE CASA)
// ==========================================
export async function fetchPedidosOnline(): Promise<PedidoOnline[]> {
  return getLocal<PedidoOnline[]>(STORAGE_KEYS.PEDIDOS_ONLINE, []);
}

export async function savePedidoOnline(dados: {
  clienteNome: string;
  clienteTelefone: string;
  tipo: 'retirada' | 'entrega';
  endereco?: {
    rua: string;
    numero: string;
    bairro: string;
    complemento?: string;
    ponto_referencia?: string;
  };
  formaPagamento: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro';
  trocoPara?: string;
  itens: ItemPedidoCozinha[];
  observacoes?: string;
}): Promise<PedidoOnline> {
  const pedidosExistentes = getLocal<PedidoOnline[]>(STORAGE_KEYS.PEDIDOS_ONLINE, []);
  
  // Próximo número de pedido
  const proximoNumero = pedidosExistentes.length > 0 
    ? Math.max(...pedidosExistentes.map(p => p.numero_pedido || 1000)) + 1 
    : 1001;

  const total = dados.itens.reduce((acc, i) => acc + (i.subtotal || 0), 0);
  const pedId = generateUuid();
  const agora = new Date().toISOString();

  // Construir mensagem para WhatsApp formatada automaticamente
  const enderecoStr = dados.tipo === 'entrega' && dados.endereco
    ? `${dados.endereco.rua}, nº ${dados.endereco.numero} - ${dados.endereco.bairro}${dados.endereco.complemento ? ` (${dados.endereco.complemento})` : ''}${dados.endereco.ponto_referencia ? ` [Ref: ${dados.endereco.ponto_referencia}]` : ''}`
    : 'Retirada no Balcão da Panificadora';

  const formaPagtoNome = {
    pix: 'Pix',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    dinheiro: dados.trocoPara ? `Dinheiro (Troco para R$ ${dados.trocoPara})` : 'Dinheiro'
  }[dados.formaPagamento];

  const itensTexto = dados.itens.map(i => {
    let linha = `• ${i.quantidade}x ${i.nome} - R$ ${i.subtotal.toFixed(2)}`;
    if (i.observacao) {
      linha += `\n  _Obs: ${i.observacao}_`;
    }
    return linha;
  }).join('\n');

  const mensagemWhatsapp = `🍞 *PEDIDO ONLINE - MOREIRA SALES* 🍞\n` +
    `*Pedido:* #${proximoNumero}\n` +
    `*Cliente:* ${dados.clienteNome}\n` +
    `*WhatsApp:* ${dados.clienteTelefone}\n` +
    `*Modalidade:* ${dados.tipo === 'entrega' ? '🛵 Entrega em Domicílio' : '🛍️ Retirada no Balcão'}\n` +
    (dados.tipo === 'entrega' ? `*Endereço:* ${enderecoStr}\n` : '') +
    `*Pagamento:* ${formaPagtoNome}\n` +
    (dados.observacoes ? `*Obs Geral:* ${dados.observacoes}\n` : '') +
    `\n📋 *ITENS DO PEDIDO:*\n${itensTexto}\n\n` +
    `💰 *TOTAL DO PEDIDO:* R$ ${total.toFixed(2)}\n\n` +
    `_Pedido registrado com sucesso no sistema da Panificadora Moreira Sales!_`;

  const novoPedidoOnline: PedidoOnline = {
    id: pedId,
    numero_pedido: proximoNumero,
    cliente_nome: dados.clienteNome,
    cliente_telefone: dados.clienteTelefone,
    tipo: dados.tipo,
    endereco: dados.endereco,
    forma_pagamento: dados.formaPagamento,
    troco_para: dados.trocoPara,
    itens: dados.itens,
    total,
    observacoes: dados.observacoes,
    status: 'pendente',
    criado_em: agora,
    mensagem_whatsapp: mensagemWhatsapp
  };

  // 1. Salvar na lista de pedidos online
  const novaLista = [novoPedidoOnline, ...pedidosExistentes];
  setLocal(STORAGE_KEYS.PEDIDOS_ONLINE, novaLista);

  // 2. Criar pedido na cozinha (KDS) com identificação clara de Pedido Online
  const obsKds = `${dados.tipo === 'entrega' ? '🛵 [ENTREGA]' : '🛍️ [RETIRADA]'} • ${dados.formaPagamento.toUpperCase()}${dados.endereco ? ` • End: ${dados.endereco.rua}, ${dados.endereco.numero} - ${dados.endereco.bairro}` : ''}${dados.observacoes ? ` • Obs: ${dados.observacoes}` : ''}`;

  const pedidoCozinha = await savePedidoCozinha({
    mesa_numero: 99, // 99 = Comanda Online
    cliente_nome: `${dados.clienteNome} (Online #${proximoNumero})`,
    cliente_telefone: dados.clienteTelefone,
    itens: dados.itens,
    total,
    status: 'pendente',
    observacoes: obsKds,
    alerta_silenciado: false,
    online_detalhes: {
      tipo: dados.tipo,
      endereco: dados.endereco,
      forma_pagamento: dados.formaPagamento,
      troco_para: dados.trocoPara,
      mensagem_whatsapp: mensagemWhatsapp
    }
  });

  // 3. Vincular também na comanda online das mesas abertas do Caixa (skipKitchenSync evita duplicação)
  const mesas = await fetchMesasAbertas({ skipKitchenSync: true });
  const mesaOnlineExistente = mesas.find((m: MesaAberta) => m.mesa_numero === 99);

  const novosItensCarrinho: ItemCarrinho[] = dados.itens.map(item => ({
    id_temp: item.id_temp,
    produto: {
      id: item.produto_id,
      categoria_id: '',
      nome: item.nome,
      preco: item.preco_unitario,
      ativo: true,
      unidade_venda: item.unidade_venda
    },
    quantidade: item.quantidade,
    subtotal: Number((item.subtotal || 0).toFixed(2)),
    peso_gramas: item.peso_gramas,
    medida_label: item.medida_label
  }));

  if (mesaOnlineExistente) {
    const carrinhoAtualizado = deduplicarItensPorTempId([
      ...(mesaOnlineExistente.carrinho || []),
      ...novosItensCarrinho
    ]);
    const totalAtualizado = Number(
      carrinhoAtualizado.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0).toFixed(2)
    );
    const pedidosIds = Array.from(new Set([...(mesaOnlineExistente.pedidos_ids || []), pedidoCozinha.id]));

    await saveMesaAberta({
      ...mesaOnlineExistente,
      cliente_nome: `${dados.clienteNome} (e outros)`,
      cliente_telefone: dados.clienteTelefone,
      carrinho: carrinhoAtualizado,
      itens: undefined,
      total: totalAtualizado,
      pedidos_ids: pedidosIds,
      is_online: true
    });
  } else {
    await saveMesaAberta({
      mesa_id: 'mesa-online-99',
      mesa_numero: 99,
      cliente_nome: dados.clienteNome,
      cliente_telefone: dados.clienteTelefone,
      carrinho: novosItensCarrinho,
      total: Number(total.toFixed(2)),
      pedidos_ids: [pedidoCozinha.id],
      criado_em: agora,
      is_online: true
    });
  }

  // 4. Cadastrar ou atualizar cliente no CRM de fidelidade
  try {
    await identificarOuCadastrarCliente(dados.clienteNome, dados.clienteTelefone);
  } catch (e) {
    console.warn('Erro ao sincronizar cliente no CRM:', e);
  }

  // 5. Disparar eventos
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pedidos_online_atualizados', { detail: novoPedidoOnline }));
    window.dispatchEvent(new CustomEvent('novo_pedido_cozinha', { detail: pedidoCozinha }));
    window.dispatchEvent(new CustomEvent('pedidos_cozinha_atualizados'));
    window.dispatchEvent(new CustomEvent('mesas_atualizadas'));
    window.dispatchEvent(new CustomEvent('storage'));
  }

  return novoPedidoOnline;
}

export async function updateStatusPedidoOnline(id: string, status: PedidoOnline['status']): Promise<void> {
  const pedidos = getLocal<PedidoOnline[]>(STORAGE_KEYS.PEDIDOS_ONLINE, []);
  const updated = pedidos.map(p => p.id === id ? { ...p, status } : p);
  setLocal(STORAGE_KEYS.PEDIDOS_ONLINE, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pedidos_online_atualizados'));
    window.dispatchEvent(new CustomEvent('storage'));
  }
}

export async function deletePedidoOnline(id: string): Promise<void> {
  const pedidos = getLocal<PedidoOnline[]>(STORAGE_KEYS.PEDIDOS_ONLINE, []);
  const updated = pedidos.filter(p => p.id !== id);
  setLocal(STORAGE_KEYS.PEDIDOS_ONLINE, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pedidos_online_atualizados'));
    window.dispatchEvent(new CustomEvent('storage'));
  }
}

// --- CMV ---
export async function fetchFornecedores(): Promise<Fornecedor[]> {
  const localList = getLocal<Fornecedor[]>(STORAGE_KEYS.FORNECEDORES, []);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .order('nome_empresa');
      if (!error && data) {
        const mapped: Fornecedor[] = data.map((f: any) => ({
          id: f.id,
          nome_empresa: f.nome_empresa || f.nome || '',
          contato_whatsapp: f.contato_whatsapp || f.contato || f.telefone || '',
          cnpj: f.cnpj || undefined,
          cidade: f.cidade || undefined
        }));
        setLocal(STORAGE_KEYS.FORNECEDORES, mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Falha ao buscar fornecedores no Supabase, usando local:', e);
    }
  }
  return localList;
}

export async function saveFornecedor(f: Partial<Fornecedor> & { nome_empresa: string }): Promise<Fornecedor> {
  const id = (f.id && isUuid(f.id)) ? f.id : (f.id || generateUuid());
  const newF: Fornecedor = { 
    id,
    nome_empresa: f.nome_empresa.trim(),
    contato_whatsapp: f.contato_whatsapp?.trim() || '',
    cnpj: f.cnpj?.trim() || undefined,
    cidade: f.cidade?.trim() || undefined
  };

  // 1. Gravar imediatamente no LocalStorage
  const list = getLocal<Fornecedor[]>(STORAGE_KEYS.FORNECEDORES, []);
  const exists = list.some(x => x.id === newF.id);
  const updated = exists ? list.map(x => x.id === newF.id ? newF : x) : [...list, newF];
  setLocal(STORAGE_KEYS.FORNECEDORES, updated);

  // 2. Sincronizar com Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('fornecedores').upsert({
        id: newF.id,
        nome: newF.nome_empresa,
        nome_empresa: newF.nome_empresa,
        contato: newF.contato_whatsapp,
        contato_whatsapp: newF.contato_whatsapp,
        cnpj: newF.cnpj || null,
        cidade: newF.cidade || null,
      });
    } catch (e) {
      console.warn('Falha ao salvar fornecedor no Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fornecedores_atualizados'));
  }

  return newF;
}

export async function deleteFornecedor(id: string): Promise<void> {
  const list = getLocal<Fornecedor[]>(STORAGE_KEYS.FORNECEDORES, []);
  const updated = list.filter(x => x.id !== id);
  setLocal(STORAGE_KEYS.FORNECEDORES, updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fornecedores_atualizados'));
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('fornecedores').delete().eq('id', id);
    } catch (e) {
      console.warn('Falha ao excluir fornecedor no Supabase:', e);
    }
  }
}

export async function fetchInsumos(): Promise<Insumo[]> {
  const localList = getLocal<Insumo[]>(STORAGE_KEYS.INSUMOS, []);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('insumos')
        .select('*')
        .order('nome');
      if (!error && data) {
        const mapped: Insumo[] = data.map((item: any) => ({
          id: item.id,
          nome: item.nome,
          unidade_medida: item.unidade_medida || 'kg',
          preco_custo: Number(item.preco_custo ?? item.custo_unitario) || 0,
          quantidade_estoque: Number(item.quantidade_estoque ?? item.estoque_atual) || 0,
          estoque_minimo: Number(item.estoque_minimo) || 0,
          fornecedor_id: item.fornecedor_id || ''
        }));
        setLocal(STORAGE_KEYS.INSUMOS, mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Falha ao buscar insumos no Supabase, usando local:', e);
    }
  }
  return localList;
}

export async function saveInsumo(i: Partial<Insumo> & { nome: string }): Promise<Insumo> {
  const id = (i.id && isUuid(i.id)) ? i.id : (i.id || generateUuid());
  const newI: Insumo = { 
    id,
    nome: i.nome.trim(),
    unidade_medida: i.unidade_medida || 'kg',
    preco_custo: Number(i.preco_custo) || 0,
    quantidade_estoque: Number(i.quantidade_estoque) || 0,
    estoque_minimo: Number(i.estoque_minimo) || 0,
    fornecedor_id: i.fornecedor_id?.trim() || ''
  };

  // 1. Gravar imediatamente no LocalStorage
  const list = getLocal<Insumo[]>(STORAGE_KEYS.INSUMOS, []);
  const exists = list.some(x => x.id === newI.id);
  const updated = exists ? list.map(x => x.id === newI.id ? newI : x) : [...list, newI];
  setLocal(STORAGE_KEYS.INSUMOS, updated);

  // Recalcular custos de produção de todos os produtos que utilizam insumos
  recalcularTodosCustosProdutos();

  // 2. Sincronizar com Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('insumos').upsert({
        id: newI.id,
        nome: newI.nome,
        unidade_medida: newI.unidade_medida,
        preco_custo: newI.preco_custo,
        custo_unitario: newI.preco_custo,
        quantidade_estoque: newI.quantidade_estoque,
        estoque_atual: newI.quantidade_estoque,
        estoque_minimo: newI.estoque_minimo,
        fornecedor_id: newI.fornecedor_id || null
      });
    } catch (e) {
      console.warn('Falha ao salvar insumo no Supabase:', e);
    }
  }

  return newI;
}

export async function deleteInsumo(id: string): Promise<void> {
  const list = getLocal<Insumo[]>(STORAGE_KEYS.INSUMOS, []);
  const updated = list.filter(x => x.id !== id);
  setLocal(STORAGE_KEYS.INSUMOS, updated);

  // Recalcular custos de todos os produtos pós-exclusão
  recalcularTodosCustosProdutos();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('insumos_atualizados'));
    window.dispatchEvent(new CustomEvent('fichas_atualizadas'));
    window.dispatchEvent(new CustomEvent('produtos_atualizados'));
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('insumos').delete().eq('id', id);
    } catch (e) {
      console.warn('Falha ao excluir insumo no Supabase:', e);
    }
  }
}

export async function fetchFichasTecnicas(): Promise<FichaTecnica[]> {
  const localList = getLocal<FichaTecnica[]>(STORAGE_KEYS.FICHAS_TECNICAS, []);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('fichas_tecnicas')
        .select('*');
      if (!error && data) {
        const result: FichaTecnica[] = [];
        data.forEach((row: any) => {
          const rendimento = Number(row.rendimento_unidades) > 0 ? Number(row.rendimento_unidades) : 1;
          const custoDiretoOuMaoObra = Number(row.custo_mao_obra ?? row.custo_direto) || 0;

          if (Array.isArray(row.insumos) && row.insumos.length > 0) {
            row.insumos.forEach((ing: any, idx: number) => {
              if (ing.insumo_id && Number(ing.quantidade_utilizada) > 0) {
                const unidadeEscolhida = ing.unidade_medida || ing.unidade_utilizada || undefined;
                const qtdOriginal = ing.quantidade_original !== undefined 
                  ? Number(ing.quantidade_original) 
                  : Number(ing.quantidade_utilizada);

                result.push({
                  id: `${row.id || 'ficha'}-${idx}`,
                  produto_id: row.produto_id,
                  insumo_id: ing.insumo_id,
                  quantidade_utilizada: Number(ing.quantidade_utilizada) || 0,
                  rendimento_unidades: rendimento,
                  custo_direto: custoDiretoOuMaoObra,
                  unidade_medida: unidadeEscolhida,
                  quantidade_original: qtdOriginal
                });
              }
            });
          } else if (row.produto_id) {
            // Ficha de custo direto (sem insumos vinculados ou item de revenda)
            result.push({
              id: row.id || `ficha-${row.produto_id}`,
              produto_id: row.produto_id,
              insumo_id: '',
              quantidade_utilizada: 0,
              rendimento_unidades: rendimento,
              custo_direto: custoDiretoOuMaoObra
            });
          }
        });

        // Garantir que receitas salvas localmente não sejam perdidas se ainda não sincronizadas
        const prodsNoSupabase = new Set(result.map(x => x.produto_id));
        localList.forEach(localItem => {
          if (!prodsNoSupabase.has(localItem.produto_id)) {
            result.push(localItem);
          }
        });

        setLocal(STORAGE_KEYS.FICHAS_TECNICAS, result);
        return result;
      }
    } catch (e) {
      console.warn('Falha ao buscar fichas no Supabase, usando local:', e);
    }
  }

  return localList;
}

export async function saveCustoDiretoProduto(produtoId: string, custoDireto: number): Promise<FichaTecnica[]> {
  const custoNum = Math.max(0, Number(custoDireto) || 0);
  const currentList = getLocal<FichaTecnica[]>(STORAGE_KEYS.FICHAS_TECNICAS, []);
  const semEsseProduto = currentList.filter(x => x.produto_id !== produtoId);

  const novoItem: FichaTecnica = {
    id: `ficha-${produtoId}`,
    produto_id: produtoId,
    insumo_id: '',
    quantidade_utilizada: 0,
    rendimento_unidades: 1,
    custo_direto: custoNum
  };

  const atualizado = [...semEsseProduto, novoItem];
  setLocal(STORAGE_KEYS.FICHAS_TECNICAS, atualizado);

  // Também atualizar cache local de produtos para consistência
  const prods = getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []);
  if (prods.some(p => p.id === produtoId)) {
    const updatedProds = prods.map(p => p.id === produtoId ? { ...p, custo: custoNum } : p);
    setLocal(STORAGE_KEYS.PRODUTOS, updatedProds);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('fichas_tecnicas').upsert({
        id: 'ficha-' + produtoId,
        produto_id: produtoId,
        nome: 'Custo Direto',
        rendimento_unidades: 1,
        custo_mao_obra: custoNum,
        insumos: []
      });
    } catch (e) {
      console.warn('Falha ao salvar custo direto no Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('catalogo_atualizado'));
    window.dispatchEvent(new CustomEvent('produtos_atualizados'));
  }

  return atualizado;
}

export async function saveFichaTecnica(f: FichaTecnica): Promise<FichaTecnica> {
  const id = (f.id && isUuid(f.id)) ? f.id : (f.id || generateUuid());
  const rendimentoLimpo = (f.rendimento_unidades && f.rendimento_unidades > 0) ? Number(f.rendimento_unidades) : 1;
  const newF: FichaTecnica = { 
    id,
    produto_id: f.produto_id,
    insumo_id: f.insumo_id,
    quantidade_utilizada: Number(f.quantidade_utilizada) || 0,
    rendimento_unidades: rendimentoLimpo
  };

  // 1. Gravar imediatamente no LocalStorage
  const list = getLocal<FichaTecnica[]>(STORAGE_KEYS.FICHAS_TECNICAS, []);
  const exists = list.some(x => x.id === newF.id || (x.produto_id === newF.produto_id && x.insumo_id === newF.insumo_id));
  const updated = exists 
    ? list.map(x => (x.id === newF.id || (x.produto_id === newF.produto_id && x.insumo_id === newF.insumo_id)) ? newF : x) 
    : [...list, newF];
  setLocal(STORAGE_KEYS.FICHAS_TECNICAS, updated);

  // 2. Sincronizar com Supabase no formato { id, produto_id, rendimento_unidades, insumos }
  if (isSupabaseConfigured && supabase) {
    try {
      const todosInsumosProduto = updated.filter(x => x.produto_id === newF.produto_id);
      await supabase.from('fichas_tecnicas').upsert({
        id: 'ficha-' + newF.produto_id,
        produto_id: newF.produto_id,
        rendimento_unidades: rendimentoLimpo,
        insumos: todosInsumosProduto.map(x => ({
          insumo_id: x.insumo_id,
          quantidade_utilizada: x.quantidade_utilizada
        }))
      });
    } catch (e) {
      console.warn('Falha ao salvar ficha no Supabase:', e);
    }
  }

  return newF;
}

// ==========================================
// METADADOS E FICHA TÉCNICA OFICIAL (MOREIRA SALES)
// ==========================================

export async function fetchReceitasMetadata(): Promise<Record<string, ReceitaMetadata>> {
  const localMap = getLocal<Record<string, ReceitaMetadata>>(STORAGE_KEYS.RECEITAS_METADATA, {});

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('fichas_tecnicas').select('*');
      if (!error && data) {
        data.forEach((row: any) => {
          if (row.produto_id) {
            localMap[row.produto_id] = {
              produto_id: row.produto_id,
              responsavel: row.responsavel || row.nome_responsavel || localMap[row.produto_id]?.responsavel || '',
              codigo: row.codigo || localMap[row.produto_id]?.codigo || '',
              data: row.data_ficha || row.data || localMap[row.produto_id]?.data || '',
              rendimento_cru: row.rendimento_cru || localMap[row.produto_id]?.rendimento_cru || '',
              rendimento_assado: row.rendimento_assado || localMap[row.produto_id]?.rendimento_assado || '',
              rendimento_total: row.rendimento_total || localMap[row.produto_id]?.rendimento_total || '',
              quebra: row.quebra || localMap[row.produto_id]?.quebra || '',
              tipo_unidade: row.tipo_unidade || localMap[row.produto_id]?.tipo_unidade || 'unidade',
              peso_por_unidade: row.peso_por_unidade || localMap[row.produto_id]?.peso_por_unidade || '',
              tempo_preparo: row.tempo_preparo || localMap[row.produto_id]?.tempo_preparo || '',
              modo_preparo: row.modo_preparo || localMap[row.produto_id]?.modo_preparo || '',
              observacoes: row.observacoes || localMap[row.produto_id]?.observacoes || ''
            };
          }
        });
        setLocal(STORAGE_KEYS.RECEITAS_METADATA, localMap);
      }
    } catch (e) {
      console.warn('Falha ao buscar metadados de receitas no Supabase:', e);
    }
  }

  return localMap;
}

export async function saveReceitaMetadata(meta: ReceitaMetadata): Promise<void> {
  const localMap = getLocal<Record<string, ReceitaMetadata>>(STORAGE_KEYS.RECEITAS_METADATA, {});
  localMap[meta.produto_id] = {
    ...localMap[meta.produto_id],
    ...meta
  };
  setLocal(STORAGE_KEYS.RECEITAS_METADATA, localMap);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fichas_atualizadas'));
  }
}

export async function saveReceitaCompleta(
  produtoId: string, 
  ingredientes: Array<{ 
    insumo_id: string; 
    quantidade_utilizada: number; 
    unidade_medida?: 'g' | 'kg' | 'ml' | 'l' | 'un';
    quantidade_original?: number;
  }>,
  rendimento: number = 1,
  metadata?: Partial<ReceitaMetadata>
): Promise<FichaTecnica[]> {
  const rendimentoLimpo = (rendimento && rendimento > 0) ? Number(rendimento) : 1;
  const currentList = getLocal<FichaTecnica[]>(STORAGE_KEYS.FICHAS_TECNICAS, []);
  const semEsseProduto = currentList.filter(x => x.produto_id !== produtoId);
  const insumos = getLocal<Insumo[]>(STORAGE_KEYS.INSUMOS, []);
  
  const novosItens: FichaTecnica[] = ingredientes
    .filter(ing => ing.insumo_id && (Number(ing.quantidade_original ?? ing.quantidade_utilizada) > 0))
    .map((ing) => {
      const isRec = ing.insumo_id.startsWith('receita:');
      const ins = isRec ? null : insumos.find(i => i.id === ing.insumo_id);
      const subFicha = isRec ? currentList.find(f => f.produto_id === ing.insumo_id.replace('receita:', '')) : null;
      const subUnidadeBase = (subFicha?.unidade_medida || 'un') as 'g' | 'kg' | 'ml' | 'l' | 'un';
      const baseUnit = isRec ? subUnidadeBase : (ins?.unidade_medida || 'un');

      const qtdDigitada = Number(ing.quantidade_original ?? ing.quantidade_utilizada);
      const unidadeEscolhida = ing.unidade_medida || baseUnit;
      const qtdNormalizadaBase = converterParaUnidadeBase(qtdDigitada, unidadeEscolhida, baseUnit);

      return {
        id: generateUuid(),
        produto_id: produtoId,
        insumo_id: ing.insumo_id,
        quantidade_utilizada: qtdNormalizadaBase,
        rendimento_unidades: rendimentoLimpo,
        unidade_medida: unidadeEscolhida,
        quantidade_original: qtdDigitada
      };
    });
  
  const atualizado = [...semEsseProduto, ...novosItens];
  setLocal(STORAGE_KEYS.FICHAS_TECNICAS, atualizado);

  // Se foram informados metadados da Ficha Técnica Moreira Sales, salvar também
  if (metadata) {
    const metaCompleto: ReceitaMetadata = {
      produto_id: produtoId,
      responsavel: metadata.responsavel || '',
      codigo: metadata.codigo || '',
      data: metadata.data || '',
      rendimento_cru: metadata.rendimento_cru || '',
      rendimento_assado: metadata.rendimento_assado || '',
      rendimento_total: metadata.rendimento_total || `${rendimentoLimpo} ${metadata.tipo_unidade || 'unidades'}`,
      quebra: metadata.quebra || '',
      tipo_unidade: metadata.tipo_unidade || 'unidade',
      peso_por_unidade: metadata.peso_por_unidade || '',
      tempo_preparo: metadata.tempo_preparo || '',
      modo_preparo: metadata.modo_preparo || '',
      observacoes: metadata.observacoes || ''
    };
    await saveReceitaMetadata(metaCompleto);
  }

  // 1. Recalcular o custo unitário real de produção do produto com matemática exata
  const custoUnitarioCalculado = calcularCustoUnitarioProduto(produtoId, atualizado, insumos);

  // 2. Atualizar imediatamente o produto no cache local
  const produtos = getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []);
  const prodExiste = produtos.find(p => p.id === produtoId);
  if (prodExiste) {
    const updatedProdutos = produtos.map(p => p.id === produtoId ? { ...p, custo: custoUnitarioCalculado } : p);
    setLocal(STORAGE_KEYS.PRODUTOS, updatedProdutos);
  }

  // 3. Sincronizar receita no Supabase utilizando rigorosamente as colunas existentes no banco
  if (isSupabaseConfigured && supabase) {
    try {
      if (novosItens.length === 0) {
        await supabase.from('fichas_tecnicas').delete().eq('produto_id', produtoId);
      } else {
        const nomeReceita = prodExiste ? `Receita - ${prodExiste.nome}` : `Receita - ${produtoId}`;
        const insumosPayload = novosItens.map(x => ({
          insumo_id: x.insumo_id,
          quantidade_utilizada: x.quantidade_utilizada,
          unidade_utilizada: x.unidade_medida,
          unidade_medida: x.unidade_medida,
          quantidade_original: x.quantidade_original
        }));

        const { error: upsertError } = await supabase.from('fichas_tecnicas').upsert({
          id: 'ficha-' + produtoId,
          produto_id: produtoId,
          nome: nomeReceita,
          rendimento_unidades: rendimentoLimpo,
          tempo_preparo_minutos: 0,
          custo_mao_obra: custoUnitarioCalculado,
          margem_lucro_desejada: 100,
          insumos: insumosPayload
        });

        if (upsertError) {
          console.warn('Erro ao salvar receita no Supabase:', upsertError.message);
        }
      }
    } catch (e) {
      console.warn('Falha ao salvar receita completa no Supabase:', e);
    }
  }

  // 4. Emitir eventos de atualização para que toda a UI reaja instantaneamente
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('produtos_atualizados'));
    window.dispatchEvent(new CustomEvent('catalogo_atualizado'));
    window.dispatchEvent(new CustomEvent('fichas_atualizadas'));
  }

  return atualizado;
}

export async function deleteReceitaCompleta(produtoId: string): Promise<void> {
  const currentList = getLocal<FichaTecnica[]>(STORAGE_KEYS.FICHAS_TECNICAS, []);
  const atualizado = currentList.filter(x => x.produto_id !== produtoId);
  setLocal(STORAGE_KEYS.FICHAS_TECNICAS, atualizado);

  // Limpar metadados associados à receita
  const currentMeta = getLocal<Record<string, ReceitaMetadata>>(STORAGE_KEYS.RECEITAS_METADATA, {});
  if (currentMeta[produtoId]) {
    delete currentMeta[produtoId];
    setLocal(STORAGE_KEYS.RECEITAS_METADATA, currentMeta);
  }

  // Zerar o custo de produção do produto desvinculado no cache local
  const produtos = getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []);
  const prodExiste = produtos.find(p => p.id === produtoId);
  if (prodExiste) {
    const updatedProdutos = produtos.map(p => p.id === produtoId ? { ...p, custo: 0 } : p);
    setLocal(STORAGE_KEYS.PRODUTOS, updatedProdutos);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('fichas_tecnicas').delete().eq('produto_id', produtoId);
    } catch (e) {
      console.warn('Falha ao excluir receita completa no Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('produtos_atualizados'));
    window.dispatchEvent(new CustomEvent('catalogo_atualizado'));
    window.dispatchEvent(new CustomEvent('fichas_atualizadas'));
  }
}

export async function deleteFichaTecnica(id: string): Promise<void> {
  const list = getLocal<FichaTecnica[]>(STORAGE_KEYS.FICHAS_TECNICAS, []);
  const target = list.find(x => x.id === id);
  const updated = list.filter(x => x.id !== id);
  setLocal(STORAGE_KEYS.FICHAS_TECNICAS, updated);

  if (target) {
    const insumos = getLocal<Insumo[]>(STORAGE_KEYS.INSUMOS, []);
    const novoCusto = calcularCustoUnitarioProduto(target.produto_id, updated, insumos);
    const produtos = getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []);
    const updatedProdutos = produtos.map(p => p.id === target.produto_id ? { ...p, custo: novoCusto } : p);
    setLocal(STORAGE_KEYS.PRODUTOS, updatedProdutos);
  }

  if (target && isSupabaseConfigured && supabase) {
    try {
      const restantes = updated.filter(x => x.produto_id === target.produto_id);
      if (restantes.length === 0) {
        await supabase.from('fichas_tecnicas').delete().eq('produto_id', target.produto_id);
      } else {
        const produtos = getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []);
        const prod = produtos.find(p => p.id === target.produto_id);
        const nomeReceita = prod ? `Receita - ${prod.nome}` : `Receita - ${target.produto_id}`;
        const rendimento = restantes[0]?.rendimento_unidades || 1;
        const insumos = getLocal<Insumo[]>(STORAGE_KEYS.INSUMOS, []);
        const novoCusto = calcularCustoUnitarioProduto(target.produto_id, updated, insumos);

        await supabase.from('fichas_tecnicas').upsert({
          id: 'ficha-' + target.produto_id,
          produto_id: target.produto_id,
          nome: nomeReceita,
          rendimento_unidades: rendimento,
          tempo_preparo_minutos: 0,
          custo_mao_obra: novoCusto,
          margem_lucro_desejada: 100,
          insumos: restantes.map(x => ({
            insumo_id: x.insumo_id,
            quantidade_utilizada: x.quantidade_utilizada,
            unidade_medida: x.unidade_medida,
            unidade_utilizada: x.unidade_medida,
            quantidade_original: x.quantidade_original
          }))
        });
      }
    } catch (e) {
      console.warn('Falha ao atualizar ficha no Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('produtos_atualizados'));
    window.dispatchEvent(new CustomEvent('catalogo_atualizado'));
    window.dispatchEvent(new CustomEvent('fichas_atualizadas'));
  }
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
  
  // Recalcular custos de produção de todos os produtos com receitas
  recalcularTodosCustosProdutos();

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
  // Tabela compras no Supabase não possui colunas fiscais dedicadas; vínculo oficial fica em notas_fiscais.compra_id
  const compras = getLocal<Compra[]>(STORAGE_KEYS.COMPRAS, []);
  const updated = compras.map(c => c.id === compraId ? { ...c, ...dadosFiscal } : c);
  setLocal(STORAGE_KEYS.COMPRAS, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('compras_atualizadas'));
  }
}

