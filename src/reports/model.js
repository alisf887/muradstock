import { S, SA, PU } from "../state/store.js";
import { ui } from "../state/ui.js";
import { tl } from "../i18n/index.js";
import { r2, fmt, fm2, fd, skey, sname } from "../lib/format.js";
import { today, rangeFor, monthYear } from "../lib/dates.js";

/* ---------- finance summary (Finance tab + summary CSV) ---------- */
export function reportData() {
  const [from, to] = rangeFor(ui.repMode, ui.repYear, ui.repQ);
  const P = PU().filter((x) => x.d >= from && x.d <= to);
  const Sa = SA().filter((x) => x.d >= from && x.d <= to);
  const Pay = S.payments.filter((x) => x.d >= from && x.d <= to);
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  const RC = S.returns.filter((r) => r.kind === "customer" && r.d >= from && r.d <= to);
  const sales = sum(Sa, (x) => x.total) - sum(RC, (r) => r.amount);
  const cogs = sum(Sa, (x) => x.cogs) - sum(RC, (r) => r.cost);
  return {
    from, to, P, Sa, RC, buy: sum(P, (x) => x.total), sales, cogs, gross: sales - cogs,
    credit: sum(Sa.filter((x) => x.method === "credit"), (x) => x.total),
    paid: sum(Pay, (x) => x.amount),
    owed: sum(S.customers, (c) => c.balance),
    stockv: sum(S.products, (p) => p.qty * p.cost)
  };
}
export function periodLabel() {
  const qs = ui.repQ ? "_Q" + ui.repQ : "_year";
  return (ui.repMode === "fy" ? "FY" + ui.repYear : ui.repYear) + qs;
}

/* ---------- register / summary / stock-on-hand models ---------- */
export const filt = () => ({ from: ui.draft.rf_from || "", to: ui.draft.rf_to || "", sup: ui.draft.rf_sup || "" });
const inRange = (d, F) => (!F.from || d >= F.from) && (!F.to || d <= F.to);
const H = (a) => a.map((s) => String(s).toUpperCase());
const vatLbl = (lang) => tl(lang, "vat_line") + " (" + fmt(S.vat * 100) + "%) :";

function periodLine(F, lang) {
  return tl(lang, "period") + ": " + ((F.from || F.to) ? ((F.from || "...") + "  -  " + (F.to || "...")) : tl(lang, "p_all"));
}
function supLine(F, lang, lines) {
  if (!F.sup) return tl(lang, "supplier_f") + ": " + tl(lang, "all_sup");
  const l = lines.length ? lines[0].sup : F.sup;
  return tl(lang, "supplier_f") + ": " + l;
}
function bannerFor(lang, title) {
  const b = S.biz || {}, name = (b.name || "").trim(), per = (b.period || "").trim(), tin = (b.tin || "").trim();
  return { name: name || title, sub: name ? (title + (per ? "  |  " + per : "")) : per, tin: tin ? "TIN: " + tin : "", prepared: tl(lang, "prepared") + ": " + monthYear() };
}
export function purLines(F, lang) {
  const out = [];
  PU().forEach((x) => {
    if (x.open || !inRange(x.d, F)) return;
    if (F.sup && skey(x.supplier) !== F.sup) return;
    out.push({ id: x.id, sup: sname(x.supplier, lang), k: skey(x.supplier), item: x.name, d: x.d, rno: x.rno || "", qty: x.qty, price: x.cost, total: x.total,
      inv: x.rno ? skey(x.supplier) + "|" + String(x.rno).trim().toLowerCase() : (x.doc || x.id), ts: x.ts || 0, ret: false });
  });
  S.returns.forEach((r) => {
    if (r.kind !== "supplier" || !inRange(r.d, F)) return;
    if (F.sup && skey(r.supplier) !== F.sup) return;
    out.push({ id: null, sup: sname(r.supplier, lang), k: skey(r.supplier), item: r.name, d: r.d, rno: r.ref || "", qty: -r.qty, price: r.qty ? r2(r.amount / r.qty) : 0, total: -r.amount, inv: "ret:" + r.id, ts: 0, ret: true });
  });
  out.sort((a, b) => a.sup.toLowerCase() < b.sup.toLowerCase() ? -1 : a.sup.toLowerCase() > b.sup.toLowerCase() ? 1 : a.d < b.d ? -1 : a.d > b.d ? 1 : a.ts - b.ts);
  return out;
}

/** One model feeds the on-screen table, the Excel file and the PDF. v = "reg" | "sum" | "soh" */
export function buildModel(v, lang) {
  const F = filt();
  if (v === "reg") {
    const L = purLines(F, lang), sub = r2(L.reduce((a, x) => a + x.total, 0)), vat = r2(sub * S.vat), grand = r2(sub + vat), ttl = tl(lang, "ttl_reg");
    return { kind: "reg", title: ttl, banner: bannerFor(lang, ttl), filters: periodLine(F, lang) + "   |   " + supLine(F, lang, L),
      head: H([tl(lang, "h_sup"), tl(lang, "h_item"), tl(lang, "h_date"), tl(lang, "h_rno"), tl(lang, "h_qty"), tl(lang, "h_price"), tl(lang, "h_total")]),
      types: ["t", "t", "d", "r", "q", "m", "m"], widths: [32, 36, 12, 14, 9, 16, 18],
      rows: L.map((x) => [x.sup, x.item + (x.ret ? " (" + tl(lang, "k_ret_s") + ")" : ""), x.d, x.rno, x.qty, x.price, x.total]), ids: L.map((x) => x.id),
      foot: [{ label: tl(lang, "sub_ex"), value: sub, c: "pk" }, { label: vatLbl(lang), value: vat, c: "yl" }, { label: "★ " + tl(lang, "grand_in"), value: grand, c: "am" }],
      note: tl(lang, "rep_note"), file: "purchase-register", sheet: "Purchase Register", empty: !L.length };
  }
  if (v === "sum") {
    const L2 = purLines(F, lang), g = {}, order = [], ttl2 = tl(lang, "ttl_sum");
    L2.forEach((x) => { const s = g[x.k] || (g[x.k] = { name: x.sup, docs: {}, total: 0 }); if (!x.ret) s.docs[x.inv] = 1; s.total += x.total; if (order.indexOf(x.k) < 0) order.push(x.k); });
    order.sort((a, b) => g[a].name.toLowerCase() < g[b].name.toLowerCase() ? -1 : 1);
    const rows = order.map((k, i) => [i + 1, g[k].name, Object.keys(g[k].docs).length, r2(g[k].total)]);
    const inv = rows.reduce((a, r) => a + r[2], 0), tot = r2(rows.reduce((a, r) => a + r[3], 0)), vt = r2(tot * S.vat);
    return { kind: "sum", title: ttl2, banner: bannerFor(lang, ttl2), filters: periodLine(F, lang) + "   |   " + supLine(F, lang, L2),
      head: H([tl(lang, "h_no"), tl(lang, "h_supname"), tl(lang, "h_inv"), tl(lang, "h_totpur")]), types: ["n", "t", "n", "m"], widths: [8, 42, 20, 24],
      rows, total: ["", tl(lang, "grand"), inv, tot],
      foot: [{ label: vatLbl(lang), value: vt, c: "yl" }, { label: "★ " + tl(lang, "grand_in"), value: r2(tot + vt), c: "am" }],
      note: tl(lang, "rep_note"), file: "purchase-summary-by-supplier", sheet: "Summary by Supplier", empty: !rows.length };
  }
  const by = {}, td = today(), rows3 = [], T3 = [0, 0, 0, 0, 0], ttl3 = tl(lang, "ttl_soh");
  S.moves.forEach((m) => { (by[m.pid] || (by[m.pid] = [])).push(m); });
  S.products.forEach((p) => {
    let o = 0, pu = 0, sa = 0, re = 0, ad = 0;
    (by[p.id] || []).forEach((m) => {
      if (F.from && m.d < F.from) { o += m.qty; return; }
      if (F.to && m.d > F.to) return;
      if (m.type === "open") o += m.qty;
      else if (m.type === "purchase" || m.type === "del_purchase") pu += m.qty;
      else if (m.type === "sale" || m.type === "void_sale") sa += m.qty;
      else if (m.type === "return_in" || m.type === "return_out") re += m.qty;
      else ad += m.qty;
    });
    o = r2(o); pu = r2(pu); sa = r2(sa); re = r2(re); ad = r2(ad);
    const cl = r2(o + pu + sa + re + ad);
    if (!o && !pu && !sa && !re && !ad && !cl) return;
    const chk = (!F.to || F.to >= td) ? (cl === r2(p.qty) ? tl(lang, "ok") : tl(lang, "mismatch")) : "—";
    rows3.push([p.name, p.unit || "", o, pu, sa, re, ad, cl, chk]);
    T3[0] += o; T3[1] += pu; T3[2] += sa; T3[3] += re; T3[4] += ad;
  });
  const tc = r2(T3[0] + T3[1] + T3[2] + T3[3] + T3[4]);
  return { kind: "soh", title: ttl3, banner: bannerFor(lang, ttl3), filters: periodLine(F, lang) + "   |   " + tl(lang, "note_soh"),
    head: H([tl(lang, "h_itemname"), tl(lang, "unit"), tl(lang, "opening"), tl(lang, "purchases_c"), tl(lang, "sales_c"), tl(lang, "returns_c"), tl(lang, "adjust_c"), tl(lang, "closing_c"), tl(lang, "check_c")]),
    types: ["t", "t", "q", "q", "q", "q", "q", "q", "t"], widths: [32, 10, 14, 12, 12, 12, 14, 14, 22],
    rows: rows3, total: [tl(lang, "total"), ""].concat(T3.map(r2)).concat([tc, ""]), foot: [], file: "stock-on-hand", sheet: "Stock on Hand", empty: !rows3.length };
}

export function cellText(type, v) {
  if (v === null || v === undefined || v === "") return "";
  if (type === "m") return fm2(v);
  if (type === "q") return fmt(v);
  if (type === "d") return fd(v);
  return String(v);
}
