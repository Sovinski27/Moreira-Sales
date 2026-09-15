import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDestructive = false,
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm animate-scaleUp overflow-hidden">
        <div className={`p-6 text-center ${isDestructive ? 'bg-rose-50' : 'bg-amber-50'} border-b ${isDestructive ? 'border-rose-100' : 'border-amber-100'}`}>
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-stone-900 mb-2">{title}</h3>
          <p className="text-sm text-stone-600 leading-relaxed">{message}</p>
        </div>
        
        <div className="p-4 flex gap-3 bg-stone-50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 font-bold rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-3 text-white font-bold rounded-xl transition-colors ${
              isDestructive 
                ? 'bg-rose-600 hover:bg-rose-700' 
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};