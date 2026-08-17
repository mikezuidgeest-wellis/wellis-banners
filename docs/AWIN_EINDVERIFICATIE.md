# Live eindverificatie — Awin bannerset (NL, 16 formaten)

**Repo:** https://github.com/mikezuidgeest-wellis/wellis-banners
**Preview:** https://mikezuidgeest-wellis.github.io/wellis-banners/preview.html
**Datum:** 14-08-2026

---

## Wat er live staat

87 bestanden: 16 formaatmappen (`index.html` + `styles.css`), `shared/` met de vier
gedeelde scripts, `assets/` met 22 afbeeldingen en fonts, plus `preview.html`.

Alle 36 tekstbestanden zijn **byte-identiek** aan de lokaal geteste versies.
De eerder gemelde drift tussen werkmap en repo bestaat niet meer.

---

## Resultaat per formaat

Elk formaat live getest tegen de CDN, in het zwaarste scenario: banner-HTML
geinjecteerd nadat het document al geladen was, met agressieve publisher-CSS
(`*{box-sizing:content-box!important}`, `img{max-width:100%!important;height:auto!important}`,
`html{font-size:20px}`, `body{font-family:Georgia;line-height:1.8}`,
`span{text-transform:uppercase}`, `div{margin;padding}`).

| Formaat | Afmeting | is-loaded | Afbeeldingen | Prijs | Trust | Buiten kader | Afgekapt | Fouten |
|---------|----------|-----------|--------------|-------|-------|--------------|----------|--------|
| 300x50  | OK | OK | 3/3 | - | - | 0 | 0 | 0 |
| 320x50  | OK | OK | 3/3 | - | - | 0 | 0 | 0 |
| 468x60  | OK | OK | 3/3 | - | - | 0 | 0 | 0 |
| 728x90  | OK | OK | 3/3 | - | - | 0 | 0 | 0 |
| 970x90  | OK | OK | 4/4 | zichtbaar | - | 0 | 0 | 0 |
| 300x100 | OK | OK | 3/3 | - | - | 0 | 0 | 0 |
| 320x100 | OK | OK | 3/3 | - | - | 0 | 0 | 0 |
| 200x200 | OK | OK | 4/4 | zichtbaar | - | 0 | 0 | 0 |
| 250x250 | OK | OK | 5/5 | zichtbaar | zichtbaar | 0 | 0 | 0 |
| 300x200 | OK | OK | 4/4 | zichtbaar | - | 0 | 0 | 0 |
| 320x240 | OK | OK | 6/6 | zichtbaar | zichtbaar | 0 | 0 | 0 |
| 300x250 | OK | OK | 6/6 | zichtbaar | zichtbaar | 0 | 0 | 0 |
| 336x280 | OK | OK | 6/6 | zichtbaar | zichtbaar | 0 | 0 | 0 |
| 120x600 | OK | OK | 5/5 | zichtbaar | zichtbaar | 0 | 0 | 0 |
| 160x600 | OK | OK | 5/5 | zichtbaar | zichtbaar | 0 | 0 | 0 |
| 300x600 | OK | OK | 6/6 | zichtbaar | zichtbaar | 0 | 0 | 0 |

**16 van 16 geslaagd.** Nul console- of netwerkfouten over de hele set.

Daarnaast lokaal per formaat gemeten: **0.00 px** afwijking tussen de standalone-render
en beide Awin-scenario's, op price, logo, headline, cta, trust, stars en hero.

---

## Defecten die deze ronde nog naar boven kwamen

| # | Bevinding | Waar |
|---|-----------|------|
| 8 | Mijn CSS-scoper zag een commentaar boven een regel als deel van de selector, wat `.ad-container .ad-container.is-loaded ...` opleverde. Die matcht nooit, waardoor de **complete entree-animatie dood was** en de hero-foto onzichtbaar bleef. De geometrie mat 0.00 px; alleen het contactvel van de renders liet het zien. | bouwscript |
| 9 | `img{height:auto!important}` van de uitgever klapte de hero naar vierkant; `.ad-container` erfde `line-height:1.8` van de publisher-body waardoor de CTA 42 px hoog werd i.p.v. 32. | CSS-isolatie |
| 10 | De preview injecteerde banner-markup met `src="../assets/..."` vanaf `/wellis-banners/preview.html`. Daar wijst `../assets/` naar de **domeinroot** -> 404 op het logo, waarna de browser 35 px hoogte berekende i.p.v. 19,6 px. De banners zelf waren correct; de preview niet. | preview.html |

Alle drie opgelost en opnieuw geverifieerd.

---

## Wat je zelf kunt controleren

**Preview met alle 16:** https://mikezuidgeest-wellis.github.io/wellis-banners/preview.html

**Losse formaten** (open direct, dit is exact wat live staat):
`/wellis-banners/300x250/`, `/wellis-banners/728x90/`, `/wellis-banners/120x600/`, enzovoort.

Twee dingen die de preview zelf meldt en die geen defect zijn:
- Staat het tabblad op de achtergrond, dan bevriest Chrome `requestAnimationFrame` en start de
  entree-animatie niet. De preview detecteert dit en meet opnieuw zodra je het tabblad activeert.
- Houd de muis weg van de banners tijdens het meten: bij hover klapt het pijltje in de CTA uit
  (ontworpen gedrag) en wordt de knop ~12 px breder.

---

## Openstaande beperkingen

1. **Firefox (Gecko) en WebKit (Safari/iOS) zijn niet gedraaid.** Beide binaries zijn geinstalleerd,
   maar missen systeemlibraries en de pakketproxy blokkeert downloads (403). Alle metingen komen van
   Chromium/Blink, wat Chrome en Edge dekt.
2. De **Duitse set** is nog niet gebouwd. De architectuur staat er klaar voor: `shared/_i18n.js`
   bevat de vertaallaag en wordt door alle 16 formaten geladen.
3. `300x250/` bevat nog losse kopieen van de 22 assets uit de eerste upload. Die zijn overbodig
   sinds `assets/` bestaat en kunnen opgeruimd worden.
4. Bij uitval van `styles.css` degradeert de banner niet netjes: zonder stylesheet is er geen layout.
5. Bij een gefaalde afbeelding toont Chrome het gebroken-icoon met alt-tekst. Cosmetisch; te
   ondervangen met een `onerror`-handler.

---

## Status

### PRODUCTION READY — alle 16 NL-formaten, met documenteerde beperking

Live geverifieerd op Chromium in het Awin-injectiescenario onder agressieve publisher-CSS.
Lokaal aanvullend: DPR 1x/1.5x/2x/3x, twee banners op een pagina, herhaalde injectie,
alle 14 headlines, container +-1px, reduced-motion, 15s-freeze en vier vormen van asset-uitval.

**Beperking:** Gecko en WebKit zijn niet getest.
