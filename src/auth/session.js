import { supabase, configured } from "../lib/supabase.js";

/** Who is signed in. profile = { full_name, role } from the sl_profiles table. */
export const auth = { user: null, profile: null };

export const isOwner = () => auth.profile?.role === "owner";
/** Owner sees every tab; a sales person sees only Sell. */
export const visibleTabs = (all) => (isOwner() ? all : all.filter((k) => k === "sell"));

const NOT_CONFIGURED = "Supabase is not configured. Check .env, then restart npm run dev.";

async function loadProfile(user) {
  const { data, error } = await supabase
    .from("sl_profiles").select("full_name, role, active").eq("id", user.id).maybeSingle();
  if (error) return { ok: false, msg: "Could not load your account. Check your internet and try again." };
  if (!data || !data.active) {
    await supabase.auth.signOut();
    return { ok: false, msg: "This account has no StockLedger access. Ask the owner." };
  }
  auth.user = user;
  auth.profile = { full_name: data.full_name, role: data.role };
  return { ok: true };
}

/** Restore an existing login after a page refresh. */
export async function loadSession() {
  if (!configured) return { ok: false, msg: NOT_CONFIGURED };
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { ok: false, msg: "" };
  return loadProfile(data.session.user);
}

export async function signIn(email, password) {
  if (!configured) return { ok: false, msg: NOT_CONFIGURED };
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data.user) return { ok: false, msg: "Wrong email or password." };
  return loadProfile(data.user);
}

export async function signOut() {
  try { await supabase.auth.signOut(); } catch (e) {}
  auth.user = null; auth.profile = null;
  location.reload();
}