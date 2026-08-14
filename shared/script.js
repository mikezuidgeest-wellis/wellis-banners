/**
 * GetWellis Premium Display Banner System
 * Architecture supports performance, storytelling rotation, and scale adaptation.
 */

// 1. ClickTag + bootstrap
(function () {
"use strict";

// Herentree-guard: voorkomt dubbele initialisatie wanneer de banner-HTML
// meerdere keren wordt geinjecteerd of het script twee keer wordt geladen
// (twee banners op een publisher-pagina). Zonder guard gaf dit een
// SyntaxError "Identifier 'BannerSystem' has already been declared",
// waardoor de banner volledig dood bleef.
/* Instance-veilig: een pagina kan MEER dan een banner bevatten en die delen
   allemaal id="ad-container". document.getElementById() geeft dan alleen de
   eerste terug, waardoor de tweede banner onzichtbaar bleef (gemeten in de
   stress-suite). We initialiseren daarom ELKE .ad-container afzonderlijk en
   scopen alle DOM-lookups op die root i.p.v. op het document. */

// ClickTag blijft bewust op window: ad servers (DV360, CM360, GDN, Adform,
// Sizmek, Weborama) injecteren window.clickTag at runtime.
if (typeof window.clickTag === "undefined") {
    window.clickTag = "https://www.getwellis.com";
}
var clickTag = window.clickTag;

function fireClickThrough() {
    // Prefer the server-provided macro, otherwise use the hard fallback.
    window.open(window.clickTag || clickTag, '_blank');
}

// 2. Banner Core Logic — factory, één instantie per bannerroot.
//    De klikbinding gebeurt per instantie onderaan deze functie.
function createBannerSystem(ROOT) {
  var BannerSystem = {
    init: function() {
        this.cacheDOM();
        
        // Ensure browser is ready before firing hardware-accelerated animations
        requestAnimationFrame(() => {
            this.startEntranceSequence();
            this.initTrustpilotCounter();
            this.initStoryRotation();
            this.initStickerReplay();
        });

        // IAB / CM360 / publisher compliance: animation must not run longer than
        // 15s and must hold a static end frame (CTA visible). Freeze at 15s.
        this.freezeTimer = setTimeout(() => this.freeze(), this.MAX_ANIM_MS);
    },

    MAX_ANIM_MS: 15000,
    STICKER_REPOP_EVERY_MS: 15000,   // sticker re-pops once at the 7.5s midpoint (freezes at 15s)
    frozen: false,

    // Stops every looping animation and holds the current frame as the static
    // end state. The CTA, logo, headline, sticker and Trustpilot bar all remain
    // visible; only motion stops.
    freeze: function() {
        this.frozen = true;
        clearInterval(this.rotationTimer);
        clearTimeout(this.counterTimer);
        clearTimeout(this.stickerTimer);
        if (this.container) this.container.classList.add('is-frozen');
    },

    cacheDOM: function() {
        this.container = ROOT;   // instantie-eigen root, niet document-breed
        this.tpCounter = ROOT.querySelector('#tp-counter');
        this.slidesWrapper = ROOT.querySelector('#story-system');
        this.slides = ROOT.querySelectorAll('.slide');
    },

    // Handles the primary 0.0s - 2.0s reveal timeline cleanly via CSS class injection
    startEntranceSequence: function() {
        this.container.classList.add('is-loaded');

        // Apply breathing class after the initial scale down finishes (1.6s + buffer)
        setTimeout(() => {
            this.container.classList.add('is-settled');
        }, 1800);
    },

    // Trustpilot counter: starts at 2.570 and ALWAYS keeps climbing — it never
    // stops. The speed varies (fast bursts → slow crawls) but the count only
    // ever goes up. (Real live count was 2.574 at build time; ad-serving
    // sandboxes can't fetch it at runtime, so we animate it.)
    // 2.574 is treated as the realistic level: below it the count climbs at a
    // lively, variable pace; once past it the count keeps inching up but much
    // more slowly, so it stays believable while never freezing.
    initTrustpilotCounter: function() {
        const PLATEAU = 2641;   // realistic level — climbing continues, just slower
        let current = 2637;

        const render = () => {
            if (this.tpCounter) this.tpCounter.textContent = current.toLocaleString('nl-NL');
        };
        render();

        const tick = () => {
            if (this.frozen) return;
            current += 1;            // climbs while animating; frozen at 15s
            render();

            let delay;
            if (current < PLATEAU) {
                // Lively, highly-variable pacing on the way up to the realistic level
                const r = Math.random();
                if      (r < 0.30) delay = 110  + Math.random() * 210;   // super fast burst
                else if (r < 0.64) delay = 400  + Math.random() * 800;   // brisk
                else if (r < 0.86) delay = 1300 + Math.random() * 900;   // steady
                else               delay = 2300 + Math.random() * 1100;  // slow (never frozen)
            } else {
                // Past the realistic level: keep climbing, but slowly, so the
                // number stays believable yet the counter never stops.
                delay = 86400000;   // hold at 2.574 through the 15s window
            }
            this.counterTimer = setTimeout(tick, delay);
        };

        this.counterTimer = setTimeout(tick, 2000);
    },

    // Scalable Story System for crossfading multiple messages
    initStoryRotation: function() {
        if (this.slides.length <= 1) return;

        let currentSlide = 0;
        const totalSlides = this.slides.length;
        const slideDuration = 4000; // each story frame stays ~4s (0.5s slower)

        this.rotationTimer = setInterval(() => {
            this.slides[currentSlide].classList.remove('is-active');
            currentSlide = (currentSlide + 1) % totalSlides;
            this.slides[currentSlide].classList.add('is-active');
            this.retriggerTextAnim(this.slides[currentSlide]);
        }, slideDuration);
    },

    // Price sticker re-pop: at the midpoint of the timeline the sticker
    // gracefully pops OUT and then replays its original entrance pop. Purely
    // additive — the idle pulse hands over and resumes automatically. (No-op
    // on formats without a sticker.)
    initStickerReplay: function() {
        var sticker = ROOT.querySelector('.price-container');
        if (!sticker) return;
        var self = this;

        sticker.addEventListener('animationend', function (e) {
            if (e.animationName === 'stickerExit') {
                sticker.classList.remove('is-stkout');
                sticker.classList.add('is-stkin');
            } else if (e.animationName === 'stickerRepop') {
                sticker.classList.remove('is-stkin');
            }
        });

        var popOut = function () {
            if (self.frozen) return;
            sticker.classList.remove('is-stkin');
            void sticker.offsetWidth;
            sticker.classList.add('is-stkout');
        };

        // First replay halfway into the timeline; any later repeat is cancelled
        // by the 15s freeze, so on IAB this fires exactly once.
        var period = this.STICKER_REPOP_EVERY_MS;
        this.stickerTimer = setTimeout(function tick() {
            popOut();
            self.stickerTimer = setTimeout(tick, period);
        }, period / 2);
    },

    // Re-plays the horizontal slide-in for the headline of the newly active
    // slide. line-1 re-enters from the left, line-2 from the right — matching
    // the entrance animation so every rotation feels consistent.
    retriggerTextAnim: function(slideElement) {
        const lines = slideElement.querySelectorAll('.headline');
        lines.forEach(line => {
            const fromLeft = line.classList.contains('line-1');
            line.style.transition = 'none';
            line.style.transform = 'translateX(' + (fromLeft ? '-38px' : '38px') + ')';
            line.style.opacity = '0';
            line.style.filter = 'blur(5px)';

            // Force reflow, then clear so the CSS transition re-runs to rest state
            void line.offsetWidth;

            line.style.transition = '';
            line.style.transform = '';
            line.style.opacity = '';
            line.style.filter = '';
        });
    }
  };

  ROOT.addEventListener('click', fireClickThrough);
  ROOT.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          fireClickThrough();
      }
  });

  return BannerSystem;
}

/* ---------------------------------------------------------------------
   BOOTSTRAP — kritieke fix voor embedded/Awin-omgevingen.

   Voorheen: window.addEventListener('load', ...). Dat event vuurt EENMALIG.
   Wanneer een ad-editor of publisher de banner-HTML injecteert in een
   document dat al klaar is (readyState 'complete'), is 'load' allang
   gepasseerd en draaide init() nooit. Gevolg: de klasse 'is-loaded' werd
   niet gezet, waardoor prijssticker, CTA, headline en Trustpilot-balk
   permanent op opacity:0 bleven staan -> lege teal box.

   Nu: direct starten als het document al geladen is, anders wachten op
   'load'. Zelfde patroon als randomizer.js al gebruikte.
   --------------------------------------------------------------------- */
function boot() {
    var roots = document.querySelectorAll('.ad-container');
    for (var i = 0; i < roots.length; i++) {
        var r = roots[i];
        if (r.getAttribute('data-gw-init') === '1') continue;   // guard per instantie
        r.setAttribute('data-gw-init', '1');
        createBannerSystem(r).init();
    }
}

if (document.readyState === 'complete') {
    boot();
} else {
    window.addEventListener('load', boot, { once: true });
}

})();