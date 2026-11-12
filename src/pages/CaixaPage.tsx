import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLoyalty } from '../context/LoyaltyContext';
import { Cliente, Compra, Produto, Categoria, ItemCarrinho, MesaAberta, NotaFiscal, ConfiguracaoFiscal, PedidoOnline } from '../types';
import { cleanPhone, formatPhoneDisplay } from '../services/whatsapp';
import { buscarClientePorTelefone } from '../services/clientSearch';
import { fetchProdutos, fetchCategorias, fetchMesasAbertas, saveMesaAberta, deleteMesaAberta, liberarMesaTotal, fetchPedidosCozinha, updatePedidoCozinhaStatus, fetchPedidosOnline, INITIAL_CONFIG_FISCAL, getLocal, STORAGE_KEYS } from '../services/db';
import { AwardModal } from '../components/AwardModal';
import { ClienteProfileModal } from '../components/ClienteProfileModal';
import { AlertModal } from '../components/AlertModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { QrCodeMesasModal } from '../components/QrCodeMesasModal';
import { ModalEmissaoNfe } from '../components/ModalEmissaoNfe';
import { ModalComandaOnlineCaixa } from '../components/ModalComandaOnlineCaixa';
import { fetchConfigFiscal, emitirNotaFiscal, formatarCpf } from '../services/nfeService';
import { 
  UserCheck, 
  UserPlus, 
  Flame, 
  Award, 
  Check,
  CheckCircle2,
  ArrowRight, 
  Clock, 
  DollarSign, 
  Sparkles,
  Phone,
  ShieldCheck,
  Info,
  FileText,
  Eye,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Coffee,
  Package,
  Search,
  QrCode,
  CreditCard,
  Banknote,
  Monitor,
  LayoutGrid,
  Timer,
  Save,
  Tag,
  Zap,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  UtensilsCrossed,
  Globe,
  Copy,
  CheckCheck,
  X
} from 'lucide-react';

export const CaixaPage: React.FC = () => {
  const { 
    clientes, 
    compras, 
    config, 
    resumosMensais, 
    registrarNovaCompra, 
    cadastrarERegistrarCompra 
  } = useLoyalty();

  const [modoCaixa, setModoCaixa] = useState<'balcao' | 'mesas'>('balcao');
  const [mesasAbertas, setMesasAbertas] = useState<MesaAberta[]>([]);
  const [mesaSelecionada, setMesaSelecionada] = useState<MesaAberta | null>(null);
  const [mesaComandaModal, setMesaComandaModal] = useState<MesaAberta | null>(null);
  const [mesaParaLiberarConfirm, setMesaParaLiberarConfirm] = useState<MesaAberta | null>(null);
  const [modalQrCodeAberto, setModalQrCodeAberto] = useState(false);

  // Estados de Busca, Filtro e Abertura Rápida de Comandas
  const [buscaComanda, setBuscaComanda] = useState('');
  const [filtroComanda, setFiltroComanda] = useState<'todas' | 'ocupadas' | 'livres'>('todas');
  const [modalNovaComandaCaixa, setModalNovaComandaCaixa] = useState(false);
  const [numeroNovaComandaInput, setNumeroNovaComandaInput] = useState('');
  const [nomeNovoClienteComanda, setNomeNovoClienteComanda] = useState('');

  // Estados da Comanda Online (Pedidos de Casa)
  const [pedidosOnline, setPedidosOnline] = useState<PedidoOnline[]>([]);
  const [modalOnlineCaixaAberto, setModalOnlineCaixaAberto] = useState(false);
  const [linkOnlineCopiado, setLinkOnlineCopiado] = useState(false);

  // Estados do Catálogo e Carrinho com Hidratação Instantânea (Zero Delay)
  const [produtos, setProdutos] = useState<Produto[]>(() => getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []));
  const [categorias, setCategorias] = useState<Categoria[]>(() => getLocal<Categoria[]>(STORAGE_KEYS.CATEGORIAS, []));
  const [isCarregandoCatalogo, setIsCarregandoCatalogo] = useState(() => {
    const cached = getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []);
    return cached.length === 0;
  });
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);

  // Controle de Visualização e Paginação do Catálogo (UI/UX sem descida infinita)
  const [modoExibicaoCatalogo, setModoExibicaoCatalogo] = useState<'scroll' | 'paginacao'>('scroll');
  const [paginaCatalogo, setPaginaCatalogo] = useState(1);
  const ITENS_POR_PAGINA = 12;
  const catalogoScrollRef = useRef<HTMLDivElement>(null);

  // Busca de Produtos e Lançamento Manual
  const [termoBusca, setTermoBusca] = useState('');
  const [valorPersonalizado, setValorPersonalizado] = useState('');
  const buscaInputRef = useRef<HTMLInputElement>(null);
  const valorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPaginaCatalogo(1);
    if (catalogoScrollRef.current) {
      catalogoScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [categoriaAtiva, termoBusca]);

  // Estados da busca no caixa
  const [telefoneInput, setTelefoneInput] = useState('');
  const [clienteEncontrado, setClienteEncontrado] = useState<Cliente | null>(null);
  const [isNovoCliente, setIsNovoCliente] = useState(false);
  const [nomeNovoCliente, setNomeNovoCliente] = useState('');
  
  const [isProcessando, setIsProcessando] = useState(false);
  const [sucessoMensagem, setSucessoMensagem] = useState<string | null>(null);
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean; message: string; title?: string}>({isOpen: false, message: ''});

  // Modal de perfil completo
  const [perfilAberto, setPerfilAberto] = useState(false);

  // Campos de Perfil Completo
  const [mostrarPerfilCompleto, setMostrarPerfilCompleto] = useState(false);
  const [emailNovoCliente, setEmailNovoCliente] = useState('');
  const [dataNascNovoCliente, setDataNascNovoCliente] = useState('');
  const [notasNovoCliente, setNotasNovoCliente] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro'>('pix');

  // Módulo Fiscal / NF-e
  const [cpfNaNota, setCpfNaNota] = useState('');
  const [emitirNfeCheck, setEmitirNfeCheck] = useState(true);
  const [modalNfe, setModalNfe] = useState<{ aberto: boolean; nota: NotaFiscal | null }>({ aberto: false, nota: null });
  const [configFiscal, setConfigFiscal] = useState<ConfiguracaoFiscal>(INITIAL_CONFIG_FISCAL);

  // Modal de prêmio
  const [modalPremio, setModalPremio] = useState<{
    aberto: boolean;
    cliente: Cliente | null;
    comprasMes: number;
  }>({ aberto: false, cliente: null, comprasMes: 0 });

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const nomeInputRef = useRef<HTMLInputElement>(null);

  // Carregamento do catálogo sincronizado em tempo real com o Painel do Dono
  const carregarCatalogo = useCallback(() => {
    fetchProdutos()
      .then(prods => {
        setProdutos(prods);
        setIsCarregandoCatalogo(false);
      })
      .catch(() => setIsCarregandoCatalogo(false));

    fetchCategorias().then(cats => {
      setCategorias(cats);
      setCategoriaAtiva(prev => {
        if (prev && prev !== 'todos' && cats.some(c => c.id === prev)) {
          return prev;
        }
        return 'todos';
      });
    });
  }, []);

  useEffect(() => {
    carregarCatalogo();
    const carregarMesas = () => fetchMesasAbertas().then(setMesasAbertas);
    carregarMesas();

    const carregarFiscal = () => {
      fetchConfigFiscal().then((cfg: ConfiguracaoFiscal) => {
        setConfigFiscal(cfg);
        setEmitirNfeCheck(Boolean(cfg.emissao_automatica_pdv));
      });
    };
    carregarFiscal();

    const carregarPedidosOnline = () => {
      fetchPedidosOnline().then(setPedidosOnline).catch(() => {});
    };
    carregarPedidosOnline();

    const interval = setInterval(() => {
      carregarMesas();
      carregarPedidosOnline();
    }, 2000);

    window.addEventListener('mesas_atualizadas', carregarMesas);
    window.addEventListener('novo_pedido_cozinha', carregarMesas);
    window.addEventListener('pedidos_cozinha_atualizados', carregarMesas);
    window.addEventListener('catalogo_atualizado', carregarCatalogo);
    window.addEventListener('produtos_atualizados', carregarCatalogo);
    window.addEventListener('categorias_atualizadas', carregarCatalogo);
    window.addEventListener('config_fiscal_atualizada', carregarFiscal);
    window.addEventListener('pedidos_online_atualizados', carregarPedidosOnline);
    window.addEventListener('novo_pedido_online', carregarPedidosOnline);
    window.addEventListener('storage', carregarMesas);
    window.addEventListener('storage', carregarCatalogo);
    window.addEventListener('storage', carregarFiscal);
    window.addEventListener('storage', carregarPedidosOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mesas_atualizadas', carregarMesas);
      window.removeEventListener('novo_pedido_cozinha', carregarMesas);
      window.removeEventListener('pedidos_cozinha_atualizados', carregarMesas);
      window.removeEventListener('catalogo_atualizado', carregarCatalogo);
      window.removeEventListener('produtos_atualizados', carregarCatalogo);
      window.removeEventListener('categorias_atualizadas', carregarCatalogo);
      window.removeEventListener('config_fiscal_atualizada', carregarFiscal);
      window.removeEventListener('pedidos_online_atualizados', carregarPedidosOnline);
      window.removeEventListener('novo_pedido_online', carregarPedidosOnline);
      window.removeEventListener('storage', carregarMesas);
      window.removeEventListener('storage', carregarCatalogo);
      window.removeEventListener('storage', carregarFiscal);
      window.removeEventListener('storage', carregarPedidosOnline);
    };
  }, [carregarCatalogo]);

  useEffect(() => {
    phoneInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const { match, isNovoCliente: isNovo } = buscarClientePorTelefone(clientes, telefoneInput);
    if (match) {
      setClienteEncontrado(match);
      setIsNovoCliente(false);
      setNomeNovoCliente('');
      setMostrarPerfilCompleto(false);
      setEmailNovoCliente('');
      setDataNascNovoCliente('');
      setNotasNovoCliente('');
    } else if (isNovo) {
      setClienteEncontrado(null);
      setIsNovoCliente(true);
    } else {
      setClienteEncontrado(null);
      setIsNovoCliente(false);
    }
  }, [telefoneInput, clientes]);

  useEffect(() => {
    const digits = cleanPhone(telefoneInput);
    if (isNovoCliente && digits.length >= 11 && !mostrarPerfilCompleto) {
      const timer = setTimeout(() => {
        nomeInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isNovoCliente, telefoneInput, mostrarPerfilCompleto]);

  const resumoAtual = clienteEncontrado
    ? resumosMensais.find((r) => r.cliente.id === clienteEncontrado.id)
    : null;

  const comprasValidasMes = resumoAtual ? resumoAtual.compras_validas_fidelidade : 0;
  const porcentagemMeta = Math.min(100, Math.round((comprasValidasMes / config.meta_compras_mes) * 100));

  const totalCarrinho = carrinho.reduce((acc, item) => acc + item.subtotal, 0);
  const pontuaFidelidade = totalCarrinho >= (config.valor_minimo_pontuacao || 0);

  const resetarFormulario = useCallback(() => {
    setTelefoneInput('');
    setClienteEncontrado(null);
    setIsNovoCliente(false);
    setNomeNovoCliente('');
    setCpfNaNota('');
    setMostrarPerfilCompleto(false);
    setEmailNovoCliente('');
    setDataNascNovoCliente('');
    setNotasNovoCliente('');
    setCarrinho([]);
    phoneInputRef.current?.focus();
    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 50);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setModalPremio({ aberto: false, cliente: null, comprasMes: 0 });
        resetarFormulario();
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (carrinho.length > 0 && !isProcessandoRef.current) {
          handleConfirmarCompra(undefined, true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [resetarFormulario, carrinho.length]);

  const isProcessandoRef = useRef(false);

  const handleConfirmarCompra = async (e?: React.FormEvent, forceAnonimo: boolean = false): Promise<boolean> => {
    if (e) e.preventDefault();
    if (isProcessando || isProcessandoRef.current) return false;

    if (carrinho.length === 0) {
      setAlertConfig({ isOpen: true, message: 'O carrinho está vazio.' });
      return false;
    }

    try {
      isProcessandoRef.current = true;
      setIsProcessando(true);
      
      const detalhesCompra = carrinho.map(i => `${i.quantidade}x ${i.produto.nome}`).join(', ');
      const carrinhoSnapshot = [...carrinho];
      const clienteCpf = cpfNaNota ? cleanPhone(cpfNaNota) : undefined;
      let clienteNome = 'Consumidor Final';
      let clienteTelefone = '';
      let compraRegistrada: Compra | null = null;

      // Se a mesa possuía cliente vinculado, prioriza o cliente da mesa ou clienteEncontrado
      let clienteParaVenda = clienteEncontrado;
      if (!clienteParaVenda && mesaSelecionada?.cliente_id) {
        clienteParaVenda = clientes.find(c => c.id === mesaSelecionada.cliente_id) || null;
      }
      if (!clienteParaVenda && mesaSelecionada?.cliente_nome) {
        clienteParaVenda = clientes.find(c => c.nome.trim().toLowerCase() === mesaSelecionada.cliente_nome!.trim().toLowerCase()) || null;
      }

      if (clienteParaVenda && !forceAnonimo) {
        clienteNome = clienteParaVenda.nome;
        clienteTelefone = clienteParaVenda.whatsapp;
        const resultado = await registrarNovaCompra(clienteParaVenda.id, totalCarrinho, detalhesCompra, carrinho, formaPagamento);
        compraRegistrada = resultado.compra;
        
        if (resultado.atingiuMetaAgora) {
          setModalPremio({
            aberto: true,
            cliente: clienteParaVenda,
            comprasMes: resultado.totalMes
          });
        } else {
          setSucessoMensagem(
            `Compra de R$ ${totalCarrinho.toFixed(2)} (${formaPagamento.toUpperCase()}) registrada para ${clienteParaVenda.nome}! ${
              resultado.pontuou ? `(${resultado.totalMes}ª visita válida no mês)` : '(abaixo do mínimo de pontuação)'
            }`
          );
          setTimeout(() => setSucessoMensagem(null), 3500);
        }
      } else if (isNovoCliente && !forceAnonimo) {
        let nomeDoCliente = nomeNovoCliente.trim();
        const apenasNumeros = cleanPhone(telefoneInput);
        
        if (apenasNumeros === '0') {
          nomeDoCliente = nomeDoCliente || 'Cliente Não Identificado';
        }

        if (!nomeDoCliente) {
          setAlertConfig({ isOpen: true, title: 'Aviso', message: 'Por favor, informe ao menos o Nome do cliente para o cadastro relâmpago.' });
          nomeInputRef.current?.focus();
          isProcessandoRef.current = false; setIsProcessando(false); return true; 
        }

        clienteNome = nomeDoCliente;
        clienteTelefone = apenasNumeros !== '0' ? apenasNumeros : '';

        const resultado = await cadastrarERegistrarCompra(
          nomeDoCliente,
          apenasNumeros,
          totalCarrinho,
          detalhesCompra,
          dataNascNovoCliente || null,
          emailNovoCliente.trim() || null,
          notasNovoCliente.trim() || null,
          carrinho,
          formaPagamento
        );
        compraRegistrada = resultado.compra;

        setSucessoMensagem(apenasNumeros === '0' 
          ? `Venda de R$ ${totalCarrinho.toFixed(2)} registrada no balcão!` 
          : `Cliente ${resultado.cliente.nome} cadastrado e 1ª compra registrada! 🎉`
        );
        setTimeout(() => setSucessoMensagem(null), 3500);
      } else {
        // VENDA RÁPIDA / BALCÃO / ANÔNIMO - Zero atrito na hora da pressa
        const resultado = await cadastrarERegistrarCompra(
          'Venda Balcão / Anônimo',
          '0',
          totalCarrinho,
          detalhesCompra,
          null,
          null,
          'Venda rápida balcão sem identificação',
          carrinho,
          formaPagamento
        );
        compraRegistrada = resultado.compra;

        const labelPgto = formaPagamento === 'pix' ? 'PIX' : formaPagamento === 'dinheiro' ? 'DINHEIRO' : formaPagamento === 'cartao_credito' ? 'CRÉDITO' : 'DÉBITO';
        setSucessoMensagem(
          `Venda Rápida de R$ ${totalCarrinho.toFixed(2)} [${labelPgto}] confirmada com sucesso!`
        );
        setTimeout(() => setSucessoMensagem(null), 3500);
      }

      // Emissão Fiscal Automática (NFC-e)
      if (compraRegistrada && (emitirNfeCheck || cpfNaNota.trim() || configFiscal?.emissao_automatica_pdv)) {
        try {
          const notaFiscal = await emitirNotaFiscal(
            compraRegistrada,
            carrinhoSnapshot,
            {
              nome: clienteNome,
              cpf: clienteCpf,
              whatsapp: clienteTelefone
            }
          );
          setModalNfe({ aberto: true, nota: notaFiscal });
        } catch (fiscalErr) {
          console.warn('Emissão fiscal automática no PDV ignorada ou pendente:', fiscalErr);
        }
      }

      // REGRA DO USUÁRIO: Ao fechar pagamento da mesa, ela é liberada (sinal verde) e os pedidos da cozinha são concluídos
      if (mesaSelecionada) {
        try {
          await liberarMesaTotal(mesaSelecionada.id, mesaSelecionada.mesa_numero);
          setMesasAbertas(prev => prev.filter(m => m.id !== mesaSelecionada.id && m.mesa_numero !== mesaSelecionada.mesa_numero));
          
          const peds = await fetchPedidosCozinha();
          const daMesa = peds.filter(p => p.mesa_numero === mesaSelecionada.mesa_numero && p.status !== 'cancelado');
          for (const ped of daMesa) {
            await updatePedidoCozinhaStatus(ped.id, 'entregue');
          }
        } catch (errMesa) {
          console.warn('Erro ao liberar mesa no pagamento:', errMesa);
        }

        const numMesaFormatado = mesaSelecionada.mesa_numero < 10 ? `0${mesaSelecionada.mesa_numero}` : mesaSelecionada.mesa_numero;
        setSucessoMensagem(
          `Pagamento da Mesa ${numMesaFormatado} recebido com sucesso! Mesa liberada (sinal verde).`
        );
        setTimeout(() => setSucessoMensagem(null), 4000);
        setMesaSelecionada(null);
        setModoCaixa('mesas');
      }

      resetarFormulario();
      return true;
    } catch (err) {
      console.error('Erro ao registrar compra no caixa:', err);
      setAlertConfig({ isOpen: true, title: 'Aviso', message: 'Houve um erro ao processar a compra. Tente novamente.' });
      return false;
    } finally {
      isProcessandoRef.current = false;
      setIsProcessando(false);
    }
  };

  const produtosFiltrados = useMemo(() => {
    return termoBusca.trim() === '' 
      ? [] 
      : produtos.filter(p => p.ativo !== false && p.nome.toLowerCase().includes(termoBusca.toLowerCase()));
  }, [termoBusca, produtos]);

  const produtosFiltradosPorBuscaOuCategoria = useMemo(() => {
    if (termoBusca.trim() !== '') {
      return produtos.filter(p => p.ativo !== false && p.nome.toLowerCase().includes(termoBusca.toLowerCase()));
    }
    if (!categoriaAtiva || categoriaAtiva === 'todos') {
      return produtos.filter(p => p.ativo !== false);
    }
    return produtos.filter(p => p.ativo !== false && p.categoria_id === categoriaAtiva);
  }, [termoBusca, produtos, categoriaAtiva]);

  const totalItensCatalogo = produtosFiltradosPorBuscaOuCategoria.length;
  const totalPaginasCatalogo = Math.max(1, Math.ceil(totalItensCatalogo / ITENS_POR_PAGINA));
  const produtosExibidos = useMemo(() => {
    if (modoExibicaoCatalogo === 'scroll') {
      return produtosFiltradosPorBuscaOuCategoria;
    }
    const inicio = (paginaCatalogo - 1) * ITENS_POR_PAGINA;
    return produtosFiltradosPorBuscaOuCategoria.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [produtosFiltradosPorBuscaOuCategoria, modoExibicaoCatalogo, paginaCatalogo]);

  const handleBuscaProdutoSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!termoBusca.trim()) return;

    const precoCustomizado = valorPersonalizado ? parseFloat(valorPersonalizado.replace(',', '.')) : null;

    if (produtosFiltrados.length === 1) {
      const produto = produtosFiltrados[0];
      if (precoCustomizado && !isNaN(precoCustomizado) && precoCustomizado > 0) {
        // Produto existe mas valor foi editado
        adicionarAoCarrinho({
          ...produto,
          id: `${produto.id}-custom-${Date.now()}`,
          preco: precoCustomizado,
          nome: `${produto.nome} (Valor Editado)`
        });
      } else {
        adicionarAoCarrinho(produto);
      }
      setTermoBusca('');
      setValorPersonalizado('');
    } else if (produtosFiltrados.length === 0 && precoCustomizado && !isNaN(precoCustomizado) && precoCustomizado > 0) {
      // Produto não existe (avulso)
      const produtoFake: Produto = {
        id: `avulso-${Date.now()}`,
        categoria_id: 'avulso',
        nome: termoBusca.trim(),
        preco: precoCustomizado,
        ativo: true
      };
      adicionarAoCarrinho(produtoFake);
      setTermoBusca('');
      setValorPersonalizado('');
    } else if (produtosFiltrados.length > 1) {
      buscaInputRef.current?.blur();
    } else {
      if (produtosFiltrados.length === 0) {
        setAlertConfig({ isOpen: true, title: 'Aviso', message: 'Produto não encontrado. Digite um valor se quiser adicioná-mo como avulso.' });
        valorInputRef.current?.focus();
      }
    }
  };

  const adicionarAoCarrinho = (produto: Produto) => {
    setCarrinho(prev => {
      const existente = prev.find(item => item.produto.id === produto.id);
      if (produto.controlar_estoque && produto.estoque_atual !== undefined) {
        const qtdAtual = existente ? existente.quantidade : 0;
        if (qtdAtual >= produto.estoque_atual) {
          setAlertConfig({ isOpen: true, message: `Estoque insuficiente! Restam apenas ${produto.estoque_atual} unidade(s) de "${produto.nome}".` });
          return prev;
        }
      }
      if (existente) {
        return prev.map(item => 
          item.produto.id === produto.id 
            ? { ...item, quantidade: item.quantidade + 1, subtotal: (item.quantidade + 1) * produto.preco }
            : item
        );
      }
      return [...prev, { id_temp: Date.now().toString(), produto, quantidade: 1, subtotal: produto.preco }];
    });
  };

  const alterarQuantidade = (id_temp: string, delta: number) => {
    setCarrinho(prev => prev.map(item => {
      if (item.id_temp === id_temp) {
        if (delta > 0 && item.produto.controlar_estoque && item.produto.estoque_atual !== undefined) {
          if (item.quantidade >= item.produto.estoque_atual) {
            setAlertConfig({ isOpen: true, message: `Estoque máximo atingido! Restam apenas ${item.produto.estoque_atual} unidade(s) de "${item.produto.nome}".` });
            return item;
          }
        }
        const novaQtd = Math.max(1, item.quantidade + delta);
        return { ...item, quantidade: novaQtd, subtotal: novaQtd * item.produto.preco };
      }
      return item;
    }));
  };

  const removerDoCarrinho = (id_temp: string) => {
    setCarrinho(prev => prev.filter(item => item.id_temp !== id_temp));
  };

  const handleSalvarMesa = async () => {
    if (!mesaSelecionada) return;
    try {
      setIsProcessando(true);
      
      if (carrinho.length === 0) {
        await liberarMesaTotal(mesaSelecionada.id, mesaSelecionada.mesa_numero);
        setMesasAbertas(prev => prev.filter(m => m.id !== mesaSelecionada.id && m.mesa_numero !== mesaSelecionada.mesa_numero));
        setMesaSelecionada(null);
        setSucessoMensagem(`Mesa ${mesaSelecionada.mesa_numero} liberada com sucesso!`);
      } else {
        const novaMesa = {
          ...mesaSelecionada,
          carrinho,
          total: totalCarrinho,
        };
        const saved = await saveMesaAberta(novaMesa);
        setMesasAbertas(prev => {
          const idx = prev.findIndex(m => m.id === saved.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = saved;
            return next;
          }
          return [...prev, saved];
        });
        setSucessoMensagem(`Mesa ${saved.mesa_numero} salva com sucesso!`);
      }
      setTimeout(() => setSucessoMensagem(null), 3500);
      setMesaSelecionada(null);
      setModoCaixa('mesas');
      setCarrinho([]);
    } catch (err) {
      setAlertConfig({ isOpen: true, message: 'Erro ao salvar a mesa.' });
    } finally {
      setIsProcessando(false);
    }
  };

  const normalizarItensMesa = useCallback((mesa: MesaAberta, catalogo: Produto[]): ItemCarrinho[] => {
    const listaRaw = (mesa.carrinho && mesa.carrinho.length > 0)
      ? mesa.carrinho
      : ((mesa.itens && mesa.itens.length > 0) ? mesa.itens : []);

    if (!listaRaw || listaRaw.length === 0) return [];

    return listaRaw.map((it: any, idx: number) => {
      if (it.produto && typeof it.produto === 'object' && it.produto.nome) {
        const prodDoCatalogo = catalogo.find(p => p.id === it.produto.id || p.nome.toLowerCase() === it.produto.nome.toLowerCase());
        return {
          id_temp: it.id_temp || `item-mesa-${Date.now()}-${idx}`,
          produto: {
            id: it.produto.id || prodDoCatalogo?.id || `prod-${idx}`,
            categoria_id: it.produto.categoria_id || prodDoCatalogo?.categoria_id || '',
            nome: it.produto.nome,
            preco: Number(it.produto.preco) || (Number(it.subtotal) / (Number(it.quantidade) || 1)) || 0,
            ativo: true,
            controlar_estoque: Boolean(it.produto.controlar_estoque || prodDoCatalogo?.controlar_estoque),
            estoque_atual: it.produto.estoque_atual ?? prodDoCatalogo?.estoque_atual
          },
          quantidade: Number(it.quantidade) || 1,
          subtotal: Number(it.subtotal) || ((Number(it.quantidade) || 1) * (Number(it.produto.preco) || 0))
        };
      }

      const nome = it.nome || 'Produto';
      const prodDoCatalogo = catalogo.find(p => (it.produto_id && p.id === it.produto_id) || p.nome.toLowerCase() === nome.toLowerCase());
      const preco = Number(it.preco_unitario) || Number(it.preco) || prodDoCatalogo?.preco || (Number(it.subtotal) / (Number(it.quantidade) || 1)) || 0;
      const qtd = Number(it.quantidade) || 1;
      const subtotal = Number(it.subtotal) || (qtd * preco);

      return {
        id_temp: it.id_temp || `item-mesa-${Date.now()}-${idx}`,
        produto: {
          id: it.produto_id || prodDoCatalogo?.id || `prod-${idx}`,
          categoria_id: prodDoCatalogo?.categoria_id || '',
          nome: nome,
          preco: preco,
          ativo: true,
          controlar_estoque: Boolean(prodDoCatalogo?.controlar_estoque),
          estoque_atual: prodDoCatalogo?.estoque_atual
        },
        quantidade: qtd,
        subtotal: subtotal
      };
    });
  }, []);

  const iniciarAtendimentoMesa = (numero: number) => {
    setMesaSelecionada({
      id: `mesa-${numero}`,
      mesa_id: numero.toString(),
      mesa_numero: numero,
      criado_em: new Date().toISOString(),
      carrinho: [],
      total: 0
    });
    setCarrinho([]);
    setClienteEncontrado(null);
    setTelefoneInput('');
    setNomeNovoCliente('');
    setMesaComandaModal(null);
  };

  const puxarComandaParaFaturar = (mesa: MesaAberta) => {
    const itensNormalizados = normalizarItensMesa(mesa, produtos);
    setMesaSelecionada(mesa);
    setCarrinho(itensNormalizados);

    // Auto-selecionar o cliente da mesa no caixa para fidelidade e histórico!
    let cli: Cliente | null = null;
    if (mesa.cliente_id) {
      cli = clientes.find(c => c.id === mesa.cliente_id) || null;
    }
    if (!cli && mesa.cliente_nome) {
      cli = clientes.find(c => c.nome.trim().toLowerCase() === mesa.cliente_nome!.trim().toLowerCase()) || null;
    }
    if (cli) {
      setClienteEncontrado(cli);
      setTelefoneInput(cli.whatsapp ? formatPhoneDisplay(cli.whatsapp) : '');
      setIsNovoCliente(false);
    } else if (mesa.cliente_telefone) {
      setTelefoneInput(formatPhoneDisplay(mesa.cliente_telefone));
    } else if (mesa.cliente_nome) {
      setNomeNovoCliente(mesa.cliente_nome);
    }

    setMesaComandaModal(null);
    setSucessoMensagem(`Comanda da Mesa ${mesa.mesa_numero < 10 ? `0${mesa.mesa_numero}` : mesa.mesa_numero} puxada para faturar! Selecione a forma de pagamento.`);
    setTimeout(() => setSucessoMensagem(null), 4000);
  };

  const cobrarComandaDireto = async (mesa: MesaAberta, forma: 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito') => {
    if (isProcessando) return;
    try {
      setIsProcessando(true);
      const itensNormalizados = normalizarItensMesa(mesa, produtos);
      const total = mesa.total || itensNormalizados.reduce((acc, i) => acc + (i.subtotal || 0), 0);
      const detalhesCompra = itensNormalizados.map(i => `${i.quantidade}x ${i.produto.nome}`).join(', ') || 'Consumo Mesa';

      let cliParaVenda: Cliente | null = null;
      if (mesa.cliente_id) {
        cliParaVenda = clientes.find(c => c.id === mesa.cliente_id) || null;
      }
      if (!cliParaVenda && mesa.cliente_nome) {
        cliParaVenda = clientes.find(c => c.nome.trim().toLowerCase() === mesa.cliente_nome!.trim().toLowerCase()) || null;
      }

      let compraRegistrada: Compra | null = null;
      if (cliParaVenda) {
        const res = await registrarNovaCompra(cliParaVenda.id, total, detalhesCompra, itensNormalizados, forma);
        compraRegistrada = res.compra;
      } else {
        const res = await cadastrarERegistrarCompra(
          mesa.cliente_nome || `Mesa ${mesa.mesa_numero}`,
          mesa.cliente_telefone || '0',
          total,
          detalhesCompra,
          null,
          null,
          `Consumo Mesa ${mesa.mesa_numero}`,
          itensNormalizados,
          forma
        );
        compraRegistrada = res.compra;
      }

      if (configFiscal.emissao_automatica_pdv && compraRegistrada) {
        try {
          const nota = await emitirNotaFiscal(
            compraRegistrada,
            itensNormalizados,
            { nome: mesa.cliente_nome || 'Consumidor', whatsapp: mesa.cliente_telefone }
          );
          setModalNfe({ aberto: true, nota });
        } catch (e) {
          console.warn('Emissão fiscal automática pendente:', e);
        }
      }

      await liberarMesaTotal(mesa.id, mesa.mesa_numero);
      setMesasAbertas(prev => prev.filter(m => m.id !== mesa.id && m.mesa_numero !== mesa.mesa_numero));

      const peds = await fetchPedidosCozinha();
      const daMesa = peds.filter(p => p.mesa_numero === mesa.mesa_numero && p.status !== 'cancelado');
      for (const ped of daMesa) {
        await updatePedidoCozinhaStatus(ped.id, 'entregue');
      }

      setMesaComandaModal(null);
      setMesaSelecionada(null);
      setCarrinho([]);
      setSucessoMensagem(`Pagamento da Mesa ${mesa.mesa_numero < 10 ? `0${mesa.mesa_numero}` : mesa.mesa_numero} (${forma.toUpperCase()}) de R$ ${total.toFixed(2)} recebido com sucesso! Mesa liberada.`);
      setTimeout(() => setSucessoMensagem(null), 4000);
    } catch (err) {
      console.error('Erro ao cobrar comanda direto:', err);
      setAlertConfig({ isOpen: true, title: 'Erro', message: 'Houve uma falha ao receber o pagamento da mesa.' });
    } finally {
      setIsProcessando(false);
    }
  };

  const handleAbrirMesa = (numero: number) => {
    const mesaAtual = mesasAbertas.find(m => m.mesa_numero === numero);
    if (mesaAtual) {
      setMesaComandaModal(mesaAtual);
    } else {
      iniciarAtendimentoMesa(numero);
    }
  };

  const formatTempoPerm = (isoStr: string) => {
    const start = new Date(isoStr).getTime();
    const now = Date.now();
    const diff = now - start;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Cronometro Update
  const [, setTick] = useState(0);
  useEffect(() => {
    if (modoCaixa === 'mesas' && !mesaSelecionada) {
      const interval = setInterval(() => setTick(t => t + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [modoCaixa, mesaSelecionada]);

  // Métricas e Ações da Comanda Online
  const pedidosOnlineAtivos = useMemo(() => {
    return pedidosOnline.filter(p => p.status !== 'entregue' && p.status !== 'cancelado');
  }, [pedidosOnline]);

  const totalOnlineAtivos = useMemo(() => {
    return pedidosOnlineAtivos.reduce((acc, p) => acc + (p.total || 0), 0);
  }, [pedidosOnlineAtivos]);

  const copiarLinkComandaOnline = () => {
    let base = window.location.origin;
    const salvo = typeof localStorage !== 'undefined' ? localStorage.getItem('moreira_sales_cardapio_domain') : null;
    if (salvo && salvo.trim()) {
      base = salvo.trim();
    } else if (base.includes('localhost')) {
      base = 'https://moreira-sales.vercel.app';
    }
    const clean = base.replace(/\/$/, '');
    const url = `${clean}/cardapio?online=true`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setLinkOnlineCopiado(true);
        setTimeout(() => setLinkOnlineCopiado(false), 2500);
      });
    } else {
      setLinkOnlineCopiado(true);
      setTimeout(() => setLinkOnlineCopiado(false), 2500);
    }
  };

  const handleCobrarPedidoOnline = (pedido: PedidoOnline) => {
    const itensCarrinho: ItemCarrinho[] = pedido.itens.map((it, idx) => {
      const prodDoCatalogo = produtos.find(p => p.id === it.produto_id || p.nome.toLowerCase() === it.nome.toLowerCase());
      return {
        id_temp: it.id_temp || `item-online-${Date.now()}-${idx}`,
        produto: {
          id: it.produto_id || prodDoCatalogo?.id || `prod-online-${idx}`,
          categoria_id: prodDoCatalogo?.categoria_id || '',
          nome: it.nome,
          preco: it.preco_unitario,
          ativo: true,
          controlar_estoque: Boolean(prodDoCatalogo?.controlar_estoque),
          estoque_atual: prodDoCatalogo?.estoque_atual
        },
        quantidade: it.quantidade,
        subtotal: it.subtotal
      };
    });

    setMesaSelecionada(null);
    setCarrinho(itensCarrinho);

    const foneRaw = pedido.cliente_telefone || pedido.cliente_whatsapp || '';
    const digits = cleanPhone(foneRaw);
    const cliMatch = clientes.find(c => {
      const cDigits = cleanPhone(c.whatsapp);
      return (digits && cDigits === digits) || c.nome.toLowerCase() === pedido.cliente_nome.toLowerCase();
    });

    if (cliMatch) {
      setClienteEncontrado(cliMatch);
      setTelefoneInput(cliMatch.whatsapp ? formatPhoneDisplay(cliMatch.whatsapp) : '');
      setIsNovoCliente(false);
      setNomeNovoCliente('');
    } else {
      setClienteEncontrado(null);
      setIsNovoCliente(true);
      setNomeNovoCliente(pedido.cliente_nome);
      setTelefoneInput(foneRaw ? formatPhoneDisplay(foneRaw) : '');
    }

    if (pedido.forma_pagamento === 'pix') setFormaPagamento('pix');
    else if (pedido.forma_pagamento === 'cartao_credito') setFormaPagamento('cartao_credito');
    else if (pedido.forma_pagamento === 'cartao_debito') setFormaPagamento('cartao_debito');
    else if (pedido.forma_pagamento === 'dinheiro') setFormaPagamento('dinheiro');

    setModoCaixa('balcao');
    setModalOnlineCaixaAberto(false);
    setSucessoMensagem(`Pedido Online #${pedido.numero_pedido} (${pedido.cliente_nome}) carregado no caixa para cobrança!`);
    setTimeout(() => setSucessoMensagem(null), 4000);
  };

  const iconesCat: Record<string, any> = {
    'Coffee': Coffee,
    'Croissant': Package,
    'Package': Package,
    'Tag': Tag,
    'LayoutGrid': LayoutGrid,
    'ShoppingCart': ShoppingCart
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER / TOGGLE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-stone-200 gap-4">
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 flex items-center gap-2">
          {modoCaixa === 'mesas' && mesaSelecionada ? (
            <>
              <button 
                onClick={() => {
                  setMesaSelecionada(null);
                  setCarrinho([]);
                }}
                className="mr-2 text-stone-400 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 p-2 rounded-xl transition-colors"
              >
                Voltar
              </button>
              Mesa {mesaSelecionada.mesa_numero}
            </>
          ) : (
            modoCaixa === 'mesas' ? 'Mesas' : 'Frente de Caixa'
          )}
        </h1>
        {(!mesaSelecionada) && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex bg-stone-100 p-1.5 rounded-2xl flex-1 sm:flex-initial">
              <button
                onClick={() => {
                  setModoCaixa('balcao');
                  setCarrinho([]);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${modoCaixa === 'balcao' ? 'bg-white shadow text-amber-700' : 'text-stone-500 hover:text-stone-700'}`}
              >
                <Monitor className="w-5 h-5" />
                Balcão
              </button>
              <button
                onClick={() => {
                  setModoCaixa('mesas');
                  setCarrinho([]);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${modoCaixa === 'mesas' ? 'bg-white shadow text-amber-700' : 'text-stone-500 hover:text-stone-700'}`}
              >
                <LayoutGrid className="w-5 h-5" />
                Mesas
              </button>
            </div>

            {modoCaixa === 'mesas' && (
              <button
                type="button"
                onClick={() => setModalQrCodeAberto(true)}
                className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Gerar e imprimir QR Codes das mesas e Comanda Online"
              >
                <QrCode className="w-4 h-4" />
                <span>QR Code Comandas</span>
              </button>
            )}
          </div>
        )}
      </div>

      {modoCaixa === 'mesas' && !mesaSelecionada ? (
        <div className="space-y-5">
          {/* BANNER COMANDA ONLINE (PEDIDOS DE CASA) */}
          <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-stone-900 text-white rounded-3xl p-4 sm:p-5 shadow-md border border-blue-900/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black tracking-tight">Comanda Online (Pedidos de Casa)</h3>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-extrabold rounded-md border border-blue-400/30 uppercase">
                    Mesa #99
                  </span>
                  {pedidosOnlineAtivos.length > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-black rounded-md border border-emerald-400/30 uppercase animate-pulse">
                      {pedidosOnlineAtivos.length} ativo{pedidosOnlineAtivos.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-300 mt-0.5">
                  Vários clientes podem acessar simultaneamente de casa, pedir com nome/sobrenome, escolher retirada/entrega e enviar no WhatsApp.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={copiarLinkComandaOnline}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Copiar o link da comanda para jogar no WhatsApp do cliente"
              >
                {linkOnlineCopiado ? <CheckCheck className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{linkOnlineCopiado ? 'Link Copiado para o WhatsApp!' : 'Copiar Link para WhatsApp'}</span>
              </button>

              <button
                type="button"
                onClick={() => setModalQrCodeAberto(true)}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Visualizar QR Code ou gerar outras comandas"
              >
                <QrCode className="w-4 h-4" />
                <span>QR Code Comandas</span>
              </button>

              <button
                type="button"
                onClick={() => setModalOnlineCaixaAberto(true)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm relative"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Ver Pedidos ({pedidosOnlineAtivos.length})</span>
                {pedidosOnlineAtivos.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
                )}
              </button>
            </div>
          </div>

          {/* 4 CARDS EXECUTIVOS (Estilo Painel Moderno do Bar/Restaurante) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Card 1: Comandas Ocupadas */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 block mb-1">
                  Comandas Ocupadas
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-900 font-mono">
                  {mesasAbertas.length} <span className="text-sm text-stone-400 font-normal">/ 30</span>
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
            </div>

            {/* Card 2: Comandas Livres */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 block mb-1">
                  Comandas Livres
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                  {Math.max(0, 30 - mesasAbertas.length)}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            {/* Card 3: Consumo em Aberto */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 block mb-1">
                  Consumo em Aberto
                </span>
                <span className="text-2xl sm:text-3xl font-black text-stone-900 font-mono">
                  R$ {mesasAbertas.reduce((acc, m) => acc + (m.total || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <Banknote className="w-6 h-6" />
              </div>
            </div>

            {/* Card 4: Ação Rápida */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 block mb-1">
                  Ação Rápida
                </span>
                <button
                  type="button"
                  onClick={() => setModalNovaComandaCaixa(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Nova Comanda</span>
                </button>
              </div>
            </div>

          </div>

          {/* BARRA DE PESQUISA E FILTROS */}
          <div className="bg-white p-3 sm:p-4 rounded-3xl border border-stone-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Input de Busca */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={buscaComanda}
                onChange={e => setBuscaComanda(e.target.value)}
                placeholder="Buscar comanda ou cliente (Ex: 01, Lucas)..."
                className="w-full pl-10 pr-8 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-600"
              />
              {buscaComanda && (
                <button
                  type="button"
                  onClick={() => setBuscaComanda('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filtros de Pílulas */}
            <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setFiltroComanda('todas')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  filtroComanda === 'todas'
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Todas (30)
              </button>
              <button
                type="button"
                onClick={() => setFiltroComanda('ocupadas')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  filtroComanda === 'ocupadas'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Ocupadas ({mesasAbertas.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFiltroComanda('livres')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  filtroComanda === 'livres'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Livres ({Math.max(0, 30 - mesasAbertas.length)})</span>
              </button>
            </div>
          </div>

          {/* GRADE DE COMANDAS / MESAS */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {/* CARD DE COMANDA ONLINE (MESA 99) */}
              {(filtroComanda !== 'livres' || pedidosOnlineAtivos.length === 0) && (!buscaComanda.trim() || 'online'.includes(buscaComanda.toLowerCase()) || '99'.includes(buscaComanda.toLowerCase()) || pedidosOnlineAtivos.some(p => p.cliente_nome.toLowerCase().includes(buscaComanda.toLowerCase()))) && (
                <button
                  type="button"
                  onClick={() => setModalOnlineCaixaAberto(true)}
                  className={`relative h-28 flex flex-col items-center justify-center rounded-2xl border-2 transition-all p-2 cursor-pointer ${
                    pedidosOnlineAtivos.length > 0
                      ? 'bg-gradient-to-b from-blue-50 to-indigo-50 border-blue-400 hover:border-blue-500 shadow-sm ring-2 ring-blue-300/40'
                      : 'bg-stone-50 border-blue-200/60 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-1 text-blue-700">
                    <Globe className="w-5 h-5" />
                    <span className="text-xl font-black">99</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 mt-0.5">
                    Online
                  </span>
                  {pedidosOnlineAtivos.length > 0 ? (
                    <div className="flex flex-col items-center mt-0.5 w-full px-1">
                      <span className="text-[10px] text-blue-950 font-extrabold truncate max-w-full">
                        {pedidosOnlineAtivos.length} pedido{pedidosOnlineAtivos.length > 1 ? 's' : ''}
                      </span>
                      <span className="text-blue-950 font-black font-mono text-xs">
                        R$ {totalOnlineAtivos.toFixed(2)}
                      </span>
                      <span className="mt-1 text-[9px] font-black uppercase tracking-wider text-blue-800 bg-blue-200/90 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                        <Receipt className="w-2.5 h-2.5" />
                        Ver / Cobrar
                      </span>
                    </div>
                  ) : (
                    <span className="text-stone-400 font-bold text-[10px] mt-1 uppercase tracking-tight flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Livre
                    </span>
                  )}
                </button>
              )}

              {Array.from({ length: 30 }, (_, i) => i + 1)
                .filter(num => {
                  const mesa = mesasAbertas.find(m => m.mesa_numero === num);
                  const isOcupada = !!mesa;

                  if (filtroComanda === 'ocupadas' && !isOcupada) return false;
                  if (filtroComanda === 'livres' && isOcupada) return false;

                  if (buscaComanda.trim()) {
                    const termo = buscaComanda.trim().toLowerCase();
                    const numStr = num.toString();
                    const matchNum = numStr === termo || `comanda ${numStr}`.includes(termo) || `mesa ${numStr}`.includes(termo);
                    const matchCliente = mesa?.cliente_nome && mesa.cliente_nome.toLowerCase().includes(termo);
                    if (!matchNum && !matchCliente) return false;
                  }

                  return true;
                })
                .map(num => {
                  const mesa = mesasAbertas.find(m => m.mesa_numero === num);
                  const isOcupada = !!mesa;
                  return (
                    <button
                      key={num}
                      onClick={() => handleAbrirMesa(num)}
                      className={`relative h-28 flex flex-col items-center justify-center rounded-2xl border-2 transition-all p-2 cursor-pointer ${
                        isOcupada 
                          ? 'bg-rose-50 border-rose-300 hover:border-rose-400 shadow-sm' 
                          : 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                      }`}
                    >
                      <span className={`text-2xl font-black ${isOcupada ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {num < 10 ? `0${num}` : num}
                      </span>
                      {isOcupada && mesa ? (
                        <div className="flex flex-col items-center mt-1 w-full px-1">
                          {mesa.cliente_nome && (
                            <span className="text-[10px] text-amber-950 font-extrabold truncate max-w-full">
                              {mesa.cliente_nome}
                            </span>
                          )}
                          <span className="text-rose-900 font-black font-mono text-xs">
                            {mesa.total > 0 ? `R$ ${mesa.total.toFixed(2)}` : 'Em atendimento'}
                          </span>
                          <span className="text-rose-600 font-mono text-[9px] font-bold mt-0.5 flex items-center gap-1">
                            <Timer className="w-2.5 h-2.5" />
                            {formatTempoPerm(mesa.criado_em)}
                          </span>
                          <span className="mt-1 text-[9px] font-black uppercase tracking-wider text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                            <Receipt className="w-2.5 h-2.5" />
                            Cobrar
                          </span>
                        </div>
                      ) : (
                        <span className="text-emerald-700 font-bold text-xs mt-2 uppercase tracking-widest flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Livre
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* COLUNA ESQUERDA: CATÁLOGO TOUCH */}
          <div className="space-y-4">
            
            {/* Banner de Feedback Rápido */}
        {sucessoMensagem && (
          <div className="bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-lg flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2 font-bold text-base">
              <Check className="w-5 h-5 bg-white/20 rounded-full p-0.5" />
              <span>{sucessoMensagem}</span>
            </div>
          </div>
        )}
        {/* Busca de Produto / Código de Barras e Valor */}
        <form onSubmit={handleBuscaProdutoSubmit} className="bg-white rounded-3xl p-5 shadow-sm border border-stone-200 flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Busca de Produto / Código de Barras
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                ref={buscaInputRef}
                type="text"
                placeholder="Ex: Café"
                value={termoBusca}
                onChange={e => setTermoBusca(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-medium"
              />
              {termoBusca && (
                <button
                  type="button"
                  onClick={() => {
                    setTermoBusca('');
                    setValorPersonalizado('');
                  }}
                  aria-label="Limpar busca"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500 hover:text-stone-800 bg-stone-200/80 hover:bg-stone-300 px-3 py-1 rounded-lg transition-colors focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  Limpar (ESC)
                </button>
              )}
            </div>
          </div>
          <div className="w-full sm:w-28">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Valor (R$)
            </label>
            <input
              ref={valorInputRef}
              type="text"
              placeholder="0.00"
              value={valorPersonalizado}
              onChange={e => setValorPersonalizado(e.target.value.replace(/[^0-9.,]/g, ''))}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-mono font-bold"
            />
          </div>
          <button
            type="submit"
            disabled={!termoBusca.trim()}
            aria-label="Adicionar item"
            className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white font-bold rounded-xl transition-colors h-[46px] flex items-center justify-center gap-2 shrink-0 outline-none focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500"
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>

        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 border-b border-stone-200 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-stone-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300 hover:[&::-webkit-scrollbar-thumb]:bg-stone-400 [&::-webkit-scrollbar-thumb]:rounded-full">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider py-2 pr-2 shrink-0 flex items-center">Rápido:</span>
          {[5, 10, 15, 20, 30, 50].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => {
                adicionarAoCarrinho({
                  id: `avulso-${Date.now()}`,
                  nome: 'Item Avulso',
                  preco: val,
                  categoria_id: '',
                  ativo: true
                });
              }}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl border border-stone-200 transition-colors shrink-0"
            >
              {`+ R$ ${val}`}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-200 flex flex-col">
          {categorias.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-3.5 border-b border-stone-100 mb-3 shrink-0 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-stone-50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-200 hover:[&::-webkit-scrollbar-thumb]:bg-stone-300 [&::-webkit-scrollbar-thumb]:rounded-full">
              <button
                type="button"
                onClick={() => {
                  setCategoriaAtiva('todos');
                  if (termoBusca) setTermoBusca('');
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  categoriaAtiva === 'todos' || !categoriaAtiva
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Todos ({produtos.filter(p => p.ativo !== false).length})</span>
              </button>

              {categorias.map(cat => {
                const Icone = iconesCat[cat.icone] || Package;
                const qtd = produtos.filter(p => p.categoria_id === cat.id && p.ativo !== false).length;
                const isSelected = categoriaAtiva === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategoriaAtiva(isSelected ? 'todos' : cat.id);
                      if (termoBusca) setTermoBusca('');
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-2 ring-amber-600/20'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    <Icone className="w-3.5 h-3.5" />
                    <span>{cat.nome}</span>
                    <span className="text-xs opacity-80 font-mono">({qtd})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* BARRA DE STATUS E MODO DE VISUALIZAÇÃO DO CATÁLOGO */}
          {produtos.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1 text-xs font-semibold text-stone-500 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-stone-700 font-bold">
                  {termoBusca.trim()
                    ? `Busca: "${termoBusca}" (${totalItensCatalogo})`
                    : categoriaAtiva === 'todos' || !categoriaAtiva
                    ? `Todos os Produtos (${totalItensCatalogo})`
                    : `${categorias.find(c => c.id === categoriaAtiva)?.nome || 'Categoria'} (${totalItensCatalogo})`}
                </span>
                {modoExibicaoCatalogo === 'paginacao' && totalPaginasCatalogo > 1 && (
                  <span className="text-[11px] font-mono text-stone-400">
                    • Pág. {paginaCatalogo} de {totalPaginasCatalogo}
                  </span>
                )}
              </div>

              {totalItensCatalogo > 6 && (
                <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-xl border border-stone-200/80">
                  <button
                    type="button"
                    onClick={() => setModoExibicaoCatalogo('scroll')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      modoExibicaoCatalogo === 'scroll'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                    title="Exibe a grade com rolagem interna suave"
                  >
                    Rolagem
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoExibicaoCatalogo('paginacao')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      modoExibicaoCatalogo === 'paginacao'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                    title="Exibe 12 produtos por página para evitar rolagem"
                  >
                    Páginas (12)
                  </button>
                </div>
              )}
            </div>
          )}

          {produtos.length === 0 ? (
            isCarregandoCatalogo ? (
              <div className="py-12 px-6 bg-stone-50/60 rounded-2xl border border-stone-200/80 text-center animate-pulse">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-3 text-amber-700">
                  <Package className="w-6 h-6 animate-bounce" />
                </div>
                <h4 className="text-sm font-bold text-stone-700">Carregando catálogo do balcão...</h4>
                <p className="text-xs text-stone-400 mt-1">Sincronizando produtos e preços em tempo real</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 max-w-md mx-auto opacity-40">
                  <div className="h-20 bg-stone-200 rounded-xl" />
                  <div className="h-20 bg-stone-200 rounded-xl" />
                  <div className="h-20 bg-stone-200 rounded-xl" />
                </div>
              </div>
            ) : (
              <div className="text-center py-12 px-6 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Package className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-stone-800">
                  {categorias.length > 0 ? 'Categorias Criadas! Nenhum Produto Cadastrado Ainda' : 'Catálogo Vazio no Momento'}
                </h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 leading-relaxed">
                  {categorias.length > 0 
                    ? 'Você já cadastrou categorias. Agora adicione produtos no Painel Dono > Catálogo para que eles apareçam aqui no balcão.'
                    : 'O Frente de Caixa (PDV) exibe exclusivamente os produtos cadastrados no Painel Dono > Catálogo. Cadastre categorias e produtos para que apareçam aqui no balcão.'
                  }
                </p>
              </div>
            )
          ) : produtosFiltradosPorBuscaOuCategoria.length === 0 ? (
            <div className="col-span-2 lg:col-span-3 text-center py-10 px-4 text-stone-500 text-sm">
              {termoBusca.trim() 
                ? `Nenhum produto encontrado para "${termoBusca}".` 
                : 'Nenhum produto cadastrado nesta categoria ainda.'}
            </div>
          ) : (
            <div
              ref={catalogoScrollRef}
              className={`overflow-y-auto pr-1.5 scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-stone-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300 hover:[&::-webkit-scrollbar-thumb]:bg-stone-400 [&::-webkit-scrollbar-thumb]:rounded-full ${
                modoExibicaoCatalogo === 'scroll'
                  ? 'max-h-[500px] sm:max-h-[540px]'
                  : 'min-h-[360px]'
              }`}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4" role="list" aria-label="Lista de Produtos">
                {produtosExibidos.map((produto: Produto) => {
                  const qtdNoCarrinho = carrinho.find(item => item.produto.id === produto.id)?.quantidade || 0;
                  const semEstoque = produto.controlar_estoque && (produto.estoque_atual === undefined || produto.estoque_atual - qtdNoCarrinho <= 0);
                  const catDoProduto = categorias.find(c => c.id === produto.categoria_id);
                  
                  return (
                    <button
                      key={produto.id}
                      disabled={semEstoque}
                      onClick={() => !semEstoque && adicionarAoCarrinho(produto)}
                      aria-label={`Adicionar ${produto.nome} por R$ ${produto.preco.toFixed(2)}${semEstoque ? ' - Esgotado' : ''}`}
                      className={`relative overflow-hidden flex flex-col items-center justify-center text-center h-28 sm:h-32 p-3 rounded-2xl border transition-all outline-none ${
                        semEstoque 
                          ? 'bg-stone-100 border-stone-200 opacity-60 cursor-not-allowed' 
                          : 'bg-stone-50 border-stone-200 hover:border-amber-400 hover:shadow-lg hover:-translate-y-1 focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 active:scale-95 cursor-pointer'
                      }`}
                    >
                      {semEstoque && (
                        <div className="absolute top-0 inset-x-0 bg-rose-500 text-white text-[10px] font-bold tracking-widest uppercase py-0.5 shadow-sm">
                          Esgotado
                        </div>
                      )}
                      {catDoProduto && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200/50 mb-1 max-w-[95%] truncate">
                          {catDoProduto.nome}
                        </span>
                      )}
                      <span className={`font-bold leading-tight line-clamp-2 ${semEstoque ? 'text-stone-500' : 'text-stone-800'}`}>
                        {produto.nome}
                      </span>
                      <span className={`font-mono font-black text-base sm:text-lg mt-0.5 ${semEstoque ? 'text-stone-400' : 'text-amber-700'}`}>
                        R$ {produto.preco.toFixed(2)}
                        {produto.unidade_venda && (
                          <span className="text-[10px] font-sans font-semibold text-stone-500 ml-1">
                            /{produto.unidade_venda}
                          </span>
                        )}
                      </span>
                      {produto.controlar_estoque && !semEstoque && produto.estoque_atual !== undefined && (
                        <span className="text-[10px] text-stone-400 font-medium absolute bottom-1.5">
                          {produto.estoque_atual - qtdNoCarrinho} em estoque
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CONTROLES DE PAGINAÇÃO OU ROLAGEM */}
          {modoExibicaoCatalogo === 'paginacao' && totalPaginasCatalogo > 1 && (
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-stone-100 shrink-0">
              <button
                type="button"
                disabled={paginaCatalogo <= 1}
                onClick={() => {
                  setPaginaCatalogo(p => Math.max(1, p - 1));
                  if (catalogoScrollRef.current) catalogoScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-none">
                {Array.from({ length: totalPaginasCatalogo }, (_, i) => i + 1).map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setPaginaCatalogo(num);
                      if (catalogoScrollRef.current) catalogoScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-7 h-7 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                      paginaCatalogo === num
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={paginaCatalogo >= totalPaginasCatalogo}
                onClick={() => {
                  setPaginaCatalogo(p => Math.min(totalPaginasCatalogo, p + 1));
                  if (catalogoScrollRef.current) catalogoScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer"
              >
                <span className="hidden sm:inline">Próxima</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {modoExibicaoCatalogo === 'scroll' && totalItensCatalogo > 9 && (
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-stone-100 text-[11px] text-stone-400 font-medium shrink-0">
              <span>{totalItensCatalogo} produtos no catálogo</span>
              <span>Role a área acima para ver todos</span>
            </div>
          )}
        </div>
      </div>

      {/* COLUNA DIREITA: CARRINHO E IDENTIFICAÇÃO */}
      <div className="space-y-6">
        
        {/* CARRINHO */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-stone-100 flex flex-col h-[400px]">
          <div className="flex items-center gap-2 border-b border-stone-50 pb-4 mb-4">
            <ShoppingCart className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-extrabold text-stone-800 tracking-tight">Carrinho de Compras</h2>
          </div>
          
          <div className="flex-grow overflow-y-auto space-y-3 pr-2">
            {carrinho.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-stone-300">
                <Package className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm font-medium">O carrinho está vazio</p>
                <p className="text-xs">Selecione produtos no catálogo</p>
              </div>
            ) : (
              carrinho.map(item => {
                const catDoItem = categorias.find(c => c.id === item.produto.categoria_id);
                return (
                  <div key={item.id_temp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-stone-50/50 p-3 rounded-2xl border border-stone-100/50 hover:bg-stone-50 transition-colors gap-3 sm:gap-0">
                    <div className="flex-1 min-w-0 pr-4 w-full sm:w-auto">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-stone-800 truncate">{item.produto.nome}</p>
                        {catDoItem && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 shrink-0">
                            {catDoItem.nome}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-stone-500">R$ {item.produto.preco.toFixed(2)} un.</p>
                    </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <div className="flex items-center bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden shrink-0">
                      <button type="button" onClick={() => alterarQuantidade(item.id_temp, -1)} className="px-2 py-1 hover:bg-stone-50 active:bg-stone-100 transition-colors">
                        <Minus className="w-4 h-4 text-stone-500" />
                      </button>
                      <span className="w-8 text-center font-bold font-mono text-stone-800">{item.quantidade}</span>
                      <button 
                        type="button" 
                        disabled={item.produto.controlar_estoque && item.produto.estoque_atual !== undefined && item.quantidade >= item.produto.estoque_atual}
                        onClick={() => alterarQuantidade(item.id_temp, 1)} 
                        className="px-2 py-1 hover:bg-stone-50 active:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={item.produto.controlar_estoque && item.produto.estoque_atual !== undefined && item.quantidade >= item.produto.estoque_atual ? 'Limite de estoque atingido' : 'Adicionar mais 1'}
                      >
                        <Plus className="w-4 h-4 text-stone-500" />
                      </button>
                    </div>
                    <span className="w-20 text-right font-black font-mono text-amber-600 shrink-0">
                      R$ {item.subtotal.toFixed(2)}
                    </span>
                    <button type="button" onClick={() => removerDoCarrinho(item.id_temp)} className="p-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
            )}
          </div>

          <div className="border-t border-stone-50 pt-4 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-stone-400 font-bold uppercase tracking-widest text-xs">Total</span>
              <span className="text-3xl font-black font-mono text-stone-800 tracking-tighter">
                R$ {totalCarrinho.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* IDENTIFICAÇÃO DO CLIENTE */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-stone-100">
          <div className="flex items-center gap-3 border-b border-stone-50 pb-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
              02
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-stone-800 tracking-tight">
                Identificação do Cliente
              </h2>
              <p className="text-xs text-stone-400 font-medium mt-0.5">
                Insira o WhatsApp para pontuar fidelidade
              </p>
            </div>
          </div>

          <form onSubmit={handleConfirmarCompra} className="space-y-6">
            <div>
              <label htmlFor="whatsapp-input" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Número do WhatsApp
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
                  <Phone className="w-5 h-5" />
                </div>
                <input
                  id="whatsapp-input"
                  ref={phoneInputRef}
                  type="tel"
                  placeholder="(44) 99876-5432"
                  value={telefoneInput}
                  onChange={(e) => setTelefoneInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (isNovoCliente) {
                        nomeInputRef.current?.focus();
                      } else {
                        handleConfirmarCompra();
                      }
                    }
                  }}
                  className="w-full pl-12 pr-28 py-4 text-xl sm:text-2xl font-black tracking-wide bg-stone-50 border-2 border-stone-300 rounded-2xl focus:bg-white focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all placeholder:text-stone-300 font-mono"
                  autoComplete="off"
                />
                
                {telefoneInput && (
                  <button
                    type="button"
                    onClick={resetarFormulario}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500 hover:text-stone-800 bg-stone-200/80 hover:bg-stone-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Limpar (ESC)
                  </button>
                )}
              </div>
            </div>

            {/* OPÇÃO DE CPF NA NOTA & EMISSÃO FISCAL */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>CPF na Nota Fiscal</span>
                </label>
                <div className="flex items-center gap-2">
                  {cpfNaNota && (
                    <button
                      type="button"
                      onClick={() => setCpfNaNota('')}
                      className="text-[11px] font-bold text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                    >
                      Sem CPF
                    </button>
                  )}
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <input
                      type="checkbox"
                      checked={emitirNfeCheck}
                      onChange={e => setEmitirNfeCheck(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                    />
                    <span>Emitir NFC-e</span>
                  </label>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="000.000.000-00 (Opcional)"
                  value={cpfNaNota}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setCpfNaNota(formatarCpf(raw));
                  }}
                  className="w-full px-4 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-mono font-bold focus:border-emerald-600 outline-none placeholder:text-stone-300"
                />
              </div>
            </div>

            {/* CASO A: Cliente Identificado */}
            {clienteEncontrado && resumoAtual && (
              <div className="bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-orange-500/5 border-2 border-amber-400/60 rounded-3xl p-5 sm:p-6 space-y-4 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-amber-600/20">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-stone-900">
                          {clienteEncontrado.nome}
                        </h3>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          resumoAtual.nivel === 'Ouro'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : resumoAtual.nivel === 'Prata'
                            ? 'bg-stone-200 text-stone-800 border border-stone-300'
                            : 'bg-orange-100 text-orange-800 border border-orange-200'
                        }`}>
                          {resumoAtual.nivel}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 font-medium">
                        Histórico total: {clienteEncontrado.total_compras_historico} compras desde o cadastro
                      </p>
                    </div>
                  </div>

                  <div className="bg-white px-5 py-3 rounded-2xl border border-amber-200 shadow-sm text-center">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      Compras Válidas no Mês
                    </span>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-black text-amber-700 font-mono">
                        {comprasValidasMes}
                      </span>
                      <span className="text-stone-400 font-bold text-sm">
                        / {config.meta_compras_mes}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-stone-600 mb-1.5">
                    <span className="flex items-center gap-1 text-amber-800">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      {comprasValidasMes >= config.meta_compras_mes ? (
                        <span className="text-emerald-700 font-extrabold">Meta mensal conquistada! Rumo ao Nível Ouro!</span>
                      ) : (
                        <span>Falta apenas {config.meta_compras_mes - comprasValidasMes} para o brinde!</span>
                      )}
                    </span>
                    <span>{porcentagemMeta}%</span>
                  </div>
                  <div className="w-full h-5 bg-stone-100 rounded-full overflow-hidden border border-stone-200/60 shadow-inner">
                    <div 
                      className={`h-full transition-all duration-700 ease-out rounded-full shadow-[inset_0_-2px_4px_rgba(0,0,0,0.15)] ${
                        comprasValidasMes >= config.meta_compras_mes 
                          ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' 
                          : 'bg-gradient-to-r from-amber-400 to-orange-500'
                      }`}
                      style={{ width: `${porcentagemMeta}%` }}
                    />
                  </div>
                </div>

                <div className="text-xs font-semibold text-stone-600 bg-white/80 rounded-xl p-3 border border-amber-200/60 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Prêmio do Mês: <strong className="text-stone-900">{config.premio_descricao}</strong> (Entregue na 10ª compra).
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setPerfilAberto(true)}
                  className="w-full text-center text-sm font-bold text-amber-700 hover:text-amber-900 bg-white/60 hover:bg-white rounded-xl py-2.5 transition-colors border border-amber-200/50 flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Ver Histórico e Perfil Completo
                </button>
              </div>
            )}

            {/* CASO B: Cadastro Relâmpago para Novo Cliente */}
            {isNovoCliente && cleanPhone(telefoneInput) !== '0' && (
              <div className="bg-blue-50/70 border-2 border-blue-300 rounded-3xl p-5 sm:p-6 space-y-4 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-blue-950">
                      Novo Cliente! Cadastro Relâmpago
                    </h3>
                    <p className="text-xs text-blue-800">
                      Apenas o Primeiro Nome para não prender a fila no balcão
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="nome-novo-cliente" className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">
                    Nome ou Apelido do Cliente *
                  </label>
                  <input
                    id="nome-novo-cliente"
                    ref={nomeInputRef}
                    type="text"
                    placeholder="Ex: Mariana Silva"
                    value={nomeNovoCliente}
                    onChange={(e) => setNomeNovoCliente(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirmarCompra();
                      }
                    }}
                    className="w-full px-4 py-3.5 text-lg font-bold bg-white border-2 border-blue-200 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setMostrarPerfilCompleto(!mostrarPerfilCompleto)}
                    className="text-xs font-bold text-blue-700 underline flex items-center gap-1"
                  >
                    {mostrarPerfilCompleto ? 'Ocultar campos extras' : '+ Adicionar Perfil Completo (Opcional)'}
                  </button>

                  {mostrarPerfilCompleto && (
                    <div className="mt-4 space-y-3 p-4 bg-white/60 rounded-xl border border-blue-200">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                          Data de Nascimento
                        </label>
                        <input
                          type="date"
                          value={dataNascNovoCliente}
                          onChange={(e) => setDataNascNovoCliente(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-xl focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                          E-mail
                        </label>
                        <input
                          type="email"
                          placeholder="cliente@email.com"
                          value={emailNovoCliente}
                          onChange={(e) => setEmailNovoCliente(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-xl focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                          Notas / Preferências
                        </label>
                        <textarea
                          placeholder="Ex: Não gosta de pão muito torrado"
                          value={notasNovoCliente}
                          onChange={(e) => setNotasNovoCliente(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-xl focus:border-blue-500 outline-none resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* CASO C: Cliente Não Identificado (0) */}
            {isNovoCliente && cleanPhone(telefoneInput) === '0' && (
               <div className="bg-stone-100 border-2 border-stone-300 rounded-3xl p-5 sm:p-6 space-y-2 animate-fadeIn flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-stone-300 text-stone-600 flex items-center justify-center">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-stone-800">
                      Cliente Não Identificado
                    </h3>
                    <p className="text-xs text-stone-500 font-medium">
                      A compra será registrada apenas no balanço financeiro, sem pontuação de fidelidade.
                    </p>
                  </div>
               </div>
            )}

            <div className="mt-2 text-xs font-semibold flex items-center gap-1.5 mb-6">
              {pontuaFidelidade ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Valor qualifica para a meta de fidelidade (mínimo: R$ {config.valor_minimo_pontuacao.toFixed(2)})
                </span>
              ) : (
                <span className="text-amber-700 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  Abaixo de R$ {config.valor_minimo_pontuacao.toFixed(2)}: entra no histórico, mas não pontua no brinde.
                </span>
              )}
            </div>

            {/* SELEÇÃO DE FORMA DE PAGAMENTO */}
            <div className="pt-4 border-t border-stone-100">
              <div className="flex items-center justify-between mb-2.5">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Forma de Pagamento
                </label>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {formaPagamento === 'pix' ? 'Pix' : formaPagamento === 'dinheiro' ? 'Dinheiro' : formaPagamento === 'cartao_credito' ? 'Crédito' : 'Débito'} Selecionado
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                {[
                  { id: 'pix', label: 'Pix', icone: QrCode },
                  { id: 'cartao_credito', label: 'Crédito', icone: CreditCard },
                  { id: 'cartao_debito', label: 'Débito', icone: CreditCard },
                  { id: 'dinheiro', label: 'Dinheiro', icone: Banknote }
                ].map((pgto) => {
                  const Icon = pgto.icone;
                  const isSelected = formaPagamento === pgto.id;
                  return (
                    <button
                      key={pgto.id}
                      type="button"
                      onClick={() => setFormaPagamento(pgto.id as any)}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm ring-2 ring-emerald-500/20'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-600' : 'text-stone-400'}`} />
                      <span className="text-xs font-bold">{pgto.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Botão de Finalização Instantânea na Hora da Pressa */}
              {carrinho.length > 0 && modoCaixa === 'balcao' && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => handleConfirmarCompra(undefined, true)}
                    disabled={isProcessando}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black text-sm rounded-2xl shadow-md shadow-amber-600/20 flex items-center justify-between transition-all active:scale-95 cursor-pointer"
                    title="Finaliza a venda imediatamente no balcão sem precisar digitar telefone (Atalho: F2)"
                  >
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-200 fill-amber-200 animate-pulse" />
                      <span>Venda Rápida 1-Clique ({formaPagamento.toUpperCase()})</span>
                    </span>
                    <span className="bg-black/20 px-2.5 py-1 rounded-xl text-xs font-mono font-bold">
                      [F2] R$ {totalCarrinho.toFixed(2)}
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-stone-100 flex flex-col gap-3">
              {modoCaixa === 'mesas' && mesaSelecionada ? (
                <>
                  <button
                    type="button"
                    onClick={handleSalvarMesa}
                    disabled={isProcessando}
                    className={`w-full py-5 rounded-2xl font-black text-lg sm:text-xl flex items-center justify-center gap-3 transition-all duration-200 active:scale-95 shadow-xl ${
                      carrinho.length > 0
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-amber-600/30 ring-4 ring-amber-500/20'
                        : 'bg-stone-500 text-white hover:bg-stone-600 ring-4 ring-stone-500/20 shadow-none'
                    }`}
                  >
                    {isProcessando ? 'Salvando...' : (
                      <>
                        <Save className="w-6 h-6" />
                        {carrinho.length > 0 ? `Salvar Mesa ${mesaSelecionada.mesa_numero}` : `Liberar Mesa ${mesaSelecionada.mesa_numero}`}
                      </>
                    )}
                  </button>
                  
                  <button
                    type="submit"
                    onClick={async (e) => {
                      e.preventDefault();
                      const success = await handleConfirmarCompra(e);
                      if (success && mesaSelecionada) {
                        await liberarMesaTotal(mesaSelecionada.id, mesaSelecionada.mesa_numero);
                        setMesasAbertas(prev => prev.filter(m => m.id !== mesaSelecionada.id && m.mesa_numero !== mesaSelecionada.mesa_numero));
                        setMesaSelecionada(null);
                        setModoCaixa('mesas');
                      }
                    }}
                    disabled={isProcessando || carrinho.length === 0}
                    className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-200 active:scale-95 border-2 ${
                      carrinho.length > 0
                        ? 'border-emerald-500 text-emerald-700 hover:bg-emerald-50'
                        : 'border-stone-200 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Fechar Mesa (Cobrar R$ {totalCarrinho.toFixed(2)})
                  </button>

                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      const success = await handleConfirmarCompra(undefined, true);
                      if (success && mesaSelecionada) {
                        await liberarMesaTotal(mesaSelecionada.id, mesaSelecionada.mesa_numero);
                        setMesasAbertas(prev => prev.filter(m => m.id !== mesaSelecionada.id && m.mesa_numero !== mesaSelecionada.mesa_numero));
                        setMesaSelecionada(null);
                        setModoCaixa('mesas');
                      }
                    }}
                    disabled={isProcessando || carrinho.length === 0}
                    className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 border-2 ${
                      carrinho.length > 0
                        ? 'border-stone-300 text-stone-600 hover:bg-stone-100'
                        : 'border-stone-200 text-stone-400 cursor-not-allowed bg-stone-50'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    Fechar Rápido (Anônimo)
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="submit"
                    disabled={isProcessando || carrinho.length === 0}
                    className={`w-full py-5 rounded-2xl font-black text-lg sm:text-xl flex items-center justify-center gap-3 transition-all duration-200 active:scale-95 shadow-xl ${
                      carrinho.length > 0
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-600/30 ring-4 ring-emerald-500/20'
                        : 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {isProcessando ? (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Registrando no Balcão...
                      </span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-6 h-6" />
                        Confirmar Compra: R$ {totalCarrinho.toFixed(2)}
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleConfirmarCompra(undefined, true)}
                    disabled={isProcessando || carrinho.length === 0}
                    className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 border-2 ${
                      carrinho.length > 0
                        ? 'border-stone-300 text-stone-600 hover:bg-stone-100 cursor-pointer'
                        : 'border-stone-200 text-stone-400 cursor-not-allowed bg-stone-50'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    Venda Rápida Balcão (Cliente Anônimo)
                  </button>
                </>
              )}
            </div>

          </form>
        </div>
      </div>
      </div>
      )}

      {modalPremio.aberto && modalPremio.cliente && (
        <AwardModal
          cliente={modalPremio.cliente}
          comprasMes={modalPremio.comprasMes}
          config={config}
          onClose={() => {
            setModalPremio({ aberto: false, cliente: null, comprasMes: 0 });
            resetarFormulario();
          }}
        />
      )}

      {perfilAberto && clienteEncontrado && (
        <ClienteProfileModal
          cliente={clienteEncontrado}
          resumo={resumoAtual || null}
          onClose={() => setPerfilAberto(false)}
        />
      )}

      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />

      <QrCodeMesasModal
        isOpen={modalQrCodeAberto}
        onClose={() => setModalQrCodeAberto(false)}
        totalMesas={20}
      />

      {/* MODAL DE EMISSÃO DA NOTA FISCAL (DANFE & WHATSAPP) */}
      <ModalEmissaoNfe
        isOpen={modalNfe.aberto}
        nota={modalNfe.nota}
        configFiscal={configFiscal}
        webhookUrlWhatsApp={config.webhook_whatsapp_url}
        onClose={() => setModalNfe({ aberto: false, nota: null })}
      />

      {/* MODAL DE COMANDA DA MESA (PUXAR PARA FATURAR E COBRAR) */}
      {mesaComandaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-xl">
                  {mesaComandaModal.mesa_numero < 10 ? `0${mesaComandaModal.mesa_numero}` : mesaComandaModal.mesa_numero}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black">Comanda Mesa {mesaComandaModal.mesa_numero}</h2>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                      Ocupada
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 flex items-center gap-2 mt-0.5">
                    <span>Cliente: <strong className="text-white">{mesaComandaModal.cliente_nome || 'Consumidor'}</strong></span>
                    {mesaComandaModal.cliente_telefone && (
                      <span className="font-mono text-stone-400">• {formatPhoneDisplay(mesaComandaModal.cliente_telefone)}</span>
                    )}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setMesaComandaModal(null)}
                className="text-stone-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo da Comanda */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              
              {/* Resumo de Tempo e Consumo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <span className="text-xs text-stone-500 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    Tempo na mesa
                  </span>
                  <span className="text-base font-black font-mono text-stone-800 mt-1 block">
                    {formatTempoPerm(mesaComandaModal.criado_em)}
                  </span>
                </div>
                <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
                  <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 text-amber-600" />
                    Total a pagar
                  </span>
                  <span className="text-2xl font-black font-mono text-amber-900 mt-0.5 block">
                    R$ {(mesaComandaModal.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Lista dos Itens da Comanda */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-stone-400" />
                  Itens Consumidos pelo Cliente
                </h3>
                <div className="bg-stone-50 rounded-2xl border border-stone-200 divide-y divide-stone-200/70 overflow-hidden">
                  {normalizarItensMesa(mesaComandaModal, produtos).map((item, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-stone-100/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                          {item.quantidade}x
                        </span>
                        <div>
                          <p className="font-bold text-stone-900 text-sm">{item.produto.nome}</p>
                          <p className="text-xs text-stone-500 font-mono">R$ {item.produto.preco.toFixed(2)} un.</p>
                        </div>
                      </div>
                      <span className="font-black font-mono text-stone-900 text-sm">
                        R$ {item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {normalizarItensMesa(mesaComandaModal, produtos).length === 0 && (
                    <div className="p-6 text-center text-stone-400 text-sm">
                      Nenhum item lançado ainda nesta comanda.
                    </div>
                  )}
                </div>
              </div>

              {/* Ações de Cobrança Rápida Direta */}
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 block mb-2.5">
                  ⚡ Cobrança Rápida Direta (1 Clique):
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => cobrarComandaDireto(mesaComandaModal, 'pix')}
                    disabled={isProcessando}
                    className="py-2.5 px-3 bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 text-emerald-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer active:scale-95"
                  >
                    <span>⚡ PIX</span>
                  </button>
                  <button
                    onClick={() => cobrarComandaDireto(mesaComandaModal, 'dinheiro')}
                    disabled={isProcessando}
                    className="py-2.5 px-3 bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 text-emerald-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer active:scale-95"
                  >
                    <span>💵 Dinheiro</span>
                  </button>
                  <button
                    onClick={() => cobrarComandaDireto(mesaComandaModal, 'cartao_debito')}
                    disabled={isProcessando}
                    className="py-2.5 px-3 bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 text-emerald-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer active:scale-95"
                  >
                    <span>💳 Cartão</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Footer com o Botão Principal "Puxar Comanda para Faturar no Caixa" */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={() => puxarComandaParaFaturar(mesaComandaModal)}
                className="w-full sm:flex-1 py-4 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
              >
                <Receipt className="w-5 h-5" />
                <span>Puxar Comanda e Faturar no Caixa</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  puxarComandaParaFaturar(mesaComandaModal);
                }}
                className="w-full sm:w-auto py-3.5 px-4 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Adicionar mais itens no pedido da mesa"
              >
                <Plus className="w-4 h-4" />
                <span>+ Itens</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMesaParaLiberarConfirm(mesaComandaModal);
                }}
                className="w-full sm:w-auto py-3.5 px-4 text-rose-600 hover:bg-rose-50 rounded-2xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-rose-200"
                title="Encerrar atendimento e desocupar a mesa"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Liberar Mesa</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO PARA LIBERAR MESA / ENCERRAR ATENDIMENTO */}
      <ConfirmModal
        isOpen={!!mesaParaLiberarConfirm}
        title={mesaParaLiberarConfirm ? `Liberar Mesa ${mesaParaLiberarConfirm.mesa_numero < 10 ? `0${mesaParaLiberarConfirm.mesa_numero}` : mesaParaLiberarConfirm.mesa_numero}?` : ''}
        message={mesaParaLiberarConfirm ? `Deseja realmente encerrar o atendimento da Mesa ${mesaParaLiberarConfirm.mesa_numero} (${mesaParaLiberarConfirm.cliente_nome || 'Consumidor'}) e desocupar a mesa? Ela ficará livre imediatamente no sistema.` : ''}
        confirmText="Sim, Liberar Mesa"
        cancelText="Voltar"
        isDestructive={true}
        onClose={() => setMesaParaLiberarConfirm(null)}
        onConfirm={async () => {
          if (!mesaParaLiberarConfirm) return;
          const num = mesaParaLiberarConfirm.mesa_numero;
          const id = mesaParaLiberarConfirm.id;
          await liberarMesaTotal(id, num);
          setMesasAbertas(prev => prev.filter(m => m.id !== id && m.mesa_numero !== num));
          if (mesaSelecionada && (mesaSelecionada.id === id || mesaSelecionada.mesa_numero === num)) {
            setMesaSelecionada(null);
            setCarrinho([]);
          }
          setMesaComandaModal(null);
          setMesaParaLiberarConfirm(null);
          setSucessoMensagem(`Mesa ${num < 10 ? `0${num}` : num} liberada com sucesso! Atendimento encerrado.`);
          setTimeout(() => setSucessoMensagem(null), 4000);
        }}
      />

      {/* MODAL DE ABERTURA RÁPIDA DE COMANDA NO CAIXA */}
      {modalNovaComandaCaixa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black">
                  #
                </div>
                <div>
                  <h3 className="text-base font-black">Abrir Comanda no Caixa</h3>
                  <p className="text-xs text-stone-400">Informe o número da comanda do cliente</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNovaComandaCaixa(false)}
                className="text-stone-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const num = parseInt(numeroNovaComandaInput.replace(/\D/g, ''), 10);
                if (isNaN(num) || num <= 0) return;
                setModalNovaComandaCaixa(false);
                setNumeroNovaComandaInput('');
                setNomeNovoClienteComanda('');
                handleAbrirMesa(num);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Número da Comanda *
                </label>
                <input
                  type="tel"
                  required
                  autoFocus
                  value={numeroNovaComandaInput}
                  onChange={e => setNumeroNovaComandaInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 1, 2, 15..."
                  className="w-full text-center py-4 text-3xl font-black font-mono text-stone-900 bg-stone-50 border-2 border-stone-200 rounded-2xl focus:border-amber-600 focus:bg-white outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Nome do Cliente (Opcional)
                </label>
                <input
                  type="text"
                  value={nomeNovoClienteComanda}
                  onChange={e => setNomeNovoClienteComanda(e.target.value)}
                  placeholder="Ex: Carlos, Lucas..."
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm font-medium text-stone-900 focus:border-amber-600 focus:bg-white outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!numeroNovaComandaInput || parseInt(numeroNovaComandaInput, 10) <= 0}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Abrir Comanda e Faturar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE GESTÃO E COBRANÇA DA COMANDA ONLINE */}
      <ModalComandaOnlineCaixa
        isOpen={modalOnlineCaixaAberto}
        onClose={() => setModalOnlineCaixaAberto(false)}
        onCobrarPedido={handleCobrarPedidoOnline}
        onAbrirNovaComandaOnline={() => {
          setModalOnlineCaixaAberto(false);
          window.open(window.location.origin + window.location.pathname + '?modo=online', '_blank');
        }}
      />
    </div>
  );
};
