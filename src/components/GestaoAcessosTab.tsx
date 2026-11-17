import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UserCheck,
  KeyRound,
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Check,
  Copy,
  CheckCircle2,
  ShieldCheck,
  UtensilsCrossed,
  Clock,
  Receipt,
  User,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Users,
  TrendingUp,
  Search,
  Lock,
  Unlock
} from 'lucide-react';
import { Colaborador, PedidoCozinha } from '../types';
import {
  fetchColaboradores,
  saveColaborador,
  deleteColaborador,
  fetchPedidosCozinha,
  getLocal,
  STORAGE_KEYS
} from '../services/db';

export const GestaoAcessosTab: React.FC = () => {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>(() =>
    getLocal<Colaborador[]>(STORAGE_KEYS.COLABORADORES, [])
  );
  const [pedidos, setPedidos] = useState<PedidoCozinha[]>(() =>
    getLocal<PedidoCozinha[]>(STORAGE_KEYS.PEDIDOS_COZINHA, [])
  );

  // Formulário de Cadastro / Edição
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeInput, setNomeInput] = useState<string>('');
  const [codigoInput, setCodigoInput] = useState<string>('');
  const [senhaInput, setSenhaInput] = useState<string>('');
  const [mostrarSenhaForm, setMostrarSenhaForm] = useState<boolean>(false);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [sucessoForm, setSucessoForm] = useState<string | null>(null);

  // Filtro, exibição de senhas e confirmação de exclusão
  const [buscaColaborador, setBuscaColaborador] = useState<string>('');
  const [senhasVisiveis, setSenhasVisiveis] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState<boolean>(false);
  const [atualizando, setAtualizando] = useState<boolean>(false);

  const recarregar = useCallback(async () => {
    setAtualizando(true);
    try {
      const [cols, peds] = await Promise.all([
        fetchColaboradores(),
        fetchPedidosCozinha()
      ]);
      setColaboradores(cols);
      setPedidos(peds);
    } finally {
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
    window.addEventListener('colaboradores_atualizados', recarregar);
    window.addEventListener('pedidos_cozinha_atualizados', recarregar);
    window.addEventListener('novo_pedido_cozinha', recarregar);
    window.addEventListener('storage', recarregar);

    return () => {
      window.removeEventListener('colaboradores_atualizados', recarregar);
      window.removeEventListener('pedidos_cozinha_atualizados', recarregar);
      window.removeEventListener('novo_pedido_cozinha', recarregar);
      window.removeEventListener('storage', recarregar);
    };
  }, [recarregar]);

  const linkGarcom =
    typeof window !== 'undefined'
      ? `${window.location.origin}/garcom`
      : 'https://moreira-sales.vercel.app/garcom';

  const handleCopiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkGarcom);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 3000);
    } catch (e) {
      console.warn('Erro ao copiar link:', e);
    }
  };

  const limparFormulario = () => {
    setEditandoId(null);
    setNomeInput('');
    setCodigoInput('');
    setSenhaInput('');
    setMostrarSenhaForm(false);
    setErroForm(null);
  };

  const handleIniciarEdicao = (colab: Colaborador) => {
    setEditandoId(colab.id);
    setNomeInput(colab.nome);
    setCodigoInput(colab.codigo_acesso);
    setSenhaInput(colab.senha);
    setErroForm(null);
    setSucessoForm(null);
  };

  const handleSalvarColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroForm(null);
    setSucessoForm(null);

    const nome = nomeInput.trim();
    const codigo = codigoInput.trim();
    const senha = senhaInput.trim();

    if (!nome) {
      setErroForm('Informe o nome do colaborador.');
      return;
    }
    if (!codigo) {
      setErroForm('Informe o ID de acesso do colaborador (ex: 101, joao, garcom1).');
      return;
    }
    if (!senha) {
      setErroForm('Informe a senha de acesso do colaborador.');
      return;
    }

    const duplicado = colaboradores.find(
      c => c.id !== editandoId && c.codigo_acesso.trim().toLowerCase() === codigo.toLowerCase()
    );
    if (duplicado) {
      setErroForm(`O ID de acesso "${codigo}" já está sendo utilizado por ${duplicado.nome}. Escolha outro ID.`);
      return;
    }

    setSalvando(true);
    try {
      await saveColaborador({
        id: editandoId || undefined,
        nome,
        codigo_acesso: codigo,
        senha,
        ativo: true
      });
      setSucessoForm(
        editandoId
          ? 'Acesso do colaborador atualizado com sucesso!'
          : 'Colaborador cadastrado e liberado para acesso!'
      );
      limparFormulario();
      await recarregar();
      setTimeout(() => setSucessoForm(null), 3500);
    } catch (err) {
      console.error('Erro ao salvar colaborador:', err);
      setErroForm('Erro ao salvar colaborador. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const handleAlternarAtivo = async (colab: Colaborador) => {
    await saveColaborador({
      id: colab.id,
      nome: colab.nome,
      codigo_acesso: colab.codigo_acesso,
      senha: colab.senha,
      ativo: colab.ativo === false
    });
    await recarregar();
  };

  const handleConfirmarExclusao = async (id: string) => {
    await deleteColaborador(id);
    setConfirmDeleteId(null);
    if (editandoId === id) limparFormulario();
    await recarregar();
  };

  // Estatísticas de atendimento por garçom
  const estatisticasPorColaborador = useMemo(() => {
    const mapa: Record<string, { qtdPedidos: number; valorTotal: number; ultimoAtendimento?: string }> = {};
    colaboradores.forEach(c => {
      mapa[c.id] = { qtdPedidos: 0, valorTotal: 0 };
    });

    pedidos.forEach(p => {
      if (p.status === 'cancelado') return;
      const gId = p.garcom_id || p.itens?.[0]?.garcom_id;
      const gNome = (p.garcom_nome || p.itens?.[0]?.garcom_nome || '').trim().toLowerCase();

      let colabMatch = colaboradores.find(c => c.id === gId);
      if (!colabMatch && gNome) {
        colabMatch = colaboradores.find(c => c.nome.trim().toLowerCase() === gNome);
      }

      if (colabMatch) {
        const atual = mapa[colabMatch.id] || { qtdPedidos: 0, valorTotal: 0 };
        atual.qtdPedidos += 1;
        atual.valorTotal += Number(p.total || 0);
        if (!atual.ultimoAtendimento || new Date(p.criado_em) > new Date(atual.ultimoAtendimento)) {
          atual.ultimoAtendimento = p.criado_em;
        }
        mapa[colabMatch.id] = atual;
      }
    });

    return mapa;
  }, [colaboradores, pedidos]);

  // Pedidos que possuem identificação de garçom
  const pedidosComGarcom = useMemo(() => {
    return pedidos
      .filter(p => Boolean(p.garcom_nome || p.itens?.[0]?.garcom_nome))
      .slice(0, 20);
  }, [pedidos]);

  // Métricas resumidas da aba
  const resumoEquipe = useMemo(() => {
    const ativos = colaboradores.filter(c => c.ativo !== false).length;
    const bloqueados = colaboradores.length - ativos;
    const totalPedidos = pedidosComGarcom.length;
    const volumeTotal = pedidos
      .filter(p => p.status !== 'cancelado' && Boolean(p.garcom_nome || p.itens?.[0]?.garcom_nome))
      .reduce((acc, p) => acc + Number(p.total || 0), 0);

    return { ativos, bloqueados, totalPedidos, volumeTotal };
  }, [colaboradores, pedidos, pedidosComGarcom.length]);

  const colaboradoresFiltrados = useMemo(() => {
    const q = buscaColaborador.trim().toLowerCase();
    if (!q) return colaboradores;
    return colaboradores.filter(
      c =>
        c.nome.toLowerCase().includes(q) ||
        c.codigo_acesso.toLowerCase().includes(q)
    );
  }, [colaboradores, buscaColaborador]);

  const formatMoney = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      {/* 1. CABEÇALHO & LINK EXCLUSIVO DO PORTAL DO GARÇOM */}
      <section className="bg-stone-900 text-white rounded-3xl p-6 sm:p-7 border border-stone-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4 max-w-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                  Portal Exclusivo do Garçom
                </h3>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                  Login por ID e Senha
                </span>
              </div>
              <p className="text-sm text-stone-300 mt-1.5 leading-relaxed">
                Compartilhe o link abaixo com a equipe do salão. Cada atendente entra com seu próprio{' '}
                <strong className="text-white">ID</strong> e <strong className="text-white">Senha</strong> para lançar comandas e registrar sua assinatura nos pedidos.
              </p>
            </div>
          </div>

          {/* Barra unificada do Link + Botões */}
          <div className="w-full lg:w-auto lg:min-w-[400px] bg-stone-800/90 border border-stone-700 rounded-2xl p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <div className="flex-1 px-3 py-2 rounded-xl bg-stone-950/60 border border-stone-700/60 font-mono text-xs text-amber-300 truncate select-all">
              {linkGarcom}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopiarLink}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                {linkCopiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{linkCopiado ? 'Copiado!' : 'Copiar Link'}</span>
              </button>
              <a
                href="/garcom"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-100 font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                title="Abrir portal do garçom em nova aba"
              >
                <span>Abrir</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. INDICADORES DA EQUIPE DE ATENDIMENTO */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-sm flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-stone-500">Colaboradores cadastrados</p>
            <p className="text-2xl font-extrabold text-stone-900 font-mono tabular-nums mt-1">
              {colaboradores.length}
            </p>
            <p className="text-xs text-stone-500 mt-1 tabular-nums">
              <span className="text-emerald-700 font-semibold">{resumoEquipe.ativos} ativos</span>
              {resumoEquipe.bloqueados > 0 && ` • ${resumoEquipe.bloqueados} bloqueados`}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-sm flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-stone-500">Pedidos identificados</p>
            <p className="text-2xl font-extrabold text-stone-900 font-mono tabular-nums mt-1">
              {resumoEquipe.totalPedidos}
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Lançados via portal do garçom
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-700 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-sm flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-stone-500">Volume atendido pela equipe</p>
            <p className="text-2xl font-extrabold text-stone-900 font-mono tabular-nums mt-1">
              {formatMoney(resumoEquipe.volumeTotal)}
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Total acumulado nos pedidos ativos
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* 3. ÁREA PRINCIPAL CENTRALIZADA: CADASTRO + LISTA DA EQUIPE */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* COLUNA ESQUERDA (5/12): FORMULÁRIO DE CADASTRO / EDIÇÃO */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-stone-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-600 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-extrabold text-stone-900 truncate">
                  {editandoId ? 'Editar Acesso do Garçom' : 'Novo Acesso de Garçom'}
                </h4>
                <p className="text-xs text-stone-500 truncate">
                  Defina o nome, ID de login e senha individual
                </p>
              </div>
            </div>

            {editandoId && (
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                Editando
              </span>
            )}
          </div>

          {erroForm && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erroForm}</span>
            </div>
          )}

          {sucessoForm && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{sucessoForm}</span>
            </div>
          )}

          <form onSubmit={handleSalvarColaborador} className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label
                  htmlFor="acesso-nome"
                  className="block text-sm font-semibold text-stone-800 mb-1.5"
                >
                  Nome do colaborador <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="acesso-nome"
                    type="text"
                    required
                    value={nomeInput}
                    onChange={e => setNomeInput(e.target.value)}
                    placeholder="Ex: João Silva, Maria Oliveira..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-600/10 outline-none transition-all"
                  />
                </div>
              </div>

              {/* ID e Senha alinhados lado a lado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="acesso-codigo"
                    className="block text-sm font-semibold text-stone-800 mb-1.5"
                  >
                    ID de acesso <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="acesso-codigo"
                    type="text"
                    required
                    value={codigoInput}
                    onChange={e => setCodigoInput(e.target.value)}
                    placeholder="Ex: 101 ou joao"
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-mono font-bold text-stone-900 placeholder:text-stone-400 placeholder:font-sans placeholder:font-normal focus:border-amber-600 focus:ring-4 focus:ring-amber-600/10 outline-none transition-all"
                  />
                  <p className="text-xs text-stone-500 mt-1.5">
                    Usuário usado para entrar
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="acesso-senha"
                    className="block text-sm font-semibold text-stone-800 mb-1.5"
                  >
                    Senha de acesso <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="acesso-senha"
                      type={mostrarSenhaForm ? 'text' : 'password'}
                      required
                      value={senhaInput}
                      onChange={e => setSenhaInput(e.target.value)}
                      placeholder="••••••"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-mono font-bold text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-600/10 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenhaForm(!mostrarSenhaForm)}
                      aria-label={mostrarSenhaForm ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                    >
                      {mostrarSenhaForm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-stone-500 mt-1.5">
                    Senha pessoal do garçom
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-stone-100 flex items-center gap-3">
              {editandoId && (
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="px-4 py-3 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={salvando}
                className="flex-1 py-3 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                {editandoId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>
                  {salvando
                    ? 'Salvando...'
                    : editandoId
                      ? 'Salvar Alterações'
                      : 'Cadastrar Acesso'}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* COLUNA DIREITA (7/12): LISTA DE COLABORADORES CADASTRADOS */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200/90 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-extrabold text-stone-900 truncate">
                  Colaboradores Cadastrados ({colaboradores.length})
                </h4>
                <p className="text-xs text-stone-500 truncate">
                  Gerencie credenciais, status de acesso e desempenho no salão
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {colaboradores.length > 0 && (
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={buscaColaborador}
                    onChange={e => setBuscaColaborador(e.target.value)}
                    placeholder="Buscar nome ou ID..."
                    className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 placeholder:text-stone-400 focus:bg-white focus:border-amber-600 outline-none"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={recarregar}
                className="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer shrink-0"
                title="Atualizar lista"
                aria-label="Atualizar lista de colaboradores"
              >
                <RefreshCw className={`w-4 h-4 ${atualizando ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6 flex-1 flex flex-col">
            {colaboradores.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-6 bg-stone-50/70 rounded-2xl border border-dashed border-stone-200">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-600 flex items-center justify-center mb-3">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h5 className="text-sm font-bold text-stone-900">
                  Nenhum garçom cadastrado ainda
                </h5>
                <p className="text-xs sm:text-sm text-stone-500 max-w-md mt-1 leading-relaxed">
                  Preencha o formulário ao lado com Nome, ID e Senha para liberar o primeiro acesso ao portal do garçom.
                </p>
              </div>
            ) : colaboradoresFiltrados.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-6 bg-stone-50/60 rounded-2xl border border-stone-200">
                <p className="text-sm font-semibold text-stone-700">
                  Nenhum colaborador encontrado para "{buscaColaborador}"
                </p>
                <button
                  type="button"
                  onClick={() => setBuscaColaborador('')}
                  className="mt-2 text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
                >
                  Limpar busca
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {colaboradoresFiltrados.map(colab => {
                  const stats = estatisticasPorColaborador[colab.id] || {
                    qtdPedidos: 0,
                    valorTotal: 0
                  };
                  const mostrarSenha = Boolean(senhasVisiveis[colab.id]);
                  const isConfirmandoDelete = confirmDeleteId === colab.id;
                  const estaAtivo = colab.ativo !== false;
                  const emEdicao = editandoId === colab.id;

                  return (
                    <div
                      key={colab.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        emEdicao
                          ? 'bg-amber-50/40 border-amber-400 shadow-sm'
                          : estaAtivo
                            ? 'bg-white border-stone-200 hover:border-stone-300'
                            : 'bg-stone-50 border-stone-200 opacity-75'
                      }`}
                    >
                      {/* Linha Superior: Identidade + Status + Ações */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                              estaAtivo
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-stone-200 text-stone-600'
                            }`}
                          >
                            {colab.nome.slice(0, 2).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-stone-900 text-sm sm:text-base truncate">
                                {colab.nome}
                              </span>
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${
                                  estaAtivo
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-stone-200 text-stone-600 border-stone-300'
                                }`}
                              >
                                {estaAtivo ? 'Ativo' : 'Bloqueado'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Barra de Ações */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleIniciarEdicao(colab)}
                            className="px-2.5 py-2 rounded-xl bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-800 transition-colors cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold"
                            title="Editar nome, ID ou senha"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAlternarAtivo(colab)}
                            className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                              estaAtivo
                                ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                            title={estaAtivo ? 'Bloquear acesso do colaborador' : 'Reativar acesso'}
                          >
                            {estaAtivo ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            <span>{estaAtivo ? 'Bloquear' : 'Ativar'}</span>
                          </button>

                          {!isConfirmandoDelete ? (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(colab.id)}
                              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                              title="Excluir colaborador"
                              aria-label={`Excluir ${colab.nome}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleConfirmarExclusao(colab.id)}
                              className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
                            >
                              Confirmar
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Linha Inferior Alinhada em Grade 3 Colunas */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3.5 pt-3.5 border-t border-stone-100">
                        <div className="px-3 py-2 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between gap-2">
                          <span className="text-xs text-stone-500 font-medium">ID de login</span>
                          <span className="font-mono font-bold text-xs sm:text-sm text-stone-900 truncate">
                            {colab.codigo_acesso}
                          </span>
                        </div>

                        <div className="px-3 py-2 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between gap-2">
                          <span className="text-xs text-stone-500 font-medium">Senha</span>
                          <div className="inline-flex items-center gap-1.5 min-w-0">
                            <span className="font-mono font-bold text-xs sm:text-sm text-stone-900 truncate">
                              {mostrarSenha ? colab.senha : '••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setSenhasVisiveis(prev => ({
                                  ...prev,
                                  [colab.id]: !prev[colab.id]
                                }))
                              }
                              className="text-stone-400 hover:text-stone-700 cursor-pointer shrink-0"
                              title={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
                              aria-label={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
                            >
                              {mostrarSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-center justify-between gap-2">
                          <span className="text-xs text-amber-800 font-medium">Atendido</span>
                          <span className="font-mono tabular-nums font-bold text-xs sm:text-sm text-stone-900 truncate">
                            {stats.qtdPedidos} ped. • {formatMoney(stats.valorTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. HISTÓRICO DE ATENDIMENTOS IDENTIFICADOS POR GARÇOM */}
      <section className="bg-white rounded-3xl border border-stone-200/90 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-600 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-stone-900">
                Últimos Pedidos Atendidos pelos Garçons
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Rastreabilidade completa de quem lançou cada comanda no salão
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-lg bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700 tabular-nums">
            {pedidosComGarcom.length} {pedidosComGarcom.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {pedidosComGarcom.length === 0 ? (
          <div className="text-center py-12 px-6 text-stone-500 text-sm">
            Ainda não há pedidos registrados com identificação de garçom neste ciclo.
          </div>
        ) : (
          <>
            {/* Tabela limpa para Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50/90 border-b border-stone-200/80 text-xs font-semibold text-stone-500">
                    <th className="py-3.5 px-6">Comanda</th>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Garçom</th>
                    <th className="py-3.5 px-4">Itens do pedido</th>
                    <th className="py-3.5 px-4">Horário</th>
                    <th className="py-3.5 px-6 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {pedidosComGarcom.map(ped => {
                    const garcomNome = ped.garcom_nome || ped.itens?.[0]?.garcom_nome || 'Garçom';
                    const itensResumo = (ped.itens || [])
                      .map(i => `${i.quantidade}x ${i.nome}`)
                      .join(', ');

                    return (
                      <tr key={ped.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3.5 px-6 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-stone-900 text-white font-mono tabular-nums font-bold text-xs">
                            #{ped.mesa_numero < 10 ? `0${ped.mesa_numero}` : ped.mesa_numero}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-stone-900 whitespace-nowrap max-w-[180px] truncate">
                          {ped.cliente_nome || 'Cliente no salão'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                            <UserCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>{garcomNome}</span>
                          </span>
                        </td>
                        <td
                          className="py-3.5 px-4 text-xs text-stone-600 max-w-xs truncate"
                          title={itensResumo}
                        >
                          {itensResumo || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-stone-500 font-mono tabular-nums whitespace-nowrap">
                          {new Date(ped.criado_em).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono tabular-nums font-bold text-amber-800 whitespace-nowrap">
                          {formatMoney(Number(ped.total || 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Lista limpa para Mobile */}
            <div className="md:hidden divide-y divide-stone-100">
              {pedidosComGarcom.map(ped => {
                const garcomNome = ped.garcom_nome || ped.itens?.[0]?.garcom_nome || 'Garçom';
                return (
                  <div key={ped.id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2.5 py-1 rounded-lg bg-stone-900 text-white font-mono tabular-nums font-bold text-xs shrink-0">
                          #{ped.mesa_numero < 10 ? `0${ped.mesa_numero}` : ped.mesa_numero}
                        </span>
                        <span className="font-semibold text-sm text-stone-900 truncate">
                          {ped.cliente_nome || 'Cliente no salão'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold inline-flex items-center gap-1 shrink-0">
                        <UserCheck className="w-3 h-3" />
                        <span>{garcomNome}</span>
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 line-clamp-2">
                      {(ped.itens || []).map(i => `${i.quantidade}x ${i.nome}`).join(', ')}
                    </p>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-stone-500 inline-flex items-center gap-1 font-mono tabular-nums">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(ped.criado_em).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className="font-mono tabular-nums font-bold text-amber-800 text-sm">
                        {formatMoney(Number(ped.total || 0))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
};
