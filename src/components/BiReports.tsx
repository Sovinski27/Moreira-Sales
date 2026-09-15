import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Calendar, TrendingUp, Package, Users, Activity, BarChart2 } from 'lucide-react';
import { useLoyalty } from '../context/LoyaltyContext';
import { Compra } from '../types';
import { 
  filterComprasByDate, DateFilter, calcReceitaMensal, calcHorariosDePico, 
  calcProdutosMaisVendidos, calcTicketMedioMensal, calcFidelizados,
  calcFormasPagamento
} from '../services/bi';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { getLocal, STORAGE_KEYS } from '../services/db';

const COLORS = ['#d97706', '#9ca3af', '#059669', '#3b82f6'];

export const BiReports: React.FC = () => {
  const { compras: contextCompras, loading: contextLoading } = useLoyalty();
  const [filter, setFilter] = useState<DateFilter>('30d');
  const [fallbackCompras, setFallbackCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(false);

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
          <p className="text-sm text-stone-500 mt-1">
            Análise detalhada de faturamento, ticket médio e comportamento de compra.
          </p>
        </div>
        
        <div className="flex bg-stone-100 p-1 rounded-xl">
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
    </div>
  );
};
