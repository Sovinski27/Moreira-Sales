import React, { useState, useEffect } from 'react';
import { LoyaltyProvider } from './context/LoyaltyContext';
import { Layout, TabType } from './components/Layout';
import { CaixaPage } from './pages/CaixaPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { CozinhaPage } from './pages/CozinhaPage';
import { CardapioDigitalPage } from './pages/CardapioDigitalPage';
import { Footer } from './components/Footer';
import { isAdminSessionActive, logoutAdmin } from './services/adminAuth';

export const App: React.FC = () => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => isAdminSessionActive());

  // Observar eventos de autenticação
  useEffect(() => {
    const handleAuthChange = () => {
      setIsAdminAuthenticated(isAdminSessionActive());
    };
    window.addEventListener('admin_auth_changed', handleAuthChange);
    return () => window.removeEventListener('admin_auth_changed', handleAuthChange);
  }, []);
  // Detectar se a URL está sendo aberta em modo cliente de mesa (/cardapio, ?modo=cardapio, ?mesa=3 ou subdomínio cardapio.*)
  const isModoClienteDireto = () => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const host = window.location.hostname.toLowerCase();
    return (
      host.startsWith('cardapio.') ||
      path.includes('cardapio') ||
      params.get('modo') === 'cardapio' ||
      (params.has('mesa') && params.get('modo') !== 'caixa')
    );
  };

  const isModoCozinhaDireto = () => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('modo') === 'cozinha';
  };

  const [currentTab, setCurrentTab] = useState<TabType>(() => {
    if (isModoCozinhaDireto()) return 'cozinha';
    return 'caixa';
  });

  // Atalhos de teclado exclusivos do Sistema Operacional (F1: Caixa, F2: Admin, F3: Cozinha KDS)
  useEffect(() => {
    if (isModoClienteDireto()) return; // Clientes no cardápio não possuem atalhos operacionais

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setCurrentTab('caixa');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setCurrentTab('admin');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setCurrentTab('cozinha');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // =========================================================================
  // 1. LINK EXCLUSIVO E 100% ISOLADO DO CARDÁPIO DIGITAL (CLIENTES DAS MESAS)
  // =========================================================================
  // Nenhuma navegação operacional (caixa/cozinha/admin) é montada ou exposta.
  if (isModoClienteDireto()) {
    return (
      <LoyaltyProvider>
        <CardapioDigitalPage isStandalone />
      </LoyaltyProvider>
    );
  }

  // =========================================================================
  // 2. MONITOR STANDALONE DEDICADO DA COZINHA KDS (TELA DA COZINHA)
  // =========================================================================
  if (isModoCozinhaDireto() && currentTab === 'cozinha') {
    return (
      <LoyaltyProvider>
        <div className="min-h-screen flex flex-col justify-between bg-stone-100">
          <div className="flex-1">
            <CozinhaPage />
          </div>
          <Footer />
        </div>
      </LoyaltyProvider>
    );
  }

  // =========================================================================
  // 3. SISTEMA OPERACIONAL DA PANIFICADORA (CAIXA, COZINHA, PAINEL DO DONO)
  // =========================================================================
  return (
    <LoyaltyProvider>
      <Layout currentTab={currentTab} setCurrentTab={setCurrentTab}>
        {currentTab === 'caixa' && <CaixaPage />}
        {currentTab === 'cozinha' && <CozinhaPage />}
        {currentTab === 'admin' && (
          isAdminAuthenticated ? (
            <AdminDashboard 
              onLogout={() => {
                logoutAdmin();
                setIsAdminAuthenticated(false);
                setCurrentTab('caixa');
              }} 
            />
          ) : (
            <AdminLoginPage
              onSuccess={() => {
                setIsAdminAuthenticated(true);
              }}
              onCancel={() => {
                setCurrentTab('caixa');
              }}
            />
          )
        )}
      </Layout>
    </LoyaltyProvider>
  );
};

export default App;
