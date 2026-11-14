import { supabase } from "../lib/supabase.js";
import { S, prod, save, hooks } from "../state/store.js";
import { ui } from "../state/ui.js";
import { auth, isOwner } from "../auth/session.js";
import { t } from "../i18n/index.js";
import { toast } from "../lib/dom.js";
import { r2 } from "../lib/format.js";
import { dkey } from "../lib/dates.js";
import { applyRemoteSale } from "./sales.js";

/* ───────────── owner side ───────────── */

let pubTimer = null;
let pubFailed = false;

/** Copy products (without cost) to Supabase so sales people can see them. */
export async function publishCatalog() {
  if (!supabase || !isOwner()) return;
  const rows = S.products.map((p) => ({
    id: p.id, name: p.name, unit: p.unit || "", category: p.category || "", sku: p.sku || "",
    price: p.price, qty: p.qty, updated_at: new Date().toISOString()
  }));
  try {
    if (rows.length) { const { error } = await supabase.from("sl_catalog").upsert(rows); if (error) throw error; }
    const { data, error } = await supabase.from("sl_catalog").select("id");
    if (error) throw error;
    const keep = new Set(rows.map((r) => r.id));
    const gone = (data || []).map((r) => r.id).filter((id) => !keep.has(id));
    if (gone.length) { const r = await supabase.from("sl_catalog").delete().in("id", gone); if (r.error) throw r.error; }
    pubFailed = false;
  } catch (e) {
    if (!pubFailed) toast("Could not share stock with sales people. Check your internet.");
    pubFailed = true;
  }
}
const schedulePublish = () => { clearTimeout(pubTimer); pubTimer = setTimeout(publishCatalog, 1500); };

let pulling = false;
/** Record sales that sales people saved. onChange() redraws the screen. */
export async function pullInbox(onChange) {
  if (!supabase || !isOwner() || pulling) return;
  pulling = true;
  try {
    const { data, error } = await supabase.from("sl_inbox").select("*").eq("status", "new").order("id");
    if (error || !data || !data.length) return;
    let n = 0; const ids = [];
    for (const row of data) {
      if (!S.applied.includes(row.sale_uid)) { if (applyRemoteSale(row)) n++; S.applied.push(row.sale_uid); }
      ids.push(row.id);
    }
    if (S.applied.length > 2000) S.applied.splice(0, S.applied.length - 2000);
    save();                                   // stored here first, so a retry never counts a sale twice
    await supabase.from("sl_inbox").update({ status: "applied" }).in("id", ids);
    if (n) { toast(n + (n === 1 ? " new sale" : " new sales") + " from your sales team"); if (onChange) onChange(); }
  } catch (e) { /* try again on the next round */ } finally { pulling = false; }
}

export function startOwnerSync(onChange) {
  hooks.afterSave = schedulePublish;
  pullInbox(onChange).then(publishCatalog);
  setInterval(() => { if (!document.hidden) pullInbox(onChange); }, 15000);
}

/* ───────────── sales person side ───────────── */

/** This person's recent sales, shaped like owner sales so the Sell screen can list them. */
export const mySales = [];
let busy = false;

export async function loadMySales() {
  const { data } = await supabase.from("sl_inbox")
    .select("id, created_at, method, customer_name, items, total")
    .eq("sold_by", auth.user.id).order("id", { ascending: false }).limit(8);
  mySales.length = 0;
  (data || []).forEach((r) => mySales.push({
    id: String(r.id), no: r.id, d: dkey(new Date(r.created_at)), items: r.items,
    method: r.method, cname: r.customer_name, total: Number(r.total), void: false
  }));
}

/** Replace the in-memory product list with the owner's catalog. Returns false if it could not load. */
export async function refreshCatalog() {
  const { data, error } = await supabase.from("sl_catalog").select("*").order("name");
  if (error || !data) return false;
  S.products = data.map((r) => ({
    id: r.id, name: r.name, unit: r.unit || "", category: r.category || "", sku: r.sku || "", supplier: "",
    price: Number(r.price), cost: 0, qty: Number(r.qty), reorder: 0, rq: 0, max: 0
  }));
  ui.cart.forEach((l) => { const p = prod(l.pid); if (p) { l.price = p.price; if (l.qty > p.qty) l.qty = p.qty; } });
  ui.cart = ui.cart.filter((l) => prod(l.pid) && l.qty > 0);
  return true;
}

/** Sales people never write to this browser's saved data, and never see the owner's books. */
export async function loadCatalogForSales() {
  hooks.persist = false;
  S.products = []; S.customers = []; S.sales = []; S.purchases = []; S.payments = [];
  S.orders = []; S.log = []; S.moves = []; S.returns = [];
  await refreshCatalog();
  await loadMySales();
}

export function startSalesSync(onChange) {
  setInterval(async () => {
    const a = document.activeElement;
    if (document.hidden || (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))) return;
    if (await refreshCatalog()) onChange();
  }, 30000);
}

/** Save the cart as a sale. The server re-checks stock and price. Returns true when the screen should redraw. */
export async function completeSaleRemote() {
  if (!ui.cart.length) { toast(t("e_cart")); return false; }
  if (busy) return false;
  busy = true;
  try {
    let customer = "";
    if (ui.method === "credit") {
      customer = (ui.draft.s_newcust || "").trim();
      if (!customer) { toast(t("e_cust")); return false; }
    }
    const items = ui.cart.map((l) => { const p = prod(l.pid); return p ? { pid: p.id, name: p.name, qty: l.qty, price: p.price } : null; }).filter(Boolean);
    if (!items.length) { toast(t("e_cart")); return false; }
    const total = r2(items.reduce((a, i) => a + i.qty * i.price, 0));
    const { error } = await supabase.from("sl_inbox").insert({ sale_uid: crypto.randomUUID(), method: ui.method, customer_name: customer, items, total });
    if (error) {
      toast(error.code === "P0001" ? error.message : "Sale not saved. Check your internet and try again.");
      await refreshCatalog();
      return true;
    }
    ui.cart = []; ui.method = "cash"; delete ui.draft.s_cust; delete ui.draft.s_newcust;
    await Promise.all([refreshCatalog(), loadMySales()]);
    toast(t("t_sale") + " · ETB " + total);
    return true;
  } finally { busy = false; }
}