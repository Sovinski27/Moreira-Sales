import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Save,
  Box,
  Tag,
  Plus,
  Check,
  AlertCircle,
  Info,
  Scale,
  Package,
  Receipt
} from 'lucide-react';
import { Produto, Categoria } from '../types';
import { saveCategoria } from '../services/db';

interface ProdutoModalProps {
  produto?: Produto | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (produto: {
    nome: string;
    preco: number;
    categoria_id: string;
    unidade_venda?: string;
    custo?: number;
    controlar_estoque?: boolean;
    estoque_atual?: number;
    emitir_nota_fiscal?: boolean;
  }) => void;
  categorias?: Categoria[];
  onCategoriaCriada?: () => void;
}

const UNIDADES_PADRAO = ['unidade', '100 g', 'kg', '300 ml'];

export const ProdutoModal: React.FC<ProdutoModalProps> = ({
  produto,
  isOpen,
  onClose,
  onSave,
  categorias: categoriasProp,
  onCategoriaCriada
}) => {
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [custo, setCusto] = useState('');
  const [unidadeVenda, setUnidadeVenda] = useState('unidade');
  const [categoriaId, setCategoriaId] = useState('');
  const [controlarEstoque, setControlarEstoque] = useState(false);
  const [estoqueAtual, setEstoqueAtual] = useState('');
  const [emitirNotaFiscal, setEmitirNotaFiscal] = useState(false);

  // Categorias locais e estado de criação rápida
  const [listaCategorias, setListaCategorias] = useState<Categoria[]>(categoriasProp || []);
  const [mostrarCriarCategoria, setMostrarCriarCategoria] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  // Referência para controlar abertura e evitar perda de digitação em re-renderizações externas
  const prevIsOpenRef = useRef(false);
  const prevProdutoIdRef = useRef<string | undefined>(undefined);

  // Inicializar campos apenas ao abrir ou trocar de produto
  useEffect(() => {
    const acabouDeAbrir = isOpen && !prevIsOpenRef.current;
    const mudouProduto = isOpen && produto?.id !== prevProdutoIdRef.current;

    if (acabouDeAbrir || mudouProduto) {
      setErroValidacao(null);
      if (produto) {
        const precoNum = Number(produto.preco);
        const custoNum = Number(produto.custo);
        setNome(produto.nome || '');
        setPreco(
          produto.preco !== undefined && produto.preco !== null && !isNaN(precoNum)
            ? precoNum.toFixed(2)
            : ''
        );
        setCusto(
          produto.custo !== undefined && produto.custo !== null && !isNaN(custoNum)
            ? custoNum.toFixed(2)
            : ''
        );
        setUnidadeVenda(produto.unidade_venda || 'unidade');
        setControlarEstoque(Boolean(produto.controlar_estoque));
        setEmitirNotaFiscal(Boolean(produto.emitir_nota_fiscal));
        setEstoqueAtual(
          produto.estoque_atual !== undefined && produto.estoque_atual !== null
            ? String(produto.estoque_atual)
            : ''
        );
        setCategoriaId(produto.categoria_id || '');
      } else {
        setNome('');
        setPreco('');
        setCusto('');
        setUnidadeVenda('unidade');
        setControlarEstoque(false);
        setEmitirNotaFiscal(false);
        setEstoqueAtual('');
        const initialCat =
          categoriasProp && categoriasProp.length > 0
            ? categoriasProp[0].id
            : listaCategorias.length > 0
              ? listaCategorias[0].id
              : '';
        setCategoriaId(initialCat);
      }
      setMostrarCriarCategoria(false);
      setNovaCategoriaNome('');
    }

    prevIsOpenRef.current = isOpen;
    prevProdutoIdRef.current = produto?.id;
  }, [isOpen, produto]);

  // Atualizar lista de categorias sem sobrescrever escolha do usuário
  useEffect(() => {
    if (categoriasProp && categoriasProp.length > 0) {
      setListaCategorias(categoriasProp);
      setCategoriaId(prev => {
        if (prev) return prev;
        return produto?.categoria_id || categoriasProp[0].id;
      });
    }
  }, [categoriasProp, produto?.categoria_id]);

  // Bloquear rolagem do fundo enquanto o modal estiver aberto (sempre ANTES do return condicional)
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const precoParsed = parseFloat(preco.replace(',', '.'));
  const custoParsed = parseFloat(custo.replace(',', '.'));
  const temMargemCalculavel =
    !isNaN(precoParsed) && precoParsed > 0 && !isNaN(custoParsed) && custoParsed > 0;
  const lucroUnitario = temMargemCalculavel ? precoParsed - custoParsed : 0;
  const margemPercentual = temMargemCalculavel ? (lucroUnitario / precoParsed) * 100 : 0;

  const handleCriarRapidoCategoria = async () => {
    if (!novaCategoriaNome.trim()) return;
    setSalvandoCategoria(true);
    try {
      const nova = await saveCategoria({
        nome: novaCategoriaNome.trim(),
        icone: 'Tag',
        ordem: listaCategorias.length + 1
      });
      const novaLista = [...listaCategorias, nova];
      setListaCategorias(novaLista);
      setCategoriaId(nova.id);
      setNovaCategoriaNome('');
      setMostrarCriarCategoria(false);
      if (onCategoriaCriada) {
        onCategoriaCriada();
      }
    } catch (e) {
      console.error('Erro ao salvar categoria rápida:', e);
    } finally {
      setSalvandoCategoria(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const precoNum = parseFloat(preco.replace(',', '.'));
    const custoNum = custo ? parseFloat(custo.replace(',', '.')) : undefined;
    const estoqueNum = estoqueAtual ? parseInt(estoqueAtual, 10) : undefined;

    let targetCatId = categoriaId;
    if (!targetCatId && listaCategorias.length > 0) {
      targetCatId = listaCategorias[0].id;
      setCategoriaId(targetCatId);
    }

    if (!nome.trim()) {
      setErroValidacao('Por favor, informe o nome do produto.');
      return;
    }

    if (isNaN(precoNum) || precoNum < 0) {
      setErroValidacao('Por favor, informe um preço de venda válido.');
      return;
    }

    if (!targetCatId) {
      setErroValidacao('Por favor, selecione ou crie uma categoria para vincular a este produto.');
      return;
    }

    setErroValidacao(null);
    onSave({
      nome: nome.trim(),
      preco: precoNum,
      categoria_id: targetCatId,
      unidade_venda: unidadeVenda.trim() || 'unidade',
      custo: custoNum !== undefined && !isNaN(custoNum) ? custoNum : undefined,
      controlar_estoque: controlarEstoque,
      estoque_atual: estoqueNum !== undefined && !isNaN(estoqueNum) ? estoqueNum : undefined,
      emitir_nota_fiscal: emitirNotaFiscal
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-[100] p-3 sm:p-6 flex items-center justify-center animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="produto-modal-titulo"
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl my-auto animate-scaleUp overflow-hidden flex flex-col max-h-[calc(100vh-1.5rem)] sm:max-h-[90vh] border border-stone-200/90"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho fixo */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-6 py-5 sm:px-7 shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 id="produto-modal-titulo" className="text-lg sm:text-xl font-extrabold tracking-tight truncate">
                {produto ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <p className="text-xs sm:text-sm text-amber-100/95 mt-0.5 truncate">
                {produto
                  ? 'Atualize nome, categoria, precificação, unidade e estoque'
                  : 'Cadastre um novo item no catálogo da panificadora'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com corpo rolável e rodapé fixo */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-7 space-y-6">
            {erroValidacao && (
              <div className="px-4 py-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium rounded-xl flex items-center gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{erroValidacao}</span>
              </div>
            )}

            {/* 1. Nome do Produto */}
            <div>
              <label
                htmlFor="produto-nome"
                className="block text-sm font-semibold text-stone-800 mb-2"
              >
                Nome do produto <span className="text-rose-500">*</span>
              </label>
              <input
                id="produto-nome"
                type="text"
                autoFocus
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Pão francês, Suco natural, Café expresso..."
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-600/10 outline-none font-medium text-base transition-all"
                required
              />
            </div>

            {/* 2. Categoria do Produto */}
            <div className="pt-5 border-t border-stone-100">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-sm font-semibold text-stone-800">
                    Categoria do produto <span className="text-rose-500">*</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarCriarCategoria(!mostrarCriarCategoria)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {mostrarCriarCategoria ? 'Fechar criação' : 'Nova categoria'}
                </button>
              </div>

              {/* Criador rápido de categoria */}
              {mostrarCriarCategoria && (
                <div className="mb-3.5 p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2.5 animate-fadeIn">
                  <label
                    htmlFor="nova-categoria-nome"
                    className="block text-xs font-semibold text-amber-900"
                  >
                    Cadastrar e vincular nova categoria
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      id="nova-categoria-nome"
                      type="text"
                      value={novaCategoriaNome}
                      onChange={e => setNovaCategoriaNome(e.target.value)}
                      placeholder="Ex: Cafés Especiais"
                      className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-amber-300 rounded-xl focus:border-amber-600 focus:ring-4 focus:ring-amber-600/10 outline-none font-medium text-stone-900"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCriarRapidoCategoria();
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={!novaCategoriaNome.trim() || salvandoCategoria}
                      onClick={handleCriarRapidoCategoria}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0"
                    >
                      {salvandoCategoria ? 'Salvando...' : 'Adicionar categoria'}
                    </button>
                  </div>
                </div>
              )}

              {listaCategorias.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {listaCategorias.map(cat => {
                    const isSelected = categoriaId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setCategoriaId(cat.id)}
                        className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2 border cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-amber-400 hover:bg-amber-50/60 hover:text-stone-900'
                        }`}
                      >
                        <span>{cat.nome}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.75]" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70 text-sm text-amber-800">
                  Nenhuma categoria cadastrada. Clique em <strong>+ Nova categoria</strong> acima para criar a primeira.
                </div>
              )}
            </div>

            {/* 3. Precificação (Venda & Custo) */}
            <div className="pt-5 border-t border-stone-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
                {/* Preço de Venda */}
                <div>
                  <div className="flex items-center justify-between gap-2 min-h-[24px] mb-2">
                    <label htmlFor="produto-preco" className="text-sm font-semibold text-stone-800">
                      Preço de venda <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-xs font-medium text-stone-500 truncate">
                      por {unidadeVenda.trim() || 'unidade'}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-400 select-none pointer-events-none">
                      R$
                    </span>
                    <input
                      id="produto-preco"
                      type="text"
                      inputMode="decimal"
                      value={preco}
                      onChange={e => setPreco(e.target.value.replace(/[^0-9.,]/g, ''))}
                      placeholder="0,00"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-stone-300 rounded-xl focus:border-amber-600 focus:ring-4 focus:ring-amber-600/10 outline-none font-mono tabular-nums font-bold text-base text-stone-900 transition-all"
                      required
                    />
                  </div>
                  <p className="text-xs mt-1.5 min-h-[18px] tabular-nums">
                    {temMargemCalculavel ? (
                      <span
                        className={
                          lucroUnitario >= 0
                            ? 'text-emerald-700 font-semibold'
                            : 'text-rose-600 font-semibold'
                        }
                      >
                        Lucro: R$ {lucroUnitario.toFixed(2).replace('.', ',')} ({margemPercentual.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="text-stone-500">Valor final exibido no cardápio e no caixa</span>
                    )}
                  </p>
                </div>

                {/* Preço de Custo */}
                <div>
                  <div className="flex items-center justify-between gap-2 min-h-[24px] mb-2">
                    <label htmlFor="produto-custo" className="text-sm font-semibold text-stone-800">
                      Preço de custo
                    </label>
                    {produto?.custo !== undefined && Number(produto.custo) > 0 && (
                      <span className="text-xs text-amber-800 font-semibold bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md whitespace-nowrap">
                        Receita ativa
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-400 select-none pointer-events-none">
                      R$
                    </span>
                    <input
                      id="produto-custo"
                      type="text"
                      inputMode="decimal"
                      value={custo}
                      onChange={e => setCusto(e.target.value.replace(/[^0-9.,]/g, ''))}
                      placeholder="0,00"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-stone-300 rounded-xl focus:border-stone-500 focus:ring-4 focus:ring-stone-500/10 outline-none font-mono tabular-nums font-semibold text-base text-stone-700 transition-all"
                    />
                  </div>
                  <p className="text-xs text-stone-500 mt-1.5 min-h-[18px]">
                    Preenchido pela Ficha Técnica ou digitado manualmente
                  </p>
                </div>
              </div>

              {/* Dica em largura total para não espremer a coluna */}
              <div className="mt-4 px-4 py-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5 text-xs sm:text-sm text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Dica:</strong> Bolos, tortas e salgados podem ter o custo calculado automaticamente por receita na aba{' '}
                  <strong>CMV &amp; Fichas Técnicas</strong>.
                </p>
              </div>
            </div>

            {/* 4. Unidade de Venda */}
            <div className="pt-5 border-t border-stone-100">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <label
                  htmlFor="produto-unidade"
                  className="text-sm font-semibold text-stone-800 inline-flex items-center gap-2"
                >
                  <Scale className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Unidade de venda</span>
                </label>
                <span className="text-xs text-stone-500">
                  Selecione um padrão ou informe outra medida
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex flex-wrap gap-2 shrink-0">
                  {UNIDADES_PADRAO.map(u => {
                    const ativa = unidadeVenda === u;
                    return (
                      <button
                        key={u}
                        type="button"
                        aria-pressed={ativa}
                        onClick={() => setUnidadeVenda(u)}
                        className={`px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all border cursor-pointer whitespace-nowrap ${
                          ativa
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        {u}
                      </button>
                    );
                  })}
                </div>

                <input
                  id="produto-unidade"
                  type="text"
                  value={unidadeVenda}
                  onChange={e => setUnidadeVenda(e.target.value)}
                  placeholder="Ex: unidade, 100 g, kg, 300 ml"
                  className="flex-1 min-w-[170px] px-4 py-2.5 bg-white border border-stone-300 rounded-xl focus:border-amber-600 focus:ring-4 focus:ring-amber-600/10 outline-none font-medium text-sm text-stone-900 transition-all"
                  required
                />
              </div>
            </div>

            {/* 5. Controle de Estoque */}
            <div className="pt-5 border-t border-stone-100">
              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 sm:p-5 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <label className="flex items-center gap-3.5 cursor-pointer select-none">
                    <div className="relative inline-flex items-center shrink-0">
                      <input
                        type="checkbox"
                        checked={controlarEstoque}
                        onChange={e => setControlarEstoque(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-stone-300 rounded-full peer peer-focus:ring-4 peer-focus:ring-amber-600/20 peer-checked:bg-amber-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-sm after:transition-all peer-checked:after:translate-x-5" />
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Box className="w-4 h-4 text-stone-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="block text-sm font-semibold text-stone-800">
                          Controlar estoque
                        </span>
                        <span className="block text-xs text-stone-500">
                          Dar baixa automática a cada venda confirmada
                        </span>
                      </div>
                    </div>
                  </label>

                  {controlarEstoque && (
                    <div className="sm:w-52 shrink-0 animate-fadeIn">
                      <label
                        htmlFor="produto-estoque"
                        className="block text-xs font-semibold text-stone-700 mb-1.5"
                      >
                        Estoque atual ({unidadeVenda.trim() || 'un.'})
                      </label>
                      <input
                        id="produto-estoque"
                        type="number"
                        value={estoqueAtual}
                        onChange={e => setEstoqueAtual(e.target.value)}
                        placeholder="Ex: 50"
                        className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl focus:border-amber-600 focus:ring-4 focus:ring-amber-600/10 outline-none font-mono tabular-nums font-bold text-sm text-stone-900 transition-all"
                        required={controlarEstoque}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 6. Emissão de Nota Fiscal (NFC-e) */}
            <div className="pt-5 border-t border-stone-100">
              <div className={`rounded-2xl border p-4 sm:p-5 transition-colors ${
                emitirNotaFiscal
                  ? 'border-emerald-300 bg-emerald-50/60'
                  : 'border-stone-200 bg-stone-50/70'
              }`}>
                <label className="flex items-center gap-3.5 cursor-pointer select-none">
                  <div className="relative inline-flex items-center shrink-0">
                    <input
                      type="checkbox"
                      checked={emitirNotaFiscal}
                      onChange={e => setEmitirNotaFiscal(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-300 rounded-full peer peer-focus:ring-4 peer-focus:ring-emerald-600/20 peer-checked:bg-emerald-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-sm after:transition-all peer-checked:after:translate-x-5" />
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Receipt className={`w-4 h-4 mt-0.5 shrink-0 ${emitirNotaFiscal ? 'text-emerald-600' : 'text-stone-500'}`} />
                    <div>
                      <span className="block text-sm font-semibold text-stone-800">
                        Emitir Nota Fiscal (NFC-e) para este produto
                      </span>
                      <span className="block text-xs text-stone-500">
                        A nota fiscal no Caixa só será emitida quando este ou outro produto marcado estiver no pedido
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Rodapé fixo */}
          <div className="shrink-0 px-6 py-4 sm:px-7 bg-stone-50 border-t border-stone-200/90 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-xs text-stone-500 hidden sm:inline">
              Campos marcados com <span className="text-rose-500 font-semibold">*</span> são obrigatórios
            </span>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 font-semibold rounded-xl transition-colors text-sm whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={
                  !nome.trim() ||
                  !preco.trim() ||
                  !categoriaId ||
                  (controlarEstoque && !estoqueAtual.trim())
                }
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 disabled:text-stone-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-sm whitespace-nowrap"
              >
                <Save className="w-4 h-4" />
                <span>{produto ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
