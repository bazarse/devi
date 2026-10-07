import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const DEFAULT_SUPABASE_URL = "https://xawieklsfimtedlziida.supabase.co";
const DEFAULT_SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhd2lla2xzZmltdGVkbHppaWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTc3MjYsImV4cCI6MjEwNjk3MzcyNn0.n869MYTqqUIetdEz-2Db94TGTwP_sVy3VGT8fN98now";
const DEFAULT_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function createClient() {
  const cookieStore = cookies();
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON;

  if (!supabaseUrl || supabaseUrl.includes("epthufuxulbthqmmnlxj") || supabaseUrl.includes("sbojksxyzhdhgskaujqp")) {
    supabaseUrl = DEFAULT_SUPABASE_URL;
    supabaseAnonKey = DEFAULT_SUPABASE_ANON;
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component ignore
          }
        },
      },
    }
  );
}

export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_ROLE;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;

  return createServerClient(
    supabaseUrl,
    serviceKey,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}
