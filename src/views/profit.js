import { S, SA, PU } from "../state/store.js";
import { ui } from "../state/ui.js";
import { t } from "../i18n/index.js";
import { esc, fmt, money } from "../lib/format.js";
import { today, dkey, addDays } from "../lib/dates.js";
import { head, empty } from "./components.js";

export function profit() {
  let h = head("profit");
  if (!S.products.length) return h + empty();
  const td = new Date(), pr = ui.profitRange; let from;
  if (pr === "today") from = today(); else if (pr === "7") from = dkey(addDays(td, -6)); else if (pr === "30") from = dkey(addDays(td, -29)); else from = "0000-00-00";
  const Sa = SA().filter((s) => s.d >= from);
  let rev = 0, cg = 0; const by = {}, bc = {};
  Sa.forEach((s) => {
    rev += s.total; cg += s.cogs;
    s.items.forEach((i) => {
      const b = by[i.pid] || (by[i.pid] = { name: i.name, qty: 0, rev: 0, cost: 0 }); b.qty += i.qty; b.rev += i.qty * i.price; b.cost += i.qty * i.cost;
      const ck = i.cat || "—", c = bc[ck] || (bc[ck] = { name: ck, qty: 0, rev: 0, cost: 0 }); c.qty += i.qty; c.rev += i.qty * i.price; c.cost += i.qty * i.cost;
    });
  });
  S.returns.forEach((r) => { if (r.kind === "customer" && r.d >= from) { rev -= r.amount; cg -= r.cost; } });
  const gp = rev - cg, mg = rev ? gp / rev * 100 : 0;
  h += '<div class="seg" style="align-self:flex-start" role="group">';
  [["today", "r_today"], ["7", "r_7"], ["30", "r_30"], ["all", "r_all"]].forEach((r) => { h += '<button data-act="prange" data-v="' + r[0] + '" aria-pressed="' + (pr === r[0]) + '">' + t(r[1]) + "</button>"; });
  h += '</div><div class="stats"><div class="stat"><div class="l">' + t("revenue") + '</div><div class="v">' + money(rev) + '</div></div><div class="stat"><div class="l">' + t("cogs") + '</div><div class="v">' + money(cg) + "</div></div>" +
    '<div class="stat"><div class="l">' + t("gross") + '</div><div class="v ' + (gp < 0 ? "neg" : "pos") + '">' + money(gp) + '</div></div><div class="stat"><div class="l">' + t("margin") + '</div><div class="v">' + fmt(mg) + "%</div></div></div>";
  const tbl = (rows, first) => {
    let o = '<div class="scroll"><table><thead><tr><th>' + first + "</th><th>" + t("qty") + "</th><th>" + t("revenue") + "</th><th>" + t("profit_l") + "</th><th>" + t("margin") + "</th></tr></thead><tbody>";
    rows.forEach((r) => { const pf = r.rev - r.cost; o += "<tr><td>" + esc(r.name) + '</td><td class="num">' + fmt(r.qty) + '</td><td class="num">' + money(r.rev) + '</td><td class="num ' + (pf < 0 ? "neg" : "") + '">' + money(pf) + '</td><td class="num">' + fmt(r.rev ? pf / r.rev * 100 : 0) + "%</td></tr>"; });
    return o + "</tbody></table></div>";
  };
  const rows = Object.keys(by).map((k) => by[k]).sort((a, b) => (b.rev - b.cost) - (a.rev - a.cost));
  h += '<div class="card"><h2>' + t("by_product") + "</h2>" + (rows.length ? tbl(rows, t("item_name")) : '<p class="meta">' + t("no_rows") + "</p>") + "</div>";
  const wr = rows.filter((r) => r.rev > 0).map((r) => ({ name: r.name, m: (r.rev - r.cost) / r.rev * 100, pf: r.rev - r.cost }));
  if (wr.length) {
    const best = wr.slice().sort((a, b) => b.m - a.m).slice(0, 5), worst = wr.slice().sort((a, b) => a.m - b.m).slice(0, 5);
    const mini = (list) => '<div class="scroll"><table><tbody>' + list.map((r) => "<tr><td>" + esc(r.name) + '</td><td class="num">' + fmt(r.m) + '%</td><td class="num">' + money(r.pf) + "</td></tr>").join("") + "</tbody></table></div>";
    h += '<div class="grid2"><div class="card"><h2>' + t("top5") + "</h2>" + mini(best) + '</div><div class="card"><h2>' + t("bottom5") + "</h2>" + mini(worst) + "</div></div>";
  }
  const cr = Object.keys(bc).map((k) => bc[k]).sort((a, b) => (b.rev - b.cost) - (a.rev - a.cost));
  if (cr.length) h += '<div class="card"><h2>' + t("by_category") + "</h2>" + tbl(cr, t("category")) + "</div>";
  const limit = dkey(addDays(td, -60));
  const slow = S.products.filter((p) => {
    if (p.qty <= 0) return false;
    const first = PU().filter((x) => x.pid === p.id).reduce((m, x) => x.d < m ? x.d : m, "9999");
    if (first > limit) return false;
    return !SA().some((s) => s.d > limit && s.items.some((i) => i.pid === p.id));
  });
  const tied = slow.reduce((a, p) => a + p.qty * p.cost, 0);
  h += '<div class="card"><h2>' + t("slow") + '</h2><p class="meta" style="margin:0 0 8px">' + t("slow_note") + "</p>";
  if (!slow.length) h += '<p class="meta">' + t("none") + "</p>";
  else {
    h += '<div class="list">';
    slow.forEach((p) => { h += '<div class="item"><div class="grow name">' + esc(p.name) + '</div><div class="num">' + fmt(p.qty) + " " + esc(p.unit) + '</div><div class="num">' + money(p.qty * p.cost) + "</div></div>"; });
    h += '</div><p class="meta" style="margin:8px 0 0"><b>' + money(tied) + "</b> " + t("tied") + "</p>";
  }
  return h + "</div>";
}
