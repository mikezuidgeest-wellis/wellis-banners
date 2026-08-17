#!/usr/bin/env python3
"""
Bouwt beide talen en publiceert het resultaat in de repo. Een commando.

    python3 bouw/bouw_alles.py

Volgorde is niet willekeurig: de Duitse set leest de Nederlandse markup en
deelt de stylesheets, dus NL moet eerst.
"""
import os
import subprocess
import sys

HIER = os.path.dirname(os.path.abspath(__file__))

for stap in ("bouw_formaten.py", "bouw_duits.py", "publiceer.py"):
    print("\n=== %s ===" % stap)
    r = subprocess.run([sys.executable, os.path.join(HIER, stap)])
    if r.returncode != 0:
        sys.exit("gestopt: %s gaf foutcode %d" % (stap, r.returncode))
