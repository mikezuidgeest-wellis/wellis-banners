#!/usr/bin/env python3
"""
Bouwt alle 16 Awin-formaten uit de originele bannerset.

Structuur die eruit komt (_BUILD):
  assets/          kopie van de 22 gedeelde bestanden (staan al op GitHub)
  shared/          script.js, randomizer.js, banner-data.js, _i18n.js
  <formaat>/       index.html + styles.css
  _AWIN_SNIPPETS/  per formaat de HTML om in Awin te plakken (absolute URLs)

Per formaat worden op de CSS drie correcties toegepast:
  1. de globale `*{}`-reset vervangen door een reset gescoped op .ad-container
  2. een img-reset met !important (publishers zetten img{max-width:100%!important})
  3. ELKE selector scopen op .ad-container, zodat eigen regels de img-reset verslaan
Plus: @font-face verwijst naar de gedeelde assets-map.
"""
import os as _os
_HIER = _os.path.dirname(_os.path.abspath(__file__))
_REPO = _os.path.dirname(_HIER)
import re, os, shutil, sys

BRON = _os.path.join(_REPO, "bron")
UIT  = _os.path.join(_REPO, ".build", "nl")
CDN  = "https://mikezuidgeest-wellis.github.io/wellis-banners"

# Bestemming van de klik voor de Nederlandse set. Dit is de enige plek waar het
# NL-domein staat; de Duitse set heeft zijn eigen constante in bouw_duits.py.
# De waarde komt als data-click-url in de markup, zodat een sanitizer die inline
# script weghaalt hem niet meeneemt. Een adserver die window.clickTag zet houdt
# altijd voorrang.
KLIK_URL = "https://www.getwellis.com"

RESET = """/* ===== CSS-ISOLATIE =====================================================
   De originele stylesheet gebruikte een globale `*{}`-selector. Die lekte naar
   de publisher-pagina en bood geen bescherming tegen publisher-CSS die op onze
   elementen terugkomt. Gemeten effect zonder deze fix: CTA werd 160x39 i.p.v.
   156x32 en de hero-afbeelding klapte van 300x73 naar 300x300.
   Alles staat nu strikt gescoped op .ad-container. */
.ad-container,
.ad-container *,
.ad-container *::before,
.ad-container *::after{
  box-sizing:border-box!important;margin:0;padding:0;border:0;
  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;
  font-family:inherit;font-size:inherit;line-height:inherit;letter-spacing:inherit;
  /* GEEN !important op typografie: .ad-container * (0,1,0) verslaat een
     publisher-selector als span (0,0,1) al op specificiteit. Met !important
     zou de reset de EIGEN tracking van het ontwerp overschrijven. */
  text-transform:none;text-indent:0;text-align:inherit;vertical-align:baseline;
  float:none;clear:none;min-width:0;min-height:0;max-width:none;max-height:none;
  background:none;box-shadow:none;text-shadow:none;list-style:none;
  transform-origin:50% 50%;
}
/* !important is hier noodzakelijk: publishers zetten standaard
   img{max-width:100%!important;height:auto!important}. */
.ad-container img{max-width:none!important;max-height:none!important;display:block!important;
  border:0!important;vertical-align:baseline!important;float:none!important;
  padding:0!important;margin:0!important;}
/* Basistypografie vastzetten. Zonder deze regel erft .ad-container de
   font-size en line-height van de publisher-body (gemeten: CTA werd 42px hoog
   i.p.v. 32px en de Trustpilot-regel liep buiten zijn vak). De eigen regels van
   het ontwerp staan hierna en overschrijven waar nodig. */
.ad-container{font-size:16px;line-height:1.1;letter-spacing:normal;text-align:left;
  font-style:normal;font-variant:normal;word-spacing:normal;text-decoration:none;
  direction:ltr;unicode-bidi:normal;white-space:normal;}
"""

GEEN_SCOPE = ("@font-face", "@keyframes", "@-webkit-keyframes", "@media",
              "@supports", "@import", "@charset", ":root", "from", "to", "%")


def scope_selector(sel):
    """Prefix een selector met .ad-container, tenzij dat al zo is."""
    sel = sel.strip()
    if not sel:
        return sel
    if sel.startswith(".ad-container"):
        return sel
    if sel.startswith(":root") or sel.startswith("@"):
        return sel
    # keyframe-stops (0%, 50%, from, to) niet scopen
    if re.fullmatch(r"(from|to|\d+%)(\s*,\s*(from|to|\d+%))*", sel):
        return sel
    return ".ad-container " + sel


def scope_css(css):
    """Loopt de stylesheet door en scopt elke gewone regel op .ad-container."""
    uit, i, n = [], 0, len(css)
    while i < n:
        # Witruimte eerst opeten. Zonder dit staat i op een '\n' en valt een
        # regel die met commentaar begint door naar de selector-tak. Die zoekt
        # dan de eerstvolgende '{' -- en die stond IN het commentaar (de
        # RESET-toelichting bevat letterlijk `*{}`). Gemeten gevolg: de regel
        # '.ad-container img{...!important}' werd '.ad-container .ad-container
        # img' en matchte nooit meer, waardoor publisher-CSS als
        # img{border:2px solid red} er weer doorheen kwam: elementen 4px breder
        # en 2px verschoven in 15 van de 16 formaten.
        m0 = re.match(r"\s+", css[i:])
        if m0:
            uit.append(m0.group(0)); i += m0.end(); continue
        # commentaar ongemoeid doorgeven
        if css.startswith("/*", i):
            j = css.find("*/", i + 2)
            j = n if j < 0 else j + 2
            uit.append(css[i:j]); i = j; continue
        # at-rule met blok dat zelf regels bevat (@media, @supports)
        m = re.match(r"\s*@(media|supports)[^{]*\{", css[i:])
        if m:
            start = i + m.end()
            diepte, j = 1, start
            while j < n and diepte:
                if css[j] == "{": diepte += 1
                elif css[j] == "}": diepte -= 1
                j += 1
            uit.append(css[i:start])
            uit.append(scope_css(css[start:j - 1]))   # recursief
            uit.append("}")
            i = j; continue
        # gewone regel of @font-face/@keyframes
        k = css.find("{", i)
        if k < 0:
            uit.append(css[i:]); break
        sel_blok = css[i:k]
        diepte, j = 1, k + 1
        while j < n and diepte:
            if css[j] == "{": diepte += 1
            elif css[j] == "}": diepte -= 1
            j += 1
        body = css[k:j]
        kop = sel_blok.strip()
        if any(kop.lstrip().startswith(p) for p in ("@font-face", "@keyframes", "@-webkit-keyframes", ":root")):
            uit.append(sel_blok); uit.append(body)
        elif kop.lstrip().startswith("@"):
            uit.append(sel_blok); uit.append(body)
        else:
            # Commentaar en witruimte VOOR de selector afsplitsen. Zonder dit
            # werd '/* kop */\n.ad-container.is-loaded X' als een geheel gezien
            # en kreeg het een extra '.ad-container '-prefix -> selector
            # '.ad-container .ad-container.is-loaded X' die nooit matcht.
            # Gevolg: de complete entree-timeline deed niets.
            mt = re.match(r"((?:\s|/\*.*?\*/)*)(.*)$", sel_blok, re.S)
            trivia, echte = mt.group(1), mt.group(2)
            sels = [scope_selector(x) for x in echte.split(",")]
            uit.append(trivia + ",\n".join(sels))
            uit.append(body)
        i = j
    return "".join(uit)


def img_maten_hard(css, img_klassen):
    """Zet !important op width/height van regels die een <img> aansturen.

    Publishers zetten img{max-width:100%!important;height:auto!important}.
    !important verslaat specificiteit, dus onze eigen maatregels moeten dat ook
    zijn. Gemeten zonder deze fix: hero-afbeelding 300x324 i.p.v. 300x73.
    """
    if not img_klassen:
        return css
    patroon = re.compile(r"(\.ad-container[^{}]*\.(?:" + "|".join(map(re.escape, img_klassen)) + r")\b[^{}]*)\{([^}]*)\}")

    def harden(m):
        # Per declaratie werken. De eerdere regex met een negatieve lookahead
        # kon door backtracking een KORTERE waarde matchen: 'height:12px!important'
        # werd 'height:12p' + '!important' + 'x!important' = ongeldige CSS die de
        # browser weggooit. Bij vijf formaten verdwenen daardoor de Trustpilot-
        # sterren voor bezoekers met prefers-reduced-motion.
        uit = []
        for decl in m.group(2).split(";"):
            if ":" not in decl:
                uit.append(decl); continue
            prop, waarde = decl.split(":", 1)
            if prop.strip() in ("width", "height", "max-width", "max-height") \
               and "!important" not in waarde:
                decl = prop + ":" + waarde.rstrip() + "!important"
            uit.append(decl)
        return m.group(1) + "{" + ";".join(uit) + "}"

    return patroon.sub(harden, css)


def repareer_important(css):
    """Herstelt declaraties waar !important MIDDEN in de waarde is beland.

    Een eerdere versie van img_maten_hard() produceerde 'height:12p!importantx'
    en 'width:aut!importanto'. Zulke declaraties zijn ongeldig en worden door de
    browser genegeerd; bij vijf formaten verdwenen daardoor de Trustpilot-sterren
    in het prefers-reduced-motion-blok. Deze functie plakt de waarde weer aan
    elkaar en zet !important op de juiste plek.
    """
    return re.sub(r"([A-Za-z0-9.%-]+)!important([A-Za-z0-9.%-]+)(!important)?",
                  lambda m: m.group(1) + m.group(2) + "!important", css)


def browser_fallbacks(css):
    """Voegt fallbacks toe voor twee eigenschappen die Safari pas vanaf 14.1
    (iOS 14.5) kent. Zonder deze fallbacks klapt de layout op oudere toestellen:

      inset      -> gemeten zonder ondersteuning: .bg-color en .slide worden 0x0
                    en de hero-foto verdwijnt (300x73 -> 0x73, of x=-200 bij 728x90).
                    Oplossing: de longhands ernaast zetten. Oudere browsers
                    gebruiken die, nieuwere overschrijven ze met inset - zelfde
                    resultaat, geen risico.

      gap (flex) -> Safari < 14.1 kent gap wel in grid maar niet in flex, dus
                    @supports is hier onbetrouwbaar. We vervangen gap daarom
                    volledig door marges op de opvolgende kinderen. Dat geeft in
                    elke browser exact dezelfde afstand.
    """
    # 1) inset -> longhands ervoor.
    #    Idempotent: staan de longhands er al, dan niets doen. Zonder die check
    #    plakt elke herbouw er nog een set bij en groeit het bestand eindeloos.
    def inset_fix(m):
        eerder, waarde = m.group(1), m.group(2).strip()
        if len(waarde.split()) != 1:      # alleen de enkelvoudige vorm
            return m.group(0)
        # Kijk terug tot het begin van de REGEL, niet tot de vorige puntkomma.
        # Met een venster van een declaratie zag de check de longhands nooit
        # staan en plakte elke herbouw er een set bij.
        if re.search(r"top\s*:\s*%s\s*;\s*right\s*:\s*%s\s*;\s*bottom\s*:\s*%s\s*;\s*left\s*:\s*%s\s*;\s*$"
                     % ((re.escape(waarde),) * 4), eerder):
            return m.group(0)
        return (eerder + "top:%s;right:%s;bottom:%s;left:%s;inset:%s" %
                (waarde, waarde, waarde, waarde, waarde))
    css = re.sub(r"(\{[^{}]*?)(?<![-a-z])inset\s*:\s*([^;}]+)", inset_fix, css)

    # 2) gap -> marge op opvolgende kinderen, richting volgt flex-direction
    extra_regels = []

    def gap_fix(m):
        sel, body = m.group(1), m.group(2)
        g = re.search(r"(?<![-a-z])gap\s*:\s*([^;}]+)", body)
        if not g:
            return m.group(0)
        waarde = g.group(1).strip()
        kolom = "flex-direction:column" in body.replace(" ", "")
        eigenschap = "margin-top" if kolom else "margin-left"
        schoon = re.sub(r"(?<![-a-z])gap\s*:\s*[^;}]+;?", "", body)
        # Commentaar en witruimte VOOR de selector afsplitsen, anders belandt
        # '/* Trustpilot bar */' in de gegenereerde selector en matcht die nooit.
        mt = re.match(r"(?:\s|/\*.*?\*/)*(.*)$", sel, re.S)
        echte = mt.group(1) if mt else sel
        for enkel in echte.split(","):
            enkel = enkel.strip()
            if enkel and not enkel.startswith("@"):
                extra_regels.append("%s > * + *{%s:%s;}" % (enkel, eigenschap, waarde))
        return sel + "{" + schoon + "}"

    css = re.sub(r"([^{}]+)\{([^}]*)\}", gap_fix, css)
    if extra_regels:
        css += ("\n/* Vervanging van flex-gap: Safari kent die pas vanaf 14.1.\n"
                "   Marges geven in elke browser dezelfde afstand. */\n"
                + "\n".join(extra_regels) + "\n")
    return css


def bouw_css(bron_css, img_klassen=None):
    css = open(bron_css, encoding="utf-8").read()
    # 1) globale reset eruit
    css_zonder, aantal = re.subn(r"^\*\{[^}]*\}\s*$", "", css, count=1, flags=re.M)
    if aantal == 0:
        # Al eerder gescoped (bv. 300x250 uit de eerste correctieronde): dan niet
        # nogmaals de reset invoegen of opnieuw scopen, alleen de paden bijwerken.
        if ".ad-container *::after" in css:
            # De reset staat er al, maar de losse regels zijn mogelijk NIET
            # gescoped (300x250 kwam uit een vroege handmatige correctie: 29
            # selectors zonder .ad-container-prefix, die dus naar de
            # publisher-pagina lekten). scope_css is idempotent voor regels die
            # al gescoped zijn, dus we halen hem er alsnog overheen.
            klaar = scope_css(css)
            klaar = re.sub(r'url\((["\']?)fonts/', r'url(\1../assets/fonts/', klaar)
            return browser_fallbacks(img_maten_hard(repareer_important(klaar), img_klassen))
        raise SystemExit("globale *{} reset niet gevonden in " + bron_css)
    # 2) alles scopen
    css_scoped = scope_css(css_zonder)
    # 3) fonts naar de gedeelde map
    css_scoped = re.sub(r'url\((["\']?)fonts/', r'url(\1../assets/fonts/', css_scoped)
    css_scoped = img_maten_hard(repareer_important(css_scoped), img_klassen)
    # 4) reset vooraan, na de @font-face en :root
    m = list(re.finditer(r"\}", css_scoped))
    snij = css_scoped.find(":root")
    if snij >= 0:
        eind = css_scoped.find("}", snij) + 1
        return browser_fallbacks(css_scoped[:eind] + "\n\n" + RESET + css_scoped[eind:])
    return browser_fallbacks(RESET + css_scoped)


def bouw_index(bron_html, formaat, awin=False):
    html = open(bron_html, encoding="utf-8").read()
    body = html.split("<body>", 1)[1].split("</body>", 1)[0]
    # De originele <script>-tags uit de body halen: die verwijzen relatief naar
    # banner-data.js / _i18n.js / randomizer.js / script.js en zouden naast de
    # nieuwe gedeelde tags blijven staan -> 404 per formaat.
    body = re.sub(r'\s*<script\b[^>]*>.*?</script>', '', body, flags=re.S).strip()
    basis = (CDN + "/assets/") if awin else "../assets/"
    shared = (CDN + "/shared/") if awin else "../shared/"
    css_href = (CDN + "/" + formaat + "/styles.css") if awin else "styles.css"

    # relatieve asset-verwijzingen absoluut maken
    body = re.sub(r'src="(?!https?://)([^"/][^"]*\.(?:svg|webp|png|jpg))"',
                  lambda m: 'src="' + basis + m.group(1) + '"', body)

    # GEEN inline <script> meer. De asset-base gaat via een data-attribuut op
    # .ad-container, dat randomizer.js zelf uitleest. Advertentieplatforms
    # strippen inline script routineus; gebeurde dat, dan was
    # window.WELLIS_ASSET_BASE nooit gezet en verdwenen alle foto's terwijl de
    # rest van de banner er wel stond.
    body = body.replace('<div id="ad-container"',
                        '<div id="ad-container" data-asset-base="%s" data-lang="nl" data-click-url="%s"'
                        % (basis, KLIK_URL), 1)

    scripts = ("\n".join([
        '<script src="%sbanner-data.js"><\/script>' % shared,
        '<script src="%s_i18n.js"><\/script>' % shared,
        '<script src="%srandomizer.js"><\/script>' % shared,
        '<script src="%sscript.js"><\/script>' % shared,
    ])).replace("<\\/script>", "</script>")

    breedte, hoogte = formaat.split("x")

    if awin:
        # Awin serveert de creatie als een EIGEN document in een iframe, niet
        # geinjecteerd in de publisher-DOM. Daarom een volledig document met
        # ad.size: dat is de vorm die Awin zelf aanhoudt en valideert.
        #
        # <base href> staat erin omdat het in een iframe veilig is en Awin het
        # zo genereert. Het is hier echter NIET dragend: elke src en href is
        # ook absoluut. Valt de base-tag weg door een sanitizer, dan blijft
        # alles werken. Gemeten met een base-loze variant: 0 van de afbeeldingen
        # kapot, tegen 5 van de 5 bij een snippet die wel op base leunde.
        return ('<!DOCTYPE html>\n<html lang="nl">\n<head>\n<meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
                '<title>GetWellis - %s</title>\n'
                '<meta name="ad.size" content="width=%s,height=%s">\n'
                '<base href="%s/%s/">\n'
                '<link rel="stylesheet" href="%s">\n</head>\n<body>\n%s\n%s\n</body>\n</html>\n'
                ) % (formaat, breedte, hoogte, CDN, formaat, css_href, body, scripts)

    return ('<!DOCTYPE html>\n<html lang="nl">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<title>GetWellis - %s</title>\n'
            '<meta name="ad.size" content="width=%s,height=%s">\n'
            '<link rel="stylesheet" href="%s">\n</head>\n<body>\n%s\n%s\n</body>\n</html>\n'
            ) % (formaat, breedte, hoogte, css_href, body, scripts)


def main():
    # Bouwen gebeurt in .build/nl, NIET rechtstreeks in de repo. Zou UIT de
    # repo-root zijn, dan wist de rmtree hieronder ook bron/, bouw/, test/
    # en .git. publiceer.py kopieert daarna alleen de gepubliceerde paden.
    if os.path.exists(UIT):
        shutil.rmtree(UIT)
    os.makedirs(UIT)

    formaten = sorted((d for d in os.listdir(BRON) if re.fullmatch(r"\d+x\d+", d)),
                      key=lambda d: tuple(int(x) for x in d.split("x")))
    if not formaten:
        sys.exit("geen formaatmappen gevonden in " + BRON)

    # gedeelde bestanden: eenmalig in bron/shared, niet 16x gedupliceerd
    os.makedirs(os.path.join(UIT, "shared"))
    for f in ("script.js", "randomizer.js", "banner-data.js", "_i18n.js"):
        shutil.copy(os.path.join(BRON, "shared", f), os.path.join(UIT, "shared", f))

    shutil.copytree(os.path.join(BRON, "assets"), os.path.join(UIT, "assets"))
    os.makedirs(os.path.join(UIT, "_AWIN_SNIPPETS"))

    for formaat in formaten:
        src = os.path.join(BRON, formaat)

        # 300x250 is in de eerste correctieronde handmatig aangepast, waardoor
        # de originele export afwijkt van wat er live staat. De gepubliceerde
        # variant ligt ernaast en heeft voorrang. Staat expliciet in de repo,
        # zodat de bouw niet afhangt van een pad daarbuiten.
        css_bron = os.path.join(src, "styles.gepubliceerd.css")
        if not os.path.exists(css_bron):
            css_bron = os.path.join(src, "styles.css")

        # welke classes zitten op <img>-elementen in dit formaat?
        rauw_html = open(os.path.join(src, "index.html"), encoding="utf-8").read()
        img_klassen = set()
        for m in re.finditer(r'<img[^>]*class="([^"]+)"', rauw_html):
            img_klassen.update(m.group(1).split())

        doel = os.path.join(UIT, formaat)
        os.makedirs(doel)
        open(os.path.join(doel, "styles.css"), "w", encoding="utf-8").write(
            bouw_css(css_bron, img_klassen))
        open(os.path.join(doel, "index.html"), "w", encoding="utf-8").write(
            bouw_index(os.path.join(src, "index.html"), formaat, awin=False))
        open(os.path.join(UIT, "_AWIN_SNIPPETS", formaat + ".html"), "w", encoding="utf-8").write(
            bouw_index(os.path.join(src, "index.html"), formaat, awin=True))
        print("  gebouwd: %-9s css=%5d  html=%4d" % (
            formaat,
            os.path.getsize(os.path.join(doel, "styles.css")),
            os.path.getsize(os.path.join(doel, "index.html"))))

    print("\nklaar ->", UIT)


if __name__ == "__main__":
    main()
