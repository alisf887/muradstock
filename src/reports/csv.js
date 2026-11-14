import { S, cust, prod } from "../state/store.js";
import { ui } from "../state/ui.js";
import { t } from "../i18n/index.js";
import { toast } from "../lib/dom.js";
import { r2 } from "../lib/format.js";
import { reportData, periodLabel } from "./model.js";

const q = (v) => { v = String(v == null ? "" : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const toCsv = (rows) => "\uFEFF" + rows.map((r) => r.map(q).join(",")).join("\r\n");

/** kind = "buy" | "sales" | "sum" */
export function buildCsv(kind) {
  const R = reportData();
  let rows;
  if (kind === "buy") {
    rows = [["Date","Supplier","Item","Category","SKU","Unit","Quantity","Unit cost (ETB)","Total (ETB)","Type"]];
    R.P.slice().sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0).forEach((x) => {
      const p = prod(x.pid) || {};
      rows.push([x.d, x.supplier, x.name, x.cat || p.category || "", x.sku || p.sku || "", x.unit, x.qty, x.cost, x.total, x.open ? "Opening stock" : "Purchase"]);
    });
    rows.push([], ["Total","","","","","","","", r2(R.buy), ""]);
  } else if (kind === "sales") {
    rows = [["Date","Receipt no.","Item","Category","SKU","Unit","Quantity","Unit price (ETB)","Total (ETB)","Cost (ETB)","Profit (ETB)","Payment","Customer"]];
    R.Sa.forEach((s) => s.items.forEach((i) => {
      const c = s.cid && cust(s.cid);
      rows.push([s.d, s.no, i.name, i.cat || "", i.sku || "", i.unit, i.qty, i.price, r2(i.qty * i.price), r2(i.qty * i.cost), r2(i.qty * (i.price - i.cost)), s.method, c ? c.name : (s.cname || "")]);
    }));
    R.RC.forEach((r) => rows.push([r.d, "Return", r.name, "", "", "", -r.qty, "", -r.amount, -r.cost, r2(-(r.amount - r.cost)), "return", ""]));
    rows.push([], ["Total","","","","","","","", r2(R.sales), r2(R.cogs), r2(R.gross), "", ""]);
  } else {
    rows = [["StockLedger summary"], ["Basis", ui.repMode === "fy" ? "Ethiopian fiscal year (from 8 July)" : "Calendar year"], ["Period", R.from + " to " + R.to], [],
      ["Measure","ETB"], ["Total bought", r2(R.buy)], ["Total sold", r2(R.sales)], ["Cost of goods sold", r2(R.cogs)], ["Gross profit", r2(R.gross)],
      ["Credit sales in period", r2(R.credit)], ["Payments received in period", r2(R.paid)], ["Credit still owed (today)", r2(R.owed)], ["Stock value (today)", r2(R.stockv)], [],
      ["Buying by item"], ["Item","Quantity","Total (ETB)","Average unit cost (ETB)"]];
    const by = {};
    R.P.forEach((x) => { const b = by[x.pid] || (by[x.pid] = { name: x.name, qty: 0, total: 0 }); b.qty += x.qty; b.total += x.total; });
    Object.keys(by).forEach((k) => { const b = by[k]; rows.push([b.name, r2(b.qty), r2(b.total), b.qty ? r2(b.total / b.qty) : 0]); });
  }
  return toCsv(rows);
}
export const fileName = (kind) => ({ buy: "purchases", sales: "sales", sum: "summary" }[kind]) + "_" + periodLabel() + ".csv";

export function exportCsv(kind) {
  if (!ui.DL) { toast(t("t_dl_no")); return; }
  ui.DL.save({ filename: fileName(kind), data: buildCsv(kind) })
    .then(() => toast(t("t_dl")), (e) => { if (e && e.code !== "declined") toast(t("t_dl_no")); });
}
