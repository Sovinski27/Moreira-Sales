import React, { useState } from 'react';
import { X, Printer, QrCode, ExternalLink, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface QrCodeMesasModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalMesas?: number;
}

export const QrCodeMesasModal: React.FC<QrCodeMesasModalProps> = ({
  isOpen,
  onClose,
  totalMesas = 20
}) => {
  const [mesaSelecionada, setMesaSelecionada] = useState<number>(1);
  const [copiado, setCopiado] = useState(false);

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const urlMesa = `${baseUrl}/cardapio?mesa=${mesaSelecionada}`;

  const handleCopiarLink = () => {
    navigator.clipboard.writeText(urlMesa);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 overflow-y-auto p-3 sm:p-4 md:p-6 flex items-center justify-center animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-auto animate-scaleUp overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[88vh] border border-stone-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Compacto e Elegante */}
        <div className="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-white p-4 sm:p-5 relative shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                QR Codes do Cardápio das Mesas
              </h3>
              <p className="text-xs text-amber-200/80">
                Selecione a mesa para visualizar, copiar o link ou imprimir o display.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo com Grid Responsivo de 2 Colunas */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            
            {/* Coluna 1: Seletor de Mesas e Ações Rápidas */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-2">
                  Selecione a Mesa:
                </label>
                {/* Grade compacta sem barra de rolagem interna feia */}
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                  {Array.from({ length: totalMesas }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMesaSelecionada(num)}
                      className={`py-2 px-1 rounded-xl font-bold text-xs transition-all text-center cursor-pointer ${
                        mesaSelecionada === num
                          ? 'bg-amber-600 text-white shadow-xs scale-102 ring-2 ring-amber-400/30'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-900'
                      }`}
                    >
                      {num < 10 ? `0${num}` : num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Caixa de Link Direto com Copiar */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
                  Link Direto da Mesa {mesaSelecionada < 10 ? `0${mesaSelecionada}` : mesaSelecionada}:
                </span>
                <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 text-xs font-mono text-stone-700">
                  <span className="truncate flex-1">{urlMesa}</span>
                  <button
                    type="button"
                    onClick={handleCopiarLink}
                    className="text-amber-700 hover:text-amber-800 font-sans font-bold flex items-center gap-1 shrink-0 px-2 py-1 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiado ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Botão de Testar no Navegador */}
              <a
                href={urlMesa}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Cardápio da Mesa {mesaSelecionada < 10 ? `0${mesaSelecionada}` : mesaSelecionada}</span>
              </a>
            </div>

            {/* Coluna 2: Preview do Display de Mesa / Cartão de Impressão */}
            <div className="flex flex-col items-center">
              <div className="w-full bg-[#FAF8F5] border-2 border-stone-200/80 rounded-3xl p-5 flex flex-col items-center text-center shadow-xs">
                {/* Logo e Nome */}
                <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-black text-sm mb-2 shadow-xs">
                  MS
                </div>
                <h4 className="text-sm font-black text-stone-900 leading-tight">
                  Panificadora Moreira Sales
                </h4>
                
                {/* Badge da Mesa */}
                <div className="inline-block bg-amber-100 text-amber-900 font-black text-xs px-3.5 py-1 rounded-full my-2 border border-amber-200/60">
                  MESA {mesaSelecionada < 10 ? `0${mesaSelecionada}` : mesaSelecionada}
                </div>

                {/* QR Code com borda limpa */}
                <div className="bg-white p-3 rounded-2xl shadow-xs border border-stone-200/80 my-1">
                  <QRCodeSVG
                    value={urlMesa}
                    size={135}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                <p className="text-xs font-bold text-stone-800 mt-2">
                  Aponte a câmera do celular para pedir
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Seu pedido vai direto para a nossa cozinha! ☕🥖
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Footer com Ações */}
        <div className="p-3.5 sm:p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-stone-500 font-medium hidden sm:inline">
            Mesa {mesaSelecionada < 10 ? `0${mesaSelecionada}` : mesaSelecionada} de {totalMesas} mesas
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleImprimir}
              className="flex-1 sm:flex-initial py-2.5 px-4 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir QR Code</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
