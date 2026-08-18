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
| `_AWIN_SNIPPETS/` | Gegenereerd. De HTML om in de Awin-editor te plakken, Nederlands. | ja |
| `_AWIN_SNIPPETS_DE/` | Idem, Duits. | ja |
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
| Klik-URL Nederlands | `bouw/bouw_formaten.py` (`KLIK_URL`) |
| Klik-URL Duits | `bouw/bouw_duits.py` (`KLIK_URL`) |
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
npm run css-lint      # syntaxvalidatie van elke CSS-declaratie
npm run css-compat    # browsercompatibiliteit van de CSS
npm run snippet-lint  # vorm en URL's van de 32 Awin-snippets
```

Volledige uitleg in [`docs/TESTEN.md`](docs/TESTEN.md).

## Awin

Awin accepteert geen zip, alleen geplakte HTML5. De code die je plakt staat in
`_AWIN_SNIPPETS/<formaat>.html` (Nederlands) en `_AWIN_SNIPPETS_DE/<formaat>.html`
(Duits). Die bestanden staan in de repo en worden bij elke bouw opnieuw
gegenereerd — pas ze niet met de hand aan.

Elk snippet is een **volledig HTML-document**: DOCTYPE, `<html lang>`, een head
met `<meta charset>`, `<title>`, `<meta name="ad.size">` en `<base href>`, en
dan de banner. Dat is de vorm die Awin zelf aanhoudt, want Awin serveert de
creatie als een eigen document in een iframe — niet geïnjecteerd in de
publisher-pagina.

Vier dingen zijn niet vanzelfsprekend en komen alle vier uit een storing:

**De `<base href>` is niet dragend.** Hij staat erin omdat Awin het zo
genereert en het in een iframe veilig is, maar elke `src` en `href` in het
snippet is óók absoluut. Valt de base-tag weg door een sanitizer, dan werkt
alles nog. Een eerdere snippet leunde er wél op: zonder die tag waren 5 van de
5 afbeeldingen stuk — logo, prijssticker, hero-foto, Trustpilot-logo en de
sterren. Een lege teal doos met alleen tekst.

**Geen inline `<script>`.** Advertentieplatforms strippen die routineus. De
asset-base en de taal staan daarom als markup op de container:

```html
<div id="ad-container" data-asset-base="…/assets/" data-lang="nl">
```

`randomizer.js` en `_i18n.js` lezen die attributen zelf uit. Werd de inline
variant gestript, dan verdwenen alle foto's (NL) of bleef de Duitse creatie
stil in het Nederlands staan — geen foutmelding, alleen verkeerde taal.

**De klik-URL staat per taal in de markup.** Nederlands gaat naar
`getwellis.com`, Duits naar `getwellis.de`. Dat staat als
`data-click-url` op de container, en de bron is één constante per taal:
`KLIK_URL` in `bouw/bouw_formaten.py` respectievelijk `bouw/bouw_duits.py`.
Eerder had `script.js` één harde terugvaloptie voor beide talen, waardoor de
Duitse banners naar het Nederlandse domein leidden.

Een adserver die `window.clickTag` zet houdt altijd voorrang — daar hangt de
klikregistratie aan. `script.js` vergelijkt `window.clickTag` met zijn eigen
standaardwaarde in plaats van hem eenmalig uit te lezen, want sommige servers
injecteren pas kort voor de klik.

**`<meta name="ad.size">` moet erin.** Awin en de IAB-validators gebruiken het
om de creatie te plaatsen.

**Alle scripts komen uit `shared/`, niet uit `<formaat>/`.** Er staan nog oude
kopieën van `script.js` en `randomizer.js` in de formaatmappen, over van de
eerste upload. Die zijn verouderd — `PLATEAU` staat er nog op 2641 in plaats
van 2720. Verwijs er nooit naar.

`test/valideer-snippets.js` dwingt dit alles af en draait mee in de CI:

```bash
cd test && npm run snippet-lint
```

## `.nojekyll`

Moet blijven staan. GitHub Pages draait standaard Jekyll, en dat negeert
bestanden die met een underscore beginnen — waaronder `shared/_i18n.js`. Zonder
dit bestand geeft de Duitse vertaling een 404 en tonen de Duitse banners
Nederlandse tekst.
