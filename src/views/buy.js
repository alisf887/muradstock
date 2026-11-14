import { S } from "../state/store.js";
import { ui } from "../state/ui.js";
import { t } from "../i18n/index.js";
import { num, fm2 } from "../lib/format.js";
import { today } from "../lib/dates.js";
import { head, field, dl, sups } from "./components.js";
import { reportView } from "./reports.js";

export function buy() {
  let h = head("buy", t("buy_sub"));
  const ed = ui.editPur && S.purchases.find((r) => r.id === ui.editPur && !r.void);
  const q = num(ui.draft.b_qty), c = num(ui.draft.b_cost);
  h += '<div class="card"><h2>' + (ed ? t("edit_row") : t("add_to_register")) + "</h2>" +
    '<div class="row">' + field("b_sup", t("h_sup_l"), "text", 'list="sups" autocomplete="off"') + dl("sups", sups()) + field("b_rno", t("h_rno_l"), "text", 'autocomplete="off"') + field("b_date", t("h_date_l"), "date", 'value="' + today() + '"') + "</div>" +
    '<div class="row" style="margin-top:10px"><label style="flex:2 1 220px">' + t("h_item_l") + '<input id="b_item" data-d="1" type="text" list="items" autocomplete="off"></label>' + dl("items", S.products.map((p) => p.name)) +
    field("b_qty", t("h_qty_l"), "number", 'inputmode="decimal" min="0"') + field("b_cost", t("h_price_l"), "number", 'inputmode="decimal" min="0"') +
    "<label>" + t("h_total_l") + '<input id="b_tot" type="text" readonly tabindex="-1" value="' + (q > 0 && c > 0 ? fm2(q * c) : "") + '"></label></div>' +
    '<div class="row" style="margin-top:12px"><button class="btn" data-act="addpur">' + (ed ? t("update_row") : t("add_row")) + "</button>" +
    (ed ? '<button class="btn ghost" data-act="cancelpur">' + t("cancel") + "</button>" : '<button class="btn ghost" data-act="clearpur">' + t("clear") + "</button>") + "</div></div>";
  return h + reportView("reg", true);
}
