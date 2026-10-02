'use client';

// Base brands that always ship with the app (offline fallback).
export const BASE_BRANDS = [
  'Vivo', 'OPPO', 'Samsung', 'Xiaomi', 'Apple', 'Realme', 'OnePlus',
  'Motorola', 'Tecno', 'boAt', 'Noise', 'Fire-Boltt', 'HP', 'Godrej',
  'Haier', 'Whirlpool',
];

export interface BrandDetail {
  id: string;
  name: string;
  supplierName?: string;
  supplierPhone?: string;
  supplierBillNo?: string;
  billAmount?: number;
  dueDate?: string; // YYYY-MM-DD
  paymentStatus?: 'pending' | 'paid' | 'partial';
  notes?: string;
  createdAt?: string;
}

// Default initial details for base brands with reputable distributors
const INITIAL_BRAND_DETAILS: BrandDetail[] = [
  {
    id: 'brand-vivo',
    name: 'Vivo',
    supplierName: 'Vivo MP Televentures',
    supplierPhone: '9826012345',
    supplierBillNo: 'VIVO-MP-9841',
    billAmount: 185000,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    paymentStatus: 'pending',
    notes: 'Official Vivo Authorized Distributor (Indore / Ujjain hub)'
  },
  {
    id: 'brand-oppo',
    name: 'OPPO',
    supplierName: 'Oppo Mobiles India Pvt Ltd',
    supplierPhone: '9826054321',
    supplierBillNo: 'OPPO-IND-4421',
    billAmount: 142000,
    dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    paymentStatus: 'pending',
    notes: 'Direct company distributor billing'
  },
  {
    id: 'brand-samsung',
    name: 'Samsung',
    supplierName: 'Samsung Electronics Distributor',
    supplierPhone: '9425011223',
    supplierBillNo: 'SAM-2026-8812',
    billAmount: 220000,
    dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    paymentStatus: 'pending',
    notes: 'Smartphones & Smart TVs stock'
  },
  {
    id: 'brand-xiaomi',
    name: 'Xiaomi',
    supplierName: 'Redington India Ltd',
    supplierPhone: '9893011224',
    supplierBillNo: 'RED-MI-7712',
    billAmount: 95000,
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    paymentStatus: 'paid',
    notes: 'Redmi & Xiaomi eco devices'
  },
  {
    id: 'brand-apple',
    name: 'Apple',
    supplierName: 'Ingram Micro India',
    supplierPhone: '9827011998',
    supplierBillNo: 'ING-APL-1109',
    billAmount: 380000,
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    paymentStatus: 'pending',
    notes: 'iPhone 15/16 Series authorized shipment'
  },
  {
    id: 'brand-realme',
    name: 'Realme',
    supplierName: 'Shri Shyam Telecom',
    supplierPhone: '9425099887',
    supplierBillNo: 'SST-RLM-3321',
    billAmount: 64000,
    dueDate: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
    paymentStatus: 'paid',
    notes: 'Local regional supplier'
  }
];

// Cache keys
const BRANDS_CACHE_KEY = 'devi_brands_cache_v2';
const BRAND_DETAILS_KEY = 'devi_brand_details_master_v2';

function readCache(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BRANDS_CACHE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((b) => typeof b === 'string') : [];
  } catch {
    return [];
  }
}

function writeCache(list: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BRANDS_CACHE_KEY, JSON.stringify(list));
  } catch {}
}

export function getStoredBrandDetails(): BrandDetail[] {
  if (typeof window === 'undefined') return INITIAL_BRAND_DETAILS;
  try {
    const raw = localStorage.getItem(BRAND_DETAILS_KEY);
    if (!raw) {
      localStorage.setItem(BRAND_DETAILS_KEY, JSON.stringify(INITIAL_BRAND_DETAILS));
      return INITIAL_BRAND_DETAILS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_BRAND_DETAILS;
  } catch {
    return INITIAL_BRAND_DETAILS;
  }
}

export function saveBrandDetails(details: BrandDetail[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BRAND_DETAILS_KEY, JSON.stringify(details));
    // Trigger cross-component sync event
    window.dispatchEvent(new CustomEvent('devi_brands_updated', { detail: details }));
  } catch {}
}

export function saveOrUpdateBrand(item: Partial<BrandDetail> & { name: string }): BrandDetail {
  const all = getStoredBrandDetails();
  const cleanName = item.name.trim();
  const existingIdx = all.findIndex(b => b.name.toLowerCase() === cleanName.toLowerCase() || (item.id && b.id === item.id));

  let savedItem: BrandDetail;
  if (existingIdx >= 0) {
    savedItem = {
      ...all[existingIdx],
      ...item,
      name: cleanName,
    };
    all[existingIdx] = savedItem;
  } else {
    savedItem = {
      id: item.id || `brand-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      supplierName: item.supplierName?.trim() || undefined,
      supplierPhone: item.supplierPhone?.trim() || undefined,
      supplierBillNo: item.supplierBillNo?.trim() || undefined,
      billAmount: item.billAmount !== undefined ? Number(item.billAmount) : undefined,
      dueDate: item.dueDate || undefined,
      paymentStatus: item.paymentStatus || 'pending',
      notes: item.notes?.trim() || undefined,
      createdAt: new Date().toISOString()
    };
    all.unshift(savedItem);
  }

  saveBrandDetails(all);
  // Also save to simple brand names list
  addCustomBrand(cleanName);
  return savedItem;
}

export function deleteBrand(idOrName: string): void {
  const all = getStoredBrandDetails();
  const filtered = all.filter(b => b.id !== idOrName && b.name.toLowerCase() !== idOrName.toLowerCase());
  saveBrandDetails(filtered);
}

function dedupeSorted(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const clean = (n || '').trim();
    const key = clean.toLowerCase();
    if (clean && !seen.has(key)) {
      seen.add(key);
      out.push(clean);
    }
  }
  return out;
}

// Synchronous list for immediate render: cache (or base) — refreshed by fetchAllBrands.
export function getAllBrands(): string[] {
  const cached = readCache();
  const detailed = getStoredBrandDetails().map(b => b.name);
  return dedupeSorted([...BASE_BRANDS, ...cached, ...detailed]);
}

// Central fetch from Supabase (all devices share this). Falls back to cache/base.
export async function fetchAllBrands(): Promise<string[]> {
  try {
    const res = await fetch('/api/brands', { cache: 'no-store' });
    const json = await res.json();
    if (json.success && Array.isArray(json.brands)) {
      const detailed = getStoredBrandDetails().map(b => b.name);
      const merged = dedupeSorted([...BASE_BRANDS, ...json.brands, ...detailed]);
      writeCache(json.brands);
      return merged;
    }
  } catch {
    // ignore, fall back
  }
  return getAllBrands();
}

// Add a new brand centrally (Supabase). Returns cleaned name or null if invalid.
export async function addCustomBrand(name: string): Promise<string | null> {
  const clean = (name || '').trim();
  if (!clean) return null;

  // Optimistically update local cache so it appears immediately.
  const cached = readCache();
  if (!cached.some((b) => b.toLowerCase() === clean.toLowerCase()) &&
      !BASE_BRANDS.some((b) => b.toLowerCase() === clean.toLowerCase())) {
    writeCache([...cached, clean]);
  }

  try {
    await fetch('/api/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: clean }),
    });
  } catch {
    // Saved to cache at least; will sync on next successful call.
  }
  return clean;
}
