-- Migration: add NEFT payment column + free-text remark to sales_approvals.
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
-- Safe/idempotent: only adds columns if they do not already exist.

ALTER TABLE public.sales_approvals
  ADD COLUMN IF NOT EXISTS neft_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.sales_approvals
  ADD COLUMN IF NOT EXISTS remark text;

-- Optional: verify
-- SELECT id, cash_amount, upi_amount, card_amount, neft_amount, remark
-- FROM public.sales_approvals LIMIT 1;
