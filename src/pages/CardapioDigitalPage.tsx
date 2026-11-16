import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wheat, 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ChefHat, 
  ArrowLeft, 
  X, 
  User, 
  RotateCcw,
  ArrowUpRight,
  Sparkles,
  Phone,
  Clock
} from 'lucide-react';
import { Produto, Categoria, ItemPedidoCozinha, PedidoCozinha, Cliente, Compra } from '../types';
import { 
  fetchProdutos, 
  fetchCategorias, 
  criarPedidoCardapio, 
  fetchPedidosCozinha, 
  fetchClientes, 
  fetchCompras,
  identificarOuCadastrarCliente,
  getLocal,
  STORAGE_KEYS
} from '../services/db';
import { cleanPhone, formatPhoneDisplay } from '../services/whatsapp';
import { Footer } from '../components/Footer';
import { PesoProdutoModal, ehProdutoPorPeso, ResultadoPesoProduto } from '../components/PesoProdutoModal';

interface CardapioDigitalPageProps {
  mesaInicial?: number;
  isStandalone?: boolean;
}

// Map of emojis for categories matching the reference website
const CATEGORIA_EMOJIS: Record<string, string> = {
  'pães e panificação': '🥖',
  'paes e panificacao': '🥖',
  'pães': '🥖',
  'salgados': '🥟',
  'lanches': '🥪',
  'doces e confeitaria': '🍰',
  'doces': '🍰',
  'cafés': '☕',
  'cafes': '☕',
  'sucos 300 ml': '🍊',
  'sucos': '🍊',
  'bebidas': '🥤'
};

const obterEmojiCategoria = (nome: string): string => {
  const norm = nome.trim().toLowerCase();
  for (const [chave, emoji] of Object.entries(CATEGORIA_EMOJIS)) {
    if (norm.includes(chave) || chave.includes(norm)) {
      return emoji;
    }
  }
  return '✨';
};

export const CardapioDigitalPage: React.FC<CardapioDigitalPageProps> = ({ 
  mesaInicial,
  isStandalone = true
}) => {
  // Ler parâmetros da URL (?mesa=5)
  const initialMesaFromUrl = () => {
    if (mesaInicial) return mesaInicial.toString();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const m = params.get('mesa');
      if (m && !isNaN(parseInt(m, 10))) return m;
    }
    return '1';
  };

  // Estados da Tela de Identificação
  const [mesaInput, setMesaInput] = useState<string>(initialMesaFromUrl);
  const [nomeInput, setNomeInput] = useState<string>('');
  const [telefoneInput, setTelefoneInput] = useState<string>('');
  const [salvandoCadastro, setSalvandoCadastro] = useState<boolean>(false);
  const [acessouCardapio, setAcessouCardapio] = useState<boolean>(false);

  // Cliente reconhecido ou criado
  const [clienteAtivo, setClienteAtivo] = useState<Cliente | null>(null);
  const [clientesList, setClientesList] = useState<Cliente[]>([]);
  const [clienteEncontradoNoPreenchimento, setClienteEncontradoNoPreenchimento] = useState<Cliente | null>(null);

  // Produtos e categorias do cardápio
  const [produtos, setProdutos] = useState<Produto[]>(() => getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []));
  const [categorias, setCategorias] = useState<Categoria[]>(() => getLocal<Categoria[]>(STORAGE_KEYS.CATEGORIAS, []));
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todos');
  const [busca, setBusca] = useState('');

  // Carrinho da mesa
  const [carrinho, setCarrinho] = useState<ItemPedidoCozinha[]>([]);
  const [modalCarrinhoAberto, setModalCarrinhoAberto] = useState(false);
  const [observacoesGerais, setObservacoesGerais] = useState('');
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  // Observação para item específico e Modal de Peso
  const [itemParaObservacao, setItemParaObservacao] = useState<{ produto: Produto; observacao: string } | null>(null);
  const [modalPesoCardapio, setModalPesoCardapio] = useState<{ isOpen: boolean; produto?: Produto | null }>({
    isOpen: false,
    produto: null
  });

  // Pedidos enviados desta mesa para a cozinha
  const [pedidosAtivosMesa, setPedidosAtivosMesa] = useState<PedidoCozinha[]>([]);
  const [ultimoPedidoEnviado, setUltimoPedidoEnviado] = useState<PedidoCozinha | null>(null);

  // Histórico de compras para visitas
  const [comprasExistentes, setComprasExistentes] = useState<Compra[]>([]);
  const [pedidosExistentes, setPedidosExistentes] = useState<PedidoCozinha[]>([]);

  // Carregar produtos, categorias, clientes e histórico
  useEffect(() => {
    const recarregar = () => {
      fetchProdutos().then(setProdutos);
      fetchCategorias().then(setCategorias);
      fetchClientes().then(setClientesList);
      fetchCompras().then(setComprasExistentes);
      fetchPedidosCozinha().then(setPedidosExistentes);
    };
    recarregar();

    window.addEventListener('catalogo_atualizado', recarregar);
    window.addEventListener('produtos_atualizados', recarregar);
    window.addEventListener('categorias_atualizadas', recarregar);
    window.addEventListener('clientes_atualizados', recarregar);
    window.addEventListener('compras_atualizadas', recarregar);
    window.addEventListener('pedidos_cozinha_atualizados', recarregar);
    window.addEventListener('storage', recarregar);

    return () => {
      window.removeEventListener('catalogo_atualizado', recarregar);
      window.removeEventListener('produtos_atualizados', recarregar);
      window.removeEventListener('categorias_atualizadas', recarregar);
      window.removeEventListener('clientes_atualizados', recarregar);
      window.removeEventListener('compras_atualizadas', recarregar);
      window.removeEventListener('pedidos_cozinha_atualizados', recarregar);
      window.removeEventListener('storage', recarregar);
    };
  }, []);

  // Calcular número de visitas reais
  const obterVisitasReais = (cliente: Cliente | null): number => {
    if (!cliente) return 0;
    const cNome = cliente.nome ? cliente.nome.trim().toLowerCase() : '';
    const cTel = cliente.whatsapp ? cleanPhone(cliente.whatsapp) : '';

    const countCompras = comprasExistentes.filter(cp => 
      cp.cliente_id === cliente.id ||
      (cNome && cp.detalhes && cp.detalhes.toLowerCase().includes(cNome))
    ).length;

    const countPedidos = pedidosExistentes.filter(p => 
      (p.cliente_id && p.cliente_id === cliente.id) ||
      (cNome && p.cliente_nome && p.cliente_nome.trim().toLowerCase() === cNome) ||
      (cTel && p.cliente_telefone && cleanPhone(p.cliente_telefone) === cTel)
    ).length;

    return Math.max(cliente.total_compras_historico || 0, countCompras, countPedidos);
  };

  // Reconhecimento de cliente por telefone ou nome
  useEffect(() => {
    const nome = nomeInput.trim().toLowerCase();
    const tel = cleanPhone(telefoneInput);

    if (tel && tel.length >= 8) {
      const match = clientesList.find(c => c.whatsapp && cleanPhone(c.whatsapp).includes(tel));
      if (match) {
        setClienteEncontradoNoPreenchimento(match);
        if (!nomeInput) setNomeInput(match.nome);
        return;
      }
    }

    if (nome.length >= 3) {
      const match = clientesList.find(c => c.nome.toLowerCase() === nome || c.nome.toLowerCase().startsWith(nome));
      if (match) {
        setClienteEncontradoNoPreenchimento(match);
        if (!telefoneInput && match.whatsapp) setTelefoneInput(formatPhoneDisplay(match.whatsapp));
        return;
      }
    }

    setClienteEncontradoNoPreenchimento(null);
  }, [nomeInput, telefoneInput, clientesList]);

  // Formatação do telefone
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const digits = v.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) {
      setTelefoneInput('');
      return;
    }
    if (digits.length <= 2) {
      setTelefoneInput(`(${digits}`);
    } else if (digits.length <= 7) {
      setTelefoneInput(`(${digits.slice(0, 2)}) ${digits.slice(2)}`);
    } else {
      setTelefoneInput(`(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`);
    }
  };

  const isBotaoAcessarLiberado = Boolean(mesaInput.trim()) && Boolean(nomeInput.trim());

  const handleEntrarNoCardapio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBotaoAcessarLiberado) return;

    setSalvandoCadastro(true);
    try {
      const nomeFinal = nomeInput.trim();
      const telFinal = cleanPhone(telefoneInput);

      if (telFinal && telFinal.length >= 8) {
        const { cliente } = await identificarOuCadastrarCliente(nomeFinal, telFinal);
        setClienteAtivo(cliente);
      } else {
        const existente = clientesList.find(c => c.nome.toLowerCase() === nomeFinal.toLowerCase());
        if (existente) {
          setClienteAtivo(existente);
        } else {
          setClienteAtivo({
            id: `temp-${Date.now()}`,
            nome: nomeFinal,
            whatsapp: telFinal || '',
            total_compras_historico: 0,
            criado_em: new Date().toISOString()
          });
        }
      }
      setAcessouCardapio(true);
    } catch (err) {
      console.error('Erro ao identificar cliente:', err);
      setAcessouCardapio(true);
    } finally {
      setSalvandoCadastro(false);
    }
  };

  const handleTrocarCliente = () => {
    setNomeInput('');
    setTelefoneInput('');
    setClienteAtivo(null);
    setClienteEncontradoNoPreenchimento(null);
    setCarrinho([]);
    setAcessouCardapio(false);
  };

  // Monitorar pedidos da cozinha para a mesa
  const mesaNumeroAtual = parseInt(mesaInput, 10) || 1;

  const atualizarPedidosMesa = async () => {
    try {
      const todos = await fetchPedidosCozinha();
      const daMesa = todos.filter(p => p.mesa_numero === mesaNumeroAtual && p.status !== 'cancelado');
      setPedidosAtivosMesa(daMesa);

      if (ultimoPedidoEnviado) {
        const atualizado = daMesa.find(p => p.id === ultimoPedidoEnviado.id);
        if (atualizado) setUltimoPedidoEnviado(atualizado);
      }
    } catch (e) {
      console.warn('Erro ao verificar pedidos da mesa:', e);
    }
  };

  useEffect(() => {
    if (acessouCardapio) {
      atualizarPedidosMesa();
      const interval = setInterval(atualizarPedidosMesa, 3000);

      const handleUpdate = () => atualizarPedidosMesa();
      window.addEventListener('pedidos_cozinha_atualizados', handleUpdate);
      window.addEventListener('novo_pedido_cozinha', handleUpdate);
      window.addEventListener('storage', handleUpdate);

      return () => {
        clearInterval(interval);
        window.removeEventListener('pedidos_cozinha_atualizados', handleUpdate);
        window.removeEventListener('novo_pedido_cozinha', handleUpdate);
        window.removeEventListener('storage', handleUpdate);
      };
    }
  }, [acessouCardapio, mesaNumeroAtual, ultimoPedidoEnviado?.id]);

  // Adicionar item ao carrinho (abre seletor de peso se for item por kg / 100g)
  const handleAdicionarItem = (produto: Produto, observacao?: string) => {
    if (ehProdutoPorPeso(produto) && !observacao) {
      setModalPesoCardapio({ isOpen: true, produto });
      return;
    }

    setCarrinho(prev => {
      const idxExistente = prev.findIndex(item => item.produto_id === produto.id && item.observacao === (observacao || '') && !item.peso_gramas);
      if (idxExistente >= 0) {
        const novo = [...prev];
        novo[idxExistente].quantidade += 1;
        novo[idxExistente].subtotal = Number((novo[idxExistente].quantidade * produto.preco).toFixed(2));
        return novo;
      } else {
        return [
          ...prev,
          {
            id_temp: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            produto_id: produto.id,
            nome: produto.nome,
            quantidade: 1,
            preco_unitario: produto.preco,
            subtotal: produto.preco,
            observacao: observacao || undefined,
            unidade_venda: produto.unidade_venda || 'unidade'
          }
        ];
      }
    });
    setItemParaObservacao(null);
  };

  const handleConfirmarPesoCardapio = (res: ResultadoPesoProduto) => {
    setCarrinho(prev => [
      ...prev,
      {
        id_temp: `item-peso-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        produto_id: res.produto.id,
        nome: res.nomeFormatado,
        quantidade: 1,
        preco_unitario: res.precoCalculado,
        subtotal: res.precoCalculado,
        observacao: res.observacao,
        unidade_venda: res.produto.unidade_venda || 'kg',
        peso_gramas: res.pesoGramas,
        medida_label: res.medidaLabel
      }
    ]);
    setModalPesoCardapio({ isOpen: false, produto: null });
  };

  // Alterar quantidade no carrinho
  const handleAlterarQuantidade = (idTemp: string, delta: number) => {
    setCarrinho(prev => {
      return prev.map(item => {
        if (item.id_temp === idTemp) {
          const novaQtd = item.quantidade + delta;
          if (novaQtd <= 0) return null;
          return {
            ...item,
            quantidade: novaQtd,
            subtotal: novaQtd * item.preco_unitario
          };
        }
        return item;
      }).filter(Boolean) as ItemPedidoCozinha[];
    });
  };

  const handleRemoverItemCard = (produtoId: string) => {
    setCarrinho(prev => {
      const idx = [...prev].reverse().findIndex(i => i.produto_id === produtoId);
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      const item = prev[realIdx];
      if (item.quantidade > 1) {
        const copy = [...prev];
        copy[realIdx] = {
          ...item,
          quantidade: item.quantidade - 1,
          subtotal: (item.quantidade - 1) * item.preco_unitario
        };
        return copy;
      } else {
        return prev.filter((_, i) => i !== realIdx);
      }
    });
  };

  const totalCarrinho = carrinho.reduce((acc, item) => acc + item.subtotal, 0);
  const totalItensCarrinho = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

  // Enviar pedido da mesa para a cozinha (KDS)
  const handleEnviarPedidoParaCozinha = async () => {
    if (carrinho.length === 0) return;

    setEnviandoPedido(true);
    try {
      const numMesa = parseInt(mesaInput.trim(), 10) || 1;
      const nomeFinal = nomeInput.trim() || `Mesa ${numMesa}`;
      const telLimpo = cleanPhone(telefoneInput);

      let cliId = clienteAtivo?.id;
      if (!cliId && telLimpo && telLimpo.length >= 8) {
        try {
          const { cliente } = await identificarOuCadastrarCliente(nomeFinal, telLimpo);
          setClienteAtivo(cliente);
          cliId = cliente.id;
        } catch (e) {
          console.warn('Erro ao cadastrar cliente no envio:', e);
        }
      }

      const pedidoCriado = await criarPedidoCardapio({
        mesaNumero: numMesa,
        clienteNome: nomeFinal,
        clienteTelefone: telLimpo || undefined,
        clienteId: cliId,
        observacoes: observacoesGerais.trim() || undefined,
        itens: carrinho
      });

      setUltimoPedidoEnviado(pedidoCriado);
      setCarrinho([]);
      setObservacoesGerais('');
      setModalCarrinhoAberto(false);
      setErroEnvio(null);

      // Scroll suave até o topo para ver o status da cozinha
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Falha ao enviar pedido:', err);
      setErroEnvio(err?.message || 'Erro ao enviar o pedido para a cozinha. Tente novamente.');
    } finally {
      setEnviandoPedido(false);
    }
  };

  // Filtragem dos produtos
  const produtosFiltrados = useMemo(() => {
    return produtos.filter(prod => {
      if (prod.ativo === false) return false;

      // Filtro por categoria
      if (categoriaAtiva !== 'todos' && prod.categoria_id !== categoriaAtiva) {
        return false;
      }

      // Filtro por busca de texto
      if (busca.trim()) {
        const termo = busca.toLowerCase().trim();
        const nomeMatch = prod.nome.toLowerCase().includes(termo);
        const cat = categorias.find(c => c.id === prod.categoria_id);
        const catMatch = cat ? cat.nome.toLowerCase().includes(termo) : false;
        return nomeMatch || catMatch;
      }

      return true;
    });
  }, [produtos, categoriaAtiva, busca, categorias]);

  // Rolagem suave até a seção do cardápio
  const rolarAteCardapio = () => {
    const el = document.getElementById('cardapio');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // =========================================================================
  // 1. TELA DE IDENTIFICAÇÃO (DESIGN ARTESANAL MOREIRA SALES)
  // =========================================================================
  if (!acessouCardapio) {
    return (
      <div className="min-h-screen bg-[#fcfaf5] text-[#38271c] flex flex-col justify-between selection:bg-[#e9ddc6]">
        {/* Topo / Marca */}
        <header className="border-b border-[#e6dfd1] bg-[#fcfaf5]">
          <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-full border border-[#b69b70] flex items-center justify-center bg-[#fffdf9] text-[#a07842] shadow-2xs">
                <Wheat className="w-6 h-6" />
              </span>
              <div>
                <span className="font-serif text-xl sm:text-2xl font-bold tracking-wide block leading-none text-[#38271c]">
                  MOREIRA SALES
                </span>
                <span className="text-[10px] tracking-[2px] font-sans text-[#87735f] font-semibold uppercase mt-1 block">
                  PANIFICADORA &amp; CONFEITARIA
                </span>
              </div>
            </div>
            <span className="hidden sm:inline-block text-xs font-serif italic text-[#87735f]">
              Feito com carinho. Todos os dias.
            </span>
          </div>
        </header>

        {/* Card Central de Identificação */}
        <main className="flex-1 max-w-md w-full mx-auto px-6 py-10 flex flex-col justify-center">
          <div className="bg-[#fffdfa] border border-[#e6dfd1] rounded-3xl p-7 sm:p-8 shadow-sm">
            <div className="text-center mb-6">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#f4eee3] border border-[#e9dfcd] text-[#78502b] mb-3">
                <Wheat className="w-7 h-7" />
              </span>
              <p className="text-[11px] font-bold tracking-[2px] text-[#a17e4f] uppercase mb-1">
                SEJA BEM-VINDO
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#38271c]">
                Identifique seu atendimento
              </h2>
              <p className="text-xs text-[#87735f] mt-1.5 leading-relaxed">
                Informe o número da sua mesa e seu nome para navegar pelo cardápio e enviar pedidos à cozinha.
              </p>
            </div>

            <form onSubmit={handleEntrarNoCardapio} className="space-y-4">
              {/* Mesa */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#785b40] mb-1.5">
                  NÚMERO DA MESA *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={mesaInput}
                  onChange={e => setMesaInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 5"
                  className="w-full px-4 py-3 bg-[#fdfbf7] border border-[#d9cebb] rounded-xl text-center text-base font-bold text-[#38271c] focus:border-[#78502b] focus:bg-white outline-none transition-all shadow-2xs font-mono"
                />
              </div>

              {/* Nome */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#785b40] mb-1.5">
                  SEU NOME E SOBRENOME *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#a28c76] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={nomeInput}
                    onChange={e => setNomeInput(e.target.value)}
                    placeholder="Ex: Maria Oliveira"
                    className="w-full pl-10 pr-4 py-3 bg-[#fdfbf7] border border-[#d9cebb] rounded-xl text-sm font-medium text-[#38271c] focus:border-[#78502b] focus:bg-white outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#785b40] mb-1.5">
                  WHATSAPP (OPCIONAL)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#a28c76] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={telefoneInput}
                    onChange={handleTelefoneChange}
                    placeholder="(DD) 90000-0000"
                    className="w-full pl-10 pr-4 py-3 bg-[#fdfbf7] border border-[#d9cebb] rounded-xl text-center text-sm font-medium text-[#38271c] focus:border-[#78502b] focus:bg-white outline-none transition-all shadow-2xs font-mono"
                  />
                </div>
                <p className="text-[11px] text-[#9c886f] text-center mt-1.5 leading-normal">
                  Usado para acumular visitas e pontos de fidelidade.
                </p>
              </div>

              {/* Identificação de fidelidade */}
              {clienteEncontradoNoPreenchimento ? (
                <div className="bg-[#f0f6ee] border border-[#c4e0be] rounded-2xl p-3 text-xs text-[#2b5924] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2b5924] shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold truncate">Cliente identificado: {clienteEncontradoNoPreenchimento.nome}</p>
                    <p className="text-[11px] text-[#3e7235]">
                      {obterVisitasReais(clienteEncontradoNoPreenchimento)} {obterVisitasReais(clienteEncontradoNoPreenchimento) === 1 ? 'visita' : 'visitas'} registradas no sistema.
                    </p>
                  </div>
                </div>
              ) : nomeInput.trim().length >= 2 ? (
                <div className="bg-[#faf5ec] border border-[#e6dfd1] rounded-2xl p-2.5 text-[11px] text-[#78502b]">
                  🌾 Novo cadastro: <b>{nomeInput.trim()}</b> será registrado com carinho no sistema da panificadora.
                </div>
              ) : null}

              {/* Botão Acessar */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!isBotaoAcessarLiberado || salvandoCadastro}
                  className={`w-full py-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                    isBotaoAcessarLiberado && !salvandoCadastro
                      ? 'bg-[#563922] hover:bg-[#775034] text-[#fff7e9] shadow-md shadow-[#563922]/20 active:scale-[0.99] cursor-pointer'
                      : 'bg-[#d9cebb] text-white cursor-not-allowed'
                  }`}
                >
                  <span>{salvandoCadastro ? 'Identificando...' : 'Acessar Cardápio'}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-[#e6dfd1] py-6 px-6 text-center text-xs text-[#9a8265] font-serif">
          <span>Panificadora Moreira Sales • É sempre bom ter você por aqui.</span>
        </footer>
      </div>
    );
  }

  // =========================================================================
  // 2. TELA DO CARDÁPIO DIGITAL (LAYOUT & CORES FIÉIS AO CHATGPT SITE)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#fcfaf5] text-[#38271c] selection:bg-[#e9ddc6] pb-32">
      
      {/* HEADER SUPERIOR MOREIRA SALES */}
      <header className="border-b border-[#e6dfd1] bg-[#fcfaf5] sticky top-0 z-30 backdrop-blur-md bg-[#fcfaf5]/95">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-4">
          
          {/* Marca / Logo com Badge de Trigo */}
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 sm:w-13 sm:h-13 rounded-full border border-[#b69b70] flex items-center justify-center bg-[#fffdf9] text-[#a07842] shadow-2xs shrink-0">
              <Wheat className="w-6 h-6 sm:w-7 sm:h-7" />
            </span>
            <div>
              <span className="font-serif text-lg sm:text-2xl font-bold tracking-wide block leading-none text-[#38271c]">
                MOREIRA SALES
              </span>
              <span className="text-[9px] sm:text-[10px] tracking-[2px] font-sans text-[#87735f] font-bold uppercase mt-1 block">
                PANIFICADORA &amp; CONFEITARIA
              </span>
            </div>
          </div>

          {/* Slogan Central (Desktop) */}
          <span className="hidden md:inline-block text-xs font-serif italic text-[#87735f] text-center">
            Feito com carinho. Todos os dias.
          </span>

          {/* Mesa / Cliente & Carrinho Rápido */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleTrocarCliente}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#d9cebb] bg-[#fffdf9] hover:bg-[#f4eee3] transition-all text-xs text-[#63482e] font-semibold cursor-pointer active:scale-95"
              title="Clique para trocar de cliente ou alterar mesa"
            >
              <span className="text-[10px] uppercase font-bold text-[#9c886f]">Mesa</span>
              <span className="font-mono font-black text-sm text-[#38271c]">
                {parseInt(mesaInput, 10) < 10 ? `0${parseInt(mesaInput, 10)}` : mesaInput}
              </span>
              <RotateCcw className="w-3 h-3 text-[#9c886f] ml-0.5" />
            </button>

            {totalItensCarrinho > 0 && (
              <button
                type="button"
                onClick={() => setModalCarrinhoAberto(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#563922] hover:bg-[#775034] text-[#fff7e9] transition-all text-xs font-bold cursor-pointer shadow-xs active:scale-95"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{totalItensCarrinho}</span>
                <span className="hidden sm:inline font-mono font-normal opacity-90">
                  • R$ {totalCarrinho.toFixed(2)}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION (EXATAMENTE COMO NO SITE CHATGPT) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-14 grid grid-cols-1 md:grid-cols-12 gap-8 items-center border-b border-[#e6dfd1]">
        
        {/* Lado Esquerdo: Mensagem e Chamada */}
        <div className="md:col-span-7">
          <p className="text-[10px] sm:text-[11px] font-bold tracking-[2px] text-[#a17e4f] uppercase mb-2">
            DA NOSSA PADARIA PARA O SEU DIA
          </p>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#38271c] leading-[1.15] mb-4">
            Tem sempre um<br />bom motivo para <em className="italic text-[#78502b]">ficar.</em>
          </h1>
          <p className="text-sm sm:text-base text-[#887765] leading-relaxed max-w-lg mb-6">
            O pão quentinho, o café passado e aquele doce.<br />
            Escolha o que combina com a sua vontade.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={rolarAteCardapio}
              className="bg-[#563922] hover:bg-[#775034] text-[#fff7e9] px-6 py-3.5 rounded-lg font-bold text-xs sm:text-sm inline-flex items-center gap-3 transition-colors shadow-xs active:scale-95 cursor-pointer"
            >
              <span>Explorar cardápio</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>

            <div className="text-[11px] text-[#9c886f] flex items-center gap-2">
              <Wheat className="w-4 h-4 text-[#a07842]" />
              <span>Sabor de casa em cada detalhe.</span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Ilustração Arqueada Artesanal */}
        <div className="md:col-span-5 flex justify-center">
          <div className="w-full max-w-sm bg-[#e9ddc6] bg-[radial-gradient(at_25%_20%,#fff8dd,#e9ddc6_70%)] rounded-t-[140px] rounded-b-xl relative overflow-hidden min-h-[240px] sm:min-h-[290px] flex items-center justify-center p-6 border border-[#d9cebb]/60 shadow-inner">
            
            {/* Prato com Croissant */}
            <div className="relative flex flex-col items-center justify-center">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-[#fcfaf5] border-4 border-[#d9cebb] shadow-md flex items-center justify-center text-4xl sm:text-5xl">
                🥐
              </div>
              
              {/* Xícara de Café */}
              <div className="absolute -bottom-3 -right-4 bg-[#fffdf9] border-2 border-[#b69b70] rounded-2xl px-3 py-2 shadow-lg flex items-center gap-1.5 text-xs font-bold text-[#563922]">
                <span className="text-base">☕</span>
                <span>Café passado</span>
              </div>
            </div>

            {/* Selo Artesanal */}
            <div className="absolute top-4 right-4 bg-[#fffaf0]/90 backdrop-blur-xs border border-[#b69b70] rounded-full px-3 py-1 text-[9px] font-bold text-[#78502b] uppercase tracking-wider shadow-2xs">
              MOREIRA SALES
            </div>
          </div>
        </div>
      </section>

      {/* STATUS DO ÚLTIMO PEDIDO ENVIADO PARA A COZINHA (SE HOUVER) */}
      {ultimoPedidoEnviado && (
        <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-6">
          <div className="bg-[#fffdfa] rounded-3xl p-5 sm:p-6 border-2 border-[#a07842] shadow-sm animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-bold text-[#563922] flex items-center gap-2 uppercase tracking-wide">
                <ChefHat className="w-4 h-4 text-[#a07842]" /> Acompanhe seu Pedido na Cozinha
              </span>
              <span className="text-xs font-mono font-bold text-[#9c886f]">
                #{ultimoPedidoEnviado.id.slice(-5)}
              </span>
            </div>

            {/* Etapas do pedido */}
            <div className="grid grid-cols-3 gap-2 text-center py-2">
              <div className={`p-3 rounded-2xl flex flex-col items-center justify-center transition-all ${
                ultimoPedidoEnviado.status === 'pendente' 
                  ? 'bg-[#563922] text-[#fff7e9] font-bold shadow-md animate-pulse' 
                  : 'bg-[#f4eee3] text-[#9c886f]'
              }`}>
                <AlertCircle className="w-5 h-5 mb-1" />
                <span className="text-xs leading-tight">Recebido na Cozinha</span>
              </div>

              <div className={`p-3 rounded-2xl flex flex-col items-center justify-center transition-all ${
                ultimoPedidoEnviado.status === 'preparando' 
                  ? 'bg-[#a07842] text-white font-bold shadow-md animate-pulse' 
                  : ultimoPedidoEnviado.status === 'pronto' || ultimoPedidoEnviado.status === 'entregue'
                  ? 'bg-[#eef5eb] text-[#2b5924] font-bold border border-[#c4e0be]'
                  : 'bg-[#f4eee3] text-[#9c886f]'
              }`}>
                <ChefHat className="w-5 h-5 mb-1" />
                <span className="text-xs leading-tight">Em Preparo</span>
              </div>

              <div className={`p-3 rounded-2xl flex flex-col items-center justify-center transition-all ${
                ultimoPedidoEnviado.status === 'pronto' || ultimoPedidoEnviado.status === 'entregue'
                  ? 'bg-[#2b5924] text-white font-bold shadow-md' 
                  : 'bg-[#f4eee3] text-[#9c886f]'
              }`}>
                <CheckCircle2 className="w-5 h-5 mb-1" />
                <span className="text-xs leading-tight">
                  {ultimoPedidoEnviado.status === 'entregue' ? 'Entregue!' : 'Pronto p/ Servir!'}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#87735f] text-center mt-3 font-medium">
              {ultimoPedidoEnviado.status === 'pendente' && 'A cozinha recebeu seu pedido e logo começará a prepará-lo com carinho.'}
              {ultimoPedidoEnviado.status === 'preparando' && 'Seus itens estão sendo preparados na nossa chapa e balcão artesanal!'}
              {ultimoPedidoEnviado.status === 'pronto' && 'Seu pedido está prontinho! O garçom está levando até a sua mesa.'}
              {ultimoPedidoEnviado.status === 'entregue' && 'Bom apetite! Se desejar algo mais, é só pedir aqui pelo cardápio.'}
            </p>
          </div>
        </div>
      )}

      {/* SEÇÃO PRINCIPAL DO CARDÁPIO */}
      <main id="cardapio" className="max-w-6xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 space-y-6">
        
        {/* Cabeçalho da Seção */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold tracking-[2px] text-[#a17e4f] uppercase mb-1">
              SELEÇÃO ESPECIAL
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#38271c]">
              Nosso Cardápio<span className="text-[#a07842]">.</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#87735f] mt-1">
              Pães artesanais, salgados assados e fritos, doces finos, lanches na chapa e bebidas fresquinhas.
            </p>
          </div>

          {/* Campo de Busca de Produtos */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar produtos no cardápio..."
              className="w-full pl-10 pr-9 py-2.5 bg-[#fffdfa] border border-[#d9cebb] rounded-xl text-xs sm:text-sm font-medium text-[#38271c] placeholder:text-[#a28c76] focus:border-[#78502b] outline-none shadow-2xs"
            />
            <Search className="w-4 h-4 text-[#a28c76] absolute left-3.5 top-1/2 -translate-y-1/2" />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[#a28c76] hover:text-[#38271c] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Abas de Categorias (Horizontal Scrollable Nav) */}
        <nav aria-label="Categorias" className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none touch-manipulation">
          <button
            type="button"
            onClick={() => setCategoriaAtiva('todos')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
              categoriaAtiva === 'todos'
                ? 'bg-[#563922] text-[#fff7e9] shadow-xs'
                : 'bg-[#fffdf9] text-[#785b40] border border-[#e6dfd1] hover:border-[#b69b70]'
            }`}
          >
            <span>Todos</span>
            <span className="opacity-75 text-[10px]">({produtos.filter(p => p.ativo !== false).length})</span>
          </button>

          {categorias.map(cat => {
            const count = produtos.filter(p => p.ativo !== false && p.categoria_id === cat.id).length;
            const emoji = obterEmojiCategoria(cat.nome);
            const isAtiva = categoriaAtiva === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoriaAtiva(cat.id)}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                  isAtiva
                    ? 'bg-[#563922] text-[#fff7e9] shadow-xs'
                    : 'bg-[#fffdf9] text-[#785b40] border border-[#e6dfd1] hover:border-[#b69b70]'
                }`}
              >
                <span>{emoji} {cat.nome}</span>
                {count > 0 && <span className="opacity-75 text-[10px]">({count})</span>}
              </button>
            );
          })}
        </nav>

        {/* Grade de Produtos do Cardápio */}
        {produtosFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-[#fffdfa] rounded-3xl border border-[#e6dfd1] p-8">
            <Wheat className="w-12 h-12 text-[#d9cebb] mx-auto mb-3" />
            <p className="font-serif text-lg font-bold text-[#38271c]">Nenhum item encontrado</p>
            <p className="text-xs text-[#87735f] mt-1">
              Tente buscar por outro termo ou selecione outra categoria acima.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {produtosFiltrados.map(produto => {
              const categoria = categorias.find(c => c.id === produto.categoria_id);
              const qtdNoCarrinho = carrinho
                .filter(i => i.produto_id === produto.id)
                .reduce((sum, i) => sum + i.quantidade, 0);

              const estaNoCarrinho = qtdNoCarrinho > 0;
              const emojiCat = categoria ? obterEmojiCategoria(categoria.nome) : '🌾';

              return (
                <article
                  key={produto.id}
                  className={`bg-[#fffdf9] border rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 group relative ${
                    estaNoCarrinho
                      ? 'border-[#78502b] ring-2 ring-[#78502b]/15 shadow-sm'
                      : 'border-[#e6dfd1] hover:border-[#b69b70] hover:shadow-sm'
                  }`}
                >
                  {/* Topo / Placeholder Ilustrado Artesanal */}
                  <div>
                    <div className="bg-[#f4eee3] border border-[#e9dfcd] rounded-xl h-28 flex flex-col items-center justify-center text-[#ab916d] mb-3 relative overflow-hidden group-hover:bg-[#f0e7d8] transition-colors">
                      <Wheat className="w-7 h-7 text-[#b69b70] mb-1" />
                      <span className="font-serif italic text-xs text-[#9c886f]">Feito com carinho</span>
                      
                      {/* Categoria chip discreto */}
                      <span className="absolute top-2 left-2 bg-[#fffdf9]/90 backdrop-blur-xs border border-[#d9cebb] rounded-md px-2 py-0.5 text-[10px] font-semibold text-[#785b40]">
                        {emojiCat} {categoria?.nome || 'Panificadora'}
                      </span>

                      {/* Badge se tiver no pedido */}
                      {estaNoCarrinho && (
                        <span className="absolute top-2 right-2 bg-[#563922] text-[#fff7e9] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                          {qtdNoCarrinho} no pedido
                        </span>
                      )}
                    </div>

                    {/* Nome do Produto */}
                    <h4 className="font-serif font-bold text-base text-[#38271c] leading-snug line-clamp-2 min-h-[2.5rem]">
                      {produto.nome}
                    </h4>
                  </div>

                  {/* Rodapé do Card: Preço, Unidade e Botões */}
                  <div className="mt-4 pt-3 border-t border-[#f0e8dc] flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[#a28c76] text-[11px] font-semibold block leading-none mb-1">
                        {produto.unidade_venda || 'unidade'}
                      </span>
                      <strong className="text-[#78502b] font-mono font-bold text-base sm:text-lg leading-none block">
                        R$ {Number(produto.preco).toFixed(2).replace('.', ',')}
                      </strong>
                    </div>

                    {/* Ações: Pedir ou Stepper */}
                    {!estaNoCarrinho ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setItemParaObservacao({ produto, observacao: '' })}
                          className="px-2 py-2 bg-[#f4eee3] hover:bg-[#e9dfcd] active:scale-95 text-[#63482e] text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                          title="Adicionar observação (ex: sem cebola)"
                        >
                          Obs
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdicionarItem(produto)}
                          className="px-3.5 py-2 bg-[#563922] hover:bg-[#775034] active:scale-95 text-[#fff7e9] text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Pedir</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setItemParaObservacao({ produto, observacao: '' })}
                          className="px-1.5 py-1.5 bg-[#f4eee3] hover:bg-[#e9dfcd] text-[#63482e] text-[10px] font-bold rounded-md transition-all cursor-pointer"
                          title="Alterar observação"
                        >
                          Obs
                        </button>
                        <div className="flex items-center bg-[#f4eee3] p-0.5 rounded-lg border border-[#e6dfd1]">
                          <button
                            type="button"
                            onClick={() => handleRemoverItemCard(produto.id)}
                            className="w-7 h-7 rounded-md bg-[#fffdf9] hover:bg-[#f0e8dc] text-[#563922] active:scale-90 flex items-center justify-center transition-all cursor-pointer"
                          >
                            <Minus className="w-3 h-3 stroke-[2.5]" />
                          </button>
                          <span className="w-6 text-center font-bold text-xs font-mono text-[#38271c]">
                            {qtdNoCarrinho}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdicionarItem(produto)}
                            className="w-7 h-7 rounded-md bg-[#563922] hover:bg-[#775034] text-[#fff7e9] active:scale-90 flex items-center justify-center transition-all cursor-pointer"
                          >
                            <Plus className="w-3 h-3 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* NOTA DE RODAPÉ (EXATAMENTE COMO NO SITE CHATGPT) */}
        <div className="border-t border-[#e6dfd1] pt-10 pb-6 text-center">
          <div className="flex items-center justify-center gap-2 font-serif italic text-base sm:text-lg text-[#9a8265]">
            <Wheat className="w-5 h-5 text-[#b69b70]" />
            <span>Um pouquinho de carinho em cada receita.</span>
          </div>
          <p className="max-w-xl mx-auto text-[11px] text-[#9c8e7d] leading-relaxed mt-2">
            Produtos sujeitos à disponibilidade. Fotos ilustrativas: embalagens e sabores podem variar; 
            confira o volume no nome do produto. Itens por peso têm o valor final calculado na pesagem.
          </p>
        </div>
      </main>

      {/* FOOTER ARTESANAL */}
      <footer className="border-t border-[#e6dfd1] mt-10 py-8 px-6 text-center text-xs text-[#87735f] font-serif space-y-1">
        <p className="font-bold text-[#563922]">Panificadora Moreira Sales</p>
        <p>É sempre bom ter você por aqui.</p>
        {isStandalone && <Footer className="mt-6 pt-4 border-t border-[#e6dfd1]/60" />}
      </footer>

      {/* MODAL DE OBSERVAÇÃO PARA O ITEM */}
      {itemParaObservacao && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#fffdfa] border border-[#d9cebb] rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 animate-scaleUp">
            <h3 className="font-serif font-bold text-base text-[#38271c] mb-1">
              Observação: {itemParaObservacao.produto.nome}
            </h3>
            <p className="text-xs text-[#87735f] mb-3">
              Como você gostaria que a cozinha preparasse este item?
            </p>
            <input
              type="text"
              autoFocus
              value={itemParaObservacao.observacao}
              onChange={e => setItemParaObservacao({ ...itemParaObservacao, observacao: e.target.value })}
              placeholder="Ex: Sem açúcar, pão bem passado, leite gelado..."
              className="w-full px-4 py-3 bg-[#fdfbf7] border border-[#d9cebb] rounded-xl text-sm font-medium focus:border-[#78502b] outline-none mb-4"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdicionarItem(itemParaObservacao.produto, itemParaObservacao.observacao);
                }
              }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setItemParaObservacao(null)}
                className="flex-1 py-2.5 bg-[#f4eee3] text-[#63482e] font-bold rounded-xl text-xs hover:bg-[#e9dfcd] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleAdicionarItem(itemParaObservacao.produto, itemParaObservacao.observacao)}
                className="flex-1 py-2.5 bg-[#563922] text-[#fff7e9] font-bold rounded-xl text-xs hover:bg-[#775034] transition-colors cursor-pointer"
              >
                Adicionar com Obs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA FIXA FLUTUANTE INFERIOR DO CARRINHO */}
      {totalItensCarrinho > 0 && (
        <div className="fixed bottom-4 inset-x-4 max-w-2xl mx-auto z-40 animate-slideUp">
          <button
            type="button"
            onClick={() => setModalCarrinhoAberto(true)}
            className="w-full bg-[#563922] hover:bg-[#775034] text-[#fff7e9] p-4 rounded-2xl shadow-xl flex items-center justify-between border border-[#b69b70] transition-all active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fff7e9] text-[#563922] font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                {totalItensCarrinho}
              </div>
              <div className="text-left">
                <p className="text-[11px] text-[#e6dfd1] font-medium">
                  Comanda • Mesa {parseInt(mesaInput, 10) < 10 ? `0${parseInt(mesaInput, 10)}` : mesaInput}
                </p>
                <p className="text-sm font-bold">Ver Pedido / Enviar para a Cozinha</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-lg font-bold font-mono text-[#fff7e9]">
                R$ {totalCarrinho.toFixed(2)}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* MODAL / DRAWER DE REVISÃO DO PEDIDO */}
      {modalCarrinhoAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[#fffdfa] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-slideUp border border-[#d9cebb]">
            
            {/* Header do Carrinho */}
            <div className="p-5 bg-[#563922] text-[#fff7e9] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-[#b69b70]" />
                <div>
                  <h3 className="font-serif font-bold text-base sm:text-lg">
                    Comanda • Mesa {parseInt(mesaInput, 10) < 10 ? `0${parseInt(mesaInput, 10)}` : mesaInput}
                  </h3>
                  <p className="text-xs text-[#e6dfd1]">
                    Cliente: {nomeInput.trim() || `Mesa ${mesaInput}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCarrinhoAberto(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-5 h-5 text-[#fff7e9]" />
              </button>
            </div>

            {/* Lista de Itens */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {carrinho.map(item => (
                <div key={item.id_temp} className="flex items-center justify-between p-3.5 bg-[#fcfaf5] rounded-xl border border-[#e6dfd1]">
                  <div className="min-w-0 pr-2">
                    <p className="font-serif font-bold text-sm text-[#38271c] leading-snug">{item.nome}</p>
                    {item.observacao && (
                      <p className="text-xs text-[#78502b] font-medium mt-0.5">
                        Obs: {item.observacao}
                      </p>
                    )}
                    <p className="text-xs text-[#9a8265] font-mono mt-0.5">
                      R$ {item.preco_unitario.toFixed(2)} {item.unidade_venda ? `/${item.unidade_venda}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-[#f4eee3] p-1 rounded-lg border border-[#d9cebb]">
                      <button
                        type="button"
                        onClick={() => handleAlterarQuantidade(item.id_temp, -1)}
                        className="w-7 h-7 rounded bg-[#fffdfa] hover:bg-[#e9dfcd] text-[#563922] font-bold flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center font-bold text-xs font-mono text-[#38271c]">
                        {item.quantidade}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAlterarQuantidade(item.id_temp, 1)}
                        className="w-7 h-7 rounded bg-[#563922] hover:bg-[#775034] text-[#fff7e9] font-bold flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="font-mono font-bold text-sm text-[#78502b] min-w-[60px] text-right">
                      R$ {item.subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Campo de Observações Gerais */}
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#785b40] mb-1">
                  Observações para a Cozinha (Opcional):
                </label>
                <textarea
                  value={observacoesGerais}
                  onChange={e => setObservacoesGerais(e.target.value)}
                  placeholder="Ex: Trazer tudo junto, caprichar no guardanapo..."
                  rows={2}
                  className="w-full p-3 bg-[#fdfbf7] border border-[#d9cebb] rounded-xl text-xs text-[#38271c] focus:border-[#78502b] outline-none"
                />
              </div>

              {erroEnvio && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{erroEnvio}</span>
                </div>
              )}
            </div>

            {/* Rodapé do Carrinho com Total e Envio */}
            <div className="p-5 bg-[#fcfaf5] border-t border-[#e6dfd1] space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-[#87735f]">Total do Pedido:</span>
                <span className="font-mono font-bold text-2xl text-[#78502b]">
                  R$ {totalCarrinho.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setModalCarrinhoAberto(false)}
                  className="py-3 px-4 bg-[#f4eee3] hover:bg-[#e9dfcd] text-[#63482e] font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Continuar Escolhendo
                </button>

                <button
                  type="button"
                  disabled={enviandoPedido || carrinho.length === 0}
                  onClick={handleEnviarPedidoParaCozinha}
                  className="py-3 px-4 bg-[#563922] hover:bg-[#775034] text-[#fff7e9] font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {enviandoPedido ? (
                    <span>Enviando...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Pedido</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PESO / MEDIDA PROPORCIONAL */}
      <PesoProdutoModal
        isOpen={modalPesoCardapio.isOpen}
        produto={modalPesoCardapio.produto}
        produtosCatalogo={produtos}
        onClose={() => setModalPesoCardapio({ isOpen: false, produto: null })}
        onConfirm={handleConfirmarPesoCardapio}
      />
    </div>
  );
};
