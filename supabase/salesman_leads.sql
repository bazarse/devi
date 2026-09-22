-- ============================================================================
-- 🎯 SALESMAN LEADS & CUSTOMER ENQUIRY DATABASE PIPELINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.salesman_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_token TEXT UNIQUE DEFAULT ('LD-' || floor(100000 + random() * 900000)::text),
    store_id TEXT NOT NULL REFERENCES public.stores(code) ON DELETE CASCADE,
    salesman_phone TEXT NOT NULL,
    salesman_name TEXT NOT NULL DEFAULT 'Sales Staff',
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    interested_category TEXT NOT NULL DEFAULT 'Mobile Phone',
    interested_model TEXT NOT NULL,
    budget_range NUMERIC(10, 2),
    expected_purchase_date DATE,
    lead_status TEXT NOT NULL DEFAULT 'Hot Lead' CHECK (lead_status IN ('Hot Lead', 'Warm Lead', 'Follow Up', 'Converted', 'Lost')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.salesman_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all on salesman_leads" ON public.salesman_leads FOR ALL TO anon USING (true) WITH CHECK (true);

-- Index for fast lookup by salesman
CREATE INDEX IF NOT EXISTS idx_salesman_leads_phone ON public.salesman_leads(salesman_phone);
CREATE INDEX IF NOT EXISTS idx_salesman_leads_store ON public.salesman_leads(store_id);
