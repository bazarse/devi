import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

function getSupabase() {
  return createServerSupabaseClient();
}

// Save FCM token to Supabase Storage (no SQL column needed)
export async function POST(request: Request) {
  try {
    const { phone, token, role, store } = await request.json();
    if (!phone || !token) {
      return NextResponse.json({ success: false, error: 'phone and token required' }, { status: 400 });
    }

    const supabase = getSupabase();
    // `store` (DM-01 / DM-02) lets us store-scope admin notifications.
    const fileContent = JSON.stringify({ phone, token, role, store: store || null, updatedAt: new Date().toISOString() });
    const fileName = `${phone}.json`;

    // Upsert (overwrite) token file in Supabase Storage
    const { error } = await supabase.storage
      .from('fcm-tokens')
      .upload(fileName, new Blob([fileContent], { type: 'application/json' }), {
        upsert: true,
        contentType: 'application/json'
      });

    if (error) {
      console.error('FCM token save error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    console.log(`FCM token saved for ${phone} (${role})`);
    return NextResponse.json({ success: true, phone, role });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// Read all FCM tokens (for server-side push dispatch)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const phone = searchParams.get('phone');

    const supabase = getSupabase();

    const { data: files, error } = await supabase.storage.from('fcm-tokens').list();
    if (error) throw error;

    const tokens: Array<{ phone: string; token: string; role: string }> = [];

    for (const file of files || []) {
      const { data } = await supabase.storage.from('fcm-tokens').download(file.name);
      if (data) {
        const text = await data.text();
        const parsed = JSON.parse(text);
        // Filter by role or phone if requested
        if (phone && parsed.phone !== phone) continue;
        if (role && parsed.role !== role) continue;
        tokens.push(parsed);
      }
    }

    return NextResponse.json({ success: true, tokens });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
