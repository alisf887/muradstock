import { pref } from "../state/store.js";
import { ui } from "../state/ui.js";
import { auth, visibleTabs, isOwner } from "../auth/session.js";
import { t } from "../i18n/index.js";
import { isDark, filterList } from "../lib/dom.js";
import { ico } from "./components.js";
import { home } from "./home.js";
import { sell } from "./sell.js";
import { buy } from "./buy.js";
import { stock } from "./stock.js";
import { alerts } from "./alerts.js";
import { credit } from "./credit.js";
import { profit } from "./profit.js";
import { reports } from "./reports.js";
import { staffSell } from "./staffSell.js";
import { staffBuy } from "./staffBuy.js";

const VIEWS = { home, sell, buy, stock, alerts, credit, profit, reports };
const STAFF_VIEWS = { sell: staffSell, buy: staffBuy };
export const TABS = ["home", "sell", "buy", "stock", "alerts", "credit", "profit", "reports"];

/** Redraw the whole screen from state. Form values come back from ui.draft. */
export function render() {
  const tabs = visibleTabs(TABS);
  if (!tabs.includes(ui.tab)) ui.tab = tabs[0];
  document.getElementById("nav").innerHTML = tabs.length < 2 ? "" : tabs.map((k) => '<button data-act="nav" data-v="' + k + '"' + (k === ui.tab ? ' aria-current="page"' : "") + ">" + ico(k) + "<span>" + t(k) + "</span></button>").join("");
  document.getElementById("main").innerHTML = (isOwner() ? VIEWS : STAFF_VIEWS)[ui.tab]();
  document.querySelectorAll("#main [data-d]").forEach((el) => { if (ui.draft[el.id] !== undefined) el.value = ui.draft[el.id]; });
  const ub = document.getElementById("userBtn");
  if (auth.profile) { ub.textContent = auth.profile.full_name + " · Sign out"; ub.hidden = false; }
  document.getElementById("langBtn").textContent = pref.lang === "en" ? "አማርኛ" : "English";
  document.getElementById("themeBtn").textContent = isDark() ? "Light" : "Dark";
  document.documentElement.lang = pref.lang;
  if (ui.tab === "sell") filterList("#plist", "srch");
  if (ui.tab === "stock") filterList("#slist", "srch2");
  window.scrollTo(0, 0);
}
/** Redraw but keep the scroll position. */
export function rerenderKeep() { const y = window.scrollY; render(); window.scrollTo(0, y); }