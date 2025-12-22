import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use localStorage for session persistence (works across tab closes)
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    // Automatically refresh tokens before they expire
    autoRefreshToken: true,
    // Persist session in storage
    persistSession: true,
    // Automatically detect and handle OAuth callback from URL hash
    detectSessionInUrl: true,
  },
});
