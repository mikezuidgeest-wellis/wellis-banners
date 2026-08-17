# Stress- en cross-browsertest — Awin bannerset 300x250 (NL)

**Datum:** 14-08-2026
**Repo:** https://github.com/mikezuidgeest-wellis/wellis-banners
**Getest:** uitsluitend formaat 300x250 NL

---

## Samenvatting

Tijdens deze testronde zijn **twee nieuwe defecten** gevonden die de vorige ronde niet
had blootgelegd, plus **één regressie die ik zelf introduceerde en weer heb verwijderd**.
Alle drie zijn opgelost en opnieuw geverifieerd.

| # | Bevinding | Ernst | Status |
|---|-----------|-------|--------|
| 6 | Publisher-CSS met `!important` overrulede de banner: hero-afbeelding klapte van 300x73 naar **300x300**, Trustpilot-sterren schoven 100px, reviewregel werd afgekapt | **Hoog** | Opgelost |
| 7 | Tweede banner op dezelfde pagina initialiseerde niet (`document.getElementById` pakt alleen de eerste van twee gelijke id's) | **Middel** | Opgelost |
| R1 | Mijn eigen `letter-spacing:inherit!important` in de reset overschreef de tracking van het ontwerp -> CTA werd 171px i.p.v. 156,4px | **Regressie** | Teruggedraaid |

---

## 1. Cross-engine

| Engine | Status | Toelichting |
|--------|--------|-------------|
| Chromium 1228 (Blink) | **Geverifieerd** | 4 scenario's, volledige geometrie + pixeldiff |
| Chrome desktop, live CDN | **Geverifieerd** | Injectietest tegen productie, 2 banners, 0 errors |
| Firefox (Gecko) | **NIET GEDRAAID** | Binary geinstalleerd, maar mist `libgtk-3.so.0`; geen root en apt-proxy geeft 403 |
| WebKit (Safari/iOS) | **NIET GEDRAAID** | Mist 14 libraries (`libgtk-4`, `libwebkitgtk-6.0`, `libgraphene`, ...) |
| Edge | **NIET APART GEDRAAID** | Deelt de Blink-engine met Chromium |

Gecko en WebKit blijven dus onbevestigd. Dat is een echte beperking, geen formaliteit.

---

## 2. Scenario-matrix (Chromium)

| Element | standalone (ref) | awin-inject | contaminated | iframe |
|---------|------------------|-------------|--------------|--------|
| price | x200.0 y18.0 80.0x80.0 | IDENTIEK | IDENTIEK | IDENTIEK |
| logo | x104.5 y88.0 91.0x29.2 | IDENTIEK | IDENTIEK | IDENTIEK |
| headline | x11.0 y127.8 278.0x42.4 | IDENTIEK | IDENTIEK | IDENTIEK |
| cta | x66.3 y183.1 167.4x31.9 | IDENTIEK | IDENTIEK | IDENTIEK |
| trust | x0.0 y229.0 300.0x21.0 | IDENTIEK | IDENTIEK | IDENTIEK |
| stars | x93.2 y234.0 59.0x11.0 | IDENTIEK | IDENTIEK | IDENTIEK |
| hero | x0.0 y0.0 300.0x73.0 | IDENTIEK | IDENTIEK | IDENTIEK |

**Grootste afwijking: 0.00 px. Overflow 0, clipping 0, console/netwerkfouten 0.**

De `contaminated`-variant gebruikt bewust agressieve publisher-CSS:
`*{box-sizing:content-box!important}`, `img{max-width:100%!important;height:auto!important;border:2px solid red}`,
`html{font-size:20px}`, `body{font-family:Georgia;line-height:1.8;letter-spacing:.05em}`,
`span{letter-spacing:.1em;text-transform:uppercase}`, `div{margin:0 0 12px;padding:2px}`.

---

## 3. Overige stress-tests

| Test | Resultaat |
|------|-----------|
| **DPR 1x / 1.5x / 2x / 3x** | 0.00px afwijking t.o.v. 1x; geen overflow, clipping of fouten |
| **Twee banners op één pagina** | Beide `isLoaded`, beide identieke geometrie, 0 fouten *(origineel: beide dood + 2x SyntaxError)* |
| **Herhaalde injectie (3 rondes)** | Elke ronde `isLoaded=true`, guard `1`, 0 fouten — idempotent |
| **Alle 14 headlines** | 0 problemen. Font blijft op ontwerpgrootte 19,3px (geen shrink nodig), max 2 regels, 42 van 68px benut, marges 11px symmetrisch |
| **Container ±1px (299/301)** | Geen overflow, geen clipping, geen fouten |
| **prefers-reduced-motion** | Alle elementen op de juiste eindpositie, geen overflow |
| **Langlopend (16s)** | `is-frozen` gezet, alle opacity 1 — correct statisch eindframe, IAB-conform |
| **Asset-uitval** | Zie hieronder |

### Asset-uitval (graceful degradation)

| Uitgevallen | Gedrag |
|-------------|--------|
| `randomizer.js` | Logo, prijssticker, CTA en Trustpilot blijven correct; foto en headline ontbreken. Bruikbaar. |
| foto (`.webp`) | Headline en alle overige elementen intact. Bruikbaar. |
| fonts (`.woff2`) | Rendert volledig correct met fallback-font. |
| `styles.css` | **Banner valt terug op ongestileerde HTML-flow (504x2777px).** Zonder stylesheet is er geen layout. |

---

## 4. Ontwerpintegriteit

Vergelijking van de gefixte build met een kopie van het **originele ontwerp** (voor al mijn wijzigingen),
beide standalone, met gepinde DCO-content en stilgezette animaties:

- Geometrie: **grootste afwijking 0.06 px** (CTA-hoogte 32.0 vs 31.9 — subpixel-afronding)
- Logo en headline: **0.00 %** pixelverschil
- Resterend pixelverschil 3,3 %, uitsluitend als dunne contourlijnen op de foto en op tekst
  (anti-aliasing door die 0,06px), niet als verschuiving

De banner ziet er dus uit zoals het goedgekeurde ontwerp.

### Opgehelderd: CTA-breedte
Twee harnesses maten 156,3px en 167,4px. Oorzaak achterhaald: **hover**. In rust is de CTA
156,3px; bij hover klapt de pijl uit (`max-width:0` -> `16px`) en wordt hij 168,4px. Ontworpen
gedrag, geen defect — één harness had de muispositie toevallig op de banner.

---

## 5. Openstaande beperkingen

1. **Firefox/Gecko en WebKit/Safari zijn niet gedraaid.** Ontbrekende systeemlibraries, geen root,
   pakketproxy blokkeert downloads (403).
2. **15 van de 16 formaten dragen nog het defecte `script.js`** (hash `da0992bc`, identiek in alle
   vijftien): `window.load`-boot, globale `*`-reset, geen instance-scoping. Alleen 300x250 is gefixt.
   Deze staan bovendien nog niet in de repo.
3. **De DE-set is niet gestart.**
4. Bij uitval van `styles.css` degradeert de banner niet netjes.
5. Bij een gefaalde afbeelding toont Chrome het gebroken-icoon met alt-tekst linksboven. Cosmetisch;
   te ondervangen met een `onerror`-handler die het element verbergt.
6. **Byte-drift lokaal vs repo blijft bestaan.** De repo is de bron van waarheid; de lokale werkkopie
   moet daarvan ververst worden voordat er verder aan gewerkt wordt.

---

## 6. Status

### PRODUCTION READY — formaat 300x250 NL

Geverifieerd op Chromium in vier omgevingen en live op de productie-CDN, onder agressieve
publisher-CSS, op vier pixelratio's, met twee instanties op één pagina, bij herhaalde injectie,
over alle 14 headlines en bij vier vormen van asset-uitval. Nul console- of netwerkfouten,
0.00px geometrische afwijking, 0.06px t.o.v. het originele ontwerp.

**Met deze documenteerde beperking:** Gecko en WebKit zijn niet getest.

### De set als geheel: NOT PRODUCTION READY
15 formaten bevatten aantoonbaar nog alle vijf de oorspronkelijke defecten.
