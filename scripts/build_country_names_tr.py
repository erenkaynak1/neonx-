#!/usr/bin/env python3
"""Turkish names for every nationality in NEON XI's master pool → side-games/data/master/country-tr.json.

Keys are normalised English names as Transfermarkt writes them ("Cote d'Ivoire" → "cotedivoire",
"Korea, South" → "koreasouth"); values are Turkish names. Sources, in order:
  1. the vetted XOX country list (build_xox_master_pool.COUNTRY_MAP),
  2. Transfermarkt spellings fixed by hand below,
  3. Wikidata Turkish labels of countries and territories, joined on the English label.
A nationality with no Turkish name keeps its English name in the games.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_xox_master_pool import COUNTRY_MAP, norm  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "side-games" / "data" / "master" / "transfermarkt-players.json"
OUT = ROOT / "side-games" / "data" / "master" / "country-tr.json"

# Transfermarkt spellings that differ from the Wikidata English label.
MANUAL = {
    "Korea, South": "Güney Kore", "Korea, North": "Kuzey Kore", "Cote d'Ivoire": "Fildişi Sahili", "DR Congo": "Demokratik Kongo",
    "Congo": "Kongo", "The Gambia": "Gambiya", "Bosnia-Herzegovina": "Bosna Hersek", "Czech Republic": "Çekya", "Türkiye": "Türkiye",
    "Turkey": "Türkiye", "United States": "ABD", "Curacao": "Curaçao", "Chinese Taipei": "Çin Taipei", "Hongkong": "Hong Kong",
    "Brunei Darussalam": "Brunei", "Southern Sudan": "Güney Sudan", "Neukaledonien": "Yeni Kaledonya", "New Caledonia": "Yeni Kaledonya",
    "St. Lucia": "Saint Lucia", "St. Kitts & Nevis": "Saint Kitts ve Nevis", "St. Vincent & Grenadinen": "Saint Vincent ve Grenadinler",
    "Saint-Martin": "Saint-Martin", "Sint Maarten": "Sint Maarten", "Tahiti": "Tahiti", "Bonaire": "Bonaire", "Macao": "Makao",
    "Cape Verde": "Yeşil Burun Adaları", "Sao Tome and Principe": "São Tomé ve Príncipe", "Timor-Leste": "Doğu Timor",
    "England": "İngiltere", "Scotland": "İskoçya", "Wales": "Galler", "Northern Ireland": "Kuzey İrlanda", "United Kingdom": "Birleşik Krallık",
    "Palestine": "Filistin", "Kosovo": "Kosova", "North Macedonia": "Kuzey Makedonya", "Ireland": "İrlanda", "Russia": "Rusya",
    "Iran": "İran", "Syria": "Suriye", "Laos": "Laos", "Vietnam": "Vietnam", "Moldova": "Moldova", "Faroe Islands": "Faroe Adaları",
    "China": "Çin", "Kingdom of Yugoslavia": "Yugoslavya Krallığı", "Yugoslavia": "Yugoslavya", "Guadeloupe": "Guadeloupe", "Martinique": "Martinik", "French Guiana": "Fransız Guyanası", "Réunion": "Réunion",
}


def wikidata_labels() -> dict[str, str]:
    query = ('SELECT ?en ?tr WHERE { VALUES ?t { wd:Q6256 wd:Q3624078 wd:Q15634554 wd:Q46395 wd:Q1763527 wd:Q161243 '
             'wd:Q3336843 wd:Q26934845 wd:Q202216 wd:Q1048835 wd:Q107390 } ?c wdt:P31 ?t . ?c rdfs:label ?en FILTER(lang(?en)="en") '
             '?c rdfs:label ?tr FILTER(lang(?tr)="tr") }')
    run = subprocess.run(["curl", "-sS", "-m", "120", "-X", "POST", "https://query.wikidata.org/sparql",
                          "-H", "Accept: application/sparql-results+json", "-A", "NEONXI-football-pool-builder/1.0",
                          "--data-urlencode", "query=" + query], capture_output=True, text=True, check=True)
    out: dict[str, str] = {}
    for row in json.loads(run.stdout)["results"]["bindings"]:
        out.setdefault(norm(row["en"]["value"]), row["tr"]["value"])
    return out


def main() -> None:
    names = {r.get("nationality") for r in json.loads(MASTER.read_text(encoding="utf-8")) if r.get("nationality")}
    try:
        wd = wikidata_labels()
    except Exception as error:  # keep the previous file when Wikidata is unreachable
        print("Wikidata unavailable, keeping", OUT.name, error)
        return
    vetted = {norm(k): v for k, v in COUNTRY_MAP.items()}
    manual = {norm(k): v for k, v in MANUAL.items()}
    out, missing = {}, []
    for name in sorted(names):
        key = norm(name)
        tr = vetted.get(key) or manual.get(key) or wd.get(key)
        if tr:
            out[key] = tr
        else:
            missing.append(name)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    print(f"{len(out)} nationalities with Turkish names, {len(missing)} without: {missing}")


if __name__ == "__main__":
    main()
