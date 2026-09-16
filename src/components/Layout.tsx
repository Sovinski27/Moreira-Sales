import React from 'react';
import { useLoyalty } from '../context/LoyaltyContext';
import { Store, BarChart3, RotateCcw, Database, Sparkles } from 'lucide-react';

interface LayoutProps {
  currentTab: 'caixa' | 'admin';
  setCurrentTab: (tab: 'caixa' | 'admin') => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  setCurrentTab,
  children
}) => {
  const { isSupabaseOnline, reiniciarDadosDemo, metricas } = useLoyalty();

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-stone-900 selection:bg-amber-200">
      {/* Header Superior */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between h-auto sm:h-20 py-3 sm:py-0 gap-3 sm:gap-0">
            
            {/* Logotipo e Identidade da Panificadora */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl overflow-hidden shadow-md shrink-0 bg-stone-50 border border-stone-100 flex items-center justify-center">
                <Store className="w-6 h-6 sm:w-7 sm:h-7 text-amber-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <h1 className="text-lg sm:text-2xl font-black tracking-tight text-stone-900 leading-none truncate">
                    Moreira Sales
                  </h1>
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 shrink-0">
                    CRM & Fidelidade
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-stone-500 font-medium hidden sm:block mt-0.5 truncate">
                  Panificadora & Confeitaria • Umuarama - PR
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
              {/* Navegação entre Caixa e Admin */}
              <nav className="flex items-center bg-stone-100 p-1 sm:p-1.5 rounded-2xl border border-stone-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentTab('caixa')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                    currentTab === 'caixa'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  <Store className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Frente de Caixa</span>
                  <span className="sm:hidden">Caixa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentTab('admin')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all relative ${
                    currentTab === 'admin'
                      ? 'bg-stone-900 text-white shadow-md shadow-stone-900/20'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Painel do Dono</span>
                  <span className="sm:hidden">Painel</span>
                  {metricas.clientesEmRisco > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] sm:text-[11px] font-extrabold bg-rose-500 text-white rounded-full animate-pulse">
                      {metricas.clientesEmRisco}
                    </span>
                  )}
                </button>
              </nav>

              {/* Status e Ações Auxiliares */}
              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                {isSupabaseOnline ? (
                  <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                    <Database className="w-3.5 h-3.5" />
                    <span>Supabase Online</span>
                  </div>
                ) : (
                  <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200" title="Dados salvos no navegador (LocalStorage)">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Modo Demonstração</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={reiniciarDadosDemo}
                  className="flex items-center justify-center text-stone-600 hover:text-stone-900 w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-xl hover:bg-stone-100 border border-stone-200 sm:border-transparent sm:hover:border-stone-200 transition-colors text-xs font-semibold shrink-0"
                  title="Restaurar dados de demonstração de Umuarama"
                  aria-label="Restaurar dados de demonstração"
                >
                  <RotateCcw className="w-4 h-4 text-stone-600" />
                  <span className="hidden lg:inline ml-1.5">Restaurar Demo</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Rodapé institucional */}
      <footer className="border-t border-stone-200 bg-white py-4 text-center text-xs text-stone-500">
        <p>
          Sistema de Fidelização e CRM para Panificadoras • Umuarama - PR • Foco em retenção sem fila no balcão
        </p>
      </footer>
    </div>
  );
};
