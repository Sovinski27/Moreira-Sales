# Project: Bakery CRM & Loyalty MVP (Panificadora Umuarama-PR)

## Architecture
- **Framework**: React 18 + TypeScript + Vite + Tailwind CSS + Lucide React + Canvas Confetti.
- **State Management**: React Context (`LoyaltyContext`) providing in-memory state, reactive derivation via `useMemo` for KPIs/rankings/churn, and bidirectional persistence to `localStorage` (with Supabase abstraction fallback in `services/db.ts`).
- **Data Flow**:
  - `CaixaPage` creates purchases through `registrarCompra` or clients through `cadastrarCliente`.
  - `LoyaltyContext` processes rules (minimum value filter, month filter, tier computation, celebration trigger, churn classification).
  - `AdminDashboard` consumes state reactively without full page reload.
  - `Layout` wraps pages and provides navigation and global demo data restoration.

## Feature Inventory
Every feature from the Survey phase and ORIGINAL_REQUEST.md is cataloged below with its assigned milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F01 | 6 Valores Rápidos | Botões R$5, R$10, R$15, R$20, R$30, R$50 que atualizam o input de valor instantaneamente | M1 | R1, R3 |
| F02 | Limpar (ESC) & Atalho ESC | Botão visual "Limpar (ESC)" e tecla ESC limpam o caixa e refocam no campo WhatsApp; ESC fecha AwardModal | M1 | R1, R3 |
| F03 | Busca em Tempo Real & Cadastro Relâmpago | Busca por WhatsApp (<3s), sem stale state no 8º/9º dígito; cadastro relâmpago aos 10 dígitos sem roubo prematuro de foco | M1 | R1, R3 |
| F04 | Confirmar Compra | Registra a compra, incrementa contador mensal e histórico do cliente | M1 | R1, R2 |
| F05 | Regra de Compra Mínima (R$ 5,00) | Compras ≥ R$ 5,00 pontuam na fidelidade; compras < R$ 5,00 são salvas no histórico mas NÃO contam na meta/progresso | M2 | R2 |
| F06 | Zeramento Mensal Automático | Contadores mensais calculados com base no mês civil atual (dia 1º às 00:00) | M2 | R2 |
| F07 | Níveis de Engajamento | Bronze (1-5), Prata (6-12), Ouro (>12) calculados estritamente com compras válidas | M2 | R2 |
| F08 | Anti-Churn & Urgências | Identifica clientes com ≥5 compras no mês anterior e ≥15 dias sem comprar; Amarelo (15-29 dias), Vermelho (≥30 dias) | M2 | R2 |
| F09 | Conformidade do SeedData | Massa inicial com ≥1 cliente com meta atingida, ≥1 cliente a 1 compra da meta, e 2 clientes sumidos (1 amarelo, 1 vermelho) | M2 | R2 |
| F10 | Marcação de Contato Realizado | Botão "Marcar como contatado" salva data no cliente e reflete imediatamente na UI | M3 | R1, R2 |
| F11 | KPIs do Admin & Ranking | Volume de visitas, faturamento, clientes ativos, ticket médio e ranking ordenado atualizam sem reload | M3 | R1, R3 |
| F12 | Exportação CSV / Excel | Exporta CSV com cabeçalho formatado em pt-BR, delimitador `;` e BOM UTF-8 | M3 | R1, R3 |
| F13 | Filtro Anti-Churn & Resgate WhatsApp | Filtros Todos/Amarelo/Vermelho e disparo de wa.me para resgate | M3 | R1, R2, R3 |
| F14 | Configurações Editáveis | Meta de compras, valor mínimo, mensagens e webhook editáveis e persistidos | M3 | R1, R3 |
| F15 | Restaurar Demonstração | Botão de reset de demo visível e funcional em desktop e mobile | M3 | R1, R3 |
| F16 | Links do WhatsApp (wa.me) | Formatação segura com `encodeURIComponent` para comemoração, resgate e contato | M1, M3 | R1, R3 |
| F17 | Gatilho de Premiação & Confetti | Modal com confetti e áudio abre EXATAMENTE na compra que atinge a meta (não abre na 11ª, 12ª...) | M1 | R2, R3 |
| F18 | Atalhos F1 e F2 | F1 abre Caixa, F2 abre Admin com preventDefault | M1 | R3 |
| F19 | Qualidade, Build & pt-BR | `npm run build` exit code 0, zero erros TypeScript, código limpo e interface 100% em pt-BR | M4 | R4 |

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Suite Track | Suite de testes automatizados e opacos (Tiers 1-4: Features, Limites, Pares, Cenários Reais) gerando TEST_READY.md | none | DONE (220/220 pass, 100%) |
| M1 | CaixaPage & UI Interactions | F01, F02, F03, F04, F16, F17, F18: correções de foco, stale state no telefone, ESC no modal, atalhos e botões rápidos | none | DONE (Verificado por Reviewers e Challengers) |
| M2 | Business Logic & SeedData Fix | F05, F06, F07, F08, F09: correção de Sr. Valdomiro no seedData (urgência amarela), validação de regras de fidelidade | none | DONE (SeedData 100% compliant, churn amarelo/vermelho) |
| M3 | AdminDashboard, Anti-Churn & Settings | F10, F11, F12, F13, F14, F15: filtros de urgência, persistência de contato, exportação CSV, sync de configs, reset demo | M1, M2 | DONE (RFC 4180 CSV, persistência de contato imediata) |
| M4 | Build & Code Polish | F19: verificação de build TypeScript, eliminação de imports não utilizados, formatação de datas pt-BR | M1, M2, M3 | DONE (npm run build exit code 0, zero erros/warnings) |
| M5 | Final Acceptance & Adversarial Hardening | Execução 100% da suite E2E, Adversarial Coverage Hardening (Tier 5) e Forensic Integrity Audit | E2E, M4 | DONE (Auditor CLEAN, 5/5 verifiers APPROVE) |

## Interface Contracts

### LoyaltyContext ↔ CaixaPage & AdminDashboard
- `registrarCompra(clienteId: string, valor: number): Promise<{ compra: Compra; atingiuMetaAgora: boolean; cliente: Cliente }>`
- `cadastrarCliente(dados: { nome: string; telefone: string }): Promise<Cliente>`
- `marcarContatoRealizado(clienteId: string): Promise<void>`
- `salvarConfiguracoes(novasConfigs: Configuracoes): Promise<void>`
- `reiniciarDadosDemo(): Promise<void>`
- `clientesSumidos`: `ClienteSumido[]` onde cada item possui `{ cliente, diasSemComprar, comprasMesAnterior, urgencia_churn: 'amarelo' | 'vermelho', ultimo_contato }`
- `metricas`: `{ totalVisitasMes, faturamentoMes, clientesAtivosMes, clientesEmRisco, premiosEntregues, ticketMedioMes }`

### SeedData Contract
- `INITIAL_CLIENTES`: deve conter clientes suficientes para preencher os cenários.
- `INITIAL_COMPRAS`:
  - `cli-01` (Dona Marlene): >= 10 compras válidas no mês atual (meta atingida).
  - `cli-02` (Seu Antônio): 9 compras válidas no mês atual (a 1 compra da meta).
  - `cli-07` (Sr. Valdomiro): >= 5 compras no mês anterior, ausência entre 15 e 29 dias no mês atual (`urgencia_churn = 'amarelo'`).
  - `cli-08` (Dra. Beatriz): >= 5 compras no mês anterior, ausência >= 30 dias (`urgencia_churn = 'vermelho'`).

## Code Layout
- `src/types/index.ts`: Modelos de dados (`Cliente`, `Compra`, `Configuracoes`, `ResumoMensal`, `ClienteSumido`, `MetricasDashboard`).
- `src/context/LoyaltyContext.tsx`: Provedor central de regras de negócio, contadores, cálculos de fidelidade e persistência.
- `src/pages/CaixaPage.tsx`: Interface do terminal de ponto de venda, registro rápido, busca de telefone, botões de atalho.
- `src/pages/AdminDashboard.tsx`: Painel de métricas, ranking mensal, módulo anti-churn, exportação CSV e configurações.
- `src/components/AwardModal.tsx`: Modal comemorativo de atingimento da meta de fidelidade com confetti e áudio.
- `src/components/ConfettiCelebration.tsx`: Efeito visual com Canvas Confetti.
- `src/components/Layout.tsx`: Cabeçalho, navegação de abas e botão de restauração de dados.
- `src/services/seedData.ts`: Geração determinística de clientes e histórico de compras.
- `src/services/whatsapp.ts`: Montagem e codificação de links `wa.me`.
- `src/services/db.ts`: Camada de abstração de dados (LocalStorage + Supabase fallback).
- `e2e/`: Diretório dedicado para a infraestrutura e casos de teste E2E automatizados (Tiers 1-4).
