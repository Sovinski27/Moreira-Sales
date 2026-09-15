# Project Orchestrator Plan

## Goal
Execute a comprehensive audit, bug fixing, missing feature implementation, business logic correction, and build validation for the Bakery CRM/Loyalty MVP according to `ORIGINAL_REQUEST.md` (R1, R2, R3, R4) and all acceptance criteria.

## Strategy & Topology
Top-level Project Orchestrator executing the Project Pattern with Dual Track:
1. **Phase 0: Survey & Scope Mapping**
   - Spawn 3 parallel investigators:
     - Explorer 1 (teamwork_preview_spec_miner): Codebase structure, routes, dependencies, UI components, button handlers, keyboard shortcuts (R1, R3).
     - Explorer 2 (teamwork_preview_explorer): Business logic, loyalty calculations, churn rules, seed data, state persistence (R2).
     - Explorer 3 (teamwork_preview_explorer): Missing features, UX edge cases, build/type issues, WhatsApp URL generation, CSV export (R3, R4).
   - Aggregate survey findings into `PROJECT.md § Feature Inventory` and define milestone architecture & code layout.

2. **Phase 1: Dual Track Decomposition & Dispatch**
   - **Track 1: E2E Testing Track**
     - Sub-orchestrator: E2E Testing (`sub_orch_e2e`)
     - Build opaque-box test runner & harness covering Tiers 1-4 (Features, Boundaries, Pairwise, Real-world).
     - Signal completion via `TEST_READY.md`.
   - **Track 2: Implementation Track**
     - Milestone 1: Core state, business logic & persistence (R2 rules, minimum purchase, monthly counter reset, churn logic, seedData).
     - Milestone 2: CaixaPage UI, fast buttons, WhatsApp instant search/quick registration, keyboard shortcuts (ESC, F1/F2), celebration trigger & confetti modal (R1, R3).
     - Milestone 3: Admin dashboard, KPIs, ranking, CSV export, settings persistence, anti-churn contact status (R1, R2, R3).
     - Milestone 4: Code cleanup, TypeScript typing, Brazilian Portuguese localization, zero compiler warnings (R4).

3. **Phase 2: Final Milestone & Adversarial Hardening**
   - Phase 2A: Run full E2E test suite (Tiers 1-4) until 100% pass.
   - Phase 2B: Adversarial Coverage Hardening (Tier 5) with Challengers & Forensic Auditor.
   - Verify `npm run build` passes with exit code 0.

4. **Phase 3: Final Synthesis & Sentinel Report**
   - Compile verified acceptance criteria, change summary, and test verification results.
   - Transmit report to Parent/Sentinel.
