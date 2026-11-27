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
  UserCheck,
  Pencil,
  Save
} from 'lucide-react';
import { Produto, Categoria, ItemPedidoCozinha, ItemCarrinho, MesaAberta, Colaborador } from '../types';
import { 
  fetchProdutos, 
  fetchCategorias, 
  fetchMesasAbertas, 
  criarPedidoCardapio, 
  atualizarItensComandaGarcom,
  autenticarColaborador,
  fetchColaboradores,
  getLocal, 
  setLocal,
  STORAGE_KEYS 
} from '../services/db';
import { PesoProdutoModal, ehProdutoPorPeso, ResultadoPesoProduto } from '../components/PesoProdutoModal';

const OBS_RAPIDAS_GARCOM = [
  'Sem cebola',
  'Sem tomate',
  'Sem queijo',
  'Bem passado',
  'Quente',
  'Sem gelo',
  'Pouco açúcar',
  'Para viagem'
];

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
  const [obsAbertaRascunhoId, setObsAbertaRascunhoId] = useState<string | null>(null);

  // Edição de itens já lançados na comanda (observações, quantidade e retirada)
  const [mesaEditandoNumero, setMesaEditandoNumero] = useState<number | null>(null);
  const [itensLancadosEditando, setItensLancadosEditando] = useState<ItemCarrinho[]>([]);
  const [obsAbertaLancadoId, setObsAbertaLancadoId] = useState<string | null>(null);
  const [confirmRemoverLancadoId, setConfirmRemoverLancadoId] = useState<string | null>(null);
  const [salvandoEdicaoLancados, setSalvandoEdicaoLancados] = useState<boolean>(false);

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

  // Remover ou diminuir produto do rascunho atual
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
      const restante = prev.filter(i => i.id_temp !== idTemp);
      if (restante.length === 0) setModalRevisarPedido(false);
      return restante;
    });
  };

  // Aumentar quantidade de um item específico do rascunho atual
  const incrementarItemRascunho = (idTemp: string) => {
    setItensLancamento(prev =>
      prev.map(i =>
        i.id_temp === idTemp
          ? {
              ...i,
              quantidade: i.quantidade + 1,
              subtotal: Number(((i.quantidade + 1) * i.preco_unitario).toFixed(2))
            }
          : i
      )
    );
  };

  // Retirar linha inteira do rascunho atual
  const excluirLinhaRascunho = (idTemp: string) => {
    setItensLancamento(prev => {
      const restante = prev.filter(i => i.id_temp !== idTemp);
      if (restante.length === 0) setModalRevisarPedido(false);
      return restante;
    });
    if (obsAbertaRascunhoId === idTemp) setObsAbertaRascunhoId(null);
  };

  // Atualizar observação de um item do rascunho atual
  const atualizarObsRascunho = (idTemp: string, novaObs: string) => {
    setItensLancamento(prev =>
      prev.map(i => (i.id_temp === idTemp ? { ...i, observacao: novaObs } : i))
    );
  };

  // Alternar chip de observação rápida
  const toggleChipObservacao = (textoAtual: string | undefined, chip: string): string => {
    const partes = (textoAtual || '')
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);
    const jaExiste = partes.some(p => p.toLowerCase() === chip.toLowerCase());
    if (jaExiste) {
      return partes.filter(p => p.toLowerCase() !== chip.toLowerCase()).join(', ');
    }
    return [...partes, chip].join(', ');
  };

  // Comanda alvo sendo editada no Modal de Itens Lançados
  const comandaAlvoEdicao = useMemo(() => {
    const numAlvo = mesaEditandoNumero ?? comandaNumero;
    if (!numAlvo) return null;
    return mesasAbertas.find(m => m.mesa_numero === numAlvo) || null;
  }, [mesasAbertas, mesaEditandoNumero, comandaNumero]);

  // Abrir modal de edição de itens já lançados na comanda
  const abrirModalEditarLancados = (mesaAlvo?: MesaAberta | null) => {
    const alvo = mesaAlvo || comandaExistente;
    if (!alvo) return;
    setMesaEditandoNumero(alvo.mesa_numero);
    const copia: ItemCarrinho[] = (alvo.carrinho || []).map(item => ({
      ...item,
      produto: { ...item.produto }
    }));
    setItensLancadosEditando(copia);
    setObsAbertaLancadoId(null);
    setConfirmRemoverLancadoId(null);
    setModalVerTodasComandas(false);
    setModalItensAnteriores(true);
  };

  const fecharModalEditarLancados = () => {
    setModalItensAnteriores(false);
    setMesaEditandoNumero(null);
    setObsAbertaLancadoId(null);
    setConfirmRemoverLancadoId(null);
  };

  const alterarQuantidadeLancado = (idTemp: string, delta: number) => {
    setItensLancadosEditando(prev => {
      const alvo = prev.find(i => i.id_temp === idTemp);
      if (!alvo) return prev;
      const novaQtd = alvo.quantidade + delta;
      if (novaQtd <= 0) {
        setConfirmRemoverLancadoId(idTemp);
        return prev;
      }
      setConfirmRemoverLancadoId(null);
      return prev.map(i =>
        i.id_temp === idTemp
          ? {
              ...i,
              quantidade: novaQtd,
              subtotal: Number((novaQtd * Number(i.produto.preco || 0)).toFixed(2))
            }
          : i
      );
    });
  };

  const atualizarObsLancado = (idTemp: string, novaObs: string) => {
    setItensLancadosEditando(prev =>
      prev.map(i => (i.id_temp === idTemp ? { ...i, observacao: novaObs } : i))
    );
  };

  const removerItemLancado = (idTemp: string) => {
    setItensLancadosEditando(prev => prev.filter(i => i.id_temp !== idTemp));
    if (confirmRemoverLancadoId === idTemp) setConfirmRemoverLancadoId(null);
    if (obsAbertaLancadoId === idTemp) setObsAbertaLancadoId(null);
  };

  const totalEditandoLancados = useMemo(() => {
    return Number(
      itensLancadosEditando.reduce((sum, i) => sum + Number(i.subtotal || 0), 0).toFixed(2)
    );
  }, [itensLancadosEditando]);

  const houveAlteracaoLancados = useMemo(() => {
    if (!comandaAlvoEdicao) return false;
    const originais = comandaAlvoEdicao.carrinho || [];
    if (originais.length !== itensLancadosEditando.length) return true;
    return originais.some((orig, idx) => {
      const atual = itensLancadosEditando[idx];
      if (!atual) return true;
      return (
        orig.id_temp !== atual.id_temp ||
        orig.quantidade !== atual.quantidade ||
        (orig.observacao || '').trim() !== (atual.observacao || '').trim()
      );
    });
  }, [comandaAlvoEdicao, itensLancadosEditando]);

  const handleSalvarEdicaoLancados = async () => {
    if (!comandaAlvoEdicao || salvandoEdicaoLancados) return;
    setSalvandoEdicaoLancados(true);
    try {
      const num = comandaAlvoEdicao.mesa_numero;
      const numFmt = num < 10 ? `0${num}` : String(num);
      const res = await atualizarItensComandaGarcom({
        mesaNumero: num,
        carrinhoAtualizado: itensLancadosEditando,
        garcomId: garcomLogado?.id,
        garcomNome: garcomLogado?.nome
      });

      fecharModalEditarLancados();
      recarregarDados();

      setSucessoMsg(
        res.comandaEncerrada
          ? `Todos os itens foram retirados e a Comanda ${numFmt} foi encerrada.`
          : `Comanda ${numFmt} atualizada na cozinha e no caixa!`
      );
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 40, 40]);
      }
      setTimeout(() => setSucessoMsg(null), 4000);
    } catch (err) {
      console.error('Erro ao salvar alterações dos itens lançados:', err);
      setErroMsg('Não foi possível salvar as alterações. Tente novamente.');
      setTimeout(() => setErroMsg(null), 4000);
    } finally {
      setSalvandoEdicaoLancados(false);
    }
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
          <div className="bg-stone-800/95 border-t border-stone-700/80 px-4 py-2">
            <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-stone-300 truncate">
                  Atendendo: <strong className="text-white">{clienteNome || `Comanda ${comandaNumero}`}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {comandaExistente && (
                  <button
                    type="button"
                    onClick={() => abrirModalEditarLancados(comandaExistente)}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Ver, adicionar observação ou retirar itens já lançados nesta comanda"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>
                      Editar lançados ({(comandaExistente.carrinho || []).length}) • R$ {comandaExistente.total.toFixed(2)}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setModalTrocarComanda(true)}
                  className="text-[11px] text-stone-400 hover:text-white font-medium flex items-center gap-1 cursor-pointer"
                >
                  Trocar ➜
                </button>
              </div>
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
      {/* MODAL 2: REVISAR E CONFIRMAR LANÇAMENTO DO GARÇOM                         */}
      {/* ========================================================================= */}
      {modalRevisarPedido && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setModalRevisarPedido(false)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black text-lg shrink-0 font-mono">
                  {comandaNumero && comandaNumero < 10 ? `0${comandaNumero}` : comandaNumero}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black truncate">Lançamento • Comanda {comandaNumero}</h3>
                  <p className="text-xs text-stone-300 truncate">
                    Cliente: {clienteNome || `Comanda ${comandaNumero}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalRevisarPedido(false)}
                aria-label="Fechar revisão"
                className="w-10 h-10 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Itens a lançar ({totalItensLancamento})
                </h4>
                <span className="text-[11px] text-stone-500">
                  Toque em Obs. para adicionar observação
                </span>
              </div>

              <div className="space-y-2.5">
                {itensLancamento.map(item => {
                  const obsAberta = obsAbertaRascunhoId === item.id_temp;
                  const isPeso = Boolean(item.peso_gramas);

                  return (
                    <div
                      key={item.id_temp}
                      className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-stone-900 text-sm leading-snug">
                            {item.nome}
                          </p>
                          <p className="text-xs text-stone-500 font-mono tabular-nums mt-0.5">
                            R$ {item.preco_unitario.toFixed(2)} {isPeso ? 'porção' : 'un.'}
                          </p>
                          {item.observacao && !obsAberta && (
                            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg px-2 py-1 mt-1.5 inline-flex items-center gap-1 font-medium">
                              <MessageSquare className="w-3 h-3 shrink-0 text-amber-600" />
                              <span>{item.observacao}</span>
                            </p>
                          )}
                        </div>

                        <span className="font-black font-mono tabular-nums text-stone-900 text-sm shrink-0">
                          R$ {item.subtotal.toFixed(2)}
                        </span>
                      </div>

                      {/* Ações do item (Quantidade, Observação, Retirar) */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200/70">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => removerItem(item.id_temp)}
                            aria-label="Diminuir quantidade"
                            className="w-9 h-9 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="min-w-[2rem] text-center font-mono tabular-nums font-black text-sm text-stone-900">
                            {item.quantidade}x
                          </span>
                          <button
                            type="button"
                            onClick={() => incrementarItemRascunho(item.id_temp)}
                            aria-label="Aumentar quantidade"
                            className="w-9 h-9 rounded-xl bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 text-emerald-700 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setObsAbertaRascunhoId(obsAberta ? null : item.id_temp)
                            }
                            className={`h-9 px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
                              obsAberta || item.observacao
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-white text-stone-700 border-stone-200 hover:border-amber-300 hover:bg-amber-50'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{item.observacao ? 'Editar Obs.' : 'Obs.'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => excluirLinhaRascunho(item.id_temp)}
                            aria-label={`Retirar ${item.nome}`}
                            title="Retirar item do lançamento"
                            className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-600 flex items-center justify-center active:scale-95 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Editor inline de Observação */}
                      {obsAberta && (
                        <div className="pt-2.5 border-t border-stone-200/80 space-y-2 animate-fadeIn">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={item.observacao || ''}
                              onChange={e => atualizarObsRascunho(item.id_temp, e.target.value)}
                              placeholder="Ex: Sem cebola, bem quente, cortar ao meio..."
                              autoFocus
                              className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-amber-600 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setObsAbertaRascunhoId(null)}
                              className="px-3 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer shrink-0"
                            >
                              OK
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {OBS_RAPIDAS_GARCOM.map(chip => {
                              const ativo = (item.observacao || '')
                                .toLowerCase()
                                .includes(chip.toLowerCase());
                              return (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() =>
                                    atualizarObsRascunho(
                                      item.id_temp,
                                      toggleChipObservacao(item.observacao, chip)
                                    )
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                                    ativo
                                      ? 'bg-amber-600 text-white border-amber-600'
                                      : 'bg-white text-stone-700 border-stone-200 hover:border-amber-400'
                                  }`}
                                >
                                  {chip}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Campo de Observações Gerais da Cozinha */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                  Observações gerais para a cozinha (Opcional)
                </label>
                <input
                  type="text"
                  value={observacoesGerais}
                  onChange={e => setObservacoesGerais(e.target.value)}
                  placeholder="Ex: Trazer tudo junto, cliente com pressa..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium text-stone-900 focus:border-amber-600 focus:bg-white outline-none"
                />
              </div>

              {/* Resumo Financeiro */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider block">
                    Valor deste lançamento
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    {totalItensLancamento} {totalItensLancamento === 1 ? 'item' : 'itens'} selecionados
                  </span>
                </div>
                <span className="text-2xl font-black font-mono tabular-nums text-emerald-900">
                  R$ {totalValorLancamento.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setModalRevisarPedido(false)}
                className="min-h-[48px] px-4 rounded-2xl text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 font-bold text-xs sm:text-sm cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                disabled={enviando || itensLancamento.length === 0}
                onClick={handleConfirmarEnvio}
                className="flex-1 min-h-[48px] px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
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
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setModalVerTodasComandas(false)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[88vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-stone-900 text-white p-5 flex items-center justify-between shrink-0">
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
                aria-label="Fechar lista de comandas"
                className="w-10 h-10 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
              {mesasAbertas.map(mesa => (
                <div
                  key={mesa.id}
                  onClick={() => handleSelecionarComanda(mesa.mesa_numero, mesa.cliente_nome)}
                  className="p-3.5 bg-stone-50 hover:bg-amber-50/60 border border-stone-200 hover:border-amber-300 rounded-2xl space-y-2.5 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-black font-mono text-amber-800 text-base shrink-0">
                        {mesa.mesa_numero < 10 ? `0${mesa.mesa_numero}` : mesa.mesa_numero}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-stone-900 text-sm truncate">
                          {mesa.cliente_nome || `Comanda ${mesa.mesa_numero}`}
                        </p>
                        <p className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1 font-mono tabular-nums">
                            <Timer className="w-3 h-3 text-stone-400" />
                            {formatTempo(mesa.criado_em)}
                          </span>
                          <span>• {(mesa.carrinho || []).length} item(s)</span>
                        </p>
                      </div>
                    </div>

                    <span className="font-black font-mono tabular-nums text-stone-900 text-sm shrink-0">
                      R$ {mesa.total.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-stone-200/70">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        abrirModalEditarLancados(mesa);
                      }}
                      className="flex-1 min-h-[40px] px-3 rounded-xl bg-white hover:bg-amber-50 border border-stone-300 hover:border-amber-400 text-stone-800 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-amber-600" />
                      <span>Editar / Retirar Itens</span>
                    </button>

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleSelecionarComanda(mesa.mesa_numero, mesa.cliente_nome);
                      }}
                      className="flex-1 min-h-[40px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Lançar Mais Itens</span>
                    </button>
                  </div>
                </div>
              ))}

              {mesasAbertas.length === 0 && (
                <div className="text-center py-12 text-stone-400 text-sm">
                  Nenhuma comanda aberta no momento. Todas as comandas estão livres.
                </div>
              )}
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setModalVerTodasComandas(false);
                  setModalTrocarComanda(true);
                }}
                className="w-full min-h-[46px] bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Abrir Nova Comanda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDITAR ITENS JÁ LANÇADOS NA COMANDA (OBS., QTD. E RETIRADA)      */}
      {/* ========================================================================= */}
      {modalItensAnteriores && comandaAlvoEdicao && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={fecharModalEditarLancados}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Cabeçalho fixo */}
            <div className="bg-stone-900 text-white p-5 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center font-black font-mono text-amber-300 text-lg shrink-0">
                  {comandaAlvoEdicao.mesa_numero < 10
                    ? `0${comandaAlvoEdicao.mesa_numero}`
                    : comandaAlvoEdicao.mesa_numero}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black truncate">
                    Editar Pedido • Comanda {comandaAlvoEdicao.mesa_numero}
                  </h3>
                  <p className="text-xs text-stone-300 truncate">
                    {comandaAlvoEdicao.cliente_nome || `Comanda ${comandaAlvoEdicao.mesa_numero}`} •{' '}
                    {itensLancadosEditando.length}{' '}
                    {itensLancadosEditando.length === 1 ? 'item' : 'itens'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fecharModalEditarLancados}
                aria-label="Fechar edição da comanda"
                className="w-10 h-10 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista editável de itens já lançados */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
              <div className="px-3.5 py-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Altere quantidades, adicione <strong>observações</strong> ou <strong>retire itens</strong>. Ao salvar, a comanda é atualizada automaticamente na <strong>Cozinha</strong> e no <strong>Caixa</strong>.
                </p>
              </div>

              {itensLancadosEditando.length === 0 ? (
                <div className="text-center py-10 px-4 bg-rose-50/60 border border-dashed border-rose-200 rounded-2xl space-y-2">
                  <Trash2 className="w-7 h-7 text-rose-500 mx-auto" />
                  <p className="text-sm font-bold text-rose-900">
                    Todos os itens foram retirados desta comanda
                  </p>
                  <p className="text-xs text-rose-700 max-w-xs mx-auto">
                    Toque em <strong>Salvar e Encerrar Comanda</strong> abaixo para confirmar a retirada ou em <strong>Cancelar</strong> para desfazer.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {itensLancadosEditando.map(item => {
                    const obsAberta = obsAbertaLancadoId === item.id_temp;
                    const confirmandoRemocao = confirmRemoverLancadoId === item.id_temp;
                    const isPeso = Boolean(item.peso_gramas);

                    return (
                      <div
                        key={item.id_temp}
                        className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                          confirmandoRemocao
                            ? 'bg-rose-50/80 border-rose-300'
                            : 'bg-stone-50 border-stone-200'
                        }`}
                      >
                        {/* Topo: Nome, preço unitário, observação atual e subtotal */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-stone-900 text-sm leading-snug">
                              {item.produto.nome}
                            </p>
                            <p className="text-xs text-stone-500 font-mono tabular-nums mt-0.5">
                              R$ {Number(item.produto.preco || 0).toFixed(2)} {isPeso ? 'porção' : 'un.'}
                            </p>

                            {item.observacao && !obsAberta && (
                              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg px-2 py-1 mt-1.5 inline-flex items-center gap-1 font-medium">
                                <MessageSquare className="w-3 h-3 shrink-0 text-amber-600" />
                                <span>{item.observacao}</span>
                              </p>
                            )}
                          </div>

                          <span className="font-mono tabular-nums font-black text-stone-900 text-sm shrink-0">
                            R$ {Number(item.subtotal || 0).toFixed(2)}
                          </span>
                        </div>

                        {/* Confirmação inline de retirada OU barra de controles */}
                        {confirmandoRemocao ? (
                          <div className="pt-2.5 border-t border-rose-200 flex items-center justify-between gap-2 animate-fadeIn">
                            <span className="text-xs font-bold text-rose-800">
                              Retirar este item do pedido?
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setConfirmRemoverLancadoId(null)}
                                className="min-h-[36px] px-3 rounded-xl bg-white border border-stone-300 text-stone-700 font-bold text-xs cursor-pointer"
                              >
                                Não
                              </button>
                              <button
                                type="button"
                                onClick={() => removerItemLancado(item.id_temp)}
                                className="min-h-[36px] px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
                              >
                                Confirmar Retirada
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-stone-200/70">
                            {/* Stepper de quantidade */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => alterarQuantidadeLancado(item.id_temp, -1)}
                                aria-label="Diminuir quantidade"
                                className="w-9 h-9 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="min-w-[2rem] text-center font-mono tabular-nums font-black text-sm text-stone-900">
                                {item.quantidade}x
                              </span>
                              <button
                                type="button"
                                onClick={() => alterarQuantidadeLancado(item.id_temp, 1)}
                                aria-label="Aumentar quantidade"
                                className="w-9 h-9 rounded-xl bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 text-emerald-700 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Botões de Observação e Retirar */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setObsAbertaLancadoId(obsAberta ? null : item.id_temp)
                                }
                                className={`h-9 px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
                                  obsAberta || item.observacao
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-white text-stone-700 border-stone-200 hover:border-amber-300 hover:bg-amber-50'
                                }`}
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>{item.observacao ? 'Editar Obs.' : 'Observação'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setObsAbertaLancadoId(null);
                                  setConfirmRemoverLancadoId(item.id_temp);
                                }}
                                aria-label={`Retirar ${item.produto.nome}`}
                                className="h-9 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Retirar</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Editor inline de Observação */}
                        {obsAberta && !confirmandoRemocao && (
                          <div className="pt-2.5 border-t border-stone-200/80 space-y-2 animate-fadeIn">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={item.observacao || ''}
                                onChange={e => atualizarObsLancado(item.id_temp, e.target.value)}
                                placeholder="Ex: Sem cebola, bem passado, para viagem..."
                                autoFocus
                                className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-amber-600 outline-none"
                              />
                              {item.observacao && (
                                <button
                                  type="button"
                                  onClick={() => atualizarObsLancado(item.id_temp, '')}
                                  className="px-2.5 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold cursor-pointer shrink-0"
                                  title="Limpar observação"
                                >
                                  Limpar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setObsAbertaLancadoId(null)}
                                className="px-3 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer shrink-0"
                              >
                                OK
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {OBS_RAPIDAS_GARCOM.map(chip => {
                                const ativo = (item.observacao || '')
                                  .toLowerCase()
                                  .includes(chip.toLowerCase());
                                return (
                                  <button
                                    key={chip}
                                    type="button"
                                    onClick={() =>
                                      atualizarObsLancado(
                                        item.id_temp,
                                        toggleChipObservacao(item.observacao, chip)
                                      )
                                    }
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                                      ativo
                                        ? 'bg-amber-600 text-white border-amber-600'
                                        : 'bg-white text-stone-700 border-stone-200 hover:border-amber-400'
                                    }`}
                                  >
                                    {chip}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rodapé fixo com total atualizado e ação de salvar */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-3 shrink-0">
              <div className="flex items-center justify-between px-1">
                <div>
                  <span className="text-xs font-semibold text-stone-500 block">
                    Total atualizado da comanda
                  </span>
                  {houveAlteracaoLancados && (
                    <span className="text-[11px] font-semibold text-amber-700">
                      Existem alterações pendentes para salvar
                    </span>
                  )}
                </div>
                <span className="text-xl font-black font-mono tabular-nums text-stone-900">
                  R$ {totalEditandoLancados.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={fecharModalEditarLancados}
                  disabled={salvandoEdicaoLancados}
                  className="min-h-[48px] px-4 rounded-2xl bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  {houveAlteracaoLancados ? 'Cancelar' : 'Fechar'}
                </button>

                {houveAlteracaoLancados && (
                  <button
                    type="button"
                    onClick={handleSalvarEdicaoLancados}
                    disabled={salvandoEdicaoLancados}
                    className={`flex-1 min-h-[48px] px-5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer ${
                      itensLancadosEditando.length === 0
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {salvandoEdicaoLancados
                        ? 'Salvando...'
                        : itensLancadosEditando.length === 0
                          ? 'Salvar e Encerrar Comanda'
                          : 'Salvar Alterações'}
                    </span>
                  </button>
                )}
              </div>
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
