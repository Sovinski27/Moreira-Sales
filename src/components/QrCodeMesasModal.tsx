import React, { useState } from 'react';
import { X, Printer, QrCode, ExternalLink, Copy, Check, Globe } from 'lucide-react';
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

  const getInitialBaseUrl = () => {
    if (typeof window !== 'undefined') {
      const salvo = localStorage.getItem('moreira_sales_cardapio_domain');
      if (salvo && salvo.trim()) return salvo.trim();

      const origin = window.location.origin;
      // Se estiver em produção ou na Vercel, utiliza a URL atual exata
      if (origin && !origin.includes('localhost')) {
        return origin;
      }
    }
    // URL padrão oficial da Vercel (onde o sistema está online)
    return 'https://moreira-sales.vercel.app';
  };

  const [baseUrl, setBaseUrl] = useState<string>(getInitialBaseUrl);
  const [editandoDominio, setEditandoDominio] = useState(false);

  if (!isOpen) return null;

  const cleanBaseUrl = baseUrl.trim().replace(/\/$/, '');
  const urlMesa = `${cleanBaseUrl}/cardapio?mesa=${mesaSelecionada}`;

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

              {/* Indicador e Controle do Domínio Online (Vercel) */}
              <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-amber-600" />
                    <span>Domínio Online (Vercel):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditandoDominio(!editandoDominio)}
                    className="text-[11px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                  >
                    {editandoDominio ? 'Concluir' : 'Alterar Link'}
                  </button>
                </div>

                {editandoDominio ? (
                  <div className="flex gap-1.5 items-center pt-1">
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={e => {
                        setBaseUrl(e.target.value);
                        localStorage.setItem('moreira_sales_cardapio_domain', e.target.value);
                      }}
                      placeholder="https://moreira-sales.vercel.app"
                      className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-mono outline-none focus:border-amber-600"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setBaseUrl('https://moreira-sales.vercel.app');
                        localStorage.setItem('moreira_sales_cardapio_domain', 'https://moreira-sales.vercel.app');
                      }}
                      className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-xl shrink-0 transition-colors cursor-pointer"
                    >
                      Padrão
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate font-mono">{cleanBaseUrl}</span>
                  </p>
                )}
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

              {/* Botões de Ação para Teste */}
              <div className="space-y-2">
                <a
                  href={urlMesa}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir Cardápio Online na Vercel (Mesa {mesaSelecionada < 10 ? `0${mesaSelecionada}` : mesaSelecionada})</span>
                </a>

                <a
                  href={`/cardapio?mesa=${mesaSelecionada}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Testar Cardápio Neste Navegador (Aba Local)</span>
                </a>
              </div>
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
