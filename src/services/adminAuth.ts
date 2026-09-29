// Serviço de Autenticação e Senha do Painel do Dono
// Panificadora & Confeitaria Moreira Sales

const PASSWORD_KEY = 'panificadora_admin_password_hash';
const SESSION_KEY = 'panificadora_admin_session_auth';
const REMEMBER_KEY = 'panificadora_admin_remember_auth';

// Hash simples síncrono para fallback e consistência local
function hashPassword(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Combinar com prefixo e string invertida para evitar colisões simples
  const rev = str.split('').reverse().join('');
  let hash2 = 0;
  for (let i = 0; i < rev.length; i++) {
    hash2 = ((hash2 << 5) - hash2) + rev.charCodeAt(i);
    hash2 = hash2 & hash2;
  }
  return `ms_${Math.abs(hash).toString(16)}_${Math.abs(hash2).toString(16)}`;
}

// Verifica se já existe uma senha cadastrada para o painel do dono
export function isAdminPasswordRegistered(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const stored = localStorage.getItem(PASSWORD_KEY);
    return Boolean(stored && stored.trim().length > 0);
  } catch {
    return false;
  }
}

// Cadastra a senha inicial do administrador
export function registerAdminPassword(password: string): { success: boolean; error?: string } {
  if (!password || password.trim().length < 4) {
    return { success: false, error: 'A senha deve ter pelo menos 4 caracteres.' };
  }

  try {
    const hash = hashPassword(password.trim());
    localStorage.setItem(PASSWORD_KEY, hash);
    return { success: true };
  } catch (err) {
    console.error('Erro ao salvar senha:', err);
    return { success: false, error: 'Falha ao salvar a senha no navegador.' };
  }
}

// Valida se a senha digitada confere com a salva
export function verifyAdminPassword(password: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const stored = localStorage.getItem(PASSWORD_KEY);
    if (!stored) return false;
    const computed = hashPassword(password.trim());
    return stored === computed;
  } catch {
    return false;
  }
}

// Altera a senha existente (valida a senha atual antes)
export function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): { success: boolean; error?: string } {
  if (!verifyAdminPassword(currentPassword)) {
    return { success: false, error: 'A senha atual informada está incorreta.' };
  }

  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, error: 'A nova senha deve ter no mínimo 4 caracteres.' };
  }

  return registerAdminPassword(newPassword);
}

// Redefine a senha (caso o dono precise resetar ou esqueça)
export function resetAdminPassword(newPassword: string): { success: boolean; error?: string } {
  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, error: 'A nova senha deve ter no mínimo 4 caracteres.' };
  }
  return registerAdminPassword(newPassword);
}

// Remove a senha cadastrada (útil para testes ou reinicialização)
export function removeAdminPassword(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(PASSWORD_KEY);
  logoutAdmin();
}

// Checa se o usuário está autenticado na sessão atual
export function isAdminSessionActive(): boolean {
  if (typeof sessionStorage === 'undefined' || typeof localStorage === 'undefined') return false;
  try {
    // Verifica primeiro a sessão ativa
    if (sessionStorage.getItem(SESSION_KEY) === 'true') {
      return true;
    }
    // Verifica se optou por 'Lembrar' (válido por 24 horas)
    const rememberTime = localStorage.getItem(REMEMBER_KEY);
    if (rememberTime) {
      const timestamp = parseInt(rememberTime, 10);
      const now = Date.now();
      const vinteQuatroHoras = 24 * 60 * 60 * 1000;
      if (now - timestamp < vinteQuatroHoras) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        return true;
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    }
    return false;
  } catch {
    return false;
  }
}

// Grava a sessão autenticada
export function setAdminSessionActive(active: boolean, remember: boolean = false): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (active) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      if (remember && typeof localStorage !== 'undefined') {
        localStorage.setItem(REMEMBER_KEY, Date.now().toString());
      }
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(REMEMBER_KEY);
      }
    }
    // Notifica outros componentes da mudança
    window.dispatchEvent(new CustomEvent('admin_auth_changed', { detail: { active } }));
  } catch (err) {
    console.error('Erro ao atualizar sessão:', err);
  }
}

// Efetua logout e bloqueia o painel do dono
export function logoutAdmin(): void {
  setAdminSessionActive(false, false);
}
