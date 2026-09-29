import React, { useState, useEffect } from 'react';
import { useLoyalty } from '../context/LoyaltyContext';
import { Store, BarChart3, ChefHat, QrCode, Database, Sparkles, Lock } from 'lucide-react';
import { fetchPedidosCozinha } from '../services/db';
import { PedidoCozinha } from '../types';
import { isAdminSessionActive } from '../services/adminAuth';
import { Footer } from './Footer';

export type TabType = 'caixa' | 'cozinha' | 'cardapio' | 'admin';

interface LayoutProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  setCurrentTab,
  children
}) => {
  const { isSupabaseOnline, metricas } = useLoyalty();
  const [pedidosCozinha, setPedidosCozinha] = useState<PedidoCozinha[]>([]);
  const [isAdminAuth, setIsAdminAuth] = useState<boolean>(() => isAdminSessionActive());

  useEffect(() => {
    const handleAuth = () => setIsAdminAuth(isAdminSessionActive());
    window.addEventListener('admin_auth_changed', handleAuth);
    return () => window.removeEventListener('admin_auth_changed', handleAuth);
  }, []);

  // Monitorar pedidos da cozinha para exibir notificação em tempo real no menu
  const carregarPedidos = async () => {
    try {
      const lista = await fetchPedidosCozinha();
      setPedidosCozinha(lista);
    } catch (e) {
      console.warn('Erro ao checar pedidos na barra superior:', e);
    }
  };

  useEffect(() => {
    carregarPedidos();
    const interval = setInterval(carregarPedidos, 3000);

    const handleAtualizacao = () => carregarPedidos();
    window.addEventListener('pedidos_cozinha_atualizados', handleAtualizacao);
    window.addEventListener('novo_pedido_cozinha', handleAtualizacao);
    window.addEventListener('storage', handleAtualizacao);

    return () => {
      clearInterval(interval);
      window.removeEventListener('pedidos_cozinha_atualizados', handleAtualizacao);
      window.removeEventListener('novo_pedido_cozinha', handleAtualizacao);
      window.removeEventListener('storage', handleAtualizacao);
    };
  }, []);

  const pedidosPendentes = pedidosCozinha.filter(p => p.status === 'pendente');
  const temAlarmePendente = pedidosPendentes.some(p => !p.alerta_silenciado);

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-stone-900 selection:bg-amber-200">
      {/* Header Superior - Perfeitamente alinhado com max-w-7xl */}
      <header className="bg-white border-b border-stone-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-3 md:py-0 md:h-20 gap-3 md:gap-4">
            
            {/* Logotipo e Identidade da Panificadora */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden shadow-sm shrink-0 bg-amber-500/10 border border-amber-600/20 flex items-center justify-center text-amber-700">
                <Store className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 leading-none">
                    Moreira Sales
                  </h1>
                  <span className="hidden sm:inline-block text-xs font-semibold text-stone-400">
                    · Sistema Integrado
                  </span>
                </div>
                <p className="text-xs text-stone-500 font-medium mt-1 truncate">
                  Panificadora & Confeitaria • Umuarama - PR
                </p>
              </div>
            </div>

            {/* Menu de Navegação e Status */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-between md:justify-end">
              {/* Barra de Navegação Segmentada */}
              <nav className="flex items-center bg-stone-100 p-1.5 rounded-2xl border border-stone-200/80 shrink-0 overflow-x-auto max-w-full">
                {/* 1. Frente de Caixa (F1) */}
                <button
                  type="button"
                  onClick={() => setCurrentTab('caixa')}
                  className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                    currentTab === 'caixa'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                  }`}
                  title="Frente de Caixa e Balcão (F1)"
                >
                  <Store className="w-4 h-4 shrink-0" />
                  <span>Caixa</span>
                </button>

                {/* 2. Cozinha KDS (F3) */}
                <button
                  type="button"
                  onClick={() => setCurrentTab('cozinha')}
                  className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer relative ${
                    currentTab === 'cozinha'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                  }`}
                  title="Monitor da Cozinha (F3)"
                >
                  <ChefHat className="w-4 h-4 shrink-0" />
                  <span>Cozinha</span>
                  {pedidosPendentes.length > 0 && (
                    <span className={`ml-1 px-1.5 py-0.2 text-[10px] font-black rounded-full ${
                      temAlarmePendente 
                        ? 'bg-white text-rose-700 animate-bounce' 
                        : 'bg-rose-500 text-white'
                    }`}>
                      {pedidosPendentes.length}
                    </span>
                  )}
                </button>

                {/* 3. Cardápio Digital & QR Mesas (F4) */}
                <button
                  type="button"
                  onClick={() => setCurrentTab('cardapio')}
                  className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                    currentTab === 'cardapio'
                      ? 'bg-stone-900 text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                  }`}
                  title="Cardápio Digital das Mesas (F4)"
                >
                  <QrCode className="w-4 h-4 shrink-0" />
                  <span>Cardápio</span>
                </button>

                {/* 4. Painel do Dono (Admin) (F2) */}
                <button
                  type="button"
                  onClick={() => setCurrentTab('admin')}
                  className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer relative ${
                    currentTab === 'admin'
                      ? 'bg-stone-900 text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                  }`}
                  title={isAdminAuth ? "Painel de Gestão do Dono (F2)" : "Acesso Restrito do Dono (Requer Senha)"}
                >
                  {isAdminAuth ? (
                    <BarChart3 className="w-4 h-4 shrink-0 text-amber-400" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  )}
                  <span>Painel Dono</span>
                  {metricas.clientesEmRisco > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-extrabold bg-rose-500 text-white rounded-full animate-pulse">
                      {metricas.clientesEmRisco}
                    </span>
                  )}
                </button>
              </nav>

              {/* Status de Nuvem */}
              <div className="hidden sm:flex items-center shrink-0">
                {isSupabaseOnline ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Nuvem Conectada</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200" title="Dados armazenados localmente com segurança">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Armazenamento Local</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Conteúdo Principal - 100% alinhado com o header através de max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Rodapé do Sistema */}
      <Footer />
    </div>
  );
};
