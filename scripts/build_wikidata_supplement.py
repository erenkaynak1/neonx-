#!/usr/bin/env python3
"""Fetch a Wikidata supplement for NEON XI's player pool.

Why: the dcaribou Transfermarkt dataset only covers appearances from ~2012 in the
competitions it tracks, so career totals and club counts are partial and players who
retired earlier (Roberto Carlos, Maldini, Zidane, Hakan Şükür...) are missing.

What: for every master player (joined by Transfermarkt player ID, Wikidata P2446 — no
name matching) and for every well-known footballer not in the master (sitelinks >=
--legend-sitelinks), this collects from the Wikidata Query Service:
  * club history (P54) with start/end and league apps/goals qualifiers (P1350/P1351),
  * team type (club / senior national team / youth or reserve team),
  * label, birth date, position, height, nationality, sitelink count.

Output: .tmp-wikidata/wikidata-supplement.json (players keyed by QID, teams); merged by merge_wikidata_master.py.
Requests are batched, paced and cached under .tmp-wikidata/ so reruns are cheap.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import requests

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "side-games" / "data" / "master" / "transfermarkt-players.json"
OUTPUT = ROOT / ".tmp-wikidata" / "wikidata-supplement.json"
CACHE = ROOT / ".tmp-wikidata"
ENDPOINT = "https://query.wikidata.org/sparql"
HEADERS = {
    "User-Agent": "NEONXI-football-pool-builder/1.0 (python-requests; weekly batch)",
    "Accept": "application/sparql-results+json",
}
FOOTBALLER = "Q937857"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--legend-sitelinks", type=int, default=15, help="minimum sitelinks for players added without a master match")
    p.add_argument("--batch", type=int, default=200)
    p.add_argument("--pause", type=float, default=0.6)
    p.add_argument("--workers", type=int, default=4, help="parallel SPARQL requests (WDQS allows 5 per client)")
    p.add_argument("--output", type=Path, default=OUTPUT)
    p.add_argument("--no-cache", action="store_true")
    return p.parse_args()


ARGS: argparse.Namespace


def sparql(query: str) -> list[dict[str, str]]:
    key = hashlib.sha1(query.encode()).hexdigest()
    path = CACHE / f"{key}.json"
    if path.exists() and not ARGS.no_cache:
        return json.loads(path.read_text())
    delay = 5.0
    for attempt in range(8):
        try:
            r = requests.post(ENDPOINT, data={"query": query}, headers=HEADERS, timeout=90)
        except requests.RequestException:
            time.sleep(delay); delay = min(delay * 2, 120); continue
        if r.status_code == 200:
            rows = [{k: v["value"] for k, v in b.items()} for b in r.json()["results"]["bindings"]]
            CACHE.mkdir(exist_ok=True)
            path.write_text(json.dumps(rows))
            time.sleep(ARGS.pause)
            return rows
        if r.status_code in (429, 500, 502, 503, 504):
            wait = float(r.headers.get("Retry-After") or delay)
            time.sleep(wait); delay = min(delay * 2, 120); continue
        raise RuntimeError(f"SPARQL {r.status_code}: {r.text[:300]}")
    raise RuntimeError("SPARQL kept failing")


def chunks(items: list[Any], size: int) -> Iterable[list[Any]]:
    for i in range(0, len(items), size):
        yield items[i:i + size]


def run_all(queries: list[str]) -> list[list[dict[str, str]]]:
    """Run queries in parallel (bounded by --workers), keep input order, report progress."""
    done = [0]

    def one(q: str) -> list[dict[str, str]]:
        rows = sparql(q)
        done[0] += 1
        if done[0] % 25 == 0 or done[0] == len(queries):
            print(f"  {done[0]}/{len(queries)} queries", flush=True)
        return rows

    with ThreadPoolExecutor(max_workers=max(1, ARGS.workers)) as pool:
        return list(pool.map(one, queries))


qid = lambda uri: uri.rsplit("/", 1)[-1]
def num(v: Any) -> int | None:
    """Wikidata 'unknown value' comes back as a blank-node URI; treat it as missing."""
    try:
        return None if v in (None, "") else int(round(float(v)))
    except (TypeError, ValueError):
        return None
year = lambda v: v[:10] if v else None


def master_tm_ids() -> set[str]:
    return {str(r["id"]) for r in json.loads(MASTER.read_text()) if r.get("id") is not None}


def map_tm_ids(tm_ids: list[str]) -> dict[str, dict[str, Any]]:
    """TM id -> {qid, sitelinks} for footballers in Wikidata."""
    found: dict[str, dict[str, Any]] = {}
    for part in chunks(sorted(tm_ids), 800):
        values = " ".join(f'"{t}"' for t in part)
        rows = sparql(f"""SELECT ?p ?tm ?sl WHERE {{ VALUES ?tm {{ {values} }} ?p wdt:P2446 ?tm .
          OPTIONAL {{ ?p wikibase:sitelinks ?sl }} }}""")
        for row in rows:
            sl = int(row.get("sl") or 0)
            prev = found.get(row["tm"])
            if not prev or sl > prev["sitelinks"]:
                found[row["tm"]] = {"qid": qid(row["p"]), "sitelinks": sl}
    return found


def legend_candidates(min_sl: int) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    ranges = [(min_sl, min_sl + 3), (min_sl + 3, min_sl + 8), (min_sl + 8, min_sl + 20), (min_sl + 20, 2000)]
    for lo, hi in ranges:
        rows = sparql(f"""SELECT ?p ?sl (SAMPLE(?tm) AS ?tmid) WHERE {{ ?p wdt:P106 wd:{FOOTBALLER} ; wikibase:sitelinks ?sl .
          FILTER(?sl >= {lo} && ?sl < {hi}) OPTIONAL {{ ?p wdt:P2446 ?tm }} }} GROUP BY ?p ?sl""")
        for row in rows:
            out[qid(row["p"])] = {"sitelinks": int(row["sl"]), "tm": row.get("tmid")}
    return out


def fetch_stints(qids: list[str]) -> dict[str, list[dict[str, Any]]]:
    out: dict[str, list[dict[str, Any]]] = {}
    queries = [f"""SELECT ?p ?st ?team ?start ?end ?apps ?goals WHERE {{ VALUES ?p {{ {' '.join(f'wd:{q}' for q in part)} }}
          ?p p:P54 ?st . ?st ps:P54 ?team .
          OPTIONAL {{ ?st pq:P580 ?start }} OPTIONAL {{ ?st pq:P582 ?end }}
          OPTIONAL {{ ?st pq:P1350 ?apps }} OPTIONAL {{ ?st pq:P1351 ?goals }} }}""" for part in chunks(qids, ARGS.batch)]
    for rows in run_all(queries):
        seen: set[str] = set()
        for row in rows:
            if row["st"] in seen:  # a statement can repeat when a qualifier has several values
                continue
            seen.add(row["st"])
            out.setdefault(qid(row["p"]), []).append({
                "team": qid(row["team"]), "start": year(row.get("start")), "end": year(row.get("end")),
                "apps": num(row.get("apps")), "goals": num(row.get("goals")),
            })
    return out


def fetch_people(qids: list[str]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    queries = [f"""SELECT ?p ?en ?tr ?birth ?pos ?height ?unit ?nat ?cit ?sl WHERE {{ VALUES ?p {{ {' '.join(f'wd:{q}' for q in part)} }}
          OPTIONAL {{ ?p rdfs:label ?en FILTER(LANG(?en)='en') }} OPTIONAL {{ ?p rdfs:label ?tr FILTER(LANG(?tr)='tr') }}
          OPTIONAL {{ ?p wdt:P569 ?birth }} OPTIONAL {{ ?p wdt:P413 ?pos }}
          OPTIONAL {{ ?p p:P2048/psv:P2048 [ wikibase:quantityAmount ?height ; wikibase:quantityUnit ?unit ] }}
          OPTIONAL {{ ?p wdt:P1532 ?nat }} OPTIONAL {{ ?p wdt:P27 ?cit }} OPTIONAL {{ ?p wikibase:sitelinks ?sl }} }}""" for part in chunks(qids, ARGS.batch)]
    for row in (r for rows in run_all(queries) for r in rows):
            rec = out.setdefault(qid(row["p"]), {"positions": [], "nationality": [], "citizenship": []})
            rec["label_en"] = rec.get("label_en") or row.get("en")
            rec["label_tr"] = rec.get("label_tr") or row.get("tr")
            rec["birth_date"] = rec.get("birth_date") or year(row.get("birth"))
            rec["sitelinks"] = int(row.get("sl") or rec.get("sitelinks") or 0)
            if row.get("height") and not rec.get("height_cm"):
                h = float(row["height"]); unit = qid(row.get("unit", ""))
                cm = h * 100 if unit == "Q11573" else h if unit == "Q174728" else None  # metre / centimetre
                if cm and 150 <= cm <= 215:
                    rec["height_cm"] = int(round(cm))
            for key, field in (("pos", "positions"), ("nat", "nationality"), ("cit", "citizenship")):
                if row.get(key) and qid(row[key]) not in rec[field]:
                    rec[field].append(qid(row[key]))
    return out


NATIONAL_TYPES = {"Q6979593", "Q1194951", "Q23905105", "Q61837082", "Q6979740"}
YOUTH_RE = re.compile(r"(under[- ]?\d{2}|\bU[- ]?\d{2}\b|youth|academy|juvenil|juniors?|primavera|reserves?|\bII\b|\bB\b|\bC\b|"
                      r"atl[eè]tic\b|castilla|\bjong\b|olympic|amateurs?|sub[- ]?\d{2}|altyap|akademi)", re.I)
NATIONAL_RE = re.compile(r"national (under[- ]?\d+ )?(association )?(football|soccer) team|national team", re.I)


def fetch_teams(qids: list[str]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    queries = [f"""SELECT ?t ?en ?type ?typeLabel WHERE {{ VALUES ?t {{ {' '.join(f'wd:{q}' for q in part)} }}
          OPTIONAL {{ ?t rdfs:label ?en FILTER(LANG(?en)='en') }}
          OPTIONAL {{ ?t wdt:P31 ?type . ?type rdfs:label ?typeLabel FILTER(LANG(?typeLabel)='en') }} }}""" for part in chunks(qids, 300)]
    for row in (r for rows in run_all(queries) for r in rows):
            rec = out.setdefault(qid(row["t"]), {"label": row.get("en"), "types": [], "type_labels": []})
            rec["label"] = rec["label"] or row.get("en")
            if row.get("type"):
                t = qid(row["type"])
                if t not in rec["types"]:
                    rec["types"].append(t); rec["type_labels"].append(row.get("typeLabel") or "")
    for rec in out.values():
        label = rec.get("label") or ""
        types = " ".join(rec["type_labels"]).lower()
        national = bool(set(rec["types"]) & NATIONAL_TYPES) or "national" in types or bool(NATIONAL_RE.search(label))
        youthish = bool(YOUTH_RE.search(label)) or any(w in types for w in ("youth", "reserve", "under-", "b team", "farm team", "academy"))
        if national:
            rec["kind"] = "national_youth" if youthish else "national"
        else:
            rec["kind"] = "reserve_youth" if youthish else "club"
        del rec["type_labels"]
    return out


def fetch_labels(qids: list[str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in chunks(qids, 300):
        values = " ".join(f"wd:{q}" for q in part)
        for row in sparql(f"""SELECT ?x ?en WHERE {{ VALUES ?x {{ {values} }} ?x rdfs:label ?en FILTER(LANG(?en)='en') }}"""):
            out[qid(row["x"])] = row["en"]
    return out


def main() -> None:
    global ARGS
    ARGS = parse_args()
    started = time.time()
    tm_ids = master_tm_ids()
    print(f"master players: {len(tm_ids)}")
    tm_map = map_tm_ids(sorted(tm_ids))
    print(f"matched to Wikidata by Transfermarkt ID: {len(tm_map)}")
    legends = legend_candidates(ARGS.legend_sitelinks)
    matched_qids = {v["qid"] for v in tm_map.values()}
    extra = {q: v for q, v in legends.items() if q not in matched_qids and not (v.get("tm") and v["tm"] in tm_ids)}
    print(f"well-known footballers (sitelinks >= {ARGS.legend_sitelinks}): {len(legends)}, not in master: {len(extra)}")
    all_qids = sorted(matched_qids | set(extra))
    stints = fetch_stints(all_qids)
    print(f"players with club history: {len(stints)}")
    people = fetch_people(sorted(set(extra) | matched_qids))
    teams = fetch_teams(sorted({s['team'] for rows in stints.values() for s in rows}))
    lookups = sorted({x for p in people.values() for x in p["positions"] + p["nationality"] + p["citizenship"]})
    labels = fetch_labels(lookups)
    players: dict[str, Any] = {}
    for q in all_qids:
        rec = dict(people.get(q, {}))
        rec["stints"] = stints.get(q, [])
        rec["in_master"] = q in matched_qids
        if q in extra and extra[q].get("tm"):
            rec["tm_id"] = extra[q]["tm"]
        players[q] = rec
    by_tm = {tm: v["qid"] for tm, v in tm_map.items()}
    doc = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "Wikidata Query Service (CC0)",
        "legend_sitelinks": ARGS.legend_sitelinks,
        "stats_scope": "P1350/P1351 on P54 statements: league appearances/goals as in Wikipedia infoboxes",
        "by_tm_id": by_tm,
        "players": players,
        "teams": teams,
        "labels": labels,
    }
    ARGS.output.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")))
    print(f"wrote {ARGS.output}: {len(players)} players, {len(teams)} teams in {time.time()-started:.0f}s")


if __name__ == "__main__":
    main()
