import { S, prod, uid, save, log } from "../state/store.js";
import { ui, clearDraft } from "../state/ui.js";
import { t } from "../i18n/index.js";
import { toast } from "../lib/dom.js";
import { num, r2, fmt } from "../lib/format.js";
import { today } from "../lib/dates.js";
import { mv } from "./movements.js";

export const PF = ["p_name","p_unit","p_cat","p_sku","p_sup","p_price","p_reorder","p_rq","p_max","p_qty","p_cost"];

/** "out" | "crit" | "reorder" | "over" | "ok" */
export function status(p) {
  if (p.qty <= 0) return "out";
  if (p.reorder > 0 && p.qty <= p.reorder * 0.5) return "crit";
  if (p.reorder > 0 && p.qty <= p.reorder) return "reorder";
  if (p.max > 0 && p.qty > p.max) return "over";
  return "ok";
}
/** Suggested order quantity. */
export function need(p) {
  if (p.rq > 0) return p.rq;
  const target = p.max > 0 ? p.max : Math.max(p.reorder * 2, p.reorder + 1);
  return Math.max(0, Math.ceil(target - p.qty));
}
export function lowItems() {
  return S.products.filter((p) => { const s = status(p); return s === "out" || s === "crit" || s === "reorder"; });
}
export function findProduct(name) {
  const k = String(name || "").trim().toLowerCase();
  return S.products.find((p) => p.name.trim().toLowerCase() === k);
}
/** Find a product by name or create an empty one (used by Buy). */
export function ensureProduct(name) {
  let p = findProduct(name);
  if (p) return p;
  p = { id: uid(), name: String(name).trim(), unit: "", category: "", sku: "", supplier: "", price: 0, cost: 0, qty: 0, reorder: 0, rq: 0, max: 0 };
  S.products.push(p); log("Added product: " + p.name);
  return p;
}
function pfields() {
  const D = ui.draft;
  return { unit: (D.p_unit || "").trim(), cat: (D.p_cat || "").trim(), sku: (D.p_sku || "").trim(), sup: (D.p_sup || "").trim(),
    price: Math.max(0, num(D.p_price)), reorder: Math.max(0, num(D.p_reorder)), rq: Math.max(0, num(D.p_rq)), max: Math.max(0, num(D.p_max)) };
}
export function startEdit(id) {
  const p = prod(id); if (!p) return false;
  const D = ui.draft;
  ui.editPid = id; clearDraft(PF);
  D.p_name = p.name; D.p_unit = p.unit || ""; D.p_cat = p.category || ""; D.p_sku = p.sku || ""; D.p_sup = p.supplier || "";
  D.p_price = String(p.price); D.p_reorder = p.reorder ? String(p.reorder) : ""; D.p_rq = p.rq ? String(p.rq) : ""; D.p_max = p.max ? String(p.max) : "";
  D.p_qty = String(p.qty); D.p_cost = String(p.cost);
  ui.tab = "stock"; ui.confirmKey = null;
  return true;
}
export function cancelEdit() { ui.editPid = null; clearDraft(PF); }

/** Add a new product, or save edits when editing. Returns true if state changed. */
export function addProduct() {
  const D = ui.draft, name = (D.p_name || "").trim();
  if (!name) { toast(t("e_name")); return false; }
  const f = pfields();
  if (ui.editPid) {
    const e = prod(ui.editPid);
    if (!e) { ui.editPid = null; return true; }
    e.name = name; e.unit = f.unit; e.category = f.cat; e.sku = f.sku; e.supplier = f.sup; e.price = f.price; e.reorder = f.reorder; e.rq = f.rq; e.max = f.max;
    if (D.p_cost !== undefined && D.p_cost !== "") e.cost = Math.max(0, num(D.p_cost));
    if (D.p_qty !== undefined && D.p_qty !== "") {
      const nq = Math.max(0, num(D.p_qty));
      if (nq !== e.qty) { log("Count corrected: " + e.name + " " + fmt(e.qty) + " to " + fmt(nq)); mv(e.id, "adjust", nq - e.qty, today(), "Stock count correction"); e.qty = nq; }
    }
    log("Edited product: " + e.name);
    ui.editPid = null; clearDraft(PF); save(); toast(t("t_edited"));
    return true;
  }
  const qty = Math.max(0, num(D.p_qty)), cost = Math.max(0, num(D.p_cost));
  const p = { id: uid(), name, unit: f.unit, category: f.cat, sku: f.sku, supplier: f.sup, price: f.price, cost, qty: 0, reorder: f.reorder, rq: f.rq, max: f.max };
  S.products.push(p);
  if (qty > 0) {
    p.qty = qty;
    const oid = uid();
    S.purchases.push({ id: oid, doc: oid, rno: "", d: today(), ts: Date.now(), supplier: "", open: true, pid: p.id, name: p.name, unit: p.unit, cat: p.category, sku: p.sku, qty, cost, total: r2(qty * cost) });
    mv(p.id, "open", qty, today(), "Opening stock");
  }
  log("Added product: " + name);
  clearDraft(PF); save(); toast(t("t_prod"));
  return true;
}
export function removeProduct(id) {
  const p = prod(id); if (!p) return false;
  S.products = S.products.filter((x) => x.id !== id);
  ui.cart = ui.cart.filter((x) => x.pid !== id);
  log("Deleted product: " + p.name); save(); toast(t("t_deleted"));
  return true;
}