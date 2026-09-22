import { createClient } from './supabase/client';

export interface StoreBranch {
  id: string;
  code: string;
  name: string;
  subtitle?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email?: string;
  gstin?: string;
  manager_name?: string;
  manager_phone?: string;
  is_active: boolean;
  sales_today?: number;
  month_sales?: number;
  active_staff_count?: number;
  stock_count?: number;
  created_at?: string;
}

// Verified Physical Store Branches (Clean Initial State)
export const DEFAULT_STORES: StoreBranch[] = [
  {
    id: 'store-dm-01',
    code: 'DM-01',
    name: 'Devi Mobile Accessories',
    subtitle: 'Flagship Store • Kanthal Chauraha',
    address: 'Kanthal Chauraha, No-206/1, Ankpat Marg, Malipura, Bada Teliwada',
    city: 'Ujjain',
    state: 'Madhya Pradesh',
    pincode: '456001',
    phone: '+91 99265 98700',
    email: 'prince.devi@gmail.com',
    gstin: '23ALGPK9135M1ZT',
    manager_name: 'Prince Verma',
    manager_phone: '+91 99265 98700',
    is_active: true,
    sales_today: 0,
    month_sales: 0,
    active_staff_count: 1,
    stock_count: 0,
  },
  {
    id: 'store-dm-02',
    code: 'DM-02',
    name: 'Devi Mobile 2.0',
    subtitle: 'Store Branch 2.0 • Freeganj',
    address: '17, Bhoj Marg, Opposite to Skechers, Freeganj, Madhav Nagar',
    city: 'Ujjain',
    state: 'Madhya Pradesh',
    pincode: '456010',
    phone: '+91 78289 15933',
    email: 'manav.devi@gmail.com',
    gstin: '23ALGPK9135M1ZT',
    manager_name: 'Manav Sharma',
    manager_phone: '+91 78289 15933',
    is_active: true,
    sales_today: 0,
    month_sales: 0,
    active_staff_count: 1,
    stock_count: 0,
  }
];

let isSupabaseOnline = true;
let lastSupabaseCheck = 0;

// Fetch all active stores from Supabase (with fallback to default stores)
export async function getActiveStores(): Promise<StoreBranch[]> {
  const shouldTry = isSupabaseOnline || (Date.now() - lastSupabaseCheck > 60000);

  if (!shouldTry) {
    return DEFAULT_STORES;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error) {
      isSupabaseOnline = false;
      lastSupabaseCheck = Date.now();
      return DEFAULT_STORES;
    }

    if (!data || data.length === 0) {
      return DEFAULT_STORES;
    }

    isSupabaseOnline = true;
    return data.map((s: any) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      subtitle: s.subtitle || (s.code === 'DM-01' ? 'Flagship Store • Kanthal Chauraha' : 'Store Branch 2.0 • Freeganj'),
      address: s.address,
      city: s.city || 'Ujjain',
      state: s.state || 'Madhya Pradesh',
      pincode: s.pincode || (s.code === 'DM-02' ? '456010' : '456001'),
      phone: s.phone,
      email: s.email || (s.code === 'DM-02' ? 'manav.devi@gmail.com' : 'devi_intex@rediffmail.com'),
      gstin: s.gstin || '23ALGPK9135M1ZT',
      manager_name: s.manager_name || (s.code === 'DM-02' ? 'Manav Sharma' : 'Prince Verma'),
      manager_phone: s.manager_phone || s.phone,
      is_active: s.is_active ?? true,
      sales_today: s.sales_today || 0,
      month_sales: s.month_sales || 0,
      active_staff_count: s.active_staff_count || 5,
      stock_count: s.stock_count || 0,
      created_at: s.created_at,
    }));
  } catch (err) {
    isSupabaseOnline = false;
    lastSupabaseCheck = Date.now();
    return DEFAULT_STORES;
  }
}

// Create a New Physical Store in Supabase
export async function createStoreBranch(store: Omit<StoreBranch, 'id' | 'is_active'>): Promise<StoreBranch> {
  const supabase = createClient();
  
  const payload = {
    code: store.code.toUpperCase().trim(),
    name: store.name.trim(),
    address: store.address.trim(),
    city: store.city.trim(),
    state: store.state.trim() || 'Madhya Pradesh',
    pincode: store.pincode.trim(),
    phone: store.phone.trim(),
    email: store.email?.trim() || 'devi_intex@rediffmail.com',
    gstin: store.gstin?.trim() || '23ALGPK9135M1ZT',
    is_active: true,
  };

  try {
    const { data, error } = await supabase
      .from('stores')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error creating store in Supabase:', error);
    }
    
    return {
      id: data?.id || `store-${payload.code.toLowerCase()}`,
      ...payload,
      subtitle: `${payload.city} Branch`,
      manager_name: store.manager_name || 'Store Manager',
      sales_today: 0,
      month_sales: 0,
      active_staff_count: 1,
      stock_count: 0,
      is_active: true,
    };
  } catch (err) {
    console.error('Exception creating store:', err);
    return {
      id: `store-${payload.code.toLowerCase()}`,
      ...payload,
      subtitle: `${payload.city} Branch`,
      manager_name: store.manager_name || 'Store Manager',
      sales_today: 0,
      month_sales: 0,
      active_staff_count: 1,
      stock_count: 0,
      is_active: true,
    };
  }
}
