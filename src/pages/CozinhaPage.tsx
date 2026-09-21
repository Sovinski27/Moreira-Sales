import React, { useEffect, useState, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Clock, ChefHat, ArrowRight, Bell, BellOff } from 'lucide-react';

interface ItemPedido {
  id: string;
  quantidade: number;
  produtos?: {
    nome: string;
  } | { nome: string }[] | null;
}

interface Pedido {
  id: string;
  origem: string;
  identificador_origem: string;
  status: string;
  criado_em: string;
  observacoes?: string | null;
  cliente_nome?: string | null;
  itens_pedido: ItemPedido[];
}

export const CozinhaPage: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [somHabilitado, setSomHabilitado] = useState(false);
  
  const previousPendentesRef = useRef<string[]>([]);
  const initialLoadRef = useRef(true);

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Nota A5
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // Nota A6
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error('Audio falhou', e);
    }
  };

  const fetchPedidos = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          origem,
          identificador_origem,
          status,
          observacoes,
          cliente_nome,
          criado_em,
          itens_pedido (
            id,
            quantidade,
            produtos (
              nome
            )
          )
        `)
        .in('status', ['Pendente', 'Em Preparo', 'Pronto'])
        .order('criado_em', { ascending: true });

      if (error) throw error;
      
      const novosPedidos = data || [];
      const pendentesAtuais = novosPedidos.filter(p => p.status === 'Pendente').map(p => p.id);
      
      // Checa se há um pedido novo
      if (!initialLoadRef.current) {
        const hasNew = pendentesAtuais.some(id => !previousPendentesRef.current.includes(id));
        if (hasNew && somHabilitado) {
          playNotificationSound();
        }
      }
      
      previousPendentesRef.current = pendentesAtuais;
      initialLoadRef.current = false;

      setPedidos(novosPedidos);
    } catch (e) {
      console.error('Erro ao buscar pedidos da cozinha:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 60000);

    let subscription: any;
    if (isSupabaseConfigured && supabase) {
      subscription = supabase
        .channel('cozinha-pedidos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
          fetchPedidos();
        })
        .subscribe();

      return () => {
        clearInterval(timer);
        if (subscription) supabase?.removeChannel(subscription);
      };
    }

    return () => clearInterval(timer);
  }, []);

  const updateStatus = async (id: string, novoStatus: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    
    // Optmistic update
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, status: novoStatus } : p).filter(p => p.status !== 'Entregue'));

    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: novoStatus })
        .eq('id', id);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        fetchPedidos(); // Revert on error
      }
    } catch (e) {
      console.error('Falha na atualização de status', e);
      fetchPedidos();
    }
  };

  const getElapsedTime = (isoString: string) => {
    if (!isoString) return '0 min';
    const diff = now - new Date(isoString).getTime();
    if (isNaN(diff) || diff < 0) return '0 min';
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min`;
  };

  const pendentes = pedidos.filter(p => p.status === 'Pendente');
  const emPreparo = pedidos.filter(p => p.status === 'Em Preparo');
  const prontos = pedidos.filter(p => p.status === 'Pronto');

  const renderCard = (pedido: Pedido, nextStatusText: string, nextStatus: string, bgClass: string, headerClass: string) => (
    <div key={pedido.id} className={`p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col ${bgClass}`}>
      <div className={`flex justify-between items-center pb-3 border-b mb-3 ${headerClass}`}>
        <div>
          <div className="font-bold text-lg">
            {pedido.origem}{pedido.identificador_origem ? `: ${pedido.identificador_origem}` : ''}
          </div>
          {pedido.cliente_nome && (
            <div className="text-xs font-semibold text-stone-600">
              Cliente: {pedido.cliente_nome}
            </div>
          )}
        </div>
        <div className="flex items-center text-sm font-semibold opacity-80">
          <Clock className="w-4 h-4 mr-1" />
          {getElapsedTime(pedido.criado_em)}
        </div>
      </div>
      
      <div className="flex-1">
        <ul className="space-y-2 mb-3">
          {pedido.itens_pedido?.map(item => {
            const pName = Array.isArray(item.produtos) ? item.produtos[0]?.nome : item.produtos?.nome;
            return (
              <li key={item.id} className="flex font-medium text-stone-800">
                <span className="w-8 shrink-0 text-stone-500 font-bold">{item.quantidade}x</span>
                <span>{pName || 'Produto'}</span>
              </li>
            );
          })}
        </ul>

        {pedido.observacoes && (
          <div className="bg-amber-100/70 border border-amber-200 text-amber-900 text-xs font-medium p-2.5 rounded-lg mb-4">
            <strong>Obs:</strong> {pedido.observacoes}
          </div>
        )}
      </div>

      <button
        onClick={() => updateStatus(pedido.id, nextStatus)}
        className="mt-auto w-full py-3 rounded-lg font-bold flex items-center justify-center transition-colors bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 shadow-sm"
      >
        {nextStatusText} <ArrowRight className="w-4 h-4 ml-2" />
      </button>
    </div>
  );

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center mb-6">
        <h2 className="text-2xl font-bold text-stone-800 flex items-center">
          <ChefHat className="w-6 h-6 mr-3 text-orange-500" />
          Sistema KDS - Cozinha
        </h2>
        
        <button 
          onClick={() => { 
            setSomHabilitado(!somHabilitado); 
            if (!somHabilitado) playNotificationSound(); 
          }}
          className={`ml-auto px-4 py-2 rounded-lg flex items-center font-bold text-sm transition-colors shadow-sm ${
            somHabilitado 
              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          {somHabilitado ? (
            <>
              <Bell className="w-4 h-4 mr-2" />
              Som Ativado
            </>
          ) : (
            <>
              <BellOff className="w-4 h-4 mr-2" />
              Ativar Som
            </>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center text-stone-500">Carregando pedidos...</div>
      ) : !isSupabaseConfigured ? (
        <div className="flex-1 flex justify-center items-center text-red-500">Supabase não configurado.</div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
          {/* Coluna Pendentes */}
          <div className="flex flex-col bg-stone-50 rounded-2xl p-4 overflow-hidden border border-stone-200">
            <h3 className="font-bold text-lg text-stone-700 mb-4 flex items-center">
              <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
              Pendentes ({pendentes.length})
            </h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {pendentes.map(p => renderCard(p, 'Preparar', 'Em Preparo', 'bg-red-50', 'border-red-200 text-red-900'))}
            </div>
          </div>

          {/* Coluna Em Preparo */}
          <div className="flex flex-col bg-stone-50 rounded-2xl p-4 overflow-hidden border border-stone-200">
            <h3 className="font-bold text-lg text-stone-700 mb-4 flex items-center">
              <span className="w-3 h-3 rounded-full bg-orange-400 mr-2"></span>
              Em Preparo ({emPreparo.length})
            </h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {emPreparo.map(p => renderCard(p, 'Finalizar', 'Pronto', 'bg-orange-50', 'border-orange-200 text-orange-900'))}
            </div>
          </div>

          {/* Coluna Prontos */}
          <div className="flex flex-col bg-stone-50 rounded-2xl p-4 overflow-hidden border border-stone-200">
            <h3 className="font-bold text-lg text-stone-700 mb-4 flex items-center">
              <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
              Prontos ({prontos.length})
            </h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {prontos.map(p => renderCard(p, 'Entregar', 'Entregue', 'bg-green-50', 'border-green-200 text-green-900'))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
