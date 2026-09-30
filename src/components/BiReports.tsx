import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Calendar, TrendingUp, Package, Users, Activity, BarChart2, Download, DollarSign, PieChart as PieChartIcon, ChevronDown, FileSpreadsheet, Loader2, Clock, ShoppingBag } from 'lucide-react';
import { useLoyalty } from '../context/LoyaltyContext';
import { Compra } from '../types';
import { 
  filterComprasByDate, DateFilter, calcReceitaMensal, calcHorariosDePico, 
  calcProdutosMaisVendidos, calcTicketMedioMensal, calcFidelizados,
  calcFormasPagamento
} from '../services/bi';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { getLocal, STORAGE_KEYS, fetchCustosFixos, saveCustosFixos, fetchProdutos, fetchInsumos, fetchFichasTecnicas, fetchFornecedores } from '../services/db';
import { AlertModal } from './AlertModal';
import { CustosFixosConfig } from '../types';
import { exportarRelatorioExcelProfissional, exportarRelatorioCSVFormatado } from '../services/excelReport';

const COLORS = ['#d97706', '#9ca3af', '#059669', '#3b82f6'];

export const BiReports: React.FC = () => {
  const { compras: contextCompras, loading: contextLoading } = useLoyalty();
  const [filter, setFilter] = useState<DateFilter>('30d');
  const [fallbackCompras, setFallbackCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'dre'>('overview');
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: 'Aviso', message: '' });
  const customAlert = (msg: string) => setAlertConfig({ isOpen: true, title: 'Aviso', message: msg });
  const [custosConfig, setCustosConfig] = useState<CustosFixosConfig>({ tipo: 'percentual', valor: 0 });
  const [custosLoading, setCustosLoading] = useState(true);

  useEffect(() => {
    fetchCustosFixos().then(config => {
      setCustosConfig(config);
      setCustosLoading(false);
    });
  }, []);

  const handleSaveCustos = async () => {
    await saveCustosFixos(custosConfig);
    customAlert('Configurações de Custos Fixos salvas com sucesso!');
  };

  const [gerandoExcel, setGerandoExcel] = useState(false);

  const handleExportExcel = async () => {
    try {
      setGerandoExcel(true);
      const [produtos, insumos, fichas, fornecedores] = await Promise.all([
        fetchProdutos(),
        fetchInsumos(),
        fetchFichasTecnicas(),
        fetchFornecedores()
      ]);

      const filtroLabelMap: Record<DateFilter, string> = {
        'hoje': 'Hoje',
        '7d': '7 Dias',
        '30d': '30 Dias',
        'tudo': 'Tudo'
      };

      await exportarRelatorioExcelProfissional({
        vendas: filtered,
        produtos,
        insumos,
        fichas,
        fornecedores,
        custosConfig,
        filtroNome: filtroLabelMap[filter] || 'Personalizado'
      });
    } catch (err) {
      console.error('Erro ao gerar relatório Excel:', err);
      customAlert('Houve um erro ao gerar a planilha Excel. Tente novamente.');
    } finally {
      setGerandoExcel(false);
    }
  };

  const handleExportCSV = () => {
    const filtroLabelMap: Record<DateFilter, string> = {
      'hoje': 'Hoje',
      '7d': '7 Dias',
      '30d': '30 Dias',
      'tudo': 'Tudo'
    };
    exportarRelatorioCSVFormatado(filtered, custosConfig, filtroLabelMap[filter] || 'Personalizado');
  };


  useEffect(() => {
    if (!contextCompras || contextCompras.length === 0) {
      const data = getLocal<Compra[]>(STORAGE_KEYS.COMPRAS, []);
      setFallbackCompras(data);
    }
  }, [contextCompras]);

  const compras = (contextCompras && contextCompras.length > 0) ? contextCompras : fallbackCompras;
  const filtered = useMemo(() => filterComprasByDate(compras, filter), [compras, filter]);

  const receitaData = useMemo(() => calcReceitaMensal(filtered), [filtered]);
  const horariosData = useMemo(() => calcHorariosDePico(filtered), [filtered]);
  const produtosData = useMemo(() => calcProdutosMaisVendidos(filtered), [filtered]);
  const ticketData = useMemo(() => calcTicketMedioMensal(filtered), [filtered]);
  const fidelizadosData = useMemo(() => calcFidelizados(filtered), [filtered]);
  const formasPagamentoData = useMemo(() => calcFormasPagamento(filtered), [filtered]);

  const totalReceita = filtered.reduce((acc, c) => acc + c.valor, 0);
  const totalVisitas = filtered.length;
  const ticketMedio = totalVisitas > 0 ? totalReceita / totalVisitas : 0;

  if (loading) {
    return <div className="p-8 text-center text-stone-500 font-bold">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-amber-600" />
            Inteligência de Vendas (BI)
          </h2>
          <p className="text-sm text-stone-500 mt-1 mb-4">
            Análise detalhada de faturamento, ticket médio e comportamento de compra.
          </p>
          <div className="flex bg-stone-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-white shadow text-amber-700' : 'text-stone-500 hover:text-stone-700'}`}
              >
                <PieChartIcon className="w-4 h-4" /> Visão Geral
              </button>
              <button
                onClick={() => setActiveTab('dre')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dre' ? 'bg-white shadow text-green-700' : 'text-stone-500 hover:text-stone-700'}`}
              >
                <DollarSign className="w-4 h-4" /> DRE / Lucratividade
              </button>
          </div>
        </div>
        
        <div className="flex overflow-x-auto bg-stone-100 p-1 rounded-xl w-full sm:w-auto hide-scrollbar">
          <button
            onClick={() => setFilter('hoje')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'hoje' ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
          >
            Hoje
          </button>
          <button
            onClick={() => setFilter('7d')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === '7d' ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
          >
            7 Dias
          </button>
          <button
            onClick={() => setFilter('30d')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === '30d' ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
          >
            30 Dias
          </button>
          <button
            onClick={() => setFilter('tudo')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'tudo' ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
          >
            Tudo
          </button>
        </div>
      </div>

      {/* KPIs Rápidos */}
      {activeTab === 'overview' && (<>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase">Receita Bruta</p>
            <p className="text-2xl font-black text-stone-900 font-mono">R$ {totalReceita.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase">Total de Vendas</p>
            <p className="text-2xl font-black text-stone-900 font-mono">{totalVisitas}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase">Ticket Médio</p>
            <p className="text-2xl font-black text-stone-900 font-mono">R$ {ticketMedio.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receita Diária */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-black text-stone-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" /> Receita por Dia
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={receitaData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v) => `R${v}`} />
                <Tooltip formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Receita']} labelStyle={{ color: '#1f2937', fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="receita" stroke="#d97706" strokeWidth={3} dot={{ r: 4, fill: '#d97706', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Horários de Pico */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-black text-stone-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" /> Horários de Pico
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={horariosData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} formatter={(val: any) => [val, 'Vendas']} labelStyle={{ color: '#1f2937', fontWeight: 'bold' }} />
                <Bar dataKey="volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Produtos Mais Vendidos */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-black text-stone-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-500" /> Top 10 Produtos
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={produtosData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis type="category" dataKey="nome" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4b5563' }} width={100} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} formatter={(val: any) => [val, 'Unidades']} labelStyle={{ color: '#1f2937', fontWeight: 'bold' }} />
                <Bar dataKey="qtd" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Proporção de Fidelizados */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-black text-stone-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" /> Identificados vs Anônimos
          </h3>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fidelizadosData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {fidelizadosData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => [`${val} vendas`, 'Quantidade']} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Receita por Forma de Pagamento */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-black text-stone-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" /> Formas de Pagamento
          </h3>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={formasPagamentoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {formasPagamentoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Receita']} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      </>)}

      {activeTab === 'dre' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start">
            <div>
              <h3 className="text-lg font-black text-stone-900 mb-2">Configuração de Custos Fixos</h3>
              <p className="text-sm text-stone-500 mb-4 max-w-md">
                Configure os custos da sua operação (Aluguel, Luz, Salários) para abatermos proporcionalmente do faturamento bruto e calcular o Lucro Líquido Real.
              </p>
              
              {!custosLoading && (
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Modo de Abatimento</label>
                    <div className="relative"><select 
                      className="bg-stone-50 border border-stone-200 text-stone-700 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 w-full appearance-none"
                      value={custosConfig.tipo}
                      onChange={(e) => setCustosConfig({...custosConfig, tipo: e.target.value as 'mensal' | 'percentual'})}
                    >
                      <option value="mensal">Valor Fixo Mensal (R$)</option>
                      <option value="percentual">Porcentagem das Vendas (%)</option>
                    </select><ChevronDown className="w-4 h-4 absolute right-3 top-3.5 text-stone-400 pointer-events-none" /></div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
                      {custosConfig.tipo === 'mensal' ? 'Valor Mensal Total (R$)' : 'Desconto Fixo (%)'}
                    </label>
                    <input 
                      type="number" 
                      className="bg-white border border-stone-200 text-stone-700 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
                      value={custosConfig.valor}
                      onChange={(e) => setCustosConfig({...custosConfig, valor: Number(e.target.value)})}
                    />
                  </div>
                  <button 
                    onClick={handleSaveCustos}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm"
                  >
                    Salvar Regra
                  </button>
                </div>
              )}
            </div>
            
            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
               <button 
                  onClick={handleExportExcel}
                  disabled={gerandoExcel}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold py-3 px-5 rounded-xl transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  title="Gera planilha .xlsx completa com formatação executiva, gráficos visuais e abas analíticas"
                >
                  {gerandoExcel ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Gerando Excel & Gráficos...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-5 h-5" />
                      <span>Exportar Excel Executivo (.xlsx)</span>
                    </>
                  )}
                </button>

                <button 
                  onClick={handleExportCSV}
                  className="flex items-center justify-center gap-1.5 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 font-semibold py-3 px-4 rounded-xl text-xs transition-colors"
                  title="Exporta arquivo .CSV formatado para Excel Brasil (separador ponto e vírgula)"
                >
                  <Download className="w-4 h-4" />
                  <span>CSV (Brasil)</span>
                </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100 text-stone-500 text-sm">
                      <th className="py-4 px-6 font-semibold">Data & Hora</th>
                      <th className="py-4 px-6 font-semibold">Produtos Vendidos</th>
                      <th className="py-4 px-6 font-semibold">Valor Bruto</th>
                      <th className="py-4 px-6 font-semibold text-red-500">CMV (Insumos)</th>
                      <th className="py-4 px-6 font-semibold text-orange-500">Custo Fixo (Rateio)</th>
                      <th className="py-4 px-6 font-semibold text-green-600">Lucro Líquido Real</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filtered.map(c => {
                       let diasNoFiltro = 30;
                       if (filter === 'hoje') diasNoFiltro = 1;
                       if (filter === '7d') diasNoFiltro = 7;
                       let totalCustoFixoAbater = 0;
                       if (custosConfig.tipo === 'mensal') {
                         totalCustoFixoAbater = (custosConfig.valor / 30) * diasNoFiltro;
                       }
                       const countVendas = filtered.length;
                       const custoFixoPorVenda = countVendas > 0 ? (totalCustoFixoAbater / countVendas) : 0;
                       
                       const custoVar = c.custo_total || 0;
                       const faturamento = c.valor || 0;
                       let custoFixoDaVenda = 0;
                       if (custosConfig.tipo === 'mensal') {
                         custoFixoDaVenda = custoFixoPorVenda;
                       } else {
                         custoFixoDaVenda = faturamento * (custosConfig.valor / 100);
                       }
                       const lucroLiquido = faturamento - custoVar - custoFixoDaVenda;

                       // Formatação precisa da data e hora da venda
                       let dataFormatada = c.data_compra || '';
                       let horaFormatada = '--:--';
                       if (c.criado_em) {
                         try {
                           const d = new Date(c.criado_em);
                           if (!isNaN(d.getTime())) {
                             dataFormatada = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                             horaFormatada = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                           }
                         } catch {
                           // fallback
                         }
                       } else if (c.data_compra && c.data_compra.includes('-')) {
                         const pts = c.data_compra.split('-');
                         if (pts.length === 3) dataFormatada = `${pts[2]}/${pts[1]}/${pts[0]}`;
                       }

                       // Extrair os produtos vendidos da venda
                       const produtosVendidos = c.detalhes 
                         ? c.detalhes.split(',').map(p => p.trim()).filter(Boolean)
                         : ['Venda no Caixa (Geral)'];

                       return (
                         <tr key={c.id} className="hover:bg-stone-50/60 transition-colors">
                           <td className="py-4 px-6 text-stone-900 whitespace-nowrap">
                             <div className="flex flex-col">
                               <span className="font-bold text-stone-900 text-sm">{dataFormatada}</span>
                               <span className="text-xs text-stone-500 font-mono flex items-center gap-1 mt-0.5 font-medium">
                                 <Clock className="w-3.5 h-3.5 text-stone-400" />
                                 {horaFormatada}
                               </span>
                             </div>
                           </td>
                           <td className="py-4 px-6 max-w-xs">
                             <div className="flex flex-wrap gap-1.5">
                               {produtosVendidos.map((prod, idx) => (
                                 <span 
                                   key={idx}
                                   className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs"
                                 >
                                   <ShoppingBag className="w-3 h-3 text-amber-700 shrink-0" />
                                   <span>{prod}</span>
                                 </span>
                               ))}
                             </div>
                           </td>
                           <td className="py-4 px-6 font-bold text-stone-900 whitespace-nowrap">
                             R$ {faturamento.toFixed(2)}
                           </td>
                           <td className="py-4 px-6 text-red-600 font-semibold whitespace-nowrap">
                             - R$ {custoVar.toFixed(2)}
                           </td>
                           <td className="py-4 px-6 text-orange-600 font-semibold whitespace-nowrap">
                             - R$ {custoFixoDaVenda.toFixed(2)}
                           </td>
                           <td className="py-4 px-6 font-black text-green-600 whitespace-nowrap">
                             R$ {lucroLiquido.toFixed(2)}
                           </td>
                         </tr>
                       );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-stone-500">Nenhuma venda encontrada no período.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      )}
      <AlertModal isOpen={alertConfig.isOpen} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />
    </div>
  );
};
