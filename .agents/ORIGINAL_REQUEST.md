# Original User Request

## Initial Request — 2026-09-04T09:58:16Z

Comprehensive pre-delivery Quality Assurance (QA) audit and adversarial bug hunt for the Devi Mobile POS production ecosystem before final delivery today.

Working directory: c:\Users\vinam\OneDrive\Desktop\Workflow\Devi
Integrity mode: development

## Requirements

### R1. End-to-End Retail POS Workflow & 2-Step Approval Verification
Verify the entire transaction lifecycle across Salesman, Store Manager, and Super Admin:
- Sales counter deal submission across Cash, Split, and EMI finance modes.
- Mandatory transition to pending_approval queue with instant push alerts to managers.
- Manager actions: Approve (with IMEI deduction), Reject (with mandatory reason), and Edit & Approve (price/IMEI adjustments).
- Targeted notification delivery strictly to the deal's submitting salesman upon decision.

### R2. Core Business Engine Integrity & Edge Cases
Audit and stress-test core store operations:
- Customer device exchange valuation and automatic ingestion into second-hand inventory.
- Daily cash register and shift reconciliation calculations.
- Tally ERP sync marker persistence and GST tax invoice generation.
- Customer CRM profile aggregation and lead funnel status updates.

### R3. Mobile Client-Side Robustness & Zero-Crash Assurance
Audit the Next.js frontend and Android WebView wrapper:
- Verify zero uncaught client-side render exceptions across all 23 application routes.
- Verify safe string and null-safe property evaluations.
- Verify Error Boundary recovery mechanisms and offline cache fallbacks.
- Mobile-first responsiveness: Ensure tap targets >= 44x44px, horizontal table scroll wrappers, and collapsible navigation drawers.

## Acceptance Criteria

### Transaction & Approval Pipeline
- [ ] Counter deals submitted via POS desk always enter pending_approval queue without bypassing approval.
- [ ] Stock auto-deducts upon deal approval and marks IMEI as sold.
- [ ] Rejections capture and persist the manager's reason and display it to the salesman.
- [ ] Native Android push alerts deliver actionable buttons [✅ APPROVE], [❌ REJECT], [✏️ EDIT DEAL].

### Data & Accounting Integrity
- [ ] Tally sync markers write cleanly to database without UUID/type errors.
- [ ] A4 and thermal invoices generate complete store GSTIN, customer details, and HSN codes.
- [ ] Leads status updates successfully accept both id and leadId.

### Frontend & Crash Prevention
- [ ] All 23 application routes return 200 OK without console runtime errors.
- [ ] No null-pointer exceptions occur when search filters or date filters are applied to sparse deal records.
