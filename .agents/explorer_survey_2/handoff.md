# Handoff Report: Core Business Engine Integrity & Edge Cases (Explorer 2)

**Timestamp:** 2026-09-04T15:37:15+05:30  
**Agent:** Explorer 2 (Core Business Engine Integrity Explorer)  
**Parent Conversation ID:** 323b961b-7546-4ab9-bed6-3fa8c1984c7e  
**Scope Focus:** R2 Requirements and Associated Acceptance Criteria  

---

## 1. Observation

### Area 1: Customer Device Exchange Valuation & Automatic Ingestion
* **Location 1 - POS Desk Exchange Input & Validation:**
  - File: `app/pos/page.tsx`, Lines 890–946:
    The salesman toggles `hasExchange` checkbox and inputs `oldDeviceName`, `oldDeviceImei`, `oldDeviceCondition` (`Excellent`, `Good`, `Fair`, `Poor`), and `exchangeValue`.
  - File: `app/pos/page.tsx`, Lines 336–362 (`calculatePaymentValidation`):
    ```ts
    const exch = hasExchange ? (exchangeValue || 0) : 0;
    // Cash mode:
    const totalPaid = (cashAmount || 0) + (upiAmount || 0) + (cardAmount || 0) + exch;
    const difference = finalPrice - totalPaid;
    // EMI mode:
    const totalDown = (downPaymentCash || 0) + (downPaymentUpi || 0) + (downPaymentCard || 0);
    const totalFinance = totalDown + exch + (disbursementAmount || 0);
    const difference = finalPrice - totalFinance;
    ```
* **Location 2 - Ingestion Attempt at Deal Submission:**
  - File: `app/pos/page.tsx`, Lines 414–435:
    ```ts
    if (hasExchange && oldDeviceName) {
      const generatedExchangeImei = oldDeviceImei || `EX-${Math.floor(100000000000000 + Math.random() * 900000000000000)}`;
      try {
        await supabase.from('second_hand_inventory').insert({
          store_id: activeStoreId,
          model_name: oldDeviceName,
          imei_serial: generatedExchangeImei,
          condition: oldDeviceCondition,
          cost_price: exchangeValue,
          selling_price: Math.round(exchangeValue * 1.25),
          mrp: Math.round(exchangeValue * 1.35),
          acquired_from_customer: customerName,
          customer_phone: customerPhone,
          status: 'in_stock',
          source_token: newApprovalId,
          received_by: activeStaffName,
          created_at: new Date().toISOString()
        });
      } catch (exErr) {
        console.warn('Fallback offline exchange inventory sync:', exErr);
      }
    ```
* **Location 3 - Database Schema Mismatch:**
  - File: `supabase/schema.sql`, Lines 238–253:
    The schema defines table `public.device_exchanges`, NOT `second_hand_inventory`:
    ```sql
    CREATE TABLE IF NOT EXISTS public.device_exchanges (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_approval_id UUID REFERENCES public.sales_approvals(id) ON DELETE SET NULL,
        store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
        device_name TEXT NOT NULL,
        device_imei TEXT NOT NULL,
        device_condition device_condition_enum NOT NULL DEFAULT 'Good',
        valuation_amount NUMERIC(10, 2) NOT NULL,
        received_from_customer TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        status TEXT DEFAULT 'in_stock',
        resale_price NUMERIC(10, 2),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );
    ```
  - File: `supabase/wipe_all_demo_data.sql`, Line 14:
    `second_hand_inventory` is only referenced in a conditional truncate check (`IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'second_hand_inventory')`), but is never created in any DDL migration.
  - File: `app/api/deals/action/route.ts`, Lines 77–134:
    When a deal is approved or edited, auto-deduction runs on `imei_stock`, but zero logic exists to insert, update, or track `device_exchanges` or second-hand inventory. If rejected, no rollback occurs.
  - File: `app/admin/store/inventory/page.tsx` & `app/admin/super/inventory/page.tsx`:
    Neither page queries `device_exchanges` or displays second-hand stock.

---

### Area 2: Daily Cash Register & Shift Reconciliation Calculations
* **Location 1 - Financial Balance Metrics & Calculation Engine:**
  - File: `app/admin/store/register/page.tsx`, Lines 113–133:
  - File: `app/admin/super/register/page.tsx`, Lines 116–126:
    ```ts
    const isEmi = d.paymentMethod === 'EMI';
    const cashTotal = isEmi ? (d.downPaymentCash || 0) : (d.cashAmount || 0);
    const upiTotal = isEmi ? (d.downPaymentUpi || 0) : (d.upiAmount || 0);
    const cardTotal = isEmi ? (d.downPaymentCard || 0) : (d.cardAmount || 0);
    const disbursement = isEmi ? (d.disbursementAmount || 0) : 0;
    const exchange = d.exchangeValue || 0;

    const totalCollected = cashTotal + upiTotal + cardTotal + disbursement;
    const adjustedCash = (!isEmi && totalCollected === 0) ? d.finalPrice : cashTotal;
    ```
  - In `totalSales` and KPI summaries (Lines 163–171 of `store/register/page.tsx`):
    - `totalSales = registerRecords.reduce((acc, curr) => acc + curr.finalAmount, 0)`
    - `totalCash = registerRecords.reduce((acc, curr) => acc + curr.cash, 0)`
    - `totalUpi = registerRecords.reduce((acc, curr) => acc + curr.upi, 0)`
    - `totalCard = registerRecords.reduce((acc, curr) => acc + curr.card, 0)`
    - `totalFinance = registerRecords.reduce((acc, curr) => acc + curr.disbursement, 0)`
    - `totalExchange = registerRecords.reduce((acc, curr) => acc + curr.exchange, 0)`
* **Location 2 - Date Filtering Day Boundary:**
  - File: `app/admin/store/register/page.tsx`, Lines 74–86:
    ```ts
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    ```
    Evaluated in UTC ISO string rather than Indian Standard Time (`en-CA` / `Asia/Kolkata`).
* **Location 3 - Shift Management / Reconciliation:**
  - File: `supabase/wipe_all_demo_data.sql`, Line 17 references `cash_register_shifts`, but this table does not exist in any database migration, and no UI or API exists for opening cash float, closing cashier shifts, or recording drawer discrepancies.

---

### Area 3: Tally ERP Sync Markers & UUID/Type Errors
* **Location 1 - Git History of UUID Exception:**
  - Commit `90fa95fef6ca1d962cec6cb542608fd8ac7a4159` introduced:
    `app/api/deals/tally/route.ts`:
    `.update({ invoice_id: tallyMarker, updated_at: new Date().toISOString() })`
  - File: `supabase/schema.sql`, Line 230:
    Column `invoice_id` on `sales_approvals` is `invoice_id UUID`.
    Writing `TALLY_UPLOADED:2026-09-04...:Admin` threw PostgreSQL exception `invalid input syntax for type uuid`.
  - Commit `73db0d268270ed1c12e52b2f6ef1ea3bc0cb4cb9` hot-fixed the write by targeting `barcode TEXT`:
    `.update({ barcode: tallyMarker, updated_at: new Date().toISOString() })`
* **Location 2 - Overwriting Product Barcode:**
  - File: `app/api/deals/tally/route.ts`, Lines 26–31 & 47–52:
    Because `barcode` stores the physical product barcode scanned during inventory inwarding, marking a deal as Tally uploaded overwrites `barcode` with the tally string. Toggling off (`isUploaded: false`) sets `barcode = null`, destroying product barcode data.
* **Location 3 - UI State Reversion on Page Reload:**
  - File: `components/bills-management-view.tsx`, Lines 85–91:
    ```ts
    const refreshData = async (silent = false) => {
      if (!silent) setIsLoading(true);
      const approved = await fetchSalesPipelineDeals({ status: 'approved' });
      setDeals(approved);
      setTallyMap(getAllTallyStatuses());
      if (!silent) setIsLoading(false);
    };
    ```
  - File: `lib/tally-tracker-service.ts`, Lines 10–12:
    ```ts
    export function getAllTallyStatuses(): Record<string, TallyStatus> {
      return {};
    }
    ```
  - File: `components/bills-management-view.tsx`, Lines 147–149, 178–179, and 396:
    `const isUploaded = !!tallyMap[deal.id]?.isUploaded;`
    Although `fetchSalesPipelineDeals` populates `deal.isTallyUploaded` from Supabase, `tallyMap` is initialized as `{}`. Consequently, every bill displays as unchecked and Tally Pending upon initial page load or browser refresh.

---

### Area 4: GST Tax Invoice Generation
* **Location 1 - Invoice Generator & Calculations:**
  - File: `lib/invoice-generator.ts`, Lines 67–75:
    ```ts
    const rateInclTax = inv.rateInclTax || 0;
    const taxableValue = +(rateInclTax / 1.18).toFixed(2);
    const cgst = +((rateInclTax - taxableValue) / 2).toFixed(2);
    const sgst = cgst;
    const totalTax = +(cgst + sgst).toFixed(2);
    const roundOff = +(rateInclTax - (taxableValue + totalTax)).toFixed(2);
    const gstin = inv.storeGstin || '23ALGPK9135M1ZT';
    const hsn = inv.hsnCode || '85171290';
    ```
  - File: `components/invoice-modal.tsx`, Lines 17–23:
    Replicates the same 18% inclusive tax breakdown formula.
* **Location 2 - Store GSTIN & Branch Configurations:**
  - File: `lib/bill-config-service.ts`, Lines 14–39:
    - DM-01 (Kanthal Flagship): `gstin: '23ALGPK9135M1ZT'`, Address: `206/1, Kanthal Chauraha, Ankpat Marg, Ujjain 456006`.
    - DM-02 (Freeganj 2.0): `gstin: '23ALGPK9135M1ZT'`, Address: `Shop No. 4, Freeganj Main Road, Opposite Clock Tower, Ujjain 456010`.
* **Location 3 - Hardcoded HSN Codes Across Codebase:**
  - All caller sites hardcode `hsnCode: '85171290'` regardless of product category:
    - `app/pos/page.tsx:552`
    - `app/pos/approvals/page.tsx:102`
    - `components/bills-management-view.tsx:195`
    - `app/admin/super/register/page.tsx:235`
    - `app/admin/store/register/page.tsx:243`
    - `app/salesman/history/page.tsx:160`
  - While `products` table has `hsn_code TEXT DEFAULT '8517'`, `app/api/deals/submit/route.ts` and `app/api/deals/list/route.ts` omit `hsn_code`.
* **Location 4 - Thermal Print Layout Limitation:**
  - File: `components/invoice-modal.tsx`, Lines 64–69 & 251–271:
    Button indicates `Print (Thermal / A4)`. However, `#printable-devi-invoice` is rendered as a desktop A4 table with 6 columns. Printing on a 58mm or 80mm thermal receipt roll clips table columns and produces unreadable printouts due to the lack of an 80mm receipt format and specific print media queries.

---

### Area 5: Customer CRM Profile Aggregation & Lead Funnel Updates
* **Location 1 - Lead Status Update Endpoint (`id` vs `leadId`):**
  - File: `app/api/leads/update/route.ts`, Lines 18–24:
    ```ts
    const body = await request.json();
    const leadId = body.leadId || body.id;
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'leadId or id is required' }, { status: 400 });
    }
    ```
    Supports both `leadId` and `id`.
  - File: `app/api/leads/delete/route.ts`, Lines 11–15:
    `const { leadId } = body;`
    Only checks `leadId`; fails if `id` is provided.
* **Location 2 - CRM Aggregation Failure:**
  - File: `lib/customer-service.ts`, Lines 60–68:
    ```ts
    if (data.success && Array.isArray(data.customers)) {
      return data.customers.map((c: any) => ({
        ...c,
        purchases: [],
        leads: [],
        purchaseCount: c.totalSpent > 0 ? 1 : 0,
        firstSeen: c.createdAt,
        lastPurchaseDate: c.updatedAt
      }));
    }
    ```
  - File: `app/api/customers/list/route.ts`, Lines 24–49:
    Queries only `customers` table without joining `sales_approvals` or `leads`.
  - In `app/admin/store/customers/[id]/page.tsx` & `app/admin/super/customers/[id]/page.tsx`:
    Tabs for "Device Purchases" and "Walk-In Inquiries" are permanently empty.
* **Location 3 - Triple Counting of Customer `total_spent`:**
  - File: `lib/sales-pipeline.ts`, Line 193: On deal submission (`pending_approval`), calls `upsertCustomerFromSale` -> `/api/customers/upsert`, adding `amountSpent` to `total_spent`.
  - File: `app/api/deals/action/route.ts`, Line 113: On deal approval, server runs:
    `total_spent: (Number(existingCust.total_spent) || 0) + spent`.
  - File: `lib/sales-pipeline.ts`, Line 249: In `updateDealStatusInPipeline` response callback, calls `upsertCustomerFromSale` again -> `/api/customers/upsert`, adding `amountSpent` a 3rd time.
  - A ₹20,000 transaction increments `total_spent` by ₹60,000. Rejections leave the initial ₹20,000 unreversed.

---

## 2. Logic Chain

1. **Exchange Valuation & Ingestion Failure:**
   - *Premise 1:* POS captures exchange details and sets `hasExchange: true`, calculating `cost_price: exchangeValue`, `selling_price: Math.round(exchangeValue * 1.25)`, `mrp: Math.round(exchangeValue * 1.35)`.
   - *Premise 2:* Ingestion is attempted client-side during `handleFinalSubmit` into `second_hand_inventory` with `store_id: 'DM-01'`.
   - *Premise 3:* PostgreSQL schema defines `public.device_exchanges` with `store_id UUID NOT NULL REFERENCES public.stores(id)`.
   - *Inference:* The insert fails with missing table or invalid UUID syntax. In addition, inserting before manager approval creates phantom stock if the deal is rejected.

2. **Cash Register Distortion on Exchange Deals:**
   - *Premise 1:* In `app/admin/store/register/page.tsx:131`, `totalCollected = cashTotal + upiTotal + cardTotal + disbursement`.
   - *Premise 2:* For a deal settled 100% via device exchange, `cashTotal = 0, upiTotal = 0, cardTotal = 0, disbursement = 0`, so `totalCollected === 0`.
   - *Premise 3:* The fallback condition `(!isEmi && totalCollected === 0)` evaluates to `true`, setting `adjustedCash = d.finalPrice`.
   - *Inference:* Register records both `cash = finalPrice` and `exchange = exchangeValue`, inflating physical cash in drawer by the trade-in value.

3. **Tally ERP Sync Marker Mechanics:**
   - *Premise 1:* Previous attempts to write `'TALLY_UPLOADED:...'` to `invoice_id` failed because `invoice_id` is typed as `UUID`.
   - *Premise 2:* The write was redirected to `barcode TEXT`.
   - *Premise 3:* Product barcodes are replaced with the sync string, and `tallyMap` in `bills-management-view.tsx` initializes as `{}` via `getAllTallyStatuses()`, ignoring `deal.isTallyUploaded` from Supabase on initial render.
   - *Inference:* DB writes succeed on `barcode`, but real barcodes are overwritten, and UI checkboxes fail to persist state across reloads.

4. **Invoice Completeness & Thermal Limitations:**
   - *Premise 1:* `invoice-generator.ts` computes GST components (taxable value, CGST 9%, SGST 9%, round-off, total) and includes store GSTIN (`23ALGPK9135M1ZT`) and customer details.
   - *Premise 2:* `hsnCode` defaults to `'85171290'` across all entry points.
   - *Premise 3:* Thermal printing relies on desktop A4 table DOM elements without thermal roll styles.
   - *Inference:* Tax invoices are mathematically compliant for 18% GST smartphones, but non-phone items display incorrect HSN codes, and thermal receipts format improperly.

5. **Customer CRM Aggregation & Lifecycle Accounting:**
   - *Premise 1:* `updateLeadStatus` supports both `id` and `leadId` at `app/api/leads/update/route.ts:19`.
   - *Premise 2:* `/api/customers/list` does not fetch associated deals or leads, returning `purchases: []` and `leads: []`.
   - *Premise 3:* Deal submission, server approval, and client approval callbacks each trigger `total_spent` incrementation.
   - *Inference:* Customer 360 profile views display blank transaction histories, and lifetime spend is inflated by 300%.

---

## 3. Caveats

1. **Active Database State:** Audit was conducted via static code analysis of Next.js routes, utility libraries, and Supabase SQL schemas. Live database migrations in the remote Supabase project may contain manual schema modifications not reflected in git-tracked SQL files.
2. **Local Storage Fallbacks:** Certain POS workflows maintain localStorage fallbacks (`devi_second_hand_stock`, `devi_store_bill_config_*`). While these allow offline operation in browser sessions, they do not sync across devices or staff logins.
3. **No Shift Model Found:** No implementation of shift open/close reconciliation was identified beyond the daily register day-book.

---

## 4. Conclusion

The core business engine contains robust foundations for retail sales, GST tax calculation, and lead funnel updates, but exhibits five distinct integrity defects:

1. **Second-Hand Ingestion:** Ingestion targets a non-existent table (`second_hand_inventory`), uses string store IDs instead of UUIDs, and triggers on deal submission rather than deal approval.
2. **Cash Register Double-Counting:** Full or partial device exchanges cause `adjustedCash` to inflate cash drawer metrics. Date filtering uses UTC day boundaries rather than IST.
3. **Tally Sync Marker Side Effects:** Tally sync writes to `barcode TEXT` to circumvent the earlier `invoice_id UUID` type error, but overwrites real barcodes. The UI fails to initialize checkbox states from Supabase on refresh.
4. **HSN & Thermal Invoicing:** Invoices reliably compute 18% GST and store GSTIN, but HSN is hardcoded to `85171290` across all product categories. Thermal printing lacks an 80mm roll layout.
5. **Customer CRM & Lead Updates:** `updateLeadStatus` correctly accepts both `id` and `leadId`. However, customer profile aggregation fails to populate purchases and leads, and customer `total_spent` is triple-counted across the transaction lifecycle.

### Recommended Fix Actions:
- **R2.1 (Exchange Ingestion):** Move second-hand ingestion to `app/api/deals/action/route.ts` upon deal approval (`normAction === 'approve'`), writing directly to `public.device_exchanges` with `store_id` resolved to the store UUID.
- **R2.2 (Register Balance):** In `register/page.tsx`, include `exchange` in `totalCollected` (`cashTotal + upiTotal + cardTotal + disbursement + exchange`) so `adjustedCash` only applies when no payment or exchange data exists. Format dates using `toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })`.
- **R2.3 (Tally Persistence):** Add a dedicated column `tally_synced_at TIMESTAMPTZ` or `is_tally_uploaded BOOLEAN` to `sales_approvals` (avoiding `barcode` overwrite). In `components/bills-management-view.tsx`, initialize `tallyMap` from `deals.map(d => ({ [d.id]: { isUploaded: d.isTallyUploaded } }))` or check `tallyMap[deal.id]?.isUploaded ?? deal.isTallyUploaded`.
- **R2.4 (Invoice & Thermal):** Populate `hsn_code` from product catalog in `deals/submit`. Provide a dedicated 80mm thermal receipt format with `@media print` styling for 80mm width.
- **R2.5 (Customer CRM & Spend Integrity):** Remove `upsertCustomerFromSale` from `submitSaleDeal` and from `updateDealStatusInPipeline` client callback, retaining only the server-side update in `app/api/deals/action/route.ts`. In `/api/customers/list` or `/api/customers/[id]`, query `sales_approvals` and `leads` matching `customer_phone` to aggregate purchase and inquiry history.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Tally Marker & UUID Historical Bug:**
   ```powershell
   git log -S "invoice_id: tallyMarker" -p -n 1
   ```
   Inspect `app/api/deals/tally/route.ts` lines 20–35 to confirm write to `barcode` instead of `invoice_id`.

2. **Verify Tally UI Checkbox Loss on Refresh:**
   Inspect `components/bills-management-view.tsx` line 89 (`setTallyMap(getAllTallyStatuses())`) and `lib/tally-tracker-service.ts` line 10 (`getAllTallyStatuses` returning `{}`). Compare with line 396 where `isUploaded` checks `tallyMap[deal.id]?.isUploaded` instead of `deal.isTallyUploaded`.

3. **Verify Cash Register Full-Exchange Double-Counting:**
   Inspect `app/admin/store/register/page.tsx` line 131:
   `const totalCollected = cashTotal + upiTotal + cardTotal + disbursement;`
   Notice `exchange` is omitted from `totalCollected`, causing `adjustedCash = d.finalPrice` when exchange equals total deal value.

4. **Verify Leads Status Parameter Acceptance (`id` vs `leadId`):**
   Inspect `app/api/leads/update/route.ts` line 19:
   `const leadId = body.leadId || body.id;`
   Confirm both keys are accepted. Inspect `app/api/leads/delete/route.ts` line 11 to confirm only `leadId` is checked.

5. **Verify Customer CRM Empty Purchases & Triple Spend:**
   Inspect `lib/customer-service.ts` line 63–65 (empty arrays `purchases: []`, `leads: []`).
   Trace call chain for `upsertCustomerFromSale`:
   - `lib/sales-pipeline.ts:193` (Deal submission)
   - `app/api/deals/action/route.ts:113` (Server deal approval)
   - `lib/sales-pipeline.ts:249` (Client deal approval callback)
