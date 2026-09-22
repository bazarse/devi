# TEST_INFRA.md — Devi Mobile POS E2E Test Infrastructure

## Overview & Test Architecture

The Devi Mobile POS production ecosystem testing harness is built on a **Dual Track: Requirement-Driven Opaque-Box** methodology. It provides end-to-end verification of all 21 features enumerated in `PROJECT.md` across retail counter operations, manager approvals, inventory stock deduction, second-hand trade-ins, cash registers, Tally ERP integration, customer CRM, GST invoicing, and mobile client robustness.

### Key Architecture Decisions
1. **Zero-Dependency Native Execution**: Built using native Node.js (Node 24+ compatible with Node 18/20+) with no external test runners required. Executes ultra-fast (<100ms for the entire 231-test suite) with zero cold-start delay.
2. **Self-Contained In-Memory Storage Simulator (`MockSupabase`)**: Provides complete simulation of PostgreSQL tables, constraints, and transactions (`sales_approvals`, `imei_stock`, `store_inventory`, `device_exchanges`, `customers`, `leads`, `stores`, `profiles`).
3. **Contract-Enforcing Simulated Engine (`SimulatedApi`)**: Encapsulates the authoritative interface contracts defined in `PROJECT.md` § Interface Contracts, verifying request validation, business constraints, calculation formulas, and push notifications.
4. **4-Tier Structured Test Hierarchy**:
   - **Tier 1: Feature Coverage** (Happy-path verification: >=5 tests per feature for all 21 features = 105 tests)
   - **Tier 2: Boundary & Corner Cases** (Limits, nulls, whitespace, extremes, injection payloads = 105 tests)
   - **Tier 3: Cross-Feature Combinations** (Pairwise interaction scenarios = 15 tests)
   - **Tier 4: Real-World Workload Scenarios** (Realistic retail day, multi-branch, CRM lifecycle = 6 scenarios)

---

## Directory Layout

```
tests/
├── helpers/
│   ├── test-harness.js              # Core test runner, assert library, and lifecycle hooks
│   ├── mock-supabase.js             # In-memory Supabase/Postgres table engine
│   ├── simulated-api.js             # Authoritative contract execution engine
│   └── fixtures.js                  # Standardized stores, staff, products, IMEIs, customers
├── tier1-features/                  # Tier 1: 21 files, 105 tests (>=5 tests per feature)
│   ├── f01-approval-bypass.test.js
│   ├── f02-pos-ui-feedback.test.js
│   ├── f03-payment-modes.test.js
│   ├── f04-stock-imei-deduction.test.js
│   ├── f05-rejection-reason.test.js
│   ├── f06-targeted-notifications.test.js
│   ├── f07-android-push-actions.test.js
│   ├── f08-exchange-ingestion.test.js
│   ├── f09-cash-register-calculations.test.js
│   ├── f10-tally-sync-markers.test.js
│   ├── f11-gst-invoicing.test.js
│   ├── f12-customer-crm.test.js
│   ├── f13-safe-strings.test.js
│   ├── f14-null-safe-filters.test.js
│   ├── f15-error-boundaries.test.js
│   ├── f16-mobile-tap-targets.test.js
│   ├── f17-horizontal-scroll.test.js
│   ├── f18-role-bottom-nav.test.js
│   ├── f19-routes-verification.test.js
│   ├── f20-test-suite-construction.test.js
│   └── f21-acceptance-hardening.test.js
├── tier2-boundary/                  # Tier 2: 21 files, 105 tests (>=5 boundary tests per feature)
│   ├── f01-approval-bypass-boundary.test.js
│   ├── f02-pos-ui-boundary.test.js
│   ├── f03-payment-modes-boundary.test.js
│   ├── f04-stock-imei-boundary.test.js
│   ├── f05-rejection-reason-boundary.test.js
│   ├── f06-targeted-notifications-boundary.test.js
│   ├── f07-android-push-actions-boundary.test.js
│   ├── f08-exchange-ingestion-boundary.test.js
│   ├── f09-cash-register-boundary.test.js
│   ├── f10-tally-sync-boundary.test.js
│   ├── f11-gst-invoicing-boundary.test.js
│   ├── f12-customer-crm-boundary.test.js
│   ├── f13-safe-strings-boundary.test.js
│   ├── f14-null-safe-filters-boundary.test.js
│   ├── f15-error-boundaries-boundary.test.js
│   ├── f16-mobile-tap-targets-boundary.test.js
│   ├── f17-horizontal-scroll-boundary.test.js
│   ├── f18-role-bottom-nav-boundary.test.js
│   ├── f19-routes-verification-boundary.test.js
│   ├── f20-test-suite-boundary.test.js
│   └── f21-hardening-boundary.test.js
├── tier3-combinations/              # Tier 3: Pairwise combinations (15 tests)
│   └── cross-feature-combinations.test.js
├── tier4-realworld/                 # Tier 4: Real-world retail store workloads (6 scenarios)
│   └── real-world-workloads.test.js
└── run-all-tests.js                 # Standalone master runner script
```

---

## Test Execution Guide

### Run Full Test Suite (Tiers 1–4)
```bash
node tests/run-all-tests.js
```

### Run Specific Test Tiers
```bash
# Run Tier 1 (Feature Coverage) only
node tests/run-all-tests.js --tier=1

# Run Tier 2 (Boundary & Corner Cases) only
node tests/run-all-tests.js --tier=2

# Run Tier 3 (Cross-Feature Combinations) only
node tests/run-all-tests.js --tier=3

# Run Tier 4 (Real-World Workload Scenarios) only
node tests/run-all-tests.js --tier=4
```

### Exit Codes
- `0`: All tests passed successfully (100% pass rate).
- `1`: One or more tests failed (with error context, stack trace, and suite identifier).

---

## Authoritative Sources of Expected Output

1. **`PROJECT.md` Interface Contracts**:
   - `deals/submit`: Strict enforcement of `pending_approval` status, SA-XXXX token generation, push alert dispatch.
   - `deals/action`: Mandatory `rejectionReason` on reject; stock auto-deduction in `imei_stock` (`status = 'sold'`); non-serialized inventory deduction; double-selling prevention.
   - `device_exchanges`: Ingestion on deal approval with valid store UUID and `resale_price = Math.round(valuation_amount * 1.25)`.
   - `deals/tally`: Tally marker write without corrupting `barcode` column or throwing UUID errors on `invoice_id`.
   - `store/register` & `super/register`: `totalCollected = cashTotal + upiTotal + cardTotal + disbursement + exchange`; `adjustedCash = (!isEmi && totalCollected === 0) ? d.finalPrice : cashTotal`; IST (`Asia/Kolkata`) day boundaries.
   - `invoice-generator`: 18% GST calculation (`taxableValue = +(rate / 1.18).toFixed(2)`), store GSTIN (`23ALGPK9135M1ZT`), state code 23, `numberToIndianWords`.
2. **`ORIGINAL_REQUEST.md` Core Requirements**:
   - 2-step approval pipeline without client bypass.
   - Leads update accepting both `id` and `leadId`.
   - 23 primary application routes rendering cleanly without exceptions.
   - Mobile-first responsiveness (tap targets >= 44x44px, horizontal table scroll containers `overflow-x-auto`).
