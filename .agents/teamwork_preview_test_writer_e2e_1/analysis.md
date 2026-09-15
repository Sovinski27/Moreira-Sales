# E2E Test Suite Analysis & Architecture Plan

**Agent**: `teamwork_preview_test_writer_e2e_1`  
**Date**: 2026-09-11  
**Target**: Bakery CRM & Loyalty MVP (Panificadora Umuarama-PR)  
**Specification Sources**: `ORIGINAL_REQUEST.md`, `PROJECT.md`  

---

## 1. Executive Summary

This document specifies the end-to-end (E2E) testing architecture, coverage matrix, and execution model for the Panificadora CRM & Fidelização MVP. The test suite is designed as a comprehensive, opaque-box validation suite exercising the application through its public interfaces, business logic contracts, data flows, UI state handlers, and storage layers across all 19 features (F01 to F19).

The suite is structured into 4 distinct test tiers:
- **Tier 1: Feature Coverage (95 tests)**: 5 tests per feature covering isolated happy paths for all 19 features.
- **Tier 2: Boundary & Corner Cases (95 tests)**: 5 tests per feature covering limits, zeroes, empty inputs, negative values, thresholds, and edge conditions.
- **Tier 3: Cross-Feature Combinations (20 tests)**: Pairwise interactions across cash register, loyalty scoring, churn radar, configuration sync, and reporting.
- **Tier 4: Real-World Application Scenarios (10 tests)**: Comprehensive, multi-step customer journeys modeling day-to-day bakery operations.

**Total Planned Tests: 220 tests**

---

## 2. Feature Mapping & Authoritative Source Matrix

| ID | Feature Name | Tier 1 (Happy) | Tier 2 (Boundaries) | Tier 3 (Pairs) | Tier 4 (Journeys) | Spec Source |
|---|---|---|---|---|---|---|
| F01 | 6 Valores Rápidos | T1.F01.1–5 (5) | T2.F01.1–5 (5) | F01+F05, F01+F02 | Scenario 1, 10 | PROJECT.md R1, R3 |
| F02 | Limpar (ESC) & Atalho ESC | T1.F02.1–5 (5) | T2.F02.1–5 (5) | F02+F17, F02+F18 | Scenario 10 | PROJECT.md R1, R3 |
| F03 | Busca em Tempo Real & Cadastro Relâmpago | T1.F03.1–5 (5) | T2.F03.1–5 (5) | F03+F04, F03+F12 | Scenario 1, 4 | PROJECT.md R1, R3 |
| F04 | Confirmar Compra | T1.F04.1–5 (5) | T2.F04.1–5 (5) | F04+F17, F04+F11 | Scenario 1, 2, 3 | PROJECT.md R1, R2 |
| F05 | Regra de Compra Mínima (R$ 5,00) | T1.F05.1–5 (5) | T2.F05.1–5 (5) | F05+F07, F05+F14 | Scenario 5 | PROJECT.md R2 |
| F06 | Zeramento Mensal Automático | T1.F06.1–5 (5) | T2.F06.1–5 (5) | F06+F11 | Scenario 7 | PROJECT.md R2 |
| F07 | Níveis de Engajamento (Bronze/Prata/Ouro) | T1.F07.1–5 (5) | T2.F07.1–5 (5) | F07+F05 | Scenario 2, 7 | PROJECT.md R2 |
| F08 | Anti-Churn & Urgências (Amarelo/Vermelho) | T1.F08.1–5 (5) | T2.F08.1–5 (5) | F08+F10, F08+F13 | Scenario 6, 9 | PROJECT.md R2 |
| F09 | Conformidade do SeedData | T1.F09.1–5 (5) | T2.F09.1–5 (5) | F09+F15 | Scenario 9 | PROJECT.md R2 |
| F10 | Marcação de Contato Realizado | T1.F10.1–5 (5) | T2.F10.1–5 (5) | F10+F08 | Scenario 6 | PROJECT.md R1, R2 |
| F11 | KPIs do Admin & Ranking Mensal | T1.F11.1–5 (5) | T2.F11.1–5 (5) | F11+F04, F11+F06 | Scenario 7 | PROJECT.md R1, R3 |
| F12 | Exportação CSV / Excel | T1.F12.1–5 (5) | T2.F12.1–5 (5) | F12+F03, F12+F19 | Scenario 7 | PROJECT.md R1, R3 |
| F13 | Filtro Anti-Churn & Resgate WhatsApp | T1.F13.1–5 (5) | T2.F13.1–5 (5) | F13+F16, F13+F08 | Scenario 6 | PROJECT.md R1, R2, R3 |
| F14 | Configurações Editáveis | T1.F14.1–5 (5) | T2.F14.1–5 (5) | F14+F05, F14+F17 | Scenario 8 | PROJECT.md R1, R3 |
| F15 | Restaurar Demonstração | T1.F15.1–5 (5) | T2.F15.1–5 (5) | F15+F09, F15+F08 | Scenario 9 | PROJECT.md R1, R3 |
| F16 | Links do WhatsApp (wa.me) | T1.F16.1–5 (5) | T2.F16.1–5 (5) | F16+F17, F16+F13 | Scenario 2, 6 | PROJECT.md R1, R3 |
| F17 | Gatilho de Premiação & Confetti | T1.F17.1–5 (5) | T2.F17.1–5 (5) | F17+F04, F17+F14 | Scenario 2, 3 | PROJECT.md R2, R3 |
| F18 | Atalhos F1 e F2 | T1.F18.1–5 (5) | T2.F18.1–5 (5) | F18+F02 | Scenario 6, 10 | PROJECT.md R3 |
| F19 | Qualidade, Build & pt-BR | T1.F19.1–5 (5) | T2.F19.1–5 (5) | F19+F12 | Build audit | PROJECT.md R4 |

---

## 3. Test Architecture & Runner Design

### 3.1 Directory Layout
```
e2e/
├── harness.ts         # Lightweight DOM/Browser/LocalStorage test harness & assertion framework
├── runner.js          # Central entrypoint executable via `node e2e/runner.js`
├── tier1-features.ts  # Tier 1: 95 feature isolation tests (5 per feature)
├── tier2-boundaries.ts# Tier 2: 95 boundary and corner case tests (5 per feature)
├── tier3-combinations.ts # Tier 3: 20 pairwise cross-feature tests
└── tier4-scenarios.ts # Tier 4: 10 real-world end-to-end user journeys
```

### 3.2 Invocation Command
The entire test suite can be run using the standard single command:
```bash
node e2e/runner.js
```
The runner transparently executes the suite via `npx tsx` if invoked under plain Node, providing full TypeScript and ESM directory import compatibility without requiring build artifacts or extra installations.

### 3.3 Test Environment Simulation
- **MemoryStorage**: Implements the W3C Storage interface (`getItem`, `setItem`, `removeItem`, `clear`) on `globalThis.localStorage`.
- **Browser Simulation**: Emulates `window`, `document`, `location`, `AudioContext`, `KeyboardEvent`, `MouseEvent`, and `Blob` for zero-friction execution.
- **Isolation Guarantee**: Each test runs with a fresh clean state, avoiding order-dependent side effects.

---

## 4. Discovered Implementation Deviations & Escalations

During initial exploration of `seedData.ts` and `LoyaltyContext.tsx`:
1. **Sr. Valdomiro Souza (cli-07) Churn Urgency**:
   - In `seedData.ts`, `cli-07`'s last purchase date formula is `getIsoDate(currentYear, currentMonth - 1, 2 + i * 2)`. For `i=13`, this resolves to August 28.
   - On September 11, from August 28 is 14 days.
   - Per `PROJECT.md` M2: "correção de Sr. Valdomiro no seedData (urgência amarela)", `cli-07` must have between 15 and 29 days of absence.
   - This deviation is formally logged for M2 implementation resolution, and the test suite specifies the contract per `PROJECT.md`.
