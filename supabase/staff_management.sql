-- ============================================================================
-- 👥 DEVI MOBILE - STAFF & USER MANAGEMENT DATABASE SCHEMA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.staff_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT UNIQUE NOT NULL,
    passcode TEXT NOT NULL DEFAULT '1234',
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('salesman', 'store_admin', 'super_admin')),
    store_id TEXT NOT NULL REFERENCES public.stores(code) ON DELETE CASCADE,
    email TEXT,
    commission_rate NUMERIC(4, 2) DEFAULT 1.00,
    monthly_sales_target NUMERIC(10, 2) DEFAULT 500000.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Staff Accounts for Store 1 & Store 2
INSERT INTO public.staff_users (phone, passcode, full_name, role, store_id, email, commission_rate, is_active)
VALUES
-- Super Admin HQ
('9893264192', '1234', 'Vipin Sharma (HQ Owner)', 'super_admin', 'DM-01', 'devi_intex@rediffmail.com', 2.00, true),

-- Store 1 Admins & Sales Staff (Kanthal Chauraha)
('9713001600', '1234', 'Kunal Patil (Manager)', 'store_admin', 'DM-01', 'kunal.devi@gmail.com', 1.50, true),
('9876543210', '1234', 'Nikhlesh Rawat', 'salesman', 'DM-01', 'nikhlesh.devi@gmail.com', 1.00, true),
('9893012345', '1234', 'Aakash Verma', 'salesman', 'DM-01', 'aakash.devi@gmail.com', 1.00, true),

-- Store 2 Admins & Sales Staff (Freeganj)
('6262335656', '1234', 'Nitin Rawat (Manager)', 'store_admin', 'DM-02', 'nitin.devi@gmail.com', 1.50, true),
('9826011223', '1234', 'Rahul Soni', 'salesman', 'DM-02', 'rahul.devi@gmail.com', 1.00, true),
('9755443322', '1234', 'Vikram Chouhan', 'salesman', 'DM-02', 'vikram.devi@gmail.com', 1.00, true)
ON CONFLICT (phone) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    store_id = EXCLUDED.store_id,
    passcode = EXCLUDED.passcode;

-- Enable Row Level Security
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon select staff_users" ON public.staff_users FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert staff_users" ON public.staff_users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update staff_users" ON public.staff_users FOR UPDATE TO anon USING (true);

-- Index for phone & store
CREATE INDEX IF NOT EXISTS idx_staff_phone ON public.staff_users(phone);
CREATE INDEX IF NOT EXISTS idx_staff_store ON public.staff_users(store_id);
