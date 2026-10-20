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

// In-flight request deduplication: eliminates duplicate simultaneous requests without stale caching
const inFlightRequests = new Map<string, Promise<SalesDeal[]>>();

export function invalidateClientDealsCache() {
  inFlightRequests.clear();
}

// Broadcast event to notify UI components
export function broadcastPipelineUpdate() {
  if (typeof window === 'undefined') return;
  try {
    invalidateClientDealsCache();
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

function mapDealRow(row: any): SalesDeal {
  const storeCode = UUID_TO_STORE_CODE[row.store_id] || (row.store_id?.includes('7705') ? 'DM-02' : 'DM-01');
  return {
    id: row.id,
    token: `SA-${row.id.slice(0, 6)}`,
    storeId: storeCode,
    storeName: STORE_NAME_MAP[storeCode] || `Store ${storeCode}`,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerAddress: row.customer_address,
    productName: row.product_name,
    category: row.category || 'Mobile Phone',
    imeiSerial: row.imei_serial,
    basePrice: Number(row.product_price) || Number(row.final_price) || 0,
    discount: Number(row.discount) || 0,
    finalPrice: Number(row.final_price) || 0,
    paymentMethod: row.payment_method || 'Cash',
    financeProvider: row.finance_provider,
    disbursementAmount: Number(row.disbursement_amount) || 0,
    downPaymentCash: Number(row.down_payment_cash) || 0,
    downPaymentUpi: Number(row.down_payment_upi) || 0,
    downPaymentCard: Number(row.down_payment_card) || 0,
    cashAmount: Number(row.cash_amount) || 0,
    upiAmount: Number(row.upi_amount) || 0,
    cardAmount: Number(row.card_amount) || 0,
    neftAmount: Number(row.neft_amount) || 0,
    remark: row.remark || null,
    hasExchange: Boolean(row.has_device_exchange),
    oldDeviceName: row.device_name,
    oldDeviceImei: row.device_imei,
    oldDeviceCondition: row.device_condition,
    exchangeValue: Number(row.device_exchange_amount) || 0,
    gifts: Array.isArray(row.gifts) ? row.gifts.join(', ') : (row.gifts || 'None'),
    vasPlan: row.vas_details || 'None',
    salesPersonName: row.sales_person_name || 'Floor Salesman',
    salesPersonPhone: row.sales_person_phone,
    status: row.status,
    decidedBy: row.approved_by_name,
    decidedAt: row.approved_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedAt: row.created_at,
    billNumber: row.invoice_id || (row.id ? `25-26/${row.id.slice(0, 6)}/DEVI` : undefined),
    isTallyUploaded: Boolean((row.barcode && row.barcode.startsWith('TALLY_UPLOADED')) || (row.invoice_id && row.invoice_id.startsWith('TALLY_UPLOADED'))),
    tallyUploadedAt: (row.barcode && row.barcode.startsWith('TALLY_UPLOADED')) ? row.barcode.split(':')[1] : ((row.invoice_id && row.invoice_id.startsWith('TALLY_UPLOADED')) ? row.invoice_id.split(':')[1] : undefined),
    tallyUploadedBy: (row.barcode && row.barcode.startsWith('TALLY_UPLOADED')) ? row.barcode.split(':')[2] : ((row.invoice_id && row.invoice_id.startsWith('TALLY_UPLOADED')) ? row.invoice_id.split(':')[2] : undefined)
  };
}

/**
 * 3. FETCH SALES PIPELINE DEALS (DIRECT SUPABASE CLIENT - 0% VERCEL CPU)
 */
export async function fetchSalesPipelineDeals(filter?: { storeId?: string; status?: string; salesmanPhone?: string; limit?: number | string }): Promise<SalesDeal[]> {
  const cacheKey = JSON.stringify(filter || {});
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const reqPromise = (async () => {
    // 1. Primary path: Direct browser-to-Supabase query (Bypasses Vercel Serverless CPU 100%)
    try {
      if (typeof window !== 'undefined') {
        const supabase = createClient();
        const columns = 'id, store_id, customer_name, customer_phone, customer_address, product_name, category, imei_serial, product_price, final_price, discount, payment_method, finance_provider, disbursement_amount, down_payment_cash, down_payment_upi, down_payment_card, cash_amount, upi_amount, card_amount, neft_amount, remark, has_device_exchange, device_name, device_imei, device_condition, device_exchange_amount, gifts, vas_details, sales_person_name, sales_person_phone, status, approved_by_name, approved_at, rejection_reason, created_at, updated_at, invoice_id, barcode';

        let query = supabase
          .from('sales_approvals')
          .select(columns)
          .order('created_at', { ascending: false });

        if (filter?.storeId && filter.storeId !== 'ALL') {
          const targetUuid = STORE_CODE_TO_UUID[filter.storeId] || filter.storeId;
          query = query.eq('store_id', targetUuid);
        }
        if (filter?.status && filter.status !== 'ALL') {
          query = query.eq('status', filter.status);
        }
        if (filter?.salesmanPhone) {
          const cleanSalesmanPhone = filter.salesmanPhone.replace(/\D/g, '').slice(-10);
          if (cleanSalesmanPhone.length === 10) {
            query = query.eq('sales_person_phone', cleanSalesmanPhone);
          }
        }
        if (filter?.limit && !isNaN(Number(filter.limit))) {
          query = query.limit(Number(filter.limit));
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          return data.map(mapDealRow);
        }
      }
    } catch (e) {
      console.warn('Direct Supabase fetch fallback to API:', e);
    }

    // 2. Fallback path: API route
    try {
      const params = new URLSearchParams();
      if (filter?.storeId) params.set('storeId', filter.storeId);
      if (filter?.status) params.set('status', filter.status);
      if (filter?.salesmanPhone) params.set('salesmanPhone', filter.salesmanPhone);
      if (filter?.limit !== undefined) params.set('limit', String(filter.limit));
      params.set('_t', String(Date.now()));

      const res = await fetch(`/api/deals/list?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.deals)) {
        const mapped = data.deals.map((deal: any) => ({
          ...deal,
          storeName: STORE_NAME_MAP[deal.storeId] || deal.storeName || `Store ${deal.storeId}`
        }));
        return mapped;
      }
      return [];
    } catch (err) {
      console.error('Cloud fetch pipeline error:', err);
      return [];
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, reqPromise);
  return reqPromise;
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
let lastPipelineVisibilitySync = 0;

export function subscribeToPipeline(onUpdate: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = () => {
    invalidateClientDealsCache();
    onUpdate();
  };
  window.addEventListener(PIPELINE_EVENT_NAME, handleCustomEvent);
  window.addEventListener('devi_notification_received', handleCustomEvent);

  let broadcastChannel: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel('devi_pipeline_channel');
      broadcastChannel.onmessage = () => {
        invalidateClientDealsCache();
        onUpdate();
      };
    } catch (e) {}
  }

  // Fast tab-switch sync (10s throttle prevents spam, but immediately shows fresh deals upon return)
  const handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && !document.hidden) {
      const now = Date.now();
      if (now - lastPipelineVisibilitySync >= 10000) {
        lastPipelineVisibilitySync = now;
        invalidateClientDealsCache();
        onUpdate();
      }
    }
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // 100% Real-time updates via Supabase WebSocket (0% Vercel Serverless CPU)
  // Completely eliminates the 25-second HTTP polling loop that generated 273K Vercel function calls!
  let supabaseChannel: any = null;
  try {
    const supabase = createClient();
    supabaseChannel = supabase
      .channel(`pipeline_realtime_${Math.random().toString(36).substring(2, 9)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_approvals' }, () => {
        invalidateClientDealsCache();
        onUpdate();
      })
      .subscribe();
  } catch (err) {
    console.warn('Realtime subscription error:', err);
  }

  return () => {
    window.removeEventListener(PIPELINE_EVENT_NAME, handleCustomEvent);
    window.removeEventListener('devi_notification_received', handleCustomEvent);
    if (broadcastChannel) broadcastChannel.close();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    if (supabaseChannel) {
      try {
        const supabase = createClient();
        supabase.removeChannel(supabaseChannel);
      } catch (e) {}
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
