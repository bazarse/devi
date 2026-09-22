# Project: Devi Mobile POS Production Ecosystem QA & Remediation

## Architecture
- **Frontend & App Layer**: Next.js 14.2.15 (App Router, TailwindCSS, Lucide icons)
- **Native Wrapper**: Capacitor 8.5.1 Android bridge (`MainActivity.java`, `DeviMessagingService.java`, `DealActionBroadcastReceiver.java`)
- **Backend & Database**: Supabase (PostgreSQL, Supabase Auth, Storage) + Next.js Route Handlers (`app/api/`)
- **Business Modules**:
  - POS Counter Billing & Deal Submissions (`app/pos/`, `lib/sales-pipeline.ts`)
  - Manager Approvals Engine (`app/admin/super/approvals/`, `app/admin/store/deals/`, `app/api/deals/action/`)
  - Inventory & IMEI Stock Management (`imei_stock`, `store_inventory`, `device_exchanges`)
  - Cash Register & Shift Reconciliation (`app/admin/store/register/`, `app/admin/super/register/`)
  - GST Invoicing & Thermal Printing (`lib/invoice-generator.ts`, `components/invoice-modal.tsx`, `components/bills-management-view.tsx`)
  - Tally ERP Integration (`app/api/deals/tally/route.ts`, `lib/tally-tracker-service.ts`)
  - Customer CRM & Lead Management (`app/api/customers/`, `app/api/leads/`, `lib/customer-service.ts`)
  - Multi-channel Notifications (OneSignal, FCM, In-App alerts)

---

## Feature Inventory

Every feature and issue identified in the Survey phase is enumerated below with its assigned milestone:

| # | Feature / Issue | Description | Milestone | Source |
|---|-----------------|-------------|-----------|--------|
| 1 | Approval Bypass Prevention | Prevent clients from sending `status: 'approved'` in `/api/deals/submit`; strictly enforce `pending_approval` | M1 | Survey (Explorer 1) |
| 2 | POS Counter UI Feedback Alignment | Fix misleading "Sale Billed & Auto-Approved" message for admin counter billing; show true approval status | M1 | Survey (Explorer 1) |
| 3 | Payment Mode Support (Cash, Split, EMI) | Ensure POS desk submits clean payment metadata; support Split payment inspection & adjustments in Edit modal | M1 | Survey (Explorer 1) |
| 4 | Stock & IMEI Auto-Deduction | Auto-deduct IMEI and store inventory on deal approval; prevent double-selling of sold IMEIs; handle IMEI changes on Edit | M1 | Survey (Explorer 1) |
| 5 | Mandatory Rejection Reason | Validate non-empty rejection reason on manager rejection in API and UI; display reason prominently on salesman history cards | M1 | Survey (Explorer 1) |
| 6 | Targeted Salesman Notification | Deliver decision alerts strictly to the deal's submitting salesman (no chain-wide broadcasts); persist notifications in database | M1 | Survey (Explorer 1) |
| 7 | Android Native Push Action Buttons | Ensure [✅ APPROVE], [❌ REJECT], [✏️ EDIT DEAL] work cleanly; implement deep-linking in `MainActivity.java` for `[✏️ EDIT DEAL]` | M1 | Survey (Explorer 1 & 3) |
| 8 | Device Exchange Ingestion | Ingest trade-in devices into `device_exchanges` table upon deal approval with valid store UUID; prevent phantom stock | M2 | Survey (Explorer 2) |
| 9 | Cash Register Calculation Integrity | Fix `adjustedCash` formula by including `exchange` in `totalCollected`; evaluate date filters using Indian Standard Time (IST) | M2 | Survey (Explorer 2) |
| 10 | Tally ERP Sync Marker Persistence | Store Tally sync status without corrupting product barcode data; persist UI checkbox state across page reloads | M2 | Survey (Explorer 2) |
| 11 | GST Tax Invoice Generation & Thermal Print | Complete store GSTIN, customer details; derive HSN codes from product catalog; add 80mm thermal receipt layout | M2 | Survey (Explorer 2) |
| 12 | Customer CRM Aggregation & Spend Integrity | Populate purchases and leads in customer 360 views; eliminate triple-counting of `total_spent` across deal lifecycle | M2 | Survey (Explorer 2) |
| 13 | Safe String Property Evaluation | Replace unsafe `(d.token \|\| d.id).replace('SA-', '')` with null-safe evaluations across 8 core views | M3 | Survey (Explorer 3) |
| 14 | Null-Safe Search & Date Filters | Add null guards on sparse deal records, customer phones, staff, and finance items to prevent runtime type errors | M3 | Survey (Explorer 3) |
| 15 | Localized Error Boundaries | Wrap primary data tables/views in localized `<ErrorBoundary>` components to prevent full-app unmounting on partial data errors | M3 | Survey (Explorer 3) |
| 16 | Mobile Tap Target Compliance | Increase touch target sizes to >= 44x44px on mobile header/drawer toggle buttons and approval status tabs | M3 | Survey (Explorer 3) |
| 17 | Horizontal Table Scroll Wrappers | Verify and ensure all tabular data presentations maintain horizontal scroll containers (`overflow-x: auto`) | M3 | Survey (Explorer 3) |
| 18 | Role-Aware Mobile Bottom Navigation | Render bottom navigation items dynamically based on user role (salesman vs store admin vs super admin) | M3 | Survey (Explorer 3) |
| 19 | Application Route 200 OK Verification | Verify that all 23 application routes render cleanly without console runtime errors | M3 | Survey (Explorer 3) |
| 20 | E2E Testing Suite Construction | Requirement-driven opaque-box test harness covering Tiers 1-4 (Feature, Boundary, Combinatorial, Real-World) | E2E_TRACK | Survey (Dual Track) |
| 21 | Final Acceptance & Adversarial Hardening | Verify 100% pass of E2E test suite (Tiers 1-4), then execute Tier 5 adversarial bug hunting and hardening | M4 | Final Milestone |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|--------------|--------|
| M1 | POS Workflow & 2-Step Approval Pipeline | Features 1–7: Deal submission queue enforcement, stock auto-deduction, rejection reasons, targeted alerts, Android push actions | none | PLANNED |
| M2 | Core Business Engine Integrity & Accounting | Features 8–12: Exchange valuation & ingestion, register calculations, Tally sync markers, GST & thermal invoices, CRM aggregation & spend fix | none | PLANNED |
| M3 | Mobile Client Robustness & Zero-Crash Assurance | Features 13–19: Safe string evaluations, null-safe filters, localized error boundaries, >=44px tap targets, role-aware bottom nav, 23 routes check | none | PLANNED |
| E2E | E2E Testing Track | Feature 20: Comprehensive opaque-box test suite (Tiers 1-4) published to TEST_READY.md | none | PLANNED |
| M4 | Final Milestone: E2E Acceptance & Adversarial Hardening | Feature 21: Pass 100% E2E tests (Phase 1), followed by Tier 5 adversarial stress testing and hardening (Phase 2) | M1, M2, M3, E2E | PLANNED |

---

## Interface Contracts

### 1. POS Deal Submission ↔ Approval Engine (`deals/submit` ↔ `deals/action`)
- **Submission Endpoint**: `POST /api/deals/submit`
  - Input: `dealData` (product details, customer, pricing, paymentMode, payment breakdown, exchange details)
  - Contract: `status` MUST ALWAYS be set to `'pending_approval'`. Client-provided `status: 'approved'` MUST BE IGNORED or REJECTED.
  - Return: `{ success: true, dealId: string, status: 'pending_approval', token: string }`
- **Action Endpoint**: `POST /api/deals/action`
  - Input: `{ dealId: string, action: 'approve' | 'reject' | 'edit', rejectionReason?: string, decidedBy: string, edits?: object }`
  - Pre-condition for `'reject'`: `rejectionReason` MUST BE a non-empty string.
  - Pre-condition for `'approve'`: Validate stock availability in `imei_stock` (`status = 'in_stock'`). Auto-deduct stock and mark `status: 'sold'`. If `hasExchange`, trigger ingestion into `device_exchanges`.
  - Return: `{ success: true, status: 'approved' | 'rejected', dealId: string }`

### 2. Device Exchange Ingestion (`deals/action` ↔ `device_exchanges`)
- On deal approval (`action === 'approve'`), if the deal includes an exchange (`hasExchange: true`):
  - Insert record into `public.device_exchanges`:
    - `sale_approval_id`: dealId (UUID)
    - `store_id`: store UUID (lookup store UUID from store code `DM-01` or session)
    - `device_name`: string
    - `device_imei`: string
    - `device_condition`: `Excellent` | `Good` | `Fair` | `Poor`
    - `valuation_amount`: numeric
    - `received_from_customer`: customerName
    - `customer_phone`: customerPhone
    - `status`: `'in_stock'`
    - `resale_price`: Math.round(valuation_amount * 1.25)

### 3. Tally ERP Sync Markers (`deals/tally` ↔ `sales_approvals`)
- Column: Dedicated text or boolean column (or metadata field) without overwriting `barcode` or throwing UUID errors on `invoice_id`.
- Toggle Endpoint: `POST /api/deals/tally`
  - Input: `{ dealId: string, isUploaded: boolean, staffName: string }`
  - Return: `{ success: true, isUploaded: boolean }`
- Client state: `bills-management-view.tsx` initializes checkboxes from `deal.isTallyUploaded` populated from database.

### 4. Cash Register Balance Contract
- Formula in `store/register/page.tsx` and `super/register/page.tsx`:
  - `totalCollected = cashTotal + upiTotal + cardTotal + disbursement + exchange`
  - `adjustedCash = (!isEmi && totalCollected === 0) ? d.finalPrice : cashTotal`
  - Date boundaries: `new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })`

### 5. Salesman Decision Notification Contract
- Function: `sendDecisionNotificationToSalesman` in `lib/notification-service.ts`
  - Input: `{ dealId: string, status: 'approved' | 'rejected', rejectionReason?: string, salesmanPhone: string, salesmanName: string, productName: string }`
  - Behavior: Delivers strictly to `salesmanPhone`. Never broadcasts to all salesmen.

### 6. Android Notification Deep-Linking Contract
- `MainActivity.java` handles `url` extra from intent in both `onCreate` and `onNewIntent(Intent intent)`:
  - When `intent.hasExtra("url")`, navigate the WebView / Capacitor bridge to `url`.

---

## Code Layout
- `app/api/deals/submit/route.ts` - Deal submission endpoint
- `app/api/deals/action/route.ts` - Manager approve / reject / edit action endpoint
- `app/api/deals/tally/route.ts` - Tally sync marker endpoint
- `app/api/customers/` - Customer directory and upsert endpoints
- `app/api/leads/` - CRM lead status update endpoints
- `app/pos/page.tsx` - Sales counter POS view
- `app/pos/approvals/page.tsx` - Salesman deal approvals tracker
- `app/admin/super/approvals/page.tsx` - Super Admin manager approvals desk
- `app/admin/store/register/page.tsx` - Store daily cash register
- `app/admin/super/register/page.tsx` - Super admin multi-store cash register
- `app/salesman/history/page.tsx` - Salesman personal sales history
- `components/bills-management-view.tsx` - GST bills management view
- `components/invoice-modal.tsx` - Invoice modal and print generator
- `components/pos-layout.tsx` - Responsive app shell, mobile drawer, bottom nav
- `components/error-boundary.tsx` - Localized component error boundary wrapper
- `lib/invoice-generator.ts` - GST invoice calculations
- `lib/notification-service.ts` - Salesman notification dispatch service
- `lib/customer-service.ts` - Customer CRM aggregation service
- `android/app/src/main/java/com/devimobile/pos/MainActivity.java` - Android main activity
- `android/app/src/main/java/com/devimobile/pos/DealActionBroadcastReceiver.java` - Notification quick action receiver
