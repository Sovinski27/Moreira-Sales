import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, ChefHat, Calendar, Clock, Scale, Flame, Award, FileText } from 'lucide-react';
import { Produto, Insumo, FichaTecnica, ReceitaMetadata } from '../types';
import { converterParaUnidadeBase } from '../services/db';

interface FichaTecnicaImpressaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  produto: Produto;
  fichas: FichaTecnica[];
  insumos: Insumo[];
  metadata?: ReceitaMetadata | null;
}

export const FichaTecnicaImpressaoModal: React.FC<FichaTecnicaImpressaoModalProps> = ({
  isOpen,
  onClose,
  produto,
  fichas,
  insumos,
  metadata
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const ingredientesProduto = fichas.filter(f => f.produto_id === produto.id);
  const rendimentoUnidades = (ingredientesProduto[0]?.rendimento_unidades && ingredientesProduto[0].rendimento_unidades > 0)
    ? ingredientesProduto[0].rendimento_unidades
    : 1;

  let totalCustoBatelada = 0;
  const linhasIngredientes = ingredientesProduto.map(f => {
    const ins = insumos.find(i => i.id === f.insumo_id);
    const unidadeExibida = f.unidade_medida || ins?.unidade_medida || 'un';
    const qtdExibida = f.quantidade_original !== undefined ? f.quantidade_original : f.quantidade_utilizada;
    const qtdBase = ins ? converterParaUnidadeBase(qtdExibida, unidadeExibida, ins.unidade_medida) : 0;
    const custo = ins ? qtdBase * ins.preco_custo : 0;
    totalCustoBatelada += custo;

    return {
      nome: ins ? ins.nome : '(Insumo não localizado)',
      quantidadeFormatada: `${qtdExibida} ${unidadeExibida}`,
      custo: custo,
      consumoUnitario: `${(qtdExibida / rendimentoUnidades) < 1 ? (qtdExibida / rendimentoUnidades).toFixed(3) : (qtdExibida / rendimentoUnidades).toFixed(2)} ${unidadeExibida}`
    };
  });

  const custoPorUnidade = rendimentoUnidades > 0 ? (totalCustoBatelada / rendimentoUnidades) : 0;
  const tipoUnidadeNome = metadata?.tipo_unidade || 'unidade(s)';

  const handlePrint = () => {
    window.print();
  };

  const formatMoney = (v: number) => `R$ ${(Number(v) || 0).toFixed(2)}`;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static">
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-stone-200 overflow-hidden print:shadow-none print:border-none print:max-w-none print:max-h-none print:w-full print:rounded-none"
        onClick={e => e.stopPropagation()}
      >
        {/* Barra superior de ações (oculta na impressão) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 bg-stone-50 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Visualização de Impressão Oficial</h3>
              <p className="text-[11px] text-stone-500">Modelo padrão Panificadora Moreira Sales Loja I-II</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Ficha (A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FOLHA DA FICHA TÉCNICA - RÉPLICA FIEL DO DOCUMENTO OFICIAL */}
        <div className="p-6 sm:p-8 overflow-y-auto print:p-6 print:overflow-visible text-stone-900 font-sans print:text-black">
          <div className="border-2 border-stone-800 rounded-xl p-5 sm:p-6 space-y-4 print:border-black print:rounded-none">
            {/* CABEÇALHO DA PADARIA */}
            <div className="text-center border-b-2 border-stone-800 pb-3">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-stone-950">
                FICHA TÉCNICA
              </h1>
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-amber-900 print:text-black">
                PANIFICADORA MOREIRA SALES
              </h2>
              <p className="text-xs sm:text-sm font-semibold tracking-widest text-stone-600 print:text-stone-800 uppercase">
                LOJA I - II
              </p>
            </div>

            {/* DADOS DE IDENTIFICAÇÃO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 border border-stone-800 divide-y sm:divide-y-0 sm:divide-x divide-stone-800 text-xs sm:text-sm">
              <div className="p-2 flex items-center gap-1.5">
                <span className="font-black uppercase text-stone-700">RESPONSÁVEL:</span>
                <span className="font-bold text-stone-900">{metadata?.responsavel || 'Marlene'}</span>
              </div>
              <div className="p-2 flex items-center gap-1.5">
                <span className="font-black uppercase text-stone-700">CÓDIGO:</span>
                <span className="font-bold text-stone-900">{metadata?.codigo || `FT-${produto.id.slice(0, 6).toUpperCase()}`}</span>
              </div>
              <div className="p-2 flex items-center gap-1.5">
                <span className="font-black uppercase text-stone-700">DATA:</span>
                <span className="font-bold text-stone-900">{metadata?.data || new Date().toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {/* PRODUTO */}
            <div className="border border-stone-800 p-2.5 text-xs sm:text-sm bg-stone-50/50 print:bg-transparent">
              <span className="font-black uppercase text-stone-700 mr-2">PRODUTO:</span>
              <span className="font-black text-base sm:text-lg text-amber-950 print:text-black uppercase">
                {produto.nome}
              </span>
            </div>

            {/* TABELA DE INGREDIENTES */}
            <div className="border border-stone-800 overflow-hidden">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 bg-stone-100 print:bg-stone-200">
                    <th className="p-2.5 font-black uppercase text-stone-800 w-1/2 border-r border-stone-800">
                      INGREDIENTES
                    </th>
                    <th className="p-2.5 font-black uppercase text-stone-800 w-1/4 border-r border-stone-800 text-center">
                      QUANTIDADE
                    </th>
                    <th className="p-2.5 font-black uppercase text-stone-800 w-1/4 text-right">
                      TOTAL (R$)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-300">
                  {linhasIngredientes.map((ing, i) => (
                    <tr key={i} className="hover:bg-stone-50/50">
                      <td className="p-2.5 border-r border-stone-800 font-semibold text-stone-900">
                        {ing.nome}
                      </td>
                      <td className="p-2.5 border-r border-stone-800 text-center font-bold text-stone-800">
                        {ing.quantidadeFormatada}
                      </td>
                      <td className="p-2.5 text-right font-bold text-stone-900 font-mono">
                        {formatMoney(ing.custo)}
                      </td>
                    </tr>
                  ))}
                  {/* Linhas vazias para manter o formato padronizado como na folha física */}
                  {linhasIngredientes.length < 5 && Array.from({ length: 5 - linhasIngredientes.length }).map((_, idx) => (
                    <tr key={`blank-${idx}`} className="h-8">
                      <td className="p-2.5 border-r border-stone-800 text-stone-300 italic">&nbsp;</td>
                      <td className="p-2.5 border-r border-stone-800 text-center text-stone-300">&nbsp;</td>
                      <td className="p-2.5 text-right text-stone-300">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-stone-800 bg-amber-50/60 print:bg-stone-100 font-bold">
                    <td colSpan={2} className="p-2.5 text-right uppercase tracking-wider text-xs sm:text-sm font-black text-stone-900 border-r border-stone-800">
                      CUSTO TOTAL DA BATELADA:
                    </td>
                    <td className="p-2.5 text-right font-black text-base text-red-600 print:text-black font-mono">
                      {formatMoney(totalCustoBatelada)}
                    </td>
                  </tr>
                  <tr className="border-t border-stone-300 bg-amber-100/50 print:bg-stone-200 font-bold">
                    <td colSpan={2} className="p-2 text-right uppercase tracking-wider text-xs font-black text-stone-900 border-r border-stone-800">
                      CUSTO POR {tipoUnidadeNome.toUpperCase()}:
                    </td>
                    <td className="p-2 text-right font-black text-sm text-stone-900 font-mono">
                      {formatMoney(custoPorUnidade)} / {tipoUnidadeNome}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* SEÇÃO TÉCNICA DE PRODUÇÃO / RENDIMENTO */}
            <div className="border border-stone-800 divide-y divide-stone-800 text-xs sm:text-sm">
              <div className="grid grid-cols-2 divide-x divide-stone-800">
                <div className="p-2 flex justify-between items-center">
                  <span className="font-black uppercase text-stone-700">RENDIMENTO CRU:</span>
                  <span className="font-bold text-stone-900">{metadata?.rendimento_cru || '—'}</span>
                </div>
                <div className="p-2 flex justify-between items-center">
                  <span className="font-black uppercase text-stone-700">RENDIMENTO ASSADO:</span>
                  <span className="font-bold text-stone-900">{metadata?.rendimento_assado || '—'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-stone-800">
                <div className="p-2 flex justify-between items-center">
                  <span className="font-black uppercase text-stone-700">RENDIMENTO TOTAL:</span>
                  <span className="font-bold text-stone-900">
                    {metadata?.rendimento_total || `${rendimentoUnidades} ${tipoUnidadeNome}`}
                  </span>
                </div>
                <div className="p-2 flex justify-between items-center">
                  <span className="font-black uppercase text-stone-700">QUEBRA (PERDA):</span>
                  <span className="font-bold text-stone-900">{metadata?.quebra || '—'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-stone-800">
                <div className="p-2 flex justify-between items-center">
                  <span className="font-black uppercase text-stone-700">UNIDADE / RENDIMENTO:</span>
                  <span className="font-black text-amber-900 print:text-black">
                    {rendimentoUnidades} {tipoUnidadeNome}
                  </span>
                </div>
                <div className="p-2 flex justify-between items-center">
                  <span className="font-black uppercase text-stone-700">PESO POR UNIDADE:</span>
                  <span className="font-bold text-stone-900">{metadata?.peso_por_unidade || '—'}</span>
                </div>
              </div>

              <div className="p-2 flex justify-between items-center bg-stone-50/50 print:bg-transparent">
                <span className="font-black uppercase text-stone-700">TEMPO DE PREPARO:</span>
                <span className="font-black text-stone-900">{metadata?.tempo_preparo || '—'}</span>
              </div>
            </div>

            {/* SEÇÃO MODO DE PREPARO */}
            <div className="border border-stone-800">
              <div className="bg-stone-100 print:bg-stone-200 p-2 font-black uppercase text-xs sm:text-sm text-stone-800 border-b border-stone-800">
                MODO DE PREPARO:
              </div>
              <div className="p-3 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed min-h-[90px] font-medium text-stone-800">
                {metadata?.modo_preparo ? (
                  metadata.modo_preparo
                ) : (
                  <p className="text-stone-400 italic">
                    Nenhum modo de preparo inserido para esta ficha técnica. Clique em "Editar Receita" para registrar os passos de preparo.
                  </p>
                )}
              </div>
            </div>

            {/* OBSERVAÇÕES E ASSINATURA */}
            <div className="pt-2 flex flex-col sm:flex-row justify-between items-end gap-4 text-xs text-stone-500">
              <p className="text-[10px]">
                Ficha Técnica Operacional • Panificadora Moreira Sales • Controle Interno de Qualidade e CMV
              </p>
              <div className="border-t border-stone-400 pt-1 text-center min-w-[200px]">
                <span className="text-[11px] font-bold text-stone-700">Visto do Responsável da Produção</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
