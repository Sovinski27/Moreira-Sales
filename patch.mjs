import fs from 'fs';
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// 1. Add CmvDashboard import
content = content.replace('import { BiReports } from \'../components/BiReports\';', 'import { BiReports } from \'../components/BiReports\';\nimport { CmvDashboard } from \'../components/CmvDashboard\';');

// 2. Add icons if missing: Package, BarChart2, Calculator
content = content.replace('Sliders,', 'Sliders,\n  Package,\n  BarChart2,\n  Calculator,');

// 3. Add buttons
const configBtn = \        <button
          type="button"
          onClick={() => setActiveSubTab('config')}\;

const newBtns = \        <button
          type="button"
          onClick={() => setActiveSubTab('catalogo')}
          className={\\\lex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap \\\\}
        >
          <Package className="w-4 h-4" />
          <span>Catálogo & Produtos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('cmv')}
          className={\\\lex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap \\\\}
        >
          <Calculator className="w-4 h-4" />
          <span>Precificação & CMV</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('bi')}
          className={\\\lex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap \\\\}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Relatórios BI</span>
        </button>

\;
content = content.replace(configBtn, newBtns + configBtn);

// 4. Add Catalogo UI
const configUI = \        {/* CONTEÚDO DA ABA 4: CONFIGURAÇÕES DA FIDELIDADE & WHATSAPP */}
        {activeSubTab === 'config' && (\;

const catalogoUI = \        {/* CONTEÚDO DA ABA CATÁLOGO */}
        {activeSubTab === 'catalogo' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-stone-900">Catálogo de Produtos</h2>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCategoriaModalConfig({ isOpen: true, categoria: null })}
                  className="bg-stone-200 hover:bg-stone-300 text-stone-800 px-4 py-2 rounded-xl font-bold transition-colors"
                >
                  + Nova Categoria
                </button>
                <button
                  type="button"
                  onClick={() => setProdutoModalConfig({ isOpen: true, produto: null })}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl font-bold transition-colors"
                >
                  + Novo Produto
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {produtos.map(produto => (
                <div key={produto.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-stone-900">{produto.nome}</h3>
                    <p className="text-stone-500 mt-1">R$ {produto.preco.toFixed(2)}</p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setProdutoModalConfig({ isOpen: true, produto })}
                      className="text-amber-600 font-bold hover:underline text-sm"
                    >
                      Editar Produto
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA CMV */}
        {activeSubTab === 'cmv' && (
          <CmvDashboard />
        )}

\;
content = content.replace(configUI, catalogoUI + configUI);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
