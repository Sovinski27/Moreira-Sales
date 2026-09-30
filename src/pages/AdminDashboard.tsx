import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useLoyalty } from '../context/LoyaltyContext';
import { Cliente, Produto, Categoria } from '../types';
import { formatPhoneDisplay, getWhatsAppUrl, buildWhatsAppMessage, cleanPhone } from '../services/whatsapp';
import { gerarRelatorioCSV } from '../services/reporting';
import { ClienteProfileModal } from '../components/ClienteProfileModal';
import { ProdutoModal } from '../components/ProdutoModal';
import { CategoriaModal } from '../components/CategoriaModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { AlertModal } from '../components/AlertModal';
import { BiReports } from '../components/BiReports';
import { CmvDashboard } from '../components/CmvDashboard';
import { GestaoFiscalTab } from '../components/GestaoFiscalTab';
import { ChecklistTab } from '../components/ChecklistTab';
import { fetchProdutos, fetchCategorias, saveProduto, saveCategoria, deleteProduto, deleteCategoria } from '../services/db';
import { 
  Users,
  User, 
  TrendingUp, 
  AlertTriangle, 
  Trophy, 
  Gift, 
  Download, 
  Search, 
  MessageCircle, 
  Calendar, 
  Save, 
  Check, 
  ArrowUpRight, 
  Sliders,
  Package,
  BarChart2,
  Calculator,
  CheckCircle2,
  Globe,
  RotateCcw,
  Tag,
  Box,
  Edit,
  Trash2,
  Lock,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Receipt,
  CheckSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  isAdminPasswordRegistered, 
  changeAdminPassword, 
  registerAdminPassword 
} from '../services/adminAuth';

interface AdminDashboardProps {
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const { 
    resumosMensais, 
    clientesSumidos, 
    metricas, 
    config, 
    salvarConfiguracoes,
    marcarContatoRealizado,
    reiniciarDadosDemo
  } = useLoyalty();

  // Modal Profile
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string | null>(null);

  // Abas do Painel
  const [activeSubTab, setActiveSubTab] = useState<'ranking' | 'churn' | 'clientes' | 'config' | 'catalogo' | 'bi' | 'cmv' | 'fiscal' | 'checklist'>('ranking');
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      tabsContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  
  // Busca na lista de clientes
  const [filtroTexto, setFiltroTexto] = useState('');

  // Filtro de urgência no anti-churn
  const [filtroUrgencia, setFiltroUrgencia] = useState<'todos' | 'amarelo' | 'vermelho'>('todos');

  // Estados de Modais Globais
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean; message: string; title?: string}>({isOpen: false, message: ''});
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void; isDestructive?: boolean}>({isOpen: false, title: '', message: '', onConfirm: () => {}});
  const [produtoModalConfig, setProdutoModalConfig] = useState<{isOpen: boolean; produto?: Produto | null}>({isOpen: false, produto: null});
  const [categoriaModalConfig, setCategoriaModalConfig] = useState<{isOpen: boolean; categoria?: Categoria | null}>({isOpen: false, categoria: null});

  // Modal de perfil do cliente
  const [perfilCliente, setPerfilCliente] = useState<Cliente | null>(null);

  // Estados locais para edição de configurações
  const [metaCompras, setMetaCompras] = useState(config.meta_compras_mes);
  const [valorMinimo, setValorMinimo] = useState(config.valor_minimo_pontuacao || 5);
  const [premioDesc, setPremioDesc] = useState(config.premio_descricao);
  const [msgWhats, setMsgWhats] = useState(config.mensagem_whatsapp);
  const [msgResgate, setMsgResgate] = useState(config.mensagem_resgate);
  const [webhookUrl, setWebhookUrl] = useState(config.webhook_whatsapp_url || '');
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [configSalvaSucesso, setConfigSalvaSucesso] = useState(false);

  // Estados para Gerenciamento de Senha do Dono
  const [temSenhaConfigurada, setTemSenhaConfigurada] = useState<boolean>(() => isAdminPasswordRegistered());
  const [senhaAtualInput, setSenhaAtualInput] = useState('');
  const [novaSenhaInput, setNovaSenhaInput] = useState('');
  const [confirmarNovaSenhaInput, setConfirmarNovaSenhaInput] = useState('');
  const [showSenhasConfig, setShowSenhasConfig] = useState(false);
  const [senhaMsgSucesso, setSenhaMsgSucesso] = useState<string | null>(null);
  const [senhaMsgErro, setSenhaMsgErro] = useState<string | null>(null);
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  const handleAlterarSenhaDono = (e: React.FormEvent) => {
    e.preventDefault();
    setSenhaMsgErro(null);
    setSenhaMsgSucesso(null);

    if (temSenhaConfigurada && !senhaAtualInput.trim()) {
      setSenhaMsgErro('Informe sua senha atual para autorizar a troca.');
      return;
    }

    if (novaSenhaInput.trim().length < 4) {
      setSenhaMsgErro('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (novaSenhaInput !== confirmarNovaSenhaInput) {
      setSenhaMsgErro('As novas senhas digitadas não coincidem.');
      return;
    }

    setSalvandoSenha(true);
    try {
      let res;
      if (temSenhaConfigurada) {
        res = changeAdminPassword(senhaAtualInput, novaSenhaInput);
      } else {
        res = registerAdminPassword(novaSenhaInput);
      }

      if (res.success) {
        setSenhaMsgSucesso('Senha do Painel do Dono alterada com sucesso!');
        setTemSenhaConfigurada(true);
        setSenhaAtualInput('');
        setNovaSenhaInput('');
        setConfirmarNovaSenhaInput('');
        setTimeout(() => setSenhaMsgSucesso(null), 4000);
      } else {
        setSenhaMsgErro(res.error || 'Erro ao alterar a senha.');
      }
    } finally {
      setSalvandoSenha(false);
    }
  };

  // Estados do Catálogo
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaCatalogoFiltro, setCategoriaCatalogoFiltro] = useState<string>('todos');

  const recarregarCatalogoAdmin = useCallback(() => {
    fetchProdutos().then(setProdutos);
    fetchCategorias().then(setCategorias);
  }, []);

  useEffect(() => {
    recarregarCatalogoAdmin();

    window.addEventListener('catalogo_atualizado', recarregarCatalogoAdmin);
    window.addEventListener('categorias_atualizadas', recarregarCatalogoAdmin);
    window.addEventListener('produtos_atualizados', recarregarCatalogoAdmin);
    window.addEventListener('storage', recarregarCatalogoAdmin);

    return () => {
      window.removeEventListener('catalogo_atualizado', recarregarCatalogoAdmin);
      window.removeEventListener('categorias_atualizadas', recarregarCatalogoAdmin);
      window.removeEventListener('produtos_atualizados', recarregarCatalogoAdmin);
      window.removeEventListener('storage', recarregarCatalogoAdmin);
    };
  }, [recarregarCatalogoAdmin]);

  // Sincroniza campos do formulário quando config for atualizada externamente (ex: restauração de demo)
  useEffect(() => {
    setMetaCompras(config.meta_compras_mes);
    setValorMinimo(config.valor_minimo_pontuacao || 5);
    setPremioDesc(config.premio_descricao);
    setMsgWhats(config.mensagem_whatsapp);
    setMsgResgate(config.mensagem_resgate);
    setWebhookUrl(config.webhook_whatsapp_url || '');
  }, [config]);

  const rankingClientes = useMemo(() => {
    return [...resumosMensais]
      .filter(r => r.cliente.ativo !== false)
      .sort((a, b) => b.compras_validas_fidelidade - a.compras_validas_fidelidade || b.valor_total_mes - a.valor_total_mes);
  }, [resumosMensais]);

  // Filtro para a base geral de clientes (busca por nome ou telefone formatado/puro)
  const clientesFiltrados = useMemo(() => {
    if (!filtroTexto.trim()) return resumosMensais;
    const term = filtroTexto.toLowerCase();
    const cleanTerm = cleanPhone(filtroTexto);
    return resumosMensais.filter((r) =>
      r.cliente.nome.toLowerCase().includes(term) ||
      r.cliente.whatsapp.includes(term) ||
      (cleanTerm.length >= 3 && r.cliente.whatsapp.includes(cleanTerm))
    );
  }, [resumosMensais, filtroTexto]);

  // Clientes sumidos com filtro de urgência
  const clientesSumidosFiltrados = useMemo(() => {
    if (filtroUrgencia === 'todos') return clientesSumidos;
    return clientesSumidos.filter((c) => c.urgencia_churn === filtroUrgencia);
  }, [clientesSumidos, filtroUrgencia]);

  // Exportação para CSV / Excel
  const handleExportarCSV = () => {
    const conteudoCSV = gerarRelatorioCSV(resumosMensais);
    const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dataHoje = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `panificadora-relatorio-clientes-${dataHoje}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Salvar configurações de fidelidade
  const handleSalvarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoConfig(true);
    try {
      await salvarConfiguracoes({
        meta_compras_mes: Number(metaCompras),
        valor_minimo_pontuacao: Number(valorMinimo),
        premio_descricao: premioDesc,
        mensagem_whatsapp: msgWhats,
        mensagem_resgate: msgResgate,
        webhook_whatsapp_url: webhookUrl.trim()
      });
      setConfigSalvaSucesso(true);
      setTimeout(() => setConfigSalvaSucesso(false), 3000);
    } catch (err) {
      console.error(err);
      setAlertConfig({ isOpen: true, title: 'Erro', message: 'Erro ao salvar configurações.' });
    } finally {
      setSalvandoConfig(false);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fadeIn">
        
        {/* CABEÇALHO DO PAINEL & BOTÃO EXPORTAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Painel de Gestão & Retenção
            </h2>
            <span className="hidden sm:inline-block bg-amber-100/80 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold shrink-0">
              Proprietário
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Visibilidade dos clientes do balcão, ranking mensal e anti-churn de clientes fiéis
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={handleExportarCSV}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-stone-700 border border-stone-200 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs active:scale-95"
              title="Bloquear painel e sair (Área Restrita)"
            >
              <Lock className="w-4 h-4 text-stone-500" />
              <span>Bloquear Painel</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI TOTALIZADORES HARMONIZADOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Visitas no Mês */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm hover:border-amber-300 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Visitas no Mês</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-stone-900 tracking-tight font-mono">
              {metricas.totalVisitasMes}
            </div>
            <p className="text-xs text-stone-400 mt-2 font-medium">
              Média de <strong className="text-stone-700">{(metricas.totalVisitasMes / (metricas.clientesAtivosMes || 1)).toFixed(1)}</strong> visitas/cliente
            </p>
          </div>
        </div>

        {/* KPI 2: Faturamento Estimado */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Faturamento Balcão</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-stone-900 tracking-tight font-mono">
              R$ {metricas.faturamentoMes.toFixed(2)}
            </div>
            <p className="text-xs text-stone-400 mt-2 font-medium">
              Ticket médio: <strong className="text-stone-700">R$ {metricas.ticketMedioMes.toFixed(2)}</strong>
            </p>
          </div>
        </div>

        {/* KPI 3: Clientes Ativos */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm hover:border-blue-300 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Clientes Ativos no Mês</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-stone-900 tracking-tight font-mono">
              {metricas.clientesAtivosMes}
            </div>
            <p className="text-xs text-stone-400 mt-2 font-medium">
              Identificados no caixa neste ciclo
            </p>
          </div>
        </div>

        {/* KPI 4: Clientes Sumidos (Anti-Churn) Harmonizado */}
        <div 
          onClick={() => setActiveSubTab('churn')}
          className={`p-5 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
            metricas.clientesEmRisco > 0
              ? 'bg-rose-50/40 border-rose-300 hover:border-rose-400 hover:shadow-md'
              : 'bg-white border-stone-200/80 shadow-sm hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              metricas.clientesEmRisco > 0 ? 'text-rose-700' : 'text-stone-400'
            }`}>
              Clientes Sumidos
            </span>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              metricas.clientesEmRisco > 0
                ? 'bg-rose-100 text-rose-700 animate-pulse'
                : 'bg-stone-100 text-stone-500'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className={`text-3xl font-black tracking-tight font-mono ${
              metricas.clientesEmRisco > 0 ? 'text-rose-700' : 'text-stone-900'
            }`}>
              {metricas.clientesEmRisco}
            </div>
            <p className={`text-xs mt-2 font-medium flex items-center gap-1 ${
              metricas.clientesEmRisco > 0 ? 'text-rose-600 font-semibold' : 'text-stone-400'
            }`}>
              <span>{metricas.clientesEmRisco > 0 ? 'Mais de 15 dias sem retorno' : 'Nenhum cliente em risco'}</span>
              {metricas.clientesEmRisco > 0 && <ArrowUpRight className="w-3.5 h-3.5" />}
            </p>
          </div>
        </div>

      </div>

      {/* NAVEGAÇÃO ENTRE ABAS DO DASHBOARD (SEGMENTED CONTAINER COM ROLAGEM) */}
      <div className="relative bg-white rounded-2xl border border-stone-200 shadow-sm p-1.5 flex items-center gap-1 group">
        
        {/* Botão de Rolar para a Esquerda */}
        <button
          type="button"
          onClick={() => scrollTabs('left')}
          className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer shrink-0"
          title="Rolar abas para a esquerda"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Trilho de Abas com Rolagem Horizontal Visível */}
        <div 
          ref={tabsContainerRef}
          onWheel={(e) => {
            if (e.deltaY !== 0 && tabsContainerRef.current) {
              tabsContainerRef.current.scrollLeft += e.deltaY;
            }
          }}
          className="flex-1 flex items-center gap-1.5 overflow-x-auto scroll-smooth py-1 px-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
        >
          <button
            type="button"
            onClick={() => setActiveSubTab('ranking')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeSubTab === 'ranking'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Ranking Mensal (VIPs)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('churn')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeSubTab === 'churn'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Clientes Sumidos</span>
            {clientesSumidos.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                activeSubTab === 'churn' ? 'bg-white text-rose-700' : 'bg-rose-100 text-rose-800'
              }`}>
                {clientesSumidos.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('clientes')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeSubTab === 'clientes'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Todos os Clientes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('catalogo')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeSubTab === 'catalogo'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Catálogo & Produtos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('cmv')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeSubTab === 'cmv'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Precificação & CMV</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('bi')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeSubTab === 'bi'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Relatórios BI</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('config')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeSubTab === 'config'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Regras & Automação</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('fiscal')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeSubTab === 'fiscal'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Fiscal & NF-e</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('checklist')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeSubTab === 'checklist'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Checklist Operacional</span>
          </button>
        </div>

        {/* Botão de Rolar para a Direita */}
        <button
          type="button"
          onClick={() => scrollTabs('right')}
          className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer shrink-0"
          title="Rolar abas para a direita"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

      </div>

      {/* CONTEÚDO DA ABA 1: RANKING MENSAL */}
      {activeSubTab === 'ranking' && (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Ranking de Frequência do Mês Corrente
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                Clientes que mais compraram com valor a partir de R$ {config.valor_minimo_pontuacao.toFixed(2)}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-stone-600 mt-2 sm:mt-0">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Ouro (&gt;12 compras)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-400" />
                Prata (6-12 compras)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                Bronze (1-5 compras)
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-stone-50/40">
            {rankingClientes.length === 0 ? (
              <div className="text-center py-12 px-6 bg-white rounded-2xl border border-stone-200/80 shadow-xs max-w-md mx-auto my-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Trophy className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-stone-900">Nenhum cliente pontuou no mês ainda</h4>
                <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                  Assim que as vendas forem registradas no Caixa com identificação do cliente, o ranking VIP e os níveis Ouro/Prata/Bronze serão atualizados automaticamente em tempo real.
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rankingClientes.map((r, index) => {
                const isTop3 = index < 3;
                return (
                  <button
                    key={r.cliente.id}
                    type="button"
                    onClick={() => setPerfilCliente(r.cliente)}
                    className={`relative text-left p-5 rounded-2xl border transition-all duration-200 hover:shadow-lg hover:-translate-y-1 bg-white ${
                      index === 0 ? 'border-amber-400 shadow-amber-200/50' : 
                      index === 1 ? 'border-stone-300 shadow-stone-200/50' :
                      index === 2 ? 'border-orange-300 shadow-orange-200/50' : 'border-stone-200'
                    }`}
                  >
                    {/* Badge de Posição */}
                    <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md border-2 border-white ${
                      index === 0 ? 'bg-amber-400 text-amber-950' :
                      index === 1 ? 'bg-stone-300 text-stone-800' :
                      index === 2 ? 'bg-orange-300 text-orange-950' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {index + 1}º
                    </div>

                    {/* Cabeçalho do Card */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="min-w-0 flex-1 pr-4">
                        <h4 className="font-black text-stone-900 text-lg leading-tight truncate">
                          {r.cliente.nome}
                        </h4>
                        <p className="text-xs text-stone-500 font-mono mt-0.5 truncate">
                          {formatPhoneDisplay(r.cliente.whatsapp)}
                        </p>
                      </div>
                      <span className={`shrink-0 inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        r.nivel === 'Ouro'
                          ? 'bg-amber-100 text-amber-800'
                          : r.nivel === 'Prata'
                          ? 'bg-stone-200 text-stone-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {r.nivel}
                      </span>
                    </div>

                    {/* Progresso de Metas */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-stone-600">Frequência Mensal</span>
                        <span className="text-stone-900">{r.compras_validas_fidelidade} / {config.meta_compras_mes}</span>
                      </div>
                      <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={`h-full rounded-full transition-all duration-700 ${
                            r.atingiu_meta ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-400 to-orange-400'
                          }`}
                          style={{ width: `${Math.min(100, (r.compras_validas_fidelidade / config.meta_compras_mes) * 100)}%` }}
                        />
                      </div>
                      {r.atingiu_meta && (
                        <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <Gift className="w-3 h-3" /> Brinde Conquistado!
                        </p>
                      )}
                    </div>

                    {/* Rodapé do Card */}
                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="block text-stone-400 font-semibold text-[10px] uppercase">Gasto no Mês</span>
                        <span className="font-black text-emerald-700 font-mono">R$ {r.valor_total_mes.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-stone-400 font-semibold text-[10px] uppercase">Histórico Total</span>
                        <span className="font-bold text-stone-700">{r.cliente.total_compras_historico} visitas</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            )}
          </div>
        </div>
      )}


      {/* CONTEÚDO DA ABA 2: CLIENTES SUMIDOS (ANTI-CHURN) */}
      {activeSubTab === 'churn' && (
        <div className="space-y-4">
          <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-rose-950">
                  Radar Anti-Churn: Clientes que Pararam de Vir
                </h3>
                <p className="text-sm text-rose-800">
                  Clientes fiéis com mais de 5 compras no mês passado que não aparecem há mais de 15 dias.
                  Envie uma mensagem de cortesia no WhatsApp e registre o contato para não incomodar o cliente repetidas vezes.
                </p>

                {/* Filtros de Urgência */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-bold text-rose-900 uppercase">Filtrar por Urgência:</span>
                  <button
                    type="button"
                    onClick={() => setFiltroUrgencia('todos')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      filtroUrgencia === 'todos' ? 'bg-rose-700 text-white' : 'bg-white/80 text-rose-800 hover:bg-white'
                    }`}
                  >
                    Todos ({clientesSumidos.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroUrgencia('amarelo')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      filtroUrgencia === 'amarelo' ? 'bg-amber-500 text-white' : 'bg-white/80 text-amber-900 hover:bg-white'
                    }`}
                  >
                    🟡 Atenção (15 a 30 dias)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroUrgencia('vermelho')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      filtroUrgencia === 'vermelho' ? 'bg-rose-600 text-white' : 'bg-white/80 text-rose-900 hover:bg-white'
                    }`}
                  >
                    🔴 Crítico (+30 dias)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clientesSumidosFiltrados.length === 0 ? (
              <div className="col-span-full bg-white p-12 text-center rounded-3xl border border-stone-200">
                <Check className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-lg font-black text-stone-900">Nenhum cliente neste filtro!</h4>
                <p className="text-xs text-stone-500">A carteira de clientes está saudável.</p>
              </div>
            ) : (
              clientesSumidosFiltrados.map((resumo) => {
                const whatsMsg = buildWhatsAppMessage(config.mensagem_resgate, {
                  nome: resumo.cliente.nome,
                });
                const whatsUrl = getWhatsAppUrl(resumo.cliente.whatsapp, whatsMsg);

                return (
                  <div 
                    key={resumo.cliente.id}
                    className={`bg-white rounded-3xl p-6 border-2 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                      resumo.urgencia_churn === 'vermelho' ? 'border-rose-300' : 'border-amber-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-xs font-black px-3 py-1 rounded-full ${
                          resumo.urgencia_churn === 'vermelho'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {resumo.urgencia_churn === 'vermelho' ? '🔴 Crítico: ' : '🟡 '}
                          {resumo.dias_sem_comprar} dias sem aparecer
                        </span>
                        <span className="text-xs text-stone-500 font-medium">
                          {resumo.compras_mes_anterior} compras mês anterior
                        </span>
                      </div>

                      <button type="button" onClick={() => setPerfilCliente(resumo.cliente)} className="text-left group">
                        <h4 className="text-xl font-black text-stone-900 group-hover:text-amber-700 group-hover:underline transition-colors">
                          {resumo.cliente.nome}
                        </h4>
                      </button>
                      <p className="text-xs text-stone-500 font-mono mt-0.5">
                        {formatPhoneDisplay(resumo.cliente.whatsapp)}
                      </p>

                      <div className="bg-stone-50 rounded-xl p-3 my-4 border border-stone-200 text-xs text-stone-600 flex justify-between items-center">
                        <div>
                          <p className="text-stone-500 text-[11px] font-semibold">Última compra:</p>
                          <p className="font-bold text-stone-800">
                            {resumo.ultima_compra_data || 'Mais de 30 dias'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-stone-500 text-[11px] font-semibold">Status de Contato:</p>
                          {resumo.ultimo_contato ? (
                            <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Feito em {resumo.ultimo_contato}
                            </span>
                          ) : (
                            <span className="text-stone-400 font-semibold">Pendente</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <a
                        href={whatsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => marcarContatoRealizado(resumo.cliente.id)}
                        className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95"
                      >
                        <MessageCircle className="w-4 h-4 fill-white" />
                        <span>Chamar no WhatsApp & Registrar Contato</span>
                      </a>

                      {!resumo.ultimo_contato && (
                        <button
                          type="button"
                          onClick={() => marcarContatoRealizado(resumo.cliente.id)}
                          className="w-full text-xs font-bold text-stone-500 hover:text-stone-800 py-2 rounded-lg hover:bg-stone-100 transition-colors"
                        >
                          Marcar como contatado sem abrir WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 3: TODOS OS CLIENTES */}
      {activeSubTab === 'clientes' && (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm space-y-4">
          <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-stone-900">
                Base Geral de Clientes Cadastrados
              </h3>
              <p className="text-xs text-stone-500">
                Total de {resumosMensais.length} clientes registrados no sistema
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome ou whats..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none"
              />
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-stone-50/50">
            {clientesFiltrados.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-stone-200">
                <Users className="w-12 h-12 text-stone-300 mx-auto mb-2" />
                <h4 className="text-base font-bold text-stone-800">
                  {filtroTexto ? 'Nenhum cliente encontrado com este filtro' : 'Nenhum cliente cadastrado ainda'}
                </h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                  {filtroTexto ? 'Tente buscar por outro nome ou número de WhatsApp.' : 'Cadastre clientes no Frente de Caixa informando o WhatsApp e nome durante a compra.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {clientesFiltrados.map((r) => {
                  const whatsUrl = getWhatsAppUrl(
                    r.cliente.whatsapp,
                    `Olá ${r.cliente.nome}! Passando para desejar um ótimo dia aqui da Panificadora Moreira Sales! 🥖☕`
                  );

                  return (
                    <button
                      key={r.cliente.id}
                      type="button"
                      onClick={() => setPerfilCliente(r.cliente)}
                      className="text-left bg-white p-4 rounded-2xl border border-stone-200 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-100/50 hover:-translate-y-1 transition-all duration-200 group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="min-w-0 flex-1 pr-4">
                          <h4 className="font-bold text-stone-900 group-hover:text-amber-700 transition-colors truncate">
                            {r.cliente.nome}
                          </h4>
                          <p className="text-xs font-mono text-stone-500 mt-0.5 truncate">
                            {formatPhoneDisplay(r.cliente.whatsapp)}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0 border border-stone-200">
                          <User className="w-4 h-4 text-stone-400" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-stone-50 p-2 rounded-xl border border-stone-100">
                          <span className="block text-[10px] uppercase font-bold text-stone-400">Compras Mês</span>
                          <span className="font-black text-amber-700">{r.compras_validas_fidelidade}</span>
                        </div>
                        <div className="bg-stone-50 p-2 rounded-xl border border-stone-100">
                          <span className="block text-[10px] uppercase font-bold text-stone-400">Total Vida</span>
                          <span className="font-black text-stone-700">{r.cliente.total_compras_historico}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-3 border-t border-stone-100">
                        <div className="text-[10px] text-stone-400 truncate pr-2 min-w-0 flex-1">
                          <span className="font-semibold uppercase block truncate">Última Visita</span>
                          {r.ultima_compra_data || 'Nenhuma'}
                        </div>
                        
                        <a
                          href={whatsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors"
                          title="Enviar Mensagem"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA CATÁLOGO */}
      {activeSubTab === 'catalogo' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-stone-900">Catálogo de Produtos</h2>
              <p className="text-sm text-stone-500">Gerencie produtos, categorias vinculadas, preços e estoque</p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setCategoriaModalConfig({ isOpen: true, categoria: null })}
                className="bg-stone-100 hover:bg-stone-200 text-stone-800 px-4 py-2.5 rounded-xl font-bold transition-colors border border-stone-300 flex items-center gap-1.5 text-sm"
              >
                + Nova Categoria
              </button>
              <button
                type="button"
                onClick={() => setProdutoModalConfig({ isOpen: true, produto: null })}
                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-1.5 text-sm shadow-sm"
              >
                + Novo Produto
              </button>
            </div>
          </div>

          {/* Filtro por Categorias */}
          {categorias.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-200">
              <button
                onClick={() => setCategoriaCatalogoFiltro('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                  categoriaCatalogoFiltro === 'todos'
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Todos ({produtos.length})
              </button>
              {categorias.map(cat => {
                const qtd = produtos.filter(p => p.categoria_id === cat.id).length;
                return (
                  <div key={cat.id} className="flex items-center gap-1 shrink-0 bg-stone-100 rounded-xl p-0.5 border border-stone-200/60">
                    <button
                      onClick={() => setCategoriaCatalogoFiltro(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        categoriaCatalogoFiltro === cat.id
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-stone-700 hover:text-stone-900'
                      }`}
                    >
                      {cat.nome} ({qtd})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoriaModalConfig({ isOpen: true, categoria: cat })}
                      className="p-1 text-stone-400 hover:text-amber-600 hover:bg-white rounded-md transition-colors cursor-pointer"
                      title="Editar esta categoria"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmConfig({
                          isOpen: true,
                          title: 'Excluir Categoria',
                          message: `Deseja realmente excluir a categoria "${cat.nome}"? Os produtos vinculados a ela serão desvinculados do PDV.`,
                          isDestructive: true,
                          onConfirm: async () => {
                            await deleteCategoria(cat.id);
                            const [catsAtualizadas, prodsAtualizados] = await Promise.all([
                              fetchCategorias(),
                              fetchProdutos()
                            ]);
                            setCategorias(catsAtualizadas);
                            setProdutos(prodsAtualizados);
                            if (categoriaCatalogoFiltro === cat.id) {
                              setCategoriaCatalogoFiltro('todos');
                            }
                          }
                        });
                      }}
                      className="p-1 text-stone-400 hover:text-rose-600 hover:bg-white rounded-md transition-colors cursor-pointer"
                      title="Excluir esta categoria"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {categorias.length === 0 && produtos.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-stone-200 my-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Package className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-stone-900">Seu catálogo está vazio</h3>
              <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto mt-1 mb-6 leading-relaxed">
                O Frente de Caixa (PDV) e o Cardápio Digital são alimentados exatamente pelos produtos e categorias que você cadastrar aqui.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setCategoriaModalConfig({ isOpen: true, categoria: null })}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-800 px-5 py-2.5 rounded-xl font-bold text-sm border border-stone-300 transition-colors cursor-pointer"
                >
                  + Cadastrar Primeira Categoria
                </button>
                <button
                  type="button"
                  onClick={() => setProdutoModalConfig({ isOpen: true, produto: null })}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-colors cursor-pointer"
                >
                  + Cadastrar Primeiro Produto
                </button>
              </div>
            </div>
          ) : produtos.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-dashed border-stone-200 my-4">
              <p className="text-sm font-bold text-stone-800">Categorias cadastradas com sucesso!</p>
              <p className="text-xs text-stone-500 mt-1 mb-4">Adicione agora os produtos vinculados a essas categorias para disponibilizá-los no PDV e no Cardápio.</p>
              <button
                type="button"
                onClick={() => setProdutoModalConfig({ isOpen: true, produto: null })}
                className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                + Cadastrar Produto
              </button>
            </div>
          ) : produtos.filter(p => categoriaCatalogoFiltro === 'todos' || p.categoria_id === categoriaCatalogoFiltro).length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-stone-200 my-4 text-stone-500 text-sm">
              <p>Nenhum produto vinculado a esta categoria ainda.</p>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setProdutoModalConfig({ isOpen: true, produto: null })}
                  className="text-amber-700 font-bold hover:underline text-xs cursor-pointer"
                >
                  + Adicionar Produto nesta Categoria
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {produtos
                .filter(p => categoriaCatalogoFiltro === 'todos' || p.categoria_id === categoriaCatalogoFiltro)
                .map(produto => {
                  const categoria = categorias.find(c => c.id === produto.categoria_id);
                  return (
                    <div key={produto.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between hover:border-amber-300 transition-all">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-200/60">
                            <Tag className="w-3 h-3 text-amber-600" />
                            {categoria?.nome || 'Sem Categoria'}
                          </span>
                          {produto.controlar_estoque && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                              <Box className="w-3 h-3" /> Estoque: {produto.estoque_atual ?? 0}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-lg text-stone-900">{produto.nome}</h3>
                        <div className="flex items-baseline gap-2 mt-1">
                          <p className="text-amber-700 font-black text-xl font-mono">R$ {produto.preco.toFixed(2)}</p>
                          {produto.custo !== undefined && produto.custo > 0 && (
                            <p className="text-xs text-stone-400 font-medium font-mono">Custo: R$ {produto.custo.toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setProdutoModalConfig({ isOpen: true, produto })}
                          className="text-amber-700 hover:text-amber-800 font-bold hover:underline text-sm flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmConfig({
                              isOpen: true,
                              title: 'Excluir Produto',
                              message: `Deseja realmente excluir "${produto.nome}"? Ele será removido imediatamente do PDV e do Cardápio.`,
                              isDestructive: true,
                              onConfirm: async () => {
                                await deleteProduto(produto.id);
                                fetchProdutos().then(setProdutos);
                              }
                            });
                          }}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir este produto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO DA ABA CMV */}
      {activeSubTab === 'cmv' && (
        <CmvDashboard />
      )}

      {/* CONTEÚDO DA ABA BI */}
      {activeSubTab === 'bi' && (
        <BiReports />
      )}

      {/* CONTEÚDO DA ABA 4: CONFIGURAÇÕES DA FIDELIDADE & WHATSAPP */}
      {activeSubTab === 'config' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm">
          <div className="border-b border-stone-100 pb-4 mb-6">
            <h3 className="text-xl font-black text-stone-900">
              Regras do Negócio & Automação de WhatsApp
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Personalize a meta mensal, o valor mínimo por compra, o brinde e os canais de disparo
            </p>
          </div>

          {configSalvaSucesso && (
            <div className="mb-6 bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold animate-fadeIn">
              <Check className="w-5 h-5 text-emerald-600" />
              <span>Configurações salvas com sucesso no sistema!</span>
            </div>
          )}

          <form onSubmit={handleSalvarConfig} className="space-y-6 max-w-3xl">
            
            {/* Meta de Compras e Valor Mínimo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Meta de Compras no Mês *
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={metaCompras}
                  onChange={(e) => setMetaCompras(Number(e.target.value))}
                  className="w-full px-4 py-3 text-lg font-black bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none"
                  required
                />
                <p className="text-xs text-stone-500 mt-1">
                  Padrão: 10 compras dentro do mesmo mês civil.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Valor Mínimo da Compra para Pontuar (R$) *
                </label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={valorMinimo}
                  onChange={(e) => setValorMinimo(Number(e.target.value))}
                  className="w-full px-4 py-3 text-lg font-black bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-mono"
                  required
                />
                <p className="text-xs text-stone-500 mt-1">
                  Evita pontuações fracionadas ou compras insignificantes (ex: bala).
                </p>
              </div>
            </div>

            {/* Descrição do Brinde */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Descrição do Prêmio / Brinde da 10ª Compra *
              </label>
              <input
                type="text"
                value={premioDesc}
                onChange={(e) => setPremioDesc(e.target.value)}
                placeholder="Ex: 1 Café Especial com Pão na Chapa Crocante"
                className="w-full px-4 py-3 text-base font-bold bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none"
                required
              />
              <p className="text-xs text-stone-500 mt-1">
                Exibido em destaque na tela verde do caixa e no texto comemorativo do WhatsApp.
              </p>
            </div>

            {/* Template Mensagem de Parabéns no WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Texto do WhatsApp: Parabéns pela Meta de Fidelidade
              </label>
              <textarea
                rows={3}
                value={msgWhats}
                onChange={(e) => setMsgWhats(e.target.value)}
                className="w-full p-4 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-sans"
              />
              <p className="text-xs text-stone-500 mt-1">
                Variáveis disponíveis: <code className="bg-stone-100 px-1 py-0.5 rounded text-amber-800 font-bold">{'{NOME}'}</code>, <code className="bg-stone-100 px-1 py-0.5 rounded text-amber-800 font-bold">{'{COMPRAS}'}</code>, <code className="bg-stone-100 px-1 py-0.5 rounded text-amber-800 font-bold">{'{PREMIO}'}</code>.
              </p>
            </div>

            {/* Template Mensagem de Resgate no WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Texto do WhatsApp: Resgate de Clientes Sumidos (Anti-Churn)
              </label>
              <textarea
                rows={3}
                value={msgResgate}
                onChange={(e) => setMsgResgate(e.target.value)}
                className="w-full p-4 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-sans"
              />
              <p className="text-xs text-stone-500 mt-1">
                Variáveis disponíveis: <code className="bg-stone-100 px-1 py-0.5 rounded text-rose-800 font-bold">{'{NOME}'}</code>.
              </p>
            </div>

            {/* Webhook Opcional para Automação Silenciosa */}
            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-amber-600" />
                URL de Webhook para API de WhatsApp (Opcional)
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://sua-api.com/webhook/disparo-whatsapp"
                className="w-full px-4 py-2.5 text-sm bg-white border border-stone-300 rounded-xl focus:border-amber-600 outline-none font-mono"
              />
              <p className="text-xs text-stone-500 mt-1.5">
                Integração com Evolution API, Z-API ou Zapier. Se vazio, o sistema usa o link oficial wa.me com 1 clique (gratuito e sem custo mensal).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={salvandoConfig}
                className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-8 py-3.5 rounded-xl font-bold text-base shadow-md transition-all active:scale-95"
              >
                <Save className="w-5 h-5" />
                <span>{salvandoConfig ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfirmConfig({
                    isOpen: true,
                    title: 'Restaurar Dados',
                    message: 'Deseja restaurar os dados originais de demonstração da panificadora? Todas as alterações serão redefinidas para o padrão.',
                    isDestructive: true,
                    onConfirm: async () => {
                      await reiniciarDadosDemo();
                      fetchProdutos().then(setProdutos);
                      fetchCategorias().then(setCategorias);
                    }
                  });
                }}
                className="inline-flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 px-5 py-3.5 rounded-xl font-semibold text-sm transition-all border border-stone-300"
              >
                <RotateCcw className="w-4 h-4 text-stone-500" />
                <span>Restaurar Dados de Demonstração</span>
              </button>
            </div>

          </form>

          {/* SEÇÃO: SEGURANÇA E SENHA DO PAINEL DO DONO */}
          <div className="mt-10 pt-8 border-t border-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-black text-stone-900 tracking-tight">
                    Segurança & Senha do Painel do Dono
                  </h3>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Proteja relatórios financeiros, CMV, clientes sumidos e configurações restritas da administração
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{temSenhaConfigurada ? 'Proteção por Senha Ativa' : 'Senha Não Definida'}</span>
                </span>
              </div>
            </div>

            {senhaMsgSucesso && (
              <div className="mb-4 bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold animate-fadeIn">
                <Check className="w-5 h-5 text-emerald-600" />
                <span>{senhaMsgSucesso}</span>
              </div>
            )}

            {senhaMsgErro && (
              <div className="mb-4 bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold animate-fadeIn">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>{senhaMsgErro}</span>
              </div>
            )}

            <form onSubmit={handleAlterarSenhaDono} className="bg-stone-50/80 p-5 sm:p-6 rounded-2xl border border-stone-200 max-w-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  {temSenhaConfigurada ? 'Alterar Senha do Administrador' : 'Cadastrar Nova Senha'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowSenhasConfig(!showSenhasConfig)}
                  className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 cursor-pointer font-medium"
                >
                  {showSenhasConfig ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-stone-400" />}
                  <span>{showSenhasConfig ? 'Ocultar' : 'Mostrar'}</span>
                </button>
              </div>

              {temSenhaConfigurada && (
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                    Senha Atual:
                  </label>
                  <input
                    type={showSenhasConfig ? 'text' : 'password'}
                    value={senhaAtualInput}
                    onChange={(e) => setSenhaAtualInput(e.target.value)}
                    placeholder="Digite a senha atual..."
                    className="w-full px-4 py-2.5 text-sm bg-white border border-stone-300 rounded-xl focus:border-amber-600 outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                    Nova Senha:
                  </label>
                  <input
                    type={showSenhasConfig ? 'text' : 'password'}
                    value={novaSenhaInput}
                    onChange={(e) => setNovaSenhaInput(e.target.value)}
                    placeholder="Mínimo 4 caracteres..."
                    className="w-full px-4 py-2.5 text-sm bg-white border border-stone-300 rounded-xl focus:border-amber-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                    Confirmar Nova Senha:
                  </label>
                  <input
                    type={showSenhasConfig ? 'text' : 'password'}
                    value={confirmarNovaSenhaInput}
                    onChange={(e) => setConfirmarNovaSenhaInput(e.target.value)}
                    placeholder="Repita a nova senha..."
                    className="w-full px-4 py-2.5 text-sm bg-white border border-stone-300 rounded-xl focus:border-amber-600 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="submit"
                  disabled={salvandoSenha}
                  className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>{salvandoSenha ? 'Salvando...' : 'Salvar Nova Senha'}</span>
                </button>

                <span className="text-[11px] text-stone-400">
                  Dica de emergência: chave mestra "admin123"
                </span>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA FISCAL & NF-E */}
      {activeSubTab === 'fiscal' && (
        <GestaoFiscalTab webhookUrlWhatsApp={config.webhook_whatsapp_url} />
      )}

      {/* CONTEÚDO DA ABA CHECKLIST OPERACIONAL */}
      {activeSubTab === 'checklist' && (
        <ChecklistTab />
      )}
      </div>

      {perfilCliente && (
        <ClienteProfileModal
          cliente={perfilCliente}
          resumo={resumosMensais.find(r => r.cliente.id === perfilCliente.id) || null}
          onClose={() => setPerfilCliente(null)}
        />
      )}

      <ProdutoModal
        isOpen={produtoModalConfig.isOpen}
        produto={produtoModalConfig.produto}
        categorias={categorias}
        onClose={() => setProdutoModalConfig({ isOpen: false })}
        onSave={(dados) => {
          const novoProduto = produtoModalConfig.produto 
            ? { ...produtoModalConfig.produto, ...dados }
            : { ...dados, ativo: true };
            
          saveProduto(novoProduto as any).then(() => {
            fetchProdutos().then(setProdutos);
            setProdutoModalConfig({ isOpen: false });
          });
        }}
        onCategoriaCriada={() => {
          fetchCategorias().then(setCategorias);
        }}
      />

      <CategoriaModal
        isOpen={categoriaModalConfig.isOpen}
        categoria={categoriaModalConfig.categoria}
        onClose={() => setCategoriaModalConfig({ isOpen: false })}
        onSave={(dados) => {
          const novaCategoria = categoriaModalConfig.categoria
            ? { ...categoriaModalConfig.categoria, ...dados }
            : { ...dados };
            
          saveCategoria(novaCategoria as any).then(() => {
            fetchCategorias().then(setCategorias);
            setCategoriaModalConfig({ isOpen: false });
          });
        }}
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive={confirmConfig.isDestructive}
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
      />

      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />
    </>
  );
};
