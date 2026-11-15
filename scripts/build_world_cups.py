#!/usr/bin/env python3
"""World Cup squads per player (men's FIFA World Cup, 1930-2026) → .tmp-wikidata/world-cups.json.

Two sources, joined on Wikidata QIDs (no name matching):
  * Wikidata: "participant in" (P1344) a World Cup edition — complete squads for 1930-2018 and 2026.
  * The Fjelstul World Cup Database (players.csv, men only): every squad from 1930 to 2022, which fills the
    2022 squads Wikidata lacks. Its English Wikipedia links are resolved to QIDs through the Wikidata API.
    © 2023 Joshua C. Fjelstul, Ph.D., CC-BY-SA 4.0, https://www.github.com/jfjelstul/worldcup — the derived
    world_cups counts carry the same licence (see transfermarkt-meta.json → world_cups_source).

Output: {"years": {qid: [1998, 2002, ...]}, "complete_through": 2026, ...}. merge_wikidata_master.py turns it
into `world_cups` (number of World Cup squads) for every player with a Wikidata item.
"""
from __future__ import annotations

import csv
import io
import json
import re
import subprocess
import time
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".tmp-wikidata" / "world-cups.json"
FJELSTUL = "https://raw.githubusercontent.com/jfjelstul/worldcup/master/data-csv/players.csv"
UA = "NEONXI-football-pool-builder/1.0 (weekly batch)"
LAST_EDITION = 2026


def curl(args: list[str], tries: int = 6) -> str:
    for attempt in range(tries):
        run = subprocess.run(["curl", "-sS", "-m", "150", "-A", UA, *args], capture_output=True, text=True)
        if run.returncode == 0 and run.stdout and not run.stdout.lstrip().startswith("<"):
            return run.stdout
        time.sleep(6 * (attempt + 1))
    raise RuntimeError(f"request failed: {args[-1][:120]}")


def sparql(query: str) -> list[dict]:
    return json.loads(curl(["-X", "POST", "https://query.wikidata.org/sparql", "-H", "Accept: application/sparql-results+json",
                            "--data-urlencode", "query=" + query]))["results"]["bindings"]


def wikidata_squads() -> dict[str, set[int]]:
    # One query per edition: a single query for every squad gets cut off.
    editions = {}
    for row in sparql("""SELECT ?wc ?wcLabel WHERE { ?wc wdt:P3450 wd:Q19317 .
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } }"""):
        m = re.fullmatch(r"(\d{4}) FIFA World Cup", row["wcLabel"]["value"])  # editions, not qualification groups
        if m:
            editions[row["wc"]["value"].rsplit("/", 1)[1]] = int(m.group(1))
    out: dict[str, set[int]] = {}
    for wc, year in sorted(editions.items(), key=lambda x: x[1]):
        for row in sparql(f"SELECT DISTINCT ?p WHERE {{ ?p wdt:P1344 wd:{wc} ; wdt:P106 wd:Q937857 }}"):
            out.setdefault(row["p"]["value"].rsplit("/", 1)[1], set()).add(year)
        time.sleep(0.5)
    return out


def fjelstul_squads() -> dict[str, set[int]]:
    """English Wikipedia title → World Cup years, men only."""
    out: dict[str, set[int]] = {}
    for row in csv.DictReader(io.StringIO(curl([FJELSTUL]))):
        if row.get("female") != "0" or "wikipedia.org/wiki/" not in (row.get("player_wikipedia_link") or ""):
            continue
        title = urllib.parse.unquote(row["player_wikipedia_link"].split("/wiki/", 1)[1]).replace("_", " ")
        years = {int(y) for y in re.findall(r"\d{4}", row.get("list_tournaments") or "")}
        if years:
            out.setdefault(title, set()).update(years)
    return out


def titles_to_qids(titles: list[str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for i in range(0, len(titles), 50):
        part = titles[i:i + 50]
        params = {"action": "wbgetentities", "sites": "enwiki", "titles": "|".join(part), "props": "sitelinks",
                  "sitefilter": "enwiki", "redirects": "yes", "format": "json"}
        body = curl(["-X", "POST", *sum((["--data-urlencode", f"{k}={v}"] for k, v in params.items()), []),
                     "https://www.wikidata.org/w/api.php"])
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            print("skipping a batch, unexpected reply:", body[:160])
            continue
        for qid, ent in data.get("entities", {}).items():
            title = ent.get("sitelinks", {}).get("enwiki", {}).get("title")
            if qid.startswith("Q") and title:
                out[title] = qid
        # Titles that were redirects come back under their target; map the requested spelling too.
        for norm in data.get("normalized", []) or []:
            if norm.get("to") in out:
                out[norm["from"]] = out[norm["to"]]
        time.sleep(0.4)
    return out


def main() -> None:
    wd = wikidata_squads()
    fj = fjelstul_squads()
    qids = titles_to_qids(sorted(fj))
    years: dict[str, set[int]] = {q: set(v) for q, v in wd.items()}
    joined = 0
    for title, ys in fj.items():
        q = qids.get(title)
        if q:
            years.setdefault(q, set()).update(ys)
            joined += 1
    per_edition = {}
    for ys in years.values():
        for y in ys:
            per_edition[y] = per_edition.get(y, 0) + 1
    OUT.write_text(json.dumps({
        "complete_through": LAST_EDITION,
        "sources": ["Wikidata P1344 (CC0)", "Fjelstul World Cup Database © 2023 Joshua C. Fjelstul, Ph.D., CC-BY-SA 4.0"],
        "per_edition": dict(sorted(per_edition.items())),
        "years": {q: sorted(v) for q, v in sorted(years.items())},
    }, ensure_ascii=False), encoding="utf-8")
    print(f"players: {len(years)} (Wikidata {len(wd)}, Fjelstul joined {joined}/{len(fj)})")
    print("squad players per edition:", dict(sorted(per_edition.items())))


if __name__ == "__main__":
    main()
