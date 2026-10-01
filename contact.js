/* =========================================================
   ZED Gift Shop — contact page FAQs + corporate quote form
   ========================================================= */
(function () {
  "use strict";
  var Z = window.ZED;
  if (!Z) return;
  var $ = Z.$, esc = Z.esc;

  var FAQ = [
    { q: "How fast do you deliver in Nairobi?",
      a: "Order before 2pm and we deliver the same day within Nairobi. After 2pm, delivery is next day. Orders to the rest of Kenya arrive in 1–2 working days to any of the 47 counties." },
    { q: "What does delivery cost?",
      a: "Nairobi next day is KShs 250 and free on orders over KShs 3,000. Same-day Nairobi is KShs 450. Nationwide delivery is KShs 350. Store pickup is free and ready in about two hours." },
    { q: "Which payment methods do you accept?",
      a: "M-Pesa, Visa, Mastercard, American Express, bank transfer and cash on delivery. For bank transfers we send account details and confirm once the transfer clears." },
    { q: "Can you personalise a gift?",
      a: "Yes — engraving, photo printing, logo branding and handwritten cards. Add your personalization at checkout and note it in the delivery instructions. Personalized items need one extra production day." },
    { q: "Do you do corporate and bulk gifting?",
      a: "Yes. We handle branded welcome kits from 10 units, engraved trophies and awards, and client hampers. Use the quote form above and we will come back within one business day." },
    { q: "Can I change or cancel my order?",
      a: "Yes, as long as it has not been packed. Call us on 0711 436 169 or WhatsApp us with your order number." },
    { q: "What is your returns policy?",
      a: "Tell us within 7 days of delivery if something arrived damaged, incorrect or late, and we will replace it or refund you in full. Personalized items can only be returned if faulty." },
    { q: "How do I track my order?",
      a: "Use the Track Order page with your order number and the phone or email you used at checkout. You will see each stage, the courier name and the tracking number once it is dispatched." }
  ];

  $("#faqList").innerHTML = FAQ.map(function (f, i) {
    return '<div class="acc">' +
      '<button class="acc__t" type="button" data-acc aria-expanded="false" aria-controls="faq' + i + '">' +
        "<span>" + esc(f.q) + "</span>" +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>' +
      '<div class="acc__p" id="faq' + i + '"><div class="acc__i"><p style="font-size:14.5px;color:var(--body);line-height:1.7">' +
        esc(f.a) + "</p></div></div></div>";
  }).join("");

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-acc]");
    if (!b) return;
    var open = b.closest(".acc").classList.toggle("open");
    b.setAttribute("aria-expanded", open ? "true" : "false");
  });

  if (location.hash === "#faq") {
    setTimeout(function () {
      var f = $("#faq");
      if (f) f.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  Z.on($("#corpForm"), "submit", function (e) {
    e.preventDefault();
    var name = $("#cName").value.trim();
    var email = $("#cEmail").value.trim();
    var brief = $("#cBrief").value.trim();
    if (name.length < 2) { Z.toast("Enter your name.", "error"); $("#cName").focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { Z.toast("Enter a valid work email.", "error"); $("#cEmail").focus(); return; }
    if (brief.length < 10) { Z.toast("Tell us a little more about what you need.", "error"); $("#cBrief").focus(); return; }
    Z.notify("Quote request received",
      "Thanks " + name + " — we'll reply to " + email + " within one business day.");
    Z.toast("Request sent — we'll reply within one business day.");
    $("#cName").value = ""; $("#cEmail").value = ""; $("#cBrief").value = "";
  });

  if (location.hash === "#corporate") {
    setTimeout(function () {
      var c = $("#corporate");
      if (c) c.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  }
})();