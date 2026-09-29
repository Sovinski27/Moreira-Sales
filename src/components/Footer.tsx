import React from 'react';

interface FooterProps {
  variant?: 'light' | 'dark' | 'simple';
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ variant = 'light', className = '' }) => {
  const isDark = variant === 'dark';

  return (
    <footer
      className={`w-full py-4 px-4 sm:px-6 transition-colors border-t select-none ${
        isDark
          ? 'bg-stone-900 border-stone-800 text-stone-400'
          : 'bg-white/80 backdrop-blur-xs border-stone-200 text-stone-500'
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span className={`font-semibold ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
            Panificadora & Confeitaria Moreira Sales
          </span>
          <span className="hidden sm:inline opacity-40">•</span>
          <span className="hidden sm:inline opacity-70">
            Frente de Caixa · Cozinha KDS · Cardápio Digital · Fidelização
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-medium tracking-tight text-center">
          <span className="opacity-70">Desenvolvido por</span>
          <strong
            className={`font-bold tracking-normal ${
              isDark ? 'text-amber-400' : 'text-stone-800'
            }`}
          >
            Sovinski Software & Automation LTDA.
          </strong>
        </div>
      </div>
    </footer>
  );
};
