const { Client } = require('pg');
const PASSWORD = process.env.DB_PASSWORD;

const DDL = `
-- Central brands table (shared across all devices)
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed base brands (idempotent)
INSERT INTO public.brands (name) VALUES
 ('Vivo'),('OPPO'),('Samsung'),('Xiaomi'),('Apple'),('Realme'),('OnePlus'),
 ('Motorola'),('Tecno'),('boAt'),('Noise'),('Fire-Boltt'),('HP'),('Godrej'),
 ('Haier'),('Whirlpool')
ON CONFLICT (name) DO NOTHING;

-- Ensure finance_providers exists, then add per-store columns the app needs.
CREATE TABLE IF NOT EXISTS public.finance_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_providers ADD COLUMN IF NOT EXISTS store_id text;
ALTER TABLE public.finance_providers ADD COLUMN IF NOT EXISTS merchant_id text;
ALTER TABLE public.finance_providers ADD COLUMN IF NOT EXISTS contact_person text;
ALTER TABLE public.finance_providers ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.finance_providers ADD COLUMN IF NOT EXISTS notes text;

-- Drop old global-unique constraints on name/code (they block same provider across stores)
ALTER TABLE public.finance_providers DROP CONSTRAINT IF EXISTS finance_providers_name_key;
ALTER TABLE public.finance_providers DROP CONSTRAINT IF EXISTS finance_providers_code_key;

-- de-dupe guard: same provider name per store only once
CREATE UNIQUE INDEX IF NOT EXISTS finance_providers_name_store_uq
  ON public.finance_providers (lower(name), coalesce(store_id,''));
`;

const FINANCE_SEED = [
  ['Bajaj Finance Limited','BAJAJ','DM-01'],['HDB Financial Services','HDB','DM-01'],
  ['IDFC First Bank','IDFC','DM-01'],['TVS Credit','TVS','DM-01'],
  ['HDFC Bank SmartEMI','HDFC','DM-01'],['ICICI Bank Card EMI','ICICI','DM-01'],
  ['Pine Labs Brand EMI','PINELABS','DM-01'],['Poonawalla Fincorp','POONAWALLA','DM-01'],
  ['Cholamandalam Finance','CHOLA','DM-01'],['Home Credit','HOMECREDIT','DM-01'],['DMI Finance','DMI','DM-01'],
  ['Bajaj Finance Limited','BAJAJ','DM-02'],['HDB Financial Services','HDB','DM-02'],
  ['IDFC First Bank','IDFC','DM-02'],['TVS Credit','TVS','DM-02'],
  ['Pine Labs Brand EMI','PINELABS','DM-02'],['Poonawalla Fincorp','POONAWALLA','DM-02'],
  ['Cholamandalam Finance','CHOLA','DM-02'],['Home Credit','HOMECREDIT','DM-02'],['DMI Finance','DMI','DM-02'],
];

(async () => {
  const client = new Client({
    host: 'db.sbojksxyzhdhgskaujqp.supabase.co', port: 5432, user: 'postgres',
    password: PASSWORD, database: 'postgres', ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000,
  });
  await client.connect();
  console.log('connected');
  await client.query(DDL);
  console.log('tables ready');
  for (const [name, code, store] of FINANCE_SEED) {
    await client.query(
      `INSERT INTO public.finance_providers (name, code, store_id) VALUES ($1,$2,$3)
       ON CONFLICT (lower(name), coalesce(store_id,'')) DO NOTHING`,
      [name, code, store]
    );
  }
  const b = await client.query('SELECT count(*)::int c FROM public.brands');
  const f = await client.query('SELECT count(*)::int c FROM public.finance_providers');
  console.log('brands rows:', b.rows[0].c, '| finance_providers rows:', f.rows[0].c);
  await client.end();
  process.exit(0);
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
