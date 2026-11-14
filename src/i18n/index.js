import en from "./en.js";
import am from "./am.js";
import { pref, savePref } from "../state/store.js";

const T = { en, am };

/** Translate a key using the current UI language. */
export function t(k) {
  return (T[pref.lang] && T[pref.lang][k]) || T.en[k] || k;
}
/** Translate a key into a specific language (used for exports, always "en"). */
export function tl(lang, k) {
  return (T[lang] && T[lang][k]) || T.en[k] || k;
}
export function toggleLang() {
  pref.lang = pref.lang === "en" ? "am" : "en";
  savePref();
}
