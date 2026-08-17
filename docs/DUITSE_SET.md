# Duitse bannerset — gebouwd als aparte set

**Datum:** 17-08-2026 · 16 formaten · status: getest, klaar om te uploaden

---

## Vastgelegde afspraken (geverifieerd vóór de bouw)

Alle Duitse copy zit in `shared/_i18n.js`. Dat bestand is vooraf gecontroleerd
op volledigheid:

| Afspraak | Waarde |
|----------|--------|
| Marktprijs DE | **172 €** — eigen prijspunt; NL blijft 149 / 179 |
| Prijsnotatie | bedrag + smalle vaste spatie + €, conform DIN/Duden |
| Score | **4,7** met komma (NL: 4.7) |
| Trustpilot | `basierend auf N+ Bewertungen.` met lengtevarianten per formaat |
| Koppen | 14 van 14 vertaald, native geschreven en tweetalig gereviewd |
| UI-labels | 5 van 5 vertaald (CTA's, "ab", "Monat") |
| Afbreekstreepjes | 4 lange samenstellingen krijgen zachte afbreekpunten |
| Korte varianten | 2 lange koppen hebben een kortere DE-vorm voor smalle formaten |
| Bezorg-trefwoorden | eigen Duitse lijst voor het verpakkingsmechanisme |

**Dekkingsaudit:** geen enkele kop of label zonder vertaling.

---

## Hoe de set gescheiden is

```
de/<formaat>/index.html      eigen Duitse pagina's, eigen URL's
_AWIN_SNIPPETS_DE/<f>.html   eigen Awin-snippets
```

Taal wordt gezet met `window.LANG = "de"` **vóór** de scripts laden. Bewust niet
via `?lang=de` in de URL: Awin plaatst geen queryparameters achter een creatief,
dus daar mag de set niet van afhangen. Getest zonder queryparameter.

**Bewust gedeeld met de Nederlandse set:**

| Gedeeld | Waarom |
|---------|--------|
| `/assets/` | afbeeldingen en fonts zijn taalneutraal |
| `/shared/*.js` | dezelfde geverifieerde logica; `_i18n.js` doet de vertaling |
| `/<formaat>/styles.css` | geometrie hoort bij het FORMAAT, niet bij de taal |

Daardoor komt een layoutcorrectie automatisch in beide talen terecht, en is er
maar één plek waar copy staat.

---

## Twee bevindingen tijdens de bouw

### 1. De skip-lijst werkte niet in het Duits

`data-skip-headlines` op 120x600 en 160x600 staat in het Nederlands, maar
`_i18n.js` vervangt de koppen vóórdat `randomizer.js` filtert. De lijst matcht
in het Duits dus nergens op.

Gemeten gevolg: de twee "geskipte" koppen verschijnen wel in het Duits, maar
**zonder overflow** — kleinste lettergrootte 13,6px. De Duitse varianten zijn
korter dan de Nederlandse, dus de uitzondering is daar niet nodig. Het attribuut
is uit de Duitse markup gehaald zodat die geen filtering suggereert die er niet is.

### 2. Kapotte CSS-declaraties (raakt ook de Nederlandse set)

Mijn eerdere bouwscript plakte `!important` soms **midden in de waarde**:

```
height:12p!importantx!important      in plaats van   height:12px!important
width:aut!importanto!important       in plaats van   width:auto!important
```

Oorzaak: een negatieve lookahead die door backtracking werd omzeild. **11 kapotte
declaraties** in 6 formaten, en die stonden live.

Op de normale route was er geen zichtbaar effect: de `is-loaded`-regel levert
dezelfde waarde. Maar op de terugvalroute wel. Gemeten met beperkte
bewegingsvoorkeur én JavaScript uit:

| | sterrenmask 120x600 | 300x600 | 336x280 | 320x240 |
|---|---|---|---|---|
| huidige live versie | 0 px (onzichtbaar) | 0 px | 0 px | 0 px |
| na reparatie | 70 px | 129 px | 61 px | 61 px |

De regex is vervangen door een parser die per declaratie werkt, plus een
reparatiestap die bestaande corruptie herstelt. Build nu: **0 kapotte declaraties**.

---

## Testresultaat Duitse set

Alle 16 formaten, geladen zonder queryparameter, met agressieve publisher-CSS
(`!important`-resets) eromheen:

| Formaat | Prijs | CTA | Buiten kader | Afgekapt | Fouten |
|---------|-------|-----|--------------|----------|--------|
| 300x50 | – | – | 0 | 0 | 0 |
| 320x50 | – | – | 0 | 0 | 0 |
| 468x60 | – | – | 0 | 0 | 0 |
| 728x90 | – | Heute starten | 0 | 0 | 0 |
| 970x90 | 172 € | Heute starten | 0 | 0 | 0 |
| 300x100 | – | Mehr erfahren | 0 | 0 | 0 |
| 320x100 | – | Mehr erfahren | 0 | 0 | 0 |
| 200x200 | 172 € | Jetzt abnehmen | 0 | 0 | 0 |
| 250x250 | 172 € | Jetzt abnehmen | 0 | 0 | 0 |
| 300x200 | 172 € | Jetzt abnehmen | 0 | 0 | 0 |
| 320x240 | 172 € | Jetzt abnehmen | 0 | 0 | 0 |
| 300x250 | 172 € | Jetzt abnehmen | 0 | 0 | 0 |
| 336x280 | 172 € | Jetzt abnehmen | 0 | 0 | 0 |
| 120x600 | 172 € | Mehr erfahren | 0 | 0 | 0 |
| 160x600 | 172 € | Mehr erfahren | 0 | 0 | 0 |
| 300x600 | 172 € | Jetzt abnehmen | 0 | 0 | 0 |

**16 van 16 geslaagd.** Taal correct op `de`, alle afmetingen exact, alle
afbeeldingen geladen, nul console- of netwerkfouten.

---

## Nog te doen

1. **Uploaden.** In `_UPLOAD_NAAR_GITHUB` staan nu 54 bestanden: de 16 herstelde
   Nederlandse `styles.css`, de map `de/` met 16 Duitse pagina's, en de eerder
   geplaatste bestanden. Slepen naar GitHub zoals eerder.
2. **Preview uitbreiden** met de Duitse set, zodat je beide talen naast elkaar ziet.
3. **Niet direct geverifieerd:** Gecko en WebKit. Alle metingen komen van Chromium.
