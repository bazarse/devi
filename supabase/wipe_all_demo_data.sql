-- ============================================================================
-- 🧹 DEVI MOBILE POS - COMPLETE DATABASE PURGE & 3 AUTHORIZED USERS SEED
-- Run this in your Supabase SQL Editor to wipe demo data and set the 3 real admins.
-- ============================================================================

-- 1. Truncate all dynamic data tables (Cascades to all foreign keys)
TRUNCATE TABLE public.invoices CASCADE;
TRUNCATE TABLE public.sales_approvals CASCADE;
TRUNCATE TABLE public.imei_stock CASCADE;

-- 2. Clean auxiliary tables
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'second_hand_inventory') THEN
        TRUNCATE TABLE public.second_hand_inventory CASCADE;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cash_register_shifts') THEN
        TRUNCATE TABLE public.cash_register_shifts CASCADE;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leads') THEN
        TRUNCATE TABLE public.leads CASCADE;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'repair_jobs') THEN
        TRUNCATE TABLE public.repair_jobs CASCADE;
    END IF;
END $$;

-- 3. Create or Reset staff_users Table with the 3 Authorized Admins
CREATE TABLE IF NOT EXISTS public.staff_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT UNIQUE NOT NULL,
    passcode TEXT NOT NULL DEFAULT '0000',
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('salesman', 'store_admin', 'super_admin')),
    store_id TEXT NOT NULL DEFAULT 'DM-01',
    email TEXT,
    commission_rate NUMERIC(4, 2) DEFAULT 0.00,
    monthly_sales_target NUMERIC(12, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

TRUNCATE TABLE public.staff_users CASCADE;

-- 4. Seed the 3 Authorized Admins
INSERT INTO public.staff_users (phone, passcode, full_name, role, store_id, email, is_active)
VALUES 
('9893264192', '0000', 'Dilip Kishnani', 'super_admin', 'DM-01', 'dilip.devi@gmail.com', true),
('9926598700', '0000', 'Prince Verma', 'store_admin', 'DM-01', 'prince.devi@gmail.com', true),
('7828915933', '0000', 'Manav Sharma', 'store_admin', 'DM-02', 'manav.devi@gmail.com', true)
ON CONFLICT (phone) DO UPDATE 
SET passcode = EXCLUDED.passcode,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    store_id = EXCLUDED.store_id;

-- 5. Reset Store Branch Managers & Clean Counters
UPDATE public.stores 
SET sales_today = 0.00,
    month_sales = 0.00,
    active_staff_count = 1,
    stock_count = 0;

UPDATE public.stores SET manager_name = 'Prince Verma', phone = '+91 99265 98700' WHERE code = 'DM-01';
UPDATE public.stores SET manager_name = 'Manav Sharma', phone = '+91 78289 15933' WHERE code = 'DM-02';

-- 6. Verify clean status
SELECT 'DEVI Database successfully configured with 3 Authorized Admins (Dilip Kishnani, Prince Verma, Manav Sharma)!' AS status;
