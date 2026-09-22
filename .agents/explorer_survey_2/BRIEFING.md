# BRIEFING — 2026-09-04T15:37:00+05:30

## Mission
Audit Core Business Engine Integrity & Edge Cases for Devi POS (R2 & related acceptance criteria).

## 🔒 My Identity
- Archetype: Explorer
- Roles: Core Business Engine Integrity Explorer
- Working directory: c:\Users\vinam\OneDrive\Desktop\Workflow\Devi\.agents\explorer_survey_2
- Original parent: 323b961b-7546-4ab9-bed6-3fa8c1984c7e
- Milestone: Survey / Pre-delivery QA Audit

## 🔒 Key Constraints
- Read-only investigation — do NOT modify or write source code files
- Only write metadata / reports to working directory (.agents\explorer_survey_2)
- Maintain progress.md heartbeat with 'Last visited: [timestamp]'
- Produce 5-component handoff report (handoff.md)
- Send completion message to parent (323b961b-7546-4ab9-bed6-3fa8c1984c7e)

## Current Parent
- Conversation ID: 323b961b-7546-4ab9-bed6-3fa8c1984c7e
- Updated: 2026-09-04T15:37:00+05:30

## Investigation State
- **Explored paths**:
  - `app/pos/page.tsx`, `lib/sales-pipeline.ts`, `app/api/deals/submit/route.ts`, `app/api/deals/action/route.ts`, `app/api/deals/list/route.ts`
  - `app/admin/store/register/page.tsx`, `app/admin/super/register/page.tsx`
  - `app/api/deals/tally/route.ts`, `lib/tally-tracker-service.ts`, `components/bills-management-view.tsx`
  - `lib/invoice-generator.ts`, `lib/bill-config-service.ts`, `components/invoice-modal.tsx`
  - `lib/leads-service.ts`, `app/api/leads/update/route.ts`, `app/api/leads/create/route.ts`, `app/api/leads/list/route.ts`, `app/api/leads/delete/route.ts`
  - `lib/customer-service.ts`, `app/api/customers/list/route.ts`, `app/api/customers/upsert/route.ts`, `app/admin/store/customers/[id]/page.tsx`, `app/admin/super/customers/[id]/page.tsx`
  - `supabase/schema.sql`, `supabase/wipe_all_demo_data.sql`, `supabase/salesman_leads.sql`
- **Key findings**:
  1. Second-hand ingestion targets non-existent `second_hand_inventory` table instead of `device_exchanges`, passes string store_id instead of UUID, and executes at deal submission rather than deal approval.
  2. Full-exchange deals cause double-counting in Daily Cash Register because `totalCollected` excludes `exchange`, setting `adjustedCash = finalPrice`. Day filters use UTC date string instead of IST. No formal shift open/close reconciliation model exists.
  3. Tally sync previously failed with UUID type error when writing to `invoice_id UUID`. Patch redirected write to `barcode TEXT`, which overwrites real barcodes. UI has bug where `tallyMap` is initialized empty and ignores DB marker `isTallyUploaded` on initial load/refresh.
  4. Invoices generate complete store GSTIN & customer details, but HSN code `85171290` is hardcoded across all items/categories. Thermal printing lacks 80mm receipt stylesheet/template.
  5. Leads status update API successfully accepts both `id` and `leadId`. Customer CRM profile fails to aggregate purchases and leads (hardcoded empty arrays). Customer `total_spent` is triple-counted on every approved sale (submitted deal + approval API + approval client callback).
- **Unexplored areas**: None within R2 scope.

## Key Decisions Made
- All 5 scope areas thoroughly investigated with exact file paths, line numbers, and logic chains. Compiling final handoff.md now.

## Artifact Index
- DISPATCH.md — record of initial prompt
- BRIEFING.md — working memory and identity
- progress.md — liveness heartbeat
- handoff.md — final comprehensive report
