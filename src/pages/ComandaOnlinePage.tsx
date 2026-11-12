import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Store, 
  ShoppingBag, 
  Search, 
  Plus, 
  Minus, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  CheckCircle2, 
  MapPin, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Send, 
  Copy, 
  MessageSquare, 
  RotateCcw, 
  Trash2, 
  X, 
  AlertCircle,
  Clock,
  Sparkles,
  Phone,
  User,
  Coffee,
  CheckCheck
} from 'lucide-react';
import { Produto, Categoria, ItemPedidoCozinha, PedidoOnline, FormaPagamentoOnline } from '../types';
import { 
  fetchProdutos, 
  fetchCategorias, 
  savePedidoOnline, 
  getLocal, 
  STORAGE_KEYS 
} from '../services/db';
import { cleanPhone, formatPhoneDisplay, getWhatsAppUrl, WHATSAPP_PANIFICADORA, WHATSAPP_PANIFICADORA_DISPLAY } from '../services/whatsapp';
import { Footer } from '../components/Footer';

interface ComandaOnlinePageProps {
  isStandalone?: boolean;
  onVoltarAoCaixa?: () => void;
}

type EtapaPedido = 'identificacao' | 'cardapio' | 'entrega_pagamento' | 'sucesso';

export const ComandaOnlinePage: React.FC<ComandaOnlinePageProps> = ({
  isStandalone = false,
  onVoltarAoCaixa
}) => {
  // Catálogo com hidratação instantânea
  const [produtos, setProdutos] = useState<Produto[]>(() => getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []));
  const [categorias, setCategorias] = useState<Categoria[]>(() => getLocal<Categoria[]>(STORAGE_KEYS.CATEGORIAS, []));
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todos');
  const [termoBusca, setTermoBusca] = useState<string>('');

  // Etapa do fluxo
  const [etapa, setEtapa] = useState<EtapaPedido>('identificacao');

  // 1. Identificação Obrigatória (Nome e Sobrenome + WhatsApp)
  const [nomeCompleto, setNomeCompleto] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [erroIdentificacao, setErroIdentificacao] = useState<string | null>(null);

  // 2. Itens do Pedido (Carrinho Online)
  const [carrinho, setCarrinho] = useState<ItemPedidoCozinha[]>([]);
  const [modalObsItem, setModalObsItem] = useState<{ produto: Produto; observacao: string } | null>(null);

  // 3. Modalidade, Local de Entrega e Pagamento
  const [tipoAtendimento, setTipoAtendimento] = useState<'retirada' | 'entrega'>('entrega');
  const [rua, setRua] = useState<string>('');
  const [numero, setNumero] = useState<string>('');
  const [bairro, setBairro] = useState<string>('');
  const [complemento, setComplemento] = useState<string>('');
  const [pontoReferencia, setPontoReferencia] = useState<string>('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoOnline>('pix');
  const [trocoPara, setTrocoPara] = useState<string>('');
  const [observacoesGerais, setObservacoesGerais] = useState<string>('');
  const [erroCheckout, setErroCheckout] = useState<string | null>(null);
  const [isFinalizando, setIsFinalizando] = useState<boolean>(false);

  // 4. Pedido Concluído e Mensagem
  const [pedidoConcluido, setPedidoConcluido] = useState<PedidoOnline | null>(null);
  const [copiado, setCopiado] = useState<boolean>(false);

  // Carregar produtos e categorias
  useEffect(() => {
    fetchProdutos().then(setProdutos);
    fetchCategorias().then(setCategorias);

    const handleAtualizacao = () => {
      fetchProdutos().then(setProdutos);
      fetchCategorias().then(setCategorias);
    };

    window.addEventListener('catalogo_atualizado', handleAtualizacao);
    window.addEventListener('produtos_atualizados', handleAtualizacao);
    window.addEventListener('categorias_atualizadas', handleAtualizacao);
    window.addEventListener('storage', handleAtualizacao);

    return () => {
      window.removeEventListener('catalogo_atualizado', handleAtualizacao);
      window.removeEventListener('produtos_atualizados', handleAtualizacao);
      window.removeEventListener('categorias_atualizadas', handleAtualizacao);
      window.removeEventListener('storage', handleAtualizacao);
    };
  }, []);

  // Total do carrinho
  const totalCarrinho = useMemo(() => {
    return carrinho.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  }, [carrinho]);

  const quantidadeTotalItens = useMemo(() => {
    return carrinho.reduce((sum, item) => sum + item.quantidade, 0);
  }, [carrinho]);

  // Produtos filtrados por categoria e busca
  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      if (!p.ativo) return false;
      if (categoriaAtiva !== 'todos' && p.categoria_id !== categoriaAtiva) return false;
      if (termoBusca.trim()) {
        const termo = termoBusca.toLowerCase();
        const nomeMatch = p.nome.toLowerCase().includes(termo);
        const cat = categorias.find(c => c.id === p.categoria_id);
        const catMatch = cat ? cat.nome.toLowerCase().includes(termo) : false;
        if (!nomeMatch && !catMatch) return false;
      }
      return true;
    });
  }, [produtos, categorias, categoriaAtiva, termoBusca]);

  // Validação estrita de Nome e Sobrenome
  const validarNomeSobrenome = (nome: string): boolean => {
    const partes = nome.trim().split(/\s+/);
    return partes.length >= 2 && partes[0].length >= 2 && partes[1].length >= 2;
  };

  // Formatar Telefone
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = cleanPhone(e.target.value);
    if (digits.length <= 11) {
      setWhatsapp(formatPhoneDisplay(digits));
    }
  };

  // Avançar da Identificação para o Cardápio
  const handleConfirmarIdentificacao = (e: React.FormEvent) => {
    e.preventDefault();
    setErroIdentificacao(null);

    if (!validarNomeSobrenome(nomeCompleto)) {
      setErroIdentificacao('Por favor, informe seu nome e sobrenome completos (ex: Carlos Silva).');
      return;
    }

    const digits = cleanPhone(whatsapp);
    if (digits.length < 10) {
      setErroIdentificacao('Informe um número de WhatsApp/celular válido com DDD (ex: (44) 99876-5432).');
      return;
    }

    setEtapa('cardapio');
  };

  // Adicionar item ao carrinho
  const adicionarItem = (produto: Produto, observacao?: string) => {
    setCarrinho(prev => {
      const idx = prev.findIndex(i => i.produto_id === produto.id && (i.observacao || '') === (observacao || ''));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantidade += 1;
        copy[idx].subtotal = Number((copy[idx].quantidade * copy[idx].preco_unitario).toFixed(2));
        return copy;
      }
      const novoItem: ItemPedidoCozinha = {
        id_temp: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        produto_id: produto.id,
        nome: produto.nome,
        preco_unitario: Number(produto.preco) || 0,
        quantidade: 1,
        subtotal: Number(produto.preco) || 0,
        observacao: observacao?.trim() || undefined,
        unidade_venda: produto.unidade_venda || 'unidade'
      };
      return [...prev, novoItem];
    });

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
  };

  // Diminuir ou remover item do carrinho
  const removerItem = (produtoId: string, observacao?: string) => {
    setCarrinho(prev => {
      const idx = prev.findIndex(i => i.produto_id === produtoId && (i.observacao || '') === (observacao || ''));
      if (idx >= 0) {
        const copy = [...prev];
        if (copy[idx].quantidade > 1) {
          copy[idx].quantidade -= 1;
          copy[idx].subtotal = Number((copy[idx].quantidade * copy[idx].preco_unitario).toFixed(2));
          return copy;
        } else {
          return copy.filter((_, i) => i !== idx);
        }
      }
      return prev;
    });
  };

  // Finalizar e salvar o pedido
  const handleFinalizarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroCheckout(null);

    if (carrinho.length === 0) {
      setErroCheckout('Seu carrinho está vazio! Adicione pelo menos um produto ao pedido.');
      return;
    }

    if (!validarNomeSobrenome(nomeCompleto)) {
      setErroCheckout('Por favor, informe seu nome e sobrenome completos.');
      setEtapa('identificacao');
      return;
    }

    if (tipoAtendimento === 'entrega') {
      if (!rua.trim() || !numero.trim() || !bairro.trim()) {
        setErroCheckout('Informe o endereço completo de entrega (Rua, Número e Bairro).');
        return;
      }
    }

    setIsFinalizando(true);
    try {
      const novoPedido = await savePedidoOnline({
        clienteNome: nomeCompleto.trim(),
        clienteTelefone: whatsapp,
        tipo: tipoAtendimento,
        endereco: tipoAtendimento === 'entrega' ? {
          rua: rua.trim(),
          numero: numero.trim(),
          bairro: bairro.trim(),
          complemento: complemento.trim() || undefined,
          ponto_referencia: pontoReferencia.trim() || undefined
        } : undefined,
        formaPagamento,
        trocoPara: formaPagamento === 'dinheiro' && trocoPara.trim() ? trocoPara.trim() : undefined,
        itens: carrinho,
        observacoes: observacoesGerais.trim() || undefined
      });

      setPedidoConcluido(novoPedido);
      setEtapa('sucesso');
    } catch (err: any) {
      console.error('Erro ao salvar pedido online:', err);
      setErroCheckout(err?.message || 'Erro ao processar pedido. Tente novamente.');
    } finally {
      setIsFinalizando(false);
    }
  };

  // Copiar mensagem para a área de transferência
  const handleCopiarMensagem = async () => {
    if (!pedidoConcluido?.mensagem_whatsapp) return;
    try {
      await navigator.clipboard.writeText(pedidoConcluido.mensagem_whatsapp);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch (err) {
      console.warn('Erro ao copiar texto:', err);
    }
  };

  // Enviar no WhatsApp oficial da Panificadora Moreira Sales (44 8836-2777)
  const handleEnviarWhatsApp = () => {
    if (!pedidoConcluido?.mensagem_whatsapp) return;
    const url = getWhatsAppUrl(WHATSAPP_PANIFICADORA, pedidoConcluido.mensagem_whatsapp);
    window.location.href = url;
  };

  // Reiniciar formulário para novo pedido
  const handleNovoPedido = () => {
    setCarrinho([]);
    setEtapa('cardapio');
    setPedidoConcluido(null);
    setObservacoesGerais('');
    setComplemento('');
    setPontoReferencia('');
    setTrocoPara('');
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-900 flex flex-col justify-between selection:bg-amber-200">
      
      {/* HEADER SUPERIOR */}
      <header className="bg-white border-b border-stone-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {onVoltarAoCaixa && (
              <button
                type="button"
                onClick={onVoltarAoCaixa}
                className="p-2 -ml-1 text-stone-500 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                title="Voltar ao Caixa"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Store className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight leading-none text-stone-900">
                  Moreira Sales
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  Comanda Online
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium truncate mt-0.5">
                Faça seu pedido diretamente de casa • Retirada ou Entrega
              </p>
            </div>
          </div>

          {/* Indicador de etapas ou carrinho no topo */}
          <div className="flex items-center gap-2 shrink-0">
            {etapa === 'cardapio' && carrinho.length > 0 && (
              <button
                type="button"
                onClick={() => setEtapa('entrega_pagamento')}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Ver Pedido</span>
                <span className="w-5 h-5 rounded-full bg-white/20 text-white text-[11px] font-black flex items-center justify-center">
                  {quantidadeTotalItens}
                </span>
              </button>
            )}

            {etapa !== 'identificacao' && etapa !== 'sucesso' && (
              <div className="text-right hidden sm:block">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Cliente</span>
                <span className="text-xs font-bold text-stone-800 truncate max-w-[150px] block">
                  {nomeCompleto || 'Cliente'}
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Barra de progresso das etapas */}
        <div className="max-w-4xl mx-auto px-4 pb-2.5">
          <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
            <div className={`pb-1 border-b-2 transition-all ${etapa === 'identificacao' ? 'border-amber-600 text-amber-700 font-black' : 'border-stone-200 text-stone-400'}`}>
              1. Identificação
            </div>
            <div className={`pb-1 border-b-2 transition-all ${etapa === 'cardapio' ? 'border-amber-600 text-amber-700 font-black' : etapa === 'entrega_pagamento' || etapa === 'sucesso' ? 'border-emerald-500 text-emerald-700' : 'border-stone-200 text-stone-400'}`}>
              2. Escolher Itens
            </div>
            <div className={`pb-1 border-b-2 transition-all ${etapa === 'entrega_pagamento' ? 'border-amber-600 text-amber-700 font-black' : etapa === 'sucesso' ? 'border-emerald-500 text-emerald-700' : 'border-stone-200 text-stone-400'}`}>
              3. Entrega & Pgto
            </div>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-4xl mx-auto px-4 py-5 flex-1 w-full">

        {/* ========================================================================= */}
        {/* ETAPA 1: IDENTIFICAÇÃO OBRIGATÓRIA (NOME E SOBRENOME)                     */}
        {/* ========================================================================= */}
        {etapa === 'identificacao' && (
          <div className="max-w-md mx-auto my-6 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200/90 animate-fadeIn">
            
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-500/10 text-amber-700 flex items-center justify-center mb-3">
                <User className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-stone-900 tracking-tight">
                Identificação do Cliente
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Nesta comanda online, é obrigatório informar seu nome e sobrenome para organizarmos seu pedido.
              </p>
            </div>

            {erroIdentificacao && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-800 font-semibold animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{erroIdentificacao}</span>
              </div>
            )}

            <form onSubmit={handleConfirmarIdentificacao} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Nome e Sobrenome <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={nomeCompleto}
                    onChange={e => setNomeCompleto(e.target.value)}
                    placeholder="Ex: Maria Oliveira, Carlos Silva"
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm font-bold text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-600 focus:bg-white transition-colors"
                  />
                </div>
                <p className="text-[11px] text-stone-400 mt-1 ml-1">
                  Obrigatório informar nome e sobrenome para envio correto.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  WhatsApp / Telefone para Contato <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={handleTelefoneChange}
                    placeholder="(44) 98888-0000"
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm font-bold text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-600 focus:bg-white transition-colors"
                  />
                </div>
                <p className="text-[11px] text-stone-400 mt-1 ml-1">
                  Utilizado para confirmar e enviar atualizações do pedido.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-98 cursor-pointer"
                >
                  <span>Avançar para o Cardápio</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-center gap-1.5 text-xs text-stone-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Panificadora Moreira Sales • Moreira Sales - PR</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 2: CARDÁPIO ONLINE & SELEÇÃO DE ITENS                               */}
        {/* ========================================================================= */}
        {etapa === 'cardapio' && (
          <div className="space-y-5 animate-fadeIn">
            
            {/* Banner com Identificação do Cliente */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                    Comanda Online Aberta para:
                  </span>
                  <span className="text-sm font-black text-stone-900">
                    {nomeCompleto}
                  </span>
                  <span className="text-xs text-stone-500 ml-2">
                    ({whatsapp})
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEtapa('identificacao')}
                className="text-xs text-amber-700 hover:text-amber-900 underline font-semibold self-start sm:self-auto cursor-pointer"
              >
                Alterar dados
              </button>
            </div>

            {/* Barra de Pesquisa */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={termoBusca}
                onChange={e => setTermoBusca(e.target.value)}
                placeholder="Buscar pães, bolos, cafés, salgados, tortas..."
                className="w-full pl-10 pr-10 py-3 bg-white border border-stone-200 rounded-2xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-600 shadow-2xs"
              />
              {termoBusca && (
                <button
                  type="button"
                  onClick={() => setTermoBusca('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Pílulas de Categorias */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setCategoriaAtiva('todos')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  categoriaAtiva === 'todos'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                Todos os Produtos
              </button>
              {categorias.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoriaAtiva(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    categoriaAtiva === cat.id
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {cat.nome}
                </button>
              ))}
            </div>

            {/* Grade de Produtos */}
            {produtosFiltrados.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-stone-300 rounded-3xl bg-white">
                <Coffee className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-stone-700">Nenhum produto encontrado</h3>
                <p className="text-xs text-stone-400 mt-1">Tente pesquisar com outro termo ou selecionar outra categoria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {produtosFiltrados.map(prod => {
                  const itemNoCarrinho = carrinho.find(i => i.produto_id === prod.id && !i.observacao);
                  const qtdNoCarrinho = carrinho
                    .filter(i => i.produto_id === prod.id)
                    .reduce((sum, i) => sum + i.quantidade, 0);

                  return (
                    <div
                      key={prod.id}
                      className="bg-white rounded-2xl p-3.5 border border-stone-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h4 className="font-bold text-sm text-stone-900 leading-tight">
                            {prod.nome}
                          </h4>
                          <div className="text-right shrink-0">
                            <span className="font-black font-mono text-sm text-amber-800 block">
                              R$ {Number(prod.preco || 0).toFixed(2)}
                            </span>
                            {prod.unidade_venda && (
                              <span className="text-[10px] text-stone-400 font-semibold block">
                                /{prod.unidade_venda}
                              </span>
                            )}
                          </div>
                        </div>
                        {prod.controlar_estoque && (
                          <span className="text-[10px] text-stone-400 block mb-2">
                            Estoque vitrine: {prod.estoque_atual || 0} un
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2 mt-2">
                        {qtdNoCarrinho > 0 ? (
                          <div className="flex items-center gap-1.5 bg-amber-50 p-1 rounded-xl border border-amber-200/60">
                            <button
                              type="button"
                              onClick={() => removerItem(prod.id)}
                              className="w-7 h-7 rounded-lg bg-white text-stone-700 hover:text-amber-700 font-bold flex items-center justify-center border border-stone-200 shadow-2xs active:scale-95 transition-transform"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-7 text-center font-black font-mono text-xs text-amber-900">
                              {qtdNoCarrinho}
                            </span>
                            <button
                              type="button"
                              onClick={() => adicionarItem(prod)}
                              className="w-7 h-7 rounded-lg bg-amber-600 text-white font-bold flex items-center justify-center shadow-2xs hover:bg-amber-700 active:scale-95 transition-transform"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => adicionarItem(prod)}
                            className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-transform active:scale-95 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setModalObsItem({ produto: prod, observacao: '' })}
                          className="p-2 text-stone-400 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer shrink-0"
                          title="Adicionar observação ao item (Ex: Sem cebola)"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* BARRA FIXA FLUTUANTE DE CONTINUAÇÃO */}
            {carrinho.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 p-3 sm:p-4 shadow-lg">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-stone-500 uppercase block">
                      {quantidadeTotalItens} {quantidadeTotalItens === 1 ? 'item no pedido' : 'itens no pedido'}
                    </span>
                    <span className="text-lg sm:text-xl font-black text-stone-900 font-mono">
                      R$ {totalCarrinho.toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEtapa('entrega_pagamento')}
                    className="px-5 sm:px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm flex items-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer"
                  >
                    <span>Avançar para Entrega e Pagamento</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Espaço para não cobrir a barra inferior fixa */}
            {carrinho.length > 0 && <div className="h-20" />}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 3: RETIRADA OU ENTREGA, LOCAL E FORMA DE PAGAMENTO                  */}
        {/* ========================================================================= */}
        {etapa === 'entrega_pagamento' && (
          <div className="space-y-6 max-w-2xl mx-auto animate-fadeIn">
            
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEtapa('cardapio')}
                className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 font-bold p-2 -ml-2 rounded-xl transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao Cardápio</span>
              </button>

              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Cliente: {nomeCompleto}
              </span>
            </div>

            {erroCheckout && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-800 font-semibold animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{erroCheckout}</span>
              </div>
            )}

            <form onSubmit={handleFinalizarPedido} className="space-y-6">

              {/* 1. Escolha da Modalidade */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-2xs space-y-3">
                <label className="block text-xs font-black uppercase tracking-wider text-stone-700">
                  Como deseja receber seu pedido? <span className="text-red-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoAtendimento('entrega')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 ${
                      tipoAtendimento === 'entrega'
                        ? 'border-amber-600 bg-amber-50/50 shadow-xs ring-2 ring-amber-500/20'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tipoAtendimento === 'entrega' ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-stone-900">Entrega em Domicílio</h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">Entregamos quentinho na sua casa ou trabalho</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoAtendimento('retirada')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 ${
                      tipoAtendimento === 'retirada'
                        ? 'border-amber-600 bg-amber-50/50 shadow-xs ring-2 ring-amber-500/20'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tipoAtendimento === 'retirada' ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-stone-900">Retirada no Balcão</h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">Av. Brasil, 1500 - Moreira Sales</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Endereço de Entrega (se for entrega) */}
              {tipoAtendimento === 'entrega' && (
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-2xs space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                    <MapPin className="w-5 h-5 text-amber-600" />
                    <h3 className="font-black text-sm text-stone-900 uppercase tracking-wide">
                      Local de Entrega
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Rua / Avenida <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={rua}
                        onChange={e => setRua(e.target.value)}
                        placeholder="Ex: Rua das Flores, Av. Paraná"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:outline-none focus:border-amber-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Número <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={numero}
                        onChange={e => setNumero(e.target.value)}
                        placeholder="Ex: 123"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:outline-none focus:border-amber-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Bairro <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={bairro}
                        onChange={e => setBairro(e.target.value)}
                        placeholder="Ex: Centro, Jd. América"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:outline-none focus:border-amber-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Complemento (Opcional)
                      </label>
                      <input
                        type="text"
                        value={complemento}
                        onChange={e => setComplemento(e.target.value)}
                        placeholder="Ex: Apto 4B, Bloco 2"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-900 focus:outline-none focus:border-amber-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Ponto de Referência
                      </label>
                      <input
                        type="text"
                        value={pontoReferencia}
                        onChange={e => setPontoReferencia(e.target.value)}
                        placeholder="Ex: Próximo ao mercado"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-900 focus:outline-none focus:border-amber-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Forma de Pagamento */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                  <h3 className="font-black text-sm text-stone-900 uppercase tracking-wide">
                    Forma de Pagamento
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'pix', label: 'Pix', icone: QrCode },
                    { id: 'cartao_credito', label: 'Crédito', icone: CreditCard },
                    { id: 'cartao_debito', label: 'Débito', icone: CreditCard },
                    { id: 'dinheiro', label: 'Dinheiro', icone: Banknote },
                  ].map(f => {
                    const Icone = f.icone;
                    const ativo = formaPagamento === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFormaPagamento(f.id as FormaPagamentoOnline)}
                        className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          ativo
                            ? 'border-amber-600 bg-amber-50/60 text-amber-900 font-black shadow-2xs'
                            : 'border-stone-200 hover:border-stone-300 text-stone-600 bg-stone-50/40 font-semibold'
                        }`}
                      >
                        <Icone className={`w-5 h-5 ${ativo ? 'text-amber-700' : 'text-stone-400'}`} />
                        <span className="text-xs">{f.label}</span>
                      </button>
                    );
                  })}
                </div>

                {formaPagamento === 'dinheiro' && (
                  <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-stone-700">
                      Precisa de troco? Para quanto?
                    </span>
                    <div className="relative w-full sm:w-44">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={trocoPara}
                        onChange={e => setTrocoPara(e.target.value)}
                        placeholder="Ex: 50,00"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-600 text-right"
                      />
                    </div>
                  </div>
                )}

                {formaPagamento === 'pix' && (
                  <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200/80 text-xs text-blue-900 flex items-center gap-2">
                    <QrCode className="w-5 h-5 shrink-0 text-blue-700" />
                    <span>Ao confirmar, você receberá a chave Pix e poderá pagar diretamente no aplicativo do seu banco.</span>
                  </div>
                )}
              </div>

              {/* 4. Resumo dos Itens e Observações Gerais */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="font-black text-sm text-stone-900 uppercase tracking-wide">
                    Itens do Pedido ({quantidadeTotalItens})
                  </h3>
                  <span className="font-mono font-black text-sm text-stone-900">
                    Total: R$ {totalCarrinho.toFixed(2)}
                  </span>
                </div>

                <ul className="divide-y divide-stone-100 max-h-60 overflow-y-auto">
                  {carrinho.map(item => (
                    <li key={item.id_temp} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-stone-900">{item.quantidade}x {item.nome}</span>
                        {item.observacao && (
                          <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                            Obs: {item.observacao}
                          </p>
                        )}
                      </div>
                      <span className="font-mono font-bold text-stone-700 shrink-0">
                        R$ {item.subtotal.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Observações gerais para o pedido (Opcional):
                  </label>
                  <textarea
                    rows={2}
                    value={observacoesGerais}
                    onChange={e => setObservacoesGerais(e.target.value)}
                    placeholder="Ex: Deixar na portaria, campainha não funciona, talheres descartáveis..."
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              {/* Botão de Envio */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isFinalizando}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-md transition-transform active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-5 h-5" />
                  <span>{isFinalizando ? 'Enviando Pedido...' : `Confirmar Pedido Online • R$ ${totalCarrinho.toFixed(2)}`}</span>
                </button>
              </div>

            </form>

          </div>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 4: SUCESSO & MENSAGEM AUTOMÁTICA GERADA PARA WHATSAPP               */}
        {/* ========================================================================= */}
        {etapa === 'sucesso' && pedidoConcluido && (
          <div className="max-w-xl mx-auto my-6 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200 animate-fadeIn space-y-6">
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <h2 className="text-2xl font-black text-stone-900 tracking-tight">
                Pedido Realizado com Sucesso!
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Seu pedido foi registrado no sistema da panificadora e enviado para preparo.
              </p>
              <div className="inline-block mt-3 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black">
                Pedido #{pedidoConcluido.numero_pedido}
              </div>
            </div>

            {/* Resumo do Pedido */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Cliente:</span>
                <span className="font-bold text-stone-900">{pedidoConcluido.cliente_nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Modalidade:</span>
                <span className="font-bold text-amber-900">
                  {pedidoConcluido.tipo === 'entrega' ? '🛵 Entrega em Domicílio' : '🛍️ Retirada no Balcão'}
                </span>
              </div>
              {pedidoConcluido.endereco && (
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Endereço:</span>
                  <span className="font-semibold text-stone-800 text-right">
                    {pedidoConcluido.endereco.rua}, {pedidoConcluido.endereco.numero} - {pedidoConcluido.endereco.bairro}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Pagamento:</span>
                <span className="font-bold text-stone-900 uppercase">{pedidoConcluido.forma_pagamento}</span>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-2 font-black text-sm">
                <span>Valor Total:</span>
                <span className="text-emerald-700 font-mono">R$ {pedidoConcluido.total.toFixed(2)}</span>
              </div>
            </div>

            {/* MENSAGEM AUTOMÁTICA PRONTA PARA O WHATSAPP */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Mensagem Automática para a Panificadora</span>
                </label>
                <span className="text-[11px] text-stone-400">Envio opcional</span>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  rows={8}
                  value={pedidoConcluido.mensagem_whatsapp || ''}
                  className="w-full p-3 bg-stone-900 text-stone-200 rounded-2xl font-mono text-xs focus:outline-none border border-stone-800 select-all"
                />
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleEnviarWhatsApp}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-transform active:scale-98 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Pedido no WhatsApp ({WHATSAPP_PANIFICADORA_DISPLAY})</span>
              </button>

              <button
                type="button"
                onClick={handleCopiarMensagem}
                className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copiado ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-black">Mensagem Copiada com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-stone-500" />
                    <span>Copiar Texto do Pedido</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleNovoPedido}
                className="w-full py-2.5 text-xs text-stone-500 hover:text-stone-900 font-semibold text-center cursor-pointer"
              >
                + Fazer outro pedido
              </button>
            </div>

          </div>
        )}

      </main>

      {/* MODAL DE OBSERVAÇÃO INDIVIDUAL DO ITEM */}
      {modalObsItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-sm shadow-xl border border-stone-200 space-y-4">
            <div>
              <h3 className="font-bold text-base text-stone-900">{modalObsItem.produto.nome}</h3>
              <p className="text-xs text-stone-500">Adicione uma observação específica para este item:</p>
            </div>

            <textarea
              rows={3}
              autoFocus
              value={modalObsItem.observacao}
              onChange={e => setModalObsItem({ ...modalObsItem, observacao: e.target.value })}
              placeholder="Ex: Sem queijo, bem passado, adoçante à parte..."
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-900 focus:outline-none focus:border-amber-600"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModalObsItem(null)}
                className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-bold text-xs rounded-xl hover:bg-stone-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  adicionarItem(modalObsItem.produto, modalObsItem.observacao);
                  setModalObsItem(null);
                }}
                className="flex-1 py-2.5 bg-amber-600 text-white font-bold text-xs rounded-xl hover:bg-amber-700 cursor-pointer"
              >
                Adicionar ao Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RODAPÉ */}
      <Footer />

    </div>
  );
};
