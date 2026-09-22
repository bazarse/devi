## 2026-09-04T09:59:01Z

User Request:
Comprehensive pre-delivery Quality Assurance (QA) audit and adversarial bug hunt for the Devi Mobile POS production ecosystem before final delivery today.
Integrity mode: development

Requirements:
- R1. End-to-End Retail POS Workflow & 2-Step Approval Verification (Cash, Split, EMI; pending_approval queue; manager Approve/Reject/Edit & Approve; targeted notifications to salesman)
- R2. Core Business Engine Integrity & Edge Cases (exchange valuation, daily cash register/shift reconciliation, Tally ERP sync markers, GST tax invoice generation, customer CRM/leads funnel status updates)
- R3. Mobile Client-Side Robustness & Zero-Crash Assurance (Next.js frontend, Android WebView wrapper, 23 routes check, safe string/null-safe evaluation, error boundaries, mobile responsiveness tap targets >= 44x44px, horizontal table scroll wrappers, collapsible navigation drawers)

Acceptance Criteria:
- Counter deals submitted via POS desk always enter pending_approval queue without bypassing approval.
- Stock auto-deducts upon deal approval and marks IMEI as sold.
- Rejections capture and persist the manager's reason and display it to the salesman.
- Native Android push alerts deliver actionable buttons [✅ APPROVE], [❌ REJECT], [✏️ EDIT DEAL].
- Tally sync markers write cleanly to database without UUID/type errors.
- A4 and thermal invoices generate complete store GSTIN, customer details, and HSN codes.
- Leads status updates successfully accept both id and leadId.
- All 23 application routes return 200 OK without console runtime errors.
- No null-pointer exceptions occur when search filters or date filters are applied to sparse deal records.
