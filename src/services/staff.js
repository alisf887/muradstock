// src/services/staff.js
// Everything a sales person does. Stock comes from sl_catalog (no costs).
// Sales go to sl_inbox and purchases to sl_purchase_inbox; the owner's app records them.
import { supabase } from "../lib/supabase.js";
import { prod } from "../state/store.js";
import { isOwner } from "../auth/session.js";
import { ui, clearDraft } from "../state/ui.js";
import { t } from "../i18n/index.js";
import { toast } from "../lib/dom.js";
import { num, r2, money } from "../lib/format.js";
import { today } from "../lib/dates.js";
import { loadCatalog, submitSale, submitPurchase, resetPending, resetPendingPurchase } from "./sync.js";

export const staff = { items: [], loaded: false, busy: false, error: "" };
export const cat = (id) => staff.items.find((p) => p.id === id);
/** The product for an id: the owner's own product, or the shared catalog item. */
export const lookup = (id) => (isOwner() ? prod(id) : cat(id));

/** Keep the cart valid after stock or prices changed. */
function fixCart() {
  ui.cart = ui.cart
    .map((l) => { const p = cat(l.pid); return p ? { pid: l.pid, qty: Math.min(l.qty, p.qty), price: p.price } : null; })
    .filter((l) => l && l.qty > 0);
}

export async function refreshStaff() {
  try {
    const c = await loadCatalog(supabase);
    if (c.ok) {
      staff.items = c.items.map((p) => ({ ...p, price: Number(p.price), qty: Number(p.qty) }));
      staff.error = ""; fixCart();
    } else staff.error = c.error;
  } catch (e) { staff.error = "No internet. Try again."; }
  staff.loaded = true;
}

export function staffAddToCart(pid) {
  const p = cat(pid); if (!p || p.qty <= 0) return;
  const l = ui.cart.find((x) => x.pid === pid);
  if (l) { if (l.qty < p.qty) l.qty++; } else ui.cart.push({ pid, qty: 1, price: p.price });
}

let saleSig = "";
/** Save the sale in the cart. `after` redraws the screen. */
export async function staffComplete(after) {
  if (staff.busy) return;
  if (!ui.cart.length) { toast(t("e_cart")); return; }
  let customer = "";
  if (ui.method === "credit") {
    customer = (ui.draft.s_newcust || "").trim();
    if (!customer) { toast(t("e_cust")); return; }
  }
  const lines = ui.cart.map((l) => ({ pid: l.pid, qty: l.qty, price: cat(l.pid) ? cat(l.pid).price : l.price }));
  const total = r2(lines.reduce((a, l) => a + l.qty * l.price, 0));
  const sig = JSON.stringify([lines, ui.method, customer]);
  if (sig !== saleSig) { resetPending(); saleSig = sig; }   // new cart = new sale id

  staff.busy = true; after();
  let r;
  try { r = await submitSale(supabase, { lines, method: ui.method, customer }); }
  catch (e) { r = { ok: false, error: "No internet. Your sale was not saved. Try again." }; }
  staff.busy = false;
  if (r.ok) {
    ui.cart = []; ui.method = "cash"; delete ui.draft.s_newcust; saleSig = "";
    toast(t("t_sale") + " · " + money(total));
  } else toast(r.error);
  await refreshStaff(); after();
}

let purSig = "";
/** Save one purchase line from the Buy form. */
export async function staffPurchase(after) {
  if (staff.busy) return;
  const D = ui.draft;
  const item = (D.b_item || "").trim(), q = num(D.b_qty), c = num(D.b_cost);
  if (!item) { toast(t("e_name")); return; }
  if (q <= 0) { toast(t("e_qty")); return; }
  if (!(c > 0)) { toast(t("e_price")); return; }
  const rec = { supplier: (D.b_sup || "").trim(), rno: (D.b_rno || "").trim(), d: D.b_date || today(), item, qty: q, cost: c };
  const sig = JSON.stringify(rec);
  if (sig !== purSig) { resetPendingPurchase(); purSig = sig; }

  staff.busy = true; after();
  let r;
  try { r = await submitPurchase(supabase, rec); }
  catch (e) { r = { ok: false, error: "No internet. Your purchase was not saved. Try again." }; }
  staff.busy = false;
  if (r.ok) { clearDraft(["b_item", "b_qty", "b_cost"]); purSig = ""; toast(t("t_purchase")); }
  else toast(r.error);
  after();
}