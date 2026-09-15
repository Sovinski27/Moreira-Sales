# Remediation Strategy Analysis: Driver & Tiers 3–4 Test Architecture

**Agent**: `teamwork_preview_explorer_remediation_2`  
**Date**: 2026-09-11  
**Target Files**: `e2e/driver.ts`, `e2e/tier3-combinations.ts`, `e2e/tier4-scenarios.ts`, and supporting modules in `src/`  
**Reference Documents**: `ORIGINAL_REQUEST.md`, `PROJECT.md`, `teamwork_preview_auditor_gate_1/handoff.md`

---

## 1. Executive Summary & Root Cause Forensic Audit

The Forensic Auditor (`teamwork_preview_auditor_gate_1`) issued a verdict of **INTEGRITY VIOLATION** against the test suite in `e2e/`. Specifically:
1. **Parallel Shadow Universe in `e2e/driver.ts`**:
   - Lines 44–129 of `e2e/driver.ts` re-implement `resumosMensais` (monthly counters, engagement tier calculation, churn identification, urgency classification) as a standalone loop.
   - Lines 131–135 re-implement `clientesSumidos`.
   - Lines 137–164 re-implement `metricas` (KPI aggregations).
   - Lines 170–192 re-implement goal achievement calculation (`atingiuMetaAgora`) in `registrarCompra`.
   - Lines 228–247 re-implement phone matching (`buscarClientePorTelefone`) from `CaixaPage.tsx`.
   - Lines 252–266 re-implement CSV assembly (`exportarCSV`) from `AdminDashboard.tsx`.
   - **Consequence**: `src/context/LoyaltyContext.tsx`, `src/pages/CaixaPage.tsx`, and `src/pages/AdminDashboard.tsx` are NEVER executed. If business logic, churn thresholds, engagement tiers, or CSV headers were corrupted in `src/`, all tests in Tiers 3 & 4 would still pass 100%.

2. **Verbatim Tautologies and Mock Assertions in Tiers 3 & 4**:
   - `e2e/tier3-combinations.ts`:
     - **T3.01** (lines 24–25): Inline boolean check `const pontua = valor >= driver.config.valor_minimo_pontuacao; expect(pontua).toBe(true);`.
     - **T3.02** (lines 33–39): Assigns `let valor = '50'; expect(valor).toBe('50'); valor = '15'; expect(valor).toBe('15');` (verbatim self-assignment).
     - **T3.14** (lines 175–188): Mock closure `const handleEscape = () => { modalAberto = false; telefone = ''; }; handleEscape();` (tests a local mock function).
     - **T3.15** (lines 191–208): Assigns `currentTab = 'admin'; expect(currentTab).toBe('admin'); currentTab = 'caixa'; tel = '';` (tautological string mutations).
   - `e2e/tier4-scenarios.ts`:
     - **T4.10** (lines 242–264): Simulates cashier keyboard operation using local dummy closures `const handleF1 = (e) => { currentTab = 'caixa'; }; const handleEsc = (e) => { telAtual = ''; };` (bypasses window keyboard listeners).
   - **Consequence**: The test suite tests its own local variables instead of the application's actual state transitions and event handlers.

---

## 2. Target Architecture: Single Source of Truth Domain Engine

To eliminate duplicate logic permanently without circumventing the audit or introducing synthetic facades, the application must adhere to a **Single Source of Truth** architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        REAL APPLICATION MODULES                        │
├──────────────────────────┬─────────────────────────┬───────────────────┤
│ src/services/db.ts       │ src/services/           │ src/services/     │
│ - fetchClientes()        │   loyaltyEngine.ts      │   whatsapp.ts     │
│ - fetchCompras()         │ - calcularResumos()     │ - formatPhone()   │
│ - fetchConfiguracao()    │ - calcularMetricas()    │ - cleanPhone()    │
│ - registerCompra()       │ - calcularChurn()       │ - getWhatsAppUrl()│
│ - saveConfiguracao()     │ - avaliarCompra()       ├───────────────────┤
│ - resetToDemoData()      │ - nivelEngajamento()    │ src/services/     │
│ - updateClienteContato() ├─────────────────────────┤   reporting.ts    │
│ (Reads/Writes to         │ src/services/           │ - gerarCSV()      │
│  localStorage)           │   clientSearch.ts       │                   │
│                          │ - buscarCliente()       │                   │
└──────────────▲───────────┴───────────▲─────────────┴───────────▲───────┘
               │                       │                         │
               ├───────────────────────┴─────────────────────────┤
               │                                                 │
┌──────────────┴──────────────┐                   ┌──────────────┴──────────────┐
│       PRODUCTION CODE       │                   │       E2E TEST DRIVER       │
│  src/context/LoyaltyContext │                   │        e2e/driver.ts        │
│  src/pages/CaixaPage.tsx    │                   │                             │
│  src/pages/AdminDashboard   │                   │ - ZERO duplicate logic      │
│                             │                   │ - Thin Orchestration        │
│ (Uses the Domain Services)  │                   │ - Direct db.ts persistence  │
└─────────────────────────────┘                   │ - Direct loyaltyEngine calls│
                                                  │ - CashierSession controller │
                                                  └──────────────▲──────────────┘
                                                                 │
                                                  ┌──────────────┴──────────────┐
                                                  │     E2E TEST SUITES         │
                                                  │  tier3-combinations.ts      │
                                                  │  tier4-scenarios.ts         │
                                                  └─────────────────────────────┘
```

### 2.1 Extraction of Pure Domain Services into `src/services/`

The business logic currently bundled directly inside React hooks (`useMemo`, `useCallback`) in `src/context/LoyaltyContext.tsx`, `src/pages/CaixaPage.tsx`, and `src/pages/AdminDashboard.tsx` must be extracted into pure, framework-agnostic domain modules:

1. **`src/services/loyaltyEngine.ts`**:
   - `calcularResumosMensais(clientes: Cliente[], compras: Compra[], config: ConfiguracaoFidelidade, referenceDate?: Date): ClienteResumoMensal[]`
     - Exact calculations from `LoyaltyContext.tsx` lines 80–168.
     - Supports optional `referenceDate` (defaults to `new Date()`) for deterministic testing of month boundaries (F06).
   - `calcularClientesSumidos(resumos: ClienteResumoMensal[]): ClienteResumoMensal[]`
     - Exact filter and sorting from `LoyaltyContext.tsx` lines 172–176.
   - `calcularMetricas(resumos: ClienteResumoMensal[], clientesSumidos?: ClienteResumoMensal[]): MetricasGerais`
     - Exact KPI aggregations from `LoyaltyContext.tsx` lines 179–206.
   - `avaliarCompra(resumoAtual: ClienteResumoMensal | null, valor: number, config: ConfiguracaoFidelidade): { pontuou: boolean; totalValidasAtualizado: number; atingiuMetaAgora: boolean }`
     - Exact evaluation rules for minimum value filter (`valor >= config.valor_minimo_pontuacao`), monthly increment, and celebration trigger (`totalValidasAtualizado === config.meta_compras_mes`).
   - `determinarNivelEngajamento(comprasValidas: number): NivelEngajamento`
     - Bronze: 1–5, Prata: 6–12, Ouro: >12.
   - `calcularStatusChurn(comprasMesAnterior: number, diasSemComprar: number): { statusChurn: boolean; urgencia?: UrgenciaChurn }`
     - Status: `comprasMesAnterior >= 5 && diasSemComprar >= 15`.
     - Urgência: `>= 30` dias -> `'vermelho'`, `15..29` dias -> `'amarelo'`.

2. **`src/services/clientSearch.ts`** (or exported from `src/services/whatsapp.ts`):
   - `buscarClientePorTelefone(clientes: Cliente[], telefoneInput: string): { match: Cliente | null; isNovoCliente: boolean }`
     - Exact real-time search logic from `CaixaPage.tsx` lines 63–87 (8+ digits matching exact or suffix, 10+ digits triggering new client form without stale state).

3. **`src/services/reporting.ts`**:
   - `gerarRelatorioCSV(resumosMensais: ClienteResumoMensal[]): string`
     - Exact CSV generation logic from `AdminDashboard.tsx` lines 89–101 (UTF-8 BOM `\uFEFF`, `;` delimiter, formatted Brazilian phone display, escaped names, column headers).

4. **Integration with `src/context/LoyaltyContext.tsx`, `CaixaPage.tsx`, and `AdminDashboard.tsx`**:
   - `LoyaltyContext.tsx` delegates to `loyaltyEngine.ts`:
     ```ts
     const resumosMensais = useMemo(() => {
       return calcularResumosMensais(clientes, compras, config);
     }, [clientes, compras, config]);

     const clientesSumidos = useMemo(() => {
       return calcularClientesSumidos(resumosMensais);
     }, [resumosMensais]);

     const metricas = useMemo(() => {
       return calcularMetricas(resumosMensais, clientesSumidos);
     }, [resumosMensais, clientesSumidos]);
     ```
   - `CaixaPage.tsx` delegates to `buscarClientePorTelefone(clientes, telefoneInput)`.
   - `AdminDashboard.tsx` delegates to `gerarRelatorioCSV(resumosMensais)`.
   - Result: 100% backward compatibility, zero code duplication, zero TypeScript build errors (`npm run build` continues to pass cleanly with exit code 0).

---

## 3. Concrete Remediation for `e2e/driver.ts`

### 3.1 What to Delete from `e2e/driver.ts`
- **DELETE** lines 44–129: Reimplemented `resumosMensais` loop.
- **DELETE** lines 131–135: Reimplemented `clientesSumidos` filter.
- **DELETE** lines 137–164: Reimplemented `metricas` loop.
- **DELETE** lines 176–185: Inline calculation of `pontuou`, `totalValidasAtualizado`, and `atingiuMetaAgora`.
- **DELETE** lines 228–247: Reimplemented phone search logic.
- **DELETE** lines 252–266: Reimplemented CSV string assembly.

### 3.2 What `e2e/driver.ts` Must Import and Execute
`AppDriver` must import directly from `src/services/`:
```ts
import * as dbService from '../src/services/db';
import * as whatsappService from '../src/services/whatsapp';
import * as seedData from '../src/services/seedData';
import { 
  calcularResumosMensais, 
  calcularClientesSumidos, 
  calcularMetricas, 
  avaliarCompra 
} from '../src/services/loyaltyEngine';
import { buscarClientePorTelefone } from '../src/services/clientSearch';
import { gerarRelatorioCSV } from '../src/services/reporting';
```

### 3.3 Complete Architecture of Remediated `AppDriver`

```ts
export class CashierSession {
  public telefoneInput = '';
  public valorCompra = '15';
  public nomeNovoCliente = '';
  public modalPremioAberto = false;
  public ultimoPremioDisparado: { cliente: Cliente; comprasMes: number } | null = null;

  constructor(private driver: AppDriver) {}

  public digitarTelefone(input: string) {
    this.telefoneInput = input;
    return this.driver.buscarClientePorTelefone(input);
  }

  public selecionarValorRapido(valor: number) {
    this.valorCompra = valor.toString();
  }

  public pressionarEsc() {
    this.telefoneInput = '';
    this.valorCompra = '15';
    this.nomeNovoCliente = '';
    this.modalPremioAberto = false;
  }

  public async confirmarCompra(): Promise<{
    compra: Compra;
    atingiuMetaAgora: boolean;
    totalMes: number;
    pontuou: boolean;
  }> {
    const valorNum = parseFloat(this.valorCompra.replace(',', '.')) || 0;
    const busca = this.driver.buscarClientePorTelefone(this.telefoneInput);

    if (busca.match) {
      const res = await this.driver.registrarCompra(busca.match.id, valorNum);
      if (res.atingiuMetaAgora) {
        this.modalPremioAberto = true;
        this.ultimoPremioDisparado = { cliente: busca.match, comprasMes: res.totalMes };
      } else {
        this.pressionarEsc();
      }
      return res;
    } else if (busca.isNovoCliente && this.nomeNovoCliente.trim()) {
      const res = await this.driver.cadastrarClienteERegistrarCompra(
        this.nomeNovoCliente.trim(),
        this.telefoneInput,
        valorNum
      );
      this.pressionarEsc();
      return res;
    }
    throw new Error('Operação de caixa inválida: cliente não identificado');
  }
}

export class AppDriver {
  public storage: MemoryStorage;
  public clientes: Cliente[] = [];
  public compras: Compra[] = [];
  public config: ConfiguracaoFidelidade = { ...seedData.INITIAL_CONFIG };
  public caixa: CashierSession;
  private customReferenceDate?: Date;

  constructor() {
    const env = setupBrowserEnvironment();
    this.storage = env.storage;
    this.caixa = new CashierSession(this);
  }

  public async init(populateSeed = true): Promise<void> {
    if (populateSeed) {
      dbService.resetToDemoData();
    } else {
      this.storage.clear();
    }
    await this.reloadFromStorage();
    this.caixa.pressionarEsc();
  }

  public async reloadFromStorage(): Promise<void> {
    this.clientes = await dbService.fetchClientes();
    this.compras = await dbService.fetchCompras();
    this.config = await dbService.fetchConfiguracao();
  }

  public setReferenceDate(date: Date | undefined): void {
    this.customReferenceDate = date;
  }

  // DIRECT INVOCATION OF APPLICATION DOMAIN ENGINE
  public get resumosMensais(): ClienteResumoMensal[] {
    return calcularResumosMensais(this.clientes, this.compras, this.config, this.customReferenceDate);
  }

  public get clientesSumidos(): ClienteResumoMensal[] {
    return calcularClientesSumidos(this.resumosMensais);
  }

  public get metricas(): MetricasGerais {
    return calcularMetricas(this.resumosMensais, this.clientesSumidos);
  }

  public obterResumoCliente(clienteId: string): ClienteResumoMensal | null {
    return this.resumosMensais.find((r) => r.cliente.id === clienteId) || null;
  }

  public buscarClientePorTelefone(telefoneInput: string) {
    return buscarClientePorTelefone(this.clientes, telefoneInput);
  }

  public exportarCSV(): string {
    return gerarRelatorioCSV(this.resumosMensais);
  }

  // DIRECT INVOCATION OF APPLICATION PERSISTENCE LAYER (dbService / localStorage)
  public async registrarCompra(clienteId: string, valor: number): Promise<{
    compra: Compra;
    atingiuMetaAgora: boolean;
    totalMes: number;
    pontuou: boolean;
  }> {
    const resumoAntes = this.obterResumoCliente(clienteId);
    const avaliacao = avaliarCompra(resumoAntes, valor, this.config);

    // Writes directly to localStorage via dbService
    const novaCompra = await dbService.registerCompra(clienteId, valor, avaliacao.pontuou);
    await this.reloadFromStorage();

    return {
      compra: novaCompra,
      atingiuMetaAgora: avaliacao.atingiuMetaAgora,
      totalMes: avaliacao.totalValidasAtualizado,
      pontuou: avaliacao.pontuou
    };
  }

  public async cadastrarClienteERegistrarCompra(nome: string, whatsapp: string, valor: number) {
    const novoCliente = await dbService.createCliente(nome, whatsapp);
    await this.reloadFromStorage();
    const res = await this.registrarCompra(novoCliente.id, valor);
    return {
      cliente: novoCliente,
      ...res
    };
  }

  public async salvarConfiguracoes(novasConfigs: Partial<ConfiguracaoFidelidade>): Promise<void> {
    this.config = await dbService.saveConfiguracao(novasConfigs);
    await this.reloadFromStorage();
  }

  public async marcarContatoRealizado(clienteId: string): Promise<void> {
    const hojeIso = new Date().toISOString().split('T')[0];
    await dbService.updateClienteContato(clienteId, hojeIso);
    await this.reloadFromStorage();
  }

  public async reiniciarDadosDemo(): Promise<void> {
    dbService.resetToDemoData();
    await this.reloadFromStorage();
  }

  // DIRECT VERIFICATION OF PERSISTENCE STORE
  public getRawStorageItem<T>(key: string): T | null {
    const item = this.storage.getItem(key);
    return item ? JSON.parse(item) : null;
  }
}
```

---

## 4. Concrete Remediation for `e2e/tier3-combinations.ts`

Each of the 20 tests must be transformed from static or tautological checks into genuine multi-step state mutations that verify both domain logic and physical persistence in `localStorage`.

| Test ID | Current Flaw | Remediated Implementation & Genuine Verification |
|---|---|---|
| **T3.01** [F01+F05] | Inline condition `expect(pontua).toBe(true)` | Use `driver.caixa.selecionarValorRapido(5)` -> `driver.caixa.confirmarCompra()` for `cli-06`. Verify in raw `localStorage` that `compra.pontuou_fidelidade === true`, and verify via `loyaltyEngine` that `compras_validas_fidelidade` incremented by 1. |
| **T3.02** [F01+F02] | **TAUTOLOGY**: `valor = '50'; valor = '15'` | `driver.caixa.selecionarValorRapido(50)`. Assert `driver.caixa.valorCompra === '50'`. Dispatch genuine ESC via `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`. Assert that `driver.caixa.valorCompra === '15'`, `driver.caixa.telefoneInput === ''`. |
| **T3.03** [F03+F04] | Uses duplicate driver search | Search existing customer Seu Antônio (`44991234567`) via `driver.caixa.digitarTelefone`. Confirm purchase of R$ 20.00. Verify in raw `localStorage` that `panificadora_clientes` has `total_compras_historico: 49` and `panificadora_compras` has new record. |
| **T3.04** [F03+F04] | Direct call without search cycle | Multi-step cashier flow: 1) Digita `44998112244` -> `isNovoCliente === true`. 2) Preenche `nomeNovoCliente = 'Gabriel Novaes'`. 3) `driver.caixa.confirmarCompra()`. 4) Verify both client and purchase exist in `localStorage`. 5) Subsequent search immediately finds `Gabriel Novaes`. |
| **T3.05** [F04+F17] | Driver duplicate logic | Register 10th purchase for Seu Antônio (starts at 9). Verify `res.atingiuMetaAgora === true`. Verify `driver.caixa.modalPremioAberto === true`. Verify `driver.caixa.ultimoPremioDisparado.comprasMes === 10`. |
| **T3.06** [F04+F17] | Shallow check | Multi-step: Register 10th purchase (`atingiuMetaAgora === true`), dismiss modal via ESC. Register 11th purchase (`atingiuMetaAgora === false`, `modalPremioAberto === false`). Register 12th purchase (`atingiuMetaAgora === false`). Verify all 3 stored in `localStorage`. |
| **T3.07** [F05+F07] | Driver duplicate logic | Create client, perform 5 valid purchases (reaches Bronze). Perform 6th purchase of R$ 3.00. Read `localStorage`: `pontuou_fidelidade === false`. Summary: `compras_mes_atual === 6`, `compras_validas_fidelidade === 5`, `nivel === 'Bronze'`. |
| **T3.08** [F05+F07] | Driver duplicate logic | From 5 valid purchases, perform 6th purchase with exactly R$ 5.00. Read `localStorage`: `pontuou_fidelidade === true`. Summary: `compras_validas_fidelidade === 6`, `nivel === 'Prata'`. |
| **T3.09** [F08+F10] | Partial check | Verify Dra. Beatriz (`cli-08`) is in churn. Call `driver.marcarContatoRealizado('cli-08')`. Inspect raw `localStorage.getItem('panificadora_clientes')` to confirm `ultimo_contato_resgate === todayIso`. Verify she remains in `clientesSumidos` until a new purchase is made. |
| **T3.10** [F08+F13] | Static URL check | Filter `driver.clientesSumidos` for `urgencia_churn === 'vermelho'`. Generate URL using `whatsappService.buildWhatsAppMessage` with `config.mensagem_resgate`. Verify URL format `https://wa.me/5544...`, encoded customer name, and polite phrasing. |
| **T3.11** [F14+F05] | Driver duplicate logic | Tiago (`cli-09`) has purchases of R$ 8.50 (valid under R$ 5). Update config via `driver.salvarConfiguracoes({ valor_minimo_pontuacao: 10.00 })`. Verify in `localStorage` that `panificadora_config` was persisted. Recalculate summaries via `loyaltyEngine`: Tiago's valid purchases drop to 0. |
| **T3.12** [F14+F17] | Driver duplicate logic | Felipe (`cli-05`) has 6 purchases. Update config `meta_compras_mes: 7`. Register 7th purchase of R$ 20.00. Returns `atingiuMetaAgora === true` at 7 purchases. |
| **T3.13** [F15+F09] | Driver duplicate logic | Mutate state heavily (add 3 clients, 8 purchases, alter config to meta=5). Call `driver.reiniciarDadosDemo()`. Verify raw `localStorage` for all 3 storage keys match initial seed. Verify Marlene has 12 purchases, Antonio has 9, Valdomiro is yellow churn, Beatriz is red churn. |
| **T3.14** [F02+F17] | **TAUTOLOGY**: Mock lambda `handleEscape()` | Trigger modal celebration on 10th purchase (`driver.caixa.modalPremioAberto === true`). Dispatch genuine `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`. Verify `driver.caixa.modalPremioAberto === false` and `driver.caixa.telefoneInput === ''`. |
| **T3.15** [F18+F02] | **TAUTOLOGY**: `currentTab = 'admin'; tel = '...'` | Setup genuine keyboard listener from `App.tsx` on `window`. Dispatch `F2` -> active tab switches to `'admin'`. Dispatch `F1` -> active tab switches to `'caixa'`. Verify entered telephone was preserved across tab switches. Dispatch `Escape` -> telephone cleared. |
| **T3.16** [F12+F03] | Driver duplicate logic | Register new client via `dbService`. Generate CSV via `gerarRelatorioCSV(driver.resumosMensais)`. Verify CSV contains UTF-8 BOM `\uFEFF`, header with `;`, and the new client with formatted phone `(44) 99881-1234`. |
| **T3.17** [F16+F17] | Driver duplicate logic | Mutate `config.premio_descricao` to `'Bolo de Cenoura com Chocolate'`. Register purchase reaching goal. Verify generated WhatsApp message and wa.me URL contain the encoded new prize text. |
| **T3.18** [F16+F13] | Static check | Test `whatsappService.getWhatsAppUrl` for customer in churn (`cli-08`). Verify DDI 55 prefix, Brazilian DDD, no punctuation, valid URI encoding. |
| **T3.19** [F11+F04] | Driver duplicate logic | Read initial KPIs via `loyaltyEngine.calcularMetricas`. Register purchase of R$ 50.00 for `cli-06`. Recalculate metrics from updated storage. Verify `faturamentoMes` incremented by 50.00 and `totalVisitasMes` by 1. |
| **T3.20** [F06+F11] | Driver duplicate logic | Valdomiro (`cli-07`) has 14 purchases in previous month totaling > R$ 160. Verify that `metricas.faturamentoMes` strictly includes current month purchases. Valdomiro's `valor_total_mes` is 0, and previous month purchases do not inflate current month KPIs. |

---

## 5. Concrete Remediation for `e2e/tier4-scenarios.ts`

All 10 scenarios model full multi-step counter and management workflows. They must execute directly against `dbService`, `loyaltyEngine`, and `reporting`, with zero local mocks:

### Scenario Walkthrough & Remediation Specifications

1. **Cenário 1: Horário de Pico Matinal (Morning Rush)**:
   - **User Flow**: Atendente processa 5 clientes seguidos no balcão em fila rápida (`Dona Marlene`, `Seu Antônio`, `Dr. Carlos`, `Prof. Renata`, `Felipe`).
   - **Remediation**:
     - Loop through the 5 customers:
       1. `driver.caixa.digitarTelefone(item.tel)` -> finds client.
       2. `driver.caixa.selecionarValorRapido(item.valor)`.
       3. `await driver.caixa.confirmarCompra()` -> writes purchase to `localStorage` via `dbService`.
       4. Verify form automatically resets for the next customer.
     - Verify cumulative KPIs: `metricas.totalVisitasMes` increased by 5, `metricas.faturamentoMes` increased by R$ 80.00.

2. **Cenário 2: Cliente Fiel Conquista a Meta do Mês**:
   - **User Flow**: Seu Antônio (9 compras) realiza a 10ª compra, aciona alerta festivo e link de brinde.
   - **Remediation**:
     - Pre-condition: `obterResumoCliente('cli-02').compras_validas_fidelidade === 9`.
     - Execute purchase of R$ 15.00 through cashier session.
     - Verify `res.atingiuMetaAgora === true`, `res.totalMes === 10`.
     - Verify `driver.caixa.modalPremioAberto === true`.
     - Generate WhatsApp URL and verify presence of customer name, 10 purchases, and configured prize.
     - Inspect raw `localStorage` to confirm 10 valid purchases saved.

3. **Cenário 3: Compras Subsequentes Após Meta Batida**:
   - **User Flow**: Dona Marlene (12 compras, meta já batida) retorna nos dias seguintes.
   - **Remediation**:
     - Register 13th purchase (R$ 14.50) -> `res.atingiuMetaAgora === false`, `driver.caixa.modalPremioAberto === false`.
     - Register 14th purchase (R$ 18.00) -> `res.atingiuMetaAgora === false`.
     - Inspect `localStorage`: total purchases in database is 14; verify no celebration spam.

4. **Cenário 4: Novo Cliente - Cadastro Relâmpago em Menos de 3 Segundos**:
   - **User Flow**: Cliente não cadastrado compra no balcão; cadastro relâmpago apenas com nome.
   - **Remediation**:
     - `driver.caixa.digitarTelefone('44991556677')` -> returns `isNovoCliente: true, match: null`.
     - Set `driver.caixa.nomeNovoCliente = 'Mariana Castro'`, select R$ 30.00.
     - `driver.caixa.confirmarCompra()`.
     - Verify client is created in `localStorage` under `panificadora_clientes` with clean phone `44991556677`.
     - Verify purchase is created in `localStorage`.
     - Verify `resumosMensais` includes Mariana with 1 purchase, R$ 30.00, Bronze.

5. **Cenário 5: Tratamento de Micro-Compra (Abaixo de R$ 5,00)**:
   - **User Flow**: Felipe compra chiclete de R$ 2,50.
   - **Remediation**:
     - Record purchase of R$ 2.50.
     - Inspect `localStorage`: saved with `pontuou_fidelidade: false`.
     - Inspect `resumosMensais`: `compras_mes_atual` incremented by 1, but `compras_validas_fidelidade` remains unchanged.
     - `atingiuMetaAgora === false`.

6. **Cenário 6: Campanha de Resgate Anti-Churn pelo Dono**:
   - **User Flow**: Dono filtra urgência vermelha, contata cliente e registra data de contato.
   - **Remediation**:
     - Filter `clientesSumidos` for `urgencia_churn === 'vermelho'` -> finds Dra. Beatriz (`cli-08`).
     - Build wa.me rescue message with customer name and breakfast offer.
     - Call `driver.marcarContatoRealizado('cli-08')`.
     - Inspect raw `localStorage` to verify `ultimo_contato_resgate` updated to today's date.
     - Verify customer status in summary displays contact made today.

7. **Cenário 7: Fechamento de Mês e Exportação CSV**:
   - **User Flow**: Dono consulta KPIs gerenciais, confere ranking VIP e exporta relatório em Excel.
   - **Remediation**:
     - Verify `metricas` (visits, faturamento, ticket médio, prêmios entregues).
     - Verify ranking order: Marlene (12 purchases, Prata), Antonio (9 purchases, Prata), etc.
     - Call `gerarRelatorioCSV(driver.resumosMensais)`.
     - Verify CSV contains UTF-8 BOM, valid semicolon delimiters, Portuguese headers, and customer rows.

8. **Cenário 8: Personalização das Regras de Negócio**:
   - **User Flow**: Dono atualiza brinde para "Bolo de Fubá Cremoso com Café" e meta para 8 compras.
   - **Remediation**:
     - Save new config via `driver.salvarConfiguracoes({ meta_compras_mes: 8, premio_descricao: '...' })`.
     - Confirm persistence in `localStorage`.
     - Dr. Carlos (`cli-03`) has 7 purchases. Register 8th purchase.
     - Verify `atingiuMetaAgora === true` at 8 purchases.
     - Verify celebratory message contains updated prize text.

9. **Cenário 9: Recuperação de Falha e Reset Geral de Demonstração**:
   - **User Flow**: Operador restaura dados de demonstração após poluição de dados.
   - **Remediation**:
     - Add 5 test clients and multiple purchases.
     - Call `driver.reiniciarDadosDemo()`.
     - Inspect raw `localStorage`: keys `panificadora_clientes`, `panificadora_compras`, and `panificadora_config` are restored to initial seed.
     - Verify conformance: Marlene has >= 10 purchases, Antonio has 9, Valdomiro is yellow churn, Beatriz is red churn.

10. **Cenário 10: Operação do Caixa Exclusivamente pelo Teclado**:
    - **Current Flaw**: Uses local mock closures `handleF1` and `handleEsc`.
    - **Remediation**:
      - Register real `App.tsx` keyboard shortcut listener on `window`.
      - **Step 1**: Dispatch genuine `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F1' }))` -> current tab is `'caixa'`.
      - **Step 2**: Type phone `44991234567` in cashier session.
      - **Step 3**: Dispatch `Enter` to confirm purchase of R$ 15.00 -> purchase persisted to `localStorage`.
      - **Step 4**: Dispatch genuine `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))` -> cashier session form resets to initial state (`telefoneInput === ''`, `valorCompra === '15'`).
      - **Zero mock closures. 100% genuine event listener invocation.**

---

## 6. Verification & Invalidation Criteria

1. **Static Analysis Verification**:
   - Run grep to confirm zero local reassignments or mock lambdas in `tier3-combinations.ts` and `tier4-scenarios.ts`:
     ```bash
     grep -E "(let valor = '50'|handleEscape|handleF1)" e2e/tier3-combinations.ts e2e/tier4-scenarios.ts
     ```
     Result: 0 matches.
   - Verify `driver.ts` imports and delegates to `loyaltyEngine.ts`, `clientSearch.ts`, and `reporting.ts`.
2. **Runtime Execution Verification**:
   - Run test suite:
     ```bash
     node e2e/runner.js --tier=3
     node e2e/runner.js --tier=4
     ```
     All tests must pass with genuine state mutations and persistence assertions.
3. **Build Integrity Verification**:
   - Execute `npm run build`: `tsc && vite build` must exit with code 0 and zero errors.
4. **Invalidation Condition**:
   - If `driver.ts` retains any duplicated loops or arithmetic, or if any test in Tier 3 or Tier 4 relies on local variable assignments (`assert x === x`) or synthetic closures, this remediation strategy is invalidated.
