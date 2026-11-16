import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  Clock, 
  CheckCircle2, 
  ChefHat, 
  AlertCircle, 
  Check, 
  Utensils, 
  Flame, 
  RotateCcw,
  Sparkles,
  QrCode,
  GripVertical,
  ArrowRight,
  Archive,
  RefreshCw,
  Globe,
  MapPin,
  ShoppingBag
} from 'lucide-react';
import { PedidoCozinha, PedidoCozinhaStatus } from '../types';
import { 
  fetchPedidosCozinha, 
  updateStatusPedidoCozinha, 
  silenciarAlertaPedido, 
  silenciarTodosAlertas 
} from '../services/db';
import { kitchenAlarm } from '../services/soundAlarm';
import { QrCodeMesasModal } from '../components/QrCodeMesasModal';

export const CozinhaPage: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoCozinha[]>([]);
  const [somHabilitado, setSomHabilitado] = useState(true);
  const [isAudioDesbloqueado, setIsAudioDesbloqueado] = useState(false);
  const [modalQrCodeAberto, setModalQrCodeAberto] = useState(false);
  const [horaAtual, setHoraAtual] = useState(Date.now());
  const [mostrarEntregues, setMostrarEntregues] = useState(false);

  // Estados de Drag and Drop (Arrastar com o mouse)
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<PedidoCozinhaStatus | null>(null);

  // Pedidos pendentes com alarme sonoro ativo
  const pedidosComAlerta = pedidos.filter(p => p.status === 'pendente' && !p.alerta_silenciado);
  const temAlertaAtivo = pedidosComAlerta.length > 0;

  // Carregar pedidos do banco de dados
  const carregarPedidos = async () => {
    try {
      const lista = await fetchPedidosCozinha();
      setPedidos(lista);
    } catch (e) {
      console.warn('Erro ao carregar pedidos da cozinha:', e);
    }
  };

  useEffect(() => {
    carregarPedidos();

    // Sincronização periódica em tempo real (2.5 segundos)
    const interval = setInterval(() => {
      carregarPedidos();
      setHoraAtual(Date.now());
    }, 2500);

    // Eventos de pedidos novos emitidos em tempo real pelo Cardápio ou Caixa
    const handleUpdate = () => carregarPedidos();
    window.addEventListener('pedidos_cozinha_atualizados', handleUpdate);
    window.addEventListener('novo_pedido_cozinha', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('pedidos_cozinha_atualizados', handleUpdate);
      window.removeEventListener('novo_pedido_cozinha', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Alarme sonoro contínuo enquanto houver pedido pendente não silenciado
  useEffect(() => {
    if (temAlertaAtivo && somHabilitado) {
      kitchenAlarm.startContinuousAlarm();
    } else {
      kitchenAlarm.stopAlarm();
    }

    return () => {
      kitchenAlarm.stopAlarm();
    };
  }, [temAlertaAtivo, somHabilitado]);

  // Ativar / Desbloquear som do navegador
  const handleAtivarSom = () => {
    kitchenAlarm.init();
    kitchenAlarm.playSingleAlertBeep();
    setIsAudioDesbloqueado(true);
    setSomHabilitado(true);
  };

  // Silenciar todos os alarmes
  const handleSilenciarTodosAlertas = async () => {
    kitchenAlarm.stopAlarm();
    await silenciarTodosAlertas();
    await carregarPedidos();
  };

  // Mover status do pedido (via arrastar ou via clique)
  const handleMudarStatus = async (id: string, novoStatus: PedidoCozinhaStatus) => {
    await updateStatusPedidoCozinha(id, novoStatus);
    await silenciarAlertaPedido(id);
    await carregarPedidos();
  };

  // -------------------------------------------------------------
  // LÓGICA DE DRAG AND DROP (ARRASTAR COM O MOUSE)
  // -------------------------------------------------------------
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedOrderId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedOrderId(null);
    setActiveDropZone(null);
  };

  const handleDragOver = (e: React.DragEvent, targetStatus: PedidoCozinhaStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropZone !== targetStatus) {
      setActiveDropZone(targetStatus);
    }
  };

  const handleDragLeave = () => {
    setActiveDropZone(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: PedidoCozinhaStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedOrderId;
    if (id) {
      await handleMudarStatus(id, targetStatus);
    }
    setDraggedOrderId(null);
    setActiveDropZone(null);
  };

  // Cálculo de tempo decorrido
  const calcularTempoDecorrido = (criadoEm: string) => {
    const min = Math.floor((horaAtual - new Date(criadoEm).getTime()) / 60000);
    if (min < 1) return 'Agora';
    if (min === 1) return 'Há 1 min';
    return `Há ${min} min`;
  };

  // Filtragem dos pedidos para as 3 colunas Kanban
  const pedidosPendentes = pedidos.filter(p => p.status === 'pendente');
  const pedidosEmPreparo = pedidos.filter(p => p.status === 'preparando');
  const pedidosProntos = pedidos.filter(p => p.status === 'pronto');
  const pedidosEntregues = pedidos.filter(p => p.status === 'entregue');

  // Renderizador de cada card de pedido
  const renderCardPedido = (pedido: PedidoCozinha, colunaStatus: PedidoCozinhaStatus) => {
    const isSendoArrastado = draggedOrderId === pedido.id;
    const temAlerta = pedido.status === 'pendente' && !pedido.alerta_silenciado;

    return (
      <div
        key={pedido.id}
        draggable
        onDragStart={(e) => handleDragStart(e, pedido.id)}
        onDragEnd={handleDragEnd}
        className={`bg-white rounded-2xl p-4 border transition-all duration-200 shadow-xs cursor-grab active:cursor-grabbing select-none ${
          isSendoArrastado ? 'opacity-40 scale-95 border-amber-400' : 'hover:shadow-md'
        } ${
          temAlerta 
            ? 'border-2 border-rose-500 shadow-lg shadow-rose-200/50 ring-2 ring-rose-400/30' 
            : 'border-stone-200/90'
        }`}
      >
        {/* Cabeçalho do Card */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {pedido.mesa_numero === 99 || pedido.online_detalhes ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1 shadow-xs">
                  <Globe className="w-3 h-3" />
                  Online #99
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-lg ${pedido.online_detalhes?.tipo === 'entrega' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'}`}>
                  {pedido.online_detalhes?.tipo === 'entrega' ? '🛵 Entrega' : '🛍️ Retirada'}
                </span>
              </div>
            ) : (
              <span className="text-base font-black text-stone-900 tracking-tight">
                Mesa {pedido.mesa_numero < 10 ? `0${pedido.mesa_numero}` : pedido.mesa_numero}
              </span>
            )}
            {temAlerta && (
              <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-full uppercase animate-pulse">
                Novo
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-stone-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{calcularTempoDecorrido(pedido.criado_em)}</span>
          </div>
        </div>

        {/* Cliente e Garçom Responsável */}
        <div className="text-xs text-stone-600 mb-2 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-semibold">
              {pedido.cliente_nome || `Mesa ${pedido.mesa_numero}`}
            </span>
            {pedido.cliente_telefone && (
              <span className="text-[10px] text-stone-400 font-mono">
                {pedido.cliente_telefone}
              </span>
            )}
          </div>
          {(pedido.garcom_nome || pedido.itens?.[0]?.garcom_nome) && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black">
              <span>👤 Garçom: {pedido.garcom_nome || pedido.itens?.[0]?.garcom_nome}</span>
            </div>
          )}
        </div>

        {/* Endereço de Entrega (se for pedido online com entrega) */}
        {pedido.online_detalhes?.tipo === 'entrega' && pedido.online_detalhes.endereco && (
          <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-2 text-[11px] text-blue-900 mb-2.5">
            <p className="font-bold flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
              <span>{pedido.online_detalhes.endereco.rua}, {pedido.online_detalhes.endereco.numero} - {pedido.online_detalhes.endereco.bairro}</span>
            </p>
            {pedido.online_detalhes.endereco.complemento && (
              <p className="text-[10px] text-blue-700 ml-4 font-medium">Compl: {pedido.online_detalhes.endereco.complemento}</p>
            )}
            {pedido.online_detalhes.endereco.ponto_referencia && (
              <p className="text-[10px] text-blue-700 ml-4 font-medium">Ref: {pedido.online_detalhes.endereco.ponto_referencia}</p>
            )}
          </div>
        )}

        {/* Botão de Silenciar Som individual do pedido */}
        {temAlerta && (
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              await silenciarAlertaPedido(pedido.id);
              await carregarPedidos();
            }}
            className="w-full mb-3 py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <BellOff className="w-3.5 h-3.5" />
            <span>Silenciar Alerta Deste Pedido</span>
          </button>
        )}

        {/* Lista de Itens do Pedido */}
        <div className="space-y-1.5 border-t border-b border-stone-100 py-2.5 my-2 text-xs">
          {pedido.itens.map((item, idx) => (
            <div key={idx} className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-1.5 min-w-0">
                <span className="w-5 h-5 rounded-md bg-stone-100 text-stone-900 font-bold text-[11px] flex items-center justify-center shrink-0">
                  {item.quantidade}x
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-stone-800 leading-tight">
                    {item.nome}
                  </p>
                  {item.observacao && (
                    <p className="text-[11px] text-amber-800 font-medium bg-amber-50 rounded px-1.5 py-0.5 mt-0.5 inline-block">
                      Obs: {item.observacao}
                    </p>
                  )}
                </div>
              </div>
              <span className="font-mono text-[11px] text-stone-400 shrink-0">
                R$ {item.subtotal.toFixed(2)}
              </span>
            </div>
          ))}

          {pedido.observacoes && (
            <div className="bg-amber-50/80 rounded-lg p-2 text-[11px] text-amber-900 mt-1">
              <b>Obs Geral:</b> {pedido.observacoes}
            </div>
          )}
        </div>

        {/* Rodapé do Card e Ações Rápidas de Transição */}
        <div className="pt-1 flex items-center justify-between gap-2">
          <div className="text-[11px] font-bold text-stone-500">
            Total: <span className="font-mono font-black text-stone-900">R$ {pedido.total.toFixed(2)}</span>
          </div>

          {/* Botões rápidos complementares ao Drag & Drop */}
          {colunaStatus === 'pendente' && (
            <button
              type="button"
              onClick={() => handleMudarStatus(pedido.id, 'preparando')}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
              title="Mover para Em Preparo (ou arraste para a coluna)"
            >
              <span>Preparar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {colunaStatus === 'preparando' && (
            <button
              type="button"
              onClick={() => handleMudarStatus(pedido.id, 'pronto')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
              title="Marcar como Pronto (ou arraste para a coluna)"
            >
              <span>Pronto</span>
              <Check className="w-3.5 h-3.5" />
            </button>
          )}

          {colunaStatus === 'pronto' && (
            <button
              type="button"
              onClick={() => handleMudarStatus(pedido.id, 'entregue')}
              className="px-3 py-1.5 bg-stone-800 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
              title="Finalizar e marcar como entregue"
            >
              <span>Entregar</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dica de arrastar */}
        <div className="mt-2 text-[10px] text-stone-300 font-medium text-center flex items-center justify-center gap-1">
          <GripVertical className="w-3 h-3 text-stone-300" />
          <span>Arraste com o mouse para mover de coluna</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* BANNER DE ALERTA VERMELHO PISCANTE QUANDO CHEGA NOVO PEDIDO */}
      {temAlertaAtivo && (
        <div className="bg-rose-600 text-white p-4 rounded-3xl shadow-xl animate-pulse flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-rose-500">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 animate-bounce">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight uppercase">
                🚨 NOVO PEDIDO RECEBIDO NA COZINHA!
              </h2>
              <p className="text-xs text-rose-100">
                {pedidosComAlerta.length} {pedidosComAlerta.length === 1 ? 'pedido aguarda' : 'pedidos aguardam'} início de preparo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSilenciarTodosAlertas}
            className="w-full sm:w-auto px-5 py-3 bg-white text-rose-700 hover:bg-rose-50 font-black rounded-2xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 text-sm border border-rose-300 cursor-pointer shrink-0"
          >
            <BellOff className="w-5 h-5 animate-pulse" />
            <span>PARAR ALARME / CIENTE</span>
          </button>
        </div>
      )}

      {/* CABEÇALHO DO KDS - CÓPIA EXATA DO PRINT ENVIADO PELO USUÁRIO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
        {/* Título com Ícone de Chapéu de Chef */}
        <div className="flex items-center gap-2.5">
          <ChefHat className="w-6 h-6 text-amber-700 shrink-0" strokeWidth={2.2} />
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            Sistema KDS – Cozinha
          </h1>
        </div>

        {/* Botão de Controle de Som (Ativar Som / Som Ativo) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!isAudioDesbloqueado) {
                handleAtivarSom();
              } else {
                setSomHabilitado(!somHabilitado);
              }
            }}
            className={`px-3.5 py-2 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              somHabilitado && isAudioDesbloqueado
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-[#FCE8E6] text-[#D93025] hover:bg-[#FAD2CF] border border-rose-200/80 shadow-xs'
            }`}
            title="Clique para habilitar os alertas sonoros da cozinha"
          >
            {somHabilitado && isAudioDesbloqueado ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-600" />
                <span>Som Ativo</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-[#D93025]" />
                <span>Ativar Som</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setModalQrCodeAberto(true)}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-2xl border border-stone-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Imprimir ou visualizar QR Code das mesas"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">QR Mesas</span>
          </button>

          <button
            type="button"
            onClick={() => setMostrarEntregues(!mostrarEntregues)}
            className={`px-3.5 py-2 text-xs font-bold rounded-2xl border transition-colors flex items-center gap-1.5 cursor-pointer ${
              mostrarEntregues
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
            title="Ver histórico de pedidos finalizados"
          >
            <Archive className="w-4 h-4" />
            <span className="hidden sm:inline">Entregues ({pedidosEntregues.length})</span>
          </button>
        </div>
      </div>

      {/* GRADE KANBAN COM AS 3 COLUNAS DO PRINT: PENDENTES, EM PREPARO E PRONTOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 items-start">
        
        {/* ======================================================== */}
        {/* COLUNA 1: PENDENTES (Ponto Vermelho)                      */}
        {/* ======================================================== */}
        <div 
          onDragOver={(e) => handleDragOver(e, 'pendente')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'pendente')}
          className={`space-y-3 p-2.5 rounded-3xl transition-colors min-h-[500px] ${
            activeDropZone === 'pendente' 
              ? 'bg-rose-50/60 ring-2 ring-rose-400 border-2 border-dashed border-rose-300' 
              : 'bg-[#F9F9FB] border border-stone-200/60'
          }`}
        >
          {/* Header da Coluna - Conforme o print com ponto vermelho */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-xs" />
              <h2 className="text-sm font-bold text-stone-800">
                Pendentes ({pedidosPendentes.length})
              </h2>
            </div>
            {pedidosPendentes.length > 0 && (
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                {pedidosPendentes.length}
              </span>
            )}
          </div>

          {/* Cards da Coluna Pendentes */}
          <div className="space-y-3">
            {pedidosPendentes.length === 0 ? (
              <div className="text-center py-12 px-4 text-stone-400 bg-white/50 rounded-2xl border border-dashed border-stone-200">
                <Utensils className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold">Nenhum pedido pendente</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Novos pedidos do QR Code ou Caixa caem aqui automaticamente.
                </p>
              </div>
            ) : (
              pedidosPendentes.map(p => renderCardPedido(p, 'pendente'))
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* COLUNA 2: EM PREPARO (Ponto Laranja / Âmbar)             */}
        {/* ======================================================== */}
        <div 
          onDragOver={(e) => handleDragOver(e, 'preparando')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'preparando')}
          className={`space-y-3 p-2.5 rounded-3xl transition-colors min-h-[500px] ${
            activeDropZone === 'preparando' 
              ? 'bg-amber-50/60 ring-2 ring-amber-400 border-2 border-dashed border-amber-300' 
              : 'bg-[#F9F9FB] border border-stone-200/60'
          }`}
        >
          {/* Header da Coluna - Conforme o print com ponto laranja */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-xs" />
              <h2 className="text-sm font-bold text-stone-800">
                Em Preparo ({pedidosEmPreparo.length})
              </h2>
            </div>
            {pedidosEmPreparo.length > 0 && (
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {pedidosEmPreparo.length}
              </span>
            )}
          </div>

          {/* Cards da Coluna Em Preparo */}
          <div className="space-y-3">
            {pedidosEmPreparo.length === 0 ? (
              <div className="text-center py-12 px-4 text-stone-400 bg-white/50 rounded-2xl border border-dashed border-stone-200">
                <Flame className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-500" />
                <p className="text-xs font-semibold">Nenhum pedido em preparo</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Arraste um pedido da coluna Pendentes para cá para iniciar o preparo.
                </p>
              </div>
            ) : (
              pedidosEmPreparo.map(p => renderCardPedido(p, 'preparando'))
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* COLUNA 3: PRONTOS (Ponto Verde)                          */}
        {/* ======================================================== */}
        <div 
          onDragOver={(e) => handleDragOver(e, 'pronto')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'pronto')}
          className={`space-y-3 p-2.5 rounded-3xl transition-colors min-h-[500px] ${
            activeDropZone === 'pronto' 
              ? 'bg-emerald-50/60 ring-2 ring-emerald-400 border-2 border-dashed border-emerald-300' 
              : 'bg-[#F9F9FB] border border-stone-200/60'
          }`}
        >
          {/* Header da Coluna - Conforme o print com ponto verde */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs" />
              <h2 className="text-sm font-bold text-stone-800">
                Prontos ({pedidosProntos.length})
              </h2>
            </div>
            {pedidosProntos.length > 0 && (
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {pedidosProntos.length}
              </span>
            )}
          </div>

          {/* Cards da Coluna Prontos */}
          <div className="space-y-3">
            {pedidosProntos.length === 0 ? (
              <div className="text-center py-12 px-4 text-stone-400 bg-white/50 rounded-2xl border border-dashed border-stone-200">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-500" />
                <p className="text-xs font-semibold">Nenhum pedido pronto no momento</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Arraste os pedidos finalizados para cá para notificar a entrega.
                </p>
              </div>
            ) : (
              pedidosProntos.map(p => renderCardPedido(p, 'pronto'))
            )}
          </div>
        </div>

      </div>

      {/* MODAL / SEÇÃO DE PEDIDOS ENTREGUES (HISTÓRICO) */}
      {mostrarEntregues && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm mt-6 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Archive className="w-5 h-5 text-stone-500" />
              Histórico de Pedidos Entregues ({pedidosEntregues.length})
            </h3>
            <button
              type="button"
              onClick={() => setMostrarEntregues(false)}
              className="text-xs font-bold text-stone-500 hover:text-stone-800"
            >
              Fechar
            </button>
          </div>

          {pedidosEntregues.length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-6">Nenhum pedido entregue registrado hoje.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-80 overflow-y-auto">
              {pedidosEntregues.map(p => (
                <div key={p.id} className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
                  <div className="flex items-center justify-between font-bold text-stone-800 mb-1">
                    <span>Mesa {p.mesa_numero < 10 ? `0${p.mesa_numero}` : p.mesa_numero}</span>
                    <span className="text-emerald-700 font-mono">R$ {p.total.toFixed(2)}</span>
                  </div>
                  <p className="text-stone-500 truncate mb-1.5">{p.cliente_nome}</p>
                  <p className="text-[11px] text-stone-400">
                    {p.itens.map(i => `${i.quantidade}x ${i.nome}`).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal para Visualizar / Imprimir QR Codes das Mesas */}
      <QrCodeMesasModal
        isOpen={modalQrCodeAberto}
        onClose={() => setModalQrCodeAberto(false)}
        totalMesas={20}
      />
    </div>
  );
};
