-- ============================================================================
-- 🏢 DEVI MOBILE MULTI-STORE DATABASE FOUNDATION & STORE ISOLATION ARCHITECTURE
-- ============================================================================

-- Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. STORES / PHYSICAL BRANCHES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- e.g. 'DM-01', 'DM-02', 'DM-03'
    name TEXT NOT NULL,        -- e.g. 'Devi Mobile Accessories', 'Devi Mobile 2.0'
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

-- ----------------------------------------------------------------------------
-- 2. SEED OFFICIAL PHYSICAL STORES (STORE 1 & STORE 2)
-- ----------------------------------------------------------------------------
INSERT INTO public.stores (
    code, 
    name, 
    subtitle, 
    address, 
    city, 
    state, 
    pincode, 
    phone, 
    email, 
    gstin, 
    manager_name, 
    active_staff_count,
    is_active
)
VALUES 
(
    'DM-01',
    'Devi Mobile Accessories',
    '4.7 ⭐ (1,229 Google Reviews) • Flagship Store',
    'Kanthal Chauraha, No-206/1, Ankpat Marg, Malipura, Bada Teliwada',
    'Ujjain',
    'Madhya Pradesh',
    '456001',
    '+91 98932 64192',
    'devi_intex@rediffmail.com',
    '23ALGPK9135M1ZT',
    'Vipin Sharma',
    12,
    true
),
(
    'DM-02',
    'Devi Mobile 2.0',
    'Electronics & Smartphone Experience Center',
    '17, Bhoj Marg, Opposite to Skechers, Freeganj, Madhav Nagar',
    'Ujjain',
    'Madhya Pradesh',
    '456010',
    '+91 62623 35656',
    'devi_intex@rediffmail.com',
    '23ALGPK9135M1ZT',
    'Nikhlesh Rawat',
    8,
    true
)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    subtitle = EXCLUDED.subtitle,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    pincode = EXCLUDED.pincode,
    phone = EXCLUDED.phone,
    manager_name = EXCLUDED.manager_name,
    active_staff_count = EXCLUDED.active_staff_count;

-- ----------------------------------------------------------------------------
-- 3. STORE ISOLATED INVENTORY TABLE (Per-Store Stock Count)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id TEXT NOT NULL REFERENCES public.stores(code) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    min_stock_alert INT DEFAULT 2,
    last_restocked_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, product_id)
);

-- ----------------------------------------------------------------------------
-- 4. STORE ISOLATED IMEI UNITS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.imei_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id TEXT NOT NULL REFERENCES public.stores(code) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    imei1 TEXT UNIQUE NOT NULL,
    imei2 TEXT,
    serial_no TEXT,
    batch_no TEXT,
    purchase_price NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold', 'in_transfer', 'defective', 'returned')),
    sold_at TIMESTAMPTZ,
    sold_by_salesman_id TEXT,
    invoice_id UUID,
    transferred_to_store_id TEXT REFERENCES public.stores(code) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5. STORE ISOLATED 2-STEP SALES APPROVALS TABLE
-- ----------------------------------------------------------------------------
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
    exchange_device_details TEXT,
    status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected')),
    approved_by TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    approved_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 6. STORE ISOLATED DAILY SALES REGISTER & GST INVOICES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL, -- e.g. '25-26/3521/DEVI'
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
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 7. INTER-STORE STOCK TRANSFER AUDIT TABLE (Store 1 <-> Store 2 <-> Store N)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_token TEXT UNIQUE DEFAULT ('TR-' || floor(100000 + random() * 900000)::text),
    from_store_id TEXT NOT NULL REFERENCES public.stores(code) ON DELETE CASCADE,
    to_store_id TEXT NOT NULL REFERENCES public.stores(code) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    imei_numbers TEXT[] NOT NULL,
    quantity INT NOT NULL,
    reason TEXT DEFAULT 'Inter-store customer demand rebalance',
    status TEXT NOT NULL DEFAULT 'in_transit' CHECK (status IN ('in_transit', 'received', 'cancelled')),
    initiated_by TEXT NOT NULL DEFAULT 'Super Admin HQ',
    received_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    received_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 8. INDEXES FOR LIGHTNING FAST STORE-SCOPED QUERIES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_store_inventory_store ON public.store_inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_imei_stock_store ON public.imei_stock(store_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_approvals_store ON public.sales_approvals(store_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_store ON public.invoices(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_stores ON public.stock_transfers(from_store_id, to_store_id);
