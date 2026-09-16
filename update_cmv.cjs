const fs = require('fs');
let content = fs.readFileSync('src/components/CmvDashboard.tsx', 'utf8');

// Add imports
content = content.replace(
  "import { Package, Truck, FileText, AlertTriangle, Calculator, Plus, Trash2, Edit3, ShoppingCart, X } from 'lucide-react';",
  "import { Package, Truck, FileText, AlertTriangle, Calculator, Plus, Trash2, Edit3, ShoppingCart, X, ChevronDown } from 'lucide-react';\nimport { AlertModal } from './AlertModal';\nimport { ConfirmModal } from './ConfirmModal';"
);

// Add states
content = content.replace(
  "const [novaFichaIngredientes, setNovaFichaIngredientes] = useState<Array<Partial<FichaTecnica>>>([{ insumo_id: '', quantidade_utilizada: 0 }]);",
  "const [novaFichaIngredientes, setNovaFichaIngredientes] = useState<Array<Partial<FichaTecnica>>>([{ insumo_id: '', quantidade_utilizada: 0 }]);\n  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: 'Aviso', message: '' });\n  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: 'Confirmação', message: '', onConfirm: () => {} });"
);

// Replace alerts
content = content.replace(/alert\('([^']+)'\);/g, "setAlertConfig({ isOpen: true, title: 'Aviso', message: '$1' });");
content = content.replace(/alert\("([^"]+)"\);/g, 'setAlertConfig({ isOpen: true, title: "Aviso", message: "$1" });');

// Replace confirm
content = content.replace(/if\(confirm\('([^']+)'\)\) \{ ([^}]+) \}/g, "setConfirmConfig({ isOpen: true, title: 'Confirmação', message: '$1', onConfirm: async () => { $2 } })");

// Replace selects
content = content.replace(
  /<select value=\{novoInsumo\.fornecedor_id \|\| ''\} onChange=\{e => setNovoInsumo\(\{\.\.\.novoInsumo, fornecedor_id: e\.target\.value\}\)\} className="w-full border border-slate-300 rounded px-3 py-2">/g,
  `<div className="relative">
                  <select value={novoInsumo.fornecedor_id || ''} onChange={e => setNovoInsumo({...novoInsumo, fornecedor_id: e.target.value})} className="appearance-none bg-white border border-stone-200 text-stone-700 py-2 px-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 w-full">`
).replace(
  /<\/select>\s*<\/div>\s*<div>\s*<label className="block text-sm font-medium text-slate-700 mb-1">Unidade de Medida<\/label>/,
  `</select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unidade de Medida</label>`
);

content = content.replace(
  /<select value=\{novoInsumo\.unidade_medida \|\| 'kg'\} onChange=\{e => setNovoInsumo\(\{\.\.\.novoInsumo, unidade_medida: e\.target\.value as any\}\)\} className="w-full border border-slate-300 rounded px-3 py-2">/g,
  `<div className="relative">
                  <select value={novoInsumo.unidade_medida || 'kg'} onChange={e => setNovoInsumo({...novoInsumo, unidade_medida: e.target.value as any})} className="appearance-none bg-white border border-stone-200 text-stone-700 py-2 px-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 w-full">`
).replace(
  /<\/select>\s*<\/div>\s*<div>\s*<label className="block text-sm font-medium text-slate-700 mb-1">Preço de Custo/,
  `</select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Custo`
);

content = content.replace(
  /<select value=\{novaFichaProdutoId\} onChange=\{e => setNovaFichaProdutoId\(e\.target\.value\)\} className="w-full border border-slate-300 rounded px-3 py-2">/g,
  `<div className="relative">
                  <select value={novaFichaProdutoId} onChange={e => setNovaFichaProdutoId(e.target.value)} className="appearance-none bg-white border border-stone-200 text-stone-700 py-2 px-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 w-full">`
).replace(
  /<\/select>\s*<\/div>\s*<div className="space-y-3">/,
  `</select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">`
);

content = content.replace(
  /<select value=\{ing\.insumo_id \|\| ''\} onChange=\{e => \{[^}]+\}\}\} className="w-full border border-slate-300 rounded px-3 py-2">/g,
  (match) => {
    return `<div className="relative">\n                      ` + match.replace('className="w-full border border-slate-300 rounded px-3 py-2"', 'className="appearance-none bg-white border border-stone-200 text-stone-700 py-2 px-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 w-full"');
  }
).replace(
  /<\/select>\s*<div>\s*<input type="number"/g,
  `</select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <input type="number"`
);

// Append modals at the end before final div
content = content.replace(
  /    <\/div>\n  \);\n\};\n/g,
  `      <AlertModal isOpen={alertConfig.isOpen} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />
      <ConfirmModal isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })} />
    </div>
  );
};
`
);

fs.writeFileSync('src/components/CmvDashboard.tsx', content);
