import { S, cust, uid, save, log } from "../state/store.js";
import { ui, clearDraft } from "../state/ui.js";
import { t } from "../i18n/index.js";
import { toast } from "../lib/dom.js";
import { num, r2, money } from "../lib/format.js";
import { today } from "../lib/dates.js";

export function startCustEdit(id) {
  const c = cust(id); if (!c) return false;
  ui.editCid = id; ui.draft.c_name = c.name; ui.draft.c_phone = c.phone || ""; ui.confirmKey = null;
  return true;
}
export function cancelCust() { ui.editCid = null; clearDraft(["c_name", "c_phone"]); }

export function addCustomer() {
  const D = ui.draft, n = (D.c_name || "").trim();
  if (!n) { toast(t("e_person")); return false; }
  if (ui.editCid) {
    const c = cust(ui.editCid);
    if (c) { c.name = n; c.phone = (D.c_phone || "").trim(); log("Edited customer: " + n); }
    ui.editCid = null; clearDraft(["c_name", "c_phone"]); save(); toast(t("t_edited"));
    return true;
  }
  S.customers.push({ id: uid(), name: n, phone: (D.c_phone || "").trim(), balance: 0 });
  log("Added customer: " + n);
  clearDraft(["c_name", "c_phone"]); save(); toast(t("t_cust"));
  return true;
}
export function removeCust(id) {
  const c = cust(id); if (!c) return false;
  if (c.balance > 0) { toast(t("cust_has_balance")); return false; }
  S.customers = S.customers.filter((x) => x.id !== id);
  log("Deleted customer: " + c.name); save(); toast(t("t_deleted"));
  return true;
}
export function payCust(cid) {
  const c = cust(cid); let a = num(ui.draft["pay_" + cid]);
  if (!c) return false;
  if (a <= 0) { toast(t("e_amt")); return false; }
  a = Math.min(a, c.balance); if (a <= 0) return false;
  c.balance = r2(c.balance - a);
  S.payments.push({ id: uid(), d: today(), ts: Date.now(), cid, amount: a });
  log("Payment from " + c.name + ": " + money(a));
  delete ui.draft["pay_" + cid]; save(); toast(t("t_pay"));
  return true;
}
