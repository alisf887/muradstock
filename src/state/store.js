export const KEY = "stockledger.v2";
export const PKEY = "stockledger.pref";

/** All persisted business data. Mutated in place by services. */
export const S = {
  products: [], customers: [], sales: [], purchases: [], payments: [], orders: [],
  log: [], moves: [], returns: [], vat: 0.15, biz: { name: "", tin: "", period: "" },
  mig: false, seq: 1, rno: 1, pono: 1
};
/** UI preferences (language, theme). */
export const pref = { lang: "en", theme: null };

try {
  const raw = localStorage.getItem(KEY);
  if (raw) { const o = JSON.parse(raw); for (const k in S) if (o[k] !== undefined) S[k] = o[k]; }
} catch (e) {}
try {
  const pr = localStorage.getItem(PKEY);
  if (pr) Object.assign(pref, JSON.parse(pr));
} catch (e) {}

export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
export function savePref() { try { localStorage.setItem(PKEY, JSON.stringify(pref)); } catch (e) {} }
export const uid = () => "i" + (S.seq++).toString(36);

export function log(text) {
  S.log.push({ ts: Date.now(), text });
  if (S.log.length > 200) S.log.splice(0, S.log.length - 200);
}

/* selectors */
export const prod = (id) => S.products.find((p) => p.id === id);
export const cust = (id) => S.customers.find((c) => c.id === id);
export const SA = () => S.sales.filter((s) => !s.void);        // active sales
export const PU = () => S.purchases.filter((x) => !x.void);    // active purchases
