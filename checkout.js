/* =========================================================
   ZED Gift Shop — checkout (simulated payment)
   Steps: 1 Contact → 2 Delivery → 3 Payment → 4 Review
   ========================================================= */
(function () {
  "use strict";
  var Z = window.ZED;
  if (!Z) return;
  var $ = Z.$, esc = Z.esc, money = Z.money, Cart = Z.cart;

  if (!Cart.lines().length) {
    $("#coWrap").innerHTML =
      '<div class="cartsummary" style="position:static;max-width:560px;margin-inline:auto">' +
      '<div class="empty-state"><p class="empty-state__e" aria-hidden="true">🛒</p>' +
      "<h2>Nothing to check out yet</h2>" +
      '<p style="color:var(--muted);margin:10px 0 20px">Add something to your cart first.</p>' +
      '<a class="btn btn--primary btn--lg" href="shop.html">Browse gifts</a></div></div>';
    return;
  }

  var STEP = 1;
  var data = {
    name: "", phone: "", email: "",
    zone: "nairobi", express: false, instructions: "",
    method: "mpesa", cardName: "", cardNumber: "", cardExp: "", cardCvv: "",
    bankRef: ""
  };
  if (Z.db.user) {
    data.name = Z.db.user.name || "";
    data.email = Z.db.user.email || "";
    data.phone = Z.db.user.phone || "";
  }
  var addr = Z.db.addresses[0];
  if (addr) {
    data.zone = /mombasa|kisumu|nakuru|naivasha|kakamega|garissa|bungoma|kisii|meru|nyeri|thika|machakos/i.test(addr.county + " " + addr.town)
      ? "country" : "nairobi";
    data.instructions = addr.instructions || "";
  }

  function errs() {
    var e = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) e.email = "Enter a valid email address.";
    if (!/^\+?[\d\s-]{9,}$/.test(data.phone)) e.phone = "Enter a valid phone number.";
    if (data.name.trim().length < 2) e.name = "Enter the recipient's full name.";

    var a = $("#adStreet");
    if (a) {
      if (!data.address) e.address = "Enter the street or estate name.";
      if (!data.county) e.county = "Choose a county.";
      if (!data.town) e.town = "Enter a town or city.";
      if (!data.area) e.area = "Enter an area or neighbourhood.";
      if (!data.addrPhone && !data.phone) e.addrPhone = "Add a phone number for the rider.";
    }
    if (data.method === "card") {
      var digits = data.cardNumber.replace(/\D/g, "");
      if (digits.length < 13 || digits.length > 19) e.cardNumber = "Enter a valid card number.";
      if (!/^\d{2}\/\d{2}$/.test(data.cardExp)) e.cardExp = "Use MM/YY format.";
      if (!/^\d{3,4}$/.test(data.cardCvv)) e.cardCvv = "Enter the 3 or 4 digit CVV.";
      if (!data.cardName.trim()) e.cardName = "Enter the name on the card.";
    }
    if (data.method === "bank") {
      if (!data.bankPhone || !/^\+?[\d\s-]{9,}$/.test(data.bankPhone)) e.bankPhone = "Enter the M-Pesa number we should prompt.";
    }
    return e;
  }

  function field(id, label, val, opts) {
    opts = opts || {};
    var e = opts.err;
    return '<div class="field">' +
      '<label for="' + id + '">' + esc(label) + "</label>" +
      (opts.area
        ? '<textarea class="textarea" id="' + id + '"' + (e ? ' aria-invalid="true"' : "") + ">" + esc(val || "") + "</textarea>"
        : '<input class="input" id="' + id + '" type="' + (opts.type || "text") + '" value="' + esc(val || "") + '"' +
          (opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : "") +
          (opts.mode ? ' inputmode="' + opts.mode + '"' : "") +
          (opts.auto ? ' autocomplete="' + opts.auto + '"' : "") +
          (e ? ' aria-invalid="true"' : "") + ">") +
      (opts.hint ? '<span class="hint">' + esc(opts.hint) + "</span>" : "") +
      (e ? '<span class="err">' + esc(e) + "</span>" : "") +
      "</div>";
  }

  function steps() {
    var names = ["Contact", "Delivery", "Payment", "Review"];
    return '<ol class="steps">' + names.map(function (n, i) {
      var num = i + 1;
      return '<li class="step' + (num === STEP ? " is-on" : num < STEP ? " is-done" : "") + '"' +
        (num === STEP ? ' aria-current="step"' : "") + ">" +
        '<span class="step__n">' + (num < STEP ? "✓" : num) + "</span>" + esc(n) + "</li>";
    }).join("") + "</ol>";
  }

  function sumPanel() {
    var sub = Cart.subtotal();
    var del = Z.deliveryFor(sub, data.zone, data.express);
    var fee = Cart.shippingWaived(sub, del.fee) ? 0 : del.fee;
    var disc = Cart.discount(sub, fee);
    var total = Math.max(0, sub + fee - disc);
    return '<aside class="cartsummary" aria-labelledby="coSumH">' +
      '<h2 class="ttl" id="coSumH" style="font-size:18px;margin-bottom:12px">Your order</h2>' +
      '<div class="stack" style="gap:10px;margin-bottom:14px">' +
        Cart.lines().map(function (l) {
          var p = Z.byId(l.id);
          return '<div style="display:flex;gap:10px;align-items:center">' +
            '<span style="width:44px;height:44px;border-radius:6px;overflow:hidden;flex-shrink:0;background:var(--soft)">' + Z.art(p.a, p.s) + "</span>" +
            '<span style="flex:1;min-width:0"><b style="display:block;font-size:13.5px;color:var(--ink)">' + esc(p.n) + "</b>" +
            '<span style="font-size:12px;color:var(--muted)">' + esc(Z.variantLabel(l)) + " × " + l.qty + "</span></span>" +
            '<b style="font-size:13.5px">' + money(p.p * l.qty) + "</b></div>";
        }).join("") + "</div>" +
      '<div class="sumline"><span>Subtotal</span><b>' + money(sub) + "</b></div>" +
      '<div class="sumline"><span>' + esc(del.name) + "</span><b>" + (fee ? money(fee) : "FREE") + "</b></div>" +
      (disc > 0 ? '<div class="sumline"><span>Discount' + (Z.db.coupon ? " (" + esc(Z.db.coupon) + ")" : "") + "</span><b style=\"color:var(--green)\">−" + money(disc) + "</b></div>" : "") +
      '<div class="sumline sumline--total"><span>Total</span><b>' + money(total) + "</b></div>" +
      '<p style="font-size:12px;color:var(--muted);margin-top:10px">Estimated arrival: ' +
        esc(Z.fmtDate(Z.addDays(del.days))) + "</p>" +
      "</aside>";
  }

  /* ---------------- step panels ---------------- */
  function panelContact() {
    var e = errs();
    return '<div class="co__panel is-on" data-panel="1">' +
      '<div class="copanel__hd"><h2>Contact details</h2>' +
        "<p>We use these to send your confirmation and delivery updates.</p></div>" +
      '<div class="notice notice--info">' + Z.icons.user +
        "<span><b>Already ordered with us?</b> <a href=\"account.html\">Sign in</a> to use your saved details. This demo stores everything locally in your browser.</span></div>" +
      '<div class="grid-2">' +
        field("ctName", "Full name", data.name, { err: e.name, auto: "name" }) +
        field("ctPhone", "Phone number", data.phone, { err: e.phone, mode: "tel", ph: "07xx xxx xxx", auto: "tel", hint: "The rider calls this number on delivery." }) +
        field("ctEmail", "Email address", data.email, { err: e.email, type: "email", ph: "you@example.com", auto: "email" }) +
      "</div>" +
      (Z.db.addresses.length
        ? '<div class="field"><label for="ctSaved">Saved address</label>' +
          '<select class="select" id="ctSaved"><option value="">Enter a new address</option>' +
          Z.db.addresses.map(function (a) {
            return '<option value="' + a.id + '">' + esc(a.name + " — " + a.area + ", " + a.town + ", " + a.county) + "</option>";
          }).join("") + "</select></div>"
        : "") +
      "</div>";
  }

  function panelDelivery() {
    var e = errs();
    var sub = Cart.subtotal();
    var opts = [
      { id: "nairobi", n: "Nairobi, same day", note: "Order before 2pm for same-day delivery", fee: 450, days: 0 },
      { id: "nairobiStandard", n: "Nairobi, next day", note: "Delivered tomorrow", fee: 250, days: 1 },
      { id: "country", n: "Rest of Kenya", note: "Delivered in 1–2 days to any county", fee: 350, days: 2 },
      { id: "pickup", n: "Pick up at our store", note: "Ready in 2 hours — Nairobi CBD", fee: 0, days: 0 }
    ];
    return '<div class="co__panel is-on" data-panel="2">' +
      '<div class="copanel__hd"><h2>Delivery address</h2>' +
        "<p>Where should we deliver your gift?</p></div>" +
      '<div class="grid-2">' +
        field("adPhone", "Phone for the rider", data.addrPhone || data.phone, { err: e.addrPhone, mode: "tel" }) +
        '<div class="field"><label for="adCountyPick">County</label>' +
        '<select class="select" id="adCountyPick"><option value="">Select a county</option>' +
        Z.counties.map(function (c) { return '<option' + (data.county === c ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") +
      "</select>" +
        (e.county ? '<span class="err">' + esc(e.county) + "</span>" : "") +
      "</div></div>" +
      '<div class="grid-2">' +
        field("adTown", "Town / city", data.town, { err: e.town, auto: "address-level2" }) +
        field("adArea", "Area / neighbourhood", data.area, { err: e.area }) +
      "</div>" +
      field("adStreet", "Street, estate or building", data.address, { err: e.address, area: true, ph: "e.g. Limuru Road, Apt 4B" }) +
      field("adNotes", "Delivery notes (optional)", data.instructions, { ph: "Gate code, landmark, best time to deliver" }) +
      '<div class="field"><p class="optgroup__l"><span>Delivery speed</span></p>' +
        '<div class="stack">' + opts.map(function (o) {
          var on = (o.id === "nairobi" && data.express) ||
            (o.id !== "nairobi" && data.zone === o.id && !data.express);
          var freeEl = o.id === "nairobiStandard" && sub >= 3000;
          return '<label class="delivery-opt' + (on ? " is-on" : "") + '">' +
            '<input type="radio" name="zone" value="' + o.id + '"' + (on ? "checked" : "") + ">" +
            '<span class="delivery-opt__m"><b>' + esc(o.n) + "</b><span>" + esc(o.note) + "</span></span>" +
            '<span class="delivery-opt__p">' + (freeEl ? "FREE" : o.fee ? money(o.fee) : "FREE") + "</span></label>";
        }).join("") + "</div></div>" +
      "</div>";
  }

  function panelPayment() {
    var e = errs();
    var methods = [
      { id: "mpesa", logo: "M-PESA", t: "M-Pesa", note: "Prompt sent to your phone. Approve with your PIN." },
      { id: "card", logo: "CARD", t: "Credit or debit card", note: "Visa, Mastercard or American Express." },
      { id: "bank", logo: "BANK", t: "Bank transfer", note: "We send instructions, then confirm when it clears." },
      { id: "cod", logo: "COD", t: "Cash on delivery", note: "Pay the rider in cash when your order arrives." }
    ];
    var fields = "";
    if (data.method === "mpesa") {
      fields =
        '<div class="notice notice--info">' + Z.icons.phone +
          "<span><b>How the demo works.</b> Enter any M-Pesa number. We simulate the STK push and confirmation. Numbers ending in 0 or 1 are declined about a quarter of the time so you can practise the retry path.</span></div>" +
        field("payPhone", "M-Pesa number", data.payPhone || data.phone, { err: e.payPhone, mode: "tel", ph: "07xx xxx xxx" });
    } else if (data.method === "card") {
      fields =
        '<div class="notice notice--warn">' + Z.icons.check +
          "<span><b>Test cards.</b> Any 16-digit number succeeds except <b>...0002</b> (declined) and <b>...0069</b> (expired card). Nothing is charged.</span></div>" +
        field("payCardName", "Name on card", data.cardName, { err: e.cardName, auto: "cc-name" }) +
        field("payCardNumber", "Card number", data.cardNumber, { err: e.cardNumber, mode: "numeric", ph: "4242 4242 4242 4242", auto: "cc-number" }) +
        '<div class="grid-2">' +
          field("payCardExp", "Expiry (MM/YY)", data.cardExp, { err: e.cardExp, ph: "08/29", auto: "cc-exp" }) +
          field("payCardCvv", "CVV", data.cardCvv, { err: e.cardCvv, type: "password", mode: "numeric", ph: "123", auto: "cc-csc" }) +
        "</div>";
    } else if (data.method === "bank") {
      fields =
        '<div class="notice notice--info">' + Z.icons.check +
          "<span><b>How the demo works.</b> We show bank details, then you confirm the transfer to move the order forward.</span></div>" +
        field("payBankPhone", "M-Pesa number to prompt", data.bankPhone || data.phone, { err: e.bankPhone, mode: "tel", ph: "07xx xxx xxx" }) +
        '<dl class="pv__spec"><div><dt>Bank</dt><dd>Equity Bank Kenya</dd></div>' +
        '<div><dt>Account name</dt><dd>ZED Gift Shop Ltd</dd></div>' +
        '<div><dt>Account number</dt><dd>0123 456 789</dd></div>' +
        '<div><dt>Branch</dt><dd>Westlands</dd></div></dl>';
    } else {
      fields =
        '<div class="notice notice--warn">' + Z.icons.check +
          "<span><b>Cash on delivery.</b> Please have the exact amount ready: <b>" +
          money(Math.max(0, Cart.subtotal() + Z.deliveryFor(Cart.subtotal(), data.zone, data.express).fee - Cart.discount(Cart.subtotal(), Z.deliveryFor(Cart.subtotal(), data.zone, data.express).fee))) +
          "</b>. Our rider can issue a receipt for cash orders.</span></div>";
    }

    return '<div class="co__panel is-on" data-panel="3">' +
      '<div class="copanel__hd"><h2>Payment method</h2>' +
        "<p>Choose how you would like to pay. This is a demonstration — no real money moves.</p></div>" +
      '<div class="stack">' + methods.map(function (m) {
        return '<label class="pay-opt' + (data.method === m.id ? " is-on" : "") + '">' +
          '<input type="radio" name="method" value="' + m.id + '"' + (data.method === m.id ? "checked" : "") + ">" +
          '<span class="pay-opt__logo">' + esc(m.logo) + "</span>" +
          '<span class="delivery-opt__m"><b>' + esc(m.t) + "</b><span>" + esc(m.note) + "</span></span></label>";
      }).join("") + "</div>" +
      '<div class="pay-fields">' + fields + "</div>" +
      "</div>";
  }

  function panelReview() {
    var sub = Cart.subtotal();
    var del = Z.deliveryFor(sub, data.zone, data.express);
    var fee = Cart.shippingWaived(sub, del.fee) ? 0 : del.fee;
    var disc = Cart.discount(sub, fee);
    var rows = [
      ["Contact", data.name + " · " + data.phone],
      ["Email", data.email],
      ["Deliver to", [data.address, data.area, data.town, data.county].filter(Boolean).join(", ") || "—"],
      ["Delivery", del.name + (data.instructions ? " · " + data.instructions : "")],
      ["Payment", Z.methodLabel(data.method)]
    ];
    return '<div class="co__panel is-on" data-panel="4">' +
      '<div class="copanel__hd"><h2>Review your order</h2>' +
        "<p>Check everything is right, then place your order.</p></div>" +
      '<div class="confirm__card">' + rows.map(function (r) {
        return '<div class="confirm__row"><span>' + esc(r[0]) + "</span><b>" + esc(r[1] || "—") + "</b></div>";
      }).join("") +
      '<div class="sumline sumline--total"><span>Total to pay</span><b>' + money(Math.max(0, sub + fee - disc)) + "</b></div></div>" +
      '<label class="check"><input type="checkbox" id="coTerms" checked>' +
        "<span>I confirm the delivery details are correct and accept the terms of sale and returns policy.</span></label>" +
      '<p class="err--box" id="coErr" hidden>Please accept the terms to continue.</p>' +
      "</div>";
  }

  function render() {
    var host = $("#coWrap");
    var panels = { 1: panelContact, 2: panelDelivery, 3: panelPayment, 4: panelReview };
    var body = steps() +
      '<div class="co"><div>' + panels[STEP]() +
        '<div class="pdp__buy" style="margin-top:22px">' +
          (STEP > 1 ? '<button class="btn btn--ghost" type="button" data-prev>Back</button>' : "") +
          (STEP < 4
            ? '<button class="btn btn--primary" type="button" data-next>Continue</button>'
            : '<button class="btn btn--primary" type="button" data-place>' +
              (data.method === "cod" ? "Place order · pay on delivery" : "Place order &amp; pay " + money(Math.max(0, Cart.subtotal() + Z.deliveryFor(Cart.subtotal(), data.zone, data.express).fee - Cart.discount(Cart.subtotal(), Z.deliveryFor(Cart.subtotal(), data.zone, data.express).fee)))) +
              "</button>") +
        "</div></div>" + sumPanel() + "</div>";
    host.innerHTML = body;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* collect what the current step needs */
  function collect() {
    /* only read fields that exist on the current step — otherwise advancing
       would wipe values captured on an earlier step */
    var v = function (id) { var el = $("#" + id); return el ? el.value.trim() : null; };
    var take = function (id, key) { var val = v(id); if (val !== null) data[key] = val; };

    take("ctName", "name");
    take("ctPhone", "phone");
    take("ctEmail", "email");
    take("adPhone", "addrPhone");
    take("adStreet", "address");
    take("adTown", "town");
    take("adArea", "area");
    take("adNotes", "instructions");
    take("payCardName", "cardName");
    take("payCardNumber", "cardNumber");
    take("payCardExp", "cardExp");
    take("payCardCvv", "cardCvv");
    take("payPhone", "payPhone");
    take("payBankPhone", "bankPhone");

    if (data.addrPhone && !data.addrPhone.trim()) data.addrPhone = data.phone;
    if (data.payPhone && !data.payPhone.trim()) data.payPhone = data.phone;
  }

  function validateStep() {
    collect();
    var e = errs();
    var keys = { 1: ["name", "phone", "email"], 2: ["address", "county", "town", "area", "addrPhone"],
      3: ["cardNumber", "cardExp", "cardCvv", "cardName", "payPhone", "bankPhone"], 4: [] }[STEP];
    var firstBad = keys.filter(function (k) { return e[k]; })[0];
    if (!firstBad) return true;
    Z.toast(e[firstBad], "error");
    var focusMap = { name: "ctName", phone: "ctPhone", email: "ctEmail", address: "adStreet",
      county: "adCountyPick", town: "adTown", area: "adArea", addrPhone: "adPhone",
      cardNumber: "payCardNumber", cardExp: "payCardExp", cardCvv: "payCardCvv",
      cardName: "payCardName", payPhone: "payPhone", bankPhone: "payBankPhone" };
    var el = $("#" + (focusMap[firstBad] || ""));
    if (el) { el.focus(); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
    return false;
  }

  /* ---------------- events ---------------- */
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-next]")) {
      if (!validateStep()) return;
      STEP++; render(); return;
    }
    if (e.target.closest("[data-prev]")) {
      collect(); STEP--; render(); return;
    }
    if (e.target.closest("[data-place]")) {
      collect();
      if (!$("#coTerms").checked) {
        var box = $("#coErr");
        box.hidden = false;
        $("#coTerms").focus();
        return;
      }
      place();
      return;
    }
  });

  document.addEventListener("change", function (e) {
    if (e.target.name === "zone") {
      collect();
      data.zone = e.target.value;
      data.express = data.zone === "nairobi";
      render();
    }
    if (e.target.name === "method") {
      collect();
      data.method = e.target.value;
      render();
    }
    if (e.target.id === "ctSaved" && e.target.value) {
      var a = Z.db.addresses.filter(function (x) { return x.id === e.target.value; })[0];
      if (a) {
        data.name = a.name; data.phone = a.phone; data.address = a.street;
        data.area = a.area; data.town = a.town; data.county = a.county; data.instructions = a.instructions || "";
      }
      render();
    }
    if (e.target.id === "adCountyPick") { data.county = e.target.value; }
  });

  /* ---- place order + simulated payment ---- */
  function place() {
    var host = $("#coWrap");
    host.innerHTML = '<div class="cartsummary" style="position:static;max-width:560px;margin-inline:auto">' +
      '<div class="processing"><span class="spinner" aria-hidden="true"></span>' +
      "<h2>Processing your payment…</h2>" +
      '<p style="color:var(--muted)">' + esc(data.method === "mpesa"
        ? "We have sent a payment request to your phone. Approve it with your PIN."
        : data.method === "card"
          ? "Confirming with your bank…"
          : data.method === "bank"
            ? "Confirming your transfer…"
            : "Confirming your order…") + "</p></div></div>";

    var order = Z.createOrder({
      name: data.name, phone: data.phone, email: data.email, method: data.method,
      zone: data.zone, express: data.express,
      address: {
        name: data.name, phone: data.addrPhone || data.phone, county: data.county,
        town: data.town, area: data.area, street: data.address, instructions: data.instructions
      }
    });
    sessionStorage.setItem("zed.pending", order.id);

    var card = {
      phone: data.payPhone || data.phone, number: data.cardNumber,
      exp: data.cardExp, cvv: data.cardCvv, name: data.cardName
    };

    Z.payOrder(order, data.method, card).then(function (res) {
      if (res.ok) {
        /* cash-on-delivery orders keep their items out of the paid basket too,
           so the cart always reflects unpaid or unpurchased items only */
        while (Z.cart.count()) Z.cart.remove(0);
        Cart.clear();
        Z.refreshCarts();
        sessionStorage.setItem("zed.last", order.id);
        location.href = "confirmation.html?order=" + encodeURIComponent(order.id);
      } else {
        host.innerHTML = "";
        render();
        showFailure(order, res.reason);
      }
    });
  }

  function showFailure(order, reason) {
    var host = $("#coWrap");
    var panel = $(".co");
    var box = document.createElement("div");
    box.className = "cartsummary payfail";
    box.style.cssText = "position:static;max-width:560px;margin:20px auto 0;border-color:#c62828";
    box.innerHTML =
      '<span class="payfail__badge">' + Z.icons.x + "</span>" +
      "<h2 style=\"font-size:19px;margin:12px 0 6px;color:var(--ink)\">Payment didn't go through</h2>" +
      "<p style=\"color:var(--body);font-size:14.5px\">" + esc(reason) + "</p>" +
      '<p style="font-size:13px;color:var(--muted);margin-top:8px">Order <b>' + esc(order.id) + "</b> is saved as pending payment. " +
      "Try another payment method or attempt again — nothing has been charged.</p>" +
      '<div class="hero__cta" style="margin-top:16px">' +
      '<button class="btn btn--primary" type="button" data-retry>Try again</button>' +
      '<a class="btn btn--ghost" href="cart.html">Back to cart</a></div>';
    host.appendChild(box);
    box.scrollIntoView({ behavior: "smooth", block: "center" });
    Z.toast("Payment failed — " + reason, "error");
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-retry]")) {
      STEP = 3;
      render();
    }
  });

  render();
})();