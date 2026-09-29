import React, { useState, useEffect } from 'react';
import { Categoria } from '../types';
import { X, Save } from 'lucide-react';

interface CategoriaModalProps {
  isOpen: boolean;
  categoria?: Categoria | null;
  onClose: () => void;
  onSave: (dados: Partial<Categoria>) => void;
}

export const CategoriaModal: React.FC<CategoriaModalProps> = ({
  isOpen,
  categoria,
  onClose,
  onSave
}) => {
  const [nome, setNome] = useState('');
  const [icone, setIcone] = useState('Tag');
  const [ordem, setOrdem] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (categoria) {
        setNome(categoria.nome);
        setIcone(categoria.icone || 'Tag');
        setOrdem(categoria.ordem || 0);
      } else {
        setNome('');
        setIcone('Tag');
        setOrdem(0);
      }
    }
  }, [isOpen, categoria]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-4 flex items-center justify-center bg-stone-900/80 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-md my-auto overflow-hidden shadow-2xl animate-scaleUp max-h-[calc(100vh-2.5rem)] sm:max-h-[88vh] flex flex-col border border-stone-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-stone-100 shrink-0">
          <h3 className="text-xl font-black text-stone-900">
            {categoria ? 'Editar Categoria' : 'Nova Categoria'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          onSave({ nome, icone, ordem });
        }} className="p-6 space-y-4 overflow-y-auto">
          
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-2">
              Nome da Categoria
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none"
              placeholder="Ex: Cafés"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-2">
                Ícone
              </label>
              <input
                type="text"
                value={icone}
                onChange={e => setIcone(e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none"
                placeholder="Ex: Coffee"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-2">
                Ordem
              </label>
              <input
                type="number"
                value={ordem}
                onChange={e => setOrdem(Number(e.target.value))}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Save className="w-5 h-5" />
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
