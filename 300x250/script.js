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
var ROOT = document.getElementById('ad-container');
if (!ROOT) return;
if (ROOT.getAttribute('data-gw-init') === '1') return;
ROOT.setAttribute('data-gw-init', '1');

// ClickTag blijft bewust op window: ad servers (DV360, CM360, GDN, Adform,
// Sizmek, Weborama) injecteren window.clickTag at runtime.
if (typeof window.clickTag === "undefined") {
    window.clickTag = "https://www.getwellis.com";
}
var clickTag = window.clickTag;

function fireClickThrough() {
    window.open(window.clickTag || clickTag, '_blank');
}

(function bindClickSurface() {
    var surface = ROOT;
    surface.addEventListener('click', fireClickThrough);
    surface.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            fireClickThrough();
        }
    });
})();

// 2. Banner Core Logic
var BannerSystem = {
    init: function() {
        this.cacheDOM();
        requestAnimationFrame(() => {
            this.startEntranceSequence();
            this.initTrustpilotCounter();
            this.initStoryRotation();
            this.initStickerReplay();
        });
        this.freezeTimer = setTimeout(() => this.freeze(), this.MAX_ANIM_MS);
    },

    MAX_ANIM_MS: 15000,
    STICKER_REPOP_EVERY_MS: 15000,
    frozen: false,

    freeze: function() {
        this.frozen = true;
        clearInterval(this.rotationTimer);
        clearTimeout(this.counterTimer);
        clearTimeout(this.stickerTimer);
        if (this.container) this.container.classList.add('is-frozen');
    },

    cacheDOM: function() {
        this.container = ROOT;
        this.tpCounter = document.getElementById('tp-counter');
        this.slidesWrapper = document.getElementById('story-system');
        this.slides = document.querySelectorAll('.slide');
    },

    startEntranceSequence: function() {
        this.container.classList.add('is-loaded');
        setTimeout(() => {
            this.container.classList.add('is-settled');
        }, 1800);
    },

    initTrustpilotCounter: function() {
        const PLATEAU = 2641;
        let current = 2637;

        const render = () => {
            if (this.tpCounter) this.tpCounter.textContent = current.toLocaleString('nl-NL');
        };
        render();

        const tick = () => {
            if (this.frozen) return;
            current += 1;
            render();
            let delay;
            if (current < PLATEAU) {
                const r = Math.random();
                if      (r < 0.30) delay = 110  + Math.random() * 210;
                else if (r < 0.64) delay = 400  + Math.random() * 800;
                else if (r < 0.86) delay = 1300 + Math.random() * 900;
                else               delay = 2300 + Math.random() * 1100;
            } else {
                delay = 86400000;
            }
            this.counterTimer = setTimeout(tick, delay);
        };

        this.counterTimer = setTimeout(tick, 2000);
    },

    initStoryRotation: function() {
        if (this.slides.length <= 1) return;
        let currentSlide = 0;
        const totalSlides = this.slides.length;
        const slideDuration = 4000;

        this.rotationTimer = setInterval(() => {
            this.slides[currentSlide].classList.remove('is-active');
            currentSlide = (currentSlide + 1) % totalSlides;
            this.slides[currentSlide].classList.add('is-active');
            this.retriggerTextAnim(this.slides[currentSlide]);
        }, slideDuration);
    },

    initStickerReplay: function() {
        var sticker = document.querySelector('.price-container');
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

        var period = this.STICKER_REPOP_EVERY_MS;
        this.stickerTimer = setTimeout(function tick() {
            popOut();
            self.stickerTimer = setTimeout(tick, period);
        }, period / 2);
    },

    retriggerTextAnim: function(slideElement) {
        const lines = slideElement.querySelectorAll('.headline');
        lines.forEach(line => {
            const fromLeft = line.classList.contains('line-1');
            line.style.transition = 'none';
            line.style.transform = 'translateX(' + (fromLeft ? '-38px' : '38px') + ')';
            line.style.opacity = '0';
            line.style.filter = 'blur(5px)';
            void line.offsetWidth;
            line.style.transition = '';
            line.style.transform = '';
            line.style.opacity = '';
            line.style.filter = '';
        });
    }
};

/* ---------------------------------------------------------------------
   BOOTSTRAP - kritieke fix voor embedded/Awin-omgevingen.

   Voorheen: window.addEventListener('load', ...). Dat event vuurt EENMALIG.
   Wanneer een ad-editor of publisher de banner-HTML injecteert in een
   document dat al klaar is (readyState 'complete'), is 'load' allang
   gepasseerd en draaide init() nooit. Gevolg: de klasse 'is-loaded' werd
   niet gezet, waardoor prijssticker, CTA, headline en Trustpilot-balk
   permanent op opacity:0 bleven staan -> lege teal box.

   Nu: direct starten als het document al geladen is, anders wachten op
   'load'. Zelfde patroon als randomizer.js al gebruikte.
   --------------------------------------------------------------------- */
function boot() { BannerSystem.init(); }

if (document.readyState === 'complete') {
    boot();
} else {
    window.addEventListener('load', boot, { once: true });
}

})();
