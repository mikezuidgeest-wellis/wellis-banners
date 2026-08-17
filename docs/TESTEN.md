# Browsertest voor de Awin-bannerset

Dit draait de bannerset door **drie echte browserengines** en legt van elke banner
een screenshot vast, zodat je verschillen tussen browsers zelf kunt zien in plaats
van erop te moeten vertrouwen.

## Waarom dit nodig was

Alle tests tot nu toe draaiden in Chromium. Dat dekt Chrome, Edge, Opera en Samsung
Internet, want die delen dezelfde engine (Blink). Maar het zegt niets over:

| Engine | Browsers |
|---|---|
| Gecko | Firefox desktop, Firefox Android |
| WebKit | Safari op macOS, **en elke browser op iOS** - ook Chrome en Firefox op een iPhone draaien verplicht WebKit |

Op mobiel is dat geen randgeval maar een groot deel van het verkeer.

## Eenmalig installeren

```bash
cd "_BROWSERTEST"
npm install
```

Dat haalt Playwright binnen en installeert de drie engines (~400 MB). Dit is de
open source testtool van Microsoft; de WebKit-build is dezelfde engine als Safari.

## Draaien

```bash
npm test            # alle engines, NL + DE, alle 16 formaten
npm run safari      # alleen de Safari/iOS-engine
npm run firefox     # alleen Firefox
npm run mobiel      # iPhone 13 en Pixel 7, met echte pixelratio
npm run rapport     # opent het HTML-rapport met alle screenshots
```

De **eerste run legt de referentiebeelden vast** per engine. Die "falen" dan een
keer met de melding *a snapshot doesn't exist, writing actual* - dat is normaal.
Elke volgende run vergelijkt daartegen en toont het pixelverschil.

Wil je testen voor je uploadt, tegen een lokale kopie:

```bash
cd "../_UPLOAD_NAAR_GITHUB" && python3 -m http.server 8899
# in een tweede venster:
BASE=http://127.0.0.1:8899/ npm test
```

## Wat er per banner gecontroleerd wordt

1. Geen console-, JavaScript- of netwerkfouten (favicon uitgezonderd - de browser
   vraagt die zelf op bij een losse pagina, in Awin gebeurt dat nooit)
2. `is-loaded` staat er - dit was de oorspronkelijke productiebug; zonder deze
   klasse blijft de prijssticker hangen op `scale(.6) rotate(-15deg)`
3. Exacte IAB-afmeting, tot op de pixel
4. Niets steekt buiten de bannerrand uit
5. Geen afgekapte tekst in kop, CTA of Trustpilot-regel
6. De `inset`-fallback werkt: `.bg-color` vult de volle banner. Op Safari onder
   14.1 kent de engine `inset` niet; zonder de longhand-fallback wordt deze laag
   0x0 en verdwijnen de achtergrond en de hero-foto
7. De randomizer heeft echt een kop en een foto gezet
8. Pixelvergelijking met het referentiebeeld van diezelfde engine.
   **Alleen lokaal.** In GitHub Actions is de runner elke keer schoon, dus daar
   bestaat nooit een referentiebeeld om tegen te vergelijken. De stap wordt
   daar overgeslagen (`CI=true`); alle controles hierboven draaien wel.

Plus twee gedragstests:

- **Rotatie stopt op 15s** - IAB-eis. Er moet minstens een keer geroteerd zijn, na
  15 seconden staat alles stil en toont het eindframe de CTA.
- **Awin-injectie** - de HTML wordt in een *al geladen* pagina geplaatst
  (`window.load` is dan allang gevallen) met vijandige publisher-CSS die
  `box-sizing`, `letter-spacing` en `img{border:2px}` met `!important` oplegt. De
  banner moet exact op maat blijven en die rand moet geblokkeerd worden.

## Determinisme

De banner randomiseert zichzelf: andere foto's, andere koppen, andere slidevolgorde,
en een oplopende Trustpilot-teller. Zonder ingrijpen is elke screenshot anders en is
elke diff betekenisloos. De test pint daarom `Math.random` voordat de scripts
draaien, wacht op `document.fonts.ready`, stopt alle timers, zet transitions en
animaties uit, pint de actieve slide en pint de teller op 2.720.

Antialiasing verschilt onvermijdelijk per engine en per besturingssysteem. Daarom
staat de screenshotdrempel op 2% afwijkende pixels. Een echte layoutfout ligt daar
ruim boven; subpixelverschil in lettercontouren blijft eronder.

## CSS-controles (los van de browsers)

```bash
npm run css-lint     # syntaxvalidatie van elke declaratie
npm run css-compat   # welke CSS-features je doelbrowsers niet dekken
```

**`css-lint`** vangt precies de foutklasse die eerder ongemerkt live ging: een
kapotte waarde als `height:12p!importantx`. Zo'n declaratie is ongeldig, de browser
gooit hem stil weg, en je merkt het pas als de layout in een randgeval instort.
Controleert nu 4.444 declaraties over 16 stylesheets.

**`css-compat`** (doiuse) vergelijkt elke property met de caniuse-database voor je
doelbrowsers. Draai dit voor elke upload. Let op: het meldt op *categorie*niveau,
dus `overflow:hidden` wordt gemeld onder "CSS overflow partially supported" terwijl
alleen `overflow:clip` het probleem is. Kijk altijd welke waarde er echt staat.

## Wat deze tests wel en niet bewijzen

**Wel:** dat de layout, de initialisatie, de timing en de isolatie kloppen in de
drie engines die samen praktisch het hele web dekken, op de versies die Playwright
meelevert (de actuele).

**Niet:** oude Safari's. Playwright levert de huidige WebKit; Safari 12 uit 2018
kun je hiermee niet draaien. Dat gat is afgedekt door de `inset`-longhand-fallbacks
en het verwijderen van flex-`gap`, en gemeten door die twee eigenschappen
kunstmatig uit de CSS te strippen en te controleren dat alle 16 formaten
pixelidentiek blijven. Dat is een goede benadering, geen echte oude Safari.

Wil je dat sluitend maken, dan is er een stap over: een run op BrowserStack of
LambdaTest tegen echte oude apparaten. Dat is betaald en geen open source, maar
het is de enige manier om het echt te weten in plaats van te beredeneren.
