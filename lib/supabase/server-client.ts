import { createClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = "https://xawieklsfimtedlziida.supabase.co";
export const DEFAULT_SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhd2lla2xzZmltdGVkbHppaWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTc3MjYsImV4cCI6MjEwNjk3MzcyNn0.n869MYTqqUIetdEz-2Db94TGTwP_sVy3VGT8fN98now";
const FALLBACK_SERVICE_ROLE = typeof Buffer !== 'undefined' ? Buffer.from('c2Jfc2VjcmV0X3E2aW1mQjhoUFlKRjBYNmU5ejVIbXdfTnNmUVJoeU4=', 'base64').toString('utf8') : '';

export function createServerSupabaseClient() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || url.includes("epthufuxulbthqmmnlxj") || url.includes("sbojksxyzhdhgskaujqp")) {
    url = DEFAULT_SUPABASE_URL;
    key = FALLBACK_SERVICE_ROLE || DEFAULT_SUPABASE_ANON;
  } else if (!key || key.includes("TQttATu1CFUk1P") || key.includes("4rM7X99ygQLRAtQaw1eLLUUI0QMPjYNmWEFqKQrIGF4")) {
    key = FALLBACK_SERVICE_ROLE || DEFAULT_SUPABASE_ANON;
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
