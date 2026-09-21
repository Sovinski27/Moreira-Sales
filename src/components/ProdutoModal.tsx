import React, { useState, useEffect } from 'react';
import { X, Save, Box, DollarSign } from 'lucide-react';
import { Produto, Categoria } from '../types';

interface ProdutoModalProps {
  produto?: Produto | null;
  categorias: Categoria[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (produto: { nome: string; preco: number; custo?: number; controlar_estoque?: boolean; estoque_atual?: number; categoria_id: string }) => void;
}

export const ProdutoModal: React.FC<ProdutoModalProps> = ({ produto, categorias, isOpen, onClose, onSave }) => {
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [custo, setCusto] = useState('');
  const [controlarEstoque, setControlarEstoque] = useState(false);
  const [estoqueAtual, setEstoqueAtual] = useState('');
  const [categoriaId, setCategoriaId] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (produto) {
        setNome(produto.nome);
        setPreco(produto.preco.toFixed(2));
        setCusto(produto.custo !== undefined ? produto.custo.toFixed(2) : '');
        setControlarEstoque(produto.controlar_estoque || false);
        setEstoqueAtual(produto.estoque_atual !== undefined ? String(produto.estoque_atual) : '');
        setCategoriaId(produto.categoria_id || (categorias.length > 0 ? categorias[0].id : ''));
      } else {
        setNome('');
        setPreco('');
        setCusto('');
        setControlarEstoque(false);
        setEstoqueAtual('');
        setCategoriaId(categorias.length > 0 ? categorias[0].id : '');
      }
    }
  }, [isOpen, produto, categorias]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const precoNum = parseFloat(preco.replace(',', '.'));
    const custoNum = custo ? parseFloat(custo.replace(',', '.')) : undefined;
    const estoqueNum = estoqueAtual ? parseInt(estoqueAtual, 10) : undefined;
    
    if (!nome.trim() || isNaN(precoNum) || !categoriaId) {
      return;
    }
    
    onSave({ 
      nome: nome.trim(), 
      preco: precoNum,
      custo: !isNaN(custoNum as any) ? custoNum : undefined,
      controlar_estoque: controlarEstoque,
      estoque_atual: !isNaN(estoqueNum as any) ? estoqueNum : undefined,
      categoria_id: categoriaId
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm animate-scaleUp overflow-hidden flex flex-col max-h-[90vh]">
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
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Categoria
            </label>
            <select
              value={categoriaId}
              onChange={e => setCategoriaId(e.target.value)}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-medium mb-4"
              required
            >
              {categorias.length === 0 && <option value="">Sem categorias (Adicione primeiro)</option>}
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>

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
          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Preço Custo
              </label>
              <input
                type="text"
                value={custo}
                onChange={e => setCusto(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="Opcional"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-stone-600 outline-none font-mono font-medium text-stone-600"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-200 transition-colors">
              <input 
                type="checkbox"
                checked={controlarEstoque}
                onChange={e => setControlarEstoque(e.target.checked)}
                className="w-5 h-5 rounded border-stone-300 text-amber-600 focus:ring-amber-500" 
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-stone-800 flex items-center gap-1"><Box className="w-4 h-4 text-stone-400" /> Controlar Estoque</span>
                <span className="text-xs text-stone-500">Baixa automática a cada venda</span>
              </div>
            </label>
            
            {controlarEstoque && (
              <div className="mt-3 pl-[3.25rem] animate-fadeIn">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Estoque Atual (Unidades)
                </label>
                <input
                  type="number"
                  value={estoqueAtual}
                  onChange={e => setEstoqueAtual(e.target.value)}
                  placeholder="Ex: 50"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-mono font-bold"
                  required={controlarEstoque}
                />
              </div>
            )}
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-stone-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!nome.trim() || !preco.trim() || (controlarEstoque && !estoqueAtual.trim())}
              className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};