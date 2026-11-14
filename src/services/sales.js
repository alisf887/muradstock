import { S, prod, cust, uid, save, log } from "../state/store.js";
import { ui } from "../state/ui.js";
import { t } from "../i18n/index.js";
import { toast } from "../lib/dom.js";
import { r2, money } from "../lib/format.js";
import { today } from "../lib/dates.js";
import { mv } from "./movements.js";

export function addToCart(pid) {
  const p = prod(pid); if (!p || p.qty <= 0) return;
  const l = ui.cart.find((x) => x.pid === pid);
  if (l) { if (l.qty < p.qty) l.qty++; } else ui.cart.push({ pid, qty: 1, price: p.price });
}

export function completeSale() {
  if (!ui.cart.length) { toast(t("e_cart")); return false; }
  const D = ui.draft;
  let cid = null, cname = "";
  if (ui.method === "credit") {
    const nn = (D.s_newcust || "").trim();
    if (nn) { const c = { id: uid(), name: nn, phone: "", balance: 0 }; S.customers.push(c); cid = c.id; cname = nn; log("Added customer: " + nn); }
    else if (D.s_cust && cust(D.s_cust)) { cid = D.s_cust; cname = cust(cid).name; }
    else { toast(t("e_cust")); return false; }
  }
  const items = []; let total = 0, cogs = 0;
  ui.cart.forEach((l) => {
    const p = prod(l.pid); if (!p) return;
    const q = Math.min(l.qty, p.qty); if (q <= 0) return;
    items.push({ pid: p.id, name: p.name, unit: p.unit, cat: p.category || "", sku: p.sku || "", qty: q, price: l.price, cost: p.cost });
    total += q * l.price; cogs += q * p.cost; p.qty -= q; mv(p.id, "sale", -q, today(), "Sale #" + S.rno);
  });
  if (!items.length) { toast(t("e_cart")); return false; }
  const sale = { id: uid(), no: S.rno++, ts: Date.now(), d: today(), items, method: ui.method, cid, cname, total: r2(total), cogs: r2(cogs), void: false };
  S.sales.push(sale);
  if (cid) cust(cid).balance = r2(cust(cid).balance + sale.total);
  log("Sale #" + sale.no + ": " + money(sale.total));
  ui.cart = []; ui.method = "cash"; delete D.s_cust; delete D.s_newcust;
  save(); toast(t("t_sale") + " #" + sale.no + " · " + money(sale.total));
  return true;
}

export function voidSale(id) {
  const s = S.sales.find((x) => x.id === id);
  if (!s || s.void) return false;
  s.items.forEach((i) => { const p = prod(i.pid); if (p) { p.qty = r2(p.qty + i.qty); mv(p.id, "void_sale", i.qty, today(), "Void sale #" + s.no); } });
  if (s.cid && cust(s.cid)) cust(s.cid).balance = Math.max(0, r2(cust(s.cid).balance - s.total));
  s.void = true; s.voidTs = Date.now();
  log("Voided sale #" + s.no + ": " + money(s.total)); save(); toast(t("t_voided"));
  return true;
}
