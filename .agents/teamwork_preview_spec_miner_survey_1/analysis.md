# Relatório de Auditoria de Especificação, Componentes UI, Eventos e Atalhos

**Data da Auditoria:** 2026-09-11  
**Auditor:** Teamwork Preview Spec Miner Survey 1 (`teamwork_preview_spec_miner_survey_1`)  
**Repositório Alvo:** `c:\Users\lemes\Documents\antigravity\peaceful-mendel`  
**Escopo:** Auditoria minuciosa de todos os componentes de interface, botões, manipuladores de evento, atalhos de teclado e features faltantes/incompletas em `src/`, mapeados diretamente contra os requisitos **R1** e **R3** de `ORIGINAL_REQUEST.md`.

---

## 1. Sumário Executivo da Auditoria

O projeto é um MVP de CRM e Fidelização para Panificadora em Umuarama-PR desenvolvido com React 18, TypeScript, Tailwind CSS, Lucide Icons e Canvas-Confetti, suportando modo LocalStorage e Supabase. O código foi inspecionado arquivo por arquivo.

### Status Geral de Compilação
- `npm run build`: **Compila com sucesso (exit code 0)** após resolução da importação do hook `useCallback` em `src/pages/CaixaPage.tsx`.

### Principais Constatações
1. **Atalhos de Teclado (F1/F2 e ESC)**:
   - **F1 / F2**: Plenamente funcionais em `src/App.tsx` com `e.preventDefault()` para alternar entre "Frente de Caixa" e "Painel do Dono".
   - **ESC no CaixaPage**: O botão visual "Limpar (ESC)" e o listener de teclado `keydown` para `Escape` limpam o formulário e refocam no campo de WhatsApp. Contudo, se o `AwardModal` estiver aberto, a tecla ESC não fecha o modal (ausência de listener ESC dentro do modal).
2. **Identificação em < 3s vs. Cadastro Relâmpago (>= 10 dígitos)**:
   - Identificação instantânea em tempo real funciona para números com DDD ou sem DDD (últimos 8 dígitos).
   - **Bug de Estado Estagnado (Stale State)**: Ao digitar 8 dígitos que casam com um cliente e em seguida um 9º dígito que desfaz o match, o cliente anterior permanece selecionado porque a condição `digits.length >= 8` não possui cláusula de limpeza para `length === 9` sem match.
   - **Gargalo de UX (Focus Stealing no 10º dígito)**: Ao digitar um celular brasileiro novo (11 dígitos, ex: `44998765432`), ao atingir 10 dígitos o sistema ativa `isNovoCliente = true` e transfere o foco para o campo Nome após 50ms, interceptando a digitação do 11º dígito.
3. **Botões de Valor Rápido (R$5, R$10, R$15, R$20, R$30, R$50)**:
   - Todos os 6 botões estão conectados e funcionais via `setValorCompra(val.toString())`. O highlight visual usa comparação estrita de string (`valorCompra === val.toString()`).
4. **Botão "Confirmar Compra"**:
   - Totalmente funcional para clientes identificados e novos clientes; valida valor > 0 e nome não vazio; impede duplo clique com `isProcessandoRef`; incrementa visitas mensais e total histórico; dispara o modal de celebração com confetti e som se atingir a meta.
5. **Celebração com Confetti & Áudio**:
   - `AwardModal` e `ConfettiCelebration` implementados com Web Audio API nativo (acorde festivo Dó maior) e `canvas-confetti` (rajada central + canhões laterais).
6. **Mapeamento Anti-Churn e Seed Data**:
   - A regra de negócio exige >5 compras no mês anterior e >15 dias sem retorno.
   - **Bug no `seedData.ts`**: O cliente `Sr. Valdomiro Souza` tem compras geradas até o dia 28 do mês anterior. No dia 11 do mês corrente (data atual), `diasSemComprar` é calculado em 14 dias (14 < 15), fazendo com que ele **não** entre na lista de churn. Assim, apenas 1 cliente (`Dra. Beatriz`, vermelho) é exibido, violando o critério de aceitação de gerar pelo menos 2 clientes sumidos (1 amarelo e 1 vermelho).
   - Além disso, `Dra. Beatriz` já possui `ultimo_contato_resgate` preenchido no seed, fazendo com que o botão "Marcar como contatado sem abrir WhatsApp" não apareça inicialmente para nenhum cliente.
7. **Botão "Restaurar dados de demonstração"**:
   - Localizado no cabeçalho (`Layout.tsx`), porém oculto em telas menores que 768px (`hidden md:flex`) e sem rótulo textual (apenas ícone `RotateCcw` com `title`). Não está presente dentro do AdminDashboard.

---

## 2. Features Discovered

| # | Categoria | Feature | Descrição | Entradas | Saídas | Comportamento de Erro | Descoberto Via |
|---|-----------|---------|-----------|----------|--------|-----------------------|----------------|
| 1 | Balcão | Identificação Instantânea (< 3s) | Busca reativa de clientes por WhatsApp conforme digitação (>= 8 dígitos) | Digitação no `#whatsapp-input` | Preenche `clienteEncontrado`, exibe histórico, barra de progresso e nível | Se não encontrar e `< 10` dígitos, mantém estado atual (risco de stale state) | `CaixaPage.tsx:62-83` |
| 2 | Balcão | Cadastro Relâmpago | Formulário minimalista de 1 campo (Nome/Apelido) ativado quando telefone tem >= 10 dígitos não cadastrados | >= 10 dígitos no WhatsApp; digitação do Nome | Exibe card azul de cadastro rápido e foca no nome | Se submeter sem nome, exibe alerta e refoca | `CaixaPage.tsx:75-78, 359-396` |
| 3 | Balcão | Botão "Limpar (ESC)" | Limpa formulário do caixa e refoca no campo de WhatsApp | Clique no botão | Reseta campos para estado inicial e foca em 100ms | Oculto se `telefoneInput` estiver vazio | `CaixaPage.tsx:267-275` |
| 4 | Balcão | Atalho Teclado ESC | Tecla ESC limpa o formulário de atendimento | Pressionar tecla Escape | Executa `resetarFormulario()` e foca WhatsApp | Não fecha o modal de celebração se aberto | `CaixaPage.tsx:116-124` |
| 5 | Balcão | 6 Valores Rápidos | Botões R$5, R$10, R$15, R$20, R$30, R$50 com seleção visual | Clique em um dos 6 botões | Atualiza `valorCompra` e input numérico | Comparação estrita perde highlight se usuário digitar centavos | `CaixaPage.tsx:21, 412-426` |
| 6 | Balcão | Input de Valor Customizado | Entrada de texto com conversão para formato monetário | Digitação no `#valor-input` | Atualiza valor e indicador de qualificação | Se <= 0, barra envio com alerta | `CaixaPage.tsx:429-458` |
| 7 | Balcão | Indicador de Pontuação Mínima | Sinaliza em tempo real se o valor qualifica para a meta de fidelidade (>= R$ 5,00) | Valor digitado vs `config.valor_minimo_pontuacao` | Texto verde (qualifica) ou âmbar (abaixo do mínimo) | Valores vazios ou inválidos tratados como 0 | `CaixaPage.tsx:100-102, 445-457` |
| 8 | Balcão | Botão "Confirmar Compra" | Submissão de compra com 1 clique ou Enter, incrementando contadores | Clique ou tecla ENTER | Registra compra, atualiza histórico, abre modal de prêmio ou banner | Botão desabilitado se cliente não preenchido ou processando | `CaixaPage.tsx:118-179, 462-487` |
| 9 | Balcão | Banner de Sucesso Temporário | Alerta visual verde no topo confirmando compra e número da visita no mês | Registro de compra sem meta | Exibição por 3500ms com mensagem contextual | N/A | `CaixaPage.tsx:142-148, 198-208` |
| 10 | Balcão | Últimas do Balcão | Histórico lateral das últimas 5 compras registradas em tempo real | Lista `compras.slice(0, 5)` | Cards com nome, telefone formatado e valor | Exibe texto "Nenhuma compra recente" se vazio | `CaixaPage.tsx:182-189, 518-553` |
| 11 | Balcão | Campanha Ativa do Mês (Card) | Card informativo com meta, prêmio e mínimo por visita | `config` do contexto | Visual com detalhes da campanha e "Zera dia 1º" | N/A | `CaixaPage.tsx:498-515` |
| 12 | Comemoração | Efeito de Confetti | Disparo de partículas comemorativas (central e canhões laterais) | Montagem do `AwardModal` | Canvas confetti animado | Fallback seguro caso biblioteca não carregue | `ConfettiCelebration.tsx:3-29` |
| 13 | Comemoração | Chime Sonoro Sintetizado | Toca acorde Dó Maior alegre sintetizado via Web Audio API sem arquivos externos | Montagem do `AwardModal` | Áudio sintetizado em 4 notas | `console.debug` silencioso caso navegador bloqueie autoplay | `AwardModal.tsx:15-38` |
| 14 | Comemoração | Modal de Premiação (`AwardModal`) | Modal verde de comemoração exibindo brinde a ser entregue | Compra atingindo exatamente a meta | Exibe instrução para a atendente, nome do cliente e ações | Não fecha via tecla ESC | `AwardModal.tsx:40-138` |
| 15 | Comemoração | Botão Enviar Mensagem Comemorativa | Link direto para WhatsApp com mensagem personalizada de parabéns | Clique no botão verde wa.me | Abre nova aba `https://wa.me/55...` com texto codificado | N/A | `AwardModal.tsx:114-122` |
| 16 | Comemoração | Botão "Brinde Entregue! Próximo" | Fecha modal e prepara balcão para próximo atendimento | Clique no botão | Fecha modal e executa `resetarFormulario()` | N/A | `AwardModal.tsx:125-131` |
| 17 | Navegação | Atalhos Globais F1 e F2 | F1 leva para Frente de Caixa; F2 leva para Painel do Dono | Teclas F1 e F2 | Alterna estado `currentTab` | `e.preventDefault()` bloqueia F1 padrão do browser | `App.tsx:11-23` |
| 18 | Navegação | Abas do Header | Botões no layout para alternar entre Caixa e Admin | Clique nas abas | Alterna `currentTab` | N/A | `Layout.tsx:47-77` |
| 19 | Admin | Exportar CSV / Excel | Geração client-side de relatório CSV com BOM UTF-8 e separador `;` | Clique em "Exportar Excel / CSV" | Download imediato de `panificadora-relatorio-clientes-YYYY-MM-DD.csv` | N/A | `AdminDashboard.tsx:74-97, 142-150` |
| 20 | Admin | KPI Visitas no Mês | Totalizador de compras no mês e média de visitas por cliente ativo | `metricas.totalVisitasMes` | Exibição em card com ícone Calendar | Divisão por 1 se `clientesAtivosMes == 0` | `AdminDashboard.tsx:156-170` |
| 21 | Admin | KPI Faturamento Balcão | Total em R$ faturado no mês e ticket médio | `metricas.faturamentoMes`, `ticketMedioMes` | Exibição em card com ícone TrendingUp | Retorna 0 se nenhuma compra | `AdminDashboard.tsx:172-186` |
| 22 | Admin | KPI Clientes Ativos | Contagem de clientes que compraram no mês | `metricas.clientesAtivosMes` | Exibição em card com ícone Users | N/A | `AdminDashboard.tsx:188-202` |
| 23 | Admin | KPI Clientes Sumidos (Card Clicável) | Total de clientes em risco de churn com atalho direto para a aba de churn | Clique no card | Alterna para a aba `churn` | N/A | `AdminDashboard.tsx:204-223` |
| 24 | Admin | Ranking Mensal de Clientes | Tabela ordenada decrescente por compras válidas e gasto | `resumosMensais` | Tabela com medalhas 1º, 2º, 3º, nível, visitas e meta | N/A | `AdminDashboard.tsx:52-55, 291-413` |
| 25 | Admin | Radar Anti-Churn | Identifica clientes fiéis (>5 compras mês anterior) sem compras há >=15 dias | `clientesSumidos` | Cards com urgência, dias sumido e botões de ação | Filtro pode retornar vazio se dados não atenderem dias | `AdminDashboard.tsx:415-559` |
| 26 | Admin | Filtros de Urgência Churn | Alterna visualização entre Todos, Amarelo (15-30 dias) e Vermelho (+30 dias) | Cliques nos botões de filtro | Filtra array `clientesSumidosFiltrados` | N/A | `AdminDashboard.tsx:68-71, 435-462` |
| 27 | Admin | Chamar no WhatsApp & Registrar | Abre wa.me com mensagem de resgate e marca data de contato de imediato | Clique no botão wa.me do card | Abre WhatsApp em nova aba e persiste `ultimo_contato_resgate` | N/A | `AdminDashboard.tsx:532-542` |
| 28 | Admin | Marcar Contatado sem Abrir WhatsApp | Registra data de contato sem redirecionar para o WhatsApp | Clique no botão | Atualiza estado e LocalStorage; botão é ocultado | Oculto se contato já tiver sido realizado | `AdminDashboard.tsx:544-551` |
| 29 | Admin | Busca em "Todos os Clientes" | Filtro textual instantâneo por nome ou WhatsApp | Digitação no input de busca | Filtra linhas da tabela | Não localiza se usuário digitar telefone com pontuação `(44)` | `AdminDashboard.tsx:58-65, 574-584` |
| 30 | Admin | Ação "Mensagem" na Tabela | Botão para envio de mensagem de bom dia no WhatsApp para qualquer cliente | Clique no botão da linha | Abre wa.me com saudação | N/A | `AdminDashboard.tsx:623-633` |
| 31 | Admin | Formulário de Configurações | Edição da meta mensal, valor mínimo, prêmio, textos e webhook | Digitação nos campos e submit | Persiste no LocalStorage/Supabase e exibe banner | Campos locais não sincronizam se config for reiniciada externamente | `AdminDashboard.tsx:99-120, 643-780` |
| 32 | Sistema | Restaurar Dados de Demonstração | Recarrega massa inicial de clientes e compras de Umuarama | Clique no botão `RotateCcw` do header | Sobrescreve LocalStorage e recarrega dados no contexto | Oculto em telas menores que 768px (`hidden md:flex`) | `Layout.tsx:93-100`, `db.ts:35-39` |
| 33 | Sistema | Webhook Automático WhatsApp | Disparo silencioso via HTTP POST quando cliente atinge a meta (se URL configurada) | Gatilho `atingiuMetaAgora` | POST JSON para webhook configurado | Falhas são capturadas em `.catch()` silencioso | `LoyaltyContext.tsx:230-244`, `whatsapp.ts:45-72` |

---

## 3. Edge Cases

| # | Feature | Entrada / Cenário | Comportamento Observado |
|---|---------|-------------------|-------------------------|
| 1 | Identificação Caixa | Digitar 8 dígitos que casam com um cliente, seguido de um 9º dígito que não casa com ninguém | **Bug de Stale State**: A condição `digits.length >= 8` não limpa `clienteEncontrado` se `match` for nulo e `digits.length < 10`. O cliente anterior continua selecionado na tela. |
| 2 | Cadastro Relâmpago | Digitar telefone celular novo de 11 dígitos (DDD + 9 dígitos, ex: `44998765432`) | **Focus Stealing UX**: Ao bater o 10º dígito (`4499876543`), `isNovoCliente` vira `true` e rouba o foco para o campo Nome após 50ms, impedindo o operador de digitar o 11º dígito no telefone. |
| 3 | Tecla ESC no Balcão | Pressionar ESC com o modal `AwardModal` aberto | O formulário de fundo é resetado, mas o modal de prêmio permanece aberto na tela porque o modal não possui listener de ESC. |
| 4 | Botões de Valor Rápido | Usuário clica em R$ 15 e depois edita o campo para "15,00" ou "15.00" | O botão R$ 15 perde o estilo de selecionado ativo devido à verificação estrita `valorCompra === val.toString()`. |
| 5 | Anti-Churn no SeedData | Carregar a aplicação entre os dias 1º e 14 do mês corrente (ex: dia 11 de setembro) | **Bug no SeedData**: O cliente `Sr. Valdomiro Souza` teve última compra gerada em 28 do mês anterior (14 dias atrás). Como `diasSemComprar` resulta em 14 (< 15), ele **não** entra na lista de churn. Nenhum cliente amarelo é exibido, violando o critério de aceitação de ter 1 amarelo e 1 vermelho. |
| 6 | Marcar Contatado no SeedData | Exibir o card de churn da `Dra. Beatriz Fontana` no carregamento inicial | No seedData, ela já possui `ultimo_contato_resgate: '2026-09-08'`. Como resultado, o botão "Marcar como contatado sem abrir WhatsApp" não é renderizado para nenhum card na inicialização. |
| 7 | Busca de Clientes no Admin | Buscar cliente digitando telefone com formatação (ex: `(44) 99876` ou `99876-`) | A busca falha e exibe zero resultados, pois compara diretamente contra `r.cliente.whatsapp` que armazena dígitos puros (`44998765432`), sem sanitizar o termo digitado com `cleanPhone`. |
| 8 | Configurações do Admin | Clicar no botão de restaurar dados de demonstração no header enquanto na aba Configurações | Os campos de input da aba Configurações permanecem com os valores antigos porque utilizam `useState(config...)` inicial sem sincronização reativa via `useEffect`. |
| 9 | Botão Restaurar Demo | Acessar o sistema em viewport móvel (< 768px) | O botão "Restaurar dados de demonstração" desaparece completamente da interface devido à classe `hidden md:flex` no container pai do header. |
| 10 | Valor Abaixo do Mínimo | Registrar compra de R$ 3,00 (mínimo configurado: R$ 5,00) | A compra é registrada com sucesso no histórico geral e no faturamento do mês, mas `pontuou_fidelidade` é salvo como falso e não incrementa o contador mensal nem a meta. Comportamento em conformidade total com R2. |
| 11 | Gatilho de Premiação | Cliente na 10ª compra válida vs. 11ª compra válida | Na 10ª compra (`totalValidasAtualizado === config.meta_compras_mes`), o modal de premiação abre instantaneamente. Na 11ª compra válida, o modal não abre, registrando apenas a mensagem regular de compra no balcão. Conformidade total com R2. |
| 12 | Virada do Mês (Zera dia 1º) | Transição do último dia do mês para o dia 1º | Os contadores mensais calculam compras dinamicamente usando `compYear === currentYear && compMonth === currentMonth`. Na virada do mês, o contador zera automaticamente sem necessidade de jobs de limpeza. |

---

## 4. Mapeamento Detalhado contra R1 e R3 de ORIGINAL_REQUEST.md

### Matriz de Conformidade de Requisitos

| Requisito | Item Especificado | Status no Código | Arquivo e Linhas | Detalhes e Observações |
|---|---|---|---|---|
| **R1** | Botão "Limpar (ESC)" no CaixaPage | ✅ Implementado | `src/pages/CaixaPage.tsx:267-275` | Conectado a `resetarFormulario()`. Oculto se input de telefone estiver vazio. |
| **R1** | Tecla ESC do teclado | ⚠️ Parcial | `src/pages/CaixaPage.tsx:116-124` | Funciona no CaixaPage, mas não fecha o `AwardModal` quando aberto. |
| **R1** | 6 botões de valores rápidos | ✅ Implementado | `src/pages/CaixaPage.tsx:21, 412-426` | Todos os 6 (5, 10, 15, 20, 30, 50) conectados e atualizam input e estado. |
| **R1** | Botão "Confirmar Compra" | ✅ Implementado | `src/pages/CaixaPage.tsx:462-487` | Conectado a `handleConfirmarCompra`; validações, bloqueio de duplo envio e foco implementados. |
| **R1** | Botão de Exportar CSV | ✅ Implementado | `src/pages/AdminDashboard.tsx:74-97, 142-150` | Exporta relatório com BOM UTF-8 e `;`, contendo 7 colunas formatadas. |
| **R1** | Todos os botões de WhatsApp | ✅ Implementado | `AwardModal.tsx:114-122`, `AdminDashboard.tsx:532, 623` | URLs `https://wa.me/55...` válidas geradas com encoding correto e `target="_blank"`. |
| **R1** | Botão "Restaurar dados de demonstração" | ⚠️ Parcial | `src/components/Layout.tsx:93-100` | Conectado a `reiniciarDadosDemo()`, mas é apenas um ícone sem texto e está oculto em telas `< 768px`. |
| **R1** | Botão "Salvar Alterações" (Configurações) | ✅ Implementado | `src/pages/AdminDashboard.tsx:100-120, 770-778` | Conectado a `handleSalvarConfig`, persiste no LocalStorage/Supabase com feedback visual. |
| **R1** | Botão "Marcar como contatado" | ✅ Implementado | `src/pages/AdminDashboard.tsx:544-551` | Conectado a `marcarContatoRealizado(resumo.cliente.id)`; atualiza UI e LocalStorage. |
| **R3** | Identificação em < 3s por WhatsApp | ⚠️ Parcial | `src/pages/CaixaPage.tsx:62-83` | Busca em tempo real sem botão, mas possui bug de stale state no 9º dígito e conflito de foco no 10º. |
| **R3** | Cadastro relâmpago apenas com nome | ✅ Implementado | `src/pages/CaixaPage.tsx:359-396` | Card azul solicita apenas Primeiro Nome ao digitar número novo (>= 10 dígitos). |
| **R3** | Contador de compras do mês exibido na hora | ✅ Implementado | `src/pages/CaixaPage.tsx:308-320` | Exibe contador `comprasValidasMes / meta_compras_mes` em destaque e barra de progresso. |
| **R3** | Registro ágil do valor com 1 clique | ✅ Implementado | `src/pages/CaixaPage.tsx:412-426, 462-487` | Botões de valor e botão de confirmação permitem fechamento ultra-rápido. |
| **R3** | Alerta verde comemorativo com confetti na meta | ✅ Implementado | `src/components/AwardModal.tsx`, `ConfettiCelebration.tsx` | Dispara confetti e áudio festivo nativo exatamente na compra que bate a meta. |
| **R3** | Ranking mensal ordenado | ✅ Implementado | `src/pages/AdminDashboard.tsx:52-55, 291-413` | Ordenação decrescente por compras válidas e gasto, com pódio visual. |
| **R3** | Módulo anti-churn com WhatsApp direto | ✅ Implementado | `src/pages/AdminDashboard.tsx:415-559` | Cards detalhados com botão direto wa.me contendo texto de resgate. |
| **R3** | Totalizadores de faturamento e visitas | ✅ Implementado | `src/pages/AdminDashboard.tsx:154-224` | 4 cards de KPIs: Visitas no Mês, Faturamento, Clientes Ativos e Clientes Sumidos. |
| **R3** | Configurações de fidelidade editáveis | ✅ Implementado | `src/pages/AdminDashboard.tsx:643-780` | Todos os campos do modelo configuráveis via formulário. |
| **R3** | Disparo de mensagem comemorativa no WhatsApp | ✅ Implementado | `src/components/AwardModal.tsx:114-122`, `LoyaltyContext.tsx:230-244` | Botão manual wa.me no modal + suporte a webhook automático. |
| **R3** | Tecla ESC limpa formulário do caixa | ✅ Implementado | `src/pages/CaixaPage.tsx:116-124` | Limpa inputs e refoca no WhatsApp. |
| **R3** | Tecla F1/F2 alterna entre telas | ✅ Implementado | `src/App.tsx:11-23` | F1 para Caixa, F2 para Admin, com interceptação preventiva. |
| **R3** | Campo de WhatsApp com auto-focus ao carregar | ✅ Implementado | `src/pages/CaixaPage.tsx:57-59` | `phoneInputRef.current?.focus()` executado na montagem e após resets. |

---

## 5. Auditoria de Código Morto, Props Não Utilizadas e Dependências

1. **Dependências em `package.json`**:
   - `clsx` (`^2.1.1`) e `tailwind-merge` (`^3.0.2`): Listadas como dependências, porém **não são importadas em nenhum arquivo** de `src/`. As classes condicionais no projeto usam template literals (`${...}`).
2. **Imports e Componentes**:
   - Todos os 15 ícones de `lucide-react` importados em `AdminDashboard.tsx`, todos os 12 em `CaixaPage.tsx`, e todos os 5 em `AwardModal.tsx` estão em uso.
   - Nenhuma variável ou função órfã foi identificada em `src/services/` ou `src/context/`.
3. **Botões Desconectados**:
   - Nenhum botão possui handler vazio (`onClick={() => {}}`). Todos os botões mapeados possuem propósitos e efeitos colaterais ativos.

---

## 6. Recomendações Críticas para a Equipe de Implementação

1. **Corrigir Geração de Clientes Sumidos em `src/services/seedData.ts`**:
   - Definir as datas de compra de `Sr. Valdomiro Souza` com base em `today.getTime() - (18 * 24 * 60 * 60 * 1000)` para garantir que ele sempre possua entre 15 e 29 dias sem compras, independentemente do dia do mês em que a aplicação for executada.
   - Manter `ultimo_contato_resgate: null` em Valdomiro para que o botão "Marcar como contatado sem abrir WhatsApp" esteja visível e testável.
2. **Resolver o Conflito de Foco e Stale State em `src/pages/CaixaPage.tsx`**:
   - No `useEffect` de busca de WhatsApp, adicionar a cláusula `else { setClienteEncontrado(null); setIsNovoCliente(false); }` para cobrir o caso em que `digits.length` é 8 ou 9 e nenhum match ocorre.
   - Ajustar o gatilho de cadastro relâmpago para não roubar o foco no 10º dígito se o número estiver incompleto (ou aguardar 11 dígitos, ou manter o foco no WhatsApp permitindo ao usuário apertar Enter para ir ao Nome).
3. **Adicionar Fechamento por ESC em `src/components/AwardModal.tsx`**:
   - Incluir um listener de `keydown` no `AwardModal` para fechar o modal e limpar o balcão ao pressionar ESC.
4. **Melhorar Acessibilidade e Visibilidade do Botão de Restaurar Dados**:
   - Adicionar o botão de restauração de dados demo também na aba de Configurações do `AdminDashboard`, com texto legível "Restaurar Dados de Demonstração", garantindo acesso mesmo em telas menores.
5. **Sanitizar a Busca de Clientes no Admin**:
   - Em `AdminDashboard.tsx`, ao filtrar por texto em "Todos os Clientes", aplicar `cleanPhone(filtroTexto)` para permitir que buscas digitadas como `(44) 99876` encontrem o cliente.
