import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  ShieldCheck,
  Search,
  Printer,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Send,
  Edit3,
  X,
  Save,
  Plus,
  Trash2,
  Download,
  AlertCircle,
  Ban,
  FileText
} from 'lucide-react';
import { ConfiguracaoFiscal, NotaFiscal, ItemNotaFiscal } from '../types';
import {
  fetchConfigFiscal,
  fetchNotasFiscais,
  atualizarNotaFiscal,
  baixarXmlNota,
  formatarChaveAcesso,
  formatarCpf,
  imprimirDanfeCupomFiscal,
  enviarDanfeWhatsApp,
  gerarLinkDanfeVisualizacao
} from '../services/nfeService';
import { formatPhoneDisplay, cleanPhone } from '../services/whatsapp';

interface GestaoFiscalTabProps {
  webhookUrlWhatsApp?: string;
}

const FORMAS_PAGAMENTO_LABEL: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito'
};

export const GestaoFiscalTab: React.FC<GestaoFiscalTabProps> = ({ webhookUrlWhatsApp }) => {
  const [config, setConfig] = useState<ConfiguracaoFiscal | null>(null);
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'autorizada' | 'cancelada'>('todas');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Modal de WhatsApp
  const [modalEnvioWhats, setModalEnvioWhats] = useState<{
    isOpen: boolean;
    nota: NotaFiscal | null;
    telefone: string;
  }>({
    isOpen: false,
    nota: null,
    telefone: ''
  });
  const [erroWhats, setErroWhats] = useState<string | null>(null);

  // Modal de Edição da Nota Fiscal
  const [notaEditando, setNotaEditando] = useState<NotaFiscal | null>(null);
  const [editClienteNome, setEditClienteNome] = useState('');
  const [editClienteCpf, setEditClienteCpf] = useState('');
  const [editClienteWhatsapp, setEditClienteWhatsapp] = useState('');
  const [editFormaPagamento, setEditFormaPagamento] = useState('pix');
  const [editStatus, setEditStatus] = useState<NotaFiscal['status']>('autorizada');
  const [editMotivoCancelamento, setEditMotivoCancelamento] = useState('');
  const [editItens, setEditItens] = useState<ItemNotaFiscal[]>([]);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);

  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const mostrarFeedback = (tipo: 'sucesso' | 'erro', texto: string) => {
    setFeedbackMsg({ tipo, texto });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [cfg, nts] = await Promise.all([fetchConfigFiscal(), fetchNotasFiscais()]);
      setConfig(cfg);
      setNotas(nts);
    } catch (e) {
      console.error('Erro ao carregar histórico fiscal:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
    window.addEventListener('notas_fiscais_atualizadas', carregarDados);
    return () => {
      window.removeEventListener('notas_fiscais_atualizadas', carregarDados);
    };
  }, []);

  const handleCopiarChave = (chave: string, id: string) => {
    navigator.clipboard.writeText(chave);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const abrirModalEdicao = (nota: NotaFiscal) => {
    setNotaEditando(nota);
    setEditClienteNome(nota.cliente_nome || '');
    setEditClienteCpf(nota.cliente_cpf ? formatarCpf(nota.cliente_cpf) : '');
    setEditClienteWhatsapp(nota.cliente_whatsapp ? formatPhoneDisplay(nota.cliente_whatsapp) : '');
    setEditFormaPagamento(nota.forma_pagamento || 'pix');
    setEditStatus(nota.status);
    setEditMotivoCancelamento(nota.motivo_cancelamento || '');
    setEditItens(
      (nota.itens || []).map(item => ({ ...item }))
    );
    setErroEdicao(null);
  };

  const fecharModalEdicao = () => {
    setNotaEditando(null);
    setErroEdicao(null);
  };

  const handleAtualizarItemEditado = (
    idx: number,
    campo: 'nome' | 'quantidade' | 'valor_unitario',
    valor: string
  ) => {
    setEditItens(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (campo === 'nome') {
          return { ...item, nome: valor };
        }
        const num = parseFloat(valor.replace(',', '.'));
        const safeNum = isNaN(num) || num < 0 ? 0 : num;
        const novaQtd = campo === 'quantidade' ? safeNum : Number(item.quantidade || 0);
        const novoVlUnit = campo === 'valor_unitario' ? safeNum : Number(item.valor_unitario || 0);
        const novoSub = Number((novaQtd * novoVlUnit).toFixed(2));
        return {
          ...item,
          quantidade: novaQtd,
          valor_unitario: novoVlUnit,
          subtotal: novoSub,
          valor_total: novoSub
        };
      })
    );
  };

  const handleAdicionarItemEditado = () => {
    setEditItens(prev => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        numero_item: prev.length + 1,
        codigo_produto: `MANUAL-${prev.length + 1}`,
        nome: '',
        quantidade: 1,
        unidade: 'UN',
        valor_unitario: 0,
        subtotal: 0,
        valor_total: 0,
        ncm: config?.ncm_padrao || '1905.90.90',
        cfop: config?.cfop_padrao || '5.102'
      }
    ]);
  };

  const handleRemoverItemEditado = (idx: number) => {
    setEditItens(prev => prev.filter((_, i) => i !== idx));
  };

  const totalEditado = useMemo(() => {
    return Number(
      editItens.reduce((acc, item) => acc + Number(item.subtotal || 0), 0).toFixed(2)
    );
  }, [editItens]);

  const handleSalvarEdicaoNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notaEditando) return;
    setErroEdicao(null);

    const itensValidos = editItens.filter(i => i.nome.trim().length > 0 && Number(i.quantidade) > 0);
    if (itensValidos.length === 0) {
      setErroEdicao('A nota precisa conter ao menos um item com descrição e quantidade válida.');
      return;
    }

    setSalvandoEdicao(true);
    try {
      const atualizada = await atualizarNotaFiscal(notaEditando, {
        cliente_nome: editClienteNome,
        cliente_cpf: editClienteCpf,
        cliente_whatsapp: editClienteWhatsapp,
        forma_pagamento: editFormaPagamento,
        status: editStatus,
        motivo_cancelamento: editMotivoCancelamento,
        itens: itensValidos
      });

      setNotas(prev => prev.map(n => (n.id === atualizada.id ? atualizada : n)));
      fecharModalEdicao();
      mostrarFeedback('sucesso', `Nota Fiscal Nº ${String(atualizada.numero).padStart(6, '0')} atualizada com sucesso!`);
    } catch (err) {
      console.error('Erro ao editar nota fiscal:', err);
      setErroEdicao('Não foi possível salvar as alterações da nota fiscal.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleConfirmarEnvioWhats = async () => {
    if (!modalEnvioWhats.nota) return;
    const digits = cleanPhone(modalEnvioWhats.telefone);
    if (!digits || digits.length < 10) {
      setErroWhats('Informe um número de WhatsApp válido com DDD (mínimo 10 dígitos).');
      return;
    }
    setErroWhats(null);

    try {
      const res = await enviarDanfeWhatsApp(
        modalEnvioWhats.nota,
        digits,
        modalEnvioWhats.nota.cliente_nome,
        webhookUrlWhatsApp
      );
      window.open(res.urlWhatsApp, '_blank');
      setModalEnvioWhats({ isOpen: false, nota: null, telefone: '' });
      carregarDados();
      mostrarFeedback('sucesso', 'Mensagem enviada com sucesso no WhatsApp!');
    } catch (e) {
      console.error('Erro ao enviar DANFE pelo WhatsApp:', e);
      setErroWhats('Erro ao disparar mensagem. Verifique a conexão.');
    }
  };

  const resumoNotas = useMemo(() => {
    const autorizadas = notas.filter(n => n.status === 'autorizada');
    const canceladas = notas.filter(n => n.status === 'cancelada');
    const totalAutorizado = autorizadas.reduce((acc, n) => acc + Number(n.valor_total || 0), 0);
    return {
      total: notas.length,
      autorizadas: autorizadas.length,
      canceladas: canceladas.length,
      totalAutorizado
    };
  }, [notas]);

  const notasFiltradas = useMemo(() => {
    return notas.filter(n => {
      if (filtroStatus !== 'todas' && n.status !== filtroStatus) return false;
      if (!filtroBusca.trim()) return true;
      const termo = filtroBusca.toLowerCase().trim();
      return (
        String(n.numero).includes(termo) ||
        n.chave_acesso.toLowerCase().includes(termo) ||
        (n.cliente_nome && n.cliente_nome.toLowerCase().includes(termo)) ||
        (n.cliente_cpf && n.cliente_cpf.includes(termo.replace(/\D/g, '')))
      );
    });
  }, [notas, filtroBusca, filtroStatus]);

  const formatMoney = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  if (loading) {
    return (
      <div className="p-12 text-center text-stone-500">
        <Receipt className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-600" />
        <p className="font-semibold text-sm">Carregando histórico de notas fiscais...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      {/* FEEDBACK TOAST */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl shadow-md flex items-center gap-2.5 animate-fadeIn text-white font-semibold text-sm ${
            feedbackMsg.tipo === 'sucesso' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {feedbackMsg.tipo === 'sucesso' ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedbackMsg.texto}</span>
        </div>
      )}

      {/* INDICADORES DO HISTÓRICO FISCAL */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-sm flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-stone-500">Total de notas registradas</p>
            <p className="text-2xl font-extrabold text-stone-900 font-mono tabular-nums mt-1">
              {resumoNotas.total}
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Emitidas manualmente sob demanda no caixa
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-sm flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-stone-500">Valor total em notas autorizadas</p>
            <p className="text-2xl font-extrabold text-stone-900 font-mono tabular-nums mt-1">
              {formatMoney(resumoNotas.totalAutorizado)}
            </p>
            <p className="text-xs text-emerald-700 font-semibold mt-1 tabular-nums">
              {resumoNotas.autorizadas} {resumoNotas.autorizadas === 1 ? 'nota autorizada' : 'notas autorizadas'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-sm flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-stone-500">Notas canceladas</p>
            <p className="text-2xl font-extrabold text-stone-900 font-mono tabular-nums mt-1">
              {resumoNotas.canceladas}
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Disponíveis para consulta e auditoria
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200/70 text-rose-600 flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* HISTÓRICO DE NOTAS FISCAIS PARA CONSULTA E EDIÇÃO */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-700 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-stone-900 tracking-tight">
                Histórico de Notas Fiscais (NF-e / NFC-e)
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                Consulte, edite dados, imprima DANFE, baixe XML ou reenvie comprovantes pelo WhatsApp
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Filtro de Status */}
            <div className="inline-flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/80 shrink-0">
              {(['todas', 'autorizada', 'cancelada'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFiltroStatus(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filtroStatus === st
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {st === 'todas' ? 'Todas' : st === 'autorizada' ? 'Autorizadas' : 'Canceladas'}
                </button>
              ))}
            </div>

            {/* Campo de busca */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={filtroBusca}
                onChange={e => setFiltroBusca(e.target.value)}
                placeholder="Buscar nº, cliente, CPF ou chave..."
                className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-amber-600 outline-none"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {notasFiltradas.length === 0 ? (
          <div className="text-center py-14 px-6">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-stone-800">
              {notas.length === 0
                ? 'Nenhuma nota fiscal emitida ainda'
                : 'Nenhuma nota encontrada para este filtro'}
            </p>
            <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
              {notas.length === 0
                ? 'No Caixa, ative a opção "Emitir NFC-e" nas vendas em que desejar emitir nota fiscal. Elas aparecerão aqui para consulta e edição.'
                : 'Tente buscar por outro número, nome de cliente, CPF ou limpe o filtro selecionado.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-stone-50/90 border-b border-stone-200/80 text-xs font-semibold text-stone-500">
                  <th className="py-3.5 px-5">Nº / Série</th>
                  <th className="py-3.5 px-4">Data / Hora</th>
                  <th className="py-3.5 px-4">Cliente / CPF</th>
                  <th className="py-3.5 px-4">Valor</th>
                  <th className="py-3.5 px-4">Chave de Acesso</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {notasFiltradas.map(nota => {
                  const chaveFormat = formatarChaveAcesso(nota.chave_acesso);
                  const isCopiado = copiadoId === nota.id;

                  return (
                    <tr key={nota.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-5 font-mono tabular-nums font-bold text-stone-900 whitespace-nowrap">
                        NFC-e Nº {String(nota.numero).padStart(6, '0')}
                        <span className="text-xs text-stone-400 block font-sans font-normal">
                          Série {nota.serie}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-stone-700 font-mono tabular-nums text-xs">
                        {new Date(nota.data_emissao).toLocaleDateString('pt-BR')}
                        <span className="text-stone-400 block">
                          {new Date(nota.data_emissao).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-stone-900 block truncate max-w-[180px]">
                          {nota.cliente_nome || 'Consumidor Final'}
                        </span>
                        <span className="text-xs text-stone-500 font-mono tabular-nums block">
                          {nota.cliente_cpf ? formatarCpf(nota.cliente_cpf) : 'Sem CPF'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-stone-900 whitespace-nowrap">
                        {formatMoney(Number(nota.valor_total || 0))}
                        <span className="text-[11px] font-sans font-medium text-stone-500 block">
                          {FORMAS_PAGAMENTO_LABEL[nota.forma_pagamento] || nota.forma_pagamento}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-xs text-stone-600 truncate max-w-[150px] block"
                            title={nota.chave_acesso}
                          >
                            {chaveFormat}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopiarChave(nota.chave_acesso, nota.id)}
                            className="p-1.5 hover:bg-stone-200 text-stone-400 hover:text-stone-700 rounded-lg transition-colors cursor-pointer"
                            title="Copiar Chave Completa"
                            aria-label="Copiar chave de acesso"
                          >
                            {isCopiado ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                            nota.status === 'autorizada'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : nota.status === 'cancelada'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {nota.status === 'cancelada' ? (
                            <Ban className="w-3.5 h-3.5" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {nota.status === 'autorizada'
                              ? 'Autorizada'
                              : nota.status === 'cancelada'
                                ? 'Cancelada'
                                : nota.status}
                          </span>
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => abrirModalEdicao(nota)}
                            className="px-2.5 py-1.5 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-semibold"
                            title="Editar dados, itens ou status da nota fiscal"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => imprimirDanfeCupomFiscal(nota, config)}
                            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-200/80 rounded-lg transition-colors cursor-pointer"
                            title="Imprimir Cupom DANFE"
                            aria-label="Imprimir DANFE"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => baixarXmlNota(nota)}
                            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-200/80 rounded-lg transition-colors cursor-pointer"
                            title="Baixar XML"
                            aria-label="Baixar XML"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setModalEnvioWhats({
                                isOpen: true,
                                nota,
                                telefone: nota.cliente_whatsapp
                                  ? formatPhoneDisplay(nota.cliente_whatsapp)
                                  : ''
                              })
                            }
                            className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Enviar Comprovante pelo WhatsApp"
                            aria-label="Enviar pelo WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          <a
                            href={gerarLinkDanfeVisualizacao(nota, config)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/80 rounded-lg transition-colors cursor-pointer"
                            title="Consultar no Portal SEFAZ"
                            aria-label="Consultar na SEFAZ"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
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

      {/* MODAL DE EDIÇÃO DA NOTA FISCAL */}
      {notaEditando && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-stone-950/60 backdrop-blur-sm animate-fadeIn"
          onClick={fecharModalEdicao}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-stone-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Cabeçalho fixo */}
            <div className="bg-stone-900 text-white px-6 py-5 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold tracking-tight truncate">
                    Editar NFC-e Nº {String(notaEditando.numero).padStart(6, '0')}
                  </h3>
                  <p className="text-xs text-stone-400 truncate">
                    Série {notaEditando.serie} • Emitida em{' '}
                    {new Date(notaEditando.data_emissao).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fecharModalEdicao}
                aria-label="Fechar edição"
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicaoNota} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {erroEdicao && (
                  <div className="px-4 py-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{erroEdicao}</span>
                  </div>
                )}

                {/* Dados do Cliente e Pagamento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      Nome do cliente
                    </label>
                    <input
                      type="text"
                      value={editClienteNome}
                      onChange={e => setEditClienteNome(e.target.value)}
                      placeholder="Consumidor Final"
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-medium text-stone-900 focus:border-amber-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      CPF na nota
                    </label>
                    <input
                      type="text"
                      value={editClienteCpf}
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setEditClienteCpf(formatarCpf(raw));
                      }}
                      placeholder="000.000.000-00"
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-mono font-semibold text-stone-900 focus:border-amber-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      WhatsApp do cliente
                    </label>
                    <input
                      type="tel"
                      value={editClienteWhatsapp}
                      onChange={e => setEditClienteWhatsapp(e.target.value)}
                      placeholder="(44) 99999-9999"
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-mono font-medium text-stone-900 focus:border-amber-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      Forma de pagamento
                    </label>
                    <select
                      value={editFormaPagamento}
                      onChange={e => setEditFormaPagamento(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-stone-900 focus:border-amber-600 outline-none"
                    >
                      <option value="pix">PIX</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="cartao_debito">Cartão de Débito</option>
                      <option value="cartao_credito">Cartão de Crédito</option>
                    </select>
                  </div>
                </div>

                {/* Status da Nota */}
                <div className="pt-4 border-t border-stone-100 space-y-3">
                  <label className="block text-xs font-semibold text-stone-700">
                    Situação da nota fiscal
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditStatus('autorizada')}
                      className={`py-2.5 px-4 rounded-xl text-sm font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                        editStatus === 'autorizada'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Autorizada</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditStatus('cancelada')}
                      className={`py-2.5 px-4 rounded-xl text-sm font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                        editStatus === 'cancelada'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <Ban className="w-4 h-4" />
                      <span>Cancelada</span>
                    </button>
                  </div>

                  {editStatus === 'cancelada' && (
                    <div className="animate-fadeIn">
                      <label className="block text-xs font-semibold text-rose-800 mb-1.5">
                        Motivo do cancelamento
                      </label>
                      <input
                        type="text"
                        value={editMotivoCancelamento}
                        onChange={e => setEditMotivoCancelamento(e.target.value)}
                        placeholder="Ex: Erro de lançamento ou solicitação do cliente"
                        className="w-full px-3.5 py-2.5 bg-rose-50/50 border border-rose-200 rounded-xl text-sm text-stone-900 focus:border-rose-500 outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Itens da Nota */}
                <div className="pt-4 border-t border-stone-100 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-stone-800">
                      Itens da Nota ({editItens.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAdicionarItemEditado}
                      className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar item</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {editItens.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-3 bg-stone-50 border border-stone-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                      >
                        <div className="sm:col-span-5">
                          <label className="block text-[11px] font-medium text-stone-500 mb-1">
                            Produto / Descrição
                          </label>
                          <input
                            type="text"
                            value={item.nome}
                            onChange={e => handleAtualizarItemEditado(idx, 'nome', e.target.value)}
                            placeholder="Descrição do item"
                            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-900 focus:border-amber-600 outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:col-span-5 gap-2">
                          <div>
                            <label className="block text-[11px] font-medium text-stone-500 mb-1">
                              Qtd.
                            </label>
                            <input
                              type="number"
                              min={1}
                              step="any"
                              value={item.quantidade}
                              onChange={e => handleAtualizarItemEditado(idx, 'quantidade', e.target.value)}
                              className="w-full px-2.5 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono tabular-nums font-bold text-stone-900 focus:border-amber-600 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-stone-500 mb-1">
                              Vl. Unit (R$)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={item.valor_unitario}
                              onChange={e => handleAtualizarItemEditado(idx, 'valor_unitario', e.target.value)}
                              className="w-full px-2.5 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono tabular-nums font-bold text-stone-900 focus:border-amber-600 outline-none"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-4">
                          <span className="font-mono tabular-nums font-bold text-xs text-stone-900">
                            {formatMoney(Number(item.subtotal || 0))}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoverItemEditado(idx)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                            title="Remover item"
                            aria-label="Remover item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rodapé fixo */}
              <div className="shrink-0 px-6 py-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-xs text-stone-500 block">Valor total atualizado</span>
                  <span className="text-lg font-extrabold font-mono tabular-nums text-stone-900">
                    {formatMoney(totalEditado)}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={fecharModalEdicao}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 font-semibold text-sm cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvandoEdicao}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white font-bold text-sm inline-flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RÁPIDO DE REENVIO WHATSAPP */}
      {modalEnvioWhats.isOpen && modalEnvioWhats.nota && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => {
            setModalEnvioWhats({ isOpen: false, nota: null, telefone: '' });
            setErroWhats(null);
          }}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold">
                <Share2 className="w-5 h-5 text-emerald-600" />
                <span>Reenviar DANFE por WhatsApp</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalEnvioWhats({ isOpen: false, nota: null, telefone: '' });
                  setErroWhats(null);
                }}
                aria-label="Fechar"
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {erroWhats && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl animate-fadeIn">
                {erroWhats}
              </div>
            )}

            <p className="text-xs sm:text-sm text-stone-600">
              Informe o WhatsApp do cliente para enviar o comprovante da{' '}
              <strong>NFC-e Nº {String(modalEnvioWhats.nota.numero).padStart(6, '0')}</strong>:
            </p>

            <input
              type="tel"
              value={modalEnvioWhats.telefone}
              onChange={e => {
                setModalEnvioWhats({ ...modalEnvioWhats, telefone: e.target.value });
                setErroWhats(null);
              }}
              placeholder="(44) 99876-5432"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono font-bold focus:bg-white focus:border-emerald-600 outline-none"
              autoFocus
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalEnvioWhats({ isOpen: false, nota: null, telefone: '' });
                  setErroWhats(null);
                }}
                className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEnvioWhats}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
