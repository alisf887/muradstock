import { S, prod, uid, save } from "./store.js";
import { dkey, today } from "../lib/dates.js";
import { r2 } from "../lib/format.js";

/** One-time upgrade: build the stock ledger (S.moves) from older data. */
export function migrate() {
  if (S.mig) return;
  S.moves = [];
  S.purchases.forEach((x) => {
    if (!x.doc) x.doc = x.id;
    if (x.rno === undefined) x.rno = "";
    if (!x.void && prod(x.pid)) S.moves.push({ id: uid(), ts: x.ts || 0, d: x.d, pid: x.pid, type: x.open ? "open" : "purchase", qty: x.qty, ref: x.rno || "" });
  });
  S.sales.forEach((s) => {
    s.items.forEach((i) => {
      if (!prod(i.pid)) return;
      S.moves.push({ id: uid(), ts: s.ts || 0, d: s.d, pid: i.pid, type: "sale", qty: -i.qty, ref: "Sale #" + s.no });
      if (s.void) S.moves.push({ id: uid(), ts: s.voidTs || 0, d: s.voidTs ? dkey(new Date(s.voidTs)) : s.d, pid: i.pid, type: "void_sale", qty: i.qty, ref: "Void sale #" + s.no });
    });
  });
  S.products.forEach((p) => {
    const sum = S.moves.filter((m) => m.pid === p.id).reduce((a, m) => a + m.qty, 0);
    const diff = r2(p.qty - sum);
    if (diff !== 0) S.moves.push({ id: uid(), ts: Date.now(), d: today(), pid: p.id, type: "adjust", qty: diff, ref: "Balance brought forward" });
  });
  S.mig = true;
  save();
}
