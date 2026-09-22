import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, message, role, storeCode, url } = body;

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !restApiKey || appId === 'your-onesignal-app-id') {
      return NextResponse.json(
        { success: true, skipped: true, message: 'FCM native engine active; OneSignal credentials not configured' },
        { status: 200 }
      );
    }

    // Build filters for targeting
    const filters: any[] = [];
    if (role) {
      filters.push({ field: 'tag', key: 'role', relation: '=', value: role });
    }
    if (storeCode) {
      if (filters.length > 0) filters.push({ operator: 'AND' });
      filters.push({ field: 'tag', key: 'store_code', relation: '=', value: storeCode });
    }

    const payload: any = {
      app_id: appId,
      headings: { en: title || 'Devi Mobile Notification' },
      contents: { en: message || 'You have a new update from Devi Mobile.' },
      url: url || 'https://devi-mobile.vercel.app',
    };

    if (filters.length > 0) {
      payload.filters = filters;
    } else {
      payload.included_segments = ['Subscribed Users', 'Total Subscriptions'];
    }

    const authHeader = restApiKey.startsWith('os_v2_') 
      ? `Key ${restApiKey}` 
      : (restApiKey.startsWith('Basic ') ? restApiKey : `Basic ${restApiKey}`);

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': authHeader,
      },
      body: JSON.stringify(payload),
    });


    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to send push notification' },
      { status: 500 }
    );
  }
}
