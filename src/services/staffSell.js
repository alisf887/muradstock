import { ui } from "../state/ui.js";
import { t } from "../i18n/index.js";
import { esc, fmt, money } from "../lib/format.js";
import { staff, cat } from "../services/staff.js";
import { head, field } from "./components.js";

/** Sell screen for a sales person: shared stock, read-only prices, no costs. */
export function staffSell() {
  let h = head("sell") + '<div style="margin:-4px 0 10px"><button class="btn ghost sm" data-act="refresh">Refresh stock</button></div>';
  if (!staff.loaded) return h + '<p class="meta">Loading…</p>';
  if (!staff.items.length) {
    return h + '<div class="empty"><b>' + (staff.error ? "Could not load stock" : "No products in stock") + "</b>" +
      esc(staff.error || "Stock appears here after the owner opens StockLedger.") +
      '<div style="margin-top:12px"><button class="btn" data-act="nav" data-v="buy">' + t("buy") + "</button></div></div>";
  }
  let total = 0;
  ui.cart.forEach((l) => { total += l.qty * l.price; });
  h += '<div class="grid2"><div class="card"><h2>' + t("search") + '</h2><input id="srch" data-d="1" type="search" placeholder="' + t("search") + '" style="margin-bottom:8px"><div class="list" id="plist">';
  staff.items.forEach((p) => {
    h += '<div class="item" data-s="' + esc((p.name + " " + (p.sku || "") + " " + (p.category || "")).toLowerCase()) + '"><button class="btn ghost sm" data-act="addcart" data-id="' + esc(p.id) + '" aria-label="+ ' + esc(p.name) + '">+</button><div class="grow"><div class="name">' + esc(p.name) + '</div><div class="meta num">' + fmt(p.qty) + " " + esc(p.unit) + " " + t("in_stock") + (p.category ? " · " + esc(p.category) : "") + '</div></div><div class="num">' + money(p.price) + "</div></div>";
  });
  h += '</div></div><div class="card"><h2>' + t("sell") + "</h2>";
  if (!ui.cart.length) h += '<p class="meta">' + t("cart_empty") + "</p>";
  else {
    h += '<div class="list">';
    ui.cart.forEach((l) => {
      const p = cat(l.pid); if (!p) return;
      h += '<div class="item"><div class="grow"><div class="name">' + esc(p.name) + '</div><div class="meta num">' + money(l.qty * l.price) + "</div></div>" +
        '<div class="qty"><button data-act="cdec" data-id="' + esc(l.pid) + '" aria-label="-">−</button><input data-cq="' + esc(l.pid) + '" type="number" inputmode="decimal" min="0" max="' + p.qty + '" value="' + l.qty + '" aria-label="' + t("qty") + '"><button data-act="cinc" data-id="' + esc(l.pid) + '" aria-label="+">+</button></div>' +
        '<div class="num" style="width:92px;text-align:right">' + money(l.price) + "</div></div>";
    });
    h += "</div>";
  }
  h += '<div class="row" style="margin-top:12px;justify-content:space-between;align-items:center"><span class="meta">' + t("total") + '</span><span class="total num">' + money(total) + "</span></div>";
  h += '<div style="margin:12px 0 4px" class="meta">' + t("pay_method") + '</div><div class="seg" role="group">';
  [["cash", "cash"], ["momo", "momo"], ["credit", "creditm"]].forEach((m) => { h += '<button data-act="method" data-v="' + m[0] + '" aria-pressed="' + (ui.method === m[0]) + '">' + t(m[1]) + "</button>"; });
  h += "</div>";
  if (ui.method === "credit") h += '<div class="row" style="margin-top:12px">' + field("s_newcust", t("customer"), "text", 'autocomplete="off"') + "</div>";
  h += '<div style="margin-top:14px"><button class="btn" data-act="complete" ' + (ui.cart.length && !staff.busy ? "" : "disabled") + ">" + (staff.busy ? "Saving…" : t("complete_sale")) + "</button></div></div></div>";
  return h;
}