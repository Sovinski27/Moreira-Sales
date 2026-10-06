import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Fornecedor, Insumo, FichaTecnica, Produto, Categoria } from '../types';
import { 
  fetchFornecedores, 
  fetchInsumos, 
  fetchFichasTecnicas, 
  fetchProdutos, 
  fetchCategorias,
  saveFornecedor, 
  saveInsumo, 
  saveReceitaCompleta,
  deleteReceitaCompleta,
  deleteFornecedor, 
  deleteInsumo, 
  deleteFichaTecnica, 
  registrarCompraInsumo, 
  saveProduto, 
  fetchCompras, 
  fetchCustosFixos,
  getLocal,
  STORAGE_KEYS,
  calcularCustoUnitarioProduto,
  converterParaUnidadeBase
} from '../services/db';
import { 
  Package, 
  Truck, 
  FileText, 
  AlertTriangle, 
  Calculator, 
  Plus, 
  Trash2, 
  Edit3, 
  ShoppingCart, 
  X, 
  ChevronDown, 
  FileSpreadsheet, 
  Loader2,
  CheckCircle2,
  BookOpen,
  Info,
  DollarSign,
  Sparkles,
  Tag,
  Box
} from 'lucide-react';
import { exportarRelatorioExcelProfissional } from '../services/excelReport';
import { AlertModal } from './AlertModal';
import { ConfirmModal } from './ConfirmModal';

export const CmvDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cmv' | 'insumos' | 'fornecedores' | 'fichas'>('cmv');
  
  // Inicialização síncrona com cache local para evitar telas em branco ou dropdowns vazios
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(() => getLocal<Fornecedor[]>(STORAGE_KEYS.FORNECEDORES, []));
  const [insumos, setInsumos] = useState<Insumo[]>(() => getLocal<Insumo[]>(STORAGE_KEYS.INSUMOS, []));
  const [fichas, setFichas] = useState<FichaTecnica[]>(() => getLocal<FichaTecnica[]>(STORAGE_KEYS.FICHAS_TECNICAS, []));
  const [produtos, setProdutos] = useState<Produto[]>(() => getLocal<Produto[]>(STORAGE_KEYS.PRODUTOS, []));
  const [categorias, setCategorias] = useState<Categoria[]>(() => getLocal<Categoria[]>(STORAGE_KEYS.CATEGORIAS, []));

  // Simulador de CMV / Markup
  const [simuladorProdutoId, setSimuladorProdutoId] = useState<string | null>(null);
  const [margemDesejada, setMargemDesejada] = useState<string>('100');
  const [modoPrecificacao, setModoPrecificacao] = useState<'markup' | 'margem'>('markup');

  // Modal Fornecedor
  const [modalFornecedorOpen, setModalFornecedorOpen] = useState(false);
  const [novoFornecedor, setNovoFornecedor] = useState<Partial<Fornecedor>>({});
  const [isSavingFornecedor, setIsSavingFornecedor] = useState(false);
  const [fornecedorError, setFornecedorError] = useState<string | null>(null);

  // Modal Insumo
  const [modalInsumoOpen, setModalInsumoOpen] = useState(false);
  const [novoInsumo, setNovoInsumo] = useState<{
    id?: string;
    nome: string;
    unidade_medida: 'kg' | 'g' | 'l' | 'ml' | 'un';
    preco_custo: string;
    quantidade_estoque: string;
    estoque_minimo: string;
    fornecedor_id: string;
  }>({
    nome: '',
    unidade_medida: 'kg',
    preco_custo: '0',
    quantidade_estoque: '0',
    estoque_minimo: '0',
    fornecedor_id: ''
  });
  const [isSavingInsumo, setIsSavingInsumo] = useState(false);
  const [insumoError, setInsumoError] = useState<string | null>(null);

  // Modal Ficha Técnica / Receita
  const [modalFichaOpen, setModalFichaOpen] = useState(false);
  const [tipoProdutoReceita, setTipoProdutoReceita] = useState<'existente' | 'novo'>('existente');
  const [novaFichaProdutoId, setNovaFichaProdutoId] = useState<string>('');
  const [novaFichaRendimento, setNovaFichaRendimento] = useState<string>('10');

  // Campos quando for cadastrar um Novo Produto da Panificadora diretamente na Ficha Técnica (ex: Tortas, Bolos)
  const [novoItemNome, setNovoItemNome] = useState<string>('');
  const [novoItemCategoriaId, setNovoItemCategoriaId] = useState<string>('');
  const [novoItemPreco, setNovoItemPreco] = useState<string>('');
  const [novoItemControlarEstoque, setNovoItemControlarEstoque] = useState<boolean>(false);
  const [novoItemEstoqueAtual, setNovoItemEstoqueAtual] = useState<string>('');

  const [novaFichaIngredientes, setNovaFichaIngredientes] = useState<Array<{ 
    insumo_id: string; 
    quantidade_utilizada: string;
    unidade_medida?: 'g' | 'kg' | 'ml' | 'l' | 'un';
  }>>([
    { insumo_id: '', quantidade_utilizada: '' }
  ]);
  const [isSavingFicha, setIsSavingFicha] = useState(false);
  const [fichaError, setFichaError] = useState<string | null>(null);

  // Modais de Diálogo
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: 'Aviso', message: '' });
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDestructive?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({ isOpen: false, title: 'Confirmação', message: '', isDestructive: false, onConfirm: () => {} });
  const [exportando, setExportando] = useState(false);

  // Modal Compra de Insumo
  const [compraInsumoModal, setCompraInsumoModal] = useState<{
    isOpen: boolean;
    insumo: Insumo | null;
    quantidade: string;
    valorTotal: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    insumo: null,
    quantidade: '',
    valorTotal: '',
    isSubmitting: false
  });

  // Notificação rápida tipo toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(prev => prev === msg ? null : prev);
    }, 4000);
  };

  // Travar o scroll da página enquanto qualquer modal do CMV estiver aberto
  useEffect(() => {
    const isAnyModalOpen = modalFornecedorOpen || modalInsumoOpen || modalFichaOpen || compraInsumoModal.isOpen;
    if (isAnyModalOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [modalFornecedorOpen, modalInsumoOpen, modalFichaOpen, compraInsumoModal.isOpen]);

  // Formata o consumo calculado por unidade do produto (ex: 10 pães => 0.050 kg / 50g por pão)
  const formatConsumoUnitario = (quantidadeTotal: number, rendimento: number, unidade: string) => {
    const rend = rendimento > 0 ? rendimento : 1;
    const unitQtd = quantidadeTotal / rend;
    if (unidade === 'kg') {
      if (unitQtd < 1) {
        const emGramas = unitQtd * 1000;
        return `${unitQtd >= 0.001 ? unitQtd.toFixed(3) : unitQtd.toFixed(4)} kg (${emGramas >= 1 ? emGramas.toFixed(1) : emGramas.toFixed(2)} g)`;
      }
      return `${unitQtd.toFixed(3)} kg`;
    }
    if (unidade === 'l') {
      if (unitQtd < 1) {
        const emMl = unitQtd * 1000;
        return `${unitQtd >= 0.001 ? unitQtd.toFixed(3) : unitQtd.toFixed(4)} l (${emMl >= 1 ? emMl.toFixed(1) : emMl.toFixed(2)} ml)`;
      }
      return `${unitQtd.toFixed(3)} l`;
    }
    if (unidade === 'g') {
      return `${unitQtd >= 1 ? unitQtd.toFixed(1) : unitQtd.toFixed(2)} g`;
    }
    if (unidade === 'ml') {
      return `${unitQtd >= 1 ? unitQtd.toFixed(1) : unitQtd.toFixed(2)} ml`;
    }
    return `${unitQtd.toFixed(2)} ${unidade}`;
  };

  const loadData = async () => {
    try {
      const [forns, ins, fts, prods, cats] = await Promise.all([
        fetchFornecedores(),
        fetchInsumos(),
        fetchFichasTecnicas(),
        fetchProdutos(),
        fetchCategorias()
      ]);
      setFornecedores(forns);
      setInsumos(ins);
      setFichas(fts);
      setProdutos(prods);
      setCategorias(cats);
    } catch (e) {
      console.warn('Erro ao carregar dados do CMV:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const getCustoProduto = (produtoId: string) => {
    const prod = produtos.find(p => p.id === produtoId);
    return calcularCustoUnitarioProduto(produtoId, fichas, insumos, prod);
  };

  const handleAbrirCompraInsumo = (insumo: Insumo) => {
    setCompraInsumoModal({
      isOpen: true,
      insumo,
      quantidade: '',
      valorTotal: '',
      isSubmitting: false
    });
  };

  const handleSalvarCompraInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compraInsumoModal.insumo) return;

    const qtd = parseFloat(compraInsumoModal.quantidade.replace(',', '.'));
    const val = parseFloat(compraInsumoModal.valorTotal.replace(',', '.'));

    if (isNaN(qtd) || qtd <= 0) {
      setAlertConfig({ isOpen: true, title: 'Aviso', message: 'Erro: Quantidade inválida. Digite um número maior que zero.' });
      return;
    }

    if (isNaN(val) || val < 0) {
      setAlertConfig({ isOpen: true, title: 'Aviso', message: 'Erro: Valor inválido. Digite um número positivo.' });
      return;
    }

    try {
      setCompraInsumoModal(prev => ({ ...prev, isSubmitting: true }));
      await registrarCompraInsumo(compraInsumoModal.insumo.id, qtd, val);
      await loadData();
      setCompraInsumoModal({
        isOpen: false,
        insumo: null,
        quantidade: '',
        valorTotal: '',
        isSubmitting: false
      });
      showToast('Compra registrada e estoque atualizado com sucesso!');
    } catch (err) {
      console.error(err);
      setCompraInsumoModal(prev => ({ ...prev, isSubmitting: false }));
      setAlertConfig({ isOpen: true, title: 'Erro', message: 'Erro ao registrar a compra de insumo. Tente novamente.' });
    }
  };

  const handleAplicarPreco = async (produto: Produto, novoPreco: number) => {
    try {
      await saveProduto({ ...produto, preco: novoPreco });
      setSimuladorProdutoId(null);
      await loadData();
      showToast(`Preço do produto "${produto.nome}" atualizado para R$ ${novoPreco.toFixed(2)}!`);
    } catch (err) {
      console.error(err);
      setAlertConfig({ isOpen: true, title: 'Aviso', message: 'Erro ao atualizar preço.' });
    }
  };

  const formatMoney = (v: number) => `R$ ${(Number(v) || 0).toFixed(2)}`;

  const calcularPrecoSimulado = (custo: number) => {
    const valorNum = parseFloat(margemDesejada) || 0;
    let precoSugerido = 0;
    let isInvalid = false;
    let lucroSugerido = 0;
    let margemFinal = 0;
    let markupFinal = 0;

    if (modoPrecificacao === 'markup') {
      if (valorNum < 0) {
        isInvalid = true;
      } else {
        lucroSugerido = custo * (valorNum / 100);
        precoSugerido = custo + lucroSugerido;
        margemFinal = precoSugerido > 0 ? (lucroSugerido / precoSugerido) * 100 : 0;
        markupFinal = valorNum;
      }
    } else {
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

  // ==========================================
  // HANDLERS: FORNECEDORES
  // ==========================================
  const handleSaveFornecedor = async () => {
    setFornecedorError(null);
    if (!novoFornecedor.nome_empresa?.trim()) {
      setFornecedorError('Por favor, informe o nome da empresa ou distribuidor.');
      return;
    }

    setIsSavingFornecedor(true);
    try {
      const saved = await saveFornecedor({
        id: novoFornecedor.id,
        nome_empresa: novoFornecedor.nome_empresa.trim(),
        contato_whatsapp: novoFornecedor.contato_whatsapp?.trim() || '',
        cnpj: novoFornecedor.cnpj?.trim() || undefined,
        cidade: novoFornecedor.cidade?.trim() || undefined
      });

      // Atualizar lista local imediatamente para feedback instantâneo
      setFornecedores(prev => {
        const exists = prev.some(x => x.id === saved.id);
        return exists ? prev.map(x => x.id === saved.id ? saved : x) : [...prev, saved];
      });

      setModalFornecedorOpen(false);
      setNovoFornecedor({});
      showToast(`Fornecedor "${saved.nome_empresa}" salvo com sucesso!`);
      await loadData();
    } catch (e) {
      console.error(e);
      setFornecedorError('Erro ao gravar fornecedor no sistema. Tente novamente.');
    } finally {
      setIsSavingFornecedor(false);
    }
  };

  // ==========================================
  // HANDLERS: INSUMOS
  // ==========================================
  const handleSaveInsumo = async () => {
    setInsumoError(null);
    if (!novoInsumo.nome.trim()) {
      setInsumoError('Por favor, informe o nome do insumo.');
      return;
    }

    const precoNum = parseFloat(novoInsumo.preco_custo.replace(',', '.'));
    if (isNaN(precoNum) || precoNum < 0) {
      setInsumoError('Informe um preço de custo válido (maior ou igual a zero). Ex: 12.50 ou 12,50');
      return;
    }

    const estoqueNum = parseFloat(novoInsumo.quantidade_estoque.replace(',', '.')) || 0;
    const estMinNum = parseFloat(novoInsumo.estoque_minimo.replace(',', '.')) || 0;

    setIsSavingInsumo(true);
    try {
      const saved = await saveInsumo({
        id: novoInsumo.id,
        nome: novoInsumo.nome.trim(),
        unidade_medida: novoInsumo.unidade_medida,
        preco_custo: precoNum,
        quantidade_estoque: estoqueNum,
        estoque_minimo: estMinNum,
        fornecedor_id: novoInsumo.fornecedor_id || ''
      });

      // Atualizar lista local imediatamente
      setInsumos(prev => {
        const exists = prev.some(x => x.id === saved.id);
        return exists ? prev.map(x => x.id === saved.id ? saved : x) : [...prev, saved];
      });

      setModalInsumoOpen(false);
      setNovoInsumo({
        nome: '',
        unidade_medida: 'kg',
        preco_custo: '0',
        quantidade_estoque: '0',
        estoque_minimo: '0',
        fornecedor_id: ''
      });
      showToast(`Insumo "${saved.nome}" gravado com sucesso!`);
      await loadData();
    } catch (e) {
      console.error(e);
      setInsumoError('Erro ao salvar insumo. Tente novamente.');
    } finally {
      setIsSavingInsumo(false);
    }
  };

  // ==========================================
  // HANDLERS: FICHAS TÉCNICAS (RECEITAS)
  // ==========================================
  const parseRendimento = (val: string): number => {
    if (!val) return 1;
    const match = val.replace(',', '.').match(/([0-9]+(?:\.[0-9]+)?)/);
    if (match) {
      const num = parseFloat(match[1]);
      return num > 0 ? num : 1;
    }
    return 1;
  };

  const handleAbrirModalReceita = (produtoId?: string) => {
    setFichaError(null);
    if (produtoId) {
      setTipoProdutoReceita('existente');
      setNovaFichaProdutoId(produtoId);
      const existing = fichas.filter(f => f.produto_id === produtoId && f.insumo_id);
      if (existing.length > 0) {
        setNovaFichaRendimento(String(existing[0].rendimento_unidades || 1));
        setNovaFichaIngredientes(existing.map(f => {
          const ins = insumos.find(i => i.id === f.insumo_id);
          const unidadeEscolhida = f.unidade_medida || ins?.unidade_medida || 'kg';
          const qtd = f.quantidade_original !== undefined 
            ? String(f.quantidade_original) 
            : String(f.quantidade_utilizada);
          return {
            insumo_id: f.insumo_id,
            quantidade_utilizada: qtd,
            unidade_medida: unidadeEscolhida
          };
        }));
      } else {
        setNovaFichaRendimento('10');
        setNovaFichaIngredientes([{ insumo_id: '', quantidade_utilizada: '' }]);
      }
    } else {
      setTipoProdutoReceita('existente');
      setNovaFichaProdutoId('');
      setNovoItemNome('');
      setNovoItemPreco('');
      setNovoItemControlarEstoque(false);
      setNovoItemEstoqueAtual('');
      if (categorias.length > 0) {
        const confCat = categorias.find(c => c.nome.toLowerCase().includes('confeit') || c.nome.toLowerCase().includes('bolo') || c.nome.toLowerCase().includes('torta') || c.nome.toLowerCase().includes('panif'));
        setNovoItemCategoriaId(confCat ? confCat.id : categorias[0].id);
      }
      setNovaFichaRendimento('10');
      setNovaFichaIngredientes([{ insumo_id: '', quantidade_utilizada: '' }]);
    }
    setModalFichaOpen(true);
  };

  const handleSelecionarProdutoNaReceita = (prodId: string) => {
    if (prodId === '__novo__') {
      setTipoProdutoReceita('novo');
      setNovaFichaProdutoId('');
      if (!novoItemCategoriaId && categorias.length > 0) {
        const confCat = categorias.find(c => c.nome.toLowerCase().includes('confeit') || c.nome.toLowerCase().includes('bolo') || c.nome.toLowerCase().includes('torta') || c.nome.toLowerCase().includes('panif'));
        setNovoItemCategoriaId(confCat ? confCat.id : categorias[0].id);
      }
      return;
    }

    setTipoProdutoReceita('existente');
    setNovaFichaProdutoId(prodId);
    setFichaError(null);
    const existing = fichas.filter(f => f.produto_id === prodId && f.insumo_id);
    if (existing.length > 0) {
      setNovaFichaRendimento(String(existing[0].rendimento_unidades || 1));
      setNovaFichaIngredientes(existing.map(f => {
        const ins = insumos.find(i => i.id === f.insumo_id);
        const unidadeEscolhida = f.unidade_medida || ins?.unidade_medida || 'kg';
        const qtd = f.quantidade_original !== undefined 
          ? String(f.quantidade_original) 
          : String(f.quantidade_utilizada);
        return {
          insumo_id: f.insumo_id,
          quantidade_utilizada: qtd,
          unidade_medida: unidadeEscolhida
        };
      }));
    } else {
      setNovaFichaRendimento('10');
      setNovaFichaIngredientes([{ insumo_id: '', quantidade_utilizada: '' }]);
    }
  };

  const handleSaveFicha = async () => {
    setFichaError(null);

    let targetProdutoId = novaFichaProdutoId;
    let targetProdutoNome = '';

    if (tipoProdutoReceita === 'novo') {
      if (!novoItemNome.trim()) {
        setFichaError('Informe o nome do novo produto da panificadora (ex: Bolo de Cenoura, Torta de Frango).');
        return;
      }
      const precoNum = parseFloat(novoItemPreco.replace(',', '.'));
      if (isNaN(precoNum) || precoNum <= 0) {
        setFichaError('Informe um preço de venda ao cliente válido maior que zero (ex: R$ 35,00).');
        return;
      }
      if (!novoItemCategoriaId && categorias.length > 0) {
        setFichaError('Selecione uma categoria para o produto no cardápio/PDV.');
        return;
      }
    } else {
      if (!novaFichaProdutoId) {
        setFichaError('Selecione qual produto receberá esta receita ou clique em "+ Cadastrar Novo Item".');
        return;
      }
    }

    const rendimentoNum = parseRendimento(novaFichaRendimento);
    if (isNaN(rendimentoNum) || rendimentoNum <= 0) {
      setFichaError('Informe o rendimento da receita (quantas unidades ela produz, ex: 1 bolo, 12 fatias, 10 pães, 50 salgados).');
      return;
    }

    const validIngredients = novaFichaIngredientes
      .map(ing => {
        const ins = insumos.find(i => i.id === ing.insumo_id);
        const qtdStr = String(ing.quantidade_utilizada || '').replace(',', '.');
        const match = qtdStr.match(/([0-9]+(?:\.[0-9]+)?)/);
        const qtd = match ? parseFloat(match[1]) : (parseFloat(qtdStr) || 0);
        const unidadeEscolhida = ing.unidade_medida || ins?.unidade_medida || 'un';
        return {
          insumo_id: ing.insumo_id || '',
          quantidade_utilizada: isNaN(qtd) ? 0 : qtd,
          quantidade_original: isNaN(qtd) ? 0 : qtd,
          unidade_medida: unidadeEscolhida
        };
      })
      .filter(ing => Boolean(ing.insumo_id && ing.quantidade_utilizada > 0));

    if (validIngredients.length === 0) {
      setFichaError('Adicione pelo menos um ingrediente com quantidade válida maior que zero (ex: 500 g ou 0.5 kg).');
      return;
    }

    const custoCalculadoToast = custoUnitarioProducaoAtual;
    setIsSavingFicha(true);
    try {
      if (tipoProdutoReceita === 'novo') {
        const precoNum = parseFloat(novoItemPreco.replace(',', '.'));
        const catId = novoItemCategoriaId || (categorias.length > 0 ? categorias[0].id : '');
        const estoqueNum = novoItemControlarEstoque ? (parseInt(novoItemEstoqueAtual, 10) || 0) : undefined;

        // 1. Criar e salvar o produto no catálogo (vai imediatamente para PDV, Cardápio, Cozinha e Garçom)
        const novoProdutoCriado = await saveProduto({
          nome: novoItemNome.trim(),
          preco: precoNum,
          categoria_id: catId,
          ativo: true,
          controlar_estoque: novoItemControlarEstoque,
          estoque_atual: estoqueNum,
          custo: custoCalculadoToast
        });

        targetProdutoId = novoProdutoCriado.id;
        targetProdutoNome = novoProdutoCriado.nome;
      } else {
        const prod = produtos.find(p => p.id === novaFichaProdutoId);
        targetProdutoNome = prod?.nome || 'o produto';
      }

      // 2. Salvar a receita completa vinculada ao produto com matemática exata
      const updated = await saveReceitaCompleta(targetProdutoId, validIngredients, rendimentoNum);
      setFichas(updated);

      setModalFichaOpen(false);
      setNovaFichaProdutoId('');
      setNovoItemNome('');
      setNovoItemPreco('');
      setNovoItemEstoqueAtual('');
      setNovoItemControlarEstoque(false);
      setTipoProdutoReceita('existente');
      setNovaFichaRendimento('10');
      setNovaFichaIngredientes([{ insumo_id: '', quantidade_utilizada: '' }]);

      showToast(`Item "${targetProdutoNome}" e Receita salvos com sucesso! Disponível imediatamente no PDV, Cardápio, Cozinha e Garçom com custo de ${formatMoney(custoCalculadoToast)}/un.`);
      await loadData();
    } catch (e: any) {
      console.error('Erro ao salvar receita:', e);
      setFichaError(e?.message || 'Erro ao gravar receita no banco de dados. Tente novamente.');
    } finally {
      setIsSavingFicha(false);
    }
  };

  // Rendimento numérico atual no modal com parser inteligente (ex: "10 pães" => 10)
  const rendimentoAtualNum = Math.max(0.0001, parseRendimento(novaFichaRendimento));

  // Cálculo de custo total da batelada no modal de Receita com conversão matemática de unidades
  const custoTotalReceitaAtual = novaFichaIngredientes.reduce((acc, ing) => {
    if (!ing.insumo_id) return acc;
    const ins = insumos.find(i => i.id === ing.insumo_id);
    if (!ins) return acc;
    const qtdStr = String(ing.quantidade_utilizada || '').replace(',', '.');
    const match = qtdStr.match(/([0-9]+(?:\.[0-9]+)?)/);
    const qtd = match ? parseFloat(match[1]) : (parseFloat(qtdStr) || 0);
    if (qtd <= 0) return acc;

    const unidadeUsada = ing.unidade_medida || ins.unidade_medida;
    const qtdBase = converterParaUnidadeBase(qtd, unidadeUsada, ins.unidade_medida);
    return acc + (ins.preco_custo * qtdBase);
  }, 0);

  // Custo de produção individual por produto (matemática real: batelada / rendimento)
  const custoUnitarioProducaoAtual = rendimentoAtualNum > 0 ? (custoTotalReceitaAtual / rendimentoAtualNum) : 0;

  const precoFinalVenda = tipoProdutoReceita === 'novo'
    ? (parseFloat(novoItemPreco.replace(',', '.')) || 0)
    : (produtos.find(p => p.id === novaFichaProdutoId)?.preco || 0);

  const produtoSelecionadoNome = tipoProdutoReceita === 'novo'
    ? (novoItemNome || 'Novo Produto')
    : (produtos.find(p => p.id === novaFichaProdutoId)?.nome || '');

  return (
    <div className="space-y-6">
      {/* Toast de Feedback */}
      {toastMsg && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between text-sm font-bold animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navegação entre Abas do CMV */}
      <div className="flex space-x-2 border-b border-amber-200 overflow-x-auto whitespace-nowrap pb-1">
        <button 
          onClick={() => setActiveTab('cmv')} 
          className={`py-2 px-4 transition-all cursor-pointer ${activeTab === 'cmv' ? 'border-b-2 border-amber-600 font-bold text-amber-800' : 'text-stone-600 hover:text-amber-800'}`}
        >
          <Calculator className="w-4 h-4 inline mr-2"/> Precificação e CMV
        </button>
        <button 
          onClick={() => setActiveTab('insumos')} 
          className={`py-2 px-4 transition-all cursor-pointer ${activeTab === 'insumos' ? 'border-b-2 border-amber-600 font-bold text-amber-800' : 'text-stone-600 hover:text-amber-800'}`}
        >
          <Package className="w-4 h-4 inline mr-2"/> Insumos ({insumos.length})
        </button>
        <button 
          onClick={() => setActiveTab('fornecedores')} 
          className={`py-2 px-4 transition-all cursor-pointer ${activeTab === 'fornecedores' ? 'border-b-2 border-amber-600 font-bold text-amber-800' : 'text-stone-600 hover:text-amber-800'}`}
        >
          <Truck className="w-4 h-4 inline mr-2"/> Fornecedores ({fornecedores.length})
        </button>
        <button 
          onClick={() => setActiveTab('fichas')} 
          className={`py-2 px-4 transition-all cursor-pointer ${activeTab === 'fichas' ? 'border-b-2 border-amber-600 font-bold text-amber-800' : 'text-stone-600 hover:text-amber-800'}`}
        >
          <FileText className="w-4 h-4 inline mr-2"/> Fichas Técnicas ({produtos.filter(p => fichas.some(f => f.produto_id === p.id)).length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: PRECIFICAÇÃO E CMV                                 */}
      {/* ======================================================== */}
      {activeTab === 'cmv' && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-amber-900">Análise de Custos e Margem (CMV)</h3>
              <p className="text-xs text-stone-500 mt-0.5">Custos calculados dinamicamente com base nas receitas e insumos</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleAbrirModalReceita()}
                className="flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-3.5 rounded-xl shadow-sm text-xs sm:text-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Receita</span>
              </button>
              <button
                onClick={handleExportarExcel}
                disabled={exportando}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold py-2.5 px-4 rounded-xl shadow-sm text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-60"
                title="Exporta planilha Excel formatada com todas as abas e gráficos"
              >
                {exportando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Exportar Excel (.xlsx)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Mobile View */}
          <div className="block sm:hidden space-y-4">
            {produtos.map(p => {
              const custo = getCustoProduto(p.id);
              const lucro = p.preco - custo;
              const margem = p.preco > 0 ? (lucro / p.preco) * 100 : 0;
              const perigo = margem < 50;
              const temReceita = fichas.some(f => f.produto_id === p.id);
              
              const isSimulando = simuladorProdutoId === p.id;
              const { precoSugerido, lucroSugerido, margemFinal, isInvalid } = calcularPrecoSimulado(custo);

              return (
                <div key={p.id} className={`p-4 rounded-xl shadow-sm border ${perigo ? 'border-red-200 bg-red-50/50' : 'border-amber-100 bg-white'}`}>
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="font-bold text-base text-slate-800 break-words">
                      <span>{p.nome}</span>
                      {perigo && <AlertTriangle className="w-4 h-4 text-red-500 inline ml-1.5 align-middle" />}
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${perigo ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {margem.toFixed(1)}%
                    </span>
                  </div>

                  <div className="mb-3">
                    {temReceita ? (
                      <button
                        onClick={() => handleAbrirModalReceita(p.id)}
                        className="inline-flex items-center gap-1.5 text-xs text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                        <span>Receita ({fichas.filter(f => f.produto_id === p.id).length} itens • Rende {fichas.find(f => f.produto_id === p.id)?.rendimento_unidades || 1} un)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAbrirModalReceita(p.id)}
                        className="inline-flex items-center gap-1 text-xs text-stone-500 bg-stone-50 hover:bg-amber-50 hover:text-amber-800 px-2 py-1 rounded-lg border border-dashed border-stone-300 font-medium cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Cadastrar Receita</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div className="bg-slate-50 p-2 rounded">
                      <div className="text-slate-500 mb-0.5">Venda</div>
                      <div className="font-medium text-slate-800">{formatMoney(p.preco)}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <div className="text-slate-500 mb-0.5">Custo</div>
                      <div className="font-medium text-red-600">{formatMoney(custo)}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <div className="text-slate-500 mb-0.5">Lucro</div>
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
                    className="w-full bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors"
                  >
                    {isSimulando ? 'Fechar Simulador' : 'Simular Preço'}
                  </button>

                  {isSimulando && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Modo de Precificação
                        </label>
                        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => { setModoPrecificacao('markup'); setMargemDesejada('100'); }}
                            className={`py-1.5 px-2 rounded-lg text-center transition-all ${modoPrecificacao === 'markup' ? 'bg-white shadow text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            % Lucro s/ Custo
                          </button>
                          <button
                            type="button"
                            onClick={() => { setModoPrecificacao('margem'); setMargemDesejada('50'); }}
                            className={`py-1.5 px-2 rounded-lg text-center transition-all ${modoPrecificacao === 'margem' ? 'bg-white shadow text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            Margem s/ Venda
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={margemDesejada}
                            onChange={(e) => setMargemDesejada(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10 text-sm"
                            placeholder={modoPrecificacao === 'markup' ? 'Ex: 100' : 'Ex: 50'}
                          />
                          <span className="absolute right-3 top-2 text-slate-400 font-bold">%</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-slate-500">Preço Sugerido:</span>
                          <span className={`text-lg font-black ${isInvalid ? 'text-red-600' : 'text-emerald-600'}`}>
                            {isInvalid ? 'Inválido' : formatMoney(precoSugerido)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAplicarPreco(p, precoSugerido)}
                        disabled={isInvalid || precoSugerido <= 0}
                        className={`w-full px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm text-xs ${isInvalid || precoSugerido <= 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]'}`}
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
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-amber-200 bg-amber-50/50 text-xs font-bold uppercase tracking-wider text-amber-900">
                  <th className="p-3">Produto</th>
                  <th className="p-3">Receita / Ficha</th>
                  <th className="p-3">Preço de Venda</th>
                  <th className="p-3">Custo Unitário</th>
                  <th className="p-3">Lucro Líquido</th>
                  <th className="p-3">Margem Atual</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map(p => {
                  const custo = getCustoProduto(p.id);
                  const lucro = p.preco - custo;
                  const margem = p.preco > 0 ? (lucro / p.preco) * 100 : 0;
                  const perigo = margem < 50;
                  const temReceita = fichas.some(f => f.produto_id === p.id);
                  const qtdIngredientes = fichas.filter(f => f.produto_id === p.id).length;
                  
                  const isSimulando = simuladorProdutoId === p.id;
                  const { precoSugerido, lucroSugerido, margemFinal, isInvalid } = calcularPrecoSimulado(custo);

                  return (
                    <React.Fragment key={p.id}>
                      <tr className={`border-b border-amber-50 hover:bg-amber-50/30 transition-colors ${perigo ? 'bg-red-50/30' : ''}`}>
                        <td className="p-3 font-semibold text-slate-800">
                          {p.nome}
                          {perigo && <span title="Margem abaixo de 50%"><AlertTriangle className="inline w-4 h-4 text-red-500 ml-1.5 align-middle" /></span>}
                        </td>
                        <td className="p-3">
                          {temReceita ? (
                            <button
                              onClick={() => handleAbrirModalReceita(p.id)}
                              className="inline-flex items-center gap-1.5 text-xs text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer"
                              title={`Clique para ver ou editar os insumos da receita (Rendimento: ${fichas.find(f => f.produto_id === p.id)?.rendimento_unidades || 1} un)`}
                            >
                              <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                              <span>{qtdIngredientes} {qtdIngredientes === 1 ? 'insumo' : 'insumos'} (Rende {fichas.find(f => f.produto_id === p.id)?.rendimento_unidades || 1} un)</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAbrirModalReceita(p.id)}
                              className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-amber-700 hover:bg-amber-50 px-2 py-1 rounded-lg border border-dashed border-stone-300 font-medium transition-colors"
                              title="Vincular insumos e receita a este produto"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Vincular Receita</span>
                            </button>
                          )}
                        </td>
                        <td className="p-3 text-slate-700 font-medium">{formatMoney(p.preco)}</td>
                        <td className="p-3 text-red-600 font-semibold">{formatMoney(custo)}</td>
                        <td className="p-3 text-emerald-700 font-bold">{formatMoney(lucro)}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${perigo ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
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
                            className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            {isSimulando ? 'Fechar' : 'Simular Preço'}
                          </button>
                        </td>
                      </tr>
                      {isSimulando && (
                        <tr className="bg-amber-50/40 border-b border-amber-100 animate-fadeIn">
                          <td colSpan={7} className="p-4 sm:p-5">
                            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm space-y-4">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                <div>
                                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Simulador de Precificação Inteligente</span>
                                  <h4 className="text-base font-bold text-slate-800 mt-0.5">Definir Novo Preço para: <span className="text-amber-800">{p.nome}</span></h4>
                                </div>
                                <div className="text-xs text-slate-500">
                                  Custo calculado: <strong className="text-red-600 font-bold">{formatMoney(custo)}</strong>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-slate-600">Lucro Desejado (%):</label>
                                    <span className="text-[11px] text-amber-600 font-medium">
                                      {modoPrecificacao === 'markup' ? 'Markup sobre o custo' : 'Margem de venda'}
                                    </span>
                                  </div>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      min="0"
                                      step="5"
                                      value={margemDesejada}
                                      onChange={(e) => setMargemDesejada(e.target.value)}
                                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10 text-sm"
                                      placeholder={modoPrecificacao === 'markup' ? 'Ex: 100' : 'Ex: 50'}
                                    />
                                    <span className="absolute right-3 top-2 text-slate-400 font-bold">%</span>
                                  </div>

                                  <div className="flex flex-wrap gap-1 pt-1.5">
                                    {['50', '100', '150', '200', '300'].map(val => (
                                      <button
                                        key={val}
                                        type="button"
                                        onClick={() => setMargemDesejada(val)}
                                        className={`px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${margemDesejada === val ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                      >
                                        +{val}%
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-center">
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
                                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer ${isInvalid || precoSugerido <= 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]'}`}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: INSUMOS                                           */}
      {/* ======================================================== */}
      {activeTab === 'insumos' && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-amber-900">Estoque de Insumos</h3>
              <p className="text-xs text-stone-500">Matérias-primas e ingredientes utilizados nas receitas da panificadora.</p>
            </div>
            <button 
              onClick={() => {
                setNovoInsumo({
                  nome: '',
                  unidade_medida: 'kg',
                  preco_custo: '0',
                  quantidade_estoque: '0',
                  estoque_minimo: '0',
                  fornecedor_id: ''
                });
                setInsumoError(null);
                setModalInsumoOpen(true);
              }} 
              className="w-full sm:w-auto justify-center bg-amber-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-amber-700 flex items-center shadow-sm cursor-pointer text-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Insumo
            </button>
          </div>

          {insumos.length === 0 ? (
            <div className="text-center py-10 px-4 border-2 border-dashed border-amber-200 rounded-xl bg-amber-50/20 my-4">
              <Package className="w-10 h-10 text-amber-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-stone-700">Nenhum insumo cadastrado</h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-3">
                Cadastre os insumos e matérias-primas (ex: Farinha de Trigo, Leite, Café, Queijo) para calcular os custos exatos.
              </p>
              <button
                onClick={() => {
                  setNovoInsumo({
                    nome: '',
                    unidade_medida: 'kg',
                    preco_custo: '0',
                    quantidade_estoque: '0',
                    estoque_minimo: '0',
                    fornecedor_id: ''
                  });
                  setInsumoError(null);
                  setModalInsumoOpen(true);
                }}
                className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar Primeiro Insumo
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left border-collapse">
                <thead>
                  <tr className="bg-amber-50/60 text-amber-900 border-b border-amber-200 text-xs font-bold uppercase tracking-wider">
                    <th className="p-3">Insumo</th>
                    <th className="p-3">Fornecedor</th>
                    <th className="p-3">Custo / Unidade</th>
                    <th className="p-3">Estoque Atual</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {insumos.map(i => {
                    const forn = fornecedores.find(f => f.id === i.fornecedor_id);
                    const baixo = i.quantidade_estoque <= i.estoque_minimo;
                    return (
                      <tr key={i.id} className="border-b border-amber-50 hover:bg-amber-50/20 transition-colors">
                        <td className="p-3 font-semibold text-slate-800">
                          {i.nome}
                          {baixo && <span className="ml-2 inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-bold">Estoque Baixo!</span>}
                        </td>
                        <td className="p-3 text-slate-600 text-sm">
                          {forn ? forn.nome_empresa : <span className="text-stone-400 italic">Não vinculado</span>}
                        </td>
                        <td className="p-3 text-slate-700 font-semibold">{formatMoney(i.preco_custo)} / {i.unidade_medida}</td>
                        <td className={`p-3 font-bold ${baixo ? 'text-red-600' : 'text-slate-800'}`}>
                          {i.quantidade_estoque.toFixed(2)} {i.unidade_medida}
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <button 
                            onClick={() => handleAbrirCompraInsumo(i)} 
                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors inline-block cursor-pointer" 
                            title="Registrar Compra / Repor Estoque"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setNovoInsumo({
                                id: i.id,
                                nome: i.nome,
                                unidade_medida: i.unidade_medida,
                                preco_custo: String(i.preco_custo),
                                quantidade_estoque: String(i.quantidade_estoque),
                                estoque_minimo: String(i.estoque_minimo),
                                fornecedor_id: i.fornecedor_id || ''
                              });
                              setInsumoError(null);
                              setModalInsumoOpen(true);
                            }} 
                            className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors inline-block cursor-pointer" 
                            title="Editar Insumo"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmConfig({
                                isOpen: true,
                                title: 'Excluir Insumo',
                                message: `Tem certeza que deseja remover o insumo "${i.nome}"?`,
                                isDestructive: true,
                                onConfirm: async () => {
                                  try {
                                    await deleteInsumo(i.id);
                                    await loadData();
                                    showToast(`Insumo "${i.nome}" excluído com sucesso.`);
                                  } catch (err) {
                                    console.error('Erro ao excluir insumo:', err);
                                    showToast(`Erro ao excluir insumo.`);
                                  }
                                }
                              });
                            }}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-block cursor-pointer"
                            title="Excluir Insumo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: FORNECEDORES                                      */}
      {/* ======================================================== */}
      {activeTab === 'fornecedores' && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-amber-900">Fornecedores</h3>
              <p className="text-xs text-stone-500">Parceiros e distribuidores vinculados aos insumos da empresa.</p>
            </div>
            <button 
              onClick={() => {
                setNovoFornecedor({});
                setFornecedorError(null);
                setModalFornecedorOpen(true);
              }} 
              className="w-full sm:w-auto justify-center bg-amber-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-amber-700 flex items-center shadow-sm cursor-pointer text-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Fornecedor
            </button>
          </div>

          {fornecedores.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-amber-200 rounded-xl bg-amber-50/20 my-4">
              <Truck className="w-12 h-12 text-amber-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-stone-800">Nenhum fornecedor cadastrado</h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 mb-4">
                Cadastre seus fornecedores parceiros para organizar as compras e vincular automaticamente aos insumos.
              </p>
              <button
                onClick={() => {
                  setNovoFornecedor({});
                  setFornecedorError(null);
                  setModalFornecedorOpen(true);
                }}
                className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Primeiro Fornecedor
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fornecedores.map(f => (
                <div key={f.id} className="p-4 border border-stone-200 rounded-xl flex flex-col justify-between gap-3 hover:border-amber-300 transition-colors bg-white shadow-xs">
                  <div>
                    <h4 className="font-bold text-base text-slate-800">{f.nome_empresa}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {f.cidade ? `${f.cidade} • ` : ''}CNPJ: {f.cnpj || 'Não informado'}
                    </p>
                    {f.contato_whatsapp && (
                      <p className="text-xs text-stone-500 font-mono mt-1">
                        Tel/WhatsApp: {f.contato_whatsapp}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                    <div>
                      {f.contato_whatsapp ? (
                        <a 
                          href={`https://wa.me/${f.contato_whatsapp.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors"
                        >
                          Chamar no WhatsApp
                        </a>
                      ) : (
                        <span className="text-[11px] text-stone-400">Sem telefone</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setNovoFornecedor(f);
                          setFornecedorError(null);
                          setModalFornecedorOpen(true);
                        }}
                        className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar Fornecedor"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: 'Excluir Fornecedor',
                            message: `Tem certeza que deseja remover o fornecedor "${f.nome_empresa}"?`,
                            isDestructive: true,
                            onConfirm: async () => {
                              try {
                                await deleteFornecedor(f.id);
                                await loadData();
                                showToast(`Fornecedor "${f.nome_empresa}" excluído com sucesso.`);
                              } catch (err) {
                                console.error('Erro ao excluir fornecedor:', err);
                                showToast(`Erro ao excluir fornecedor.`);
                              }
                            }
                          });
                        }}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Fornecedor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 4: FICHAS TÉCNICAS (RECEITAS)                        */}
      {/* ======================================================== */}
      {activeTab === 'fichas' && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-amber-900">Fichas Técnicas & Receitas</h3>
              <p className="text-xs text-stone-500">Composição exata de ingredientes e custos de fabricação para cada produto.</p>
            </div>
            <button 
              onClick={() => handleAbrirModalReceita()}
              className="w-full sm:w-auto justify-center bg-amber-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-amber-700 flex items-center shadow-sm cursor-pointer text-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nova Receita
            </button>
          </div>

          {produtos.filter(p => fichas.some(f => f.produto_id === p.id)).length === 0 ? (
            <div className="text-center py-10 px-4 border-2 border-dashed border-amber-200 rounded-xl bg-amber-50/20 my-4">
              <FileText className="w-10 h-10 text-amber-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-stone-700">Nenhuma ficha técnica cadastrada</h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-3">
                Crie receitas associando insumos aos produtos (ex: Pão Francês com Farinha, Sal, Fermento) para calcular o CMV e a margem de lucro exata.
              </p>
              <button
                onClick={() => handleAbrirModalReceita()}
                className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Criar Primeira Receita
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {produtos.filter(p => fichas.some(f => f.produto_id === p.id)).map(p => {
                const ingredientesProduto = fichas.filter(f => f.produto_id === p.id);
                const rendimento = (ingredientesProduto[0]?.rendimento_unidades && ingredientesProduto[0].rendimento_unidades > 0)
                  ? ingredientesProduto[0].rendimento_unidades
                  : 1;

                let custoBateladaTotal = 0;
                ingredientesProduto.forEach(f => {
                  const ins = insumos.find(i => i.id === f.insumo_id);
                  if (ins) {
                    const qtdBase = converterParaUnidadeBase(f.quantidade_utilizada, f.unidade_medida, ins.unidade_medida);
                    custoBateladaTotal += ins.preco_custo * qtdBase;
                  }
                  if (f.custo_direto) custoBateladaTotal += f.custo_direto * rendimento;
                });

                const custoUnitario = calcularCustoUnitarioProduto(p.id, fichas, insumos, p);
                const lucro = p.preco - custoUnitario;
                const margem = p.preco > 0 ? (lucro / p.preco) * 100 : 0;

                return (
                  <div key={p.id} className="border border-amber-200 rounded-2xl bg-amber-50/20 p-4 sm:p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-amber-200/60 pb-3 mb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-base sm:text-lg text-amber-950">{p.nome}</h4>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            Rende: {rendimento} {rendimento === 1 ? 'unidade' : 'unidades / pães'}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Preço de Venda: {formatMoney(p.preco)}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-1">
                          {ingredientesProduto.length} {ingredientesProduto.length === 1 ? 'insumo cadastrado' : 'insumos cadastrados'} • Consumo e custos calculados por unidade produzida
                        </p>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => handleAbrirModalReceita(p.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar Receita Completa</span>
                        </button>
                        <button
                          onClick={() => {
                            setConfirmConfig({
                              isOpen: true,
                              title: 'Excluir Toda a Receita',
                              message: `Deseja remover todos os ingredientes da receita de "${p.nome}"?`,
                              isDestructive: true,
                              onConfirm: async () => {
                                try {
                                  await deleteReceitaCompleta(p.id);
                                  await loadData();
                                  showToast(`Receita de "${p.nome}" removida com sucesso.`);
                                } catch (err) {
                                  console.error('Erro ao excluir receita:', err);
                                  showToast(`Erro ao excluir receita.`);
                                }
                              }
                            });
                          }}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir Receita Completa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <ul className="space-y-2 text-sm">
                      {ingredientesProduto.map(f => {
                        const ins = insumos.find(i => i.id === f.insumo_id);
                        const unidadeExibicao = f.unidade_medida || ins?.unidade_medida || 'un';
                        const qtdExibicao = f.quantidade_original !== undefined ? f.quantidade_original : f.quantidade_utilizada;
                        const qtdBase = ins ? converterParaUnidadeBase(qtdExibicao, unidadeExibicao, ins.unidade_medida) : 0;
                        const custoItem = ins ? qtdBase * ins.preco_custo : 0;
                        const consumoUnitarioStr = formatConsumoUnitario(qtdExibicao, rendimento, unidadeExibicao);
                        const custoUnitarioItem = rendimento > 0 ? (custoItem / rendimento) : 0;

                        return (
                          <li key={f.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-3 rounded-xl border border-stone-200/80 text-xs sm:text-sm gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800">
                                {ins ? ins.nome : <span className="text-stone-400 italic">(Insumo não localizado)</span>}
                              </span>
                              {ins && (
                                <span className="text-xs text-stone-400">
                                  ({formatMoney(ins.preco_custo)}/{ins.unidade_medida})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                              <div className="text-left sm:text-right">
                                <div className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                                  Consumo/unidade: {consumoUnitarioStr}
                                </div>
                                <div className="text-[10px] text-stone-400 mt-0.5">
                                  Total receita: {qtdExibicao} {unidadeExibicao}
                                  {unidadeExibicao !== ins?.unidade_medida && ins && (
                                    <span> (= {qtdBase < 1 ? qtdBase.toFixed(3) : qtdBase.toFixed(2)} {ins.unidade_medida})</span>
                                  )} • ({formatMoney(custoItem)})
                                </div>
                              </div>
                              <div className="text-right min-w-[70px]">
                                <span className="font-bold text-red-600 block text-xs sm:text-sm">
                                  {formatMoney(custoUnitarioItem)}/un
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setConfirmConfig({
                                    isOpen: true,
                                    title: 'Remover Ingrediente',
                                    message: `Remover este ingrediente da receita?`,
                                    isDestructive: true,
                                    onConfirm: async () => {
                                      try {
                                        await deleteFichaTecnica(f.id);
                                        await loadData();
                                        showToast('Ingrediente removido da receita com sucesso.');
                                      } catch (err) {
                                        console.error('Erro ao remover ingrediente:', err);
                                        showToast('Erro ao remover ingrediente.');
                                      }
                                    }
                                  });
                                }}
                                className="text-stone-300 hover:text-red-500 p-1 cursor-pointer transition-colors"
                                title="Remover este ingrediente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="mt-3 pt-3 border-t border-amber-200/60 flex flex-wrap justify-between items-center text-xs sm:text-sm gap-2">
                      <div className="text-stone-600 font-medium">
                        Margem Líquida: <strong className={margem < 50 ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}>{margem.toFixed(1)}%</strong>
                        <span className="text-stone-400 ml-1.5">({formatMoney(lucro)} lucro/unidade)</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs text-stone-500">
                          Batelada ({rendimento} un): <strong className="text-stone-700 font-bold">{formatMoney(custoBateladaTotal)}</strong>
                        </span>
                        <div className="font-bold text-amber-900 text-sm sm:text-base">
                          Custo Unitário de Produção: <span className="text-red-600 font-black">{formatMoney(custoUnitario)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: FORNECEDOR                                        */}
      {/* ======================================================== */}
      {modalFornecedorOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[80] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-stone-100">
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  {novoFornecedor.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                </h3>
              </div>
              <button 
                onClick={() => setModalFornecedorOpen(false)} 
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {fornecedorError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{fornecedorError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nome da Empresa / Distribuidor <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={novoFornecedor.nome_empresa || ''} 
                  onChange={e => setNovoFornecedor({...novoFornecedor, nome_empresa: e.target.value})} 
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" 
                  placeholder="Ex: Moinho Real ou Distribuidora Sul" 
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  WhatsApp / Telefone (Opcional)
                </label>
                <input 
                  type="text" 
                  value={novoFornecedor.contato_whatsapp || ''} 
                  onChange={e => setNovoFornecedor({...novoFornecedor, contato_whatsapp: e.target.value})} 
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" 
                  placeholder="Ex: 44999999999" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  CNPJ (Opcional)
                </label>
                <input 
                  type="text" 
                  value={novoFornecedor.cnpj || ''} 
                  onChange={e => setNovoFornecedor({...novoFornecedor, cnpj: e.target.value})} 
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" 
                  placeholder="00.000.000/0001-00" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Cidade / Estado (Opcional)
                </label>
                <input 
                  type="text" 
                  value={novoFornecedor.cidade || ''} 
                  onChange={e => setNovoFornecedor({...novoFornecedor, cidade: e.target.value})} 
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" 
                  placeholder="Ex: Umuarama - PR" 
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setModalFornecedorOpen(false)} 
                  className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-600 rounded-xl font-bold hover:bg-stone-50 transition cursor-pointer text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveFornecedor} 
                  disabled={isSavingFornecedor}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition cursor-pointer text-sm flex items-center justify-center gap-1.5"
                >
                  {isSavingFornecedor && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSavingFornecedor ? 'Gravando...' : (novoFornecedor.id ? 'Salvar Alterações' : 'Cadastrar Fornecedor')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* MODAL: INSUMO                                            */}
      {/* ======================================================== */}
      {modalInsumoOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[80] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto border border-stone-100">
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-stone-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  {novoInsumo.id ? 'Editar Insumo' : 'Novo Insumo'}
                </h3>
              </div>
              <button 
                onClick={() => setModalInsumoOpen(false)} 
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {insumoError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{insumoError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nome do Insumo / Matéria-Prima <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={novoInsumo.nome} 
                  onChange={e => setNovoInsumo({...novoInsumo, nome: e.target.value})} 
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" 
                  placeholder="Ex: Farinha de Trigo Especial, Queijo Mussarela" 
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Fornecedor Principal (Opcional)
                </label>
                <div className="relative">
                  <select 
                    value={novoInsumo.fornecedor_id} 
                    onChange={e => setNovoInsumo({...novoInsumo, fornecedor_id: e.target.value})} 
                    className="appearance-none bg-white border border-stone-300 text-stone-800 text-sm py-2 px-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 w-full"
                  >
                    <option value="">{fornecedores.length === 0 ? '(Nenhum fornecedor cadastrado)' : 'Selecione um fornecedor (Opcional)'}</option>
                    {fornecedores.map(f => (
                      <option key={f.id} value={f.id}>{f.nome_empresa}{f.cidade ? ` - ${f.cidade}` : ''}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Unidade de Medida
                  </label>
                  <div className="relative">
                    <select 
                      value={novoInsumo.unidade_medida} 
                      onChange={e => setNovoInsumo({...novoInsumo, unidade_medida: e.target.value as any})} 
                      className="appearance-none bg-white border border-stone-300 text-stone-800 text-sm py-2 px-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 w-full"
                    >
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
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Preço de Custo (R$) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={novoInsumo.preco_custo} 
                    onChange={e => setNovoInsumo({...novoInsumo, preco_custo: e.target.value})} 
                    className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-slate-800" 
                    placeholder="Ex: 4.50 ou 4,50" 
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">Por {novoInsumo.unidade_medida}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Estoque Atual
                  </label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={novoInsumo.quantidade_estoque} 
                    onChange={e => setNovoInsumo({...novoInsumo, quantidade_estoque: e.target.value})} 
                    className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" 
                    placeholder="Ex: 10" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Estoque Mínimo
                  </label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={novoInsumo.estoque_minimo} 
                    onChange={e => setNovoInsumo({...novoInsumo, estoque_minimo: e.target.value})} 
                    className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" 
                    placeholder="Ex: 2" 
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setModalInsumoOpen(false)} 
                  className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-600 rounded-xl font-bold hover:bg-stone-50 transition cursor-pointer text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveInsumo} 
                  disabled={isSavingInsumo}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition cursor-pointer text-sm flex items-center justify-center gap-1.5"
                >
                  {isSavingInsumo && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSavingInsumo ? 'Gravando...' : (novoInsumo.id ? 'Salvar Alterações' : 'Salvar Insumo')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* MODAL: FICHA TÉCNICA (RECEITA)                           */}
      {/* ======================================================== */}
      {modalFichaOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[80] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto border border-stone-100 flex flex-col">
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-stone-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800">
                      Nova Receita / Insumos
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 hidden sm:inline">
                      Alimenta Catálogo, PDV e Cardápio
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    Cadastre novos itens para o catálogo (bolos, tortas) ou vincule receitas a produtos já existentes.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setModalFichaOpen(false)} 
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 flex-1">
              {fichaError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{fichaError}</span>
                </div>
              )}

              {/* Seletor de Modo: Produto Existente ou Novo Produto da Panificadora */}
              <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTipoProdutoReceita('existente')}
                  className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    tipoProdutoReceita === 'existente'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Produto Já Cadastrado</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoProdutoReceita('novo');
                    if (!novoItemCategoriaId && categorias.length > 0) {
                      const confCat = categorias.find(c => c.nome.toLowerCase().includes('confeit') || c.nome.toLowerCase().includes('bolo') || c.nome.toLowerCase().includes('torta') || c.nome.toLowerCase().includes('panif'));
                      setNovoItemCategoriaId(confCat ? confCat.id : categorias[0].id);
                    }
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    tipoProdutoReceita === 'novo'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-500 hover:text-amber-800'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Cadastrar Novo Item (Bolo, Torta, etc.)</span>
                </button>
              </div>

              {/* MODO 1: PRODUTO EXISTENTE */}
              {tipoProdutoReceita === 'existente' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Produto Final da Padaria <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select 
                        value={novaFichaProdutoId} 
                        onChange={e => handleSelecionarProdutoNaReceita(e.target.value)} 
                        className="appearance-none bg-white border border-stone-300 text-stone-800 text-sm py-2 px-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 w-full font-semibold"
                      >
                        <option value="">Selecione o produto a precificar...</option>
                        {produtos.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nome} — Venda: {formatMoney(p.preco)}
                          </option>
                        ))}
                        <option value="__novo__" className="font-bold text-amber-700 bg-amber-50">
                          + Cadastrar Novo Item (Bolo, Torta, etc.)...
                        </option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-stone-700">
                        Rendimento da Receita <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] font-bold text-amber-800">
                        {rendimentoAtualNum} {rendimentoAtualNum === 1 ? 'unidade' : 'unidades / pães'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={novaFichaRendimento}
                        onChange={e => setNovaFichaRendimento(e.target.value)}
                        placeholder="Ex: 10 pães"
                        className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-stone-400">un</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] text-stone-400 font-semibold">Exemplos:</span>
                      {['1', '10', '20', '30', '50', '100'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setNovaFichaRendimento(val)}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                            novaFichaRendimento === val 
                              ? 'bg-amber-600 text-white shadow-xs' 
                              : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-300 hover:text-amber-800'
                          }`}
                        >
                          {val === '1' ? '1 un' : `${val} un`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* MODO 2: CADASTRO DE NOVO ITEM DA PADARIA (BOLO, TORTA, ETC.) */
                <div className="bg-amber-50/70 p-3.5 sm:p-4 rounded-2xl border border-amber-200/90 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                        Novo Item para o Catálogo e PDV
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        O item entrará imediatamente no PDV/Caixa, Cardápio Digital e Comandas do Garçom com esta receita e custo.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Nome do Item / Produto Vendido <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={novoItemNome}
                        onChange={e => setNovoItemNome(e.target.value)}
                        placeholder="Ex: Torta de Frango com Requeijão, Bolo de Cenoura Trufado, Torta Alemã"
                        className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Categoria no Cardápio / PDV <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={novoItemCategoriaId}
                          onChange={e => setNovoItemCategoriaId(e.target.value)}
                          className="appearance-none bg-white border border-stone-300 text-stone-800 text-sm py-2 px-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 w-full font-medium"
                        >
                          {categorias.length === 0 && <option value="">Sem categorias cadastradas</option>}
                          {categorias.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.nome}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Preço de Venda ao Cliente (R$) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-stone-400">R$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={novoItemPreco}
                          onChange={e => setNovoItemPreco(e.target.value)}
                          placeholder="0,00"
                          className="w-full bg-white border border-stone-300 rounded-xl pl-9 pr-3 py-2 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-stone-700">
                          Rendimento da Receita <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[11px] font-bold text-amber-800">
                          {rendimentoAtualNum} {rendimentoAtualNum === 1 ? 'unidade' : 'unidades / fatias / pães'}
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={novaFichaRendimento}
                          onChange={e => setNovaFichaRendimento(e.target.value)}
                          placeholder="Ex: 1 bolo, 12 fatias, 20 pedaços"
                          className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="absolute right-3 top-2 text-xs font-bold text-stone-400">un</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] text-stone-400 font-semibold">Sugestões rápidas:</span>
                        {['1', '6', '10', '12', '20', '30', '50'].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setNovaFichaRendimento(val)}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                              novaFichaRendimento === val 
                                ? 'bg-amber-600 text-white shadow-xs' 
                                : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-300 hover:text-amber-800'
                            }`}
                          >
                            {val === '1' ? '1 un (unid. inteira)' : `${val} un`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-amber-200/60">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
                        <input
                          type="checkbox"
                          checked={novoItemControlarEstoque}
                          onChange={e => setNovoItemControlarEstoque(e.target.checked)}
                          className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span>Controlar estoque de pronta-entrega na vitrine</span>
                      </label>
                      {novoItemControlarEstoque && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-stone-500 font-medium">Estoque Inicial:</span>
                          <input
                            type="number"
                            value={novoItemEstoqueAtual}
                            onChange={e => setNovoItemEstoqueAtual(e.target.value)}
                            placeholder="0"
                            className="w-20 bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs font-bold text-center"
                          />
                          <span className="text-xs text-stone-500">un</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de Ingredientes */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                      Ingredientes / Matérias-Primas Utilizadas
                    </label>
                    <p className="text-[11px] text-stone-500">
                      Informe o total usado na receita. O sistema calcula automaticamente o consumo por unidade.
                    </p>
                  </div>
                  <span className="text-xs text-stone-500 shrink-0">
                    {insumos.length} insumos disponíveis
                  </span>
                </div>

                {insumos.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-amber-200 bg-amber-50/40 text-center">
                    <p className="text-xs text-amber-800 font-semibold mb-1">
                      Nenhum insumo disponível para montar a receita!
                    </p>
                    <p className="text-[11px] text-stone-500 mb-2">
                      Cadastre os insumos primeiro na aba "Insumos" antes de montar a ficha técnica.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setModalFichaOpen(false);
                        setActiveTab('insumos');
                        setModalInsumoOpen(true);
                      }}
                      className="inline-flex items-center gap-1 bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Cadastrar Insumo Agora
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {novaFichaIngredientes.map((ing, idx) => {
                      const insumoSel = insumos.find(i => i.id === ing.insumo_id);
                      const unidadeBase = insumoSel?.unidade_medida || 'kg';
                      const opcoesUnidades: Array<'g' | 'kg' | 'ml' | 'l' | 'un'> = 
                        unidadeBase === 'kg' || unidadeBase === 'g' 
                          ? ['g', 'kg'] 
                          : (unidadeBase === 'l' || unidadeBase === 'ml' ? ['ml', 'l'] : ['un']);

                      const unidadeEscolhida = ing.unidade_medida || (unidadeBase === 'kg' ? 'g' : unidadeBase);
                      const qtdNum = parseFloat(String(ing.quantidade_utilizada || '').replace(',', '.')) || 0;
                      const qtdBase = insumoSel ? converterParaUnidadeBase(qtdNum, unidadeEscolhida, insumoSel.unidade_medida) : 0;
                      const subtotal = insumoSel ? qtdBase * insumoSel.preco_custo : 0;
                      const consumoUnitarioStr = formatConsumoUnitario(qtdNum, rendimentoAtualNum, unidadeEscolhida);
                      const custoUnitarioItem = rendimentoAtualNum > 0 ? (subtotal / rendimentoAtualNum) : 0;

                      return (
                        <div key={idx} className="p-3 border border-stone-200 rounded-xl bg-stone-50/60 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 relative">
                              <select 
                                value={ing.insumo_id || ''} 
                                onChange={e => {
                                  const selId = e.target.value;
                                  const insNovo = insumos.find(i => i.id === selId);
                                  const copy = [...novaFichaIngredientes];
                                  const defaultUnit = insNovo ? (insNovo.unidade_medida === 'kg' ? 'g' : (insNovo.unidade_medida === 'l' ? 'ml' : insNovo.unidade_medida)) : 'g';
                                  copy[idx] = { 
                                    ...copy[idx], 
                                    insumo_id: selId,
                                    unidade_medida: defaultUnit as any
                                  };
                                  setNovaFichaIngredientes(copy);
                                }} 
                                className="appearance-none bg-white border border-stone-300 text-stone-800 text-xs sm:text-sm py-2 px-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 w-full"
                              >
                                <option value="">Selecione o insumo...</option>
                                {insumos.map(i => (
                                  <option key={i.id} value={i.id}>
                                    {i.nome} ({formatMoney(i.preco_custo)}/{i.unidade_medida})
                                  </option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                                <ChevronDown className="w-4 h-4" />
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 w-44">
                              <input 
                                type="text" 
                                inputMode="decimal"
                                value={ing.quantidade_utilizada} 
                                onChange={e => {
                                  const copy = [...novaFichaIngredientes];
                                  copy[idx] = { ...copy[idx], quantidade_utilizada: e.target.value };
                                  setNovaFichaIngredientes(copy);
                                }} 
                                className="w-full border border-stone-300 rounded-xl px-2.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-center bg-white" 
                                placeholder={unidadeEscolhida}
                              />
                              {opcoesUnidades.length > 1 ? (
                                <select
                                  value={unidadeEscolhida}
                                  onChange={e => {
                                    const copy = [...novaFichaIngredientes];
                                    copy[idx] = { ...copy[idx], unidade_medida: e.target.value as any };
                                    setNovaFichaIngredientes(copy);
                                  }}
                                  className="bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 text-xs font-bold py-2 px-2 rounded-xl cursor-pointer outline-none shrink-0"
                                  title="Unidade da receita"
                                >
                                  {opcoesUnidades.map(u => (
                                    <option key={u} value={u}>{u}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-xs font-bold text-stone-500 px-1 shrink-0">
                                  {insumoSel?.unidade_medida || 'un'}
                                </span>
                              )}
                            </div>

                            {novaFichaIngredientes.length > 1 && (
                              <button 
                                type="button"
                                onClick={() => {
                                  const filtered = novaFichaIngredientes.filter((_, i) => i !== idx);
                                  setNovaFichaIngredientes(filtered);
                                }} 
                                className="text-stone-400 hover:text-red-600 p-2 rounded-lg cursor-pointer"
                                title="Remover item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {insumoSel && (
                            <div className="flex flex-wrap justify-between items-center text-xs bg-white px-3 py-1.5 rounded-lg border border-stone-200/60 gap-1.5">
                              <div className="text-stone-600">
                                Total na receita: <strong>{qtdNum} {unidadeEscolhida}</strong>
                                {unidadeEscolhida !== insumoSel.unidade_medida && (
                                  <span className="text-[11px] text-stone-400 ml-1">
                                    (= {qtdBase < 1 ? qtdBase.toFixed(3) : qtdBase.toFixed(2)} {insumoSel.unidade_medida})
                                  </span>
                                )}
                                <span className="text-stone-700 font-bold ml-1.5">({formatMoney(subtotal)})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[11px]">
                                  Consumo por unidade: {consumoUnitarioStr}
                                </span>
                                <span className="font-bold text-red-600 text-[11px]">
                                  {formatMoney(custoUnitarioItem)} / un
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <button 
                      type="button"
                      onClick={() => setNovaFichaIngredientes([...novaFichaIngredientes, { insumo_id: '', quantidade_utilizada: '' }])} 
                      className="text-amber-700 hover:text-amber-800 font-bold text-xs flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-amber-50 cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar outro ingrediente à receita</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Resumo de Custos, Rendimento e Margem em Tempo Real */}
              <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                    <span className="block text-[10px] font-bold text-stone-500 uppercase">Custo da Receita</span>
                    <span className="text-sm sm:text-base font-black text-slate-800">{formatMoney(custoTotalReceitaAtual)}</span>
                    <span className="block text-[10px] text-stone-400">Batelada total</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                    <span className="block text-[10px] font-bold text-stone-500 uppercase">Rendimento</span>
                    <span className="text-sm sm:text-base font-black text-amber-800">{rendimentoAtualNum} un</span>
                    <span className="block text-[10px] text-stone-400">Unidades produzidas</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200 col-span-2 sm:col-span-1 shadow-xs">
                    <span className="block text-[10px] font-bold text-red-600 uppercase">Custo por Produto</span>
                    <span className="text-base sm:text-lg font-black text-red-600">{formatMoney(custoUnitarioProducaoAtual)}</span>
                    <span className="block text-[10px] text-stone-400">Consumo individual</span>
                  </div>
                </div>

                {precoFinalVenda > 0 && (
                  <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-stone-600 font-medium">Preço de Venda ({produtoSelecionadoNome}):</span>
                      <span className="text-sm font-bold text-slate-800">{formatMoney(precoFinalVenda)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-stone-100 pt-1.5">
                      <span className="text-stone-600 font-medium">Lucro Líquido por Unidade:</span>
                      <span className="font-bold text-emerald-700">
                        +{formatMoney(precoFinalVenda - custoUnitarioProducaoAtual)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-stone-100 pt-1.5">
                      <span className="text-stone-600 font-medium">Margem Líquida Projetada:</span>
                      <span className={`font-black text-sm ${((precoFinalVenda - custoUnitarioProducaoAtual) / precoFinalVenda) * 100 < 50 ? 'text-red-600' : 'text-emerald-700'}`}>
                        {(((precoFinalVenda - custoUnitarioProducaoAtual) / precoFinalVenda) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setModalFichaOpen(false)} 
                  className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-600 rounded-xl font-bold hover:bg-stone-50 transition cursor-pointer text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveFicha} 
                  disabled={isSavingFicha || insumos.length === 0}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition cursor-pointer text-sm flex items-center justify-center gap-1.5"
                >
                  {isSavingFicha && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {isSavingFicha 
                      ? 'Gravando Produto e Receita...' 
                      : (tipoProdutoReceita === 'novo' ? 'Cadastrar Produto & Salvar Receita' : 'Salvar Receita Completa')
                    }
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTRAR COMPRA DE INSUMO                        */}
      {/* ======================================================== */}
      {compraInsumoModal.isOpen && compraInsumoModal.insumo && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[80] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-100">
            <div className="flex justify-between items-center mb-4 border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-800">Registrar Compra / Repor Estoque</h3>
                <p className="text-xs text-amber-800 font-semibold">
                  {compraInsumoModal.insumo.nome} ({compraInsumoModal.insumo.unidade_medida})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCompraInsumoModal(prev => ({ ...prev, isOpen: false, insumo: null }))}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarCompraInsumo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Quantidade Comprada ({compraInsumoModal.insumo.unidade_medida}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 10 ou 2.5"
                  value={compraInsumoModal.quantidade}
                  onChange={e => setCompraInsumoModal(prev => ({ ...prev, quantidade: e.target.value }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-slate-800 font-bold text-sm"
                  required
                  autoFocus
                />
                <span className="text-[11px] text-stone-400 mt-1 block">
                  Estoque atual: {compraInsumoModal.insumo.quantidade_estoque.toFixed(2)} {compraInsumoModal.insumo.unidade_medida}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Valor Total Pago na Compra (R$) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 45.00 ou 45,00"
                  value={compraInsumoModal.valorTotal}
                  onChange={e => setCompraInsumoModal(prev => ({ ...prev, valorTotal: e.target.value }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-slate-800 font-bold text-sm"
                  required
                />
                {Boolean(parseFloat(compraInsumoModal.quantidade.replace(',', '.')) > 0 && parseFloat(compraInsumoModal.valorTotal.replace(',', '.')) > 0) && (
                  <span className="text-[11px] text-amber-800 font-semibold mt-1.5 block bg-amber-50 p-2 rounded-xl border border-amber-200">
                    Novo custo unitário: R$ {(parseFloat(compraInsumoModal.valorTotal.replace(',', '.')) / parseFloat(compraInsumoModal.quantidade.replace(',', '.'))).toFixed(2)} / {compraInsumoModal.insumo.unidade_medida}
                  </span>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCompraInsumoModal(prev => ({ ...prev, isOpen: false, insumo: null }))}
                  className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-600 rounded-xl font-bold hover:bg-stone-50 transition cursor-pointer text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={compraInsumoModal.isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition shadow-md disabled:opacity-50 cursor-pointer text-sm"
                >
                  {compraInsumoModal.isSubmitting ? 'Salvando...' : 'Confirmar Compra'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* DIÁLOGOS GERAIS COM PORTAL NATIVO */}
      {alertConfig.isOpen && (
        <AlertModal 
          isOpen={alertConfig.isOpen} 
          title={alertConfig.title} 
          message={alertConfig.message} 
          onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} 
        />
      )}

      {confirmConfig.isOpen && (
        <ConfirmModal 
          isOpen={confirmConfig.isOpen} 
          title={confirmConfig.title} 
          message={confirmConfig.message} 
          isDestructive={confirmConfig.isDestructive}
          onConfirm={confirmConfig.onConfirm} 
          onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })} 
        />
      )}
    </div>
  );
};
