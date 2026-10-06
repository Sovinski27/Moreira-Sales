import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Box, Tag, Plus, Check, FolderTree } from 'lucide-react';
import { Produto, Categoria } from '../types';
import { fetchCategorias, saveCategoria } from '../services/db';

interface ProdutoModalProps {
  produto?: Produto | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (produto: { 
    nome: string; 
    preco: number; 
    categoria_id: string;
    custo?: number; 
    controlar_estoque?: boolean; 
    estoque_atual?: number;
  }) => void;
  categorias?: Categoria[];
  onCategoriaCriada?: () => void;
}

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
  const [categoriaId, setCategoriaId] = useState('');
  const [controlarEstoque, setControlarEstoque] = useState(false);
  const [estoqueAtual, setEstoqueAtual] = useState('');

  // Categorias locais e estado de criação rápida
  const [listaCategorias, setListaCategorias] = useState<Categoria[]>(categoriasProp || []);
  const [mostrarCriarCategoria, setMostrarCriarCategoria] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  // Referência para controlar o estado de abertura e impedir que re-renderizações externas apaguem a digitação do usuário
  const prevIsOpenRef = useRef(false);
  const prevProdutoIdRef = useRef<string | undefined>(undefined);

  // Inicializar campos do formulário ESTRITAMENTE quando o modal acaba de abrir ou se o produto em edição mudar
  useEffect(() => {
    const acabouDeAbrir = isOpen && !prevIsOpenRef.current;
    const mudouProduto = isOpen && produto?.id !== prevProdutoIdRef.current;

    if (acabouDeAbrir || mudouProduto) {
      if (produto) {
        setNome(produto.nome || '');
        setPreco(produto.preco !== undefined ? produto.preco.toFixed(2) : '');
        setCusto(produto.custo !== undefined ? produto.custo.toFixed(2) : '');
        setControlarEstoque(produto.controlar_estoque || false);
        setEstoqueAtual(produto.estoque_atual !== undefined ? String(produto.estoque_atual) : '');
        setCategoriaId(produto.categoria_id || '');
      } else {
        setNome('');
        setPreco('');
        setCusto('');
        setControlarEstoque(false);
        setEstoqueAtual('');
        const initialCat = (categoriasProp && categoriasProp.length > 0) ? categoriasProp[0].id : (listaCategorias.length > 0 ? listaCategorias[0].id : '');
        setCategoriaId(initialCat);
      }
      setMostrarCriarCategoria(false);
      setNovaCategoriaNome('');
    }

    prevIsOpenRef.current = isOpen;
    prevProdutoIdRef.current = produto?.id;
  }, [isOpen, produto]);

  // Atualizar lista de categorias sem interferir nos campos digitados pelo usuário
  useEffect(() => {
    if (categoriasProp && categoriasProp.length > 0) {
      setListaCategorias(categoriasProp);
      setCategoriaId(prev => {
        if (prev) return prev; // Mantém a categoria que já está selecionada
        return produto?.categoria_id || categoriasProp[0].id;
      });
    }
  }, [categoriasProp, produto?.categoria_id]);

  if (!isOpen) return null;

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
      custo: !isNaN(custoNum as any) ? custoNum : undefined,
      controlar_estoque: controlarEstoque,
      estoque_atual: !isNaN(estoqueNum as any) ? estoqueNum : undefined
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] p-3 sm:p-4 flex items-center justify-center animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md my-auto animate-scaleUp overflow-hidden flex flex-col max-h-[calc(100vh-2.5rem)] sm:max-h-[88vh] border border-stone-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-amber-600 to-amber-700 text-white p-5 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="text-xl font-black">
            {produto ? 'Editar Produto' : 'Novo Produto'}
          </h3>
          <p className="text-xs text-amber-100 mt-0.5">
            {produto ? 'Atualize os dados e categoria do item' : 'Cadastre um novo item no cardápio'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {erroValidacao && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2 animate-fadeIn">
              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
              <span>{erroValidacao}</span>
            </div>
          )}

          {/* NOME DO PRODUTO */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Nome do Produto
            </label>
            <input
              type="text"
              autoFocus
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Café Expresso"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-medium"
              required
            />
          </div>

          {/* VINCULAR CATEGORIA */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                Categoria do Produto
              </label>
              <button
                type="button"
                onClick={() => setMostrarCriarCategoria(!mostrarCriarCategoria)}
                className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 hover:underline transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {mostrarCriarCategoria ? 'Cancelar' : 'Nova Categoria'}
              </button>
            </div>

            {/* Caixa para adicionar categoria rápida */}
            {mostrarCriarCategoria && (
              <div className="mb-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-fadeIn">
                <p className="text-xs font-bold text-amber-900">Cadastrar e Vincular Nova Categoria</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novaCategoriaNome}
                    onChange={e => setNovaCategoriaNome(e.target.value)}
                    placeholder="Ex: Cafés Especiais"
                    className="flex-1 px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:border-amber-600 outline-none font-medium"
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
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                  >
                    {salvandoCategoria ? 'Salvando...' : 'Adicionar'}
                  </button>
                </div>
              </div>
            )}

            {/* Botões rápidos de categoria para vincular com um clique */}
            {listaCategorias.length > 0 && (
              <div className="mb-2">
                <p className="text-[11px] font-semibold text-stone-500 mb-1.5">
                  Clique no botão para vincular:
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-stone-50 rounded-xl border border-stone-200">
                  {listaCategorias.map(cat => {
                    const isSelected = categoriaId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoriaId(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/30'
                            : 'bg-white text-stone-700 border border-stone-200 hover:border-amber-400 hover:bg-amber-50/50'
                        }`}
                      >
                        <span>{cat.nome}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Select Dropdown como opção complementar e segura */}
            <div className="relative">
              <select
                value={categoriaId}
                onChange={e => setCategoriaId(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-medium text-stone-800 text-sm appearance-none cursor-pointer pr-10"
                required
              >
                <option value="" disabled>Selecione a categoria...</option>
                {listaCategorias.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                <FolderTree className="w-4 h-4" />
              </div>
            </div>

            {listaCategorias.length === 0 && (
              <p className="text-xs text-amber-700 mt-1 font-medium">
                Nenhuma categoria cadastrada. Clique em "+ Nova Categoria" acima para criar.
              </p>
            )}
          </div>

          {/* PREÇO VENDA & PREÇO CUSTO */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Preço Venda
              </label>
              <input
                type="text"
                value={preco}
                onChange={e => setPreco(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="Ex: 5.50"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-mono font-bold"
                required
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Preço Custo
                </label>
                {produto?.custo !== undefined && produto.custo > 0 && (
                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                    Receita ativa
                  </span>
                )}
              </div>
              <input
                type="text"
                value={custo}
                onChange={e => setCusto(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="R$ 0.00"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-stone-600 outline-none font-mono font-medium text-stone-600"
              />
              <p className="text-[10px] text-stone-400 mt-1">
                Calculado automaticamente via Ficha Técnica ou digite manual.
              </p>
              <p className="text-[10px] text-amber-700 bg-amber-50/80 p-1.5 rounded-lg border border-amber-200/60 mt-1.5 font-medium">
                Dica: Você também pode cadastrar bolos, tortas e salgados com receita completa na aba <strong>CMV & Fichas Técnicas</strong>.
              </p>
            </div>
          </div>

          {/* CONTROLE DE ESTOQUE */}
          <div className="pt-2 border-t border-stone-100">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-200 transition-colors">
              <input 
                type="checkbox"
                checked={controlarEstoque}
                onChange={e => setControlarEstoque(e.target.checked)}
                className="w-5 h-5 rounded border-stone-300 text-amber-600 focus:ring-amber-500" 
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-stone-800 flex items-center gap-1">
                  <Box className="w-4 h-4 text-stone-400" /> Controlar Estoque
                </span>
                <span className="text-xs text-stone-500">Baixa automática a cada venda</span>
              </div>
            </label>
            
            {controlarEstoque && (
              <div className="mt-2.5 pl-[2.75rem] animate-fadeIn">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Estoque Atual (Unidades)
                </label>
                <input
                  type="number"
                  value={estoqueAtual}
                  onChange={e => setEstoqueAtual(e.target.value)}
                  placeholder="Ex: 50"
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-mono font-bold"
                  required={controlarEstoque}
                />
              </div>
            )}
          </div>
          
          {/* BOTÕES DE AÇÃO */}
          <div className="flex gap-3 pt-3 border-t border-stone-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!nome.trim() || !preco.trim() || !categoriaId || (controlarEstoque && !estoqueAtual.trim())}
              className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-md"
            >
              <Save className="w-4 h-4" />
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
