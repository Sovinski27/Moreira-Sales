import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Scale, X, Check, Calculator, Sparkles, Search } from 'lucide-react';
import { Produto } from '../types';

export interface ResultadoPesoProduto {
  produto: Produto;
  nomeFormatado: string;
  pesoGramas: number;
  medidaLabel: string;
  precoCalculado: number;
  observacao?: string;
}

interface PesoProdutoModalProps {
  isOpen: boolean;
  produto?: Produto | null;
  produtosCatalogo?: Produto[];
  mostrarCampoObservacao?: boolean;
  onClose: () => void;
  onConfirm: (resultado: ResultadoPesoProduto) => void;
}

export function ehProdutoPorPeso(produto?: Produto | null): boolean {
  if (!produto) return false;
  const un = (produto.unidade_venda || '').trim().toLowerCase();
  if (un === 'kg' || un === '100 g' || un === '100g' || un === 'g') {
    return true;
  }
  const nomeNorm = (produto.nome || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (
    nomeNorm.includes('mussarela') ||
    nomeNorm.includes('mucarela') ||
    nomeNorm.includes('presunto') ||
    nomeNorm.includes('mortadela') ||
    nomeNorm.includes('salame')
  ) {
    return true;
  }
  return false;
}

export function formatarMedidaPeso(pesoGramas: number, unidadePreferida?: 'g' | 'kg'): string {
  if (pesoGramas <= 0) return '0g';
  if (unidadePreferida === 'kg' && pesoGramas >= 1000) {
    const kg = pesoGramas / 1000;
    return `${kg.toLocaleString('pt-BR', { minimumFractionDigits: kg % 1 === 0 ? 0 : 2, maximumFractionDigits: 3 })} kg`;
  }
  if (pesoGramas >= 1000 && pesoGramas % 1000 === 0) {
    return `${pesoGramas / 1000} kg`;
  }
  return `${Math.round(pesoGramas)}g`;
}

const ATALHOS_PESO_GRAMAS = [
  { label: '100g', gramas: 100 },
  { label: '150g', gramas: 150 },
  { label: '200g', gramas: 200 },
  { label: '250g', gramas: 250 },
  { label: '300g', gramas: 300 },
  { label: '400g', gramas: 400 },
  { label: '500g', gramas: 500 },
  { label: '1 kg', gramas: 1000 }
];

export const PesoProdutoModal: React.FC<PesoProdutoModalProps> = ({
  isOpen,
  produto,
  produtosCatalogo = [],
  mostrarCampoObservacao = true,
  onClose,
  onConfirm
}) => {
  // Se abriu no modo "Desmembrar Produto / Avulso" sem produto pré-selecionado
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(produto || null);
  const [modoAvulso, setModoAvulso] = useState<boolean>(!produto);
  const [buscaCatalogo, setBuscaCatalogo] = useState<string>('');

  // Campos para produto avulso ou ajuste de base
  const [nomePersonalizado, setNomePersonalizado] = useState<string>('');
  const [precoBaseInput, setPrecoBaseInput] = useState<string>('');
  const [unidadeBasePreco, setUnidadeBasePreco] = useState<'kg' | '100 g'>('kg');

  // Medida que o cliente pediu (ex: 200 em 'g' ou 0.2 em 'kg')
  const [unidadeMedidaCliente, setUnidadeMedidaCliente] = useState<'g' | 'kg'>('g');
  const [quantidadeMedidaInput, setQuantidadeMedidaInput] = useState<string>('200');
  const [observacao, setObservacao] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (produto) {
        setProdutoSelecionado(produto);
        setModoAvulso(false);
        setNomePersonalizado(produto.nome);
        setPrecoBaseInput(Number(produto.preco || 0).toFixed(2));
        const un = (produto.unidade_venda || '').trim().toLowerCase();
        setUnidadeBasePreco(un === '100 g' || un === '100g' ? '100 g' : 'kg');
      } else {
        setProdutoSelecionado(null);
        setModoAvulso(true);
        setNomePersonalizado('');
        setPrecoBaseInput('');
        setUnidadeBasePreco('kg');
      }
      setUnidadeMedidaCliente('g');
      setQuantidadeMedidaInput('200');
      setObservacao('');
      setBuscaCatalogo('');
    }
  }, [isOpen, produto]);

  const selecionarProdutoDoCatalogo = (p: Produto) => {
    setProdutoSelecionado(p);
    setModoAvulso(false);
    setNomePersonalizado(p.nome);
    setPrecoBaseInput(Number(p.preco || 0).toFixed(2));
    const un = (p.unidade_venda || '').trim().toLowerCase();
    setUnidadeBasePreco(un === '100 g' || un === '100g' ? '100 g' : 'kg');
    setBuscaCatalogo('');
  };

  // Produtos filtrados para seleção rápida quando aberto pelo botão "Desmembrar Produto"
  const sugestoesCatalogo = useMemo(() => {
    const ativos = produtosCatalogo.filter(p => p.ativo !== false);
    if (!buscaCatalogo.trim()) {
      return ativos.filter(p => ehProdutoPorPeso(p)).slice(0, 12);
    }
    const termo = buscaCatalogo.toLowerCase().trim();
    return ativos.filter(p => p.nome.toLowerCase().includes(termo)).slice(0, 12);
  }, [produtosCatalogo, buscaCatalogo]);

  // Cálculo matemático em tempo real do peso em gramas e do preço proporcional
  const { pesoGramas, precoBaseNum, valorRealCalculado, precoPorKgEquivalente, precoPor100gEquivalente } = useMemo(() => {
    const qtdNum = parseFloat(quantidadeMedidaInput.replace(',', '.')) || 0;
    const gramas = unidadeMedidaCliente === 'kg' ? qtdNum * 1000 : qtdNum;

    const basePreco = parseFloat(precoBaseInput.replace(',', '.')) || 0;
    let valorFinal = 0;
    let porKg = 0;
    let por100g = 0;

    if (unidadeBasePreco === '100 g') {
      // Preço cadastrado é a cada 100g
      valorFinal = basePreco * (gramas / 100);
      por100g = basePreco;
      porKg = basePreco * 10;
    } else {
      // Preço cadastrado é por 1 kg (1000g)
      valorFinal = basePreco * (gramas / 1000);
      porKg = basePreco;
      por100g = basePreco / 10;
    }

    return {
      pesoGramas: Math.max(0, gramas),
      precoBaseNum: basePreco,
      valorRealCalculado: Number(Math.max(0, valorFinal).toFixed(2)),
      precoPorKgEquivalente: Number(porKg.toFixed(2)),
      precoPor100gEquivalente: Number(por100g.toFixed(2))
    };
  }, [quantidadeMedidaInput, unidadeMedidaCliente, precoBaseInput, unidadeBasePreco]);

  if (!isOpen) return null;

  const handleSelecionarAtalhoGramas = (gramas: number) => {
    if (gramas >= 1000 && gramas % 1000 === 0) {
      setUnidadeMedidaCliente('kg');
      setQuantidadeMedidaInput(String(gramas / 1000));
    } else {
      setUnidadeMedidaCliente('g');
      setQuantidadeMedidaInput(String(gramas));
    }
  };

  const handleTrocarUnidadeMedida = (novaUnidade: 'g' | 'kg') => {
    if (novaUnidade === unidadeMedidaCliente) return;
    const atualNum = parseFloat(quantidadeMedidaInput.replace(',', '.')) || 0;
    if (atualNum > 0) {
      if (novaUnidade === 'kg') {
        // Estava em gramas -> converte para kg
        setQuantidadeMedidaInput((atualNum / 1000).toString().replace('.', ','));
      } else {
        // Estava em kg -> converte para gramas
        setQuantidadeMedidaInput(Math.round(atualNum * 1000).toString());
      }
    }
    setUnidadeMedidaCliente(novaUnidade);
  };

  const handleConfirmar = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeFinalBase = (produtoSelecionado ? produtoSelecionado.nome : nomePersonalizado).trim();
    if (!nomeFinalBase || pesoGramas <= 0 || valorRealCalculado <= 0) return;

    const medidaStr = formatarMedidaPeso(pesoGramas, unidadeMedidaCliente);
    const prodFinal: Produto = produtoSelecionado || {
      id: `peso-avulso-${Date.now()}`,
      categoria_id: '',
      nome: nomeFinalBase,
      preco: precoBaseNum,
      unidade_venda: unidadeBasePreco,
      ativo: true
    };

    onConfirm({
      produto: prodFinal,
      nomeFormatado: `${nomeFinalBase} (${medidaStr})`,
      pesoGramas,
      medidaLabel: medidaStr,
      precoCalculado: valorRealCalculado,
      observacao: observacao.trim() || undefined
    });
  };

  const podeConfirmar = Boolean(
    (produtoSelecionado?.nome || nomePersonalizado.trim()) &&
    pesoGramas > 0 &&
    valorRealCalculado > 0
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        onClick={e => e.stopPropagation()}
      >
        {/* CABEÇALHO */}
        <div className="bg-stone-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block">
                Balança &amp; Desmembramento por Peso
              </span>
              <h3 className="text-base sm:text-lg font-black truncate">
                {produtoSelecionado ? produtoSelecionado.nome : 'Desmembrar Produto por Peso'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirmar} className="p-5 space-y-4 overflow-y-auto">
          {/* SE NÃO VEIO COM PRODUTO FIXO, PERMITE ESCOLHER DO CATÁLOGO OU DIGITAR */}
          {!produto && (
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-stone-700">
                  1. Produto a Desmembrar
                </label>
                {produtoSelecionado && (
                  <button
                    type="button"
                    onClick={() => {
                      setProdutoSelecionado(null);
                      setModoAvulso(true);
                    }}
                    className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                  >
                    Trocar / Digitar Outro
                  </button>
                )}
              </div>

              {!produtoSelecionado ? (
                <div className="space-y-2.5">
                  {/* Busca rápida no catálogo */}
                  {produtosCatalogo.length > 0 && (
                    <div>
                      <div className="relative">
                        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={buscaCatalogo}
                          onChange={e => setBuscaCatalogo(e.target.value)}
                          placeholder="Buscar no catálogo (Ex: Pão francês, Torrada, Cuca)..."
                          className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:border-amber-600 outline-none"
                        />
                      </div>
                      {sugestoesCatalogo.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto">
                          {sugestoesCatalogo.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => selecionarProdutoDoCatalogo(p)}
                              className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-stone-200 hover:border-amber-400 rounded-lg text-[11px] font-bold text-stone-700 transition-colors cursor-pointer"
                            >
                              {p.nome} (R$ {Number(p.preco).toFixed(2)}/{p.unidade_venda || 'kg'})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ou digitar manualmente ex: Mussarela, Presunto */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                        Nome do Item (Ex: Mussarela, Pão) *
                      </label>
                      <input
                        type="text"
                        required={!produtoSelecionado}
                        value={nomePersonalizado}
                        onChange={e => setNomePersonalizado(e.target.value)}
                        placeholder="Ex: Mussarela Fatiada"
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:border-amber-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                        Preço Base (R$) *
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          inputMode="decimal"
                          required={!produtoSelecionado}
                          value={precoBaseInput}
                          onChange={e => setPrecoBaseInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                          placeholder="Ex: 49,90"
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-mono font-bold text-stone-900 focus:border-amber-600 outline-none"
                        />
                        <select
                          value={unidadeBasePreco}
                          onChange={e => setUnidadeBasePreco(e.target.value as 'kg' | '100 g')}
                          className="px-2 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-700 outline-none"
                        >
                          <option value="kg">/ kg</option>
                          <option value="100 g">/ 100g</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-amber-200">
                  <div>
                    <p className="text-sm font-black text-stone-900">{produtoSelecionado.nome}</p>
                    <p className="text-xs text-stone-500">
                      Base: <strong className="text-amber-700 font-mono">R$ {precoBaseNum.toFixed(2)}</strong> a cada <strong>{unidadeBasePreco}</strong>
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold">
                    Selecionado
                  </span>
                </div>
              )}
            </div>
          )}

          {/* RESUMO DO PREÇO BASE QUANDO O PRODUTO JÁ VEIO SELECIONADO */}
          {produto && (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  Preço de Tabela do Produto
                </span>
                <p className="text-base font-black text-stone-900 font-mono mt-0.5">
                  R$ {precoBaseNum.toFixed(2).replace('.', ',')}{' '}
                  <span className="text-xs font-sans font-bold text-stone-600">
                    por {unidadeBasePreco === '100 g' ? '100 gramas (100g)' : 'Quilo (1 kg = 1.000g)'}
                  </span>
                </p>
              </div>
              <div className="text-right text-[11px] text-stone-500 font-mono shrink-0">
                <div>100g = R$ {precoPor100gEquivalente.toFixed(2).replace('.', ',')}</div>
                <div>1 kg = R$ {precoPorKgEquivalente.toFixed(2).replace('.', ',')}</div>
              </div>
            </div>
          )}

          {/* SELETOR DE UNIDADE DA MEDIDA E QUANTIDADE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-stone-700">
                Informe o Peso / Medida Solicitada
              </label>

              {/* Alternador Gramas (g) vs Quilos (kg) */}
              <div className="inline-flex bg-stone-100 p-1 rounded-xl border border-stone-200">
                <button
                  type="button"
                  onClick={() => handleTrocarUnidadeMedida('g')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    unidadeMedidaCliente === 'g'
                      ? 'bg-stone-900 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Gramas (g)
                </button>
                <button
                  type="button"
                  onClick={() => handleTrocarUnidadeMedida('kg')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    unidadeMedidaCliente === 'kg'
                      ? 'bg-stone-900 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Quilos (kg)
                </button>
              </div>
            </div>

            {/* Botões de Atalho Rápido (100g, 200g, 300g, 500g, 1kg) */}
            <div>
              <span className="text-[11px] font-bold text-stone-400 uppercase block mb-1.5">
                Medidas Rápidas (Toque para selecionar):
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {ATALHOS_PESO_GRAMAS.map(atalho => {
                  const isAtivo = Math.round(pesoGramas) === atalho.gramas;
                  return (
                    <button
                      key={atalho.label}
                      type="button"
                      onClick={() => handleSelecionarAtalhoGramas(atalho.gramas)}
                      className={`py-2 px-1 rounded-xl font-mono font-bold text-xs border transition-all cursor-pointer ${
                        isAtivo
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs scale-[1.02]'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {atalho.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input da Quantidade Exata */}
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                autoFocus={Boolean(produto)}
                value={quantidadeMedidaInput}
                onChange={e => setQuantidadeMedidaInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder={unidadeMedidaCliente === 'g' ? 'Ex: 200' : 'Ex: 0,200'}
                className="w-full py-3.5 pl-4 pr-20 bg-stone-50 border-2 border-stone-300 rounded-2xl text-2xl font-black font-mono text-stone-900 focus:border-amber-600 focus:bg-white outline-none transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 rounded-xl bg-stone-200 text-stone-800 font-mono font-black text-sm">
                {unidadeMedidaCliente === 'g' ? 'gramas (g)' : 'quilos (kg)'}
              </span>
            </div>
          </div>

          {/* CARD DO CÁLCULO REAL DO VALOR DO PRODUTO */}
          <div className="bg-emerald-950 text-white rounded-2xl p-4 border border-emerald-800 shadow-md flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
                <Calculator className="w-3.5 h-3.5" />
                <span>Cálculo Real Proporcional</span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                Peso selecionado:{' '}
                <strong className="text-white font-mono">
                  {Math.round(pesoGramas)}g ({(pesoGramas / 1000).toFixed(3).replace('.', ',')} kg)
                </strong>
              </p>
              <p className="text-[11px] text-emerald-300/80 font-mono">
                {unidadeBasePreco === '100 g'
                  ? `${(pesoGramas / 100).toFixed(2).replace('.', ',')} × R$ ${precoBaseNum.toFixed(2).replace('.', ',')} (100g)`
                  : `${(pesoGramas / 1000).toFixed(3).replace('.', ',')} kg × R$ ${precoBaseNum.toFixed(2).replace('.', ',')}/kg`}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 block">
                Valor Real
              </span>
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                R$ {valorRealCalculado.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* CAMPO DE OBSERVAÇÃO OPCIONAL */}
          {mostrarCampoObservacao && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                Observação do Item (Opcional)
              </label>
              <input
                type="text"
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Ex: Fatiado bem fininho, pão mais claro..."
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:border-amber-600 focus:bg-white outline-none"
              />
            </div>
          )}

          {/* BOTÕES DE AÇÃO */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 px-4 rounded-2xl border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!podeConfirmar}
              className="flex-[2] py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-300 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>
                Adicionar {formatarMedidaPeso(pesoGramas, unidadeMedidaCliente)} • R$ {valorRealCalculado.toFixed(2).replace('.', ',')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
