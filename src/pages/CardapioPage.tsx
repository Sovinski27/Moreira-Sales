import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchCategorias, fetchProdutos } from '../services/db';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Categoria, Produto, ItemCarrinho } from '../types';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Check, 
  ChevronLeft, 
  UtensilsCrossed, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  Coffee, 
  Sparkles,
  MessageSquare,
  Search,
  X,
  FileText,
  User
} from 'lucide-react';

export const CardapioPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const mesaQuery = searchParams.get('mesa') || '';
  const [mesa, setMesa] = useState<string>(mesaQuery);
  const [mesaInput, setMesaInput] = useState<string>('');
  
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas');
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [cart, setCart] = useState<ItemCarrinho[]>([]);
  
  // Modais e gavetas
  const [itemObservacao, setItemObservacao] = useState<{ produto: Produto; obs: string } | null>(null);
  const [drawerCarrinhoAberto, setDrawerCarrinhoAberto] = useState(false);
  const [drawerComandaAberto, setDrawerComandaAberto] = useState(false);
  
  // Identificação do cliente
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Status de pedidos enviados
  const [pedidosMesa, setPedidosMesa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar dados do catálogo
  useEffect(() => {
    async function loadData() {
      const cats = await fetchCategorias();
      const prods = await fetchProdutos();
      setCategorias(cats.sort((a, b) => a.ordem - b.ordem));
      setProdutos(prods.filter(p => p.ativo));
      setLoading(false);
    }
    loadData();
  }, []);

  // Carregar e escutar pedidos já feitos nesta mesa
  useEffect(() => {
    if (!mesa || !isSupabaseConfigured || !supabase) return;

    const carregarPedidosMesa = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          status,
          valor_total,
          observacoes,
          criado_em,
          itens_pedido (
            id,
            quantidade,
            preco_unitario,
            produtos ( nome )
          )
        `)
        .eq('origem', 'Mesa')
        .eq('identificador_origem', mesa)
        .neq('status', 'Pago')
        .order('criado_em', { ascending: false });

      if (!error && data) {
        setPedidosMesa(data);
      }
    };

    carregarPedidosMesa();

    const channel = supabase
      .channel(`pedidos-mesa-${mesa}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos',
          filter: `identificador_origem=eq.${mesa}`,
        },
        () => {
          carregarPedidosMesa();
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [mesa]);

  // Manipulação do Carrinho
  const handleAddToCart = (produto: Produto, observacao?: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.produto.id === produto.id && (item.observacao || '') === (observacao || ''));
      if (existing) {
        return prev.map(item => 
          item.id_temp === existing.id_temp 
            ? { ...item, quantidade: item.quantidade + 1, subtotal: (item.quantidade + 1) * item.produto.preco }
            : item
        );
      }
      return [
        ...prev, 
        { 
          id_temp: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, 
          produto, 
          quantidade: 1, 
          subtotal: produto.preco,
          observacao: observacao?.trim() || undefined
        }
      ];
    });
    setItemObservacao(null);
  };

  const handleUpdateQuantity = (id_temp: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id_temp === id_temp) {
          const novaQtd = item.quantidade + delta;
          if (novaQtd <= 0) return null;
          return { ...item, quantidade: novaQtd, subtotal: novaQtd * item.produto.preco };
        }
        return item;
      }).filter(Boolean) as ItemCarrinho[];
    });
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const cartCount = cart.reduce((acc, item) => acc + item.quantidade, 0);

  // Enviar Pedido para a Cozinha
  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    
    try {
      if (isSupabaseConfigured && supabase) {
        const observacoesGerais = cart
          .filter(i => i.observacao)
          .map(i => `${i.produto.nome}: "${i.observacao}"`)
          .join(' | ');

        let currentClienteId = clienteId;
        const numWhats = whatsapp.replace(/\D/g, '');
        const nomeFinal = nome.trim() || `Cliente (Mesa ${mesa || '1'})`;

        // Se por acaso preencheu o whatsapp só no carrinho, e ainda não temos clienteId, tenta resolver agora
        if (!currentClienteId && numWhats.length >= 10) {
          const { data: existing } = await supabase.from('clientes').select('id').eq('whatsapp', numWhats).maybeSingle();
          if (existing) {
            currentClienteId = existing.id;
            setClienteId(existing.id);
          } else {
            const { data: newClient } = await supabase.from('clientes').insert({
              nome: nomeFinal,
              whatsapp: numWhats
            }).select('id').single();
            if (newClient) {
              currentClienteId = newClient.id;
              setClienteId(newClient.id);
            }
          }
        }

        const { data: novoPedido, error: erroPedido } = await supabase
          .from('pedidos')
          .insert({
            cliente_id: currentClienteId,
            origem: 'Mesa',
            identificador_origem: mesa,
            status: 'Pendente',
            valor_total: cartTotal,
            observacoes: observacoesGerais || null,
            cliente_nome: nomeFinal,
            cliente_whatsapp: numWhats || null,
            criado_em: new Date().toISOString()
          })
          .select()
          .single();
          
        if (erroPedido) throw erroPedido;
        
        if (novoPedido) {
          const itensParaInserir = cart.map(i => ({
            pedido_id: novoPedido.id,
            produto_id: i.produto.id,
            quantidade: i.quantidade,
            preco_unitario: i.produto.preco,
            subtotal: i.subtotal
          }));
          const { error: erroItens } = await supabase.from('itens_pedido').insert(itensParaInserir);
          if (erroItens) throw erroItens;
        }
      }
      
      setCart([]);
      setDrawerCarrinhoAberto(false);
      setDrawerComandaAberto(true);
    } catch (e) {
      console.error('Erro ao enviar pedido:', e);
      alert('Houve um erro ao enviar seu pedido para a cozinha. Por favor, tente novamente ou chame o garçom.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtragem dos produtos
  const produtosFiltrados = useMemo(() => {
    return produtos.filter(prod => {
      const matchCategoria = categoriaAtiva === 'todas' || prod.categoria_id === categoriaAtiva;
      const matchBusca = !termoBusca.trim() || prod.nome.toLowerCase().includes(termoBusca.toLowerCase());
      return matchCategoria && matchBusca;
    });
  }, [produtos, categoriaAtiva, termoBusca]);

  // Imagens ilustrativas de panificadora por categoria/tipo
  const getProductImage = (nome: string, catId: string) => {
    const n = nome.toLowerCase();
    if (n.includes('café') || n.includes('expresso') || n.includes('pingado')) {
      return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80';
    }
    if (n.includes('cappuccino')) {
      return 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&auto=format&fit=crop&q=80';
    }
    if (n.includes('pão') || n.includes('queijo') || n.includes('chapa')) {
      return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80';
    }
    if (n.includes('coxinha') || n.includes('esfiha') || n.includes('salgado')) {
      return 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&auto=format&fit=crop&q=80';
    }
    if (n.includes('bolo') || n.includes('sonho') || n.includes('doce')) {
      return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&auto=format&fit=crop&q=80';
  };

  const [sessaoIniciada, setSessaoIniciada] = useState<boolean>(!!mesaQuery);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [isLoadingCRM, setIsLoadingCRM] = useState<boolean>(false);

  const handleSelecionarMesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mesaInput.trim()) {
      setIsLoadingCRM(true);
      
      try {
        let finalClienteId = null;
        const numWhats = whatsapp.replace(/\D/g, '');
        
        if (numWhats.length >= 10 && isSupabaseConfigured && supabase) {
          // Busca cliente existente
          const { data: existing } = await supabase
            .from('clientes')
            .select('id, nome')
            .eq('whatsapp', numWhats)
            .maybeSingle();

          if (existing) {
            finalClienteId = existing.id;
            if (!nome.trim()) setNome(existing.nome); // Auto-preenche nome se vazio
          } else {
            // Cadastra novo cliente
            const { data: newClient } = await supabase
              .from('clientes')
              .insert({
                nome: nome.trim() || 'Cliente (Mesa)',
                whatsapp: numWhats
              })
              .select('id')
              .single();

            if (newClient) {
              finalClienteId = newClient.id;
            }
          }
        }
        
        setClienteId(finalClienteId);
      } catch (err) {
        console.error('Erro na integração com CRM:', err);
      } finally {
        setIsLoadingCRM(false);
        setMesa(mesaInput.trim());
        setSearchParams({ mesa: mesaInput.trim() });
        setSessaoIniciada(true);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-amber-600 mx-auto mb-3" />
          <p className="text-stone-600 font-medium">Carregando cardápio fresquinho...</p>
        </div>
      </div>
    );
  }

  // TELA DE SELEÇÃO DE MESA / IDENTIFICAÇÃO (CASO ACESSE SEM O QR CODE NA URL)
  if (!sessaoIniciada) {
    return (
      <div className="flex flex-col min-h-screen bg-stone-100 p-6 items-center justify-center text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 mix-blend-overlay">
          <img 
            src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&auto=format&fit=crop&q=80" 
            alt="Fundo" 
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl max-w-sm w-full space-y-6 relative z-10 border border-stone-200">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600 mb-2 shadow-inner">
            <UtensilsCrossed size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-stone-800 tracking-tight">Bem-vindo(a)!</h1>
            <p className="text-stone-500 mt-2 text-sm">Preencha os dados abaixo para iniciar seu atendimento na mesa.</p>
          </div>
          
          <form onSubmit={handleSelecionarMesa} className="space-y-4 pt-2 text-left">
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1.5">Número da Mesa *</label>
              <input 
                type="number"
                placeholder="Ex: 5"
                value={mesaInput}
                onChange={e => setMesaInput(e.target.value)}
                className="w-full text-center text-xl font-black bg-stone-50 p-3 border-2 border-stone-200 rounded-2xl focus:border-amber-500 focus:bg-white outline-none transition-all placeholder-stone-300"
                required
                min="1"
              />
            </div>
            
            <div className="pt-2 border-t border-stone-100 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1.5">Nome e Sobrenome (Opcional)</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input 
                    type="text"
                    placeholder="Ex: João da Silva"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl pl-10 pr-3 py-3 text-sm font-bold outline-none focus:bg-white focus:border-amber-500 transition-all placeholder-stone-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1.5">WhatsApp (Opcional)</label>
                <input 
                  type="tel"
                  placeholder="(DD) 90000-0000"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-3.5 py-3 text-sm font-medium outline-none focus:bg-white focus:border-amber-500 transition-all font-mono placeholder-stone-400"
                />
                <p className="text-[10px] text-stone-400 mt-1.5 text-center leading-tight">Preencha seu número para acumular pontos de fidelidade no fechamento e receber brindes no futuro!</p>
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={!mesaInput.trim()}
              className="w-full py-4 mt-2 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white font-black rounded-2xl shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center"
            >
              Acessar Cardápio <ChevronLeft className="w-5 h-5 ml-2 rotate-180" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 pb-28 font-sans">
      
      {/* 1. HERO BANNER COM IDENTIDADE DA PANIFICADORA */}
      <div className="relative bg-stone-900 text-white">
        <div className="absolute inset-0 opacity-40 mix-blend-overlay overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&auto=format&fit=crop&q=80" 
            alt="Pães e café" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-lg mx-auto p-5 pt-7 pb-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mb-2 border border-amber-400/30">
                <Sparkles className="w-3 h-3" /> Tradição & Sabor
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                Moreira Sales
              </h1>
              <p className="text-stone-300 text-xs font-medium mt-0.5">
                Panificadora & Confeitaria • Umuarama - PR
              </p>
            </div>

            {/* BADGE DA MESA / COMANDA */}
            <div className="flex flex-col items-end gap-2">
              <div className="bg-amber-600 text-white px-3.5 py-1.5 rounded-2xl shadow-lg flex items-center gap-1.5 font-black text-sm border-2 border-amber-400">
                <UtensilsCrossed className="w-4 h-4" />
                <span>MESA {mesa}</span>
              </div>
              {pedidosMesa.length > 0 && (
                <button
                  onClick={() => setDrawerComandaAberto(true)}
                  className="text-xs bg-white/20 hover:bg-white/30 text-white font-bold px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 backdrop-blur-sm"
                >
                  <FileText className="w-3 h-3" />
                  Ver Comanda ({pedidosMesa.length})
                </button>
              )}
            </div>
          </div>

          {/* CAMPO DE BUSCA RÁPIDA */}
          <div className="mt-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input 
              type="text"
              placeholder="Buscar pão, café, salgado..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full bg-white/95 text-stone-800 placeholder-stone-400 text-sm font-medium rounded-2xl pl-10 pr-10 py-3 outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
            {termoBusca && (
              <button 
                onClick={() => setTermoBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. CARROSSEL HORIZONTAL DE CATEGORIAS (STICKY) */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center gap-2 overflow-x-auto p-3 no-scrollbar">
          <button
            onClick={() => setCategoriaAtiva('todas')}
            className={`px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all ${
              categoriaAtiva === 'todas'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Todos os Itens
          </button>
          {categorias.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoriaAtiva(cat.id)}
              className={`px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all ${
                categoriaAtiva === cat.id
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat.nome}
            </button>
          ))}
        </div>
      </div>

      {/* 3. LISTAGEM DE PRODUTOS */}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {produtosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl p-6 border border-stone-200">
            <Coffee className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <p className="font-bold text-stone-700">Nenhum produto encontrado</p>
            <p className="text-xs text-stone-400 mt-1">Tente buscar por outro termo ou categoria.</p>
          </div>
        ) : (
          produtosFiltrados.map(produto => {
            const qtdNoCarrinho = cart
              .filter(i => i.produto.id === produto.id)
              .reduce((acc, i) => acc + i.quantidade, 0);

            return (
              <div 
                key={produto.id}
                className="bg-white rounded-3xl p-3.5 sm:p-4 shadow-sm border border-stone-200/80 flex gap-3.5 items-center hover:border-amber-300 transition-all"
              >
                {/* Imagem do Produto */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-stone-100 shrink-0 relative">
                  <img 
                    src={produto.foto_url || getProductImage(produto.nome, produto.categoria_id)} 
                    alt={produto.nome}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {qtdNoCarrinho > 0 && (
                    <span className="absolute top-1 right-1 bg-amber-600 text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                      {qtdNoCarrinho}
                    </span>
                  )}
                </div>

                {/* Detalhes do Produto */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-stone-800 text-base leading-snug">
                    {produto.nome}
                  </h3>
                  <p className="text-xs text-stone-400 line-clamp-1 mt-0.5">
                    {produto.descricao || 'Receita tradicional da nossa padaria'}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-amber-700 font-mono font-black text-lg">
                      R$ {produto.preco.toFixed(2)}
                    </span>

                    <button
                      onClick={() => setItemObservacao({ produto, obs: '' })}
                      className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Pedir
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. MODAL PARA ADICIONAR OBSERVAÇÃO AO PRODUTO */}
      {itemObservacao && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Personalize seu pedido</span>
                <h3 className="text-xl font-black text-stone-800 mt-0.5">{itemObservacao.produto.nome}</h3>
                <p className="text-amber-700 font-mono font-black">R$ {itemObservacao.produto.preco.toFixed(2)}</p>
              </div>
              <button 
                onClick={() => setItemObservacao(null)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1.5 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> Alguma observação especial?
              </label>
              <textarea
                placeholder="Ex: sem açúcar, pão bem tostadinho, café bem quente..."
                value={itemObservacao.obs}
                onChange={(e) => setItemObservacao({ ...itemObservacao, obs: e.target.value })}
                rows={3}
                className="w-full p-3.5 bg-stone-50 border border-stone-300 rounded-2xl text-sm outline-none focus:border-amber-600 focus:bg-white resize-none"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setItemObservacao(null)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleAddToCart(itemObservacao.produto, itemObservacao.obs)}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-sm shadow-md shadow-amber-600/30 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Adicionar ao Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. GAVETA / DRAWER DO CARRINHO (REVISÃO & ENVIAR PARA COZINHA) */}
      {drawerCarrinhoAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
            
            {/* Header Drawer */}
            <div className="p-5 border-b border-stone-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-black text-stone-800">Seu Pedido • Mesa {mesa}</h2>
              </div>
              <button 
                onClick={() => setDrawerCarrinhoAberto(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista do Carrinho */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {cart.map(item => (
                <div key={item.id_temp} className="p-3 bg-stone-50 rounded-2xl border border-stone-200/60 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-800 text-sm truncate">{item.produto.nome}</p>
                    {item.observacao && (
                      <p className="text-xs text-amber-800 font-medium italic truncate">
                        "{item.observacao}"
                      </p>
                    )}
                    <p className="text-xs font-mono font-bold text-stone-500 mt-0.5">
                      R$ {item.produto.preco.toFixed(2)} un.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-stone-200 shrink-0">
                    <button 
                      onClick={() => handleUpdateQuantity(item.id_temp, -1)}
                      className="text-stone-500 hover:text-stone-800 p-1"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold font-mono text-sm w-4 text-center">{item.quantidade}</span>
                    <button 
                      onClick={() => handleUpdateQuantity(item.id_temp, 1)}
                      className="text-stone-500 hover:text-stone-800 p-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="font-black font-mono text-amber-700 text-sm w-16 text-right shrink-0">
                    R$ {item.subtotal.toFixed(2)}
                  </span>
                </div>
              ))}

              {/* Identificação do Cliente */}
              <div className="pt-3 border-t border-stone-100 space-y-3">
                <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Identificação rápida</p>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Nome e Sobrenome (Opcional)</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input 
                      type="text"
                      placeholder="Ex: João da Silva"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold outline-none focus:bg-white focus:border-amber-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">WhatsApp (Opcional - para pontuar fidelidade)</label>
                  <input 
                    type="tel"
                    placeholder="(44) 99876-5432"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:bg-white focus:border-amber-600 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Rodapé Drawer */}
            <div className="p-5 border-t border-stone-100 bg-stone-50 shrink-0 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Total deste pedido</span>
                <span className="text-2xl font-black font-mono text-stone-800">
                  R$ {cartTotal.toFixed(2)}
                </span>
              </div>

              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting || !nome.trim() || cart.length === 0}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white font-black text-base rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Enviar Pedido para a Cozinha
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6. GAVETA DA COMANDA DA MESA (PEDIDOS EM ANDAMENTO NA COZINHA) */}
      {drawerComandaAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
            
            <div className="p-5 border-b border-stone-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-lg font-black text-stone-800 flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-amber-600" />
                  Comanda da Mesa {mesa}
                </h2>
                <p className="text-xs text-stone-400">Acompanhe seus pedidos em tempo real</p>
              </div>
              <button 
                onClick={() => setDrawerComandaAberto(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {pedidosMesa.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-stone-500 font-medium">Nenhum pedido ativo no momento.</p>
                </div>
              ) : (
                pedidosMesa.map((ped, idx) => {
                  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
                    'Pendente': { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Na Fila da Cozinha' },
                    'Em Preparo': { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Em Preparo pelo Chef' },
                    'Pronto': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Pronto / Entregue' }
                  };
                  const st = statusColors[ped.status] || { bg: 'bg-stone-50 border-stone-200', text: 'text-stone-700', label: ped.status };

                  return (
                    <div key={ped.id} className={`p-4 rounded-2xl border ${st.bg} space-y-2`}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-stone-500">
                          Comanda #{idx + 1}
                        </span>
                        <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-white shadow-sm ${st.text}`}>
                          {st.label}
                        </span>
                      </div>

                      <ul className="text-sm space-y-1 text-stone-800 font-medium">
                        {ped.itens_pedido?.map((it: any) => (
                          <li key={it.id} className="flex justify-between">
                            <span>{it.quantidade}x {it.produtos?.nome || 'Item'}</span>
                            <span className="font-mono text-stone-500">R$ {(it.preco_unitario * it.quantidade).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>

                      {ped.observacoes && (
                        <p className="text-xs text-stone-500 italic bg-white/60 p-2 rounded-xl">
                          Obs: {ped.observacoes}
                        </p>
                      )}

                      <div className="pt-2 border-t border-black/5 flex justify-between items-center text-xs">
                        <span className="font-bold text-stone-500">Subtotal</span>
                        <span className="font-black font-mono text-stone-900 text-sm">
                          R$ {Number(ped.valor_total).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Total Geral da Mesa */}
            <div className="p-5 border-t border-stone-100 bg-stone-50 shrink-0 space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Total Consolidado da Mesa</p>
                  <p className="text-[11px] text-stone-500">Pague no Caixa ao encerrar seu consumo</p>
                </div>
                <span className="text-2xl font-black font-mono text-stone-800">
                  R$ {pedidosMesa.reduce((acc, p) => acc + Number(p.valor_total), 0).toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => setDrawerComandaAberto(false)}
                className="w-full py-3 bg-stone-800 text-white font-bold rounded-xl text-sm"
              >
                Continuar Pedindo
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. BARRA INFERIOR FIXA COM RESUMO DO CARRINHO (STICKY BOTTOM BAR) */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-3.5 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-2xl z-30 animate-slideUp">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-black relative shadow-md shadow-amber-600/30">
                <ShoppingCart className="w-6 h-6" />
                <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[11px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white font-black">
                  {cartCount}
                </span>
              </div>
              <div>
                <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">Seu Carrinho</p>
                <p className="text-lg font-black font-mono text-stone-800 leading-tight">
                  R$ {cartTotal.toFixed(2)}
                </p>
              </div>
            </div>

            <button
              onClick={() => setDrawerCarrinhoAberto(true)}
              className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold px-6 py-3.5 rounded-2xl text-sm shadow-lg shadow-amber-600/30 flex items-center gap-2 transition-all"
            >
              Ver Pedido
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
