/* =========================================================
   ZED Gift Shop — track order
   ========================================================= */
(function () {
  "use strict";
  var Z = window.ZED;
  if (!Z) return;
  var $ = Z.$, esc = Z.esc, money = Z.money;

  function timeline(order) {
    var tl = Z.timeline;
    var idx = tl.indexOf(order.status);
    if (idx === -1) return ""; /* cancelled / refunded */
    return '<div class="tl">' + tl.map(function (s, i) {
      var entry = order.history.filter(function (h) { return h.status === s; })[0];
      var meta = Z.statusMeta(s);
      var cls = i < idx ? "is-done" : i === idx ? "is-now" : "";
      return '<div class="tl__i ' + cls + '">' +
        '<span class="tl__dot">' + (i < idx ? Z.icons.check : i === idx
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 6v6l4 2"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="12" r="4"/></svg>') + "</span>" +
        '<span class="tl__line"></span>' +
        '<div class="tl__b"><b>' + esc(meta.stage) + "</b>" +
          "<span>" + (entry ? esc(entry.note) : "Pending") + "</span>" +
          (entry ? "<span>" + esc(Z.fmtDateTime(entry.at)) + "</span>" : "") +
        "</div></div>";
    }).join("") + "</div>";
  }

  function renderOrder(order) {
    var cancelled = order.status === "CANCELLED" || order.status === "REFUNDED";
    var delivered = order.status === "DELIVERED";
    var meta = Z.statusMeta(order.status);

    $("#trackOut").innerHTML =
      '<div class="cartsummary" style="position:static;max-width:820px;margin-inline:auto">' +
        '<div class="secrow">' +
          "<div><p class=\"hero__kicker\" style=\"color:var(--green)\">Order " + esc(order.id) + "</p>" +
            "<h2 class=\"ttl\" style=\"font-size:22px\">" + esc(meta.label) + "</h2>" +
            "<p style=\"font-size:13.5px;color:var(--muted);margin-top:4px\">Placed " + esc(Z.fmtDate(order.createdAt)) + "</p></div>" +
          '<span class="badge-st st-' + esc(order.status) + '">' + esc(meta.label) + "</span>" +
        "</div>" +

        '<div class="notice ' + (cancelled ? "notice--err" : delivered ? "notice--ok" : "notice--info") + '" style="margin-bottom:18px">' +
          Z.icons.check + "<span><b>" + esc(meta.msg) + "</b>" +
          (order.delivery.method === "pickup"
            ? " Ready for collection at our Nairobi CBD store."
            : " Estimated " + esc(order.delivery.name.toLowerCase()) + " arrival: " + esc(Z.fmtDate(order.delivery.eta)) + ".") +
          "</span></div>" +

        (order.tracking
          ? '<div class="courierbox" style="margin-bottom:18px">' +
              "<div><b>Courier</b><br><span style=\"font-size:13.5px;color:var(--muted)\">" + esc(order.courier) + "</span></div>" +
              '<div style="text-align:right"><b style="font-family:monospace;letter-spacing:.06em">' + esc(order.tracking) + "</b>" +
              "<br><span style=\"font-size:12px;color:var(--muted)\">Tracking number</span></div></div>"
          : "") +

        timeline(order) +

        '<div class="secrow" style="margin-top:24px;margin-bottom:10px"><h3 class="ttl" style="font-size:16px">Items</h3></div>' +
        order.items.map(function (i) {
          return '<div class="confirm__row"><span>' + esc(i.name) +
            (i.size || i.color ? " · " + esc([i.size, i.color].filter(Boolean).join(", ")) : "") +
            " × " + i.qty + "</span><b>" + money(i.price * i.qty) + "</b></div>";
        }).join("") +
        '<div class="sumline"><span>Subtotal</span><b>' + money(order.totals.subtotal) + "</b></div>" +
        '<div class="sumline"><span>Delivery</span><b>' + (order.totals.delivery ? money(order.totals.delivery) : "FREE") + "</b></div>" +
        (order.totals.discount ? '<div class="sumline"><span>Discount</span><b style="color:var(--green)">−' + money(order.totals.discount) + "</b></div>" : "") +
        '<div class="sumline sumline--total"><span>Total</span><b>' + money(order.totals.total) + "</b></div>" +

        '<div class="confirm__row" style="margin-top:14px"><span>Deliver to</span><b>' +
          esc([order.address.name, order.address.street, order.address.area, order.address.town, order.address.county].filter(Boolean).join(", ")) +
          "</b></div>" +
        (order.address.instructions
          ? '<div class="confirm__row"><span>Instructions</span><b>' + esc(order.address.instructions) + "</b></div>"
          : "") +
        '<div class="confirm__row"><span>Contact</span><b>' + esc(order.customer.phone) +
          (order.customer.email ? " · " + esc(order.customer.email) : "") + "</b></div>" +

        (order.payment.status === "unpaid"
          ? '<div class="notice notice--warn" style="margin-top:16px">' + Z.icons.check +
            "<span><b>Awaiting payment</b> This order has not been paid yet. Contact us on 0711 436 169 to complete payment.</span></div>"
          : "") +

        '<div class="confirm__acts" style="justify-content:flex-start">' +
          (delivered && !order.reviewed
            ? '<a class="btn btn--primary" href="review.html?order=' + encodeURIComponent(order.id) + '">Rate this order</a>'
            : "") +
          (delivered && order.reviewed
            ? '<a class="btn btn--ghost" href="review.html?order=' + encodeURIComponent(order.id) + '">Update your review</a>'
            : "") +
          (order.payment.status === "unpaid"
            ? '<a class="btn btn--primary" href="contact.html">Contact us to pay</a>' : "") +
          '<a class="btn btn--ghost" href="shop.html">Shop again</a>' +
        "</div>" +
      "</div>";
  }

  function renderRecent() {
    var orders = Z.db.orders.slice(0, 4);
    $("#recentOrders").innerHTML = orders.length
      ? orders.map(function (o) {
          var meta = Z.statusMeta(o.status);
          return '<button class="ordercard" type="button" data-open="' + esc(o.id) + '" style="text-align:left;cursor:pointer;width:100%">' +
            '<span class="ordercard__hd"><span class="ordercard__num">' + esc(o.id) + "</span>" +
            '<span class="badge-st st-' + esc(o.status) + '">' + esc(meta.label) + "</span></span>" +
            '<span style="display:block;font-size:13px;color:var(--muted);margin-top:8px">' +
              o.items.map(function (i) { return esc(i.name); }).join(", ") + "</span>" +
            '<span style="display:block;font-size:13.5px;font-weight:750;color:var(--ink);margin-top:8px">' +
              o.items.length + " item" + (o.items.length === 1 ? "" : "s") + " · " + money(o.totals.total) + " · " +
              esc(Z.fmtDate(o.createdAt)) + "</span></button>";
        }).join("")
      : '<p class="none">No orders yet. <a href="shop.html" style="color:var(--green)">Start shopping</a>.</p>';
  }

  Z.on($("#trackForm"), "submit", function (e) {
    e.preventDefault();
    var num = $("#tNum").value.trim();
    var contact = $("#tContact").value.trim();
    var errBox = $("#trackErr");
    if (!num) {
      errBox.hidden = false;
      errBox.textContent = "Enter your order number, e.g. ZED-2026-482913.";
      $("#tNum").focus();
      return;
    }
    var r = Z.findOrder(num, contact);
    if (!r.ok) {
      errBox.hidden = false;
      errBox.textContent = r.msg;
      return;
    }
    errBox.hidden = true;
    renderOrder(r.order);
    $("#trackOut").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-open]");
    if (!el) return;
    var o = Z.orderByNumber(el.getAttribute("data-open"));
    if (o) {
      $("#tNum").value = o.id;
      $("#tContact").value = o.customer.phone;
      renderOrder(o);
      $("#trackOut").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  renderRecent();

  var pre = Z.qs("order");
  if (pre) {
    $("#tNum").value = pre;
    var o = Z.orderByNumber(pre);
    if (o) renderOrder(o);
  }
})();