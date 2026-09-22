import { createBrowserClient } from "@supabase/ssr";

const DEFAULT_SUPABASE_URL = "https://epthufuxulbthqmmnlxj.supabase.co";
const DEFAULT_SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdGh1ZnV4dWxidGhxbW1ubHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NTAwNzgsImV4cCI6MjEwNTQyNjA3OH0.4rM7X99ygQLRAtQaw1eLLUUI0QMPjYNmWEFqKQrIGF4";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON;

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
