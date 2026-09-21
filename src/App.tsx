import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LoyaltyProvider } from './context/LoyaltyContext';
import { Layout } from './components/Layout';
import { CaixaPage } from './pages/CaixaPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { CozinhaPage } from './pages/CozinhaPage';
import { CardapioPage } from './pages/CardapioPage';

// Componente para lidar com os atalhos de teclado (F1, F2, etc) globalmente
const KeyboardShortcuts: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        navigate('/caixa');
      } else if (e.key === 'F2') {
        e.preventDefault();
        navigate('/admin');
      } else if (e.key === 'F3') {
        e.preventDefault();
        navigate('/cozinha');
      } else if (e.key === 'F4') {
        e.preventDefault();
        navigate('/cardapio');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return null;
};

export const App: React.FC = () => {
  return (
    <LoyaltyProvider>
      <BrowserRouter>
        <KeyboardShortcuts />
        <Routes>
          {/* Rota pública do Cardápio Digital (sem navbar/menu interno da loja) */}
          <Route path="/cardapio" element={<CardapioPage />} />

          {/* Rotas administrativas e operacionais internas */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/caixa" replace />} />
            <Route path="caixa" element={<CaixaPage />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="cozinha" element={<CozinhaPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LoyaltyProvider>
  );
};

export default App;
