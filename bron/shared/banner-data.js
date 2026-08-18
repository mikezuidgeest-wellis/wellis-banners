/* ============================================================
   GetWellis — Banner content (Dynamic Creative data)
   ------------------------------------------------------------
   Edit ONLY this file to add/remove imagery, headlines, etc.
   New entries are picked up automatically by randomizer.js —
   no code changes required.
   • One image is chosen from `males` AND one from `females`,
     so every impression shows exactly 1 man + 1 woman and can
     never show two photos of the same person.
   • Two DISTINCT headlines are shown (one per slide).
   ============================================================ */
window.BannerData = {

  /* Person pools (filenames inside this banner folder). */
  males: [
    "dude-sport.webp",
    "smiling-dude.webp",
    "dude-calling.webp",
    "man-smiling.webp"
  ],
  females: [
    "woman-confident.webp",
    "woman-talking-with-a-drink.webp",
    "woman-mirror-scale.webp",
    "woman-mirror.webp",
    "woman-stretch.webp",
    "eveline-boxing.webp",
    "woman-smoothy.webp",
    "woman-smiling.webp"
  ],

  /* Gender-neutral branding/packaging shots. These do NOT belong to the
     man/woman rotation; a slide only swaps to a random packaging image when its
     headline is about delivery (see deliveryKeywords). */
  packaging: [
    "delivery.webp",
    "unboxing.webp",
    "unboxing-box.webp"
  ],

  /* A headline counts as "delivery copy" if its lowercased text contains any of
     these substrings → that slide shows packaging instead of a person. */
  deliveryKeywords: [
    "geleverd", "bezorg", "levering", "thuisbezorg", "verzonden",
    "discreet", "aan huis", "voor de deur", "gratis verzend", "gratis bezorg"
  ],

  /* Vertical face-framing per image (CSS object-position).
     Anything not listed falls back to DEFAULT_FOCUS below. */
  focus: {
    "dude-sport.webp":       "center 22%",
    "smiling-dude.webp":     "center 24%",
    "woman-confident.webp":  "center 18%",
    "woman-talking-with-a-drink.webp":      "center 16%",
    "woman-mirror-scale.webp":"center 14%",
    "woman-mirror.webp":     "center 10%",
    "woman-stretch.webp":    "center 16%",
    "dude-calling.webp":     "center 28%",
    "eveline-boxing.webp":   "center 26%",
    "woman-smoothy.webp":    "center 24%",
    "man-smiling.webp":      "center 22%",
    "woman-smiling.webp":    "center 16%",
    "delivery.webp":         "center 45%",
    "unboxing.webp":         "center 52%",
    "unboxing-box.webp":     "center 50%"
  },
  DEFAULT_FOCUS: "center 18%",

  /* Safety fallbacks (used only if a pool is empty). */
  fallbackMale:   "smiling-dude.webp",
  fallbackFemale: "woman-confident.webp",

  /* Headline pool — two distinct lines are shown per impression.
     Keep them interchangeable so any pair reads well together. */
  headlines: [
    "Stop met uitstellen, start met medisch afvallen.",
    "Bereik je doel met medische begeleiding.",
    "Afvallen onder medische begeleiding.",
    "Minder strijd, meer resultaat.",
    "Jouw steun in de rug voor succesvol gewichtsverlies.",
    "Misschien is het tijd voor een andere aanpak.",
    "Pak de regie over je leefstijl terug.",
    "Geen doktersbezoek nodig.",
    "Vertrouwd door 60.000+ tevreden klanten.",
    "Kijk of je in aanmerking komt.",
    "Professionele zorg. Zichtbaar resultaat.",
    "100% online, discreet geleverd.",
    "Slimmer afvallen, blijvend resultaat.",
    "Wetenschappelijk bewezen aanpak."
  ],
  fallbackHeadline: "Start met medisch afvallen.",

  /* Soft-hyphen break points for long Dutch compound words. When a headline
     wraps, these words may split at the marked spot (e.g. "dokters-bezoek")
     instead of jumping awkwardly to the next line. Add words here (lowercase
     base form -> form with \u00AD soft hyphens) to control where they break. */
  hyphenate: {
    "doktersbezoek": "dokters\u00ADbezoek",
    "gewichtsverlies": "gewichts\u00ADverlies"
  },

  /* OPTIONAL — coherent pairing. If both groups are non-empty the
     randomizer takes line 1 from groupA and line 2 from groupB
     instead of two random lines from `headlines`. Leave empty to
     use the flat `headlines` pool. */
  headlineGroupA: [
    "Stop met uitstellen, start met medisch afvallen.",
    "Afvallen onder medische begeleiding.",
    "Jouw steun in de rug voor succesvol gewichtsverlies.",
    "Slimmer afvallen, blijvend resultaat."
  ],
  headlineGroupB: [
    "Bereik je doel met medische begeleiding.",
    "Minder strijd, meer resultaat.",
    "Misschien is het tijd voor een andere aanpak.",
    "Pak de regie over je leefstijl terug.",
    "Geen doktersbezoek nodig.",
    "Vertrouwd door 60.000+ tevreden klanten.",
    "Kijk of je in aanmerking komt.",
    "Professionele zorg. Zichtbaar resultaat.",
    "100% online, discreet geleverd.",
    "Wetenschappelijk bewezen aanpak."
  ]
};

/* ===== VANGNET ===========================================================
   Dit is het EERSTE script dat laadt. Valt randomizer.js of script.js daarna
   weg - een netwerkfout, een blokkade bij de publisher, een adblocker die één
   bestand pakt - dan wordt 'is-loaded' nooit gezet en blijft de hele creatie
   op opacity 0 staan. Gemeten zonder script.js: kop, logo, prijssticker, CTA
   en Trustpilot-balk alle vijf op 0, oftewel een leeg teal vlak.

   Na 2,5 seconde controleren we of de entree gestart is. Zo niet, dan zetten
   we 'is-loaded' zelf. De banner mist dan zijn animatie en zijn rotatie, maar
   hij is wél te zien en te lezen. Dat is het verschil tussen een matige
   impressie en een verspilde.

   Het <noscript>-blok in de snippet dekt het geval dat JavaScript volledig uit
   staat; dit vangnet dekt het geval dat JavaScript wel draait maar een bestand
   ontbreekt. Twee verschillende storingen, twee aparte maatregelen. */
(function () {
  "use strict";
  setTimeout(function () {
    var roots = document.querySelectorAll(".ad-container");
    for (var i = 0; i < roots.length; i++) {
      if (!roots[i].classList.contains("is-loaded")) {
        roots[i].classList.add("is-loaded");
        console.warn("[GetWellis] entree niet gestart binnen 2,5s - vangnet zet is-loaded");
      }
    }
  }, 2500);
})();
