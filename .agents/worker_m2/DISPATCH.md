## 2026-09-04T10:10:32Z
You are Worker M2 (Core Business Engine Worker).
Working directory: c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\worker_m2
Project root: c:\Users\vinam\OneDrive\Desktop\Workflow\Devi
Original request path: c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\ORIGINAL_REQUEST.md
Project specification: c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\orchestrator_1\PROJECT.md
Explorer handoff report: c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\explorer_survey_2\handoff.md
Parent conversation ID: 323b961b-7546-4ab9-bed6-3fa8c1984c7e

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INSTRUCTIONS:
1. You MUST read c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\ORIGINAL_REQUEST.md and c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\explorer_survey_2\handoff.md before making any changes.
2. Keep a progress.md in your working directory with 'Last visited: [timestamp]' for liveness.
3. When finished, verify your changes by running 'npm run lint' or appropriate build checks.
4. Write a comprehensive handoff report at c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\worker_m2\handoff.md following the Handoff Protocol.
5. Send a completion message via send_message to recipient 323b961b-7546-4ab9-bed6-3fa8c1984c7e.

EXCLUSIVE WRITE FILE OWNERSHIP:
You exclusively own and may edit the following files:
- app/admin/store/register/page.tsx
- app/admin/super/register/page.tsx
- app/api/deals/tally/route.ts
- lib/tally-tracker-service.ts
- components/bills-management-view.tsx
- lib/invoice-generator.ts
- components/invoice-modal.tsx
- lib/customer-service.ts
- app/api/customers/list/route.ts
- app/api/customers/upsert/route.ts
- lib/sales-pipeline.ts
- app/api/leads/delete/route.ts

TASKS & IMPLEMENTATION SCOPE:
1. Fix Cash Register Balance Calculation & Date Filter (BUG-R2-02):
   In app/admin/store/register/page.tsx and app/admin/super/register/page.tsx:
   - Include exchange in totalCollected:
     const totalCollected = cashTotal + upiTotal + cardTotal + disbursement + exchange;
     const adjustedCash = (!isEmi && totalCollected === 0) ? d.finalPrice : cashTotal;
   - Evaluate date filters using Indian Standard Time ('Asia/Kolkata') rather than UTC ISO string.
2. Fix Tally ERP Sync Marker Persistence & UI State (BUG-R2-03):
   In app/api/deals/tally/route.ts, lib/tally-tracker-service.ts, and components/bills-management-view.tsx:
   - Persist Tally sync marker cleanly to database without overwriting physical barcodes and without UUID cast errors.
   - In components/bills-management-view.tsx, initialize checkbox state properly from deal.isTallyUploaded on page load/refresh.
   - Also replace (d.token || d.id).replace('SA-', '') with String(d.token || d.id || '').replace('SA-', '') to prevent crash.
3. Fix GST Tax Invoice HSN & Thermal Layout (BUG-R2-04):
   In lib/invoice-generator.ts and components/invoice-modal.tsx:
   - Ensure HSN code reflects product catalog / category rather than hardcoding '85171290' everywhere.
   - Ensure store GSTIN and customer details are complete.
   - Add dedicated 80mm thermal receipt printing layout with print media styles for receipt printers.
4. Fix Customer CRM Profile Aggregation & Spend Integrity (BUG-R2-05):
   In lib/customer-service.ts and app/api/customers/list/route.ts:
   - Populate purchases and leads history for customer 360 profile.
   In lib/sales-pipeline.ts:
   - Eliminate redundant calls to upsertCustomerFromSale that triple-count customer total_spent across deal lifecycle.
   In app/api/leads/delete/route.ts:
   - Accept both leadId and id.
