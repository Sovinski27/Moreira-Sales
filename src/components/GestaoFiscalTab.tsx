import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Receipt, 
  ShieldCheck, 
  Settings, 
  Search, 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  Plus, 
  ExternalLink,
  Building2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Key,
  Globe,
  Radio,
  Send
} from 'lucide-react';
import { ConfiguracaoFiscal, NotaFiscal, ProvedorFiscal, AmbienteFiscal } from '../types';
import { 
  fetchConfigFiscal, 
  saveConfigFiscal, 
  fetchNotasFiscais, 
  formatarChaveAcesso, 
  formatarCpf, 
  imprimirDanfeCupomFiscal, 
  enviarDanfeWhatsApp, 
  gerarLinkDanfeVisualizacao,
  emitirNotaFiscal
} from '../services/nfeService';
import { formatPhoneDisplay, cleanPhone } from '../services/whatsapp';

interface GestaoFiscalTabProps {
  webhookUrlWhatsApp?: string;
}

export const GestaoFiscalTab: React.FC<GestaoFiscalTabProps> = ({ webhookUrlWhatsApp }) => {
  const [config, setConfig] = useState<ConfiguracaoFiscal | null>(null);
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagemSalvo, setMensagemSalvo] = useState(false);
  const [filtroBusca, setFiltroBusca] = useState('');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [modalEnvioWhats, setModalEnvioWhats] = useState<{ isOpen: boolean; nota: NotaFiscal | null; telefone: string }>({
    isOpen: false,
    nota: null,
    telefone: ''
  });
  const [emitindoTeste, setEmitindoTeste] = useState(false);

  // Carregar dados
  const carregarDados = async () => {
    setLoading(true);
    try {
      const [cfg, nts] = await Promise.all([
        fetchConfigFiscal(),
        fetchNotasFiscais()
      ]);
      setConfig(cfg);
      setNotas(nts);
    } catch (e) {
      console.error('Erro ao carregar dados fiscais:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
    window.addEventListener('config_fiscal_atualizada', carregarDados);
    window.addEventListener('notas_fiscais_atualizadas', carregarDados);
    return () => {
      window.removeEventListener('config_fiscal_atualizada', carregarDados);
      window.removeEventListener('notas_fiscais_atualizadas', carregarDados);
    };
  }, []);

  const handleSalvarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSalvando(true);
    try {
      await saveConfigFiscal(config);
      setMensagemSalvo(true);
      setTimeout(() => setMensagemSalvo(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar configuração fiscal:', err);
      alert('Erro ao salvar configurações fiscais.');
    } finally {
      setSalvando(false);
    }
  };

  const handleEmitirNotaTeste = async () => {
    setEmitindoTeste(true);
    try {
      const novaNota = await emitirNotaFiscal({
        id: `compra-teste-${Date.now()}`,
        cliente_id: 'cli-teste',
        valor: 15.50,
        data_compra: new Date().toISOString().split('T')[0],
        criado_em: new Date().toISOString(),
        detalhes: '1x Café Expresso, 2x Pão na Chapa',
        forma_pagamento: 'pix'
      }, [
        {
          id_temp: '1',
          produto: { id: 'prod-cafe', nome: 'Café Expresso', preco: 6.50, categoria_id: '', ativo: true },
          quantidade: 1,
          subtotal: 6.50
        },
        {
          id_temp: '2',
          produto: { id: 'prod-pao', nome: 'Pão na Chapa Crocante', preco: 4.50, categoria_id: '', ativo: true },
          quantidade: 2,
          subtotal: 9.00
        }
      ], {
        nome: 'Cliente Exemplo Teste',
        cpf: '123.456.789-00',
        whatsapp: '44998765432'
      });

      setNotas(prev => [novaNota, ...prev]);
      alert(`Nota Fiscal NFC-e Nº ${novaNota.numero} gerada com sucesso! Você pode visualizar o comprovante no histórico abaixo.`);
    } catch (e) {
      console.error('Erro ao emitir nota de teste:', e);
      alert('Erro ao emitir nota fiscal de teste.');
    } finally {
      setEmitindoTeste(false);
    }
  };

  const handleCopiarChave = (chave: string, id: string) => {
    navigator.clipboard.writeText(chave);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const handleConfirmarEnvioWhats = async () => {
    if (!modalEnvioWhats.nota) return;
    const digits = cleanPhone(modalEnvioWhats.telefone);
    if (!digits || digits.length < 10) {
      alert('Informe um número de WhatsApp válido com DDD.');
      return;
    }

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
    } catch (e) {
      console.error('Erro ao enviar DANFE pelo WhatsApp:', e);
      alert('Erro ao disparar mensagem.');
    }
  };

  const notasFiltradas = useMemo(() => {
    if (!filtroBusca.trim()) return notas;
    const termo = filtroBusca.toLowerCase().trim();
    return notas.filter(n => 
      String(n.numero).includes(termo) ||
      n.chave_acesso.toLowerCase().includes(termo) ||
      (n.cliente_nome && n.cliente_nome.toLowerCase().includes(termo)) ||
      (n.cliente_cpf && n.cliente_cpf.includes(termo))
    );
  }, [notas, filtroBusca]);

  if (loading || !config) {
    return (
      <div className="p-12 text-center text-stone-500">
        <Receipt className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-600" />
        <p className="font-semibold text-sm">Carregando módulo fiscal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* CABEÇALHO DO MÓDULO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shadow-inner shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-stone-900 tracking-tight">
                Emissão de Nota Fiscal Eletrônica (NF-e / NFC-e)
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                config.ambiente === 'producao' && config.token_api?.trim()
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {config.ambiente === 'producao' && config.token_api?.trim()
                  ? 'SEFAZ Produção Real'
                  : 'Modo Homologação / Simulação'}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Integração com APIs de mercado (Focus NFe, Nuvem Fiscal) e envio automático de DANFE via WhatsApp aos clientes
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleEmitirNotaTeste}
          disabled={emitindoTeste}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:bg-stone-300"
        >
          <Sparkles className="w-4 h-4" />
          <span>{emitindoTeste ? 'Emitindo...' : 'Emitir Nota de Teste'}</span>
        </button>
      </div>

      {/* GUIA EXPLICATIVO: NOTA REAL VS HOMOLOGAÇÃO */}
      <div className={`p-5 sm:p-6 rounded-3xl border ${
        config.ambiente === 'producao' && config.token_api?.trim()
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          : 'bg-amber-50/70 border-amber-200 text-amber-950'
      }`}>
        <div className="flex items-start gap-3.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            config.ambiente === 'producao' && config.token_api?.trim()
              ? 'bg-emerald-600 text-white'
              : 'bg-amber-600 text-white'
          }`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h4 className="text-sm font-black">
              {config.ambiente === 'producao' && config.token_api?.trim()
                ? 'Emissão Oficial Real Ativa (Transmitida para a SEFAZ)'
                : 'Status Atual: Modo Homologação / Simulação (Testes)'}
            </h4>
            <p className="text-xs leading-relaxed opacity-90">
              {config.ambiente === 'producao' && config.token_api?.trim()
                ? 'As notas emitidas no caixa são transmitidas diretamente para a Receita Estadual (SEFAZ) com protocolo e chave oficial válida juridicamente.'
                : 'As notas estão sendo geradas com o layout oficial do DANFE NFC-e e QR Code, porém em ambiente de teste/simulação. Para emitir notas fiscais 100% REAIS com validade fiscal perante a SEFAZ, siga o checklist abaixo:'}
            </p>

            {(!config.token_api || config.ambiente !== 'producao') && (
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px] font-medium">
                <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                  <span className="font-bold block text-amber-900 mb-0.5">1. CNPJ & IE Reais</span>
                  Insira o CNPJ da panificadora e a Inscrição Estadual (IE) cadastrada na SEFAZ.
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                  <span className="font-bold block text-amber-900 mb-0.5">2. Certificado Digital A1</span>
                  Necessário para assinatura digital das notas fiscais perante o governo.
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                  <span className="font-bold block text-amber-900 mb-0.5">3. Conta Focus NFe</span>
                  Crie a conta na Focus NFe (focusnfe.com.br) e copie seu <strong>Token de API</strong>.
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                  <span className="font-bold block text-amber-900 mb-0.5">4. Mudar para Produção</span>
                  Selecione o ambiente "Produção (Válido)" e clique em Salvar Parâmetros.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FORMULÁRIO DE CONFIGURAÇÃO FISCAL */}
      <form onSubmit={handleSalvarConfig} className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-extrabold text-stone-900">
              Credenciais da API & Parâmetros Fiscais
            </h3>
          </div>
          {mensagemSalvo && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-fadeIn">
              <Check className="w-4 h-4 stroke-[3]" /> Configurações salvas com sucesso!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Provedor de API */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Provedor da API Fiscal
            </label>
            <select
              value={config.provedor}
              onChange={e => setConfig({ ...config, provedor: e.target.value as ProvedorFiscal })}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold focus:bg-white focus:border-amber-600 outline-none"
            >
              <option value="focus_nfe">Focus NFe (Homologação & Produção)</option>
              <option value="nuvem_fiscal">Nuvem Fiscal API</option>
              <option value="webmania">WebmaniaBR Fiscal</option>
              <option value="simulador">Emissor Inteligente SEFAZ (Local / Contingência)</option>
            </select>
            <p className="text-[11px] text-stone-400 mt-1">
              Plataforma de mercado utilizada para autorizar a nota na SEFAZ.
            </p>
          </div>

          {/* Ambiente */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Ambiente de Emissão
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfig({ ...config, ambiente: 'homologacao' })}
                className={`py-3 px-3 rounded-xl text-xs font-bold border transition-all ${
                  config.ambiente === 'homologacao'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                Homologação (Testes)
              </button>
              <button
                type="button"
                onClick={() => setConfig({ ...config, ambiente: 'producao' })}
                className={`py-3 px-3 rounded-xl text-xs font-bold border transition-all ${
                  config.ambiente === 'producao'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                Produção (Válido)
              </button>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Em Homologação as notas não têm valor fiscal oficial.
            </p>
          </div>

          {/* Token / API Key */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Token / API Key do Provedor</span>
              <span className="text-[10px] text-stone-400 font-normal">Opcional p/ testes</span>
            </label>
            <div className="relative">
              <input
                type="password"
                value={config.token_api}
                onChange={e => setConfig({ ...config, token_api: e.target.value })}
                placeholder="Ex: u8zK9... (Token Focus NFe)"
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono focus:bg-white focus:border-amber-600 outline-none"
              />
              <Key className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Chave fornecida no painel da Focus NFe ou Nuvem Fiscal.
            </p>
          </div>

          {/* CNPJ Emitente */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              CNPJ do Estabelecimento
            </label>
            <input
              type="text"
              value={config.cnpj_emitente}
              onChange={e => setConfig({ ...config, cnpj_emitente: e.target.value })}
              placeholder="12.345.678/0001-90"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono font-bold focus:bg-white focus:border-amber-600 outline-none"
              required
            />
          </div>

          {/* Inscrição Estadual (IE) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Inscrição Estadual (IE)
            </label>
            <input
              type="text"
              value={config.inscricao_estadual || ''}
              onChange={e => setConfig({ ...config, inscricao_estadual: e.target.value })}
              placeholder="12345678-9"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono focus:bg-white focus:border-amber-600 outline-none"
            />
          </div>

          {/* Razão Social */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Razão Social
            </label>
            <input
              type="text"
              value={config.razao_social}
              onChange={e => setConfig({ ...config, razao_social: e.target.value })}
              placeholder="Panificadora & Confeitaria Ltda"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold focus:bg-white focus:border-amber-600 outline-none"
              required
            />
          </div>

          {/* Nome Fantasia */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Nome Fantasia (Impresso no Cupom)
            </label>
            <input
              type="text"
              value={config.nome_fantasia}
              onChange={e => setConfig({ ...config, nome_fantasia: e.target.value })}
              placeholder="Panificadora Moreira Sales"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold focus:bg-white focus:border-amber-600 outline-none"
              required
            />
          </div>

          {/* Série e Sequencial */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Série
              </label>
              <input
                type="number"
                value={config.serie_nfe}
                onChange={e => setConfig({ ...config, serie_nfe: parseInt(e.target.value, 10) || 1 })}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono font-bold focus:bg-white focus:border-amber-600 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Última Nota
              </label>
              <input
                type="number"
                value={config.ultimo_numero_nfe}
                onChange={e => setConfig({ ...config, ultimo_numero_nfe: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono font-bold focus:bg-white focus:border-amber-600 outline-none"
                required
              />
            </div>
          </div>

          {/* NCM e CFOP Padrão */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                NCM Padrão
              </label>
              <input
                type="text"
                value={config.ncm_padrao || '1905.90.90'}
                onChange={e => setConfig({ ...config, ncm_padrao: e.target.value })}
                placeholder="1905.90.90"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono focus:bg-white focus:border-amber-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                CFOP Padrão
              </label>
              <input
                type="text"
                value={config.cfop_padrao || '5.102'}
                onChange={e => setConfig({ ...config, cfop_padrao: e.target.value })}
                placeholder="5.102"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono focus:bg-white focus:border-amber-600 outline-none"
              />
            </div>
          </div>

        </div>

        {/* REGRAS DE AUTOMAÇÃO NO PDV & WHATSAPP */}
        <div className="pt-6 border-t border-stone-100 space-y-4">
          <h4 className="text-sm font-extrabold text-stone-900">Automação de Emissão e Envio no PDV</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-4 rounded-2xl border border-stone-200 bg-stone-50/50 cursor-pointer hover:bg-stone-50 transition-colors">
              <input
                type="checkbox"
                checked={config.emissao_automatica_pdv}
                onChange={e => setConfig({ ...config, emissao_automatica_pdv: e.target.checked })}
                className="w-5 h-5 rounded-md text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
              />
              <div>
                <p className="text-xs font-bold text-stone-900">Emissão Automática no Caixa</p>
                <p className="text-[11px] text-stone-500">Gera a NFC-e automaticamente a cada venda finalizada no balcão.</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 rounded-2xl border border-stone-200 bg-stone-50/50 cursor-pointer hover:bg-stone-50 transition-colors">
              <input
                type="checkbox"
                checked={config.enviar_whatsapp_automatico}
                onChange={e => setConfig({ ...config, enviar_whatsapp_automatico: e.target.checked })}
                className="w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
              />
              <div>
                <p className="text-xs font-bold text-stone-900">Envio Automático via WhatsApp</p>
                <p className="text-[11px] text-stone-500">Dispara o link do DANFE ao WhatsApp do cliente cadastrado.</p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Mensagem de Envio da Nota Fiscal no WhatsApp
            </label>
            <textarea
              rows={3}
              value={config.mensagem_whatsapp_nfe}
              onChange={e => setConfig({ ...config, mensagem_whatsapp_nfe: e.target.value })}
              className="w-full p-4 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-600 outline-none leading-relaxed"
            />
            <p className="text-[11px] text-stone-400 mt-1">
              Tags disponíveis: <code className="text-amber-800 font-bold">{'{NOME}'}</code>, <code className="text-amber-800 font-bold">{'{LINK_DANFE}'}</code>, <code className="text-amber-800 font-bold">{'{CHAVE_NFE}'}</code>, <code className="text-amber-800 font-bold">{'{NUMERO_NOTA}'}</code>, <code className="text-amber-800 font-bold">{'{VALOR}'}</code>.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-stone-100">
          <button
            type="submit"
            disabled={salvando}
            className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer disabled:bg-stone-300"
          >
            {salvando ? 'Salvando...' : 'Salvar Parâmetros Fiscais'}
          </button>
        </div>
      </form>

      {/* HISTÓRICO DE NOTAS FISCAIS EMITIDAS */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-stone-900">
              Histórico de Notas Fiscais Emitidas ({notas.length})
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Consulte e reimprima comprovantes fiscais ou reenvie por WhatsApp a qualquer momento
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={filtroBusca}
              onChange={e => setFiltroBusca(e.target.value)}
              placeholder="Buscar por número, CPF ou chave..."
              className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:border-amber-600 outline-none"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {notasFiltradas.length === 0 ? (
          <div className="text-center py-12 text-stone-400 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40 text-stone-400" />
            <p className="text-sm font-bold text-stone-700">Nenhuma nota fiscal emitida ainda</p>
            <p className="text-xs text-stone-400 mt-0.5">
              As notas emitidas no PDV ou através do botão "Emitir Nota de Teste" aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 uppercase font-black tracking-wider text-[10px]">
                  <th className="py-3 px-3">Nº / Série</th>
                  <th className="py-3 px-3">Data / Hora</th>
                  <th className="py-3 px-3">Cliente / CPF</th>
                  <th className="py-3 px-3">Valor</th>
                  <th className="py-3 px-3">Chave de Acesso</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {notasFiltradas.map(nota => {
                  const chaveFormat = formatarChaveAcesso(nota.chave_acesso);
                  const isCopiado = copiadoId === nota.id;

                  return (
                    <tr key={nota.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-stone-900 whitespace-nowrap">
                        NFC-e Nº {String(nota.numero).padStart(6, '0')}
                        <span className="text-[10px] text-stone-400 block font-normal">Série {nota.serie}</span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-stone-600">
                        {new Date(nota.data_emissao).toLocaleDateString('pt-BR')}
                        <span className="text-[10px] text-stone-400 block">
                          {new Date(nota.data_emissao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-stone-800 block truncate max-w-[150px]">
                          {nota.cliente_nome || 'Consumidor Final'}
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono block">
                          {nota.cliente_cpf ? formatarCpf(nota.cliente_cpf) : 'Sem CPF'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-stone-900 whitespace-nowrap">
                        R$ {nota.valor_total.toFixed(2)}
                        <span className="text-[10px] font-bold text-stone-400 block uppercase">
                          {nota.forma_pagamento}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-stone-600 truncate max-w-[140px] block" title={nota.chave_acesso}>
                            {chaveFormat}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopiarChave(nota.chave_acesso, nota.id)}
                            className="p-1 hover:bg-stone-200 text-stone-400 hover:text-stone-700 rounded-md transition-colors"
                            title="Copiar Chave Completa"
                          >
                            {isCopiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          nota.status === 'autorizada'
                            ? 'bg-emerald-100 text-emerald-800'
                            : nota.status === 'cancelada'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          <ShieldCheck className="w-3 h-3" />
                          {nota.status === 'autorizada' ? 'Autorizada' : nota.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => imprimirDanfeCupomFiscal(nota, config)}
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                            title="Imprimir Cupom DANFE"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setModalEnvioWhats({
                              isOpen: true,
                              nota,
                              telefone: nota.cliente_whatsapp ? formatPhoneDisplay(nota.cliente_whatsapp) : ''
                            })}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Enviar Comprovante pelo WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          <a
                            href={gerarLinkDanfeVisualizacao(nota, config)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                            title="Visualizar no Portal SEFAZ"
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

      {/* MODAL RÁPIDO DE REENVIO WHATSAPP */}
      {modalEnvioWhats.isOpen && modalEnvioWhats.nota && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-800 font-black">
                <Share2 className="w-5 h-5 text-emerald-600" />
                <span>Reenviar DANFE por WhatsApp</span>
              </div>
              <button
                type="button"
                onClick={() => setModalEnvioWhats({ isOpen: false, nota: null, telefone: '' })}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600">
              Informe o WhatsApp do cliente para enviar o comprovante da <strong>NFC-e Nº {modalEnvioWhats.nota.numero}</strong>:
            </p>

            <input
              type="tel"
              value={modalEnvioWhats.telefone}
              onChange={e => setModalEnvioWhats({ ...modalEnvioWhats, telefone: e.target.value })}
              placeholder="(44) 99876-5432"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono font-bold focus:border-emerald-600 outline-none"
              autoFocus
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalEnvioWhats({ isOpen: false, nota: null, telefone: '' })}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEnvioWhats}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Disparar WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
