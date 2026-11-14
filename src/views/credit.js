import { S, cust } from "../state/store.js";
import { ui } from "../state/ui.js";
import { t } from "../i18n/index.js";
import { esc, money } from "../lib/format.js";
import { head, field, delBtn } from "./components.js";

export function credit() {
  let h = head("credit");
  const ec = ui.editCid && cust(ui.editCid);
  h += '<div class="card"><h2>' + (ec ? t("edit") + ": " + esc(ec.name) : t("add_customer")) + '</h2><div class="row"><label style="flex:2 1 200px">' + t("person_name") + '<input id="c_name" data-d="1" type="text" autocomplete="off"></label>' + field("c_phone", t("phone") + " (" + t("optional") + ")", "tel") +
    '<button class="btn" data-act="addcust">' + (ec ? t("save_changes") : t("add_customer")) + "</button>" + (ec ? '<button class="btn ghost" data-act="cancelcust">' + t("cancel") + "</button>" : "") + "</div></div>";
  if (!S.customers.length) return h + '<div class="empty">' + t("no_customers") + "</div>";
  const owed = S.customers.reduce((a, c) => a + c.balance, 0);
  h += '<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><span class="meta">' + t("credit_owed") + '</span><span class="total num">' + money(owed) + '</span></div><div class="list" style="margin-top:6px">';
  S.customers.forEach((c) => {
    h += '<div class="item"><div class="grow"><div class="name">' + esc(c.name) + '</div><div class="meta">' + esc(c.phone) + "</div></div>" +
      '<div class="num" style="min-width:90px;text-align:right">' + (c.balance > 0 ? "<b>" + money(c.balance) + "</b>" : '<span class="badge b-ok">' + t("all_paid") + "</span>") + "</div>" +
      (c.balance > 0 ? '<div style="width:110px"><input id="pay_' + c.id + '" data-d="1" type="number" inputmode="decimal" min="0" placeholder="' + t("amount") + '" aria-label="' + t("amount") + '"></div><button class="btn ghost sm" data-act="pay" data-id="' + c.id + '">' + t("record_payment") + "</button>" : "") +
      '<button class="btn ghost sm" data-act="editcust" data-id="' + c.id + '">' + t("edit") + "</button>" + (c.balance > 0 ? "" : delBtn("cust:" + c.id, "delcust", c.id)) + "</div>";
  });
  return h + "</div></div>";
}
