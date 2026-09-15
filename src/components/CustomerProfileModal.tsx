import React, { useState, useMemo } from 'react';
import { Cliente, Compra, ClienteResumoMensal } from '../types';
import { useLoyalty } from '../context/LoyaltyContext';
import { X, Calendar, DollarSign, Activity, FileText, Mail, ShoppingBag } from 'lucide-react';
import { formatPhoneDisplay } from '../services/whatsapp';

interface Props {
  clienteId: string;
  onClose: () => void;
}

export const CustomerProfileModal: React.FC<Props> = ({ clienteId, onClose }) => {
  const { resumosMensais, compras, atualizarCliente } = useLoyalty();

  const resumo = resumosMensais.find(r => r.cliente.id === clienteId);
  const clienteCompras = useMemo(() => {
    return compras.filter(c => c.cliente_id === clienteId).sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
  }, [compras, clienteId]);

  const [editMode, setEditMode] = useState(false);
  const [nome, setNome] = useState(resumo?.cliente.nome || '');
  const [email, setEmail] = useState(resumo?.cliente.email || '');
  const [dataNasc, setDataNasc] = useState(resumo?.cliente.data_nascimento || '');
  const [notas, setNotas] = useState(resumo?.cliente.notas || '');

  const [salvando, setSalvando] = useState(false);

  if (!resumo) return null;

  const totalGasto = clienteCompras.reduce((acc, curr) => acc + curr.valor, 0);
  const ticketMedio = clienteCompras.length > 0 ? totalGasto / clienteCompras.length : 0;

  const handleSave = async () => {
    setSalvando(true);
    await atualizarCliente(clienteId, {
      nome,
      email: email || null,
      data_nascimento: dataNasc || null,
      notas: notas || null,
    });
    setSalvando(false);
    setEditMode(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-stone-50">
          <div>
            <h2 className="text-2xl font-black text-stone-900 flex items-center gap-2">
              Perfil do Cliente
            </h2>
            <p className="text-sm text-stone-500 font-mono mt-1">
              {formatPhoneDisplay(resumo.cliente.whatsapp)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Métricas de LTV */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3"/> LTV (Gasto Total)</p>
              <p className="text-2xl font-black text-emerald-900 font-mono">R$ {totalGasto.toFixed(2)}</p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1 flex items-center gap-1"><Activity className="w-3 h-3"/> Visitas Totais</p>
              <p className="text-2xl font-black text-blue-900 font-mono">{clienteCompras.length}</p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1"><ShoppingBag className="w-3 h-3"/> Ticket Médio</p>
              <p className="text-2xl font-black text-amber-900 font-mono">R$ {ticketMedio.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Informações do Cadastro */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-stone-900">Dados do Cadastro</h3>
                {!editMode && (
                  <button onClick={() => setEditMode(true)} className="text-xs font-bold text-blue-600 hover:underline">
                    Editar Dados
                  </button>
                )}
              </div>

              {editMode ? (
                <div className="space-y-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Nome</label>
                    <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Data Nasc.</label>
                    <input type="date" value={dataNasc} onChange={e => setDataNasc(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase mb-1">E-mail</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Notas / Preferências</label>
                    <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg outline-none focus:border-blue-500 resize-none" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setEditMode(false)} className="px-4 py-2 text-xs font-bold text-stone-500 hover:bg-stone-200 rounded-lg">Cancelar</button>
                    <button onClick={handleSave} disabled={salvando} className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">Salvar</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-stone-500 uppercase">Nome</span>
                    <span className="text-sm font-semibold text-stone-800">{resumo.cliente.nome}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-stone-500 uppercase">Data de Nascimento</span>
                    <span className="text-sm font-semibold text-stone-800 flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-stone-400" />
                      {resumo.cliente.data_nascimento ? new Date(resumo.cliente.data_nascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não informada'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-stone-500 uppercase">E-mail</span>
                    <span className="text-sm font-semibold text-stone-800 flex items-center gap-1">
                      <Mail className="w-4 h-4 text-stone-400" />
                      {resumo.cliente.email || 'Não informado'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-stone-500 uppercase">Notas / Preferências</span>
                    <div className="text-sm font-medium text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-100 flex gap-2">
                      <FileText className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                      {resumo.cliente.notas || <span className="text-stone-400 italic">Nenhuma anotação</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 pt-2 border-t border-stone-100">
                    <span className="text-[11px] font-bold text-stone-500 uppercase">Cliente desde</span>
                    <span className="text-xs font-medium text-stone-600">
                      {new Date(resumo.cliente.criado_em).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline de Visitas */}
            <div className="flex flex-col h-full max-h-[400px]">
              <h3 className="text-lg font-black text-stone-900 mb-4">Feed de Visitas</h3>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {clienteCompras.length === 0 ? (
                  <p className="text-sm text-stone-500 italic">Nenhuma visita registrada.</p>
                ) : (
                  clienteCompras.map((compra) => {
                    const dataObj = new Date(compra.criado_em);
                    const hora = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const dia = dataObj.toLocaleDateString('pt-BR');

                    return (
                      <div key={compra.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-stone-300 shrink-0 mt-1.5" />
                          <div className="w-0.5 h-full bg-stone-100 my-1" />
                        </div>
                        <div className="pb-4">
                          <p className="text-xs text-stone-500 font-bold mb-1">
                            {dia} às {hora}
                          </p>
                          <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-sm inline-block min-w-[200px]">
                            <p className="text-sm font-black text-emerald-700 mb-1">
                              R$ {compra.valor.toFixed(2)}
                            </p>
                            {compra.detalhes && (
                              <p className="text-xs text-stone-600 italic">
                                "{compra.detalhes}"
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};