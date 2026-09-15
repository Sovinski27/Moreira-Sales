# Relatório Técnico de Auditoria (Survey 3)

**Data da Auditoria**: 2026-09-11  
**Auditor**: Teamwork Explorer (Survey 3)  
**Escopo**: AdminDashboard, Configurações, Interface Anti-Churn, Exportação CSV, Gerador de URLs do WhatsApp e Saúde do Build TypeScript (Requisitos R1, R3, R4 do dossiê da Panificadora Pão Dourado em Umuarama-PR).

---

## 1. Sumário Executivo

A auditoria técnica aprofundada verificou a implementação do painel administrativo (`AdminDashboard.tsx`), módulo anti-churn, gerador de WhatsApp (`whatsapp.ts`), persistência de configurações (`LoyaltyContext.tsx`, `db.ts`), restauração de demonstração (`seedData.ts`, `Layout.tsx`), exportação de CSV e integridade de compilação TypeScript.

**Principais Conclusões**:
1. **Saúde de Build Impecável**: O comando `npm run build` (`tsc && vite build`) roda com código de saída 0. Uma verificação estrita adicional com `tsc --noEmit --noUnusedLocals --noUnusedParameters` confirmou **zero erros** e **zero variáveis ou imports não utilizados**.
2. **Localização 100% pt-BR**: Toda a interface de usuário, cabeçalhos, diálogos de alerta, modais e textos de botões estão em português brasileiro natural, sem resquícios de inglês.
3. **Sincronização em Tempo Real SPA**: O fluxo de dados entre `CaixaPage` e `AdminDashboard` compartilha o mesmo estado no `LoyaltyProvider`. Qualquer registro de compra reflete instantaneamente nos KPIs, ranking mensal e histórico sem necessidade de recarregar a página.
4. **Gerador de WhatsApp e Codificação wa.me**: As URLs geradas para comemoração, resgate de clientes sumidos e mensagens gerais utilizam `encodeURIComponent` e estão completamente funcionais.
5. **Achado Crítico no SeedData (Anti-Churn)**: O `seedData.ts` define as compras do Sr. Valdomiro Souza no mês anterior terminando no dia 28. No dia 11 do mês corrente (data atual), o cálculo de dias sem comprar resulta em **14 dias**, o que é estritamente menor que o limiar de 15 dias (`diasSemComprar >= 15`). Portanto, o Sr. Valdomiro **não é incluído em clientes sumidos**, deixando a lista com apenas 1 cliente (Dra. Beatriz - vermelho) e **0 clientes no filtro amarelo**, violando o critério de aceitação de gerar "2 clientes sumidos (1 amarelo, 1 vermelho)".
6. **Sincronização de Estado nas Configurações**: O `AdminDashboard.tsx` inicializa o formulário de configurações com `useState(config...)` sem `useEffect` de sincronização. Se os dados forem restaurados via demonstração sem desmontar o painel, os inputs não acompanham as novas configurações até o componente ser remontado.
7. **Botão de Restauração Oculto no Mobile**: O botão de restauração de demonstração (`RotateCcw`) está no cabeçalho do `Layout.tsx` dentro de uma classe `hidden md:flex`, tornando-se inacessível em telas móveis e tablets.

---

## 2. Auditoria Detalhada por Módulo

### 2.1. AdminDashboard & Totalizadores (KPIs)

#### 2.1.1. Cálculo e Renderização dos KPIs
Localização: `src/context/LoyaltyContext.tsx` (linhas 179-206) e `src/pages/AdminDashboard.tsx` (linhas 153-224).

- **Visitas no Mês (`metricas.totalVisitasMes`)**:
  - Implementação: Soma de `comprasMesAtual` para todos os clientes no mês corrente.
  - Regra de Negócio: Inclui todas as visitas registradas no mês (mesmo as de valor inferior a R$ 5,00), representando com precisão o fluxo de balcão.
  - Média de visitas/cliente: `(metricas.totalVisitasMes / (metricas.clientesAtivosMes || 1)).toFixed(1)` calculada e exibida no subtítulo do card.
- **Faturamento Balcão (`metricas.faturamentoMes`)**:
  - Implementação: Soma de `valorTotalMes` de todas as compras do mês corrente.
  - Exibição: Formatado em moeda `R$ {metricas.faturamentoMes.toFixed(2)}`.
  - Ticket Médio: `metricas.ticketMedioMes` (`faturamentoMes / totalVisitasMes`), exibido em destaque.
- **Clientes Ativos no Mês (`metricas.clientesAtivosMes`)**:
  - Implementação: Contagem de clientes com `compras_mes_atual > 0`.
- **Clientes Sumidos (`metricas.clientesEmRisco`)**:
  - Implementação: Contagem de clientes que atendem à regra de churn (`status_churn === true`).
  - Interatividade: O card possui `onClick={() => setActiveSubTab('churn')}`, permitindo que o gestor clique no indicador de risco e navegue diretamente para a aba anti-churn.

#### 2.1.2. Ranking Mensal de Clientes (VIPs)
Localização: `src/pages/AdminDashboard.tsx` (linhas 51-55, 290-413).

- **Critério de Ordenação**:
  ```typescript
  const rankingClientes = useMemo(() => {
    return [...resumosMensais]
      .sort((a, b) => b.compras_validas_fidelidade - a.compras_validas_fidelidade || b.valor_total_mes - a.valor_total_mes);
  }, [resumosMensais]);
  ```
  Ordena prioritariamente por `compras_validas_fidelidade` (compras que atingiram o valor mínimo configurado) decrescente e desempata por `valor_total_mes` decrescente.
- **Renderização Visual**:
  - Destaque nos 3 primeiros colocados com medalhas estilizadas (1º dourado, 2º prateado, 3º bronze).
  - Colunas: Posição, Nome do Cliente (com histórico geral), WhatsApp formatado `(XX) XXXXX-XXXX`, Selo de Nível (Ouro/Prata/Bronze), Compras Válidas, Gasto no Mês e Status do Brinde (`Brinde Liberado!` ou `Faltam X`).
- **Observação**: Clientes com 0 compras no mês atual também aparecem no final da tabela. Isto mantém visibilidade completa, mas pode ser filtrado se desejado ranking estrito apenas de clientes ativos.

#### 2.1.3. Sincronização em Tempo Real com o Caixa
Localização: `src/App.tsx`, `src/context/LoyaltyContext.tsx`, `src/pages/CaixaPage.tsx`.

- **Mecanismo de Estado**: A aplicação é uma Single Page Application (SPA) onde `LoyaltyProvider` envolve tanto a `CaixaPage` quanto o `AdminDashboard`.
- **Fluxo de Atualização**:
  1. A atendente registra uma nova compra na `CaixaPage` através de `registrarNovaCompra(clienteId, valor)`.
  2. A função executa `dbRegisterCompra`, adiciona a nova compra ao estado React `compras` (`setCompras(prev => [novaCompra, ...prev])`) e atualiza o histórico do cliente em `clientes`.
  3. Como `resumosMensais`, `metricas` e `clientesSumidos` são valores memoizados (`useMemo`) derivados de `[clientes, compras, config.meta_compras_mes, config.valor_minimo_pontuacao]`, eles recalculam imediatamente.
  4. Ao alternar para o `AdminDashboard` (via clique ou atalho F2), os dados mais recentes já estão disponíveis na tela instantaneamente, sem qualquer recarregamento da página (`no full page reload`).

---

### 2.2. Módulo Anti-Churn & Interface de Retenção

Localização: `src/pages/AdminDashboard.tsx` (linhas 415-559).

#### 2.2.1. Filtros de Urgência
- **Estado**: `filtroUrgencia` com opções `'todos' | 'amarelo' | 'vermelho'`.
- **Lógica de Filtragem**:
  ```typescript
  const clientesSumidosFiltrados = useMemo(() => {
    if (filtroUrgencia === 'todos') return clientesSumidos;
    return clientesSumidos.filter((c) => c.urgencia_churn === filtroUrgencia);
  }, [clientesSumidos, filtroUrgencia]);
  ```
- **Botões do Filtro**:
  - `Todos ({clientesSumidos.length})`
  - `🟡 Atenção (15 a 30 dias)`
  - `🔴 Crítico (+30 dias)`
  O clique em cada botão altera visualmente o estado e filtra a lista reativamente.

#### 2.2.2. Renderização dos Cards de Clientes Sumidos
- **Diferenciação Visual**: Borda rosa (`border-rose-300`) e badge vermelho (`bg-rose-100 text-rose-800`) para clientes críticos (+30 dias); borda âmbar (`border-amber-200`) e badge amarelo (`bg-amber-100 text-amber-800`) para clientes em atenção (15-30 dias).
- **Informações Apresentadas**:
  - Nome do cliente e telefone formatado.
  - Contagem de compras no mês anterior (mostrando que era um cliente fiel).
  - Número exato de dias sem visitar a panificadora.
  - Data da última compra registrada.
  - Indicador de status de contato: `Pendente` (cinza) ou `Feito em YYYY-MM-DD` com ícone verde `CheckCircle2`.

#### 2.2.3. Ações e Botões de Resgate
- **Botão Principal: "Chamar no WhatsApp & Registrar Contato"**:
  - Link `<a>` estilizado em verde WhatsApp (`#25D366`), com `target="_blank"` e `rel="noopener noreferrer"`.
  - Gera URL com o template de resgate:
    ```typescript
    const whatsMsg = buildWhatsAppMessage(config.mensagem_resgate, {
      nome: resumo.cliente.nome,
    });
    const whatsUrl = getWhatsAppUrl(resumo.cliente.whatsapp, whatsMsg);
    ```
  - Possui `onClick={() => marcarContatoRealizado(resumo.cliente.id)}`, de modo que ao abrir o WhatsApp a data de contato é automaticamente gravada no cliente.
- **Botão Secundário: "Marcar como contatado sem abrir WhatsApp"**:
  - Exibido condicionalmente quando `!resumo.ultimo_contato`.
  - Executa `marcarContatoRealizado(resumo.cliente.id)`.
  - Atualiza imediatamente o estado React: o card passa a exibir `Feito em [data de hoje]` e o botão secundário desaparece instantaneamente.
  - Persiste a data no LocalStorage e no Supabase (se online) através de `dbUpdateClienteContato`.

---

### 2.3. Gerador de Mensagens e URLs do WhatsApp

Localização: `src/services/whatsapp.ts`.

#### 2.3.1. Análise de Codificação e Conformidade
```typescript
export function getWhatsAppUrl(phone: string, text: string): string {
  const digits = cleanPhone(phone);
  const fullPhone = digits.startsWith('55') ? digits : `55${digits}`;
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${fullPhone}?text=${encodedText}`;
}
```

- **Uso de `encodeURIComponent(text)`**: Garante que acentos (`ç`, `ã`, `é`), quebras de linha (`\n`) e emojis (`🥖`, `🎉`, `☕`, `❤️`) sejam percent-encoded de acordo com o padrão RFC 3986, abrindo corretamente na web e aplicativo WhatsApp.
- **Formatação de Número**:
  - `cleanPhone`: Remove todos os caracteres não numéricos `/\D/g`.
  - `digits.startsWith('55') ? digits : '55' + digits`: Assegura o código DDI do Brasil (55).
  - *Ponto de Atenção Técnico*: Se um cliente for cadastrado com DDD 55 (ex: Santa Maria/RS) com 11 dígitos (`55999887766`), a verificação `startsWith('55')` detecta o DDD como se fosse o DDI, não adicionando o código do país. Como a panificadora é de Umuarama-PR (DDD 44), todos os números começam com 44 e recebem o prefixo 55 corretamente (`55449...`). Para maior robustez geral, a verificação deveria ser `digits.length <= 11 ? '55' + digits : ...`.

#### 2.3.2. Casos de Uso no Sistema
1. **Comemoração de Meta Atingida (`AwardModal.tsx`)**:
   - Template: `config.mensagem_whatsapp`.
   - Variáveis substituídas: `{NOME}`, `{COMPRAS}`, `{PREMIO}`.
   - Mensagem padrão: *"Olá, Dona Marlene Silva! 🥖🎉 Que alegria! Você acabou de atingir a meta de 10 compras este mês na Panificadora! Seu brinde especial (1 Café Especial com Pão na Chapa Crocante) já está liberado no balcão. Muito obrigado pela sua preferência diária!"*
   - URL gerada: Válida, codificada e abre em nova aba.
2. **Resgate Anti-Churn (`AdminDashboard.tsx`)**:
   - Template: `config.mensagem_resgate`.
   - Variáveis substituídas: `{NOME}`.
   - Mensagem padrão: *"Olá Dra. Beatriz Fontana! 🥖 Sentimos muito a sua falta aqui no café fresquinho da panificadora. Notamos que faz alguns dias que você não passa por aqui. Preparamos um delicioso pão na chapa quentinho como cortesia na sua próxima visita! Te esperamos hoje mesmo! ☕❤️"*
   - URL gerada: Válida, codificada e abre em nova aba.
3. **Mensagem Genérica na Lista Geral de Clientes (`AdminDashboard.tsx`)**:
   - Mensagem: *"Olá [Nome]! Passando para desejar um ótimo dia aqui da Panificadora Pão Dourado! 🥖☕"*
   - URL gerada: Válida, codificada e abre em nova aba.

---

### 2.4. Painel de Configurações & Persistência

Localização: `src/pages/AdminDashboard.tsx` (linhas 41-50, 99-120, 642-781) e `src/context/LoyaltyContext.tsx` (linhas 272-275).

#### 2.4.1. Campos Editáveis
1. **Meta de Compras no Mês**: Input numérico (`min="1" max="60"`). Padrão: 10 compras.
2. **Valor Mínimo da Compra para Pontuar (R$)**: Input numérico (`step="0.50" min="0"`). Padrão: R$ 5,00.
3. **Descrição do Prêmio**: Input de texto. Padrão: "1 Café Especial com Pão na Chapa Crocante".
4. **Template de Mensagem Parabéns**: Textarea com tags `{NOME}`, `{COMPRAS}`, `{PREMIO}`.
5. **Template de Mensagem Resgate**: Textarea com tag `{NOME}`.
6. **URL de Webhook WhatsApp**: Input de URL para integrações opcionais (Evolution API / Z-API / Zapier).

#### 2.4.2. Fluxo do Botão "Salvar Alterações"
1. Ao submeter o formulário, `handleSalvarConfig` invoca `salvarConfiguracoes(...)`.
2. `salvarConfiguracoes` chama `dbSaveConfiguracao(...)` que:
   - Grava as novas configurações no `localStorage` sob a chave `'panificadora_config'`.
   - Executa upsert na tabela `configuracoes_fidelidade` caso o Supabase esteja conectado.
   - Retorna o objeto atualizado e executa `setConfig(updated)` no React Context.
3. A alteração de `config` propaga reativamente para toda a aplicação:
   - Recalcula `resumosMensais` (a barra de progresso no caixa e no admin se ajusta à nova meta e novo valor mínimo).
   - Recalcula `metricas` (premios entregues e metas).
   - Exibe o banner verde de sucesso: *"Configurações salvas com sucesso no sistema!"* por 3 segundos.
4. **Ressalva Identificada**: Os estados locais de input do formulário (`metaCompras`, `valorMinimo`, etc.) são mantidos em `useState` local no `AdminDashboard`. Não há um `useEffect` escutando alterações externas em `config`. Se as configurações forem redefinidas por outro meio (como restaurar dados de demonstração) enquanto o painel está aberto, os inputs só se sincronizam se o usuário navegar para o Caixa e voltar.

---

### 2.5. Função "Restaurar Dados de Demonstração"

Localização: `src/services/db.ts` (linhas 35-39), `src/context/LoyaltyContext.tsx` (linhas 277-280) e `src/components/Layout.tsx` (linhas 93-101).

#### 2.5.1. Mecanismo de Execução
```typescript
export function resetToDemoData(): void {
  localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(INITIAL_CLIENTES));
  localStorage.setItem(STORAGE_KEYS.COMPRAS, JSON.stringify(INITIAL_COMPRAS));
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(INITIAL_CONFIG));
}
```
No contexto:
```typescript
const reiniciarDadosDemo = useCallback(async () => {
  dbResetToDemoData();
  await carregarTudo();
}, [carregarTudo]);
```

- Limpa e sobrescreve as chaves do `localStorage` com `INITIAL_CLIENTES`, `INITIAL_COMPRAS` e `INITIAL_CONFIG`.
- Dispara `carregarTudo()`, que recarrega `clientes`, `compras` e `config` no estado da aplicação.
- A árvore de componentes inteira atualiza com os dados iniciais sem erro.

#### 2.5.2. Ocorrências e Limitações Observadas
1. **Ocultação em Dispositivos Móveis**: No `Layout.tsx`, o botão está estilizado com `<RotateCcw />` dentro de uma div com classe `hidden md:flex`. Em telas de celular ou tablets estreitos, o botão não é visível nem clicável.
2. **Ausência de Feedback Visual / Diálogo de Confirmação**: O clique no botão redefiniu os dados imediatamente sem pedir confirmação do usuário (`window.confirm`) e sem exibir toast/alerta de que os dados foram restaurados.
3. **Ausência no Painel de Configurações**: O botão existe apenas no cabeçalho superior direito da aplicação. Não há uma opção explícita de "Restaurar Demonstração" dentro da aba de Configurações do `AdminDashboard`.

---

### 2.6. Exportação para Excel / CSV

Localização: `src/pages/AdminDashboard.tsx` (linhas 74-97, 142-150).

#### 2.6.1. Validação Técnica do Arquivo Gerado
- **Cabeçalho**: `Nome;WhatsApp;Compras Válidas Mês;Valor Total Mês (R$);Total Histórico;Nível Fidelidade;Última Visita`
- **Separador**: `;` (ponto e vírgula), perfeitamente adequado para o padrão de Excel em português brasileiro (onde a vírgula é o separador decimal).
- **BOM UTF-8**: Inclui `\uFEFF` no início da string, garantindo que o Microsoft Excel abra o arquivo diretamente com acentuação correta (`ç`, `ã`, `é`, `í`, `ó`).
- **Escapamento de Caracteres**:
  - `"${r.cliente.nome.replace(/"/g, '""')}"`: Trata aspas duplas no nome conforme especificação RFC 4180.
  - Telefone formatado entre aspas `"${formatPhoneDisplay(r.cliente.whatsapp)}"`, prevenindo que o Excel interprete o telefone como número exponencial ou corte zeros à esquerda.
- **Download**: Cria um `Blob`, instancia um elemento `<a>` temporário, dispara o clique e remove o elemento do DOM. O nome do arquivo segue o padrão `panificadora-relatorio-clientes-YYYY-MM-DD.csv`.
- **Botão na UI**: Botão visível, com ícone de download e rótulo claro "Exportar Excel / CSV".

---

### 2.7. Auditoria do SeedData & Regras de Churn (Achado Crítico)

Localização: `src/services/seedData.ts` e `src/context/LoyaltyContext.tsx`.

#### 2.7.1. Critério de Aceitação R2/SeedData
> *"Os dados de demonstração do seedData geram pelo menos: 1 cliente com meta já atingida, 1 cliente a 1 compra da meta, e 2 clientes sumidos (1 amarelo, 1 vermelho)"*

#### 2.7.2. Verificação dos 4 Casos do SeedData:
1. **1 cliente com meta já atingida**:
   - Dona Marlene Silva (`cli-01`): Possui 12 compras no mês atual (`INITIAL_COMPRAS`). A meta é 10. `atingiu_meta = true`. ✅ **Atingido**.
2. **1 cliente a 1 compra da meta**:
   - Seu Antônio Moreira (`cli-02`): Possui 9 compras no mês atual (`INITIAL_COMPRAS`). Falta exatamente 1 compra para atingir a meta de 10. ✅ **Atingido**.
3. **1 cliente sumido vermelho (+30 dias sem compras)**:
   - Dra. Beatriz Fontana (`cli-08`): Possui 8 compras no mês anterior, sendo a última no dia 8 do mês passado. Em 11/09/2026, isso corresponde a 34 dias sem comprar. Como `34 >= 30`, sua urgência é `'vermelho'`. ✅ **Atingido**.
4. **1 cliente sumido amarelo (15 a 30 dias sem compras)**:
   - Sr. Valdomiro Souza (`cli-07`): Possui 14 compras no mês anterior geradas por:
     ```typescript
     data_compra: getIsoDate(currentYear, currentMonth - 1, 2 + i * 2)
     ```
     Para `i = 13` (última compra), a data gerada foi `2 + 13 * 2 = 28` do mês anterior (28 de agosto).
   - Em 11/09/2026:
     - Dias de 28/08 a 31/08: 3 dias.
     - Dias de setembro decorridos até hoje: 11 dias.
     - Total de dias sem comprar: `14 dias`.
   - Avaliação da condição em `LoyaltyContext.tsx`:
     ```typescript
     const statusChurn = comprasMesAnterior >= 5 && diasSemComprar >= 15;
     ```
     Como `14 >= 15` é **FALSO**, `statusChurn` é `false`!
   - **Impacto**: O Sr. Valdomiro **não entra na lista de clientes sumidos** no dia 11 do mês. O filtro de urgência amarela fica com **0 clientes**. ❌ **Falha no Critério de Aceitação**.

---

### 2.8. Saúde do Build e TypeScript

- **Comando de Compilação**: `npm run build` (`tsc && vite build`).
- **Resultado do Teste**: Executado com sucesso, código de saída 0.
- **Saída de Chunks**:
  - `dist/index.html`: 1.08 kB
  - `dist/assets/index-DIAz23um.css`: 31.75 kB (Tailwind gerado e minificado)
  - `dist/assets/index-CGmWucr7.js`: 461.47 kB (Vite bundle)
- **Verificação Estrita de Tipos e Imports Não Utilizados**:
  Executado `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`:
  - Erros: **0**
  - Avisos: **0**
  - Imports mortos ou não utilizados: **0**

---

## 3. Tabela Sintética de Conformidade

| Item Auditado | Status | Evidência / Observação |
|---|---|---|
| **KPI: Total de Visitas** | Conforme | Soma reativa de compras do mês corrente em `LoyaltyContext` |
| **KPI: Faturamento Estimado** | Conforme | Soma monetária das compras do mês corrente (`R$ metricas.faturamentoMes`) |
| **KPI: Clientes Ativos** | Conforme | Contagem de clientes distintos com compra no mês atual |
| **KPI: Clientes Sumidos** | Conforme | Contagem de clientes com `status_churn === true` |
| **Ranking Mensal VIP** | Conforme | Ordenado por compras válidas (>= R$ 5) decrescente e valor total |
| **Sincronização Caixa ⇄ Admin** | Conforme | Estado centralizado no `LoyaltyProvider`, reflete em tempo real sem reload |
| **Filtro Anti-Churn (Todos/Amarelo/Vermelho)** | Conforme na UI | Botões e filtragem reativa funcionam; porém o filtro amarelo está vazio no seedData atual |
| **Cards de Anti-Churn** | Conforme | Indicadores de urgência, última visita e status de contato |
| **Botão WhatsApp de Resgate** | Conforme | Abre `wa.me` com mensagem personalizada e marca contato |
| **Botão "Marcar como contatado"** | Conforme | Grava data do contato e atualiza a interface imediatamente |
| **URLs wa.me Codificadas** | Conforme | `encodeURIComponent` aplicado em todos os 3 fluxos (comemoração, resgate, geral) |
| **Edição e Salvar Configurações** | Conforme | Persiste no `localStorage`/Supabase e atualiza regras do app |
| **Restaurar Dados Demo** | Parcial | Funciona via `RotateCcw` no header, mas fica oculto em telas `< md` e não tem diálogo de confirmação |
| **Exportação CSV / Excel** | Conforme | UTF-8 com BOM, delimitador `;`, escape de aspas e formatação de telefone |
| **Meta no SeedData (Atingida)** | Conforme | Dona Marlene: 12 compras (meta 10) |
| **Meta no SeedData (Falta 1)** | Conforme | Seu Antônio: 9 compras (falta 1) |
| **Churn no SeedData (Vermelho)** | Conforme | Dra. Beatriz: 34 dias sem compras (+30 dias) |
| **Churn no SeedData (Amarelo)** | **Não Conforme** | Sr. Valdomiro: 14 dias sem compras no dia 11/09, abaixo do limiar de 15 dias |
| **Build TypeScript** | Conforme | Compilação 100% limpa, zero erros de tipo, zero imports não utilizados |
| **Idioma pt-BR** | Conforme | 100% da interface, alertas e placeholders em português brasileiro |

---

## 4. Recomendações e Propostas de Correção

### Proposta 1: Ajuste no SeedData para Garantir 1 Cliente Amarelo e 1 Vermelho
No arquivo `src/services/seedData.ts`, ajustar as datas das compras do Sr. Valdomiro Souza (`cli-07`) para que a última compra ocorra com folga dentro da faixa de 15 a 30 dias (por exemplo, 20 dias atrás ou dias 1 a 20 do mês anterior).
```typescript
// Exemplo de ajuste seguro em seedData.ts:
// Sr. Valdomiro Souza: 14 compras no mês passado, última compra há 20 dias (alerta amarelo garantido!)
...Array.from({ length: 14 }, (_, i) => ({
  id: `comp-valdomiro-ant-${i + 1}`,
  cliente_id: 'cli-07',
  valor: 12.00,
  data_compra: getIsoDate(currentYear, currentMonth - 1, 1 + i), // dias 1 a 14 do mês passado
  criado_em: new Date(currentYear, currentMonth - 1, 1 + i, 7, 0).toISOString(),
  pontuou_fidelidade: true
}))
```
Com isso, mesmo no dia 11 do mês corrente, a última compra (dia 14 do mês anterior) terá ~28 dias de intervalo, caindo perfeitamente no alerta amarelo (`diasSemComprar >= 15 && diasSemComprar < 30`).

### Proposta 2: Sincronização de Formulário de Configurações
No arquivo `src/pages/AdminDashboard.tsx`, adicionar `useEffect` para sincronizar os estados locais do formulário sempre que `config` for atualizado externamente:
```typescript
useEffect(() => {
  setMetaCompras(config.meta_compras_mes);
  setValorMinimo(config.valor_minimo_pontuacao || 5);
  setPremioDesc(config.premio_descricao);
  setMsgWhats(config.mensagem_whatsapp);
  setMsgResgate(config.mensagem_resgate);
  setWebhookUrl(config.webhook_whatsapp_url || '');
}, [config]);
```

### Proposta 3: Visibilidade e Confirmação na Restauração de Demonstração
1. No `Layout.tsx`, remover a restrição `hidden md:flex` ou adicionar o botão de restauração também no menu acessível para mobile.
2. Adicionar uma confirmação simples (`window.confirm('Deseja restaurar os dados de demonstração da panificadora?')`) e toast/feedback visual ao concluir a restauração.
3. Disponibilizar um botão secundário de "Restaurar Dados Padrão" dentro da aba de Configurações do `AdminDashboard`.

### Proposta 4: Formatação de Data Amigável para o Brasil
Nas datas de última compra e contato exibidas nos cards (`resumo.ultima_compra_data` e `resumo.ultimo_contato`), formatar de `YYYY-MM-DD` para `DD/MM/YYYY` (ex: `11/09/2026`) para maior polidez no padrão brasileiro.
