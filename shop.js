/* =========================================================
   ZED Gift Shop — shop / catalogue listing
   ========================================================= */
(function () {
  "use strict";
  var Z = window.ZED;
  if (!Z) return;
  var $ = Z.$, $$ = Z.$$, esc = Z.esc, money = Z.money, P = Z.products;

  var PER = 12;
  /* multi-value filters are pipe-separated in the URL, e.g. ?color=Black|Gold */
  function multi(name) {
    return Z.qs(name).split("|").filter(Boolean);
  }
  var state = {
    q: Z.qs("q"),
    category: multi("category"),
    brand: multi("brand"),
    color: multi("color"),
    size: multi("size"),
    occasion: multi("occasion"),
    recipient: multi("recipient"),
    availability: multi("availability"),
    price: multi("price").map(Number).filter(function (n) { return !isNaN(n); }),
    page: Math.max(1, Number(Z.qs("page")) || 1)
  };
  if (Z.qs("sort")) $("#sort").value = Z.qs("sort");

  var PRICE_BANDS = [
    { n: "Under KShs 1,000", min: 0, max: 999 },
    { n: "KShs 1,000 – 2,499", min: 1000, max: 2499 },
    { n: "KShs 2,500 – 4,999", min: 2500, max: 4999 },
    { n: "KShs 5,000 and above", min: 5000, max: Infinity }
  ];
  var OCC = [
    { f: "birthday", n: "Birthday" }, { f: "wedding", n: "Wedding" },
    { f: "graduation", n: "Graduation" }, { f: "anniversary", n: "Anniversary" },
    { f: "fathers-day", n: "Father's Day" }, { f: "mothers-day", n: "Mother's Day" },
    { f: "valentines", n: "Valentine's Day" }, { f: "christmas", n: "Christmas" },
    { f: "housewarming", n: "Housewarming" }, { f: "corporate", n: "Corporate" },
    { f: "thank-you", n: "Thank You" }, { f: "celebration", n: "Celebration" },
    { f: "baby-shower", n: "Baby Shower" }, { f: "just-because", n: "Just Because" }
  ];
  var RECIP = [
    { f: "him", n: "For Him" }, { f: "her", n: "For Her" }, { f: "couples", n: "For Couples" },
    { f: "friends", n: "For Friends" }, { f: "boss", n: "For Boss" },
    { f: "corporate", n: "For Corporate" }, { f: "colleagues", n: "For Colleagues" }
  ];

  /* ---------------- filtering ---------------- */
  /* an item passes when it satisfies every selected value */
  function matches(p, key, list) {
    if (!list.length) return true;
    return list.every(function (v) {
      if (key === "availability") {
        if (v === "sale") return !!p.w && p.w > p.p;
        if (v === "new") return !!p.new;
        if (v === "in") return p.st > 0;
        return false;
      }
      var field = key === "category" ? "c" : key === "occasion" ? "occ" : key === "recipient" ? "recip" : key;
      var vals = p[field];
      if (typeof vals === "string") return vals === v;
      return (vals || []).indexOf(v) !== -1;
    });
  }

  function filtered() {
    var q = state.q.toLowerCase();
    var out = P.filter(function (p) {
      if (q) {
        var hay = [p.n, p.c, p.brand, p.d].concat(p.t || []).join(" ").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      if (!matches(p, "category", state.category)) return false;
      if (!matches(p, "brand", state.brand)) return false;
      if (!matches(p, "color", state.color)) return false;
      if (!matches(p, "size", state.size)) return false;
      if (!matches(p, "occ", state.occasion)) return false;
      if (!matches(p, "recip", state.recipient)) return false;
      if (!matches(p, "availability", state.availability)) return false;
      if (state.price.length) {
        var ok = state.price.some(function (i) {
          var b = PRICE_BANDS[i];
          return p.p >= b.min && p.p <= b.max;
        });
        if (!ok) return false;
      }
      return true;
    });

    var s = $("#sort").value;
    if (s === "popularity") out.sort(function (a, b) { return b.rv - a.rv; });
    else if (s === "rating") out.sort(function (a, b) { return b.r - a.r; });
    else if (s === "new") out.sort(function (a, b) { return (b.new ? 1 : 0) - (a.new ? 1 : 0); });
    else if (s === "price-asc") out.sort(function (a, b) { return a.p - b.p; });
    else if (s === "price-desc") out.sort(function (a, b) { return b.p - a.p; });
    return out;
  }

  /* ---------------- sidebar ---------------- */
  function setGroup(name, label, optionsHtml) {
    var isOn = state[name].length > 0;
    return '<div class="fset' + (isOn ? " open" : "") + '" data-set="' + name + '">' +
      '<button class="fset__t" type="button" data-fg aria-expanded="' + (isOn ? "true" : "false") + '">' +
        "<span>" + esc(label) + "</span>" + (isOn ? '<em class="fset__n">' + state[name].length + "</em>" : "") +
      "</button>" +
      '<div class="fset__p"><div class="fset__i"><div>' + optionsHtml + "</div></div></div></div>";
  }
  function cb(key, val, label, checked, count) {
    return '<label class="fopt"><input type="checkbox" data-f="' + key + '" value="' + esc(val) + '"' +
      (checked ? " checked" : "") + '><span>' + esc(label) + "</span>" +
      (count != null ? '<em class="fopt__n">' + count + "</em>" : "") + "</label>";
  }
  function countBy(key, val) {
    return P.filter(function (p) { return (p[key] || []).indexOf(val) !== -1; }).length;
  }

  function renderSide() {
    $("#side").innerHTML =
      '<div class="side__hd"><h2 class="ttl" style="font-size:17px">Filters</h2>' +
        '<button class="linkbtn" id="clearAll" type="button">Clear all</button></div>' +
      setGroup("category", "Category", Z.categories.map(function (c) {
        return cb("category", c, c, state.category.indexOf(c) !== -1, countBy("c", c));
      }).join("")) +
      setGroup("brand", "Brand", Z.brands.map(function (b) {
        return cb("brand", b, b, state.brand.indexOf(b) !== -1, countBy("brand", b));
      }).join("")) +
      setGroup("price", "Price", PRICE_BANDS.map(function (b, i) {
        return cb("price", i, b.n, state.price.indexOf(i) !== -1);
      }).join("")) +
      setGroup("occasion", "Occasion", OCC.map(function (o) {
        return cb("occasion", o.f, o.n, state.occasion.indexOf(o.f) !== -1, countBy("occ", o.f));
      }).join("")) +
      setGroup("recipient", "Recipient", RECIP.map(function (r) {
        return cb("recipient", r.f, r.n, state.recipient.indexOf(r.f) !== -1, countBy("recip", r.f));
      }).join("")) +
      setGroup("size", "Size", Z.sizes.map(function (s) {
        return cb("size", s, s, state.size.indexOf(s) !== -1);
      }).join("")) +
      setGroup("color", "Colour", Z.colors.map(function (c) {
        return cb("color", c, c, state.color.indexOf(c) !== -1);
      }).join("")) +
      setGroup("availability", "Availability",
        cb("availability", "in", "In stock only", state.availability.indexOf("in") !== -1) +
        cb("availability", "sale", "On sale", state.availability.indexOf("sale") !== -1) +
        cb("availability", "new", "New arrivals", state.availability.indexOf("new") !== -1));
  }

  /* ---------------- chips ---------------- */
  var CHIP_LABEL = {
    category: "Category", brand: "Brand", color: "Colour", size: "Size",
    occasion: "Occasion", recipient: "Recipient", availability: "Filter", price: "Price"
  };
  function chipName(key, val) {
    if (key === "availability") return { in: "In stock only", sale: "On sale", new: "New arrivals" }[val];
    if (key === "price") return PRICE_BANDS[val].n;
    if (key === "occasion") {
      var o = OCC.filter(function (x) { return x.f === val; })[0];
      return o ? o.n : val;
    }
    if (key === "recipient") {
      var r = RECIP.filter(function (x) { return x.f === val; })[0];
      return r ? r.n : val;
    }
    return val;
  }
  function renderChips() {
    var items = [];
    if (state.q) items.push({ key: "q", val: "", name: "“" + state.q + "”" });
    ["category", "brand", "color", "size", "occasion", "recipient", "availability", "price"].forEach(function (k) {
      state[k].forEach(function (v) { items.push({ key: k, val: v, name: chipName(k, v) }); });
    });
    $("#chips").innerHTML = items.map(function (i) {
      return '<button class="chip" type="button" data-chip="' + i.key + '" data-cv="' + esc(i.val) + '">' +
        esc(i.name) + " <span aria-hidden=\"true\">×</span>" +
        '<span class="sr-only">Remove filter</span></button>';
    }).join("");
  }

  /* ---------------- render ---------------- */
  function render() {
    renderSide();
    renderChips();
    var items = filtered();
    var pages = Math.max(1, Math.ceil(items.length / PER));
    if (state.page > pages) state.page = pages;
    var slice = items.slice((state.page - 1) * PER, state.page * PER);

    $("#cnt").textContent = items.length
      ? "Showing " + ((state.page - 1) * PER + 1) + "–" + Math.min(state.page * PER, items.length) +
        " of " + items.length + " result" + (items.length === 1 ? "" : "s")
      : "No results";

    $("#grid").innerHTML = slice.map(function (p) { return Z.cardHTML(p); }).join("");
    $("#none").hidden = items.length > 0;

    var pg = [];
    for (var i = 1; i <= pages; i++) {
      pg.push('<button class="pager__b' + (i === state.page ? " is-on" : "") + '" type="button" data-page="' + i +
        '" aria-current="' + (i === state.page ? "page" : "false") + '">' + i + "</button>");
    }
    if (state.page > 1) pg.unshift('<button class="pager__b" type="button" data-page="' + (state.page - 1) + '">Prev</button>');
    if (state.page < pages) pg.push('<button class="pager__b" type="button" data-page="' + (state.page + 1) + '">Next</button>');
    $("#pager").innerHTML = pages > 1 ? pg.join("") : "";
    syncHearts();
    syncUrl();
  }

  function syncHearts() {
    $$("#grid [data-wish]").forEach(function (b) {
      var on = Z.wish.has(b.getAttribute("data-wish"));
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function syncUrl() {
    var p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    ["category", "brand", "color", "size", "occasion", "recipient", "availability"].forEach(function (k) {
      if (state[k].length) p.set(k, state[k].join("|"));
    });
    if (state.price.length) p.set("price", state.price.join("|"));
    var s = $("#sort").value;
    if (s && s !== "featured") p.set("sort", s);
    if (state.page > 1) p.set("page", state.page);
    var q = p.toString();
    history.replaceState(null, "", location.pathname + (q ? "?" + q : ""));
  }

  /* ---------------- events ---------------- */
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (!t.matches || !t.matches("[data-f]")) return;
    var key = t.getAttribute("data-f"), val = t.getAttribute("value");
    var list = state[key] || (state[key] = []);
    var i = list.indexOf(val);
    if (t.checked && i === -1) list.push(key === "price" ? Number(val) : val);
    if (!t.checked && i !== -1) list.splice(i, 1);
    state.page = 1;
    render();
  });

  document.addEventListener("click", function (e) {
    var el;
    if ((el = e.target.closest("[data-fg]"))) {
      var box = el.closest(".fset");
      var open = box.classList.toggle("open");
      el.setAttribute("aria-expanded", open ? "true" : "false");
      return;
    }
    if ((el = e.target.closest("[data-chip]"))) {
      var k = el.getAttribute("data-chip"), v = el.getAttribute("data-cv");
      if (k === "q") state.q = "";
      else {
        var arr = state[k];
        var ix = arr.indexOf(k === "price" ? Number(v) : v);
        if (ix !== -1) arr.splice(ix, 1);
      }
      state.page = 1;
      render();
      return;
    }
    if ((el = e.target.closest("[data-page]"))) {
      state.page = Number(el.getAttribute("data-page"));
      render();
      $("#listing").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (e.target.closest("#clearAll")) {
      state.category = []; state.brand = []; state.color = []; state.size = [];
      state.occasion = []; state.recipient = []; state.availability = [];
      state.price = []; state.q = ""; state.page = 1;
      render();
    }
  });

  Z.on($("#sort"), "change", function () { state.page = 1; render(); });

  Z.on($("#filterToggle"), "click", function () {
    var side = $("#side");
    var open = side.classList.toggle("is-open");
    this.setAttribute("aria-expanded", open ? "true" : "false");
  });

  document.addEventListener("zed:change", syncHearts);

  /* heading reflects the active filter */
  var head = $("h1");
  if (state.category.length) {
    head.textContent = state.category.length === 1
      ? state.category[0]
      : state.category.join(" · ");
  }

  render();
})();