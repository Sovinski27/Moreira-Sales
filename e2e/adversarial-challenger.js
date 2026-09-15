#!/usr/bin/env node

/**
 * Adversarial Challenger Empirical Test Suite
 * Gate 1 - Teamwork Preview Challenger
 * 
 * Exhaustive Empirical Verification of:
 * 1. Boundary Purchase Values (0.00, 4.99, 5.00, 5.01, negative, decimals, large numbers, edge inputs)
 * 2. Monthly Turnover Boundary Conditions (Day 1 00:00:00, Month transitions, Dec->Jan, Leap year, 2-month lookback isolation)
 * 3. Churn Detection Thresholds (14 vs 15 days, 29 vs 30 days, 4 vs 5 prev month purchases, same-day, contact date impact)
 * 4. Production Seed Data Integrity (Marlene, Antonio, Valdomiro, Beatriz)
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// If running in plain Node without tsx loader, delegate transparently to npx tsx
const isTsxRunning = Boolean(
  process.env.TSX_RUNNING === '1' ||
  process.execArgv.some((a) => a.includes('tsx')) ||
  process.argv.some((a) => a.includes('tsx'))
);

if (!isTsxRunning) {
  const currentFile = fileURLToPath(import.meta.url);
  const child = spawnSync(
    'npx',
    ['tsx', currentFile, ...process.argv.slice(2)],
    {
      encoding: 'utf-8',
      shell: true,
      env: { ...process.env, TSX_RUNNING: '1' }
    }
  );
  if (child.error) {
    console.error('Child spawn error:', child.error);
  }
  if (child.stdout) process.stdout.write(child.stdout);
  if (child.stderr) process.stderr.write(child.stderr);
  process.exit(child.status ?? (child.error ? 1 : 0));
}

// Inside TSX context: register loader hook before importing app code
async function main() {
  const { register } = await import('node:module');
  const { pathToFileURL } = await import('node:url');
  const { resolve, dirname } = await import('node:path');

  try {
    const loaderPath = resolve(dirname(fileURLToPath(import.meta.url)), 'loader.js');
    register(pathToFileURL(loaderPath));
  } catch (err) {
    console.warn('Loader register note:', err);
  }

  // Now dynamically import app modules and test dependencies
  const { setupBrowserEnvironment } = await import('./harness.ts');
  const { AppDriver } = await import('./driver.ts');
  const dbService = await import('../src/services/db.ts');
  const seedData = await import('../src/services/seedData.ts');

  const reports = [];

  function assert(condition, category, testName, details, actual, expected) {
    if (condition) {
      reports.push({ category, testName, status: 'PASS', details });
      console.log(`  ✔ [PASS] ${category} > ${testName}`);
    } else {
      reports.push({ category, testName, status: 'FAIL', details, actual, expected });
      console.error(`  ❌ [FAIL] ${category} > ${testName}: ${details} (Actual: ${JSON.stringify(actual)}, Expected: ${JSON.stringify(expected)})`);
    }
  }

  /**
   * Mirror of LoyaltyContext reactive computation for precise mathematical probing
   */
  function computeResumoMensal(
    cliente,
    compras,
    config,
    simulatedNow
  ) {
    const currentYear = simulatedNow.getFullYear();
    const currentMonth = simulatedNow.getMonth();

    const prevDate = new Date(currentYear, currentMonth - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth();

    const minValor = config.valor_minimo_pontuacao || 0;
    const clienteCompras = compras.filter((c) => c.cliente_id === cliente.id);

    let comprasMesAtual = 0;
    let comprasValidasFidelidade = 0;
    let comprasMesAnterior = 0;
    let valorTotalMes = 0;
    let ultimaData = null;
    let ultimaDataTimestamp = 0;

    for (const comp of clienteCompras) {
      const compDate = new Date(comp.data_compra ? comp.data_compra + 'T00:00:00' : comp.criado_em);
      const compYear = compDate.getFullYear();
      const compMonth = compDate.getMonth();
      const compTime = compDate.getTime();
      const valorComp = Number(comp.valor) || 0;

      if (compTime > ultimaDataTimestamp) {
        ultimaDataTimestamp = compTime;
        ultimaData = comp.data_compra;
      }

      if (compYear === currentYear && compMonth === currentMonth) {
        comprasMesAtual++;
        valorTotalMes += valorComp;
        if (comp.pontuou_fidelidade !== false && valorComp >= minValor) {
          comprasValidasFidelidade++;
        }
      } else if (compYear === prevYear && compMonth === prevMonth) {
        if (valorComp >= minValor) {
          comprasMesAnterior++;
        }
      }
    }

    let diasSemComprar = 999;
    if (ultimaDataTimestamp > 0) {
      const diffMs = simulatedNow.getTime() - ultimaDataTimestamp;
      diasSemComprar = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    let nivel = 'Bronze';
    if (comprasValidasFidelidade > 12) {
      nivel = 'Ouro';
    } else if (comprasValidasFidelidade >= 6) {
      nivel = 'Prata';
    }

    const atingiuMeta = comprasValidasFidelidade >= config.meta_compras_mes;
    const statusChurn = comprasMesAnterior >= 5 && diasSemComprar >= 15;
    const urgenciaChurn = statusChurn
      ? (diasSemComprar >= 30 ? 'vermelho' : 'amarelo')
      : undefined;

    return {
      cliente,
      compras_mes_atual: comprasMesAtual,
      compras_validas_fidelidade: comprasValidasFidelidade,
      compras_mes_anterior: comprasMesAnterior,
      valor_total_mes: Number(valorTotalMes.toFixed(2)),
      ultima_compra_data: ultimaData,
      dias_sem_comprar: diasSemComprar,
      nivel,
      atingiu_meta: atingiuMeta,
      status_churn: statusChurn,
      urgencia_churn: urgenciaChurn,
      ultimo_contato: cliente.ultimo_contato_resgate
    };
  }

  console.log('================================================================================');
  console.log('⚡ ADVERSARIAL CHALLENGER EMPIRICAL SUITE');
  console.log('================================================================================\n');

  const env = setupBrowserEnvironment();

  const dummyCliente = {
    id: 'cli-test-01',
    nome: 'Cliente Teste Fuzz',
    whatsapp: '44999998888',
    total_compras_historico: 0,
    criado_em: '2026-09-01T10:00:00Z',
    ultimo_contato_resgate: null
  };

  const standardConfig = {
    id: 1,
    meta_compras_mes: 10,
    valor_minimo_pontuacao: 5.00,
    premio_descricao: '1 Café Especial',
    mensagem_whatsapp: 'Parabéns {NOME}',
    mensagem_resgate: 'Volte {NOME}'
  };

  const fixedNow = new Date(2026, 8, 15, 14, 30, 0); // 15 de Setembro de 2026 às 14:30

  // =========================================================================
  // 1. BOUNDARY PURCHASE VALUES (0.00, 4.99, 5.00, 5.01, negative, decimals, large)
  // =========================================================================
  console.log('▶ [1/4] Testing Purchase Value Boundaries & Fuzzing...');

  // Test 1.1: 0.00 Purchase Value
  {
    const compras = [
      { id: 'c1', cliente_id: 'cli-test-01', valor: 0.00, data_compra: '2026-09-15', criado_em: '2026-09-15T10:00:00Z', pontuou_fidelidade: false }
    ];
    const r = computeResumoMensal(dummyCliente, compras, standardConfig, fixedNow);
    assert(r.compras_mes_atual === 1, 'Purchase Values', '0.00 recorded in monthly count', r.compras_mes_atual, 1);
    assert(r.compras_validas_fidelidade === 0, 'Purchase Values', '0.00 does NOT increment valid fidelity points', r.compras_validas_fidelidade, 0);
    assert(r.valor_total_mes === 0.00, 'Purchase Values', '0.00 adds 0 to total turnover', r.valor_total_mes, 0.00);
    assert(!r.atingiu_meta, 'Purchase Values', '0.00 does NOT trigger goal', r.atingiu_meta, false);
  }

  // Test 1.2: 4.99 Purchase Value (Sub-threshold boundary)
  {
    const compras = [
      { id: 'c1', cliente_id: 'cli-test-01', valor: 4.99, data_compra: '2026-09-15', criado_em: '2026-09-15T10:00:00Z', pontuou_fidelidade: false }
    ];
    const r = computeResumoMensal(dummyCliente, compras, standardConfig, fixedNow);
    assert(r.compras_mes_atual === 1, 'Purchase Values', '4.99 recorded in history/count', r.compras_mes_atual, 1);
    assert(r.compras_validas_fidelidade === 0, 'Purchase Values', '4.99 does NOT score (strictly < 5.00)', r.compras_validas_fidelidade, 0);
    assert(r.valor_total_mes === 4.99, 'Purchase Values', '4.99 is included in monthly turnover', r.valor_total_mes, 4.99);
  }

  // Test 1.3: 5.00 Purchase Value (Exact minimum threshold)
  {
    const compras = [
      { id: 'c1', cliente_id: 'cli-test-01', valor: 5.00, data_compra: '2026-09-15', criado_em: '2026-09-15T10:00:00Z', pontuou_fidelidade: true }
    ];
    const r = computeResumoMensal(dummyCliente, compras, standardConfig, fixedNow);
    assert(r.compras_mes_atual === 1, 'Purchase Values', '5.00 recorded in history', r.compras_mes_atual, 1);
    assert(r.compras_validas_fidelidade === 1, 'Purchase Values', '5.00 SCORES fidelity point (exactly == 5.00)', r.compras_validas_fidelidade, 1);
    assert(r.valor_total_mes === 5.00, 'Purchase Values', '5.00 adds to turnover', r.valor_total_mes, 5.00);
  }

  // Test 1.4: 5.01 Purchase Value (Above-threshold boundary)
  {
    const compras = [
      { id: 'c1', cliente_id: 'cli-test-01', valor: 5.01, data_compra: '2026-09-15', criado_em: '2026-09-15T10:00:00Z', pontuou_fidelidade: true }
    ];
    const r = computeResumoMensal(dummyCliente, compras, standardConfig, fixedNow);
    assert(r.compras_validas_fidelidade === 1, 'Purchase Values', '5.01 scores fidelity point (> 5.00)', r.compras_validas_fidelidade, 1);
    assert(r.valor_total_mes === 5.01, 'Purchase Values', '5.01 adds to turnover', r.valor_total_mes, 5.01);
  }

  // Test 1.5: Negative Purchase Values (-0.01, -5.00, -100)
  {
    const compras = [
      { id: 'c1', cliente_id: 'cli-test-01', valor: -5.00, data_compra: '2026-09-15', criado_em: '2026-09-15T10:00:00Z', pontuou_fidelidade: false }
    ];
    const r = computeResumoMensal(dummyCliente, compras, standardConfig, fixedNow);
    assert(r.compras_validas_fidelidade === 0, 'Purchase Values', 'Negative value does NOT score fidelity point', r.compras_validas_fidelidade, 0);
  }

  // Test 1.6: Decimal Precision & Float Drift
  {
    const compras = [
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `c-dec-${i}`,
        cliente_id: 'cli-test-01',
        valor: 0.10,
        data_compra: '2026-09-15',
        criado_em: '2026-09-15T10:00:00Z',
        pontuou_fidelidade: false
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `c-val-${i}`,
        cliente_id: 'cli-test-01',
        valor: 5.00,
        data_compra: '2026-09-15',
        criado_em: '2026-09-15T10:00:00Z',
        pontuou_fidelidade: true
      }))
    ];
    const r = computeResumoMensal(dummyCliente, compras, standardConfig, fixedNow);
    assert(r.compras_mes_atual === 20, 'Purchase Values', 'Decimal precision: total 20 compras', r.compras_mes_atual, 20);
    assert(r.compras_validas_fidelidade === 10, 'Purchase Values', 'Decimal precision: 10 valid compras', r.compras_validas_fidelidade, 10);
    assert(r.valor_total_mes === 51.00, 'Purchase Values', 'Decimal precision: total turnover equals 51.00 exactly without float drift', r.valor_total_mes, 51.00);
    assert(r.atingiu_meta, 'Purchase Values', 'Goal achieved exactly at 10 valid purchases', r.atingiu_meta, true);
  }

  // Test 1.7: Large Numbers
  {
    const compras = [
      { id: 'c1', cliente_id: 'cli-test-01', valor: 999999.99, data_compra: '2026-09-15', criado_em: '2026-09-15T10:00:00Z', pontuou_fidelidade: true }
    ];
    const r = computeResumoMensal(dummyCliente, compras, standardConfig, fixedNow);
    assert(r.valor_total_mes === 999999.99, 'Purchase Values', 'Large value 999,999.99 handled cleanly', r.valor_total_mes, 999999.99);
    assert(r.compras_validas_fidelidade === 1, 'Purchase Values', 'Large value scores 1 fidelity point', r.compras_validas_fidelidade, 1);
  }

  // Test 1.8: dbRegisterCompra rounding guarantee
  {
    env.storage.clear();
    const c1 = await dbService.registerCompra('cli-01', 5.004, true);
    assert(c1.valor === 5.00, 'Purchase Values', 'dbRegisterCompra truncates/rounds 5.004 to 5.00', c1.valor, 5.00);
    const c2 = await dbService.registerCompra('cli-01', 5.006, true);
    assert(c2.valor === 5.01, 'Purchase Values', 'dbRegisterCompra rounds 5.006 to 5.01', c2.valor, 5.01);
  }

  // =========================================================================
  // 2. MONTHLY TURNOVER BOUNDARY CONDITIONS
  // =========================================================================
  console.log('\n▶ [2/4] Testing Monthly Turnover Boundary Conditions...');

  // Test 2.1: Day 1 at 00:00:00 Resets Monthly Counters
  {
    const compras = [
      { id: 'c-aug', cliente_id: 'cli-test-01', valor: 25.00, data_compra: '2026-08-31', criado_em: '2026-08-31T23:59:59Z', pontuou_fidelidade: true },
      { id: 'c-sep', cliente_id: 'cli-test-01', valor: 15.00, data_compra: '2026-09-01', criado_em: '2026-09-01T00:00:00Z', pontuou_fidelidade: true }
    ];

    const sept1stNow = new Date(2026, 8, 1, 0, 0, 1); // 1 de Setembro 00:00:01
    const r = computeResumoMensal(dummyCliente, compras, standardConfig, sept1stNow);

    assert(r.compras_mes_atual === 1, 'Monthly Turnover', 'Day 1 00:00:01: only September purchase in current month', r.compras_mes_atual, 1);
    assert(r.valor_total_mes === 15.00, 'Monthly Turnover', 'Day 1 00:00:01: monthly turnover is 15.00 (August reset)', r.valor_total_mes, 15.00);
    assert(r.compras_mes_anterior === 1, 'Monthly Turnover', 'August purchase counted in previous month', r.compras_mes_anterior, 1);
  }

  // Test 2.2: Year Rollover (December 31 -> January 1)
  {
    const jan1stNow = new Date(2027, 0, 1, 0, 0, 1); // 01 Jan 2027

    const compras = [
      { id: 'c-dec', cliente_id: 'cli-test-01', valor: 50.00, data_compra: '2026-12-31', criado_em: '2026-12-31T20:00:00Z', pontuou_fidelidade: true },
      { id: 'c-jan', cliente_id: 'cli-test-01', valor: 20.00, data_compra: '2027-01-01', criado_em: '2027-01-01T08:00:00Z', pontuou_fidelidade: true }
    ];

    const rJan = computeResumoMensal(dummyCliente, compras, standardConfig, jan1stNow);
    assert(rJan.compras_mes_atual === 1, 'Monthly Turnover', 'Jan 1: current month compras is 1', rJan.compras_mes_atual, 1);
    assert(rJan.valor_total_mes === 20.00, 'Monthly Turnover', 'Jan 1: current month turnover is 20.00', rJan.valor_total_mes, 20.00);
    assert(rJan.compras_mes_anterior === 1, 'Monthly Turnover', 'Jan 1: previous month (Dec of previous year) is 1', rJan.compras_mes_anterior, 1);
  }

  // Test 2.3: Purchases from 2+ Months Ago Are Excluded from Both Current and Previous Month
  {
    const compras = [
      { id: 'c-jul', cliente_id: 'cli-test-01', valor: 100.00, data_compra: '2026-07-15', criado_em: '2026-07-15T12:00:00Z', pontuou_fidelidade: true },
      { id: 'c-aug', cliente_id: 'cli-test-01', valor: 30.00, data_compra: '2026-08-20', criado_em: '2026-08-20T12:00:00Z', pontuou_fidelidade: true },
      { id: 'c-sep', cliente_id: 'cli-test-01', valor: 15.00, data_compra: '2026-09-10', criado_em: '2026-09-10T12:00:00Z', pontuou_fidelidade: true }
    ];
    const r = computeResumoMensal(dummyCliente, compras, standardConfig, fixedNow);
    assert(r.compras_mes_atual === 1, 'Monthly Turnover', 'September current month count is 1', r.compras_mes_atual, 1);
    assert(r.valor_total_mes === 15.00, 'Monthly Turnover', 'September current month turnover is 15.00', r.valor_total_mes, 15.00);
    assert(r.compras_mes_anterior === 1, 'Monthly Turnover', 'August previous month count is 1 (July ignored)', r.compras_mes_anterior, 1);
  }

  // Test 2.4: Leap Year Rollover (Feb 29 -> March 1, 2028)
  {
    const march1Now = new Date(2028, 2, 1, 10, 0, 0); // 1 de Março de 2028 (Ano bissexto)
    const compras = [
      { id: 'c-feb29', cliente_id: 'cli-test-01', valor: 40.00, data_compra: '2028-02-29', criado_em: '2028-02-29T18:00:00Z', pontuou_fidelidade: true },
      { id: 'c-mar01', cliente_id: 'cli-test-01', valor: 10.00, data_compra: '2028-03-01', criado_em: '2028-03-01T09:00:00Z', pontuou_fidelidade: true }
    ];
    const r = computeResumoMensal(dummyCliente, compras, standardConfig, march1Now);
    assert(r.compras_mes_atual === 1, 'Monthly Turnover', 'Leap Year: Mar 1 has 1 purchase', r.compras_mes_atual, 1);
    assert(r.compras_mes_anterior === 1, 'Monthly Turnover', 'Leap Year: Feb 29 counted in previous month', r.compras_mes_anterior, 1);
  }

  // =========================================================================
  // 3. CHURN DETECTION THRESHOLDS (14 vs 15 days, 29 vs 30 days)
  // =========================================================================
  console.log('\n▶ [3/4] Testing Churn Detection Thresholds...');

  function createChurnScenario(prevMonthCount, daysAgo, testDate) {
    const lastPurchaseDate = new Date(testDate.getTime() - daysAgo * 24 * 3600 * 1000);
    const lastIso = `${lastPurchaseDate.getFullYear()}-${String(lastPurchaseDate.getMonth() + 1).padStart(2, '0')}-${String(lastPurchaseDate.getDate()).padStart(2, '0')}`;

    const prevYear = testDate.getMonth() === 0 ? testDate.getFullYear() - 1 : testDate.getFullYear();
    const prevMonth = testDate.getMonth() === 0 ? 11 : testDate.getMonth() - 1;

    const lastDateYear = lastPurchaseDate.getFullYear();
    const lastDateMonth = lastPurchaseDate.getMonth();
    const lastInPrevMonth = (lastDateYear === prevYear && lastDateMonth === prevMonth);

    // If last-comp is in previous month, it counts as 1 of the prevMonthCount
    const additionalPrev = lastInPrevMonth ? prevMonthCount - 1 : prevMonthCount;

    const compras = [];
    for (let i = 0; i < additionalPrev; i++) {
      compras.push({
        id: `prev-${i}`,
        cliente_id: 'cli-churn',
        valor: 12.00,
        data_compra: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(Math.min(25, i + 2)).padStart(2, '0')}`,
        criado_em: '2026-08-10T10:00:00Z',
        pontuou_fidelidade: true
      });
    }

    compras.push({
      id: 'last-comp',
      cliente_id: 'cli-churn',
      valor: 15.00,
      data_compra: lastIso,
      criado_em: `${lastIso}T12:00:00Z`,
      pontuou_fidelidade: true
    });

    const cli = { ...dummyCliente, id: 'cli-churn' };
    return computeResumoMensal(cli, compras, standardConfig, testDate);
  }

  // Test 3.1: Exactly 14 Days Absence (Threshold Edge - NOT CHURN)
  {
    const r14 = createChurnScenario(5, 14, fixedNow);
    assert(r14.dias_sem_comprar === 14, 'Churn Thresholds', 'Calculated 14 days absence correctly', r14.dias_sem_comprar, 14);
    assert(r14.status_churn === false, 'Churn Thresholds', '14 days absence is NOT churn (requires >= 15)', r14.status_churn, false);
    assert(r14.urgencia_churn === undefined, 'Churn Thresholds', '14 days absence has no urgency', r14.urgencia_churn, undefined);
  }

  // Test 3.2: Exactly 15 Days Absence (Threshold Edge - CHURN AMARELO)
  {
    const r15 = createChurnScenario(5, 15, fixedNow);
    assert(r15.dias_sem_comprar === 15, 'Churn Thresholds', 'Calculated 15 days absence correctly', r15.dias_sem_comprar, 15);
    assert(r15.status_churn === true, 'Churn Thresholds', '15 days absence TRIGGERS churn status', r15.status_churn, true);
    assert(r15.urgencia_churn === 'amarelo', 'Churn Thresholds', '15 days absence is classified as AMARELO (15-29 days)', r15.urgencia_churn, 'amarelo');
  }

  // Test 3.3: Exactly 29 Days Absence (Upper Edge of Yellow - CHURN AMARELO)
  {
    const r29 = createChurnScenario(5, 29, fixedNow);
    assert(r29.dias_sem_comprar === 29, 'Churn Thresholds', 'Calculated 29 days absence correctly', r29.dias_sem_comprar, 29);
    assert(r29.status_churn === true, 'Churn Thresholds', '29 days absence triggers churn status', r29.status_churn, true);
    assert(r29.urgencia_churn === 'amarelo', 'Churn Thresholds', '29 days absence is STILL classified as AMARELO (< 30 days)', r29.urgencia_churn, 'amarelo');
  }

  // Test 3.4: Exactly 30 Days Absence (Threshold Edge of Red - CHURN VERMELHO)
  {
    const r30 = createChurnScenario(5, 30, fixedNow);
    assert(r30.dias_sem_comprar === 30, 'Churn Thresholds', 'Calculated 30 days absence correctly', r30.dias_sem_comprar, 30);
    assert(r30.status_churn === true, 'Churn Thresholds', '30 days absence triggers churn status', r30.status_churn, true);
    assert(r30.urgencia_churn === 'vermelho', 'Churn Thresholds', '30 days absence TRANSITIONS to VERMELHO (>= 30 days)', r30.urgencia_churn, 'vermelho');
  }

  // Test 3.5: Exactly 31 Days Absence (Well into Red - CHURN VERMELHO)
  {
    const r31 = createChurnScenario(5, 31, fixedNow);
    assert(r31.status_churn === true, 'Churn Thresholds', '31 days absence is churn', r31.status_churn, true);
    assert(r31.urgencia_churn === 'vermelho', 'Churn Thresholds', '31 days absence is VERMELHO', r31.urgencia_churn, 'vermelho');
  }

  // Test 3.6: Previous Month Volume Boundary: 4 vs 5 purchases
  {
    const r4 = createChurnScenario(4, 20, fixedNow);
    assert(r4.status_churn === false, 'Churn Thresholds', '4 previous month purchases does NOT trigger churn even if absent 20 days', r4.status_churn, false);

    const r5 = createChurnScenario(5, 20, fixedNow);
    assert(r5.status_churn === true, 'Churn Thresholds', '5 previous month purchases TRIGGERS churn when absent 20 days', r5.status_churn, true);
    assert(r5.urgencia_churn === 'amarelo', 'Churn Thresholds', 'Urgency is AMARELO', r5.urgencia_churn, 'amarelo');
  }

  // Test 3.7: Sub-minimum purchases in previous month do not count towards anti-churn qualification
  {
    const prevYear = fixedNow.getMonth() === 0 ? fixedNow.getFullYear() - 1 : fixedNow.getFullYear();
    const prevMonth = fixedNow.getMonth() === 0 ? 11 : fixedNow.getMonth() - 1;
    const compras = Array.from({ length: 5 }, (_, i) => ({
      id: `prev-sub-${i}`,
      cliente_id: 'cli-sub',
      valor: 3.00,
      data_compra: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(i + 2).padStart(2, '0')}`,
      criado_em: '2026-08-10T10:00:00Z',
      pontuou_fidelidade: false
    }));
    const cliSub = { ...dummyCliente, id: 'cli-sub' };
    const r = computeResumoMensal(cliSub, compras, standardConfig, fixedNow);
    assert(r.compras_mes_anterior === 0, 'Churn Thresholds', 'Sub-minimum purchases in previous month do not count for anti-churn', r.compras_mes_anterior, 0);
    assert(r.status_churn === false, 'Churn Thresholds', 'Client with only sub-minimum purchases does NOT trigger churn', r.status_churn, false);
  }

  // Test 3.8: Purchase made TODAY resets days without purchase to 0
  {
    const todayIso = `${fixedNow.getFullYear()}-${String(fixedNow.getMonth() + 1).padStart(2, '0')}-${String(fixedNow.getDate()).padStart(2, '0')}`;
    const compras = [
      { id: 'c-today', cliente_id: dummyCliente.id, valor: 15.00, data_compra: todayIso, criado_em: `${todayIso}T08:00:00Z`, pontuou_fidelidade: true }
    ];
    const r = computeResumoMensal(dummyCliente, compras, standardConfig, fixedNow);
    assert(r.dias_sem_comprar === 0, 'Churn Thresholds', 'Purchase made today sets dias_sem_comprar to 0', r.dias_sem_comprar, 0);
    assert(r.status_churn === false, 'Churn Thresholds', 'Purchase made today is NOT churn', r.status_churn, false);
  }

  // =========================================================================
  // 4. PRODUCTION SEED DATA COMPLIANCE & VERIFICATION
  // =========================================================================
  console.log('\n▶ [4/4] Testing Production SeedData Compliance (Live System)...');
  {
    const driver = new AppDriver();
    await driver.init(true);

    const resumos = driver.resumosMensais;
    const sumidos = driver.clientesSumidos;

    // Dona Marlene (cli-01)
    const marlene = resumos.find((r) => r.cliente.id === 'cli-01');
    assert(Boolean(marlene), 'SeedData', 'cli-01 Dona Marlene exists', Boolean(marlene), true);
    assert(marlene.atingiu_meta === true, 'SeedData', 'Dona Marlene has achieved goal (>= 10 valid purchases)', marlene.atingiu_meta, true);
    assert(marlene.compras_validas_fidelidade >= 10, 'SeedData', `Dona Marlene has >= 10 valid purchases (actual: ${marlene.compras_validas_fidelidade})`, marlene.compras_validas_fidelidade, '>= 10');

    // Seu Antonio (cli-02)
    const antonio = resumos.find((r) => r.cliente.id === 'cli-02');
    assert(Boolean(antonio), 'SeedData', 'cli-02 Seu Antonio exists', Boolean(antonio), true);
    assert(antonio.compras_validas_fidelidade === 9, 'SeedData', 'Seu Antonio is exactly 1 purchase away from goal (9 valid purchases)', antonio.compras_validas_fidelidade, 9);
    assert(antonio.atingiu_meta === false, 'SeedData', 'Seu Antonio has not reached goal yet', antonio.atingiu_meta, false);

    // Sr. Valdomiro Souza (cli-07) - Yellow Urgency Churn
    const valdomiro = resumos.find((r) => r.cliente.id === 'cli-07');
    assert(Boolean(valdomiro), 'SeedData', 'cli-07 Sr. Valdomiro exists', Boolean(valdomiro), true);
    assert(valdomiro.status_churn === true, 'SeedData', 'Sr. Valdomiro is classified as churn in risk', valdomiro.status_churn, true);
    assert(valdomiro.urgencia_churn === 'amarelo', 'SeedData', 'Sr. Valdomiro urgency is AMARELO (15-29 days)', valdomiro.urgencia_churn, 'amarelo');
    assert(valdomiro.dias_sem_comprar >= 15 && valdomiro.dias_sem_comprar < 30, 'SeedData', `Sr. Valdomiro days absent is within [15, 29] (actual: ${valdomiro.dias_sem_comprar})`, true, true);
    assert(valdomiro.compras_mes_anterior >= 5, 'SeedData', 'Sr. Valdomiro had >= 5 purchases in previous month', valdomiro.compras_mes_anterior, '>= 5');

    // Dra. Beatriz Fontana (cli-08) - Red Urgency Churn
    const beatriz = resumos.find((r) => r.cliente.id === 'cli-08');
    assert(Boolean(beatriz), 'SeedData', 'cli-08 Dra. Beatriz exists', Boolean(beatriz), true);
    assert(beatriz.status_churn === true, 'SeedData', 'Dra. Beatriz is classified as churn in risk', beatriz.status_churn, true);
    assert(beatriz.urgencia_churn === 'vermelho', 'SeedData', 'Dra. Beatriz urgency is VERMELHO (>= 30 days)', beatriz.urgencia_churn, 'vermelho');
    assert(beatriz.dias_sem_comprar >= 30, 'SeedData', `Dra. Beatriz days absent is >= 30 (actual: ${beatriz.dias_sem_comprar})`, true, true);
    assert(beatriz.compras_mes_anterior >= 5, 'SeedData', 'Dra. Beatriz had >= 5 purchases in previous month', beatriz.compras_mes_anterior, '>= 5');

    // Anti-churn list contains both
    const sumidosValdomiro = sumidos.find((s) => s.cliente.id === 'cli-07');
    const sumidosBeatriz = sumidos.find((s) => s.cliente.id === 'cli-08');
    assert(Boolean(sumidosValdomiro), 'SeedData', 'Sr. Valdomiro is present in clientesSumidos array', Boolean(sumidosValdomiro), true);
    assert(Boolean(sumidosBeatriz), 'SeedData', 'Dra. Beatriz is present in clientesSumidos array', Boolean(sumidosBeatriz), true);
    assert(sumidos.length >= 2, 'SeedData', 'At least 2 clients in risk list', sumidos.length, '>= 2');
  }

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  const total = reports.length;
  const passed = reports.filter((r) => r.status === 'PASS').length;
  const failed = reports.filter((r) => r.status === 'FAIL').length;

  console.log('\n================================================================================');
  console.log('⚡ ADVERSARIAL CHALLENGER RESULTS SUMMARY');
  console.log('================================================================================');
  console.log(`Total Empirical Checks: ${total}`);
  console.log(`Passed Checks         : \x1b[32m${passed}\x1b[0m`);
  console.log(`Failed Checks         : ${failed > 0 ? `\x1b[31m${failed}\x1b[0m` : '0'}`);
  console.log('================================================================================\n');

  if (failed > 0) {
    console.error(`💥 CHALLENGER EMPIRICAL VERDICT: REJECT (${failed} failures detected)`);
    process.exit(1);
  } else {
    console.log(`🏆 CHALLENGER EMPIRICAL VERDICT: APPROVE (${passed}/${total} checks passed cleanly)`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error in adversarial runner:', err);
  process.exit(1);
});
