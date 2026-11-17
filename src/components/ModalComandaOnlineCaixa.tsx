import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShoppingBag, 
  MapPin, 
  CreditCard, 
  Banknote, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  User, 
  Phone, 
  Send, 
  Copy, 
  CheckCheck, 
  Plus, 
  ArrowRight, 
  Trash2, 
  RefreshCw,
  Store,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { PedidoOnline, MesaAberta } from '../types';
import { 
  fetchPedidosOnline, 
  updateStatusPedidoOnline, 
  deletePedidoOnline 
} from '../services/db';
import { getWhatsAppUrl, formatPhoneDisplay } from '../services/whatsapp';
import { ConfirmModal } from './ConfirmModal';

interface ModalComandaOnlineCaixaProps {
  isOpen: boolean;
  onClose: () => void;
  onCobrarPedido: (pedido: PedidoOnline) => void;
  onAbrirNovaComandaOnline: () => void;
  mesaOnlineAberta?: MesaAberta | null;
  onGerenciarMesaOnline?: (mesa: MesaAberta) => void;
}

export const ModalComandaOnlineCaixa: React.FC<ModalComandaOnlineCaixaProps> = ({
  isOpen,
  onClose,
  onCobrarPedido,
  onAbrirNovaComandaOnline,
  mesaOnlineAberta,
  onGerenciarMesaOnline
}) => {
  const [pedidos, setPedidos] = useState<PedidoOnline[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<'ativos' | 'todos' | 'entregues'>('ativos');
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [pedidoParaExcluirId, setPedidoParaExcluirId] = useState<string | null>(null);

  const carregarPedidos = async () => {
    try {
      const lista = await fetchPedidosOnline();
      setPedidos(lista);
    } catch (e) {
      console.warn('Erro ao carregar pedidos online:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      carregarPedidos();
      const interval = setInterval(carregarPedidos, 2500);
      window.addEventListener('pedidos_online_atualizados', carregarPedidos);
      window.addEventListener('storage', carregarPedidos);

      return () => {
        clearInterval(interval);
        window.removeEventListener('pedidos_online_atualizados', carregarPedidos);
        window.removeEventListener('storage', carregarPedidos);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const pedidosFiltrados = pedidos.filter(p => {
    if (filtroStatus === 'ativos') {
      return p.status !== 'entregue' && p.status !== 'pago' && p.status !== 'cancelado';
    }
    if (filtroStatus === 'entregues') {
      return p.status === 'entregue' || p.status === 'pago';
    }
    return true;
  });

  const pedidosAtivosCount = pedidos.filter(p => p.status !== 'entregue' && p.status !== 'pago' && p.status !== 'cancelado').length;
  const totalEmAberto = pedidos
    .filter(p => p.status !== 'entregue' && p.status !== 'pago' && p.status !== 'cancelado')
    .reduce((sum, p) => sum + (p.total || 0), 0);

  const handleCopiarLink = async () => {
    const url = typeof window !== 'undefined' 
      ? `${window.location.origin}?modo=online` 
      : 'https://panificadoramoreirasales.com.br?modo=online';

    try {
      await navigator.clipboard.writeText(url);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 3000);
    } catch (e) {
      console.warn('Erro ao copiar link:', e);
    }
  };

  const handleMudarStatus = async (id: string, novoStatus: PedidoOnline['status']) => {
    await updateStatusPedidoOnline(id, novoStatus);
    await carregarPedidos();
  };

  const handleExcluir = (id: string) => {
    setPedidoParaExcluirId(id);
  };

  const confirmarExclusao = async () => {
    if (!pedidoParaExcluirId) return;
    await deletePedidoOnline(pedidoParaExcluirId);
    setPedidoParaExcluirId(null);
    await carregarPedidos();
  };

  const getFormaPagtoBadge = (forma: string, troco?: string) => {
    switch (forma) {
      case 'pix':
        return <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[11px] flex items-center gap-1"><QrCode className="w-3 h-3" /> Pix</span>;
      case 'cartao_credito':
        return <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-[11px] flex items-center gap-1"><CreditCard className="w-3 h-3" /> Crédito</span>;
      case 'cartao_debito':
        return <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-[11px] flex items-center gap-1"><CreditCard className="w-3 h-3" /> Débito</span>;
      case 'dinheiro':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1"><Banknote className="w-3 h-3" /> Dinheiro {troco ? `(Troco p/ R$ ${troco})` : ''}</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-bold text-[11px]">{forma}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabeçalho */}
        <div className="bg-stone-900 text-white p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black">Comanda Online • Pedidos de Casa</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  {pedidosAtivosCount} {pedidosAtivosCount === 1 ? 'ativo' : 'ativos'}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Vários clientes podem acessar simultaneamente de casa e pedir retirada ou entrega.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleCopiarLink}
              className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-700"
              title="Copiar link para enviar aos clientes pelo WhatsApp ou Instagram"
            >
              {linkCopiado ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Link Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-400" />
                  <span>Copiar Link p/ Clientes</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros e Total */}
        <div className="bg-stone-50 border-b border-stone-200 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFiltroStatus('ativos')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filtroStatus === 'ativos'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              Aguardando Cobrança ({pedidosAtivosCount})
            </button>

            <button
              type="button"
              onClick={() => setFiltroStatus('entregues')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filtroStatus === 'entregues'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              Concluídos / Pagos
            </button>

            <button
              type="button"
              onClick={() => setFiltroStatus('todos')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filtroStatus === 'todos'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              Todos ({pedidos.length})
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto text-xs font-bold">
            <span className="text-stone-500">
              Total em Aberto: <strong className="text-stone-900 font-mono text-sm">R$ {totalEmAberto.toFixed(2)}</strong>
            </span>

            <button
              type="button"
              onClick={() => {
                onClose();
                onAbrirNovaComandaOnline();
              }}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Novo Pedido</span>
            </button>
          </div>
        </div>

        {/* Lista de Pedidos Online */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {mesaOnlineAberta && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase">
                    Comanda #99 Aberta
                  </span>
                  <span className="text-sm font-black text-stone-900">
                    {mesaOnlineAberta.cliente_nome || 'Cliente Online'}
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-1">
                  Total acumulado na comanda: <strong className="font-mono text-emerald-700">R$ {(mesaOnlineAberta.total || 0).toFixed(2)}</strong>
                </p>
              </div>
              {onGerenciarMesaOnline && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGerenciarMesaOnline(mesaOnlineAberta);
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                >
                  <span>Ver / Cobrar / Liberar #99</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {pedidosFiltrados.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-stone-200 rounded-3xl bg-stone-50/50">
              <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-2" />
              <h3 className="text-base font-bold text-stone-700">Nenhum pedido online encontrado</h3>
              <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                Os pedidos realizados por clientes de casa aparecerão aqui em tempo real para cobrança e envio.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleCopiarLink}
                  className="px-4 py-2 bg-white border border-stone-300 hover:border-amber-500 text-stone-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Link do Cardápio</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAbrirNovaComandaOnline();
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Simular Pedido de Casa</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {pedidosFiltrados.map(ped => {
                const isFinalizado = ped.status === 'entregue' || ped.status === 'pago';

                return (
                  <div
                    key={ped.id}
                    className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all ${
                      isFinalizado 
                        ? 'border-stone-200 opacity-75' 
                        : 'border-amber-300/80 shadow-xs ring-1 ring-amber-200/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-sm text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md">
                            #{ped.numero_pedido}
                          </span>
                          <h4 className="font-bold text-base text-stone-900">
                            {ped.cliente_nome}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            ped.tipo === 'entrega' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                          }`}>
                            {ped.tipo === 'entrega' ? '🛵 Entrega' : '🛍️ Retirada'}
                          </span>
                          {getFormaPagtoBadge(ped.forma_pagamento, ped.troco_para)}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-stone-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-stone-400" />
                            {new Date(ped.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-stone-400" />
                            {formatPhoneDisplay(ped.cliente_telefone)}
                          </span>
                          {ped.endereco && (
                            <span className="flex items-center gap-1 text-amber-900 font-semibold truncate max-w-xs">
                              <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                              {ped.endereco.rua}, {ped.endereco.numero} - {ped.endereco.bairro}
                              {ped.endereco.complemento ? ` (${ped.endereco.complemento})` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-[10px] font-bold uppercase text-stone-400 block">Total do Pedido</span>
                        <span className="text-lg font-black font-mono text-emerald-700">
                          R$ {ped.total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Itens */}
                    <div className="bg-stone-50/70 rounded-xl p-3 mb-3 text-xs space-y-1">
                      {ped.itens.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-stone-800">
                          <span>
                            <strong className="text-stone-900">{item.quantidade}x</strong> {item.nome}
                            {item.observacao && <span className="text-amber-800 italic ml-1">({item.observacao})</span>}
                          </span>
                          <span className="font-mono text-stone-600">R$ {item.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                      {ped.observacoes && (
                        <div className="pt-1.5 mt-1.5 border-t border-stone-200/60 text-[11px] text-amber-900 font-medium">
                          <strong>Observações:</strong> {ped.observacoes}
                        </div>
                      )}
                    </div>

                    {/* Barra de Ações Rápidas */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const url = getWhatsAppUrl(ped.cliente_telefone, `Olá, ${ped.cliente_nome}! Recebemos seu pedido #${ped.numero_pedido} na Panificadora Moreira Sales. Já estamos preparando com muito carinho!`);
                            window.open(url, '_blank');
                          }}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Falar com o cliente no WhatsApp"
                        >
                          <Send className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>

                        {!isFinalizado ? (
                          <button
                            type="button"
                            onClick={() => handleMudarStatus(ped.id, 'pago')}
                            className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Marcar Entregue / Pago
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMudarStatus(ped.id, 'pendente')}
                            className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Reabrir
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleExcluir(ped.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="Excluir pedido"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {!isFinalizado && (
                        <button
                          type="button"
                          onClick={() => {
                            onCobrarPedido(ped);
                            onClose();
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer ml-auto"
                        >
                          <span>Cobrar / Faturar no Caixa</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="bg-stone-100 border-t border-stone-200 p-3 sm:p-4 flex items-center justify-between text-xs text-stone-500">
          <span>Panificadora Moreira Sales • Umuarama - PR</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl font-bold cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>

      <ConfirmModal
        isOpen={!!pedidoParaExcluirId}
        title="Remover Pedido Online?"
        message="Deseja realmente remover este pedido online da lista?"
        confirmText="Sim, Remover"
        cancelText="Cancelar"
        isDestructive={true}
        onClose={() => setPedidoParaExcluirId(null)}
        onConfirm={confirmarExclusao}
      />
    </div>
  );
};
