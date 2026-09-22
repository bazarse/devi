## 2026-09-04T10:10:32Z

You are Worker M3 (Mobile Client Robustness Worker).
Working directory: c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\worker_m3
Project root: c:\Users\vinam\OneDrive\Desktop\Workflow\Devi
Original request path: c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\ORIGINAL_REQUEST.md
Project specification: c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\orchestrator_1\PROJECT.md
Explorer handoff report: c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\explorer_survey_3\handoff.md
Parent conversation ID: 323b961b-7546-4ab9-bed6-3fa8c1984c7e

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INSTRUCTIONS:
1. You MUST read c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\ORIGINAL_REQUEST.md and c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\explorer_survey_3\handoff.md before making any changes.
2. Keep a progress.md in your working directory with 'Last visited: [timestamp]' for liveness.
3. When finished, verify your changes by running 'npm run lint' or appropriate build checks.
4. Write a comprehensive handoff report at c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\worker_m3\handoff.md following the Handoff Protocol.
5. Send a completion message via send_message to recipient 323b961b-7546-4ab9-bed6-3fa8c1984c7e.

EXCLUSIVE WRITE FILE OWNERSHIP:
You exclusively own and may edit the following files:
- components/pos-layout.tsx
- components/error-boundary.tsx
- app/admin/store/staff/page.tsx
- app/admin/super/staff/page.tsx
- app/admin/store/customers/page.tsx
- app/admin/store/customers/[id]/page.tsx
- app/admin/store/inventory/page.tsx
- app/admin/store/finance/page.tsx
- app/salesman/leads/page.tsx

TASKS & IMPLEMENTATION SCOPE:
1. Fix Safe String Evaluations & Null Guards (BUG-R3-01 & BUG-R3-02):
   - Replace any unsafe .replace('SA-', '') with String(d?.token || d?.id || '').replace('SA-', '') across views.
   - In app/admin/store/staff/page.tsx, app/admin/super/staff/page.tsx, app/admin/store/customers/page.tsx, app/admin/store/customers/[id]/page.tsx, app/admin/store/inventory/page.tsx, app/admin/store/finance/page.tsx, and app/salesman/leads/page.tsx:
     - Add null guards (if (!item) return false;) in filter and search functions.
     - Add optional chaining on customer?.phone?.replace, (item?.imeiList || []).some, etc.
2. Add Localized Error Boundaries (BUG-R3-03):
   - Create components/error-boundary.tsx as a reusable React Error Boundary component with a fallback card and reset option.
   - Wrap critical data tables in staff, customers, inventory, and finance views with <ErrorBoundary>.
3. Fix Mobile Tap Targets >= 44x44px (BUG-R3-06):
   - In components/pos-layout.tsx, adjust mobile menu toggle (line 333), logout button (line 354), and mobile drawer close button (line 376) to ensure touch target is at least 44x44px.
4. Fix Role-Aware Mobile Bottom Navigation (BUG-R3-07):
   - In components/pos-layout.tsx, dynamically render bottom navigation items based on user role (salesman vs store_admin vs super_admin) so administrators have access to their administrative dashboards on mobile viewports.
5. Verify Mobile Responsiveness:
   - Ensure horizontal table scroll wrappers (overflow-x: auto) are intact across all tabular views.
