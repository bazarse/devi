'use client';

export interface CustomerLead {
  id: string;
  token: string;
  storeId: string;
  storeName?: string;
  salesmanName: string;
  salesmanPhone?: string;
  customerName: string;
  customerPhone: string;
  interestedModel: string;
  category: string;
  budget: number;
  expectedDate: string;
  status: 'Hot Lead' | 'Warm Lead' | 'Follow Up' | 'Converted' | 'Lost';
  notes?: string;
  createdAt: string;
}

const LEADS_EVENT = 'devi_leads_updated';

/**
 * Fetch Leads directly from Supabase Cloud
 */
export async function fetchCloudLeads(storeId?: string): Promise<CustomerLead[]> {
  try {
    const params = new URLSearchParams();
    if (storeId && storeId !== 'ALL') params.set('storeId', storeId);

    const res = await fetch(`/api/leads/list?${params.toString()}`, { cache: 'no-store' });
    const data = await res.json();
    if (data.success && Array.isArray(data.leads)) {
      return data.leads;
    }
    return [];
  } catch (err) {
    console.error('Fetch cloud leads error:', err);
    return [];
  }
}

/**
 * Save New Lead directly to Supabase Cloud
 */
export async function saveNewLead(lead: Omit<CustomerLead, 'id' | 'token' | 'createdAt'>): Promise<CustomerLead> {
  const cleanPhone = (lead.customerPhone || '').replace(/\D/g, '').slice(-10);

  let created: CustomerLead = {
    ...lead,
    id: `ld-${Date.now()}`,
    token: `LD-${Math.floor(100000 + Math.random() * 900000)}`,
    createdAt: new Date().toISOString()
  };

  try {
    const res = await fetch('/api/leads/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...lead,
        customerPhone: cleanPhone
      })
    });
    const data = await res.json();
    if (data.success && data.lead) {
      created = {
        ...created,
        id: data.lead.id,
        token: `LD-${data.lead.id.slice(0, 6)}`,
        createdAt: data.lead.created_at
      };
    }
  } catch (err) {
    console.error('Save cloud lead error:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LEADS_EVENT));
  }

  return created;
}

/**
 * Update Lead Status directly in Supabase Cloud
 */
export async function updateLeadStatus(id: string, newStatus: CustomerLead['status']): Promise<void> {
  try {
    await fetch('/api/leads/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: id, status: newStatus })
    });
  } catch (err) {
    console.error('Update cloud lead status error:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LEADS_EVENT));
  }
}

/**
 * Delete Lead directly from Supabase Cloud
 */
export async function deleteLead(id: string): Promise<void> {
  try {
    await fetch('/api/leads/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: id })
    });
  } catch (err) {
    console.error('Delete cloud lead error:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LEADS_EVENT));
  }
}

export function subscribeToLeads(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(LEADS_EVENT, handler);
  return () => {
    window.removeEventListener(LEADS_EVENT, handler);
  };
}

export function getStoredLeads(): CustomerLead[] {
  return [];
}
