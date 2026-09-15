import React, { useState, useEffect } from 'react';
import { LoyaltyProvider } from './context/LoyaltyContext';
import { Layout } from './components/Layout';
import { CaixaPage } from './pages/CaixaPage';
import { AdminDashboard } from './pages/AdminDashboard';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'caixa' | 'admin'>('caixa');

  // Suporte a atalhos de teclado de balcão (F1 para Caixa, F2 para Admin)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setCurrentTab('caixa');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setCurrentTab('admin');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <LoyaltyProvider>
      <Layout currentTab={currentTab} setCurrentTab={setCurrentTab}>
        {currentTab === 'caixa' ? <CaixaPage /> : <AdminDashboard />}
      </Layout>
    </LoyaltyProvider>
  );
};

export default App;
