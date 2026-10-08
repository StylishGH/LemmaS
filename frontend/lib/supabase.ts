import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").replace(/[\r\n\s]+/g, "");

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórios");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

