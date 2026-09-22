import { createClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = "https://epthufuxulbthqmmnlxj.supabase.co";
export const DEFAULT_SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdGh1ZnV4dWxidGhxbW1ubHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NTAwNzgsImV4cCI6MjEwNTQyNjA3OH0.4rM7X99ygQLRAtQaw1eLLUUI0QMPjYNmWEFqKQrIGF4";
export const DEFAULT_SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_SERVICE_ROLE;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
