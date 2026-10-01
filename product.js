/* =========================================================
   ZED Gift Shop — product detail
   ========================================================= */
(function () {
  "use strict";
  var Z = window.ZED;
  if (!Z) return;
  var $ = Z.$, esc = Z.esc, money = Z.money;

  var id = Z.qs("id") || "p01";
  var p = Z.byId(id);

  if (!p) {
    $("#pdp").innerHTML =
      '<div class="empty-state" style="padding-block:80px">' +
      '<p class="empty-state__e" aria-hidden="true">🔍</p>' +
      "<h1>We couldn't find that product</h1>" +
      '<p style="color:var(--muted);margin:10px 0 20px">It may have been removed. Browse the full catalogue instead.</p>' +
      '<a class="btn btn--primary" href="shop.html">Go to shop</a></div>';
    $("#reviews").remove();
    $("#relatedWrap").remove();
    return;
  }

  document.title = p.n + " | ZED Gift Shop";
  $('meta[name="description"]').setAttribute("content", p.d);

  var sel = { size: p.size.length === 1 ? p.size[0] : "", color: p.color.length === 1 ? p.color[0] : "", qty: 1, angle: 0 };
  var d = Z.off(p);
  var out = p.st <= 0;

  /* breadcrumb */
  $(".crumbs").innerHTML =
    '<a href="index.html">Home</a><span aria-hidden="true">/</span>' +
    '<a href="shop.html">Shop</a><span aria-hidden="true">/</span>' +
    '<a href="shop.html?category=' + encodeURIComponent(p.c) + '">' + esc(p.c) + "</a>" +
    '<span aria-hidden="true">/</span><span aria-current="page">' + esc(p.n) + "</span>";

  function stockTag() {
    return out ? { cls: "is-out", t: "Out of stock" }
      : p.st <= 5 ? { cls: "is-low", t: "Only " + p.st + " left" }
        : { cls: "", t: "In stock · " + p.st + " available" };
  }

  function opts(key, label) {
    if (p[key].length < 2) return "";
    return '<div class="optgroup"><p class="optgroup__l"><span>' + label + "</span>" +
      '<span class="optgroup__v">' + (sel[key] || "Choose") + "</span></p>" +
      '<div class="opts" role="radiogroup" aria-label="' + label + '">' +
      p[key].map(function (v) {
        return '<button class="opt' + (sel[key] === v ? " is-on" : "") + '" type="button" role="radio" aria-checked="' +
          (sel[key] === v ? "true" : "false") + '" data-opt="' + key + '" data-v="' + esc(v) + '">' + esc(v) + "</button>";
      }).join("") + "</div></div>";
  }

  function render() {
    var st = stockTag();
    var inWish = Z.wish.has(p.id);

    $("#pdp").innerHTML =
      '<div class="pdp__top">' +
      '<div class="pdp__gallery">' +
        '<div class="pdp__main" id="pdpMain">' + Z.art(p.a, p.s, sel.angle) + "</div>" +
        '<div class="pdp__thumbs">' +
          [0, 35, -35, 90].map(function (a, i) {
            return '<button class="pdp__thumb' + (a === sel.angle ? " is-on" : "") + '" type="button" data-angle="' + a +
              '" aria-label="View ' + (i + 1) + '">' + Z.art(p.a, p.s, a) + "</button>";
          }).join("") +
        "</div>" +
      "</div>" +
      '<div class="pdp__info-col">' +
        '<p class="pcard__c">' + esc(p.c) + " · " + esc(p.brand) + "</p>" +
        "<h1 class=\"pdp__t\">" + esc(p.n) + "</h1>" +
        '<p class="pdp__meta"><span class="stars" role="img" aria-label="' + p.r + ' out of 5">' + Z.stars(p.r) + "</span>" +
          "<b>" + p.r.toFixed(1) + "</b> (" + p.rv + ' reviews) · SKU ' + p.id.toUpperCase() + "</p>" +
        '<p class="pdp__price"><b>' + money(p.p) + "</b>" +
          (d > 0 ? "<s>" + money(p.w) + "</s><em>Save " + d + "%</em>" : "") + "</p>" +
        '<p class="pdp__stock ' + st.cls + '"><span class="pdp__dot"></span>' + st.t + "</p>" +
        '<p style="margin-top:12px;font-size:15px;color:var(--body);line-height:1.65">' + esc(p.d) + "</p>" +
        opts("size", "Size") +
        opts("color", "Colour") +
        '<div class="optgroup"><p class="optgroup__l"><span>Quantity</span></p>' +
          '<div class="qty-pick" role="group" aria-label="Quantity">' +
            '<button type="button" data-q="-1" aria-label="Decrease quantity">−</button>' +
            "<b>" + sel.qty + "</b>" +
            '<button type="button" data-q="1" aria-label="Increase quantity" ' + (sel.qty >= p.st ? "disabled" : "") + '>+</button>' +
          "</div></div>" +
        '<div class="pdp__buy">' +
          (out ? '<span class="pcard__out" style="padding:14px">This product is out of stock</span>'
                : '<button class="btn btn--primary" type="button" data-buy>Add to cart</button>') +
          '<button class="btn btn--ghost" type="button" data-wish="' + p.id + '" aria-pressed="' + (inWish ? "true" : "false") + '">' +
            Z.icons.heart + (inWish ? "Saved" : "Save") + "</button>" +
          '<button class="btn btn--dark" type="button" data-quick="' + p.id + '">Quick view</button>' +
        "</div>" +
        '<ul class="pdp__info">' +
          '<li>' + Z.icons.check + "<span>Free gift wrapping and a handwritten card on every order.</span></li>" +
          '<li>' + Z.icons.check + "<span>" + (p.c === "Corporate" ? "Bulk orders available from 10 units." : "Same-day Nairobi delivery when you order before 2pm.") + "</span></li>" +
          '<li>' + Z.icons.check + "<span>Pay with M-Pesa, Visa, Mastercard, Amex, bank transfer or cash on delivery.</span></li>" +
          '<li>' + Z.icons.check + "<span>7 days to report a damaged or incorrect item.</span></li>" +
        "</ul>" +
      "</div>" +
      "</div>" +

      '<div class="pdp__tabs" role="tablist" aria-label="Product information">' +
        '<button class="pdp__tab is-on" type="button" role="tab" aria-selected="true" data-tab="desc">Description</button>' +
        '<button class="pdp__tab" type="button" role="tab" aria-selected="false" data-tab="spec">Specifications</button>' +
        '<button class="pdp__tab" type="button" role="tab" aria-selected="false" data-tab="del">Delivery &amp; returns</button>' +
        '<button class="pdp__tab" type="button" role="tab" aria-selected="false" data-tab="rev">Reviews (' + p.rv + ")</button>" +
      "</div>" +
      '<div class="pdp__panel" data-panel="desc">' + "<p>" + esc(p.d) + "</p></div>" +
      '<div class="pdp__panel" data-panel="spec" hidden>' +
        '<dl class="pv__spec">' + Object.keys(p.sp || {}).map(function (k) {
          return "<div><dt>" + esc(k) + "</dt><dd>" + esc(p.sp[k]) + "</dd></div>";
        }).join("") + "</dl></div>" +
      '<div class="pdp__panel" data-panel="del" hidden>' +
        "<p>Standard Nairobi delivery is KShs 250 and free over KShs 3,000. Nationwide delivery is KShs 350 and takes 1–2 days. Personalization is done in-house, so allow one extra day for engraved or printed items.</p>" +
        "<p>If something arrives damaged or incorrect, tell us within 7 days of delivery and we will replace it or refund you in full.</p>" +
      "</div>" +
      '<div class="pdp__panel" data-panel="rev" hidden></div>';

    renderReviews();
  }

  function renderReviews() {
    var list = Z.reviewsFor(p.id);
    var host = $('[data-panel="rev"]');
    var dist = [5, 4, 3, 2, 1].map(function (n) {
      var w = Math.max(2, Math.round((p.r / 5) * (n === Math.round(p.r) ? 100 : 45)));
      return { n: n, w: w };
    });
    host.innerHTML =
      '<div class="revsum">' +
        '<div class="revsum__score"><b>' + p.r.toFixed(1) + "</b>" +
          '<span class="stars" aria-hidden="true">' + Z.stars(p.r) + "</span>" +
          "<span>" + p.rv + " reviews</span></div>" +
        '<div class="revsum__bars">' + dist.map(function (x) {
          return '<p class="rateline"><span>' + x.n + "★</span><span class=\"rateline__bar\"><i style=\"width:" + x.w +
            '%"></i></span></p>';
        }).join("") + "</div>" +
      "</div>" +
      (list.length
        ? '<div class="revlist">' + list.map(function (r) {
            return '<article class="revitem"><div class="revitem__top">' +
              '<span class="revitem__who">' + esc(r.name) + "</span>" +
              '<span class="revitem__stars" aria-label="' + r.rating + ' out of 5">' + Z.stars(r.rating) + "</span></div>" +
              '<p>' + esc(r.text) + "</p>" +
              (r.photos && r.photos.length
                ? '<div class="revitem__ph">' + r.photos.map(function (ph) { return "<span>" + esc(ph) + "</span>"; }).join("") + "</div>"
                : "") +
              '<p style="font-size:12px;color:var(--muted);margin-top:8px">' + Z.fmtDate(r.at) + "</p></article>";
          }).join("") + "</div>"
        : '<p class="none">No written reviews yet. Yours would be the first.</p>') +
      '<p style="margin-top:16px"><a class="abtn abtn--line" href="shop.html?category=' + encodeURIComponent(p.c) + '">Browse more ' + esc(p.c.toLowerCase()) + "</a></p>";

    $("#reviews").innerHTML =
      '<div class="sec__hd"><h2 class="ttl" id="revH">Customer reviews</h2></div>' +
      '<p style="color:var(--muted);font-size:15px">' + p.rv + " reviews · " + p.r.toFixed(1) + " out of 5 average</p>";
  }

  /* ---------------- events ---------------- */
  document.addEventListener("click", function (e) {
    var el;
    if ((el = e.target.closest("[data-opt]"))) {
      sel[el.getAttribute("data-opt")] = el.getAttribute("data-v");
      render();
      return;
    }
    if ((el = e.target.closest("[data-q]"))) {
      var d2 = Number(el.getAttribute("data-q"));
      sel.qty = Math.min(Math.max(1, sel.qty + d2), p.st || 1);
      render();
      return;
    }
    if ((el = e.target.closest("[data-angle]"))) {
      sel.angle = Number(el.getAttribute("data-angle"));
      $$(".pdp__thumb").forEach(function (b) {
        b.classList.toggle("is-on", Number(b.getAttribute("data-angle")) === sel.angle);
      });
      $("#pdpMain").innerHTML = Z.art(p.a, p.s, sel.angle);
      return;
    }
    if ((el = e.target.closest("[data-buy]"))) {
      var r = Z.cart.add(p.id, sel.qty, sel.size, sel.color);
      if (r.ok) {
        Z.toast(p.n + " added to cart");
        Z.refreshCarts();
      } else if (r.needsVariant) {
        Z.toast(r.msg, "error");
        var group = !sel.size ? $('[data-opt="size"]') : $('[data-opt="color"]');
        if (group) {
          group.scrollIntoView({ behavior: "smooth", block: "center" });
          group.focus();
        }
      } else Z.toast(r.msg, "error");
      return;
    }
    if ((el = e.target.closest("[data-tab]"))) {
      var key = el.getAttribute("data-tab");
      Z.$$("[data-tab]").forEach(function (b) {
        var on = b === el;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      Z.$$("[data-panel]").forEach(function (pn) { pn.hidden = pn.getAttribute("data-panel") !== key; });
      return;
    }
  });

  /* keep the saved button label in sync */
  document.addEventListener("zed:change", function () {
    var b = $(".pdp__buy [data-wish]");
    if (b) b.innerHTML = Z.icons.heart + (Z.wish.has(p.id) ? "Saved" : "Save");
  });

  /* related */
  var rel = Z.products.filter(function (x) {
    return x.id !== p.id && (x.c === p.c || (x.t || []).some(function (t) { return (p.t || []).indexOf(t) !== -1; }));
  }).slice(0, 4);
  if (rel.length) {
    $("#relatedWrap").hidden = false;
    $("#related").innerHTML = rel.map(function (x) { return Z.cardHTML(x); }).join("");
  }

  render();
})();