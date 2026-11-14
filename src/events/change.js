import { S, prod, save } from "../state/store.js";
import { ui } from "../state/ui.js";
import { num } from "../lib/format.js";
import { now0 } from "../lib/dates.js";
import { restoreFile } from "../services/backup.js";
import { render, rerenderKeep } from "../views/index.js";

export function bindChange() {
  document.addEventListener("change", (e) => {
    const el = e.target;
    if (!el.hasAttribute) return;
    if (el.hasAttribute("data-d")) ui.draft[el.id] = el.value;
    if (el.hasAttribute("data-vat")) { S.vat = Math.min(1, Math.max(0, num(el.value) / 100)); save(); rerenderKeep(); return; }
    if (el.hasAttribute("data-biz")) { S.biz[el.getAttribute("data-biz")] = el.value.trim(); save(); rerenderKeep(); return; }
    if (el.hasAttribute("data-live")) { rerenderKeep(); return; }
    if (el.hasAttribute("data-restore")) { if (el.files && el.files[0]) restoreFile(el.files[0], render); el.value = ""; return; }
    const cq = el.getAttribute("data-cq"), cp = el.getAttribute("data-cp"), set = el.getAttribute("data-set");
    if (cq) {
      const l = ui.cart.find((x) => x.pid === cq), p = prod(cq);
      if (l && p) { const n = Math.floor(num(el.value)); if (n <= 0) ui.cart = ui.cart.filter((x) => x !== l); else l.qty = Math.min(n, p.qty); rerenderKeep(); }
    } else if (cp) {
      const l2 = ui.cart.find((x) => x.pid === cp);
      if (l2) { l2.price = Math.max(0, num(el.value)); rerenderKeep(); }
    } else if (set) {
      if (set === "mode") ui.repMode = el.value; else if (set === "year") ui.repYear = parseInt(el.value, 10); else if (set === "q") ui.repQ = parseInt(el.value, 10);
      if (set === "mode") {
        const cy = now0.getFullYear(), m = now0.getMonth() + 1, dd = now0.getDate();
        ui.repYear = (ui.repMode === "fy" && (m < 7 || (m === 7 && dd < 8))) ? cy - 1 : cy;
      }
      rerenderKeep();
    }
  });
}
