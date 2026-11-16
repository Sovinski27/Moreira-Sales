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
  ExternalLink
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

  // Controle de exibição de senhas na tabela e confirmação de exclusão
  const [senhasVisiveis, setSenhasVisiveis] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState<boolean>(false);

  const recarregar = useCallback(() => {
    fetchColaboradores().then(setColaboradores);
    fetchPedidosCozinha().then(setPedidos);
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

  const linkGarcom = typeof window !== 'undefined'
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
    setErroForm(null);
  };

  const handleIniciarEdicao = (colab: Colaborador) => {
    setEditandoId(colab.id);
    setNomeInput(colab.nome);
    setCodigoInput(colab.codigo_acesso);
    setSenhaInput(colab.senha);
    setErroForm(null);
  };

  const handleSalvarColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroForm(null);

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

    // Verificar se já existe outro colaborador com o mesmo ID de acesso
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
      setSucessoForm(editandoId ? 'Acesso do colaborador atualizado com sucesso!' : 'Colaborador cadastrado e liberado para acesso!');
      limparFormulario();
      recarregar();
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
      ativo: !colab.ativo
    });
    recarregar();
  };

  const handleConfirmarExclusao = async (id: string) => {
    await deleteColaborador(id);
    setConfirmDeleteId(null);
    if (editandoId === id) limparFormulario();
    recarregar();
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* BANNER DO LINK EXCLUSIVO DO GARÇOM */}
      <div className="bg-stone-900 text-white rounded-3xl p-5 sm:p-6 border border-stone-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black">
                Portal Exclusivo do Garçom (Comanda Móvel)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Acesso Protegido por ID e Senha
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
              Envie este link para os garçons acessarem pelo celular. Ao abrir, o garçom precisará digitar o{' '}
              <strong className="text-white">ID de Acesso</strong> e a <strong className="text-white">Senha</strong> cadastrados abaixo para lançar pedidos e identificar quem realizou cada atendimento.
            </p>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-800 border border-stone-700 font-mono text-xs text-amber-300">
              <span>{linkGarcom}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopiarLink}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            {linkCopiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{linkCopiado ? 'Link Copiado!' : 'Copiar Link do Garçom'}</span>
          </button>
          <a
            href="/garcom"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <span>Abrir</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* GRID PRINCIPAL: FORMULÁRIO DE CADASTRO + LISTA DE COLABORADORES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* COLUNA 1: CADASTRAR OU EDITAR COLABORADOR */}
        <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-stone-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-black text-stone-900">
                {editandoId ? 'Editar Colaborador' : 'Novo Acesso de Garçom'}
              </h4>
              <p className="text-xs text-stone-500">
                Defina o Nome, ID e Senha de login
              </p>
            </div>
          </div>

          {erroForm && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erroForm}</span>
            </div>
          )}

          {sucessoForm && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{sucessoForm}</span>
            </div>
          )}

          <form onSubmit={handleSalvarColaborador} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Nome do Colaborador *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={nomeInput}
                  onChange={e => setNomeInput(e.target.value)}
                  placeholder="Ex: João Silva, Maria..."
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:border-amber-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                ID de Acesso (Login do Garçom) *
              </label>
              <input
                type="text"
                required
                value={codigoInput}
                onChange={e => setCodigoInput(e.target.value)}
                placeholder="Ex: 101, joao, garcom01"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono font-bold text-stone-900 focus:bg-white focus:border-amber-600 outline-none"
              />
              <span className="text-[11px] text-stone-400 block mt-1">
                Código ou usuário que o garçom digitará para entrar.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Senha de Acesso *
                </label>
                <button
                  type="button"
                  onClick={() => setMostrarSenhaForm(!mostrarSenhaForm)}
                  className="text-[11px] font-bold text-stone-500 hover:text-stone-800 flex items-center gap-1 cursor-pointer"
                >
                  {mostrarSenhaForm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{mostrarSenhaForm ? 'Ocultar' : 'Mostrar'}</span>
                </button>
              </div>
              <input
                type={mostrarSenhaForm ? 'text' : 'password'}
                required
                value={senhaInput}
                onChange={e => setSenhaInput(e.target.value)}
                placeholder="Digite a senha do garçom..."
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono font-bold text-stone-900 focus:bg-white focus:border-amber-600 outline-none"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              {editandoId && (
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="flex-1 py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={salvando}
                className="flex-[2] py-3 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{salvando ? 'Salvando...' : editandoId ? 'Salvar Alterações' : 'Cadastrar Acesso'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* COLUNA 2 & 3: LISTA DE COLABORADORES CADASTRADOS */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Colaboradores Cadastrados ({colaboradores.length})</span>
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Gerencie os IDs, senhas e acompanhe quantos pedidos cada garçom atendeu
              </p>
            </div>

            <button
              type="button"
              onClick={recarregar}
              className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
              title="Atualizar lista"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {colaboradores.length === 0 ? (
              <div className="text-center py-12 px-4 bg-stone-50/70 rounded-2xl border border-dashed border-stone-200">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h5 className="text-sm font-black text-stone-800">
                  Nenhum garçom/colaborador cadastrado ainda
                </h5>
                <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
                  Utilize o formulário ao lado para cadastrar o Nome, o ID e a Senha de cada garçom. Assim que cadastrado, ele já poderá acessar a página de garçom.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {colaboradores.map(colab => {
                  const stats = estatisticasPorColaborador[colab.id] || { qtdPedidos: 0, valorTotal: 0 };
                  const mostrarSenha = Boolean(senhasVisiveis[colab.id]);
                  const isConfirmandoDelete = confirmDeleteId === colab.id;

                  return (
                    <div
                      key={colab.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        colab.ativo !== false
                          ? 'bg-white border-stone-200 hover:border-amber-300 shadow-2xs'
                          : 'bg-stone-50 border-stone-200 opacity-65'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                          colab.ativo !== false
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-stone-200 text-stone-500'
                        }`}>
                          {colab.nome.slice(0, 2).toUpperCase()}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-stone-900 text-sm sm:text-base">
                              {colab.nome}
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              colab.ativo !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-stone-200 text-stone-600'
                            }`}>
                              {colab.ativo !== false ? 'Ativo' : 'Bloqueado'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
                            <span className="bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200 font-mono">
                              ID: <strong className="text-stone-900">{colab.codigo_acesso}</strong>
                            </span>

                            <span className="bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200 font-mono inline-flex items-center gap-1.5">
                              <span>Senha:</span>
                              <strong className="text-stone-900">
                                {mostrarSenha ? colab.senha : '••••••'}
                              </strong>
                              <button
                                type="button"
                                onClick={() =>
                                  setSenhasVisiveis(prev => ({ ...prev, [colab.id]: !prev[colab.id] }))
                                }
                                className="text-stone-400 hover:text-stone-700 ml-1 cursor-pointer"
                                title={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
                              >
                                {mostrarSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Métricas de Atendimento + Botões */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100 shrink-0">
                        <div className="text-left sm:text-right px-3 py-1.5 rounded-xl bg-amber-50/70 border border-amber-200/60">
                          <span className="text-[10px] font-bold uppercase text-amber-800 block">
                            Pedidos Atendidos
                          </span>
                          <span className="font-mono font-black text-xs sm:text-sm text-stone-900">
                            {stats.qtdPedidos} {stats.qtdPedidos === 1 ? 'pedido' : 'pedidos'} • R$ {stats.valorTotal.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleIniciarEdicao(colab)}
                            className="p-2 rounded-xl bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-800 transition-colors cursor-pointer"
                            title="Editar nome, ID ou senha"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAlternarAtivo(colab)}
                            className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                              colab.ativo !== false
                                ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            {colab.ativo !== false ? 'Bloquear' : 'Ativar'}
                          </button>

                          {!isConfirmandoDelete ? (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(colab.id)}
                              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                              title="Excluir colaborador"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleConfirmarExclusao(colab.id)}
                              className="px-2.5 py-2 rounded-xl bg-rose-600 text-white font-black text-xs cursor-pointer animate-pulse"
                            >
                              Confirmar?
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HISTÓRICO DE ATENDIMENTOS IDENTIFICADOS POR GARÇOM */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h4 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-600" />
              <span>Últimos Pedidos Atendidos pelos Garçons</span>
            </h4>
            <p className="text-xs text-stone-500 mt-0.5">
              Rastreabilidade completa de quem lançou cada comanda no salão
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {pedidosComGarcom.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-xs sm:text-sm">
              Ainda não há pedidos registrados com identificação de garçom neste ciclo.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pedidosComGarcom.map(ped => {
                const garcomNome = ped.garcom_nome || ped.itens?.[0]?.garcom_nome || 'Garçom';
                return (
                  <div
                    key={ped.id}
                    className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-stone-900 text-white font-mono font-black text-xs">
                          Comanda #{ped.mesa_numero < 10 ? `0${ped.mesa_numero}` : ped.mesa_numero}
                        </span>
                        <span className="font-bold text-xs text-stone-800 truncate">
                          {ped.cliente_nome}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Garçom: {garcomNome}</span>
                      </span>
                    </div>

                    <div className="text-xs text-stone-600">
                      {(ped.itens || []).map(i => `${i.quantidade}x ${i.nome}`).join(', ')}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-200/70 text-xs">
                      <span className="text-stone-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {new Date(ped.criado_em).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className="font-mono font-black text-amber-800 text-sm">
                        R$ {Number(ped.total || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
