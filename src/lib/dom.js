import { t } from "../i18n/index.js";
import { pref } from "../state/store.js";
import { ui } from "../state/ui.js";

export function toast(m) {
  const el = document.getElementById("toast");
  el.textContent = m; el.hidden = false;
  clearTimeout(toast.h);
  toast.h = setTimeout(() => { el.hidden = true; }, 2600);
}
export function copyText(text) {
  const done = () => toast(t("copied"));
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (e) {}
    document.body.removeChild(ta);
  };
  try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
}
export function filterList(sel, key) {
  const v = (ui.draft[key] || "").toLowerCase();
  document.querySelectorAll(sel + " .item").forEach((el) => {
    el.hidden = !!v && (el.getAttribute("data-s") || "").indexOf(v) < 0;
  });
}
export function applyTheme() {
  const r = document.documentElement;
  if (pref.theme) r.setAttribute("data-theme", pref.theme); else r.removeAttribute("data-theme");
}
export function isDark() {
  return pref.theme ? pref.theme === "dark" : !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
}
