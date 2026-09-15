# Relatório de Investigação Técnica: Lógica de Negócio, Fidelidade, Anti-Churn e Seed Data

**Data da Investigação:** 11 de Setembro de 2026  
**Investigador:** teamwork_preview_explorer_survey_2  
**Escopo:** `src/` (Regras de Negócio R2, Fluxos de Dados e Critérios de Aceite de `ORIGINAL_REQUEST.md`)

---

## 1. Resumo Executivo das Constatações

| Item Investigado | Requisito R2 / Critério de Aceite | Status no Código | Gravidade / Diagnóstico |
|---|---|---|---|
| **Regra de Compra Mínima (R$ 5,00)** | Compras < R$ 5,00 entram no histórico mas NÃO contam na meta/progresso | **CONFORME** | Implementado corretamente em `CaixaPage.tsx` e `LoyaltyContext.tsx`. |
| **Zerar Contador Mensal** | Contador zera automaticamente no dia 1º de cada mês | **CONFORME** | Stateless & reativo via `compYear === currentYear && compMonth === currentMonth`. |
| **Cálculo de Níveis (Bronze/Prata/Ouro)** | Níveis baseados EXCLUSIVAMENTE em compras válidas (≥ R$ 5,00) | **CONFORME** | Usa estritamente `comprasValidasFidelidade` em `LoyaltyContext.tsx`. |
| **Lógica de Anti-Churn** | >5 compras no mês anterior + >15 dias sem comprar | **CONFORME (CÓDIGO)** | Lógica correta (`comprasMesAnterior >= 5 && diasSemComprar >= 15`). |
| **Urgências Anti-Churn (Amarelo/Vermelho)** | Amarelo (15 a 29 dias) vs Vermelho (≥ 30 dias) | **CONFORME (CÓDIGO)** | Cálculo e filtros de urgência funcionam no componente `AdminDashboard.tsx`. |
| **Persistência de Contato Realizado** | Persistência em localStorage/Supabase e reflexo imediato na UI | **CONFORME** | Atualiza `ultimo_contato_resgate` de forma reativa e persiste. |
| **Gatilho de Comemoração / Alerta** | Dispara APENAS e EXATAMENTE na compra que atinge a meta | **CONFORME** | Dispara na 10ª compra válida; NÃO dispara na 11ª, 12ª ou em compras inválidas. |
| **Massa de Dados (seedData)** | Mínimo: 1 com meta batida, 1 a 1 compra da meta, 2 churns (1 amarelo, 1 vermelho) | **NÃO CONFORME (DEFEITO)** | **Sr. Valdomiro Souza gera apenas 14 dias de ausência em 11/09/2026 (`statusChurn = false`). Falta cliente com urgência amarela!** |

---

## 2. Análise Detalhada por Tópico

### 2.1. Regra de Compra Mínima de R$ 5,00

#### O que foi observado:
1. **Definição de Configuração:**
   - Em `src/types/index.ts` (linha 22): `valor_minimo_pontuacao: number;`
   - Em `src/services/seedData.ts` (linha 6): `valor_minimo_pontuacao: 5.00,`
   - Em `src/context/LoyaltyContext.tsx` (linha 49): valor padrão de `5.00`.
2. **Interface do Caixa (`src/pages/CaixaPage.tsx`):**
   - Linhas 100-101:
     ```typescript
     const valorNumericoAtual = parseFloat(valorCompra.replace(',', '.')) || 0;
     const pontuaFidelidade = valorNumericoAtual >= (config.valor_minimo_pontuacao || 0);
     ```
   - Linhas 446-456: Feedback visual dinâmico antes de confirmar:
     - Se `pontuaFidelidade === true`: badge verde indicando que qualifica para a meta de fidelidade.
     - Se `pontuaFidelidade === false`: aviso âmbar explicativo: *"Abaixo de R$ 5,00: entra no histórico, mas não pontua no brinde."*
3. **Registro da Transação (`src/context/LoyaltyContext.tsx` e `src/services/db.ts`):**
   - Linhas 215-217 de `LoyaltyContext.tsx`:
     ```typescript
     const pontuou = valor >= (config.valor_minimo_pontuacao || 0);
     const novaCompra = await dbRegisterCompra(clienteId, valor, pontuou);
     ```
   - Em `db.ts` (linhas 175-182 e 205-216):
     - A compra é salva com `{ id, cliente_id, valor, data_compra, criado_em, pontuou_fidelidade: pontuou }`.
     - O totalizador histórico do cliente (`total_compras_historico`) é incrementado para qualquer compra.
4. **Cálculo dos Contadores Mensais (`LoyaltyContext.tsx`):**
   - Linhas 115-121:
     ```typescript
     if (compYear === currentYear && compMonth === currentMonth) {
       comprasMesAtual++;
       valorTotalMes += valorComp;
       if (comp.pontuou_fidelidade !== false && valorComp >= minValor) {
         comprasValidasFidelidade++;
       }
     }
     ```
   - A barra de progresso no caixa (`CaixaPage.tsx`, linhas 97-98 e 336-345) e o contador do cliente (linhas 310-319) usam `comprasValidasMes` (`compras_validas_fidelidade`), e **NÃO** `comprasMesAtual`.
   - O ranking mensal do Admin (`AdminDashboard.tsx`, linha 54 e 328) ordena e exibe `compras_validas_fidelidade`.
   - As compras abaixo de R$ 5,00 somam no faturamento (`valorTotalMes`) e no histórico de visitas (`comprasMesAtual` / `totalVisitasMes`), mas não alteram o progresso para o brinde.

---

### 2.2. Zeramento Automático no Dia 1º do Mês

#### O que foi observado:
1. **Arquitetura de Estado:**
   - Não existe coluna mutável de contador fixo (ex: `cliente.compras_mes`) salva no banco ou localStorage.
   - O resumo mensal (`ClienteResumoMensal`) é uma propriedade computada em tempo de execução via `useMemo` em `src/context/LoyaltyContext.tsx` (linhas 80-169):
     ```typescript
     const now = new Date();
     const currentYear = now.getFullYear();
     const currentMonth = now.getMonth(); // 0-11
     const prevDate = new Date(currentYear, currentMonth - 1, 1);
     const prevYear = prevDate.getFullYear();
     const prevMonth = prevDate.getMonth();
     ```
2. **Comportamento na Transição de Mês:**
   - No dia 1º de qualquer mês às 00:00:00 (ex: 1º de Outubro), `currentMonth` passa a ser 9 (outubro).
   - As compras registradas em setembro possuirão `compMonth === 8`.
   - Automaticamente:
     - `compMonth === currentMonth` torna-se `false` para as compras de setembro.
     - `comprasMesAtual` e `comprasValidasFidelidade` iniciam em 0 para todos os clientes em outubro.
     - As compras de setembro passam a satisfazer `compYear === prevYear && compMonth === prevMonth`, tornando-se instantaneamente a base de `comprasMesAnterior` para o anti-churn de outubro.
3. **Virada de Ano (Dezembro -> Janeiro):**
   - Em janeiro (`currentMonth === 0`), `new Date(currentYear, -1, 1)` no JavaScript ajusta automaticamente para o mês 11 (dezembro) do ano anterior (`currentYear - 1`). Testado e validado.
4. **Parsing de Data e Fuso Horário:**
   - Em `LoyaltyContext.tsx`, linha 104:
     `const compDate = new Date(comp.data_compra ? comp.data_compra + 'T00:00:00' : comp.criado_em);`
     O sufixo `T00:00:00` força o interpretador JS a interpretar a string no fuso horário local (evitando que "2026-09-01" seja interpretado como UTC e caia no dia 31 de agosto no Brasil GMT-3).

---

### 2.3. Cálculo dos Níveis (Bronze, Prata, Ouro)

#### O que foi observado:
1. **Regra de Negócio Implementada (`src/context/LoyaltyContext.tsx`, linhas 139-144):**
   ```typescript
   let nivel: NivelEngajamento = 'Bronze';
   if (comprasValidasFidelidade > 12) {
     nivel = 'Ouro';
   } else if (comprasValidasFidelidade >= 6) {
     nivel = 'Prata';
   }
   ```
2. **Faixas de Engajamento:**
   - **Bronze:** 0 a 5 compras válidas no mês corrente.
   - **Prata:** 6 a 12 compras válidas no mês corrente (a 10ª compra é onde se ganha o prêmio).
   - **Ouro:** Mais de 12 compras válidas no mês corrente (13 ou mais).
3. **Isolamento de Compras Inválidas:**
   - A condicional utiliza rigorosamente `comprasValidasFidelidade`. Se um cliente fizer 20 compras de R$ 2,00 no mês, `comprasValidasFidelidade` será 0 e seu nível permanecerá `Bronze`.
4. **Apresentação:**
   - No Caixa (`CaixaPage.tsx`, linha 291-300): Exibe badge visual com cores distintas (Ouro: âmbar com borda, Prata: stone, Bronze: laranja).
   - No Ranking do Admin (`AdminDashboard.tsx`, linha 369-377): Exibe badges com legenda explicativa no cabeçalho da tabela.
   - No Relatório CSV (`AdminDashboard.tsx`, linha 83): Exporta a coluna `Nível Fidelidade`.

---

### 2.4. Lógica de Anti-Churn e Níveis de Urgência

#### O que foi observado:
1. **Condição de Detecção (`src/context/LoyaltyContext.tsx`, linhas 148-153):**
   ```typescript
   // Regra de Anti-Churn: Cliente com mais de 5 compras no mês anterior que está há mais de 15 dias sem registros no mês atual
   const statusChurn = comprasMesAnterior >= 5 && diasSemComprar >= 15;
   const urgenciaChurn: UrgenciaChurn | undefined = statusChurn
     ? (diasSemComprar >= 30 ? 'vermelho' : 'amarelo')
     : undefined;
   ```
2. **Definição de Urgências:**
   - **Amarelo (Atenção):** `diasSemComprar >= 15 && diasSemComprar < 30`.
   - **Vermelho (Crítico):** `diasSemComprar >= 30`.
3. **Filtros na Interface (`src/pages/AdminDashboard.tsx`):**
   - Linhas 68-71:
     ```typescript
     const clientesSumidosFiltrados = useMemo(() => {
       if (filtroUrgencia === 'todos') return clientesSumidos;
       return clientesSumidos.filter((c) => c.urgencia_churn === filtroUrgencia);
     }, [clientesSumidos, filtroUrgencia]);
     ```
   - Botões de alternância: `Todos`, `🟡 Atenção (15 a 30 dias)` e `🔴 Crítico (+30 dias)`.

---

### 2.5. Persistência do Status de Contato ("Contato Realizado")

#### O que foi observado:
1. **Ação do Usuário no Dashboard:**
   - Em `AdminDashboard.tsx` (linhas 532-552), há dois pontos de acionamento:
     - Botão verde do WhatsApp: abre a URL wa.me e chama `marcarContatoRealizado(resumo.cliente.id)`.
     - Botão secundário: *"Marcar como contatado sem abrir WhatsApp"*.
2. **Fluxo de Persistência:**
   - `marcarContatoRealizado` em `LoyaltyContext.tsx` (linhas 264-270):
     - Obtém data atual em ISO `YYYY-MM-DD`.
     - Invoca `dbUpdateClienteContato(clienteId, hojeIso)` em `src/services/db.ts`.
     - Atualiza o array de `clientes` no estado React:
       `setClientes((prev) => prev.map((c) => c.id === clienteId ? { ...c, ultimo_contato_resgate: hojeIso } : c));`
   - Em `db.ts` (linhas 145-162):
     - Atualiza no Supabase caso configurado (`isSupabaseConfigured`).
     - Atualiza no `localStorage` sob a chave `panificadora_clientes`.
3. **Reatividade na UI:**
   - Como `resumosMensais` monitora `clientes`, o card no dashboard é re-renderizado imediatamente.
   - O indicador de status muda de *"Pendente"* para *"Feito em YYYY-MM-DD"* com ícone `CheckCircle2` verde.
   - O botão secundário *"Marcar como contatado sem abrir WhatsApp"* desaparece imediatamente (`{!resumo.ultimo_contato && ...}`).

---

### 2.6. Gatilho de Premiação e Modal Comemorativo

#### O que foi observado:
1. **Condição de Disparo (`src/context/LoyaltyContext.tsx`, linha 228):**
   ```typescript
   const totalValidasAtualizado = pontuou ? validasAntes + 1 : validasAntes;
   // Dispara alerta festivo exatamente quando bate a meta (ex: 10ª compra)
   const atingiuMetaAgora = pontuou && totalValidasAtualizado === config.meta_compras_mes;
   ```
2. **Execução no Caixa (`src/pages/CaixaPage.tsx`, linhas 135-141):**
   ```typescript
   if (resultado.atingiuMetaAgora) {
     setModalPremio({
       aberto: true,
       cliente: clienteEncontrado,
       comprasMes: resultado.totalMes
     });
   }
   ```
3. **Comportamento Validado:**
   - **Na 9ª compra:** `atingiuMetaAgora = false` -> Modal fechado.
   - **Na 10ª compra válida:** `atingiuMetaAgora = true` -> Modal abre imediatamente. Dispara `fireCelebrationConfetti()` e `playCelebrationChime()`.
   - **Na 11ª compra válida:** `totalValidasAtualizado = 11 !== 10` -> `atingiuMetaAgora = false` -> Modal **NÃO** abre.
   - **Na 12ª compra válida:** `totalValidasAtualizado = 12 !== 10` -> `atingiuMetaAgora = false` -> Modal **NÃO** abre.
   - **Em compra abaixo de R$ 5,00:** `pontuou = false` -> `atingiuMetaAgora = false` -> Modal **NÃO** abre.
4. **Fechamento do Modal:**
   - Ao clicar em *"Brinde Entregue! Próximo Atendimento"*, executa `resetarFormulario()`, limpando o caixa e refocando no campo de WhatsApp para o próximo cliente.

---

### 2.7. Auditoria dos Dados de Demonstração (`src/services/seedData.ts`)

Esta foi a área mais crítica da investigação. Comparamos os dados de `seedData.ts` diretamente com a suíte de Acceptance Criteria de `ORIGINAL_REQUEST.md`:

#### Critério 1: Pelo menos 1 cliente com meta já atingida
- **Dona Marlene Silva (`cli-01`):**
  - Possui 12 compras no mês atual (todas entre R$ 14,50 e R$ 22,50).
  - `comprasValidasFidelidade = 12` (Meta = 10).
  - `atingiuMeta = true`.
  - **Resultado:** **ATENDIDO**.

#### Critério 2: 1 cliente a 1 compra da meta
- **Seu Antônio Moreira (`cli-02`):**
  - Possui 9 compras no mês atual (todas entre R$ 9,00 e R$ 15,50).
  - `comprasValidasFidelidade = 9` (Meta = 10).
  - Falta exatamente 1 compra para o brinde.
  - **Resultado:** **ATENDIDO**.

#### Critério 3: 2 clientes sumidos (1 amarelo, 1 vermelho)
- **Dra. Beatriz Fontana (`cli-08`):**
  - Possui 8 compras no mês anterior (todas de R$ 25,00).
  - Datas geradas: 01 a 08 de agosto de 2026 (`getIsoDate(currentYear, currentMonth - 1, 1 + i * 1)`).
  - Última compra: 08/08/2026.
  - Dias sem comprar calculados em 11/09/2026: **34 dias**.
  - Como `34 >= 30`, `urgenciaChurn = 'vermelho'`.
  - **Resultado:** **ATENDIDO (Urgência Vermelha)**.
  - *Observação:* No seed, ela já vem com `ultimo_contato_resgate: '2026-09-08'`, ou seja, já aparece com status "Feito em 2026-09-08".
- **Sr. Valdomiro Souza (`cli-07`):**
  - Linhas 168-176 de `src/services/seedData.ts`:
    ```typescript
    // Sr. Valdomiro Souza: 14 compras no mês passado, NENHUMA compra neste mês (mais de 18 dias sumido!)
    ...Array.from({ length: 14 }, (_, i) => ({
      id: `comp-valdomiro-ant-${i + 1}`,
      cliente_id: 'cli-07',
      valor: 12.00,
      data_compra: getIsoDate(currentYear, currentMonth - 1, 2 + i * 2),
      criado_em: new Date(currentYear, currentMonth - 1, 2 + i * 2, 7, 0).toISOString(),
      pontuou_fidelidade: true
    })),
    ```
  - **Cálculo da Data da Última Compra:**
    Para `i = 13` (última das 14 compras), a expressão `2 + i * 2` resulta em `2 + 13 * 2 = 28`!
    Portanto, a última compra de Valdomiro foi gerada para **28 de agosto de 2026** (`2026-08-28`).
  - **Cálculo de Dias sem Comprar em 11/09/2026:**
    - Agosto tem 31 dias.
    - Dias restantes em agosto: 31 - 28 = 3 dias.
    - Dias decorridos em setembro: 11 dias.
    - Total de dias de ausência: **14 dias** (`diasSemComprar = 14`).
  - **Avaliação da Condição Anti-Churn (`LoyaltyContext.tsx`, linha 149):**
    `const statusChurn = comprasMesAnterior >= 5 && diasSemComprar >= 15;`
    Como 14 **não é maior ou igual a 15**, a expressão avalia para:
    `statusChurn = FALSE`!
    `urgenciaChurn = undefined`!
  - **Consequência Prática:**
    1. Sr. Valdomiro Souza é **completamente descartado** de `clientesSumidos`.
    2. O dashboard anti-churn exibe **apenas 1 cliente** (Dra. Beatriz), em vez de 2.
    3. Não existe **nenhum cliente com urgência amarela** (`urgencia_churn === 'amarelo'`) na base de dados de demonstração.
    4. Ao clicar no filtro *"🟡 Atenção (15 a 30 dias)"*, a interface exibe *"Nenhum cliente neste filtro!"*.
    5. Como Dra. Beatriz já possui `ultimo_contato_resgate` preenchido no seed e Valdomiro não aparece, **nenhum** cliente na aba Anti-Churn exibe status de contato *"Pendente"*.
  - **Resultado:** **FALHA NO CRITÉRIO DE ACEITE**.

---

## 3. Matriz de Conformidade com o Acceptance Criteria

| Critério de Aceite (`ORIGINAL_REQUEST.md`) | Status Atual | Detalhes Técnicos |
|---|:---:|---|
| Cada um dos 6 botões de valor rápido atualiza visualmente o campo | PASS | `VALORES_RAPIDOS` em `CaixaPage.tsx` atualiza `valorCompra`. |
| Botão "Confirmar Compra" registra compra e incrementa contador | PASS | Invoca `registrarNovaCompra`, incrementa e persiste. |
| Botão "Limpar (ESC)" e tecla ESC limpam o formulário e refocam Whats | PASS | `resetarFormulario()` limpa campos e foca `phoneInputRef`. |
| Botão "Exportar Excel / CSV" gera e baixa arquivo .csv válido | PASS | Gera CSV com separador `;`, BOM `\uFEFF` e colunas completas. |
| Cada botão de WhatsApp gera URL wa.me válida e abre em nova aba | PASS | Utilitário `getWhatsAppUrl` inclui DDI 55 e encode de mensagem. |
| Botão "Restaurar dados de demonstração" recarrega seedData | PASS | `reiniciarDadosDemo()` chama `dbResetToDemoData` e `carregarTudo`. |
| Botão "Salvar Alterações" persiste configurações | PASS | Persiste em `localStorage` e atualiza reativamente o contexto. |
| Botão "Marcar como contatado" atualiza data e reflete imediatamente | PASS | Atualiza `ultimo_contato_resgate` em tempo real na UI e no storage. |
| Digitar WhatsApp existente identifica cliente em < 3s | PASS | `useEffect` com `cleanPhone` identifica a partir de 8 dígitos. |
| Digitar WhatsApp novo (≥10 dígitos) abre cadastro relâmpago | PASS | Ativa `isNovoCliente = true` e move foco para nome. |
| Compra no Caixa reflete no Admin sem reload | PASS | Compartilhado via React Context `LoyaltyContext`. |
| Barra de progresso reflete compras VÁLIDAS (≥ R$ 5) vs meta | PASS | Usa `comprasValidasMes`, ignorando compras < R$ 5,00. |
| Compra de R$ 3 entra no histórico mas NÃO incrementa meta | PASS | `total_compras_historico` sobe, `comprasValidasFidelidade` não. |
| Modal de premiação com confetti dispara exatamente na 10ª compra válida | PASS | Verificado em `LoyaltyContext.tsx`: `totalValidasAtualizado === config.meta_compras_mes`. |
| Modal NÃO dispara na 11ª, 12ª ou subsequentes | PASS | `11 === 10` é falso, `atingiuMetaAgora` retorna falso. |
| **seedData gera pelo menos: 1 meta batida, 1 a 1 da meta, 2 sumidos (1 amarelo, 1 vermelho)** | **FALHA** | **Apenas 1 sumido (vermelho). Valdomiro tem 14 dias em 11/09/2026, ficando fora do churn amarelo.** |
| Filtro de urgência anti-churn filtra corretamente | PASS | Lógica de filtro correta, porém não há cards amarelos para exibir devido ao seed. |
| `npm run build` completa com exit code 0 | PASS | Build executado com sucesso (zero erros TypeScript). |

---

## 4. Recomendações e Proposta de Correção para o SeedData

Para que o seedData cumpra o critério de aceite em qualquer data do mês civil, a geração de compras do **Sr. Valdomiro Souza** (`cli-07`) em `src/services/seedData.ts` deve ser ajustada para garantir que sua última compra tenha ocorrido entre 15 e 29 dias atrás.

### Snippet da Proposta de Correção em `src/services/seedData.ts`:

```typescript
// ANTES (gera última compra no dia 28 do mês anterior -> apenas 14 dias atrás em 11/09):
data_compra: getIsoDate(currentYear, currentMonth - 1, 2 + i * 2),

// DEPOIS (gera compras nos primeiros dias do mês passado, com última compra no dia 16 -> ~26 dias atrás em 11/09):
data_compra: getIsoDate(currentYear, currentMonth - 1, 1 + i * 1.1),
// Ou alternativamente, garantir explicitamente uma data entre 18 e 24 dias atrás:
data_compra: getIsoDate(currentYear, currentMonth - 1, Math.min(20, 1 + i * 1)),
```

Adicionalmente, recomenda-se que no `INITIAL_CLIENTES` de `cli-07` o campo `ultimo_contato_resgate` permaneça `null`, permitindo ao usuário testar o botão *"Marcar como contatado sem abrir WhatsApp"* imediatamente ao carregar os dados de demonstração.
