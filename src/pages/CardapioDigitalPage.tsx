import React, { useState, useEffect, useMemo } from 'react';
import { 
  Coffee, 
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
  Sparkles, 
  ChevronRight,
  UtensilsCrossed,
  RotateCcw
} from 'lucide-react';
import { Produto, Categoria, ItemPedidoCozinha, PedidoCozinha, Cliente, Compra } from '../types';
import { 
  fetchProdutos, 
  fetchCategorias, 
  criarPedidoCardapio, 
  fetchPedidosCozinha, 
  fetchClientes, 
  fetchCompras,
  fetchMesasAbertas,
  saveMesaAberta,
  identificarOuCadastrarCliente,
  getLocal,
  STORAGE_KEYS
} from '../services/db';
import { cleanPhone, formatPhoneDisplay } from '../services/whatsapp';
import { Footer } from '../components/Footer';

interface CardapioDigitalPageProps {
  mesaInicial?: number;
  isStandalone?: boolean;
}

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

  // Estados da Tela Inicial de Identificação
  const [mesaInput, setMesaInput] = useState<string>(initialMesaFromUrl);
  const [nomeInput, setNomeInput] = useState<string>('');
  const [telefoneInput, setTelefoneInput] = useState<string>('');
  const [salvandoCadastro, setSalvandoCadastro] = useState<boolean>(false);

  // Cada novo acesso à página de cardápio exige a identificação do cliente e da mesa
  const [acessouCardapio, setAcessouCardapio] = useState<boolean>(false);

  // Cliente reconhecido ou criado
  const [clienteAtivo, setClienteAtivo] = useState<Cliente | null>(null);
  const [clientesList, setClientesList] = useState<Cliente[]>([]);
  const [clienteEncontradoNoPreenchimento, setClienteEncontradoNoPreenchimento] = useState<Cliente | null>(null);

  // Produtos e categorias do cardápio com hidratação instantânea
  const [produtos, setProdutos] = useState<Produto[]>(() => getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []));
  const [categorias, setCategorias] = useState<Categoria[]>(() => getLocal<Categoria[]>(STORAGE_KEYS.CATEGORIAS, []));
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todos');
  const [busca, setBusca] = useState('');

  // Carrinho da mesa
  const [carrinho, setCarrinho] = useState<ItemPedidoCozinha[]>([]);
  const [modalCarrinhoAberto, setModalCarrinhoAberto] = useState(false);
  const [observacoesGerais, setObservacoesGerais] = useState('');
  const [enviandoPedido, setEnviandoPedido] = useState(false);

  // Observação para item específico
  const [itemParaObservacao, setItemParaObservacao] = useState<{ produto: Produto; observacao: string } | null>(null);

  // Pedidos enviados desta mesa para a cozinha
  const [pedidosAtivosMesa, setPedidosAtivosMesa] = useState<PedidoCozinha[]>([]);
  const [ultimoPedidoEnviado, setUltimoPedidoEnviado] = useState<PedidoCozinha | null>(null);

  // Histórico de compras e pedidos para cálculo fidedigno de visitas em tempo real
  const [comprasExistentes, setComprasExistentes] = useState<Compra[]>([]);
  const [pedidosExistentes, setPedidosExistentes] = useState<PedidoCozinha[]>([]);

  // Carregar produtos, categorias, clientes e histórico existente
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

  // Calcular número REAL de visitas de um cliente através do histórico
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

  // Identificação em tempo real por telefone ou por nome
  useEffect(() => {
    const nome = nomeInput.trim().toLowerCase();
    const tel = cleanPhone(telefoneInput);

    if (tel && tel.length >= 8) {
      const match = clientesList.find(c => {
        const cTel = cleanPhone(c.whatsapp);
        return cTel === tel || (tel.length >= 8 && (cTel.endsWith(tel) || tel.endsWith(cTel)));
      });
      if (match) {
        setClienteEncontradoNoPreenchimento(match);
        return;
      }
    }

    if (nome.length >= 3) {
      const match = clientesList.find(c => c.nome.trim().toLowerCase() === nome);
      if (match) {
        setClienteEncontradoNoPreenchimento(match);
        return;
      }
    }

    setClienteEncontradoNoPreenchimento(null);
  }, [nomeInput, telefoneInput, clientesList]);

  // Monitorar digitação do WhatsApp para formatação
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = cleanPhone(raw);
    
    let formatted = raw;
    if (digits.length <= 11) {
      formatted = formatPhoneDisplay(digits);
    }
    setTelefoneInput(formatted);
  };

  // Botão de liberação de acesso: Mesa informada e Nome preenchido (mínimo 2 caracteres)
  const isBotaoAcessarLiberado = mesaInput.trim().length > 0 && !isNaN(parseInt(mesaInput, 10)) && nomeInput.trim().length >= 2;

  const handleAcessarCardapio = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isBotaoAcessarLiberado || salvandoCadastro) return;

    setSalvandoCadastro(true);
    const numMesa = parseInt(mesaInput.trim(), 10);
    const nomeFinal = nomeInput.trim();
    const telLimpo = cleanPhone(telefoneInput);

    try {
      // 1. Busca cliente existente no Supabase ou cria automaticamente o novo cadastro
      const { cliente, isNovo } = await identificarOuCadastrarCliente(
        nomeFinal,
        telLimpo
      );
      const visitasReal = Math.max(cliente.total_compras_historico || 0, obterVisitasReais(cliente));
      setClienteAtivo({ ...cliente, total_compras_historico: visitasReal });

      // 2. REGRA DO USUÁRIO: Ao fazer login no cardápio, a mesa já deve constar como ocupada com a comanda do cliente!
      try {
        const mesas = await fetchMesasAbertas();
        const mesaExistente = mesas.find(m => m.mesa_numero === numMesa);
        if (!mesaExistente) {
          await saveMesaAberta({
            id: `mesa-${numMesa}`,
            mesa_id: numMesa.toString(),
            mesa_numero: numMesa,
            cliente_id: cliente.id,
            cliente_nome: cliente.nome,
            cliente_telefone: cliente.whatsapp || telLimpo,
            carrinho: [],
            total: 0,
            status: 'ocupada',
            criado_em: new Date().toISOString()
          });
        } else {
          await saveMesaAberta({
            ...mesaExistente,
            cliente_id: cliente.id,
            cliente_nome: cliente.nome,
            cliente_telefone: cliente.whatsapp || telLimpo
          });
        }
      } catch (errMesa) {
        console.warn('Erro ao registrar mesa ocupada no login do cardápio:', errMesa);
      }

      setAcessouCardapio(true);
    } catch (err) {
      console.warn('Erro ao registrar/identificar cliente:', err);
      // Mesmo com falha de rede temporária, permite acessar o cardápio da mesa
      setAcessouCardapio(true);
    } finally {
      setSalvandoCadastro(false);
    }
  };

  // Trocar de cliente / mesa (reseta os dados para que outra pessoa possa se identificar)
  const handleTrocarCliente = () => {
    setNomeInput('');
    setTelefoneInput('');
    setClienteAtivo(null);
    setClienteEncontradoNoPreenchimento(null);
    setCarrinho([]);
    setAcessouCardapio(false);
  };

  // Monitorar pedidos da cozinha para esta mesa
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

  // Adicionar produto ao carrinho
  const handleAdicionarItem = (produto: Produto, observacao?: string) => {
    setCarrinho(prev => {
      const idxExistente = prev.findIndex(item => item.produto_id === produto.id && item.observacao === (observacao || ''));
      if (idxExistente >= 0) {
        const novo = [...prev];
        novo[idxExistente].quantidade += 1;
        novo[idxExistente].subtotal = novo[idxExistente].quantidade * produto.preco;
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
            observacao: observacao || undefined
          }
        ];
      }
    });
    setItemParaObservacao(null);
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

  // Decrementar item diretamente a partir do card do cardápio (otimização mobile)
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

  // Enviar pedido da mesa direto para a cozinha (KDS)
  const handleEnviarPedidoParaCozinha = async () => {
    if (carrinho.length === 0) return;

    setEnviandoPedido(true);
    try {
      const numMesa = parseInt(mesaInput.trim(), 10) || 1;
      const nomeFinal = nomeInput.trim() || `Mesa ${numMesa}`;
      const telLimpo = cleanPhone(telefoneInput);

      // Se informou telefone e ainda não tinha vinculado cliente, vincula ou cria cadastro
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

      // Envia direto para a Cozinha e para a Mesa Aberta no Caixa
      const novoPedido = await criarPedidoCardapio({
        mesaNumero: numMesa,
        clienteId: cliId,
        clienteNome: nomeFinal,
        clienteTelefone: telLimpo || undefined,
        itens: carrinho,
        observacoes: observacoesGerais.trim() || undefined
      });

      setUltimoPedidoEnviado(novoPedido);
      setCarrinho([]);
      setObservacoesGerais('');
      setModalCarrinhoAberto(false);
      await atualizarPedidosMesa();
    } catch (err) {
      console.error('Erro ao enviar pedido para a cozinha:', err);
      alert('Não foi possível enviar o pedido para a cozinha. Tente novamente.');
    } finally {
      setEnviandoPedido(false);
    }
  };

  // Filtragem de produtos por busca e categoria
  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      if (p.ativo === false) return false;
      const bateBusca = !busca.trim() || p.nome.toLowerCase().includes(busca.toLowerCase());
      const bateCategoria = categoriaAtiva === 'todos' || p.categoria_id === categoriaAtiva;
      return bateBusca && bateCategoria;
    });
  }, [produtos, busca, categoriaAtiva]);

  // =========================================================================
  // 1. TELA QUE ANTECEDE AO CARDÁPIO (EXATO LAYOUT DO PRINT ENVIADO PELO CLIENTE)
  // =========================================================================
  if (!acessouCardapio) {
    return (
      <div className="min-h-screen bg-[#F4F4F6] flex items-center justify-center p-4 selection:bg-amber-200">
        
        {/* Card Central - Cópia Fiel do Layout do Print */}
        <div className="w-full max-w-[430px] bg-white rounded-[32px] shadow-xl shadow-stone-200/60 p-7 sm:p-9 border border-stone-100 animate-scaleUp">
          
          {/* Ícone Circular Superior com Talheres Cruzados */}
          <div className="w-16 h-16 rounded-full bg-[#FEF4E6] flex items-center justify-center mx-auto mb-4.5 text-[#C88A3E] shadow-xs">
            <UtensilsCrossed className="w-7 h-7 text-[#C88A3E]" strokeWidth={2.2} />
          </div>

          {/* Título e Subtítulo */}
          <h1 className="text-2xl font-bold text-stone-900 text-center tracking-tight mb-2">
            Bem-vindo(a)!
          </h1>
          <p className="text-xs text-stone-500 text-center leading-relaxed mb-7 max-w-[280px] mx-auto font-normal">
            Preencha os dados abaixo para iniciar seu atendimento na mesa.
          </p>

          <form onSubmit={handleAcessarCardapio} className="space-y-4">
            
            {/* Campo 1: NÚMERO DA MESA * */}
            <div>
              <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                NÚMERO DA MESA *
              </label>
              <input
                type="text"
                required
                value={mesaInput}
                onChange={e => setMesaInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 5"
                className="w-full px-4 py-3.5 bg-[#F9F9FB] border border-stone-200 rounded-xl text-center text-sm font-bold text-stone-900 placeholder:text-stone-400 placeholder:font-normal focus:bg-white focus:border-amber-600 outline-none transition-all shadow-xs"
              />
            </div>

            {/* Campo 2: SEU NOME E SOBRENOME * */}
            <div>
              <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                SEU NOME E SOBRENOME *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus={Boolean(mesaInput)}
                  value={nomeInput}
                  onChange={e => setNomeInput(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full pl-10 pr-4 py-3.5 bg-[#F9F9FB] border border-stone-200 rounded-xl text-sm font-medium text-stone-900 placeholder:text-stone-400 placeholder:font-normal focus:bg-white focus:border-amber-600 outline-none transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Campo 3: WHATSAPP (OPCIONAL) */}
            <div>
              <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                WHATSAPP (OPCIONAL)
              </label>
              <input
                type="tel"
                value={telefoneInput}
                onChange={handleTelefoneChange}
                placeholder="(DD) 90000-0000"
                className="w-full px-4 py-3.5 bg-[#F9F9FB] border border-stone-200 rounded-xl text-center text-sm font-medium text-stone-900 placeholder:text-stone-400 placeholder:font-normal focus:bg-white focus:border-amber-600 outline-none transition-all shadow-xs"
              />
              <p className="text-[11px] text-stone-400 text-center leading-normal mt-2 px-2 font-normal">
                Informe seu WhatsApp para acumular visitas e pontos de fidelidade no Painel da Panificadora!
              </p>
            </div>

            {/* Reconhecimento em Tempo Real (se já tiver cadastro pelo Nome ou WhatsApp) */}
            {clienteEncontradoNoPreenchimento ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-800 animate-fadeIn flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold truncate">Cliente identificado: {clienteEncontradoNoPreenchimento.nome}</p>
                  <p className="text-[11px] text-emerald-700">
                    Histórico vinculado: {obterVisitasReais(clienteEncontradoNoPreenchimento)} {obterVisitasReais(clienteEncontradoNoPreenchimento) === 1 ? 'visita já registrada' : 'visitas já registradas'} no sistema.
                  </p>
                </div>
              </div>
            ) : nomeInput.trim().length >= 2 ? (
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-2.5 text-[11px] text-amber-900 animate-fadeIn">
                ✨ Novo cadastro: <b>{nomeInput.trim()}</b> será salvo no banco de dados e acumulará seu histórico na panificadora.
              </div>
            ) : null}

            {/* Botão de Acesso - Liberado quando colocar o número da mesa e o nome */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!isBotaoAcessarLiberado || salvandoCadastro}
                className={`w-full py-4 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  isBotaoAcessarLiberado && !salvandoCadastro
                    ? 'bg-gradient-to-r from-[#D49342] to-[#C88A3E] hover:from-[#C88A3E] hover:to-[#B67A32] text-white shadow-lg shadow-amber-500/25 active:scale-[0.99] cursor-pointer'
                    : 'bg-[#D6D3D1] text-white cursor-not-allowed'
                }`}
              >
                <span>{salvandoCadastro ? 'Identificando Cliente...' : 'Acessar Cardápio'}</span>
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. TELA DO CARDÁPIO DIGITAL (APÓS PREENCHER E ACESSAR)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-900 pb-32 selection:bg-amber-200">
      
      {/* Header Fixo Superior do Cardápio */}
      <header className="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAcessouCardapio(false)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Trocar mesa ou alterar dados"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center font-black text-amber-300 text-sm shadow-inner shrink-0">
              MS
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight leading-none text-white">
                Moreira Sales
              </h1>
              <p className="text-[11px] text-amber-200 font-medium">Cardápio Digital</p>
            </div>
          </div>

          {/* Badge da Mesa e Cliente */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTrocarCliente}
              className="flex items-center gap-1.5 bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded-2xl border border-white/15 transition-all text-xs font-bold text-amber-300 active:scale-95 cursor-pointer"
              title="Clique para trocar de cliente ou alterar mesa"
            >
              <span className="uppercase text-[10px] text-stone-300">Mesa</span>
              <span className="text-sm font-black text-white">
                {parseInt(mesaInput, 10) < 10 ? `0${parseInt(mesaInput, 10)}` : mesaInput}
              </span>
              <RotateCcw className="w-3 h-3 text-amber-400 ml-0.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        
        {/* Identificação Resumida do Atendimento da Mesa */}
        <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-stone-200 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 font-bold shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm text-stone-900 truncate">
                  {clienteAtivo?.nome || nomeInput.trim() || `Mesa ${mesaInput}`}
                </p>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                  Mesa {parseInt(mesaInput, 10) < 10 ? `0${parseInt(mesaInput, 10)}` : mesaInput}
                </span>
              </div>
              <p className="text-xs text-stone-500 font-mono truncate">
                {telefoneInput ? formatPhoneDisplay(telefoneInput) : 'Atendimento sem WhatsApp'}
                {clienteAtivo && ` • ${obterVisitasReais(clienteAtivo)} ${obterVisitasReais(clienteAtivo) === 1 ? 'visita' : 'visitas'} no histórico`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTrocarCliente}
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            Trocar Cliente
          </button>
        </div>

        {/* STATUS DO ÚLTIMO PEDIDO ENVIADO PARA A COZINHA */}
        {ultimoPedidoEnviado && (
          <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-amber-500 shadow-lg animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-1.5 uppercase">
                <ChefHat className="w-4 h-4 text-amber-600" /> Acompanhe seu Pedido na Cozinha
              </span>
              <span className="text-xs font-mono font-bold text-stone-400">
                #{ultimoPedidoEnviado.id.slice(-5)}
              </span>
            </div>

            {/* Linha do tempo de status */}
            <div className="grid grid-cols-3 gap-2 text-center py-1">
              <div className={`p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all ${
                ultimoPedidoEnviado.status === 'pendente' 
                  ? 'bg-rose-500 text-white font-black shadow-md animate-pulse' 
                  : 'bg-stone-100 text-stone-400'
              }`}>
                <AlertCircle className="w-5 h-5 mb-1" />
                <span className="text-xs leading-tight">Recebido na Cozinha</span>
              </div>

              <div className={`p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all ${
                ultimoPedidoEnviado.status === 'preparando' 
                  ? 'bg-amber-500 text-white font-black shadow-md animate-pulse' 
                  : ultimoPedidoEnviado.status === 'pronto' || ultimoPedidoEnviado.status === 'entregue'
                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                  : 'bg-stone-100 text-stone-400'
              }`}>
                <ChefHat className="w-5 h-5 mb-1" />
                <span className="text-xs leading-tight">Em Preparo</span>
              </div>

              <div className={`p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all ${
                ultimoPedidoEnviado.status === 'pronto' || ultimoPedidoEnviado.status === 'entregue'
                  ? 'bg-emerald-600 text-white font-black shadow-md' 
                  : 'bg-stone-100 text-stone-400'
              }`}>
                <CheckCircle2 className="w-5 h-5 mb-1" />
                <span className="text-xs leading-tight">
                  {ultimoPedidoEnviado.status === 'entregue' ? 'Entregue!' : 'Pronto p/ Servir!'}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600 text-center mt-3 font-medium">
              {ultimoPedidoEnviado.status === 'pendente' && 'A cozinha foi notificada com alerta sonoro e logo começará a preparar seu pedido.'}
              {ultimoPedidoEnviado.status === 'preparando' && 'Seus itens estão na chapa e no balcão de preparo com todo carinho!'}
              {ultimoPedidoEnviado.status === 'pronto' && 'Seu pedido está pronto! O garçom está levando até a sua mesa.'}
              {ultimoPedidoEnviado.status === 'entregue' && 'Bom apetite! Se desejar algo mais, basta pedir novamente aqui.'}
            </p>
          </div>
        )}

        {/* Campo de Busca de Produtos */}
        <div className="relative">
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar cafés, pães, salgados, doces..."
            className="w-full pl-11 pr-10 py-3.5 bg-white border border-stone-200 rounded-2xl text-base sm:text-sm font-medium focus:border-amber-600 outline-none shadow-xs touch-manipulation"
          />
          <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-600 active:scale-90 transition-transform cursor-pointer touch-manipulation"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categorias (Abas Horizontais com Toque Otimizado) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none touch-manipulation">
          <button
            type="button"
            onClick={() => setCategoriaAtiva('todos')}
            className={`h-11 px-4 sm:px-5 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer touch-manipulation flex items-center gap-1.5 active:scale-95 select-none ${
              categoriaAtiva === 'todos'
                ? 'bg-amber-800 text-white shadow-md shadow-amber-900/20'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            Todos ({produtos.filter(p => p.ativo !== false).length})
          </button>
          {categorias.map(cat => {
            const count = produtos.filter(p => p.ativo !== false && p.categoria_id === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoriaAtiva(cat.id)}
                className={`h-11 px-4 sm:px-5 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer touch-manipulation flex items-center gap-1.5 active:scale-95 select-none ${
                  categoriaAtiva === cat.id
                    ? 'bg-amber-800 text-white shadow-md shadow-amber-900/20'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <span>{cat.nome}</span>
                {count > 0 && <span className="opacity-75 text-xs">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Lista de Produtos do Cardápio - Otimizada para Mobile e Toque */}
        {produtosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-stone-200 p-6">
            <Coffee className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-stone-700">Nenhum item encontrado</p>
            <p className="text-xs text-stone-500 mt-1">
              Tente buscar por outro nome ou escolha outra categoria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {produtosFiltrados.map(produto => {
              const categoria = categorias.find(c => c.id === produto.categoria_id);
              const qtdNoCarrinho = carrinho
                .filter(i => i.produto_id === produto.id)
                .reduce((sum, i) => sum + i.quantidade, 0);

              const estaNoCarrinho = qtdNoCarrinho > 0;

              return (
                <div 
                  key={produto.id} 
                  className={`bg-white p-4 sm:p-5 rounded-3xl border shadow-xs flex flex-col justify-between transition-all touch-manipulation group ${
                    estaNoCarrinho
                      ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/15'
                      : 'border-stone-200 hover:border-amber-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200/60">
                        {categoria?.nome || 'Geral'}
                      </span>
                      {estaNoCarrinho && (
                        <span className="text-[11px] font-black text-white bg-amber-600 px-2.5 py-0.5 rounded-full shadow-xs animate-fadeIn flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                          <span>{qtdNoCarrinho} no pedido</span>
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-base sm:text-lg text-stone-900 leading-snug">
                      {produto.nome}
                    </h3>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <span className="text-xl sm:text-2xl font-black text-stone-900 font-mono tracking-tight shrink-0">
                      R$ {produto.preco.toFixed(2)}
                    </span>

                    {/* Botões de Ação com Área de Toque Generosa (Mobile Touch Targets) */}
                    {!estaNoCarrinho ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setItemParaObservacao({ produto, observacao: '' })}
                          className="h-11 px-3 sm:px-3.5 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 text-xs font-bold rounded-2xl transition-all cursor-pointer touch-manipulation flex items-center justify-center gap-1"
                          title="Adicionar observação (ex: sem açúcar)"
                        >
                          <span>Obs</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdicionarItem(produto)}
                          className="h-11 px-4 sm:px-5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-95 text-white text-xs sm:text-sm font-black rounded-2xl shadow-md shadow-amber-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span>Pedir</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => setItemParaObservacao({ produto, observacao: '' })}
                          className="h-11 px-2.5 sm:px-3 bg-amber-100/70 hover:bg-amber-200 active:scale-95 text-amber-900 text-xs font-bold rounded-2xl transition-all cursor-pointer touch-manipulation flex items-center justify-center gap-1"
                          title="Adicionar ou alterar observação"
                        >
                          <span>Obs</span>
                        </button>

                        {/* Stepper de Toque Rápido no Próprio Card */}
                        <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200 shadow-2xs touch-manipulation">
                          <button
                            type="button"
                            onClick={() => handleRemoverItemCard(produto.id)}
                            className="w-9 h-9 rounded-xl bg-white hover:bg-rose-50 text-stone-700 hover:text-rose-600 active:scale-90 flex items-center justify-center transition-all cursor-pointer touch-manipulation shadow-2xs"
                            title="Remover 1 unidade"
                          >
                            <Minus className="w-4 h-4 stroke-[2.5]" />
                          </button>
                          <span className="w-7 sm:w-8 text-center font-black text-sm font-mono text-stone-900 select-none">
                            {qtdNoCarrinho}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdicionarItem(produto)}
                            className="w-9 h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-white active:scale-90 flex items-center justify-center transition-all cursor-pointer touch-manipulation shadow-xs"
                            title="Adicionar mais 1 unidade"
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Rodapé Oficial Sovinski Software & Automation no modo Standalone */}
      {isStandalone && <Footer className="mt-12 pb-24 sm:pb-8" />}

      {/* Modal de Observação para o Item */}
      {itemParaObservacao && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-5 animate-scaleUp">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              Observação para: {itemParaObservacao.produto.nome}
            </h3>
            <p className="text-xs text-stone-500 mb-3">
              Como você gostaria que a cozinha preparasse esse item?
            </p>
            <input
              type="text"
              autoFocus
              value={itemParaObservacao.observacao}
              onChange={e => setItemParaObservacao({ ...itemParaObservacao, observacao: e.target.value })}
              placeholder="Ex: Sem açúcar, pão bem passado, leite gelado..."
              className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:border-amber-600 outline-none mb-4"
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
                className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-bold rounded-xl text-xs hover:bg-stone-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleAdicionarItem(itemParaObservacao.produto, itemParaObservacao.observacao)}
                className="flex-1 py-2.5 bg-amber-600 text-white font-bold rounded-xl text-xs hover:bg-amber-700 transition-colors"
              >
                Adicionar com Obs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra Fixa Flutuante Inferior do Carrinho */}
      {totalItensCarrinho > 0 && (
        <div className="fixed bottom-4 inset-x-4 max-w-3xl mx-auto z-40 animate-slideUp">
          <button
            type="button"
            onClick={() => setModalCarrinhoAberto(true)}
            className="w-full bg-stone-900 hover:bg-black text-white p-4 sm:p-4.5 rounded-3xl shadow-2xl flex items-center justify-between border-2 border-amber-500 transition-all active:scale-[0.98] cursor-pointer touch-manipulation min-h-[64px]"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-stone-900 font-black flex items-center justify-center text-sm shadow-md shrink-0">
                {totalItensCarrinho}
              </div>
              <div className="text-left">
                <p className="text-xs text-stone-300 font-medium">
                  Comanda • Mesa {parseInt(mesaInput, 10) < 10 ? `0${parseInt(mesaInput, 10)}` : mesaInput}
                </p>
                <p className="text-sm sm:text-base font-bold">Ver Pedido / Enviar para a Cozinha</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xl font-black font-mono text-amber-400">
                R$ {totalCarrinho.toFixed(2)}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Drawer / Modal de Revisão do Pedido */}
      {modalCarrinhoAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-slideUp">
            
            {/* Header do Carrinho */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base sm:text-lg font-black">
                    Comanda • Mesa {parseInt(mesaInput, 10) < 10 ? `0${parseInt(mesaInput, 10)}` : mesaInput}
                  </h3>
                  <p className="text-xs text-amber-200">
                    Cliente: {nomeInput.trim() || `Mesa ${mesaInput}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCarrinhoAberto(false)}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 active:scale-90 flex items-center justify-center transition-all cursor-pointer touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de Itens */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              {carrinho.map(item => (
                <div key={item.id_temp} className="flex items-center justify-between p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-sm sm:text-base text-stone-900 leading-snug">{item.nome}</p>
                    {item.observacao && (
                      <p className="text-xs text-amber-700 font-semibold mt-0.5">
                        Obs: {item.observacao}
                      </p>
                    )}
                    <p className="text-xs text-stone-500 font-mono mt-0.5">
                      R$ {item.preco_unitario.toFixed(2)} un
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-white border border-stone-300 rounded-2xl p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleAlterarQuantidade(item.id_temp, -1)}
                        className="w-9 h-9 rounded-xl hover:bg-stone-100 text-stone-700 active:scale-90 flex items-center justify-center transition-all cursor-pointer touch-manipulation"
                      >
                        <Minus className="w-4 h-4 stroke-[2.5]" />
                      </button>
                      <span className="w-8 text-center font-black text-sm font-mono select-none">
                        {item.quantidade}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAlterarQuantidade(item.id_temp, 1)}
                        className="w-9 h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-white active:scale-90 flex items-center justify-center transition-all cursor-pointer touch-manipulation shadow-xs"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>

                    <span className="w-18 text-right font-black text-sm font-mono text-stone-900">
                      R$ {item.subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Observações Gerais */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Observações para a Cozinha:
                </label>
                <textarea
                  rows={2}
                  value={observacoesGerais}
                  onChange={e => setObservacoesGerais(e.target.value)}
                  placeholder="Ex: Trazer tudo junto, caprichar no gelo..."
                  className="w-full px-3.5 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:bg-white focus:border-amber-600 outline-none resize-none touch-manipulation"
                />
              </div>

              {/* Resumo da Identificação da Comanda */}
              <div className="p-3.5 bg-stone-100 rounded-2xl border border-stone-200 text-xs space-y-1">
                <div className="flex justify-between font-bold text-stone-800">
                  <span>Mesa: {parseInt(mesaInput, 10) < 10 ? `0${parseInt(mesaInput, 10)}` : mesaInput}</span>
                  <span>{telefoneInput ? formatPhoneDisplay(telefoneInput) : 'Sem WhatsApp'}</span>
                </div>
                <p className="text-stone-600 truncate">
                  Identificação: <b>{nomeInput.trim() || `Mesa ${mesaInput}`}</b>
                </p>
                {clienteAtivo && (
                  <p className="text-emerald-700 font-semibold">
                    ✓ Vinculado ao cadastro do cliente
                  </p>
                )}
              </div>
            </div>

            {/* Footer do Carrinho com CTA de Envio */}
            <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 space-y-3 shrink-0 pb-safe">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-stone-600">Total do Pedido:</span>
                <span className="text-2xl font-black font-mono text-stone-900">
                  R$ {totalCarrinho.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                disabled={enviandoPedido || carrinho.length === 0}
                onClick={handleEnviarPedidoParaCozinha}
                className="w-full h-14 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:bg-stone-300 text-white font-black text-base rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 touch-manipulation"
              >
                <Send className="w-5 h-5" />
                <span>
                  {enviandoPedido ? 'Enviando para a Cozinha...' : 'ENVIAR PEDIDO PARA A COZINHA'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
