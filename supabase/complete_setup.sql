-- ============================================================================
-- 🏬 DEVI MOBILE POS - COMPLETE DATABASE SCHEMA & PIPELINE SETUP
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Stores Table (Store 1 & Store 2 & Dynamic Branches)
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

-- Seed Store 1 & Store 2
INSERT INTO public.stores (code, name, subtitle, address, city, state, pincode, phone, email, gstin, manager_name, active_staff_count, is_active)
VALUES 
('DM-01', 'Devi Mobile Accessories', '4.7 ⭐ (1,229 Reviews) • Flagship', 'Kanthal Chauraha, No-206/1, Ankpat Marg, Malipura, Ujjain', 'Ujjain', 'Madhya Pradesh', '456001', '+91 98932 64192', 'devi_intex@rediffmail.com', '23ALGPK9135M1ZT', 'Vipin Sharma', 12, true),
('DM-02', 'Devi Mobile 2.0', 'Electronics & Smartphone Experience Center', '17, Bhoj Marg, Opposite to Skechers, Freeganj, Madhav Nagar', 'Ujjain', 'Madhya Pradesh', '456010', '+91 62623 35656', 'devi_intex@rediffmail.com', '23ALGPK9135M1ZT', 'Nikhlesh Rawat', 8, true)
ON CONFLICT (code) DO NOTHING;

-- 3. Products Catalog Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand TEXT NOT NULL,
    model_name TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Mobile Phone',
    hsn_code TEXT NOT NULL DEFAULT '85171290',
    mrp NUMERIC(10, 2) NOT NULL,
    selling_price NUMERIC(10, 2) NOT NULL,
    cost_price NUMERIC(10, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Popular Models into products
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

-- 4. IMEI Inventory Table
CREATE TABLE IF NOT EXISTS public.imei_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id TEXT NOT NULL REFERENCES public.stores(code) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    imei1 TEXT UNIQUE NOT NULL,
    imei2 TEXT,
    serial_no TEXT,
    batch_no TEXT,
    purchase_price NUMERIC(10, 2) NOT NULL DEFAULT 11096.61,
    status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold', 'in_transit', 'defective', 'returned')),
    sold_at TIMESTAMPTZ,
    sold_by_salesman_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed 16 Samsung F15 5G IMEI units into DM-01
INSERT INTO public.imei_stock (store_id, imei1, purchase_price, status)
VALUES 
('DM-01', '354772952358675', 11096.61, 'in_stock'),
('DM-01', '354772952358683', 11096.61, 'in_stock'),
('DM-01', '354772952358691', 11096.61, 'in_stock'),
('DM-01', '354772952358709', 11096.61, 'in_stock'),
('DM-01', '354772952358717', 11096.61, 'in_stock'),
('DM-01', '354772952358725', 11096.61, 'in_stock'),
('DM-01', '354772952358733', 11096.61, 'in_stock'),
('DM-01', '354772952358741', 11096.61, 'in_stock'),
('DM-01', '354772952358758', 11096.61, 'in_stock'),
('DM-01', '354772952358766', 11096.61, 'in_stock'),
('DM-01', '354772952358774', 11096.61, 'in_stock'),
('DM-01', '354772952358782', 11096.61, 'in_stock'),
('DM-01', '354772952358790', 11096.61, 'in_stock'),
('DM-01', '354772952358808', 11096.61, 'in_stock'),
('DM-01', '354772952358816', 11096.61, 'in_stock')
ON CONFLICT (imei1) DO NOTHING;

-- 5. Sales Approvals Table
CREATE TABLE IF NOT EXISTS public.sales_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_token TEXT UNIQUE DEFAULT ('SA-' || floor(100000 + random() * 900000)::text),
    store_id TEXT NOT NULL REFERENCES public.stores(code) ON DELETE CASCADE,
    salesman_name TEXT DEFAULT 'Staff Salesman',
    salesman_phone TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Mobile Phone',
    imei_serial TEXT NOT NULL,
    final_price NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'EMI', 'UPI', 'Card')),
    finance_provider TEXT,
    disbursement_amount NUMERIC(10, 2) DEFAULT 0,
    down_payment_cash NUMERIC(10, 2) DEFAULT 0,
    down_payment_upi NUMERIC(10, 2) DEFAULT 0,
    down_payment_card NUMERIC(10, 2) DEFAULT 0,
    cash_amount NUMERIC(10, 2) DEFAULT 0,
    upi_amount NUMERIC(10, 2) DEFAULT 0,
    card_amount NUMERIC(10, 2) DEFAULT 0,
    has_device_exchange BOOLEAN DEFAULT false,
    exchange_amount NUMERIC(10, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(code) ON DELETE CASCADE,
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

-- Enable RLS & Allow public anon access for POS terminal
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imei_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read stores" ON public.stores FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert stores" ON public.stores FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon read products" ON public.products FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert products" ON public.products FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon read imei_stock" ON public.imei_stock FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert imei_stock" ON public.imei_stock FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon read sales_approvals" ON public.sales_approvals FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert sales_approvals" ON public.sales_approvals FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update sales_approvals" ON public.sales_approvals FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anon read invoices" ON public.invoices FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert invoices" ON public.invoices FOR INSERT TO anon WITH CHECK (true);
