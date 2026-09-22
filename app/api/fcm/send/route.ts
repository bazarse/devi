import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { getFirebaseMessaging } from '@/lib/firebase-admin';

async function getTargetFCMTokens(roleFilter?: string, targetPhone?: string, storeCode?: string): Promise<string[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: files, error } = await supabase.storage.from('fcm-tokens').list();
    if (error || !files) return [];

    let cleanTargetPhone = targetPhone ? String(targetPhone).replace(/\D/g, '').slice(-10) : '';
    // Ignore all-zero placeholder phones so we never target dummy devices.
    if (/^0+$/.test(cleanTargetPhone)) cleanTargetPhone = '';
    const cleanStore = storeCode ? String(storeCode).trim() : '';

    const tokens: string[] = [];
    for (const file of files) {
      try {
        const { data } = await supabase.storage.from('fcm-tokens').download(file.name);
        if (data) {
          const parsed = JSON.parse(await data.text());
          const filePhone = parsed.phone ? String(parsed.phone).replace(/\D/g, '').slice(-10) : '';

          if (cleanTargetPhone && cleanTargetPhone.length === 10) {
            if (filePhone === cleanTargetPhone && parsed.token) {
              tokens.push(parsed.token);
            }
          } else {
            const roleMatch = !roleFilter || parsed.role === roleFilter ||
                (roleFilter === 'admin' && (parsed.role === 'super_admin' || parsed.role === 'store_admin'));
            // Store scoping: store_admin only if their store matches (super_admin always).
            let storeMatch = true;
            if (cleanStore && roleFilter === 'admin' && parsed.role === 'store_admin' && parsed.store) {
              storeMatch = String(parsed.store).trim() === cleanStore;
            }
            if (roleMatch && storeMatch && parsed.token) tokens.push(parsed.token);
          }
        }
      } catch {}
    }
    return tokens;
  } catch (err) {
    console.error('Error fetching target tokens:', err);
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const { token, tokens: tokenList, role, targetPhone, storeCode, title, body, data } = await request.json();

    // Determine target tokens
    let targetTokens: string[] = [];
    if (token) {
      targetTokens = [token];
    } else if (tokenList?.length) {
      targetTokens = tokenList;
    } else if (targetPhone) {
      targetTokens = await getTargetFCMTokens(role, targetPhone, storeCode);
    } else if (role) {
      targetTokens = await getTargetFCMTokens(role, undefined, storeCode);
    } else {
      // Broadcast to all admins (Super Admin + Store Admins)
      targetTokens = await getTargetFCMTokens('admin', undefined, storeCode);
    }

    if (!targetTokens.length) {
      return NextResponse.json({ success: false, error: 'No registered devices found' });
    }

    const messaging = getFirebaseMessaging();
    const results = [];

    for (const fcmToken of targetTokens) {
      try {
        const message = {
          token: fcmToken,
          notification: {
            title: title || '🚨 DEVI MOBILE ALERT',
            body: body || 'New deal submitted for approval'
          },
          data: {
            url: data?.url || '/admin/super/approvals',
            dealId: data?.dealId || '',
            type: data?.type || 'deal_alert'
          },
          android: {
            priority: 'high' as const,
            notification: {
              sound: 'default',
              priority: 'high' as const,
              channelId: 'devi_deals',
              defaultSound: true,
              defaultVibrateTimings: true
            }
          }
        };

        const response = await messaging.send(message);
        results.push({ token: fcmToken.slice(0, 15) + '...', success: true, messageId: response });
      } catch (err: any) {
        console.error('Failed to send FCM message:', err);
        results.push({ token: fcmToken.slice(0, 15) + '...', success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return NextResponse.json({ success: successCount > 0, sent: successCount, total: targetTokens.length, results });

  } catch (error: any) {
    console.error('FCM send route error:', error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
