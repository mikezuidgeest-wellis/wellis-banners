#!/usr/bin/env python3
"""
Kopieert het bouwresultaat uit .build/ naar de repo-root, en NIETS anders.

Waarom dit een apart script is: de bouwscripts beginnen met rmtree() op hun
doelmap. Als dat doel de repo-root was, zou een enkele run bron/, bouw/,
test/, docs/ en .git wissen. Nu bouwen ze in .build/ en raakt dit script
alleen de paden die GitHub Pages daadwerkelijk serveert.

Toont per bestand wat er wijzigt en vraagt niets: git laat je daarna precies
zien wat er veranderd is voordat je commit.

Gebruik: python3 bouw/publiceer.py
"""
import os
import shutil
import filecmp
import re

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
BUILD = os.path.join(REPO, ".build")

# Precies de paden die gepubliceerd worden. Alles daarbuiten blijft ongemoeid.
#
# _AWIN_SNIPPETS hoort er expliciet bij. Dat is de code die daadwerkelijk in de
# Awin-editor geplakt wordt, en die stond eerder alleen in .build/ - dus buiten
# versiebeheer. Gevolg in de praktijk: er werd een oude, losse kopie geplakt met
# een <base href> en relatieve afbeeldingspaden. Zodra die base-tag wegviel
# waren alle vijf de afbeeldingen stuk. Het te plakken artefact hoort in de
# repo, net als al het andere.
GEPUBLICEERD = ["shared", "assets", "_AWIN_SNIPPETS", "_AWIN_SNIPPETS_2X"]


def formaatmappen(pad):
    if not os.path.isdir(pad):
        return []
    return sorted(d for d in os.listdir(pad) if re.fullmatch(r"\d+x\d+", d))


def kopieer(bron, doel, telling):
    """Kopieert een map en houdt bij wat er nieuw of gewijzigd is."""
    for wortel, _, bestanden in os.walk(bron):
        rel = os.path.relpath(wortel, bron)
        doelmap = os.path.join(doel, rel) if rel != "." else doel
        os.makedirs(doelmap, exist_ok=True)
        for b in bestanden:
            bronbestand = os.path.join(wortel, b)
            doelbestand = os.path.join(doelmap, b)
            if not os.path.exists(doelbestand):
                telling["nieuw"].append(os.path.relpath(doelbestand, REPO))
            elif not filecmp.cmp(bronbestand, doelbestand, shallow=False):
                telling["gewijzigd"].append(os.path.relpath(doelbestand, REPO))
            else:
                telling["gelijk"] += 1
            shutil.copy2(bronbestand, doelbestand)


def main():
    nl = os.path.join(BUILD, "nl")
    de = os.path.join(BUILD, "de")
    if not os.path.isdir(nl):
        raise SystemExit("geen .build/nl gevonden - draai eerst bouw/bouw_formaten.py")
    if not os.path.isdir(de):
        raise SystemExit("geen .build/de gevonden - draai eerst bouw/bouw_duits.py")

    telling = {"nieuw": [], "gewijzigd": [], "gelijk": 0}

    for naam in GEPUBLICEERD:
        bron = os.path.join(nl, naam)
        if os.path.isdir(bron):
            kopieer(bron, os.path.join(REPO, naam), telling)

    for f in formaatmappen(nl):
        kopieer(os.path.join(nl, f), os.path.join(REPO, f), telling)

    for f in formaatmappen(os.path.join(de, "de")):
        kopieer(os.path.join(de, "de", f), os.path.join(REPO, "de", f), telling)

    for naam in ("_AWIN_SNIPPETS_DE", "_AWIN_SNIPPETS_DE_2X"):
        pad = os.path.join(de, naam)
        if os.path.isdir(pad):
            kopieer(pad, os.path.join(REPO, naam), telling)

    # De Duitse bouw schrijft OOK in shared/: banner-data-de.js, de koppenpool
    # met Duitse teksten. Zonder deze regel bleef dat bestand in .build/de
    # achter en gaf het live een 404 - de Duitse banners vielen dan terug op de
    # standaardkop en toonden geen wisselende boodschap. Gemist omdat "shared"
    # hierboven alleen uit de NL-build wordt gehaald.
    shared_de = os.path.join(de, "shared")
    if os.path.isdir(shared_de):
        kopieer(shared_de, os.path.join(REPO, "shared"), telling)

    print("ongewijzigd : %d bestanden" % telling["gelijk"])
    print("nieuw       : %d" % len(telling["nieuw"]))
    for p in telling["nieuw"]:
        print("    + " + p)
    print("gewijzigd   : %d" % len(telling["gewijzigd"]))
    for p in telling["gewijzigd"]:
        print("    ~ " + p)

    if not telling["nieuw"] and not telling["gewijzigd"]:
        print("\nDe repo staat al gelijk aan de build. Niets te committen.")
    else:
        print("\nControleer met 'git diff' en commit daarna.")


if __name__ == "__main__":
    main()
