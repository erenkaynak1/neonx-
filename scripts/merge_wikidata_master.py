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
WORLD_CUPS = ROOT / ".tmp-wikidata" / "world-cups.json"  # from build_world_cups.py (optional)
INFOBOX = ROOT / ".tmp-wikipedia" / "infobox.json"  # from build_wikipedia_infobox.py (optional)
REEP = ROOT / ".tmp-reep" / "links.json"  # from build_reep_links.py (optional)


def same_birth(a: str | None, b: str | None) -> bool | None:
    """None when either is unknown. Wikidata stores year-only dates as YYYY-01-01, so those match on the year."""
    if not a or not b or len(a) < 10 or len(b) < 10:
        return None
    if a[:4] != b[:4]:
        return False
    if a[5:] == "01-01" or b[5:] == "01-01":
        return True
    return a[:10] == b[:10]
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


# Reserve, youth and academy sides that Wikidata stores as separate clubs: they do not count as clubs.
RESERVE_TEAM = re.compile(
    r"(\s(B|C|II|III|IV)$|\bU-?\d{2}s?\b|\bUnder[- ]?\d{2}s?\b|\bSub-?\d{2}\b|\bYouth\b|\bAcadem(y|ia)\b|\bJuvenil|"
    r"\bPrimavera\b|\bReserves?\b|\bCastilla\b|\bAtl[eè]tic$|^Jong\s|\bJunior Team\b|\bNext Gen\b|\bAmateure\b|\bJugend\b|"
    r"\bFutures\b|\bDevelopment Squad\b|\bB team\b)", re.I)
SENIOR_EXCEPTIONS = {"Willem II"}


def first_team(label: str) -> bool:
    return bool(label) and (label in SENIOR_EXCEPTIONS or not RESERVE_TEAM.search(label))


def senior(spell: dict[str, Any], birth_year: int | None) -> bool:
    """Drops boyhood clubs that Wikidata lists as ordinary clubs (no stats, ended before age 18)."""
    if spell.get("apps") is not None or not birth_year:
        return True
    if not spell.get("end"):
        # Still running: the current club, also when joined as a teenager (e.g. at 17); a bare youth club
        # with neither end nor stats that started in childhood stays out.
        m = re.match(r"\d{4}", spell.get("start") or "")
        return not m or int(m.group(0)) >= birth_year + 15
    m = re.match(r"\d{4}", spell.get("end") or "")
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


# Only the senior men's football national team counts as caps: not women's, B/C, futsal, beach soccer,
# other sports or regional selections that Wikidata also types as national teams.
SENIOR_NT = re.compile(r"^[\w .'()-]+? (men's )?national (association )?(football|soccer) team$", re.I)
NOT_SENIOR_NT = re.compile(r"women|ladies|f[eé]minin|femen|frauen|\bB team|\bC team|futsal|beach|hockey|cricket|handball|bandy|rugby|"
                           r"semi-professional|amateur|under|olympic|representative", re.I)
WOMEN_TEAM = re.compile(r"women|ladies|f[eé]minin|femen|frauen|\bLFC\b|\bW\.?F\.?C\b", re.I)
MAX_CAPS = 250  # the men's record is in the low 200s; anything above is a Wikidata typo


def senior_national(label: str) -> bool:
    return bool(label and SENIOR_NT.match(label) and not NOT_SENIOR_NT.search(label))


def womens_player(stints: list[dict[str, Any]], teams: dict[str, Any]) -> bool:
    return any(WOMEN_TEAM.search(teams.get(s["team"], {}).get("label") or "") for s in stints)


def summarize(stints: list[dict[str, Any]], teams: dict[str, Any], labels: dict[str, str], birth: str | None = None,
              goalkeeper: bool = False) -> dict[str, Any]:
    by = int(birth[:4]) if birth and re.match(r"\d{4}", birth) else None
    stints = [clean(s, goalkeeper) for s in stints]
    clubs = [s for s in stints if teams.get(s["team"], {}).get("kind") == "club" and senior(s, by)
             and first_team(teams.get(s["team"], {}).get("label") or "")
             and not WOMEN_TEAM.search(teams.get(s["team"], {}).get("label") or "")]
    # Wikidata sometimes copies one spell's figures onto another club (same matches, near-same goals): keep one.
    kept: list[dict[str, Any]] = []
    for s in clubs:
        a, g = s.get("apps"), s.get("goals")
        if a and a >= 50 and any(k.get("apps") == a and abs((k.get("goals") or 0) - (g or 0)) <= 3 for k in kept):
            continue
        kept.append(s)
    clubs = kept
    nats = [s for s in stints if teams.get(s["team"], {}).get("kind") == "national"
            and senior_national(teams.get(s["team"], {}).get("label") or "")
            and not (s.get("apps") is not None and (s.get("goals") or 0) > s["apps"])]  # more goals than caps: a typo
    ordered = sorted(clubs, key=lambda s: (s.get("start") or "9999", s.get("end") or "9999"))  # ISO dates sort lexically
    path: list[str] = []
    for s in ordered:
        name = teams.get(s["team"], {}).get("label")
        if name and (not path or path[-1] != name):
            path.append(name)
    # A club counts once however many spells the player had there (also when Wikidata has two items for it).
    norm = lambda q: re.sub(r"[^a-z0-9]", "", (teams.get(q, {}).get("label") or q).lower())
    distinct = len({norm(s["team"]) for s in clubs})
    apps_ok = bool(clubs) and all(s.get("apps") is not None for s in clubs)
    goals_ok = apps_ok and all(s.get("goals") is not None or (s.get("apps") or 0) == 0 for s in clubs)
    # Successor teams (Yugoslavia / Serbia and Montenegro / Serbia) often repeat the same totals: count once.
    caps = list({(s["apps"], s.get("goals")): s for s in nats if s.get("apps") is not None}.values())
    if caps and sum(s["apps"] for s in caps) > MAX_CAPS:
        caps = []
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


def cross_check_infoboxes(master: list[dict[str, Any]], stats: dict[str, Any]) -> None:
    """Third source: English Wikipedia infoboxes, which editors keep more current than Wikidata.

    * Whole-career league apps/goals: the infobox total replaces the Wikidata one unless it is clearly stale
      (below the larger of the two by more than 10%, or below half of the 2012+ Transfermarkt log).
    * Caps / international goals (senior team only): the highest of the sources, since every source only
      ever lags behind; a source more than 10% below the highest is counted as a disagreement.
    * Club count: distinct first-team clubs in the infobox (loans included, youth/reserve sides out).
    * Height: fills gaps; Transfermarkt wins on conflict.
    Agreement/disagreement counts land in meta wikidata_merge.infobox."""
    if not INFOBOX.exists():
        return
    boxes = json.loads(INFOBOX.read_text(encoding="utf-8")).get("players", {})
    xs = {"players": 0, "apps_agree": 0, "apps_replaced": 0, "apps_stale_skipped": 0, "caps_agree": 0, "caps_raised": 0,
          "clubs_agree": 0, "clubs_changed": 0, "height_filled": 0, "height_conflict": 0}
    norm = lambda name: re.sub(r"[^a-z0-9]", "", re.sub(r"\(.*?\)", "", name.lower()))
    def senior_clubs(b: dict) -> list[dict]:
        return [c for c in (b or {}).get("clubs", []) if first_team(c.get("label") or c.get("club") or "")
                and first_team(c.get("club") or "") and not WOMEN_TEAM.search(c.get("club") or "")]

    def complete(cs: list[dict]) -> bool:
        return bool(cs) and all(c.get("apps") is not None and c.get("goals") is not None for c in cs)

    for row in master:
        entry = boxes.get(row.get("wikidata_id") or "")
        if not entry:
            continue
        xs["players"] += 1
        # English and Turkish infoboxes: both only ever lag, so the one with more league matches is the fresher.
        options = [b for b in (entry if entry.get("clubs") is not None else None, entry.get("tr")) if b]
        best = max(options, key=lambda b: (complete(senior_clubs(b)), sum(c.get("apps") or 0 for c in senior_clubs(b))))
        box = dict(best)
        box["national"] = max((b.get("national", []) for b in options),
                              key=lambda ns: sum(t.get("caps") or 0 for t in ns if not t.get("youth")))
        box["height_cm"] = best.get("height_cm") or next((b.get("height_cm") for b in options if b.get("height_cm")), None)
        if len(options) == 2:
            xs["both_languages"] = xs.get("both_languages", 0) + 1
        clubs = senior_clubs(box)
        if clubs and all(c.get("apps") is not None and c.get("goals") is not None for c in clubs):
            ib_apps, ib_goals = sum(c["apps"] for c in clubs), sum(c["goals"] for c in clubs)
            cur = row.get("career_appearances") if row.get("career_stats_source") == "wikidata_league" else None
            tm_log = row.get("career_appearances") if row.get("career_stats_source") != "wikidata_league" else 0
            if ib_apps < 0.5 * (tm_log or 0) or (cur and ib_apps < 0.9 * cur):
                xs["apps_stale_skipped"] += 1
            else:
                if cur and abs(ib_apps - cur) <= max(3, cur * 0.03):
                    xs["apps_agree"] += 1
                else:
                    xs["apps_replaced"] += 1
                row["career_appearances"], row["career_goals"], row["career_stats_source"] = ib_apps, ib_goals, "wikipedia_infobox"
        if clubs:
            n = len({norm(c["club"]) for c in clubs})
            if 0 < n <= MAX_CLUBS:
                xs["clubs_agree" if n == row.get("club_count") else "clubs_changed"] += 1
                row["club_count"] = n
        senior = [t for t in box.get("national", []) if not t.get("youth") and t.get("caps") is not None]
        if senior:
            caps, goals = sum(t["caps"] for t in senior), sum(t.get("goals") or 0 for t in senior)
            have = row.get("international_caps") or 0
            if caps <= MAX_CAPS and goals <= caps:
                if abs(caps - have) <= max(1, have * 0.1):
                    xs["caps_agree"] += 1
                if caps > have:
                    xs["caps_raised"] += 1
                    row["international_caps"], row["international_goals"] = caps, max(goals, row.get("international_goals") or 0)
        h = box.get("height_cm")
        if h:
            if not row.get("height_cm"):
                row["height_cm"] = h; xs["height_filled"] += 1
            elif abs(row["height_cm"] - h) > 3:
                xs["height_conflict"] += 1
    stats["infobox"] = xs


def cross_check_bio(master: list[dict[str, Any]], players: dict[str, Any], stats: dict[str, Any]) -> None:
    """Birth date and height by majority of Transfermarkt, Wikidata, Wikipedia (height) and Reep.

    Transfermarkt stays unless at least two other sources agree with each other and not with it; gaps are
    filled when one other source has a value (two must agree when they are available)."""
    reep = json.loads(REEP.read_text())["by_tm"] if REEP.exists() else {}
    boxes = json.loads(INFOBOX.read_text(encoding="utf-8")).get("players", {}) if INFOBOX.exists() else {}
    xs = {"birth_confirmed": 0, "birth_fixed": 0, "birth_filled": 0, "height_confirmed": 0, "height_fixed": 0, "height_filled": 0}
    for row in master:
        q, r = row.get("wikidata_id"), reep.get(str(row.get("id")), {})
        wd = players.get(q, {}) if q else {}
        # birth date (full dates only)
        others = [d[:10] for d in (wd.get("birth_date"), r.get("dob")) if d and len(d) >= 10 and d[5:10] != "01-01"]
        tm = row.get("birth_date")
        if others:
            if tm and len(tm) >= 10:
                if tm[:10] in others:
                    xs["birth_confirmed"] += 1
                elif len(others) == 2 and others[0] == others[1]:
                    row["birth_date"] = others[0]; xs["birth_fixed"] += 1
            elif len(set(others)) == 1:
                row["birth_date"] = others[0]; xs["birth_filled"] += 1
        # height (cm)
        hs = [h for h in (r.get("height_cm"), (boxes.get(q) or {}).get("height_cm") if q else None, wd.get("height_cm")) if h and 150 <= h <= 210]
        th = row.get("height_cm")
        if hs:
            if th:
                if any(abs(th - h) <= 1 for h in hs):
                    xs["height_confirmed"] += 1
                else:
                    agree = [a for a in hs if sum(abs(a - b) <= 1 for b in hs) >= 2]
                    if agree:
                        row["height_cm"] = round(sum(agree) / len(agree)); xs["height_fixed"] += 1
            elif len(hs) == 1 or max(hs) - min(hs) <= 2:
                row["height_cm"] = round(sum(hs) / len(hs)); xs["height_filled"] += 1
    stats["bio"] = xs


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
        wd = players[q]
        if same_birth(row.get("birth_date"), wd.get("birth_date")) is False:
            stats["birth_mismatch_skipped"] = stats.get("birth_mismatch_skipped", 0) + 1
            continue  # a wrong link: never copy another person's career
        stats["matched"] += 1
        s = summarize(wd.get("stints", []), teams, labels, wd.get("birth_date"), row.get("position") == "Goalkeeper")
        row["wikidata_id"] = q
        if s["career_clubs"]:
            row["career_clubs"] = s["career_clubs"]
        if s["club_count"]:
            row["club_count"] = s["club_count"]; stats["club_count"] += 1
        # Wikidata infobox totals are sometimes years out of date: if they fall far below the matches the
        # player has logged since 2012 alone, they are stale and not used.
        stale = s["career_appearances"] is not None and s["career_appearances"] < 0.5 * (row.get("career_appearances") or 0)
        if s["career_appearances"] is not None and s["career_goals"] is not None and not stale:
            row["career_appearances"] = s["career_appearances"]; row["career_goals"] = s["career_goals"]
            row["career_stats_source"] = "wikidata_league"; stats["career_stats"] += 1
        elif row.get("career_goals") is not None:
            row["career_stats_source"] = "transfermarkt_2012"
        # Fame beyond the Transfermarkt window: the TM score only sees 2012+ matches and values, which buries
        # legends who were still playing then (Buffon, Casillas, Pirlo...). Use the same whole-career formula
        # as for players added from Wikidata and keep the higher of the two.
        whole = round((s["international_caps"] or row.get("international_caps") or 0) * 0.75
                      + math.sqrt(s["career_appearances"] or 0) * 2.5 + (s["club_count"] or 0) * 5
                      + (wd.get("sitelinks") or 0) * 2.2, 2)
        if whole > float(row.get("recognition_score") or 0):
            row["recognition_score"] = whole; stats["recognition_raised"] = stats.get("recognition_raised", 0) + 1
        for field, value in (("international_caps", s["international_caps"]), ("international_goals", s["international_goals"]),
                             ("height_cm", wd.get("height_cm") if 140 <= (wd.get("height_cm") or 0) <= 220 else None), ("birth_date", wd.get("birth_date"))):
            if row.get(field) in (None, 0) and value:
                if field == "international_goals" and value > (row.get("international_caps") or 0):
                    continue  # goals can't outnumber the caps they were scored in
                row[field] = value; stats["filled"] += 1

    added: list[dict[str, Any]] = []
    for q, wd in players.items():
        if wd.get("in_master") or q in known_qids:
            continue
        tm = str(wd.get("tm_id") or "")
        if tm and tm in master_ids:
            continue
        if womens_player(wd.get("stints", []), teams):
            continue  # the game covers men's football only
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
    cross_check_infoboxes(master, stats)
    cross_check_bio(master, players, stats)
    # World Cup squads (1930-2026). The squad lists are complete, so a player with a Wikidata item and no
    # entry was in no World Cup squad (0); without a Wikidata item the count is unknown (null).
    wc_doc = json.loads(WORLD_CUPS.read_text()) if WORLD_CUPS.exists() else None
    if wc_doc:
        wc_years = wc_doc["years"]
        for row in master:
            q = row.get("wikidata_id")
            row["world_cups"] = len(wc_years.get(q, [])) if q else None
        stats["world_cup_players"] = sum(1 for r in master if r.get("world_cups"))
    master.sort(key=lambda r: (-float(r.get("recognition_score") or 0), r["name"], str(r["id"])))
    MASTER.write_text(json.dumps(master, ensure_ascii=False, separators=(",", ":")))

    meta = json.loads(META.read_text())
    if wc_doc:
        meta["world_cups_source"] = (
            f"world_cups: men's FIFA World Cup squads 1930-{wc_doc['complete_through']}, from Wikidata (P1344) and the "
            "Fjelstul World Cup Database © 2023 Joshua C. Fjelstul, Ph.D. (https://www.github.com/jfjelstul/worldcup), "
            "CC-BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/legalcode); squad counts derived from it.")
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
