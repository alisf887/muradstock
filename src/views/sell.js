import { S, prod } from "../state/store.js";
import { ui } from "../state/ui.js";
import { t } from "../i18n/index.js";
import { esc, fmt, money } from "../lib/format.js";
import { head, empty, field } from "./components.js";

const METHOD = { cash: "cash", momo: "momo", credit: "creditm" };

export function sell() {
  let h = head("sell");
  const avail = S.products.filter((p) => p.qty > 0);
  if (!S.products.length) return h + empty();
  let total = 0;
  ui.cart.forEach((l) => { total += l.qty * l.price; });
  h += '<div class="grid2"><div class="card"><h2>' + t("search") + '</h2><input id="srch" data-d="1" type="search" placeholder="' + t("search") + '" style="margin-bottom:8px">';
  if (!avail.length) h += '<p class="meta">' + t("no_stock_items") + "</p>";
  else {
    h += '<div class="list" id="plist">';
    avail.forEach((p) => {
      h += '<div class="item" data-s="' + esc((p.name + " " + (p.sku || "") + " " + (p.category || "")).toLowerCase()) + '"><button class="btn ghost sm" data-act="addcart" data-id="' + p.id + '" aria-label="+ ' + esc(p.name) + '">+</button><div class="grow"><div class="name">' + esc(p.name) + '</div><div class="meta num">' + fmt(p.qty) + " " + esc(p.unit) + " " + t("in_stock") + (p.category ? " · " + esc(p.category) : "") + '</div></div><div class="num">' + money(p.price) + "</div></div>";
    });
    h += "</div>";
  }
  h += '</div><div class="card"><h2>' + t("sell") + "</h2>";
  if (!ui.cart.length) h += '<p class="meta">' + t("cart_empty") + "</p>";
  else {
    h += '<div class="list">';
    ui.cart.forEach((l) => {
      const p = prod(l.pid); if (!p) return;
      h += '<div class="item"><div class="grow"><div class="name">' + esc(p.name) + '</div><div class="meta num">' + money(l.qty * l.price) + "</div></div>" +
        '<div class="qty"><button data-act="cdec" data-id="' + l.pid + '" aria-label="-">−</button><input data-cq="' + l.pid + '" type="number" inputmode="decimal" min="0" max="' + p.qty + '" value="' + l.qty + '" aria-label="' + t("qty") + '"><button data-act="cinc" data-id="' + l.pid + '" aria-label="+">+</button></div>' +
        '<div style="width:92px"><input data-cp="' + l.pid + '" type="number" inputmode="decimal" min="0" value="' + l.price + '" aria-label="' + t("price") + '"></div></div>';
    });
    h += "</div>";
  }
  h += '<div class="row" style="margin-top:12px;justify-content:space-between;align-items:center"><span class="meta">' + t("total") + '</span><span class="total num">' + money(total) + "</span></div>";
  h += '<div style="margin:12px 0 4px" class="meta">' + t("pay_method") + '</div><div class="seg" role="group">';
  [["cash", "cash"], ["momo", "momo"], ["credit", "creditm"]].forEach((m) => { h += '<button data-act="method" data-v="' + m[0] + '" aria-pressed="' + (ui.method === m[0]) + '">' + t(m[1]) + "</button>"; });
  h += "</div>";
  if (ui.method === "credit") {
    h += '<div class="row" style="margin-top:12px"><label>' + t("customer") + '<select id="s_cust" data-d="1"><option value="">' + t("select_customer") + "</option>" + S.customers.map((c) => '<option value="' + c.id + '">' + esc(c.name) + "</option>").join("") + "</select></label>" +
      field("s_newcust", t("or_new"), "text") + "</div>";
  }
  h += '<div style="margin-top:14px"><button class="btn" data-act="complete" ' + (ui.cart.length ? "" : "disabled") + ">" + t("complete_sale") + "</button></div></div></div>";
  const rs = S.sales.slice().reverse().slice(0, 8);
  if (rs.length) {
    h += '<div class="card"><h2>' + t("recent_sales") + '</h2><div class="list">';
    rs.forEach((s) => {
      const armed = ui.confirmKey === "sale:" + s.id;
      h += '<div class="item"><div class="grow' + (s.void ? " void" : "") + '"><div class="name">#' + s.no + " · " + s.d + '</div><div class="meta">' + s.items.map((i) => esc(i.name) + " ×" + fmt(i.qty)).join(", ") + " · " + t(METHOD[s.method] || "cash") + (s.cname ? " · " + esc(s.cname) : "") + (s.by ? " · " + esc(s.by) : "") + "</div></div>" +
        '<div class="num' + (s.void ? " void" : "") + '">' + money(s.total) + "</div>" +
        (s.void ? '<span class="badge b-crit">' + t("voided") + "</span>" : '<button class="btn ' + (armed ? "danger" : "ghost") + ' sm" data-act="voidsale" data-id="' + s.id + '">' + (armed ? t("confirm_void") : t("void")) + "</button>") + "</div>";
    });
    h += "</div></div>";
  }
  return h;
}