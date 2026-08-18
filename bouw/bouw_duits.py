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
import re, os, shutil

BRON = _os.path.join(_REPO, "bron")
UIT  = _os.path.join(_REPO, ".build", "de")
CDN  = "https://mikezuidgeest-wellis.github.io/wellis-banners"

# Bestemming van de klik voor de Duitse set. Eigen domein: de Duitse banners
# leidden eerder naar getwellis.com omdat er een enkele harde terugvaloptie
# voor beide talen in script.js stond. Dit is de enige plek waar het
# DE-domein staat.
KLIK_URL = "https://www.getwellis.de/"


def duitse_body(bron_html):
    """Pakt de bannermarkup en maakt hem geschikt voor de Duitse set."""
    html = open(bron_html, encoding="utf-8").read()
    body = html.split("<body>", 1)[1].split("</body>", 1)[0]
    # scripttags eruit; die zetten we zelf opnieuw
    body = re.sub(r"\s*<script\b[^>]*>.*?</script>", "", body, flags=re.S).strip()

    # assets absoluut maken
    body = re.sub(r'src="(?!https?://)([^"/][^"]*\.(?:svg|webp|png|jpg))"',
                  lambda m: 'src="' + CDN + '/assets/' + m.group(1) + '"', body)

    # data-skip-headlines staat in het NEDERLANDS. _i18n.js vervangt de koppen
    # voordat randomizer.js filtert, dus die lijst matcht in het Duits nergens
    # op en is inert. Gemeten: de Duitse varianten van die twee koppen passen
    # wel (kleinste font 13,6px, geen overflow). We halen het attribuut weg
    # zodat de markup niet suggereert dat er iets gefilterd wordt.
    body = re.sub(r'\s*data-skip-headlines="[^"]*"', "", body)

    # aria-label vertalen gebeurt in _i18n.js op basis van bekende fragmenten
    return body


def scripts():
    """Alleen externe scripts. Geen inline <script>.

    Taal en asset-base gaan via data-attributen op .ad-container, die
    _i18n.js en randomizer.js zelf uitlezen. Reden: advertentieplatforms
    strippen inline script routineus. Verdween window.LANG, dan bleef de
    Duitse creatie stil in het Nederlands staan - geen foutmelding, alleen
    verkeerde taal, en dat is precies het soort fout dat je pas laat ziet."""
    shared = CDN + "/shared/"
    regels = [
        '<script src="%sbanner-data.js"></scr' % shared + 'ipt>',
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
            '<link rel="stylesheet" href="%s/%s/styles.css">\n</head>\n<body>\n%s\n%s\n</body>\n</html>\n'
            ) % (formaat, b, h, CDN, formaat, CDN, formaat,
                 met_data_attributen(body), scripts())


def main():
    if os.path.exists(UIT):
        shutil.rmtree(UIT)
    os.makedirs(os.path.join(UIT, "de"))
    os.makedirs(os.path.join(UIT, "_AWIN_SNIPPETS_DE"))

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
        print("  %-9s pagina=%4d  snippet=%4d" % (
            formaat,
            os.path.getsize(os.path.join(doel, "index.html")),
            os.path.getsize(os.path.join(UIT, "_AWIN_SNIPPETS_DE", formaat + ".html"))))

    print("\nklaar ->", UIT)


if __name__ == "__main__":
    main()
