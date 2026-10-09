import { createBrowserClient } from "@supabase/ssr";

const DEFAULT_SUPABASE_URL = "https://gzlzwqknwfgrsnyvgpnv.supabase.co";
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bHp3cWtud2ZncnNueXZncG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MTgzNzcsImV4cCI6MjEwNjk5NDM3N30.L2G9NrtgQM0MzvVJ50tG3S_4eso99INrsl9g2b7sVHI";

export function createClient() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY).replace(/[\r\n\s]+/g, "");

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createClient();

