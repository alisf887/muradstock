import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False when .env is missing or Vite was not restarted after editing it. */
export const configured = Boolean(url && key);
export const supabase = configured ? createClient(url, key) : null;