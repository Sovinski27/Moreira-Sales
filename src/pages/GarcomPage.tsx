import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  UtensilsCrossed, 
  Receipt, 
  Plus, 
  Minus, 
  Search, 
  ShoppingBag, 
  Check, 
  CheckCircle2,
  AlertCircle, 
  Clock, 
  User, 
  Coffee, 
  ArrowRight, 
  RotateCcw, 
  Trash2, 
  X, 
  Sparkles,
  ChevronRight,
  Store,
  MessageSquare,
  Timer,
  Globe,
  Scale,
  KeyRound,
  LogOut,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { Produto, Categoria, ItemPedidoCozinha, MesaAberta, Colaborador } from '../types';
import { 
  fetchProdutos, 
  fetchCategorias, 
  fetchMesasAbertas, 
  criarPedidoCardapio, 
  autenticarColaborador,
  fetchColaboradores,
  getLocal, 
  setLocal,
  STORAGE_KEYS 
} from '../services/db';
import { PesoProdutoModal, ehProdutoPorPeso, ResultadoPesoProduto } from '../components/PesoProdutoModal';

interface GarcomPageProps {
  isStandalone?: boolean;
  onVoltarAoCaixa?: () => void;
}

export const GarcomPage: React.FC<GarcomPageProps> = ({ 
  isStandalone = false,
  onVoltarAoCaixa 
}) => {
  // Dados do Catálogo com Hidratação Instantânea (0ms)
  const [produtos, setProdutos] = useState<Produto[]>(() => getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []));
  const [categorias, setCategorias] = useState<Categoria[]>(() => getLocal<Categoria[]>(STORAGE_KEYS.CATEGORIAS, []));
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todos');
  const [busca, setBusca] = useState<string>('');

  // Comandas Abertas na Panificadora
  const [mesasAbertas, setMesasAbertas] = useState<MesaAberta[]>(() => getLocal<MesaAberta[]>(STORAGE_KEYS.MESAS_ABERTAS, []));

  // Comanda Atual em Atendimento
  const [comandaNumero, setComandaNumero] = useState<number | null>(null);
  const [comandaInput, setComandaInput] = useState<string>('');
  const [clienteNome, setClienteNome] = useState<string>('');

  // Itens selecionados neste atendimento do garçom
  const [itensLancamento, setItensLancamento] = useState<ItemPedidoCozinha[]>([]);
  const [observacoesGerais, setObservacoesGerais] = useState<string>('');
  const [itemParaObs, setItemParaObs] = useState<ItemPedidoCozinha | null>(null);

  // Autenticação do Garçom (ID e Senha cadastrados no Painel Admin)
  const [garcomLogado, setGarcomLogado] = useState<Colaborador | null>(() =>
    getLocal<Colaborador | null>(STORAGE_KEYS.GARCOM_SESSAO, null)
  );
  const [loginIdInput, setLoginIdInput] = useState<string>('');
  const [loginSenhaInput, setLoginSenhaInput] = useState<string>('');
  const [mostrarSenhaLogin, setMostrarSenhaLogin] = useState<boolean>(false);
  const [autenticando, setAutenticando] = useState<boolean>(false);
  const [erroLogin, setErroLogin] = useState<string | null>(null);

  // Modal de Peso / Desmembrar Produto
  const [modalPesoConfig, setModalPesoConfig] = useState<{ isOpen: boolean; produto?: Produto | null }>({
    isOpen: false,
    produto: null
  });

  // Modais de Controle
  const [modalTrocarComanda, setModalTrocarComanda] = useState<boolean>(true);
  const [modalVerTodasComandas, setModalVerTodasComandas] = useState<boolean>(false);
  const [modalRevisarPedido, setModalRevisarPedido] = useState<boolean>(false);
  const [modalItensAnteriores, setModalItensAnteriores] = useState<boolean>(false);

  // Status de Envio e Notificações
  const [enviando, setEnviando] = useState<boolean>(false);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  // Validar sessão ativa do garçom com a lista atualizada do Admin
  useEffect(() => {
    fetchColaboradores().then(lista => {
      if (garcomLogado) {
        const aindaAtivo = lista.find(c => c.id === garcomLogado.id && c.ativo !== false);
        if (!aindaAtivo && lista.length > 0) {
          setGarcomLogado(null);
          setLocal(STORAGE_KEYS.GARCOM_SESSAO, null);
        }
      }
    });
  }, [garcomLogado?.id]);

  const handleLoginGarcom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroLogin(null);

    if (!loginIdInput.trim() || !loginSenhaInput.trim()) {
      setErroLogin('Informe seu ID de colaborador e sua senha.');
      return;
    }

    setAutenticando(true);
    try {
      const colab = await autenticarColaborador(loginIdInput, loginSenhaInput);
      if (!colab) {
        setErroLogin('ID ou senha incorretos, ou acesso bloqueado pelo administrador.');
        return;
      }
      setGarcomLogado(colab);
      setLocal(STORAGE_KEYS.GARCOM_SESSAO, colab);
      setLoginIdInput('');
      setLoginSenhaInput('');
    } catch (err) {
      console.error('Erro no login do garçom:', err);
      setErroLogin('Falha ao validar acesso. Tente novamente.');
    } finally {
      setAutenticando(false);
    }
  };

  const handleLogoutGarcom = () => {
    setGarcomLogado(null);
    setLocal(STORAGE_KEYS.GARCOM_SESSAO, null);
  };

  // Carregar produtos, categorias e comandas
  const recarregarDados = useCallback(() => {
    fetchProdutos().then(setProdutos);
    fetchCategorias().then(setCategorias);
    fetchMesasAbertas().then(setMesasAbertas);
  }, []);

  useEffect(() => {
    recarregarDados();
    const interval = setInterval(recarregarDados, 3000);

    window.addEventListener('mesas_atualizadas', recarregarDados);
    window.addEventListener('pedidos_cozinha_atualizados', recarregarDados);
    window.addEventListener('novo_pedido_cozinha', recarregarDados);
    window.addEventListener('catalogo_atualizado', recarregarDados);
    window.addEventListener('produtos_atualizados', recarregarDados);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mesas_atualizadas', recarregarDados);
      window.removeEventListener('pedidos_cozinha_atualizados', recarregarDados);
      window.removeEventListener('novo_pedido_cozinha', recarregarDados);
      window.removeEventListener('catalogo_atualizado', recarregarDados);
      window.removeEventListener('produtos_atualizados', recarregarDados);
    };
  }, [recarregarDados]);

  // Comanda existente no banco (se já estiver ocupada)
  const comandaExistente = useMemo(() => {
    if (!comandaNumero) return null;
    return mesasAbertas.find(m => m.mesa_numero === comandaNumero) || null;
  }, [mesasAbertas, comandaNumero]);

  // Selecionar ou Trocar Comanda
  const handleSelecionarComanda = (num: number, nomeCliente?: string) => {
    setComandaNumero(num);
    setComandaInput(num.toString());
    const existente = mesasAbertas.find(m => m.mesa_numero === num);
    if (existente) {
      setClienteNome(existente.cliente_nome || nomeCliente || `Comanda ${num}`);
    } else {
      setClienteNome(nomeCliente || `Comanda ${num}`);
    }
    setModalTrocarComanda(false);
    setModalVerTodasComandas(false);
  };

  // Submeter formulário de seleção manual da comanda
  const handleSubmitSelecaoComanda = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(comandaInput.replace(/\D/g, ''), 10);
    if (isNaN(num) || num <= 0) return;
    handleSelecionarComanda(num, clienteNome.trim() || undefined);
  };

  // Adicionar produto ao lançamento (abre seletor de peso se for item por kg / 100g)
  const adicionarItem = (produto: Produto, forcarModalPeso: boolean = false) => {
    if (!comandaNumero) {
      setModalTrocarComanda(true);
      return;
    }

    if (forcarModalPeso || ehProdutoPorPeso(produto)) {
      setModalPesoConfig({ isOpen: true, produto });
      return;
    }

    setItensLancamento(prev => {
      const idx = prev.findIndex(item => item.produto_id === produto.id && !item.observacao && !item.peso_gramas);
      if (idx >= 0) {
        const novo = [...prev];
        novo[idx].quantidade += 1;
        novo[idx].subtotal = Number((novo[idx].quantidade * novo[idx].preco_unitario).toFixed(2));
        return novo;
      }
      const novoItem: ItemPedidoCozinha = {
        id_temp: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        produto_id: produto.id,
        nome: produto.nome,
        preco_unitario: Number(produto.preco) || 0,
        quantidade: 1,
        subtotal: Number(produto.preco) || 0,
        unidade_venda: produto.unidade_venda || 'unidade',
        garcom_id: garcomLogado?.id,
        garcom_nome: garcomLogado?.nome
      };
      return [...prev, novoItem];
    });

    // Feedback tátil em celular se disponível
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
  };

  // Adicionar item calculado por peso / medida
  const handleConfirmarItemPorPeso = (res: ResultadoPesoProduto) => {
    const novoItem: ItemPedidoCozinha = {
      id_temp: `item-peso-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      produto_id: res.produto.id,
      nome: res.nomeFormatado,
      preco_unitario: res.precoCalculado,
      quantidade: 1,
      subtotal: res.precoCalculado,
      observacao: res.observacao,
      unidade_venda: res.produto.unidade_venda || 'kg',
      peso_gramas: res.pesoGramas,
      medida_label: res.medidaLabel,
      garcom_id: garcomLogado?.id,
      garcom_nome: garcomLogado?.nome
    };

    setItensLancamento(prev => [...prev, novoItem]);
    setModalPesoConfig({ isOpen: false, produto: null });

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }
  };

  // Remover ou diminuir produto
  const removerItem = (idTemp: string) => {
    setItensLancamento(prev => {
      const item = prev.find(i => i.id_temp === idTemp);
      if (!item) return prev;
      if (item.quantidade > 1) {
        return prev.map(i => i.id_temp === idTemp ? {
          ...i,
          quantidade: i.quantidade - 1,
          subtotal: Number(((i.quantidade - 1) * i.preco_unitario).toFixed(2))
        } : i);
      }
      return prev.filter(i => i.id_temp !== idTemp);
    });
  };

  // Obter quantidade de um produto específico já selecionada no carrinho atual
  const getQtdSelecionada = (produtoId: string) => {
    return itensLancamento
      .filter(i => i.produto_id === produtoId)
      .reduce((sum, i) => sum + i.quantidade, 0);
  };

  // Totais do lançamento atual
  const totalItensLancamento = useMemo(() => {
    return itensLancamento.reduce((sum, i) => sum + i.quantidade, 0);
  }, [itensLancamento]);

  const totalValorLancamento = useMemo(() => {
    return itensLancamento.reduce((sum, i) => sum + i.subtotal, 0);
  }, [itensLancamento]);

  // Enviar Pedido para a Cozinha e Gravar na Comanda
  const handleConfirmarEnvio = async () => {
    if (!comandaNumero || itensLancamento.length === 0 || enviando) return;

    setEnviando(true);
    try {
      await criarPedidoCardapio({
        mesaNumero: comandaNumero,
        clienteNome: clienteNome.trim() || `Comanda ${comandaNumero}`,
        itens: itensLancamento,
        observacoes: observacoesGerais.trim() || undefined,
        garcomId: garcomLogado?.id,
        garcomNome: garcomLogado?.nome
      });

      // Feedback de Sucesso
      setSucessoMsg(`Pedido enviado com sucesso para a Comanda ${comandaNumero < 10 ? `0${comandaNumero}` : comandaNumero}!`);
      setItensLancamento([]);
      setObservacoesGerais('');
      setModalRevisarPedido(false);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 50, 60]);
      }

      setTimeout(() => {
        setSucessoMsg(null);
      }, 4000);

      recarregarDados();
    } catch (err) {
      console.error('Erro ao enviar pedido do garçom:', err);
      setErroMsg('Erro ao enviar pedido. Verifique a conexão e tente novamente.');
      setTimeout(() => setErroMsg(null), 4000);
    } finally {
      setEnviando(false);
    }
  };

  // Filtro de Produtos
  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      const matchAtivo = p.ativo !== false;
      const matchCategoria = categoriaAtiva === 'todos' || p.categoria_id === categoriaAtiva;
      const matchBusca = !busca.trim() || p.nome.toLowerCase().includes(busca.toLowerCase());
      return matchAtivo && matchCategoria && matchBusca;
    });
  }, [produtos, categoriaAtiva, busca]);

  // Tempo de permanência formatado
  const formatTempo = (dataIso?: string) => {
    if (!dataIso) return 'Agora';
    const min = Math.floor((Date.now() - new Date(dataIso).getTime()) / 60000);
    if (min < 1) return 'Menos de 1m';
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    return `${h}h ${min % 60}m`;
  };

  // =========================================================================
  // TELA DE LOGIN OBRIGATÓRIO DO GARÇOM (ID E SENHA DEFINIDOS NO ADMIN)
  // =========================================================================
  if (!garcomLogado) {
    return (
      <div className="min-h-screen bg-stone-950 text-white flex flex-col justify-between p-4 selection:bg-emerald-500">
        <div className="max-w-md w-full mx-auto my-auto py-8">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <UtensilsCrossed className="w-8 h-8" />
              </div>
              <span className="inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Acesso Exclusivo • Comanda Móvel
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Identificação do Garçom
              </h1>
              <p className="text-xs text-stone-400 leading-relaxed">
                Insira seu <strong className="text-stone-200">ID de Acesso</strong> e sua{' '}
                <strong className="text-stone-200">Senha</strong> cadastrados na administração da Panificadora Moreira Sales.
              </p>
            </div>

            {erroLogin && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{erroLogin}</span>
              </div>
            )}

            <form onSubmit={handleLoginGarcom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                  ID do Colaborador *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={loginIdInput}
                    onChange={e => setLoginIdInput(e.target.value)}
                    placeholder="Ex: 101, joao..."
                    className="w-full pl-10 pr-4 py-3.5 bg-stone-950 border border-stone-700 rounded-2xl text-sm font-mono font-bold text-white placeholder:text-stone-600 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                    Senha de Acesso *
                  </label>
                  <button
                    type="button"
                    onClick={() => setMostrarSenhaLogin(!mostrarSenhaLogin)}
                    className="text-[11px] font-bold text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {mostrarSenhaLogin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{mostrarSenhaLogin ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={mostrarSenhaLogin ? 'text' : 'password'}
                    required
                    value={loginSenhaInput}
                    onChange={e => setLoginSenhaInput(e.target.value)}
                    placeholder="Digite sua senha..."
                    className="w-full pl-10 pr-4 py-3.5 bg-stone-950 border border-stone-700 rounded-2xl text-sm font-mono font-bold text-white placeholder:text-stone-600 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={autenticando}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer mt-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>{autenticando ? 'Verificando acesso...' : 'Entrar no Sistema de Garçom'}</span>
              </button>
            </form>

            <div className="pt-3 border-t border-stone-800 text-center">
              <p className="text-[11px] text-stone-500">
                Panificadora Moreira Sales • Todos os pedidos ficam vinculados ao seu perfil de atendimento.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-900 flex flex-col pb-28">
      
      {/* HEADER SUPERIOR DO GARÇOM */}
      <header className="bg-stone-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          
          {/* Identidade Exclusiva da Comanda Móvel do Garçom */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black tracking-tight leading-none truncate flex items-center gap-1.5">
                <span>Comanda Móvel</span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                  {garcomLogado.nome}
                </span>
              </h1>
              <p className="text-[11px] text-stone-400 truncate">
                ID: {garcomLogado.codigo_acesso} • Panificadora Moreira Sales
              </p>
            </div>
          </div>

          {/* Seletor / Indicador da Comanda Ativa + Botão Sair */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLogoutGarcom}
              className="p-2 rounded-xl bg-stone-800 hover:bg-rose-950 text-stone-400 hover:text-rose-300 border border-stone-700 transition-colors cursor-pointer"
              title={`Sair / Trocar Garçom (${garcomLogado.nome})`}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setModalVerTodasComandas(true)}
              className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Ver todas as comandas abertas na casa"
            >
              <Receipt className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Comandas Abertas</span>
              <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-900 text-[10px] font-black flex items-center justify-center">
                {mesasAbertas.length}
              </span>
            </button>

            {comandaNumero ? (
              <button
                type="button"
                onClick={() => setModalTrocarComanda(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                title="Clique para trocar o número da comanda"
              >
                <span>Comanda {comandaNumero < 10 ? `0${comandaNumero}` : comandaNumero}</span>
                <RotateCcw className="w-3 h-3 text-emerald-200" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setModalTrocarComanda(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-900 text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Escolher Comanda</span>
              </button>
            )}
          </div>

        </div>

        {/* Barra de Status da Comanda Ativa */}
        {comandaNumero && (
          <div className="bg-stone-800/90 border-t border-stone-700/80 px-4 py-2">
            <div className="max-w-3xl mx-auto flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-stone-300 truncate">
                  Atendendo: <strong className="text-white">{clienteNome || `Comanda ${comandaNumero}`}</strong>
                </span>
                {comandaExistente && (
                  <button
                    type="button"
                    onClick={() => setModalItensAnteriores(true)}
                    className="text-[10px] text-amber-300 underline font-bold ml-1 hover:text-amber-200 cursor-pointer"
                  >
                    (Ver R$ {comandaExistente.total.toFixed(2)} já consumido)
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setModalTrocarComanda(true)}
                className="text-[11px] text-stone-400 hover:text-white font-medium flex items-center gap-1"
              >
                Trocar Comanda ➜
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ALERTA DE SUCESSO FLUTUANTE */}
      {sucessoMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <p className="text-xs sm:text-sm font-black">{sucessoMsg}</p>
        </div>
      )}

      {/* ALERTA DE ERRO FLUTUANTE */}
      {erroMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-rose-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fadeIn">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <p className="text-xs sm:text-sm font-black">{erroMsg}</p>
        </div>
      )}

      {/* ÁREA PRINCIPAL DO CATÁLOGO DO GARÇOM */}
      <main className="max-w-3xl mx-auto w-full px-4 pt-4 space-y-4">
        
        {/* Banner de Aviso caso nenhuma comanda esteja selecionada */}
        {!comandaNumero && (
          <div 
            onClick={() => setModalTrocarComanda(true)}
            className="p-4 bg-amber-500 text-stone-900 rounded-3xl shadow-sm flex items-center justify-between cursor-pointer active:scale-98 transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-black/10 flex items-center justify-center font-black text-lg">
                #
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wide">Nenhuma comanda selecionada</h2>
                <p className="text-xs font-medium text-stone-800">Toque aqui para informar o número da comanda (Ex: 01)</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-stone-900" />
          </div>
        )}

        {/* Barra de Busca de Produtos Rápida + Botão Desmembrar por Peso */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar produto (Ex: Pão, Café, Misto)..."
              className="w-full pl-10 pr-8 py-3 bg-white border border-stone-200 rounded-2xl text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-600 shadow-2xs"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (!comandaNumero) {
                setModalTrocarComanda(true);
                return;
              }
              setModalPesoConfig({ isOpen: true, produto: null });
            }}
            className="px-3.5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs shrink-0 active:scale-95 transition-all cursor-pointer"
            title="Desmembrar produto por peso (Ex: 200g de mussarela ou pão)"
          >
            <Scale className="w-4 h-4" />
            <span>Por Peso (g/kg)</span>
          </button>
        </div>

        {/* Pílulas de Categorias com Rolagem Horizontal Suave */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setCategoriaAtiva('todos')}
            className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              categoriaAtiva === 'todos'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            Todos os Itens
          </button>
          {categorias.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoriaAtiva(cat.id)}
              className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                categoriaAtiva === cat.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {cat.nome}
            </button>
          ))}
        </div>

        {/* Grid de Produtos Otimizado para Toque com Polegares */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {produtosFiltrados.map(produto => {
            const qtdNoPedidoAtual = getQtdSelecionada(produto.id);
            const estaSelecionado = qtdNoPedidoAtual > 0;
            const isPorPeso = ehProdutoPorPeso(produto);

            return (
              <div
                key={produto.id}
                className={`bg-white rounded-2xl p-3 border transition-all flex flex-col justify-between select-none relative ${
                  estaSelecionado 
                    ? 'border-emerald-500 shadow-sm ring-1 ring-emerald-500/20 bg-emerald-50/20' 
                    : 'border-stone-200/80 hover:border-stone-300 shadow-2xs'
                }`}
              >
                {/* Badge de Quantidade Selecionada */}
                {estaSelecionado && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-md animate-scaleUp">
                    {qtdNoPedidoAtual}
                  </span>
                )}

                {/* Dados do Produto */}
                <div 
                  className="cursor-pointer"
                  onClick={() => adicionarItem(produto)}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="font-bold text-stone-900 text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
                      {produto.nome}
                    </p>
                    {isPorPeso && (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black shrink-0 flex items-center gap-0.5">
                        <Scale className="w-2.5 h-2.5" />
                        Peso
                      </span>
                    )}
                  </div>
                  <p className="text-amber-700 font-black font-mono text-sm mt-1">
                    R$ {Number(produto.preco).toFixed(2)}
                    {produto.unidade_venda && (
                      <span className="text-stone-500 font-sans font-medium text-xs ml-1.5">
                        /{produto.unidade_venda}
                      </span>
                    )}
                  </p>
                </div>

                {/* Controles de Quantidade ou Peso */}
                <div className="flex items-center justify-between gap-1 mt-3 pt-2 border-t border-stone-100">
                  {estaSelecionado && !isPorPeso ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const item = itensLancamento.find(i => i.produto_id === produto.id);
                          if (item) removerItem(item.id_temp);
                        }}
                        className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-90 text-stone-700 font-bold flex items-center justify-center cursor-pointer transition-transform"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span className="font-black font-mono text-stone-900 text-sm">
                        {qtdNoPedidoAtual}
                      </span>

                      <button
                        type="button"
                        onClick={() => adicionarItem(produto)}
                        className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-90 text-white font-bold flex items-center justify-center cursor-pointer transition-transform shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1 w-full">
                      <button
                        type="button"
                        onClick={() => adicionarItem(produto)}
                        className="flex-1 py-1.5 px-2.5 bg-stone-100 hover:bg-amber-600 hover:text-white text-stone-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                      >
                        {isPorPeso ? <Scale className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>{isPorPeso ? 'Informar Peso' : 'Adicionar'}</span>
                      </button>
                      {!isPorPeso && (
                        <button
                          type="button"
                          onClick={() => adicionarItem(produto, true)}
                          className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/70 transition-colors cursor-pointer"
                          title="Desmembrar este produto por peso (g/kg)"
                        >
                          <Scale className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {produtosFiltrados.length === 0 && (
          <div className="text-center py-12 text-stone-400 text-sm">
            Nenhum produto encontrado para &quot;{busca}&quot;.
          </div>
        )}
      </main>

      {/* BARRA INFERIOR FIXA DE LANÇAMENTO (SE HOUVER ITENS SELECIONADOS) */}
      {itensLancamento.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 p-3 sm:p-4 shadow-2xl">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            
            {/* Resumo do Total */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
                {totalItensLancamento}
              </div>
              <div>
                <p className="text-[11px] text-stone-500 font-bold uppercase tracking-wider">
                  {comandaNumero ? `Comanda ${comandaNumero < 10 ? `0${comandaNumero}` : comandaNumero}` : 'Sem Comanda'}
                </p>
                <p className="text-lg font-black font-mono text-stone-900 leading-none mt-0.5">
                  R$ {totalValorLancamento.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Botão de Lançar / Revisar */}
            <button
              type="button"
              onClick={() => {
                if (!comandaNumero) {
                  setModalTrocarComanda(true);
                } else {
                  setModalRevisarPedido(true);
                }
              }}
              className="py-3.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
            >
              <span>Lançar Pedido</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SELECIONAR OU TROCAR NÚMERO DA COMANDA                         */}
      {/* ========================================================================= */}
      {modalTrocarComanda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
            
            <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
                  #
                </div>
                <div>
                  <h3 className="text-base font-black">Selecionar Comanda do Cliente</h3>
                  <p className="text-xs text-stone-400">Qual comanda você está entregando?</p>
                </div>
              </div>
              {comandaNumero && (
                <button
                  type="button"
                  onClick={() => setModalTrocarComanda(false)}
                  className="text-stone-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <form onSubmit={handleSubmitSelecaoComanda} className="p-6 space-y-4">
              
              {/* Campo do Número da Comanda */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Número da Comanda (Inserir Manualmente) *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    autoFocus
                    value={comandaInput}
                    onChange={e => setComandaInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 1, 2, 14..."
                    className="w-full text-center py-4 text-3xl font-black font-mono text-stone-900 bg-stone-50 border-2 border-stone-200 rounded-2xl focus:border-amber-600 focus:bg-white outline-none transition-all shadow-inner"
                  />
                  {comandaInput && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 uppercase">
                      Comanda #{parseInt(comandaInput, 10)}
                    </span>
                  )}
                </div>
              </div>

              {/* Botões Rápidos de Comandas Frequentes (1 a 12) */}
              <div>
                <span className="text-[11px] font-bold uppercase text-stone-400 block mb-2">
                  Atalhos rápidos:
                </span>
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(num => {
                    const ocupada = mesasAbertas.some(m => m.mesa_numero === num);
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setComandaInput(num.toString());
                        }}
                        className={`py-2 rounded-xl font-bold font-mono text-xs border transition-all cursor-pointer ${
                          comandaInput === num.toString()
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : ocupada
                            ? 'bg-rose-50 text-rose-800 border-rose-200 hover:border-rose-300'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {num < 10 ? `0${num}` : num}
                      </button>
                    );
                  })}
                </div>

                {/* Atalho Especial Comanda Online */}
                <button
                  type="button"
                  onClick={() => {
                    setComandaInput('99');
                    if (!clienteNome) setClienteNome('Cliente Online');
                  }}
                  className={`w-full mt-2.5 py-2 px-3 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    comandaInput === '99'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>Comanda Online (#99 - Pedidos de Casa)</span>
                </button>
              </div>

              {/* Campo Opcional: Nome do Cliente */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Nome do Cliente (Opcional)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={clienteNome}
                    onChange={e => setClienteNome(e.target.value)}
                    placeholder="Ex: Carlos, Lucas, Mesa da janela..."
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm font-medium text-stone-900 focus:border-amber-600 focus:bg-white outline-none"
                  />
                </div>
              </div>

              {/* Status da Comanda se já existir */}
              {comandaInput && mesasAbertas.some(m => m.mesa_numero === parseInt(comandaInput, 10)) && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold">Comanda #{parseInt(comandaInput, 10)} já está em atendimento!</p>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      Novos itens serão adicionados ao total existente.
                    </p>
                  </div>
                  <span className="font-black font-mono text-sm text-rose-900">
                    R$ {(mesasAbertas.find(m => m.mesa_numero === parseInt(comandaInput, 10))?.total || 0).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="submit"
                  disabled={!comandaInput || parseInt(comandaInput, 10) <= 0}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar e Atender Comanda</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalTrocarComanda(false);
                    setModalVerTodasComandas(true);
                  }}
                  className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-amber-600" />
                  <span>Ver Comandas em Atendimento ({mesasAbertas.length})</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REVISAR E CONFIRMAR LANÇAMENTO DO GARÇOM                       */}
      {/* ========================================================================= */}
      {modalRevisarPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black text-lg">
                  {comandaNumero && comandaNumero < 10 ? `0${comandaNumero}` : comandaNumero}
                </div>
                <div>
                  <h3 className="text-base font-black">Lançamento • Comanda {comandaNumero}</h3>
                  <p className="text-xs text-stone-300">Cliente: {clienteNome || `Comanda ${comandaNumero}`}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalRevisarPedido(false)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Itens a serem lançados agora:
              </h4>

              <div className="bg-stone-50 rounded-2xl border border-stone-200 divide-y divide-stone-200 overflow-hidden">
                {itensLancamento.map(item => (
                  <div key={item.id_temp} className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold font-mono text-xs flex items-center justify-center">
                        {item.quantidade}x
                      </span>
                      <div>
                        <p className="font-bold text-stone-900 text-sm">{item.nome}</p>
                        <p className="text-xs text-stone-500 font-mono">R$ {item.preco_unitario.toFixed(2)} un.</p>
                        {item.observacao && (
                          <p className="text-[11px] text-amber-700 italic mt-0.5 font-medium">
                            Obs: {item.observacao}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="font-black font-mono text-stone-900 text-sm">
                      R$ {item.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Campo de Observações Gerais da Cozinha */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                  Observações para a Chapa/Cozinha (Opcional)
                </label>
                <input
                  type="text"
                  value={observacoesGerais}
                  onChange={e => setObservacoesGerais(e.target.value)}
                  placeholder="Ex: Caprichar no queijo, café com pouco açúcar..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:border-amber-600 focus:bg-white outline-none"
                />
              </div>

              {/* Resumo Financeiro */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider block">
                    Valor deste lançamento
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    {totalItensLancamento} {totalItensLancamento === 1 ? 'item' : 'itens'} adicionados
                  </span>
                </div>
                <span className="text-2xl font-black font-mono text-emerald-900">
                  R$ {totalValorLancamento.toFixed(2)}
                </span>
              </div>

            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalRevisarPedido(false)}
                className="py-3 px-4 rounded-xl text-stone-600 hover:bg-stone-200 font-bold text-xs"
              >
                Voltar
              </button>

              <button
                type="button"
                disabled={enviando}
                onClick={handleConfirmarEnvio}
                className="flex-1 py-4 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{enviando ? 'Enviando...' : 'Confirmar e Enviar Pedido'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TODAS AS COMANDAS ABERTAS NA CASA                                */}
      {/* ========================================================================= */}
      {modalVerTodasComandas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-black">Comandas em Atendimento</h3>
                  <p className="text-xs text-stone-400">{mesasAbertas.length} comanda(s) aberta(s) no momento</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalVerTodasComandas(false)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
              {mesasAbertas.map(mesa => (
                <div
                  key={mesa.id}
                  onClick={() => handleSelecionarComanda(mesa.mesa_numero, mesa.cliente_nome)}
                  className="p-3.5 bg-stone-50 hover:bg-amber-50/60 border border-stone-200 hover:border-amber-300 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-black text-amber-800 text-base">
                      {mesa.mesa_numero < 10 ? `0${mesa.mesa_numero}` : mesa.mesa_numero}
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 text-sm">
                        {mesa.cliente_nome || `Comanda ${mesa.mesa_numero}`}
                      </p>
                      <p className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Timer className="w-3 h-3 text-stone-400" />
                          {formatTempo(mesa.criado_em)}
                        </span>
                        <span>• {(mesa.carrinho || []).length} item(s)</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-black font-mono text-stone-900 text-sm block">
                      R$ {mesa.total.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                      Atender ➜
                    </span>
                  </div>
                </div>
              ))}

              {mesasAbertas.length === 0 && (
                <div className="text-center py-12 text-stone-400 text-sm">
                  Nenhuma comanda aberta no momento. Todas as comandas estão livres.
                </div>
              )}
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200">
              <button
                type="button"
                onClick={() => {
                  setModalVerTodasComandas(false);
                  setModalTrocarComanda(true);
                }}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Abrir Nova Comanda</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ITENS ANTERIORES DA COMANDA (HISTÓRICO DE CONSUMO)             */}
      {/* ========================================================================= */}
      {modalItensAnteriores && comandaExistente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black">Comanda {comandaExistente.mesa_numero} • Já Consumido</h3>
                <p className="text-xs text-stone-400">Total acumulado: R$ {comandaExistente.total.toFixed(2)}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalItensAnteriores(false)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {(comandaExistente.carrinho || []).map((item, idx) => (
                <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      {item.quantidade}x
                    </span>
                    <span className="font-bold text-stone-800">{item.produto.nome}</span>
                  </div>
                  <span className="font-mono font-bold text-stone-900">
                    R$ {item.subtotal.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setModalItensAnteriores(false)}
                className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-bold text-xs"
              >
                Fechar e Continuar Lançamento
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE PESO / DESMEMBRAR PRODUTO */}
      <PesoProdutoModal
        isOpen={modalPesoConfig.isOpen}
        produto={modalPesoConfig.produto}
        produtosCatalogo={produtos}
        onClose={() => setModalPesoConfig({ isOpen: false, produto: null })}
        onConfirm={handleConfirmarItemPorPeso}
      />

    </div>
  );
};
