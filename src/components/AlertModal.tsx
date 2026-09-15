import React from 'react';
import { X, Info } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({ isOpen, title = 'Aviso', message, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm animate-scaleUp overflow-hidden">
        <div className="bg-stone-50 p-6 text-center border-b border-stone-100">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-blue-50 text-blue-600">
            <Info className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-stone-900 mb-2">{title}</h3>
          <p className="text-sm text-stone-600 leading-relaxed">{message}</p>
        </div>
        
        <div className="p-4 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold rounded-xl transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};