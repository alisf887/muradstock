import { S } from "../state/store.js";
import { ui } from "../state/ui.js";
import { t } from "../i18n/index.js";
import { esc, uniq } from "../lib/format.js";
import { status } from "../services/products.js";

const ICONS = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  sell: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
  buy: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  stock: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  alerts: '<path d="M6 17v-6a6 6 0 0 1 12 0v6l2 2H4z"/><path d="M10 21h4"/>',
  credit: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-4 3-6 6.5-6s6.5 2 6.5 6"/><path d="M16 5a3.5 3.5 0 0 1 0 7M18 14c2.5.5 3.5 2.5 3.5 6"/>',
  profit: '<path d="M4 20V4M4 20h16"/><path d="M8 15l4-4 3 3 5-6"/>',
  reports: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>'
};
export const ico = (n) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[n] + "</svg>";

export const badge = (p) => { const s = status(p); return '<span class="badge b-' + s + '">' + t("s_" + s) + "</span>"; };
export const head = (k, sub) => "<div><h1>" + t(k) + "</h1>" + (sub ? '<p class="sub">' + sub + "</p>" : "") + "</div>";
export const field = (id, label, type, extra) => "<label>" + label + '<input id="' + id + '" data-d="1" type="' + (type || "text") + '" ' + (extra || "") + "></label>";
export const dl = (id, arr) => '<datalist id="' + id + '">' + arr.map((x) => '<option value="' + esc(x) + '">').join("") + "</datalist>";
export function delBtn(key, act, id, labelKey) {
  const armed = ui.confirmKey === key;
  return '<button class="btn ' + (armed ? "danger" : "ghost") + ' sm" data-act="' + act + '" data-id="' + id + '">' + (armed ? t("confirm_delete") : t(labelKey || "delete")) + "</button>";
}
export const empty = () => '<div class="empty"><b>' + t("empty_title") + "</b>" + t("empty_body") + '<div style="margin-top:12px"><button class="btn" data-act="nav" data-v="buy">' + t("go_stock") + "</button></div></div>";
export const sups = () => uniq(S.products.map((p) => p.supplier).concat(S.purchases.map((x) => x.supplier)));
export const cats = () => uniq(S.products.map((p) => p.category));
