import { createClient } from './supabase/client';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'sale_submitted' | 'sale_approved' | 'sale_rejected';
  dealId: string;
  storeId?: string;
  targetRole: 'admin' | 'salesman' | 'all';
  targetPhone?: string;
  createdAt: string;
  read: boolean;
  url?: string;
  details?: {
    customerName?: string;
    productName?: string;
    finalPrice?: number;
    approverName?: string;
    rejectionReason?: string;
    billNo?: string;
  };
}

export const NOTIFICATIONS_STORAGE_KEY = 'devi_notifications_v5';
export const NOTIFICATIONS_READ_KEY = 'devi_read_notif_ids_v5';
export const NOTIFICATIONS_CLEARED_KEY = 'devi_notifs_cleared_at_v5';

const INITIAL_MOCK_NOTIFICATIONS: AppNotification[] = [];

// Get set of all notification IDs marked read
export function getReadNotificationIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_READ_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

// Get timestamp of last "Clear All" action
export function getClearedTimestamp(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_CLEARED_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

// Get All Stored Notifications
export function getLocalNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return INITIAL_MOCK_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      return INITIAL_MOCK_NOTIFICATIONS;
    }
    const parsed: AppNotification[] = JSON.parse(raw);
    const readIds = getReadNotificationIds();
    // Re-apply read state from persistent read set
    return parsed.map(n => readIds.has(n.id) ? { ...n, read: true } : n);
  } catch {
    return INITIAL_MOCK_NOTIFICATIONS;
  }
}

export function saveNotification(notif: AppNotification) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalNotifications();
    const readIds = getReadNotificationIds();
    const isAlreadyRead = notif.read || readIds.has(notif.id);
    const updated = [{ ...notif, read: isAlreadyRead }, ...current.filter(n => n.id !== notif.id)].slice(0, 60);
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('devi_notification_received', { detail: notif }));

    // 📡 Real-time Multi-Tab Broadcast
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('devi_notifications_broadcast');
        bc.postMessage({ type: 'notification_received', detail: notif });
        bc.close();
      } catch (bcErr) {}
    }
  } catch (err) {
    console.error('Failed to save notification:', err);
  }
}

// Mark Notification as Read
export function markNotificationAsRead(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalNotifications();
    const updated = current.map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));

    const readIds = getReadNotificationIds();
    readIds.add(id);
    localStorage.setItem(NOTIFICATIONS_READ_KEY, JSON.stringify(Array.from(readIds)));

    window.dispatchEvent(new CustomEvent('devi_notifications_updated'));
  } catch (err) {
    console.error('Failed to mark notification read:', err);
  }
}

// Mark All Notifications as Read
export function markAllNotificationsAsRead() {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalNotifications();
    const updated = current.map(n => ({ ...n, read: true }));
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));

    const readIds = getReadNotificationIds();
    current.forEach(n => readIds.add(n.id));
    localStorage.setItem(NOTIFICATIONS_READ_KEY, JSON.stringify(Array.from(readIds)));

    window.dispatchEvent(new CustomEvent('devi_notifications_updated'));
  } catch (err) {
    console.error('Failed to mark all read:', err);
  }
}

// Clear All Notifications (Purge from Storage & record cleared timestamp)
export function clearAllNotifications() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(NOTIFICATIONS_CLEARED_KEY, String(Date.now()));
    window.dispatchEvent(new CustomEvent('devi_notifications_updated'));
  } catch (err) {
    console.error('Failed to clear all notifications:', err);
  }
}

// Delete a single notification by ID
export function deleteNotification(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalNotifications();
    const updated = current.filter(n => n.id !== id);
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));

    const readIds = getReadNotificationIds();
    readIds.add(id);
    localStorage.setItem(NOTIFICATIONS_READ_KEY, JSON.stringify(Array.from(readIds)));

    window.dispatchEvent(new CustomEvent('devi_notifications_updated'));
  } catch (err) {
    console.error('Failed to delete notification:', err);
  }
}

export interface DealNotificationPayload {
  dealId: string;
  storeId: string;
  salesmanName: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  finalPrice: number;
  paymentMethod: string;
  financeProvider?: string | null;
  disbursementAmount?: number;
  downPayment?: number;
  cashAmount?: number;
  gifts?: string;
  vasPlan?: string;
  isEmiLocked?: boolean;
}

export interface DecisionNotificationPayload {
  dealId: string;
  status: 'approved' | 'rejected';
  approverName: string;
  customerName: string;
  productName: string;
  billNumber?: string;
  rejectionReason?: string;
  salesmanPhone: string;
  isEdit?: boolean;
  editNote?: string;
}

// Send Push Notification to Admins & Salesman on New Sale Submission
export async function sendNewSaleNotificationToAdmins(deal: DealNotificationPayload) {
  const title = `🚨 New Deal: ₹${deal.finalPrice.toLocaleString('en-IN')} - ${deal.productName}`;
  const message = `${deal.salesmanName} (${deal.storeId}) created deal for ${deal.customerName}. Payment: ${deal.paymentMethod} ${deal.financeProvider ? `(${deal.financeProvider})` : ''} | Gift: ${deal.gifts || 'None'} | VAS: ${deal.vasPlan || 'None'}`;

  // 1. In-App Notification for Admins (Super Admin & Store Admin)
  const adminNotif: AppNotification = {
    id: `notif-new-admin-${deal.dealId}-${Date.now()}`,
    title,
    message,
    type: 'sale_submitted',
    dealId: deal.dealId,
    storeId: deal.storeId,
    targetRole: 'admin',
    createdAt: new Date().toISOString(),
    read: false,
    url: '/admin/super/approvals',
    details: {
      customerName: deal.customerName,
      productName: deal.productName,
      finalPrice: deal.finalPrice,
    }
  };
  saveNotification(adminNotif);

  // 2. In-App Notification for Salesman (Confirmation that deal was submitted)
  const salesmanNotif: AppNotification = {
    id: `notif-new-sales-${deal.dealId}-${Date.now()}`,
    title: `⏳ Deal Submitted: ${deal.productName}`,
    message: `₹${deal.finalPrice.toLocaleString('en-IN')} deal for ${deal.customerName} sent to Manager for approval.`,
    type: 'sale_submitted',
    dealId: deal.dealId,
    storeId: deal.storeId,
    targetRole: 'salesman',
    targetPhone: deal.customerPhone,
    createdAt: new Date().toISOString(),
    read: false,
    url: '/salesman/history',
    details: {
      customerName: deal.customerName,
      productName: deal.productName,
      finalPrice: deal.finalPrice,
    }
  };
  saveNotification(salesmanNotif);

  // 3. Dispatch to Native FCM Engine for Admins
  try {
    if (typeof window !== 'undefined') {
      await fetch('/api/fcm/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'admin',
          storeCode: deal.storeId,
          title,
          body: message,
          data: {
            url: '/admin/super/approvals',
            dealId: deal.dealId,
            type: 'deal_alert'
          }
        })
      });
    }
  } catch (err) {
    console.warn('FCM admin alert skipped:', err);
  }
}

// Send Push Notification to Salesman & Admins on Approval / Rejection / Edit Decision
export async function sendDecisionNotificationToSalesman(decision: DecisionNotificationPayload) {
  let cleanPhone = (decision.salesmanPhone || '').replace(/\D/g, '').slice(-10);
  if (!cleanPhone) {
    cleanPhone = '0000000000';
  }

  const isApproved = decision.status === 'approved';
  const isEdit = decision.isEdit === true;

  const title = (isEdit && isApproved)
    ? `✅ Deal Approved (with changes by Manager): ${decision.productName}`
    : isEdit
    ? `✏️ Deal Edited: ${decision.productName}`
    : isApproved
    ? `🎉 Deal Approved: ${decision.productName}`
    : `⚠️ Deal Rejected: ${decision.productName}`;

  const message = (isEdit && isApproved)
    ? `${decision.approverName} approved the deal with changes. Note: "${decision.editNote || 'Price/IMEI adjusted'}". Bill No ${decision.billNumber || 'Generated'}. You may now deliver the device to ${decision.customerName}!`
    : isEdit
    ? `${decision.approverName} modified your deal submission. Note: "${decision.editNote || 'Updated'}".`
    : isApproved
    ? `Approved by ${decision.approverName}. Bill No ${decision.billNumber || 'Generated'}. You can now deliver device to ${decision.customerName}!`
    : `Rejected by ${decision.approverName}. Reason: "${decision.rejectionReason || 'Details mismatch'}". Please revise deal.`;

  const notifType = (isEdit && isApproved) ? 'sale_approved' : (isEdit ? 'sale_edited' : (isApproved ? 'sale_approved' : 'sale_rejected'));

  // 1. Save In-App Notification for Salesman
  const salesNotif: AppNotification = {
    id: `notif-decision-sales-${decision.dealId}-${Date.now()}`,
    title,
    message,
    type: notifType as any,
    dealId: decision.dealId,
    targetRole: 'salesman',
    targetPhone: cleanPhone,
    createdAt: new Date().toISOString(),
    read: false,
    url: '/salesman/history',
    details: {
      customerName: decision.customerName,
      productName: decision.productName,
      approverName: decision.approverName,
      rejectionReason: decision.rejectionReason,
      billNo: decision.billNumber,
    }
  };
  saveNotification(salesNotif);

  // 2. Save In-App Notification for Admin Log (shows approved/rejected in drawer)
  const adminDecisionNotif: AppNotification = {
    id: `notif-decision-admin-${decision.dealId}-${Date.now()}`,
    title: isApproved ? `✅ Deal Approved: ${decision.productName}` : `❌ Deal Rejected: ${decision.productName}`,
    message: isApproved
      ? `Deal for ${decision.customerName} approved by ${decision.approverName}. Bill: ${decision.billNumber || 'Generated'}`
      : `Deal for ${decision.customerName} rejected by ${decision.approverName}. Reason: "${decision.rejectionReason || 'Details mismatch'}"`,
    type: notifType as any,
    dealId: decision.dealId,
    targetRole: 'admin',
    createdAt: new Date().toISOString(),
    read: false,
    url: '/admin/super/approvals',
    details: {
      customerName: decision.customerName,
      productName: decision.productName,
      approverName: decision.approverName,
      rejectionReason: decision.rejectionReason,
      billNo: decision.billNumber,
    }
  };
  saveNotification(adminDecisionNotif);

  // 3. Dispatch targeted push strictly to submitting salesman - never broadcast chain-wide (BUG-R1-06)
  try {
    if (typeof window !== 'undefined') {
      await fetch('/api/fcm/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'salesman',
          targetPhone: cleanPhone,
          title,
          body: message,
          data: {
            url: '/salesman/history',
            dealId: decision.dealId,
            type: isApproved ? 'deal_approved' : 'deal_rejected'
          }
        })
      });
    }
  } catch (err) {
    console.warn('Targeted FCM push dispatch skipped:', err);
  }
}

// Send Urgent Reminder to Store Admin & Super Admin if approval delayed
export async function sendUrgentReminderToAdmins(payload: {
  dealId: string;
  salesmanName: string;
  storeId: string;
  customerName: string;
  productName: string;
  finalPrice: number;
}) {
  const title = `⏰ URGENT Reminder: Approval Pending (${payload.dealId})`;
  const message = `${payload.salesmanName} sent reminder. Deal for ${payload.customerName} (₹${payload.finalPrice.toLocaleString('en-IN')} - ${payload.productName}) is waiting for approval (>5 mins). Please verify.`;

  const newNotif: AppNotification = {
    id: `notif-reminder-${Date.now()}`,
    title,
    message,
    type: 'sale_submitted',
    dealId: payload.dealId,
    storeId: payload.storeId,
    targetRole: 'admin',
    createdAt: new Date().toISOString(),
    read: false,
    url: '/admin/store',
    details: {
      customerName: payload.customerName,
      productName: payload.productName,
      finalPrice: payload.finalPrice,
    }
  };
  saveNotification(newNotif);

  try {
    await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        message,
        role: 'store_admin',
        storeCode: payload.storeId,
        url: '/admin/store'
      })
    });
  } catch (err) {
    console.warn('External OneSignal API skipped:', err);
  }
}
