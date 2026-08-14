/* ============================================================
   GetWellis — NL/DE i18n runtime (banners + social templates)
   ------------------------------------------------------------
   Nederlands (nl) = standaard en 100% de goedgekeurde referentie:
   bij lang=nl gebeurt er NIETS aan de bestaande creatie.
   Taal via ?lang=de op de URL (preview-toggle) of window.LANG.
   Bij 'de': headlines in window.BannerData + statische UI-tekst -> Duits.

   Duitse teksten vertaald door een senior Duitse copywriter (native) en
   gecontroleerd door een tweetalige NL/DE-reviewer (Duden-spelling/grammatica
   + tone-of-voice-check). Zie PROJECT_MEMORY changelog.

   Laden NA banner-data.js en VÓÓR randomizer.js.
   ============================================================ */
(function () {
  "use strict";

  /* Duitse marktprijs (alleen DE; NL blijft 149 / 179) */
  var DE_PRICE = "172";

  /* Dutch headline -> verified German */
  var HEAD = {
    "Stop met uitstellen, start met medisch afvallen.": "Schluss mit Aufschieben – jetzt medizinisch abnehmen.",
    "Bereik je doel met medische begeleiding.":          "Erreiche dein Ziel – mit medizinischer Begleitung.",
    "Afvallen onder medische begeleiding.":              "Abnehmen mit medizinischer Begleitung.",
    "Minder strijd, meer resultaat.":                    "Weniger Kampf, mehr Erfolg.",
    "Jouw steun in de rug voor succesvol gewichtsverlies.": "Dein Rückenwind für erfolgreiches Abnehmen.",
    "Misschien is het tijd voor een andere aanpak.":     "Vielleicht ist es Zeit für einen anderen Ansatz.",
    "Pak de regie over je leefstijl terug.":             "Übernimm wieder die Kontrolle über deinen Lebensstil.",
    "Geen doktersbezoek nodig.":                         "Kein Arztbesuch vor Ort nötig.",
    "Vertrouwd door 60.000+ tevreden klanten.":          "Über 60.000 zufriedene Kunden vertrauen uns.",
    "Kijk of je in aanmerking komt.":                    "Prüfe, ob du infrage kommst.",
    "Professionele zorg. Zichtbaar resultaat.":          "Professionelle Betreuung. Auf dem Weg zu deinen Zielen.",
    "100% online, discreet geleverd.":                   "100 % online, diskret geliefert.",
    "Slimmer afvallen, blijvend resultaat.":             "Klüger abnehmen, nachhaltig verändern.",
    "Wetenschappelijk bewezen aanpak.":                  "Wissenschaftlich belegter Ansatz.",
    "Jouw gezondheid, onze zorg.":                       "Deine Gesundheit, unser Anliegen.",
    "Stop met uitstellen, begin vandaag.":               "Schluss mit Aufschieben – starte heute.",
    "Jouw steun in de rug bij het afvallen.":            "Dein Rückenwind beim Abnehmen.",
    "Tijd voor een andere aanpak.":                      "Zeit für einen anderen Ansatz.",
    "Start met medisch afvallen.":                       "Jetzt medizinisch abnehmen.",
    "Discreet thuisbezorgd aan huis.":                   "Diskret nach Hause geliefert.",
    "Gratis en discreet geleverd.":                      "Kostenlos und diskret geliefert."
  };

  /* Dutch UI label -> verified German */
  var UI = {
    "Start met afvallen":     "Jetzt abnehmen",
    "Kom ik in aanmerking?":  "Komme ich infrage?",
    "Meer weten?":            "Mehr erfahren",
    "Start vandaag":          "Heute starten",
    "vanaf":                  "ab",
    "maand":                  "Monat",
    "Gewichtsverlies":        "Gewichtsabnahme",
    "Bekijk de aanbieding.":  "Angebot ansehen."
  };

  /* German soft-hyphens for the longest compounds (clear, correct break points) */
  var HYPHENATE_DE = {
    "lebensstil":       "lebens­stil",
    "gewichtsabnahme":  "gewichts­abnahme",
    "arztbesuch":       "arzt­besuch",
    "aufschieben":      "auf­schieben"
  };

  /* German delivery keywords so the packaging mechanism still triggers on the
     German delivery headline ("100 % online, diskret geliefert."). */
  var DELIVERY_DE = ["geliefert", "lieferung", "diskret", "versand", "nach hause", "zustellung", "zugestellt"];

  /* Kortere DE-displayvarianten voor titels die anders >2 regels worden op smalle/
     vierkante formaten. De randomizer schakelt hier automatisch naar over als de
     volledige titel >2 regels rendert (breedte <=1100px; de brede 1200x628 link-ad
     is uitgezonderd). De voice-over/gesproken tekst blijft altijd de volledige zin. */
  var SHORT_DE = {
    "Übernimm wieder die Kontrolle über deinen Lebensstil.": "Übernimm wieder die Regie.",
    "Professionelle Betreuung. Auf dem Weg zu deinen Zielen.": "Auf dem Weg zu deinen Zielen."
  };

  function getLang() {
    try { var p = new URLSearchParams(location.search); if (p.get("lang")) return p.get("lang"); } catch (e) {}
    return window.LANG || "nl";
  }
  if (getLang() !== "de") return;   // nl (default) -> geen wijziging
  window.SHORT_HEAD_DE = SHORT_DE;  // beschikbaar voor de randomizer (2-regel-cap)

  /* 1) headlines in BannerData (vóór de randomizer ze leest) */
  var D = window.BannerData;
  if (D) {
    ["headlines", "headlineGroupA", "headlineGroupB"].forEach(function (k) {
      if (Array.isArray(D[k])) D[k] = D[k].map(function (s) { return HEAD[s] || s; });
    });
    if (D.fallbackHeadline) D.fallbackHeadline = HEAD[D.fallbackHeadline] || D.fallbackHeadline;
    D.hyphenate = HYPHENATE_DE;
    if (Array.isArray(D.deliveryKeywords)) D.deliveryKeywords = DELIVERY_DE;
  }

  /* 2) statische UI-teksten in de DOM */
  function setIf(el) { if (!el) return; var t = (el.textContent || "").trim(); if (UI[t]) el.textContent = UI[t]; }
  function applyDOM() {
    document.documentElement.setAttribute("lang", "de");
    setIf(document.querySelector(".cta-label"));
    setIf(document.querySelector(".brand-sub"));
    var subs = document.querySelectorAll(".price-sub");
    for (var i = 0; i < subs.length; i++) setIf(subs[i]);   // "vanaf" + "maand"

    // Duitse prijsnotatie: bedrag + spatie + euroteken ("€149" -> "149 €"). NL blijft "€149".
    var pm = document.querySelector(".price-main");
    if (pm) {
      // Duitse MARKTPRIJS: vast 172 € (de NL-sets tonen 149 / 179 en blijven ongemoeid).
      // Bewust geen overname van het NL-bedrag meer: DE is een eigen prijspunt.
      pm.textContent = DE_PRICE + " €";   // smalle vaste spatie (U+202F, DIN/Duden) houdt bedrag + € bij elkaar
    }

    // Trustpilot (DE), robuust over alle markup-varianten:
    //  - score "4.7"->"4,7" OVERAL (kan buiten .tp-reviews staan, bv. .tp-rating in 160x600)
    //  - "Gebaseerd op"->"Basierend auf" (160x600-copy) ; "van"->"basierend auf" (4,7/5-copy) ;
    //    "reviews"->"Bewertungen". "basierend auf" is de native-correcte term (niet "aus").
    //  - daarna shrink-to-fit t.o.v. #ad-container: Duits is langer -> voorkom overflow
    //    op smalle skyscrapers (160x600/120x600). Counter-span (het getal) blijft ongemoeid.
    // Trustpilot (DE): score->4,7 overal. Tekst via LENGTE-VARIANTEN i.p.v. verkleinen; ALTIJD
    // afgesloten met een punt. Kies per formaat de LANGSTE variant die past (ruime marge, 1 regel) op
    // de ONTWERP-grootte. Past zelfs de korte variant niet op 1 regel -> wrap (max 2 regels); pas in
    // laatste instantie licht verkleinen (alleen tiny skyscrapers). #tp-counter blijft HETZELFDE element
    // (teller-animatie blijft werken).
    var scores = document.querySelectorAll(".tp-score");
    for (var s = 0; s < scores.length; s++) scores[s].textContent = "4,7";
    var tp = document.querySelector(".tp-reviews");
    var adc = document.getElementById("ad-container");
    var counter = document.getElementById("tp-counter");
    if (tp && adc && counter) {
      var scoreSpan = tp.querySelector(".tp-score");   // null als de score buiten .tp-reviews staat (bv. 160x600)
      var tpMask = document.querySelector(".tp-stars-mask");
      var designFs = parseFloat(getComputedStyle(tp).fontSize) || 12;
      // Volgorde = langste→kortste; kies de langste die past. Prioriteit: houd de SCORE (4,7/5) — die is
      // sterker social proof dan het verbindingswoord. Daarom staat de compacte score-vorm ("4,7/5 · N+
      // Bewertungen.") vóór de score-loze "Basierend auf …"-vorm, zodat smalle formaten de score behouden
      // i.p.v. hem te laten vallen (matcht de NL-referentie).
      var VARIANTS = [
        { score: !!scoreSpan, lead: (scoreSpan ? "/5 basierend auf " : "Basierend auf "), trail: "+ Bewertungen." }
      ];
      if (scoreSpan) VARIANTS.push({ score: true, lead: "/5 · ", trail: "+ Bewertungen." });   // compact, mét score
      VARIANTS.push({ score: false, lead: "Basierend auf ", trail: "+ Bewertungen." });
      VARIANTS.push({ score: false, lead: "", trail: "+ Bewertungen." });
      var build = function (v) {
        tp.textContent = "";
        if (v.score && scoreSpan) tp.appendChild(scoreSpan);
        if (v.lead) tp.appendChild(document.createTextNode(v.lead));
        tp.appendChild(counter);                       // ZELFDE element -> teller blijft animeren
        tp.appendChild(document.createTextNode(v.trail));
      };
      var nLines = function () { var cs = getComputedStyle(tp), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2; return Math.round(tp.scrollHeight / lh); };
      var fits = function (maxLines) {
        // Meet de CONTENT-grenzen via een Range (niet het element-vak): bij smalle skyscrapers is
        // .tp-reviews een blok met vaste breedte; `getBoundingClientRect()` geeft dan de BOX-rand en niet
        // de werkelijke tekst-rand -> een overlopende (nowrap) variant lijkt te "passen" en wordt afgekapt.
        // Een Range over de inhoud geeft wél de echte tekstbreedte (ook bij overflow).
        var rng = document.createRange(); rng.selectNodeContents(tp);
        var r = rng.getBoundingClientRect();
        // Leesbare breedte = de WITTE achtergrond. Ligt de Trustpilot op een (smaller) kaart, dan is de
        // kaart de grens (de tekst is teal en zou onzichtbaar op de teal achtergrond ernaast vallen/afsnijden).
        var bnd = adc, card = document.querySelector(".card");
        if (card) { var cr = card.getBoundingClientRect(); if (r.top < cr.bottom && r.bottom > cr.top) bnd = card; }
        var ar = bnd.getBoundingClientRect();
        var pad = Math.max(6, ar.width * 0.012);       // duidelijke marge t.o.v. de rand
        // Verticale check tegen de HOOGTE van de eigen balk (layout-waarde), niet tegen de absolute
        // onderkant van #ad-container: tijdens de entree staat de balk nog op translateY(8px), waardoor
        // een bottom-vergelijking op schermcoördinaten faalt en ELKE variant werd afgekeurd -> de tekst
        // begon kort en sprong later alsnog om. clientHeight is transform-onafhankelijk en dus stabiel.
        var tcEl = (tp.closest && tp.closest(".trust-container")) || tp.parentNode;
        var vFits = !tcEl || tp.scrollHeight <= tcEl.clientHeight + 0.5;
        return r.right <= ar.right - pad && r.left >= ar.left + pad && vFits && nLines() <= maxLines;
      };
      var plateauTxt = counter.textContent;            // eindwaarde uit de markup (bv. "2.574") = breedste stand
      var fitTrust = function () {
        var mw = tpMask ? tpMask.style.width : null;
        if (tpMask) tpMask.style.width = "auto";       // meet tegen de volle sterren-breedte
        // Meet altijd tegen de EINDWAARDE van de teller: tijdens de oploop (2.570→2.574) verschilt de
        // cijferbreedte, waardoor de variantkeuze anders kon uitvallen per meetmoment (= zichtbaar
        // verspringen). Met de plateau-waarde is de keuze stabiel én nooit te krap bij de eindstand.
        var liveTxt = counter.textContent;
        counter.textContent = plateauTxt;
        tp.style.fontSize = ""; tp.style.whiteSpace = "nowrap"; tp.style.lineHeight = "";
        // Ligt de Trustpilot op een smallere witte kaart (bv. 1920)? Dan een strakkere gap tussen
        // sterren en tekst, zodat de cluster cohesief en netjes gecentreerd op de kaart staat.
        var _card = document.querySelector(".card"), _tr = tp.getBoundingClientRect();
        var _cc = _card && _tr.top < _card.getBoundingClientRect().bottom && _tr.bottom > _card.getBoundingClientRect().top
                  && _card.getBoundingClientRect().width < adc.getBoundingClientRect().width - 20;
        tp.style.marginLeft = _cc ? "24px" : "";
        var done = false;
        for (var vi = 0; vi < VARIANTS.length && !done; vi++) { build(VARIANTS[vi]); if (fits(1)) done = true; }
        if (!done) {                                   // niets past op 1 regel -> wrappen (meerdere regels)
          tp.style.whiteSpace = "normal"; tp.style.lineHeight = "1.15";
          // Ultra-smal (bv. 120x600) waar de score IN .tp-reviews staat: houd de score gestapeld op
          // MAX 2 regels ("4,7/5" boven "N+ Bewertungen.", zoals de NL-referentie), desnoods iets kleiner
          // — 3 regels zou de sterren eronder van het canvas duwen. Lukt 2 regels niet -> val terug op de
          // kale telling (die past mét sterren).
          if (scoreSpan) {
            tp.textContent = "";
            tp.appendChild(scoreSpan);
            tp.appendChild(document.createTextNode("/5"));
            tp.appendChild(document.createElement("br"));
            tp.appendChild(counter);
            tp.appendChild(document.createTextNode("+ Bewertungen."));
            if (!fits(2)) {
              var fzs = designFs;
              for (var gs = 40; gs > 0 && !fits(2); gs--) { fzs -= 0.5; if (fzs < designFs * 0.7) break; tp.style.fontSize = fzs + "px"; }
            }
            if (fits(2)) done = true; else tp.style.fontSize = "";   // niet gelukt -> reset, val terug
          }
          if (!done) {                                 // anders: korte variant + wrap (max 2 regels)
            build(VARIANTS[VARIANTS.length - 1]); tp.style.whiteSpace = "normal"; tp.style.lineHeight = "1.15";
            if (!fits(2)) {                            // laatste redmiddel: licht verkleinen (>=70% ontwerp)
              var fz = designFs;
              for (var g = 40; g > 0 && !fits(2); g--) { fz -= 0.5; if (fz < designFs * 0.7) { break; } tp.style.fontSize = fz + "px"; }
            }
          }
        }
        counter.textContent = liveTxt;                 // teller terug naar de lopende waarde
        if (tpMask) tpMask.style.width = mw;           // herstel -> CSS-animatie neemt over
      };
      // De variantkeuze moet DEFINITIEF zijn vóórdat de Trustpilot-balk in beeld komt (entree start
      // ~0,9s, volledig zichtbaar ~1,4s). De eerste meting gebeurt nog met de fallback-letter
      // (font-display:swap) en kan daardoor een kortere variant kiezen; zonder vroege her-meting
      // wisselt de tekst zichtbaar om. Daarom: her-fit rond de font-swap én ruim vóór 0,9s.
      fitTrust();
      if (document.fonts) {
        if (document.fonts.ready) document.fonts.ready.then(fitTrust);
        try { document.fonts.load("400 " + designFs + "px Gordita").then(fitTrust, function () {}); } catch (e) {}
      }
      var reflow = [120, 300, 550, 800, 1600];         // idempotent; laatste = safety-net
      for (var q = 0; q < reflow.length; q++) setTimeout(fitTrust, reflow[q]);
    }
    // aria-label vertalen op bekende fragmenten
    var ad = document.getElementById("ad-container");
    if (ad && ad.getAttribute("aria-label")) {
      var a = ad.getAttribute("aria-label");
      Object.keys(HEAD).forEach(function (nl) { a = a.split(nl).join(HEAD[nl]); });
      Object.keys(UI).forEach(function (nl) { a = a.split(nl).join(UI[nl]); });
      ad.setAttribute("aria-label", a);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyDOM, { once: true });
  else applyDOM();
})();
