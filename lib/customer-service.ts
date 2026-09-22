'use client';

export interface CustomerPurchaseItem {
  id: string;
  date: string;
  invoiceNo: string;
  productName: string;
  category: string;
  imei: string;
  amount: number;
  collected?: number;
  due?: number;
  remark?: string;
  paymentMethod: string;
  financeProvider?: string | null;
  vasPlan?: string;
  storeId: string;
  salesman: string;
}

export interface CustomerLeadItem {
  id: string;
  date: string;
  model: string;
  category: string;
  budget: number;
  status: string;
  notes?: string;
  salesman: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  primaryStoreId: string; // 'DM-01' | 'DM-02'
  gstin?: string;
  totalSpent: number;
  totalDue?: number;
  purchaseCount: number;
  creditBalance: number;
  firstSeen: string;
  lastPurchaseDate?: string;
  purchases: CustomerPurchaseItem[];
  leads: CustomerLeadItem[];
  notes?: string;
}

const CUSTOMERS_EVENT_NAME = 'devi_customers_updated';

/**
 * Fetch all customers directly from Cloud Supabase database
 */
export async function fetchCloudCustomers(storeId?: string): Promise<CustomerProfile[]> {
  try {
    const params = new URLSearchParams();
    if (storeId && storeId !== 'ALL') params.set('storeId', storeId);

    const res = await fetch(`/api/customers/list?${params.toString()}`, { cache: 'no-store' });
    const data = await res.json();
    if (data.success && Array.isArray(data.customers)) {
      return data.customers.map((c: any) => ({
        ...c,
        purchases: Array.isArray(c.purchases) ? c.purchases : [],
        leads: Array.isArray(c.leads) ? c.leads : [],
        purchaseCount: Array.isArray(c.purchases) && c.purchases.length > 0 ? c.purchases.length : (c.totalSpent > 0 ? 1 : 0),
        firstSeen: c.createdAt || c.firstSeen,
        lastPurchaseDate: c.lastPurchaseDate || c.updatedAt
      }));
    }
    return [];
  } catch (err) {
    console.error('Fetch cloud customers error:', err);
    return [];
  }
}

/**
 * Upsert Customer in Cloud Supabase when a Sale occurs
 */
export async function upsertCustomerFromSale(deal: {
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  productName: string;
  category?: string;
  imeiSerial: string;
  finalPrice: number;
  paymentMethod: string;
  financeProvider?: string | null;
  vasPlan?: string;
  storeId: string;
  salesPersonName?: string;
  submittedAt?: string;
  token?: string;
  id?: string;
}): Promise<void> {
  const cleanPhone = (deal.customerPhone || '').replace(/\D/g, '').slice(-10);
  if (!cleanPhone) return;

  try {
    await fetch('/api/customers/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: deal.customerName,
        phone: cleanPhone,
        address: deal.customerAddress,
        storeId: deal.storeId || 'DM-01',
        amountSpent: deal.finalPrice || 0
      })
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CUSTOMERS_EVENT_NAME));
    }
  } catch (err) {
    console.error('Customer cloud upsert error:', err);
  }
}

export function subscribeToCustomers(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(CUSTOMERS_EVENT_NAME, handler);

  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel('devi_customers_broadcast');
    bc.onmessage = () => {
      callback();
    };
  } catch (_) {}

  return () => {
    window.removeEventListener(CUSTOMERS_EVENT_NAME, handler);
    if (bc) {
      try {
        bc.close();
      } catch (_) {}
    }
  };
}

/**
 * Permanently delete a customer from Cloud Supabase database and sync across tabs
 */
export async function deleteCustomer(customerId: string, phone?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/customers/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, phone })
    });
    const data = await res.json();
    if (data.success) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CUSTOMERS_EVENT_NAME));
        try {
          const bc = new BroadcastChannel('devi_customers_broadcast');
          bc.postMessage({ type: 'CUSTOMER_DELETED', customerId, phone });
          bc.close();
        } catch (_) {}
      }
      return { success: true };
    }
    return { success: false, error: data.error || 'Failed to delete customer' };
  } catch (err: any) {
    console.error('Delete customer error:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

// Backward compatibility helper
export function getStoredCustomers(): CustomerProfile[] {
  return [];
}
export async function getCustomerByPhone(phone: string): Promise<CustomerProfile | null> {
  const all = await fetchCloudCustomers();
  const cleanTarget = String(phone).replace(/\D/g, '').slice(-10);
  return all.find(c => c.phone && c.phone.replace(/\D/g, '').slice(-10) === cleanTarget) || null;
}
export function upsertCustomerFromLead(): void {}

export async function getCustomerById(id: string): Promise<CustomerProfile | null> {
  const all = await fetchCloudCustomers();
  const cleanTarget = String(id).replace(/\D/g, '').slice(-10);
  return all.find(c => c.id === id || (cleanTarget && c.phone && c.phone.replace(/\D/g, '').slice(-10) === cleanTarget)) || null;
}

export async function saveCustomer(cust: CustomerProfile): Promise<void> {
  try {
    await fetch('/api/customers/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cust.name,
        phone: cust.phone,
        address: cust.address,
        storeId: cust.primaryStoreId,
        amountSpent: cust.totalSpent,
        email: cust.alternatePhone
      })
    });
  } catch (err) {
    console.error('Save customer error:', err);
  }
}


