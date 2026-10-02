import { CategoriaChecklist, ItemChecklist, RegistroHistoricoChecklist } from '../types';
import { getLocal, setLocal } from './db';

// Chaves específicas para Checklist
export const CHECKLIST_KEYS = {
  CATEGORIAS: 'panificadora_checklist_categorias',
  ITENS: 'panificadora_checklist_itens',
  HISTORICO: 'panificadora_checklist_historico',
  CLEANUP_PURE_V1: 'panificadora_checklist_pure_v1'
};

// Sistema 100% limpo - o cliente cadastra suas próprias categorias e atividades
export const INITIAL_CHECKLIST_CATEGORIAS: CategoriaChecklist[] = [];
export const INITIAL_CHECKLIST_ITENS: ItemChecklist[] = [];

// Histórico inicial limpo
export function getHistoricoInicialMock(): RegistroHistoricoChecklist[] {
  return [];
}

// Limpeza automática de dados mock anteriores para garantir sistema limpo
function checkCleanupChecklist(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const isClean = localStorage.getItem(CHECKLIST_KEYS.CLEANUP_PURE_V1);
    if (!isClean) {
      // Limpar itens e categorias chumbados antigos
      const rawCats = localStorage.getItem(CHECKLIST_KEYS.CATEGORIAS);
      if (rawCats) {
        try {
          const parsed = JSON.parse(rawCats) as CategoriaChecklist[];
          const userOnly = parsed.filter(c => !['cat-abertura', 'cat-producao', 'cat-higiene', 'cat-fechamento', 'cat-manutencao'].includes(c.id));
          localStorage.setItem(CHECKLIST_KEYS.CATEGORIAS, JSON.stringify(userOnly));
        } catch {
          localStorage.setItem(CHECKLIST_KEYS.CATEGORIAS, JSON.stringify([]));
        }
      }

      const rawItens = localStorage.getItem(CHECKLIST_KEYS.ITENS);
      if (rawItens) {
        try {
          const parsed = JSON.parse(rawItens) as ItemChecklist[];
          const userOnly = parsed.filter(i => !i.id.startsWith('item-'));
          localStorage.setItem(CHECKLIST_KEYS.ITENS, JSON.stringify(userOnly));
        } catch {
          localStorage.setItem(CHECKLIST_KEYS.ITENS, JSON.stringify([]));
        }
      }

      const rawHist = localStorage.getItem(CHECKLIST_KEYS.HISTORICO);
      if (rawHist) {
        try {
          const parsed = JSON.parse(rawHist) as RegistroHistoricoChecklist[];
          const userOnly = parsed.filter(h => !h.id.startsWith('hist-'));
          localStorage.setItem(CHECKLIST_KEYS.HISTORICO, JSON.stringify(userOnly));
        } catch {
          localStorage.setItem(CHECKLIST_KEYS.HISTORICO, JSON.stringify([]));
        }
      }

      localStorage.setItem(CHECKLIST_KEYS.CLEANUP_PURE_V1, 'true');
    }
  } catch (e) {
    console.warn('Erro ao limpar checklist demo:', e);
  }
}
checkCleanupChecklist();

// =========================================================================
// SERVIÇOS DE LEITURA E GRAVAÇÃO DE CHECKLISTS
// =========================================================================

export async function fetchChecklistCategorias(): Promise<CategoriaChecklist[]> {
  return getLocal<CategoriaChecklist[]>(CHECKLIST_KEYS.CATEGORIAS, INITIAL_CHECKLIST_CATEGORIAS);
}

export async function saveChecklistCategoria(cat: CategoriaChecklist): Promise<CategoriaChecklist> {
  const categorias = await fetchChecklistCategorias();
  const exists = categorias.some(c => c.id === cat.id);
  const updated = exists 
    ? categorias.map(c => c.id === cat.id ? cat : c)
    : [...categorias, cat];
  setLocal(CHECKLIST_KEYS.CATEGORIAS, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('checklist_atualizado'));
  }
  return cat;
}

export async function deleteChecklistCategoria(id: string): Promise<void> {
  const categorias = await fetchChecklistCategorias();
  const updated = categorias.filter(c => c.id !== id);
  setLocal(CHECKLIST_KEYS.CATEGORIAS, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('checklist_atualizado'));
  }
}

export async function fetchChecklistItens(): Promise<ItemChecklist[]> {
  return getLocal<ItemChecklist[]>(CHECKLIST_KEYS.ITENS, INITIAL_CHECKLIST_ITENS);
}

export async function saveChecklistItem(item: ItemChecklist): Promise<ItemChecklist> {
  const itens = await fetchChecklistItens();
  const exists = itens.some(i => i.id === item.id);
  const updated = exists
    ? itens.map(i => i.id === item.id ? item : i)
    : [...itens, item];
  setLocal(CHECKLIST_KEYS.ITENS, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('checklist_atualizado'));
  }
  return item;
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const itens = await fetchChecklistItens();
  const updated = itens.filter(i => i.id !== id);
  setLocal(CHECKLIST_KEYS.ITENS, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('checklist_atualizado'));
  }
}

export async function toggleChecklistItem(
  id: string, 
  concluido: boolean, 
  concluidoPor: string = 'Administrador',
  observacao?: string
): Promise<ItemChecklist | null> {
  const itens = await fetchChecklistItens();
  const target = itens.find(i => i.id === id);
  if (!target) return null;

  const nowIso = new Date().toISOString();
  const updatedItem: ItemChecklist = {
    ...target,
    concluido,
    concluido_em: concluido ? nowIso : undefined,
    concluido_por: concluido ? concluidoPor : undefined,
    observacao: observacao !== undefined ? observacao : target.observacao
  };

  const updatedList = itens.map(i => i.id === id ? updatedItem : i);
  setLocal(CHECKLIST_KEYS.ITENS, updatedList);

  if (concluido) {
    const hojeStr = nowIso.split('T')[0];
    const historico = await fetchChecklistHistorico();
    const novoRegistro: RegistroHistoricoChecklist = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      data: hojeStr,
      item_id: target.id,
      titulo: target.titulo,
      categoria: target.categoria_id,
      periodicidade: target.periodicidade,
      responsavel: target.responsavel,
      concluido_em: nowIso,
      concluido_por: concluidoPor,
      observacao: observacao || target.observacao
    };
    setLocal(CHECKLIST_KEYS.HISTORICO, [novoRegistro, ...historico]);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('checklist_atualizado'));
  }
  return updatedItem;
}

export async function resetCicloChecklist(periodicidade: 'diario' | 'semanal' | 'mensal' | 'todos'): Promise<void> {
  const itens = await fetchChecklistItens();
  const updatedList = itens.map(item => {
    if (periodicidade === 'todos' || item.periodicidade === periodicidade) {
      return {
        ...item,
        concluido: false,
        concluido_em: undefined,
        concluido_por: undefined,
        observacao: undefined
      };
    }
    return item;
  });
  setLocal(CHECKLIST_KEYS.ITENS, updatedList);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('checklist_atualizado'));
  }
}

export async function fetchChecklistHistorico(): Promise<RegistroHistoricoChecklist[]> {
  return getLocal<RegistroHistoricoChecklist[]>(CHECKLIST_KEYS.HISTORICO, getHistoricoInicialMock());
}
