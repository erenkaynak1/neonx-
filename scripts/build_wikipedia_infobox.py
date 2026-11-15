#!/usr/bin/env python3
"""English Wikipedia infobox stats for NEON XI players → .tmp-wikipedia/infobox.json.

Why: Wikidata's per-spell match counts (P1350) are often years behind; the "Infobox football biography" on
Wikipedia is what editors keep current. It is the third source next to Transfermarkt (dcaribou) and Wikidata,
and merge_wikidata_master.py cross-checks the three.

What: for the best-known players (by recognition) and everyone with Süper Lig matches, it resolves the English
Wikipedia article from the player's Wikidata item, reads only the lead section (where the infobox lives,
50 articles per request) and parses:
  * senior club spells: club, years, league apps, league goals, loan flag,
  * national teams: team, caps, goals (youth sides are kept but marked),
  * height (cm) and the infobox's own "club-update" / "nationalteam-update" dates.

Requests are paced, retried on 429/5xx and cached per article revision under .tmp-wikipedia/. When Wikipedia
keeps refusing, what was collected so far is written and the script exits normally, so the weekly build still
runs. Content: Wikipedia, CC BY-SA 4.0 (figures only).
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
import urllib.parse
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "side-games" / "data" / "master" / "transfermarkt-players.json"
CACHE = ROOT / ".tmp-wikipedia"
OUT = CACHE / "infobox.json"
UA = "NEONXI-football-pool-builder/1.0 (weekly batch; https://github.com/erenkaynak1/neonx-)"
WP_API = "https://en.wikipedia.org/w/api.php"
WD_API = "https://www.wikidata.org/w/api.php"
YOUTH_NT = re.compile(r"\bU-?\d{2}\b|under[- ]?\d{2}|youth|olympic|\bB\b|amateur|futsal|beach", re.I)

session = requests.Session()
session.headers["User-Agent"] = UA


def get(url: str, params: dict[str, Any], tries: int = 8) -> dict | None:
    delay = 5.0
    for _ in range(tries):
        try:
            r = session.get(url, params=params, timeout=60)
        except requests.RequestException:
            time.sleep(delay); delay = min(delay * 2, 120); continue
        if r.status_code == 200:
            try:
                data = r.json()
            except ValueError:
                time.sleep(delay); continue
            if data.get("error", {}).get("code") == "maxlag":
                time.sleep(float(r.headers.get("Retry-After") or delay)); continue
            return data
        if r.status_code in (429, 500, 502, 503, 504):
            time.sleep(float(r.headers.get("Retry-After") or delay)); delay = min(delay * 2, 180); continue
        return None
    return None


def enwiki_titles(qids: list[str]) -> dict[str, str]:
    """QID → English Wikipedia title, 400 items per SPARQL query (the Wikidata API throttles this much harder)."""
    out: dict[str, str] = {}
    for i in range(0, len(qids), 400):
        values = " ".join("wd:" + q for q in qids[i:i + 400])
        query = f"SELECT ?item ?article WHERE {{ VALUES ?item {{ {values} }} ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }}"
        rows = None
        for attempt in range(6):
            try:
                r = session.post("https://query.wikidata.org/sparql", data={"query": query},
                                 headers={"Accept": "application/sparql-results+json"}, timeout=120)
                if r.status_code == 200:
                    rows = r.json()["results"]["bindings"]; break
            except (requests.RequestException, ValueError):
                pass
            time.sleep(5 * (attempt + 1))
        for row in rows or []:
            title = urllib.parse.unquote(row["article"]["value"].rsplit("/wiki/", 1)[1]).replace("_", " ")
            out[row["item"]["value"].rsplit("/", 1)[1]] = title
        if (i // 400) % 10 == 0:
            print(f"  titles {min(i + 400, len(qids))}/{len(qids)}")
        time.sleep(0.5)
    return out


# ---------- wikitext parsing ----------
def strip_markup(v: str) -> str:
    v = re.sub(r"<!--.*?-->", "", v, flags=re.S)
    v = re.sub(r"<ref[^>]*/>|<ref[^>]*>.*?</ref>", "", v, flags=re.S)
    v = re.sub(r"\{\{(?:0|nbsp|efn|refn|sfn|small)[^{}]*\}\}", "", v, flags=re.I)
    v = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", v)
    v = re.sub(r"<[^>]+>", "", v)
    return html.unescape(v).strip()


def link_target(v: str) -> str:
    m = re.search(r"\[\[([^|\]]+)", v)
    return (m.group(1) if m else strip_markup(v)).strip()


def number(v: str) -> int | None:
    m = re.search(r"\d[\d,]*", strip_markup(v).replace("(", " ").replace(")", " "))
    if not m:
        return None
    n = int(m.group(0).replace(",", ""))
    return n if n < 2000 else None


def height_cm(v: str) -> int | None:
    v = strip_markup(v)
    m = re.search(r"(?:cvt|convert|height)\|(\d(?:\.\d+)?)\|m", v) or re.search(r"(\d\.\d{2})\s*m", v)
    if m:
        cm = round(float(m.group(1)) * 100)
    else:
        m = re.search(r"(\d{3})\s*cm", v)
        cm = int(m.group(1)) if m else None
    return cm if cm and 150 <= cm <= 210 else None


def infobox_params(text: str) -> dict[str, str]:
    i = text.find("{{Infobox football biography")
    if i < 0:
        return {}
    depth, j = 0, i
    while j < len(text):
        if text.startswith("{{", j):
            depth += 1; j += 2; continue
        if text.startswith("}}", j):
            depth -= 1; j += 2
            if depth == 0:
                break
            continue
        j += 1
    box = text[i:j]
    params: dict[str, str] = {}
    # split on top-level pipes that start a "| key =" line
    for m in re.finditer(r"\n\s*\|\s*([a-z_\-0-9]+)\s*=(.*?)(?=\n\s*\|\s*[a-z_\-0-9]+\s*=|\n?\}\}$|\Z)", box, re.S):
        params[m.group(1).strip()] = m.group(2).strip()
    return params


def parse(text: str) -> dict[str, Any] | None:
    p = infobox_params(text)
    if not p:
        return None
    clubs, nats = [], []
    for n in range(1, 40):
        club = p.get(f"clubs{n}")
        if club is None:
            continue
        name = link_target(club)
        clubs.append({"club": name, "label": strip_markup(club).lstrip("→ ").strip(), "years": strip_markup(p.get(f"years{n}", "")),
                      "apps": number(p.get(f"caps{n}", "")), "goals": number(p.get(f"goals{n}", "")),
                      "loan": "→" in club or "loan" in club.lower()})
    for n in range(1, 25):
        team = p.get(f"nationalteam{n}") or p.get(f"national_team{n}")
        if team is None:
            continue
        label = strip_markup(team)
        nats.append({"team": link_target(team), "label": label, "caps": number(p.get(f"nationalcaps{n}") or p.get(f"national_caps{n}") or ""),
                     "goals": number(p.get(f"nationalgoals{n}") or p.get(f"national_goals{n}") or ""),
                     "youth": bool(YOUTH_NT.search(label) or YOUTH_NT.search(link_target(team)))})
    upd = strip_markup(p.get("club-update") or p.get("clubupdate") or p.get("pcupdate") or "")
    nupd = strip_markup(p.get("nationalteam-update") or p.get("ntupdate") or "")
    return {"clubs": clubs, "national": nats, "height_cm": height_cm(p.get("height", "")),
            "club_update": upd[:40] or None, "national_update": nupd[:40] or None}


def fetch_infoboxes(titles: list[str], deadline: float) -> dict[str, dict]:
    CACHE.mkdir(exist_ok=True)
    cache_file = CACHE / "lead-cache.json"
    cache: dict[str, Any] = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    out: dict[str, dict] = {}
    todo = [t for t in titles if t not in cache]
    for i in range(0, len(todo), 50):
        if time.time() > deadline:
            print("time budget used up; keeping what was collected"); break
        part = todo[i:i + 50]
        data = get(WP_API, {"action": "query", "prop": "revisions", "rvprop": "content|ids", "rvslots": "main", "rvsection": "0",
                            "titles": "|".join(part), "redirects": "1", "format": "json", "formatversion": "2", "maxlag": "5"})
        if data is None:
            print("Wikipedia keeps refusing; keeping what was collected"); break
        redirects = {r["to"]: r["from"] for r in data.get("query", {}).get("redirects", []) or []}
        norm = {r["to"]: r["from"] for r in data.get("query", {}).get("normalized", []) or []}
        for page in data.get("query", {}).get("pages", []):
            rev = (page.get("revisions") or [{}])[0]
            text = rev.get("slots", {}).get("main", {}).get("content", "")
            title = page.get("title", "")
            asked = redirects.get(title, title)
            asked = norm.get(asked, asked)
            cache[asked] = {"revid": rev.get("revid"), "box": parse(text) if text else None}
        if (i // 50) % 10 == 0:
            cache_file.write_text(json.dumps(cache, ensure_ascii=False))
            print(f"  {min(i + 50, len(todo))}/{len(todo)} articles")
        time.sleep(1.0)
    cache_file.write_text(json.dumps(cache, ensure_ascii=False))
    for t in titles:
        if cache.get(t, {}).get("box"):
            out[t] = cache[t]["box"]
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--top", type=int, default=20000, help="best-known players to look up")
    ap.add_argument("--budget-minutes", type=float, default=150)
    ap.add_argument("--no-superlig", action="store_true", help="only the --top best-known players (quick test)")
    args = ap.parse_args()
    deadline = time.time() + args.budget_minutes * 60
    master = json.loads(MASTER.read_text(encoding="utf-8"))
    ranked = sorted((r for r in master if r.get("wikidata_id")), key=lambda r: -float(r.get("recognition_score") or 0))
    chosen = {r["wikidata_id"] for r in ranked[: args.top]}
    if not args.no_superlig:
        chosen |= {r["wikidata_id"] for r in ranked if (r.get("superlig_appearances") or 0) > 0}
    qids = sorted(chosen)
    print(f"players to look up: {len(qids)}")
    titles = enwiki_titles(qids)
    print(f"with an English Wikipedia article: {len(titles)}")
    boxes = fetch_infoboxes(sorted(set(titles.values())), deadline)
    by_qid = {q: dict(boxes[t], title=t) for q, t in titles.items() if t in boxes}
    OUT.write_text(json.dumps({"generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "source": "English Wikipedia infoboxes (CC BY-SA 4.0)",
                               "players": by_qid}, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {OUT.name}: {len(by_qid)} players with an infobox")


if __name__ == "__main__":
    sys.exit(main())
