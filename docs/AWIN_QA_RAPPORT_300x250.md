# Engineering-rapport — Awin HTML5 bannerset (NL)

**Scope van deze fase:** formaat 300x250, Nederlands.
**Repository:** https://github.com/mikezuidgeest-wellis/wellis-banners
**CDN / Pages:** https://mikezuidgeest-wellis.github.io/wellis-banners/
**Datum:** 14-08-2026

---

## A. Wat er mis was

| # | Defect | Ernst | Hoe vastgesteld |
|---|--------|-------|-----------------|
| 1 | `script.js` startte uitsluitend op `window.load`. In een geinjecteerde context (Awin-editor, publisher-CMS) is dat event al gepasseerd, dus `init()` draaide nooit. | **Kritiek** | QA-harness: `isLoaded=false` in awin-inject + contaminated |
| 2 | Globale `*{}` CSS-reset: lekte naar de publisher-pagina en bood geen bescherming tegen publisher-CSS. | **Hoog** | Gemeten: CTA werd 160x39 i.p.v. 156x32; headline schoof 5px |
| 3 | `const BannerSystem` in globale scope. Twee banners op een pagina of dubbele scriptload gaf `SyntaxError: Identifier 'BannerSystem' has already been declared` en doodde de banner volledig. | **Hoog** | `pageerror` in harness-log |
| 4 | DCO-fotos werden via relatieve bestandsnaam gezet (`el.src = "man-smiling.webp"`). In Awin resolvet dat naar het domein van de publisher -> 404. | **Kritiek** | Code-audit `randomizer.js` r.37 |
| 5 | `/_i18n.js` gaf **HTTP 404**. GitHub Pages draait standaard Jekyll, dat alle bestanden met underscore-prefix uitsluit. De DE-vertaallaag laadde dus nooit. | **Kritiek (blokkeert DE)** | Live fetch: status 404, 9379 bytes = GitHub 404-pagina |

### Over de prijssticker in de screenshot
De sticker stond **niet verkeerd gepositioneerd**. Gemeten in de correcte eindstaat is hij exact
`x=200 y=18 80x80` — precies wat de CSS voorschrijft (`top:18px; right:20px`).
Wat de screenshot toonde was defect #1: de sticker stond vast in zijn *pre-animatie* transform
`scale(.6) rotate(-15deg)` met `opacity:0`, omdat de klasse `is-loaded` nooit werd gezet.
Een positionele correctie zou het echte probleem hebben gemaskeerd.

---

## B. Grondoorzaken

1. **Defect 1** — `window.load` vuurt eenmalig en is niet idempotent. `randomizer.js` gebruikte al wel het
   correcte `document.readyState`-patroon; `script.js` was daarmee inconsistent.
2. **Defect 2** — een `*`-selector heeft specificiteit (0,0,0) en biedt per definitie geen verdediging.
3. **Defect 3** — top-level `const` in een classic script maakt een globale lexicale binding die bij
   herhaalde uitvoering hard faalt.
4. **Defect 4** — het ontwerp ging uit van co-locatie van HTML en assets; dat geldt niet bij Awin.
5. **Defect 5** — Jekyll staat standaard aan op GitHub Pages; `_`-prefix is een gereserveerde conventie.

---

## C. Wat er is gewijzigd

| Bestand | Wijziging |
|---------|-----------|
| `300x250/script.js` | IIFE-inkapseling; `data-gw-init` herentree-guard; `clickTag` blijft op `window` voor ad servers; boot via `document.readyState === 'complete'` met `window.load`-fallback |
| `300x250/randomizer.js` | Nieuwe `assetURL()` die `window.WELLIS_ASSET_BASE` toepast; laat absolute/root-relatieve paden ongemoeid; leeg = ongewijzigd relatief gedrag |
| `300x250/styles.css` | Globale `*{}` vervangen door `.ad-container, .ad-container *` met defensieve resets; `img`-reset tegen `max-width:100%`; beeldregels verhoogd in specificiteit |
| `.nojekyll` (root, nieuw) | Schakelt Jekyll uit zodat `_i18n.js` wordt geserveerd |

**Bewust NIET gebruikt:** `<base href>`. Dat herschrijft in een geinjecteerde pagina ook alle
relatieve links van de uitgever en is daarmee onveilig in productie.

---

## D. Formaten

| Formaat | Status |
|---------|--------|
| 300x250 NL | **Afgerond en geverifieerd** |
| 120x600, 160x600, 200x200, 250x250, 300x50, 300x100, 300x200, 300x600, 320x50, 320x100, 320x240, 336x280, 468x60, 728x90, 970x90 | **Nog niet uitgevoerd** |
| Volledige DE-set | **Nog niet gestart** (correct: pas na NL-signoff) |

---

## E. Assets

Alle 27 runtime-bestanden voor 300x250 staan in de repo en zijn met HTTP 200 bevestigd:
`index.html`, `styles.css`, `banner-data.js`, `randomizer.js`, `script.js`,
4 SVG's, 14 WebP-fotos, 3 Gordita woff2-fonts, plus `_i18n.js` in de root.
Geen enkele lokale of machine-specifieke verwijzing. Totaal 300x250: ~524 KB aan CDN-assets;
de HTML die in Awin wordt geplakt is **3,6 KB**.

---

## F. Browsertests

| Omgeving | Status | Toelichting |
|----------|--------|-------------|
| Chromium 1228 (Playwright, headless) | **Geverifieerd** | 3 scenario's, geometrie + pixeldiff |
| Chrome (desktop, live Pages) | **Geverifieerd** | Injectietest tegen productie-CDN, 0 errors |
| Safari / Firefox / Edge | **NIET DIRECT GEVERIFIEERD** | Geen engines beschikbaar in deze omgeving |
| iOS Safari / Android Chrome | **NIET DIRECT GEVERIFIEERD** | Geen fysieke devices beschikbaar |

---

## G. Visuele regressie

Harness rendert drie scenario's: `standalone` (referentie), `awin-inject` (HTML geinjecteerd
nadat het document al geladen is) en `contaminated` (idem + publisher-CSS).

**Geometrie na fix — grootste afwijking t.o.v. referentie: 0.00 px** op price, priceMain, logo,
headline, cta, trust, stars en hero.

Voor de pixeldiff moest de meting eerst deterministisch gemaakt worden; drie verstoringen zijn
geidentificeerd en geneutraliseerd in de meetopstelling (niet in de banner):
lopende `pricePulse`/`photoZoomIn`-animaties, de DCO-rotatie (andere foto per render) en de
slide-rotatie-`setInterval`. Restverschil daarna: **1,96 %**, uitsluitend binnen de fotoband
`bbox (0,0,300,73)`, zichtbaar als dunne contourlijnen = sub-pixel resampling, niet layout.
Bij een echte verschuiving zouden dikke dubbele randen zichtbaar zijn.

Live productiemeting (Chrome, tegen CDN, met vervuilde publisher-CSS):
`price x200 y18 80x80` · `cta x71.8 y183.1 156.4x31.9` · `trust x0 y229 300x21` ·
`logo x104.5 y88 91x29.2` · `stars 59x11` — alle exact gelijk aan de referentie.

---

## H. Performance

- Awin-payload (geplakte HTML): **3,6 KB**
- CDN-assets 300x250: ~524 KB totaal; per impressie wordt lazy exact 1 man- + 1 vrouwfoto geladen
- Requests per impressie: 1 CSS + 4 JS + 4 SVG + 2 WebP + max 3 woff2
- Geen frameworks of externe dependencies; alles vanilla
- IAB-compliance: animatie stopt na 15 s via `freeze()` en houdt een statisch eindframe

---

## I. Openstaande beperkingen

1. Safari, Firefox, Edge, iOS Safari en Android Chrome zijn **niet direct geverifieerd**.
2. 15 van de 16 NL-formaten zijn nog niet behandeld; de DE-set evenmin.
3. Er bestaat **byte-drift** tussen de lokale werkkopie en de repo (`script.js` 9343 vs 6580 bytes;
   `styles.css` 9927 vs 9694; `_i18n.js` 15769 vs 15509). Functioneel equivalent — alle
   sleutelmarkers zijn geverifieerd en de live code is getest — maar de repo moet vanaf nu de
   enige bron van waarheid zijn. Lokale kopieen dienen daarvan te worden ververst.
4. Awin kan de geplakte HTML sanitiseren. Het `<script>`-blok is essentieel; als Awin scripts
   strippt werkt de banner niet. Dit moet in hun editor bevestigd worden.
5. De 1,96 % pixelvariantie in de fotoband is geanalyseerd maar niet tot nul herleid.

---

## J. Productiestatus

### PRODUCTION READY WITH DOCUMENTED LIMITATIONS — uitsluitend formaat 300x250 NL

Het formaat 300x250 is in het daadwerkelijke Awin-scenario getest tegen de live CDN, onder
vervuilde publisher-CSS, met nul console- en netwerkfouten en 0.00 px geometrische afwijking.
De set als geheel is **NOT PRODUCTION READY** zolang de overige 15 formaten en de DE-set
niet dezelfde behandeling en verificatie hebben gehad.
