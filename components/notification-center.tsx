'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Bell, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShoppingBag, 
  Sparkles, 
  X, 
  CheckCheck, 
  ExternalLink,
  Volume2,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { 
  AppNotification, 
  getLocalNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  clearAllNotifications,
  deleteNotification,
  saveNotification,
  NOTIFICATIONS_STORAGE_KEY,
  getReadNotificationIds,
  getClearedTimestamp
} from '@/lib/notification-service';
import { subscribeToPipeline } from '@/lib/sales-pipeline';
import { createClient } from '@/lib/supabase/client';

interface NotificationCenterProps {
  userRole?: 'salesman' | 'store_admin' | 'super_admin';
  userPhone?: string;
  userStoreId?: string;
}

export default function NotificationCenter({ userRole, userPhone, userStoreId }: NotificationCenterProps) {
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine effective role from props or session
  const getEffectiveRole = () => {
    if (userRole) return userRole;
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('devi_user_role') || localStorage.getItem('devi_user_role');
      if (stored === 'super_admin') return 'super_admin';
      if (stored === 'store_admin') return 'store_admin';
    }
    return 'salesman';
  };

  const getEffectivePhone = () => {
    if (userPhone) return userPhone;
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('devi_user_phone') || localStorage.getItem('devi_user_phone') || '';
    }
    return '';
  };

  // Helper to filter notifications strictly by role & phone
  const isNotificationForCurrentRole = (n: AppNotification) => {
    const role = getEffectiveRole();
    const phone = getEffectivePhone();

    if (role === 'salesman') {
      // Salesman sees notifications intended for salesman or all
      if (n.targetRole === 'admin') return false;

      // Check salesman phone match if specified (10 digits)
      if (n.targetPhone && phone) {
        const cleanTarget = n.targetPhone.replace(/\D/g, '').slice(-10);
        const cleanUser = phone.replace(/\D/g, '').slice(-10);
        const isTargetDummy = !cleanTarget || /^0+$/.test(cleanTarget);
        const isUserDummy = !cleanUser || /^0+$/.test(cleanUser);
        if (!isTargetDummy && !isUserDummy && cleanTarget.length === 10 && cleanUser.length === 10 && cleanTarget !== cleanUser) {
          return false;
        }
      }
      return true;
    }

    if (role === 'store_admin') {
      // Store Admin sees admin notifications for their branch (or chain-wide)
      if (n.targetRole === 'salesman') return false;
      if (n.storeId && userStoreId && n.storeId !== userStoreId && n.storeId !== 'all') return false;
      return true;
    }

    if (role === 'super_admin') {
      // Super Admin HQ sees all admin notifications across all branches
      if (n.targetRole === 'salesman') return false;
      return true;
    }

    return true;
  };

  // Sanitize target URL so a salesman can NEVER navigate to /admin/* from a notification
  const getSafeNotificationUrl = (n: AppNotification) => {
    const role = getEffectiveRole();
    if (role === 'salesman') {
      return '/salesman/history';
    }
    if (role === 'store_admin') {
      return '/admin/store';
    }
    return '/admin/super/approvals';
  };

  // Play a crisp notification chime using Web Audio API
  const playNotificationChime = (isSuccess = true) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';

      if (isSuccess) {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      } else {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(330, audioCtx.currentTime + 0.2);
      }

      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // Audio not permitted or muted
    }

    // Phone Vibration
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (e) {}
  };

  // Trigger Incoming Notification Alert
  const displayNotificationAlert = (newNotif: AppNotification) => {
    if (!isNotificationForCurrentRole(newNotif)) return;

    setNotifications(prev => [newNotif, ...prev.filter(n => n.id !== newNotif.id)]);
    setActiveToast(newNotif);
    playNotificationChime(newNotif.type !== 'sale_rejected');

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(curr => curr?.id === newNotif.id ? null : curr);
    }, 7000);
  };

  useEffect(() => {
    setMounted(true);
    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const raw = getLocalNotifications();
    const readIds = getReadNotificationIds();

    // Prune stale notifications > 24 hours immediately on load
    const fresh = raw.filter(n => {
      if (n.createdAt) {
        const age = now - new Date(n.createdAt).getTime();
        if (!isNaN(age) && age > TWENTY_FOUR_HOURS_MS) return false;
      }
      return true;
    });
    if (fresh.length !== raw.length) {
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(fresh));
      } catch (e) {}
    }
    setNotifications(fresh.filter(isNotificationForCurrentRole));

    // 0. Auto-sync notifications from cloud API (runs on mount, periodically, and on pipeline events)
    async function syncMissedNotifications() {
      try {
        let recentDeals: any[] = [];
        try {
          const role = getEffectiveRole();
          const phone = getEffectivePhone();
          const queryParams = new URLSearchParams();
          if (role === 'salesman' && phone) {
            queryParams.set('salesmanPhone', phone);
          } else if (role === 'store_admin' && userStoreId) {
            queryParams.set('storeId', userStoreId);
          }
          const fetchUrl = queryParams.toString() ? `/api/deals/list?${queryParams.toString()}` : '/api/deals/list';
          const res = await fetch(fetchUrl, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            if (json && Array.isArray(json.deals)) {
              recentDeals = json.deals;
            }
          } else {
            return;
          }
        } catch (fetchErr) {
          console.warn('Notification sync fetch error:', fetchErr);
          return;
        }

        const currentLocal = getLocalNotifications();
        const currentReadIds = getReadNotificationIds();
        const currentClearedAt = getClearedTimestamp();

        // Only inspect deals from the last 8 hours
        const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
        const recentRows = recentDeals.filter(row => {
          const t = new Date(row.decidedAt || row.updatedAt || row.createdAt || 0).getTime();
          if (!t || isNaN(t)) return false;
          if (now - t > EIGHT_HOURS_MS) return false;
          // If user previously tapped "Clear All", don't resurrect deals from before that timestamp!
          if (currentClearedAt && t <= currentClearedAt) return false;
          return true;
        });

        let updatedLocal = [...currentLocal];
        let hasChanges = false;
        const alertsToDisplay: AppNotification[] = [];

        for (const row of recentRows) {
          const storeCode = row.storeId || ((row.store_id && row.store_id.includes('7705')) ? 'DM-02' : 'DM-01');
          const price = Number(row.finalPrice ?? row.final_price ?? row.product_price ?? 0);
          const productName = row.productName || row.product_name || 'Device';
          const customerName = row.customerName || row.customer_name || 'Customer';
          const approverName = row.decidedBy || row.approved_by_name || 'Manager';
          const salesName = row.salesPersonName || row.sales_person_name || 'Floor Salesman';
          const salesPhone = row.salesPersonPhone || row.sales_person_phone || '';
          const isApproved = row.status === 'approved';
          const isRejected = row.status === 'rejected';
          const isPending = row.status === 'pending_approval';
          const billNo = row.billNumber || row.bill_number || `25-26/${String(row.token || row.id || '').replace('SA-', '')}/DEVI`;
          const eventTimestamp = row.decidedAt || row.approved_at || row.updatedAt || row.updated_at || row.createdAt || row.created_at || new Date().toISOString();
          const decisionAgeMs = now - new Date(eventTimestamp).getTime();

          const adminNotifId = `notif-deal-${row.id}-admin`;
          const salesNotifId = `notif-deal-${row.id}-sales`;

          if (isApproved || isRejected) {
            // Clean up any pending 'sale_submitted' notification for this deal
            const pendingAdmin = updatedLocal.find(n => n.dealId === row.id && n.type === 'sale_submitted' && n.targetRole === 'admin');
            if (pendingAdmin) {
              updatedLocal = updatedLocal.filter(n => n.id !== pendingAdmin.id);
              hasChanges = true;
            }
            const pendingSales = updatedLocal.find(n => n.dealId === row.id && n.type === 'sale_submitted' && n.targetRole === 'salesman');
            if (pendingSales) {
              updatedLocal = updatedLocal.filter(n => n.id !== pendingSales.id);
              hasChanges = true;
            }

            // 1. Salesman notification (Deal Approved / Rejected)
            const existingSales = updatedLocal.find(n => n.dealId === row.id && n.targetRole === 'salesman' && (n.type === 'sale_approved' || n.type === 'sale_rejected'));
            if (!existingSales) {
              const isRead = currentReadIds.has(salesNotifId) || currentReadIds.has(row.id);
              const newSalesNotif: AppNotification = {
                id: salesNotifId,
                title: isApproved ? `🎉 Deal Approved: ${productName}` : `⚠️ Deal Rejected: ${productName}`,
                message: isApproved
                  ? `Approved by ${approverName}. Bill No ${billNo}. You can deliver device to ${customerName}!`
                  : `Rejected by ${approverName}. Reason: "${row.rejectionReason || row.rejection_reason || 'Details mismatch'}".`,
                type: isApproved ? 'sale_approved' : 'sale_rejected',
                dealId: row.id,
                storeId: storeCode,
                targetRole: 'salesman',
                targetPhone: salesPhone,
                createdAt: eventTimestamp,
                read: isRead,
                url: '/salesman/history',
                details: {
                  customerName,
                  productName,
                  approverName,
                  rejectionReason: row.rejectionReason || row.rejection_reason,
                  billNo
                }
              };
              updatedLocal = [newSalesNotif, ...updatedLocal];
              hasChanges = true;
              if (decisionAgeMs < 30000 && !isRead) {
                alertsToDisplay.push(newSalesNotif);
              }
            }

            // 2. Admin notification (History log in drawer)
            const existingAdmin = updatedLocal.find(n => n.dealId === row.id && n.targetRole === 'admin' && (n.type === 'sale_approved' || n.type === 'sale_rejected'));
            if (!existingAdmin) {
              const isRead = currentReadIds.has(adminNotifId) || currentReadIds.has(row.id);
              const newAdminNotif: AppNotification = {
                id: adminNotifId,
                title: isApproved ? `✅ Deal Approved: ${productName}` : `❌ Deal Rejected: ${productName}`,
                message: isApproved
                  ? `Deal for ${customerName} (₹${price.toLocaleString('en-IN')}) approved by ${approverName}. Bill ${billNo}.`
                  : `Deal for ${customerName} rejected by ${approverName}. Reason: "${row.rejectionReason || row.rejection_reason || 'Details mismatch'}".`,
                type: isApproved ? 'sale_approved' : 'sale_rejected',
                dealId: row.id,
                storeId: storeCode,
                targetRole: 'admin',
                createdAt: eventTimestamp,
                read: isRead,
                url: '/admin/super/approvals',
                details: {
                  customerName,
                  productName,
                  approverName,
                  rejectionReason: row.rejectionReason || row.rejection_reason,
                  billNo
                }
              };
              updatedLocal = [newAdminNotif, ...updatedLocal];
              hasChanges = true;
              if (decisionAgeMs < 30000 && !isRead) {
                alertsToDisplay.push(newAdminNotif);
              }
            }
          } else if (isPending) {
            // Deal is waiting for approval!
            // 1. Admin notification
            const existingAdmin = updatedLocal.find(n => n.dealId === row.id && n.targetRole === 'admin' && n.type === 'sale_submitted');
            if (!existingAdmin) {
              const isRead = currentReadIds.has(adminNotifId) || currentReadIds.has(row.id);
              const adminNotif: AppNotification = {
                id: adminNotifId,
                title: `🚨 Pending Approval: ₹${price.toLocaleString('en-IN')} - ${productName}`,
                message: `${salesName} (${storeCode}) created deal for ${customerName}. Waiting for review.`,
                type: 'sale_submitted',
                dealId: row.id,
                storeId: storeCode,
                targetRole: 'admin',
                createdAt: row.createdAt || row.created_at || new Date().toISOString(),
                read: isRead,
                url: '/admin/super/approvals',
                details: {
                  customerName,
                  productName,
                  finalPrice: price
                }
              };
              updatedLocal = [adminNotif, ...updatedLocal];
              hasChanges = true;
              if (decisionAgeMs < 30000 && !isRead) {
                alertsToDisplay.push(adminNotif);
              }
            }

            // 2. Salesman notification
            const existingSales = updatedLocal.find(n => n.dealId === row.id && n.targetRole === 'salesman' && n.type === 'sale_submitted');
            if (!existingSales) {
              const isRead = currentReadIds.has(salesNotifId) || currentReadIds.has(row.id);
              const salesNotif: AppNotification = {
                id: salesNotifId,
                title: `⏳ Deal Submitted: ${productName}`,
                message: `Submitted for ${customerName} (₹${price.toLocaleString('en-IN')}). Waiting for manager approval.`,
                type: 'sale_submitted',
                dealId: row.id,
                storeId: storeCode,
                targetRole: 'salesman',
                targetPhone: salesPhone,
                createdAt: row.createdAt || row.created_at || new Date().toISOString(),
                read: isRead,
                url: '/salesman/history',
                details: {
                  customerName,
                  productName,
                  finalPrice: price
                }
              };
              updatedLocal = [salesNotif, ...updatedLocal];
              hasChanges = true;
            }
          }
        }

        if (hasChanges) {
          const trimmed = updatedLocal.slice(0, 50);
          try {
            localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(trimmed));
          } catch (e) {}
          setNotifications(trimmed.filter(isNotificationForCurrentRole));
          
          for (const alert of alertsToDisplay) {
            if (isNotificationForCurrentRole(alert)) {
              displayNotificationAlert(alert);
            }
          }
        }
      } catch (err) {
        console.warn('Sync missed notifications error:', err);
      }
    }

    syncMissedNotifications();

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        syncMissedNotifications();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    const unsubPipeline = subscribeToPipeline(() => {
      syncMissedNotifications();
    });

    // 1. Listen to Local Custom Events (Same Tab)
    const handleReceived = (e: CustomEvent<AppNotification>) => {
      displayNotificationAlert(e.detail);
    };

    const handleUpdated = () => {
      const rawNotifs = getLocalNotifications();
      setNotifications(rawNotifs.filter(isNotificationForCurrentRole));
    };

    window.addEventListener('devi_notification_received' as any, handleReceived);
    window.addEventListener('devi_notifications_updated' as any, handleUpdated);

    // 2. Listen to BroadcastChannel (Cross-Tab / Multi-Window on same device)
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('devi_notifications_broadcast');
        bc.onmessage = (event) => {
          if (event.data?.type === 'notification_received' && event.data?.detail) {
            displayNotificationAlert(event.data.detail);
          }
        };
      } catch (err) {}
    }

    // 3. 🌐 Supabase Realtime Multi-Device Sync
    let realtimeChannel: any = null;
    const supabase = createClient();
    const uniqueChannelName = `devi_realtime_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      realtimeChannel = supabase
        .channel(uniqueChannelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sales_approvals' },
          (payload: any) => {
            const row = payload.new;
            if (!row) return;

            // 1. 🚨 New Deal Submitted: Alert Store Admin & Super Admin & Salesman!
            if (payload.eventType === 'INSERT') {
              const storeCode = (row.store_id && row.store_id.includes('7705')) ? 'DM-02' : 'DM-01';
              const price = Number(row.final_price || row.product_price || 0);

              const adminNotif: AppNotification = {
                id: `notif-live-new-${row.id}-${Date.now()}`,
                title: `🚨 New Deal: ₹${price.toLocaleString('en-IN')} - ${row.product_name}`,
                message: `${row.sales_person_name || 'Salesman'} (${storeCode}) created deal for ${row.customer_name}. Payment: ${row.payment_method || 'Cash'}`,
                type: 'sale_submitted',
                dealId: row.id,
                storeId: storeCode,
                targetRole: 'admin',
                createdAt: new Date().toISOString(),
                read: false,
                url: '/admin/super/approvals',
                details: {
                  customerName: row.customer_name,
                  productName: row.product_name,
                  finalPrice: price
                }
              };
              saveNotification(adminNotif);
              displayNotificationAlert(adminNotif);

              const salesNotif: AppNotification = {
                id: `notif-live-sales-${row.id}-${Date.now()}`,
                title: `⏳ Deal Submitted: ${row.product_name}`,
                message: `Submitted for ${row.customer_name} (₹${price.toLocaleString('en-IN')}). Waiting for approval.`,
                type: 'sale_submitted',
                dealId: row.id,
                storeId: storeCode,
                targetRole: 'salesman',
                targetPhone: row.sales_person_phone,
                createdAt: new Date().toISOString(),
                read: false,
                url: '/salesman/history',
                details: {
                  customerName: row.customer_name,
                  productName: row.product_name,
                  finalPrice: price
                }
              };
              saveNotification(salesNotif);
              displayNotificationAlert(salesNotif);
            }

            // 2. 🎉 Decision made: APPROVED or REJECTED: Alert Salesman & Admin!
            if (payload.eventType === 'UPDATE' && (row.status === 'approved' || row.status === 'rejected')) {
              const isApproved = row.status === 'approved';
              const storeCode = (row.store_id && row.store_id.includes('7705')) ? 'DM-02' : 'DM-01';

              // Clean up pending alert
              try {
                const current = getLocalNotifications();
                const cleaned = current.filter(n => !(n.dealId === row.id && n.type === 'sale_submitted'));
                if (cleaned.length !== current.length) {
                  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(cleaned));
                  setNotifications(cleaned.filter(isNotificationForCurrentRole));
                }
              } catch (_) {}

              // Alert for Salesman
              const salesNotif: AppNotification = {
                id: `notif-live-decision-sales-${row.id}-${Date.now()}`,
                title: isApproved ? `🎉 Deal Approved: ${row.product_name}` : `⚠️ Deal Rejected: ${row.product_name}`,
                message: isApproved
                  ? `Approved by ${row.approved_by_name || 'Manager'}. You can now print bill & hand over device to ${row.customer_name}!`
                  : `Rejected by ${row.approved_by_name || 'Manager'}. Reason: "${row.rejection_reason || 'Details mismatch'}".`,
                type: isApproved ? 'sale_approved' : 'sale_rejected',
                dealId: row.id,
                storeId: storeCode,
                targetRole: 'salesman',
                targetPhone: row.sales_person_phone || row.salesman_phone,
                createdAt: new Date().toISOString(),
                read: false,
                url: '/salesman/history',
                details: {
                  customerName: row.customer_name,
                  productName: row.product_name,
                  approverName: row.approved_by_name || 'Store Admin',
                  rejectionReason: row.rejection_reason
                }
              };
              saveNotification(salesNotif);
              displayNotificationAlert(salesNotif);

              // Alert for Admin Log
              const adminNotif: AppNotification = {
                id: `notif-live-decision-admin-${row.id}-${Date.now()}`,
                title: isApproved ? `✅ Deal Approved: ${row.product_name}` : `❌ Deal Rejected: ${row.product_name}`,
                message: isApproved
                  ? `Deal for ${row.customer_name} approved by ${row.approved_by_name || 'Manager'}.`
                  : `Deal for ${row.customer_name} rejected by ${row.approved_by_name || 'Manager'}. Reason: "${row.rejection_reason || 'Details mismatch'}"`,
                type: isApproved ? 'sale_approved' : 'sale_rejected',
                dealId: row.id,
                storeId: storeCode,
                targetRole: 'admin',
                createdAt: new Date().toISOString(),
                read: false,
                url: '/admin/super/approvals',
                details: {
                  customerName: row.customer_name,
                  productName: row.product_name,
                  approverName: row.approved_by_name || 'Store Admin',
                  rejectionReason: row.rejection_reason
                }
              };
              saveNotification(adminNotif);
              displayNotificationAlert(adminNotif);
            }
          }
        )
        .subscribe();
    } catch (realtimeErr) {
      console.warn('Realtime subscription notice:', realtimeErr);
    }

    return () => {
      unsubPipeline();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      window.removeEventListener('devi_notification_received' as any, handleReceived);
      window.removeEventListener('devi_notifications_updated' as any, handleUpdated);
      if (bc) bc.close();
      if (realtimeChannel) {
        try {
          supabase.removeChannel(realtimeChannel);
        } catch (e) {}
      }
    };
  }, [userRole, userPhone, userStoreId]);


  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      
      {/* 🔔 NOTIFICATION BELL BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-brand-600 transition-all active:scale-95 shadow-sm flex items-center justify-center min-h-[44px] min-w-[44px]"
        aria-label="Open Notifications"
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {mounted && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-rose-600 text-white text-[11px] font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 📢 FLOATING POPUP TOAST ALERT */}
      {activeToast && (
        <div className="fixed top-5 right-5 z-[9999] max-w-sm w-full bg-slate-900 text-white rounded-3xl p-4 shadow-2xl border border-slate-800 animate-slideDown flex items-start gap-3">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold shrink-0 mt-0.5 ${
            activeToast.type === 'sale_approved'
              ? 'bg-emerald-500/20 text-emerald-400'
              : activeToast.type === 'sale_rejected'
              ? 'bg-rose-500/20 text-rose-400'
              : 'bg-amber-500/20 text-amber-400'
          }`}>
            {activeToast.type === 'sale_approved' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : activeToast.type === 'sale_rejected' ? (
              <XCircle className="w-5 h-5" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 space-y-1 text-xs">
            <div className="font-black text-slate-100 pr-4">{activeToast.title}</div>
            <div className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">{activeToast.message}</div>
            <Link
              href={getSafeNotificationUrl(activeToast)}
              onClick={() => {
                markNotificationAsRead(activeToast.id);
                setActiveToast(null);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-400 hover:text-brand-300 pt-1"
            >
              <span>{getEffectiveRole() === 'salesman' ? 'View in My Ledger' : 'View in Approvals'}</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setActiveToast(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 📜 NOTIFICATION TRAY DROPDOWN */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 top-full mt-3 z-50 w-80 sm:w-96 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
            
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-600" />
                <span className="font-black text-xs text-slate-900">Notifications ({unreadCount} Unread)</span>
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      markAllNotificationsAsRead();
                      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    }}
                    className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors"
                    title="Mark all notifications as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      clearAllNotifications();
                      setNotifications([]);
                    }}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Clear all notifications"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2 text-xs">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-slate-700 text-sm">All caught up!</div>
                  <div className="text-[11px] text-slate-400">No pending sales approvals waiting right now.</div>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markNotificationAsRead(notif.id)}
                    className={`p-3.5 text-xs space-y-1.5 transition-colors cursor-pointer ${
                      notif.read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-slate-900 leading-snug">
                        {notif.title}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-brand-600" />
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                          title="Dismiss notification"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.details?.rejectionReason && notif.type === 'sale_rejected' && (
                      <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-[10px] text-rose-900 font-medium">
                        <span className="font-bold">Reason: </span>
                        {notif.details.rejectionReason}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <Link
                        href={getSafeNotificationUrl(notif)}
                        onClick={() => setIsOpen(false)}
                        className="font-bold text-brand-600 hover:text-brand-700 flex items-center gap-0.5"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-semibold">
              Live Realtime Approval Engine • Devi Mobile
            </div>
          </div>
        </>
      )}

    </div>
  );
}
