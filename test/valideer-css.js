/**
 * Syntaxvalidatie van elke CSS-declaratie in de uploadmap.
 *
 * Dit vangt precies de foutklasse die eerder ongemerkt live is gegaan:
 * een kapotte waarde als `height:12p!importantx`. Zo'n declaratie is
 * ongeldig, de browser gooit hem stil weg, en je ziet pas iets als de
 * layout in een randgeval instort.
 *
 * Draaien: npm run css-lint
 */
const csstree = require('css-tree');
const fs = require('fs');
const path = require('path');

const MAP = path.join(__dirname, '..');
// Custom properties en @font-face-descriptors staan niet in het
// property-lexicon. Die overslaan is geen gaatje maar een correctie van een
// blinde vlek in de checker.
const OVERSLAAN = ['src', 'font-display', 'unicode-range', 'ascent-override', 'size-adjust'];

let totaal = 0;
const fouten = [];

for (const d of fs.readdirSync(MAP).filter((x) => /^\d+x\d+$/.test(x))) {
  const bestand = path.join(MAP, d, 'styles.css');
  if (!fs.existsSync(bestand)) continue;
  const css = fs.readFileSync(bestand, 'utf8');

  if ((css.match(/\{/g) || []).length !== (css.match(/\}/g) || []).length) {
    fouten.push(`${d}: accolades niet in balans`);
  }
  const kapot = css.match(/!important[a-z%]/g);
  if (kapot) fouten.push(`${d}: kapotte !important-declaratie (${kapot.length}x)`);
  const dood = css.match(/\.ad-container\s+\.ad-container/g);
  if (dood) fouten.push(`${d}: dode dubbele selector .ad-container .ad-container (${dood.length}x)`);

  const ast = csstree.parse(css, {
    positions: true,
    onParseError(e) { fouten.push(`${d}: parsefout - ${e.message}`); },
  });

  csstree.walk(ast, {
    visit: 'Declaration',
    enter(node) {
      if (node.property.startsWith('--') || OVERSLAAN.includes(node.property)) return;
      totaal++;
      if (csstree.lexer.checkPropertyName(node.property)) {
        fouten.push(`${d} r${node.loc.start.line}: onbekende property "${node.property}"`);
        return;
      }
      const m = csstree.lexer.matchDeclaration(node);
      if (m.error && m.error.name === 'SyntaxMatchError') {
        fouten.push(`${d} r${node.loc.start.line}: ongeldige waarde - ${node.property}: ${csstree.generate(node.value).slice(0, 60)}`);
      }
    },
  });
}

console.log(`declaraties gecontroleerd: ${totaal}`);
if (fouten.length === 0) {
  console.log('geen fouten');
} else {
  console.log(`\n${fouten.length} FOUTEN:`);
  fouten.forEach((f) => console.log('  ' + f));
  process.exit(1);
}
