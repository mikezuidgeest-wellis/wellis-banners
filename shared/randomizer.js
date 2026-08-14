/* ============================================================
   GetWellis — Client-side randomization engine (DCO-style)
   ------------------------------------------------------------
   Runs once per banner load. Picks 1 male + 1 female image and
   2 distinct headlines via a fair Fisher-Yates shuffle, then
   lazily assigns ONLY the chosen assets (no wasted downloads).
   Pure vanilla ES6, no dependencies, no timers/listeners left
   behind. Fails safe with fallbacks + a console warning.

   Expected DOM hooks (set by the banner markup):
     <img id="personA">   ← male slot   (slide 1)
     <img id="personB">   ← female slot (slide 2)
     <div id="headlineA" data-maxh="NN"> ← headline slide 1
     <div id="headlineB" data-maxh="NN"> ← headline slide 2
   ============================================================ */
(function () {
  "use strict";

  /* Fair, unbiased shuffle. */
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pick(arr, n) { return shuffle(arr || []).slice(0, n); }

  /* Asset-base: in een embedded/Awin-context staat de banner-HTML op het
     domein van de PUBLISHER, niet op onze CDN. Relatieve bestandsnamen uit
     banner-data.js zouden dan 404'en. De host-pagina zet daarom
     window.WELLIS_ASSET_BASE naar de absolute CDN-map.
     Leeg gelaten (standalone/preview) -> gedrag blijft exact relatief.
     Bewust GEEN <base href>: dat zou ook alle links van de publisher-pagina
     herschrijven en is dus onveilig in een geinjecteerde omgeving. */
  function assetURL(file) {
    if (!file) return file;
    if (/^(?:[a-z]+:)?\/\//i.test(file) || file.charAt(0) === "/") return file;
    var base = window.WELLIS_ASSET_BASE || "";
    if (base && base.charAt(base.length - 1) !== "/") base += "/";
    return base + file;
  }

  /* Lazy image assignment — src is set ONLY after selection, so the
     browser downloads exactly one male + one female photo. */
  function setPhoto(el, file, focus, fallback) {
    if (!el) return;
    var chosen = file || fallback;
    if (!file) console.warn("[GetWellis] image pool empty — using fallback:", fallback);
    if (focus) el.style.objectPosition = focus;
    if (chosen) el.src = assetURL(chosen);
  }

  /* Shrink-to-fit so any headline length stays inside its box. */
  function fitHeadline(el) {
    if (!el) return;
    el.style.fontSize = "";                 // revert to stylesheet size first
    var maxH = parseFloat(el.getAttribute("data-maxh")) || el.clientHeight || 9999;
    var fs = parseFloat(getComputedStyle(el).fontSize) || 16;
    var guard = 80;
    // Shrink until the text fits its box in BOTH height and width.
    while ((el.scrollHeight > maxH + 0.5 || el.scrollWidth > el.clientWidth + 0.5) && fs > 7 && guard-- > 0) {
      fs -= 0.5;
      el.style.fontSize = fs + "px";
    }
  }

  /* Insert soft hyphens into known long compound words (BannerData.hyphenate)
     so they can break nicely, e.g. "doktersbezoek" -> "dokters\u00ADbezoek". */
  function applyHyphens(text, dict) {
    if (!dict) return String(text);
    return String(text).replace(/[A-Za-z\u00C0-\u017F]+/g, function (w) {
      var rep = dict[w.toLowerCase()];
      if (!rep) return w;
      if (w.charAt(0) === w.charAt(0).toUpperCase()) rep = rep.charAt(0).toUpperCase() + rep.slice(1);
      return rep;
    });
  }

  /* Split the rendered text into visual lines (grouped by vertical position). */
  function visualLines(el) {
    var tn = el.firstChild;
    if (!tn || tn.nodeType !== 3) return [el.textContent];
    var text = tn.textContent, range = document.createRange(), rows = {};
    for (var i = 0; i < text.length; i++) {
      range.setStart(tn, i); range.setEnd(tn, i + 1);
      var r = range.getBoundingClientRect();
      if (!r.width && !r.height) continue;            // skip zero-width (soft hyphen)
      var key = Math.round(r.top);
      (rows[key] = rows[key] || []).push(text[i]);
    }
    return Object.keys(rows).sort(function (a, b) { return a - b; })
                 .map(function (k) { return rows[k].join(""); });
  }
  function wordCount(s) {
    return ((s || "").replace(/\u00AD/g, "").trim().match(/\S+/g) || []).length;
  }

  /* Place a headline: hyphenate + shrink-to-fit, then — ONLY when it lands on
     exactly TWO lines — guarantee at least two words on the last line by binding
     the final two words together. One-line and 3+-line cases are left untouched. */
  function setHeadline(el, raw, D) {
    if (!el) return;
    el._raw = raw;
    var text = applyHyphens(raw, D.hyphenate);
    el.textContent = text;
    fitHeadline(el);
    var lines = visualLines(el);
    if (lines.length === 2 && wordCount(lines[1]) < 2) {
      var sp = text.lastIndexOf(" ");
      if (sp > 0) {
        el.textContent = text.slice(0, sp) + "\u00A0" + text.slice(sp + 1);
        fitHeadline(el);
        var nl = visualLines(el);
        if (!(nl.length === 2 && wordCount(nl[1]) >= 2)) {   // nbsp didn't help cleanly
          el.textContent = text; fitHeadline(el);            // -> revert
        }
      }
    }
  }

  /* Per-banner exclusions: a banner may opt out of specific headlines that
     don't sit well at its size (e.g. a long word that can't break). Set
     data-skip-headlines="Zin een|Zin twee" on #ad-container. */
  function readSkip(ROOT) {
    var el = ROOT;
    var raw = el && el.getAttribute("data-skip-headlines");
    return raw ? raw.split("|").map(function (s) { return s.trim(); }).filter(Boolean) : [];
  }

  function chooseHeadlines(D, ROOT) {
    var skip = readSkip(ROOT);
    var keep = function (h) { return skip.indexOf(h) < 0; };
    var a = (D.headlineGroupA || []).filter(keep), b = (D.headlineGroupB || []).filter(keep);
    if (a.length && b.length) return [pick(a, 1)[0], pick(b, 1)[0]];
    var two = pick((D.headlines || []).filter(keep), 2);   // two DISTINCT, allowed lines
    while (two.length < 2) two.push(D.fallbackHeadline || "");
    return two;
  }

  /* A headline is "delivery copy" if its lowercased text contains a keyword. */
  function isDelivery(text, kws) {
    if (!kws || !kws.length) return false;
    var t = String(text || "").toLowerCase();
    for (var i = 0; i < kws.length; i++) { if (t.indexOf(kws[i]) >= 0) return true; }
    return false;
  }

  /* Per bannerroot uitgevoerd. Was document-breed, waardoor bij twee banners
     op een pagina alleen de EERSTE een foto en kop kreeg (de tweede bleef leeg). */
  function runOne(ROOT) {
    var D = window.BannerData || {};
    var focus = D.focus || {};
    var foc = function (f) { return focus[f] || D.DEFAULT_FOCUS; };

    /* Headlines first: we need them to know which slide carries delivery copy. */
    var h = chooseHeadlines(D, ROOT);
    var hA = ROOT.querySelector("#headlineA");
    var hB = ROOT.querySelector("#headlineB");
    setHeadline(hA, h[0] || D.fallbackHeadline, D);
    setHeadline(hB, h[1] || D.fallbackHeadline, D);

    /* Always one man + one woman (rules 1-3), random slide ORDER. */
    var male = pick(D.males, 1)[0];
    var female = pick(D.females, 1)[0];
    var manFirst = Math.random() < 0.5;
    var personA = manFirst ? male : female;
    var personB = manFirst ? female : male;
    var fbA     = manFirst ? D.fallbackMale : D.fallbackFemale;
    var fbB     = manFirst ? D.fallbackFemale : D.fallbackMale;

    /* Contextual packaging (separate mechanism): when a slide's headline is
       delivery copy, that slide shows a RANDOM gender-neutral packaging image
       instead of the person. Never replace BOTH slides — keep ≥1 person.
       Still exactly two images are assigned/loaded (lazy). */
    var pack = D.packaging || [], kws = D.deliveryKeywords;
    var aDeliv = pack.length && isDelivery(h[0], kws);
    var bDeliv = pack.length && isDelivery(h[1], kws);
    if (aDeliv && bDeliv) bDeliv = false;
    var pk = pack.length ? shuffle(pack) : [];
    var PKG_ALT = "Wellis pakket – discreet bezorgd";
    function putPerson(id, file, fb) { setPhoto(ROOT.querySelector("#" + id), file, foc(file), fb); }
    function putPackaging(id, file) {
      var el = ROOT.querySelector("#" + id);
      setPhoto(el, file, foc(file), file);
      if (el) el.alt = PKG_ALT;
    }
    if (aDeliv) putPackaging("personA", pk[0]); else putPerson("personA", personA, fbA);
    if (bDeliv) putPackaging("personB", pk[aDeliv ? 1 : 0]); else putPerson("personB", personB, fbB);

    // Web-font loads asynchronously (font-display:swap); re-layout once the
    // real Gordita metrics are in so hyphenation/widow logic uses true widths.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (hA && hA._raw != null) setHeadline(hA, hA._raw, D);
        if (hB && hB._raw != null) setHeadline(hB, hB._raw, D);
      });
    }
  }

  function run() {
    var roots = document.querySelectorAll(".ad-container");
    for (var i = 0; i < roots.length; i++) {
      if (roots[i].getAttribute("data-gw-dco") === "1") continue;   // niet twee keer vullen
      roots[i].setAttribute("data-gw-dco", "1");
      runOne(roots[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
