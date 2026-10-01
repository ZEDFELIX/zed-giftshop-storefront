/* =========================================================
   ZED Gift Shop — order confirmation
   ========================================================= */
(function () {
  "use strict";
  var Z = window.ZED;
  if (!Z) return;
  var $ = Z.$, esc = Z.esc, money = Z.money;

  var id = Z.qs("order") || sessionStorage.getItem("zed.last") || "";
  var order = Z.orderByNumber(id);

  if (!order) {
    $("#confirmWrap").innerHTML =
      '<div class="confirm">' +
        '<p class="empty-state__e" aria-hidden="true">🧾</p>' +
        "<h1>We couldn't find that order</h1>" +
        '<p class="confirm__sub">Check the link, or look it up with your order number.</p>' +
        '<div class="confirm__acts"><a class="btn btn--primary" href="track.html">Track an order</a>' +
        '<a class="btn btn--ghost" href="shop.html">Continue shopping</a></div></div>';
    $("#nextSteps").innerHTML = "";
    $("#alsoLike").innerHTML = Z.products.slice(0, 4).map(function (p) { return Z.cardHTML(p); }).join("");
    return;
  }

  document.title = "Order " + order.id + " confirmed | ZED Gift Shop";
  Z.markAllRead();
  Z.refreshCarts();

  var paid = order.payment.status === "paid";
  var cod = order.payment.method === "cod";
  var eta = order.delivery.method === "pickup"
    ? "Ready for pickup today"
    : "Arriving " + Z.fmtDate(order.delivery.eta);

  $("#confirmWrap").innerHTML =
    '<div class="confirm">' +
      '<span class="confirm__badge">' + Z.icons.check + "</span>" +
      "<h1>Thank you, " + esc(order.customer.name.split(" ")[0]) + "!</h1>" +
      '<p class="confirm__sub">' + (cod
        ? "Your order is confirmed. Please pay the rider in cash on delivery."
        : "Your order is confirmed and payment received. We're getting it ready now.") + "</p>" +
      '<p class="confirm__num"><span class="confirm__num-i" aria-hidden="true">' + Z.icons.arrow + "</span>" +
      "<span>Order " + esc(order.id) + "</span></p>" +

      '<div class="confirm__card">' +
        '<div class="confirm__row"><span>Order date</span><b>' + Z.fmtDate(order.createdAt) + "</b></div>" +
        '<div class="confirm__row"><span>Payment</span><b>' + esc(Z.methodLabel(order.payment.method)) +
          (paid ? " · " + esc(order.payment.ref) : " · due on delivery") + "</b></div>" +
        '<div class="confirm__row"><span>Delivery</span><b>' + esc(order.delivery.name) + "</b></div>" +
        '<div class="confirm__row"><span>' + (order.delivery.method === "pickup" ? "Pickup at" : "Delivering to") + "</span><b>" +
          esc([order.address.area, order.address.town, order.address.county].filter(Boolean).join(", ")) + "</b></div>" +
        '<div class="confirm__row"><span>' + esc(order.delivery.note) + "</span><b>" + esc(eta) + "</b></div>" +
      "</div>" +

      '<div class="confirm__card">' +
        order.items.map(function (i) {
          return '<div class="confirm__row"><span>' + esc(i.name) +
            (i.size || i.color ? " · " + esc([i.size, i.color].filter(Boolean).join(", ")) : "") +
            " × " + i.qty + "</span><b>" + money(i.price * i.qty) + "</b></div>";
        }).join("") +
        '<div class="sumline"><span>Subtotal</span><b>' + money(order.totals.subtotal) + "</b></div>" +
        '<div class="sumline"><span>Delivery</span><b>' + (order.totals.delivery ? money(order.totals.delivery) : "FREE") + "</b></div>" +
        (order.totals.discount
          ? '<div class="sumline"><span>Discount' + (order.coupon ? " (" + esc(order.coupon) + ")" : "") + "</span><b style=\"color:var(--green)\">−" + money(order.totals.discount) + "</b></div>"
          : "") +
        '<div class="sumline sumline--total"><span>Total</span><b>' + money(order.totals.total) + "</b></div>" +
      "</div>" +

      '<div class="notice notice--info" style="text-align:left">' + Z.icons.bell +
        "<span><b>We've sent a confirmation</b> A summary has been recorded in your " +
        '<a href="account.html#notifications">notifications</a> and account order history. ' +
        "In a live store this would arrive by SMS and email.</span></div>" +

      '<div class="confirm__acts">' +
        '<a class="btn btn--primary" href="track.html?order=' + encodeURIComponent(order.id) + '">Track this order</a>' +
        '<a class="btn btn--ghost" href="account.html#orders">View my orders</a>' +
        '<a class="btn btn--ghost" href="shop.html">Continue shopping</a>' +
      "</div></div>";

  var steps = [
    { t: "Payment confirmed", b: paid || cod
      ? (cod ? "Pay the rider in cash when your parcel arrives." : "We received your " + Z.methodLabel(order.payment.method) + " payment.")
      : "We're holding your order while payment clears." },
    { t: "We prepare your gifts", b: "Personalization and wrapping are done in our Nairobi workshop." },
    { t: "Dispatched by ZED Express", b: "You'll get a tracking number and a call from the rider." },
    { t: "Delivered " + Z.fmtDate(order.delivery.eta), b: "Check the items, then rate your order to help others." }
  ];
  $("#nextSteps").innerHTML = steps.map(function (s) {
    return '<div class="cardline"><b>' + esc(s.t) + "</b><span>" + esc(s.b) + "</span></div>";
  }).join("");

  $("#alsoLike").innerHTML = Z.products.filter(function (p) {
    return order.items.every(function (i) { return i.id !== p.id; });
  }).slice(0, 4).map(function (p) { return Z.cardHTML(p); }).join("");
})();