import { S, prod, uid, save, log } from "../state/store.js";
import { ui, clearDraft } from "../state/ui.js";
import { t } from "../i18n/index.js";
import { toast } from "../lib/dom.js";
import { num, r2, fmt } from "../lib/format.js";
import { today } from "../lib/dates.js";

/** Append one row to the stock ledger. */
export function mv(pid, type, qty, d, ref) {
  S.moves.push({ id: uid(), ts: Date.now(), d: d || today(), pid, type, qty: r2(qty), ref: ref || "" });
}

/** Customer return, return to supplier, or stock adjustment. Returns true if saved. */
export function addMove() {
  const D = ui.draft, kind = D.m_kind || "ret_c", p = prod(D.m_pid), qty = num(D.m_qty);
  const d = D.m_date || today(), note = (D.m_note || "").trim();
  let amt;
  if (!p) { toast(t("e_prod")); return false; }
  if (kind === "adj") {
    if (!qty) { toast(t("e_adjzero")); return false; }
    if (p.qty + qty < 0) { toast(t("e_neg")); return false; }
    p.qty = r2(p.qty + qty); mv(p.id, "adjust", qty, d, note || "Adjustment");
    log("Adjustment: " + p.name + " " + (qty > 0 ? "+" : "") + fmt(qty));
  } else if (kind === "ret_c") {
    if (qty <= 0) { toast(t("e_qty")); return false; }
    amt = (D.m_amt !== undefined && D.m_amt !== "") ? Math.max(0, num(D.m_amt)) : qty * p.price;
    p.qty = r2(p.qty + qty); mv(p.id, "return_in", qty, d, note || "Customer return");
    S.returns.push({ id: uid(), d, kind: "customer", pid: p.id, name: p.name, qty, amount: r2(amt), cost: r2(qty * p.cost), ref: note, supplier: "" });
    log("Customer return: " + p.name + " × " + fmt(qty));
  } else {
    if (qty <= 0) { toast(t("e_qty")); return false; }
    if (p.qty < qty) { toast(t("e_neg")); return false; }
    amt = (D.m_amt !== undefined && D.m_amt !== "") ? Math.max(0, num(D.m_amt)) : qty * p.cost;
    p.qty = r2(p.qty - qty); mv(p.id, "return_out", -qty, d, note || "Return to supplier");
    S.returns.push({ id: uid(), d, kind: "supplier", pid: p.id, name: p.name, qty, amount: r2(amt), cost: r2(qty * p.cost), ref: note, supplier: (D.m_sup || "").trim() });
    log("Return to supplier: " + p.name + " × " + fmt(qty));
  }
  clearDraft(["m_qty", "m_amt", "m_note", "m_sup"]);
  save(); toast(t("t_moved"));
  return true;
}
