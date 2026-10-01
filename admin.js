/* =========================================================
   ZED Gift Shop — admin dashboard (demo)
   ========================================================= */
(function () {
  "use strict";
  var Z = window.ZED;
  if (!Z) return;
  var $ = Z.$, esc = Z.esc, money = Z.money;

  var host = $("#adminWrap");
  var PANELS = [
    { id: "orders", t: "Orders", render: function () { return paneOrders(); } },
    { id: "reviews", t: "Reviews", render: function () { return paneReviews(); } },
    { id: "catalogue", t: "Catalogue", render: function () { return paneCatalogue(); } },
    { id: "simulate", t: "Simulate fulfilment", render: function () { return paneSimulate(); } }
  ];
  var active = "orders";
  var filter = { status: "", q: "" };

  function stats() {
    var orders = Z.db.orders;
    var paid = orders.filter(function (o) { return o.payment.status === "paid"; });
    var revenue = paid.reduce(function (n, o) { return n + o.totals.total; }, 0);
    var open = orders.filter(function (o) {
      return ["DELIVERED", "CANCELLED", "REFUNDED"].indexOf(o.status) === -1;
    });
    var failed = orders.filter(function (o) { return o.payment.status === "failed"; });
    var pipeline = orders.reduce(function (n, o) { return n + (o.totals.subtotal || 0); }, 0);

    return '<div class="adminstats">' +
      '<div class="adminstat"><b>' + orders.length + "</b><span>Total orders</span></div>" +
      '<div class="adminstat"><b>' + money(revenue) + "</b><span>Collected revenue</span></div>" +
      '<div class="adminstat"><b>' + open.length + "</b><span>Open fulfilment</span></div>" +
      '<div class="adminstat' + (failed.length ? " adminstat--alert" : "") + '"><b>' + failed.length +
        "</b><span>Failed payments</span></div>" +
      '<div class="adminstat"><b>' + money(pipeline) + "</b><span>Merchandise value</span></div>" +
      "</div>";
  }

  function orderRow(o) {
    var meta = Z.statusMeta(o.status);
    var canAdvance = Z.timeline.indexOf(o.status) > -1 && Z.timeline.indexOf(o.status) < Z.timeline.length - 1;
    return "<tr>" +
      "<td><b>" + esc(o.id) + "</b><br><span style=\"font-size:12px;color:var(--muted)\">" +
        esc(Z.fmtDate(o.createdAt)) + "</span></td>" +
      "<td>" + esc(o.customer.name) + "<br><span style=\"font-size:12px;color:var(--muted)\">" +
        esc(o.address.area + ", " + o.address.town) + "</span></td>" +
      "<td>" + o.items.length + " item" + (o.items.length === 1 ? "" : "s") + "<br>" +
        '<span style="font-size:12px;color:var(--muted)">' + esc(Z.methodLabel(o.payment.method)) +
        (o.payment.status === "failed" ? " · FAILED" : o.payment.status === "unpaid" ? " · unpaid" : " · paid") +
        "</span></td>" +
      "<td><b>" + money(o.totals.total) + "</b></td>" +
      '<td><span class="badge-st st-' + esc(o.status) + '">' + esc(meta.label) + "</span>" +
        (o.tracking ? '<br><span style="font-size:11.5px;color:var(--muted);font-family:monospace">' + esc(o.tracking) + "</span>" : "") + "</td>" +
      '<td><div class="rowacts">' +
        (canAdvance ? '<button class="abtn abtn--sm" type="button" data-adv="' + esc(o.id) + '">Advance</button>' : "") +
        (o.payment.status === "unpaid" ? '<button class="abtn abtn--sm abtn--dark" type="button" data-markpaid="' + esc(o.id) + '">Mark paid</button>' : "") +
        '<button class="abtn abtn--sm abtn--line" type="button" data-detail="' + esc(o.id) + '">Details</button>' +
        (o.status === "PENDING_PAYMENT" || o.status === "PAID"
          ? '<button class="abtn abtn--sm abtn--line" type="button" data-cancel="' + esc(o.id) + '">Cancel</button>' : "") +
        (o.status === "DELIVERED"
          ? '<button class="abtn abtn--sm abtn--line" type="button" data-refund="' + esc(o.id) + '">Refund</button>' : "") +
      "</div></td></tr>";
  }

  /* the tab strip labels each panel visually, so these headings are sr-only */
  function paneHead(title) {
    return '<h2 class="sr-only">' + esc(title) + "</h2>";
  }

  function paneOrders() {
    var list = Z.db.orders.filter(function (o) {
      if (filter.status && o.status !== filter.status) return false;
      if (filter.q) {
        var hay = [o.id, o.customer.name, o.customer.phone, o.customer.email, o.tracking || ""].join(" ").toLowerCase();
        if (hay.indexOf(filter.q.toLowerCase()) === -1) return false;
      }
      return true;
    });
    return paneHead("Orders") + '<div class="adminbar">' +
        '<label class="sr-only" for="admQ">Search orders</label>' +
        '<input class="input" id="admQ" placeholder="Search order, customer, tracking…" value="' + esc(filter.q) + '">' +
        '<label class="sr-only" for="admSt">Filter by status</label>' +
        '<select class="select" id="admSt"><option value="">All statuses</option>' +
        Z.status.map(function (s) {
          return '<option value="' + s.id + '"' + (filter.status === s.id ? " selected" : "") + ">" + esc(s.label) + "</option>";
        }).join("") + "</select>" +
        '<span style="margin-left:auto;font-size:13px;color:var(--muted)">' + list.length + " order" +
        (list.length === 1 ? "" : "s") + "</span></div>" +
      '<div class="otablewrap"><table class="otable">' +
        "<thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>" +
        "<tbody>" + (list.length
          ? list.map(orderRow).join("")
          : '<tr><td colspan="6" style="padding:34px;text-align:center;color:var(--muted)">No orders match that search.</td></tr>') +
        "</tbody></table></div>";
  }

  function paneReviews() {
    var list = Z.db.reviews;
    if (!list.length) {
      return '<div class="empty-state"><p class="empty-state__e" aria-hidden="true">⭐</p>' +
        "<h2>No reviews yet</h2>" +
        '<p style="color:var(--muted);margin-top:8px">Customer reviews appear here as they are submitted.</p></div>';
    }
    var avg = list.reduce(function (n, r) { return n + r.rating; }, 0) / list.length;
    return paneHead("Reviews") + '<div class="adminbar"><span style="font-size:14px"><b>' + avg.toFixed(1) + "</b> average from " +
      list.length + " review" + (list.length === 1 ? "" : "s") + "</span></div>" +
      '<div class="stack">' + list.map(function (r) {
        var p = Z.byId(r.productId);
        return '<article class="revitem"><div class="revitem__top">' +
          "<span><b class=\"revitem__who\">" + esc(r.name) + "</b>" +
          '<span style="font-size:12.5px;color:var(--muted)"> on ' + esc(p ? p.n : r.productId) + " · " +
          esc(Z.fmtDate(r.at)) + "</span></span>" +
          '<span class="revitem__stars">' + Z.stars(r.rating) + "</span></div>" +
          "<p>" + esc(r.text) + "</p>" +
          (r.delivery ? '<p style="font-size:12.5px;color:var(--muted);margin-top:6px">Delivery rated ' + r.delivery + "/5</p>" : "") +
          '<div class="rowacts" style="margin-top:10px">' +
            '<button class="abtn abtn--sm abtn--line" type="button" data-delreview="' + esc(r.id) + '">Remove</button>' +
            (p ? '<a class="abtn abtn--sm abtn--line" href="product.html?id=' + p.id + '">View product</a>' : "") +
          "</div></article>";
      }).join("") + "</div>";
  }

  function paneCatalogue() {
    return paneHead("Catalogue") + '<div class="adminbar"><label class="sr-only" for="catQ">Search catalogue</label>' +
      '<input class="input" id="catQ" placeholder="Search products…"></div>' +
      '<div class="otablewrap"><table class="otable">' +
        "<thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Rating</th><th>Adjust stock</th></tr></thead>" +
        '<tbody id="catBody">' + Z.products.map(function (p) { return catRow(p); }).join("") + "</tbody>" +
      "</table></div>";

    function catRow(p) {
      return "<tr data-pid=\"" + p.id + "\">" +
        "<td><b>" + esc(p.n) + "</b><br><span style=\"font-size:12px;color:var(--muted)\">" + esc(p.brand) + " · " + p.id.toUpperCase() + "</span></td>" +
        "<td>" + esc(p.c) + "</td>" +
        "<td>" + money(p.p) + "</td>" +
        "<td><b data-stock>" + p.st + "</b></td>" +
        "<td>" + Z.stars(p.r) + " " + p.r.toFixed(1) + "</td>" +
        '<td><div class="qty-pick"><button type="button" data-stk="-1" aria-label="Decrease stock">−</button>' +
          '<b style="min-width:34px">' + p.st + "</b>" +
          '<button type="button" data-stk="1" aria-label="Increase stock">+</button></div></td></tr>';
    }
  }

  function paneSimulate() {
    var open = Z.db.orders.filter(function (o) {
      return ["DELIVERED", "CANCELLED", "REFUNDED"].indexOf(o.status) === -1;
    });
    if (!open.length) {
      return '<div class="empty-state"><p class="empty-state__e" aria-hidden="true">✅</p>' +
        "<h2>Nothing in the pipeline</h2>" +
        '<p style="color:var(--muted);margin-top:8px">Place an order, then use this panel to move it to delivered.</p></div>';
    }
    return paneHead("Simulate fulfilment") +
      '<div class="notice notice--info" style="margin-bottom:16px">' + Z.icons.check +
      "<span><b>Demo fulfilment.</b> Advancing a status simulates the courier and warehouse. The customer sees the update in tracking and notifications.</span></div>" +
      '<div class="stack">' + open.map(function (o) {
        var meta = Z.statusMeta(o.status);
        return '<article class="ordercard"><div class="ordercard__hd">' +
          "<div><span class=\"ordercard__num\">" + esc(o.id) + "</span>" +
          '<p style="font-size:12.5px;color:var(--muted);margin-top:3px">' + esc(o.customer.name) + " · " + money(o.totals.total) + "</p></div>" +
          '<span class="badge-st st-' + esc(o.status) + '">' + esc(meta.label) + "</span></div>" +
          '<p style="font-size:13.5px;color:var(--body);margin-top:10px">' + esc(meta.msg) + "</p>" +
          '<div class="rowacts" style="margin-top:12px">' +
            '<button class="abtn abtn--sm" type="button" data-adv="' + esc(o.id) + '">Advance to next stage</button>' +
            (o.payment.status === "unpaid"
              ? '<button class="abtn abtn--sm abtn--dark" type="button" data-markpaid="' + esc(o.id) + '">Mark payment received</button>'
              : "") +
            '<button class="abtn abtn--sm abtn--line" type="button" data-cancel="' + esc(o.id) + '">Cancel order</button>' +
          "</div></article>";
      }).join("") + "</div>";
  }

  function render() {
    host.innerHTML =
      stats() +
      '<div class="tabs-acct" role="tablist">' + PANELS.map(function (p) {
        return '<button class="tab-acct' + (p.id === active ? " is-on" : "") + '" type="button" role="tab" ' +
          'id="atab-' + p.id + '" aria-controls="apane-' + p.id + '" ' +
          'aria-selected="' + (p.id === active ? "true" : "false") + '" data-panel="' + p.id + '">' + esc(p.t) + "</button>";
      }).join("") + "</div>" +
      PANELS.map(function (p) {
        return '<div class="adminpanel' + (p.id === active ? " is-on" : "") + '" role="tabpanel" ' +
          'id="apane-' + p.id + '" aria-labelledby="atab-' + p.id + '" tabindex="0">' +
          p.render() + "</div>";
      }).join("");
  }

  function detail(id) {
    var o = Z.orderByNumber(id);
    if (!o) return;
    var box = document.createElement("div");
    box.className = "modal on";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Order " + id + " details");
    box.innerHTML =
      '<div class="modal__v" data-x></div>' +
      '<div class="modal__b" style="max-width:640px;padding:clamp(18px,3vw,26px)">' +
        '<button class="xbtn modal__x" type="button" data-x aria-label="Close">' + Z.icons.x + "</button>" +
        '<h2 class="ttl" style="font-size:20px">Order ' + esc(o.id) + "</h2>" +
        '<p style="font-size:13px;color:var(--muted);margin-top:4px">' +
          '<span class="badge-st st-' + esc(o.status) + '">' + esc(Z.statusMeta(o.status).label) + "</span></p>" +
        '<div style="margin-top:16px">' +
        o.items.map(function (i) {
          return '<div class="confirm__row"><span>' + esc(i.name) + " × " + i.qty + "</span><b>" + money(i.price * i.qty) + "</b></div>";
        }).join("") +
        '<div class="sumline sumline--total"><span>Total</span><b>' + money(o.totals.total) + "</b></div></div>" +
        '<dl class="pv__spec" style="margin-top:16px">' +
          "<div><dt>Customer</dt><dd>" + esc(o.customer.name) + "</dd></div>" +
          "<div><dt>Phone</dt><dd>" + esc(o.customer.phone) + "</dd></div>" +
          "<div><dt>Email</dt><dd>" + esc(o.customer.email || "—") + "</dd></div>" +
          "<div><dt>Payment</dt><dd>" + esc(Z.methodLabel(o.payment.method)) + " · " + esc(o.payment.status) +
            (o.payment.ref ? "<br>" + esc(o.payment.ref) : "") + "</dd></div>" +
          "<div><dt>Delivery</dt><dd>" + esc(o.delivery.name) + "</dd></div>" +
          "<div><dt>Address</dt><dd>" + esc([o.address.street, o.address.area, o.address.town, o.address.county].filter(Boolean).join(", ")) + "</dd></div>" +
          (o.courier ? "<div><dt>Courier</dt><dd>" + esc(o.courier) + " · " + esc(o.tracking) + "</dd></div>" : "") +
        "</dl>" +
        '<h3 class="ttl" style="font-size:15px;margin:18px 0 10px">History</h3>' +
        '<div class="tl">' + o.history.slice().reverse().map(function (h, i) {
          var meta = Z.statusMeta(h.status);
          return '<div class="tl__i ' + (i === 0 ? "is-now" : "is-done") + '">' +
            '<span class="tl__dot">' + Z.icons.check + "</span><span class=\"tl__line\"></span>" +
            '<div class="tl__b"><b>' + esc(meta.stage) + "</b><span>" + esc(h.note) + "</span>" +
            "<span>" + esc(Z.fmtDateTime(h.at)) + "</span></div></div>";
        }).join("") + "</div></div>";
    document.body.appendChild(box);
    document.body.classList.add("lock");
    Z.on(box, "click", function (e) {
      if (e.target.closest("[data-x]")) { box.remove(); document.body.classList.remove("lock"); }
    });
    document.addEventListener("keydown", function once(e) {
      if (e.key === "Escape") { box.remove(); document.body.classList.remove("lock"); document.removeEventListener("keydown", once); }
    });
  }

  /* ---------------- events ---------------- */
  document.addEventListener("click", function (e) {
    var el;
    if ((el = e.target.closest("[data-panel]"))) {
      active = el.getAttribute("data-panel");
      render();
      return;
    }
    if ((el = e.target.closest("[data-adv]"))) {
      var o = Z.orderByNumber(el.getAttribute("data-adv"));
      if (Z.advance(o)) {
        Z.toast(o.id + " → " + Z.statusMeta(o.status).label);
        render();
      } else Z.toast("That order has reached its final stage.", "error");
      return;
    }
    if ((el = e.target.closest("[data-markpaid]"))) {
      var o2 = Z.orderByNumber(el.getAttribute("data-markpaid"));
      o2.payment.status = "paid";
      o2.payment.paidAt = Date.now();
      o2.payment.ref = o2.payment.ref || "MANUAL-" + Math.random().toString(36).slice(2, 7).toUpperCase();
      Z.setStatus(o2, "PAID", "Payment confirmed (recorded manually).");
      Z.toast(o2.id + " marked paid");
      render();
      return;
    }
    if ((el = e.target.closest("[data-cancel]"))) {
      var o3 = Z.orderByNumber(el.getAttribute("data-cancel"));
      if (o3.status === "DELIVERED") { Z.toast("A delivered order cannot be cancelled.", "error"); return; }
      Z.setStatus(o3, "CANCELLED", "Cancelled by ZED Gift Shop.");
      if (o3.payment.status === "paid") o3.payment.status = "refunded";
      Z.toast(o3.id + " cancelled");
      render();
      return;
    }
    if ((el = e.target.closest("[data-refund]"))) {
      var o4 = Z.orderByNumber(el.getAttribute("data-refund"));
      o4.payment.status = "refunded";
      Z.setStatus(o4, "REFUNDED", "Refund processed to the original payment method.");
      Z.toast(o4.id + " refunded");
      render();
      return;
    }
    if ((el = e.target.closest("[data-detail]"))) { detail(el.getAttribute("data-detail")); return; }
    if ((el = e.target.closest("[data-delreview]"))) {
      Z.db.reviews = Z.db.reviews.filter(function (r) { return r.id !== el.getAttribute("data-delreview"); });
      Z.persist();
      Z.toast("Review removed");
      render();
      return;
    }
    if ((el = e.target.closest("[data-stk]"))) {
      var row = el.closest("[data-pid]");
      var p = Z.byId(row.getAttribute("data-pid"));
      var delta = Number(el.getAttribute("data-stk"));
      p.st = Math.max(0, p.st + delta);
      Z.persist();
      row.querySelector("[data-stock]").textContent = p.st;
      row.querySelector(".qty-pick b").textContent = p.st;
      Z.toast(p.n + " stock: " + p.st);
    }
  });

  Z.on(host, "input", Z.debounce(function (e) {
    if (e.target.id === "admQ") {
      filter.q = e.target.value;
      active = "orders";
      var sel = e.target.selectionStart;
      render();
      var again = $("#admQ");
      if (again) { again.focus(); again.setSelectionRange(sel, sel); }
      return;
    }
    if (e.target.id === "catQ") {
      var q = e.target.value.toLowerCase();
      Z.$$("#catBody tr").forEach(function (tr) {
        tr.hidden = q && tr.textContent.toLowerCase().indexOf(q) === -1;
      });
    }
  }, 200));

  Z.on(host, "change", function (e) {
    if (e.target.id === "admSt") { filter.status = e.target.value; render(); }
  });

  render();
})();