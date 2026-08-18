/**
 * Meet het gewicht per creatie en zet de bouw op rood boven de grens.
 *
 * Waarom dit bestaat: er stond nergens een meting van het impressiegewicht,
 * alleen "3,6 KB geplakte HTML" in een oud rapport. Dat is misleidend - de
 * geplakte HTML is een fractie van wat een bezoeker daadwerkelijk binnenhaalt.
 *
 * Wat er wordt geteld: de snippet zelf, de stylesheet, de scripts, de fonts en
 * de TWEE zwaarste foto's. Twee, want randomizer.js zet de src pas na de keuze
 * en haalt er dus precies twee op: een man en een vrouw. De zwaarste twee is de
 * worst case.
 *
 * De grens staat op de gzip-schatting, niet op de ruwe bytes. Een browser haalt
 * tekst gecomprimeerd op; woff2 en webp zijn al gecomprimeerd en worden dus
 * ongewijzigd geteld. De ruwe som staat er ter informatie bij, want als een
 * platform ongecomprimeerd meet wil je dat getal ook zien.
 *
 * Draaien: node meet-gewicht.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const REPO = path.join(__dirname, '..');
const GRENS_KB = 150;

function kb(n) { return (n / 1024).toFixed(1); }
function lees(p) { try { return fs.readFileSync(p); } catch (e) { return null; } }
function gzip(b) { return zlib.gzipSync(b, { level: 9 }).length; }

// al gecomprimeerde formaten niet nog eens meetellen als comprimeerbaar
const AL_COMPRIMEERD = /\.(webp|png|jpe?g|gif|woff2?)$/i;
function beideMaten(p) {
  const b = lees(p);
  if (!b) return null;
  return { ruw: b.length, gz: AL_COMPRIMEERD.test(p) ? b.length : gzip(b) };
}

const assets = fs.readdirSync(path.join(REPO, 'assets'));
const fotos = assets.filter(f => /\.webp$/i.test(f))
  .map(f => ({ f, n: fs.statSync(path.join(REPO, 'assets', f)).size }))
  .sort((a, b) => b.n - a.n);
const zwaarste2 = fotos.slice(0, 2);

const rijen = [];
const fouten = [];

for (const map of ['_AWIN_SNIPPETS', '_AWIN_SNIPPETS_DE', '_AWIN_SNIPPETS_2X']) {
  const dir = path.join(REPO, map);
  if (!fs.existsSync(dir)) continue;
  for (const b of fs.readdirSync(dir).filter(x => x.endsWith('.html')).sort()) {
    const snippet = fs.readFileSync(path.join(dir, b), 'utf8');
    let ruw = 0, gz = 0;
    const tel = (p) => { const m = beideMaten(p); if (m) { ruw += m.ruw; gz += m.gz; } };

    const s = beideMaten(path.join(dir, b));
    ruw += s.ruw; gz += s.gz;

    // stylesheet en scripts uit de snippet halen, niet gokken
    const css = (snippet.match(/<link rel="stylesheet" href="[^"]*\/([^\/"]+\/styles\.css)"/) || [])[1];
    if (css) tel(path.join(REPO, css));
    for (const m of snippet.matchAll(/<script src="[^"]*\/shared\/([^"]+)"/g)) {
      tel(path.join(REPO, 'shared', m[1]));
    }
    // svg's uit de markup
    for (const m of snippet.matchAll(/src="[^"]*\/assets\/([^"]+\.svg)"/g)) {
      tel(path.join(REPO, 'assets', m[1]));
    }
    // fonts die de stylesheet opvraagt
    if (css) {
      const cssTekst = fs.readFileSync(path.join(REPO, css), 'utf8');
      for (const m of cssTekst.matchAll(/url\("[^"]*fonts\/([^"]+)"/g)) {
        tel(path.join(REPO, 'assets', 'fonts', m[1]));
      }
    }
    // twee zwaarste foto's als worst case
    for (const p of zwaarste2) tel(path.join(REPO, 'assets', p.f));

    rijen.push({ naam: map + '/' + b.replace('.html', ''), ruw, gz });
    if (gz > GRENS_KB * 1024) {
      fouten.push(`${map}/${b}: ${kb(gz)} KB gzip, boven de grens van ${GRENS_KB} KB`);
    }
  }
}

rijen.sort((a, b) => b.gz - a.gz);
console.log('worst case per creatie: snippet + css + js + svg + fonts + de twee zwaarste foto\'s');
console.log('zwaarste foto\'s: ' + zwaarste2.map(p => p.f + ' ' + kb(p.n) + ' KB').join(', '));
console.log('');
console.log('  creatie'.padEnd(34) + 'gzip KB'.padStart(9) + 'ruw KB'.padStart(9));
for (const r of rijen) {
  console.log('  ' + r.naam.padEnd(32) + kb(r.gz).padStart(9) + kb(r.ruw).padStart(9));
}
console.log('');
console.log(`${rijen.length} creaties, zwaarste ${kb(rijen[0].gz)} KB gzip / ${kb(rijen[0].ruw)} KB ruw`);
console.log(`ruwe bytes boven ${GRENS_KB} KB: ${rijen.filter(r => r.ruw > GRENS_KB * 1024).length}`);

if (fouten.length) {
  console.log('\nBOVEN DE GRENS:');
  fouten.forEach(f => console.log('  ' + f));
  process.exit(1);
}
console.log(`geen creatie boven ${GRENS_KB} KB gzip`);
