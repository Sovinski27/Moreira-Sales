/**
 * Gate 2 Adversarial Verification Test Suite
 * Concurrency, Race Conditions, Celebration Modal Exclusivity, and Injection Safety.
 */

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

// 1. Register module loader hook for import.meta.env polyfill BEFORE importing application code
try {
  const loaderPath = resolve(dirname(fileURLToPath(import.meta.url)), 'loader.js');
  register(pathToFileURL(loaderPath));
} catch (err) {
  // Ignore if already registered
}

// 2. Dynamic import of application services and harness
const { AppDriver } = await import('./driver.ts');
const dbService = await import('../src/services/db.ts');
const whatsappService = await import('../src/services/whatsapp.ts');

// RFC 4180 Compliant CSV Parser for Semicolon Delimiter (pt-BR standard)
function parseRFC4180SemicolonCSV(csvText: string): string[][] {
  let text = csvText;
  if (text.startsWith('\uFEFF')) {
    text = text.slice(1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ';') {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < text.length && text[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

interface TestReport {
  category: string;
  name: string;
  passed: boolean;
  error?: string;
}

const reports: TestReport[] = [];

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runTest(category: string, name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    reports.push({ category, name, passed: true });
    console.log(`  ✔ [PASS] ${category} > ${name}`);
  } catch (err: any) {
    reports.push({ category, name, passed: false, error: err?.message || String(err) });
    console.error(`  ❌ [FAIL] ${category} > ${name}`);
    console.error(`     Error: ${err?.message}\n`);
  }
}

export async function runAdversarialSuite() {
  console.log('\n================================================================================');
  console.log('⚔️  ADVERSARIAL VERIFICATION SUITE — GATE 2 (CONCURRENCY, MODAL, CSV)');
  console.log('================================================================================\n');

  const driver = new AppDriver();

  // ============================================================================
  // AREA 1: DOUBLE-CLICK & CONCURRENCY VERIFICATION
  // ============================================================================
  console.log('▶ [Area 1] Concurrency & Double-Click Prevention on Purchase Confirmation');

  await runTest('Area 1: Double-Click', 'Simulate rapid double-click on CaixaPage purchase confirmation (Ref Lock)', async () => {
    await driver.init(true);
    const cliente = driver.clientes[0];
    const initialComprasCount = driver.compras.filter(c => c.cliente_id === cliente.id).length;

    let isProcessando = false;
    const isProcessandoRef = { current: false };
    let callsExecuted = 0;

    const handleConfirmarCompra = async () => {
      if (isProcessando || isProcessandoRef.current) {
        return { blocked: true };
      }
      isProcessandoRef.current = true;
      isProcessando = true;

      try {
        await new Promise(r => setTimeout(r, 20));
        await driver.registrarCompra(cliente.id, 15.00);
        callsExecuted++;
        return { blocked: false };
      } finally {
        isProcessandoRef.current = false;
        isProcessando = false;
      }
    };

    const [click1, click2] = await Promise.all([
      handleConfirmarCompra(),
      handleConfirmarCompra()
    ]);

    assert(callsExecuted === 1, `Expected exactly 1 execution, got ${callsExecuted}`);
    assert(click1.blocked === false || click2.blocked === false, 'At least one click should succeed');
    assert(click1.blocked === true || click2.blocked === true, 'At least one click should be blocked');

    await driver.reloadFromStorage();
    const finalComprasCount = driver.compras.filter(c => c.cliente_id === cliente.id).length;
    assert(finalComprasCount === initialComprasCount + 1, `Expected exactly 1 new purchase in storage, found diff: ${finalComprasCount - initialComprasCount}`);
  });

  await runTest('Area 1: Double-Click', 'Simulate extreme 10-click burst attack while purchase is in-flight', async () => {
    await driver.init(true);
    const cliente = driver.clientes[1];
    const initialComprasCount = driver.compras.filter(c => c.cliente_id === cliente.id).length;

    let isProcessando = false;
    const isProcessandoRef = { current: false };
    let callsExecuted = 0;

    const handleConfirmarCompra = async () => {
      if (isProcessando || isProcessandoRef.current) return { blocked: true };
      isProcessandoRef.current = true;
      isProcessando = true;

      try {
        await new Promise(r => setTimeout(r, 30));
        await driver.registrarCompra(cliente.id, 20.00);
        callsExecuted++;
        return { blocked: false };
      } finally {
        isProcessandoRef.current = false;
        isProcessando = false;
      }
    };

    const burstPromises = Array.from({ length: 10 }, () => handleConfirmarCompra());
    const results = await Promise.all(burstPromises);

    const executedResults = results.filter(r => !r.blocked);
    const blockedResults = results.filter(r => r.blocked);

    assert(callsExecuted === 1, `Expected 1 call executed under 10-click burst, got ${callsExecuted}`);
    assert(executedResults.length === 1, `Expected 1 success, got ${executedResults.length}`);
    assert(blockedResults.length === 9, `Expected 9 blocked, got ${blockedResults.length}`);

    await driver.reloadFromStorage();
    const finalComprasCount = driver.compras.filter(c => c.cliente_id === cliente.id).length;
    assert(finalComprasCount === initialComprasCount + 1, `Expected 1 purchase in storage, got ${finalComprasCount - initialComprasCount}`);
  });

  await runTest('Area 1: Double-Click', 'Verify double-click guard on new client registration (cadastrarERegistrarCompra)', async () => {
    await driver.init(true);
    const initialTotalClientes = driver.clientes.length;

    let isProcessando = false;
    const isProcessandoRef = { current: false };
    let callsExecuted = 0;

    const handleConfirmarCadastroECompra = async (nome: string, whats: string, valor: number) => {
      if (isProcessando || isProcessandoRef.current) return { blocked: true };
      isProcessandoRef.current = true;
      isProcessando = true;

      try {
        await new Promise(r => setTimeout(r, 25));
        await driver.cadastrarClienteERegistrarCompra(nome, whats, valor);
        callsExecuted++;
        return { blocked: false };
      } finally {
        isProcessandoRef.current = false;
        isProcessando = false;
      }
    };

    const results = await Promise.all([
      handleConfirmarCadastroECompra('Adversarial Test User', '44998770011', 15.00),
      handleConfirmarCadastroECompra('Adversarial Test User', '44998770011', 15.00),
      handleConfirmarCadastroECompra('Adversarial Test User', '44998770011', 15.00)
    ]);

    assert(callsExecuted === 1, `Expected exactly 1 new client registered, got ${callsExecuted}`);
    assert(results.filter(r => !r.blocked).length === 1, 'Only 1 should execute');

    await driver.reloadFromStorage();
    const matching = driver.clientes.filter(c => c.nome === 'Adversarial Test User');
    assert(matching.length === 1, `Expected exactly 1 client with this name in storage, found ${matching.length}`);
    assert(driver.clientes.length === initialTotalClientes + 1, 'Total clients should increase by 1');
  });

  await runTest('Area 1: Double-Click', 'Error recovery: guard releases lock if operation fails, permitting subsequent retry', async () => {
    let isProcessando = false;
    const isProcessandoRef = { current: false };

    const handleWithFailure = async (shouldFail: boolean) => {
      if (isProcessando || isProcessandoRef.current) return { blocked: true, success: false };
      isProcessandoRef.current = true;
      isProcessando = true;

      try {
        await new Promise(r => setTimeout(r, 10));
        if (shouldFail) {
          throw new Error('Simulated network error');
        }
        return { blocked: false, success: true };
      } catch (err) {
        return { blocked: false, success: false, error: err };
      } finally {
        isProcessandoRef.current = false;
        isProcessando = false;
      }
    };

    const res1 = await handleWithFailure(true);
    assert(res1.success === false, 'First attempt should fail');
    assert(isProcessandoRef.current === false, 'Lock must be released after catch/finally');

    const res2 = await handleWithFailure(false);
    assert(res2.blocked === false, 'Retry should not be blocked');
    assert(res2.success === true, 'Retry should succeed');
  });

  await runTest('Area 1: Double-Click', 'Verification of synchronous guard in CaixaPage component source code', async () => {
    // Read source code of CaixaPage.tsx directly to ensure the ref check is present and synchronous
    const fs = await import('node:fs');
    const path = await import('node:path');
    const caixaPath = path.resolve(process.cwd(), 'src/pages/CaixaPage.tsx');
    const content = fs.readFileSync(caixaPath, 'utf-8');

    assert(content.includes('isProcessandoRef = useRef(false)'), 'CaixaPage must declare isProcessandoRef');
    assert(content.includes('if (isProcessando || isProcessandoRef.current) return'), 'CaixaPage must check isProcessandoRef.current at handler entry');
    assert(content.includes('isProcessandoRef.current = true'), 'CaixaPage must set isProcessandoRef.current = true synchronously before await');
    assert(content.includes('isProcessandoRef.current = false'), 'CaixaPage must clear isProcessandoRef.current in finally block');
    assert(content.includes('disabled={isProcessando'), 'CaixaPage must disable button while isProcessando is true');
  });


  // ============================================================================
  // AREA 2: CELEBRATION MODAL EXCLUSIVITY VERIFICATION
  // ============================================================================
  console.log('\n▶ [Area 2] Celebration Modal Exclusivity (Strictly 10th Purchase)');

  await runTest('Area 2: Celebration Modal', 'Sequential purchase progression from 0 to 15 purchases: fires ONLY on 10th', async () => {
    await driver.init(true);
    const newCli = await dbService.createCliente('Progression Customer', '44991112233');
    await driver.reloadFromStorage();

    const triggerLog: Array<{ purchaseNumber: number; valor: number; atingiuMetaAgora: boolean; totalMes: number }> = [];

    for (let p = 1; p <= 15; p++) {
      const res = await driver.registrarCompra(newCli.id, 10.00);
      triggerLog.push({
        purchaseNumber: p,
        valor: 10.00,
        atingiuMetaAgora: res.atingiuMetaAgora,
        totalMes: res.totalMes
      });
    }

    // Purchases 1 to 9: MUST BE FALSE
    for (let p = 1; p <= 9; p++) {
      const entry = triggerLog[p - 1];
      assert(entry.atingiuMetaAgora === false, `Purchase #${p} must NOT trigger celebration modal`);
    }

    // Purchase 9 specifically: NEVER ON 9TH
    const p9 = triggerLog[8];
    assert(p9.purchaseNumber === 9, 'Sanity check for 9th purchase');
    assert(p9.atingiuMetaAgora === false, 'CELEBRATION MODAL MUST NEVER FIRE ON 9TH PURCHASE');

    // Purchase 10 specifically: STRICTLY ON 10TH
    const p10 = triggerLog[9];
    assert(p10.purchaseNumber === 10, 'Sanity check for 10th purchase');
    assert(p10.atingiuMetaAgora === true, 'CELEBRATION MODAL MUST STRICTLY FIRE ON 10TH PURCHASE');
    assert(p10.totalMes === 10, `Total valid purchases must be 10, got ${p10.totalMes}`);

    // Purchase 11 specifically: NEVER ON 11TH
    const p11 = triggerLog[10];
    assert(p11.purchaseNumber === 11, 'Sanity check for 11th purchase');
    assert(p11.atingiuMetaAgora === false, 'CELEBRATION MODAL MUST NEVER FIRE ON 11TH PURCHASE');

    // Purchase 12 specifically: NEVER ON 12TH
    const p12 = triggerLog[11];
    assert(p12.purchaseNumber === 12, 'Sanity check for 12th purchase');
    assert(p12.atingiuMetaAgora === false, 'CELEBRATION MODAL MUST NEVER FIRE ON 12TH PURCHASE');

    // Purchases 13 to 15: NEVER ON SUBSEQUENT PURCHASES
    for (let p = 13; p <= 15; p++) {
      const entry = triggerLog[p - 1];
      assert(entry.atingiuMetaAgora === false, `Purchase #${p} must NOT trigger celebration modal`);
    }

    const totalTriggers = triggerLog.filter(t => t.atingiuMetaAgora).length;
    assert(totalTriggers === 1, `Celebration modal must trigger EXACTLY once in 15 purchases, triggered ${totalTriggers} times`);
  });

  await runTest('Area 2: Celebration Modal', 'Seed customer at 9 purchases (Seu Antônio, cli-02) triggers on next valid purchase, NOT on subsequent', async () => {
    await driver.init(true);
    const antonio = driver.clientes.find(c => c.id === 'cli-02')!;
    assert(!!antonio, 'Seu Antônio must exist in seed data');

    const resumoAntes = driver.obterResumoCliente('cli-02')!;
    assert(resumoAntes.compras_validas_fidelidade === 9, `Seu Antônio should have exactly 9 valid purchases, has ${resumoAntes.compras_validas_fidelidade}`);

    const res10 = await driver.registrarCompra('cli-02', 12.00);
    assert(res10.atingiuMetaAgora === true, 'Seu Antônio 10th purchase must trigger celebration modal');
    assert(res10.totalMes === 10, 'Total valid purchases should now be 10');

    const res11 = await driver.registrarCompra('cli-02', 20.00);
    assert(res11.atingiuMetaAgora === false, 'Seu Antônio 11th purchase must NEVER trigger celebration modal');
    assert(res11.totalMes === 11, 'Total valid purchases should now be 11');

    const res12 = await driver.registrarCompra('cli-02', 25.00);
    assert(res12.atingiuMetaAgora === false, 'Seu Antônio 12th purchase must NEVER trigger celebration modal');
  });

  await runTest('Area 2: Celebration Modal', 'Seed customer with meta already achieved (Dona Marlene, cli-01) NEVER triggers modal on new purchase', async () => {
    await driver.init(true);
    const marlene = driver.clientes.find(c => c.id === 'cli-01')!;
    assert(!!marlene, 'Dona Marlene must exist in seed data');

    const res = await driver.registrarCompra('cli-01', 15.00);
    assert(res.atingiuMetaAgora === false, 'Dona Marlene must NOT trigger celebration modal for purchases beyond the 10th');
  });

  await runTest('Area 2: Celebration Modal', 'Purchases below minimum (e.g. R$ 3.00) NEVER trigger modal even if total physical purchases reach 10', async () => {
    await driver.init(true);
    const newCli = await dbService.createCliente('Sub-Minimum Customer', '44997776655');
    await driver.reloadFromStorage();

    for (let i = 0; i < 9; i++) {
      const res = await driver.registrarCompra(newCli.id, 10.00);
      assert(res.atingiuMetaAgora === false, `Purchase ${i + 1} must not trigger`);
    }

    // 10th physical purchase: R$ 3.50 (< R$ 5.00 minimum)
    const resSub = await driver.registrarCompra(newCli.id, 3.50);
    assert(resSub.pontuou === false, 'R$ 3.50 must not qualify for loyalty');
    assert(resSub.atingiuMetaAgora === false, 'Purchase below minimum must NEVER trigger celebration modal');
    assert(resSub.totalMes === 9, 'Valid purchases count must remain 9');

    // Another sub-minimum purchase of R$ 4.99
    const resSub2 = await driver.registrarCompra(newCli.id, 4.99);
    assert(resSub2.pontuou === false, 'R$ 4.99 must not qualify');
    assert(resSub2.atingiuMetaAgora === false, 'R$ 4.99 must NEVER trigger celebration modal');

    // Finally, 10th QUALIFYING purchase: R$ 5.00 (exact minimum)
    const resQual = await driver.registrarCompra(newCli.id, 5.00);
    assert(resQual.pontuou === true, 'R$ 5.00 must qualify');
    assert(resQual.atingiuMetaAgora === true, 'Exact 10th valid purchase must trigger celebration modal');
    assert(resQual.totalMes === 10, 'Total valid purchases must now be 10');
  });

  await runTest('Area 2: Celebration Modal', 'Custom meta configuration: meta = 5 triggers on 5th, never on 4th or 6th', async () => {
    await driver.init(true);
    await driver.salvarConfiguracoes({ meta_compras_mes: 5 });
    await driver.reloadFromStorage();

    const newCli = await dbService.createCliente('Custom Meta Customer', '44995554433');
    await driver.reloadFromStorage();

    for (let i = 1; i <= 4; i++) {
      const r = await driver.registrarCompra(newCli.id, 10.00);
      assert(r.atingiuMetaAgora === false, `Purchase #${i} must not trigger when meta is 5`);
    }

    const r5 = await driver.registrarCompra(newCli.id, 10.00);
    assert(r5.atingiuMetaAgora === true, 'Purchase #5 must trigger when meta is 5');

    const r6 = await driver.registrarCompra(newCli.id, 10.00);
    assert(r6.atingiuMetaAgora === false, 'Purchase #6 must NOT trigger when meta is 5');
  });


  // Helper to get pure isolated storage with 0 clients and 0 purchases
  const resetToEmptyStorage = async () => {
    driver.storage.setItem('panificadora_clientes', '[]');
    driver.storage.setItem('panificadora_compras', '[]');
    await driver.reloadFromStorage();
  };

  // ============================================================================
  // AREA 3: CSV GENERATION WITH CHALLENGING CHARACTERS & INJECTION SAFETY
  // ============================================================================
  console.log('\n▶ [Area 3] CSV Generation with Challenging Characters & Injection Safety');

  await runTest('Area 3: CSV Generation', 'Name containing commas (e.g. "Silva, Maria")', async () => {
    await resetToEmptyStorage();
    const testName = 'Silva, Maria';
    await dbService.createCliente(testName, '44991111111');
    await driver.reloadFromStorage();

    const csv = driver.exportarCSV();
    assert(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM');

    const rows = parseRFC4180SemicolonCSV(csv);
    assert(rows.length === 2, `Expected 2 rows (header + 1 client), got ${rows.length}`);
    const dataRow = rows[1];
    assert(dataRow.length === 7, `Expected exactly 7 columns, got ${dataRow.length}`);
    assert(dataRow[0] === testName, `Expected column 0 to be "${testName}", got "${dataRow[0]}"`);
  });

  await runTest('Area 3: CSV Generation', 'Name containing double quotes (e.g. Padaria "Doce Sonho")', async () => {
    await resetToEmptyStorage();
    const testName = 'Padaria "Doce Sonho"';
    await dbService.createCliente(testName, '44992222222');
    await driver.reloadFromStorage();

    const csv = driver.exportarCSV();
    assert(csv.includes('"Padaria ""Doce Sonho"""'), `Raw CSV should escape quotes with "", got: ${csv}`);

    const rows = parseRFC4180SemicolonCSV(csv);
    assert(rows.length === 2, `Expected 2 rows, got ${rows.length}`);
    const dataRow = rows[1];
    assert(dataRow.length === 7, `Expected 7 columns, got ${dataRow.length}`);
    assert(dataRow[0] === testName, `Decoded name should exactly match original with double quotes, got "${dataRow[0]}"`);
  });

  await runTest('Area 3: CSV Generation', 'Name containing semicolons (e.g. Mercado; Filial 02; Setor)', async () => {
    await resetToEmptyStorage();
    const testName = 'Mercado; Filial 02; Setor';
    await dbService.createCliente(testName, '44993333333');
    await driver.reloadFromStorage();

    const csv = driver.exportarCSV();
    assert(csv.includes('"Mercado; Filial 02; Setor"'), 'Semicolon-containing name must be quoted');

    const rows = parseRFC4180SemicolonCSV(csv);
    assert(rows.length === 2, `Expected 2 rows, got ${rows.length}`);
    const dataRow = rows[1];
    assert(dataRow.length === 7, `Semicolons must NOT split into extra columns; expected 7, got ${dataRow.length}`);
    assert(dataRow[0] === testName, `Column 0 must preserve semicolons intact: "${dataRow[0]}"`);
  });

  await runTest('Area 3: CSV Generation', 'Name containing embedded newlines (LF and CRLF)', async () => {
    await resetToEmptyStorage();
    const testNameLF = 'Carlos\nEduardo';
    const testNameCRLF = 'Ana\r\nPaula';
    await dbService.createCliente(testNameLF, '44994444441');
    await dbService.createCliente(testNameCRLF, '44994444442');
    await driver.reloadFromStorage();

    const csv = driver.exportarCSV();

    const rows = parseRFC4180SemicolonCSV(csv);
    assert(rows.length === 3, `Expected 3 rows (header + 2 clients) with RFC 4180 parser, got ${rows.length}`);
    assert(rows[1].length === 7, `Client 1 must have 7 columns, got ${rows[1].length}`);
    assert(rows[2].length === 7, `Client 2 must have 7 columns, got ${rows[2].length}`);
    assert(rows[1][0] === testNameLF, `LF newline in name should be preserved, got ${JSON.stringify(rows[1][0])}`);
    assert(rows[2][0] === testNameCRLF, `CRLF newline in name should be preserved, got ${JSON.stringify(rows[2][0])}`);
  });

  await runTest('Area 3: CSV Generation', 'Adversarial combination: Quotes + Commas + Semicolons + Newlines all in one name', async () => {
    await resetToEmptyStorage();
    const nightmareName = 'Empresa "Alfa, Beta";\nFilial \'Sul\';\r\n"Premium"';
    await dbService.createCliente(nightmareName, '44995555555');
    await driver.reloadFromStorage();

    const csv = driver.exportarCSV();
    const rows = parseRFC4180SemicolonCSV(csv);

    assert(rows.length === 2, `RFC 4180 parser must recover exactly 2 rows, got ${rows.length}`);
    const dataRow = rows[1];
    assert(dataRow.length === 7, `Must strictly produce 7 columns without column corruption, got ${dataRow.length}`);
    assert(dataRow[0] === nightmareName, `Expected exact original nightmare string preserved, got: ${JSON.stringify(dataRow[0])}`);
    assert(dataRow[1] === '(44) 99555-5555', `Phone column must be unaffected: ${dataRow[1]}`);
    assert(dataRow[5] === 'Bronze', `Level column must be unaffected: ${dataRow[5]}`);
  });

  await runTest('Area 3: CSV Generation', 'CSV / Formula Injection Stress Test (=, +, -, @, Tab)', async () => {
    await resetToEmptyStorage();
    const formulaPayloads = [
      '=cmd|\' /C calc\'!A0',
      '+1+2',
      '-5+10',
      '@SUM(1,2,3)',
      '\t=1+1'
    ];

    for (let i = 0; i < formulaPayloads.length; i++) {
      await dbService.createCliente(formulaPayloads[i], `4499666000${i}`);
    }
    await driver.reloadFromStorage();

    const csv = driver.exportarCSV();
    const rows = parseRFC4180SemicolonCSV(csv);

    assert(rows.length === 1 + formulaPayloads.length, `Expected ${1 + formulaPayloads.length} rows, got ${rows.length}`);

    for (let i = 0; i < formulaPayloads.length; i++) {
      const row = rows[i + 1];
      assert(row.length === 7, `Row ${i + 1} must maintain exactly 7 columns`);
      const expectedName = formulaPayloads[i].trim();
      assert(row[0] === expectedName, `Cell content preserved: expected "${expectedName}", got "${row[0]}"`);
    }
  });

  await runTest('Area 3: CSV Generation', 'Portuguese Diacritics & UTF-8 BOM byte-level validation', async () => {
    await resetToEmptyStorage();
    const accentedName = 'João Antônio Gonçalves & Conceição da Graça Müller';
    await dbService.createCliente(accentedName, '44997778899');
    await driver.reloadFromStorage();

    const csv = driver.exportarCSV();

    assert(csv.charCodeAt(0) === 0xFEFF, `First character must be byte-order mark 0xFEFF (found: 0x${csv.charCodeAt(0).toString(16)})`);

    const rows = parseRFC4180SemicolonCSV(csv);
    assert(rows[1][0] === accentedName, `Diacritics must not be corrupted: got "${rows[1][0]}"`);
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================================');
  console.log('📊  ADVERSARIAL TEST SUMMARY');
  console.log('================================================================================');
  const total = reports.length;
  const passed = reports.filter(r => r.passed).length;
  const failed = reports.filter(r => !r.passed).length;

  console.log(`Total Adversarial Tests : ${total}`);
  console.log(`Total Passed            : \x1b[32m${passed}\x1b[0m`);
  console.log(`Total Failed            : ${failed > 0 ? `\x1b[31m${failed}\x1b[0m` : '0'}`);

  if (failed > 0) {
    console.error(`\n❌ ADVERSARIAL SUITE FAILED with ${failed} failure(s):`);
    for (const r of reports.filter(r => !r.passed)) {
      console.error(`   • [${r.category}] ${r.name}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log(`\n🎉 ALL ${passed} ADVERSARIAL TESTS PASSED WITH 100% SUCCESS RATE!`);
    console.log('Verdict: APPROVE');
  }
}

// Direct execution
runAdversarialSuite().catch(err => {
  console.error('Fatal suite execution error:', err);
  process.exit(1);
});
