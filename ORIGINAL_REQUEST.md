# Original User Request

## Initial Request — 2026-09-11T18:14:32Z

Auditoria completa de qualidade, correção de bugs e preenchimento de lacunas no MVP existente de CRM e Fidelização para uma Panificadora em Umuarama-PR. O sistema já foi implementado e compila sem erros, mas precisa de uma revisão profunda para garantir que cada botão funcione, cada fluxo esteja conectado, cada regra de negócio esteja correta e que features do briefing original não tenham sido esquecidas.

Working directory: c:\Users\lemes\Documents\antigravity\peaceful-mendel
Integrity mode: development

## Requirements

### R1. Auditoria de bugs e botões não funcionais
Revisar sistematicamente cada componente React e cada handler de evento no codebase. Identificar e CORRIGIR botões que não fazem nada, handlers que não estão conectados, estados que não são atualizados, props que não são passadas, e qualquer código morto ou importação não utilizada. Especificamente validar: o botão "Limpar (ESC)" no CaixaPage, a tecla ESC do teclado, os 6 botões de valores rápidos, o botão "Confirmar Compra", o botão de Exportar CSV, todos os botões de WhatsApp, o botão "Restaurar dados de demonstração", e o botão "Salvar Alterações" das configurações.

### R2. Auditoria de fluxos de dados e regras de negócio
Rastrear o fluxo completo de dados desde a entrada no caixa até a exibição no painel admin. Verificar que: (a) o valor mínimo de R$ 5,00 é corretamente aplicado para pontuação de fidelidade, (b) compras abaixo do mínimo são registradas mas NÃO contam na meta, (c) o contador mensal zera corretamente no dia 1º do mês, (d) os níveis Bronze/Prata/Ouro são calculados corretamente com base nas compras VÁLIDAS (não todas), (e) a regra de anti-churn (>5 compras no mês anterior + >15 dias sem comprar) funciona, (f) as urgências amarelo/vermelho do anti-churn estão corretas, (g) o marcador de "Contato Realizado" é persistido no localStorage/Supabase, (h) o gatilho de premiação dispara exatamente na compra que atinge a meta (não antes, não depois).

### R3. Features faltantes do briefing original
Comparar o código existente com TODOS os requisitos do briefing original e implementar qualquer feature que esteja faltando ou incompleta. O briefing original pede: identificação em menos de 3 segundos por WhatsApp, cadastro relâmpago apenas com nome, contador de compras do mês exibido na hora, registro ágil do valor com 1 clique, alerta verde comemorativo com confetti na meta, ranking mensal ordenado, módulo anti-churn com botão WhatsApp direto, totalizadores de faturamento e volume de visitas, exportação CSV, configurações de fidelidade editáveis, e disparo de mensagem comemorativa no WhatsApp. Garantir que a tecla ESC limpe o formulário do caixa, que a tecla F1/F2 alterne entre telas, e que o campo de WhatsApp tenha auto-focus ao carregar.

### R4. Qualidade do código e build
Garantir que o código compila sem erros TypeScript, que não há warnings do compilador, que não há imports não utilizados, e que o `npm run build` passa com exit code 0. O CSS deve estar limpo e a UI inteiramente em português brasileiro.

## Acceptance Criteria

### Botões e Interações
- [ ] Cada um dos 6 botões de valor rápido (R$5, R$10, R$15, R$20, R$30, R$50) atualiza visualmente o campo de valor ao ser clicado
- [ ] O botão "Confirmar Compra" registra a compra e incrementa o contador mensal do cliente
- [ ] O botão "Limpar (ESC)" e a tecla ESC do teclado limpam o formulário do caixa e refocam no campo de WhatsApp
- [ ] O botão "Exportar Excel / CSV" gera e baixa um arquivo .csv válido com todos os clientes
- [ ] Cada botão de WhatsApp (comemoração, resgate, mensagem genérica) gera uma URL wa.me válida e abre em nova aba
- [ ] O botão "Restaurar dados de demonstração" recarrega os dados iniciais do seedData
- [ ] O botão "Salvar Alterações" na aba de configurações persiste os valores (meta, valor mínimo, textos, webhook)
- [ ] O botão "Marcar como contatado" no anti-churn atualiza a data de contato e reflete na UI imediatamente

### Fluxos de Dados
- [ ] Ao digitar um WhatsApp existente, o cliente é identificado em tempo real sem precisar clicar em buscar
- [ ] Ao digitar um WhatsApp novo (≥10 dígitos), o formulário de cadastro relâmpago aparece automaticamente
- [ ] Uma compra registrada no CaixaPage aparece imediatamente no ranking e KPIs do AdminDashboard sem reload
- [ ] A barra de progresso do caixa reflete o número correto de compras VÁLIDAS (≥R$5) vs. a meta
- [ ] Uma compra de R$3 (abaixo do mínimo) é registrada no histórico mas NÃO incrementa o contador de fidelidade

### Regras de Negócio
- [ ] O modal de premiação com confetti dispara exatamente quando compras_validas == meta (ex: 10ª compra válida)
- [ ] O modal NÃO dispara na 11ª, 12ª ou compras subsequentes
- [ ] Os dados de demonstração do seedData geram pelo menos: 1 cliente com meta já atingida, 1 cliente a 1 compra da meta, e 2 clientes sumidos (1 amarelo, 1 vermelho)
- [ ] O filtro de urgência no anti-churn (Todos/Amarelo/Vermelho) filtra corretamente os cards exibidos

### Build
- [ ] `npm run build` completa com exit code 0 e zero erros TypeScript
