/* =========================================================
   ZED Gift Shop — account area
   Signed-out: sign in / register. Signed-in: orders, wishlist,
   addresses, notifications, profile.
   ========================================================= */
(function () {
  "use strict";
  var Z = window.ZED;
  if (!Z) return;
  var $ = Z.$, esc = Z.esc, money = Z.money;

  var host = $("#acctWrap");
  var TABS = [
    { id: "orders", t: "Orders" }, { id: "wishlist", t: "Wishlist" },
    { id: "addresses", t: "Addresses" }, { id: "notifications", t: "Notifications" },
    { id: "profile", t: "Profile" }
  ];

  function signedIn() { return !!Z.db.user; }

  /* ---------------- signed out ---------------- */
  function renderGuest() {
    $("#acctName").textContent = "there";
    $("#acctMeta").textContent = "Sign in to see your orders, wishlist and addresses.";
    $("#acctSignOut").hidden = true;

    host.innerHTML =
      '<div class="cartwrap">' +
        '<section class="cartsummary" style="position:static">' +
          '<h2 class="ttl" style="font-size:20px;margin-bottom:6px">Sign in</h2>' +
          '<p style="font-size:14px;color:var(--muted);margin-bottom:18px">' +
            "Use the email or phone you order with. In this demo any value works — nothing leaves your browser.</p>" +
          '<form id="loginForm" novalidate class="stack">' +
            '<div class="field"><label for="lgEmail">Email address</label>' +
              '<input class="input" id="lgEmail" type="email" placeholder="you@example.com" autocomplete="email"></div>' +
            '<div class="field"><label for="lgPhone">Phone number</label>' +
              '<input class="input" id="lgPhone" type="tel" placeholder="07xx xxx xxx" autocomplete="tel"></div>' +
            '<p class="err--box" id="lgErr" hidden></p>' +
            '<button class="btn btn--primary btn--full" type="submit">Sign in</button>' +
          "</form>" +
          '<p style="font-size:13px;color:var(--muted);margin-top:16px;text-align:center">' +
            'No account yet? <a href="#register" id="toRegister" style="color:var(--green);font-weight:700">Create one</a></p>' +
        "</section>" +

        '<section class="cartsummary" style="position:static" id="register">' +
          '<h2 class="ttl" style="font-size:20px;margin-bottom:6px">Create an account</h2>' +
          '<p style="font-size:14px;color:var(--muted);margin-bottom:18px">' +
            "Save your wishlist, addresses and reorder your favourites faster.</p>" +
          '<form id="regForm" novalidate class="stack">' +
            '<div class="grid-2">' +
              '<div class="field"><label for="rgName">Full name</label><input class="input" id="rgName" autocomplete="name"></div>' +
              '<div class="field"><label for="rgPhone">Phone</label><input class="input" id="rgPhone" type="tel" autocomplete="tel"></div>' +
            "</div>" +
            '<div class="field"><label for="rgEmail">Email address</label><input class="input" id="rgEmail" type="email" autocomplete="email"></div>' +
            '<div class="field"><label for="rgPass">Password</label>' +
              '<input class="input" id="rgPass" type="password" autocomplete="new-password">' +
              '<span class="hint">At least 6 characters. Stored locally in this demo only.</span></div>' +
            '<label class="check"><input type="checkbox" id="rgTerms">' +
              "<span>I agree to the terms of sale and privacy policy.</span></label>" +
            '<p class="err--box" id="rgErr" hidden></p>' +
            '<button class="btn btn--dark btn--full" type="submit">Create account</button>' +
          "</form>" +
        "</section>" +
      "</div>" +

      '<section class="sec sec--tight"><div class="sec__hd"><h2 class="ttl">Browse while you decide</h2></div>' +
        '<div class="pgrid">' + Z.products.filter(function (p) { return p.b === "best"; }).slice(0, 4)
          .map(function (p) { return Z.cardHTML(p); }).join("") + "</div></section>";
  }

  /* ---------------- signed in ---------------- */
  function renderUser() {
    var u = Z.db.user;
    $("#acctName").textContent = (u.name || "there").split(" ")[0];
    $("#acctMeta").textContent = (u.email || u.phone || "") +
      (u.since ? " · member since " + Z.fmtDate(u.since) : "");
    $("#acctSignOut").hidden = false;

    var hash = (location.hash || "").replace("#", "");
    var active = TABS.some(function (t) { return t.id === hash; }) ? hash : "orders";

    host.innerHTML =
      '<div class="tabs-acct" role="tablist">' +
        TABS.map(function (t) {
          return '<button class="tab-acct' + (t.id === active ? " is-on" : "") + '" type="button" role="tab" ' +
            'id="tab-' + t.id + '" aria-controls="pane-' + t.id + '" ' +
            'aria-selected="' + (t.id === active ? "true" : "false") + '" data-tab="' + t.id + '">' +
            esc(t.t) + "</button>";
        }).join("") +
      "</div>" +
      TABS.map(function (t) {
        return '<div class="tabpane" role="tabpanel" data-pane="' + t.id + '" id="pane-' + t.id + '" ' +
          'aria-labelledby="tab-' + t.id + '" tabindex="0"' +
          (t.id === active ? "" : " hidden") + ">" +
          pane(t.id) + "</div>";
      }).join("");

    if (active === "notifications") Z.markAllRead();
    refreshHearts();
  }

  function pane(id) {
    if (id === "orders") return paneOrders();
    if (id === "wishlist") return paneWishlist();
    if (id === "addresses") return paneAddresses();
    if (id === "notifications") return paneNotifications();
    return paneProfile();
  }

  function paneOrders() {
    var orders = Z.db.orders;
    if (!orders.length) {
      return paneHead("Orders") +
        '<div class="empty-state"><p class="empty-state__e" aria-hidden="true">📦</p>' +
        "<h2>No orders yet</h2>" +
        '<p style="color:var(--muted);margin:10px 0 20px">When you place an order it will appear here with tracking.</p>' +
        '<a class="btn btn--primary" href="shop.html">Start shopping</a></div>';
    }
    return paneHead("Orders") + '<div class="stack">' + orders.map(function (o) {
      var meta = Z.statusMeta(o.status);
      return '<article class="ordercard">' +
        '<div class="ordercard__hd">' +
          "<div><span class=\"ordercard__num\">" + esc(o.id) + "</span>" +
            '<p style="font-size:12.5px;color:var(--muted);margin-top:3px">' + esc(Z.fmtDate(o.createdAt)) +
            " · " + o.items.length + " item" + (o.items.length === 1 ? "" : "s") + "</p></div>" +
          '<span class="badge-st st-' + esc(o.status) + '">' + esc(meta.label) + "</span></div>" +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
          o.items.map(function (i) {
            return '<span style="width:52px;height:52px;border-radius:6px;overflow:hidden;background:var(--soft)">' +
              Z.art(i.art, i.skin) + "</span>";
          }).join("") +
        "</div>" +
        '<p style="margin-top:12px;font-size:14px;color:var(--body)">' + esc(meta.msg) + "</p>" +
        '<div class="sumline sumline--total" style="margin-top:10px;padding-top:12px">' +
          "<span>Total</span><b>" + money(o.totals.total) + "</b></div>" +
        '<div class="rowacts" style="margin-top:12px">' +
          '<a class="abtn abtn--sm" href="track.html?order=' + encodeURIComponent(o.id) + '">Track order</a>' +
          (o.status === "DELIVERED"
            ? '<a class="abtn abtn--line abtn--sm" href="review.html?order=' + encodeURIComponent(o.id) + '">' +
              (o.reviewed ? "Update review" : "Rate this order") + "</a>"
            : "") +
          (o.status === "DELIVERED"
            ? '<button class="abtn abtn--line abtn--sm" type="button" data-reorder="' + esc(o.id) + '">Reorder</button>'
            : "") +
        "</div></article>";
    }).join("") + "</div>";
  }

  function paneWishlist() {
    var ids = Z.wish.ids();
    if (!ids.length) {
      return paneHead("Wishlist") +
        '<div class="empty-state"><p class="empty-state__e" aria-hidden="true">♡</p>' +
        "<h2>Your wishlist is empty</h2>" +
        '<p style="color:var(--muted);margin:10px 0 20px">Tap the heart on any product to save it here.</p>' +
        '<a class="btn btn--primary" href="shop.html">Browse gifts</a></div>';
    }
    return paneHead("Wishlist") +
      '<p style="font-size:14px;color:var(--muted);margin-bottom:14px">' + ids.length +
      " saved item" + (ids.length === 1 ? "" : "s") + "</p>" +
      '<div class="pgrid">' + ids.map(function (id2) {
        var p = Z.byId(id2);
        return p ? Z.cardHTML(p) : "";
      }).join("") + "</div>" +
      '<div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">' +
        '<button class="abtn abtn--dark" type="button" data-wishall>Add all to cart</button>' +
        '<button class="abtn abtn--line" type="button" data-wishclear>Clear wishlist</button></div>';
  }

  function paneAddresses() {
    return paneHead("Addresses") +
      '<button class="abtn abtn--dark" type="button" data-addaddr>+ Add a new address</button>' +
      (Z.db.addresses.length
        ? '<div class="addrgrid" style="margin-top:16px">' + Z.db.addresses.map(function (a) {
            return '<article class="addrcard">' +
              "<b style=\"font-size:15px;color:var(--ink)\">" + esc(a.name) + "</b>" +
              '<p style="font-size:13.5px;color:var(--body);margin-top:6px">' +
                esc([a.street, a.area, a.town, a.county].filter(Boolean).join(", ")) + "</p>" +
              '<p style="font-size:13px;color:var(--muted);margin-top:4px">' + esc(a.phone) + "</p>" +
              (a.instructions ? '<p style="font-size:12.5px;color:var(--gold);margin-top:6px;font-weight:650">' + esc(a.instructions) + "</p>" : "") +
              '<button class="linkbtn" type="button" data-deladdr="' + esc(a.id) + '" style="margin-top:10px">Remove</button>' +
              "</article>";
          }).join("") + "</div>"
        : '<p class="none">No saved addresses yet. Add one to check out faster.</p>');
  }

  function paneNotifications() {
    var list = Z.db.notify;
    if (!list.length) {
      return paneHead("Notifications") +
        '<div class="empty-state"><p class="empty-state__e" aria-hidden="true">🔔</p>' +
        "<h2>Nothing new</h2>" +
        '<p style="color:var(--muted);margin-top:8px">Order updates and offers will appear here.</p></div>';
    }
    return paneHead("Notifications") +
      '<p style="font-size:14px;color:var(--muted);margin-bottom:14px">' + list.length +
      " update" + (list.length === 1 ? "" : "s") + "</p>" +
      '<div class="stack">' + list.map(function (n) {
        return '<article class="notifitem' + (n.read ? "" : " is-unread") + '">' +
          "<b>" + esc(n.title) + "</b><p>" + esc(n.body) + "</p>" +
          "<time>" + esc(Z.fmtDateTime(n.at)) + "</time></article>";
      }).join("") + "</div>";
  }

  /* The tab strip is the visible label for each pane, so the pane heading is
     screen-reader only. It still keeps the document outline flat (h1 → h2 → h3). */
  function paneHead(title) {
    return '<h2 class="sr-only">' + esc(title) + "</h2>";
  }

  function paneProfile() {
    var u = Z.db.user;
    var spent = Z.db.orders.filter(function (o) { return o.payment.status === "paid"; })
      .reduce(function (n, o) { return n + o.totals.total; }, 0);
    return paneHead("Overview") + '<div class="adminstats">' +
        '<div class="adminstat"><b>' + Z.db.orders.length + "</b><span>Orders placed</span></div>" +
        '<div class="adminstat"><b>' + Z.wish.ids().length + "</b><span>Saved items</span></div>" +
        '<div class="adminstat"><b>' + Z.db.addresses.length + "</b><span>Addresses</span></div>" +
        '<div class="adminstat"><b>' + money(spent) + "</b><span>Lifetime value</span></div>" +
      "</div>" +
      '<form id="profForm" class="cartsummary" style="position:static;max-width:520px" novalidate>' +
        '<h2 class="ttl" style="font-size:18px;margin-bottom:14px">Profile details</h2>' +
        '<div class="stack">' +
          '<div class="field"><label for="pfName">Full name</label><input class="input" id="pfName" value="' + esc(u.name) + '"></div>' +
          '<div class="field"><label for="pfPhone">Phone</label><input class="input" id="pfPhone" value="' + esc(u.phone) + '"></div>' +
          '<div class="field"><label for="pfEmail">Email</label><input class="input" id="pfEmail" type="email" value="' + esc(u.email) + '"></div>' +
          '<p class="err--box" id="pfErr" hidden></p>' +
          '<button class="btn btn--primary" type="submit">Save changes</button>' +
        "</div></form>";
  }

  /* ---------------- address form modal ---------------- */
  function addressForm() {
    var box = document.createElement("div");
    box.className = "modal on";
    box.id = "addrModal";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Add a new address");
    box.innerHTML =
      '<div class="modal__v" data-x></div>' +
      '<div class="modal__b" style="max-width:560px;padding:clamp(18px,3vw,28px)">' +
        '<button class="xbtn modal__x" type="button" data-x aria-label="Close">' + Z.icons.x + "</button>" +
        '<h2 class="ttl" style="font-size:20px;margin-bottom:16px">Add a new address</h2>' +
        '<form id="addrForm" novalidate class="stack">' +
          '<div class="grid-2">' +
            '<div class="field"><label for="adName">Recipient name</label><input class="input" id="adName"></div>' +
            '<div class="field"><label for="adPhone">Phone</label><input class="input" id="adPhone" type="tel"></div>' +
          "</div>" +
          '<div class="grid-2">' +
            '<div class="field"><label for="adCt">County</label><select class="select" id="adCt">' +
              '<option value="">Choose…</option>' + Z.counties.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("") + "</select></div>" +
            '<div class="field"><label for="adTown">Town / city</label><input class="input" id="adTown"></div>' +
          "</div>" +
          '<div class="field"><label for="adAr">Area / neighbourhood</label><input class="input" id="adAr"></div>' +
          '<div class="field"><label for="adStreetIn">Street, estate or building</label><textarea class="textarea" id="adStreetIn"></textarea></div>' +
          '<div class="field"><label for="adNote">Delivery notes</label><input class="input" id="adNote" placeholder="Gate code, landmark…"></div>' +
          '<p class="err--box" id="adErr" hidden></p>' +
          '<div class="pdp__buy"><button class="btn btn--primary" type="submit">Save address</button></div>' +
        "</form></div>";
    document.body.appendChild(box);
    document.body.classList.add("lock");
    $("#adName").focus();
    Z.on($("#addrForm"), "submit", function (e) {
      e.preventDefault();
      var a = {
        name: $("#adName").value.trim(), phone: $("#adPhone").value.trim(),
        county: $("#adCt").value, town: $("#adTown").value.trim(),
        area: $("#adAr").value.trim(), street: $("#adStreetIn").value.trim(),
        instructions: $("#adNote").value.trim()
      };
      var r = Z.account.addAddress(a);
      var err = $("#adErr");
      if (!r.ok) { err.hidden = false; err.textContent = r.msg; return; }
      Z.toast("Address saved");
      box.remove();
      document.body.classList.remove("lock");
      renderUser();
    });
    Z.on(box, "click", function (e) {
      if (e.target.closest("[data-x]")) { box.remove(); document.body.classList.remove("lock"); }
    });
  }

  /* ---------------- events ---------------- */
  document.addEventListener("click", function (e) {
    var el;
    if ((el = e.target.closest("[data-tab]"))) {
      location.hash = el.getAttribute("data-tab");
      renderUser();
      return;
    }
    if (e.target.closest("#toRegister")) {
      $("#register").scrollIntoView({ behavior: "smooth", block: "start" });
      $("#rgName").focus();
      return;
    }
    if ((el = e.target.closest("[data-addaddr]"))) { addressForm(); return; }
    if ((el = e.target.closest("[data-deladdr]"))) {
      Z.account.removeAddress(el.getAttribute("data-deladdr"));
      Z.toast("Address removed");
      renderUser();
      return;
    }
    if ((el = e.target.closest("[data-reorder]"))) {
      var o = Z.orderByNumber(el.getAttribute("data-reorder"));
      var added = 0, skipped = [];
      o.items.forEach(function (i) {
        var r = Z.cart.add(i.id, i.qty, i.size || "", i.color || "", { skipVariant: true });
        if (r.ok) added++; else skipped.push(i.name);
      });
      Z.refreshCarts();
      Z.toast(added ? added + " item" + (added === 1 ? "" : "s") + " added to cart" : "Nothing could be added",
        added ? "" : "error");
      return;
    }
    if (e.target.closest("[data-wishall]")) {
      var ids = Z.wish.ids(), n = 0;
      ids.forEach(function (id2) {
        if (Z.cart.add(id2, 1, "", "", { skipVariant: true }).ok) n++;
      });
      Z.refreshCarts();
      Z.toast(n + " item" + (n === 1 ? "" : "s") + " added to cart");
      return;
    }
    if (e.target.closest("[data-wishclear]")) {
      Z.wish.ids().forEach(function (id2) { Z.wish.remove(id2); });
      Z.toast("Wishlist cleared");
      renderUser();
      return;
    }
    if (e.target.closest("#acctSignOut")) {
      Z.account.logout();
      Z.toast("Signed out");
      renderGuest();
      return;
    }
  });

  Z.on(host, "submit", function (e) {
    var t = e.target;
    if (t.id === "loginForm") {
      e.preventDefault();
      var email = $("#lgEmail").value.trim(), phone = $("#lgPhone").value.trim();
      var err = $("#lgErr");
      var r = Z.account.login(email, phone);
      if (!r.ok) { err.hidden = false; err.textContent = r.msg; return; }
      Z.toast("Signed in — welcome back");
      renderUser();
      return;
    }
    if (t.id === "regForm") {
      e.preventDefault();
      var err2 = $("#rgErr");
      if (!$("#rgTerms").checked) { err2.hidden = false; err2.textContent = "Please accept the terms to continue."; return; }
      var r2 = Z.account.register($("#rgName").value.trim(), $("#rgEmail").value.trim(),
        $("#rgPhone").value.trim(), $("#rgPass").value);
      if (!r2.ok) { err2.hidden = false; err2.textContent = r2.msg; return; }
      Z.toast("Account created — welcome to ZED");
      renderUser();
      return;
    }
    if (t.id === "profForm") {
      e.preventDefault();
      var err3 = $("#pfErr");
      var name = $("#pfName").value.trim(), phone = $("#pfPhone").value.trim(), email = $("#pfEmail").value.trim();
      if (name.length < 2) { err3.hidden = false; err3.textContent = "Enter your full name."; return; }
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err3.hidden = false; err3.textContent = "Enter a valid email address."; return; }
      if (phone && !/^\+?[\d\s-]{9,}$/.test(phone)) { err3.hidden = false; err3.textContent = "Enter a valid phone number."; return; }
      Z.db.user.name = name; Z.db.user.phone = phone; Z.db.user.email = email;
      Z.persist();
      Z.toast("Profile updated");
      renderUser();
    }
  });

  function refreshHearts() {
    Z.$$("[data-pane] [data-wish]").forEach(function (b) {
      var on = Z.wish.has(b.getAttribute("data-wish"));
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  document.addEventListener("zed:change", refreshHearts);
  window.addEventListener("hashchange", function () { if (signedIn()) renderUser(); });

  if (signedIn()) renderUser(); else renderGuest();
})();