/**
 * Controleert de Awin-snippets: de code die daadwerkelijk in de Awin-editor
 * geplakt wordt.
 *
 * Deze controle bestaat vanwege een concrete productiestoring. Er was een oude
 * snippet in omloop met een <base href> en louter relatieve afbeeldingspaden.
 * Zolang die base-tag overleefde werkte het. Awin plaatst de creatie in een
 * bestaand document, waar <base> een head-element is dat wordt genegeerd of
 * weggehaald - en dan vallen ALLE afbeeldingen weg. Gemeten: 5 van de 5 stuk,
 * oftewel een lege teal doos met alleen tekst.
 *
 * Wat hier wordt afgedwongen:
 *   1. geen <base href> - die mag nooit terugkomen
 *   2. elke src en href absoluut - een snippet mag nergens van afhangen
 *   3. WELLIS_ASSET_BASE gezet - anders laadt de randomizer de foto's relatief
 *   4. geen <!DOCTYPE>, <html>, <head> of <body> - het is een fragment
 *   5. de stylesheet en alle vier de scripts aanwezig
 *
 * Draaien: node valideer-snippets.js
 */
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const MAPPEN = ['_AWIN_SNIPPETS', '_AWIN_SNIPPETS_DE'];
const CDN = 'https://mikezuidgeest-wellis.github.io/wellis-banners/';

const fouten = [];
let gecontroleerd = 0;

for (const map of MAPPEN) {
  const pad = path.join(REPO, map);
  if (!fs.existsSync(pad)) { fouten.push(`${map}/ ontbreekt volledig`); continue; }

  const bestanden = fs.readdirSync(pad).filter((f) => f.endsWith('.html'));
  if (bestanden.length !== 16) fouten.push(`${map}/ heeft ${bestanden.length} bestanden, verwacht 16`);

  for (const b of bestanden) {
    gecontroleerd++;
    const naam = `${map}/${b}`;
    const h = fs.readFileSync(path.join(pad, b), 'utf8');
    // commentaar eruit: daarin staat bewust het woord "<base href>" als uitleg
    const code = h.replace(/<!--[\s\S]*?-->/g, '');

    // <base href> MAG, want Awin genereert het zo en in een iframe is het
    // veilig. Maar het mag niet DRAGEND zijn: de check op absolute URLs
    // hieronder dwingt af dat de banner ook zonder de tag werkt.
    if (!/<meta name="ad\.size" content="width=\d+,height=\d+">/.test(code)) {
      fouten.push(`${naam}: <meta name="ad.size"> ontbreekt`);
    }
    if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(code)) {
      fouten.push(`${naam}: bevat inline <script> - platforms strippen die`);
    }
    if (!/data-asset-base="https:\/\//.test(code)) {
      fouten.push(`${naam}: data-asset-base ontbreekt of is niet absoluut`);
    }

    for (const m of code.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const u = m[1];
      if (u.startsWith('data:') || u.startsWith('#')) continue;
      if (!u.startsWith(CDN)) fouten.push(`${naam}: niet-absolute of onbekende URL "${u}"`);
    }

    // Volledig document: dat is de vorm die Awin zelf aanhoudt.
    for (const tag of ['<!DOCTYPE', '<html', '<head', '<body']) {
      if (!code.toLowerCase().includes(tag.toLowerCase())) fouten.push(`${naam}: ${tag} ontbreekt`);
    }
    if (!/<link rel="stylesheet"/.test(code)) fouten.push(`${naam}: geen stylesheet`);
    for (const js of ['banner-data.js', '_i18n.js', 'randomizer.js', 'script.js']) {
      if (!code.includes(js)) fouten.push(`${naam}: script ${js} ontbreekt`);
    }
    const taal = map === '_AWIN_SNIPPETS_DE' ? 'de' : 'nl';
    if (!new RegExp(`data-lang="${taal}"`).test(code)) {
      fouten.push(`${naam}: data-lang="${taal}" ontbreekt`);
    }
  }
}

console.log(`snippets gecontroleerd: ${gecontroleerd}`);
if (fouten.length === 0) {
  console.log('geen fouten');
} else {
  console.log(`\n${fouten.length} FOUTEN:`);
  fouten.forEach((f) => console.log('  ' + f));
  process.exit(1);
}
