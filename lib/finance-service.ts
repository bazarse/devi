'use client';

import { createClient } from './supabase/client';

export interface FinanceProvider {
  id: string;
  name: string;
  code: string;
  storeId: string; // 'DM-01' | 'DM-02' | 'ALL'
  merchantId?: string; // Terminal / Merchant Code
  contactPerson?: string; // DSA Executive Name
  contactPhone?: string; // DSA Executive Phone
  isActive: boolean;
  commissionRate?: number;
  notes?: string;
  createdAt: string;
}

export const DEFAULT_FINANCE_PROVIDERS: FinanceProvider[] = [
  {
    id: 'fin-dm01-bajaj',
    name: 'Bajaj Finance Limited',
    code: 'BAJAJ',
    storeId: 'DM-01',
    merchantId: 'BJ-KAN-456001',
    contactPerson: 'Rahul Sharma (Bajaj DSA)',
    contactPhone: '9826012345',
    isActive: true,
    notes: '0% EMI schemes, DBD available',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fin-dm01-hdb',
    name: 'HDB Financial Services',
    code: 'HDB',
    storeId: 'DM-01',
    merchantId: 'HDB-KAN-206',
    contactPerson: 'Vikas Dubey (HDB)',
    contactPhone: '9893012345',
    isActive: true,
    notes: 'Easy paper finance, fast approval',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fin-dm01-idfc',
    name: 'IDFC First Bank',
    code: 'IDFC',
    storeId: 'DM-01',
    merchantId: 'IDFC-UJN-01',
    contactPerson: 'Ankit Gupta (IDFC First)',
    contactPhone: '9755012345',
    isActive: true,
    notes: 'Zero down payment on premium phones',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fin-dm01-tvs',
    name: 'TVS Credit',
    code: 'TVS',
    storeId: 'DM-01',
    merchantId: 'TVS-KAN-78',
    contactPerson: 'Sunil Rathore (TVS)',
    contactPhone: '9425012345',
    isActive: true,
    notes: 'Budget & mid-range smartphone loans',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fin-dm01-hdfc',
    name: 'HDFC Bank SmartEMI',
    code: 'HDFC',
    storeId: 'DM-01',
    merchantId: 'HDFC-POS-0992',
    contactPerson: 'Branch Manager Freeganj',
    contactPhone: '9926012345',
    isActive: true,
    notes: 'Debit/Credit card cashback & EMI',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fin-dm01-icici',
    name: 'ICICI Bank Card EMI',
    code: 'ICICI',
    storeId: 'DM-01',
    merchantId: 'ICICI-DEV-11',
    contactPerson: 'Merchant Desk',
    contactPhone: '9827012345',
    isActive: true,
    notes: 'Instant swipe EMI',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fin-dm01-pinelabs',
    name: 'Pine Labs Brand EMI',
    code: 'PINELABS',
    storeId: 'DM-01',
    merchantId: 'PL-554412',
    contactPerson: 'Field Support',
    contactPhone: '9893998877',
    isActive: true,
    notes: 'Apple, Samsung, Vivo brand subvention',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fin-dm01-poonawalla',
    name: 'Poonawalla Fincorp',
    code: 'POONAWALLA',
    storeId: 'DM-01',
    isActive: true,
    notes: 'Consumer durable loans',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fin-dm01-cholamandalam',
    name: 'Cholamandalam Finance',
    code: 'CHOLA',
    storeId: 'DM-01',
    isActive: true,
    notes: 'Consumer & mobile finance',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fin-dm01-homecredit',
    name: 'Home Credit',
    code: 'HOMECREDIT',
    storeId: 'DM-01',
    isActive: true,
    notes: 'Quick paperless EMI',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fin-dm01-dmi',
    name: 'DMI Finance',
    code: 'DMI',
    storeId: 'DM-01',
    isActive: true,
    notes: 'Digital consumer loans',
    createdAt: new Date().toISOString()
  },
  // STORE 2 (FREEGANJ)
  {
    id: 'fin-dm02-bajaj',
    name: 'Bajaj Finance Limited',
    code: 'BAJAJ',
    storeId: 'DM-02',
    merchantId: 'BJ-FGJ-456010',
    contactPerson: 'Manish Soni (Bajaj Freeganj)',
    contactPhone: '9826055443',
    isActive: true,
    notes: 'Store 2.0 dedicated Bajaj desk',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fin-dm02-hdb',
    name: 'HDB Financial Services',
    code: 'HDB',
    storeId: 'DM-02',
    merchantId: 'HDB-FGJ-17',
    contactPerson: 'Rajesh Mehra (HDB)',
    contactPhone: '9893044332',
    isActive: true,
    notes: 'Fast approvals for walk-in buyers',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fin-dm02-idfc',
    name: 'IDFC First Bank',
    code: 'IDFC',
    storeId: 'DM-02',
    merchantId: 'IDFC-FGJ-22',
    contactPerson: 'Gaurav Yadav (IDFC)',
    contactPhone: '9755088776',
    isActive: true,
    notes: '0 Down payment festive schemes',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fin-dm02-tvs',
    name: 'TVS Credit',
    code: 'TVS',
    storeId: 'DM-02',
    merchantId: 'TVS-FGJ-90',
    contactPerson: 'Rohit Chouhan (TVS)',
    contactPhone: '9425033221',
    isActive: true,
    notes: 'Instant KYC verification',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fin-dm02-pinelabs',
    name: 'Pine Labs Brand EMI',
    code: 'PINELABS',
    storeId: 'DM-02',
    merchantId: 'PL-FGJ-8812',
    contactPerson: 'Field Support',
    contactPhone: '9893998877',
    isActive: true,
    notes: 'Multi-bank credit & debit EMI terminal',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fin-dm02-poonawalla',
    name: 'Poonawalla Fincorp',
    code: 'POONAWALLA',
    storeId: 'DM-02',
    isActive: true,
    notes: 'Consumer durable loans',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fin-dm02-cholamandalam',
    name: 'Cholamandalam Finance',
    code: 'CHOLA',
    storeId: 'DM-02',
    isActive: true,
    notes: 'Consumer & mobile finance',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fin-dm02-homecredit',
    name: 'Home Credit',
    code: 'HOMECREDIT',
    storeId: 'DM-02',
    isActive: true,
    notes: 'Quick paperless EMI',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fin-dm02-dmi',
    name: 'DMI Finance',
    code: 'DMI',
    storeId: 'DM-02',
    isActive: true,
    notes: 'Digital consumer loans',
    createdAt: new Date().toISOString()
  }
];

const FINANCE_STORAGE_KEY = 'devi_real_finance_providers_v1';
const FINANCE_EVENT_NAME = 'devi_finance_updated';

// Merge any newly-shipped default providers into a stored list (by id), so
// existing users automatically get newly added financers (Poonawalla, Chola,
// Home Credit, DMI) without losing their own added/toggled providers.
function mergeDefaults(stored: FinanceProvider[]): FinanceProvider[] {
  const ids = new Set(stored.map(p => p.id));
  const missing = DEFAULT_FINANCE_PROVIDERS.filter(d => !ids.has(d.id));
  return missing.length > 0 ? [...stored, ...missing] : stored;
}

export function getStoredFinanceProviders(): FinanceProvider[] {
  if (typeof window === 'undefined') return DEFAULT_FINANCE_PROVIDERS;
  try {
    const raw = localStorage.getItem(FINANCE_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(DEFAULT_FINANCE_PROVIDERS));
      return DEFAULT_FINANCE_PROVIDERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_FINANCE_PROVIDERS;
    const merged = mergeDefaults(parsed);
    if (merged.length !== parsed.length) {
      localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch (e) {
    return DEFAULT_FINANCE_PROVIDERS;
  }
}

// Cache the central list per store so offline still works.
function cacheStore(storeId: string, list: FinanceProvider[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${FINANCE_STORAGE_KEY}_${storeId}`, JSON.stringify(list));
  } catch {}
}
function readStoreCache(storeId: string): FinanceProvider[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${FINANCE_STORAGE_KEY}_${storeId}`);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

// Central fetch from Supabase (shared across all devices). Falls back to cache,
// then to the seeded defaults, so the dropdown is never empty.
export async function getStoreFinanceProviders(storeId: string): Promise<FinanceProvider[]> {
  const store = storeId && storeId !== 'ALL' ? storeId : '';
  try {
    const qs = store ? `?storeId=${encodeURIComponent(store)}` : '';
    const res = await fetch(`/api/finance-providers${qs}`, { cache: 'no-store' });
    const json = await res.json();
    if (json.success && Array.isArray(json.providers) && json.providers.length > 0) {
      if (store) cacheStore(store, json.providers);
      return json.providers;
    }
  } catch {
    // fall through to cache/defaults
  }
  if (store) {
    const cached = readStoreCache(store);
    if (cached && cached.length) return cached;
  }
  const all = getStoredFinanceProviders();
  return store ? all.filter(p => p.storeId === store) : all;
}

export async function getActiveFinanceProvidersForStore(storeId: string): Promise<FinanceProvider[]> {
  const providers = await getStoreFinanceProviders(storeId);
  return providers.filter(p => p.isActive);
}

// Toggle active centrally (fire-and-forget + event so subscribers refresh).
export function toggleFinanceProvider(id: string, isActive: boolean): void {
  if (typeof window === 'undefined') return;
  fetch('/api/finance-providers', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, isActive }),
  })
    .catch(() => {})
    .finally(() => window.dispatchEvent(new CustomEvent(FINANCE_EVENT_NAME)));
}

// Create/update centrally. Returns an optimistic object; UI refreshes via event.
export function saveFinanceProvider(providerData: Omit<FinanceProvider, 'id' | 'createdAt'> & { id?: string }): FinanceProvider {
  const optimistic: FinanceProvider = {
    ...providerData,
    id: providerData.id || `pending-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    fetch('/api/finance-providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(providerData),
    })
      .catch(() => {})
      .finally(() => window.dispatchEvent(new CustomEvent(FINANCE_EVENT_NAME)));
  }
  return optimistic;
}

export function deleteFinanceProvider(id: string): void {
  if (typeof window === 'undefined') return;
  fetch(`/api/finance-providers?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    .catch(() => {})
    .finally(() => window.dispatchEvent(new CustomEvent(FINANCE_EVENT_NAME)));
}

export function subscribeToFinance(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(FINANCE_EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(FINANCE_EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}
