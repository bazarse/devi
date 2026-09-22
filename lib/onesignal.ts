import OneSignal from 'react-onesignal';

let isOneSignalInitialized = false;

export async function initOneSignal() {
  if (typeof window === 'undefined' || isOneSignalInitialized) return;

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '61f01b2d-9754-4408-9fac-be4b649692bf';
  if (!appId || appId === 'your-onesignal-app-id') {
    return;
  }

  try {
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
    });
    isOneSignalInitialized = true;
    console.log('✅ OneSignal Push Notification Initialized successfully.');
  } catch (error: any) {
    if (error?.message?.includes('Can only be used on')) {
      console.info('ℹ️ OneSignal configured for domain:', error.message);
    } else {
      console.warn('OneSignal init notice:', error?.message);
    }
  }
}


export async function setOneSignalUserTags(tags: {
  role: 'super_admin' | 'store_admin' | 'salesman' | 'technician' | 'customer';
  store_code?: string;
  user_name?: string;
  phone?: string;
}) {
  if (typeof window === 'undefined') return;
  try {
    if (isOneSignalInitialized) {
      await OneSignal.User.addTags(tags);
      console.log('🏷️ User tagged in OneSignal:', tags);
    }
  } catch (e) {
    console.error('Failed to set OneSignal tags:', e);
  }
}

export async function requestPushPermission() {
  if (typeof window === 'undefined') return false;
  try {
    if (isOneSignalInitialized) {
      return await OneSignal.Notifications.requestPermission();
    }
  } catch (e) {
    console.error('Error requesting notification permission:', e);
  }
  return false;
}
