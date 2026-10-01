/* =========================================================
   ZED Gift Shop — home page
   ========================================================= */
(function () {
  "use strict";
  var Z = window.ZED;
  if (!Z) return;
  var $ = Z.$, esc = Z.esc, money = Z.money, P = Z.products;

  /* hero artwork */
  var heroIds = ["p01", "p14", "p02", "p09"];
  var heroArt = $("#heroArt");
  heroArt.innerHTML = heroIds.map(function (id) {
    var p = Z.byId(id);
    return '<div class="hero__tile">' + Z.art(p.a, p.s) + "</div>";
  }).join("");

  /* category tiles */
  $("#homeCats").innerHTML = Z.categories.map(function (c) {
    var items = P.filter(function (p) { return p.c === c; });
    var lead = items[0];
    return '<a class="cattile" href="shop.html?category=' + encodeURIComponent(c) + '">' +
      '<span class="cattile__art">' + (lead ? Z.art(lead.a, lead.s) : "") + "</span>" +
      "<b>" + esc(c) + "</b>" +
      "<span>" + items.length + " item" + (items.length === 1 ? "" : "s") + "</span></a>";
  }).join("");

  /* featured = best sellers */
  var best = P.filter(function (p) { return p.b === "best"; }).slice(0, 8);
  $("#homeFeat").innerHTML = best.map(function (p) { return Z.cardHTML(p); }).join("");

  var byPop = P.slice().sort(function (a, b) { return b.rv - a.rv; });
  $("#homeBest").innerHTML = byPop.slice(0, 8).map(function (p) { return Z.cardHTML(p); }).join("");

  var fresh = P.filter(function (p) { return p.new; });
  $("#homeNew").innerHTML = fresh.map(function (p) { return Z.cardHTML(p); }).join("");

  /* occasions */
  var occSeen = {}, occ = [];
  P.forEach(function (p) {
    (p.occ || []).forEach(function (o) {
      if (occSeen[o]) occSeen[o].n++;
      else { occSeen[o] = { id: o, n: 1 }; occ.push(occSeen[o]); }
    });
  });
  var OCC_LABEL = {
    birthday: "Birthday", wedding: "Wedding", graduation: "Graduation",
    "fathers-day": "Father's Day", "mothers-day": "Mother's Day", anniversary: "Anniversary",
    valentines: "Valentine's Day", christmas: "Christmas", "housewarming": "Housewarming",
    "baby-shower": "Baby Shower", celebration: "Celebration", "thank-you": "Thank You",
    corporate: "Corporate", "just-because": "Just Because"
  };
  $("#homeOcc").innerHTML = occ
    .sort(function (a, b) { return b.n - a.n; })
    .map(function (o) {
      return '<a class="pill" href="shop.html?occasion=' + encodeURIComponent(o.id) + '">' +
        (OCC_LABEL[o.id] || esc(o.id)) + ' <span style="color:var(--muted)">(' + o.n + ")</span></a>";
    }).join("");

  /* newsletter */
  Z.on($("#newsForm"), "submit", function (e) {
    e.preventDefault();
    var v = $("#newsEmail").value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
      Z.toast("Enter a valid email address to subscribe.", "error");
      return;
    }
    Z.notify("You're on the list", "We'll send gift guides and offers to " + v + ".");
    Z.toast("Subscribed — welcome to ZED.");
    $("#newsEmail").value = "";
  });

  /* refresh card states when the wishlist changes */
  document.addEventListener("zed:change", function () {
    var hearts = Z.$$("#homeFeat [data-wish], #homeBest [data-wish], #homeNew [data-wish]");
    hearts.forEach(function (b) {
      var on = Z.wish.has(b.getAttribute("data-wish"));
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  });
})();