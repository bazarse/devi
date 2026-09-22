import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, message, targetRole = 'admin', targetPhone, url = '/admin/super/approvals' } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const notif = {
      id: `notif-broadcast-${Date.now()}`,
      title: title || 'Devi Mobile Alert 🔔',
      message: message || 'System alert',
      type: 'sale_submitted',
      dealId: `TEST-${Date.now()}`,
      targetRole,
      targetPhone,
      createdAt: new Date().toISOString(),
      read: false,
      url,
      details: {}
    };

    const channel = supabase.channel('devi_global_realtime_notifications');
    
    await new Promise<void>((resolve) => {
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'custom_alert',
            payload: notif
          });
          resolve();
        }
      });
    });

    setTimeout(() => {
      supabase.removeChannel(channel);
    }, 2000);

    return NextResponse.json({ success: true, notification: notif });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Broadcast failed' }, { status: 500 });
  }
}
