import { ui } from "../state/ui.js";
import { t } from "../i18n/index.js";
import { num, fm2 } from "../lib/format.js";
import { today } from "../lib/dates.js";
import { staff } from "../services/staff.js";
import { head, field, dl } from "./components.js";

/** Buy screen for a sales person: the entry form only. No register, no totals, no downloads. */
export function staffBuy() {
  const q = num(ui.draft.b_qty), c = num(ui.draft.b_cost);
  let h = head("buy", "Each purchase you save is sent to the owner.");
  h += '<div class="card"><h2>' + t("add_to_register") + "</h2>" +
    '<div class="row">' + field("b_sup", t("h_sup_l"), "text", 'autocomplete="off"') + field("b_rno", t("h_rno_l"), "text", 'autocomplete="off"') + field("b_date", t("h_date_l"), "date", 'value="' + today() + '"') + "</div>" +
    '<div class="row" style="margin-top:10px"><label style="flex:2 1 220px">' + t("h_item_l") + '<input id="b_item" data-d="1" type="text" list="items" autocomplete="off"></label>' + dl("items", staff.items.map((p) => p.name)) +
    field("b_qty", t("h_qty_l"), "number", 'inputmode="decimal" min="0"') + field("b_cost", t("h_price_l"), "number", 'inputmode="decimal" min="0"') +
    "<label>" + t("h_total_l") + '<input id="b_tot" type="text" readonly tabindex="-1" value="' + (q > 0 && c > 0 ? fm2(q * c) : "") + '"></label></div>' +
    '<div class="row" style="margin-top:12px"><button class="btn" data-act="addpur" ' + (staff.busy ? "disabled" : "") + ">" + (staff.busy ? "Saving…" : t("add_row")) + '</button><button class="btn ghost" data-act="clearpur">' + t("clear") + "</button></div></div>";
  return h;
}