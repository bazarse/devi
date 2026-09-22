'use client';

import React, { useEffect } from 'react';
import { initOneSignal, setOneSignalUserTags, requestPushPermission } from '@/lib/onesignal';

export default function OneSignalProvider() {
  useEffect(() => {
    async function setupOneSignal() {
      if (typeof window === 'undefined') return;

      try {
        await initOneSignal();

        // 1. Tag user with their authenticated role and store
        const storedRole = (sessionStorage.getItem('devi_user_role') || localStorage.getItem('devi_user_role')) as any;
        const storedName = sessionStorage.getItem('devi_user_name') || localStorage.getItem('devi_user_name') || undefined;
        const storedPhone = sessionStorage.getItem('devi_user_phone') || localStorage.getItem('devi_user_phone') || undefined;
        const storedStore = sessionStorage.getItem('devi_store_id') || localStorage.getItem('devi_store_id') || 'DM-01';

        if (storedRole) {
          await setOneSignalUserTags({
            role: storedRole,
            user_name: storedName,
            phone: storedPhone,
            store_code: storedStore
          });

          // Sync to Native Android SharedPreferences if running inside Android APK
          try {
            if (storedName && (window as any).AndroidApp?.saveUserProfile) {
              (window as any).AndroidApp.saveUserProfile(storedName, storedPhone || '', storedRole || '');
            }
          } catch (_) {}
        }

        // 2. Request push permission on desktop / mobile if not yet decided
        if ('Notification' in window && Notification.permission === 'default') {
          setTimeout(() => {
            requestPushPermission();
          }, 3000);
        }

        // 3. Native Android Push Registration (Capacitor FCM with google-services.json)
        try {
          const { Capacitor } = await import('@capacitor/core');
          if (Capacitor.isNativePlatform()) {
            const { PushNotifications } = await import('@capacitor/push-notifications');
            
            const perm = await PushNotifications.requestPermissions();
            if (perm.receive === 'granted') {
              await PushNotifications.register();
            }

            PushNotifications.addListener('registration', (token) => {
              console.log('✅ FCM Push Token Registered:', token.value);
              localStorage.setItem('devi_fcm_token', token.value);
            });

            PushNotifications.addListener('pushNotificationReceived', (notification) => {
              console.log('Push received:', notification);
            });
          }
        } catch (nativeErr) {
          console.warn('Capacitor native push skipped:', nativeErr);
        }
      } catch (err) {
        console.warn('OneSignal setup error:', err);
      }
    }

    setupOneSignal();
  }, []);

  return null;
}


