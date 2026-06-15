import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ddztohwsizuznfmjmkfd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_o1DWpVg0bIDuMxgw5dbIdg_28IjnuJ0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});
