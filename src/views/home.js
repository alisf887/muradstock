import { S, SA } from "../state/store.js";
import { pref } from "../state/store.js";
import { t } from "../i18n/index.js";
import { esc, fmt, money } from "../lib/format.js";
import { today, dkey, addDays } from "../lib/dates.js";
import { lowItems } from "../services/products.js";
import { head, empty, badge } from "./components.js";

function sparkChart() {
  const days = []; let max = 0;
  for (let i = 6; i >= 0; i--) {
    const d = addDays(new Date(), -i), k = dkey(d);
    const v = SA().filter((s) => s.d === k).reduce((a, s) => a + s.total, 0);
    days.push({ k, v, l: d.toLocaleDateString(pref.lang === "am" ? "am-ET" : "en-US", { weekday: "short" }) });
    if (v > max) max = v;
  }
  const W = 320, H = 130, bw = 28, gap = (W - 7 * bw) / 8;
  let out = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + t("last7") + '" width="100%">';
  out += '<line class="axis" x1="0" x2="' + W + '" y1="104" y2="104"/>';
  days.forEach((d, j) => {
    const h = max ? Math.max(d.v > 0 ? 3 : 0, d.v / max * 80) : 0, x = gap + j * (bw + gap);
    out += '<rect class="bar" rx="3" x="' + x + '" y="' + (104 - h) + '" width="' + bw + '" height="' + h + '"/>';
    if (d.v > 0) out += '<text x="' + (x + bw / 2) + '" y="' + (100 - h) + '" text-anchor="middle">' + fmt(d.v) + "</text>";
    out += '<text x="' + (x + bw / 2) + '" y="120" text-anchor="middle">' + esc(d.l) + "</text>";
  });
  return out + "</svg>";
}

export function home() {
  const td = today(), ts = SA().filter((s) => s.d === td);
  const sales = ts.reduce((a, s) => a + s.total, 0), pf = ts.reduce((a, s) => a + s.total - s.cogs, 0);
  const sv = S.products.reduce((a, p) => a + p.qty * p.cost, 0), owed = S.customers.reduce((a, c) => a + c.balance, 0), low = lowItems();
  let h = head("home", t("saved_here"));
  if (!S.products.length) return h + empty();
  h += '<div class="stats">' +
    '<div class="stat"><div class="l">' + t("today_sales") + '</div><div class="v">' + money(sales) + "</div></div>" +
    '<div class="stat"><div class="l">' + t("today_profit") + '</div><div class="v ' + (pf < 0 ? "neg" : "") + '">' + money(pf) + "</div></div>" +
    '<div class="stat"><div class="l">' + t("low_items") + '</div><div class="v">' + low.length + "</div></div>" +
    '<div class="stat"><div class="l">' + t("stock_value") + '</div><div class="v">' + money(sv) + "</div></div>" +
    '<div class="stat"><div class="l">' + t("credit_owed") + '</div><div class="v">' + money(owed) + "</div></div></div>";
  h += '<div class="grid2"><div class="card"><h2>' + t("last7") + "</h2>" + sparkChart() + "</div>";
  h += '<div class="card"><h2>' + t("reorder_soon") + "</h2>";
  if (!low.length) h += '<p class="meta">' + t("nothing_reorder") + "</p>";
  else {
    h += '<div class="list">';
    low.slice(0, 6).forEach((p) => { h += '<div class="item"><div class="grow"><div class="name">' + esc(p.name) + '</div><div class="meta num">' + fmt(p.qty) + " " + esc(p.unit) + "</div></div>" + badge(p) + "</div>"; });
    h += "</div>";
  }
  return h + "</div></div>";
}
