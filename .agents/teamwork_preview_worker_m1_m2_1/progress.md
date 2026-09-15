# Progress

- Last visited: 2026-09-11T18:33:10Z
- Status: Completed
- Current step: Writing handoff.md and sending completion message

## Completed Tasks:
1. Fix `src/services/seedData.ts`:
   - Configured Sr. Valdomiro Souza (`cli-07`) with purchases in previous month, last purchase on day 22 (20 days ago from today 2026-09-11).
   - Confirmed he has `comprasMesAnterior = 14`, `comprasMesAtual = 0`, `diasSemComprar = 20`, and `urgencia_churn: 'amarelo'`.
   - Confirmed seedData generates Dona Marlene (target reached), Seu Antônio (1 away from target), Sr. Valdomiro (yellow churn), and Dra. Beatriz (red churn).
2. Fix `src/pages/CaixaPage.tsx`:
   - Reset `clienteEncontrado` to null and `isNovoCliente` to false on 8-9 digits without matching any customer.
   - Prevented focus-stealing to Name on 10th digit: only auto-focuses on 11 digits (cell phone format) or on Enter.
   - Ensured ESC key cleanly resets form, closes award modal, and refocusses on WhatsApp.
3. Fix `src/components/AwardModal.tsx`:
   - Added Escape keydown listener to dismiss modal and refocus.
4. Enhance `src/components/Layout.tsx`:
   - Removed `hidden md:flex` around demo restore button, making it accessible on all viewports with responsive styling and `aria-label`.
5. Enhanced `src/pages/AdminDashboard.tsx`:
   - Synchronized form state with `config` via `useEffect`.
   - Enhanced phone search in customer list to support formatted phone numbers.
   - Added secondary "Restaurar Dados de Demonstração" button in Settings tab.
6. Verified Build:
   - `npm run build` exited with code 0.
   - `npx tsc --noEmit` exited with code 0 (zero errors, zero warnings).
