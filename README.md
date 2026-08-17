# GetWellis bannerset

IAB display banners voor Awin, gehost op GitHub Pages.
**Deze repo is de enige bron van waarheid.** Wat hier staat, staat live.

Live: <https://mikezuidgeest-wellis.github.io/wellis-banners/>

## De regel

> Wijzig nooit rechtstreeks in een gegenereerde map.
> Pas `bron/` of `bouw/` aan en draai de bouw opnieuw.

Alle 16 formaten × 2 talen worden gegenereerd. Een handmatige aanpassing in
bijvoorbeeld `300x250/styles.css` wordt bij de volgende herbouw stilletjes
teruggedraaid. De GitHub Action controleert daarop en zet de build op rood.

## Structuur

| Map | Wat | In versiebeheer |
|---|---|---|
| `bron/` | De Figma-export per formaat: `index.html` + `styles.css`. Plus `bron/shared/` (de JavaScript) en `bron/assets/` (afbeeldingen en fonts), eenmalig in plaats van 16× gedupliceerd. | ja, dit is de invoer |
| `bouw/` | De bouwscripts. Hier zit alle hardening in: CSS-scoping, `!important`-bescherming tegen publisher-CSS, `inset`-fallbacks, `gap`-vervanging. | ja |
| `test/` | Playwright-harnas (Chrome, Firefox, Safari-engine) en CSS-validatie. | ja |
| `docs/` | QA-rapporten en de testhandleiding. | ja |
| `<formaat>/` | Gegenereerd, Nederlands. 16 mappen. | ja, want Pages serveert dit |
| `de/<formaat>/` | Gegenereerd, Duits. 16 mappen. | ja |
| `shared/`, `assets/` | Gegenereerd. De JavaScript en de afbeeldingen die alle banners delen. | ja |
| `_AWIN_SNIPPETS/` | Gegenereerd. De HTML om in de Awin-editor te plakken. | nee, staat in `.build/` |
| `.build/` | Tussenstap van de bouw. | nee, genegeerd |

Dat de gegenereerde bestanden meegaan in git is met opzet: GitHub Pages serveert
ze rechtstreeks, er is geen bouwstap op de server.

## Iets wijzigen

```bash
# 1. pas aan in bron/ of bouw/
# 2. herbouw beide talen en publiceer
python3 bouw/bouw_alles.py

# 3. kijk wat er verandert
git diff --stat

# 4. controleer
cd test && npm test && cd ..

# 5. push
git add -A && git commit -m "beschrijf de wijziging" && git push
```

Na de push draait de Action de herbouw, de CSS-validatie en de browsertests.
Groen vinkje = goed. GitHub Pages ververst binnen een minuut of twee.

### Waar zit wat

| Ik wil wijzigen | Bestand |
|---|---|
| Koppen, prijs, CTA-tekst (NL) | `bron/shared/banner-data.js` |
| Duitse vertaling en prijs | `bron/shared/_i18n.js` |
| Trustpilot-aantal | `bron/shared/script.js` (`PLATEAU`) |
| Rotatiesnelheid, 15s-limiet | `bron/shared/script.js` |
| Welke foto's, randomisatielogica | `bron/shared/randomizer.js` |
| Layout van één formaat | `bron/<formaat>/styles.css` |
| Isolatieregels, fallbacks | `bouw/bouw_formaten.py` |
| Duitse opbouw | `bouw/bouw_duits.py` |

Let op: `bron/300x250/styles.gepubliceerd.css` heeft voorrang op
`bron/300x250/styles.css`. Dat formaat is in de eerste correctieronde met de
hand aangepast, waardoor de originele export afwijkt van wat er live staat. De
gepubliceerde variant is voor dat ene formaat de waarheid.

## Testen

```bash
cd test
npm install          # eenmalig, installeert de drie browserengines (~400 MB)
npm test             # alles
npm run safari       # alleen de Safari/iOS-engine
npm run css-lint     # syntaxvalidatie van elke CSS-declaratie
npm run css-compat   # browsercompatibiliteit van de CSS
```

Volledige uitleg in [`docs/TESTEN.md`](docs/TESTEN.md).

## Awin

Awin accepteert geen zip, alleen geplakte HTML5. Daarom staan alle assets extern
op Pages en bevat het snippet alleen markup plus absolute URL's. De snippets
komen na een bouw in `.build/nl/_AWIN_SNIPPETS/` en `.build/de/_AWIN_SNIPPETS_DE/`.

Twee dingen die niet vanzelf spreken en waar eerder fouten uit voortkwamen:

- **Geen `<base href>`.** Dat zou ook de relatieve links van de publisher
  herschrijven. Alle URL's in de snippets zijn daarom absoluut.
- **De banner wordt geïnjecteerd in een al geladen pagina**, dus `window.load`
  is dan allang gevallen. `script.js` controleert `document.readyState` en start
  meteen als de pagina al klaar is. Zonder die controle bleef de prijssticker
  hangen op `scale(.6) rotate(-15deg)`.

## `.nojekyll`

Moet blijven staan. GitHub Pages draait standaard Jekyll, en dat negeert
bestanden die met een underscore beginnen — waaronder `shared/_i18n.js`. Zonder
dit bestand geeft de Duitse vertaling een 404 en tonen de Duitse banners
Nederlandse tekst.
