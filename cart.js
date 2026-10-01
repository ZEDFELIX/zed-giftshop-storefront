/* =========================================================
   ZED Gift Shop — cart page
   ========================================================= */
(function () {
  "use strict";
  var Z = window.ZED;
  if (!Z) return;
  var $ = Z.$, esc = Z.esc, money = Z.money, Cart = Z.cart;

  var ZONE = "nairobi";

  function summaryHTML(sub, fee, disc) {
    var c = Z.db.coupon;
    var freeShip = Cart.shippingWaived(sub, fee);
    return '<h2 class="ttl" id="sumH" style="font-size:18px;margin-bottom:12px">Order summary</h2>' +
      (c
        ? '<div class="coupon-applied"><span>' + esc(c) + " — " + esc(Z.coupons[c].label) + "</span>" +
          '<button class="linkbtn" type="button" data-coupon-clear>Remove</button></div>'
        : '<div class="couponrow">' +
            '<label class="sr-only" for="cpCode">Promo code</label>' +
            '<input class="input" id="cpCode" placeholder="Promo code (try ZED10)" autocomplete="off">' +
            '<button class="btn btn--ghost" type="button" data-coupon-apply>Apply</button></div>') +
      '<div class="sumline"><span>Subtotal (' + Cart.count() + " item" + (Cart.count() === 1 ? "" : "s") + ")</span><b>" + money(sub) + "</b></div>" +
      '<div class="sumline"><span>Delivery' + (freeShip ? " (free)" : "") + "</span><b>" + (freeShip ? "FREE" : money(fee)) + "</b></div>" +
      (disc > 0 ? '<div class="sumline"><span>Discount</span><b style="color:var(--green)">−' + money(disc) + "</b></div>" : "") +
      '<div class="sumline sumline--total"><span>Total</span><b>' + money(Math.max(0, sub + fee - disc)) + "</b></div>" +
      '<a class="btn btn--primary btn--full btn--lg" href="checkout.html">Proceed to checkout</a>' +
      '<p style="margin-top:12px;font-size:12.5px;color:var(--muted);text-align:center">Secure checkout · M-Pesa, card, bank transfer or cash on delivery</p>';
  }

  function deliveryOptions(sub) {
    return Object.keys(Z.delivery).map(function (k) {
      var o = Z.delivery[k];
      var disabled = o.id === "free" && sub < 3000;
      return '<label class="delivery-opt' + (ZONE === k ? " is-on" : "") + '">' +
        '<input type="radio" name="zone" value="' + o.id + '"' + (ZONE === o.id ? "checked" : "") +
        (disabled ? " disabled" : "") + ">" +
        '<span class="delivery-opt__m"><b>' + esc(o.name) + "</b><span>" + esc(o.note) + "</span></span>" +
        '<span class="delivery-opt__p">' + (o.fee === 0 ? "FREE" : money(o.fee)) + "</span></label>";
    }).join("");
  }

  function render() {
    var wrap = $("#cartWrap");
    var lines = Cart.lines();

    if (!lines.length) {
      $("#cartLead").textContent = "Your cart is empty.";
      /* saved-for-later stays reachable even with an empty cart */
      wrap.innerHTML =
        '<div class="empty-state" style="padding:60px 20px">' +
          '<p class="empty-state__e" aria-hidden="true">🛒</p>' +
          "<h2>Your cart is empty</h2>" +
          '<p style="color:var(--muted);margin:10px 0 22px">Browse our gifts and add something thoughtful.</p>' +
          '<a class="btn btn--primary btn--lg" href="shop.html">Start shopping</a></div>' +
        savedHTML();
      $("#crossSell").innerHTML = Z.products.slice(0, 4).map(function (p) { return Z.cardHTML(p); }).join("");
      return;
    }

    var sub = Cart.subtotal();
    var del = Z.deliveryFor(sub, ZONE);
    var fee = Cart.shippingWaived(sub, del.fee) ? 0 : del.fee;
    var disc = Cart.discount(sub, fee);

    $("#cartLead").textContent = Cart.count() + " item" + (Cart.count() === 1 ? "" : "s") + " · " + money(sub) + " subtotal";

    wrap.innerHTML =
      '<div class="cartwrap">' +
        '<div>' +
          '<div class="cartlist">' + lines.map(function (l, i) {
            var p = Z.byId(l.id);
            if (!p) return "";
            return '<article class="cartrow" data-i="' + i + '">' +
              '<a class="cartrow__img" href="product.html?id=' + p.id + '" aria-label="View ' + esc(p.n) + '">' +
              Z.art(p.a, p.s) + "</a>" +
              "<div>" +
                '<p class="cartrow__c"><a href="product.html?id=' + p.id + '">' + esc(p.c) + "</a></p>" +
                '<h2 class="cartrow__t"><a href="product.html?id=' + p.id + '">' + esc(p.n) + "</a></h2>" +
                '<p class="cartrow__m">' + esc(Z.variantLabel(l)) + (p.st <= 5 ? ' · <span style="color:var(--gold);font-weight:700">only ' + p.st + " left</span>" : "") + "</p>" +
                '<div class="cartrow__row">' +
                  '<div class="qty-pick"><button type="button" data-dec aria-label="Decrease quantity">−</button>' +
                    "<b>" + l.qty + '</b><button type="button" data-inc aria-label="Increase quantity">+</button></div>' +
                  '<b style="font-size:16px">' + money(p.p * l.qty) + "</b></div>" +
                '<div class="cartrow__acts">' +
                  '<button class="linkbtn" type="button" data-save>Save for later</button>' +
                  '<button class="linkbtn" type="button" data-remove>Remove</button></div>' +
              "</div></article>";
          }).join("") + "</div>" +

          '<section class="cartsummary" style="position:static;margin-top:22px" aria-labelledby="zoneH">' +
            '<h2 class="ttl" id="zoneH" style="font-size:18px;margin-bottom:12px">Delivery option</h2>' +
            '<div class="stack">' + deliveryOptions(sub) + "</div></section>" +
        "</div>" +

        '<aside class="cartsummary" aria-labelledby="sumH">' + summaryHTML(sub, fee, disc) + "</aside>" +
      "</div>" +

      savedHTML();
  }

  /* saved-for-later list, shown under the cart whenever anything is saved */
  function savedHTML() {
    if (!Z.db.saved.length) return "";
    return '<section class="sec sec--tight" aria-labelledby="savedH">' +
      '<h2 class="ttl" id="savedH">Saved for later (' + Z.db.saved.length + ")</h2>" +
      '<div class="cartlist" style="margin-top:14px">' + Z.db.saved.map(function (l, i) {
        var p = Z.byId(l.id);
        if (!p) return "";
        return '<article class="cartrow" data-s="' + i + '">' +
          '<div class="cartrow__img">' + Z.art(p.a, p.s) + "</div>" +
          '<div><h2 class="cartrow__t">' + esc(p.n) + "</h2>" +
          '<p class="cartrow__m">' + esc(Z.variantLabel(l)) + " · " + money(p.p * l.qty) + "</p>" +
          '<div class="cartrow__acts">' +
            '<button class="abtn abtn--sm" type="button" data-move>Move to cart</button>' +
            '<button class="linkbtn" type="button" data-dropsave>Remove</button></div>' +
          "</div></article>";
      }).join("") + "</div></section>";
  }

  /* ---------------- events ---------------- */
  document.addEventListener("click", function (e) {
    var el;
    if ((el = e.target.closest(".cartrow[data-i]"))) {
      var i = Number(el.getAttribute("data-i"));
      if (e.target.closest("[data-inc]")) {
        var r = Cart.setQty(i, Cart.lines()[i].qty + 1);
        if (!r.ok) Z.toast(r.msg, "error"); else render();
        return;
      }
      if (e.target.closest("[data-dec]")) {
        var q = Cart.lines()[i].qty - 1;
        if (q < 1) Cart.remove(i); else Cart.setQty(i, q);
        render(); Z.refreshCarts(); return;
      }
      if (e.target.closest("[data-remove]")) {
        Cart.remove(i); render(); Z.refreshCarts();
        Z.toast("Item removed from cart"); return;
      }
      if (e.target.closest("[data-save]")) {
        Cart.save(i); render(); Z.refreshCarts();
        Z.toast("Saved for later"); return;
      }
    }
    if ((el = e.target.closest(".cartrow[data-s]"))) {
      var si = Number(el.getAttribute("data-s"));
      if (e.target.closest("[data-move]")) {
        Cart.moveToCart(si); render(); Z.refreshCarts();
        Z.toast("Moved to cart"); return;
      }
      if (e.target.closest("[data-dropsave]")) {
        Z.db.saved.splice(si, 1); Z.persist(); render();
        Z.toast("Removed"); return;
      }
    }
    if (e.target.closest("[data-coupon-apply]")) {
      var r2 = Cart.applyCoupon($("#cpCode").value);
      if (r2.ok) { Z.toast("Promo code applied"); render(); Z.refreshCarts(); }
      else Z.toast(r2.msg, "error");
      return;
    }
    if (e.target.closest("[data-coupon-clear]")) {
      Cart.clearCoupon(); render(); Z.refreshCarts();
      Z.toast("Promo code removed"); return;
    }
  });

  Z.on($("#cartWrap"), "change", function (e) {
    if (e.target.name !== "zone") return;
    ZONE = e.target.value;
    render();
  });

  Z.on($("#cartWrap"), "keydown", function (e) {
    if (e.key === "Enter" && e.target.id === "cpCode") {
      e.preventDefault();
      var el = $("[data-coupon-apply]");
      if (el) el.click();
    }
  });

  /* cross-sell: same category as the first cart item */
  function crossSell() {
    var first = Cart.lines()[0];
    var base = first ? Z.byId(first.id) : null;
    var list = Z.products.filter(function (p) {
      return (!base || p.c === base.c) && p.st > 0;
    }).slice(0, 4);
    $("#crossSell").innerHTML = list.map(function (p) { return Z.cardHTML(p); }).join("");
  }

  document.addEventListener("zed:change", function () {
    Z.$$("#crossSell [data-wish]").forEach(function (b) {
      var on = Z.wish.has(b.getAttribute("data-wish"));
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  });

  render();
  crossSell();
})();