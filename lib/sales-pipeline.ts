'use client';

import { createClient } from '@/lib/supabase/client';
import { sendDecisionNotificationToSalesman } from '@/lib/notification-service';
import { upsertCustomerFromSale } from './customer-service';

export interface SalesDeal {
  id: string;
  token: string;
  storeId: string;
  storeName?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  productName: string;
  category: 'Mobile Phone' | 'Second Hand Phone' | 'Accessories' | 'Appliances' | string;
  imeiSerial: string;
  basePrice?: number;
  discount?: number;
  finalPrice: number;
  paymentMethod: 'Cash' | 'EMI' | string;
  financeProvider?: string | null;
  disbursementAmount?: number;
  downPaymentCash?: number;
  downPaymentUpi?: number;
  downPaymentCard?: number;
  cashAmount?: number;
  upiAmount?: number;
  cardAmount?: number;
  neftAmount?: number;
  hasExchange?: boolean;
  oldDeviceName?: string;
  oldDeviceImei?: string;
  oldDeviceCondition?: string;
  exchangeValue?: number;
  gifts?: string;
  vasPlan?: string;
  remark?: string | null;
  isEmiLocked?: boolean;
  salesPersonName: string;
  salesPersonPhone?: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  decidedBy?: string | null;
  rejectionReason?: string | null;
  submittedAt: string;
  decidedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  billNumber?: string;
  isTallyUploaded?: boolean;
  tallyUploadedAt?: string;
  tallyUploadedBy?: string;
}


const STORE_NAME_MAP: Record<string, string> = {
  'DM-01': 'Store DM-01 (Kanthal Chauraha - Flagship)',
  'DM-02': 'Store DM-02 (Freeganj 2.0)',
  'DM-03': 'Store DM-03 (Nanakheda Center)',
  'ALL': 'All Store Branches'
};

export const STORE_CODE_TO_UUID: Record<string, string> = {
  'DM-01': '3be59f85-2859-476c-b402-31c552a83146',
  'DM-02': '7705c16a-2e91-4ef5-93bc-00084848db6a'
};

export const UUID_TO_STORE_CODE: Record<string, string> = {
  '3be59f85-2859-476c-b402-31c552a83146': 'DM-01',
  '7705c16a-2e91-4ef5-93bc-00084848db6a': 'DM-02'
};

const PIPELINE_EVENT_NAME = 'devi_pipeline_updated';

// Broadcast event to notify UI components
function broadcastPipelineUpdate() {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(PIPELINE_EVENT_NAME));
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('devi_pipeline_channel');
      channel.postMessage({ type: 'PIPELINE_UPDATED', timestamp: Date.now() });
      channel.close();
    }
  } catch (e) {}
}

export interface DealEditPayload {
  productName?: string;
  finalPrice?: number;
  productPrice?: number;
  discount?: number;
  imeiSerial?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentMethod?: string;
  financeProvider?: string | null;
  cashAmount?: number;
  upiAmount?: number;
  cardAmount?: number;
  neftAmount?: number;
  downPaymentCash?: number;
  downPaymentUpi?: number;
  downPaymentCard?: number;
  disbursementAmount?: number;
  gifts?: string | string[];
  vasPlan?: string;
  remark?: string;
  adminNote?: string;
  editedBy: string;
}

/**
 * 1. EDIT & APPROVE DEAL (100% PURE CLOUD SUPABASE)
 */
export async function editDealInPipeline(
  dealId: string,
  edits: DealEditPayload
): Promise<void> {
  try {
    const res = await fetch('/api/deals/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealId,
        action: 'edit',
        decidedBy: edits.editedBy,
        edits
      })
    });
    const data = await res.json();
    if (data.success && data.deal) {
      // Note: Server-side /api/deals/action handles customer upsert & spend integrity

      try {
        const { sendDecisionNotificationToSalesman } = await import('@/lib/notification-service');
        await sendDecisionNotificationToSalesman({
          dealId: data.deal.token || data.deal.id,
          status: 'approved',
          approverName: edits.editedBy,
          customerName: data.deal.customer_name || data.deal.customerName,
          productName: data.deal.product_name || data.deal.productName,
          rejectionReason: undefined,
          billNumber: `25-26/${String(data.deal.token || data.deal.id || '').replace('SA-', '')}/DEVI`,
          salesmanPhone: data.deal.sales_person_phone || data.deal.salesPersonPhone || '',
          isEdit: true,
          editNote: edits.adminNote || 'Price/IMEI corrected & deal approved by manager',
        });
      } catch (err) {}
    }
  } catch (e) {
    console.error('Cloud edit deal error:', e);
  }

  broadcastPipelineUpdate();
}

/**
 * 2. SUBMIT SALE DEAL (100% PURE CLOUD SUPABASE)
 */
export async function submitSaleDeal(dealData: Omit<SalesDeal, 'id' | 'submittedAt'> & { id?: string }): Promise<SalesDeal> {
  const token = dealData.token || `SA-${Math.floor(100000 + Math.random() * 900000)}`;
  const cleanStoreCode = dealData.storeId?.includes('7705') || dealData.storeId === 'DM-02' ? 'DM-02' : 'DM-01';
  const storeName = STORE_NAME_MAP[cleanStoreCode] || `Store ${cleanStoreCode}`;
  const cleanPhone = (dealData.salesPersonPhone || '').replace(/\D/g, '').slice(-10);

  let createdDeal: SalesDeal = {
    ...dealData,
    id: token,
    token,
    storeId: cleanStoreCode,
    storeName,
    submittedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch('/api/deals/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...dealData,
        token,
        storeId: cleanStoreCode,
        salesPersonPhone: cleanPhone
      })
    });
    const resData = await res.json();
    if (resData.success && resData.deal) {
      createdDeal = resData.deal;
    }
  } catch (err) {
    console.error('Cloud deal submission error:', err);
  }

  // Note: Customer spend is recorded strictly upon manager deal approval on server

  broadcastPipelineUpdate();
  return createdDeal;
}

/**
 * 3. FETCH SALES PIPELINE DEALS (100% PURE CLOUD SUPABASE)
 */
export async function fetchSalesPipelineDeals(filter?: { storeId?: string; status?: string; salesmanPhone?: string }): Promise<SalesDeal[]> {
  try {
    const params = new URLSearchParams();
    if (filter?.storeId) params.set('storeId', filter.storeId);
    if (filter?.status) params.set('status', filter.status);
    if (filter?.salesmanPhone) params.set('salesmanPhone', filter.salesmanPhone);

    const res = await fetch(`/api/deals/list?${params.toString()}`, { cache: 'no-store' });
    const data = await res.json();
    if (data.success && Array.isArray(data.deals)) {
      return data.deals.map((deal: any) => ({
        ...deal,
        storeName: STORE_NAME_MAP[deal.storeId] || deal.storeName || `Store ${deal.storeId}`
      }));
    }
    return [];
  } catch (err) {
    console.error('Cloud fetch pipeline error:', err);
    return [];
  }
}

/**
 * 4. UPDATE DEAL STATUS (APPROVE / REJECT) (100% PURE CLOUD SUPABASE)
 */
export async function updateDealStatusInPipeline(
  dealId: string, 
  status: 'approved' | 'rejected', 
  decidedBy: string, 
  rejectionReason?: string
): Promise<void> {
  try {
    const res = await fetch('/api/deals/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealId,
        action: status === 'approved' ? 'approve' : 'reject',
        decidedBy,
        rejectionReason
      })
    });
    const data = await res.json();

    if (data.success && data.deal) {
      const deal = data.deal;
      // Note: Server-side /api/deals/action handles customer upsert & spend integrity

      await sendDecisionNotificationToSalesman({
        dealId: deal.id,
        status,
        approverName: decidedBy,
        customerName: deal.customer_name || deal.customerName,
        productName: deal.product_name || deal.productName,
        rejectionReason: status === 'rejected' ? (rejectionReason || 'Deal not approved') : undefined,
        billNumber: `25-26/${String(deal.token || deal.id || '').replace('SA-', '')}/DEVI`,
        salesmanPhone: deal.sales_person_phone || deal.salesPersonPhone || ''
      });
    }
  } catch (e) {
    console.error('Cloud update deal status error:', e);
  }

  broadcastPipelineUpdate();
}

/**
 * 5. SUBSCRIBE TO PIPELINE UPDATES
 */
export function subscribeToPipeline(onUpdate: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = () => onUpdate();
  window.addEventListener(PIPELINE_EVENT_NAME, handleCustomEvent);

  let broadcastChannel: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel('devi_pipeline_channel');
      broadcastChannel.onmessage = () => onUpdate();
    } catch (e) {}
  }

  // Real-time background sync polling across devices (active tab only, 25s smart interval)
  const intervalId = setInterval(() => {
    if (typeof document !== 'undefined' && document.hidden) return;
    onUpdate();
  }, 25000);

  const handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && !document.hidden) {
      onUpdate();
    }
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  return () => {
    window.removeEventListener(PIPELINE_EVENT_NAME, handleCustomEvent);
    if (broadcastChannel) broadcastChannel.close();
    clearInterval(intervalId);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };
}

/**
 * 6. PERMANENTLY DELETE A BILL / SALE DEAL (100% PURE CLOUD SUPABASE)
 */
export async function deleteSaleDeal(identifier: string): Promise<boolean> {
  if (!identifier) return false;

  const cleanId = identifier.trim();

  try {
    const res = await fetch('/api/deals/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId: cleanId })
    });
    const data = await res.json();
    broadcastPipelineUpdate();
    return data.success === true;
  } catch (err) {
    console.error('Cloud delete deal error:', err);
    broadcastPipelineUpdate();
    return false;
  }
}

// Clear any old local storage residuals from user browser
export function purgeLocalSalesPipeline(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('devi_real_sales_pipeline_v2');
      localStorage.removeItem('devi_real_sales_pipeline');
      localStorage.removeItem('devi_second_hand_stock');
      broadcastPipelineUpdate();
    } catch (e) {}
  }
}
