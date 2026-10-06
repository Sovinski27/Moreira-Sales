import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  FileText, 
  CheckCircle2, 
  Copy, 
  Check, 
  Send, 
  Receipt,
  ExternalLink,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { NotaFiscal, ConfiguracaoFiscal } from '../types';
import { 
  formatarChaveAcesso, 
  formatarCpf, 
  imprimirDanfeCupomFiscal, 
  enviarDanfeWhatsApp, 
  gerarLinkDanfeVisualizacao 
} from '../services/nfeService';
import { formatPhoneDisplay, cleanPhone } from '../services/whatsapp';

interface ModalEmissaoNfeProps {
  isOpen: boolean;
  nota: NotaFiscal | null;
  configFiscal: ConfiguracaoFiscal;
  webhookUrlWhatsApp?: string;
  onClose: () => void;
}

export const ModalEmissaoNfe: React.FC<ModalEmissaoNfeProps> = ({
  isOpen,
  nota,
  configFiscal,
  webhookUrlWhatsApp,
  onClose,
}) => {
  const [copiado, setCopiado] = useState(false);
  const [telefoneDestino, setTelefoneDestino] = useState('');
  const [enviandoWhats, setEnviandoWhats] = useState(false);
  const [whatsEnviadoSucesso, setWhatsEnviadoSucesso] = useState(false);
  const [erroWhats, setErroWhats] = useState<string | null>(null);

  useEffect(() => {
    if (nota) {
      setTelefoneDestino(nota.cliente_whatsapp ? formatPhoneDisplay(nota.cliente_whatsapp) : '');
      setCopiado(false);
      setWhatsEnviadoSucesso(nota.enviada_whatsapp);
    }
  }, [nota]);

  if (!isOpen || !nota) return null;

  const chaveFormatada = formatarChaveAcesso(nota.chave_acesso);
  const linkDanfe = gerarLinkDanfeVisualizacao(nota, configFiscal);

  const handleCopiarChave = () => {
    navigator.clipboard.writeText(nota.chave_acesso);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const handleImprimir = () => {
    imprimirDanfeCupomFiscal(nota, configFiscal);
  };

  const handleEnviarWhatsApp = async () => {
    const digits = cleanPhone(telefoneDestino);
    if (!digits || digits.length < 10) {
      setErroWhats('Por favor, informe o WhatsApp do cliente com DDD (mínimo 10 dígitos).');
      return;
    }
    setErroWhats(null);

    setEnviandoWhats(true);
    try {
      const res = await enviarDanfeWhatsApp(
        nota,
        digits,
        nota.cliente_nome,
        webhookUrlWhatsApp
      );

      setWhatsEnviadoSucesso(true);

      // Abre a conversa com mensagem preenchida
      window.open(res.urlWhatsApp, '_blank');
    } catch (e) {
      console.error('Erro ao enviar DANFE via WhatsApp:', e);
      setErroWhats('Erro ao enviar mensagem pelo WhatsApp. Verifique a conexão.');
    } finally {
      setEnviandoWhats(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* CABEÇALHO */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
            title="Fechar (ESC)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-inner shrink-0">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/40 text-emerald-100 text-[11px] font-bold uppercase tracking-wider mb-1 border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5" />
                SEFAZ Autorizada
              </span>
              <h3 className="text-xl font-black tracking-tight leading-tight">
                Nota Fiscal Emitida com Sucesso!
              </h3>
              <p className="text-xs text-emerald-100 mt-0.5 font-medium">
                NFC-e Nº {String(nota.numero).padStart(6, '0')} • Série {nota.serie}
              </p>
            </div>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* CARTÃO RESUMO DA NOTA */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200/60 pb-3">
              <div>
                <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Valor Total</p>
                <p className="text-2xl font-black font-mono text-stone-900">
                  R$ {nota.valor_total.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Forma Pagto</p>
                <span className="inline-block px-2.5 py-1 bg-white border border-stone-200 text-stone-800 font-extrabold text-xs rounded-lg uppercase">
                  {nota.forma_pagamento}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-stone-500 font-semibold block text-[11px]">Consumidor:</span>
                <span className="font-bold text-stone-800 truncate block">
                  {nota.cliente_nome || 'Consumidor Final'}
                </span>
              </div>
              <div>
                <span className="text-stone-500 font-semibold block text-[11px]">CPF na Nota:</span>
                <span className="font-bold text-stone-800 font-mono block">
                  {nota.cliente_cpf ? formatarCpf(nota.cliente_cpf) : 'Não informado'}
                </span>
              </div>
            </div>

            {/* CHAVE DE ACESSO */}
            <div className="pt-2 border-t border-stone-200/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                  Chave de Acesso (44 Dígitos)
                </span>
                <button
                  type="button"
                  onClick={handleCopiarChave}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiado ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-stone-200 font-mono text-[11px] font-bold text-stone-700 select-all tracking-wider break-all text-center">
                {chaveFormatada}
              </div>
            </div>
          </div>

          {/* DISPARO VIA WHATSAPP AO CLIENTE */}
          <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
              <Share2 className="w-4 h-4 text-emerald-700" />
              <span>Enviar DANFE e Comprovante via WhatsApp</span>
            </div>
            
            <p className="text-xs text-stone-600 leading-relaxed">
              O cliente receberá a mensagem oficial com o link de visualização do DANFE e a chave de acesso direto no celular.
            </p>

            <div className="flex gap-2">
              <input
                type="tel"
                value={telefoneDestino}
                onChange={e => setTelefoneDestino(e.target.value)}
                placeholder="(44) 99876-5432"
                className="flex-1 px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm font-mono font-bold focus:border-emerald-600 outline-none"
              />
              <button
                type="button"
                onClick={handleEnviarWhatsApp}
                disabled={enviandoWhats}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>{enviandoWhats ? 'Enviando...' : 'Enviar'}</span>
              </button>
            </div>

            {erroWhats && (
              <p className="text-xs font-bold text-rose-600 flex items-center gap-1 mt-1 animate-fadeIn">
                <span>✕ {erroWhats}</span>
              </p>
            )}

            {whatsEnviadoSucesso && (
              <p className="text-xs font-bold text-emerald-800 flex items-center gap-1 mt-1">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                Comprovante enviado com sucesso para o cliente!
              </p>
            )}
          </div>

          {/* AÇÕES DE IMPRESSÃO E CONSULTA */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleImprimir}
              className="py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold text-xs sm:text-sm border border-stone-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-stone-600" />
              <span>Imprimir Cupom</span>
            </button>

            <a
              href={linkDanfe}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 bg-white hover:bg-stone-50 text-stone-800 rounded-xl font-bold text-xs sm:text-sm border border-stone-300 transition-colors flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <ExternalLink className="w-4 h-4 text-stone-600" />
              <span>Ver no Portal</span>
            </a>
          </div>

        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-3">
          <span className="text-[11px] text-stone-500 font-medium">
            Protocolo: {nota.protocolo_autorizacao}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
          >
            Concluir / Próximo Cliente
          </button>
        </div>

      </div>
    </div>
  );
};
