import { S, prod, uid, save, log, PU } from "../state/store.js";
import { ui, clearDraft } from "../state/ui.js";
import { t } from "../i18n/index.js";
import { toast } from "../lib/dom.js";
import { num, r2, fmt, skey } from "../lib/format.js";
import { today } from "../lib/dates.js";
import { mv } from "./movements.js";
import { ensureProduct } from "./products.js";

/** Receive lines into stock (used when a purchase order is received). */
export function receiveLines(lines, supplier, d, rno) {
  const doc = uid();
  lines.forEach((l) => {
    const p = prod(l.pid); if (!p) return;
    const newCost = p.qty > 0 ? (p.qty * p.cost + l.qty * l.cost) / (p.qty + l.qty) : l.cost;
    p.cost = r2(newCost); p.qty = r2(p.qty + l.qty);
    if (l.price > 0) p.price = l.price;
    S.purchases.push({ id: uid(), doc, rno: rno || "", d, ts: Date.now(), supplier, open: false, pid: p.id, name: p.name, unit: p.unit, cat: p.category || "", sku: p.sku || "", qty: l.qty, cost: l.cost, total: r2(l.qty * l.cost) });
    mv(p.id, "purchase", l.qty, d, rno || "");
  });
}

/** Reverse a purchase in stock. Returns false if some of it was already sold. */
export function unrecordPurchase(x) {
  const p = prod(x.pid);
  if (p && p.qty < x.qty) return false;
  if (p) {
    const rem = r2(p.qty - x.qty);
    if (rem > 0) p.cost = Math.max(0, r2((p.qty * p.cost - x.qty * x.cost) / rem));
    p.qty = rem; mv(p.id, "del_purchase", -x.qty, x.d, "Deleted purchase");
  }
  x.void = true; x.voidTs = Date.now();
  return true;
}
export function deletePurchase(id) {
  const x = S.purchases.find((r) => r.id === id); if (!x || x.void) return false;
  if (!unrecordPurchase(x)) { toast(t("e_stock_low")); return false; }
  log("Deleted purchase: " + x.name + " × " + fmt(x.qty)); save(); toast(t("t_deleted"));
  return true;
}
export function startPurEdit(id) {
  const x = S.purchases.find((r) => r.id === id);
  if (!x || x.void || x.open) return false;
  const p = prod(x.pid);
  if (p && p.qty < x.qty) { toast(t("e_stock_low")); return false; }
  const D = ui.draft;
  ui.editPur = id;
  D.b_sup = x.supplier || ""; D.b_rno = x.rno || ""; D.b_date = x.d; D.b_item = x.name; D.b_qty = String(x.qty); D.b_cost = String(x.cost);
  ui.confirmKey = null; ui.tab = "buy";
  return true;
}
export function cancelPurEdit() { ui.editPur = null; clearDraft(["b_item", "b_qty", "b_cost"]); }

/** Add (or update) one purchase register line. */
export function addPurchaseRow() {
  const D = ui.draft;
  const sup = (D.b_sup || "").trim(), rno = (D.b_rno || "").trim(), d = D.b_date || today(), item = (D.b_item || "").trim(), q = num(D.b_qty), c = num(D.b_cost);
  if (!item) { toast(t("e_name")); return false; }
  if (q <= 0) { toast(t("e_qty")); return false; }
  if (!(c > 0)) { toast(t("e_price")); return false; }
  const old = ui.editPur ? S.purchases.find((r) => r.id === ui.editPur && !r.void) : null;
  const k = skey(sup), nm = item.toLowerCase();
  const dup = PU().some((x) => (!old || x.id !== old.id) && !x.open && skey(x.supplier) === k && (x.rno || "") === rno && x.d === d && x.name.trim().toLowerCase() === nm && x.qty === q && x.cost === c);
  if (dup) { toast(t("line_exists")); return false; }
  if (old && !unrecordPurchase(old)) { toast(t("e_stock_low")); return false; }
  const same = rno ? PU().find((x) => !x.open && skey(x.supplier) === k && x.rno === rno) : null;
  const p = ensureProduct(item);
  p.cost = r2(p.qty > 0 ? (p.qty * p.cost + q * c) / (p.qty + q) : c); p.qty = r2(p.qty + q);
  S.purchases.push({ id: uid(), doc: same ? same.doc : uid(), rno, d, ts: Date.now(), supplier: sup, open: false, pid: p.id, name: p.name, unit: p.unit, cat: p.category || "", sku: p.sku || "", qty: q, cost: c, total: r2(q * c) });
  mv(p.id, "purchase", q, d, rno);
  log((old ? "Purchase edited: " : "Purchase: ") + p.name + " × " + fmt(q) + (sup ? " from " + sup : ""));
  ui.editPur = null; clearDraft(["b_item", "b_qty", "b_cost"]); save(); toast(t(old ? "t_edited" : "t_purchase"));
  return true;
}