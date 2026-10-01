/* =========================================================
   ZED Gift Shop — product & delivery review
   ========================================================= */
(function () {
  "use strict";
  var Z = window.ZED;
  if (!Z) return;
  var $ = Z.$, esc = Z.esc;

  var num = Z.qs("order");
  var order = num ? Z.orderByNumber(num) : Z.db.orders[0];
  var host = $("#reviewWrap");

  function shell(inner) {
    return '<div style="max-width:820px;margin-inline:auto">' + inner + "</div>";
  }

  if (!order) {
    host.innerHTML = shell(
      '<div class="cartsummary" style="position:static">' +
      '<div class="empty-state"><p class="empty-state__e" aria-hidden="true">⭐</p>' +
      "<h2>No orders to review yet</h2>" +
      '<p style="color:var(--muted);margin:10px 0 20px">Once an order is delivered you can rate the products and the delivery.</p>' +
      '<a class="btn btn--primary" href="shop.html">Place your first order</a></div></div>');
    return;
  }

  var editable = order.status === "DELIVERED";
  var drafts = {};

  /* targetKey is either "product:<id>" or "delivery"; drafts are keyed the same way */
  function starRow(targetKey, label, value) {
    var v = value || 0;
    return '<div class="field" style="margin-bottom:16px">' +
      '<label id="' + Z.slug(targetKey) + 'L">' + esc(label) + "</label>" +
      '<div class="starpick" role="radiogroup" aria-labelledby="' + Z.slug(targetKey) + 'L" data-star="' +
        targetKey + '">' +
        [1, 2, 3, 4, 5].map(function (n) {
          return '<button class="starpick__b' + (n <= v ? " is-on" : "") + '" type="button" role="radio" ' +
            'aria-checked="' + (n === v ? "true" : "false") + '" data-starv="' + n + '" ' +
            'aria-label="' + n + ' star' + (n === 1 ? "" : "s") + '">' + Z.icons.star + "</button>";
        }).join("") +
      "</div></div>";
  }

  function render() {
    host.innerHTML = shell(
      '<div class="cartsummary" style="position:static">' +
        '<div class="secrow">' +
          "<div><p class=\"hero__kicker\" style=\"color:var(--green)\">Order " + esc(order.id) + "</p>" +
          "<h2 class=\"ttl\" style=\"font-size:20px\">" +
            (editable ? "Rate your order" : "Your review") + "</h2></div>" +
          '<span class="badge-st st-' + esc(order.status) + '">' + esc(Z.statusMeta(order.status).label) + "</span>" +
        "</div>" +

        (editable
          ? '<div class="notice notice--ok" style="margin-bottom:18px">' + Z.icons.check +
            "<span><b>Delivered " + esc(Z.fmtDate(order.delivery.eta)) + "</b> Tell us how the gifts and the delivery went. Your review appears on the product page.</span></div>"
          : '<div class="notice notice--warn" style="margin-bottom:18px">' + Z.icons.check +
            "<span><b>This order is " + esc(Z.statusMeta(order.status).label.toLowerCase()) + "</b> You can leave a review once the order is delivered.</span></div>") +

        (order.reviewed
          ? '<div class="notice notice--ok" style="margin-bottom:18px">' + Z.icons.check +
            "<span><b>Thanks — you've reviewed this order.</b> You can change your ratings below and submit again.</span></div>"
          : "") +

        '<form id="revForm" novalidate>' +
          order.items.map(function (it) {
            var done = drafts["product:" + it.id] || {};
            return '<fieldset class="revitem" style="margin-bottom:14px;border:1px solid var(--line)">' +
              '<legend style="font-size:13.5px;font-weight:750;color:var(--ink);padding:0 6px">' + esc(it.name) + "</legend>" +
              starRow("product:" + it.id, "Product rating", done.rating || 0) +
              '<div class="field"><label for="t_' + it.id + '">Your review</label>' +
                '<textarea class="textarea" id="t_' + it.id + '" data-text="' + it.id + '" placeholder="What did the recipient think?"' +
                (editable ? "" : " disabled") + ">" +
                esc((drafts.__text && drafts.__text[it.id]) || "") + "</textarea></div>" +
              '<div class="field" style="margin-top:10px"><label>Add a photo (optional)</label>' +
                '<div class="wf-toggle" data-photo="' + it.id + '">' +
                  ["😊", "🎁", "💛", "👏"].map(function (e2) {
                    return "<label>" + e2 + '<input type="radio" name="ph_' + it.id + '" value="' + e2 + '"></label>';
                  }).join("") +
                "</div></div>" +
              "</fieldset>";
          }).join("") +

          starRow("delivery", "Delivery experience", order.deliveryRating || 0) +
          '<input type="hidden" id="revDeliveryRating" value="' + (order.deliveryRating || 0) + '">' +

          '<div class="field" style="margin-top:8px">' +
            '<label for="revName">Display name</label>' +
            '<input class="input" id="revName" value="' +
              esc((drafts.__name) || (order.customer.name || "ZED Customer")) + '"' +
              (editable ? "" : " disabled") + ">" +
            '<span class="hint">Shown next to your review.</span></div>' +

          '<label class="check" style="margin-top:16px"><input type="checkbox" id="revPublish" checked>' +
            "<span>Publish my review on the product pages.</span></label>" +

          '<p class="err--box" id="revErr" hidden style="margin-top:14px"></p>' +
          (editable
            ? '<div class="pdp__buy"><button class="btn btn--primary" type="submit">Submit review</button>' +
              '<a class="btn btn--ghost" href="track.html?order=' + encodeURIComponent(order.id) + '">Back to tracking</a></div>'
            : '<div class="pdp__buy"><a class="btn btn--ghost" href="track.html?order=' + encodeURIComponent(order.id) + '">Back to tracking</a></div>') +
        "</form>" +
      "</div>");
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-starv]");
    if (b) {
      var group = b.closest("[data-star]");
      var key = group.getAttribute("data-star");
      var v = Number(b.getAttribute("data-starv"));
      drafts[key] = drafts[key] || {};
      drafts[key].rating = v;
      group.querySelectorAll("[data-starv]").forEach(function (x) {
        var n = Number(x.getAttribute("data-starv"));
        x.classList.toggle("is-on", n <= v);
        x.setAttribute("aria-checked", n === v ? "true" : "false");
      });
      return;
    }
    var ph = e.target.closest("[data-photo]");
    if (ph && ph.classList.contains("is-on")) return;
    if (ph) {
      var wrap = ph;
      wrap.classList.remove("is-on");
      wrap.querySelectorAll("label").forEach(function (l) { l.classList.remove("is-on"); });
      return;
    }
    var lab = e.target.closest(".wf-toggle label");
    if (lab) {
      var p2 = lab.closest(".wf-toggle");
      var chosen = lab.classList.contains("is-on");
      p2.classList.toggle("is-on", !chosen);
      p2.querySelectorAll("label").forEach(function (l) {
        l.classList.toggle("is-on", !chosen && l === lab);
      });
    }
  });

  Z.on(host, "input", function (e) {
    var t = e.target;
    if (t.getAttribute && t.getAttribute("data-text")) {
      var id2 = t.getAttribute("data-text");
      drafts.__text = drafts.__text || {};
      drafts.__text[id2] = t.value;
    }
    if (t.id === "revName") drafts.__name = t.value;
  });

  Z.on(host, "submit", function (e) {
    e.preventDefault();
    var errBox = $("#revErr");
    var texts = Z.$$("[data-text]", host).map(function (t) { return t.value.trim(); });
    var anyText = texts.some(function (x) { return x.length > 0; });
    var rated = Object.keys(drafts).some(function (k) {
      return k.indexOf("product:") === 0 && drafts[k].rating;
    });
    if (!anyText && !rated) {
      errBox.hidden = false;
      errBox.textContent = "Add a rating or a short comment before submitting.";
      return;
    }
    errBox.hidden = true;

    var name = $("#revName").value.trim() || order.customer.name || "ZED Customer";
    var publish = $("#revPublish").checked;

    var delivery = (drafts.delivery && drafts.delivery.rating) || order.deliveryRating || 0;

    order.items.forEach(function (it) {
      var d = drafts["product:" + it.id] || {};
      var typed = (drafts.__text && drafts.__text[it.id]) || "";
      if (!d.rating && !typed) return;
      if (!publish) return;
      /* replace an earlier review of the same product from this order */
      Z.db.reviews = Z.db.reviews.filter(function (r) {
        return !(r.orderId === order.id && r.productId === it.id);
      });
      Z.addReview({
        productId: it.id, orderId: order.id, name: name,
        rating: d.rating || 5, text: typed || "A lovely gift.",
        photos: (function () {
          var on = $('[data-photo="' + it.id + '"] label.is-on input');
          return on && on.checked ? [on.value] : [];
        })(),
        delivery: delivery
      });
    });

    order.deliveryRating = delivery;
    order.reviewed = true;
    Z.persist();
    Z.notify("Thanks for your review", "Your feedback is now on the product pages.");
    Z.toast("Review submitted — thank you!");
    render();
  });

  render();
})();