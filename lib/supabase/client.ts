import { createBrowserClient } from "@supabase/ssr";

const DEFAULT_SUPABASE_URL = "https://xawieklsfimtedlziida.supabase.co";
const DEFAULT_SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhd2lla2xzZmltdGVkbHppaWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTc3MjYsImV4cCI6MjEwNjk3MzcyNn0.n869MYTqqUIetdEz-2Db94TGTwP_sVy3VGT8fN98now";

export function createClient() {
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON;

  if (!supabaseUrl || supabaseUrl.includes("epthufuxulbthqmmnlxj") || supabaseUrl.includes("sbojksxyzhdhgskaujqp")) {
    supabaseUrl = DEFAULT_SUPABASE_URL;
    supabaseAnonKey = DEFAULT_SUPABASE_ANON;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
