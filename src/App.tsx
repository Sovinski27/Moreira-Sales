import React, { useState, useEffect } from 'react';
import { LoyaltyProvider } from './context/LoyaltyContext';
import { Layout, TabType } from './components/Layout';
import { CaixaPage } from './pages/CaixaPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { CozinhaPage } from './pages/CozinhaPage';
import { CardapioDigitalPage } from './pages/CardapioDigitalPage';
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
  // Detectar se a URL está sendo aberta em modo cliente de mesa (/cardapio, ?modo=cardapio ou ?mesa=3)
  const isModoClienteDireto = () => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    return path.includes('cardapio') || params.get('modo') === 'cardapio' || (params.has('mesa') && params.get('modo') !== 'caixa');
  };

  const isModoCozinhaDireto = () => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('modo') === 'cozinha';
  };

  const [currentTab, setCurrentTab] = useState<TabType>(() => {
    if (isModoClienteDireto()) return 'cardapio';
    if (isModoCozinhaDireto()) return 'cozinha';
    return 'caixa';
  });

  // Atalhos de teclado (F1: Caixa, F2: Admin, F3: Cozinha KDS, F4: Cardápio Digital)
  useEffect(() => {
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
      } else if (e.key === 'F4') {
        e.preventDefault();
        setCurrentTab('cardapio');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Se o cliente acessou diretamente via QR Code na mesa (ex: no smartphone), renderizar tela limpa de cardápio
  if (isModoClienteDireto() && currentTab === 'cardapio') {
    return (
      <LoyaltyProvider>
        <CardapioDigitalPage onVoltarParaSistema={() => setCurrentTab('caixa')} />
      </LoyaltyProvider>
    );
  }

  // Se o monitor da cozinha foi aberto diretamente via URL ?modo=cozinha
  if (isModoCozinhaDireto() && currentTab === 'cozinha') {
    return (
      <LoyaltyProvider>
        <CozinhaPage />
      </LoyaltyProvider>
    );
  }

  return (
    <LoyaltyProvider>
      <Layout currentTab={currentTab} setCurrentTab={setCurrentTab}>
        {currentTab === 'caixa' && <CaixaPage />}
        {currentTab === 'cozinha' && <CozinhaPage />}
        {currentTab === 'cardapio' && (
          <CardapioDigitalPage onVoltarParaSistema={() => setCurrentTab('caixa')} />
        )}
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
