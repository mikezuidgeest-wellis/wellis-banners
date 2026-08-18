/**
 * Cross-browser test voor de GetWellis Awin-bannerset.
 *
 * Draait tegen de LIVE GitHub Pages-URL's, in Blink, Gecko en WebKit.
 * WebKit is de engine van Safari op macOS en van ELKE browser op iOS -
 * ook Chrome en Firefox op iPhone draaien WebKit. Dat is precies het gat
 * dat in een Linux-sandbox niet te dichten is.
 *
 * Draaien:
 *   cd _BROWSERTEST
 *   npm install
 *   npm test                                # alle engines
 *   npx playwright test --project=webkit    # alleen de Safari-engine
 *   npm run rapport                         # HTML-rapport met screenshots
 *
 * De eerste run legt de referentiescreenshots vast. Elke volgende run
 * vergelijkt daartegen en laat het pixelverschil zien.
 */
const { test, expect } = require('@playwright/test');

const FORMATEN = [
  '300x50', '320x50', '468x60', '728x90', '970x90',
  '300x100', '320x100', '200x200', '250x250', '300x200',
  '300x250', '320x240', '336x280', '120x600', '160x600', '300x600',
];

const TALEN = [
  { code: 'nl', pad: (f) => `${f}/`, klik: 'https://www.getwellis.com/' },
  { code: 'de', pad: (f) => `de/${f}/`, klik: 'https://www.getwellis.de/' },
];

/**
 * Zet de banner in een deterministische toestand. Zonder dit is elke
 * screenshot anders: de randomizer kiest andere foto's, de rotatie staat op
 * een andere slide en de Trustpilot-teller loopt op.
 */
async function bevries(page) {
  await page.evaluate(() => {
    const ad = document.querySelector('.ad-container');
    if (!ad) return;
    for (let i = 1; i < 50000; i++) { clearInterval(i); clearTimeout(i); }
    ad.classList.add('is-loaded');
    ad.classList.remove('is-settled');
    document.querySelectorAll('.ad-container, .ad-container *').forEach((el) => {
      el.style.animation = 'none';
      el.style.transition = 'none';
    });
    document.querySelectorAll('.slide').forEach((s, i) => s.classList.toggle('is-active', i === 0));
    const c = document.querySelector('#tp-counter');
    if (c) c.textContent = '2.720';
  });
  await page.waitForTimeout(250);
}

for (const taal of TALEN) {
  test.describe(taal.code.toUpperCase(), () => {
    for (const formaat of FORMATEN) {
      const [W, H] = formaat.split('x').map(Number);

      test(`${formaat} - foutloos, juiste maat, niets buiten de rand`, async ({ page }) => {
        const fouten = [];
        page.on('pageerror', (e) => fouten.push('js: ' + e.message.split('\n')[0]));
        // De browser vraagt bij elke top-level navigatie zelf /favicon.ico op.
        // Die bestaat niet op GitHub Pages en hoort er ook niet te zijn: in
        // Awin wordt de banner geinjecteerd, dus die request valt daar nooit.
        // Meetellen zou elke test laten falen op iets dat de banner niet raakt.
        const negeer = (u) => /favicon\.ico$/.test(u || '');
        page.on('response', (r) => {
          if (r.status() >= 400 && !negeer(r.url())) fouten.push('http ' + r.status() + ': ' + r.url());
        });
        page.on('requestfailed', (r) => { if (!negeer(r.url())) fouten.push('netwerk: ' + r.url()); });
        page.on('console', (m) => {
          if (m.type() !== 'error') return;
          const t = m.text();
          // Chrome meldt een 404 twee keer: als response en als consoleregel
          // zonder URL. De responsehook hierboven is de betrouwbare bron.
          if (/Failed to load resource/.test(t)) return;
          fouten.push('console: ' + t);
        });

        // Math.random pinnen VOOR de scripts draaien, anders kiest de
        // randomizer elke run andere content en is elke diff betekenisloos.
        // window.open afvangen: we willen de klikbestemming meten, niet een
        // tab openen naar de echte site.
        await page.addInitScript(() => {
          Math.random = () => 0.42;
          window.__geopend = [];
          window.open = (u) => { window.__geopend.push(u); return null; };
        });
        await page.goto(taal.pad(formaat), { waitUntil: 'load' });

        // Fonts moeten geladen zijn voordat we tekst opmeten, anders meet je
        // de fallback-letter en verschilt elke engine per definitie.
        await page.evaluate(() => document.fonts && document.fonts.ready);
        await page.waitForTimeout(3500);
        await bevries(page);

        // 1. Geen enkele fout
        expect(fouten, 'console-, js- en netwerkfouten').toEqual([]);

        // 2. Geinitialiseerd. Dit was de Awin-productiebug: zonder is-loaded
        //    blijft de prijssticker staan op scale(.6) rotate(-15deg).
        await expect(page.locator('.ad-container')).toHaveClass(/is-loaded/);

        // 3. Exacte IAB-afmeting
        const doos = await page.locator('.ad-container').boundingBox();
        expect(Math.round(doos.width), 'breedte').toBe(W);
        expect(Math.round(doos.height), 'hoogte').toBe(H);

        // 4. Niets steekt buiten de banner uit
        const uitsteker = await page.evaluate(() => {
          const ad = document.querySelector('.ad-container');
          const a = ad.getBoundingClientRect();
          const raak = [];
          ad.querySelectorAll('.price-container,.cta-button,.trust-container,.headline,.logo-image,.hero-container')
            .forEach((e) => {
              const r = e.getBoundingClientRect();
              if (r.width === 0 && r.height === 0) return;
              if (r.left - a.left < -0.5 || a.right - r.right < -0.5 ||
                  r.top - a.top < -0.5 || a.bottom - r.bottom < -0.5) {
                raak.push(e.className + ' @ ' + Math.round(r.left - a.left) + ',' +
                          Math.round(r.top - a.top) + ' ' +
                          Math.round(r.width) + 'x' + Math.round(r.height));
              }
            });
          return raak;
        });
        expect(uitsteker, 'elementen buiten de banner').toEqual([]);

        // 5. Geen afgekapte tekst
        const afgekapt = await page.evaluate(() => {
          const uit = [];
          document.querySelectorAll('.headline,.cta-label,.tp-reviews').forEach((e) => {
            if (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1) {
              uit.push(e.className + ' ' + e.scrollWidth + '>' + e.clientWidth);
            }
          });
          return uit;
        });
        expect(afgekapt, 'afgekapte tekst').toEqual([]);

        // 6. De inset-fallback moet werken. Safari onder 14.1 kent `inset`
        //    niet; zonder de longhand-fallback wordt deze laag 0x0 en
        //    verdwijnen de achtergrond en de hero-foto.
        const laag = await page.locator('.bg-color').first().boundingBox();
        expect(Math.round(laag.width), 'bg-color breedte (inset-fallback)').toBe(W);
        expect(Math.round(laag.height), 'bg-color hoogte (inset-fallback)').toBe(H);

        // 7. De randomizer heeft echt content gezet
        const gevuld = await page.evaluate(() => {
          const k = document.querySelector('#headlineA');
          const f = document.querySelector('#personA');
          return { kop: k ? k.textContent.trim().length : 0, foto: f ? (f.getAttribute('src') || '') : '' };
        });
        expect(gevuld.kop, 'kop is gevuld').toBeGreaterThan(4);
        if (gevuld.foto) expect(gevuld.foto).toMatch(/\.(webp|png|jpg)/);

        // 8. Visuele regressie, per engine een eigen referentiebeeld.
        //    Alleen lokaal. In CI is de runner elke keer schoon, dus daar
        //    bestaat nooit een referentiebeeld: elke run zou eerst falen,
        //    opnieuw draaien en de vergelijking alsnog niet uitvoeren. Puur
        //    verloren tijd. De functionele controles hierboven draaien wel.
        if (!process.env.CI) {
          await expect(page.locator('.ad-container')).toHaveScreenshot(
            `${taal.code}-${formaat}.png`, { animations: 'disabled' }
          );
        }

        // 9. De klik gaat naar het juiste domein. De Duitse set moet naar
        //    getwellis.de; die leidde eerder naar getwellis.com doordat
        //    script.js een enkele harde terugvaloptie voor beide talen had.
        //    Bewust NA de screenshot: een klik zet :active- en :focus-stijlen
        //    en zou het referentiebeeld vervuilen.
        await page.locator('.ad-container').click({ force: true });
        const geopend = await page.evaluate(() => window.__geopend);
        expect(geopend, 'klik opende geen URL').toHaveLength(1);
        expect(geopend[0], 'klikbestemming').toBe(taal.klik);
      });
    }

    test('rotatie stopt op 15s (IAB) - 300x250', async ({ page }) => {
      await page.addInitScript(() => { Math.random = () => 0.42; });
      await page.goto(taal.pad('300x250'), { waitUntil: 'load' });

      const meting = await page.evaluate(() => new Promise((klaar) => {
        const t0 = performance.now();
        const ad = document.querySelector('.ad-container');
        const slides = [...document.querySelectorAll('.slide')];
        const wissels = [];
        let vorige = null;
        const tik = setInterval(() => {
          const t = +((performance.now() - t0) / 1000).toFixed(2);
          const actief = slides.findIndex((s) => s.classList.contains('is-active'));
          if (actief !== vorige) { wissels.push(t); vorige = actief; }
          if (performance.now() - t0 > 19000) {
            clearInterval(tik);
            klaar({
              wissels,
              bevroren: ad.classList.contains('is-frozen'),
              ctaZichtbaar: +getComputedStyle(ad.querySelector('.cta-button')).opacity,
            });
          }
        }, 100);
      }));

      expect(meting.wissels.length, 'aantal slidewissels').toBeGreaterThan(1);
      expect(meting.bevroren, 'is-frozen na 15s').toBe(true);
      expect(meting.wissels.filter((t) => t > 16), 'wissels na de 15s-grens').toEqual([]);
      expect(meting.ctaZichtbaar, 'CTA zichtbaar in het eindframe').toBeGreaterThan(0.9);
    });
  });
}

/**
 * De Awin-realiteit: de HTML wordt in een AL GELADEN pagina geinjecteerd,
 * dus window.load is allang gevallen. Dat was de oorspronkelijke
 * productiebug. Plus vijandige publisher-CSS met !important.
 */
test.describe('Awin-injectie', () => {
  for (const formaat of ['300x250', '728x90', '300x600']) {
    test(`${formaat} - injectie na load + vijandige publisher-CSS`, async ({ page }) => {
      const fouten = [];
      page.on('pageerror', (e) => fouten.push('js: ' + e.message.split('\n')[0]));

      await page.addInitScript(() => { Math.random = () => 0.42; });
      await page.goto(`${formaat}/`, { waitUntil: 'load' });

      const snippet = await page.evaluate(() => ({
        body: document.body.innerHTML,
        srcs: [...document.querySelectorAll('script[src]')].map((s) => s.src),
        inline: [...document.querySelectorAll('script:not([src])')].map((s) => s.textContent),
        css: document.querySelector('link[rel=stylesheet]').href,
      }));

      await page.evaluate(({ body, srcs, inline, css }) => {
        document.documentElement.innerHTML = '<head></head><body></body>';
        const vuil = document.createElement('style');
        vuil.textContent =
          '*,*::before,*::after{box-sizing:content-box!important}' +
          'html{font-size:20px}' +
          'body{font-family:Georgia,serif;font-size:18px;line-height:1.8;letter-spacing:.05em;margin:24px}' +
          'img{max-width:100%!important;height:auto!important;border:2px solid red;display:inline}' +
          'div{margin:0 0 12px 0;padding:2px}' +
          'span{letter-spacing:.1em;text-transform:uppercase}';
        document.head.appendChild(vuil);
        const l = document.createElement('link');
        l.rel = 'stylesheet'; l.href = css;
        document.head.appendChild(l);
        document.body.innerHTML = '<h1>Publisher</h1><p>Artikeltekst.</p>' + body;
        inline.forEach((t) => { const s = document.createElement('script'); s.textContent = t; document.body.appendChild(s); });
        srcs.forEach((src) => { const s = document.createElement('script'); s.src = src; s.async = false; document.body.appendChild(s); });
      }, snippet);

      await page.waitForTimeout(4500);
      await bevries(page);

      expect(fouten).toEqual([]);
      // De kern: initialiseert de banner ook als window.load al gevallen is?
      await expect(page.locator('.ad-container')).toHaveClass(/is-loaded/);

      const [W, H] = formaat.split('x').map(Number);
      const doos = await page.locator('.ad-container').boundingBox();
      expect(Math.round(doos.width), 'breedte onder vijandige CSS').toBe(W);
      expect(Math.round(doos.height), 'hoogte onder vijandige CSS').toBe(H);

      // De publisher zet img{border:2px solid red}. Onze reset moet dat blokkeren.
      const rand = await page.evaluate(() => {
        const i = document.querySelector('.ad-container img');
        return i ? getComputedStyle(i).borderTopWidth : '0px';
      });
      expect(rand, 'publisher-rand op onze afbeeldingen').toBe('0px');
    });
  }
});

/**
 * De entree mag niet afhangen van requestAnimationFrame.
 *
 * rAF wordt volledig bevroren zolang de inhoud niet gerenderd wordt: een
 * achtergrondtab, een iframe buiten beeld, of een preview die de browser nog
 * niet tekent. Gebeurde dat, dan werd 'is-loaded' nooit gezet en bleef ALLES
 * op opacity 0: een lege teal doos met onzichtbare tekst erin. Precies wat de
 * Awin-preview liet zien - kop netjes gevuld, opacity 0.
 *
 * Deze test blokkeert rAF volledig en eist dat de banner alsnog zichtbaar
 * wordt. Zonder de setTimeout-vangnet in script.js faalt hij.
 */
test.describe('zonder requestAnimationFrame', () => {
  for (const taal of TALEN) {
    for (const formaat of ['300x250', '728x90', '300x600']) {
      test(`${taal.code} ${formaat} - wordt zichtbaar zonder rAF`, async ({ page }) => {
        await page.addInitScript(() => {
          Math.random = () => 0.42;
          // volledig doodleggen, niet vertragen: dat is wat een niet-gerenderd
          // iframe effectief doet
          window.requestAnimationFrame = function () { return 0; };
        });
        await page.goto(taal.pad(formaat), { waitUntil: 'load' });
        await page.waitForTimeout(4000);

        await expect(page.locator('.ad-container')).toHaveClass(/is-loaded/);

        const zicht = await page.evaluate(() => {
          const o = (s) => { const e = document.querySelector(s); return e ? +getComputedStyle(e).opacity : null; };
          const kop = document.querySelector('.slide.is-active .headline') || document.querySelector('#headlineA');
          return {
            kopOpacity: kop ? +getComputedStyle(kop).opacity : null,
            kopTekst: kop ? kop.textContent.trim().length : 0,
            cta: o('.cta-button'),
            logo: o('.logo-container'),
          };
        });
        expect(zicht.kopTekst, 'kop is gevuld').toBeGreaterThan(4);
        expect(zicht.kopOpacity, 'kop zichtbaar').toBeGreaterThan(0.9);
        expect(zicht.cta, 'CTA zichtbaar').toBeGreaterThan(0.9);
        if (zicht.logo !== null) expect(zicht.logo, 'logo zichtbaar').toBeGreaterThan(0.9);
      });
    }
  }
});
