import { CategoriaChecklist, ItemChecklist, RegistroHistoricoChecklist } from '../types';
import { getLocal, setLocal, STORAGE_KEYS } from './db';

// Chaves específicas para Checklist
export const CHECKLIST_KEYS = {
  CATEGORIAS: 'panificadora_checklist_categorias',
  ITENS: 'panificadora_checklist_itens',
  HISTORICO: 'panificadora_checklist_historico'
};

// Categorias Padrão de Panificadora
export const INITIAL_CHECKLIST_CATEGORIAS: CategoriaChecklist[] = [
  {
    id: 'cat-abertura',
    nome: 'Abertura de Loja & Balcão',
    descricao: 'Rotinas pré-operacionais antes da chegada dos clientes',
    cor: 'amber'
  },
  {
    id: 'cat-producao',
    nome: 'Panificação & Confeitaria',
    descricao: 'Fornos, masseiras, fermentação e vitrines de pães',
    cor: 'blue'
  },
  {
    id: 'cat-higiene',
    nome: 'Higiene & Boas Práticas (ANVISA)',
    descricao: 'Sanitização de bancadas, estufas e controle de temperatura',
    cor: 'emerald'
  },
  {
    id: 'cat-fechamento',
    nome: 'Fechamento & Segurança',
    descricao: 'Fechamento de caixa, conferência de trancas e desligamento de fornos',
    cor: 'indigo'
  },
  {
    id: 'cat-manutencao',
    nome: 'Manutenção & Equipamentos',
    descricao: 'Filtros de coifa, freezers, balanças e câmaras de fermentação',
    cor: 'rose'
  }
];

// Itens Operacionais Iniciais
export const INITIAL_CHECKLIST_ITENS: ItemChecklist[] = [
  // ABERTURA
  {
    id: 'item-1',
    titulo: 'Ligar e pré-aquecer fornos de lastro e turbo (180°C a 200°C)',
    categoria_id: 'cat-abertura',
    periodicidade: 'diario',
    turno: 'abertura',
    responsavel: 'Padeiro',
    prioridade: 'alta',
    instrucoes: 'Aguardar atrito térmico antes da primeira fornada de pão francês.',
    ativo: true,
    concluido: true,
    concluido_em: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    concluido_por: 'Padeiro Chefe',
    observacao: 'Fornos aquecidos sem desvios.',
    criado_em: new Date().toISOString()
  },
  {
    id: 'item-2',
    titulo: 'Conferir fundo de troco do caixa e bobinas térmicas de cupom',
    categoria_id: 'cat-abertura',
    periodicidade: 'diario',
    turno: 'abertura',
    responsavel: 'Caixa',
    prioridade: 'alta',
    instrucoes: 'Conferir R$ 200 em moedas e notas miúdas para troco.',
    ativo: true,
    concluido: true,
    concluido_em: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
    concluido_por: 'Operador de Caixa',
    observacao: 'Fundo conferido R$ 200,00.',
    criado_em: new Date().toISOString()
  },
  {
    id: 'item-3',
    titulo: 'Montar vitrine de pães frescos, pães doces e fatiados',
    categoria_id: 'cat-abertura',
    periodicidade: 'diario',
    turno: 'abertura',
    responsavel: 'Balcão',
    prioridade: 'media',
    instrucoes: 'Organizar cestos e abastecer placas de identificação de preço.',
    ativo: true,
    concluido: true,
    concluido_em: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    concluido_por: 'Atendente',
    criado_em: new Date().toISOString()
  },
  {
    id: 'item-4',
    titulo: 'Aferição matinal da temperatura das geladeiras de laticínios (< 4°C)',
    categoria_id: 'cat-higiene',
    periodicidade: 'diario',
    turno: 'manha',
    responsavel: 'Cozinha',
    prioridade: 'alta',
    instrucoes: 'Registrar no termômetro digital conforme protocolo sanitário.',
    ativo: true,
    concluido: false,
    criado_em: new Date().toISOString()
  },
  // PRODUÇÃO
  {
    id: 'item-5',
    titulo: 'Controle de validade e etiquetagem dos recheios abertos (Confeitaria)',
    categoria_id: 'cat-producao',
    periodicidade: 'diario',
    turno: 'manha',
    responsavel: 'Confeiteiro',
    prioridade: 'alta',
    instrucoes: 'Todos os potes abertos devem conter etiqueta com data de abertura e validade.',
    ativo: true,
    concluido: false,
    criado_em: new Date().toISOString()
  },
  {
    id: 'item-6',
    titulo: 'Higienização e desinfecção das masseiras e cilindros com álcool 70%',
    categoria_id: 'cat-producao',
    periodicidade: 'diario',
    turno: 'tarde',
    responsavel: 'Padeiro',
    prioridade: 'alta',
    instrucoes: 'Desconectar da tomada antes da lavagem e secagem completa.',
    ativo: true,
    concluido: false,
    criado_em: new Date().toISOString()
  },
  // HIGIENE & BOAS PRÁTICAS
  {
    id: 'item-7',
    titulo: 'Troca dos panos de limpeza por descartáveis ou desinfetados',
    categoria_id: 'cat-higiene',
    periodicidade: 'diario',
    turno: 'manha',
    responsavel: 'Limpeza',
    prioridade: 'media',
    instrucoes: 'Separar panos do salão dos panos da cozinha de preparo.',
    ativo: true,
    concluido: true,
    concluido_em: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    concluido_por: 'Equipe de Limpeza',
    criado_em: new Date().toISOString()
  },
  {
    id: 'item-8',
    titulo: 'Limpeza e sanitização da caixa de gordura e ralos sifonados',
    categoria_id: 'cat-higiene',
    periodicidade: 'semanal',
    turno: 'livre',
    responsavel: 'Limpeza',
    prioridade: 'alta',
    instrucoes: 'Procedimento semanal com cloração adequada.',
    ativo: true,
    concluido: false,
    criado_em: new Date().toISOString()
  },
  {
    id: 'item-9',
    titulo: 'Limpeza pesada de coifas, exaustores e filtros de gordura',
    categoria_id: 'cat-manutencao',
    periodicidade: 'semanal',
    turno: 'livre',
    responsavel: 'Cozinha',
    prioridade: 'media',
    instrucoes: 'Remover filtros para banho químico desengordurante.',
    ativo: true,
    concluido: false,
    criado_em: new Date().toISOString()
  },
  {
    id: 'item-10',
    titulo: 'Inventário e contagem física semanal de farinhas, fermentos e manteigas',
    categoria_id: 'cat-producao',
    periodicidade: 'semanal',
    turno: 'livre',
    responsavel: 'Gerente',
    prioridade: 'alta',
    instrucoes: 'Cruzar saldo físico com estoque do sistema para controle de perdas.',
    ativo: true,
    concluido: true,
    concluido_em: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    concluido_por: 'Lucas Gerente',
    observacao: 'Estoque de farinha trigo 100% batendo.',
    criado_em: new Date().toISOString()
  },
  {
    id: 'item-11',
    titulo: 'Descongelamento e higienização profunda das câmaras frias e freezers',
    categoria_id: 'cat-manutencao',
    periodicidade: 'mensal',
    turno: 'livre',
    responsavel: 'Cozinha',
    prioridade: 'alta',
    instrucoes: 'Remover produtos para câmara auxiliar durante o degelo.',
    ativo: true,
    concluido: false,
    criado_em: new Date().toISOString()
  },
  {
    id: 'item-12',
    titulo: 'Dedetização e controle integrado de pragas urbanas (Certificado ANVISA)',
    categoria_id: 'cat-higiene',
    periodicidade: 'mensal',
    turno: 'livre',
    responsavel: 'Gerente',
    prioridade: 'alta',
    instrucoes: 'Acompanhar aplicação da empresa especializada e guardar laudo técnico.',
    ativo: true,
    concluido: true,
    concluido_em: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    concluido_por: 'Gerente',
    observacao: 'Laudo válido por 30 dias arquivado na pasta de fiscalização.',
    criado_em: new Date().toISOString()
  },
  // FECHAMENTO
  {
    id: 'item-13',
    titulo: 'Fechamento de turno do caixa, conferência de sangrias e gaveta',
    categoria_id: 'cat-fechamento',
    periodicidade: 'diario',
    turno: 'fechamento',
    responsavel: 'Caixa',
    prioridade: 'alta',
    instrucoes: 'Emitir relatório de fechamento de caixa e anexar comprovantes de cartão.',
    ativo: true,
    concluido: false,
    criado_em: new Date().toISOString()
  },
  {
    id: 'item-14',
    titulo: 'Desligar fornos, estufas térmicas, chapas e máquinas de café',
    categoria_id: 'cat-fechamento',
    periodicidade: 'diario',
    turno: 'fechamento',
    responsavel: 'Gerente',
    prioridade: 'alta',
    instrucoes: 'Verificar registros de gás e disjuntores dos aparelhos de alta potência.',
    ativo: true,
    concluido: false,
    criado_em: new Date().toISOString()
  },
  {
    id: 'item-15',
    titulo: 'Descarte e remoção dos lixos orgânicos e recicláveis para coleta externa',
    categoria_id: 'cat-fechamento',
    periodicidade: 'diario',
    turno: 'fechamento',
    responsavel: 'Limpeza',
    prioridade: 'alta',
    instrucoes: 'Higienizar lixeiras internas com cloro e colocar novos sacos pretos.',
    ativo: true,
    concluido: false,
    criado_em: new Date().toISOString()
  },
  {
    id: 'item-16',
    titulo: 'Conferência de trancas das portas, janelas, alarmes e câmeras',
    categoria_id: 'cat-fechamento',
    periodicidade: 'diario',
    turno: 'fechamento',
    responsavel: 'Gerente',
    prioridade: 'alta',
    instrucoes: 'Ativar alarme perimetral e checar sensores da área de produção.',
    ativo: true,
    concluido: false,
    criado_em: new Date().toISOString()
  }
];

// Dados Iniciais de Histórico dos Últimos 7 Dias (Para alimentar os gráficos com histórico realista)
export function getHistoricoInicialMock(): RegistroHistoricoChecklist[] {
  const historico: RegistroHistoricoChecklist[] = [];
  const hoje = new Date();

  for (let i = 1; i <= 7; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const dataStr = d.toISOString().split('T')[0];

    // Simula registros cumpridos nos dias anteriores
    INITIAL_CHECKLIST_ITENS.slice(0, 10).forEach(item => {
      // 90% de cumprimento histórico
      if (Math.random() > 0.12) {
        historico.push({
          id: `hist-${dataStr}-${item.id}`,
          data: dataStr,
          item_id: item.id,
          titulo: item.titulo,
          categoria: item.categoria_id,
          periodicidade: item.periodicidade,
          responsavel: item.responsavel,
          concluido_em: `${dataStr}T08:${10 + Math.floor(Math.random() * 40)}:00Z`,
          concluido_por: item.responsavel || 'Equipe',
          observacao: 'Concluído na rotina padrão'
        });
      }
    });
  }

  return historico;
}

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

  // Se concluído, registrar no histórico de conformidade
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
