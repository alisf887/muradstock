import { ui } from "../state/ui.js";
import { num, fm2 } from "../lib/format.js";
import { filterList } from "../lib/dom.js";

export function bindInput() {
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.getAttribute && el.hasAttribute("data-d")) {
      ui.draft[el.id] = el.value;
      if (el.id === "srch") filterList("#plist", "srch");
      if (el.id === "srch2") filterList("#slist", "srch2");
      if (el.id === "b_qty" || el.id === "b_cost") {
        const tt = document.getElementById("b_tot"), qa = num(ui.draft.b_qty), ca = num(ui.draft.b_cost);
        if (tt) tt.value = (qa > 0 && ca > 0) ? fm2(qa * ca) : "";
      }
    }
  });
}
