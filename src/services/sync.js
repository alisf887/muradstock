// src/services/sync.js
// Shared stock between the owner's app and a sales person, via sl_catalog and sl_inbox.
// `sb` is your Supabase client; it is passed in so this file does not guess your client's path.
import { S, cust, uid, save, log, prod } from "../state/store.js";
import { r2 } from "../lib/format.js";
import { dkey } from "../lib/dates.js";
import { mv } from "./movements.js";
import { ensureProduct } from "./products.js";

const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

/* ---------------- OWNER ---------------- */

/** Pull new sales from sales people and record them as normal sales. Safe to run repeatedly. */
export async function applyInbox(sb) {
  const { data, error } = await sb.from("sl_inbox").select("*").eq("status", "new").order("id");
  if (error) return { ok: false, error: error.message, applied: 0 };
  if (!data.length) return { ok: true, applied: 0 };

  const done = new Set(S.sales.map((s) => s.src).filter(Boolean));
  const ids = []; let applied = 0;

  for (const row of data) {
    ids.push(row.id);
    if (done.has(row.sale_uid)) continue;            // already recorded earlier

    const when = new Date(row.created_at), d = dkey(when);
    const no = S.rno++;
    const items = []; let total = 0, cogs = 0;

    for (const it of row.items) {
      const q = Number(it.qty), price = Number(it.price), p = prod(it.pid);
      const cost = p ? p.cost : 0;
      items.push({ pid: it.pid, name: p ? p.name : it.name, unit: it.unit || "", cat: it.category || "", sku: it.sku || "", qty: q, price, cost });
      total += q * price; cogs += q * cost;
      if (p) { p.qty = Math.max(0, r2(p.qty - q)); mv(p.id, "sale", -q, d, "Sale #" + no + " (" + row.sold_by_name + ")"); }
    }

    let cid = null, cname = "";
    if (row.method === "credit") {
      cname = String(row.customer_name || "").trim();
      let c = S.customers.find((x) => same(x.name, cname));
      if (!c) { c = { id: uid(), name: cname, phone: "", balance: 0 }; S.customers.push(c); log("Added customer: " + cname); }
      cid = c.id;
    }

    const sale = { id: uid(), no, ts: when.getTime(), d, items, method: row.method, cid, cname,
      total: r2(total), cogs: r2(cogs), void: false, by: row.sold_by_name || "", src: row.sale_uid };
    S.sales.push(sale);
    if (cid) cust(cid).balance = r2(cust(cid).balance + sale.total);
    log("Sale #" + no + " by " + (row.sold_by_name || "sales") + ": " + sale.total);
    applied++;
  }

  save();                                            // save locally BEFORE marking applied
  const up = await sb.from("sl_inbox").update({ status: "applied" }).in("id", ids);
  if (up.error) return { ok: false, error: up.error.message, applied };
  return { ok: true, applied };
}

/** Pull purchases registered by sales people and record them like Buy does. */
export async function applyPurchases(sb) {
  const { data, error } = await sb.from("sl_purchase_inbox").select("*").eq("status", "new").order("id");
  if (error) return { ok: false, error: error.message, applied: 0 };
  if (!data.length) return { ok: true, applied: 0 };

  const done = new Set(S.purchases.map((x) => x.src).filter(Boolean));
  const ids = []; let applied = 0;

  for (const row of data) {
    ids.push(row.id);
    if (done.has(row.purchase_uid)) continue;
    const q = Number(row.qty), c = Number(row.cost), d = row.d;
    const p = ensureProduct(row.item_name);
    p.cost = r2(p.qty > 0 ? (p.qty * p.cost + q * c) / (p.qty + q) : c);
    p.qty = r2(p.qty + q);
    S.purchases.push({ id: uid(), doc: uid(), rno: row.rno || "", d, ts: new Date(row.created_at).getTime(), supplier: row.supplier || "",
      open: false, pid: p.id, name: p.name, unit: p.unit, cat: p.category || "", sku: p.sku || "", qty: q, cost: c, total: r2(q * c),
      by: row.bought_by_name || "", src: row.purchase_uid });
    mv(p.id, "purchase", q, d, row.rno || "");
    log("Purchase by " + (row.bought_by_name || "sales") + ": " + p.name + " x " + q);
    applied++;
  }
  save();
  const up = await sb.from("sl_purchase_inbox").update({ status: "applied" }).in("id", ids);
  if (up.error) return { ok: false, error: up.error.message, applied };
  return { ok: true, applied };
}

/** Publish products (no cost) to sl_catalog so the sales person sees shared stock. */
export async function publishCatalog(sb) {
  // Stock that sales people sold but the owner has not applied yet must stay deducted.
  const pend = await sb.from("sl_inbox").select("items").eq("status", "new");
  if (pend.error) return { ok: false, error: pend.error.message };
  const held = {};
  (pend.data || []).forEach((r) => (r.items || []).forEach((i) => { held[i.pid] = (held[i.pid] || 0) + Number(i.qty); }));

  const stamp = new Date().toISOString();
  // Products with no price yet stay hidden from sales people (they could be sold for 0).
  const listed = S.products.filter((p) => p.price > 0);
  const rows = listed.map((p) => ({
    id: p.id, name: p.name, unit: p.unit || "", category: p.category || "", sku: p.sku || "",
    price: p.price || 0, qty: Math.max(0, r2(p.qty - (held[p.id] || 0))), updated_at: stamp
  }));

  for (let i = 0; i < rows.length; i += 200) {
    const r = await sb.from("sl_catalog").upsert(rows.slice(i, i + 200));
    if (r.error) return { ok: false, error: r.error.message };
  }
  // Remove products the owner deleted.
  const have = await sb.from("sl_catalog").select("id");
  if (have.error) return { ok: false, error: have.error.message };
  const keep = new Set(listed.map((p) => p.id));
  const stale = have.data.map((r) => r.id).filter((id) => !keep.has(id));
  if (stale.length) {
    const r = await sb.from("sl_catalog").delete().in("id", stale);
    if (r.error) return { ok: false, error: r.error.message };
  }
  return { ok: true, count: rows.length };
}

/** Call on owner login and after any change to stock or prices. */
export async function syncOwner(sb) {
  const a = await applyInbox(sb);
  if (!a.ok) return a;
  const b = await applyPurchases(sb);
  if (!b.ok) return b;
  const p = await publishCatalog(sb);
  return p.ok ? { ok: true, applied: a.applied, purchases: b.applied, published: p.count } : p;
}

/* ---------------- SALES PERSON ---------------- */

/** Products in stock, with price but never cost. */
export async function loadCatalog(sb) {
  const { data, error } = await sb.from("sl_catalog").select("id,name,unit,category,sku,price,qty").gt("qty", 0).order("name");
  return error ? { ok: false, error: error.message, items: [] } : { ok: true, items: data };
}

let pendingUid = null;
/** Call when the cart changes, so a new cart gets a new sale id. */
export function resetPending() { pendingUid = null; }

/**
 * Save one sale. lines: [{ pid, qty, price }]. method: "cash" | "momo" | "credit".
 * Retrying after a network error reuses the same id, so the sale cannot be saved twice.
 */
export async function submitSale(sb, { lines, method, customer }) {
  pendingUid = pendingUid || crypto.randomUUID();
  const { error } = await sb.from("sl_inbox").insert({
    sale_uid: pendingUid, method, customer_name: customer || "",
    items: lines.map((l) => ({ pid: l.pid, qty: l.qty, price: l.price }))
  });
  if (error) {
    if (error.code === "23505") { pendingUid = null; return { ok: true, duplicate: true }; }  // first attempt had worked
    return { ok: false, error: error.message };
  }
  pendingUid = null;
  return { ok: true };
}

let pendingPurUid = null;
export function resetPendingPurchase() { pendingPurUid = null; }
/** Sales person registers a purchase. It reaches the owner's books on the owner's next sync. */
export async function submitPurchase(sb, { supplier, rno, d, item, qty, cost }) {
  pendingPurUid = pendingPurUid || crypto.randomUUID();
  const { error } = await sb.from("sl_purchase_inbox").insert({
    purchase_uid: pendingPurUid, supplier: supplier || "", rno: rno || "", d: d || undefined,
    item_name: item, qty, cost
  });
  if (error) {
    if (error.code === "23505") { pendingPurUid = null; return { ok: true, duplicate: true }; }
    return { ok: false, error: error.message };
  }
  pendingPurUid = null;
  return { ok: true };
}

/* ---------------- OWNER BACKGROUND RUNNER ---------------- */

let client = null, handler = null, timer = null, busy = false, again = false, lastError = "";

/** Run one full owner sync now. Several calls at once are merged. */
export async function runOwnerSync() {
  if (!client) return;
  if (busy) { again = true; return; }
  busy = true;
  try {
    const r = await syncOwner(client);
    if (!r.ok) {
      if (r.error !== lastError) { lastError = r.error; if (handler) handler({ error: r.error }); }
    } else {
      lastError = "";
      if ((r.applied || r.purchases) && handler) handler({ applied: r.applied, purchases: r.purchases });
    }
  } catch (e) {
    const m = "No internet";
    if (m !== lastError) { lastError = m; if (handler) handler({ error: m }); }
  } finally { busy = false; }
  if (again) { again = false; runOwnerSync(); }
}

/** Start syncing when the owner opens the app, then once a minute while the page is visible. */
export function startOwnerSync(sb, onChanged, pollMs = 60000) {
  client = sb; handler = onChanged;
  runOwnerSync();
  setInterval(() => { if (!document.hidden) runOwnerSync(); }, pollMs);
}

/** Call after the owner changes stock or prices. Waits a moment so several edits go together. */
export function scheduleOwnerSync(ms = 1500) {
  if (!client) return;
  clearTimeout(timer);
  timer = setTimeout(runOwnerSync, ms);
}