import React, { useState, useEffect, useMemo } from 'react';
import { NotaFiscal, ConfiguracaoFiscal } from '../types';
import { fetchNotasFiscais, fetchConfigFiscal, saveConfigFiscal } from '../services/db';
import { cancelarDocumentoFiscal, baixarXmlNota, formatarChaveAcesso } from '../services/nfeService';
import { DanfeModal } from './DanfeModal';
import { 
  FileText, 
  ShieldCheck, 
  Printer, 
  Download, 
  Search, 
  AlertTriangle, 
  Sliders, 
  Building2, 
  CheckCircle2, 
  X, 
  TrendingUp, 
  DollarSign, 
  Receipt,
  QrCode,
  Save,
  Clock,
  Eye,
  Ban
} from 'lucide-react';

export const FiscalDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'notas' | 'config'>('notas');
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [configFiscal, setConfigFiscal] = useState<ConfiguracaoFiscal | null>(null);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  
  // Modal de DANFE
  const [notaSelecionada, setNotaSelecionada] = useState<NotaFiscal | null>(null);
  
  // Modal de Cancelamento
  const [modalCancelarConfig, setModalCancelarConfig] = useState<{
    isOpen: boolean;
    nota: NotaFiscal | null;
    motivo: string;
    erro?: string | null;
    cancelando: boolean;
  }>({
    isOpen: false,
    nota: null,
    motivo: '',
    erro: null,
    cancelando: false
  });

  // Feedback de salvamento
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  const carregarDadosFiscais = async () => {
    const [listaNotas, cfg] = await Promise.all([
      fetchNotasFiscais(),
      fetchConfigFiscal()
    ]);
    setNotas(listaNotas);
    setConfigFiscal(cfg);
  };

  useEffect(() => {
    carregarDadosFiscais();

    window.addEventListener('notas_fiscais_atualizadas', carregarDadosFiscais);
    window.addEventListener('config_fiscal_atualizada', carregarDadosFiscais);
    window.addEventListener('storage', carregarDadosFiscais);

    return () => {
      window.removeEventListener('notas_fiscais_atualizadas', carregarDadosFiscais);
      window.removeEventListener('config_fiscal_atualizada', carregarDadosFiscais);
      window.removeEventListener('storage', carregarDadosFiscais);
    };
  }, []);

  // KPIs Fiscais
  const metricasFiscais = useMemo(() => {
    const autorizadas = notas.filter(n => n.status === 'autorizada');
    const canceladas = notas.filter(n => n.status === 'cancelada');
    const faturamentoFiscal = autorizadas.reduce((acc, n) => acc + n.valor_total, 0);
    const tributosTotais = autorizadas.reduce((acc, n) => acc + n.valor_tributos_estimados, 0);

    return {
      totalNotas: notas.length,
      totalAutorizadas: autorizadas.length,
      totalCanceladas: canceladas.length,
      faturamentoFiscal,
      tributosTotais
    };
  }, [notas]);

  // Filtro de notas
  const notasFiltradas = useMemo(() => {
    return notas.filter(n => {
      const matchStatus = filtroStatus === 'todos' || n.status === filtroStatus;
      if (!matchStatus) return false;

      if (!filtroTexto.trim()) return true;
      const term = filtroTexto.toLowerCase();
      return (
        n.numero.toString().includes(term) ||
        n.chave_acesso.includes(term) ||
        (n.cliente_nome && n.cliente_nome.toLowerCase().includes(term)) ||
        (n.cliente_cpf_cnpj && n.cliente_cpf_cnpj.includes(term))
      );
    });
  }, [notas, filtroStatus, filtroTexto]);

  const handleSalvarConfigFiscal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configFiscal) return;

    setSalvandoConfig(true);
    try {
      await saveConfigFiscal(configFiscal);
      setSucessoMsg('Configurações fiscais da panificadora atualizadas com sucesso!');
      setTimeout(() => setSucessoMsg(null), 3500);
    } catch (err) {
      console.error('Erro ao salvar config fiscal:', err);
    } finally {
      setSalvandoConfig(false);
    }
  };

  const handleConfirmarCancelamento = async () => {
    if (!modalCancelarConfig.nota) return;

    if (modalCancelarConfig.motivo.trim().length < 15) {
      setModalCancelarConfig(prev => ({
        ...prev,
        erro: 'A justificativa de cancelamento da SEFAZ deve ter no mínimo 15 caracteres.'
      }));
      return;
    }

    setModalCancelarConfig(prev => ({ ...prev, cancelando: true, erro: null }));
    try {
      const res = await cancelarDocumentoFiscal(modalCancelarConfig.nota.id, modalCancelarConfig.motivo);
      if (res.success) {
        setModalCancelarConfig({ isOpen: false, nota: null, motivo: '', erro: null, cancelando: false });
        setSucessoMsg(`NFC-e Nº ${modalCancelarConfig.nota.numero} cancelada com sucesso na SEFAZ.`);
        setTimeout(() => setSucessoMsg(null), 3500);
        carregarDadosFiscais();
      } else {
        setModalCancelarConfig(prev => ({ ...prev, erro: res.error || 'Erro ao cancelar a nota.' }));
      }
    } catch (err) {
      setModalCancelarConfig(prev => ({ ...prev, erro: 'Falha na comunicação fiscal.' }));
    } finally {
      setModalCancelarConfig(prev => ({ ...prev, cancelando: false }));
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Feedback de sucesso */}
      {sucessoMsg && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl flex items-center justify-between font-bold text-sm shadow-md animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{sucessoMsg}</span>
          </div>
          <button type="button" onClick={() => setSucessoMsg(null)} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Fiscal e Troca de Aba Interna */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-amber-600" />
            <span>Gestão Fiscal de Notas (NFC-e / NF-e)</span>
          </h2>
          <p className="text-sm text-stone-500">
            Emissão de cupons fiscais no balcão, DANFE com QR Code, XMLs e parametrização tributária
          </p>
        </div>

        <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('notas')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'notas'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Receipt className="w-4 h-4 text-amber-600" />
            <span>Notas Emitidas ({notas.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'config'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-600" />
            <span>Configurações Fiscais</span>
          </button>
        </div>
      </div>

      {/* KPIs Fiscais em Cards Harmoniosos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Total de Notas */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Total de Cupons</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-stone-900 font-mono">
              {metricasFiscais.totalNotas}
            </div>
            <p className="text-xs text-stone-400 mt-1 font-medium">
              {metricasFiscais.totalAutorizadas} autorizadas • {metricasFiscais.totalCanceladas} canceladas
            </p>
          </div>
        </div>

        {/* KPI 2: Faturamento Fiscal */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Faturamento Fiscal</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
              R$ {metricasFiscais.faturamentoFiscal.toFixed(2)}
            </div>
            <p className="text-xs text-stone-400 mt-1 font-medium">
              Valor autorizado em NFC-e
            </p>
          </div>
        </div>

        {/* KPI 3: Tributos IBPT */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Tributos Aprox. (IBPT)</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-stone-900 font-mono">
              R$ {metricasFiscais.tributosTotais.toFixed(2)}
            </div>
            <p className="text-xs text-stone-400 mt-1 font-medium">
              Transparência Lei 12.741/2012
            </p>
          </div>
        </div>

        {/* KPI 4: Status do Certificado / SEFAZ */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Ambiente SEFAZ</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${
                configFiscal?.ambiente === 'producao' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`} />
              <span className="text-lg font-black text-stone-900 uppercase">
                {configFiscal?.ambiente === 'producao' ? 'Produção Oficial' : 'Homologação'}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-1 font-medium">
              {configFiscal?.certificado_ativo ? 'Certificado A1 Conectado' : 'Simulador Fiscal Ativo'}
            </p>
          </div>
        </div>

      </div>

      {/* ABA 1: NOTAS EMITIDAS */}
      {activeTab === 'notas' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
          
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por número, chave de acesso, cliente ou CPF..."
                value={filtroTexto}
                onChange={e => setFiltroTexto(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:border-amber-600 outline-none font-medium"
              />
              {filtroTexto && (
                <button
                  type="button"
                  onClick={() => setFiltroTexto('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-500">Status:</span>
              <select
                value={filtroStatus}
                onChange={e => setFiltroStatus(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-800 outline-none cursor-pointer"
              >
                <option value="todos">Todos ({notas.length})</option>
                <option value="autorizada">Autorizadas ({metricasFiscais.totalAutorizadas})</option>
                <option value="cancelada">Canceladas ({metricasFiscais.totalCanceladas})</option>
              </select>
            </div>
          </div>

          {/* Tabela de Notas Fiscais */}
          {notasFiltradas.length === 0 ? (
            <div className="text-center py-16 px-4 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200">
              <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-stone-800">Nenhum cupom fiscal encontrado</h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                {notas.length === 0 
                  ? 'Ao finalizar compras no balcão do Caixa (PDV), você pode emitir a NFC-e com QR Code da SEFAZ para o cliente.' 
                  : 'Nenhuma nota corresponde aos filtros de busca aplicados.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Número / Série</th>
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-4">Destinatário</th>
                    <th className="py-3 px-4">Itens</th>
                    <th className="py-3 px-4">Valor Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {notasFiltradas.map(nota => {
                    const data = new Date(nota.data_emissao).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <tr key={nota.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 text-[10px]">
                              NFC-e
                            </span>
                            <span>Nº {nota.numero}</span>
                          </div>
                          <span className="text-[10px] text-stone-400 font-sans block mt-0.5">
                            Série {nota.serie}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-stone-600 whitespace-nowrap">
                          {data}
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-stone-800 truncate max-w-[160px]">
                            {nota.cliente_nome || 'Consumidor Não Identificado'}
                          </p>
                          {nota.cliente_cpf_cnpj && (
                            <p className="text-[10px] text-stone-400 font-mono">
                              CPF/CNPJ: {nota.cliente_cpf_cnpj}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-stone-600 font-medium">
                          {nota.itens.length} {nota.itens.length === 1 ? 'item' : 'itens'}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-stone-900 text-sm whitespace-nowrap">
                          R$ {nota.valor_total.toFixed(2)}
                          <span className="block text-[10px] font-sans font-normal text-stone-400 uppercase">
                            {nota.forma_pagamento}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            nota.status === 'autorizada'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {nota.status === 'autorizada' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Autorizada</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>Cancelada</span>
                              </>
                            )}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setNotaSelecionada(nota)}
                              className="p-1.5 text-stone-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Visualizar e Imprimir DANFE"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => baixarXmlNota(nota)}
                              className="p-1.5 text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Baixar XML SEFAZ"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {nota.status === 'autorizada' && (
                              <button
                                type="button"
                                onClick={() => setModalCancelarConfig({
                                  isOpen: true,
                                  nota,
                                  motivo: '',
                                  erro: null,
                                  cancelando: false
                                })}
                                className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Cancelar NFC-e na SEFAZ"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: CONFIGURAÇÕES FISCAIS */}
      {activeTab === 'config' && configFiscal && (
        <form onSubmit={handleSalvarConfigFiscal} className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          
          <div className="border-b border-stone-100 pb-4">
            <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-600" />
              <span>Dados Fiscais da Empresa (Emitente)</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Informações obrigatórias para autorização de notas fiscais pela SEFAZ
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                CNPJ do Estabelecimento *
              </label>
              <input
                type="text"
                required
                value={configFiscal.cnpj}
                onChange={e => setConfigFiscal({ ...configFiscal, cnpj: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none font-mono font-medium text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                Inscrição Estadual (IE) *
              </label>
              <input
                type="text"
                required
                value={configFiscal.inscricao_estadual}
                onChange={e => setConfigFiscal({ ...configFiscal, inscricao_estadual: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none font-mono font-medium text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                Regime Tributário
              </label>
              <select
                value={configFiscal.regime_tributario}
                onChange={e => setConfigFiscal({ ...configFiscal, regime_tributario: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none font-bold text-sm"
              >
                <option value="simples_nacional">Simples Nacional (ME / EPP)</option>
                <option value="mei">Microempreendedor Individual (MEI)</option>
                <option value="lucro_presumido">Regime Normal (Lucro Presumido)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                Razão Social Oficial *
              </label>
              <input
                type="text"
                required
                value={configFiscal.razao_social}
                onChange={e => setConfigFiscal({ ...configFiscal, razao_social: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none font-medium text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                Nome Fantasia
              </label>
              <input
                type="text"
                value={configFiscal.nome_fantasia}
                onChange={e => setConfigFiscal({ ...configFiscal, nome_fantasia: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none font-medium text-sm"
              />
            </div>
          </div>

          <div className="border-t border-stone-100 pt-6">
            <h3 className="text-base font-black text-stone-900 mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Ambiente e Parametrização SEFAZ / QR Code</span>
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Configure o ambiente de testes ou emissão oficial e chaves de segurança CSC
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                  Ambiente de Emissão
                </label>
                <select
                  value={configFiscal.ambiente}
                  onChange={e => setConfigFiscal({ ...configFiscal, ambiente: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none font-bold text-sm"
                >
                  <option value="homologacao">Homologação (Testes SEFAZ sem valor fiscal)</option>
                  <option value="producao">Produção (Emissão Oficial com validade jurídica)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                  Série NFC-e (Balcão)
                </label>
                <input
                  type="number"
                  value={configFiscal.serie_nfce}
                  onChange={e => setConfigFiscal({ ...configFiscal, serie_nfce: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none font-mono font-medium text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                  Próximo Nº NFC-e
                </label>
                <input
                  type="number"
                  value={configFiscal.numero_atual_nfce}
                  onChange={e => setConfigFiscal({ ...configFiscal, numero_atual_nfce: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none font-mono font-medium text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                  ID do Token CSC
                </label>
                <input
                  type="text"
                  placeholder="000001"
                  value={configFiscal.csc_id}
                  onChange={e => setConfigFiscal({ ...configFiscal, csc_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none font-mono font-medium text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                  Código de Segurança do Contribuinte (CSC / Token)
                </label>
                <input
                  type="text"
                  placeholder="Chave alfanumérica fornecida pela SEFAZ"
                  value={configFiscal.csc_token}
                  onChange={e => setConfigFiscal({ ...configFiscal, csc_token: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none font-mono font-medium text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                  Provedor de Conexão SEFAZ
                </label>
                <select
                  value={configFiscal.provedor}
                  onChange={e => setConfigFiscal({ ...configFiscal, provedor: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none font-bold text-sm"
                >
                  <option value="simulador">Simulador Fiscal Nativo (SEFAZ 4.00 com Chave e QR Code válidos)</option>
                  <option value="sefaz_direta">SEFAZ Direta (Certificado A1 Web)</option>
                  <option value="focus_nfe">Focus NFe API</option>
                  <option value="plugnotas">PlugNotas / TecnoSpeed</option>
                  <option value="nuvemfiscal">Nuvem Fiscal</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-6">
            <h3 className="text-base font-black text-stone-900 mb-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-stone-600" />
              <span>Endereço do Estabelecimento</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                  Logradouro (Rua / Av.)
                </label>
                <input
                  type="text"
                  value={configFiscal.endereco.logradouro}
                  onChange={e => setConfigFiscal({
                    ...configFiscal,
                    endereco: { ...configFiscal.endereco, logradouro: e.target.value }
                  })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                  Número
                </label>
                <input
                  type="text"
                  value={configFiscal.endereco.numero}
                  onChange={e => setConfigFiscal({
                    ...configFiscal,
                    endereco: { ...configFiscal.endereco, numero: e.target.value }
                  })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                  Bairro
                </label>
                <input
                  type="text"
                  value={configFiscal.endereco.bairro}
                  onChange={e => setConfigFiscal({
                    ...configFiscal,
                    endereco: { ...configFiscal.endereco, bairro: e.target.value }
                  })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                  Município
                </label>
                <input
                  type="text"
                  value={configFiscal.endereco.municipio}
                  onChange={e => setConfigFiscal({
                    ...configFiscal,
                    endereco: { ...configFiscal.endereco, municipio: e.target.value }
                  })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                  UF (Estado)
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={configFiscal.endereco.uf}
                  onChange={e => setConfigFiscal({
                    ...configFiscal,
                    endereco: { ...configFiscal.endereco, uf: e.target.value.toUpperCase() }
                  })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none font-bold text-sm uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                  CEP
                </label>
                <input
                  type="text"
                  value={configFiscal.endereco.cep}
                  onChange={e => setConfigFiscal({
                    ...configFiscal,
                    endereco: { ...configFiscal.endereco, cep: e.target.value }
                  })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                  Código IBGE Município
                </label>
                <input
                  type="text"
                  value={configFiscal.endereco.ibge_municipio}
                  onChange={e => setConfigFiscal({
                    ...configFiscal,
                    endereco: { ...configFiscal.endereco, ibge_municipio: e.target.value }
                  })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none text-sm font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 flex justify-end">
            <button
              type="submit"
              disabled={salvandoConfig}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{salvandoConfig ? 'Salvando Parâmetros...' : 'Salvar Parâmetros Fiscais'}</span>
            </button>
          </div>

        </form>
      )}

      {/* MODAL DE VISUALIZAÇÃO DE DANFE */}
      {notaSelecionada && (
        <DanfeModal
          isOpen={Boolean(notaSelecionada)}
          nota={notaSelecionada}
          onClose={() => setNotaSelecionada(null)}
        />
      )}

      {/* MODAL DE CANCELAMENTO DE NOTA SEFAZ */}
      {modalCancelarConfig.isOpen && modalCancelarConfig.nota && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center bg-stone-900/80 backdrop-blur-xs animate-fadeIn"
          onClick={() => setModalCancelarConfig({ ...modalCancelarConfig, isOpen: false })}
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 border border-stone-100 animate-scaleUp"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-stone-900">
                  Cancelar NFC-e Nº {modalCancelarConfig.nota.numero}
                </h3>
                <p className="text-xs text-stone-500">
                  Transmissão de evento de cancelamento para a SEFAZ
                </p>
              </div>
            </div>

            {modalCancelarConfig.erro && (
              <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">
                {modalCancelarConfig.erro}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Justificativa Legal de Cancelamento *
                </label>
                <textarea
                  rows={3}
                  value={modalCancelarConfig.motivo}
                  onChange={e => setModalCancelarConfig({ ...modalCancelarConfig, motivo: e.target.value, erro: null })}
                  placeholder="Ex: Venda cancelada pelo cliente no balcão antes da entrega do produto."
                  className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl focus:border-rose-600 outline-none text-xs font-medium resize-none"
                />
                <span className="text-[10px] text-stone-400 block mt-1">
                  Exigência SEFAZ: mínimo de 15 caracteres ({modalCancelarConfig.motivo.length}/15).
                </span>
              </div>
            </div>

            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setModalCancelarConfig({ ...modalCancelarConfig, isOpen: false })}
                className="flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={modalCancelarConfig.cancelando || modalCancelarConfig.motivo.trim().length < 15}
                onClick={handleConfirmarCancelamento}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-stone-300 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {modalCancelarConfig.cancelando ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
