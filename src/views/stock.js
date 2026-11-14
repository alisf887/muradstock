import { S, prod } from "../state/store.js";
import { ui } from "../state/ui.js";
import { t } from "../i18n/index.js";
import { esc, fmt, money } from "../lib/format.js";
import { today } from "../lib/dates.js";
import { head, field, dl, delBtn, badge, sups, cats } from "./components.js";

/* returns, supplier returns and stock adjustments */
function moveCard() {
  const D = ui.draft, kind = D.m_kind || "ret_c", d = D.m_date || today();
  const opts = '<option value="">' + t("choose_product") + "</option>" + S.products.map((p) => '<option value="' + p.id + '">' + esc(p.name) + "</option>").join("");
  let h = '<div class="card"><h2>' + t("returns_adj") + '</h2><div class="row"><label>' + t("kind") + '<select id="m_kind" data-d="1" data-live="1"><option value="ret_c">' + t("k_ret_c") + '</option><option value="ret_s">' + t("k_ret_s") + '</option><option value="adj">' + t("k_adj") + "</option></select></label>" +
    '<label style="flex:2 1 200px">' + t("item_name") + '<select id="m_pid" data-d="1">' + opts + "</select></label>" +
    field("m_qty", (kind === "adj" ? t("qty_adj") : t("qty")), "number", 'inputmode="decimal"') + field("m_date", t("date"), "date", 'value="' + d + '"') + '</div><div class="row" style="margin-top:10px">';
  if (kind !== "adj") h += field("m_amt", t("refund") + " (" + t("optional") + ")", "number", 'inputmode="decimal" min="0"');
  if (kind === "ret_s") h += field("m_sup", t("supplier"), "text", 'list="sups2" autocomplete="off"') + dl("sups2", sups());
  h += field("m_note", kind === "adj" ? t("reason") : t("credit_note"), "text") + '</div><div style="margin-top:12px"><button class="btn" data-act="addmove">' + t("record_move") + "</button></div>";
  const rm = S.moves.filter((m) => m.type === "return_in" || m.type === "return_out" || (m.type === "adjust" && m.ref !== "Balance brought forward")).slice().reverse().slice(0, 8);
  if (rm.length) {
    h += '<div class="scroll" style="margin-top:12px"><table><tbody>';
    rm.forEach((m) => {
      const p = prod(m.pid);
      h += "<tr><td>" + m.d + '</td><td style="text-align:left">' + esc(p ? p.name : "") + "</td><td>" + t(m.type === "return_in" ? "k_ret_c" : m.type === "return_out" ? "k_ret_s" : "adjust_c") + '</td><td class="num">' + (m.qty > 0 ? "+" : "") + fmt(m.qty) + '</td><td style="text-align:left;white-space:normal">' + esc(m.ref) + "</td></tr>";
    });
    h += "</tbody></table></div>";
  }
  return h + "</div>";
}

export function stock() {
  let h = head("stock");
  const ed = ui.editPid && prod(ui.editPid);
  h += '<div class="card"><h2>' + (ed ? t("edit") + ": " + esc(ed.name) : t("add_item")) + "</h2>" + (ed ? "" : '<p class="meta" style="margin:0 0 10px">' + t("stock_note") + "</p>") + '<div class="row">' +
    '<label style="flex:2 1 200px">' + t("item_name") + '<input id="p_name" data-d="1" type="text" autocomplete="off"></label>' +
    field("p_unit", t("unit") + " (" + t("optional") + ")", "text") + field("p_cat", t("category") + " (" + t("optional") + ")", "text", 'list="cats" autocomplete="off"') + dl("cats", cats()) + "</div>" +
    '<div class="row" style="margin-top:10px">' + field("p_sku", t("sku") + " (" + t("optional") + ")", "text") + field("p_sup", t("supplier_p") + " (" + t("optional") + ")", "text", 'list="sups" autocomplete="off"') + dl("sups", sups()) +
    field("p_price", t("sell_price"), "number", 'inputmode="decimal" min="0"') + "</div>" +
    '<div class="row" style="margin-top:10px">' + (ed ? field("p_qty", t("counted"), "number", 'inputmode="decimal" min="0"') + field("p_cost", t("buy_cost"), "number", 'inputmode="decimal" min="0"') : "") + field("p_reorder", t("reorder_level") + " (" + t("optional") + ")", "number", 'inputmode="decimal" min="0"') +
    field("p_rq", t("reorder_qty") + " (" + t("optional") + ")", "number", 'inputmode="decimal" min="0"') + field("p_max", t("max_level") + " (" + t("optional") + ")", "number", 'inputmode="decimal" min="0"') + "</div>" +
    '<div class="row" style="margin-top:12px"><button class="btn" data-act="addproduct">' + (ed ? t("save_changes") : t("add_item")) + "</button>" + (ed ? '<button class="btn ghost" data-act="canceledit">' + t("cancel") + "</button>" : "") + "</div></div>";
  if (!S.products.length) return h + '<div class="empty"><b>' + t("empty_title") + "</b>" + t("empty_body") + "</div>";
  h += '<div class="card"><input id="srch2" data-d="1" type="search" placeholder="' + t("search_stock") + '" style="margin-bottom:6px"><div class="list" id="slist">';
  S.products.forEach((p) => {
    h += '<div class="item" data-s="' + esc((p.name + " " + (p.sku || "") + " " + (p.category || "") + " " + (p.supplier || "")).toLowerCase()) + '"><div class="grow"><div class="name">' + esc(p.name) + (p.category ? ' <span class="badge b-over">' + esc(p.category) + "</span>" : "") + "</div>" +
      '<div class="meta num">' + fmt(p.qty) + " " + esc(p.unit) + " · " + t("cost") + " " + money(p.cost) + " · " + t("price") + " " + money(p.price) + "</div>" +
      ((p.sku || p.supplier) ? '<div class="meta">' + (p.sku ? esc(p.sku) : "") + (p.sku && p.supplier ? " · " : "") + (p.supplier ? esc(p.supplier) : "") + "</div>" : "") + "</div>" + badge(p) +
      '<button class="btn ghost sm" data-act="buyfor" data-id="' + p.id + '">' + t("buy_more") + "</button>" +
      '<button class="btn ghost sm" data-act="editprod" data-id="' + p.id + '">' + t("edit") + "</button>" + delBtn("prod:" + p.id, "delprod", p.id, "remove") + "</div>";
  });
  return h + "</div></div>" + moveCard();
}
