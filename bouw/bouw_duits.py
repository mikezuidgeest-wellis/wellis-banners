#!/usr/bin/env python3
"""
Bouwt de DUITSE bannerset als aparte set, naast de Nederlandse.

Uitgangspunten (vastgelegd in _i18n.js, geverifieerd voor de bouw):
  - Duitse marktprijs 172 EUR, notatie "172 €" met smalle vaste spatie (DIN/Duden)
  - score met komma: 4,7
  - Trustpilot: "basierend auf N+ Bewertungen." met lengtevarianten per formaat
  - zachte afbreekstreepjes voor lange samenstellingen
  - korte DE-varianten voor twee lange koppen op smalle formaten
  - Duitse bezorg-trefwoorden voor het verpakkingsmechanisme

Structuur die eruit komt:
  de/<formaat>/index.html      losse Duitse pagina (voor preview en controle)
  _AWIN_SNIPPETS_DE/<f>.html   HTML om in Awin te plakken

De Duitse set deelt bewust drie dingen met de Nederlandse:
  - /assets/           afbeeldingen en fonts zijn taalneutraal
  - /shared/*.js       dezelfde geverifieerde logica, inclusief _i18n.js
  - /<formaat>/styles.css   de geometrie is per FORMAAT, niet per taal
Alleen de copy verschilt, en die zit volledig in _i18n.js. Een correctie aan de
layout komt daardoor automatisch in beide talen terecht.

Taal wordt gezet via window.LANG = "de" vóór de scripts. Bewust niet via
?lang=de in de URL: Awin plaatst geen queryparameters achter een creatief.

Gebruik: python3 bouw_duits.py
"""
import os as _os
_HIER = _os.path.dirname(_os.path.abspath(__file__))
_REPO = _os.path.dirname(_HIER)
import re, os, shutil, json

BRON = _os.path.join(_REPO, "bron")
UIT  = _os.path.join(_REPO, ".build", "de")
CDN  = "https://mikezuidgeest-wellis.github.io/wellis-banners"

# Bestemming van de klik voor de Duitse set. Eigen domein: de Duitse banners
# leidden eerder naar getwellis.com omdat er een enkele harde terugvaloptie
# voor beide talen in script.js stond. Dit is de enige plek waar het
# DE-domein staat.
KLIK_URL = "https://www.getwellis.de/"


def _js_dict(js, naam):
    """Leest een JS-objectliteral 'var NAAM = {...}' als dict.

    _i18n.js blijft de ENIGE plek waar de Duitse copy staat. De bouw leest die
    tabellen, zodat er geen tweede lijst ontstaat die kan gaan afwijken. Wordt
    er een tekst gewijzigd in _i18n.js, dan volgt de markup automatisch bij de
    volgende bouw.
    """
    m = re.search(r"var\s+" + naam + r"\s*=\s*\{", js)
    if not m:
        return {}
    i = m.end() - 1
    diepte, j = 0, i
    while j < len(js):
        if js[j] == "{":
            diepte += 1
        elif js[j] == "}":
            diepte -= 1
            if diepte == 0:
                break
        j += 1
    body = js[i + 1:j]
    uit = {}
    # json.loads en niet unicode_escape: dat laatste behandelt al gedecodeerde
    # UTF-8 als latin-1 en maakt van een en-dash een "a met dakje".
    for k, v in re.findall(r'"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"', body):
        uit[json.loads('"' + k + '"')] = json.loads('"' + v + '"')
    return uit


def _js_lijst(js, naam):
    m = re.search(r"var\s+" + naam + r"\s*=\s*\[(.*?)\];", js, re.S)
    if not m:
        return []
    return [json.loads('"' + x + '"') for x in re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1))]


def _js_tekst(js, naam):
    m = re.search(r'var\s+' + naam + r'\s*=\s*"([^"]*)"', js)
    return m.group(1) if m else None


_I18N = open(os.path.join(BRON, "shared", "_i18n.js"), encoding="utf-8").read()
DE_PRICE = _js_tekst(_I18N, "DE_PRICE")
HEAD = _js_dict(_I18N, "HEAD")
UI = _js_dict(_I18N, "UI")
HYPHENATE_DE = _js_dict(_I18N, "HYPHENATE_DE")
DELIVERY_DE = _js_lijst(_I18N, "DELIVERY_DE")
assert DE_PRICE and HEAD and UI, "vertaaltabellen niet uit _i18n.js gelezen"


def duitse_copy(body):
    """Zet de Duitse teksten IN de markup.

    Voorheen was de Duitse markup honderd procent Nederlands en maakte
    _i18n.js er in de browser Duits van. Viel dat bestand weg - netwerkfout,
    blokkade, adblocker - dan zag een Duitse bezoeker EUR149 in plaats van
    172 EUR. Geen foutmelding, alleen een verkeerde prijs op een andere markt.
    Dat is geen taalprobleem maar een prijsprobleem.

    Nu staat de Duitse copy in de code. _i18n.js blijft meegeladen voor de
    Trustpilot-regel, die per formaat een passende lengtevariant kiest omdat
    Duits langer is dan Nederlands. Valt dat script weg, dan is de banner nog
    volledig Duits en staat alleen die ene regel niet optimaal afgebroken.
    """
    # Standaardkop in de markup. Zonder JavaScript vult randomizer.js niets en
    # stond er brand, prijs en CTA maar GEEN boodschap. Gemeten: kop leeg terwijl
    # de rest zichtbaar was. De Duitse tegenhanger van de Nederlandse seed.
    standaard_kop = HEAD.get("Start met medisch afvallen.", "Jetzt medizinisch abnehmen.")
    body = re.sub(r'(<div class="headline" id="headline[AB]"[^>]*>)\s*(</div>)',
                  lambda m: m.group(1) + standaard_kop + m.group(2), body)

    # data-skip-headlines bevat NEDERLANDSE strings. Die matchen na vertaling
    # nergens op, dus de opt-out was in het Duits stil uitgeschakeld - juist waar
    # je hem wilt, want Duits is langer. Waarden meevertalen.
    def skip(m):
        koppen = [HEAD.get(k.strip(), k.strip()) for k in m.group(1).split("|")]
        return 'data-skip-headlines="' + "|".join(koppen) + '"'
    body = re.sub(r'data-skip-headlines="([^"]*)"', skip, body)

    # CTA-label en de kleine prijslabels
    def vervang_tekst(klasse, m_body):
        def f(m):
            nl = m.group(2).strip()
            return m.group(1) + UI.get(nl, nl) + m.group(3)
        return re.sub(r'(<span class="' + klasse + r'"[^>]*>)([^<]*)(</span>)', f, m_body)

    for kl in ("cta-label", "price-sub price-vanaf", "price-sub", "brand-sub"):
        body = vervang_tekst(re.escape(kl), body)

    # prijs: Duits gebruikt bedrag + smalle vaste spatie + euroteken (DIN/Duden)
    body = re.sub(r'(<span class="price-main"[^>]*>)[^<]*(</span>)',
                  lambda m: m.group(1) + DE_PRICE + "\u202f&euro;" + m.group(2), body)

    # aria-label: vertaal de fragmenten die we kennen
    def aria(m):
        t = m.group(1)
        for nl, de in list(HEAD.items()) + list(UI.items()):
            t = t.replace(nl, de)
        return 'aria-label="' + t + '"'
    body = re.sub(r'aria-label="([^"]*)"', aria, body)

    # alt-teksten bleven Nederlands op de hele Duitse set
    body = body.replace('alt="Tevreden klant"', 'alt="Zufriedene Kundin"')
    body = body.replace('alt="Wellis logo"', 'alt="Wellis Logo"')
    body = body.replace('alt="4,5 van 5 sterren"', 'alt="4,5 von 5 Sternen"')

    # Trustpilot-regel: Duitse formulering als startpunt. _i18n.js kiest daarna
    # eventueel een kortere variant als het niet past.
    body = re.sub(r'(<span class="tp-reviews"[^>]*>).*?(</span>\s*</div>)',
                  lambda m: m.group(1) + '<span class="tp-score">4,7</span>/5 basierend auf '
                            '<span id="tp-counter">2.720</span>+ Bewertungen.' + m.group(2),
                  body, flags=re.S)
    return body


def duitse_body(bron_html):
    """Pakt de bannermarkup en maakt hem geschikt voor de Duitse set."""
    html = open(bron_html, encoding="utf-8").read()
    body = html.split("<body>", 1)[1].split("</body>", 1)[0]
    # scripttags eruit; die zetten we zelf opnieuw
    body = re.sub(r"\s*<script\b[^>]*>.*?</script>", "", body, flags=re.S).strip()

    # Awin weigert elke http:// in de creatie, ook de XML-namespace van een
    # inline SVG. Zie de toelichting in bouw_formaten.py.
    body = body.replace('xmlns="http://www.w3.org/2000/svg"',
                        'xmlns="https://www.w3.org/2000/svg"')

    # assets absoluut maken
    body = re.sub(r'src="(?!https?://)([^"/][^"]*\.(?:svg|webp|png|jpg))"',
                  lambda m: 'src="' + CDN + '/assets/' + m.group(1) + '"', body)


    # De Duitse copy staat nu IN de markup in plaats van dat _i18n.js hem in de
    # browser aanbrengt. Zie duitse_copy() voor waarom dat uitmaakt.
    return duitse_copy(body)


def scripts():
    """Alleen externe scripts. Geen inline <script>.

    Taal en asset-base gaan via data-attributen op .ad-container, die
    _i18n.js en randomizer.js zelf uitlezen. Reden: advertentieplatforms
    strippen inline script routineus. Verdween window.LANG, dan bleef de
    Duitse creatie stil in het Nederlands staan - geen foutmelding, alleen
    verkeerde taal, en dat is precies het soort fout dat je pas laat ziet."""
    shared = CDN + "/shared/"
    regels = [
        # banner-data-de.js: de koppenpool is al Duits, dus randomizer.js kiest
        # meteen Duitse tekst. _i18n.js blijft mee voor de Trustpilot-regel, die
        # per formaat een passende lengtevariant kiest omdat Duits langer is.
        '<script src="%sbanner-data-de.js"></scr' % shared + 'ipt>',
        '<script src="%s_i18n.js"></scr' % shared + 'ipt>',
        '<script src="%srandomizer.js"></scr' % shared + 'ipt>',
        '<script src="%sscript.js"></scr' % shared + 'ipt>',
    ]
    return "\n".join(regels)


def met_data_attributen(body):
    """Zet taal en asset-base als markup op de container."""
    return body.replace('<div id="ad-container"',
                        '<div id="ad-container" data-asset-base="%s/assets/" data-lang="de" data-click-url="%s"'
                        % (CDN, KLIK_URL), 1)


def bouw_pagina(body, formaat):
    b, h = formaat.split("x")
    return ('<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<title>GetWellis DE - %s</title>\n'
            '<meta name="ad.size" content="width=%s,height=%s">\n'
            '<link rel="stylesheet" href="%s/%s/styles.css">\n</head>\n<body>\n%s\n%s\n</body>\n</html>\n'
            ) % (formaat, b, h, CDN, formaat, met_data_attributen(body), scripts())


def _blok_na(css, kop):
    """Pakt de inhoud van een CSS-blok door accolades te tellen.

    Deed dit eerder met een regex die een sluitende accolade na een newline
    verwachtte. De meeste stylesheets sluiten het reduced-motion-blok af met
    "}}" op een regel, dus die regex faalde stil: 38 van de 50 snippets kregen
    een LEEG noscript-blok. Dat viel niet op omdat 300x250 een van de vier was
    die wel werkten - een van de weinige formaten die ik met de hand had
    nagekeken.

    Accolades tellen is de enige betrouwbare manier, want de inhoud bevat zelf
    accolades.
    """
    i = css.find(kop)
    if i < 0:
        return ""
    i = css.find("{", i)
    if i < 0:
        return ""
    diepte, j = 0, i
    while j < len(css):
        if css[j] == "{":
            diepte += 1
        elif css[j] == "}":
            diepte -= 1
            if diepte == 0:
                return css[i + 1:j].strip()
        j += 1
    return ""


def noscript_css(formaat):
    """Zelfde zichtbaar-maak-regels, gehaald uit de stylesheet van dit formaat.

    De Duitse bouw maakt geen eigen stylesheets; die komen van de Nederlandse
    bouw, dus we lezen daar.
    """
    pad = os.path.join(os.path.dirname(UIT), "nl", formaat, "styles.css")
    if not os.path.exists(pad):
        pad = os.path.join(UIT, formaat, "styles.css")
    if not os.path.exists(pad):
        return ""
    return _blok_na(open(pad, encoding="utf-8").read(),
                    "@media (prefers-reduced-motion: reduce)")


def bouw_snippet_2x(body, formaat):
    """2x-variant: dezelfde Duitse banner in een wrapper van dubbele maat.

    Zelfde constructie als bij de Nederlandse set: transform:scale(2) om het
    bestaande formaat, stylesheet blijft die van het basisformaat. Geen
    scherptemaatregel - de set is op zijn eigen maat al scherp - maar bedoeld
    voor plekken die daadwerkelijk twee keer zo groot zijn.
    """
    b, h = (int(x) for x in formaat.split("x"))
    return ('<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<title>GetWellis DE - %dx%d</title>\n'
            '<meta name="ad.size" content="width=%d,height=%d">\n'
            '<base href="%s/%s/">\n'
            '<link rel="stylesheet" href="%s/%s/styles.css">\n</head>\n<body>\n'
            '<noscript><style>%s</style></noscript>\n'
            '<div class="gw-2x"><div class="gw-2x-inner">\n%s\n</div></div>\n%s\n</body>\n</html>\n'
            ) % (b * 2, h * 2, b * 2, h * 2, CDN, formaat, CDN, formaat,
                 noscript_css(formaat), met_data_attributen(body), scripts())


def bouw_snippet(body, formaat):
    """Volledig HTML-document, want Awin serveert de creatie in een eigen
    iframe en houdt die vorm zelf aan, inclusief ad.size en base href.

    De base-tag is hier niet dragend: elke src en href is ook absoluut. Valt
    de tag weg door een sanitizer, dan werkt alles nog. Een snippet dat wel
    op base leunde had zonder die tag 5 van de 5 afbeeldingen stuk."""
    b, h = formaat.split("x")
    return ('<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<title>GetWellis DE - %s</title>\n'
            '<meta name="ad.size" content="width=%s,height=%s">\n'
            '<base href="%s/%s/">\n'
            '<link rel="stylesheet" href="%s/%s/styles.css">\n</head>\n<body>\n'
            '<noscript><style>%s</style></noscript>\n%s\n%s\n</body>\n</html>\n'
            ) % (formaat, b, h, CDN, formaat, CDN, formaat,
                 noscript_css(formaat), met_data_attributen(body), scripts())


def schrijf_duitse_data():
    """Schrijft shared/banner-data-de.js: dezelfde data, Duitse koppen.

    De koppen worden per impressie door randomizer.js uit deze pool gekozen.
    Vertaalde _i18n.js die pool in de browser, dan hing de Duitse boodschap aan
    een script dat kon wegvallen. Nu is de pool zelf Duits.
    """
    js = open(os.path.join(BRON, "shared", "banner-data.js"), encoding="utf-8").read()

    # koppen omzetten: langste eerst, zodat een kortere kop geen deel van een
    # langere overschrijft
    for nl in sorted(HEAD, key=len, reverse=True):
        js = js.replace('"' + nl + '"', '"' + HEAD[nl] + '"')

    # afbreekstreepjes en bezorg-trefwoorden zijn taalgebonden
    hyf = ",\n    ".join('"%s": "%s"' % (k, v) for k, v in HYPHENATE_DE.items())
    js = re.sub(r"hyphenate:\s*\{.*?\}", "hyphenate: {\n    " + hyf + "\n  }", js, count=1, flags=re.S)
    lev = ", ".join('"%s"' % k for k in DELIVERY_DE)
    js = re.sub(r"deliveryKeywords:\s*\[.*?\]", "deliveryKeywords: [" + lev + "]", js, count=1, flags=re.S)

    kop = ("/* GEGENEREERD door bouw/bouw_duits.py - niet met de hand aanpassen.\n"
           "   Bron: bron/shared/banner-data.js met de koppen uit bron/shared/_i18n.js.\n"
           "   Pas de Duitse teksten aan in _i18n.js; dit bestand volgt bij de bouw. */\n")
    doel = os.path.join(UIT, "shared")
    os.makedirs(doel, exist_ok=True)
    open(os.path.join(doel, "banner-data-de.js"), "w", encoding="utf-8").write(kop + js)
    return len([1 for nl in HEAD if HEAD[nl] in js])


def main():
    if os.path.exists(UIT):
        shutil.rmtree(UIT)
    os.makedirs(os.path.join(UIT, "de"))
    os.makedirs(os.path.join(UIT, "_AWIN_SNIPPETS_DE"))
    os.makedirs(os.path.join(UIT, "_AWIN_SNIPPETS_DE_2X"))

    # Dezelfde negen maten als bij Nederlands, zodat de Duitse campagne dezelfde
    # inventaris kan bedienen.
    TWEEX = {"160x600", "300x600", "300x100", "200x200", "250x250",
             "300x250", "300x50", "320x50", "728x90"}

    n = schrijf_duitse_data()
    print("  banner-data-de.js: %d koppen vertaald" % n)

    formaten = sorted((d for d in os.listdir(BRON) if re.fullmatch(r"\d+x\d+", d)),
                      key=lambda d: tuple(int(x) for x in d.split("x")))
    for formaat in formaten:
        body = duitse_body(os.path.join(BRON, formaat, "index.html"))

        doel = os.path.join(UIT, "de", formaat)
        os.makedirs(doel)
        open(os.path.join(doel, "index.html"), "w", encoding="utf-8").write(
            bouw_pagina(body, formaat))
        open(os.path.join(UIT, "_AWIN_SNIPPETS_DE", formaat + ".html"), "w", encoding="utf-8").write(
            bouw_snippet(body, formaat))
        if formaat in TWEEX:
            b2, h2 = (int(x) * 2 for x in formaat.split("x"))
            open(os.path.join(UIT, "_AWIN_SNIPPETS_DE_2X", "%dx%d.html" % (b2, h2)), "w", encoding="utf-8").write(
                bouw_snippet_2x(body, formaat))
        print("  %-9s pagina=%4d  snippet=%4d" % (
            formaat,
            os.path.getsize(os.path.join(doel, "index.html")),
            os.path.getsize(os.path.join(UIT, "_AWIN_SNIPPETS_DE", formaat + ".html"))))

    print("\nklaar ->", UIT)


if __name__ == "__main__":
    main()
