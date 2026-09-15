# Test Infrastructure Specification (TEST_INFRA.md)

**Project**: Panificadora CRM & Fidelidade (Umuarama-PR)  
**System Architecture**: React 18 + TypeScript + Vite + Tailwind CSS + LocalStorage/Supabase  
**E2E Framework**: Opaque-Box Native E2E Test Engine (`e2e/`)  

---

## 1. Overview & Objectives

The End-to-End (E2E) testing infrastructure provides an opaque-box, deterministic, and isolated verification suite covering all 19 features (F01 to F19) specified in `PROJECT.md` and `ORIGINAL_REQUEST.md`. 

The test suite validates:
1. **Isolated feature functionality** (happy paths for each button, input, shortcut, and calculation).
2. **Boundary and corner cases** (zero, negative, empty, whitespace, extremes, type-coercion, thresholds).
3. **Cross-feature pairwise interactions** (state synchronizations between Cashier, Admin Dashboard, Anti-Churn Radar, Settings, and WhatsApp).
4. **Real-world application scenarios** (end-to-end customer and cashier operational journeys).

---

## 2. Test Execution & Single Runner Command

The test suite is executable via a single command from the project root:

```bash
node e2e/runner.js
```

Alternative execution commands:
```bash
# Run using npx tsx directly
npx tsx e2e/runner.js

# Run specific tiers
npx tsx e2e/runner.js --tier=1
npx tsx e2e/runner.js --tier=2
npx tsx e2e/runner.js --tier=3
npx tsx e2e/runner.js --tier=4
```

### Automatic Runtime Detection
`e2e/runner.js` automatically detects if it is executed under plain `node` or with a TypeScript loader. If executed under standard Node.js, it delegates execution seamlessly to `npx tsx`, eliminating any requirement for prior compilation, global tool installs, or build artifacts.

---

## 3. Four-Tier Test Architecture

```
                               ┌────────────────────────────────────────────────────────┐
                               │                 E2E Test Runner                        │
                               │               `node e2e/runner.js`                     │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │
          ┌───────────────────────┬───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼                       ▼
   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
   │   Tier 1    │         │   Tier 2    │         │   Tier 3    │         │   Tier 4    │
   │   Feature   │         │  Boundary   │         │Pairwise X-  │         │ Real-World  │
   │  Coverage   │         │ & Extremes  │         │   Feature   │         │  Scenarios  │
   │  (95 tests) │         │ (95 tests)  │         │ (20 tests)  │         │ (10 tests)  │
   └─────────────┘         └─────────────┘         └─────────────┘         └─────────────┘
```

### Tier 1: Feature Coverage (Isolation)
- **Scope**: Every feature from F01 to F19 tested in isolation.
- **Rule**: Minimum 5 tests per feature (19 × 5 = 95 tests).
- **Target**: Confirms expected behavior when inputs and conditions are standard and valid.

### Tier 2: Boundary & Corner Cases
- **Scope**: Extreme values, limits, empty strings, invalid inputs, edge timestamps, threshold transitions.
- **Rule**: Minimum 5 tests per feature (19 × 5 = 95 tests).
- **Target**: Confirms defensive validation, boundary accuracy, and absence of crashes or NaN values.

### Tier 3: Cross-Feature Combinations
- **Scope**: Pairwise interactions between modules.
- **Rule**: Minimum 20 tests covering interactions across cash register, loyalty calculation, anti-churn, settings, and reporting.
- **Target**: Validates that changes in one subsystem (e.g. settings) correctly propagate to others (e.g. cashier thresholds and dashboard rankings).

### Tier 4: Real-World Application Scenarios
- **Scope**: Multi-step, end-to-end user journeys replicating daily bakery routines.
- **Rule**: Minimum 10 complete scenarios.
- **Target**: Simulates real-world workflows from morning rush to month-end reporting.

---

## 4. Coverage Thresholds

| Metric | Target | Threshold |
|---|---|---|
| Total Features Covered | 19 / 19 | 100% |
| Tier 1 Test Cases | >= 95 | Pass 100% |
| Tier 2 Test Cases | >= 95 | Pass 100% |
| Tier 3 Test Cases | >= 20 | Pass 100% |
| Tier 4 Test Cases | >= 10 | Pass 100% |
| Grand Total Test Cases | >= 220 | Pass 100% |
| Maximum Execution Time | < 15 seconds | Pass |

---

## 5. File Structure in `e2e/`

- `e2e/harness.ts`: Zero-dependency test assertion framework, lifecycle hooks (`describe`, `it`, `beforeEach`), browser & DOM mocks, `MemoryStorage` W3C LocalStorage implementation.
- `e2e/runner.js`: Central test runner script with ANSI colored reporting, tier filtering, and pass/fail summary.
- `e2e/tier1-features.ts`: Tier 1 test suite (95 tests).
- `e2e/tier2-boundaries.ts`: Tier 2 test suite (95 tests).
- `e2e/tier3-combinations.ts`: Tier 3 test suite (20 tests).
- `e2e/tier4-scenarios.ts`: Tier 4 test suite (10 tests).

---

## 6. Verification and Reporting

When all test tiers pass, the test writer publishes `TEST_READY.md` at the project root containing:
- Test execution summary (passed / failed / total).
- Execution timing.
- Verification command.
- Detailed feature status.
