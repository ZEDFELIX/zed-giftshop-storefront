/* ==========================================================================
   ZED GIFT SHOP ΓÇö storefront logic
   Navigation tree, card rendering, filters and pagination modelled on
   riogiftshop.com's shopping experience.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- utils ---------------------------------------------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var on = function (el, ev, fn, o) { if (el) el.addEventListener(ev, fn, o || false); };
  var clamp = function (n, a, b) { return Math.min(b, Math.max(a, n)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var NF = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });
  function money(n) { return "KShs" + NF.format(Math.round(n)); }   /* Rio's format */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function store(k, fb) { try { var r = localStorage.getItem("zed:" + k); return r ? JSON.parse(r) : fb; } catch (e) { return fb; } }
  function save(k, v) { try { localStorage.setItem("zed:" + k, JSON.stringify(v)); } catch (e) {} }
  function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; }

  /* ---------- colour helpers for art ------------------------------------ */
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hex(c) { return "#" + ((1 << 24) + (c[0] << 16) + (c[1] << 8) + c[2]).toString(16).slice(1); }
  function shade(h, a) { var c = rgb(h); return hex([0, 1, 2].map(function (i) { return Math.max(0, Math.min(255, Math.round(c[i] * (1 - a)))); })); }
  function tint(h, a) { var c = rgb(h); return hex([0, 1, 2].map(function (i) { return Math.max(0, Math.min(255, Math.round(c[i] + (255 - c[i]) * a))); })); }

  var SKIN = {
    green:  { bg: "#EEF4EF", body: "#3f7d55", acc: "#a9cbb2" },
    gold:   { bg: "#F7F2E6", body: "#b98a2e", acc: "#e6cf9a" },
    sand:   { bg: "#F7F1E8", body: "#bd9463", acc: "#e5d2b4" },
    rose:   { bg: "#FBEDEC", body: "#cf7d74", acc: "#f0c4bf" },
    sky:    { bg: "#EAF1F7", body: "#5f88ac", acc: "#b7cee0" },
    stone:  { bg: "#F0F2F1", body: "#6f7873", acc: "#c0c8c2" },
    ink:    { bg: "#E9ECEB", body: "#2c3a33", acc: "#a3b1a9" },
    lilac:  { bg: "#F1EEF8", body: "#7d72ac", acc: "#c8c0e0" }
  };
  var uid = 0;

  /* ---------- product art ------------------------------------------------ */
  var ART = {
    giftbox: function (u) {
      return '<g><ellipse cx="50" cy="90" rx="30" ry="6" fill="url(#' + u.id + 'sh)"/>' +
        '<rect x="20" y="44" width="60" height="46" rx="5" fill="url(#' + u.id + 'g)"/>' +
        '<rect x="16" y="36" width="68" height="12" rx="4" fill="' + u.lite + '"/>' +
        '<rect x="16" y="36" width="68" height="5" rx="2.5" fill="#fff" opacity=".55"/>' +
        '<rect x="45" y="34" width="10" height="58" fill="url(#' + u.id + 'b)"/>' +
        '<path d="M50 34c-9 0-14-4.5-14-9s8.5-6 14 9c5.5-15 14-9 14-9s-5 9-14 9Z" fill="' + u.acc + '"/>' +
        '<path d="M50 34c-9 0-14-4.5-14-9s8.5-6 14 9Z" fill="#fff" opacity=".45"/>' +
        '<rect x="24" y="52" width="9" height="30" rx="3" fill="#fff" opacity=".2"/></g>';
    },
    watch: function (u) {
      return '<g><ellipse cx="50" cy="92" rx="20" ry="4.5" fill="url(#' + u.id + 'sh)"/>' +
        '<path d="M41 8h18v20H41zM41 72h18v20H41z" fill="url(#' + u.id + 'b)"/>' +
        '<rect x="39" y="24" width="22" height="52" rx="11" fill="url(#' + u.id + 'b)"/>' +
        '<circle cx="50" cy="50" r="22" fill="url(#' + u.id + 'g)"/>' +
        '<circle cx="50" cy="50" r="17" fill="' + u.bg + '"/>' +
        '<g stroke="' + u.dark + '" stroke-width="1.5" opacity=".6" stroke-linecap="round"><path d="M50 35v3.5M50 61.5V65M35 50h3.5M61.5 50H65"/></g>' +
        '<path d="M50 50V38" stroke="' + u.dark + '" stroke-width="2.4" stroke-linecap="round"/>' +
        '<path d="M50 50l8 5" stroke="' + u.dark + '" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="50" cy="50" r="1.9" fill="' + u.dark + '"/>' +
        '<rect x="70" y="46" width="4" height="8" fill="' + u.dark + '" opacity=".7"/>' +
        '<path d="M41 32a20 20 0 0 1 18-4" stroke="#fff" stroke-width="2.4" fill="none" opacity=".5" stroke-linecap="round"/></g>';
    },
    mug: function (u) {
      return '<g><ellipse cx="50" cy="88" rx="24" ry="5.5" fill="url(#' + u.id + 'sh)"/>' +
        '<path d="M66 40h9a11 11 0 0 1 0 22h-9" fill="none" stroke="' + u.body + '" stroke-width="6"/>' +
        '<path d="M26 32h44v34a22 22 0 0 1-22 22H48a22 22 0 0 1-22-22Z" fill="url(#' + u.id + 'g)"/>' +
        '<ellipse cx="48" cy="32" rx="22" ry="6" fill="' + u.lite + '"/>' +
        '<ellipse cx="48" cy="32" rx="17" ry="4" fill="' + u.dark + '" opacity=".22"/>' +
        '<rect x="31" y="38" width="9" height="40" rx="4.5" fill="#fff" opacity=".28"/></g>';
    },
    tumbler: function (u) {
      return '<g><ellipse cx="50" cy="90" rx="21" ry="5" fill="url(#' + u.id + 'sh)"/>' +
        '<path d="M33 22h34l-4 62a8 8 0 0 1-8 7H45a8 8 0 0 1-8-7Z" fill="url(#' + u.id + 'g)"/>' +
        '<rect x="30" y="15" width="40" height="9" rx="4.5" fill="' + u.dark + '" opacity=".85"/>' +
        '<rect x="36" y="18" width="28" height="3" rx="1.5" fill="#fff" opacity=".35"/>' +
        '<path d="M38 30l-2 48" stroke="#fff" stroke-width="3" opacity=".35" stroke-linecap="round"/></g>';
    },
    bottle: function (u) {
      return '<g><ellipse cx="50" cy="91" rx="18" ry="4.5" fill="url(#' + u.id + 'sh)"/>' +
        '<rect x="43" y="6" width="14" height="9" rx="3" fill="' + u.dark + '" opacity=".9"/>' +
        '<path d="M44 14h12v10l7 11v49a7 7 0 0 1-7 7H44a7 7 0 0 1-7-7V35l7-11Z" fill="url(#' + u.id + 'g)"/>' +
        '<rect x="37" y="48" width="26" height="18" rx="4" fill="#fff" opacity=".55"/>' +
        '<path d="M41 26l-3 54" stroke="#fff" stroke-width="3" opacity=".4" stroke-linecap="round"/></g>';
    },
    wallet: function (u) {
      return '<g><ellipse cx="50" cy="86" rx="28" ry="5" fill="url(#' + u.id + 'sh)"/>' +
        '<rect x="14" y="30" width="72" height="44" rx="9" fill="url(#' + u.id + 'g)"/>' +
        '<path d="M14 39h58a12 12 0 0 1 12 12v7H14" fill="url(#' + u.id + 'b)" opacity=".45"/>' +
        '<path d="M20 33h48" stroke="' + u.dark + '" stroke-width="1.2" stroke-dasharray="3 3" opacity=".5"/>' +
        '<circle cx="76" cy="58" r="5" fill="' + u.acc + '"/></g>';
    },
    belt: function (u) {
      return '<g><ellipse cx="50" cy="80" rx="30" ry="5" fill="url(#' + u.id + 'sh)"/>' +
        '<rect x="8" y="40" width="84" height="18" rx="4" fill="url(#' + u.id + 'g)"/>' +
        '<path d="M8 44h84" stroke="#fff" stroke-width="2" opacity=".3"/>' +
        '<rect x="36" y="32" width="28" height="34" rx="6" fill="none" stroke="url(#' + u.id + 'b)" stroke-width="5"/>' +
        '<rect x="45" y="42" width="10" height="14" rx="2" fill="' + u.acc + '"/>' +
        '<circle cx="18" cy="49" r="2.2" fill="' + u.dark + '" opacity=".55"/><circle cx="27" cy="49" r="2.2" fill="' + u.dark + '" opacity=".55"/></g>';
    },
    perfume: function (u) {
      return '<g><ellipse cx="50" cy="90" rx="20" ry="5" fill="url(#' + u.id + 'sh)"/>' +
        '<rect x="45" y="4" width="10" height="10" rx="3" fill="' + u.dark + '" opacity=".9"/>' +
        '<rect x="42" y="13" width="16" height="14" rx="4" fill="url(#' + u.id + 'b)" opacity=".7"/>' +
        '<rect x="32" y="26" width="36" height="56" rx="9" fill="url(#' + u.id + 'g)"/>' +
        '<rect x="36" y="44" width="28" height="20" rx="4" fill="#fff" opacity=".6"/>' +
        '<rect x="36" y="32" width="6" height="44" rx="3" fill="#fff" opacity=".3"/></g>';
    },
    necklace: function (u) {
      return '<g><ellipse cx="50" cy="90" rx="16" ry="4" fill="url(#' + u.id + 'sh)"/>' +
        '<path d="M24 20c0 30 12 46 26 46s26-16 26-46" fill="none" stroke="url(#' + u.id + 'b)" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="50" cy="70" r="11" fill="url(#' + u.id + 'g)"/>' +
        '<circle cx="50" cy="70" r="11" fill="none" stroke="' + u.dark + '" stroke-width="1.4" opacity=".45"/>' +
        '<path d="M50 63l4 7-4 7-4-7Z" fill="#fff" opacity=".65"/></g>';
    },
    bracelet: function (u) {
      return '<g><ellipse cx="50" cy="86" rx="22" ry="4.5" fill="url(#' + u.id + 'sh)"/>' +
        '<circle cx="50" cy="50" r="26" fill="none" stroke="url(#' + u.id + 'b)" stroke-width="9"/>' +
        '<circle cx="50" cy="50" r="26" fill="none" stroke="#fff" stroke-width="2.4" opacity=".45" stroke-dasharray="4 8"/>' +
        '<circle cx="50" cy="22" r="6" fill="' + u.acc + '"/></g>';
    },
    ring: function (u) {
      return '<g><ellipse cx="50" cy="86" rx="18" ry="4" fill="url(#' + u.id + 'sh)"/>' +
        '<circle cx="50" cy="60" r="21" fill="none" stroke="url(#' + u.id + 'b)" stroke-width="8"/>' +
        '<path d="M50 14l11 15-11 15-11-15Z" fill="url(#' + u.id + 'g)"/>' +
        '<path d="M50 14l11 15H39Z" fill="#fff" opacity=".45"/></g>';
    },
    trophy: function (u) {
      return '<g><ellipse cx="50" cy="92" rx="22" ry="4.5" fill="url(#' + u.id + 'sh)"/>' +
        '<path d="M32 20h36v18a18 18 0 0 1-36 0Z" fill="url(#' + u.id + 'g)"/>' +
        '<path d="M32 23h-9a10 10 0 0 0 10 13M68 23h9a10 10 0 0 1-10 13" fill="none" stroke="url(#' + u.id + 'b)" stroke-width="5"/>' +
        '<rect x="45" y="56" width="10" height="16" fill="url(#' + u.id + 'b)"/>' +
        '<rect x="30" y="72" width="40" height="11" rx="4" fill="url(#' + u.id + 'b)"/></g>';
    },
    award: function (u) {
      return '<g><ellipse cx="50" cy="92" rx="20" ry="4.5" fill="url(#' + u.id + 'sh)"/>' +
        '<circle cx="50" cy="40" r="23" fill="url(#' + u.id + 'g)"/>' +
        '<circle cx="50" cy="40" r="23" fill="none" stroke="#fff" stroke-width="1.6" opacity=".65"/>' +
        '<path d="M38 58l-8 30 20-10 20 10-8-30" fill="url(#' + u.id + 'b)"/>' +
        '<path d="M42 40l6 6 12-13" stroke="' + u.dark + '" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/></g>';
    },
    diary: function (u) {
      return '<g><ellipse cx="50" cy="90" rx="22" ry="4.5" fill="url(#' + u.id + 'sh)"/>' +
        '<rect x="26" y="12" width="48" height="72" rx="6" fill="url(#' + u.id + 'b)"/>' +
        '<rect x="30" y="12" width="38" height="72" rx="5" fill="url(#' + u.id + 'g)"/>' +
        '<rect x="36" y="38" width="26" height="3" rx="1.5" fill="#fff" opacity=".75"/>' +
        '<rect x="36" y="46" width="18" height="3" rx="1.5" fill="#fff" opacity=".5"/>' +
        '<rect x="66" y="34" width="4" height="30" rx="2" fill="' + u.acc + '"/></g>';
    },
    notebook: function (u) {
      return '<g><ellipse cx="50" cy="88" rx="20" ry="4" fill="url(#' + u.id + 'sh)"/>' +
        '<rect x="28" y="12" width="44" height="70" rx="6" fill="url(#' + u.id + 'g)"/>' +
        '<rect x="28" y="12" width="44" height="12" rx="5" fill="url(#' + u.id + 'b)"/>' +
        '<rect x="36" y="36" width="26" height="3" rx="1.5" fill="#fff" opacity=".7"/>' +
        '<rect x="36" y="44" width="18" height="3" rx="1.5" fill="#fff" opacity=".45"/></g>';
    },
    keychain: function (u) {
      return '<g><ellipse cx="50" cy="90" rx="16" ry="4" fill="url(#' + u.id + 'sh)"/>' +
        '<path d="M42 6a9 9 0 0 1 8 12" fill="none" stroke="' + u.dark + '" stroke-width="3.4" opacity=".75"/>' +
        '<rect x="32" y="24" width="36" height="58" rx="10" fill="url(#' + u.id + 'g)"/>' +
        '<rect x="39" y="44" width="22" height="3" rx="1.5" fill="#fff" opacity=".7"/></g>';
    },
    blanket: function (u) {
      return '<g><ellipse cx="50" cy="90" rx="32" ry="5" fill="url(#' + u.id + 'sh)"/>' +
        '<path d="M16 22h68v52a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6Z" fill="url(#' + u.id + 'g)"/>' +
        '<path d="M16 22h68v13H16Z" fill="url(#' + u.id + 'b)"/>' +
        '<g stroke="#fff" stroke-width="2" opacity=".4"><path d="M32 35v45M46 35v45M60 35v45M74 35v45"/></g></g>';
    },
    hamper: function (u) {
      return '<g><ellipse cx="50" cy="90" rx="30" ry="5" fill="url(#' + u.id + 'sh)"/>' +
        '<path d="M20 24c0-8 13-14 30-14s30 6 30 14" fill="none" stroke="' + u.dark + '" stroke-width="3" opacity=".6"/>' +
        '<path d="M18 26h64l-6 56H24Z" fill="url(#' + u.id + 'g)"/>' +
        '<path d="M14 24h72v10H14Z" fill="url(#' + u.id + 'b)"/>' +
        '<path d="M50 24c-10 0-15-6-15-11s9-4 15 11c6-15 15-11 15-11s-5 11-15 11Z" fill="' + u.acc + '"/>' +
        '<rect x="40" y="50" width="20" height="18" rx="4" fill="#fff" opacity=".45"/></g>';
    },
    desk: function (u) {
      return '<g><ellipse cx="50" cy="88" rx="30" ry="5" fill="url(#' + u.id + 'sh)"/>' +
        '<rect x="14" y="42" width="72" height="38" rx="7" fill="url(#' + u.id + 'g)"/>' +
        '<rect x="14" y="42" width="72" height="10" rx="5" fill="url(#' + u.id + 'b)" opacity=".8"/>' +
        '<rect x="24" y="58" width="24" height="16" rx="3" fill="#fff" opacity=".7"/>' +
        '<rect x="30" y="24" width="10" height="20" rx="4" fill="url(#' + u.id + 'b)"/></g>';
    },
    candle: function (u) {
      return '<g><ellipse cx="50" cy="92" rx="20" ry="4.5" fill="url(#' + u.id + 'sh)"/>' +
        '<path d="M50 44V32c0-3.5 3.5-3.5 3.5-7S50 18 50 18s-3.5 2.8-3.5 7 3.5 3.5 3.5 7Z" fill="#E8912F"/>' +
        '<rect x="34" y="42" width="32" height="46" rx="7" fill="url(#' + u.id + 'g)"/>' +
        '<ellipse cx="50" cy="42" rx="16" ry="4.5" fill="' + u.lite + '"/>' +
        '<rect x="38" y="56" width="24" height="14" rx="3" fill="#fff" opacity=".5"/></g>';
    }
  };

  function art(kind, skin) {
    var s = SKIN[skin] || SKIN.green;
    var id = "a" + (++uid);
    var body = s.body, dark = shade(body, 0.34), lite = tint(body, 0.42);
    var fn = ART[kind] || ART.giftbox;
    return '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' +
      "<defs>" +
        '<radialGradient id="' + id + 'bg" cx="50%" cy="34%" r="78%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="' + s.bg + '"/></radialGradient>' +
        '<linearGradient id="' + id + 'g" x1="18%" y1="6%" x2="86%" y2="96%"><stop offset="0%" stop-color="' + lite + '"/><stop offset="52%" stop-color="' + body + '"/><stop offset="100%" stop-color="' + dark + '"/></linearGradient>' +
        '<linearGradient id="' + id + 'b" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="' + body + '"/><stop offset="100%" stop-color="' + dark + '"/></linearGradient>' +
        '<linearGradient id="' + id + 'sh" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="' + dark + '" stop-opacity=".32"/><stop offset="100%" stop-color="' + dark + '" stop-opacity="0"/></linearGradient>' +
      "</defs>" +
      '<rect width="100" height="100" fill="url(#' + id + 'bg)"/>' +
      fn({ id: id, body: body, dark: dark, lite: lite, acc: s.acc }) + "</svg>";
  }

  /* ---------- catalogue -------------------------------------------------- */
  var P = [
    { id: "p01", n: "Personalized Gift Box", c: "Gift Sets", a: "giftbox", s: "green", p: 2500, w: 3200, r: 4.9, rv: 128, st: 24, o: ["birthday", "anniversary", "christmas"], rc: ["her", "couples"], t: ["gift box", "hamper", "personalized"], b: "best", d: "A curated box of thoughtful keepsakes ΓÇö ribbon, card and a handwritten note included.", sp: { Packaging: "Gift box", Wrapping: "Free", Personalization: "Name & message" } },
    { id: "p02", n: "Classic Leather Watch", c: "Watches", a: "watch", s: "stone", p: 3800, w: 4800, r: 4.8, rv: 96, st: 12, o: ["birthday", "fathers-day", "anniversary"], rc: ["him", "boss"], t: ["watch", "leather", "men"], b: "sale", d: "Minimal stainless-steel case with a genuine leather strap. Comes in a presentation box.", sp: { Movement: "Quartz", Strap: "Genuine leather", Warranty: "1 year" } },
    { id: "p03", n: "Couple Watches Set", c: "Watches", a: "watch", s: "ink", p: 9800, r: 4.9, rv: 64, st: 6, o: ["anniversary", "wedding", "valentines"], rc: ["couples"], t: ["couple watches", "matching", "wedding"], b: "best", d: "Matching His & Hers watches with engraved case backs ΓÇö a gift that keeps giving.", sp: { Movement: "Quartz", Engraving: "Included", Warranty: "1 year" } },
    { id: "p04", n: "Premium Leather Wallet", c: "Accessories", a: "wallet", s: "sand", p: 2200, w: 2800, r: 4.7, rv: 152, st: 40, o: ["birthday", "fathers-day", "graduation"], rc: ["him", "boss"], t: ["wallet", "leather", "gift"], b: "sale", d: "Full-grain leather bifold with RFID protection and eight card slots.", sp: { Material: "Full-grain leather", Cards: "8 slots", RFID: "Yes" } },
    { id: "p05", n: "Rose Gold Pendant Necklace", c: "Jewelry", a: "necklace", s: "rose", p: 1999, w: 2500, r: 4.8, rv: 88, st: 18, o: ["anniversary", "valentines", "birthday"], rc: ["her", "couples"], t: ["necklace", "pendant", "gold"], b: "sale", d: "A delicate pendant on a fine chain, presented in a velvet box.", sp: { Metal: "Rose gold plated", Chain: "45cm", Box: "Velvet" } },
    { id: "p06", n: "Custom Printed Mug", c: "Personalized", a: "mug", s: "sky", p: 900, r: 4.6, rv: 210, st: 120, o: ["just-because", "graduation", "birthday"], rc: ["her", "him", "friends"], t: ["mug", "custom", "photo", "personalized"], d: "Your photo or design printed on a 350ml ceramic mug. Dishwasher safe.", sp: { Capacity: "350ml", Print: "Sublimation", Care: "Dishwasher safe" } },
    { id: "p07", n: "Engraved Steel Tumbler", c: "Personalized", a: "tumbler", s: "stone", p: 1800, w: 2300, r: 4.8, rv: 174, st: 55, o: ["birthday", "graduation", "fathers-day"], rc: ["him", "her", "colleagues"], t: ["tumbler", "engraved", "steel", "personalized"], b: "sale", d: "Double-walled stainless tumbler with laser engraving ΓÇö keeps drinks hot for 6 hours.", sp: { Material: "Stainless steel", Engraving: "Laser", Capacity: "500ml" } },
    { id: "p08", n: "Insulated Water Bottle", c: "Personalized", a: "bottle", s: "green", p: 1499, w: 2000, r: 4.7, rv: 143, st: 72, o: ["graduation", "just-because"], rc: ["him", "her", "colleagues"], t: ["bottle", "flask", "insulated", "personalized"], b: "sale", d: "500ml insulated bottle with a laser-etched name or logo.", sp: { Capacity: "500ml", Cold: "12 hours", Print: "Laser etch" } },
    { id: "p09", n: "Crystal Award Trophy", c: "Trophies", a: "award", s: "sky", p: 3200, r: 4.9, rv: 41, st: 15, o: ["celebration", "graduation"], rc: ["corporate", "boss"], t: ["trophy", "crystal", "award", "engraved"], b: "new", d: "Optical crystal award on a wooden base, engraved with recipient and achievement.", sp: { Material: "Crystal & wood", Engraving: "Included", Base: "Wooden" } },
    { id: "p10", n: "Classic Cup Trophy", c: "Trophies", a: "trophy", s: "gold", p: 2100, w: 2600, r: 4.6, rv: 33, st: 22, o: ["celebration", "graduation"], rc: ["corporate"], t: ["trophy", "cup", "award", "engraved"], b: "sale", d: "A timeless engraved cup for sports, academic and corporate achievements.", sp: { Height: "26cm", Engraving: "Included", Finish: "Gold" } },
    { id: "p11", n: "Executive Gift Hamper", c: "Corporate", a: "hamper", s: "ink", p: 6499, w: 7000, r: 5.0, rv: 27, st: 8, o: ["celebration", "thank-you"], rc: ["corporate", "boss"], t: ["corporate", "hamper", "executive", "premium"], b: "best", d: "Premium executive hamper with notebook, pen, tumbler and keyring ΓÇö branded to your company.", sp: { Items: "7 pieces", Branding: "Logo print", Packing: "Rigid gift box" } },
    { id: "p12", n: "Branded A5 Notebook", c: "Corporate", a: "notebook", s: "green", p: 450, r: 4.6, rv: 186, st: 300, o: ["graduation", "corporate"], rc: ["corporate", "colleagues"], t: ["notebook", "branded", "stationery", "bulk"], d: "A5 notebook with full-colour cover print. Perfect for bulk corporate orders.", sp: { Size: "A5", Pages: "80 lined", Print: "Full colour" } },
    { id: "p13", n: "Executive Desk Organizer", c: "Office", a: "desk", s: "sand", p: 2900, w: 3500, r: 4.7, rv: 52, st: 20, o: ["thank-you", "celebration"], rc: ["corporate", "boss"], t: ["desk", "organizer", "office", "executive"], b: "sale", d: "Solid wood desk organizer with pen holder, note pad and cable management.", sp: { Material: "Solid wood", Compartments: "5", Finish: "Matte" } },
    { id: "p14", n: "Maasai-Inspired Fleece Blanket", c: "Home", a: "blanket", s: "rose", p: 3499, w: 4000, r: 4.9, rv: 118, st: 26, o: ["housewarming", "just-because"], rc: ["her", "him", "couples"], t: ["blanket", "maasai", "warm"], b: "best", d: "Soft double-sided fleece blanket with traditional Kenyan patterns.", sp: { Size: "150 x 200cm", Material: "Fleece", Care: "Machine wash" } },
    { id: "p15", n: "Custom Acrylic Keychain", c: "Personalized", a: "keychain", s: "lilac", p: 350, r: 4.5, rv: 264, st: 400, o: ["just-because", "graduation"], rc: ["friends", "couples", "her"], t: ["keychain", "custom", "photo", "acrylic"], d: "Personalised acrylic keychain with your photo, name or logo. Bulk pricing available.", sp: { Size: "6cm", Print: "UV print", Pack: "Single or bulk" } },
    { id: "p16", n: "Executive Leather Diary", c: "Stationery", a: "diary", s: "stone", p: 1900, w: 2400, r: 4.6, rv: 74, st: 34, o: ["graduation", "corporate"], rc: ["corporate", "boss", "him"], t: ["diary", "planner", "leather", "branded"], b: "sale", d: "Hardbound leather diary with ruled pages, ribbon marker and pen loop.", sp: { Pages: "192", Size: "A5", Branding: "Deboss" } },
    { id: "p17", n: "Gold Bracelet", c: "Jewelry", a: "bracelet", s: "gold", p: 2600, r: 4.7, rv: 58, st: 20, o: ["birthday", "valentines", "anniversary"], rc: ["her"], t: ["bracelet", "gold", "jewelry"], d: "Slim gold-tone bracelet with a crystal accent. Adjustable wrist.", sp: { Metal: "Gold plated", Length: "Adjustable", Box: "Included" } },
    { id: "p18", n: "Birthday Gift Basket", c: "Gift Sets", a: "hamper", s: "rose", p: 3200, r: 4.8, rv: 91, st: 18, o: ["birthday", "just-because"], rc: ["her", "friends", "mom"], t: ["basket", "birthday", "gift set"], b: "new", d: "A cheerful gift basket with treats, candles and a birthday card included.", sp: { Items: "9 pieces", Card: "Included", Delivery: "Nationwide" } },
    { id: "p19", n: "Formal Leather Belt", c: "Accessories", a: "belt", s: "sand", p: 1600, r: 4.5, rv: 67, st: 45, o: ["birthday", "fathers-day", "graduation"], rc: ["him", "boss"], t: ["belt", "leather", "formal"], d: "Reversible formal belt with a brushed metal buckle.", sp: { Width: "3.5cm", Material: "Genuine leather", Buckle: "Metal" } },
    { id: "p20", n: "Eau de Parfum 100ml", c: "Fragrance", a: "perfume", s: "sky", p: 3499, w: 4200, r: 4.8, rv: 105, st: 28, o: ["birthday", "anniversary", "fathers-day"], rc: ["him", "her", "friends"], t: ["perfume", "fragrance", "unisex"], b: "sale", d: "A warm, woody fragrance that lasts all day. 100ml spray.", sp: { Size: "100ml", Notes: "Woody & amber", Shelf: "3 years" } },
    { id: "p21", n: "Scented Soy Candle", c: "Home", a: "candle", s: "rose", p: 1200, r: 4.6, rv: 88, st: 60, o: ["housewarming", "just-because", "mothers-day"], rc: ["her", "friends", "mom"], t: ["candle", "scented", "home"], d: "Hand-poured soy candle with a warm vanilla-cedar scent. 40-hour burn.", sp: { Burn: "40 hours", Wax: "Soy", Size: "220g" } },
    { id: "p22", n: "Matching Couple Jewelry Set", c: "Jewelry", a: "ring", s: "lilac", p: 3999, w: 4500, r: 4.9, rv: 46, st: 12, o: ["anniversary", "valentines", "wedding"], rc: ["couples"], t: ["couple", "rings", "matching", "jewelry"], b: "sale", d: "His & Hers matching rings or pendant set, presented in a joint gift box.", sp: { Material: "Stainless steel", Sets: "His & hers", Box: "Joint gift box" } },
    { id: "p23", n: "Corporate Kit ΓÇö Notebook, Tumbler & Tote", c: "Corporate", a: "hamper", s: "sky", p: 4999, w: 6500, r: 4.9, rv: 38, st: 14, o: ["corporate", "thank-you"], rc: ["corporate"], t: ["corporate", "gift set", "branded", "employee"], b: "best", d: "A complete branded welcome kit for new staff or clients, with logo print on every item.", sp: { Items: "4 pieces", Branding: "Logo print", Packaging: "Gift box" } },
    { id: "p24", n: "Baby Shower Gift Set", c: "Gift Sets", a: "giftbox", s: "sky", p: 3800, r: 4.8, rv: 39, st: 16, o: ["celebration", "baby-shower"], rc: ["her", "friends", "couples"], t: ["baby shower", "mom", "gift set"], b: "new", d: "A thoughtful hamper for new parents with keepsakes, tea and a keepsake card.", sp: { Items: "6 pieces", Card: "Included", Wrap: "Free" } },
    { id: "p25", n: "Branded Acrylic Name Tag", c: "Corporate", a: "award", s: "gold", p: 499, w: 800, r: 4.5, rv: 44, st: 200, o: ["corporate", "thank-you"], rc: ["corporate", "colleagues"], t: ["name tag", "branded", "acrylic"], b: "sale", d: "Personalised acrylic name badge with your name, role and company logo.", sp: { Size: "7 x 3cm", Print: "UV print", Pack: "Single or bulk" } },
    { id: "p26", n: "Executive B5 Diary & Pen Set", c: "Stationery", a: "diary", s: "ink", p: 1799, w: 2000, r: 4.7, rv: 63, st: 46, o: ["graduation", "corporate"], rc: ["corporate", "boss", "him"], t: ["diary", "pen", "gift set", "branded"], b: "sale", d: "Hardbound B5 executive diary paired with a matching engraved pen, in a gift box.", sp: { Size: "B5", Pages: "160", Branding: "Deboss" } },
    { id: "p27", n: "Branded Jute Tote Bag", c: "Corporate", a: "hamper", s: "sand", p: 1299, w: 1500, r: 4.6, rv: 72, st: 88, o: ["corporate", "graduation"], rc: ["corporate", "colleagues"], t: ["tote", "jute", "branded", "eco"], b: "sale", d: "Reusable natural jute tote bag with a full-colour logo print ΓÇö an eco-friendly corporate giveaway.", sp: { Size: "38 x 42cm", Material: "Jute", Print: "Screen print" } },
    { id: "p28", n: "Personalized Wooden Perpetual Calendar", c: "Office", a: "desk", s: "sand", p: 1999, w: 2500, r: 4.7, rv: 41, st: 38, o: ["thank-you", "corporate"], rc: ["corporate", "boss"], t: ["calendar", "wooden", "engraved"], b: "sale", d: "Solid wood perpetual desk calendar, engraved with a name, title or company logo.", sp: { Material: "Solid wood", Engraving: "Laser", Size: "18 x 9cm" } }
  ];

  var CATS = ["Gift Sets", "Personalized", "Watches", "Jewelry", "Trophies", "Corporate", "Fragrance", "Home", "Stationery", "Accessories", "Office"];

  var PRICE_BANDS = [
    { n: "KShs0 ΓÇô KShs1,000", min: 0, max: 1000 },
    { n: "KShs1,000 ΓÇô KShs2,500", min: 1000, max: 2500 },
    { n: "KShs2,500 ΓÇô KShs5,000", min: 2500, max: 5000 },
    { n: "KShs5,000+", min: 5000, max: Infinity }
  ];

  var OCCASIONS = [
    { n: "Birthday", f: "birthday" }, { n: "Secret Santa", f: "christmas" }, { n: "Valentine's", f: "valentines" },
    { n: "Graduation", f: "graduation" }, { n: "Anniversary", f: "anniversary" }, { n: "Wedding", f: "wedding" },
    { n: "Father's Day", f: "fathers-day" }, { n: "Mother's Day", f: "mothers-day" },
    { n: "Housewarming", f: "housewarming" }, { n: "Just Because", f: "just-because" },
    { n: "Thank You", f: "thank-you" }, { n: "Celebration", f: "celebration" }, { n: "Baby Shower", f: "baby-shower" }
  ];
  var RECIPIENTS = [
    { n: "Her", f: "her" }, { n: "Him", f: "him" }, { n: "Couples", f: "couples" },
    { n: "Mom", f: "mom" }, { n: "Dad", f: "dad" }, { n: "Friends", f: "friends" },
    { n: "Boss", f: "boss" }, { n: "Colleagues", f: "colleagues" }
  ];

  /* ---------- navigation tree (Rio-shaped, ZED products) ---------------- */
  var NAV = [
    { t: "Men", f: "him", feat: "p02", cols: [
      { h: "Gifts By Occassion", l: ["Secret Santa", "Gift for Dad", "Gift for Boss", "Romantic Gifts", "Wedding Gifts", "Graduation Gifts", "Anniversary Gifts", "Just Because Gifts", "Father's Day Gifts", "Valentine's Day Gifts", "Birthday Gifts for Him"] },
      { h: "Most Popular Gifts", l: ["Watches", "Mugs", "Keychains", "Gift Cards", "Name Tags", "2027 Diaries", "Card Holder", "Thermal Flask", "Desk Organizers", "Hip Flask Gift Set"] },
      { h: "Accessories", l: ["Belts", "Jewelry", "Wallets", "Tie Sets", "Cufflinks", "Bracelets", "Watch Organizers", "Maasai Blankets", "Perfumes"] },
      { h: "Other Gifts", l: ["Sneakers", "Official Shoes", "Leather Wallets", "Hip Flask", "Desk Organizer", "Personalized Gifts"] }
    ] },
    { t: "Women", f: "her", feat: "p05", cols: [
      { h: "Gifts By Occassion", l: ["Secret Santa", "Gifts for Boss", "Gifts For Mom", "Romantic Gifts", "Graduation Gifts", "Maasai Blankets", "Anniversary Gifts", "Just Because Gifts", "Valentine's Day Gifts", "Birthday Gifts For Her"] },
      { h: "Most Popular", l: ["Jewelry", "Watches", "Bracelets", "Clutch Bags", "Mothers Day", "Ladies Giftsets", "Perfumes & Fragrances", "Watch Organizers"] },
      { h: "Most Popular", l: ["Mugs", "Keychains", "Gift Cards", "Name Tags", "2027 Diaries", "Card Holders", "Thermal Flasks", "Desk Organizers"] },
      { h: "Home & Scent", l: ["Scented Candles", "Fleece Blankets", "Gift Hampers", "Baby Shower Sets"] }
    ] },
    { t: "Trophies", f: null, cat: "Trophies", cols: [
      { h: "Awards & Trophies", l: ["Crystal Awards", "Cup Trophies", "School Awards", "Corporate Awards", "Recognition Gifts", "Graduation Awards"] },
      { h: "By Material", l: ["Crystal", "Acrylic", "Wooden", "Metal", "Glass"] },
      { h: "Engraving", l: ["Recipient Names", "Company Logo", "Achievement Text", "Date & Event"] },
      { h: "Extras", l: ["Wooden Bases", "Gift Boxes", "Bulk Orders"] }
    ] },
    { t: "Corporate Gifts", f: null, cat: "Corporate", feat: "p23", cols: [
      { h: "Drinkware", l: ["Mugs", "Tumblers", "Water Bottles", "Thermal Flasks", "Stanley Mugs"] },
      { h: "Stationery Gifts", l: ["Gift Sets", "Notebooks", "Desk Organizers", "Jute Tote Bags", "2027 Diaries", "Name Tags"] },
      { h: "Awards & Trophies", l: ["For Schools", "For Individuals", "For Companies", "Crystal Desk Organizers"] },
      { h: "Tech", l: ["Power Banks", "Smart Watches", "Wireless Chargers", "USB Accessories"] }
    ] },
    { t: "Promotional", f: null, cat: "Corporate", cols: [
      { h: "Gifts", l: ["Watches", "Keychain", "Tie Sets", "Name Tags", "Leather Belts", "Leather Wallets", "Stanley Mugs"] },
      { h: "Stationery Products", l: ["Pens", "Notebooks", "2027 Diaries", "Folders"] },
      { h: "Drinkware", l: ["Mugs", "Water Bottles", "Thermal Flask"] },
      { h: "Crystal Products", l: ["Desk Organizers", "Awards and Trophies", "Wooden Products"] }
    ] },
    { t: "Personalized", f: null, cat: "Personalized", feat: "p06", cols: [
      { h: "Engraving", l: ["Belts", "Pens", "Wallets", "Keychains", "Notebooks", "Name Tags", "2027 Diaries", "Thermal Flask", "Watch Organizer"] },
      { h: "UV Printing", l: ["Mugs", "Keychain", "Name Tags", "Crystal Items", "Leather Belts", "Leather Wallets"] },
      { h: "Digital Printing", l: ["Mugs", "Keychain", "Name Tags", "Crystal Items", "2027 Diaries"] },
      { h: "Sublimation", l: ["Mugs", "Water Bottles", "Tumblers"] }
    ] },
    { t: "Wholesale", f: null, cat: "Corporate", cols: [
      { h: "Wholesale", l: ["Bulk Mugs", "Bulk Notebooks", "Bulk Keychains", "Bulk Water Bottles", "Bulk Diaries"] },
      { h: "Pricing", l: ["50+ units", "100+ units", "500+ units", "Reseller rates"] },
      { h: "Support", l: ["Artwork help", "Proof approval", "Delivery schedule"] },
      { h: "Payment", l: ["Invoice", "M-Pesa", "Bank transfer"] }
    ] },
    { t: "Cards", f: null, cat: "Gift Sets", cols: [
      { h: "Cards", l: ["Birthday Cards", "Wedding Cards", "Thank You Cards", "Baby Cards", "Christmas Cards"] },
      { h: "Add-ons", l: ["Gift Wrapping", "Handwritten Note", "Ribbon"] },
      { h: "Bundles", l: ["Card + Gift Set", "Corporate Cards"] },
      { h: "Delivery", l: ["Same-day Nairobi", "Nationwide"] }
    ] },
    { t: "Watches", f: null, cat: "Watches", feat: "p03", cols: [
      { h: "Ladies", l: ["All Watches", "Smart Watches", "Gift Sets", "Couple Watches", "Kids Watches"] },
      { h: "Gentlemen", l: ["All Watches", "Smart Watches", "Automatic Watches", "Leather Strap"] },
      { h: "By Style", l: ["Classic", "Minimal", "Sport", "Luxury"] },
      { h: "Extras", l: ["Watch Boxes", "Engraving", "Strap Replacement"] }
    ] },
    { t: "Gifts below 1000", f: null, max: 1000, cols: [
      { h: "Under KShs 1,000", l: ["Keychains", "Mugs", "Name Tags", "Notebooks", "Candles", "Cards"] },
      { h: "Best Sellers", l: ["Custom Mug", "Acrylic Keychain", "Branded Notebook"] },
      { h: "Bulk Friendly", l: ["Under KShs 500", "50+ units"] },
      { h: "Add-ons", l: ["Gift Wrapping", "Greeting Card"] }
    ] },
    { t: "Jewelry", f: null, cat: "Jewelry", feat: "p17", cols: [
      { h: "Most Popular Gifts", l: ["Necklaces", "Earrings", "Bracelets", "Rings", "Cufflinks"] },
      { h: "Romantic Gifts", l: ["Matching set", "Couple necklaces", "Pendant necklaces", "Personalized Jewelry", "Valentine's necklaces"] },
      { h: "New Arrivals", l: ["Pendant Necklaces", "Couple Sets", "Charm Bracelets"] },
      { h: "Gifts", l: ["Gift Sets", "Jewelry Boxes", "Birthday Jewelry"] }
    ] },
    { t: "Blog", f: null, cat: null, cols: [
      { h: "Guides", l: ["Gift Ideas for Him", "Gift Ideas for Her", "Wedding Gift Guide", "Corporate Gifting 101"] },
      { h: "Occasions", l: ["Birthday Gifts", "Graduation Gifts", "Valentine's Gifts"] },
      { h: "News", l: ["New Arrivals", "Store Updates", "Offers"] },
      { h: "Help", l: ["Delivery Info", "Returns", "FAQs"] }
    ] }
  ];

  /* ---------- state ------------------------------------------------------ */
  var S = {
    cart: store("cart", []),
    wish: store("wish", []),
    f: { category: [], price: [], occasion: [], recipient: [], stock: [] },
    sort: "featured",
    q: "",
    page: 1,
    per: 12
  };
  function saveCart() { save("cart", S.cart); }
  function saveWish() { save("wish", S.wish); }
  function byId(id) { for (var i = 0; i < P.length; i++) if (P[i].id === id) return P[i]; return null; }
  function cartCount() { return S.cart.reduce(function (n, l) { return n + l.qty; }, 0); }
  function cartSub() { return S.cart.reduce(function (n, l) { var p = byId(l.id); return n + (p ? p.p * l.qty : 0); }, 0); }
  function off(p) { return p.w && p.w > p.p ? Math.round(((p.w - p.p) / p.w) * 100) : 0; }
  function stars(r) { var n = Math.round(r), s = ""; for (var i = 1; i <= 5; i++) s += i <= n ? "Γÿà" : "Γÿå"; return s; }
  function activeCount() { return Object.keys(S.f).reduce(function (n, k) { return n + S.f[k].length; }, 0); }

  /* ---------- card (WooCommerce anatomy) --------------------------------- */
  function card(p) {
    var d = off(p);
    var w = S.wish.indexOf(p.id) > -1;
    var out = p.st <= 0;
    var tag = out ? '<span class="pcard__tag pcard__tag--out">Sold out</span>'
      : d > 0 ? '<span class="pcard__tag">Sale!</span>'
      : p.b === "new" ? '<span class="pcard__tag pcard__tag--new">New</span>' : "";

    /* Rio-style price block: current, struck original, then savings line */
    var price = "<b>" + money(p.p) + "</b>";
    if (d > 0) {
      price += "<s>" + money(p.w) + "</s>" +
        "<em>Original price was: " + money(p.w) + ". <b>" + money(p.p) + "</b> Current price is: " + money(p.p) + ". Save " + d + "%</em>";
    }

    var action = out
      ? '<span class="pcard__out">Currently unavailable</span>'
      : '<button class="abtn" type="button" data-add="' + p.id + '">Add to cart</button>';

    return '<article class="pcard">' +
      '<div class="pcard__media">' + art(p.a, p.s) +
        (tag ? '<div class="pcard__tags">' + tag + "</div>" : "") +
        '<button class="pcard__heart' + (w ? " on" : "") + '" type="button" data-wish="' + p.id + '" aria-pressed="' + (w ? "true" : "false") + '" aria-label="Add ' + esc(p.n) + ' to wishlist">' +
          '<svg viewBox="0 0 24 24"><path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1Z"/></svg>' +
        "</button>" +
        '<div class="pcard__quick">' +
          '<button class="abtn" type="button" data-view="' + p.id + '">Quick view</button>' +
          '<button class="abtn" type="button" data-add="' + p.id + '">Add to cart</button>' +
        "</div>" +
      "</div>" +
      '<div class="pcard__b">' +
        '<p class="pcard__c">' + esc(p.c) + "</p>" +
        '<h3 class="pcard__t"><a href="#shop" data-view="' + p.id + '">' + esc(p.n) + "</a></h3>" +
        '<p class="pcard__r"><span class="stars" role="img" aria-label="' + p.r + ' out of 5">' + stars(p.r) + "</span>" + p.r.toFixed(1) + " (" + p.rv + ")</p>" +
        '<p class="pcard__p">' + price + "</p>" +
        '<div class="pcard__act">' + action + "</div>" +
      "</div></article>";
  }

  /* ---------- build nav + sidebar ---------------------------------------- */
  function megaHTML(item) {
    var feat = item.feat ? byId(item.feat) : null;
    var cols = item.cols.map(function (c) {
      return '<div class="mega__c"><h4 class="mega__h">' + esc(c.h) + "</h4>" +
        c.l.map(function (t) {
          var target = item.cat ? ' data-cat="' + esc(item.cat) + '"'
            : item.max ? ' data-max="' + item.max + '"'
            : item.f ? ' data-rc="' + item.f + '"' : ' data-cat=""';
          return '<a href="#shop" class="jmp"' + target + ">" + esc(t) + "</a>";
        }).join("") + "</div>";
    }).join("");

    var featHTML = feat ? (
      (off(feat) > 0 ? '<span class="mega__badge">Sale!</span>' : "") +
      '<div class="mega__img">' + art(feat.a, feat.s) + "</div>" +
      '<p class="mega__t">' + esc(feat.n) + "</p>" +
      '<p class="mega__p">' + (off(feat) > 0 ? "<s>" + money(feat.w) + "</s>" : "") + money(feat.p) + "</p>" +
      '<button class="abtn abtn--sm" type="button" data-add="' + feat.id + '">Add to cart</button>'
    ) : '<p class="mega__t">Browse the full range</p><p class="mega__p">Same-day Nairobi delivery</p>';

    return '<div class="mega"><div class="mega__cols">' + cols + "</div>" +
      '<div class="mega__feat">' + featHTML + "</div></div>";
  }

  function build() {
    /* nav */
    var navIn = $("#navIn");
    if (navIn) {
      navIn.innerHTML = NAV.map(function (item, i) {
        return '<div class="nitem" data-i="' + i + '">' +
          '<a class="nlink' + (item.t === "Gifts below 1000" ? " nlink--hot" : "") + '" href="#shop">' + esc(item.t) + "</a>" +
          megaHTML(item) + "</div>";
      }).join("");
    }

    /* category band */
    var cl = $("#catList");
    if (cl) {
      cl.innerHTML = CATS.filter(function (c) { return P.some(function (p) { return p.c === c; }); })
        .map(function (c) {
          return '<li><a href="#shop" data-cat="' + esc(c) + '">' +
            '<svg viewBox="0 0 24 24"><path d="M4 7h16l-1.4 12.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>' +
            esc(c) + "</a></li>";
        }).join("");
    }

    /* sidebar filters */
    var side = $("#side");
    if (side) {
      function set(name, label, body) {
        return '<div class="fset open" data-set="' + name + '">' +
          '<button class="fset__t" type="button" data-fg>' + label +
            '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>' +
          '<div class="fset__p"><div class="fset__i"><div>' + body + "</div></div></div></div>";
      }
      side.innerHTML =
        set("category", "Categories", CATS.filter(function (c) { return P.some(function (p) { return p.c === c; }); }).map(function (c) {
          return '<label class="fopt"><input type="checkbox" data-f="category" value="' + esc(c) + '">' + esc(c) +
            "<span>" + P.filter(function (p) { return p.c === c; }).length + "</span></label>";
        }).join("")) +
        set("price", "Price", PRICE_BANDS.map(function (b, i) {
          return '<label class="fopt"><input type="checkbox" data-f="price" value="' + i + '">' + esc(b.n) + "</label>";
        }).join("")) +
        set("occasion", "Occasion", OCCASIONS.filter(function (o) { return P.some(function (p) { return p.o.indexOf(o.f) > -1; }); }).map(function (o) {
          return '<label class="fopt"><input type="checkbox" data-f="occasion" value="' + o.f + '">' + esc(o.n) +
            "<span>" + P.filter(function (p) { return p.o.indexOf(o.f) > -1; }).length + "</span></label>";
        }).join("")) +
        set("recipient", "Recipient", RECIPIENTS.filter(function (r) { return P.some(function (p) { return p.rc.indexOf(r.f) > -1; }); }).map(function (r) {
          return '<label class="fopt"><input type="checkbox" data-f="recipient" value="' + r.f + '">' + esc(r.n) +
            "<span>" + P.filter(function (p) { return p.rc.indexOf(r.f) > -1; }).length + "</span></label>";
        }).join("")) +
        set("stock", "Availability", '<label class="fopt"><input type="checkbox" data-f="stock" value="in"> In stock only</label>');
    }

    /* drawer nav */
    var dn = $("#drwNav");
    if (dn) {
      dn.innerHTML = NAV.map(function (item, i) {
        var links = [];
        item.cols.forEach(function (c) {
          links.push({ t: c.h, head: true });
          c.l.forEach(function (t) {
            links.push({ t: t, cat: item.cat, max: item.max, rc: item.f });
          });
        });
        return '<div class="acc"><button class="acc__t" type="button" data-acc>' + esc(item.t) +
          '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>' +
          '<div class="acc__p"><div class="acc__i">' + links.map(function (l) {
            if (l.head) return '<a href="#shop" style="font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#79817c;pointer-events:none">' + esc(l.t) + "</a>";
            return '<a href="#shop" class="jmp"' + (l.cat ? ' data-cat="' + esc(l.cat) + '"' : l.max ? ' data-max="' + l.max + '"' : l.rc ? ' data-rc="' + l.rc + '"' : "") + ">" + esc(l.t) + "</a>";
          }).join("") + "</div></div></div>";
      }).join("");
    }
  }

  /* ---------- filtering, sorting, pagination ------------------------------ */
  function filtered() {
    var f = S.f, list = P.slice();
    if (f.category.length) list = list.filter(function (p) { return f.category.indexOf(p.c) > -1; });
    if (f.recipient.length) list = list.filter(function (p) { return p.rc.some(function (r) { return f.recipient.indexOf(r) > -1; }); });
    if (f.occasion.length) list = list.filter(function (p) { return p.o.some(function (o) { return f.occasion.indexOf(o) > -1; }); });
    if (f.price.length) list = list.filter(function (p) {
      return f.price.some(function (i) { var b = PRICE_BANDS[i]; return p.p >= b.min && (b.max === Infinity ? true : p.p < b.max); });
    });
    if (f.stock.indexOf("in") > -1) list = list.filter(function (p) { return p.st > 0; });
    if (S.q) {
      var q = S.q.toLowerCase();
      list = list.filter(function (p) { return (p.n + " " + p.c + " " + p.t.join(" ") + " " + p.d).toLowerCase().indexOf(q) > -1; });
    }
    switch (S.sort) {
      case "popularity": list.sort(function (a, b) { return b.rv - a.rv; }); break;
      case "rating": list.sort(function (a, b) { return b.r - a.r; }); break;
      case "new": list.sort(function (a, b) { return (b.b === "new") - (a.b === "new"); }); break;
      case "price-asc": list.sort(function (a, b) { return a.p - b.p; }); break;
      case "price-desc": list.sort(function (a, b) { return b.p - a.p; }); break;
    }
    return list;
  }

  function apply(resetPage) {
    if (resetPage !== false) S.page = 1;
    var list = filtered();
    var pages = Math.max(1, Math.ceil(list.length / S.per));
    if (S.page > pages) S.page = pages;
    var slice = list.slice((S.page - 1) * S.per, S.page * S.per);

    var grid = $("#grid");
    if (grid) { grid.setAttribute("aria-busy", "false"); grid.innerHTML = slice.map(card).join(""); }
    var none = $("#none");
    if (none) none.hidden = list.length > 0;
    var cnt = $("#cnt");
    if (cnt) cnt.innerHTML = "Showing <b>" + (list.length ? (S.page - 1) * S.per + 1 : 0) + "ΓÇô" + Math.min(S.page * S.per, list.length) + "</b> of <b>" + list.length + "</b> result" + (list.length === 1 ? "" : "s");

    /* chips */
    var ch = $("#chips");
    if (ch) {
      var out = [];
      Object.keys(S.f).forEach(function (k) {
        S.f[k].forEach(function (v) {
          var lbl = v;
          if (k === "price") lbl = PRICE_BANDS[Number(v)].n;
          else if (k === "recipient") { var r = RECIPIENTS.filter(function (x) { return x.f === v; })[0]; lbl = r ? "For " + r.n : v; }
          else if (k === "occasion") { var o = OCCASIONS.filter(function (x) { return x.f === v; })[0]; lbl = o ? o.n : v; }
          else if (k === "stock") lbl = "In stock";
          out.push('<span class="chip">' + esc(lbl) + '<button type="button" data-un="' + k + '" data-uv="' + esc(v) + '" aria-label="Remove ' + esc(lbl) + '">├ù</button></span>');
        });
      });
      if (S.q) out.push('<span class="chip">ΓÇ£' + esc(S.q) + 'ΓÇ¥<button type="button" data-rq aria-label="Clear search">├ù</button></span>');
      ch.innerHTML = out.join("");
    }

    /* pagination */
    var pg = $("#pager");
    if (pg) {
      var h = "";
      if (pages > 1) {
        h += '<button type="button" data-pg="' + (S.page - 1) + '"' + (S.page === 1 ? " disabled" : "") + ' aria-label="Previous page">' +
          '<svg viewBox="0 0 24 24"><path d="M15 18 9 12l6-6"/></svg></button>';
        for (var i = 1; i <= pages; i++) {
          if (pages > 7 && i > 2 && i < pages - 1 && Math.abs(i - S.page) > 1) {
            if (Math.abs(i - S.page) === 2) h += '<span class="gap">ΓÇª</span>';
            continue;
          }
          h += '<button type="button" class="' + (i === S.page ? "on" : "") + '" data-pg="' + i + '">' + i + "</button>";
        }
        h += '<button type="button" data-pg="' + (S.page + 1) + '"' + (S.page === pages ? " disabled" : "") + ' aria-label="Next page">' +
          '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>';
      }
      pg.innerHTML = h;
    }
  }

  function toggleF(facet, val, on) {
    var a = S.f[facet], i = a.indexOf(val);
    if (on && i === -1) a.push(val);
    if (!on && i > -1) a.splice(i, 1);
  }
  function syncInputs() {
    $$("[data-f]").forEach(function (i) { i.checked = (S.f[i.getAttribute("data-f")] || []).indexOf(i.value) > -1; });
    $$("[data-cat]").forEach(function (a) {
      var on = a.classList.contains("on");
      if (on !== (S.f.category.indexOf(a.getAttribute("data-cat")) > -1)) a.classList.toggle("on", !on ? false : true);
    });
  }
  function reset() {
    S.f = { category: [], price: [], occasion: [], recipient: [], stock: [] };
    S.q = "";
    var i = $("#srch"); if (i) i.value = "";
    $$("[data-cat]").forEach(function (a) { a.classList.remove("on"); });
    syncInputs();
  }
  function shortcut(el) {
    var cat = el.getAttribute("data-cat"), max = el.getAttribute("data-max"), rc = el.getAttribute("data-rc");
    reset();
    if (cat) S.f.category.push(cat);
    if (max) {
      var b = PRICE_BANDS.findIndex(function (x) { return max === String(x.max); });
      if (b > -1) S.f.price.push(String(b));
      else S.f.price = PRICE_BANDS.map(function (_, i) { return String(i); });
    }
    if (rc) S.f.recipient.push(rc);
    apply();
  }

  /* ---------- featured grid ---------------------------------------------- */
  function buildFeatured() {
    var list = P.filter(function (p) { return off(p) > 0 || p.b === "best"; }).slice(0, 10);
    var g = $("#featGrid");
    if (g) g.innerHTML = list.map(card).join("");
  }

  /* ---------- cart / wishlist -------------------------------------------- */
  function addToCart(id, qty) {
    var p = byId(id);
    if (!p || p.st <= 0) return;
    qty = qty || 1;
    var l = S.cart.filter(function (x) { return x.id === id; })[0];
    if (l) l.qty = clamp(l.qty + qty, 1, p.st);
    else S.cart.push({ id: id, qty: clamp(qty, 1, p.st) });
    saveCart(); drawCart(); toast(p.n + " added to cart");
  }
  function setQty(id, q) {
    var p = byId(id), l = S.cart.filter(function (x) { return x.id === id; })[0];
    if (!l) return;
    l.qty = clamp(q, 1, p ? p.st : 99);
    if (l.qty <= 0) return drop(id);
    saveCart(); drawCart();
  }
  function drop(id) { S.cart = S.cart.filter(function (x) { return x.id !== id; }); saveCart(); drawCart(); }

  function drawCart() {
    var n = cartCount(), s = cartSub();
    var cn = $("#cartNum"), cc = $("#cartCur"), cd = $("#cartDot"), ch = $("#cartHd"), tc = $("#tabCartN");
    if (cn) cn.textContent = n;
    if (cc) cc.textContent = money(s);
    if (cd) cd.textContent = n;
    if (ch) ch.textContent = n;
    if (tc) { tc.textContent = n; tc.hidden = n === 0; }
    var fab = $("#fab"), ft = $("#fabTxt");
    if (fab) fab.classList.toggle("on", n > 0);
    if (ft) ft.textContent = "Cart (" + n + ")";

    var body = $("#cartBody"), foot = $("#cartFoot");
    if (!body) return;
    if (!S.cart.length) {
      if (foot) foot.hidden = true;
      body.innerHTML = '<div class="empty"><p><strong>Your cart is currently empty.</strong></p><p>Browse the catalogue and add something thoughtful.</p><button class="abtn abtn--sm" type="button" data-xcart>Start shopping</button></div>';
      return;
    }
    if (foot) foot.hidden = false;
    body.innerHTML = S.cart.map(function (l) {
      var p = byId(l.id); if (!p) return "";
      return '<div class="line"><div class="line__img">' + art(p.a, p.s) + "</div><div>" +
        '<p class="line__c">' + esc(p.c) + "</p>" +
        '<p class="line__n">' + esc(p.n) + "</p>" +
        '<div class="line__r"><span class="qty"><button type="button" data-dec="' + p.id + '" aria-label="Less">ΓêÆ</button><b>' + l.qty + "</b>" +
          '<button type="button" data-inc="' + p.id + '" aria-label="More">+</button></span>' +
          '<span class="line__p">' + money(p.p * l.qty) + "</span></div>" +
        '<div class="line__x"><button type="button" data-rm="' + p.id + '">Remove</button>' +
          '<button type="button" data-mv="' + p.id + '">Save for later</button></div>' +
        "</div></div>";
    }).join("");
    var sub = $("#sSub"), del = $("#sDel"), tot = $("#sTot");
    if (sub) sub.textContent = money(s);
    if (del) del.textContent = s >= 3000 ? "Free" : "Calculated at checkout";
    if (tot) tot.textContent = money(s);
  }

  function toggleWish(id) {
    var i = S.wish.indexOf(id), p = byId(id);
    if (i > -1) { S.wish.splice(i, 1); toast("Removed from wishlist"); }
    else { S.wish.push(id); toast(p ? p.n + " saved to wishlist" : "Saved"); }
    saveWish(); drawWish(); syncWish();
  }
  function syncWish() {
    $$("[data-wish]").forEach(function (b) {
      var on = S.wish.indexOf(b.getAttribute("data-wish")) > -1;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var n = S.wish.length, a = $("#wishCount"), t = $("#tabWishN"), h = $("#wishHd");
    if (a) { a.textContent = n; a.hidden = n === 0; }
    if (t) { t.textContent = n; t.hidden = n === 0; }
    if (h) h.textContent = n;
  }
  function drawWish() {
    var b = $("#wishBody"); if (!b) return;
    if (!S.wish.length) {
      b.innerHTML = '<div class="empty"><p><strong>Your wishlist is empty.</strong></p><p>Tap the heart on any product to save it here.</p><button class="abtn abtn--sm" type="button" data-xwish>Browse products</button></div>';
      return;
    }
    b.innerHTML = S.wish.map(function (id) {
      var p = byId(id); if (!p) return "";
      return '<div class="line"><div class="line__img">' + art(p.a, p.s) + "</div><div>" +
        '<p class="line__n">' + esc(p.n) + '</p><p class="line__p" style="margin-top:4px">' + money(p.p) + "</p>" +
        '<div class="line__x"><button class="abtn abtn--sm" type="button" data-add="' + p.id + '">Add to cart</button>' +
        '<button type="button" data-wish="' + p.id + '">Remove</button></div></div></div>';
    }).join("");
  }

  /* ---------- quick view ------------------------------------------------- */
  var modal = $("#modal"), lastFocus = null;
  function view(id) {
    var p = byId(id); if (!p || !modal) return;
    var d = off(p);
    var spec = Object.keys(p.sp || {}).map(function (k) {
      return "<div><dt>" + esc(k) + "</dt><dd>" + esc(p.sp[k]) + "</dd></div>";
    }).join("");
    $("#pv").innerHTML = '<div class="pv"><div class="pv__img">' + art(p.a, p.s) + "</div>" +
      '<div class="pv__i"><p class="pcard__c">' + esc(p.c) + "</p>" +
      '<h2 class="pv__t" id="pvH">' + esc(p.n) + "</h2>" +
      '<p class="pcard__r"><span class="stars" role="img" aria-label="' + p.r + ' out of 5">' + stars(p.r) + "</span>" + p.r.toFixed(1) + " ┬╖ " + p.rv + " reviews</p>" +
      '<p class="pv__p"><b>' + money(p.p) + "</b>" +
        (d > 0 ? "<s>" + money(p.w) + "</s><em>Save " + d + "%</em>" : "") + "</p>" +
      '<p class="pv__d">' + esc(p.d) + "</p>" +
      '<dl class="pv__spec">' + spec + "</dl>" +
      '<ul class="pv__meta">' +
        '<li><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span><strong>Need it today?</strong> Order before 2pm for same-day Nairobi delivery.</span></li>' +
        '<li><svg viewBox="0 0 24 24"><path d="M1 3h11v13H1zM12 8h4l3 3v5h-7z"/><circle cx="6" cy="19" r="2"/><circle cx="17" cy="19" r="2"/></svg><span>Free delivery over KShs 3,000. Next-day nationwide.</span></li>' +
        '<li><svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg><span>Pay with M-Pesa or card. Secure checkout.</span></li>' +
      "</ul>" +
      '<div class="pv__buy"><button class="abtn" type="button" data-add="' + p.id + '">Add to cart</button>' +
        '<button class="abtn abtn--dark" type="button" data-buy="' + p.id + '">Buy now</button>' +
        '<button class="abtn abtn--line" type="button" data-wish="' + p.id + '">Save</button></div>' +
      "</div></div>";
    lastFocus = document.activeElement;
    modal.classList.add("on");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
    var x = $(".modal__x", modal); if (x) x.focus();
  }
  function closeView() {
    if (!modal) return;
    modal.classList.remove("on");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lock");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- panels ----------------------------------------------------- */
  function panel(which) {
    var map = { cart: $("#cart"), wish: $("#wishPanel"), drw: $("#drw") };
    Object.keys(map).forEach(function (k) {
      var el = map[k]; if (!el) return;
      var on = el === which;
      el.classList.toggle("on", on);
      el.setAttribute("aria-hidden", on ? "false" : "true");
    });
    var v1 = $("#veil"), v2 = $("#cVeil");
    if (v1) v1.classList.toggle("on", which === map.drw);
    if (v2) v2.classList.toggle("on", which === map.cart || which === map.wish);
    document.body.classList.toggle("lock", !!which);
    var b = $("#burger");
    if (b) b.setAttribute("aria-expanded", which === map.drw ? "true" : "false");
  }
  function anyOpen() { return !!$(".drw.on") || !!$(".pnl.on"); }

  /* ---------- toasts ----------------------------------------------------- */
  var okIcon = '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>';
  function toast(msg) {
    var h = $("#toasts"); if (!h) return;
    var e = document.createElement("div");
    e.className = "toast";
    e.innerHTML = okIcon + "<span>" + esc(msg) + "</span>";
    h.appendChild(e);
    setTimeout(function () {
      e.className = "toast out";
      setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 240);
    }, 2200);
  }

  /* ---------- search ----------------------------------------------------- */
  function hits(q) {
    q = String(q || "").trim().toLowerCase();
    if (!q) return [];
    var out = [];
    P.forEach(function (p) {
      var n = p.n.toLowerCase(), c = p.c.toLowerCase(), t = p.t.join(" ");
      var sc = n.indexOf(q) > -1 ? 10 : c.indexOf(q) > -1 ? 7 : t.indexOf(q) > -1 ? 5 : p.o.join(" ").indexOf(q) > -1 ? 3 : 0;
      if (sc) out.push({ p: p, s: sc });
    });
    out.sort(function (a, b) { return b.s - a.s; });
    return out.slice(0, 6).map(function (x) { return x.p; });
  }
  function suggest(q) {
    var h = $("#sug"), inp = $("#srch");
    if (!h) return;
    if (!String(q || "").trim()) { h.classList.remove("on"); inp.setAttribute("aria-expanded", "false"); h.innerHTML = ""; return; }
    var low = q.toLowerCase(), g = [];
    var ch = CATS.filter(function (c) { return c.toLowerCase().indexOf(low) > -1; });
    if (ch.length) g.push({ l: "Categories", it: ch.map(function (c) { return { n: c, s: "Category", act: "cat", v: c }; }) });
    var oh = OCCASIONS.filter(function (o) { return o.n.toLowerCase().indexOf(low) > -1; });
    if (oh.length) g.push({ l: "Occasions", it: oh.map(function (o) { return { n: o.n, s: "Occasion", act: "occ", v: o.f }; }) });
    var rh = hits(q);
    if (rh.length) g.push({ l: "Products", it: rh.map(function (p) { return { n: p.n, s: p.c, a: p.a, sk: p.s, pr: p.p, act: "view", v: p.id }; }) });
    h.innerHTML = g.length ? g.map(function (grp) {
      return '<p class="sug__l">' + esc(grp.l) + "</p>" + grp.it.map(function (i) {
        return '<button class="sug__i" type="button" data-sug="' + i.act + '" data-sv="' + esc(i.v) + '">' +
          (i.a ? '<span class="sug__art">' + art(i.a, i.sk) + "</span>" : '<span class="sug__art" style="background:var(--green)"></span>') +
          '<span><span class="sug__n">' + esc(i.n) + '</span><span class="sug__s">' + esc(i.s) + "</span></span>" +
          (i.pr ? '<span class="sug__p">' + money(i.pr) + "</span>" : "") + "</button>";
      }).join("");
    }).join("") : '<p class="sug__none">No matches for ΓÇ£' + esc(q) + 'ΓÇ¥. Try ΓÇ£watchΓÇ¥, ΓÇ£mugΓÇ¥ or ΓÇ£birthdayΓÇ¥.</p>';
    h.classList.add("on");
    inp.setAttribute("aria-expanded", "true");
  }
  function runSearch(q, fromDrawer) {
    S.q = String(q || "").trim();
    var a = $("#srch"), b = $("#drwSrchI");
    if (fromDrawer) { if (a) a.value = S.q; } else if (b) b.value = S.q;
    apply();
    var s = $("#sug"); if (s) s.classList.remove("on");
    var t = $("#shop"); if (t) t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  /* ---------- init ------------------------------------------------------- */
  function init() {
    build();
    buildFeatured();
    drawCart(); drawWish(); syncWish();
    apply();

    var hdr = $("#hdr");
    function onScroll() { if (hdr) hdr.classList.toggle("is-stuck", window.scrollY > 6); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    /* delegated clicks */
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t.closest) return;
      var el;

      if ((el = t.closest("[data-add]"))) { addToCart(el.getAttribute("data-add")); return; }
      if ((el = t.closest("[data-buy]"))) { addToCart(el.getAttribute("data-buy")); panel($("#cart")); drawCart(); return; }
      if ((el = t.closest("[data-view]"))) { e.preventDefault(); view(el.getAttribute("data-view")); return; }
      if ((el = t.closest("[data-wish]"))) { toggleWish(el.getAttribute("data-wish")); return; }
      if ((el = t.closest("[data-inc]"))) {
        var id = el.getAttribute("data-inc"), p = byId(id), l = S.cart.filter(function (x) { return x.id === id; })[0];
        if (p && l && l.qty >= p.st) { toast("Only " + p.st + " left in stock"); return; }
        setQty(id, (l ? l.qty : 0) + 1); return;
      }
      if ((el = t.closest("[data-dec]"))) {
        var id2 = el.getAttribute("data-dec"), l2 = S.cart.filter(function (x) { return x.id === id2; })[0];
        setQty(id2, (l2 ? l2.qty : 1) - 1); return;
      }
      if ((el = t.closest("[data-rm]"))) { drop(el.getAttribute("data-rm")); toast("Removed from cart"); return; }
      if ((el = t.closest("[data-mv]"))) {
        var mid = el.getAttribute("data-mv");
        if (S.wish.indexOf(mid) === -1) S.wish.push(mid);
        saveWish(); drawWish(); syncWish(); drop(mid); toast("Saved for later"); return;
      }
      if (t.closest("[data-xcart]")) { panel(null); setTimeout(function () { location.hash = "shop"; }, 10); return; }
      if (t.closest("[data-xwish]")) { panel(null); return; }
      if (t.closest("[data-x]")) { closeView(); return; }

      if ((el = t.closest("[data-un]"))) {
        toggleF(el.getAttribute("data-un"), el.getAttribute("data-uv"), false);
        syncInputs(); apply(); return;
      }
      if (t.closest("[data-rq]")) { S.q = ""; var si = $("#srch"); if (si) si.value = ""; apply(); return; }

      if ((el = t.closest("[data-pg]"))) {
        if (el.disabled) return;
        S.page = parseInt(el.getAttribute("data-pg"), 10) || 1;
        apply(false);
        var sh = $("#shop"); if (sh) sh.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
        return;
      }

      if ((el = t.closest("[data-cat]"))) {
        var cv = el.getAttribute("data-cat");
        if (!cv) { reset(); apply(); return; }
        var was = S.f.category.indexOf(cv) > -1;
        reset();
        if (!was) S.f.category.push(cv);
        syncInputs(); apply(); return;
      }
      if ((el = t.closest("[data-max]"))) { shortcut(el); return; }
      if ((el = t.closest("[data-rc]"))) { shortcut(el); return; }

      if ((el = t.closest("[data-acc]"))) { el.parentNode.classList.toggle("on"); return; }
      if ((el = t.closest("[data-fg]"))) { el.parentNode.classList.toggle("open"); return; }

      if (t.closest("#toCheckout")) { e.preventDefault(); toast(cartCount() ? "Checkout continues on the live store" : "Your cart is empty"); return; }

      /* mega menu hover + click */
      if ((el = t.closest(".nitem"))) {
        if (!t.closest(".mega") || t.closest(".mega a") || t.closest(".mega button")) {
          var wasOpen = el.classList.contains("on");
          $$(".nitem.on").forEach(function (o) { o.classList.remove("on"); });
          if (!wasOpen) el.classList.add("on");
          return;
        }
      }
      if (!t.closest(".nitem")) $$(".nitem.on").forEach(function (o) { o.classList.remove("on"); });
      if (!t.closest(".srch")) { var s2 = $("#sug"); if (s2) s2.classList.remove("on"); }
    });

    document.addEventListener("change", function (e) {
      var i = e.target.closest && e.target.closest("[data-f]");
      if (!i) return;
      toggleF(i.getAttribute("data-f"), i.value, i.checked);
      apply();
    });

    /* mega menu hover on desktop */
    $$(".nitem").forEach(function (item, idx) {
      var timer;
      on(item, "mouseenter", function () {
        if (window.matchMedia("(max-width: 1023px)").matches) return;
        clearTimeout(timer);
        $$(".nitem.on").forEach(function (o) { if (o !== item) o.classList.remove("on"); });
        item.classList.add("on");
      });
      on(item, "mouseleave", function () { timer = setTimeout(function () { item.classList.remove("on"); }, 160); });
    });

    /* header + panel buttons */
    on($("#cartBtn"), "click", function () { panel($("#cart")); drawCart(); });
    on($("#cartClose"), "click", function () { panel(null); });
    on($("#cVeil"), "click", function () { panel(null); });
    on($("#veil"), "click", function () { panel(null); });
    on($("#drwClose"), "click", function () { panel(null); });
    on($("#burger"), "click", function () { panel($("#drw")); });
    on($("#tabCart"), "click", function () { panel($("#cart")); drawCart(); });
    on($("#tabWish"), "click", function () { panel($("#wishPanel")); drawWish(); });
    on($("#fab"), "click", function () { panel($("#cart")); drawCart(); });
    on($("#wishBtn"), "click", function () { panel($("#wishPanel")); drawWish(); });
    on($("#wishClose"), "click", function () { panel(null); });
    function openFind() { panel($("#drw")); var d = $("#drwSrchI"); if (d) setTimeout(function () { d.focus(); }, 240); }
    on($("#tabFind"), "click", openFind);
    on($("#srchBtn"), "click", openFind);

    /* search */
    var sr = $("#srch");
    on($("#srchForm"), "submit", function (e) { e.preventDefault(); runSearch(sr ? sr.value : ""); });
    on($("#drwSrch"), "submit", function (e) { e.preventDefault(); runSearch($("#drwSrchI") ? $("#drwSrchI").value : "", true); panel(null); });
    on(sr, "input", debounce(function () { suggest(sr.value); }, 140));
    on(sr, "focus", function () { if (sr.value) suggest(sr.value); });
    on(sr, "keydown", function (e) { if (e.key === "Escape") { var s = $("#sug"); if (s) s.classList.remove("on"); sr.blur(); } });
    on($("#drwSrchI"), "input", debounce(function () { if (sr) sr.value = $("#drwSrchI").value; }, 140));

    on($("#sort"), "change", function (e) { S.sort = e.target.value; apply(); });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (modal && modal.classList.contains("on")) { closeView(); return; }
      if (anyOpen()) panel(null);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
