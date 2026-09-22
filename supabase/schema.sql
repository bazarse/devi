-- ============================================================================
-- 📱 DEVI MOBILE POS & MANAGEMENT PLATFORM - SUPABASE POSTGRESQL SCHEMA
-- ============================================================================

-- Enable UUID & Crypto extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ENUMS
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'store_admin', 'salesman', 'technician', 'customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE stock_status AS ENUM ('in_stock', 'sold', 'in_transfer', 'defective', 'returned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_status AS ENUM ('pending_approval', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE repair_status_enum AS ENUM ('received', 'diagnosing', 'waiting_parts', 'in_progress', 'ready', 'delivered', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE device_condition_enum AS ENUM ('Excellent', 'Good', 'Fair', 'Poor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_status_enum AS ENUM ('New', 'Contacted', 'Interested', 'Follow_Up', 'Converted', 'Not_Interested');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 2. CORE TABLES
-- ----------------------------------------------------------------------------

-- A. STORES / BRANCHES
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL, -- e.g., 'DM-01', 'DM-02'
    address TEXT NOT NULL,
    city TEXT DEFAULT 'Indore',
    state TEXT DEFAULT 'Madhya Pradesh',
    phone TEXT NOT NULL,
    whatsapp TEXT,
    gstin TEXT DEFAULT '23AAAAA0000A1Z5',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- B. USER PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE,
    role user_role NOT NULL DEFAULT 'salesman',
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL, -- Null for super_admin
    passcode TEXT, -- 4/6 digit quick PIN for POS
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- C. CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    primary_store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    credit_balance NUMERIC(12, 2) DEFAULT 0.00, -- Khata / Udhar Balance
    total_spent NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- D. PRODUCT CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- 'Mobile Phone', 'Accessories', 'Appliances', 'Spare Parts'
    icon TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- E. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT,
    description TEXT,
    hsn_code TEXT DEFAULT '8517', -- Mobile HSN
    barcode TEXT,
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- MRP / Cost
    selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Selling Price
    min_selling_price NUMERIC(10, 2) DEFAULT 0.00,
    image_url TEXT,
    is_serialized BOOLEAN DEFAULT true, -- Requires IMEI / Serial if true
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);

-- F. STORE INVENTORY (General / Accessories Stock count per store)
CREATE TABLE IF NOT EXISTS public.store_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 0,
    low_stock_threshold INT DEFAULT 5,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, product_id)
);

-- G. IMEI / SERIAL NUMBER LEVEL STOCK
CREATE TABLE IF NOT EXISTS public.imei_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imei1 TEXT UNIQUE NOT NULL,
    imei2 TEXT,
    serial_number TEXT,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    color TEXT,
    storage TEXT, -- e.g. 128GB, 256GB
    purchase_price NUMERIC(10, 2) DEFAULT 0.00,
    selling_price NUMERIC(10, 2) NOT NULL,
    status stock_status DEFAULT 'in_stock',
    sold_at TIMESTAMPTZ,
    sold_invoice_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_imei_stock_imei1 ON public.imei_stock(imei1);
CREATE INDEX IF NOT EXISTS idx_imei_stock_store_status ON public.imei_stock(store_id, status);

-- H. FINANCE PROVIDERS
CREATE TABLE IF NOT EXISTS public.finance_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- 'Bajaj Finserv', 'HDFC Bank', 'ICICI Bank', 'Pine Labs'
    code TEXT UNIQUE,
    contact_person TEXT,
    contact_phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- I. 2-STEP SALES APPROVALS PIPELINE
CREATE TABLE IF NOT EXISTS public.sales_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    sales_person_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    sales_person_name TEXT NOT NULL,
    sales_person_phone TEXT,
    
    -- Customer Info
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT,
    
    -- Product Info
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    sub_category TEXT,
    imei_serial TEXT,
    hsn_code TEXT,
    barcode TEXT,
    product_price NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    discount_reason TEXT,
    final_price NUMERIC(10, 2) NOT NULL,
    
    -- Payment Mode & Breakdown
    payment_method TEXT NOT NULL, -- 'Cash' or 'EMI'
    cash_method TEXT, -- 'UPI', 'Cash', 'Card'
    cash_amount NUMERIC(10, 2) DEFAULT 0.00,
    upi_amount NUMERIC(10, 2) DEFAULT 0.00,
    card_amount NUMERIC(10, 2) DEFAULT 0.00,
    
    -- Finance Breakdown
    finance_provider TEXT,
    down_payment_cash NUMERIC(10, 2) DEFAULT 0.00,
    down_payment_upi NUMERIC(10, 2) DEFAULT 0.00,
    down_payment_card NUMERIC(10, 2) DEFAULT 0.00,
    disbursement_amount NUMERIC(10, 2) DEFAULT 0.00,
    
    -- Trade-In & Gifts & Extras
    has_device_exchange BOOLEAN DEFAULT false,
    device_name TEXT,
    device_imei TEXT,
    device_condition device_condition_enum,
    device_exchange_amount NUMERIC(10, 2) DEFAULT 0.00,
    
    is_gift BOOLEAN DEFAULT false,
    gifts JSONB DEFAULT '[]'::jsonb, -- Array of [{ name: 'Back Cover' }, ...]
    is_emi_locked BOOLEAN DEFAULT false,
    vas_details TEXT,
    vas_amount NUMERIC(10, 2) DEFAULT 0.00,
    
    -- Status & Approvals
    status approval_status DEFAULT 'pending_approval',
    rejection_reason TEXT,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by_name TEXT,
    approved_at TIMESTAMPTZ,
    invoice_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sales_approvals_store_status ON public.sales_approvals(store_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_approvals_approved_at ON public.sales_approvals(approved_at);

-- J. DEVICE EXCHANGES TABLE (Old Phone Inventory)
CREATE TABLE IF NOT EXISTS public.device_exchanges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_approval_id UUID REFERENCES public.sales_approvals(id) ON DELETE SET NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    device_name TEXT NOT NULL,
    device_imei TEXT NOT NULL,
    device_condition device_condition_enum NOT NULL DEFAULT 'Good',
    valuation_amount NUMERIC(10, 2) NOT NULL,
    received_from_customer TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    status TEXT DEFAULT 'in_stock', -- 'in_stock', 'refurbished', 'sold'
    resale_price NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- K. CUSTOMER LEADS CRM
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    sales_person_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    interest_category TEXT NOT NULL, -- 'Smartphone', 'Accessories', 'Appliances'
    product_of_interest TEXT,
    budget NUMERIC(10, 2),
    status lead_status_enum DEFAULT 'New',
    follow_up_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- L. BILLING INVOICES (Final Tax Invoices)
CREATE TABLE IF NOT EXISTS public.billing_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    invoice_number TEXT UNIQUE NOT NULL, -- e.g. 'DEVI24-25/001'
    sale_approval_id UUID REFERENCES public.sales_approvals(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT,
    customer_gstin TEXT,
    
    -- Pricing & 18% GST (9% CGST + 9% SGST)
    final_amount NUMERIC(10, 2) NOT NULL,
    base_amount NUMERIC(10, 2) NOT NULL,
    cgst_amount NUMERIC(10, 2) NOT NULL,
    sgst_amount NUMERIC(10, 2) NOT NULL,
    total_tax NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    
    -- Payment Details
    payment_method TEXT NOT NULL,
    cash_amount NUMERIC(10, 2) DEFAULT 0.00,
    upi_amount NUMERIC(10, 2) DEFAULT 0.00,
    card_amount NUMERIC(10, 2) DEFAULT 0.00,
    disbursement_amount NUMERIC(10, 2) DEFAULT 0.00,
    exchange_amount NUMERIC(10, 2) DEFAULT 0.00,
    
    is_fast_bill BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- M. INVOICE ITEMS
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.billing_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    imei_serial TEXT,
    hsn_code TEXT DEFAULT '8517',
    quantity INT DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    tax_rate NUMERIC(4, 2) DEFAULT 18.00,
    total NUMERIC(10, 2) NOT NULL
);

-- N. REPAIR ORDERS (Service / Job-Sheet Tracking)
CREATE TABLE IF NOT EXISTS public.repair_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_number TEXT UNIQUE NOT NULL, -- e.g. 'REP-24-1001'
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    device_brand TEXT NOT NULL,
    device_model TEXT NOT NULL,
    imei_or_serial TEXT,
    passcode_pattern TEXT, -- Device unlock pattern/PIN for technician testing
    issue_description TEXT NOT NULL,
    device_condition_notes TEXT,
    photos JSONB DEFAULT '[]'::jsonb, -- Storage image URLs
    
    estimated_cost NUMERIC(10, 2) DEFAULT 0.00,
    advance_paid NUMERIC(10, 2) DEFAULT 0.00,
    final_cost NUMERIC(10, 2) DEFAULT 0.00,
    
    status repair_status_enum DEFAULT 'received',
    assigned_technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    delivery_date TIMESTAMPTZ,
    technician_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- O. REPAIR TIMELINE LOGS
CREATE TABLE IF NOT EXISTS public.repair_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repair_id UUID NOT NULL REFERENCES public.repair_orders(id) ON DELETE CASCADE,
    status repair_status_enum NOT NULL,
    remarks TEXT,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- P. KHATA (CUSTOMER CREDIT LEDGER)
CREATE TABLE IF NOT EXISTS public.khata_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL, -- 'debit' (purchase on credit) or 'credit' (payment received)
    amount NUMERIC(10, 2) NOT NULL,
    balance_after NUMERIC(10, 2) NOT NULL,
    payment_mode TEXT, -- 'Cash', 'UPI'
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Q. INTER-STORE STOCK TRANSFERS
CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_number TEXT UNIQUE NOT NULL, -- 'TRF-24-001'
    from_store_id UUID NOT NULL REFERENCES public.stores(id),
    to_store_id UUID NOT NULL REFERENCES public.stores(id),
    product_id UUID NOT NULL REFERENCES public.products(id),
    imei TEXT,
    quantity INT DEFAULT 1,
    status TEXT DEFAULT 'pending', -- 'pending', 'in_transit', 'received', 'rejected'
    notes TEXT,
    initiated_by UUID REFERENCES public.profiles(id),
    received_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- R. PWA PUSH NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    customer_phone TEXT,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh_key TEXT,
    auth_key TEXT,
    fcm_token TEXT,
    platform TEXT DEFAULT 'web', -- 'web', 'android'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. SEED INITIAL DATA
-- ----------------------------------------------------------------------------

-- Insert Default Stores
INSERT INTO public.stores (name, code, address, city, state, phone, whatsapp, gstin)
VALUES 
('Devi Mobile - Main Branch', 'DM-01', 'Shop 101-103, Main Market Road', 'Indore', 'Madhya Pradesh', '+919876543210', '919876543210', '23AAAAA0000A1Z5'),
('Devi Mobile - City Branch', 'DM-02', 'Shop 12, City Mall Complex', 'Indore', 'Madhya Pradesh', '+919876543211', '919876543211', '23AAAAA0000A1Z5')
ON CONFLICT (code) DO NOTHING;

-- Insert Categories
INSERT INTO public.categories (name, icon, display_order)
VALUES 
('Mobile Phone', 'smartphone', 1),
('Accessories', 'headphones', 2),
('Appliances', 'tv', 3),
('Spare Parts', 'wrench', 4)
ON CONFLICT (name) DO NOTHING;

-- Insert Finance Providers
INSERT INTO public.finance_providers (name, code)
VALUES 
('Bajaj Finserv', 'BAJAJ'),
('HDFC Bank', 'HDFC'),
('ICICI Bank', 'ICICI'),
('Pine Labs', 'PINELABS')
ON CONFLICT (name) DO NOTHING;

-- Sample Smartphone Products
INSERT INTO public.products (title, brand, model, hsn_code, base_price, selling_price, min_selling_price)
VALUES
('iPhone 15 (128 GB) - Black', 'Apple', 'iPhone 15', '8517', 65000, 69900, 68000),
('Samsung Galaxy S24 (256 GB) - Onyx Black', 'Samsung', 'Galaxy S24', '8517', 72000, 79999, 76000),
('OnePlus 12R (8GB RAM, 128GB)', 'OnePlus', '12R', '8517', 36000, 39999, 38500),
('Redmi Note 13 Pro 5G (8GB/256GB)', 'Xiaomi', 'Note 13 Pro', '8517', 22000, 24999, 23500),
('Realme 12 Pro+ 5G (12GB/256GB)', 'Realme', '12 Pro+', '8517', 27000, 29999, 28500),
('Devi Fast Charger 65W GaN', 'Devi Accessories', 'D-65W', '8504', 800, 1499, 1199),
('Boat Rockerz 255 Pro+ Neckband', 'Boat', 'Rockerz 255', '8518', 900, 1299, 1099),
('Tempered Glass (Universal UV Glass)', 'Devi Pro', 'UV-Glass', '3926', 80, 299, 199)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS) on critical tables
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_orders ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active products & stores
CREATE POLICY "Allow public read for stores" ON public.stores FOR SELECT USING (true);
CREATE POLICY "Allow public read for categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public read for products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Allow public read for repair_orders status" ON public.repair_orders FOR SELECT USING (true);

-- Authenticated Users Policies
CREATE POLICY "Authenticated users full access to profiles" ON public.profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access to sales_approvals" ON public.sales_approvals FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access to billing_invoices" ON public.billing_invoices FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access to imei_stock" ON public.imei_stock FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access to customers" ON public.customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access to leads" ON public.leads FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access to repair_orders" ON public.repair_orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access to repair_timeline" ON public.repair_timeline FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access to khata" ON public.khata_transactions FOR ALL TO authenticated USING (true);
