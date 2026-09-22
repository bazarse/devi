import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { getFirebaseMessaging } from '@/lib/firebase-admin';

export interface FcmPushOptions {
  title: string;
  body: string;
  role?: string; // 'admin' (super_admin + store_admin), 'super_admin', 'store_admin', 'salesman'
  targetPhone?: string;
  storeCode?: string; // e.g. 'DM-01' — store-scope admin notifications (super_admin always gets them)
  data?: Record<string, string>;
}

export async function sendFcmPushNotification(options: FcmPushOptions): Promise<{ sent: number; total: number; results: any[] }> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: files, error } = await supabase.storage.from('fcm-tokens').list();
    if (error || !files || files.length === 0) {
      console.warn('No FCM tokens registered in storage');
      return { sent: 0, total: 0, results: [] };
    }

    let cleanTargetPhone = options.targetPhone ? options.targetPhone.replace(/\D/g, '').slice(-10) : '';
    // Treat an all-zero / dummy phone as no target, so a decision never fans
    // out to placeholder-phone devices.
    if (/^0+$/.test(cleanTargetPhone)) cleanTargetPhone = '';

    // Safeguard: Never broadcast salesman decisions chain-wide without a real targetPhone (BUG-R1-06)
    if (options.role === 'salesman' && !cleanTargetPhone) {
      console.warn('sendFcmPushNotification: Salesman notifications require a real targetPhone to prevent chain-wide broadcast');
      return { sent: 0, total: 0, results: [] };
    }

    const cleanStore = options.storeCode ? String(options.storeCode).trim() : '';

    const targetTokens: string[] = [];
    for (const file of files) {
      try {
        const { data } = await supabase.storage.from('fcm-tokens').download(file.name);
        if (data) {
          const parsed = JSON.parse(await data.text());
          const roleMatch = !options.role || 
            options.role === parsed.role || 
            (options.role === 'admin' && (parsed.role === 'super_admin' || parsed.role === 'store_admin'));

          const cleanParsedPhone = parsed.phone ? String(parsed.phone).replace(/\D/g, '').slice(-10) : '';
          const phoneMatch = cleanTargetPhone
            ? (cleanParsedPhone === cleanTargetPhone)
            : (options.role !== 'salesman');

          // Store scoping for admin notifications: super_admin always receives;
          // store_admin only receives if their registered store matches the deal store.
          // If a store_admin has no store recorded (legacy token), don't exclude them.
          let storeMatch = true;
          if (cleanStore && options.role === 'admin' && parsed.role === 'store_admin' && parsed.store) {
            storeMatch = String(parsed.store).trim() === cleanStore;
          }

          if (roleMatch && phoneMatch && storeMatch && parsed.token) {
            targetTokens.push(parsed.token);
          }
        }
      } catch (err) {
        console.warn('Error reading token file', file.name, err);
      }
    }

    if (targetTokens.length === 0) {
      console.warn('No matching FCM tokens found for role:', options.role);
      return { sent: 0, total: 0, results: [] };
    }

    const messaging = getFirebaseMessaging();
    const results: any[] = [];

    for (const token of targetTokens) {
      try {
        const message: any = {
          token,
          data: {
            title: options.title,
            body: options.body,
            url: options.data?.url || '/admin/super/approvals',
            dealId: options.data?.dealId || '',
            type: options.data?.type || 'deal_alert',
            ...options.data
          },
          android: {
            priority: 'high' as const
          }
        };

        // For simple announcements without action buttons, use standard notification
        // For deal approvals, data-only payload forces Android OS to call DeviMessagingService
        // which builds [✅ APPROVE], [❌ REJECT] (with inline RemoteInput), and [✏️ EDIT DEAL] buttons!
        if (!options.data?.dealId) {
          message.notification = {
            title: options.title,
            body: options.body
          };
          message.android.notification = {
            sound: 'default',
            priority: 'high' as const,
            channelId: 'devi_deals',
            icon: 'ic_stat_devi',
            defaultSound: true,
            defaultVibrateTimings: true
          };
        }

        const response = await messaging.send(message);
        console.log('✅ FCM Push Sent successfully:', response);
        results.push({ token: token.slice(0, 15) + '...', success: true, messageId: response });
      } catch (err: any) {
        console.error('❌ Failed to send FCM push to token:', token.slice(0, 15), err);
        results.push({ token: token.slice(0, 15) + '...', success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return { sent: successCount, total: targetTokens.length, results };

  } catch (error: any) {
    console.error('sendFcmPushNotification error:', error);
    return { sent: 0, total: 0, results: [{ error: error.message }] };
  }
}
