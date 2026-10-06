import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void | Promise<void>;
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      return;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await Promise.resolve(onConfirm());
      onClose();
    } catch (err) {
      console.error('Erro ao executar confirmação:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubmitting) return;
    onClose();
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[999] p-4 flex items-center justify-center animate-fadeIn select-none"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm my-auto animate-scaleUp overflow-hidden border border-stone-100 relative pointer-events-auto"
        onClick={e => e.stopPropagation()}
      >
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
            onClick={handleCancelClick}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 font-bold rounded-xl transition-colors cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isSubmitting}
            className={`flex-1 px-4 py-3 text-white font-bold rounded-xl transition-colors cursor-pointer text-sm flex items-center justify-center gap-2 ${
              isDestructive 
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800' 
                : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
            } disabled:opacity-50 disabled:cursor-not-allowed shadow-md`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};