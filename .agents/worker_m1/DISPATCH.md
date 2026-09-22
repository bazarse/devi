## 2026-09-04T10:10:32Z

You are Worker M1 (POS Workflow & Approvals Worker).
Working directory: c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\worker_m1
Project root: c:\Users\vinam\OneDrive\Desktop\Workflow\Devi
Original request path: c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\ORIGINAL_REQUEST.md
Project specification: c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\orchestrator_1\PROJECT.md
Explorer handoff report: c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\explorer_survey_1\handoff.md
Parent conversation ID: 323b961b-7546-4ab9-bed6-3fa8c1984c7e

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INSTRUCTIONS:
1. You MUST read c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\ORIGINAL_REQUEST.md and c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\explorer_survey_1\handoff.md before making any changes.
2. Keep a progress.md in your working directory with 'Last visited: [timestamp]' for liveness.
3. When finished, verify your changes by running 'npm run lint' or appropriate build checks.
4. Write a comprehensive handoff report at c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\worker_m1\handoff.md following the Handoff Protocol.
5. Send a completion message via send_message to recipient 323b961b-7546-4ab9-bed6-3fa8c1984c7e.

EXCLUSIVE WRITE FILE OWNERSHIP:
You exclusively own and may edit the following files:
- app/api/deals/submit/route.ts
- app/api/deals/action/route.ts
- app/pos/page.tsx
- app/admin/super/approvals/page.tsx
- app/salesman/history/page.tsx
- lib/notification-service.ts
- lib/fcm-service.ts
- android/app/src/main/java/com/devimobile/pos/MainActivity.java
- android/app/src/main/java/com/devimobile/pos/DealActionBroadcastReceiver.java

TASKS & IMPLEMENTATION SCOPE:
1. Fix Approval Bypass in Deal Submission (BUG-R1-01):
   In app/api/deals/submit/route.ts, strictly force status: 'pending_approval'. Never allow client requests to submit status: 'approved'.
2. Fix POS Desk UI Messaging (BUG-R1-02):
   In app/pos/page.tsx, align UI so that all counter deals clearly inform the user that the deal has entered pending_approval.
3. Fix Payment Mode Support (BUG-R1-03):
   In app/pos/page.tsx, ensure Split payments are cleanly tracked with breakdown. In app/admin/super/approvals/page.tsx, add split editing fields in the Edit modal when paymentMethod is Split.
4. Fix Stock Auto-Deduction & Ingestion on Deal Action (BUG-R1-04 & BUG-R2-01 integration):
   In app/api/deals/action/route.ts:
   - When action === 'approve' or 'edit':
     - Check imei_stock availability (must be 'in_stock'; prevent double-selling if already 'sold').
     - Auto-deduct IMEI: update status to 'sold', sold_at, and sold_invoice_id. Handle database errors properly.
     - Release previous IMEI if IMEI changed during Edit & Approve.
     - If the approved deal has an exchange (hasExchange: true), insert into public.device_exchanges with resolved store UUID.
5. Fix Mandatory Rejection Reason (BUG-R1-05):
   In app/api/deals/action/route.ts, validate that rejectionReason is non-empty. Return 400 if empty.
   In app/admin/super/approvals/page.tsx, require manager to enter a rejection reason before rejecting.
   In app/salesman/history/page.tsx, render the rejection reason clearly on the deal ledger cards for rejected deals.
6. Fix Targeted Notification Delivery (BUG-R1-06):
   In lib/notification-service.ts and lib/fcm-service.ts, ensure decision notifications target strictly the submitting salesman's phone/id. Never broadcast salesman decision notifications chain-wide.
7. Fix Android Native Action Navigation (BUG-R1-07):
   In android/app/src/main/java/com/devimobile/pos/MainActivity.java, implement onNewIntent(Intent intent) and handleUrlIntent to navigate the WebView to the 'url' extra when [✏️ EDIT DEAL] is tapped.
