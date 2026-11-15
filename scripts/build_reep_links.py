#!/usr/bin/env python3
"""Player identity links from the Reep football entity register → .tmp-reep/links.json.

Reep (https://github.com/withqwerty/reep, CC0) maps the same person across Transfermarkt, Wikidata, SofaScore,
FBref, API-Football, FotMob and 30+ other providers, with date of birth and height. NEON XI uses it to
  * link more Transfermarkt players to their Wikidata item (club history, World Cups, Wikipedia infobox),
  * cross-check birth date and height against Transfermarkt, Wikidata and Wikipedia,
  * join files from other providers by ID instead of by name.
The v0 files are frozen (last release 21 June 2026); IDs do not change, so they stay valid for linking.

Output: {"by_tm": {tm_id: {"qid", "dob", "height_cm", "sofascore", "fbref", "api_football", "fotmob"}}}
"""
from __future__ import annotations

import csv
import json
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".tmp-reep"
CSV_PATH = CACHE / "people.csv"
OUT = CACHE / "links.json"
URL = "https://raw.githubusercontent.com/withqwerty/reep/main/data/people.csv"
KEYS = {"sofascore": "key_sofascore", "fbref": "key_fbref", "api_football": "key_api_football", "fotmob": "key_fotmob"}


def download() -> None:
    CACHE.mkdir(exist_ok=True)
    if CSV_PATH.exists() and time.time() - CSV_PATH.stat().st_mtime < 6 * 86400:
        return
    subprocess.run(["curl", "-sSfL", "-m", "600", "-A", "NEONXI-football-pool-builder/1.0", "-o", str(CSV_PATH), URL], check=True)


def main() -> None:
    try:
        download()
    except subprocess.CalledProcessError as error:
        print("Reep download failed, keeping the previous links:", error)
        return
    by_tm: dict[str, dict] = {}
    with CSV_PATH.open(encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            tm = (row.get("key_transfermarkt") or "").strip()
            if row.get("type") != "player" or not tm.isdigit():
                continue
            height = row.get("height_cm") or ""
            rec = {"qid": (row.get("key_wikidata") or "").strip() or None,
                   "dob": (row.get("date_of_birth") or "").strip()[:10] or None,
                   "height_cm": int(float(height)) if height.replace(".", "", 1).isdigit() else None}
            rec.update({k: (row.get(col) or "").strip() or None for k, col in KEYS.items()})
            by_tm[tm] = {k: v for k, v in rec.items() if v is not None}
    OUT.write_text(json.dumps({"source": "Reep v0 (CC0), https://github.com/withqwerty/reep", "by_tm": by_tm}, ensure_ascii=False),
                   encoding="utf-8")
    print(f"Reep: {len(by_tm)} players with a Transfermarkt ID, {sum(1 for v in by_tm.values() if v.get('qid'))} with a Wikidata QID")


if __name__ == "__main__":
    main()
