import React, { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { NotaFiscal, ConfiguracaoFiscal } from '../types';
import { fetchConfigFiscal } from '../services/db';
import { formatarChaveAcesso, baixarXmlNota } from '../services/nfeService';
import { Printer, Download, Share2, X, CheckCircle2, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';

interface DanfeModalProps {
  nota: NotaFiscal | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DanfeModal: React.FC<DanfeModalProps> = ({ nota, isOpen, onClose }) => {
  const [config, setConfig] = useState<ConfiguracaoFiscal | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConfigFiscal().then(setConfig);
    }
  }, [isOpen]);

  if (!isOpen || !nota) return null;

  const dataFormatada = new Date(nota.data_emissao).toLocaleString('pt-BR');
  const isCancelada = nota.status === 'cancelada';

  const handlePrint = () => {
    window.print();
  };

  const handleCompartilharWhatsApp = () => {
    const texto = `🥖 *Panificadora Moreira Sales* - Cupom Fiscal Eletrônico (NFC-e)%0A%0A` +
      `*NFC-e Nº:* ${nota.numero} (Série ${nota.serie})%0A` +
      `*Valor Total:* R$ ${nota.valor_total.toFixed(2)}%0A` +
      `*Data/Hora:* ${dataFormatada}%0A` +
      `*Chave de Acesso:* ${nota.chave_acesso}%0A%0A` +
      `Consulte seu cupom fiscal pelo QR Code ou no portal da SEFAZ:%0A` +
      `${encodeURIComponent(nota.qr_code_url || '')}`;

    const fone = nota.cliente_telefone ? nota.cliente_telefone.replace(/\D/g, '') : '';
    const url = fone 
      ? `https://api.whatsapp.com/send?phone=55${fone}&text=${texto}`
      : `https://api.whatsapp.com/send?text=${texto}`;
      
    window.open(url, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto p-2 sm:p-4 flex items-center justify-center bg-stone-900/80 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-lg my-auto overflow-hidden shadow-2xl animate-scaleUp max-h-[calc(100vh-2rem)] flex flex-col border border-stone-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Barra Superior de Ações */}
        <div className="flex items-center justify-between p-4 bg-stone-900 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-black tracking-wide">
                DANFE NFC-e Nº {nota.numero}
              </h3>
              <p className="text-[10px] text-stone-400">
                {nota.ambiente === 'homologacao' ? 'Ambiente de Testes (Homologação)' : 'Ambiente Oficial de Produção'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 text-stone-300 hover:text-white hover:bg-stone-800 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold"
              title="Imprimir Cupom Térmico (80mm / A4)"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              type="button"
              onClick={() => baixarXmlNota(nota)}
              className="p-2 text-stone-300 hover:text-white hover:bg-stone-800 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold"
              title="Baixar XML da SEFAZ"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">XML</span>
            </button>
            <button
              type="button"
              onClick={handleCompartilharWhatsApp}
              className="p-2 text-stone-300 hover:text-white hover:bg-stone-800 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold"
              title="Enviar Cupom via WhatsApp"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ÁREA DO CUPOM FISCAL TÉRMICO DANFE (ESTILO IMPRESSORA TÉRMICA) */}
        <div className="overflow-y-auto p-4 sm:p-6 bg-stone-100 flex justify-center">
          <div 
            ref={printRef}
            className={`w-full max-w-[380px] bg-white p-5 rounded-2xl shadow-sm border border-stone-200 font-mono text-[11px] leading-tight text-stone-900 select-all print:shadow-none print:border-none print:w-full print:p-0 ${
              isCancelada ? 'opacity-85 relative' : ''
            }`}
          >
            {/* Faixa de Cancelamento se aplicável */}
            {isCancelada && (
              <div className="bg-rose-50 border-2 border-rose-400 text-rose-800 p-2.5 rounded-xl mb-3 text-center">
                <div className="flex items-center justify-center gap-1.5 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>NFC-e CANCELADA NA SEFAZ</span>
                </div>
                {nota.motivo_cancelamento && (
                  <p className="text-[10px] text-rose-700 mt-1">
                    Motivo: {nota.motivo_cancelamento}
                  </p>
                )}
                {nota.protocolo_cancelamento && (
                  <p className="text-[9px] text-rose-600 font-mono mt-0.5">
                    Prot. Canc: {nota.protocolo_cancelamento}
                  </p>
                )}
              </div>
            )}

            {/* Cabeçalho do Emitente */}
            <div className="text-center border-b border-dashed border-stone-300 pb-3 mb-3">
              <h4 className="font-black text-sm uppercase tracking-tight text-stone-950">
                {config?.nome_fantasia || 'Panificadora Moreira Sales'}
              </h4>
              <p className="text-[10px] text-stone-600 font-sans mt-0.5">
                {config?.razao_social || 'Panificadora & Confeitaria Moreira Sales Ltda'}
              </p>
              <p className="text-[10px] text-stone-600 font-sans">
                CNPJ: {config?.cnpj || '12.345.678/0001-90'} • IE: {config?.inscricao_estadual || '90812345-67'}
              </p>
              <p className="text-[10px] text-stone-500 font-sans mt-0.5">
                {config?.endereco ? `${config.endereco.logradouro}, ${config.endereco.numero} - ${config.endereco.bairro}` : 'Av. Brasil, 1500 - Centro'}
              </p>
              <p className="text-[10px] text-stone-500 font-sans">
                {config?.endereco ? `${config.endereco.municipio} / ${config.endereco.uf} • CEP ${config.endereco.cep}` : 'Moreira Sales / PR'}
              </p>
            </div>

            {/* Identificação do Documento DANFE */}
            <div className="text-center border-b border-dashed border-stone-300 pb-2.5 mb-3">
              <p className="font-bold text-xs uppercase text-stone-950">
                DANFE NFC-e - Documento Auxiliar
              </p>
              <p className="text-[10px] text-stone-600">
                da Nota Fiscal de Consumidor Eletrônica
              </p>
              <p className="text-[9px] text-stone-500 mt-0.5">
                Não permite aproveitamento de crédito de ICMS
              </p>
            </div>

            {/* Lista de Itens */}
            <div className="border-b border-dashed border-stone-300 pb-3 mb-3">
              <div className="flex justify-between font-bold text-[10px] border-b border-stone-200 pb-1 mb-1.5 uppercase text-stone-700">
                <span># Item / Descrição</span>
                <span>Total</span>
              </div>
              <div className="space-y-1.5">
                {nota.itens.map((item, idx) => (
                  <div key={item.id || idx}>
                    <div className="flex justify-between items-start font-medium text-stone-900">
                      <span className="truncate pr-2 max-w-[240px]">
                        {idx + 1}. {item.nome}
                      </span>
                      <span className="font-bold shrink-0">
                        R$ {item.valor_total.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[9px] text-stone-500 font-sans">
                      <span>
                        {item.quantidade} {item.unidade} x R$ {item.valor_unitario.toFixed(2)}
                      </span>
                      <span>NCM: {item.ncm}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totais do Cupom */}
            <div className="border-b border-dashed border-stone-300 pb-3 mb-3 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-stone-600">Qtd. Total de Itens:</span>
                <span className="font-bold">{nota.itens.reduce((acc, i) => acc + i.quantidade, 0)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-stone-600">Subtotal Produtos:</span>
                <span>R$ {nota.valor_produtos.toFixed(2)}</span>
              </div>
              {nota.valor_desconto > 0 && (
                <div className="flex justify-between text-[11px] text-emerald-700">
                  <span>Desconto:</span>
                  <span>- R$ {nota.valor_desconto.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-black pt-1 border-t border-stone-200 text-stone-950">
                <span>VALOR TOTAL R$:</span>
                <span className="text-sm">R$ {nota.valor_total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-stone-600 pt-1">
                <span>Forma de Pagamento:</span>
                <span className="font-bold uppercase">{nota.forma_pagamento.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Informações da Lei dos Tributos (IBPT) */}
            <div className="border-b border-dashed border-stone-300 pb-2.5 mb-3 text-[9px] text-stone-600 font-sans">
              <p>
                Informação dos Tributos Totais Incidentes (Lei Federal 12.741/2012):
                <strong> R$ {nota.valor_tributos_estimados.toFixed(2)}</strong> (Fonte: IBPT)
              </p>
            </div>

            {/* Destinatário (Consumidor) */}
            <div className="border-b border-dashed border-stone-300 pb-2.5 mb-3 text-[10px] font-sans">
              <p className="font-bold uppercase text-stone-800">Consumidor:</p>
              {nota.cliente_cpf_cnpj ? (
                <>
                  <p className="text-stone-700">
                    CPF/CNPJ: <strong>{nota.cliente_cpf_cnpj}</strong>
                  </p>
                  {nota.cliente_nome && (
                    <p className="text-stone-700">Nome: {nota.cliente_nome}</p>
                  )}
                </>
              ) : (
                <p className="text-stone-500 italic">CONSUMIDOR NÃO IDENTIFICADO</p>
              )}
            </div>

            {/* Detalhes da Emissão SEFAZ */}
            <div className="border-b border-dashed border-stone-300 pb-3 mb-3 text-center text-[10px]">
              <p className="font-bold text-stone-900">
                NFC-e Nº {nota.numero} • Série {nota.serie}
              </p>
              <p className="text-[9px] text-stone-500 mt-0.5">
                Emissão: {dataFormatada}
              </p>
              <p className="text-[9px] text-stone-600 font-mono mt-1">
                Protocolo: {nota.protocolo_autorizacao}
              </p>
              
              {/* Chave de Acesso */}
              <div className="mt-2 p-2 bg-stone-50 rounded-lg border border-stone-200">
                <p className="text-[8px] uppercase tracking-wider text-stone-500 font-sans mb-0.5">
                  Chave de Acesso
                </p>
                <p className="font-mono text-[9px] font-bold text-stone-800 tracking-wider break-all">
                  {formatarChaveAcesso(nota.chave_acesso)}
                </p>
              </div>
            </div>

            {/* QR Code SEFAZ para Validação no Celular */}
            <div className="text-center pt-1 flex flex-col items-center">
              <p className="text-[9px] text-stone-500 font-sans mb-2">
                Consulte pela Chave de Acesso ou QR Code pelo leitor do seu celular:
              </p>
              
              <div className="p-2.5 bg-white border border-stone-300 rounded-xl inline-block shadow-2xs">
                <QRCodeSVG 
                  value={nota.qr_code_url || 'https://fazenda.gov.br'} 
                  size={120} 
                  level="M"
                  includeMargin={false}
                />
              </div>

              <div className="mt-2 flex items-center justify-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>SEFAZ / PR • Autorizada</span>
              </div>

              {nota.ambiente === 'homologacao' && (
                <p className="text-[8px] font-bold text-amber-700 uppercase mt-2">
                  *** EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL ***
                </p>
              )}
            </div>

          </div>
        </div>

        {/* Rodapé com botões de fechar e imprimir */}
        <div className="p-4 bg-white border-t border-stone-100 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCompartilharWhatsApp}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar Cupom WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimir DANFE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
