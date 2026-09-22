export interface StoreBillConfig {
  storeId: string;
  storeTitle: string;
  tagline: string;
  branchName: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  terms: string;
  footerGreeting: string;
}

export const DEFAULT_BILL_CONFIGS: Record<string, StoreBillConfig> = {
  'DM-01': {
    storeId: 'DM-01',
    storeTitle: 'DEVI MOBILE ACCESSORIES',
    tagline: 'Authorized Smartphone & Premium Accessories Hub',
    branchName: 'Kanthal Flagship (DM-01)',
    address: '206/1, Kanthal Chauraha, Ankpat Marg, Ujjain 456006',
    gstin: '23ALGPK9135M1ZT',
    phone: '9713001600, 6262335656, 9893264192',
    email: 'devimobileujjain@gmail.com',
    terms: '1. Goods once sold will not be taken back or exchanged.\n2. Keep this bill safe. Duplicate bill issue charge is Rs. 250/-.\n3. Warranty handled by brand authorized service centers only.\n4. Physical or water damage is strictly excluded from warranty.',
    footerGreeting: 'Thank you for choosing Devi Mobile! Visit again.'
  },
  'DM-02': {
    storeId: 'DM-02',
    storeTitle: 'DEVI MOBILE ACCESSORIES',
    tagline: 'Authorized Smartphone & Gadgets Hub',
    branchName: 'Freeganj 2.0 (DM-02)',
    address: 'Shop No. 4, Freeganj Main Road, Opposite Clock Tower, Ujjain 456010',
    gstin: '23ALGPK9135M1ZT',
    phone: '7828915933, 9893264192',
    email: 'devimobilefreeganj@gmail.com',
    terms: '1. Goods once sold will not be taken back or exchanged.\n2. Keep this bill safe. Duplicate bill issue charge is Rs. 250/-.\n3. Warranty handled by brand authorized service centers only.\n4. Physical or water damage is strictly excluded from warranty.',
    footerGreeting: 'Thank you for shopping at Devi Mobile Freeganj!'
  }
};

const STORAGE_KEY_PREFIX = 'devi_store_bill_config_';

export function getStoreBillConfig(storeId: string): StoreBillConfig {
  const cleanStore = storeId === 'DM-02' ? 'DM-02' : 'DM-01';
  if (typeof window === 'undefined') {
    return DEFAULT_BILL_CONFIGS[cleanStore];
  }

  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${cleanStore}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_BILL_CONFIGS[cleanStore], ...parsed };
    }
  } catch (e) {
    console.warn('Error reading bill config:', e);
  }

  return DEFAULT_BILL_CONFIGS[cleanStore];
}

export function saveStoreBillConfig(config: StoreBillConfig): void {
  if (typeof window === 'undefined') return;
  const cleanStore = config.storeId === 'DM-02' ? 'DM-02' : 'DM-01';

  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${cleanStore}`, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('devi_bill_config_updated', { detail: { storeId: cleanStore } }));
  } catch (e) {
    console.warn('Error saving bill config:', e);
  }
}

