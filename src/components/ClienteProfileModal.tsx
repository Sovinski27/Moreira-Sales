import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLoyalty } from '../context/LoyaltyContext';
import { Cliente, ClienteResumoMensal } from '../types';
import { formatPhoneDisplay, getWhatsAppUrl } from '../services/whatsapp';
import { AlertModal } from './AlertModal';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Cake, 
  StickyNote, 
  Clock, 
  Calendar, 
  MessageCircle, 
  Edit3, 
  Save, 
  ShoppingBag
} from 'lucide-react';

interface ClienteProfileModalProps {
  cliente: Cliente;
  resumo: ClienteResumoMensal | null;
  onClose: () => void;
}

export const ClienteProfileModal: React.FC<ClienteProfileModalProps> = ({ cliente, resumo, onClose }) => {
  const { compras, atualizarCliente } = useLoyalty();

  const [activeTab, setActiveTab] = useState<'historico' | 'perfil'>('historico');
  const [isEditando, setIsEditando] = useState(false);
  const [editNome, setEditNome] = useState(cliente.nome);
  const [editEmail, setEditEmail] = useState(cliente.email || '');
  const [editNascimento, setEditNascimento] = useState(cliente.data_nascimento || '');
  const [editNotas, setEditNotas] = useState(cliente.notas || '');
  const [editAtivo, setEditAtivo] = useState(cliente.ativo !== false);
  const [salvando, setSalvando] = useState(false);
  const [salvoSucesso, setSalvoSucesso] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean; message: string; title?: string}>({isOpen: false, message: ''});

  const comprasCliente = useMemo(() => {
    return compras
      .filter((c) => c.cliente_id === cliente.id)
      .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
  }, [compras, cliente.id]);

  const metrics = useMemo(() => {
    const totalGasto = comprasCliente.reduce((sum, c) => sum + (Number(c.valor) || 0), 0);
    const totalVisitas = comprasCliente.length;
    const ticketMedio = totalVisitas > 0 ? totalGasto / totalVisitas : 0;
    
    // Gasto do mês atual
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = now.getFullYear();
    const prefixMesAtual = `${currentYear}-${currentMonth}-`;
    
    const gastoMesAtual = comprasCliente
      .filter(c => c.data_compra.startsWith(prefixMesAtual))
      .reduce((sum, c) => sum + (Number(c.valor) || 0), 0);

    return { totalGasto, totalVisitas, ticketMedio, gastoMesAtual };
  }, [comprasCliente]);

  const formatarDataHora = (isoString: string) => {
    const d = new Date(isoString);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return { data: `${dia}/${mes}/${ano}`, hora: `${hora}:${min}` };
  };

  const formatarDataSimples = (dateStr: string) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const dataCadastro = formatarDataHora(cliente.criado_em);

  const handleSalvarPerfil = async () => {
    setSalvando(true);
    try {
      await atualizarCliente(cliente.id, {
        nome: editNome.trim(),
        email: editEmail.trim() || null,
        data_nascimento: editNascimento || null,
        notas: editNotas.trim() || null,
        ativo: editAtivo,
      });
      setSalvoSucesso(true);
      setIsEditando(false);
      setTimeout(() => setSalvoSucesso(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      setAlertConfig({ isOpen: true, message: 'Erro ao salvar perfil. Tente novamente.' });
    } finally {
      setSalvando(false);
    }
  };

  const comprasAgrupadas = useMemo(() => {
    const grupos: Record<string, typeof comprasCliente> = {};
    for (const compra of comprasCliente) {
      const dateKey = compra.data_compra;
      if (!grupos[dateKey]) grupos[dateKey] = [];
      grupos[dateKey].push(compra);
    }
    return Object.entries(grupos).sort(([a], [b]) => b.localeCompare(a));
  }, [comprasCliente]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-auto animate-scaleUp flex flex-col overflow-hidden max-h-[92vh] border border-stone-100">

        {/* HEADER */}
        <div className="bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800 text-white p-6 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black">
              {cliente.nome.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black truncate">{cliente.nome}</h2>
              <p className="text-amber-100 text-sm font-mono flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {formatPhoneDisplay(cliente.whatsapp)}
              </p>
              {resumo && (
                <span className={`mt-1.5 inline-flex text-xs px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                  resumo.nivel === 'Ouro'
                    ? 'bg-amber-300 text-amber-900'
                    : resumo.nivel === 'Prata'
                    ? 'bg-white/30 text-white'
                    : 'bg-orange-300 text-orange-900'
                }`}>
                  {resumo.nivel}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5">
            <div className="bg-white/10 rounded-xl px-2 py-2 text-center">
              <span className="text-[10px] font-bold text-amber-200 uppercase block">Gasto (Mês)</span>
              <span className="text-lg font-black font-mono">R$ {metrics.gastoMesAtual.toFixed(0)}</span>
            </div>
            <div className="bg-white/10 rounded-xl px-2 py-2 text-center">
              <span className="text-[10px] font-bold text-amber-200 uppercase block">LTV Total</span>
              <span className="text-lg font-black font-mono">R$ {metrics.totalGasto.toFixed(0)}</span>
            </div>
            <div className="bg-white/10 rounded-xl px-2 py-2 text-center">
              <span className="text-[10px] font-bold text-amber-200 uppercase block">Visitas</span>
              <span className="text-lg font-black font-mono">{metrics.totalVisitas}</span>
            </div>
            <div className="bg-white/10 rounded-xl px-2 py-2 text-center">
              <span className="text-[10px] font-bold text-amber-200 uppercase block">Ticket Médio</span>
              <span className="text-lg font-black font-mono">R$ {metrics.ticketMedio.toFixed(0)}</span>
            </div>
            <div className="bg-white/10 rounded-xl px-2 py-2 text-center hidden sm:block">
              <span className="text-[10px] font-bold text-amber-200 uppercase block">Cliente Desde</span>
              <span className="text-sm font-black block mt-1">{dataCadastro.data}</span>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-stone-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('historico')}
            className={`flex-1 py-3 text-sm font-bold text-center transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'historico'
                ? 'text-amber-700 border-b-2 border-amber-600 bg-amber-50/50'
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Histórico de Visitas</span>
            <span className="sm:hidden">Visitas</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('perfil')}
            className={`flex-1 py-3 text-sm font-bold text-center transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'perfil'
                ? 'text-amber-700 border-b-2 border-amber-600 bg-amber-50/50'
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Cadastro Completo</span>
            <span className="sm:hidden">Cadastro</span>
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">

          {activeTab === 'historico' && (
            <div className="space-y-6">
              {comprasAgrupadas.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">Nenhuma visita registrada ainda.</p>
                </div>
              ) : (
                comprasAgrupadas.map(([dateKey, comprasDia]) => (
                  <div key={dateKey} className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 z-10">
                        <Calendar className="w-4 h-4 text-amber-600" />
                      </div>
                      <span className="text-xs font-black text-stone-700 uppercase tracking-wider">
                        {formatarDataSimples(dateKey)}
                      </span>
                      <div className="flex-1 h-px bg-stone-200" />
                      <span className="text-xs text-stone-400 font-semibold whitespace-nowrap">
                        {comprasDia.length} {comprasDia.length === 1 ? 'visita' : 'visitas'}
                      </span>
                    </div>
                    <div className="space-y-2 ml-4 border-l-2 border-amber-200 pl-6 pb-2 relative">
                      {comprasDia.map((compra) => {
                        const { hora } = formatarDataHora(compra.criado_em);
                        const pontuou = compra.pontuou_fidelidade !== false;
                        return (
                          <div
                            key={compra.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-amber-50/50 border border-stone-100 transition-colors gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                                  {hora}
                                </span>
                                {pontuou ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 whitespace-nowrap">
                                    ✓ Pontuou
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                                    Sem pontuação
                                  </span>
                                )}
                              </div>
                              {compra.detalhes && (
                                <p className="text-xs text-stone-500 mt-1 italic whitespace-pre-wrap">
                                  📝 {compra.detalhes}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-black text-emerald-800 font-mono shrink-0">
                              R$ {Number(compra.valor).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'perfil' && (
            <div className="space-y-5">
              {salvoSucesso && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold animate-fadeIn">
                  <Save className="w-4 h-4 text-emerald-600" />
                  Cadastro atualizado com sucesso!
                </div>
              )}

              {isEditando ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">Nome Completo</label>
                    <input type="text" value={editNome} onChange={(e) => setEditNome(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm font-bold bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">E-mail</label>
                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="cliente@email.com"
                      className="w-full px-4 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">Data de Nascimento</label>
                    <input type="date" value={editNascimento} onChange={(e) => setEditNascimento(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">Observações / Preferências</label>
                    <textarea rows={3} value={editNotas} onChange={(e) => setEditNotas(e.target.value)}
                      placeholder="Ex: Prefere pão integral, alérgico a glúten..."
                      className="w-full p-4 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">Status do Cliente</label>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="edit-ativo" checked={editAtivo} onChange={(e) => setEditAtivo(e.target.checked)} className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500" />
                      <label htmlFor="edit-ativo" className="text-sm font-bold text-stone-700">Cliente Ativo</label>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={handleSalvarPerfil} disabled={salvando}
                      className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95">
                      <Save className="w-4 h-4" />
                      {salvando ? 'Salvando...' : 'Salvar Cadastro'}
                    </button>
                    <button type="button" onClick={() => { setIsEditando(false); setEditNome(cliente.nome); setEditEmail(cliente.email || ''); setEditNascimento(cliente.data_nascimento || ''); setEditNotas(cliente.notas || ''); setEditAtivo(cliente.ativo !== false); }}
                      className="text-stone-500 hover:text-stone-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-stone-900 uppercase tracking-wider">Dados do Cliente</h4>
                    <button type="button" onClick={() => setIsEditando(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors border border-amber-200">
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar Cadastro
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                      <User className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] text-stone-400 font-bold uppercase">Nome</span>
                        <p className="text-sm font-bold text-stone-900">{cliente.nome}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                      <Phone className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] text-stone-400 font-bold uppercase">WhatsApp</span>
                        <p className="text-sm font-bold text-stone-900 font-mono">{formatPhoneDisplay(cliente.whatsapp)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                      <Mail className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] text-stone-400 font-bold uppercase">E-mail</span>
                        <p className="text-sm font-bold text-stone-900">
                          {cliente.email || <span className="text-stone-300 font-normal italic">Não informado</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                      <Cake className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] text-stone-400 font-bold uppercase">Aniversário</span>
                        <p className="text-sm font-bold text-stone-900">
                          {cliente.data_nascimento ? formatarDataSimples(cliente.data_nascimento) : <span className="text-stone-300 font-normal italic">Não informado</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <StickyNote className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-stone-400 font-bold uppercase">Observações / Preferências</span>
                      <p className="text-sm text-stone-700 mt-0.5">
                        {cliente.notas || <span className="text-stone-300 italic">Nenhuma observação registrada</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <User className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-stone-400 font-bold uppercase">Status</span>
                      <p className={`text-sm font-bold mt-0.5 ${cliente.ativo !== false ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {cliente.ativo !== false ? 'Ativo' : 'Desativado'}
                      </p>
                    </div>
                  </div>
                  <a href={getWhatsAppUrl(cliente.whatsapp, `Olá ${cliente.nome}! Tudo bem? 🥖☕`)}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95">
                    <MessageCircle className="w-4 h-4 fill-white" />
                    Enviar Mensagem no WhatsApp
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />
    </div>,
    document.body
  );
};
