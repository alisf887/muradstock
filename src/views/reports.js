import { S } from "../state/store.js";
import { ui } from "../state/ui.js";
import { pref } from "../state/store.js";
import { t } from "../i18n/index.js";
import { esc, fmt, fm2, money, skey, sname } from "../lib/format.js";
import { now0 } from "../lib/dates.js";
import { PU } from "../state/store.js";
import { buildModel, reportData, filt, cellText } from "../reports/model.js";
import { fileName } from "../reports/csv.js";
import { head, field, delBtn } from "./components.js";

/* ---------- Finance tab ---------- */
function finance() {
  const cy = now0.getFullYear(), years = [];
  for (let y = cy - 3; y <= cy + 1; y++) years.push(y);
  const M = ui.repMode;
  let h = '<div class="card"><div class="row"><label style="flex:2 1 220px">' + t("period") + '<select data-set="mode"><option value="cal"' + (M === "cal" ? " selected" : "") + ">" + t("calendar") + '</option><option value="fy"' + (M === "fy" ? " selected" : "") + ">" + t("fiscal") + "</option></select></label>" +
    "<label>" + t("year") + '<select data-set="year">' + years.map((y) => '<option value="' + y + '"' + (y === ui.repYear ? " selected" : "") + ">" + (M === "fy" ? y + "/" + String(y + 1).slice(2) : y) + "</option>").join("") + "</select></label>" +
    "<label>" + t("quarter") + '<select data-set="q"><option value="0"' + (ui.repQ === 0 ? " selected" : "") + ">" + t("annual") + "</option>" + [1, 2, 3, 4].map((n) => '<option value="' + n + '"' + (ui.repQ === n ? " selected" : "") + ">Q" + n + "</option>").join("") + "</select></label></div>";
  const R = reportData();
  h += '<p class="meta" style="margin:10px 0 0">' + R.from + " → " + R.to + "</p>" + (M === "fy" ? '<p class="meta" style="margin:4px 0 0">' + t("fiscal_note") + "</p>" : "") + "</div>";
  h += '<div class="stats"><div class="stat"><div class="l">' + t("buy_total") + '</div><div class="v">' + money(R.buy) + '</div></div><div class="stat"><div class="l">' + t("sales_total") + '</div><div class="v">' + money(R.sales) + "</div></div>" +
    '<div class="stat"><div class="l">' + t("gross") + '</div><div class="v ' + (R.gross < 0 ? "neg" : "pos") + '">' + money(R.gross) + '</div></div><div class="stat"><div class="l">' + t("credit_given") + '</div><div class="v">' + money(R.credit) + "</div></div>" +
    '<div class="stat"><div class="l">' + t("payments_in") + '</div><div class="v">' + money(R.paid) + '</div></div><div class="stat"><div class="l">' + t("credit_out") + '</div><div class="v">' + money(R.owed) + "</div></div></div>";
  h += '<div class="card"><h2>' + t("export") + '</h2><p class="meta" style="margin:0 0 10px">' + t("csv_hint") + "</p>";
  [["buy", "x_buy"], ["sales", "x_sales"], ["sum", "x_sum"]].forEach((k) => {
    h += '<div class="item"><div class="grow name">' + t(k[1]) + ' <span class="meta">' + fileName(k[0]) + "</span></div>" + (ui.DL ? '<button class="btn sm" data-act="export" data-v="' + k[0] + '">' + t("download") + "</button>" : "") + '<button class="btn ghost sm" data-act="copycsv" data-v="' + k[0] + '">' + t("copy_csv") + "</button></div>";
  });
  h += "</div>";
  if (!R.P.length) h += '<div class="empty">' + t("no_rows") + "</div>";
  else {
    const byI = {}, byS = {}, byM = {};
    R.P.forEach((x) => {
      const a = byI[x.pid] || (byI[x.pid] = { n: x.name, q: 0, t: 0 }); a.q += x.qty; a.t += x.total;
      const sn = x.open ? t("open_stock") : (x.supplier || "—"); const b = byS[sn] || (byS[sn] = { n: sn, t: 0 }); b.t += x.total;
      const m = x.d.slice(0, 7); const c = byM[m] || (byM[m] = { n: m, t: 0 }); c.t += x.total;
    });
    h += '<div class="card"><h2>' + t("by_item") + '</h2><div class="scroll"><table><thead><tr><th>' + t("item_name") + "</th><th>" + t("qty") + "</th><th>" + t("total") + "</th></tr></thead><tbody>";
    Object.keys(byI).forEach((k) => { const a = byI[k]; h += "<tr><td>" + esc(a.n) + '</td><td class="num">' + fmt(a.q) + '</td><td class="num">' + money(a.t) + "</td></tr>"; });
    h += '</tbody><tfoot><tr><td colspan="2">' + t("total") + '</td><td class="num">' + money(R.buy) + "</td></tr></tfoot></table></div></div>";
    h += '<div class="grid2"><div class="card"><h2>' + t("by_sup") + '</h2><div class="scroll"><table><tbody>';
    Object.keys(byS).forEach((k) => { h += "<tr><td>" + esc(byS[k].n) + '</td><td class="num">' + money(byS[k].t) + "</td></tr>"; });
    h += '</tbody></table></div></div><div class="card"><h2>' + t("by_month") + '</h2><div class="scroll"><table><tbody>';
    Object.keys(byM).sort().forEach((k) => { h += "<tr><td>" + byM[k].n + '</td><td class="num">' + money(byM[k].t) + "</td></tr>"; });
    h += "</tbody></table></div></div></div>";
  }
  h += '<div class="card"><h2>' + t("backup") + '</h2><p class="meta" style="margin:0 0 10px">' + t("backup_note") + '</p><div class="row" style="align-items:center">' +
    (ui.DL ? '<button class="btn sm" data-act="backup">' + t("download_backup") + "</button>" : "") + '<button class="btn ghost sm" data-act="copybackup">' + t("copy_backup") + "</button>" +
    '<label style="flex:0 1 auto;color:var(--fg)"><span class="btn ghost sm" style="display:inline-block;text-align:center">' + t("restore") + '</span><input type="file" accept=".json,application/json" data-restore="1" style="position:absolute;opacity:0;width:1px;height:1px"></label></div></div>';
  const lg = S.log.slice().reverse().slice(0, 15);
  h += '<div class="card"><h2>' + t("activity") + "</h2>";
  if (!lg.length) h += '<p class="meta">—</p>';
  else {
    h += '<div class="scroll"><table><tbody>';
    lg.forEach((e) => { h += '<tr><td class="meta">' + new Date(e.ts).toLocaleString(pref.lang === "am" ? "am-ET" : "en-GB", { dateStyle: "short", timeStyle: "short" }) + '</td><td style="text-align:left;white-space:normal">' + esc(e.text) + "</td></tr>"; });
    h += "</tbody></table></div>";
  }
  return h + "</div>";
}

/* ---------- report table (register / summary / stock on hand) ---------- */
const cellCls = (m, ty) => ty === "t" ? "l" : ty === "d" || ty === "n" ? "c" : ty === "r" ? "c it" : ty === "q" ? (m.kind === "reg" ? "c" : "num") : "num";

function renderModel(m, actions) {
  const n = m.head.length, b = m.banner, span = n + (actions ? 1 : 0);
  let h = '<div class="card rpt"><div class="rbanner"><div class="rname">' + esc(b.name) + "</div>" + (b.sub ? '<div class="rtt">' + esc(b.sub) + "</div>" : "") + "</div>" +
    '<div class="rmeta"><span>' + esc(b.tin) + "</span><span>" + esc(b.prepared) + "</span></div>" + (m.filters ? '<div class="rfil">' + esc(m.filters) + "</div>" : "") +
    '<div class="scroll" style="padding:0 12px 12px"><table class="rt"><thead><tr>';
  m.head.forEach((x) => { h += "<th>" + esc(x) + "</th>"; });
  if (actions) h += "<th></th>";
  h += "</tr></thead><tbody>";
  if (m.empty) h += '<tr><td colspan="' + span + '" style="text-align:center;color:var(--muted);white-space:normal;padding:18px;background:var(--surface)">' + t(m.kind === "soh" ? "no_rows" : "no_purchases") + "</td></tr>";
  m.rows.forEach((r, ri) => {
    h += "<tr>" + r.map((c, i) => '<td class="' + cellCls(m, m.types[i]) + '">' + esc(cellText(m.types[i], c)) + "</td>").join("");
    if (actions) { const id = m.ids && m.ids[ri]; h += '<td class="act">' + (id ? '<button class="btn ghost sm" data-act="editpur" data-id="' + id + '">' + t("edit") + "</button> " + delBtn("pur:" + id, "delpur", id) : "") + "</td>"; }
    h += "</tr>";
  });
  if (m.total && !m.empty) h += '<tr class="tt">' + m.total.map((c, i) => '<td class="' + cellCls(m, m.types[i]) + '">' + esc(cellText(m.types[i], c)) + "</td>").join("") + (actions ? '<td class="act"></td>' : "") + "</tr>";
  if (!m.empty) (m.foot || []).forEach((f) => { h += '<tr class="' + f.c + '"><td colspan="' + (n - 1) + '" style="text-align:right">' + esc(f.label) + '</td><td class="num">' + fm2(f.value) + "</td>" + (actions ? '<td class="act"></td>' : "") + "</tr>"; });
  h += "</tbody></table></div>";
  if (m.note && !m.empty) h += '<div class="rnote">' + esc(m.note) + "</div>";
  return h + "</div>";
}

function filterBar(v) {
  const F = filt(), B = S.biz || {}; let sup = "";
  if (v !== "soh") {
    const seen = {}, opts = [];
    PU().forEach((x) => { if (x.open) return; const k = skey(x.supplier); if (!seen[k]) { seen[k] = 1; opts.push([k, sname(x.supplier, pref.lang)]); } });
    S.returns.forEach((r) => { if (r.kind !== "supplier") return; const k = skey(r.supplier); if (!seen[k]) { seen[k] = 1; opts.push([k, sname(r.supplier, pref.lang)]); } });
    opts.sort((a, b) => a[1].toLowerCase() < b[1].toLowerCase() ? -1 : 1);
    if (F.sup && !seen[F.sup]) { ui.draft.rf_sup = ""; F.sup = ""; }
    sup = '<label style="flex:2 1 200px">' + t("supplier_f") + '<select id="rf_sup" data-d="1" data-live="1"><option value="">' + t("all_sup") + "</option>" + opts.map((o) => '<option value="' + esc(o[0]) + '">' + esc(o[1]) + "</option>").join("") + "</select></label>";
  }
  let h = '<div class="card"><div class="row">' + field("rf_from", t("from"), "date", 'data-live="1"') + field("rf_to", t("to"), "date", 'data-live="1"') + sup +
    (v !== "soh" ? '<label style="flex:0 1 110px">' + t("vat_pct") + '<input type="number" inputmode="decimal" min="0" max="100" step="0.5" data-vat="1" value="' + fmt(S.vat * 100) + '" aria-label="' + t("vat_pct") + '"></label>' : "") + "</div>" +
    '<div class="row" style="margin-top:10px">' +
    '<label style="flex:2 1 200px">' + t("biz_name") + '<input type="text" data-biz="name" value="' + esc(B.name || "") + '" autocomplete="off"></label>' +
    "<label>" + t("biz_tin") + '<input type="text" data-biz="tin" value="' + esc(B.tin || "") + '" autocomplete="off" inputmode="numeric"></label>' +
    "<label>" + t("biz_period") + '<input type="text" data-biz="period" value="' + esc(B.period || "") + '" autocomplete="off"></label></div>' +
    '<div class="row" style="margin-top:12px;align-items:center"><div class="seg" role="group"><button data-act="rpreset" data-v="all">' + t("p_all") + '</button><button data-act="rpreset" data-v="month">' + t("p_month") + '</button><button data-act="rpreset" data-v="year">' + t("p_year") + "</button></div>" +
    '<span style="flex:1"></span>' + (ui.DL ? '<button class="btn sm" data-act="exp" data-v="' + v + '" data-f="xlsx">' + t("download_xlsx") + '</button><button class="btn sm" data-act="exp" data-v="' + v + '" data-f="pdf">' + t("download_pdf") + "</button>" : '<span class="meta">' + t("dl_unavail") + "</span>") + "</div>";
  if (pref.lang === "am") h += '<p class="meta" style="margin:10px 0 0">' + t("notice_names") + "</p>";
  return h + "</div>";
}

/** Filter bar + report table. actions = true shows Edit/Delete buttons (Buy tab). */
export function reportView(v, actions) { return filterBar(v) + renderModel(buildModel(v, pref.lang), actions); }

export function reports() {
  let h = head("reports");
  h += '<div class="seg" style="align-self:flex-start;max-width:100%;overflow-x:auto" role="group">' +
    [["fin", "fin"], ["reg", "reg"], ["sum", "sumsup"], ["soh", "soh"]].map((x) => '<button data-act="rview" data-v="' + x[0] + '" aria-pressed="' + (ui.repView === x[0]) + '">' + t(x[1]) + "</button>").join("") + "</div>";
  return h + (ui.repView === "fin" ? finance() : reportView(ui.repView));
}
