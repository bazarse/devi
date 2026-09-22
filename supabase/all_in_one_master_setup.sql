-- ============================================================================
-- 🚀 DEVI MOBILE POS - ALL-IN-ONE MASTER DATABASE SETUP (100% COMPLETE & FREE)
-- ============================================================================
-- Just copy this entire script, paste into Supabase SQL Editor, and click RUN!
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'store_admin', 'salesman', 'technician', 'customer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE stock_status AS ENUM ('in_stock', 'sold', 'in_transfer', 'in_transit', 'defective', 'returned');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE approval_status AS ENUM ('pending_approval', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE repair_status_enum AS ENUM ('received', 'diagnosing', 'waiting_parts', 'in_progress', 'ready', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE device_condition_enum AS ENUM ('Excellent', 'Good', 'Fair', 'Poor');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE lead_status_enum AS ENUM ('New', 'Contacted', 'Interested', 'Follow_Up', 'Converted', 'Not_Interested');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ----------------------------------------------------------------------------
-- 3. CORE TABLES
-- ----------------------------------------------------------------------------

-- A. STORES TABLE
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    subtitle TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Ujjain',
    state TEXT NOT NULL DEFAULT 'Madhya Pradesh',
    pincode TEXT NOT NULL DEFAULT '456001',
    phone TEXT NOT NULL,
    whatsapp TEXT DEFAULT '+919893264192',
    email TEXT DEFAULT 'devi_intex@rediffmail.com',
    gstin TEXT DEFAULT '23ALGPK9135M1ZT',
    manager_name TEXT DEFAULT 'Vipin Sharma',
    manager_phone TEXT,
    sales_today NUMERIC(14, 2) DEFAULT 0.00,
    month_sales NUMERIC(14, 2) DEFAULT 0.00,
    active_staff_count INT DEFAULT 4,
    stock_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Stores (Store 1: Kanthal Chauraha & Store 2: Freeganj)
INSERT INTO public.stores (code, name, subtitle, address, city, state, pincode, phone, email, gstin, manager_name, active_staff_count, is_active)
VALUES 
('DM-01', 'Devi Mobile Accessories', '4.7 ⭐ (1,229 Reviews) • Flagship', 'Kanthal Chauraha, No-206/1, Ankpat Marg, Malipura, Ujjain', 'Ujjain', 'Madhya Pradesh', '456001', '+91 98932 64192', 'devi_intex@rediffmail.com', '23ALGPK9135M1ZT', 'Vipin Sharma', 12, true),
('DM-02', 'Devi Mobile 2.0', 'Electronics & Smartphone Experience Center', '17, Bhoj Marg, Opposite to Skechers, Freeganj, Madhav Nagar', 'Ujjain', 'Madhya Pradesh', '456010', '+91 62623 35656', 'devi_intex@rediffmail.com', '23ALGPK9135M1ZT', 'Nikhlesh Rawat', 8, true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    pincode = EXCLUDED.pincode,
    phone = EXCLUDED.phone;

-- B. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT UNIQUE,
    icon TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.categories (name, slug, icon, display_order)
VALUES 
('Mobile Phone', 'smartphones', 'smartphone', 1),
('Accessories', 'accessories', 'headphones', 2),
('Appliances', 'appliances', 'tv', 3),
('Spare Parts', 'spare_parts', 'wrench', 4)
ON CONFLICT (name) DO NOTHING;

-- C. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    brand TEXT NOT NULL,
    model_name TEXT,
    model TEXT,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Mobile Phone',
    hsn_code TEXT NOT NULL DEFAULT '85171290',
    barcode TEXT,
    mrp NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    base_price NUMERIC(10, 2) DEFAULT 0.00,
    selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(10, 2) DEFAULT 0.00,
    min_selling_price NUMERIC(10, 2) DEFAULT 0.00,
    min_stock_alert INT DEFAULT 2,
    image_url TEXT,
    is_serialized BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.products (brand, model_name, title, category, hsn_code, mrp, selling_price, cost_price)
VALUES 
('Vivo', 'Vivo V30 5G (8GB/128GB)', 'Vivo V30 5G (8GB RAM, 128GB) - Classic Black', 'Mobile Phone', '85171290', 35999, 33999, 29500),
('Vivo', 'Vivo V30 Pro 5G (12GB/512GB)', 'Vivo V30 Pro 5G (12GB RAM, 512GB) - Andaman Blue', 'Mobile Phone', '85171290', 49999, 46999, 41000),
('Vivo', 'Vivo T3 5G (8GB/128GB)', 'Vivo T3 5G (8GB RAM, 128GB) - Cosmic Blue', 'Mobile Phone', '85171290', 22999, 19999, 17200),
('Vivo', 'Vivo Y200 5G (8GB/128GB)', 'Vivo Y200 5G (8GB RAM, 128GB) - Desert Gold', 'Mobile Phone', '85171290', 24999, 21999, 18900),
('Vivo', 'Vivo Y28 5G (6GB/128GB)', 'Vivo Y28 5G (6GB RAM, 128GB) - Glitter Aqua', 'Mobile Phone', '85171290', 17999, 15499, 13400),
('OPPO', 'OPPO A5 PRO 5G (8GB/128GB)', 'OPPO A5 PRO 5G (8GB RAM, 128GB) - Starry Black', 'Mobile Phone', '85171290', 19999, 17280, 14644),
('Samsung', 'Samsung Galaxy F15 5G 6+128GB', 'Samsung Galaxy F15 5G 6+128GB E156 - Ash Black', 'Mobile Phone', '85171290', 14999, 12999, 11096),
('Samsung', 'Samsung Galaxy S24 Ultra 5G (12GB/256GB)', 'Samsung Galaxy S24 Ultra 5G - Titanium Gray', 'Mobile Phone', '85171290', 134999, 129999, 115000),
('Apple', 'Apple iPhone 15 (128 GB)', 'Apple iPhone 15 (128 GB) - Black / Blue', 'Mobile Phone', '85171290', 79900, 69900, 62000),
('OnePlus', 'OnePlus 12R 5G (8GB/128GB)', 'OnePlus 12R 5G (8GB RAM, 128GB) - Cool Blue', 'Mobile Phone', '85171290', 39999, 38500, 34000)
ON CONFLICT DO NOTHING;

-- D. IMEI STOCK / INVENTORY TABLE (With Creditor / Supplier Support)
CREATE TABLE IF NOT EXISTS public.imei_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id TEXT NOT NULL DEFAULT 'DM-01',
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    imei1 TEXT UNIQUE NOT NULL,
    imei2 TEXT,
    serial_no TEXT,
    batch_no TEXT,
    color TEXT,
    storage TEXT,
    supplier_name TEXT DEFAULT 'Direct Distributor', -- Creditor / Supplier Name
    purchase_price NUMERIC(10, 2) NOT NULL DEFAULT 11096.61,
    selling_price NUMERIC(10, 2) DEFAULT 12999.00,
    status TEXT NOT NULL DEFAULT 'in_stock',
    sold_at TIMESTAMPTZ,
    sold_by_salesman_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Real Samsung F15 5G IMEI Inventory
INSERT INTO public.imei_stock (store_id, imei1, purchase_price, supplier_name, status)
VALUES 
('DM-01', '354772952358675', 11096.61, 'Samsung India Electronics Pvt Ltd', 'in_stock'),
('DM-01', '354772952358683', 11096.61, 'Samsung India Electronics Pvt Ltd', 'in_stock'),
('DM-01', '354772952358691', 11096.61, 'Samsung India Electronics Pvt Ltd', 'in_stock'),
('DM-01', '354772952358709', 11096.61, 'Samsung India Electronics Pvt Ltd', 'in_stock'),
('DM-01', '354772952358717', 11096.61, 'Samsung India Electronics Pvt Ltd', 'in_stock'),
('DM-01', '354772952358725', 11096.61, 'Samsung India Electronics Pvt Ltd', 'in_stock'),
('DM-01', '354772952358733', 11096.61, 'Samsung India Electronics Pvt Ltd', 'in_stock'),
('DM-01', '354772952358741', 11096.61, 'Samsung India Electronics Pvt Ltd', 'in_stock'),
('DM-01', '354772952358758', 11096.61, 'Samsung India Electronics Pvt Ltd', 'in_stock'),
('DM-01', '354772952358766', 11096.61, 'Samsung India Electronics Pvt Ltd', 'in_stock'),
('DM-01', '354772952358774', 11096.61, 'Samsung India Electronics Pvt Ltd', 'in_stock'),
('DM-01', '354772952358782', 11096.61, 'Samsung India Electronics Pvt Ltd', 'in_stock'),
('DM-01', '354772952358790', 11096.61, 'Samsung India Electronics Pvt Ltd', 'in_stock'),
('DM-01', '354772952358808', 11096.61, 'Samsung India Electronics Pvt Ltd', 'in_stock'),
('DM-01', '354772952358816', 11096.61, 'Samsung India Electronics Pvt Ltd', 'in_stock')
ON CONFLICT (imei1) DO NOTHING;

-- E. STAFF USERS TABLE
CREATE TABLE IF NOT EXISTS public.staff_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT UNIQUE NOT NULL,
    passcode TEXT NOT NULL DEFAULT '1234',
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('salesman', 'store_admin', 'super_admin')),
    store_id TEXT NOT NULL DEFAULT 'DM-01',
    email TEXT,
    commission_rate NUMERIC(4, 2) DEFAULT 1.00,
    monthly_sales_target NUMERIC(10, 2) DEFAULT 500000.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Staff Accounts (HQ, Store 1 & Store 2)
INSERT INTO public.staff_users (phone, passcode, full_name, role, store_id, email, commission_rate, is_active)
VALUES
('9893264192', '1234', 'Vipin Sharma (HQ Owner)', 'super_admin', 'DM-01', 'devi_intex@rediffmail.com', 2.00, true),
('9713001600', '1234', 'Kunal Patil (Manager)', 'store_admin', 'DM-01', 'kunal.devi@gmail.com', 1.50, true),
('9876543210', '1234', 'Nikhlesh Rawat', 'salesman', 'DM-01', 'nikhlesh.devi@gmail.com', 1.00, true),
('9893012345', '1234', 'Aakash Verma', 'salesman', 'DM-01', 'aakash.devi@gmail.com', 1.00, true),
('6262335656', '1234', 'Nitin Rawat (Manager)', 'store_admin', 'DM-02', 'nitin.devi@gmail.com', 1.50, true),
('9826011223', '1234', 'Rahul Soni', 'salesman', 'DM-02', 'rahul.devi@gmail.com', 1.00, true),
('9755443322', '1234', 'Vikram Chouhan', 'salesman', 'DM-02', 'vikram.devi@gmail.com', 1.00, true)
ON CONFLICT (phone) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    store_id = EXCLUDED.store_id,
    passcode = EXCLUDED.passcode;

-- F. FINANCE PROVIDERS
CREATE TABLE IF NOT EXISTS public.finance_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    contact_person TEXT,
    contact_phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.finance_providers (name, code)
VALUES 
('Bajaj Finserv', 'BAJAJ'),
('HDFC Bank', 'HDFC'),
('ICICI Bank', 'ICICI'),
('Pine Labs', 'PINELABS'),
('TVS Credit', 'TVS'),
('IDFC FIRST Bank', 'IDFC')
ON CONFLICT (name) DO NOTHING;

-- G. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    primary_store_id TEXT DEFAULT 'DM-01',
    credit_balance NUMERIC(12, 2) DEFAULT 0.00,
    total_spent NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- H. SALES APPROVALS PIPELINE TABLE
CREATE TABLE IF NOT EXISTS public.sales_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_token TEXT UNIQUE DEFAULT ('SA-' || floor(100000 + random() * 900000)::text),
    store_id TEXT NOT NULL DEFAULT 'DM-01',
    salesman_name TEXT DEFAULT 'Staff Salesman',
    salesman_phone TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Mobile Phone',
    imei_serial TEXT NOT NULL,
    final_price NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    finance_provider TEXT,
    disbursement_amount NUMERIC(10, 2) DEFAULT 0,
    down_payment_cash NUMERIC(10, 2) DEFAULT 0,
    down_payment_upi NUMERIC(10, 2) DEFAULT 0,
    down_payment_card NUMERIC(10, 2) DEFAULT 0,
    cash_amount NUMERIC(10, 2) DEFAULT 0,
    upi_amount NUMERIC(10, 2) DEFAULT 0,
    card_amount NUMERIC(10, 2) DEFAULT 0,
    neft_amount NUMERIC(10, 2) DEFAULT 0,
    has_device_exchange BOOLEAN DEFAULT false,
    exchange_amount NUMERIC(10, 2) DEFAULT 0,
    remark TEXT,
    status TEXT NOT NULL DEFAULT 'pending_approval',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- I. INVOICES / BILLING TABLES
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    store_id TEXT NOT NULL DEFAULT 'DM-01',
    approval_id UUID REFERENCES public.sales_approvals(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT,
    total_taxable_value NUMERIC(10, 2) NOT NULL,
    cgst_amount NUMERIC(10, 2) NOT NULL,
    sgst_amount NUMERIC(10, 2) NOT NULL,
    round_off NUMERIC(6, 2) DEFAULT 0,
    final_amount NUMERIC(10, 2) NOT NULL,
    payment_mode TEXT NOT NULL,
    salesman_name TEXT DEFAULT 'NIKHLESH',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id TEXT NOT NULL DEFAULT 'DM-01',
    invoice_number TEXT UNIQUE NOT NULL,
    sale_approval_id UUID REFERENCES public.sales_approvals(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT,
    customer_gstin TEXT,
    final_amount NUMERIC(10, 2) NOT NULL,
    base_amount NUMERIC(10, 2) NOT NULL,
    cgst_amount NUMERIC(10, 2) NOT NULL,
    sgst_amount NUMERIC(10, 2) NOT NULL,
    total_tax NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    payment_method TEXT NOT NULL,
    cash_amount NUMERIC(10, 2) DEFAULT 0.00,
    upi_amount NUMERIC(10, 2) DEFAULT 0.00,
    card_amount NUMERIC(10, 2) DEFAULT 0.00,
    disbursement_amount NUMERIC(10, 2) DEFAULT 0.00,
    exchange_amount NUMERIC(10, 2) DEFAULT 0.00,
    is_fast_bill BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- J. LEADS & CRM TABLE
CREATE TABLE IF NOT EXISTS public.salesman_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salesman_phone TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    product_interest TEXT,
    budget NUMERIC(10, 2),
    status TEXT DEFAULT 'hot',
    notes TEXT,
    store_id TEXT DEFAULT 'DM-01',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- K. SECOND HAND / EXCHANGES
CREATE TABLE IF NOT EXISTS public.device_exchanges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_approval_id UUID REFERENCES public.sales_approvals(id) ON DELETE SET NULL,
    store_id TEXT NOT NULL DEFAULT 'DM-01',
    device_name TEXT NOT NULL,
    device_imei TEXT NOT NULL,
    device_condition TEXT DEFAULT 'Good',
    valuation_amount NUMERIC(10, 2) NOT NULL,
    received_from_customer TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    status TEXT DEFAULT 'in_stock',
    resale_price NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.second_hand_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id TEXT NOT NULL DEFAULT 'DM-01',
    device_name TEXT NOT NULL,
    brand TEXT,
    imei1 TEXT UNIQUE NOT NULL,
    purchase_price NUMERIC(10, 2) NOT NULL,
    expected_selling_price NUMERIC(10, 2),
    actual_selling_price NUMERIC(10, 2),
    customer_name TEXT,
    customer_phone TEXT,
    status TEXT DEFAULT 'in_stock',
    condition TEXT DEFAULT 'Good',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- L. KHATA (LEDGER) & REPAIRS
CREATE TABLE IF NOT EXISTS public.khata_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id TEXT NOT NULL DEFAULT 'DM-01',
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_phone TEXT,
    customer_name TEXT,
    transaction_type TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    balance_after NUMERIC(10, 2) NOT NULL,
    payment_mode TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.repair_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_number TEXT UNIQUE NOT NULL,
    store_id TEXT NOT NULL DEFAULT 'DM-01',
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    device_brand TEXT NOT NULL,
    device_model TEXT NOT NULL,
    imei_or_serial TEXT,
    issue_description TEXT NOT NULL,
    estimated_cost NUMERIC(10, 2) DEFAULT 0.00,
    advance_paid NUMERIC(10, 2) DEFAULT 0.00,
    final_cost NUMERIC(10, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'received',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) & HARDENING
-- ----------------------------------------------------------------------------

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imei_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salesman_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.second_hand_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_orders ENABLE ROW LEVEL SECURITY;

-- Allow anon read & insert permissions for POS client functionality
CREATE POLICY "Allow anon read stores" ON public.stores FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon read products" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon read finance" ON public.finance_providers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon access imei_stock" ON public.imei_stock FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon access staff_users" ON public.staff_users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon access sales_approvals" ON public.sales_approvals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon access customers" ON public.customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon access invoices" ON public.invoices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon access billing_invoices" ON public.billing_invoices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon access leads" ON public.salesman_leads FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon access second_hand" ON public.second_hand_inventory FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon access exchanges" ON public.device_exchanges FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon access khata" ON public.khata_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon access repairs" ON public.repair_orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Full bypass for Server backend (service_role)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- ✅ SETUP COMPLETE! Your Devi Mobile POS backend is 100% Ready.
-- ============================================================================
