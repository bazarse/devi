'use client';

// Base brands that always ship with the app (offline fallback).
export const BASE_BRANDS = [
  'Vivo', 'OPPO', 'Samsung', 'Xiaomi', 'Apple', 'Realme', 'OnePlus',
  'Motorola', 'Tecno', 'boAt', 'Noise', 'Fire-Boltt', 'HP', 'Godrej',
  'Haier', 'Whirlpool',
];

// Cache key: only used as an offline mirror of the central Supabase list.
const BRANDS_CACHE_KEY = 'devi_brands_cache_v2';

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
  return dedupeSorted([...BASE_BRANDS, ...cached]);
}

// Central fetch from Supabase (all devices share this). Falls back to cache/base.
export async function fetchAllBrands(): Promise<string[]> {
  try {
    const res = await fetch('/api/brands', { cache: 'no-store' });
    const json = await res.json();
    if (json.success && Array.isArray(json.brands)) {
      const merged = dedupeSorted([...BASE_BRANDS, ...json.brands]);
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
