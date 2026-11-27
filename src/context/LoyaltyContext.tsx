import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Cliente, 
  Compra, 
  ConfiguracaoFidelidade, 
  ClienteResumoMensal, 
  NivelEngajamento, 
  MetricasGerais,
  UrgenciaChurn,
  ItemCarrinho
} from '../types';
import { 
  fetchClientes, 
  fetchCompras, 
  fetchConfiguracao, 
  createCliente as dbCreateCliente,
  registerCompra as dbRegisterCompra,
  saveConfiguracao as dbSaveConfiguracao,
  resetToDemoData as dbResetToDemoData,
  updateClienteContato as dbUpdateClienteContato,
  updateCliente as dbUpdateCliente
} from '../services/db';
import { dispararWebhookWhatsApp, buildWhatsAppMessage } from '../services/whatsapp';
import { isSupabaseConfigured } from '../services/supabase';
import { 
  calcularResumosMensais, 
  calcularClientesSumidos, 
  calcularMetricas, 
  avaliarCompra 
} from '../services/loyaltyEngine';

import { INITIAL_CONFIG } from '../services/seedData';

interface LoyaltyContextType {
  clientes: Cliente[];
  compras: Compra[];
  config: ConfiguracaoFidelidade;
  resumosMensais: ClienteResumoMensal[];
  clientesSumidos: ClienteResumoMensal[];
  metricas: MetricasGerais;
  loading: boolean;
  isSupabaseOnline: boolean;
  registrarNovaCompra: (clienteId: string, valor: number, detalhes?: string | null, carrinho?: ItemCarrinho[], forma_pagamento?: string) => Promise<{ compra: Compra; atingiuMetaAgora: boolean; totalMes: number; pontuou: boolean }>;
  cadastrarERegistrarCompra: (nome: string, whatsapp: string, valor: number, detalhesCompra?: string | null, data_nascimento?: string | null, email?: string | null, notas?: string | null, carrinho?: ItemCarrinho[], forma_pagamento?: string) => Promise<{ cliente: Cliente; compra: Compra; atingiuMetaAgora: boolean; totalMes: number; pontuou: boolean }>;
  salvarConfiguracoes: (novasConfigs: Partial<ConfiguracaoFidelidade>) => Promise<void>;
  reiniciarDadosDemo: () => Promise<void>;
  obterResumoCliente: (clienteId: string) => ClienteResumoMensal | null;
  marcarContatoRealizado: (clienteId: string) => Promise<void>;
  atualizarCliente: (clienteId: string, updates: Partial<Cliente>) => Promise<Cliente | null>;
}

const LoyaltyContext = createContext<LoyaltyContextType | undefined>(undefined);

export const LoyaltyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clientes, setClientes] = useState<Cliente[]>(() => {
    try {
      const item = typeof localStorage !== 'undefined' ? localStorage.getItem('panificadora_clientes') : null;
      return item ? JSON.parse(item) : [];
    } catch {
      return [];
    }
  });
  const [compras, setCompras] = useState<Compra[]>(() => {
    try {
      const item = typeof localStorage !== 'undefined' ? localStorage.getItem('panificadora_compras') : null;
      return item ? JSON.parse(item) : [];
    } catch {
      return [];
    }
  });
  const [config, setConfig] = useState<ConfiguracaoFidelidade>(() => {
    try {
      const item = typeof localStorage !== 'undefined' ? localStorage.getItem('panificadora_config') : null;
      return item ? JSON.parse(item) : INITIAL_CONFIG;
    } catch {
      return INITIAL_CONFIG;
    }
  });
  const [loading, setLoading] = useState(false);

  const carregarTudo = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [cList, cmpList, cfg] = await Promise.all([
        fetchClientes(),
        fetchCompras(),
        fetchConfiguracao()
      ]);
      setClientes(cList);
      setCompras(cmpList);
      setConfig(cfg);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarTudo(false);

    let syncTimer: ReturnType<typeof setTimeout> | null = null;
    const handleSync = () => {
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        carregarTudo(true);
      }, 150);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleSync();
      }
    };

    window.addEventListener('compras_atualizadas', handleSync);
    window.addEventListener('clientes_atualizados', handleSync);
    window.addEventListener('notas_fiscais_atualizadas', handleSync);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (syncTimer) clearTimeout(syncTimer);
      window.removeEventListener('compras_atualizadas', handleSync);
      window.removeEventListener('clientes_atualizados', handleSync);
      window.removeEventListener('notas_fiscais_atualizadas', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [carregarTudo]);

  // Cálculos reativos do ciclo mensal via loyaltyEngine
  const resumosMensais = useMemo(() => {
    return calcularResumosMensais(clientes, compras, config);
  }, [clientes, compras, config.meta_compras_mes, config.valor_minimo_pontuacao]);

  // Lista de clientes em risco (Clientes Sumidos)
  const clientesSumidos = useMemo(() => {
    return calcularClientesSumidos(resumosMensais);
  }, [resumosMensais]);

  // Métricas gerais para o Dashboard
  const metricas: MetricasGerais = useMemo(() => {
    return calcularMetricas(resumosMensais, clientesSumidos, compras);
  }, [resumosMensais, clientesSumidos, compras]);

  const obterResumoCliente = useCallback((clienteId: string): ClienteResumoMensal | null => {
    return resumosMensais.find((r) => r.cliente.id === clienteId) || null;
  }, [resumosMensais]);

  const registrarNovaCompra = useCallback(async (clienteId: string, valor: number, detalhes?: string | null, carrinho?: ItemCarrinho[], forma_pagamento?: string) => {
    const resumoAntes = obterResumoCliente(clienteId);
    const avaliacao = avaliarCompra(resumoAntes, valor, config);

    const novaCompra = await dbRegisterCompra(clienteId, valor, avaliacao.pontuou, detalhes, carrinho, forma_pagamento);
    
    // Atualiza estado local de compras sem duplicar
    setCompras((prev) => prev.some(c => c.id === novaCompra.id) ? prev : [novaCompra, ...prev]);
    // Atualiza clientes (total histórico)
    setClientes((prev) => prev.map((c) => 
      c.id === novaCompra.cliente_id ? { ...c, total_compras_historico: (c.total_compras_historico || 0) + 1 } : c
    ));

    // Se bateu a meta e tiver webhook configurado, faz o disparo silencioso em background
    if (avaliacao.atingiuMetaAgora && config.webhook_whatsapp_url && resumoAntes) {
      const msg = buildWhatsAppMessage(config.mensagem_whatsapp, {
        nome: resumoAntes.cliente.nome,
        compras: avaliacao.totalValidasAtualizado,
        premio: config.premio_descricao
      });
      dispararWebhookWhatsApp(
        config.webhook_whatsapp_url,
        resumoAntes.cliente.whatsapp,
        msg,
        resumoAntes.cliente.nome
      ).catch(() => {});
    }

    return {
      compra: novaCompra,
      atingiuMetaAgora: avaliacao.atingiuMetaAgora,
      totalMes: avaliacao.totalValidasAtualizado,
      pontuou: avaliacao.pontuou
    };
  }, [obterResumoCliente, config]);

  const cadastrarERegistrarCompra = useCallback(async (nome: string, whatsapp: string, valor: number, detalhesCompra?: string | null, data_nascimento?: string | null, email?: string | null, notas?: string | null, carrinho?: ItemCarrinho[], forma_pagamento?: string) => {
    const novoCliente = await dbCreateCliente(nome, whatsapp, data_nascimento, email, notas);
    setClientes((prev) => prev.some(c => c.id === novoCliente.id) ? prev : [...prev, novoCliente]);

    const res = await registrarNovaCompra(novoCliente.id, valor, detalhesCompra, carrinho, forma_pagamento);
    return {
      cliente: novoCliente,
      ...res
    };
  }, [registrarNovaCompra]);

  const marcarContatoRealizado = useCallback(async (clienteId: string) => {
    const hojeIso = new Date().toISOString().split('T')[0];
    await dbUpdateClienteContato(clienteId, hojeIso);
    setClientes((prev) => prev.map((c) =>
      c.id === clienteId ? { ...c, ultimo_contato_resgate: hojeIso } : c
    ));
  }, []);

  const salvarConfiguracoes = useCallback(async (novasConfigs: Partial<ConfiguracaoFidelidade>) => {
    const updated = await dbSaveConfiguracao(novasConfigs);
    setConfig(updated);
  }, []);

  const reiniciarDadosDemo = useCallback(async () => {
    dbResetToDemoData();
    await carregarTudo();
  }, [carregarTudo]);

  const atualizarCliente = useCallback(async (clienteId: string, updates: Partial<Cliente>) => {
    const updatedCliente = await dbUpdateCliente(clienteId, updates);
    if (updatedCliente) {
      setClientes((prev) => prev.map(c => c.id === clienteId ? updatedCliente : c));
    }
    return updatedCliente;
  }, []);

  return (
    <LoyaltyContext.Provider
      value={{
        clientes,
        compras,
        config,
        resumosMensais,
        clientesSumidos,
        metricas,
        loading,
        isSupabaseOnline: isSupabaseConfigured,
        registrarNovaCompra,
        cadastrarERegistrarCompra,
        salvarConfiguracoes,
        reiniciarDadosDemo,
        obterResumoCliente,
        marcarContatoRealizado,
        atualizarCliente
      }}
    >
      {children}
    </LoyaltyContext.Provider>
  );
};

export function useLoyalty() {
  const ctx = useContext(LoyaltyContext);
  if (!ctx) {
    throw new Error('useLoyalty deve ser usado dentro de um LoyaltyProvider');
  }
  return ctx;
}
