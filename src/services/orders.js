import { S, prod, uid, save, log } from "../state/store.js";
import { t } from "../i18n/index.js";
import { toast } from "../lib/dom.js";
import { r2, fmt, money } from "../lib/format.js";
import { today } from "../lib/dates.js";
import { lowItems, need } from "./products.js";
import { receiveLines } from "./purchases.js";

export const poNo = (o) => "PO-" + String(o.no).padStart(3, "0");

/** One open purchase order per supplier for low-stock items not already on order. */
export function createPOs() {
  const onOrder = {};
  S.orders.forEach((o) => { if (o.status === "open") o.lines.forEach((l) => { onOrder[l.pid] = 1; }); });
  const groups = {};
  lowItems().forEach((p) => {
    if (need(p) <= 0 || onOrder[p.id]) return;
    const k = p.supplier || ""; (groups[k] = groups[k] || []).push(p);
  });
  let n = 0;
  Object.keys(groups).forEach((k) => {
    const lines = groups[k].map((p) => { const q = need(p); return { pid: p.id, name: p.name, unit: p.unit, qty: q, cost: p.cost, total: r2(q * p.cost) }; });
    const o = { id: uid(), no: S.pono++, d: today(), supplier: k, lines, total: r2(lines.reduce((a, l) => a + l.total, 0)), status: "open" };
    S.orders.push(o); n++; log(poNo(o) + " created");
  });
  if (!n) { toast(t("e_po")); return false; }
  save(); toast(t("t_po") + " (" + n + ")");
  return true;
}
export function receivePO(id) {
  const o = S.orders.find((x) => x.id === id);
  if (!o || o.status !== "open") return false;
  receiveLines(o.lines.filter((l) => prod(l.pid)).map((l) => ({ pid: l.pid, qty: l.qty, cost: l.cost, price: 0 })), o.supplier, today());
  o.status = "received"; o.rd = today();
  log(poNo(o) + " received"); save(); toast(t("t_received"));
  return true;
}
export function cancelPO(id) {
  const o = S.orders.find((x) => x.id === id); if (!o) return false;
  S.orders = S.orders.filter((x) => x.id !== id);
  log(poNo(o) + " cancelled"); save(); toast(t("t_deleted"));
  return true;
}
export function poText(o) {
  const L = [poNo(o) + " · " + o.d, (o.supplier || t("no_supplier")), ""];
  o.lines.forEach((l) => { L.push("• " + l.name + ": " + fmt(l.qty) + (l.unit ? " " + l.unit : "") + " × " + fmt(l.cost) + " = " + fmt(l.total)); });
  L.push("", t("total") + ": " + money(o.total));
  return L.join("\n");
}
