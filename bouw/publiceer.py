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
GEPUBLICEERD = ["shared", "assets"]


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
