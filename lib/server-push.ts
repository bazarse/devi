export async function sendServerPushNotification({
  title,
  message,
  url,
  role,
  storeCode
}: {
  title: string;
  message: string;
  url?: string;
  role?: string;
  storeCode?: string;
}) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '61f01b2d-9754-4408-9fac-be4b649692bf';
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !restApiKey || restApiKey === 'your-onesignal-rest-api-key') {
    return { success: false, reason: 'No OneSignal key configured' };
  }

  const authHeader = restApiKey.startsWith('os_v2_') 
    ? `Key ${restApiKey}` 
    : (restApiKey.startsWith('Basic ') ? restApiKey : `Basic ${restApiKey}`);

  const payload: any = {
    app_id: appId,
    headings: { en: title || 'Devi Mobile Alert' },
    contents: { en: message || 'You have a new update.' },
    url: url || 'https://devi-teal.vercel.app',
    included_segments: ['Subscribed Users', 'Total Subscriptions'],
    priority: 10,
    android_channel_id: undefined,
    android_sound: 'notification',
    ios_sound: 'notification.caf'
  };

  try {
    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.warn('Server push dispatch error:', error);
    return { success: false, error: error?.message };
  }
}
