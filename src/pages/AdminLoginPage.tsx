import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Store,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { 
  isAdminPasswordRegistered, 
  registerAdminPassword, 
  verifyAdminPassword, 
  setAdminSessionActive,
  resetAdminPassword
} from '../services/adminAuth';

interface AdminLoginPageProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onSuccess,
  onCancel
}) => {
  const [hasPassword, setHasPassword] = useState<boolean>(false);
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  // Estados de feedback e erro
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [tentativas, setTentativas] = useState(0);
  
  // Modo de redefinição de senha
  const [modoRedefinir, setModoRedefinir] = useState(false);
  const [chaveMestra, setChaveMestra] = useState('');

  useEffect(() => {
    setHasPassword(isAdminPasswordRegistered());
  }, []);

  // Login com senha cadastrada
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!senha.trim()) {
      setErro('Por favor, digite sua senha de acesso.');
      return;
    }

    const isValid = verifyAdminPassword(senha);
    if (isValid) {
      setSucesso('Acesso autorizado! Carregando painel do proprietário...');
      setAdminSessionActive(true, rememberMe);
      setTimeout(() => {
        onSuccess();
      }, 400);
    } else {
      setTentativas(prev => prev + 1);
      setErro('Senha incorreta. Verifique e tente novamente.');
    }
  };

  // Cadastro da primeira senha
  const handleCadastrarSenha = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (senha.trim().length < 4) {
      setErro('A senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas digitadas não coincidem. Digite novamente.');
      return;
    }

    const result = registerAdminPassword(senha);
    if (result.success) {
      setSucesso('Senha cadastrada com sucesso! Bem-vindo ao painel.');
      setAdminSessionActive(true, rememberMe);
      setHasPassword(true);
      setTimeout(() => {
        onSuccess();
      }, 500);
    } else {
      setErro(result.error || 'Erro ao cadastrar senha.');
    }
  };

  // Redefinir senha de administração
  const handleRedefinir = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    // Chave mestra de emergência para recuperação
    const chaveValida = chaveMestra.trim().toLowerCase() === 'admin123' || chaveMestra.trim().toLowerCase() === 'moreirasales';

    if (!chaveValida) {
      setErro('Chave de autorização incorreta. Dica: use "admin123" ou "moreirasales".');
      return;
    }

    if (senha.trim().length < 4) {
      setErro('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas digitadas não coincidem.');
      return;
    }

    const res = resetAdminPassword(senha);
    if (res.success) {
      setSucesso('Nova senha cadastrada com sucesso!');
      setAdminSessionActive(true, rememberMe);
      setTimeout(() => {
        onSuccess();
      }, 600);
    } else {
      setErro(res.error || 'Erro ao redefinir senha.');
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-4 sm:px-6 animate-fadeIn">
      <div className="w-full max-w-md">
        
        {/* Card Principal */}
        <div className="bg-white rounded-3xl shadow-xl border border-stone-200/90 overflow-hidden relative">
          
          {/* Faixa decorativa superior elegante */}
          <div className="h-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-stone-800" />

          <div className="p-6 sm:p-8">
            
            {/* Ícone de Destaque */}
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-600/20 text-amber-700 flex items-center justify-center shadow-inner relative group">
                {hasPassword && !modoRedefinir ? (
                  <Lock className="w-8 h-8" />
                ) : (
                  <KeyRound className="w-8 h-8 text-amber-600" />
                )}
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
            </div>

            {/* Cabeçalho do Card */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-stone-100 text-stone-700 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Área Restrita da Administração</span>
              </div>
              
              <h2 className="text-2xl font-black text-stone-900 tracking-tight">
                {modoRedefinir 
                  ? 'Redefinir Senha do Painel'
                  : hasPassword 
                    ? 'Acesso ao Painel do Dono' 
                    : 'Cadastrar Senha do Dono'
                }
              </h2>
              
              <p className="text-xs sm:text-sm text-stone-500 mt-1.5 leading-relaxed">
                {modoRedefinir
                  ? 'Informe a chave de segurança administrativa para definir uma nova senha.'
                  : hasPassword
                    ? 'Digite sua senha cadastrada para acessar relatórios financeiros, CMV e configurações.'
                    : 'Defina a senha de acesso para proteger os dados confidenciais e métricas da panificadora.'
                }
              </p>
            </div>

            {/* Mensagem de Erro */}
            {erro && (
              <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs sm:text-sm font-medium animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1">{erro}</div>
              </div>
            )}

            {/* Mensagem de Sucesso */}
            {sucesso && (
              <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <div className="flex-1">{sucesso}</div>
              </div>
            )}

            {/* FORMULÁRIO 1: Login com Senha Já Cadastrada */}
            {hasPassword && !modoRedefinir && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                    Senha de Administrador:
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Digite sua senha..."
                      autoFocus
                      className="w-full pl-4 pr-11 py-3 text-base bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-medium text-stone-900 placeholder:text-stone-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                      title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Opção Manter Conectado */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-stone-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 border-stone-300 focus:ring-amber-500"
                    />
                    <span>Manter conectado neste aparelho</span>
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setModoRedefinir(true);
                      setSenha('');
                      setConfirmarSenha('');
                      setErro(null);
                    }}
                    className="text-amber-700 hover:text-amber-800 font-semibold cursor-pointer underline-offset-2 hover:underline"
                  >
                    Esqueci a senha
                  </button>
                </div>

                {/* Botões de Ação */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer"
                  >
                    <Unlock className="w-4 h-4 text-amber-400" />
                    <span>Entrar no Painel do Dono</span>
                  </button>

                  <button
                    type="button"
                    onClick={onCancel}
                    className="w-full flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3 px-4 rounded-xl transition-all cursor-pointer text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar para o Caixa (F1)</span>
                  </button>
                </div>
              </form>
            )}

            {/* FORMULÁRIO 2: Cadastro da Primeira Senha */}
            {!hasPassword && !modoRedefinir && (
              <form onSubmit={handleCadastrarSenha} className="space-y-4">
                <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 font-medium">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Nenhuma senha configurada ainda. Cadastre sua senha agora para começar.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                    Definir Nova Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Mínimo 4 caracteres (ex: 1234)"
                      autoFocus
                      className="w-full pl-4 pr-11 py-3 text-base bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-medium text-stone-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                    Confirmar Nova Senha *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Repita a mesma senha..."
                    className="w-full px-4 py-3 text-base bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-medium text-stone-900"
                  />
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Cadastrar Senha e Acessar</span>
                  </button>

                  <button
                    type="button"
                    onClick={onCancel}
                    className="w-full flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3 px-4 rounded-xl transition-all cursor-pointer text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar para o Caixa</span>
                  </button>
                </div>
              </form>
            )}

            {/* FORMULÁRIO 3: Redefinir Senha */}
            {modoRedefinir && (
              <form onSubmit={handleRedefinir} className="space-y-4">
                <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-2xl text-xs text-stone-600">
                  <p className="font-semibold text-stone-800 mb-1">Recuperação de Acesso:</p>
                  <p>Digite a chave mestra de segurança para redefinir a senha do painel.</p>
                  <p className="mt-1 text-[11px] text-stone-400 font-mono">Chave padrão: admin123</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                    Chave Mestra de Segurança *
                  </label>
                  <input
                    type="text"
                    value={chaveMestra}
                    onChange={(e) => setChaveMestra(e.target.value)}
                    placeholder="Digite a chave mestra..."
                    autoFocus
                    className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                    Nova Senha do Dono *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 4 caracteres..."
                    className="w-full px-4 py-3 text-base bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                    Confirmar Nova Senha *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Repita a nova senha..."
                    className="w-full px-4 py-3 text-base bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-amber-600 outline-none"
                  />
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Redefinir e Entrar no Painel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModoRedefinir(false);
                      setSenha('');
                      setConfirmarSenha('');
                      setErro(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3 px-4 rounded-xl transition-all cursor-pointer text-sm"
                  >
                    <span>Cancelar</span>
                  </button>
                </div>
              </form>
            )}

          </div>

          {/* Rodapé com Dica de Segurança */}
          <div className="bg-stone-50 border-t border-stone-100 px-6 py-3.5 text-center text-xs text-stone-400">
            Panificadora Moreira Sales • Apenas pessoal autorizado
          </div>

        </div>

      </div>
    </div>
  );
};
