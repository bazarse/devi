'use client';

import React, { useEffect } from 'react';

export default function PushNotificationProvider() {
  useEffect(() => {
    async function setupNativePush() {
      if (typeof window === 'undefined') return;
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return; // Only runs in Android APK

        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Step 1: Request Android notification permission
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') {
          console.warn('Push permission not granted');
          return;
        }

        // Create high importance notification channel for Android 8+
        try {
          await PushNotifications.createChannel({
            id: 'devi_deals',
            name: 'Devi Deals & Approvals',
            description: 'Instant alerts for sales approvals and counter bills',
            importance: 5,
            visibility: 1,
            vibration: true,
            lights: true
          });
        } catch (chanErr) {
          console.warn('Channel creation error:', chanErr);
        }

        // Step 2: Register with Firebase (generates FCM token)
        await PushNotifications.register();

        // Step 3: FCM token ready → save to server (Supabase Storage)
        PushNotifications.addListener('registration', async (token) => {
          console.log('FCM Token received:', token.value);

          const phone =
            sessionStorage.getItem('devi_user_phone') ||
            localStorage.getItem('devi_user_phone');
          const role =
            sessionStorage.getItem('devi_user_role') ||
            localStorage.getItem('devi_user_role');
          const store =
            sessionStorage.getItem('devi_store_id') ||
            localStorage.getItem('devi_store_id') || null;

          if (phone && token.value) {
            try {
              await fetch('/api/fcm/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, token: token.value, role, store })
              });
              console.log('FCM token registered on server for', phone);
            } catch (err) {
              console.warn('FCM register error:', err);
            }
          }
        });

        // Step 4: Push received while app is OPEN (foreground)
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push received (foreground):', notification);
          // Fire custom event so notification-center can show toast + sound
          window.dispatchEvent(
            new CustomEvent('devi_notification_received', {
              detail: {
                id: `fcm-${Date.now()}`,
                title: notification.title || 'Devi Mobile Alert',
                message: notification.body || '',
                type: notification.data?.type || 'sale_submitted',
                targetRole: notification.data?.targetRole || 'admin',
                createdAt: new Date().toISOString(),
                read: false,
                url: notification.data?.url || '/admin/super/approvals',
                details: {}
              }
            })
          );
        });

        // Step 5: User TAPPED notification (app was closed/background)
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Push tapped:', action);
          const url = action.notification?.data?.url;
          if (url && typeof window !== 'undefined') {
            window.location.href = url;
          }
        });

      } catch (err) {
        // Silently skip in browser/web environment
        console.log('Native push not available (web env)');
      }
    }

    setupNativePush();
  }, []);

  return null;
}
