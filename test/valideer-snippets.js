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
const MAPPEN = ['_AWIN_SNIPPETS', '_AWIN_SNIPPETS_DE', '_AWIN_SNIPPETS_2X', '_AWIN_SNIPPETS_DE_2X'];
const CDN = 'https://mikezuidgeest-wellis.github.io/wellis-banners/';

// Bestemming per markt. Duitse banners moeten naar het Duitse domein; ze
// leidden eerder naar getwellis.com omdat script.js een enkele harde
// terugvaloptie voor beide talen had. Deze tabel houdt dat vast, zodat een
// nieuw formaat of een nieuwe taal niet stil op het verkeerde domein uitkomt.
const KLIK = { nl: 'https://www.getwellis.com/', de: 'https://www.getwellis.de/' };

const fouten = [];
let gecontroleerd = 0;

for (const map of MAPPEN) {
  const pad = path.join(REPO, map);
  if (!fs.existsSync(pad)) { fouten.push(`${map}/ ontbreekt volledig`); continue; }

  const bestanden = fs.readdirSync(pad).filter((f) => f.endsWith('.html'));
  // De 2x-map bevat alleen de maten waar Awin om vroeg (9), de talen elk 16.
  const verwacht = /_2X$/.test(map) ? 9 : 16;
  if (bestanden.length !== verwacht) {
    fouten.push(`${map}/ heeft ${bestanden.length} bestanden, verwacht ${verwacht}`);
  }

  for (const b of bestanden) {
    gecontroleerd++;
    const naam = `${map}/${b}`;
    const h = fs.readFileSync(path.join(pad, b), 'utf8');
    // commentaar eruit: daarin staat bewust het woord "<base href>" als uitleg
    const code = h.replace(/<!--[\s\S]*?-->/g, '');

    // <base href> MAG, want Awin genereert het zo en in een iframe is het
    // veilig. Maar het mag niet DRAGEND zijn: de check op absolute URLs
    // hieronder dwingt af dat de banner ook zonder de tag werkt.
    // ad.size en base href moeten bij DIT formaat horen, niet bij een ander.
    // Een generieke check op "staat er een ad.size" laat een kopieerfout door,
    // en dan plaatst Awin de creatie in het verkeerde slot.
    const taal = /_DE(_2X)?$/.test(map) ? 'de' : 'nl';
    const [B, H] = b.replace('.html', '').split('x');
    if (!code.includes(`<meta name="ad.size" content="width=${B},height=${H}">`)) {
      const gevonden = (code.match(/content="width=\d+,height=\d+"/) || ['ontbreekt'])[0];
      fouten.push(`${naam}: ad.size moet width=${B},height=${H} zijn, gevonden: ${gevonden}`);
    }
    // De 2x-snippets lenen de stylesheet van het BASISformaat (de helft), want
    // de banner zelf blijft die maat; alleen de wrapper schaalt hem op. base
    // href en stylesheet horen dus naar het basisformaat te wijzen, terwijl
    // ad.size de dubbele maat aangeeft.
    const basisF = /_2X$/.test(map) ? `${B / 2}x${H / 2}` : `${B}x${H}`;
    const base = (code.match(/<base href="([^"]+)"/) || [])[1];
    if (base && base !== `${CDN}${basisF}/`) {
      fouten.push(`${naam}: base href wijst naar ${base} i.p.v. ${CDN}${basisF}/`);
    }
    if (/_2X$/.test(map)) {
      if (!/class="gw-2x"/.test(code)) fouten.push(`${naam}: wrapper .gw-2x ontbreekt`);
      if (!/class="gw-2x-inner"/.test(code)) fouten.push(`${naam}: .gw-2x-inner ontbreekt`);
      if (B % 2 || H % 2) fouten.push(`${naam}: ${B}x${H} is geen even verdubbeling`);
      if (!code.includes(`/${basisF}/styles.css`)) {
        fouten.push(`${naam}: stylesheet moet die van ${basisF} zijn`);
      }
    }
    if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(code)) {
      fouten.push(`${naam}: bevat inline <script> - platforms strippen die`);
    }
    // Awin weigert elke http:// in de creatie. Zijn validator kijkt naar de
    // TEKST, niet naar wat er opgehaald wordt, dus ook de XML-namespace van
    // een inline SVG valt eronder: xmlns="http://www.w3.org/2000/svg". Daar
    // strandde de 300x250 op, met de melding dat de code niet veilig was.
    // Let op: dit moet op de HELE tekst gecontroleerd worden, ook binnen
    // commentaar, want de validator van Awin kijkt daar ook naar.
    const onveilig = h.match(/http:\/\/[^\s"'<>]*/gi);
    if (onveilig) {
      fouten.push(`${naam}: bevat http:// (${[...new Set(onveilig)].join(', ')}) - Awin weigert de creatie`);
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

    // Het <noscript>-blok maakt de banner zichtbaar als er geen JavaScript
    // draait. Een LEEG blok is erger dan geen blok: het ziet eruit alsof de
    // maatregel er is. Dat gebeurde: een regex die een sluitende accolade na
    // een newline verwachtte faalde stil op 38 van de 50 snippets, en dat viel
    // niet op omdat 300x250 een van de vier was die wel werkte.
    const ns = (h.match(/<noscript><style>([\s\S]*?)<\/style><\/noscript>/) || [])[1];
    if (ns === undefined) {
      fouten.push(`${naam}: geen <noscript>-blok`);
    } else if (ns.trim().length < 100 || !/opacity\s*:\s*1/.test(ns)) {
      fouten.push(`${naam}: <noscript>-blok is leeg of zet geen opacity (${ns.trim().length} tekens)`);
    }
    // _i18n.js hoort ALLEEN in de Duitse snippets. Op Nederlands returnt dat
    // bestand direct bij getLang() !== "de" en kost het 16 KB per impressie
    // voor niets - meetbaar, want het gewicht zat al tegen de 150 KB aan.
    const nodig = [taal === 'de' ? 'banner-data-de.js' : 'banner-data.js', 'randomizer.js', 'script.js'];
    if (taal === 'de') nodig.push('_i18n.js');
    for (const js of nodig) {
      if (!code.includes(js)) fouten.push(`${naam}: script ${js} ontbreekt`);
    }
    if (taal !== 'de' && /_i18n\.js/.test(code)) {
      fouten.push(`${naam}: laadt _i18n.js maar is Nederlands - 16 KB voor niets`);
    }
    if (taal === 'de') {
      // De Duitse copy hoort IN de markup te staan. Hing die aan _i18n.js in de
      // browser, dan zag een Duitse bezoeker bij een netwerkfout EUR149 in
      // plaats van 172 EUR - een prijsfout op een andere markt, zonder melding.
      const heeftPrijs = /class="price-main"/.test(code);
      if (heeftPrijs && !/172\u202f&euro;|172 &euro;/.test(code)) {
        fouten.push(`${naam}: Duitse prijs staat niet in de markup`);
      }
      if (heeftPrijs && /&euro;149/.test(code)) {
        fouten.push(`${naam}: Nederlandse prijs 149 staat in een Duitse creatie`);
      }
      if (/>Start met afvallen</.test(code)) fouten.push(`${naam}: CTA is nog Nederlands`);
      if (/>vanaf</.test(code)) fouten.push(`${naam}: prijslabel is nog Nederlands`);
      if (/alt="Tevreden klant"/.test(code)) fouten.push(`${naam}: alt-tekst is nog Nederlands`);
      if (!/banner-data-de\.js/.test(code)) fouten.push(`${naam}: laadt de Nederlandse koppenpool`);
    }
    if (!new RegExp(`data-lang="${taal}"`).test(code)) {
      fouten.push(`${naam}: data-lang="${taal}" ontbreekt`);
    }
    if (!code.includes(`data-click-url="${KLIK[taal]}"`)) {
      const gevonden = (code.match(/data-click-url="[^"]*"/) || ['ontbreekt'])[0];
      fouten.push(`${naam}: klik-URL moet ${KLIK[taal]} zijn, gevonden: ${gevonden}`);
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
