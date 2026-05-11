# Test Coverage Analysis — Fine Boy Foods

## 1. Current state

**There is no automated test coverage in this repository.**

- No test files: `find src -name "*.test.*" -o -name "*.spec.*"` returns nothing.
- No test runner declared in `package.json` — only `dev`, `build`, `preview`, `lint` scripts. There is no `vitest`, `jest`, `playwright`, or `@testing-library/*` dependency.
- No CI step that runs tests — `.github/workflows/` contains only `deploy-supabase-functions.yml`.
- No Supabase / Deno function tests for `supabase/functions/find-retailers/index.ts`.

Effective coverage is **0%** across ~2,600 lines of service code, ~8,700 lines of pages/components, and the edge function. The only guard against regressions today is `tsc` (build) and ESLint.

## 2. Suggested test infrastructure

Before adding tests, the project needs a runner. Recommended setup (Vite-native, low friction):

- `vitest` + `@vitest/coverage-v8` — works with the existing Vite config and TS path aliases.
- `@testing-library/react` + `@testing-library/jest-dom` + `@testing-library/user-event` — for component tests.
- `fake-indexeddb` — Dexie depends on IndexedDB, which isn't in the jsdom env; this lets service tests exercise the real Dexie schema instead of mocking it.
- `msw` (Mock Service Worker) — to stub the Supabase REST client and the `find-retailers` edge function in component/integration tests.
- For the Deno edge function: `deno test` with `--allow-net=none` and fetch mocked via `globalThis.fetch`.

Scripts to add:
```
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```
And a CI job that runs `npm run lint && npm run test -- --coverage` on PRs.

## 3. Proposed test priorities

Ordered from highest leverage (pure logic with bugs that would silently corrupt customer/financial data) down to UI polish.

### Tier 1 — Pure business logic with money & inventory implications (start here)

These are deterministic functions where bugs lose real money. They have no I/O and are trivial to test.

1. **`src/services/orderService.ts`**
   - `computePaymentStatus(total, paid)` — boundary cases: `paid <= 0` → unpaid, `paid >= total` → paid, partial, and `total === 0` (edge case currently maps to `paid`).
   - `createOrder` cap on `amountPaid` (`Math.min(totalAmount, Math.max(0, input.amountPaid))`) — verify overpayment and negative input are clamped.
   - `recordOrderPayment` — that `actualDelta` is calculated correctly, that `addRevenueEntry` is called only for the delta (not the cumulative amount), and that `recordPayment` and `addRevenueEntry` fire exactly once per call.
   - `setOrderStatus` — pending→processing consumes stock; cancelled-after-processing unwinds credit but does NOT return stock (this is a deliberate decision per the comment, worth pinning in a test); insufficient stock throws.

2. **`src/services/customerService.ts`** — the credit ledger
   - `recordOrderOnCredit`, `recordPayment`, `recoverCreditFromCancellation` — verify the invariant `balance = totalPurchased - totalPaid` is maintained across a sequence (order → partial payment → another order → cancel) and never goes negative.
   - Specifically test the `Math.max(0, …)` clamps don't silently swallow accounting errors (consider failing loud in tests when totals go negative).

3. **`src/services/inventoryService.ts`**
   - `consumeProductStock` FIFO-by-expiry: when given a mix of batches with `qcStatus: "fail"`, `quantity: 0`, and varying expiries, that:
     - Failed batches are skipped.
     - Earlier-expiry usable batches are drained first.
     - `shortfall` is correctly reported when stock is insufficient.
     - Multi-batch consumption updates each batch atomically.
   - `getStockSummary` — `lowStock`, `expiringSoonCount` (≤14 days, future), `expiredCount` (past, quantity > 0) boundaries around "today".
   - `generateBatchCode` format & uniqueness over many calls.

4. **`src/services/financeService.ts`**
   - `getFinanceSummary` — today/week/month bucket boundaries (entries at midnight, entries in the future, entries from previous month). The week window uses `weekStart - 6 days`, worth pinning.
   - `outstandingReceivables` excludes cancelled orders.
   - `getDailyTotals(days)` — returns exactly `days` rows in chronological order, including zero-activity days.

5. **`src/services/payrollService.ts`** (this is the largest service, 410 LOC, and least visually testable)
   - `computeEntryNet` — clamps at 0 when deductions exceed gross.
   - `computeRunTotals` — `totalGross + bonuses + allowances` and `totalNet = totalGross - totalDeductions`.
   - `monthlyFromFrequency` / `annualisedFromFrequency` — 52/26/12 multipliers, weekly→monthly conversion (52/12).
   - `setPayrollStatus("paid")` writes exactly one labour `FinanceEntry` when transitioning, and **does not double-post** when called twice with `"paid"` (currently guarded by `run.status !== "paid"` — that guard needs a regression test).
   - `getPayrollSummary` — month/year boundaries, that `upcomingPayDate` picks the next unpaid run.

6. **`src/services/qcService.ts`**
   - `recordQCInspection` pass/fail threshold: average ≥ 0.6 AND no zero scores. Test cases: all-3s pass; one zero anywhere fails even with high average; exactly 0.6 average passes.
   - Failed QC zeroes out the batch's `quantity` (critical — prevents bad stock from being sold).

7. **`src/services/alertsService.ts`**
   - `recomputeAlerts` — given a fixed state, produces deterministic alert set (idempotency: running twice produces the same alerts, not duplicates — relies on the `upsertAlert` keying).
   - Severity branching: `total === 0` → critical vs warning; `days ≤ 7` vs `days ≤ 14` for expiry.
   - 30-day inactive-retailer window.

### Tier 2 — Auth & data-shape correctness

8. **`src/services/authService.ts`**
   - `hashPin` is stable (same input → same hash) and different PINs produce different hashes.
   - `signIn` rejects unknown user, wrong PIN; succeeds and writes to `localStorage`.
   - `signIn` is case-insensitive on name (`equalsIgnoreCase`) — worth pinning since the login UI doesn't normalise.
   - `canAccess`: admin bypasses, undefined role denies, role-in-list allows.
   - Note: PIN hashing is unsalted SHA-256, which is weak. Tests are a good place to also document this (e.g. a `it.skip` with a TODO) so it's not silently forgotten.

9. **`src/services/retailerService.ts`**
   - `checkDuplicate` — name+area match (case- and whitespace-insensitive); phone match ignores spaces; doesn't match on phone alone if `phone` is null/empty.
   - `saveAgentResults` — skips duplicates and reports them in `skipped`; saves the rest; preserves order of `results`.
   - Supabase row mappers (`mapSupabaseRetailer`, `toSupabaseRetailer`, `toSupabaseRetailerPartial`) — these convert between snake_case and camelCase, and the partial mapper silently drops undefined fields. A round-trip test (`obj → toSupabase → mapSupabase → obj`) would catch any missed fields when the schema grows. The partial mapper currently doesn't handle `createdAt` — verify that's intentional.
   - In-memory vs Dexie vs Supabase fall-through paths — at minimum, exercise the in-memory path (Supabase not configured, Dexie unavailable) since it's the production behaviour in many local sessions.

10. **`src/services/distributionService.ts`**
    - `scheduleDelivery` auto-transitions a `pending` order → `processing` (which consumes stock). This is an easy regression target.
    - `setDeliveryStatus("delivered")` marks the order delivered AND sets `completedAt`; `in_transit` sets `startedAt` exactly once (not overwritten on a second transition).

### Tier 3 — Pure utility / formatter functions (cheap wins, high reuse)

11. **`src/lib/format.ts`**
    - `formatNaira` — non-finite (NaN, Infinity) → `₦0`, rounds to whole, thousands separator.
    - `relativeTime` — boundaries at 60s, 60m, 24h, 30d; falls back to `formatDate` past 30d.
    - `addDaysISO` — handles month/year rollover, negative days, leap years.
    - `todayISO` — should be tested with mocked time (`vi.useFakeTimers`) so it doesn't drift on CI in different timezones — see Tier 4 caveat below.

12. **`src/utils/retailerOutreach.ts`** — these are template strings that interpolate retailer fields. Low logic risk, but worth a snapshot test per channel so accidental wording changes show up in PR diffs.

### Tier 4 — Edge function

13. **`supabase/functions/find-retailers/index.ts`** (665 LOC) — the most user-visible AI feature, currently completely untested.
    - `validateInput` — every branch (missing area, invalid category, out-of-range score, non-integer leads, leads > 25).
    - Health probe path returns `{ status, googleConfigured, anthropicConfigured }`.
    - `normalizePhone` — `+234…`, `234…`, `080…`, garbage input.
    - `rankEmails` — junk prefixes (`noreply@`) excluded; `sales@` outranks `firstname.lastname@`.
    - `rankPhones` — `+234` form sorted before local form.
    - `emailRank` priority order.
    - `mapGoogleTypesToCategory` — every branch.
    - `parseUpdatedAt` — picks the most recent of multiple signals; ignores unparseable strings.
    - `fallbackScoreAndPitch` — contact bonus arithmetic, freshness tiers (≤90, ≤365, ≤730 days), `leadScore` clamped to `[minimumLeadScore, 95]`, `recommendedNextStep` picks the right top channel.
    - Integration: mock `fetch` to return canned Google Places + website HTML and assert the assembled `CandidateLead`s. This is where regressions would hit users hardest.

### Tier 5 — Component & integration tests (after Tier 1–2 land)

Component tests deliver less value per line than the service tests above, because the services hold the business logic. Once Tier 1–2 are in place, prioritise:

14. **`<ScoreBadge>` / `<ScoreBar>`** — tier boundaries at 40, 60, 80 (off-by-one is easy here).
15. **`<NewOrderPage>`** flow (368 LOC) — picking a retailer, adding line items, computed totals, submitting → order created → redirect. This is the most error-prone user flow.
16. **`<PayrollPage>`** (1188 LOC — the largest file in the repo) — draft creation, entry edits, status transitions. Given its size, even a smoke test ("renders without error") would catch most breakages.
17. **`<AuthProvider>`** integration — that a missing session doesn't crash children; that `signIn` updates context state.
18. **Route smoke tests** — render each top-level route under a `MemoryRouter` to catch import/render-time crashes. Cheap and catches a lot.

## 4. Things to fix before / while writing tests

A few code smells will make tests harder than they need to be:

- **`crypto.randomUUID()` and `new Date()` are called directly inside service functions.** This makes deterministic assertions awkward. Consider injecting a `clock` / `idGen` (or wrapping in a `lib/clock.ts` module that tests can stub via `vi.mock`). Same for `Math.random()` in `generateOrderCode` / `generateRunCode` / `generateBatchCode`.
- **In-memory stores are module-level `let` variables** (`memoryStore`, `memoryNotes`, `memoryLogs`, `memoryContacts` in `retailerService.ts`). Tests will leak state across cases unless we expose a reset helper or restructure as a closure.
- **`db` is a module-level singleton** in `src/lib/db.ts`. With `fake-indexeddb`, each test file gets a fresh IndexedDB, but within a file you need `beforeEach` to clear tables. A `resetDb()` test helper would be worth adding.
- **No error types** — services throw bare `Error("…")`. Tests asserting "the right error fires" will be string-matching, which is brittle. Consider typed errors for the cases tests care about (`InsufficientStockError`, etc.).

## 5. Suggested first PR

Smallest viable slice to unblock everything else:

1. Add `vitest`, `@vitest/coverage-v8`, `fake-indexeddb` to devDependencies.
2. Add `vitest.config.ts` with `environment: 'jsdom'` and a setup file that imports `fake-indexeddb/auto`.
3. Add a `test/helpers/resetDb.ts` that clears every Dexie table.
4. Write Tier 1.1 (`computePaymentStatus`, `createOrder` clamping) and Tier 3.11 (`formatNaira`, `relativeTime`) — ~20 tests, fully deterministic, no mocking required.
5. Wire `npm run test` into CI on PRs.

That establishes the pattern; Tier 1.2–1.7 (the ledger, inventory FIFO, payroll math, QC threshold, alerts) can then be added incrementally without further infrastructure work.
