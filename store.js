/* ==========================================================================
   ZED GIFT SHOP — store engine
   Catalogue, cart, orders, payments (simulated), reviews, notifications.
   State persists to localStorage. No backend.
   ========================================================================== */
(function (global) {
  "use strict";

  /* ---------------- utils ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var on = function (el, ev, fn, o) { if (el) el.addEventListener(ev, fn, o || false); };
  var clamp = function (n, a, b) { return Math.min(b, Math.max(a, n)); };

  var NF = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });
  function money(n) { return "KShs" + NF.format(Math.round(Number(n) || 0)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function qs(name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
  }
  function uid(prefix) {
    return (prefix || "id") + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function fmtDate(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
  }
  function fmtDateTime(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString("en-KE", { day: "2-digit", month: "short" }) + ", " +
      d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
  }
  function addDays(n) {
    var d = new Date(); d.setDate(d.getDate() + n); return d.toISOString();
  }

  /* ---------------- persistence ---------------- */
  var KEY = "zed.store.v1";
  var DB = load();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var d = JSON.parse(raw);
        d.cart = d.cart || []; d.saved = d.saved || []; d.wish = d.wish || [];
        d.orders = d.orders || []; d.reviews = d.reviews || []; d.addresses = d.addresses || [];
        d.notify = d.notify || [];
        return d;
      }
    } catch (e) {}
    return {
      cart: [], saved: [], wish: [], orders: [], reviews: [], addresses: [],
      user: null, coupon: null, notify: [], seeded: false
    };
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {}
    document.dispatchEvent(new CustomEvent("zed:change"));
  }

  /* ---------------- order lifecycle ---------------- */
  var STATUS = [
    { id: "PENDING_PAYMENT", label: "Pending Payment", stage: "Order Placed",
      msg: "We have received your order and are waiting for payment." },
    { id: "PAID", label: "Paid", stage: "Payment Confirmed",
      msg: "Payment received. Thank you!" },
    { id: "PROCESSING", label: "Processing", stage: "Order Processing",
      msg: "We are preparing and checking your items." },
    { id: "PACKED", label: "Packed", stage: "Order Packed",
      msg: "Your items are packed and labelled." },
    { id: "DISPATCHED", label: "Dispatched", stage: "Dispatched",
      msg: "Your parcel has been handed to the courier." },
    { id: "IN_TRANSIT", label: "In Transit", stage: "In Transit",
      msg: "Your parcel is moving through the network." },
    { id: "OUT_FOR_DELIVERY", label: "Out for Delivery", stage: "Out for Delivery",
      msg: "The rider is on the way to your address." },
    { id: "DELIVERED", label: "Delivered", stage: "Delivered",
      msg: "Delivered. We hope you love it!" },
    { id: "CANCELLED", label: "Cancelled", stage: "Cancelled",
      msg: "This order was cancelled." },
    { id: "REFUNDED", label: "Refunded", stage: "Refunded",
      msg: "Your refund has been processed." }
  ];
  /* customer-facing timeline only */
  var TIMELINE = ["PENDING_PAYMENT", "PAID", "PROCESSING", "PACKED", "DISPATCHED",
    "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];

  function statusMeta(id) {
    for (var i = 0; i < STATUS.length; i++) if (STATUS[i].id === id) return STATUS[i];
    return STATUS[0];
  }

  /* ---------------- catalogue ---------------- */
  var ART = {
    giftbox: '<g><ellipse cx="50" cy="90" rx="30" ry="6" fill="url(#S)"/><rect x="20" y="44" width="60" height="46" rx="5" fill="url(#G)"/><rect x="16" y="36" width="68" height="12" rx="4" fill="url(#L)"/><rect x="45" y="34" width="10" height="58" fill="url(#B)"/><path d="M50 34c-9 0-14-4.5-14-9s8.5-6 14 9c5.5-15 14-9 14-9s-5 9-14 9Z" fill="url(#A)"/><rect x="24" y="52" width="9" height="30" rx="3" fill="#fff" opacity=".2"/></g>',
    watch: '<g><ellipse cx="50" cy="92" rx="20" ry="4.5" fill="url(#S)"/><path d="M41 8h18v20H41zM41 72h18v20H41z" fill="url(#B)"/><rect x="39" y="24" width="22" height="52" rx="11" fill="url(#B)"/><circle cx="50" cy="50" r="22" fill="url(#G)"/><circle cx="50" cy="50" r="17" fill="url(#L)"/><g stroke="#2c3a33" stroke-width="1.5" opacity=".55" stroke-linecap="round"><path d="M50 35v3.5M50 61.5V65M35 50h3.5M61.5 50H65"/></g><path d="M50 50V38" stroke="#2c3a33" stroke-width="2.4" stroke-linecap="round"/><path d="M50 50l8 5" stroke="#2c3a33" stroke-width="2" stroke-linecap="round"/><circle cx="50" cy="50" r="1.9" fill="#2c3a33"/><rect x="70" y="46" width="4" height="8" fill="#2c3a33" opacity=".7"/></g>',
    mug: '<g><ellipse cx="50" cy="88" rx="24" ry="5.5" fill="url(#S)"/><path d="M66 40h9a11 11 0 0 1 0 22h-9" fill="none" stroke="#5f88ac" stroke-width="6"/><path d="M26 32h44v34a22 22 0 0 1-22 22H48a22 22 0 0 1-22-22Z" fill="url(#G)"/><ellipse cx="48" cy="32" rx="22" ry="6" fill="url(#L)"/><rect x="31" y="38" width="9" height="40" rx="4.5" fill="#fff" opacity=".28"/></g>',
    tumbler: '<g><ellipse cx="50" cy="90" rx="21" ry="5" fill="url(#S)"/><path d="M33 22h34l-4 62a8 8 0 0 1-8 7H45a8 8 0 0 1-8-7Z" fill="url(#G)"/><rect x="30" y="15" width="40" height="9" rx="4.5" fill="#3b4741" opacity=".85"/><path d="M38 30l-2 48" stroke="#fff" stroke-width="3" opacity=".35" stroke-linecap="round"/></g>',
    bottle: '<g><ellipse cx="50" cy="91" rx="18" ry="4.5" fill="url(#S)"/><rect x="43" y="6" width="14" height="9" rx="3" fill="#2c3a33" opacity=".9"/><path d="M44 14h12v10l7 11v49a7 7 0 0 1-7 7H44a7 7 0 0 1-7-7V35l7-11Z" fill="url(#G)"/><rect x="37" y="48" width="26" height="18" rx="4" fill="#fff" opacity=".55"/><path d="M41 26l-3 54" stroke="#fff" stroke-width="3" opacity=".4" stroke-linecap="round"/></g>',
    wallet: '<g><ellipse cx="50" cy="86" rx="28" ry="5" fill="url(#S)"/><rect x="14" y="30" width="72" height="44" rx="9" fill="url(#G)"/><path d="M14 39h58a12 12 0 0 1 12 12v7H14" fill="url(#B)" opacity=".45"/><path d="M20 33h48" stroke="#8a6a3a" stroke-width="1.2" stroke-dasharray="3 3" opacity=".5"/><circle cx="76" cy="58" r="5" fill="url(#A)"/></g>',
    belt: '<g><ellipse cx="50" cy="80" rx="30" ry="5" fill="url(#S)"/><rect x="8" y="40" width="84" height="18" rx="4" fill="url(#G)"/><path d="M8 44h84" stroke="#fff" stroke-width="2" opacity=".3"/><rect x="36" y="32" width="28" height="34" rx="6" fill="none" stroke="url(#B)" stroke-width="5"/><rect x="45" y="42" width="10" height="14" rx="2" fill="url(#A)"/></g>',
    perfume: '<g><ellipse cx="50" cy="90" rx="20" ry="5" fill="url(#S)"/><rect x="45" y="4" width="10" height="10" rx="3" fill="#2c3a33" opacity=".9"/><rect x="42" y="13" width="16" height="14" rx="4" fill="url(#B)" opacity=".7"/><rect x="32" y="26" width="36" height="56" rx="9" fill="url(#G)"/><rect x="36" y="44" width="28" height="20" rx="4" fill="#fff" opacity=".6"/><rect x="36" y="32" width="6" height="44" rx="3" fill="#fff" opacity=".3"/></g>',
    necklace: '<g><ellipse cx="50" cy="90" rx="16" ry="4" fill="url(#S)"/><path d="M24 20c0 30 12 46 26 46s26-16 26-46" fill="none" stroke="url(#B)" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="70" r="11" fill="url(#G)"/><circle cx="50" cy="70" r="11" fill="none" stroke="#b07a6e" stroke-width="1.4" opacity=".45"/><path d="M50 63l4 7-4 7-4-7Z" fill="#fff" opacity=".65"/></g>',
    bracelet: '<g><ellipse cx="50" cy="86" rx="22" ry="4.5" fill="url(#S)"/><circle cx="50" cy="50" r="26" fill="none" stroke="url(#B)" stroke-width="9"/><circle cx="50" cy="50" r="26" fill="none" stroke="#fff" stroke-width="2.4" opacity=".45" stroke-dasharray="4 8"/><circle cx="50" cy="22" r="6" fill="url(#A)"/></g>',
    ring: '<g><ellipse cx="50" cy="86" rx="18" ry="4" fill="url(#S)"/><circle cx="50" cy="60" r="21" fill="none" stroke="url(#B)" stroke-width="8"/><path d="M50 14l11 15-11 15-11-15Z" fill="url(#G)"/><path d="M50 14l11 15H39Z" fill="#fff" opacity=".45"/></g>',
    trophy: '<g><ellipse cx="50" cy="92" rx="22" ry="4.5" fill="url(#S)"/><path d="M32 20h36v18a18 18 0 0 1-36 0Z" fill="url(#G)"/><path d="M32 23h-9a10 10 0 0 0 10 13M68 23h9a10 10 0 0 1-10 13" fill="none" stroke="url(#B)" stroke-width="5"/><rect x="45" y="56" width="10" height="16" fill="url(#B)"/><rect x="30" y="72" width="40" height="11" rx="4" fill="url(#B)"/></g>',
    award: '<g><ellipse cx="50" cy="92" rx="20" ry="4.5" fill="url(#S)"/><circle cx="50" cy="40" r="23" fill="url(#G)"/><circle cx="50" cy="40" r="23" fill="none" stroke="#fff" stroke-width="1.6" opacity=".65"/><path d="M38 58l-8 30 20-10 20 10-8-30" fill="url(#B)"/><path d="M42 40l6 6 12-13" stroke="#2c3a33" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/></g>',
    diary: '<g><ellipse cx="50" cy="90" rx="22" ry="4.5" fill="url(#S)"/><rect x="26" y="12" width="48" height="72" rx="6" fill="url(#B)"/><rect x="30" y="12" width="38" height="72" rx="5" fill="url(#G)"/><rect x="36" y="38" width="26" height="3" rx="1.5" fill="#fff" opacity=".75"/><rect x="36" y="46" width="18" height="3" rx="1.5" fill="#fff" opacity=".5"/><rect x="66" y="34" width="4" height="30" rx="2" fill="url(#A)"/></g>',
    notebook: '<g><ellipse cx="50" cy="88" rx="20" ry="4" fill="url(#S)"/><rect x="28" y="12" width="44" height="70" rx="6" fill="url(#G)"/><rect x="28" y="12" width="44" height="12" rx="5" fill="url(#B)"/><rect x="36" y="36" width="26" height="3" rx="1.5" fill="#fff" opacity=".7"/><rect x="36" y="44" width="18" height="3" rx="1.5" fill="#fff" opacity=".45"/></g>',
    keychain: '<g><ellipse cx="50" cy="90" rx="16" ry="4" fill="url(#S)"/><path d="M42 6a9 9 0 0 1 8 12" fill="none" stroke="#2c3a33" stroke-width="3.4" opacity=".75"/><rect x="32" y="24" width="36" height="58" rx="10" fill="url(#G)"/><rect x="39" y="44" width="22" height="3" rx="1.5" fill="#fff" opacity=".7"/></g>',
    blanket: '<g><ellipse cx="50" cy="90" rx="32" ry="5" fill="url(#S)"/><path d="M16 22h68v52a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6Z" fill="url(#G)"/><path d="M16 22h68v13H16Z" fill="url(#B)"/><g stroke="#fff" stroke-width="2" opacity=".4"><path d="M32 35v45M46 35v45M60 35v45M74 35v45"/></g></g>',
    hamper: '<g><ellipse cx="50" cy="90" rx="30" ry="5" fill="url(#S)"/><path d="M20 24c0-8 13-14 30-14s30 6 30 14" fill="none" stroke="#2c3a33" stroke-width="3" opacity=".6"/><path d="M18 26h64l-6 56H24Z" fill="url(#G)"/><path d="M14 24h72v10H14Z" fill="url(#B)"/><path d="M50 24c-10 0-15-6-15-11s9-4 15 11c6-15 15-11 15-11s-5 11-15 11Z" fill="url(#A)"/><rect x="40" y="50" width="20" height="18" rx="4" fill="#fff" opacity=".45"/></g>',
    desk: '<g><ellipse cx="50" cy="88" rx="30" ry="5" fill="url(#S)"/><rect x="14" y="42" width="72" height="38" rx="7" fill="url(#G)"/><rect x="14" y="42" width="72" height="10" rx="5" fill="url(#B)" opacity=".8"/><rect x="24" y="58" width="24" height="16" rx="3" fill="#fff" opacity=".7"/><rect x="30" y="24" width="10" height="20" rx="4" fill="url(#B)"/></g>',
    candle: '<g><ellipse cx="50" cy="92" rx="20" ry="4.5" fill="url(#S)"/><path d="M50 44V32c0-3.5 3.5-3.5 3.5-7S50 18 50 18s-3.5 2.8-3.5 7 3.5 3.5 3.5 7Z" fill="#E8912F"/><rect x="34" y="42" width="32" height="46" rx="7" fill="url(#G)"/><ellipse cx="50" cy="42" rx="16" ry="4.5" fill="url(#L)"/><rect x="38" y="56" width="24" height="14" rx="3" fill="#fff" opacity=".5"/></g>'
  };

  var SKIN = {
    green: ["#EEF4EF", "#3f7d55", "#a9cbb2"], gold: ["#F7F2E6", "#b98a2e", "#e6cf9a"],
    sand: ["#F7F1E8", "#bd9463", "#e5d2b4"], rose: ["#FBEDEC", "#cf7d74", "#f0c4bf"],
    sky: ["#EAF1F7", "#5f88ac", "#b7cee0"], stone: ["#F0F2F1", "#6f7873", "#c0c8c2"],
    ink: ["#E9ECEB", "#2c3a33", "#a3b1a9"], lilac: ["#F1EEF8", "#7d72ac", "#c8c0e0"]
  };
  var _uid = 0;
  function art(kind, skin, angle) {
    var s = SKIN[skin] || SKIN.green;
    var id = "z" + (++_uid);
    var body = s[1], dark = shade(body, .34), lite = tint(body, .42);
    var rot = angle ? ' transform="rotate(' + angle + ' 50 50)"' : "";
    var shape = (ART[kind] || ART.giftbox).replace(/url\(#([A-Z])\)/g, "url(#$1" + id + ")");
    return '<svg class="art" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' +
      '<defs>' +
      '<radialGradient id="R' + id + '" cx="50%" cy="32%" r="78%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="' + s[0] + '"/></radialGradient>' +
      '<linearGradient id="G' + id + '" x1="18%" y1="6%" x2="86%" y2="96%"><stop offset="0%" stop-color="' + lite + '"/><stop offset="52%" stop-color="' + body + '"/><stop offset="100%" stop-color="' + dark + '"/></linearGradient>' +
      '<linearGradient id="B' + id + '" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="' + body + '"/><stop offset="100%" stop-color="' + dark + '"/></linearGradient>' +
      '<linearGradient id="L' + id + '" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="' + lite + '"/><stop offset="100%" stop-color="' + body + '"/></linearGradient>' +
      '<linearGradient id="A' + id + '" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="' + s[2] + '"/><stop offset="100%" stop-color="' + body + '"/></linearGradient>' +
      '<linearGradient id="S' + id + '" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="' + dark + '" stop-opacity=".32"/><stop offset="100%" stop-color="' + dark + '" stop-opacity="0"/></linearGradient>' +
      '</defs>' +
      '<rect width="100" height="100" fill="url(#R' + id + ')"/>' +
      '<g' + rot + '>' + shape + '</g></svg>';
  }
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hex(c) { return "#" + ((1 << 24) + (c[0] << 16) + (c[1] << 8) + c[2]).toString(16).slice(1); }
  function shade(h, a) { var c = rgb(h); return hex([0, 1, 2].map(function (i) { return clamp(Math.round(c[i] * (1 - a)), 0, 255); })); }
  function tint(h, a) { var c = rgb(h); return hex([0, 1, 2].map(function (i) { return clamp(Math.round(c[i] + (255 - c[i]) * a), 0, 255); })); }

  /* gallery angles give the detail page four distinct views */
  var ANGLES = [0, 35, -35, 90];

  var CATEGORIES = ["Gift Sets", "Personalized", "Watches", "Jewelry", "Trophies",
    "Corporate", "Fragrance", "Home", "Stationery", "Accessories", "Office"];
  var BRANDS = ["ZED", "Curren", "Crrju", "Olevs", "Chenxi", "Naviforce", "Skmei", "Kana"];
  var COLORS = ["Black", "Brown", "White", "Gold", "Green", "Blue", "Red", "Pink"];
  var SIZES = ["Small", "Medium", "Large", "One Size"];

  var P = [
    { id: "p01", n: "Personalized Gift Box", c: "Gift Sets", brand: "ZED", size: ["One Size"], color: ["Brown", "Green"], p: 2500, w: 3200, r: 4.9, rv: 128, st: 24, occ: ["birthday", "anniversary", "christmas"], recip: ["her", "couples"], t: ["gift box", "hamper", "personalized"], b: "best", a: "giftbox", s: "green", new: 1, d: "A curated box of thoughtful keepsakes — ribbon, card and a handwritten note included.", sp: { Packaging: "Gift box", Wrapping: "Free", Personalization: "Name & message", Origin: "Nairobi, Kenya" } },
    { id: "p02", n: "Classic Leather Watch", c: "Watches", brand: "Curren", size: ["One Size"], color: ["Brown", "Black"], p: 3800, w: 4800, r: 4.8, rv: 96, st: 12, occ: ["birthday", "fathers-day", "anniversary"], recip: ["him", "boss"], t: ["watch", "leather", "men"], b: "sale", a: "watch", s: "stone", d: "Minimal stainless-steel case with a genuine leather strap. Comes in a presentation box.", sp: { Movement: "Quartz", Strap: "Genuine leather", Diameter: "42mm", Warranty: "1 year" } },
    { id: "p03", n: "Couple Watches Set", c: "Watches", brand: "Crrju", size: ["One Size"], color: ["Black", "Gold"], p: 9800, r: 4.9, rv: 64, st: 6, occ: ["anniversary", "wedding", "valentines"], recip: ["couples"], t: ["couple watches", "matching", "wedding"], b: "best", a: "watch", s: "ink", d: "Matching His & Hers watches with engraved case backs — a gift that keeps giving.", sp: { Movement: "Quartz", Engraving: "Included", Warranty: "1 year", Box: "Dual gift box" } },
    { id: "p04", n: "Premium Leather Wallet", c: "Accessories", brand: "ZED", size: ["One Size"], color: ["Brown", "Black"], p: 2200, w: 2800, r: 4.7, rv: 152, st: 40, occ: ["birthday", "fathers-day", "graduation"], recip: ["him", "boss"], t: ["wallet", "leather", "gift"], b: "sale", a: "wallet", s: "sand", d: "Full-grain leather bifold with RFID protection and eight card slots.", sp: { Material: "Full-grain leather", Cards: "8 slots", RFID: "Yes", Dimensions: "11 x 9cm" } },
    { id: "p05", n: "Rose Gold Pendant Necklace", c: "Jewelry", brand: "Kana", size: ["One Size"], color: ["Pink", "Gold"], p: 1999, w: 2500, r: 4.8, rv: 88, st: 18, occ: ["anniversary", "valentines", "birthday"], recip: ["her", "couples"], t: ["necklace", "pendant", "gold"], b: "sale", a: "necklace", s: "rose", d: "A delicate pendant on a fine chain, presented in a velvet box.", sp: { Metal: "Rose gold plated", Chain: "45cm", Box: "Velvet", Care: "Avoid perfume" } },
    { id: "p06", n: "Custom Printed Mug", c: "Personalized", brand: "ZED", size: ["Small", "One Size"], color: ["White", "Blue", "Red"], p: 900, r: 4.6, rv: 210, st: 120, occ: ["just-because", "graduation", "birthday"], recip: ["her", "him", "friends"], t: ["mug", "custom", "photo", "personalized"], a: "mug", s: "sky", new: 1, d: "Your photo or design printed on a 350ml ceramic mug. Dishwasher safe.", sp: { Capacity: "350ml", Print: "Sublimation", Care: "Dishwasher safe", Lead: "Lead-free" } },
    { id: "p07", n: "Engraved Steel Tumbler", c: "Personalized", brand: "ZED", size: ["Medium", "Large"], color: ["White", "Black", "Green"], p: 1800, w: 2300, r: 4.8, rv: 174, st: 55, occ: ["birthday", "graduation", "fathers-day"], recip: ["him", "her", "colleagues"], t: ["tumbler", "engraved", "steel"], b: "sale", a: "tumbler", s: "stone", d: "Double-walled stainless tumbler with laser engraving — keeps drinks hot for 6 hours.", sp: { Material: "Stainless steel", Engraving: "Laser", Capacity: "500ml", Insulation: "6 hours" } },
    { id: "p08", n: "Insulated Water Bottle", c: "Personalized", brand: "Naviforce", size: ["Medium", "Large"], color: ["Blue", "Green", "Black"], p: 1499, w: 2000, r: 4.7, rv: 143, st: 72, occ: ["graduation", "just-because"], recip: ["him", "her", "colleagues"], t: ["bottle", "flask", "insulated"], b: "sale", a: "bottle", s: "green", d: "500ml insulated bottle with a laser-etched name or logo.", sp: { Capacity: "500ml", Cold: "12 hours", Print: "Laser etch", Material: "304 steel" } },
    { id: "p09", n: "Crystal Award Trophy", c: "Trophies", brand: "Kana", size: ["Medium", "Large"], color: ["White", "Gold"], p: 3200, r: 4.9, rv: 41, st: 15, occ: ["celebration", "graduation"], recip: ["corporate", "boss"], t: ["trophy", "crystal", "award", "engraved"], b: "new", a: "award", s: "sky", new: 1, d: "Optical crystal award on a wooden base, engraved with recipient and achievement.", sp: { Material: "Crystal & wood", Engraving: "Included", Base: "Wooden", Height: "24cm" } },
    { id: "p10", n: "Classic Cup Trophy", c: "Trophies", brand: "ZED", size: ["Medium", "Large"], color: ["Gold", "Brown"], p: 2100, w: 2600, r: 4.6, rv: 33, st: 22, occ: ["celebration", "graduation"], recip: ["corporate"], t: ["trophy", "cup", "award"], b: "sale", a: "trophy", s: "gold", d: "A timeless engraved cup for sports, academic and corporate achievements.", sp: { Height: "26cm", Engraving: "Included", Finish: "Gold", Base: "Weighted" } },
    { id: "p11", n: "Executive Gift Hamper", c: "Corporate", brand: "ZED", size: ["Large"], color: ["Black", "Brown"], p: 6499, w: 7000, r: 5.0, rv: 27, st: 8, occ: ["celebration", "thank-you"], recip: ["corporate", "boss"], t: ["corporate", "hamper", "executive"], b: "best", a: "hamper", s: "ink", d: "Premium executive hamper with notebook, pen, tumbler and keyring — branded to your company.", sp: { Items: "7 pieces", Branding: "Logo print", Packing: "Rigid gift box", Lead: "3 days" } },
    { id: "p12", n: "Branded A5 Notebook", c: "Corporate", brand: "ZED", size: ["One Size"], color: ["Blue", "Green", "Black"], p: 450, r: 4.6, rv: 186, st: 300, occ: ["graduation", "corporate"], recip: ["corporate", "colleagues"], t: ["notebook", "branded", "stationery", "bulk"], a: "notebook", s: "green", d: "A5 notebook with full-colour cover print. Perfect for bulk corporate orders.", sp: { Size: "A5", Pages: "80 lined", Print: "Full colour", Paper: "80gsm" } },
    { id: "p13", n: "Executive Desk Organizer", c: "Office", brand: "Kana", size: ["One Size"], color: ["Brown", "Black"], p: 2900, w: 3500, r: 4.7, rv: 52, st: 20, occ: ["thank-you", "celebration"], recip: ["corporate", "boss"], t: ["desk", "organizer", "office"], b: "sale", a: "desk", s: "sand", d: "Solid wood desk organizer with pen holder, note pad and cable management.", sp: { Material: "Solid wood", Compartments: "5", Finish: "Matte" } },
    { id: "p14", n: "Maasai-Inspired Fleece Blanket", c: "Home", brand: "ZED", size: ["Large"], color: ["Red", "Blue", "Brown"], p: 3499, w: 4000, r: 4.9, rv: 118, st: 26, occ: ["housewarming", "just-because"], recip: ["her", "him", "couples"], t: ["blanket", "maasai", "warm"], b: "best", a: "blanket", s: "rose", d: "Soft double-sided fleece blanket with traditional Kenyan patterns.", sp: { Size: "150 x 200cm", Material: "Fleece", Care: "Machine wash", Origin: "Kenya" } },
    { id: "p15", n: "Custom Acrylic Keychain", c: "Personalized", brand: "ZED", size: ["Small", "One Size"], color: ["White", "Blue"], p: 350, r: 4.5, rv: 264, st: 400, occ: ["just-because", "graduation"], recip: ["friends", "couples", "her"], t: ["keychain", "custom", "photo", "acrylic"], a: "keychain", s: "lilac", new: 1, d: "Personalised acrylic keychain with your photo, name or logo. Bulk pricing available.", sp: { Size: "6cm", Print: "UV print", Pack: "Single or bulk", Material: "Acrylic" } },
    { id: "p16", n: "Executive Leather Diary", c: "Stationery", brand: "Olevs", size: ["Medium"], color: ["Brown", "Black", "Green"], p: 1900, w: 2400, r: 4.6, rv: 74, st: 34, occ: ["graduation", "corporate"], recip: ["corporate", "boss", "him"], t: ["diary", "planner", "leather"], b: "sale", a: "diary", s: "stone", d: "Hardbound leather diary with ruled pages, ribbon marker and pen loop.", sp: { Pages: "192", Size: "A5", Branding: "Deboss", Material: "Leather" } },
    { id: "p17", n: "Gold Bracelet", c: "Jewelry", brand: "Kana", size: ["Small", "Medium"], color: ["Gold"], p: 2600, r: 4.7, rv: 58, st: 20, occ: ["birthday", "valentines", "anniversary"], recip: ["her"], t: ["bracelet", "gold", "jewelry"], a: "bracelet", s: "gold", d: "Slim gold-tone bracelet with a crystal accent. Adjustable wrist.", sp: { Metal: "Gold plated", Length: "Adjustable", Box: "Included" } },
    { id: "p18", n: "Birthday Gift Basket", c: "Gift Sets", brand: "ZED", size: ["Medium"], color: ["Pink", "Green"], p: 3200, r: 4.8, rv: 91, st: 18, occ: ["birthday", "just-because"], recip: ["her", "friends", "mom"], t: ["basket", "birthday", "gift set"], b: "new", a: "hamper", s: "rose", new: 1, d: "A cheerful gift basket with treats, candles and a birthday card included.", sp: { Items: "9 pieces", Card: "Included", Delivery: "Nationwide" } },
    { id: "p19", n: "Formal Leather Belt", c: "Accessories", brand: "ZED", size: ["Medium", "Large"], color: ["Black", "Brown"], p: 1600, r: 4.5, rv: 67, st: 45, occ: ["birthday", "fathers-day", "graduation"], recip: ["him", "boss"], t: ["belt", "leather", "formal"], a: "belt", s: "sand", d: "Reversible formal belt with a brushed metal buckle.", sp: { Width: "3.5cm", Material: "Genuine leather", Buckle: "Metal", Sizes: "30-44" } },
    { id: "p20", n: "Eau de Parfum 100ml", c: "Fragrance", brand: "Kana", size: ["One Size"], color: ["Gold", "Blue"], p: 3499, w: 4200, r: 4.8, rv: 105, st: 28, occ: ["birthday", "anniversary", "fathers-day"], recip: ["him", "her", "friends"], t: ["perfume", "fragrance", "unisex"], b: "sale", a: "perfume", s: "sky", d: "A warm, woody fragrance that lasts all day. 100ml spray.", sp: { Size: "100ml", Notes: "Woody & amber", Shelf: "3 years", Type: "Eau de Parfum" } },
    { id: "p21", n: "Scented Soy Candle", c: "Home", brand: "ZED", size: ["One Size"], color: ["Pink", "White"], p: 1200, r: 4.6, rv: 88, st: 60, occ: ["housewarming", "just-because", "mothers-day"], recip: ["her", "friends", "mom"], t: ["candle", "scented", "home"], a: "candle", s: "rose", d: "Hand-poured soy candle with a warm vanilla-cedar scent. 40-hour burn.", sp: { Burn: "40 hours", Wax: "Soy", Size: "220g", Scent: "Vanilla cedar" } },
    { id: "p22", n: "Matching Couple Jewelry Set", c: "Jewelry", brand: "Kana", size: ["One Size"], color: ["Gold", "Pink"], p: 3999, w: 4500, r: 4.9, rv: 46, st: 12, occ: ["anniversary", "valentines", "wedding"], recip: ["couples"], t: ["couple", "rings", "matching"], b: "sale", a: "ring", s: "lilac", d: "His & Hers matching rings or pendant set, presented in a joint gift box.", sp: { Material: "Stainless steel", Sets: "His & hers", Box: "Joint gift box", Plating: "18k gold" } },
    { id: "p23", n: "Corporate Kit — Notebook, Tumbler & Tote", c: "Corporate", brand: "ZED", size: ["Medium", "Large"], color: ["Blue", "Black"], p: 4999, w: 6500, r: 4.9, rv: 38, st: 14, occ: ["corporate", "thank-you"], recip: ["corporate"], t: ["corporate", "gift set", "branded", "employee"], b: "best", a: "hamper", s: "sky", d: "A complete branded welcome kit for new staff or clients, with logo print on every item.", sp: { Items: "4 pieces", Branding: "Logo print", Packaging: "Gift box", MOQ: "10 kits" } },
    { id: "p24", n: "Baby Shower Gift Set", c: "Gift Sets", brand: "ZED", size: ["Medium"], color: ["Blue", "Pink"], p: 3800, r: 4.8, rv: 39, st: 16, occ: ["celebration", "baby-shower"], recip: ["her", "friends", "couples"], t: ["baby shower", "mom", "gift set"], b: "new", a: "giftbox", s: "sky", new: 1, d: "A thoughtful hamper for new parents with keepsakes, tea and a keepsake card.", sp: { Items: "6 pieces", Card: "Included", Wrap: "Free" } },
    { id: "p25", n: "Branded Acrylic Name Tag", c: "Corporate", brand: "ZED", size: ["One Size"], color: ["Gold", "White"], p: 499, w: 800, r: 4.5, rv: 44, st: 200, occ: ["corporate", "thank-you"], recip: ["corporate", "colleagues"], t: ["name tag", "branded", "acrylic"], b: "sale", a: "award", s: "gold", d: "Personalised acrylic name badge with your name, role and company logo.", sp: { Size: "7 x 3cm", Print: "UV print", Pack: "Single or bulk", Material: "Acrylic" } },
    { id: "p26", n: "Executive B5 Diary & Pen Set", c: "Stationery", brand: "Olevs", size: ["Large"], color: ["Black", "Green"], p: 1799, w: 2000, r: 4.7, rv: 63, st: 46, occ: ["graduation", "corporate"], recip: ["corporate", "boss", "him"], t: ["diary", "pen", "gift set"], b: "sale", a: "diary", s: "ink", d: "Hardbound B5 executive diary paired with a matching engraved pen, in a gift box.", sp: { Size: "B5", Pages: "160", Branding: "Deboss", Includes: "Diary + pen" } },
    { id: "p27", n: "Branded Jute Tote Bag", c: "Corporate", brand: "ZED", size: ["Large"], color: ["Brown", "White"], p: 1299, w: 1500, r: 4.6, rv: 72, st: 88, occ: ["corporate", "graduation"], recip: ["corporate", "colleagues"], t: ["tote", "jute", "branded", "eco"], b: "sale", a: "hamper", s: "sand", d: "Reusable natural jute tote bag with a full-colour logo print — an eco-friendly corporate giveaway.", sp: { Size: "38 x 42cm", Material: "Jute", Print: "Screen print", Handles: "Cotton" } },
    { id: "p28", n: "Personalized Wooden Perpetual Calendar", c: "Office", brand: "Kana", size: ["One Size"], color: ["Brown", "White"], p: 1999, w: 2500, r: 4.7, rv: 41, st: 38, occ: ["thank-you", "corporate"], recip: ["corporate", "boss"], t: ["calendar", "wooden", "engraved"], b: "sale", a: "desk", s: "sand", d: "Solid wood perpetual desk calendar, engraved with a name, title or company logo.", sp: { Material: "Solid wood", Engraving: "Laser", Size: "18 x 9cm" } },
    { id: "p29", n: "Rose Gold Spinner Pendant", c: "Jewelry", brand: "Chenxi", size: ["One Size"], color: ["Pink", "Gold"], p: 1999, w: 2500, r: 4.7, rv: 52, st: 22, occ: ["valentines", "anniversary", "birthday"], recip: ["her", "couples"], t: ["pendant", "spinner", "personalized"], b: "sale", a: "necklace", s: "rose", new: 1, d: "A smooth spinner pendant on a fine chain, engraved with a name or date.", sp: { Metal: "Rose gold plated", Chain: "45cm", Engraving: "Name or date", Box: "Velvet" } },
    { id: "p30", n: "Premium Perfume Gift Set", c: "Gift Sets", brand: "Kana", size: ["One Size"], color: ["Gold", "Pink"], p: 5499, w: 6800, r: 4.9, rv: 34, st: 10, occ: ["birthday", "anniversary", "fathers-day"], recip: ["him", "her", "couples"], t: ["perfume", "gift set", "fragrance"], b: "best", a: "perfume", s: "gold", d: "Two signature 50ml fragrances presented in a keepsake gift box.", sp: { Items: "2 x 50ml", Box: "Keepsake", Notes: "Woody & floral", Shelf: "3 years" } }
  ];

  function byId(id) { for (var i = 0; i < P.length; i++) if (P[i].id === id) return P[i]; return null; }
  function off(p) { return p.w && p.w > p.p ? Math.round(((p.w - p.p) / p.w) * 100) : 0; }
  function stars(r) { var n = Math.round(r), s = ""; for (var i = 1; i <= 5; i++) s += i <= n ? "★" : "☆"; return s; }
  function gallery(p, n) {
    n = n || 4; var h = "";
    for (var i = 0; i < n; i++) h += art(p.a, p.s, ANGLES[i % ANGLES.length]);
    return h;
  }

  /* ---------------- coupons ---------------- */
  var COUPONS = {
    ZED10: { type: "pct", value: 10, label: "10% off your order", min: 0 },
    WELCOME15: { type: "pct", value: 15, label: "15% off — welcome offer", min: 3000 },
    FREEDEL: { type: "ship", value: 0, label: "Free delivery", min: 0 },
    SAVE500: { type: "flat", value: 500, label: "KShs 500 off", min: 2500 }
  };
  function couponError(code) {
    code = String(code || "").trim().toUpperCase();
    if (!code) return "Enter a promo code.";
    if (!COUPONS[code]) return "That promo code isn't valid. Check the spelling or continue without one.";
    return null;
  }

  /* ---------------- delivery ---------------- */
  var DELIVERY = {
    nairobi: { id: "nairobi", name: "Standard Nairobi", fee: 250, days: 1, note: "Delivered next day in Nairobi" },
    nairobiExpress: { id: "nairobiExpress", name: "Express Nairobi", fee: 450, days: 0, note: "Same-day delivery if you order before 2pm" },
    country: { id: "country", name: "Nationwide Kenya", fee: 350, days: 2, note: "Delivered in 1-2 days to any county" },
    pickup: { id: "pickup", name: "Pickup at store", fee: 0, days: 0, note: "Ready for collection in 2 hours — Nairobi CBD" },
    free: { id: "free", name: "Free Nairobi Delivery", fee: 0, days: 1, note: "Free delivery on orders over KShs 3,000" }
  };

  function deliveryFor(subtotal, zone, express) {
    if (zone === "pickup") return DELIVERY.pickup;
    if (zone === "country") return DELIVERY.country;
    if (express) return DELIVERY.nairobiExpress;
    if (subtotal >= 3000) return DELIVERY.free;
    return DELIVERY.nairobi;
  }

  /* ---------------- cart ---------------- */
  function variantLabel(line) {
    var p = byId(line.id);
    if (!p) return "";
    return [line.size, line.color].filter(Boolean).join(" · ");
  }

  var Cart = {
    lines: function () { return DB.cart; },
    count: function () { return DB.cart.reduce(function (n, l) { return n + l.qty; }, 0); },
    subtotal: function () {
      return DB.cart.reduce(function (n, l) { var p = byId(l.id); return n + (p ? p.p * l.qty : 0); }, 0);
    },
    listSubtotal: function () {  /* subtotal of saved-for-later items */
      return DB.saved.reduce(function (n, l) { var p = byId(l.id); return n + (p ? p.p * l.qty : 0); }, 0);
    },
    discount: function (subtotal, fee) {
      var c = DB.coupon && COUPONS[DB.coupon];
      if (!c) return 0;
      var base = subtotal - fee;
      if (base < c.min) return 0;
      if (c.type === "pct") return Math.round(base * c.value / 100);
      if (c.type === "flat") return Math.min(c.value, base);
      return 0;
    },
    shippingWaived: function (subtotal, fee) {
      var c = DB.coupon && COUPONS[DB.coupon];
      return !!(c && c.type === "ship" && subtotal - fee >= c.min);
    },
    add: function (id, qty, size, color, opts) {
      opts = opts || {};
      var p = byId(id);
      if (!p) return { ok: false, msg: "That product is no longer available." };
      if (p.st <= 0) return { ok: false, msg: p.n + " is out of stock." };
      qty = qty || 1;
      if (size) {
        var avail = SIZES.indexOf(size) + 1;
        if (avail > p.st) return { ok: false, msg: "Only " + p.st + " left in " + size + "." };
      }
      if (!size && p.size.length > 1 && !opts.skipVariant) {
        return { ok: false, needsVariant: true, msg: "Choose a size first." };
      }
      if (!color && p.color.length > 1 && !opts.skipVariant) {
        return { ok: false, needsVariant: true, msg: "Choose a colour first." };
      }
      var existing = null;
      for (var i = 0; i < DB.cart.length; i++) {
        if (DB.cart[i].id === id && DB.cart[i].size === (size || "") && DB.cart[i].color === (color || "")) { existing = DB.cart[i]; break; }
      }
      if (existing) {
        if (existing.qty + qty > p.st) {
          return { ok: false, msg: "Only " + p.st + " of " + p.n + " available." };
        }
        existing.qty += qty;
      } else {
        DB.cart.push({ id: id, qty: qty, size: size || "", color: color || "" });
      }
      persist();
      return { ok: true, name: p.n };
    },
    setQty: function (i, qty) {
      var l = DB.cart[i];
      if (!l) return { ok: false };
      var p = byId(l.id);
      if (!p || p.st <= 0) return { ok: false, msg: p ? p.n + " is no longer available." : "Item removed." };
      if (qty < 1) return { ok: false, msg: "Quantity must be at least 1." };
      if (qty > p.st) return { ok: false, msg: "Only " + p.st + " available." };
      l.qty = qty;
      persist();
      return { ok: true };
    },
    remove: function (i) { DB.cart.splice(i, 1); persist(); },
    save: function (i) {
      var l = DB.cart[i];
      if (!l) return;
      DB.saved.push(l);
      DB.cart.splice(i, 1);
      persist();
    },
    moveToCart: function (i) {
      var l = DB.saved[i];
      if (!l) return;
      DB.cart.push(l);
      DB.saved.splice(i, 1);
      persist();
    },
    clear: function () { DB.cart = []; DB.coupon = null; persist(); },
    applyCoupon: function (code) {
      var err = couponError(code);
      if (err) return { ok: false, msg: err };
      var c = COUPONS[String(code).toUpperCase()];
      var fee = 250;
      var sub = Cart.subtotal();
      var base = sub - fee;
      if (base < c.min) {
        return { ok: false, msg: c.label + " needs a subtotal of at least " + money(c.min) + "." };
      }
      DB.coupon = String(code).toUpperCase();
      persist();
      return { ok: true, label: c.label };
    },
    clearCoupon: function () { DB.coupon = null; persist(); }
  };

  /* ---------------- wishlist ---------------- */
  var Wish = {
    all: function () { return DB.wish; },
    has: function (id) { return DB.wish.indexOf(id) !== -1; },
    ids: function () { return DB.wish.slice(); },
    add: function (id) {
      if (Wish.has(id) || !byId(id)) return false;
      DB.wish.push(id);
      persist(); return true;
    },
    remove: function (id) {
      DB.wish = DB.wish.filter(function (x) { return x !== id; });
      persist();
    },
    toggle: function (id) {
      if (Wish.has(id)) { Wish.remove(id); return false; }
      Wish.add(id); return true;
    }
  };

  /* ---------------- notifications ---------------- */
  function notify(title, body, tone) {
    DB.notify.unshift({ id: uid("n"), title: title, body: body, tone: tone || "info", at: Date.now(), read: false });
    DB.notify = DB.notify.slice(0, 40);
    persist();
  }
  function unreadCount() { return DB.notify.filter(function (n) { return !n.read; }).length; }
  function markAllRead() { DB.notify.forEach(function (n) { n.read = true; }); persist(); }

  /* ---------------- orders ---------------- */
  function orderNumber() {
    var n = "ZED-" + new Date().getFullYear() + "-" +
      String(Math.floor(100000 + Math.random() * 899999));
    return n;
  }

  function createOrder(details) {
    var sub = Cart.subtotal();
    var zone = details.zone || "nairobi";
    var del = deliveryFor(sub, zone, details.express);
    var fee = Cart.shippingWaived(sub, del.fee) ? 0 : del.fee;
    var disc = Cart.discount(sub, fee);
    var total = Math.max(0, sub + fee - disc);

    var order = {
      id: orderNumber(),
      createdAt: Date.now(),
      status: "PENDING_PAYMENT",
      history: [{ status: "PENDING_PAYMENT", at: Date.now(), note: "Order received." }],
      payment: { method: details.method, status: "unpaid", ref: "" },
      customer: {
        name: details.name, phone: details.phone, email: details.email,
        guest: !DB.user
      },
      address: details.address,
      delivery: {
        method: del.id, name: del.name, fee: fee,
        eta: addDays(del.days), note: del.note
      },
      items: DB.cart.map(function (l) {
        var p = byId(l.id);
        return {
          id: l.id, name: p ? p.n : l.id, art: p ? p.a : "giftbox", skin: p ? p.s : "green",
          price: p ? p.p : 0, qty: l.qty, size: l.size, color: l.color
        };
      }),
      totals: { subtotal: sub, delivery: fee, discount: disc, total: total },
      coupon: DB.coupon || null,
      courier: null,
      tracking: null,
      reviewed: false,
      deliveryRating: 0
    };
    DB.orders.unshift(order);
    notify("Order " + order.id + " placed", "We've received your order and are waiting for payment.");
    persist();
    return order;
  }

  /* Payment simulation: deterministic failure on the first attempt of a card
     test number, otherwise success. Keeps the retry path honest. */
  function payOrder(order, method, card) {
    order.payment.method = method;
    order.payment.status = "processing";
    order.payment.ref = "MPESA-" + Math.random().toString(36).slice(2, 8).toUpperCase();

    return new Promise(function (resolve) {
      setTimeout(function () {
        var fail = false, reason = "";
        if (method === "mpesa") {
          fail = /^(0|1)/.test(String(card && card.phone || "").replace(/\D/g, "").slice(-1)) && Math.random() < 0.25;
          reason = "The M-Pesa request was declined. Check your balance or try again.";
        } else if (method === "card") {
          var digits = String((card && card.number) || "").replace(/\D/g, "");
          if (digits.slice(-4) === "0002") { fail = true; reason = "Your bank declined this card. Try another card."; }
          if (digits.slice(-4) === "0069") { fail = true; reason = "Card expired. Check the expiry date and retry."; }
        }
        if (fail) {
          order.payment.status = "failed";
          persist();
          notify("Payment failed — order " + order.id, reason, "error");
          resolve({ ok: false, reason: reason });
          return;
        }
        order.payment.status = "paid";
        order.payment.paidAt = Date.now();
        setStatus(order, "PAID", "Payment confirmed via " + methodLabel(method) + ".");
        resolve({ ok: true });
      }, 1400);
    });
  }

  function methodLabel(m) {
    return { mpesa: "M-Pesa", card: "Card", bank: "Bank transfer", cod: "Cash on delivery" }[m] || m;
  }

  function setStatus(order, status, note) {
    var meta = statusMeta(status);
    order.status = status;
    order.history.push({ status: status, at: Date.now(), note: note || meta.msg });
    if (status === "DISPATCHED" && !order.courier) {
      order.courier = "ZED Express";
      order.tracking = "ZDX" + Math.floor(100000000 + Math.random() * 899999999);
    }
    notify("Order " + order.id + ": " + meta.label, meta.msg, status === "DELIVERED" ? "success" : "info");
    persist();
  }

  function advance(order) {
    var i = TIMELINE.indexOf(order.status);
    if (i > -1 && i < TIMELINE.length - 1) {
      setStatus(order, TIMELINE[i + 1]);
      return true;
    }
    return false;
  }

  function orderByNumber(num) {
    var n = String(num || "").trim().toUpperCase();
    for (var i = 0; i < DB.orders.length; i++) {
      if (DB.orders[i].id.toUpperCase() === n) return DB.orders[i];
    }
    return null;
  }

  function findOrder(num, contact) {
    var o = orderByNumber(num);
    if (!o) return { ok: false, msg: "We couldn't find an order with that number. Check it and try again." };
    var c = String(contact || "").trim().toLowerCase();
    if (c && c !== o.customer.phone.toLowerCase() && c !== o.customer.email.toLowerCase()) {
      return { ok: false, msg: "That phone number or email doesn't match this order." };
    }
    return { ok: true, order: o };
  }

  /* ---------------- reviews ---------------- */
  function reviewsFor(id) {
    return DB.reviews.filter(function (r) { return r.productId === id; });
  }
  function addReview(r) {
    DB.reviews.unshift({
      id: uid("r"), productId: r.productId, orderId: r.orderId,
      name: r.name, rating: r.rating, text: r.text,
      photos: r.photos || [], delivery: r.delivery || 0, at: Date.now()
    });
    var o = orderByNumber(r.orderId);
    if (o) o.reviewed = true;
    persist();
  }

  /* ---------------- account ---------------- */
  var Account = {
    register: function (name, email, phone, password) {
      if (!name || name.length < 2) return { ok: false, msg: "Enter your full name." };
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || "")) return { ok: false, msg: "Enter a valid email address." };
      if (!/^\+?[\d\s-]{9,}$/.test(phone || "")) return { ok: false, msg: "Enter a valid phone number." };
      if (!password || password.length < 6) return { ok: false, msg: "Password must be at least 6 characters." };
      DB.user = { name: name, email: email, phone: phone, since: Date.now() };
      notify("Welcome to ZED", "Your account is ready. Your wishlist and addresses are saved to you.");
      persist();
      return { ok: true };
    },
    login: function (email, phone) {
      var id = email || phone;
      if (!id) return { ok: false, msg: "Enter your email or phone number." };
      if (DB.user && (DB.user.email === email || DB.user.phone === phone)) return { ok: true };
      DB.user = { name: (email || phone).split("@")[0] || "Customer", email: email || "", phone: phone || "", since: Date.now() };
      persist();
      return { ok: true };
    },
    guest: function () { DB.user = null; persist(); },
    logout: function () { DB.user = null; persist(); },
    addAddress: function (a) {
      if (!a.name) return { ok: false, msg: "Add a recipient name." };
      if (!a.phone) return { ok: false, msg: "Add a phone number the rider can call." };
      if (!a.county) return { ok: false, msg: "Choose a county." };
      if (!a.town) return { ok: false, msg: "Enter a town or city." };
      a.id = uid("addr"); DB.addresses.push(a); persist();
      return { ok: true };
    },
    removeAddress: function (id) { DB.addresses = DB.addresses.filter(function (a) { return a.id !== id; }); persist(); }
  };

  /* ---------------- currency ---------------- */
  var COUNTIES = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Uasin Gishu", "Kiambu",
    "Machakos", "Nyeri", "Meru", "Kakamega", "Bungoma", "Kisii", "Garissa", "Thika"];

  /* ---------------- shared UI ---------------- */
  var ICON = {
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>',
    user: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1Z"/></svg>',
    cart: '<svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 2 3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1Z"/></svg>'
  };

  function toast(msg, tone) {
    var host = $("#toasts");
    if (!host) { host = document.createElement("div"); host.id = "toasts"; host.className = "toasts"; document.body.appendChild(host); }
    var el = document.createElement("div");
    el.className = "toast" + (tone ? " toast--" + tone : "");
    el.innerHTML = '<span class="toast__i">' + (tone === "error" ? ICON.x : ICON.check) + "</span><span>" + esc(msg) + "</span>";
    host.appendChild(el);
    setTimeout(function () {
      el.classList.add("out");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 240);
    }, 3200);
  }

  var NAV_LINKS = [
    { t: "Home", h: "index.html" },
    { t: "Shop", h: "shop.html" },
    { t: "Categories", h: "shop.html#categories" },
    { t: "About Us", h: "about.html" },
    { t: "Contact", h: "contact.html" },
    { t: "Track Order", h: "track.html" }
  ];

  function headerHTML() {
    var path = location.pathname.split("/").pop() || "index.html";
    var n = Cart.count();
    return '' +
      '<div class="topbar"><div class="wrap topbar__in">' +
        '<p class="topbar__l">Call us on: <a href="tel:+254711436169">+254 711 436 169</a> to place your order.</p>' +
        '<p class="topbar__l topbar__l--r">Same day delivery in Nairobi.</p>' +
      '</div></div>' +
      '<header class="hdr" id="hdr"><div class="wrap hdr__in">' +
        '<a class="logo" href="index.html" aria-label="ZED Gift Shop home">' +
          '<span class="logo__mk" aria-hidden="true">Z</span>' +
          '<span class="logo__tx"><b>ZED</b><i>Gift Shop</i></span></a>' +
        '<form class="srch" id="srchForm" role="search" autocomplete="off">' +
          '<label class="sr-only" for="srch">Search products</label>' +
          '<input class="srch__i" id="srch" type="search" placeholder="Search products" aria-expanded="false" aria-controls="sug" role="combobox" aria-autocomplete="list">' +
          '<button class="srch__b" type="submit" aria-label="Search">' + ICON.search + '</button>' +
          '<div class="sug" id="sug" role="listbox" aria-label="Search suggestions"></div>' +
        '</form>' +
        '<div class="hdr__act">' +
          '<a class="hdr__tel" href="tel:+254711436169">' + ICON.phone + '<span>0711 667 733</span></a>' +
          '<a class="hdr__acc" href="account.html">Account</a>' +
          '<a class="hdr__bell" href="account.html#notifications" aria-label="Notifications">' + ICON.bell +
            (unreadCount() ? '<span class="ico-btn__n">' + unreadCount() + "</span>" : "") + '</a>' +
          '<a class="hdr__cart" href="cart.html" aria-label="Cart">' +
            '<span class="hdr__cart-t">' + money(Cart.subtotal()) +
            ' <span class="hdr__cart-sep" aria-hidden="true">·</span> <span id="cartNum">' + n +
            '</span>&nbsp;in cart</span>' +
            '<span class="hdr__cart-i">' + ICON.cart + "</span></a>" +
          '<button class="burger" id="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="drw">' + ICON.menu + '</button>' +
        '</div>' +
      '</div>' +
      '<nav class="subnav"><div class="wrap subnav__in">' +
        NAV_LINKS.map(function (l) {
          return '<a class="subnav__a' + (path === l.h ? " is-on" : "") + '" href="' + l.h + '">' + esc(l.t) + "</a>";
        }).join("") +
        '<a class="subnav__a subnav__a--accent" href="shop.html?availability=sale">Special Offers</a>' +
      '</div></nav></header>' +
      '<div class="veil" id="veil"></div>' +
      '<aside class="drw" id="drw" aria-label="Menu" aria-hidden="true">' +
        '<div class="drw__hd"><span class="logo"><span class="logo__mk" aria-hidden="true">Z</span>' +
          '<span class="logo__tx"><b>ZED</b><i>Gift Shop</i></span></span>' +
          '<button class="xbtn" id="drwClose" type="button" aria-label="Close menu">' + ICON.x + '</button></div>' +
        '<div class="drw__bd">' +
          '<form class="drw__s" id="drwSrch" role="search" autocomplete="off">' +
            '<input id="drwSrchI" type="search" placeholder="Search products" aria-label="Search products">' +
            '<button type="submit" aria-label="Search">' + ICON.search + '</button></form>' +
          '<div class="drw__links">' + NAV_LINKS.map(function (l) {
            return '<a href="' + l.h + '">' + esc(l.t) + "</a>";
          }).join("") + '<a href="admin.html">Admin Dashboard</a></div>' +
          '<a class="btn btn--solid btn--full" href="https://wa.me/254711436169" target="_blank" rel="noopener">Chat on WhatsApp</a>' +
        "</div></aside>";
  }

  function footerHTML() {
    return '' +
      '<footer class="ftr">' +
        '<div class="wrap ftr__in">' +
          '<div class="ftr__brand">' +
            '<span class="logo logo--lt"><span class="logo__mk" aria-hidden="true">Z</span>' +
              '<span class="logo__tx"><b>ZED</b><i>Gift Shop</i></span></span>' +
            "<p>ZED Gift Shop Nairobi is a trusted premium gift shop. We curate gifts, corporate gifts " +
            "and personalised gifts, and are known for our expertise and customer focus.</p>" +
            '<div class="ftr__soc">' +
              '<a href="https://www.facebook.com/zedgiftshop" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24"><path d="M14 9V7.5c0-.8.2-1.2 1.4-1.2H17V3h-2.6C11.2 3 10 4.4 10 6.8V9H8v3.4h2V21h4v-8.6h2.6L17 9Z"/></svg></a>' +
              '<a href="https://www.instagram.com/zedgiftshop" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg></a>' +
              '<a href="https://www.tiktok.com/@zedgiftshop" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><svg viewBox="0 0 24 24"><path d="M16 3a5 5 0 0 0 4.6 3.1v3A8 8 0 0 1 17 6.3V15a6 6 0 1 1-6-6c.3 0 .6 0 .9.1v3.1A2.9 2.9 0 1 0 14 15V3Z"/></svg></a>' +
            "</div>" +
          "</div>" +
          '<div class="ftr__col"><h3>Shop</h3><ul>' +
            '<li><a href="shop.html">All Products</a></li>' +
            '<li><a href="shop.html?category=Personalized">Personalized</a></li>' +
            '<li><a href="shop.html?category=Watches">Watches</a></li>' +
            '<li><a href="shop.html?category=Jewelry">Jewelry</a></li>' +
            '<li><a href="shop.html?category=Trophies">Trophies</a></li>' +
            '<li><a href="shop.html?availability=sale">Special Offers</a></li>' +
          "</ul></div>" +
          '<div class="ftr__col"><h3>Customer</h3><ul>' +
            '<li><a href="account.html">My Account</a></li>' +
            '<li><a href="cart.html">Cart</a></li>' +
            '<li><a href="track.html">Track Order</a></li>' +
            '<li><a href="contact.html#faq">FAQs</a></li>' +
          "</ul></div>" +
          '<div class="ftr__col"><h3>Information</h3><ul>' +
            '<li><a href="contact.html">Contact Us</a></li>' +
            '<li><a href="about.html#delivery">Delivery Information</a></li>' +
            '<li><a href="about.html#returns">Returns Policy</a></li>' +
            '<li><a href="about.html#privacy">Privacy Policy</a></li>' +
            '<li><a href="about.html#terms">Terms &amp; Conditions</a></li>' +
          "</ul></div>" +
        "</div>" +
        '<div class="wrap ftr__paybar"><span>We accept</span>' +
          '<span class="pillpay">M-PESA</span><span class="pillpay">VISA</span>' +
          '<span class="pillpay">MASTERCARD</span><span class="pillpay">AMEX</span>' +
          '<span class="pillpay">BANK TRANSFER</span><span class="pillpay">CASH ON DELIVERY</span>' +
        "</div>" +
        '<div class="wrap ftr__bot"><p>&copy; 2026 ZED Gift Shop. All rights reserved.</p>' +
          '<p>Made in Nairobi, Kenya</p></div>' +
      "</footer>" +
      '<button class="fab" id="fab" type="button">' + ICON.cart + '<span id="fabTxt">Cart</span></button>' +
      '<div class="toasts" id="toasts" aria-live="polite"></div>';
  }

  /* search suggestions */
  function hits(q) {
    q = String(q || "").trim().toLowerCase();
    if (!q) return [];
    var out = [];
    P.forEach(function (p) {
      var n = p.n.toLowerCase(), c = p.c.toLowerCase(), b = p.brand.toLowerCase(), t = p.t.join(" ");
      var sc = n.indexOf(q) > -1 ? 10 : c.indexOf(q) > -1 ? 8 : b.indexOf(q) > -1 ? 6 : t.indexOf(q) > -1 ? 5 : 0;
      if (sc) out.push({ p: p, s: sc });
    });
    out.sort(function (a, b) { return b.s - a.s; });
    return out.slice(0, 6).map(function (x) { return x.p; });
  }

  function suggest(q) {
    var h = $("#sug"), inp = $("#srch");
    if (!h || !inp) return;
    if (!String(q || "").trim()) { h.classList.remove("on"); h.innerHTML = ""; return; }
    var low = q.toLowerCase(), g = [];
    var ch = CATEGORIES.filter(function (c) { return c.toLowerCase().indexOf(low) > -1; });
    if (ch.length) g.push({ l: "Categories", it: ch.map(function (c) { return { n: c, s: "Category", act: "cat", v: c }; }) });
    var br = BRANDS.filter(function (b) { return b.toLowerCase().indexOf(low) > -1; });
    if (br.length) g.push({ l: "Brands", it: br.map(function (b) { return { n: b, s: "Brand", act: "brand", v: b }; }) });
    var ph = hits(q);
    if (ph.length) g.push({ l: "Products", it: ph.map(function (p) {
      return { n: p.n, s: p.c + " · " + p.brand, a: p.a, sk: p.s, pr: p.p, act: "view", v: p.id };
    }) });
    h.innerHTML = g.length ? g.map(function (grp) {
      return '<p class="sug__l">' + esc(grp.l) + "</p>" + grp.it.map(function (i) {
        return '<button class="sug__i" type="button" data-sug="' + i.act + '" data-sv="' + esc(i.v) + '">' +
          (i.a ? '<span class="sug__art">' + art(i.a, i.sk) + "</span>" : '<span class="sug__art sug__art--cat">' + esc(i.s.charAt(0)) + "</span>") +
          '<span><span class="sug__n">' + esc(i.n) + '</span><span class="sug__s">' + esc(i.s) + "</span></span>" +
          (i.pr ? '<span class="sug__p">' + money(i.pr) + "</span>" : "") + "</button>";
      }).join("");
    }).join("") : '<p class="sug__none">No matches for “' + esc(q) + '”. Try “watch”, “mug” or “trophy”.</p>';
    h.classList.add("on");
    inp.setAttribute("aria-expanded", "true");
  }

  /* product card */
  function cardHTML(p, opts) {
    opts = opts || {};
    var d = off(p);
    var w = Wish.has(p.id);
    var out = p.st <= 0;
    var tags = "";
    if (out) tags = '<span class="pcard__tag pcard__tag--out">Out of stock</span>';
    else if (d > 0) tags = '<span class="pcard__tag">Sale!</span>';
    if (p.new) tags += '<span class="pcard__tag pcard__tag--new">New</span>';
    var stockTxt = p.st === 0 ? "Out of stock" : p.st <= 5 ? "Only " + p.st + " left" : "In stock";

    return '<article class="pcard">' +
      '<a class="pcard__media" href="product.html?id=' + p.id + '">' + art(p.a, p.s) +
        (tags ? '<span class="pcard__tags">' + tags + "</span>" : "") +
        '<span class="pcard__stocktag ' + (out ? "is-out" : p.st <= 5 ? "is-low" : "") + '">' + stockTxt + "</span>" +
      "</a>" +
      '<button class="pcard__heart' + (w ? " on" : "") + '" type="button" data-wish="' + p.id + '" aria-pressed="' + (w ? "true" : "false") + '" aria-label="Save ' + esc(p.n) + ' to wishlist">' + ICON.heart + "</button>" +
      '<div class="pcard__b">' +
        '<p class="pcard__c">' + esc(p.c) + " · " + esc(p.brand) + "</p>" +
        '<h3 class="pcard__t"><a href="product.html?id=' + p.id + '">' + esc(p.n) + "</a></h3>" +
        '<p class="pcard__r"><span class="stars" role="img" aria-label="' + p.r + ' out of 5">' + stars(p.r) + "</span>" +
          p.r.toFixed(1) + " (" + p.rv + ")</p>" +
        '<p class="pcard__p"><b>' + money(p.p) + "</b>" +
          (d > 0 ? "<s>" + money(p.w) + '</s><em>Save ' + d + "%</em>" : "") + "</p>" +
        '<div class="pcard__act">' +
          '<button class="abtn abtn--sm" type="button" data-quick="' + p.id + '">Quick View</button>' +
          (out ? '<span class="pcard__out">Unavailable</span>'
                : '<button class="abtn abtn--sm" type="button" data-add="' + p.id + '">Add to Cart</button>') +
        "</div>" +
      "</div></article>";
  }

  /* quick view modal */
  function quickView(id) {
    var p = byId(id);
    if (!p) return;
    var host = $("#qvBody");
    if (!host) return;
    var d = off(p);
    var spec = Object.keys(p.sp || {}).map(function (k) {
      return "<div><dt>" + esc(k) + "</dt><dd>" + esc(p.sp[k]) + "</dd></div>";
    }).join("");
    host.innerHTML =
      '<div class="qv__media">' + art(p.a, p.s) + "</div>" +
      '<div class="qv__i">' +
        '<p class="pcard__c">' + esc(p.c) + " · " + esc(p.brand) + "</p>" +
        '<h2 class="qv__t">' + esc(p.n) + "</h2>" +
        '<p class="pcard__r"><span class="stars">' + stars(p.r) + "</span>" + p.r.toFixed(1) + " · " + p.rv + " reviews</p>" +
        '<p class="qv__p"><b>' + money(p.p) + "</b>" + (d > 0 ? "<s>" + money(p.w) + "</s><em>Save " + d + "%</em>" : "") + "</p>" +
        '<p class="qv__d">' + esc(p.d) + "</p>" +
        (p.size.length > 1 || p.color.length > 1 ? '<p class="qv__note">Choose ' +
          (p.size.length > 1 ? "a size" : "") + (p.size.length > 1 && p.color.length > 1 ? " and " : "") +
          (p.color.length > 1 ? "a colour" : "") + " on the product page.</p>" : "") +
        '<dl class="pv__spec">' + spec + "</dl>" +
        '<div class="qv__act">' +
          '<a class="abtn" href="product.html?id=' + p.id + '">View full details</a>' +
          (p.st > 0 ? '<button class="abtn abtn--dark" type="button" data-add="' + p.id + '">Add to Cart</button>' : '<span class="pcard__out">Out of stock</span>') +
        "</div>" +
      "</div>";
    openPanel("#qv");
  }

  function openPanel(sel) {
    var m = $(sel);
    if (!m) return;
    m.classList.add("on");
    m.setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
  }
  function closePanels() {
    $$(".drw.on, .pnl.on, .modal.on").forEach(function (m) {
      m.classList.remove("on");
      m.setAttribute("aria-hidden", "true");
    });
    document.body.classList.remove("lock");
  }

  /* ---------------- shell ---------------- */
  function mount() {
    var h = $("#siteHeader"), f = $("#siteFooter");
    if (h) h.innerHTML = headerHTML();
    if (f) f.innerHTML = footerHTML();

    /* mobile drawer */
    on($("#burger"), "click", function () {
      var d = $("#drw");
      d.classList.add("on"); d.setAttribute("aria-hidden", "false");
      $("#veil").classList.add("on");
      document.body.classList.add("lock");
    });
    on($("#drwClose"), "click", closePanels);
    on($("#veil"), "click", closePanels);
    on($("#fab"), "click", function () { location.href = "cart.html"; });

    /* sticky header shadow */
    var hdr = $("#hdr");
    function onScroll() { if (hdr) hdr.classList.toggle("is-stuck", window.scrollY > 6); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    /* search */
    var sr = $("#srch");
    on($("#srchForm"), "submit", function (e) {
      e.preventDefault();
      var q = (sr ? sr.value : "").trim();
      location.href = "shop.html" + (q ? "?q=" + encodeURIComponent(q) : "");
    });
    on(sr, "input", debounce(function () { suggest(sr.value); }, 140));
    on(sr, "focus", function () { if (sr.value) suggest(sr.value); });
    on(sr, "keydown", function (e) {
      if (e.key !== "Escape") return;
      var s = $("#sug"); if (s) s.classList.remove("on"); sr.blur();
    });
    on($("#drwSrch"), "submit", function (e) {
      e.preventDefault();
      var v = $("#drwSrchI").value.trim();
      closePanels();
      location.href = "shop.html" + (v ? "?q=" + encodeURIComponent(v) : "");
    });

    /* delegated: wishlist, add-to-cart, suggestions, quick view */
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t.closest) return;
      var el;

      if ((el = t.closest("[data-wish]"))) {
        var on2 = Wish.toggle(el.getAttribute("data-wish"));
        toast(on2 ? "Saved to wishlist" : "Removed from wishlist");
        return;
      }
      if ((el = t.closest("[data-add]"))) {
        var id = el.getAttribute("data-add");
        var r = Cart.add(id, 1, "", "", { skipVariant: true });
        if (r.ok) {
          toast(r.name + " added to cart");
          refreshCarts();
        } else toast(r.msg || "Could not add to cart", "error");
        return;
      }
      if ((el = t.closest("[data-quick]"))) { quickView(el.getAttribute("data-quick")); return; }
      if ((el = t.closest("[data-x]"))) { closePanels(); return; }
      if ((el = t.closest("[data-sug]"))) {
        var act = el.getAttribute("data-sug"), v = el.getAttribute("data-sv");
        if (act === "view") location.href = "product.html?id=" + v;
        else location.href = "shop.html?" + act + "=" + encodeURIComponent(v);
        return;
      }
      var sg = $("#sug");
      if (sg && !t.closest(".srch")) sg.classList.remove("on");
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closePanels();
    });

    /* keep header counts fresh */
    document.addEventListener("zed:change", function () { refreshCarts(); });
  }

  function refreshCarts() {
    var n = Cart.count();
    var cn = $("#cartNum");
    if (cn) cn.textContent = n;
    var ct = $(".hdr__cart-t");
    if (ct) ct.firstChild.textContent = money(Cart.subtotal());
    var ft = $("#fabTxt");
    if (ft) ft.textContent = "Cart (" + n + ")";
    var fab = $("#fab");
    if (fab) fab.classList.toggle("on", n > 0);
    var bell = $(".hdr__bell .ico-btn__n");
    if (bell) {
      bell.textContent = unreadCount();
      bell.hidden = unreadCount() === 0;
    }
  }

  function debounce(fn, ms) {
    var t;
    return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); };
  }

  /* ---------------- seed demo order so tracking/admin have content ---------------- */
  function seedIfEmpty() {
    if (DB.seeded) return;
    DB.seeded = true;
    var demo = {
      id: "ZED-2026-482913", createdAt: Date.now() - 6 * 86400000,
      status: "IN_TRANSIT",
      history: [
        { status: "PENDING_PAYMENT", at: Date.now() - 6 * 86400000, note: "Order received." },
        { status: "PAID", at: Date.now() - 6 * 86400000 + 60000, note: "Payment confirmed via M-Pesa." },
        { status: "PROCESSING", at: Date.now() - 5 * 86400000, note: "We are preparing and checking your items." },
        { status: "PACKED", at: Date.now() - 4 * 86400000, note: "Your items are packed and labelled." },
        { status: "DISPATCHED", at: Date.now() - 3 * 86400000, note: "Your parcel has been handed to the courier." },
        { status: "IN_TRANSIT", at: Date.now() - 3600000, note: "Your parcel is moving through the network." }
      ],
      payment: { method: "mpesa", status: "paid", ref: "MPESA-7K2QD1", paidAt: Date.now() - 6 * 86400000 + 60000 },
      customer: { name: "Amina Wanjiru", phone: "+254711000222", email: "amina@example.co.ke", guest: true },
      address: { name: "Amina Wanjiru", phone: "+254711000222", county: "Nairobi", town: "Westlands", area: "Parklands", street: "Limuru Road, Apt 4B", instructions: "Gate code 1234" },
      delivery: { method: "nairobi", name: "Standard Nairobi", fee: 250, eta: addDays(1), note: "Delivered next day in Nairobi" },
      items: [
        { id: "p14", name: "Maasai-Inspired Fleece Blanket", art: "blanket", skin: "rose", price: 3499, qty: 1, size: "Large", color: "Red" },
        { id: "p06", name: "Custom Printed Mug", art: "mug", skin: "sky", price: 900, qty: 2, size: "One Size", color: "White" }
      ],
      totals: { subtotal: 5299, delivery: 0, discount: 0, total: 5299 },
      coupon: null, courier: "ZED Express", tracking: "ZDX483920114",
      reviewed: false, deliveryRating: 0
    };
    DB.orders.push(demo);
    persist();
  }

  /* ---------------- export ---------------- */
  global.ZED = {
    $: $, $$: $$, on: on, money: money, esc: esc, slug: slug, qs: qs, uid: uid,
    fmtDate: fmtDate, fmtDateTime: fmtDateTime, addDays: addDays, debounce: debounce,
    db: DB, persist: persist,
    products: P, byId: byId, off: off, stars: stars, art: art, gallery: gallery,
    categories: CATEGORIES, brands: BRANDS, colors: COLORS, sizes: SIZES,
    coupons: COUPONS, couponError: couponError, delivery: DELIVERY, deliveryFor: deliveryFor,
    counties: COUNTIES, status: STATUS, timeline: TIMELINE, statusMeta: statusMeta,
    cart: Cart, wish: Wish, account: Account,
    createOrder: createOrder, payOrder: payOrder, setStatus: setStatus, advance: advance,
    orderByNumber: orderByNumber, findOrder: findOrder, methodLabel: methodLabel,
    reviewsFor: reviewsFor, addReview: addReview,
    notify: notify, unreadCount: unreadCount, markAllRead: markAllRead,
    toast: toast, cardHTML: cardHTML, quickView: quickView, openPanel: openPanel,
    closePanels: closePanels, refreshCarts: refreshCarts,
    icons: ICON, mount: mount, variantLabel: variantLabel, seedIfEmpty: seedIfEmpty
  };

  /* seed before any page script reads DB.orders, so tracking, admin and the
     review page all see the demo order regardless of script load order */
  seedIfEmpty();

  function boot() { mount(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})(window);