import { S, prod, pref, savePref } from "../state/store.js";
import { ui, clearDraft } from "../state/ui.js";
import { toggleLang } from "../i18n/index.js";
import { dkey, now0 } from "../lib/dates.js";
import { copyText, applyTheme, isDark } from "../lib/dom.js";
import { render, rerenderKeep } from "../views/index.js";
import { tgText } from "../views/alerts.js";
import { PF, addProduct, startEdit, cancelEdit, removeProduct } from "../services/products.js";
import { addToCart, completeSale, voidSale } from "../services/sales.js";
import { addPurchaseRow, startPurEdit, cancelPurEdit, deletePurchase } from "../services/purchases.js";
import { addCustomer, startCustEdit, cancelCust, removeCust, payCust } from "../services/customers.js";
import { createPOs, receivePO, cancelPO, poText } from "../services/orders.js";
import { addMove } from "../services/movements.js";
import { backupFile, backupJson } from "../services/backup.js";
import { buildCsv, exportCsv } from "../reports/csv.js";
import { exportReport } from "../reports/export.js";
import { isOwner, signOut } from "../auth/session.js";

/** "Tap again to confirm" pattern for destructive buttons. */
function twice(key, fn) {
  if (ui.confirmKey === key) { ui.confirmKey = null; fn(); }
  else { ui.confirmKey = key; rerenderKeep(); }
}
/** Services return true when state changed; then redraw. */
const done = (ok) => { if (ok) render(); };

/** Actions a sales person may use. Everything else is owner-only. */
const SALES_OK = new Set(["nav", "lang", "theme", "signout", "addcart", "cinc", "cdec", "method", "complete"]);

/** action name -> handler(id, v, button) */
const ACTIONS = {
  signout() { signOut(); },
  nav(id, v) {
    if (!isOwner() && v !== "sell") return;
    ui.tab = v; ui.confirmKey = null;
    if (v !== "stock" && ui.editPid) { ui.editPid = null; clearDraft(PF); }
    if (v !== "credit" && ui.editCid) { ui.editCid = null; clearDraft(["c_name", "c_phone"]); }
    if (v !== "buy" && ui.editPur) { ui.editPur = null; clearDraft(["b_item", "b_qty", "b_cost"]); }
    render();
  },
  lang() { toggleLang(); rerenderKeep(); },
  theme() { pref.theme = isDark() ? "light" : "dark"; savePref(); applyTheme(); rerenderKeep(); },

  /* stock */
  addproduct() { done(addProduct()); },
  editprod(id) { done(startEdit(id)); },
  canceledit() { cancelEdit(); render(); },
  delprod(id) { twice("prod:" + id, () => done(removeProduct(id))); },
  addmove() { done(addMove()); },

  /* sell */
  addcart(id) { addToCart(id); render(); },
  cinc(id) { const l = ui.cart.find((x) => x.pid === id), p = prod(id); if (l && p && l.qty < p.qty) l.qty++; rerenderKeep(); },
  cdec(id) { const l = ui.cart.find((x) => x.pid === id); if (l) { l.qty--; if (l.qty <= 0) ui.cart = ui.cart.filter((x) => x !== l); } rerenderKeep(); },
  method(id, v) { ui.method = v; rerenderKeep(); },
  complete() { done(completeSale()); },
  voidsale(id) { twice("sale:" + id, () => done(voidSale(id))); },

  /* buy */
  addpur() { done(addPurchaseRow()); },
  clearpur() { clearDraft(["b_item", "b_qty", "b_cost", "b_sup", "b_rno", "b_date"]); rerenderKeep(); },
  cancelpur() { cancelPurEdit(); render(); },
  editpur(id) { done(startPurEdit(id)); },
  buyfor(id) { const p = prod(id); ui.draft.b_item = p ? p.name : ""; ui.tab = "buy"; render(); },
  delpur(id) { twice("pur:" + id, () => done(deletePurchase(id))); },

  /* credit */
  addcust() { done(addCustomer()); },
  editcust(id) { done(startCustEdit(id)); },
  cancelcust() { cancelCust(); render(); },
  delcust(id) { twice("cust:" + id, () => done(removeCust(id))); },
  pay(id) { done(payCust(id)); },

  /* profit */
  prange(id, v) { ui.profitRange = v; rerenderKeep(); },

  /* alerts / purchase orders */
  copytg() { copyText(tgText()); },
  createpo() { done(createPOs()); },
  receivepo(id) { done(receivePO(id)); },
  cancelpo(id) { twice("po:" + id, () => done(cancelPO(id))); },
  copypo(id) { const o = S.orders.find((x) => x.id === id); if (o) copyText(poText(o)); },

  /* reports */
  rview(id, v) { ui.repView = v; rerenderKeep(); },
  rpreset(id, v) {
    const y0 = now0.getFullYear(), m0 = now0.getMonth();
    if (v === "all") { ui.draft.rf_from = ""; ui.draft.rf_to = ""; }
    else if (v === "month") { ui.draft.rf_from = dkey(new Date(y0, m0, 1)); ui.draft.rf_to = dkey(new Date(y0, m0 + 1, 0)); }
    else { ui.draft.rf_from = y0 + "-01-01"; ui.draft.rf_to = y0 + "-12-31"; }
    rerenderKeep();
  },
  exp(id, v, b) { exportReport(v, b.getAttribute("data-f")); },
  export(id, v) { exportCsv(v); },
  copycsv(id, v) { copyText(buildCsv(v).replace(/^\uFEFF/, "")); },
  backup() { backupFile(); },
  copybackup() { copyText(backupJson()); }
};

export function bindClick() {
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const act = b.getAttribute("data-act");
    if (!isOwner() && !SALES_OK.has(act)) return;
    const fn = ACTIONS[act];
    if (fn) fn(b.getAttribute("data-id"), b.getAttribute("data-v"), b);
  });
}