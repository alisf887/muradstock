import { S } from "../state/store.js";
import { t } from "../i18n/index.js";
import { esc, fmt, money } from "../lib/format.js";
import { today } from "../lib/dates.js";
import { lowItems, need } from "../services/products.js";
import { poNo } from "../services/orders.js";
import { head, empty, badge, delBtn } from "./components.js";

/** Plain-text Telegram preview (also used by the Copy button). */
export function tgText() {
  const low = lowItems();
  const lines = ["StockLedger · " + today(), ""];
  low.forEach((p) => { lines.push("• " + p.name + ": " + fmt(p.qty) + (p.unit ? " " + p.unit : "") + " → " + t("sug_qty") + " " + fmt(need(p))); });
  const est = low.reduce((a, p) => a + need(p) * p.cost, 0);
  lines.push("", t("est_cost") + ": " + money(est));
  return lines.join("\n");
}

export function alerts() {
  let h = head("alerts"); const low = lowItems();
  if (!S.products.length) return h + empty();
  if (!low.length) h += '<div class="card"><p class="meta">' + t("nothing_reorder") + "</p></div>";
  else {
    let est = 0;
    h += '<div class="card"><div class="scroll"><table><thead><tr><th>' + t("item_name") + "</th><th></th><th>" + t("qty") + "</th><th>" + t("sug_qty") + "</th><th>" + t("est_cost") + "</th></tr></thead><tbody>";
    low.forEach((p) => {
      const n = need(p); est += n * p.cost;
      h += "<tr><td>" + esc(p.name) + "</td><td>" + badge(p) + '</td><td class="num">' + fmt(p.qty) + '</td><td class="num">' + fmt(n) + '</td><td class="num">' + money(n * p.cost) + "</td></tr>";
    });
    h += '</tbody><tfoot><tr><td colspan="4">' + t("total") + '</td><td class="num">' + money(est) + "</td></tr></tfoot></table></div>" +
      '<div style="margin-top:12px"><button class="btn" data-act="createpo">' + t("create_po") + "</button></div></div>";
    h += '<div class="card"><h2>' + t("tg_preview") + '</h2><div class="msg">' + esc(tgText()) + '</div><div class="row" style="margin-top:10px;align-items:center"><button class="btn ghost sm" data-act="copytg">' + t("copy") + '</button><span class="meta">' + t("tg_note") + "</span></div></div>";
  }
  const os = S.orders.slice().reverse().slice(0, 12);
  if (os.length) {
    h += '<div><h2 style="margin:4px 0 8px">' + t("po") + "</h2></div>";
    os.forEach((o) => {
      h += '<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><div><div class="name">' + poNo(o) + " · " + esc(o.supplier || t("no_supplier")) + '</div><div class="meta">' + o.d + '</div></div><span class="badge ' + (o.status === "open" ? "b-reorder" : "b-ok") + '">' + t(o.status === "open" ? "po_open" : "po_received") + "</span></div>" +
        '<div class="scroll"><table><thead><tr><th>' + t("item_name") + "</th><th>" + t("qty") + "</th><th>" + t("cost") + "</th><th>" + t("total") + "</th></tr></thead><tbody>" +
        o.lines.map((l) => "<tr><td>" + esc(l.name) + '</td><td class="num">' + fmt(l.qty) + " " + esc(l.unit) + '</td><td class="num">' + money(l.cost) + '</td><td class="num">' + money(l.total) + "</td></tr>").join("") +
        '</tbody><tfoot><tr><td colspan="3">' + t("total") + '</td><td class="num">' + money(o.total) + "</td></tr></tfoot></table></div>" +
        '<div class="row" style="margin-top:10px"><button class="btn ghost sm" data-act="copypo" data-id="' + o.id + '">' + t("copy_po") + "</button>" +
        (o.status === "open" ? '<button class="btn sm" data-act="receivepo" data-id="' + o.id + '">' + t("receive_po") + "</button>" + delBtn("po:" + o.id, "cancelpo", o.id, "cancel_po") : "") + "</div></div>";
    });
  }
  return h;
}
