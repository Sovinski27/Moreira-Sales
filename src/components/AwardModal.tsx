import React, { useEffect } from 'react';
import { Cliente, ConfiguracaoFidelidade } from '../types';
import { buildWhatsAppMessage, getWhatsAppUrl, formatPhoneDisplay } from '../services/whatsapp';
import { Gift, MessageCircle, CheckCircle, Sparkles, Coffee } from 'lucide-react';
import { fireCelebrationConfetti } from './ConfettiCelebration';

interface AwardModalProps {
  cliente: Cliente;
  comprasMes: number;
  config: ConfiguracaoFidelidade;
  onClose: () => void;
}

// Chime sonoro via Web Audio API (sem dependência de arquivos externos)
function playCelebrationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Toca acorde alegre (Dó - Mi - Sol - Dó maior)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + index * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.1 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + index * 0.1);
      osc.stop(ctx.currentTime + index * 0.1 + 0.45);
    });
  } catch (err) {
    console.debug('Audio play not allowed without interaction:', err);
  }
}

export const AwardModal: React.FC<AwardModalProps> = ({
  cliente,
  comprasMes,
  config,
  onClose
}) => {
  useEffect(() => {
    fireCelebrationConfetti();
    playCelebrationChime();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const whatsAppMessage = buildWhatsAppMessage(config.mensagem_whatsapp, {
    nome: cliente.nome,
    compras: comprasMes,
    premio: config.premio_descricao,
  });

  const whatsAppUrl = getWhatsAppUrl(cliente.whatsapp, whatsAppMessage);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="award-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border-4 border-emerald-500 animate-scaleUp max-h-[92vh] flex flex-col">
        
        {/* Topo comemorativo */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 p-5 sm:p-6 text-white text-center relative shrink-0">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-md rounded-full mb-2 sm:mb-3 ring-4 ring-white/30 animate-bounce">
            <Gift className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-pulse" />
            <span className="text-xs uppercase tracking-widest font-extrabold text-emerald-100">
              Meta Mensal de Fidelidade Atingida!
            </span>
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-3xl font-black tracking-tight">
            🎉 PARABÉNS AO CLIENTE!
          </h2>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1">
            Esta é a <strong className="text-white underline">{comprasMes}ª compra</strong> de {cliente.nome} este mês!
          </p>
        </div>

        {/* Corpo do Alerta */}
        <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
          {/* Instrução visual direta para a atendente */}
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-emerald-800 font-bold text-sm uppercase tracking-wide mb-1">
              <Coffee className="w-5 h-5 text-emerald-600" />
              Instrução para a Atendente:
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-950">
              🎁 ENTREGAR BRINDE:
            </div>
            <div className="text-lg font-bold text-emerald-700 mt-1 bg-white py-2 px-3 rounded-xl border border-emerald-200 shadow-sm">
              {config.premio_descricao}
            </div>
          </div>

          {/* Dados do cliente */}
          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 text-sm flex justify-between items-center">
            <div>
              <p className="text-stone-500 text-xs font-semibold">Cliente:</p>
              <p className="font-bold text-stone-800 text-base">{cliente.nome}</p>
            </div>
            <div className="text-right">
              <p className="text-stone-500 text-xs font-semibold">WhatsApp:</p>
              <p className="font-mono text-stone-700 font-medium">{formatPhoneDisplay(cliente.whatsapp)}</p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-2 pt-2">
            {/* Disparo WhatsApp */}
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 px-4 rounded-xl font-bold text-base shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <MessageCircle className="w-5 h-5 fill-white" />
              Enviar Mensagem Comemorativa no WhatsApp
            </a>

            {/* Confirmar e Próximo */}
            <button
              onClick={onClose}
              className="w-full inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white py-3.5 px-4 rounded-xl font-bold text-base transition-all active:scale-[0.98]"
            >
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              Brinde Entregue! Próximo Atendimento
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
