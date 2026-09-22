-- ==============================================================================
-- REAL INVENTORY & MULTI-STORE MIGRATION FOR DEVI MOBILE (UJJAIN)
-- Extracted from Original inventory.xlsx & Official Google Business Listings
-- ==============================================================================

-- 1. Insert 2 Physical Stores (Store 1: Kanthal Chauraha & Store 2: Freeganj)
INSERT INTO public.stores (code, name, address, city, state, pincode, phone, email, is_active)
VALUES 
  (
    'DM-01', 
    'Devi Mobile Accessories', 
    'Kanthal Chauraha, No-206/1, Ankpat Marg, Milkipura, Bada Teliwada, Malipura', 
    'Ujjain', 
    'Madhya Pradesh', 
    '456001', 
    '+91 98932 64192', 
    'devi_intex@rediffmail.com', 
    true
  ),
  (
    'DM-02', 
    'Devi Mobile 2.0', 
    '17, Bhoj Marg, Opposite to Skechers, Freeganj, Madhav Nagar', 
    'Ujjain', 
    'Madhya Pradesh', 
    '456010', 
    '+91 62623 35656', 
    'devi_intex@rediffmail.com', 
    true
  )
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email;

-- 2. Insert Real Products from inventory.xlsx & bills
INSERT INTO public.products (brand, model_name, title, category_id, cost_price, mrp, selling_price, hsn_code, min_stock_alert, is_active)
SELECT 
  'Samsung',
  'Samsung Galaxy F15 5G (6GB RAM, 128GB)',
  'Samsung Galaxy F15 5G 6+128GB E156',
  id,
  11096.61,
  14999.00,
  12999.00,
  '85171290',
  3,
  true
FROM public.categories WHERE slug = 'smartphones'
ON CONFLICT (model_name) DO UPDATE SET 
  cost_price = EXCLUDED.cost_price,
  selling_price = EXCLUDED.selling_price;

INSERT INTO public.products (brand, model_name, title, category_id, cost_price, mrp, selling_price, hsn_code, min_stock_alert, is_active)
SELECT 
  'OPPO',
  'OPPO A5 PRO 5G (8GB RAM, 128GB)',
  'OPPO A5 PRO 5G 8+128GB',
  id,
  14644.07,
  19999.00,
  17280.00,
  '85171290',
  2,
  true
FROM public.categories WHERE slug = 'smartphones'
ON CONFLICT (model_name) DO UPDATE SET 
  cost_price = EXCLUDED.cost_price,
  selling_price = EXCLUDED.selling_price;

INSERT INTO public.products (brand, model_name, title, category_id, cost_price, mrp, selling_price, hsn_code, min_stock_alert, is_active)
SELECT 
  'Apple',
  'Apple iPhone 15 (128GB) - Black',
  'Apple iPhone 15 128GB Black',
  id,
  62000.00,
  79900.00,
  69900.00,
  '85171290',
  2,
  true
FROM public.categories WHERE slug = 'smartphones'
ON CONFLICT (model_name) DO UPDATE SET 
  cost_price = EXCLUDED.cost_price,
  selling_price = EXCLUDED.selling_price;

-- 3. Insert Real IMEI Units from Devi Mobile Original inventory.xlsx
INSERT INTO public.imei_stock (store_id, product_id, imei1, purchase_price, status)
SELECT 
  'DM-01',
  p.id,
  i.imei,
  11096.61,
  'in_stock'
FROM public.products p
CROSS JOIN (
  VALUES 
    ('354772952358675'),
    ('354772952368328'),
    ('354772952374425'),
    ('354772952675292'),
    ('354772952730980'),
    ('354772952731822'),
    ('354772952736672'),
    ('354772952738025'),
    ('354772952788483'),
    ('354772952810345'),
    ('354772952810931'),
    ('354772952833966'),
    ('354772952834444'),
    ('354772952837983'),
    ('354772952838213'),
    ('354772952839484')
) AS i(imei)
WHERE p.model_name = 'Samsung Galaxy F15 5G (6GB RAM, 128GB)'
ON CONFLICT (imei1) DO NOTHING;
