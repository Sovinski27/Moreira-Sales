import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Fornecedor, Insumo, FichaTecnica, Produto } from '../types';
import { fetchFornecedores, fetchInsumos, fetchFichasTecnicas, fetchProdutos, saveFornecedor, saveInsumo, saveFichaTecnica, deleteFornecedor, deleteInsumo, deleteFichaTecnica, registrarCompraInsumo, saveProduto, fetchCompras, fetchCustosFixos } from '../services/db';
import { Package, Truck, FileText, AlertTriangle, Calculator, Plus, Trash2, Edit3, ShoppingCart, X, ChevronDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { exportarRelatorioExcelProfissional } from '../services/excelReport';
import { AlertModal } from './AlertModal';
import { ConfirmModal } from './ConfirmModal';

export const CmvDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cmv' | 'insumos' | 'fornecedores' | 'fichas'>('cmv');
  
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [fichas, setFichas] = useState<FichaTecnica[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  const [simuladorProdutoId, setSimuladorProdutoId] = useState<string | null>(null);
  const [margemDesejada, setMargemDesejada] = useState<string>('100');
  const [modoPrecificacao, setModoPrecificacao] = useState<'markup' | 'margem'>('markup');

  const [modalFornecedorOpen, setModalFornecedorOpen] = useState(false);
  const [novoFornecedor, setNovoFornecedor] = useState<Partial<Fornecedor>>({});

  const [modalInsumoOpen, setModalInsumoOpen] = useState(false);
  const [novoInsumo, setNovoInsumo] = useState<Partial<Insumo>>({ unidade_medida: 'kg', quantidade_estoque: 0, estoque_minimo: 0, preco_custo: 0 });

  const [modalFichaOpen, setModalFichaOpen] = useState(false);
  const [novaFichaProdutoId, setNovaFichaProdutoId] = useState<string>('');
  const [novaFichaIngredientes, setNovaFichaIngredientes] = useState<Array<Partial<FichaTecnica>>>([{ insumo_id: '', quantidade_utilizada: 0 }]);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: 'Aviso', message: '' });
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: 'Confirmação', message: '', onConfirm: () => {} });
  const [exportando, setExportando] = useState(false);

  const handleExportarExcel = async () => {
    try {
      setExportando(true);
      const [compras, custos] = await Promise.all([
        fetchCompras(),
        fetchCustosFixos()
      ]);
      await exportarRelatorioExcelProfissional({
        vendas: compras,
        produtos,
        insumos,
        fichas,
        fornecedores,
        custosConfig: custos,
        filtroNome: 'Consolidado Geral'
      });
    } catch (e) {
      console.error(e);
      setAlertConfig({ isOpen: true, title: 'Erro', message: 'Falha ao exportar relatório Excel.' });
    } finally {
      setExportando(false);
    }
  };

  const loadData = async () => {
    setFornecedores(await fetchFornecedores());
    setInsumos(await fetchInsumos());
    setFichas(await fetchFichasTecnicas());
    setProdutos(await fetchProdutos());
  };

  useEffect(() => {
    loadData();
  }, []);

  const getCustoProduto = (produtoId: string) => {
    const fichasProduto = fichas.filter(f => f.produto_id === produtoId);
    if (fichasProduto.length === 0) {
      const prod = produtos.find(p => p.id === produtoId);
      return prod?.custo || 0;
    }
    let custo = 0;
    fichasProduto.forEach(f => {
      const ins = insumos.find(i => i.id === f.insumo_id);
      if (ins) {
        custo += ins.preco_custo * f.quantidade_utilizada;
      }
    });
    return custo;
  };

  const handleCompraInsumo = async (insumoId: string) => {
    const qtdStr = prompt('Quantidade comprada (ex: se pacote de 5kg e usou kg, digite 5):');
    if (qtdStr === null) return; // User cancelled
    
    const valorStr = prompt('Valor total pago nesta quantidade (R$):');
    if (valorStr === null) return; // User cancelled
    
    if (qtdStr.trim() === '' || valorStr.trim() === '') {
      setAlertConfig({ isOpen: true, title: 'Aviso', message: 'Atenção: A quantidade e o valor devem ser preenchidos.' });
      return;
    }

    const qtd = parseFloat(qtdStr.replace(',', '.'));
    const val = parseFloat(valorStr.replace(',', '.'));
    
    if (isNaN(qtd) || qtd <= 0) {
      setAlertConfig({ isOpen: true, title: 'Aviso', message: 'Erro: Quantidade inválida. Digite um número maior que zero.' });
      return;
    }
    
    if (isNaN(val) || val < 0) {
      setAlertConfig({ isOpen: true, title: 'Aviso', message: 'Erro: Valor inválido. Digite um número positivo.' });
      return;
    }

    try {
      await registrarCompraInsumo(insumoId, qtd, val);
      loadData();
      setAlertConfig({ isOpen: true, title: 'Aviso', message: 'Compra registrada e estoque atualizado com sucesso!' });
    } catch (err) {
      console.error(err);
      setAlertConfig({ isOpen: true, title: 'Aviso', message: 'Erro ao registrar a compra. Tente novamente.' });
    }
  };

  const handleAplicarPreco = async (produto: Produto, novoPreco: number) => {
    try {
      await saveProduto({ ...produto, preco: novoPreco });
      setSimuladorProdutoId(null);
      loadData();
      setAlertConfig({ isOpen: true, title: 'Aviso', message: 'Preço atualizado com sucesso!' });
    } catch (err) {
      console.error(err);
      setAlertConfig({ isOpen: true, title: 'Aviso', message: 'Erro ao atualizar preço.' });
    }
  };

  const formatMoney = (v: number) => `R$ ${v.toFixed(2)}`;

  const calcularPrecoSimulado = (custo: number) => {
    const valorNum = parseFloat(margemDesejada) || 0;
    let precoSugerido = 0;
    let isInvalid = false;
    let lucroSugerido = 0;
    let margemFinal = 0;
    let markupFinal = 0;

    if (modoPrecificacao === 'markup') {
      // Porcentagem de Lucro sobre o Custo (Markup) -> SEM LIMITE!
      if (valorNum < 0) {
        isInvalid = true;
      } else {
        lucroSugerido = custo * (valorNum / 100);
        precoSugerido = custo + lucroSugerido;
        margemFinal = precoSugerido > 0 ? (lucroSugerido / precoSugerido) * 100 : 0;
        markupFinal = valorNum;
      }
    } else {
      // Margem sobre o Preço de Venda (máx < 100%)
      if (valorNum >= 100 || valorNum < 0) {
        isInvalid = true;
      } else {
        precoSugerido = custo / (1 - (valorNum / 100));
        lucroSugerido = precoSugerido - custo;
        margemFinal = valorNum;
        markupFinal = custo > 0 ? (lucroSugerido / custo) * 100 : 0;
      }
    }

    return {
      precoSugerido: isInvalid ? 0 : precoSugerido,
      lucroSugerido: isInvalid ? 0 : lucroSugerido,
      margemFinal: isInvalid ? 0 : margemFinal,
      markupFinal: isInvalid ? 0 : markupFinal,
      isInvalid,
      valorNum
    };
  };

  const handleSaveFornecedor = async () => {
    if (!novoFornecedor.nome_empresa?.trim() || !novoFornecedor.contato_whatsapp?.trim()) {
      setAlertConfig({ isOpen: true, title: "Aviso", message: "Preencha o nome da empresa e contato." });
      return;
    }
    await saveFornecedor(novoFornecedor as Fornecedor);
    setModalFornecedorOpen(false);
    setNovoFornecedor({});
    loadData();
  };

  const handleSaveInsumo = async () => {
    if (!novoInsumo.nome?.trim() || !novoInsumo.fornecedor_id || novoInsumo.preco_custo === undefined || isNaN(novoInsumo.preco_custo) || novoInsumo.preco_custo < 0) {
      setAlertConfig({ isOpen: true, title: "Aviso", message: "Preencha nome, fornecedor e preço de custo (maior ou igual a zero)." });
      return;
    }
    await saveInsumo({
      ...novoInsumo,
      quantidade_estoque: novoInsumo.quantidade_estoque && !isNaN(novoInsumo.quantidade_estoque) && novoInsumo.quantidade_estoque >= 0 ? novoInsumo.quantidade_estoque : 0,
      estoque_minimo: novoInsumo.estoque_minimo && !isNaN(novoInsumo.estoque_minimo) && novoInsumo.estoque_minimo >= 0 ? novoInsumo.estoque_minimo : 0,
    } as Insumo);
    setModalInsumoOpen(false);
    setNovoInsumo({ unidade_medida: 'kg', quantidade_estoque: 0, estoque_minimo: 0, preco_custo: 0 });
    loadData();
  };

  const handleSaveFicha = async () => {
    if (!novaFichaProdutoId) {
      setAlertConfig({ isOpen: true, title: "Aviso", message: "Selecione um produto." });
      return;
    }

    const validIngredients = novaFichaIngredientes.filter(
      (ing) => ing.insumo_id && ing.quantidade_utilizada && !isNaN(ing.quantidade_utilizada) && ing.quantidade_utilizada > 0
    );

    if (validIngredients.length === 0) {
      setAlertConfig({ isOpen: true, title: "Aviso", message: "Adicione pelo menos um ingrediente com quantidade válida (maior que zero)." });
      return;
    }

    try {
      for (let i = 0; i < validIngredients.length; i++) {
        const ing = validIngredients[i];
        await saveFichaTecnica({
          ...ing,
          id: ing.id || `ficha-${Date.now()}-${i}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11)}`,
          produto_id: novaFichaProdutoId,
        } as FichaTecnica);
      }
      
      setModalFichaOpen(false);
      setNovaFichaProdutoId('');
      setNovaFichaIngredientes([{ insumo_id: '', quantidade_utilizada: 0 }]);
      setAlertConfig({ isOpen: true, title: "Aviso", message: "Receita salva com sucesso!" });
      loadData();
    } catch (error) {
      console.error(error);
      setAlertConfig({ isOpen: true, title: "Aviso", message: "Erro ao salvar a receita. Algumas inserções podem ter falhado." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 border-b border-amber-200 overflow-x-auto whitespace-nowrap pb-1">
        <button onClick={() => setActiveTab('cmv')} className={`py-2 px-4 ${activeTab === 'cmv' ? 'border-b-2 border-amber-600 font-bold text-amber-800' : 'text-amber-600'}`}><Calculator className="w-4 h-4 inline mr-2"/> Precificação e CMV</button>
        <button onClick={() => setActiveTab('insumos')} className={`py-2 px-4 ${activeTab === 'insumos' ? 'border-b-2 border-amber-600 font-bold text-amber-800' : 'text-amber-600'}`}><Package className="w-4 h-4 inline mr-2"/> Insumos</button>
        <button onClick={() => setActiveTab('fornecedores')} className={`py-2 px-4 ${activeTab === 'fornecedores' ? 'border-b-2 border-amber-600 font-bold text-amber-800' : 'text-amber-600'}`}><Truck className="w-4 h-4 inline mr-2"/> Fornecedores</button>
        <button onClick={() => setActiveTab('fichas')} className={`py-2 px-4 ${activeTab === 'fichas' ? 'border-b-2 border-amber-600 font-bold text-amber-800' : 'text-amber-600'}`}><FileText className="w-4 h-4 inline mr-2"/> Fichas Técnicas</button>
      </div>

      {activeTab === 'cmv' && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-amber-900">Análise de Custos e Margem (CMV)</h3>
              <p className="text-xs text-stone-500 mt-0.5">Custos calculados dinamicamente com base nas receitas e insumos</p>
            </div>
            <button
              onClick={handleExportarExcel}
              disabled={exportando}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold py-2.5 px-4 rounded-xl shadow-sm text-sm transition-all cursor-pointer disabled:opacity-60"
              title="Exporta planilha Excel formatada com todas as abas e gráficos"
            >
              {exportando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando Planilha...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Exportar Excel Executivo (.xlsx)</span>
                </>
              )}
            </button>
          </div>
          {/* Mobile View */}
          <div className="block sm:hidden space-y-4">
            {produtos.map(p => {
              const custo = getCustoProduto(p.id);
              const lucro = p.preco - custo;
              const margem = p.preco > 0 ? (lucro / p.preco) * 100 : 0;
              const perigo = margem < 50;
              
              const isSimulando = simuladorProdutoId === p.id;
              const { precoSugerido, lucroSugerido, margemFinal, isInvalid } = calcularPrecoSimulado(custo);

              return (
                <div key={p.id} className={`p-4 rounded-xl shadow-sm border ${perigo ? 'border-red-200 bg-red-50/50' : 'border-amber-100 bg-white'}`}>
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="font-bold text-lg text-slate-800 flex items-start gap-2 break-words">
                      <span>{p.nome}</span>
                      {perigo && <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${perigo ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {margem.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-sm mb-4">
                    <div className="bg-slate-50 p-2 rounded">
                      <div className="text-slate-500 text-xs mb-1">Venda</div>
                      <div className="font-medium text-slate-800">{formatMoney(p.preco)}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <div className="text-slate-500 text-xs mb-1">Custo</div>
                      <div className="font-medium text-red-600">{formatMoney(custo)}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <div className="text-slate-500 text-xs mb-1">Lucro</div>
                      <div className="font-bold text-green-600">{formatMoney(lucro)}</div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (isSimulando) {
                        setSimuladorProdutoId(null);
                      } else {
                        setSimuladorProdutoId(p.id);
                        setMargemDesejada('100');
                        setModoPrecificacao('markup');
                      }
                    }}
                    className="w-full bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-200 transition-colors"
                  >
                    {isSimulando ? 'Fechar Simulador' : 'Simular Preço'}
                  </button>

                  {isSimulando && (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Modo de Precificação
                        </label>
                        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => { setModoPrecificacao('markup'); setMargemDesejada('100'); }}
                            className={`py-1.5 px-2 rounded-lg text-center transition-all ${modoPrecificacao === 'markup' ? 'bg-white shadow text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            % Lucro s/ Custo (Sem limite)
                          </button>
                          <button
                            type="button"
                            onClick={() => { setModoPrecificacao('margem'); setMargemDesejada('50'); }}
                            className={`py-1.5 px-2 rounded-lg text-center transition-all ${modoPrecificacao === 'margem' ? 'bg-white shadow text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            Margem s/ Venda (%)
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-sm font-medium text-slate-700">
                            {modoPrecificacao === 'markup' ? 'Porcentagem de Lucro (%)' : 'Margem sobre Venda (%)'}
                          </label>
                          <span className="text-xs text-amber-600 font-medium">
                            {modoPrecificacao === 'markup' ? 'Sem limite (100% dobra, 200% triplica)' : 'Máx: 99%'}
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={margemDesejada}
                            onChange={(e) => setMargemDesejada(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10"
                            placeholder={modoPrecificacao === 'markup' ? 'Ex: 100' : 'Ex: 50'}
                          />
                          <span className="absolute right-3 top-2.5 text-slate-400 font-bold">%</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {modoPrecificacao === 'markup' ? (
                            ['50', '100', '150', '200', '300', '500'].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setMargemDesejada(val)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${margemDesejada === val ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                              >
                                +{val}% {val === '100' ? '(Dobro)' : val === '200' ? '(Triplo)' : ''}
                              </button>
                            ))
                          ) : (
                            ['30', '40', '50', '60', '70', '80'].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setMargemDesejada(val)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${margemDesejada === val ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                              >
                                {val}%
                              </button>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-slate-500">Preço Sugerido:</span>
                          <span className={`text-xl font-black ${isInvalid ? 'text-red-600' : 'text-emerald-600'}`}>
                            {isInvalid ? 'Inválido' : formatMoney(precoSugerido)}
                          </span>
                        </div>
                        {!isInvalid && (
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs text-slate-600">
                            <div>
                              <span>Lucro líquido: </span>
                              <strong className="text-emerald-700 font-bold">{formatMoney(lucroSugerido)}</strong>
                            </div>
                            <div className="text-right">
                              <span>Margem no caixa: </span>
                              <strong className="text-slate-800 font-bold">{margemFinal.toFixed(1)}%</strong>
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleAplicarPreco(p, precoSugerido)}
                        disabled={isInvalid || precoSugerido <= 0}
                        className={`w-full px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm ${isInvalid || precoSugerido <= 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]'}`}
                      >
                        Aplicar Preço Sugerido ({formatMoney(precoSugerido)})
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-amber-50 text-amber-900 text-left">
                  <th className="p-3 rounded-tl-lg">Produto</th>
                  <th className="p-3">Preço de Venda</th>
                  <th className="p-3">Custo de Produção</th>
                  <th className="p-3">Lucro Líquido</th>
                  <th className="p-3">Margem (%)</th>
                  <th className="p-3 rounded-tr-lg">Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map(p => {
                  const custo = getCustoProduto(p.id);
                  const lucro = p.preco - custo;
                  const margem = p.preco > 0 ? (lucro / p.preco) * 100 : 0;
                  const perigo = margem < 50;
                  
                  const isSimulando = simuladorProdutoId === p.id;
                  const { precoSugerido, lucroSugerido, margemFinal, isInvalid } = calcularPrecoSimulado(custo);

                  return (
                    <React.Fragment key={p.id}>
                      <tr className={`border-b border-amber-50 ${perigo ? 'bg-red-50/50' : ''}`}>
                        <td className="p-3 font-medium text-slate-800">
                          {p.nome}
                          {perigo && <span title="Margem abaixo de 50%"><AlertTriangle className="inline w-4 h-4 text-red-500 ml-2" /></span>}
                        </td>
                        <td className="p-3 text-slate-600">{formatMoney(p.preco)}</td>
                        <td className="p-3 text-red-600">{formatMoney(custo)}</td>
                        <td className="p-3 text-green-600 font-bold">{formatMoney(lucro)}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${perigo ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {perigo && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {margem.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              if (isSimulando) {
                                setSimuladorProdutoId(null);
                              } else {
                                setSimuladorProdutoId(p.id);
                                setMargemDesejada('100');
                                setModoPrecificacao('markup');
                              }
                            }}
                            className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors whitespace-nowrap"
                          >
                            {isSimulando ? 'Fechar' : 'Simular Preço'}
                          </button>
                        </td>
                      </tr>
                      {isSimulando && (
                        <tr className="bg-amber-50/40 border-b border-amber-100 animate-fadeIn">
                          <td colSpan={6} className="p-4 sm:p-5">
                            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm space-y-4">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                <div>
                                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Simulador de Precificação Inteligente</span>
                                  <h4 className="font-bold text-slate-800 text-base">Definir Novo Preço para: <span className="text-amber-700">{p.nome}</span></h4>
                                </div>

                                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start md:self-auto">
                                  <button
                                    type="button"
                                    onClick={() => { setModoPrecificacao('markup'); setMargemDesejada('100'); }}
                                    className={`py-1.5 px-3 rounded-lg transition-all ${modoPrecificacao === 'markup' ? 'bg-white shadow text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                                  >
                                    % Lucro sobre Custo (Sem limite)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setModoPrecificacao('margem'); setMargemDesejada('50'); }}
                                    className={`py-1.5 px-3 rounded-lg transition-all ${modoPrecificacao === 'margem' ? 'bg-white shadow text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                                  >
                                    Margem sobre Venda (%)
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center text-xs">
                                    <label className="font-bold text-slate-700">
                                      {modoPrecificacao === 'markup' ? 'Porcentagem de Lucro (%)' : 'Margem Desejada (%)'}
                                    </label>
                                    <span className="text-amber-600 font-medium">
                                      {modoPrecificacao === 'markup' ? '✨ Sem limite (100% dobra, 200% triplica)' : 'Máx: 99%'}
                                    </span>
                                  </div>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      min="0"
                                      step="5"
                                      value={margemDesejada}
                                      onChange={(e) => setMargemDesejada(e.target.value)}
                                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10"
                                      placeholder={modoPrecificacao === 'markup' ? 'Ex: 100' : 'Ex: 50'}
                                    />
                                    <span className="absolute right-3 top-2.5 text-slate-400 font-bold">%</span>
                                  </div>

                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {modoPrecificacao === 'markup' ? (
                                      ['50', '100', '150', '200', '300', '500'].map(val => (
                                        <button
                                          key={val}
                                          type="button"
                                          onClick={() => setMargemDesejada(val)}
                                          className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${margemDesejada === val ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                        >
                                          +{val}% {val === '100' ? '(Dobro)' : val === '200' ? '(Triplo)' : ''}
                                        </button>
                                      ))
                                    ) : (
                                      ['30', '40', '50', '60', '70', '80'].map(val => (
                                        <button
                                          key={val}
                                          type="button"
                                          onClick={() => setMargemDesejada(val)}
                                          className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${margemDesejada === val ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                        >
                                          {val}%
                                        </button>
                                      ))
                                    )}
                                  </div>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center">
                                  <div>
                                    <span className="block text-[11px] text-slate-500 font-medium">Custo Base</span>
                                    <span className="text-sm font-bold text-slate-700">{formatMoney(custo)}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[11px] text-slate-500 font-medium">Preço Sugerido</span>
                                    <span className={`text-base font-black ${isInvalid ? 'text-red-600' : 'text-emerald-600'}`}>
                                      {isInvalid ? 'Inválido' : formatMoney(precoSugerido)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="block text-[11px] text-slate-500 font-medium">Lucro Líquido</span>
                                    <span className="text-sm font-bold text-emerald-700">+{formatMoney(lucroSugerido)}</span>
                                  </div>
                                </div>

                                <div className="flex flex-col justify-center">
                                  <button
                                    onClick={() => handleAplicarPreco(p, precoSugerido)}
                                    disabled={isInvalid || precoSugerido <= 0}
                                    className={`w-full py-3 px-4 rounded-xl font-bold transition-all shadow-sm ${isInvalid || precoSugerido <= 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]'}`}
                                  >
                                    Aplicar Preço Sugerido ({formatMoney(precoSugerido)})
                                  </button>
                                  <span className="text-[11px] text-slate-500 text-center mt-1">
                                    Margem calculada: <strong>{margemFinal.toFixed(1)}%</strong>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'insumos' && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
            <h3 className="text-lg sm:text-xl font-bold text-amber-900">Estoque de Insumos</h3>
            <button onClick={() => setModalInsumoOpen(true)} className="w-full sm:w-auto justify-center bg-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-700 flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Novo Insumo
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="bg-amber-50 text-amber-900">
                  <th className="p-3 rounded-tl-lg">Insumo</th>
                  <th className="p-3">Fornecedor</th>
                  <th className="p-3">Custo / Unidade</th>
                  <th className="p-3">Estoque Atual</th>
                  <th className="p-3 rounded-tr-lg">Ações</th>
                </tr>
              </thead>
              <tbody>
                {insumos.map(i => {
                  const forn = fornecedores.find(f => f.id === i.fornecedor_id);
                  const baixo = i.quantidade_estoque <= i.estoque_minimo;
                  return (
                    <tr key={i.id} className="border-b border-amber-50">
                      <td className="p-3 text-slate-800">
                        {i.nome}
                        {baixo && <span className="ml-2 inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Baixo!</span>}
                      </td>
                      <td className="p-3 text-slate-600">{forn ? forn.nome_empresa : '-'}</td>
                      <td className="p-3 text-slate-600">{formatMoney(i.preco_custo)} / {i.unidade_medida}</td>
                      <td className={`p-3 font-bold ${baixo ? 'text-red-600' : 'text-slate-800'}`}>{i.quantidade_estoque.toFixed(2)} {i.unidade_medida}</td>
                      <td className="p-3 space-x-2">
                        <button onClick={() => handleCompraInsumo(i.id)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="Registrar Compra">
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'fornecedores' && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
            <h3 className="text-lg sm:text-xl font-bold text-amber-900">Fornecedores</h3>
            <button onClick={() => setModalFornecedorOpen(true)} className="w-full sm:w-auto justify-center bg-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-700 flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Novo Fornecedor
            </button>
          </div>
          <ul className="space-y-4">
            {fornecedores.map(f => (
              <li key={f.id} className="p-4 border rounded flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                <div>
                  <h4 className="font-bold text-lg text-slate-800">{f.nome_empresa}</h4>
                  <p className="text-sm text-slate-600">{f.cidade} - CNPJ: {f.cnpj || 'Não info'}</p>
                </div>
                {f.contato_whatsapp && (
                  <a href={`https://wa.me/${f.contato_whatsapp}`} target="_blank" rel="noreferrer" className="w-full sm:w-auto justify-center bg-green-100 text-green-700 px-3 py-1.5 rounded font-medium text-sm flex items-center hover:bg-green-200">
                    Whatsapp
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'fichas' && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
            <h3 className="text-lg sm:text-xl font-bold text-amber-900">Fichas Técnicas (BOM)</h3>
            <button onClick={() => {
              setNovaFichaProdutoId('');
              setNovaFichaIngredientes([{ insumo_id: '', quantidade_utilizada: 0 }]);
              setModalFichaOpen(true);
            }} className="w-full sm:w-auto justify-center bg-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-700 flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Nova Receita
            </button>
          </div>
          {produtos.filter(p => fichas.some(f => f.produto_id === p.id)).map(p => (
            <div key={p.id} className="mb-6 p-4 border border-amber-200 rounded-lg bg-amber-50/30">
              <h4 className="font-bold text-lg text-amber-900 mb-2">{p.nome}</h4>
              <ul className="space-y-3 sm:space-y-2">
                {fichas.filter(f => f.produto_id === p.id).map(f => {
                  const ins = insumos.find(i => i.id === f.insumo_id);
                  if (!ins) return null;
                  return (
                    <li key={f.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm border-b pb-2 sm:pb-1 space-y-1 sm:space-y-0">
                      <span className="font-medium sm:font-normal">{ins.nome}</span>
                      <div className="flex items-center justify-between w-full sm:w-auto space-x-3">
                        <span className="font-medium text-slate-700">{f.quantidade_utilizada} {ins.unidade_medida} <span className="text-slate-400 ml-2">({formatMoney(f.quantidade_utilizada * ins.preco_custo)})</span></span>
                        <div className="flex items-center space-x-1">
                          <button onClick={() => { setNovaFichaProdutoId(f.produto_id); setNovaFichaIngredientes([f]); setModalFichaOpen(true); }} className="p-1 text-slate-400 hover:text-blue-600 rounded" title="Editar Quantidade">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={async () => { setConfirmConfig({ isOpen: true, title: 'Confirmação', message: 'Remover ingrediente da receita?', onConfirm: async () => { await deleteFichaTecnica(f.id); loadData(); } }) }} className="p-1 text-slate-400 hover:text-red-600 rounded" title="Remover Ingrediente">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-4 text-right font-bold text-amber-800">
                Custo Total: {formatMoney(getCustoProduto(p.id))}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Modals */}
      {modalFornecedorOpen && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Novo Fornecedor</h3>
              <button onClick={() => setModalFornecedorOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa</label>
                <input type="text" value={novoFornecedor.nome_empresa || ''} onChange={e => setNovoFornecedor({...novoFornecedor, nome_empresa: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" placeholder="Ex: Atacadão" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp (Contato)</label>
                <input type="text" value={novoFornecedor.contato_whatsapp || ''} onChange={e => setNovoFornecedor({...novoFornecedor, contato_whatsapp: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" placeholder="Ex: 11999999999" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ (Opcional)</label>
                <input type="text" value={novoFornecedor.cnpj || ''} onChange={e => setNovoFornecedor({...novoFornecedor, cnpj: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cidade (Opcional)</label>
                <input type="text" value={novoFornecedor.cidade || ''} onChange={e => setNovoFornecedor({...novoFornecedor, cidade: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" />
              </div>
              <button onClick={handleSaveFornecedor} className="w-full bg-amber-600 text-white font-bold py-2 px-4 rounded hover:bg-amber-700">
                Salvar Fornecedor
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {modalInsumoOpen && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-slate-800">Novo Insumo</h3>
              <button onClick={() => setModalInsumoOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Insumo</label>
                <input type="text" value={novoInsumo.nome || ''} onChange={e => setNovoInsumo({...novoInsumo, nome: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" placeholder="Ex: Farinha de Trigo" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fornecedor Principal</label>
                <div className="relative">
                  <select value={novoInsumo.fornecedor_id || ''} onChange={e => setNovoInsumo({...novoInsumo, fornecedor_id: e.target.value})} className="appearance-none bg-white border border-stone-200 text-stone-700 py-2 px-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 w-full">
                  <option value="">Selecione...</option>
                  {fornecedores.map(f => (
                    <option key={f.id} value={f.id}>{f.nome_empresa}</option>
                  ))}
                </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unidade de Medida</label>
                <div className="relative">
                  <select value={novoInsumo.unidade_medida || 'kg'} onChange={e => setNovoInsumo({...novoInsumo, unidade_medida: e.target.value as any})} className="appearance-none bg-white border border-stone-200 text-stone-700 py-2 px-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 w-full">
                  <option value="kg">Quilogramas (kg)</option>
                  <option value="g">Gramas (g)</option>
                  <option value="l">Litros (l)</option>
                  <option value="ml">Mililitros (ml)</option>
                  <option value="un">Unidade (un)</option>
                </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Custo (Por unidade escolhida)</label>
                <input type="number" step="0.01" value={novoInsumo.preco_custo || 0} onChange={e => setNovoInsumo({...novoInsumo, preco_custo: parseFloat(e.target.value)})} className="w-full border border-slate-300 rounded px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estoque Atual</label>
                  <input type="number" step="0.01" value={novoInsumo.quantidade_estoque || 0} onChange={e => setNovoInsumo({...novoInsumo, quantidade_estoque: parseFloat(e.target.value)})} className="w-full border border-slate-300 rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estoque Mínimo</label>
                  <input type="number" step="0.01" value={novoInsumo.estoque_minimo || 0} onChange={e => setNovoInsumo({...novoInsumo, estoque_minimo: parseFloat(e.target.value)})} className="w-full border border-slate-300 rounded px-3 py-2" />
                </div>
              </div>
              <button onClick={handleSaveInsumo} className="w-full bg-amber-600 text-white font-bold py-2 px-4 rounded hover:bg-amber-700">
                Salvar Insumo
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {modalFichaOpen && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-slate-800">Nova Receita / Insumos</h3>
              <button onClick={() => setModalFichaOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Produto (Final)</label>
                <div className="relative">
                  <select value={novaFichaProdutoId} onChange={e => setNovaFichaProdutoId(e.target.value)} className="appearance-none bg-white border border-stone-200 text-stone-700 py-2 px-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 w-full">
                  <option value="">Selecione o produto...</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Ingredientes</label>
                {novaFichaIngredientes.map((ing, idx) => (
                  <div key={idx} className="flex space-x-2 items-start border p-3 rounded bg-slate-50">
                    <div className="flex-1 space-y-2">
                      <div className="relative">
                        <select value={ing.insumo_id || ''} onChange={e => {
                          const newIngs = [...novaFichaIngredientes];
                          newIngs[idx] = { ...newIngs[idx], insumo_id: e.target.value };
                          setNovaFichaIngredientes(newIngs);
                        }} className="appearance-none bg-white border border-stone-200 text-stone-700 py-2 px-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 w-full">
                          <option value="">Selecione o insumo...</option>
                          {insumos.map(i => (
                            <option key={i.id} value={i.id}>{i.nome} (por {i.unidade_medida})</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    <div>
                      <input type="number" step="0.001" value={ing.quantidade_utilizada || ''} onChange={e => {
                          const newIngs = [...novaFichaIngredientes];
                          newIngs[idx] = { ...newIngs[idx], quantidade_utilizada: parseFloat(e.target.value) };
                          setNovaFichaIngredientes(newIngs);
                        }} className="w-full border border-slate-300 rounded px-3 py-2" placeholder="Quantidade Utilizada" />
                        {idx === novaFichaIngredientes.length - 1 && <p className="text-xs text-slate-500 mt-1">Informe a quantidade baseada na unidade.</p>}
                      </div>
                    </div>
                    {novaFichaIngredientes.length > 1 && (
                      <button onClick={() => {
                        const newIngs = novaFichaIngredientes.filter((_, i) => i !== idx);
                        setNovaFichaIngredientes(newIngs);
                      }} className="text-red-500 hover:text-red-700 p-2 mt-1">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={() => setNovaFichaIngredientes([...novaFichaIngredientes, { insumo_id: '', quantidade_utilizada: 0 }])} className="text-amber-600 font-medium text-sm flex items-center hover:text-amber-700">
                <Plus className="w-4 h-4 mr-1" />
                Adicionar outro ingrediente
              </button>

              <button onClick={handleSaveFicha} className="w-full bg-amber-600 text-white font-bold py-2 px-4 rounded hover:bg-amber-700 mt-4">
                Salvar Receita
              </button>
            </div>
          </div>
        </div>, document.body
      )}
      <AlertModal isOpen={alertConfig.isOpen} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />
      <ConfirmModal isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })} />
      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
