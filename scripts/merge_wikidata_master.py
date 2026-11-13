#!/usr/bin/env python3
"""Merge the Wikidata supplement into NEON XI's master player pool.

Inputs : side-games/data/master/transfermarkt-players.json (dcaribou build)
         side-games/data/master/wikidata-supplement.json   (build_wikidata_supplement.py)
Output : the same master file, same schema, plus provenance fields.

Rules (no name matching; joins use the Transfermarkt player ID stored on Wikidata):
  * club_count  — distinct senior clubs in the Wikidata club history (youth, reserve and
                  national teams excluded); kept from Transfermarkt when Wikidata has none.
  * career_appearances / career_goals — whole-career league totals (P1350/P1351, the
                  figures in Wikipedia infoboxes) when every senior club spell carries them;
                  otherwise the Transfermarkt value stays. `career_stats_source` says which.
  * international caps/goals, height, birth date — Transfermarkt first, Wikidata fills gaps.
  * clubs / club_ids are left untouched (XOX matches clubs by Transfermarkt ID); the full
                  Wikidata club path is stored in `career_clubs`.
  * Footballers missing from the master with >= legend_sitelinks Wikipedia editions are
                  added as `status: "legend"` (or "unknown" if a spell is still open).
"""
from __future__ import annotations

import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "side-games" / "data" / "master" / "transfermarkt-players.json"
META = ROOT / "side-games" / "data" / "master" / "transfermarkt-meta.json"
SUPPLEMENT = ROOT / ".tmp-wikidata" / "wikidata-supplement.json"
MAX_CLUBS = 25
LEGEND_ID_BASE = 900_000_000  # ids for players without a Transfermarkt ID: base + Wikidata number

COUNTRY_FIX = {
    "Turkey": "Türkiye", "United States of America": "United States", "People's Republic of China": "China",
    "Kingdom of the Netherlands": "Netherlands", "Ivory Coast": "Cote d'Ivoire", "Republic of Ireland": "Ireland",
    "Czech Republic": "Czech Republic", "South Korea": "Korea, South", "North Korea": "Korea, North",
    "Democratic Republic of the Congo": "DR Congo", "Republic of the Congo": "Congo", "Soviet Union": "Russia",
    "Kingdom of Italy": "Italy", "Kingdom of Spain": "Spain", "West Germany": "Germany", "German Reich": "Germany",
    "Yugoslavia": "Serbia", "Socialist Federal Republic of Yugoslavia": "Serbia", "Czechoslovakia": "Czech Republic",
    "Kingdom of Portugal": "Portugal", "Kingdom of Belgium": "Belgium", "Kingdom of Denmark": "Denmark",
    "Kingdom of Sweden": "Sweden", "Kingdom of Norway": "Norway", "Kingdom of Hungary": "Hungary",
}


def position_of(labels: list[str]) -> tuple[str, str | None]:
    text = " ".join(labels).lower()
    if "goalkeeper" in text:
        return "Goalkeeper", "Goalkeeper"
    order = [
        ("Defender", ("centre-back", "center back", "full-back", "fullback", "left-back", "right-back", "wing-back", "sweeper", "libero", "defender")),
        ("Midfield", ("midfielder", "playmaker", "regista", "mezzala")),
        ("Attack", ("forward", "striker", "winger", "attacker", "centre-forward")),
    ]
    first = labels[0].lower() if labels else ""
    for position, words in order:  # the first listed position wins, like Transfermarkt's main position
        if any(w in first for w in words):
            return position, labels[0].title()
    for position, words in order:
        if any(w in text for w in words):
            return position, None
    return "Missing", None


def senior(spell: dict[str, Any], birth_year: int | None) -> bool:
    """Drops boyhood clubs that Wikidata lists as ordinary clubs (no stats, ended before age 18)."""
    if spell.get("apps") is not None or not birth_year:
        return True
    m = re.match(r"\d{4}", spell.get("end") or spell.get("start") or "")
    return not m or int(m.group(0)) >= birth_year + 18


def clean(spell: dict[str, Any], goalkeeper: bool = False) -> dict[str, Any]:
    """Wikidata occasionally carries typos (negative or impossible totals); such figures become unknown."""
    spell = dict(spell)
    apps, goals = spell.get("apps"), spell.get("goals")
    if apps is not None and not 0 <= apps <= 1200:
        spell["apps"] = apps = None
    if goals is not None and (goals < 0 or goals > 1000 or (apps is not None and goals > max(apps, 1) * 3)
                              or (goalkeeper and goals > max(3, (apps or 0) * 0.1))):  # infobox "goals" of keepers are often goals conceded
        spell["goals"] = None
    return spell


def summarize(stints: list[dict[str, Any]], teams: dict[str, Any], labels: dict[str, str], birth: str | None = None,
              goalkeeper: bool = False) -> dict[str, Any]:
    by = int(birth[:4]) if birth and re.match(r"\d{4}", birth) else None
    stints = [clean(s, goalkeeper) for s in stints]
    clubs = [s for s in stints if teams.get(s["team"], {}).get("kind") == "club" and senior(s, by)]
    nats = [s for s in stints if teams.get(s["team"], {}).get("kind") == "national"]
    ordered = sorted(clubs, key=lambda s: (s.get("start") or "9999", s.get("end") or "9999"))  # ISO dates sort lexically
    path: list[str] = []
    for s in ordered:
        name = teams.get(s["team"], {}).get("label")
        if name and (not path or path[-1] != name):
            path.append(name)
    distinct = len({s["team"] for s in clubs})
    apps_ok = bool(clubs) and all(s.get("apps") is not None for s in clubs)
    goals_ok = apps_ok and all(s.get("goals") is not None or (s.get("apps") or 0) == 0 for s in clubs)
    caps = [s for s in nats if s.get("apps") is not None]
    open_spell = any(not s.get("end") for s in stints if teams.get(s["team"], {}).get("kind") == "club")
    return {
        "club_count": distinct if 0 < distinct <= MAX_CLUBS else None,
        "career_appearances": sum(s["apps"] for s in clubs) if apps_ok else None,
        "career_goals": sum(s.get("goals") or 0 for s in clubs) if goals_ok else None,
        "international_caps": sum(s["apps"] for s in caps) if caps else None,
        "international_goals": sum(s.get("goals") or 0 for s in caps) if caps else None,
        "career_clubs": path,
        "open_spell": open_spell,
        "last_year": max((int(m.group(0)) for s in clubs for m in [re.match(r"\d{4}", s.get("end") or s.get("start") or "")] if m), default=0),
    }


def main() -> None:
    master: list[dict[str, Any]] = json.loads(MASTER.read_text())
    sup = json.loads(SUPPLEMENT.read_text())
    teams, labels, players, by_tm = sup["teams"], sup["labels"], sup["players"], sup["by_tm_id"]
    known_countries = {r.get("nationality") for r in master if r.get("nationality")}
    country = lambda q: (lambda l: COUNTRY_FIX.get(l, l))(labels.get(q, "")) or None

    stats = {"matched": 0, "club_count": 0, "career_stats": 0, "filled": 0, "added": 0}
    master_ids = set()
    known_qids = {r.get("wikidata_id") for r in master if r.get("wikidata_id")}  # makes re-runs idempotent
    for row in master:
        master_ids.add(str(row["id"]))
        q = by_tm.get(str(row["id"]))
        if not q or q not in players:
            continue
        stats["matched"] += 1
        wd = players[q]
        s = summarize(wd.get("stints", []), teams, labels, wd.get("birth_date"), row.get("position") == "Goalkeeper")
        row["wikidata_id"] = q
        if s["career_clubs"]:
            row["career_clubs"] = s["career_clubs"]
        if s["club_count"]:
            row["club_count"] = s["club_count"]; stats["club_count"] += 1
        if s["career_appearances"] is not None and s["career_goals"] is not None:
            row["career_appearances"] = s["career_appearances"]; row["career_goals"] = s["career_goals"]
            row["career_stats_source"] = "wikidata_league"; stats["career_stats"] += 1
        elif row.get("career_goals") is not None:
            row["career_stats_source"] = "transfermarkt_2012"
        for field, value in (("international_caps", s["international_caps"]), ("international_goals", s["international_goals"]),
                             ("height_cm", wd.get("height_cm") if 140 <= (wd.get("height_cm") or 0) <= 220 else None), ("birth_date", wd.get("birth_date"))):
            if row.get(field) in (None, 0) and value:
                row[field] = value; stats["filled"] += 1

    added: list[dict[str, Any]] = []
    for q, wd in players.items():
        if wd.get("in_master") or q in known_qids:
            continue
        tm = str(wd.get("tm_id") or "")
        if tm and tm in master_ids:
            continue
        position, sub = position_of([labels.get(p, "") for p in wd.get("positions", [])])
        s = summarize(wd.get("stints", []), teams, labels, wd.get("birth_date"), position == "Goalkeeper")
        name = wd.get("label_en")
        if not name or not s["career_clubs"]:
            continue
        if position == "Missing":
            continue
        nat = next((country(c) for c in wd.get("nationality", []) if country(c) in known_countries), None) \
            or next((country(c) for c in wd.get("citizenship", []) if country(c) in known_countries), None) \
            or (country(wd["nationality"][0]) if wd.get("nationality") else None)
        apps = s["career_appearances"] or 0
        recognition = round((s["international_caps"] or 0) * 0.75 + math.sqrt(apps) * 2.5 + (s["club_count"] or 0) * 5
                            + (wd.get("sitelinks") or 0) * 2.2, 2)
        pid = int(tm) if tm.isdigit() else LEGEND_ID_BASE + int(q[1:])
        added.append({
            "id": pid, "name": name, "slug": None,
            "status": "unknown" if s["open_spell"] and s["last_year"] >= datetime.now().year - 1 else "legend",
            "recognition_score": recognition, "nationality": nat, "national_team": None,
            "current_club": None, "current_league": None, "position": position, "sub_position": sub, "foot": None,
            "birth_date": wd.get("birth_date"), "height_cm": wd.get("height_cm") if 140 <= (wd.get("height_cm") or 0) <= 220 else None, "weight_kg": None,
            "club_ids": [], "clubs": s["career_clubs"], "leagues": [], "club_count": s["club_count"], "trophies": None,
            "career_goals": s["career_goals"], "career_assists": None, "career_appearances": s["career_appearances"],
            "career_yellow_cards": None, "career_red_cards": None,
            "peak_market_value_eur": None, "current_market_value_eur": None,
            "international_caps": s["international_caps"], "international_goals": s["international_goals"],
            "last_season": s["last_year"] or None, "first_appearance": None, "last_appearance": None,
            "turkish_familiar": False, "wikidata_id": q, "career_clubs": s["career_clubs"],
            "career_stats_source": "wikidata_league" if s["career_goals"] is not None else None,
            "name_tr": wd.get("label_tr") if wd.get("label_tr") and wd.get("label_tr") != name else None,
        })
        stats["added"] += 1
    master.extend(added)
    master.sort(key=lambda r: (-float(r.get("recognition_score") or 0), r["name"], str(r["id"])))
    MASTER.write_text(json.dumps(master, ensure_ascii=False, separators=(",", ":")))

    meta = json.loads(META.read_text())
    meta.update({
        "player_count": len(master),
        "wikidata_generated_at": sup.get("generated_at"),
        "wikidata_merge": stats,
        "career_scope": "career_goals/career_appearances: whole-career league totals from Wikidata (Wikipedia infobox figures) "
                        "when complete for every senior club spell; otherwise official appearances in dcaribou/transfermarkt-datasets (2012+). "
                        "See career_stats_source per player.",
        "source_policy": "Transfermarkt (dcaribou/transfermarkt-datasets) for profiles, market values, current club and caps; "
                         "Wikidata (CC0), joined by Transfermarkt player ID (P2446), for club history, career league totals, "
                         "and players missing from the dataset (legends).",
    })
    counts = {}
    for r in master:
        counts[r.get("status") or "unknown"] = counts.get(r.get("status") or "unknown", 0) + 1
    meta["status_counts"] = counts
    meta["historical_player_count"] = sum(1 for r in master if r.get("status") in {"recent", "legend"})
    META.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
    print(json.dumps(stats), "total", len(master))


if __name__ == "__main__":
    main()
