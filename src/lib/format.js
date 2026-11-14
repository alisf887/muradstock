import { t, tl } from "../i18n/index.js";

export const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
export function num(v) {
  const n = parseFloat(String(v == null ? "" : v).replace(/,/g, ""));
  return isFinite(n) ? n : 0;
}
export const r2 = (n) => Math.round(n * 100) / 100;
export const fmt = (n) => r2(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const fm2 = (n) => Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (n) => t("etb") + " " + fmt(n);
/** 2026-11-14 -> 14-Nov-26 */
export function fd(s) {
  const p = String(s).split("-");
  return p.length === 3 ? (+p[2]) + "-" + MON[+p[1] - 1] + "-" + p[0].slice(2) : String(s);
}
export function uniq(a) { const o = {}; return a.filter((x) => { if (!x || o[x]) return false; o[x] = 1; return true; }); }
/** supplier key / display name */
export const skey = (s) => String(s || "").trim().toLowerCase() || "-";
export const sname = (s, lang) => String(s || "").trim() || tl(lang, "no_supplier");
