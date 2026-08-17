# Trustpilot-teller bijgewerkt naar 2.720

**Datum:** 17-08-2026 · **Oude waarde:** 2.641 · **Nieuwe waarde:** 2.720

---

## Hoe de teller werkt

Het getal is niet statisch. `script.js` laat het oplopen: het start op een
beginwaarde en klimt in stappen naar een plateau, waarna het daar blijft staan.
Er waren dus drie plekken die moesten wijzigen:

| Plek | Was | Wordt |
|------|-----|-------|
| `const PLATEAU` in `script.js` | 2641 | **2720** |
| `let current` (startwaarde) in `script.js` | 2637 | **2716** |
| `<span id="tp-counter">` in `index.html` | 2.641 | **2.720** |

De statische HTML-waarde is de terugvaloptie als JavaScript faalt, en wordt
door de Duitse laag gebruikt om de tekstbreedte te bepalen.

---

## Wat er is aangepast

**55 bestanden lokaal**, verdeeld over alle sets:

| Set | Bestanden |
|-----|-----------|
| Coded bannerset (16 formaten) | 16 `script.js` + 7 `index.html` |
| Coded socialset (8 mappen: 4 formaten x 2 varianten) | 8 `script.js` + 8 `index.html` |
| `_UPLOAD_NAAR_GITHUB` | 1 `shared/script.js` + 7 `index.html` |
| `_AWIN_SNIPPETS` | 7 snippets |
| `_PRODUCTION` (oude Awin-map) | 1 `index.html` |

**8 bestanden live in de repo:** `shared/script.js` + de 7 `index.html` met een
Trustpilot-balk (120x600, 160x600, 250x250, 300x250, 300x600, 320x240, 336x280).

De negen formaten zonder Trustpilot-balk (300x50, 320x50, 468x60, 728x90,
970x90, 300x100, 320x100, 200x200, 300x200) hebben geen zichtbare teller; hun
`script.js` is de gedeelde versie en dus automatisch bij.

---

## Duits

`_i18n.js` leest het getal dynamisch uit het DOM (`counter.textContent`) en
hardcodeert het nergens. De Duitse variant volgt daarom automatisch. Bevestigd:
alle zeven formaten tonen `4,7/5 basierend auf 2.720+ Bewertungen.` (of de
korte variant op de smalle skyscrapers).

---

## Verificatie live

| Formaat | Nederlands | Duits |
|---------|-----------|-------|
| 120x600 | 2.720+ reviews. | 2.720+ Bewertungen. |
| 160x600 | Gebaseerd op 2.720+ reviews. | 2.720+ Bewertungen. |
| 250x250 | 4.7/5 van 2.720+ reviews. | 4,7/5 basierend auf 2.720+ Bewertungen. |
| 300x250 | 4.7/5 van 2.720+ reviews. | 4,7/5 basierend auf 2.720+ Bewertungen. |
| 300x600 | 4.7/5 van 2.720+ reviews. | 4,7/5 basierend auf 2.720+ Bewertungen. |
| 320x240 | 4.7/5 van 2.720+ reviews. | 4,7/5 basierend auf 2.720+ Bewertungen. |
| 336x280 | 4.7/5 van 2.720+ reviews. | 4,7/5 basierend auf 2.720+ Bewertungen. |

**14 van 14 combinaties correct.** Geen enkel formaat toont afgekapte tekst en
in geen enkel geval valt de regel buiten de banner. Het oploopgedrag is
bevestigd: de teller begint op 2.717 en komt tot stilstand op 2.720.

---

## Let op: de geexporteerde videos

De 20 sociale videos in `Coded socialset/_VIDEO/` hebben het oude getal **in de
pixels gebrand**. Die veranderen niet mee met een codewijziging. De HTML-bron
van de socialset is wel bijgewerkt, dus een nieuwe export toont 2.720.
Wil je dat de bestaande videos het nieuwe getal tonen, dan moeten ze opnieuw
gerenderd worden.
