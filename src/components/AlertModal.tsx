import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({ isOpen, title = 'Aviso', message, onClose }) => {
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
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] p-4 flex items-center justify-center animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm my-auto animate-scaleUp overflow-hidden border border-stone-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-stone-50 p-6 text-center border-b border-stone-100">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-amber-50 text-amber-600">
            <Info className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-stone-900 mb-2">{title}</h3>
          <p className="text-sm text-stone-600 leading-relaxed">{message}</p>
        </div>
        
        <div className="p-4 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};