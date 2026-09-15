/**
 * Empirical Challenger Verification Suite - Gate 2
 * Standalone Adversarial Verification Script
 *
 * Checks:
 * 1. Purchase values: 0.00, 4.99, 5.00, 5.01, negative, decimals, large numbers.
 * 2. Churn detection thresholds: 14 vs 15 days, 29 vs 30 days, 4 vs 5 prev month purchases.
 * 3. Keyboard shortcuts (F1, F2, Escape) and AwardModal dismissal.
 * 4. Production SeedData compliance and live state transitions.
 */

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

// Polyfill loader for Vite env
try {
  const loaderPath = resolve(dirname(fileURLToPath(import.meta.url)), 'loader.js');
  register(pathToFileURL(loaderPath));
} catch (err) {
  // Ignore if already registered
}

import React from 'react';
import { setupBrowserEnvironment, mountComponent } from './harness.ts';
import { AppDriver } from './driver.ts';
import * as loyaltyEngine from '../src/services/loyaltyEngine.ts';
import * as dbService from '../src/services/db.ts';
import { AwardModal } from '../src/components/AwardModal.tsx';
import { App } from '../src/App.tsx';
import { LoyaltyProvider } from '../src/context/LoyaltyContext.tsx';
import { CaixaPage } from '../src/pages/CaixaPage.tsx';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  actual?: any;
  expected?: any;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, category: string, name: string, details?: string, actual?: any, expected?: any) {
  if (condition) {
    results.push({ category, name, passed: true });
    console.log(`  ✔ [PASS] ${category} > ${name}`);
  } else {
    results.push({ category, name, passed: false, error: details, actual, expected });
    console.error(`  ❌ [FAIL] ${category} > ${name}: ${details} (Actual: ${JSON.stringify(actual)}, Expected: ${JSON.stringify(expected)})`);
  }
}

function triggerReactInputChange(input: HTMLInputElement, value: string) {
  const tracker = (input as any)._valueTracker;
  if (tracker) {
    tracker.setValue('___PREV_VAL___');
  }
  const prototype = Object.getPrototypeOf(input);
  const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (nativeSetter) {
    nativeSetter.call(input, value);
  } else {
    input.value = value;
  }
  input.dispatchEvent(new (globalThis as any).window.Event('input', { bubbles: true }));
  input.dispatchEvent(new (globalThis as any).window.Event('change', { bubbles: true }));
}

async function runEmpiricalVerification() {
  console.log('================================================================================');
  console.log('🔬 EMPIRICAL CHALLENGER GATE 2 ADVERSARIAL VERIFICATION SUITE');
  console.log('================================================================================\n');

  const env = setupBrowserEnvironment();
  const driver = new AppDriver();
  await driver.init(true);

  const testConfig = {
    id: 1,
    meta_compras_mes: 10,
    valor_minimo_pontuacao: 5.00,
    premio_descricao: 'Café Especial + Pão na Chapa',
    mensagem_whatsapp: 'Olá {NOME}, você completou {COMPRAS} compras e ganhou {PREMIO}!',
    mensagem_resgate: 'Olá {NOME}, estamos com saudades!'
  };

  const fixedRefDate = new Date(2026, 8, 15, 12, 0, 0); // 2026-09-15 12:00:00

  // ============================================================================
  // SECTION 1: PURCHASE VALUES BOUNDARY FUZZING (0.00, 4.99, 5.00, 5.01, negative, decimals, large)
  // ============================================================================
  console.log('▶ [1/4] Boundary Fuzzing: Purchase Values (0.00, 4.99, 5.00, 5.01, negative, decimals, large numbers)...');

  // Test 1.1: 0.00 Purchase Value
  {
    const evalZero = loyaltyEngine.avaliarCompra({ compras_validas_fidelidade: 5 } as any, 0.00, testConfig);
    assert(evalZero.pontuou === false, 'Purchase Values', '0.00 does not qualify for points (pontuou = false)', evalZero.pontuou, false);
    assert(evalZero.totalValidasAtualizado === 5, 'Purchase Values', '0.00 does not increment valid purchases count', evalZero.totalValidasAtualizado, 5);
    assert(evalZero.atingiuMetaAgora === false, 'Purchase Values', '0.00 does not trigger celebration', evalZero.atingiuMetaAgora, false);

    // Engine resumos with 0.00 purchase
    const cliTest = { ...driver.clientes[0], id: 'cli-val-0' };
    const compras0 = [{
      id: 'c-0',
      cliente_id: 'cli-val-0',
      valor: 0.00,
      data_compra: '2026-09-15',
      criado_em: '2026-09-15T10:00:00Z',
      pontuou_fidelidade: false
    }];
    const res = loyaltyEngine.calcularResumosMensais([cliTest], compras0, testConfig, fixedRefDate)[0];
    assert(res.compras_mes_atual === 1, 'Purchase Values', '0.00 purchase is recorded in monthly total purchases', res.compras_mes_atual, 1);
    assert(res.compras_validas_fidelidade === 0, 'Purchase Values', '0.00 purchase awards 0 valid fidelity points', res.compras_validas_fidelidade, 0);
    assert(res.valor_total_mes === 0.00, 'Purchase Values', '0.00 purchase contributes 0 to total turnover', res.valor_total_mes, 0.00);
  }

  // Test 1.2: 4.99 Purchase Value (Just below minimum threshold)
  {
    const eval499 = loyaltyEngine.avaliarCompra({ compras_validas_fidelidade: 9 } as any, 4.99, testConfig);
    assert(eval499.pontuou === false, 'Purchase Values', '4.99 is strictly below R$ 5.00 (pontuou = false)', eval499.pontuou, false);
    assert(eval499.totalValidasAtualizado === 9, 'Purchase Values', '4.99 does NOT increment 9 to 10', eval499.totalValidasAtualizado, 9);
    assert(eval499.atingiuMetaAgora === false, 'Purchase Values', '4.99 does NOT trigger celebration even when customer is at 9', eval499.atingiuMetaAgora, false);

    const cliTest = { ...driver.clientes[0], id: 'cli-val-499' };
    const compras499 = [{
      id: 'c-499',
      cliente_id: 'cli-val-499',
      valor: 4.99,
      data_compra: '2026-09-15',
      criado_em: '2026-09-15T10:00:00Z',
      pontuou_fidelidade: false
    }];
    const res = loyaltyEngine.calcularResumosMensais([cliTest], compras499, testConfig, fixedRefDate)[0];
    assert(res.compras_validas_fidelidade === 0, 'Purchase Values', '4.99 awards 0 fidelity points', res.compras_validas_fidelidade, 0);
    assert(res.valor_total_mes === 4.99, 'Purchase Values', '4.99 is included in gross monthly turnover', res.valor_total_mes, 4.99);
  }

  // Test 1.3: 5.00 Purchase Value (Exact minimum threshold)
  {
    const eval500 = loyaltyEngine.avaliarCompra({ compras_validas_fidelidade: 9 } as any, 5.00, testConfig);
    assert(eval500.pontuou === true, 'Purchase Values', '5.00 qualifies for points (exact threshold == 5.00)', eval500.pontuou, true);
    assert(eval500.totalValidasAtualizado === 10, 'Purchase Values', '5.00 increments valid purchases from 9 to 10', eval500.totalValidasAtualizado, 10);
    assert(eval500.atingiuMetaAgora === true, 'Purchase Values', '5.00 triggers celebration when reaching meta (10)', eval500.atingiuMetaAgora, true);

    const cliTest = { ...driver.clientes[0], id: 'cli-val-500' };
    const compras500 = [{
      id: 'c-500',
      cliente_id: 'cli-val-500',
      valor: 5.00,
      data_compra: '2026-09-15',
      criado_em: '2026-09-15T10:00:00Z',
      pontuou_fidelidade: true
    }];
    const res = loyaltyEngine.calcularResumosMensais([cliTest], compras500, testConfig, fixedRefDate)[0];
    assert(res.compras_validas_fidelidade === 1, 'Purchase Values', '5.00 purchase awards 1 fidelity point', res.compras_validas_fidelidade, 1);
    assert(res.valor_total_mes === 5.00, 'Purchase Values', '5.00 contributes 5.00 to monthly turnover', res.valor_total_mes, 5.00);
  }

  // Test 1.4: 5.01 Purchase Value (Just above minimum threshold)
  {
    const eval501 = loyaltyEngine.avaliarCompra({ compras_validas_fidelidade: 0 } as any, 5.01, testConfig);
    assert(eval501.pontuou === true, 'Purchase Values', '5.01 qualifies for points (> 5.00)', eval501.pontuou, true);
    assert(eval501.totalValidasAtualizado === 1, 'Purchase Values', '5.01 increments valid purchases count to 1', eval501.totalValidasAtualizado, 1);
    assert(eval501.atingiuMetaAgora === false, 'Purchase Values', '5.01 on 1st purchase does not trigger celebration', eval501.atingiuMetaAgora, false);
  }

  // Test 1.5: Negative Purchase Values (-0.01, -5.00, -100.00)
  {
    const evalNeg1 = loyaltyEngine.avaliarCompra({ compras_validas_fidelidade: 5 } as any, -0.01, testConfig);
    assert(evalNeg1.pontuou === false, 'Purchase Values', 'Negative value -0.01 does not qualify for points', evalNeg1.pontuou, false);
    assert(evalNeg1.totalValidasAtualizado === 5, 'Purchase Values', 'Negative value -0.01 leaves valid count unchanged', evalNeg1.totalValidasAtualizado, 5);

    const evalNeg2 = loyaltyEngine.avaliarCompra({ compras_validas_fidelidade: 9 } as any, -5.00, testConfig);
    assert(evalNeg2.pontuou === false, 'Purchase Values', 'Negative value -5.00 does not qualify for points', evalNeg2.pontuou, false);
    assert(evalNeg2.atingiuMetaAgora === false, 'Purchase Values', 'Negative value never triggers celebration', evalNeg2.atingiuMetaAgora, false);
  }

  // Test 1.6: Decimal Handling and Rounding
  {
    env.storage.clear();
    const c1 = await dbService.registerCompra('cli-01', 5.004, true);
    assert(c1.valor === 5.00, 'Purchase Values', 'dbService rounds 5.004 to 5.00', c1.valor, 5.00);

    const c2 = await dbService.registerCompra('cli-01', 5.006, true);
    assert(c2.valor === 5.01, 'Purchase Values', 'dbService rounds 5.006 to 5.01', c2.valor, 5.01);

    // Summing multiple floating point values: 10 * 0.10 + 10 * 5.00
    const floatCompras = [
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `fc-${i}`,
        cliente_id: 'cli-float',
        valor: 0.10,
        data_compra: '2026-09-15',
        criado_em: '2026-09-15T10:00:00Z',
        pontuou_fidelidade: false
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `fc-val-${i}`,
        cliente_id: 'cli-float',
        valor: 5.00,
        data_compra: '2026-09-15',
        criado_em: '2026-09-15T10:00:00Z',
        pontuou_fidelidade: true
      }))
    ];
    const cliFloat = { ...driver.clientes[0], id: 'cli-float' };
    const rFloat = loyaltyEngine.calcularResumosMensais([cliFloat], floatCompras, testConfig, fixedRefDate)[0];
    assert(rFloat.compras_validas_fidelidade === 10, 'Purchase Values', 'Floating test: exactly 10 valid purchases', rFloat.compras_validas_fidelidade, 10);
    assert(rFloat.compras_mes_atual === 20, 'Purchase Values', 'Floating test: 20 total purchases', rFloat.compras_mes_atual, 20);
    // Notice: floating point drift in JS 10 * 0.10 + 10 * 5.00 can be 51.00000000000001; verify it calculates without corruption
    assert(Math.abs(rFloat.valor_total_mes - 51.00) < 0.001, 'Purchase Values', 'Turnover matches 51.00 within precision', rFloat.valor_total_mes, 51.00);
  }

  // Test 1.7: Large Numbers
  {
    const evalLarge = loyaltyEngine.avaliarCompra({ compras_validas_fidelidade: 0 } as any, 999999.99, testConfig);
    assert(evalLarge.pontuou === true, 'Purchase Values', 'Large value 999,999.99 qualifies for points', evalLarge.pontuou, true);
    assert(evalLarge.totalValidasAtualizado === 1, 'Purchase Values', 'Large value increments valid count to 1', evalLarge.totalValidasAtualizado, 1);

    const cLarge = await dbService.registerCompra('cli-01', 999999.99, true);
    assert(cLarge.valor === 999999.99, 'Purchase Values', 'dbService correctly stores large value 999999.99', cLarge.valor, 999999.99);

    const c10M = await dbService.registerCompra('cli-01', 10000000.00, true);
    assert(c10M.valor === 10000000.00, 'Purchase Values', 'dbService correctly stores 10,000,000.00', c10M.valor, 10000000.00);
  }

  // ============================================================================
  // SECTION 2: CHURN DETECTION THRESHOLDS (14 vs 15 days, 29 vs 30 days)
  // ============================================================================
  console.log('\n▶ [2/4] Boundary Fuzzing: Churn Detection Thresholds (14 vs 15 days, 29 vs 30 days)...');

  // Test 2.1: 14 Days Absence (NOT CHURN)
  {
    const churn14 = loyaltyEngine.calcularStatusChurn(5, 14);
    assert(churn14.statusChurn === false, 'Churn Thresholds', '14 days absence is NOT churn (statusChurn = false)', churn14.statusChurn, false);
    assert(churn14.urgencia === undefined, 'Churn Thresholds', '14 days absence has no urgency label', churn14.urgencia, undefined);
  }

  // Test 2.2: 15 Days Absence (CHURN AMARELO)
  {
    const churn15 = loyaltyEngine.calcularStatusChurn(5, 15);
    assert(churn15.statusChurn === true, 'Churn Thresholds', '15 days absence TRIGGERS churn (statusChurn = true)', churn15.statusChurn, true);
    assert(churn15.urgencia === 'amarelo', 'Churn Thresholds', '15 days absence is classified as AMARELO', churn15.urgencia, 'amarelo');
  }

  // Test 2.3: 29 Days Absence (UPPER BOUNDARY OF AMARELO)
  {
    const churn29 = loyaltyEngine.calcularStatusChurn(5, 29);
    assert(churn29.statusChurn === true, 'Churn Thresholds', '29 days absence triggers churn', churn29.statusChurn, true);
    assert(churn29.urgencia === 'amarelo', 'Churn Thresholds', '29 days absence is STILL classified as AMARELO (< 30 days)', churn29.urgencia, 'amarelo');
  }

  // Test 2.4: 30 Days Absence (LOWER BOUNDARY OF VERMELHO)
  {
    const churn30 = loyaltyEngine.calcularStatusChurn(5, 30);
    assert(churn30.statusChurn === true, 'Churn Thresholds', '30 days absence triggers churn', churn30.statusChurn, true);
    assert(churn30.urgencia === 'vermelho', 'Churn Thresholds', '30 days absence TRANSITIONS to VERMELHO (>= 30 days)', churn30.urgencia, 'vermelho');
  }

  // Test 2.5: 31 Days Absence & Beyond (VERMELHO)
  {
    const churn31 = loyaltyEngine.calcularStatusChurn(5, 31);
    assert(churn31.statusChurn === true, 'Churn Thresholds', '31 days absence triggers churn', churn31.statusChurn, true);
    assert(churn31.urgencia === 'vermelho', 'Churn Thresholds', '31 days absence is VERMELHO', churn31.urgencia, 'vermelho');

    const churn90 = loyaltyEngine.calcularStatusChurn(10, 90);
    assert(churn90.statusChurn === true, 'Churn Thresholds', '90 days absence triggers churn', churn90.statusChurn, true);
    assert(churn90.urgencia === 'vermelho', 'Churn Thresholds', '90 days absence is VERMELHO', churn90.urgencia, 'vermelho');
  }

  // Test 2.6: Previous Month Purchase Count Threshold (4 vs 5)
  {
    const churnPrev4 = loyaltyEngine.calcularStatusChurn(4, 25);
    assert(churnPrev4.statusChurn === false, 'Churn Thresholds', '4 purchases in previous month does NOT trigger churn even if absent 25 days', churnPrev4.statusChurn, false);
    assert(churnPrev4.urgencia === undefined, 'Churn Thresholds', 'No urgency when prev month purchases < 5', churnPrev4.urgencia, undefined);

    const churnPrev5 = loyaltyEngine.calcularStatusChurn(5, 25);
    assert(churnPrev5.statusChurn === true, 'Churn Thresholds', '5 purchases in previous month TRIGGERS churn when absent 25 days', churnPrev5.statusChurn, true);
    assert(churnPrev5.urgencia === 'amarelo', 'Churn Thresholds', 'Urgency is amarelo for 25 days', churnPrev5.urgencia, 'amarelo');
  }

  // Test 2.7: Same Day Purchase (0 days absence)
  {
    const churnToday = loyaltyEngine.calcularStatusChurn(10, 0);
    assert(churnToday.statusChurn === false, 'Churn Thresholds', '0 days absence (purchase today) is NOT churn', churnToday.statusChurn, false);
  }

  // Test 2.8: Inactive Client Flag (`ativo: false`) Excludes from Churn
  {
    const inactiveCli = { ...driver.clientes[0], id: 'cli-inactive', ativo: false };
    const comprasInactive = [
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `ci-prev-${i}`,
        cliente_id: 'cli-inactive',
        valor: 15.00,
        data_compra: '2026-08-10',
        criado_em: '2026-08-10T10:00:00Z',
        pontuou_fidelidade: true
      }))
    ];
    const resInactive = loyaltyEngine.calcularResumosMensais([inactiveCli], comprasInactive, testConfig, fixedRefDate)[0];
    assert(resInactive.status_churn === false, 'Churn Thresholds', 'Inactive client (ativo: false) is suppressed from churn alert', resInactive.status_churn, false);
  }

  // ============================================================================
  // SECTION 3: KEYBOARD SHORTCUTS & AWARDMODAL DISMISSAL
  // ============================================================================
  console.log('\n▶ [3/4] Keyboard Shortcuts (F1, F2, Escape) and AwardModal Dismissal...');

  // Test 3.1: F1 switches to CaixaPage and calls preventDefault
  {
    const mountedApp = await mountComponent(React.createElement(App));
    // Initial view is CaixaPage
    assert(mountedApp.container.textContent.includes('Frente de Caixa'), 'Shortcuts', 'Initial view contains "Frente de Caixa"');

    // Switch to Admin via F2
    const eventF2 = new (globalThis as any).window.KeyboardEvent('keydown', { key: 'F2', cancelable: true });
    await (React as any).act(async () => {
      (globalThis as any).window.dispatchEvent(eventF2);
    });
    assert(eventF2.defaultPrevented === true, 'Shortcuts', 'F2 keydown calls e.preventDefault()', eventF2.defaultPrevented, true);
    assert(mountedApp.container.textContent.includes('Painel do Dono'), 'Shortcuts', 'F2 switches view to Admin Dashboard ("Painel do Dono")');

    // Switch back to Caixa via F1
    const eventF1 = new (globalThis as any).window.KeyboardEvent('keydown', { key: 'F1', cancelable: true });
    await (React as any).act(async () => {
      (globalThis as any).window.dispatchEvent(eventF1);
    });
    assert(eventF1.defaultPrevented === true, 'Shortcuts', 'F1 keydown calls e.preventDefault()', eventF1.defaultPrevented, true);
    assert(mountedApp.container.textContent.includes('Frente de Caixa'), 'Shortcuts', 'F1 switches view back to Caixa ("Frente de Caixa")');

    // Unmapped function keys (F3, F4, F5) do NOT call preventDefault
    for (const key of ['F3', 'F4', 'F5']) {
      const eventFn = new (globalThis as any).window.KeyboardEvent('keydown', { key, cancelable: true });
      await (React as any).act(async () => {
        (globalThis as any).window.dispatchEvent(eventFn);
      });
      assert(eventFn.defaultPrevented === false, 'Shortcuts', `Key ${key} does NOT call preventDefault()`, eventFn.defaultPrevented, false);
    }

    mountedApp.unmount();
  }

  // Test 3.2: Escape Key Dismisses AwardModal
  {
    let modalClosedViaEsc = false;
    const testCliente = driver.clientes[0];

    const mountedModal = await mountComponent(
      React.createElement(AwardModal, {
        cliente: testCliente,
        comprasMes: 10,
        config: testConfig,
        onClose: () => {
          modalClosedViaEsc = true;
        }
      })
    );

    assert(mountedModal.container.textContent.includes('PARABÉNS AO CLIENTE'), 'Modal Dismissal', 'AwardModal renders celebration headline');

    const eventEsc = new (globalThis as any).window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    await (React as any).act(async () => {
      (globalThis as any).window.dispatchEvent(eventEsc);
    });

    assert(eventEsc.defaultPrevented === true, 'Modal Dismissal', 'Escape key calls e.preventDefault() on AwardModal', eventEsc.defaultPrevented, true);
    assert(modalClosedViaEsc === true, 'Modal Dismissal', 'Escape key triggers AwardModal onClose callback', modalClosedViaEsc, true);

    mountedModal.unmount();
  }

  // Test 3.3: Action Button Dismisses AwardModal ("Brinde Entregue! Próximo Atendimento")
  {
    let modalClosedViaBtn = false;
    const testCliente = driver.clientes[0];

    const mountedModal = await mountComponent(
      React.createElement(AwardModal, {
        cliente: testCliente,
        comprasMes: 10,
        config: testConfig,
        onClose: () => {
          modalClosedViaBtn = true;
        }
      })
    );

    const closeBtn = mountedModal.container.querySelector('button');
    assert(Boolean(closeBtn), 'Modal Dismissal', 'AwardModal has close action button');
    assert(closeBtn.textContent.includes('Brinde Entregue'), 'Modal Dismissal', 'Close button text contains "Brinde Entregue"');

    await (React as any).act(async () => {
      closeBtn.click();
    });

    assert(modalClosedViaBtn === true, 'Modal Dismissal', 'Clicking "Brinde Entregue" button triggers onClose', modalClosedViaBtn, true);

    mountedModal.unmount();
  }

  // Test 3.4: "Limpar (ESC)" Button and ESC shortcut on CaixaPage
  {
    const mountedCaixa = await mountComponent(
      React.createElement(LoyaltyProvider, null, React.createElement(CaixaPage))
    );

    const inputWhats = mountedCaixa.container.querySelector('#whatsapp-input') as HTMLInputElement;
    assert(Boolean(inputWhats), 'Caixa Form', 'WhatsApp phone input #whatsapp-input is rendered');
    assert(mountedCaixa.container.textContent.includes('Limpar (ESC)') === false, 'Caixa Form', 'Button "Limpar (ESC)" is not present when phone input is empty');

    // Simulate typing a phone number
    await (React as any).act(async () => {
      triggerReactInputChange(inputWhats, '44999998888');
    });

    // Button "Limpar (ESC)" is now rendered in the DOM
    assert(mountedCaixa.container.textContent.includes('Limpar (ESC)') === true, 'Caixa Form', 'Button "Limpar (ESC)" is rendered when phone input is populated');

    // Search client helper verification
    const searchExisting = driver.buscarClientePorTelefone('44998765432');
    assert(searchExisting.match !== null, 'Caixa Form', 'Existing phone resolves to client');

    const searchNew = driver.buscarClientePorTelefone('44999998888');
    assert(searchNew.isNovoCliente === true, 'Caixa Form', 'Unregistered phone marks isNovoCliente = true');

    // Press Escape key on window
    const eventEsc = new (globalThis as any).window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    await (React as any).act(async () => {
      (globalThis as any).window.dispatchEvent(eventEsc);
    });

    // Form is reset
    assert(inputWhats.value === '', 'Caixa Form', 'ESC resets phone input to empty string');
    assert(mountedCaixa.container.textContent.includes('Limpar (ESC)') === false, 'Caixa Form', 'Button "Limpar (ESC)" is hidden after ESC reset');

    // Also test clicking the "Limpar (ESC)" button directly
    await (React as any).act(async () => {
      triggerReactInputChange(inputWhats, '44998765432');
    });
    assert(mountedCaixa.container.textContent.includes('Limpar (ESC)') === true, 'Caixa Form', 'Button "Limpar (ESC)" reappears after entering phone');

    const limparBtn = Array.from(mountedCaixa.container.querySelectorAll('button') as HTMLButtonElement[]).find((b: HTMLButtonElement) => b.textContent?.includes('Limpar (ESC)'));
    assert(Boolean(limparBtn), 'Caixa Form', 'Found "Limpar (ESC)" button in DOM');

    await (React as any).act(async () => {
      limparBtn?.click();
    });

    assert(inputWhats.value === '', 'Caixa Form', 'Clicking "Limpar (ESC)" button resets phone input to empty');

    mountedCaixa.unmount();
  }

  // ============================================================================
  // SECTION 4: PRODUCTION SEED DATA & INTEGRITY VERIFICATION
  // ============================================================================
  console.log('\n▶ [4/4] Production SeedData Compliance & Integrity Verification...');
  {
    await driver.init(true);

    // Dona Marlene (cli-01) - Goal reached
    const marlene = driver.obterResumoCliente('cli-01');
    assert(Boolean(marlene), 'SeedData', 'Dona Marlene (cli-01) exists');
    assert(marlene!.atingiu_meta === true, 'SeedData', 'Dona Marlene has atingiu_meta = true', marlene!.atingiu_meta, true);
    assert(marlene!.compras_validas_fidelidade >= 10, 'SeedData', `Dona Marlene has >= 10 valid purchases (actual: ${marlene!.compras_validas_fidelidade})`, true, true);

    // Seu Antônio (cli-02) - Exactly 1 away from goal
    const antonio = driver.obterResumoCliente('cli-02');
    assert(Boolean(antonio), 'SeedData', 'Seu Antônio (cli-02) exists');
    assert(antonio!.compras_validas_fidelidade === 9, 'SeedData', 'Seu Antônio has exactly 9 valid purchases', antonio!.compras_validas_fidelidade, 9);
    assert(antonio!.atingiu_meta === false, 'SeedData', 'Seu Antônio has atingiu_meta = false (not yet reached)', antonio!.atingiu_meta, false);

    // Sr. Valdomiro (cli-07) - Churn Amarelo
    const valdomiro = driver.obterResumoCliente('cli-07');
    assert(Boolean(valdomiro), 'SeedData', 'Sr. Valdomiro (cli-07) exists');
    assert(valdomiro!.status_churn === true, 'SeedData', 'Sr. Valdomiro is classified as churn in risk', valdomiro!.status_churn, true);
    assert(valdomiro!.urgencia_churn === 'amarelo', 'SeedData', 'Sr. Valdomiro urgency is AMARELO', valdomiro!.urgencia_churn, 'amarelo');
    assert(valdomiro!.dias_sem_comprar >= 15 && valdomiro!.dias_sem_comprar < 30, 'SeedData', `Sr. Valdomiro absence is in [15, 29] (actual: ${valdomiro!.dias_sem_comprar})`, true, true);
    assert(valdomiro!.compras_mes_anterior >= 5, 'SeedData', 'Sr. Valdomiro had >= 5 purchases in previous month', valdomiro!.compras_mes_anterior, '>= 5');

    // Dra. Beatriz (cli-08) - Churn Vermelho
    const beatriz = driver.obterResumoCliente('cli-08');
    assert(Boolean(beatriz), 'SeedData', 'Dra. Beatriz (cli-08) exists');
    assert(beatriz!.status_churn === true, 'SeedData', 'Dra. Beatriz is classified as churn in risk', beatriz!.status_churn, true);
    assert(beatriz!.urgencia_churn === 'vermelho', 'SeedData', 'Dra. Beatriz urgency is VERMELHO', beatriz!.urgencia_churn, 'vermelho');
    assert(beatriz!.dias_sem_comprar >= 30, 'SeedData', `Dra. Beatriz absence is >= 30 (actual: ${beatriz!.dias_sem_comprar})`, true, true);
    assert(beatriz!.compras_mes_anterior >= 5, 'SeedData', 'Dra. Beatriz had >= 5 purchases in previous month', beatriz!.compras_mes_anterior, '>= 5');

    // Churn filter: Todos, Amarelo, Vermelho
    const sumidos = driver.clientesSumidos;
    assert(sumidos.length >= 2, 'SeedData', 'At least 2 clients in churn list', sumidos.length, '>= 2');
    const amarelos = sumidos.filter(s => s.urgencia_churn === 'amarelo');
    const vermelhos = sumidos.filter(s => s.urgencia_churn === 'vermelho');
    assert(amarelos.some(s => s.cliente.id === 'cli-07'), 'SeedData', 'Amarelo filter contains Sr. Valdomiro');
    assert(vermelhos.some(s => s.cliente.id === 'cli-08'), 'SeedData', 'Vermelho filter contains Dra. Beatriz');

    // Marking contact updates date and reflects immediately
    await driver.marcarContatoRealizado('cli-07');
    const valdomiroUpdated = driver.obterResumoCliente('cli-07');
    assert(Boolean(valdomiroUpdated?.ultimo_contato), 'SeedData', 'Marking contact sets ultimo_contato date immediately');
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================================');
  console.log('📊 EMPIRICAL VERIFICATION SUMMARY - GATE 2');
  console.log('================================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Empirical Checks : ${total}`);
  console.log(`Total Passed           : \x1b[32m${passed}\x1b[0m`);
  console.log(`Total Failed           : ${failed > 0 ? `\x1b[31m${failed}\x1b[0m` : '0'}`);

  if (failed > 0) {
    console.error(`\n❌ VERDICT: REJECT (${failed} failures detected)`);
    process.exit(1);
  } else {
    console.log(`\n🎉 ALL ${passed} EMPIRICAL CHECKS PASSED WITH 100% SUCCESS RATE!`);
    console.log('VERDICT: APPROVE');
    process.exit(0);
  }
}

runEmpiricalVerification().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
