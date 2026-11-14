#!/usr/bin/env python3
"""Add `superlig_appearances` (Turkish top-flight league matches) to NEON XI's master pool.

Two sources, joined by Transfermarkt IDs (no name matching):
  * 2012/13 onwards — exact: every Süper Lig (TR1) appearance in dcaribou/transfermarkt-datasets.
  * Before 2012/13  — Wikidata club spells (P54 with P1350 league apps) at Turkish clubs that played in
    the Süper Lig. A spell that runs past summer 2012 counts only its part before 2012/13: the exact
    TR1 appearances for that club after 2012 are subtracted from the spell total.

Players whose pre-2012 Süper Lig spells have no match count on Wikidata get no value (null), never a
guess. Known limitation: a spell at a club that was relegated for some of those seasons includes its
second-tier league matches, because Wikidata stores one league total per spell.

Inputs: master pool, .tmp-wikidata/wikidata-supplement.json, .tmp-wikidata/turkish-clubs.json
(Turkish club QIDs → Transfermarkt club IDs, see fetch_turkish_clubs), .tmp-transfermarkt.duckdb.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import time
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "side-games" / "data" / "master" / "transfermarkt-players.json"
META = ROOT / "side-games" / "data" / "master" / "transfermarkt-meta.json"
SUPPLEMENT = ROOT / ".tmp-wikidata" / "wikidata-supplement.json"
TURKISH_CLUBS = ROOT / ".tmp-wikidata" / "turkish-clubs.json"
DUCKDB = ROOT / ".tmp-transfermarkt.duckdb"
CUTOFF_START, CUTOFF_END = "2012-07-01", "2012-08-15"
LEAGUE_FOUNDED = 1959  # the national league (Milli Lig, today's Süper Lig) started in 1959

# Clubs that played in the Turkish top flight before 2012/13 but not since (so they are missing from the
# TR1 appearance log), plus duplicate Wikidata items of the big clubs. Only clubs whose top-flight
# history is certain are listed; anything uncertain is left out rather than counted.
HISTORIC_TOP_FLIGHT = {
    "Q891679": "Boluspor", "Q128148": "Manisaspor", "Q176795": "Karşıyaka", "Q340133": "Hacettepe",
    "Q630348": "Bucaspor", "Q1369461": "Sakaryaspor", "Q447191": "Altınordu", "Q520207": "Diyarbakırspor",
    "Q1368064": "Malatyaspor", "Q179930": "Dardanelspor", "Q1933473": "Sarıyer", "Q424646": "Akçaabat Sebatspor",
    "Q197093": "Zeytinburnuspor", "Q1366316": "Erzurumspor", "Q804557": "Bakırköyspor", "Q6080023": "Vanspor",
    "Q1584904": "Siirtspor", "Q792916": "Aydınspor", "Q219935": "Zonguldakspor", "Q1853596": "Vefa",
    "Q1676156": "İzmirspor", "Q556437": "Ankara Demirspor", "Q1351085": "Tarsus İdman Yurdu",
    "Q1843435": "Beykoz 1908", "Q1757369": "Yozgatspor", "Q4285478": "Şekerspor",
    "Q43134": "Galatasaray (duplicate item)", "Q19648": "Fenerbahçe (duplicate item)",
}
NOT_TURKISH = {"Q2426819"}  # Atlético Morelia carries a stray Turkish country statement on Wikidata


def fetch_turkish_clubs(club_qids: list[str]) -> dict[str, list[str]]:
    """Turkish clubs (P17 = Türkiye) among the given QIDs, with their Transfermarkt club IDs (P7223)."""
    out: dict[str, list[str]] = {}
    for i in range(0, len(club_qids), 300):
        part = club_qids[i:i + 300]
        query = "SELECT ?c ?tm WHERE { VALUES ?c { %s } ?c wdt:P17 wd:Q43 . OPTIONAL { ?c wdt:P7223 ?tm } }" % " ".join("wd:" + q for q in part)
        for attempt in range(6):
            run = subprocess.run(["curl", "-sS", "-m", "120", "-X", "POST", "https://query.wikidata.org/sparql",
                                  "-H", "Accept: application/sparql-results+json", "-A", "NEONXI-football-pool-builder/1.0",
                                  "--data-urlencode", "query=" + query], capture_output=True, text=True)
            try:
                rows = json.loads(run.stdout)["results"]["bindings"]
                break
            except Exception:
                time.sleep(8 * (attempt + 1))
        else:
            raise RuntimeError("Wikidata query failed")
        for row in rows:
            qid = row["c"]["value"].rsplit("/", 1)[1]
            out.setdefault(qid, [])
            if "tm" in row:
                out[qid].append(row["tm"]["value"])
        time.sleep(1)
    return out


def year(value: str | None) -> int | None:
    m = re.match(r"(\d{4})", value or "")
    return int(m.group(1)) if m else None


def main() -> None:
    master = json.loads(MASTER.read_text(encoding="utf-8"))
    sup = json.loads(SUPPLEMENT.read_text(encoding="utf-8"))
    teams, players, by_tm = sup["teams"], sup["players"], sup["by_tm_id"]
    if TURKISH_CLUBS.exists():
        turkish = json.loads(TURKISH_CLUBS.read_text(encoding="utf-8"))
    else:
        turkish = fetch_turkish_clubs([q for q, t in teams.items() if t.get("kind") == "club"])
        TURKISH_CLUBS.write_text(json.dumps(turkish, ensure_ascii=False), encoding="utf-8")

    con = duckdb.connect(str(DUCKDB), read_only=True)
    tr1_total = {int(p): int(n) for p, n in con.execute(
        "SELECT player_id, count(*) FROM appearances WHERE competition_id='TR1' GROUP BY 1").fetchall()}
    tr1_by_club: dict[tuple[int, str], int] = {(int(p), str(c)): int(n) for p, c, n in con.execute(
        "SELECT player_id, player_club_id, count(*) FROM appearances WHERE competition_id='TR1' GROUP BY 1, 2").fetchall()}
    tr1_clubs = {str(c) for (c,) in con.execute("SELECT DISTINCT player_club_id FROM appearances WHERE competition_id='TR1'").fetchall()}
    first_season = con.execute("SELECT min(date) FROM appearances WHERE competition_id='TR1'").fetchone()[0]
    con.close()

    top_flight = {q: tms for q, tms in turkish.items()
                  if q not in NOT_TURKISH and teams.get(q, {}).get("kind") == "club"
                  and (any(t in tr1_clubs for t in tms) or q in HISTORIC_TOP_FLIGHT)}

    stats = {"exact_only": 0, "with_wikidata": 0, "unknown": 0, "zero": 0}
    for row in master:
        pid = int(row["id"])
        recent = tr1_total.get(pid, 0)
        qid = row.get("wikidata_id") or by_tm.get(str(pid))
        wd = players.get(qid) if qid else None
        birth = year(row.get("birth_date"))
        if not wd:
            # No club history on Wikidata: only safe when the whole career falls inside the TR1 log.
            started_late = (row.get("first_appearance") or "") >= CUTOFF_START or (birth or 0) >= 1995
            row["superlig_appearances"] = recent if started_late else None
            stats["exact_only" if started_late else "unknown"] += 1
            continue
        earlier, unknown = 0, False
        for st in wd.get("stints", []):
            club = st.get("team")
            if club not in top_flight:
                continue
            start, end, apps = st.get("start") or "", st.get("end") or "", st.get("apps")
            if start and start >= CUTOFF_START:
                continue  # entirely inside the exact TR1 log
            # Wikidata often stores only the year ("2012-01-01"). A spell that starts in 2012 and has no
            # match count is a 2012 transfer: its Süper Lig matches are in the exact TR1 log.
            if apps is None and year(start) == 2012:
                continue
            if apps is None:
                # Boyhood spells (ended before 18) carry no stats and are not senior matches.
                if birth and year(end or start) and year(end or start) < birth + 18:
                    continue
                unknown = True
                break
            # A spell that began before the league existed (1959) also counts Istanbul/Ankara/İzmir league
            # matches; keep only the share of its seasons from 1959 on.
            sy, ey = year(start), year(end)
            if sy and sy < LEAGUE_FOUNDED:
                if not ey or ey <= LEAGUE_FOUNDED:
                    continue
                apps = round(int(apps) * (ey - LEAGUE_FOUNDED) / max(1, ey - sy))
            if not end or end >= CUTOFF_END:
                after = sum(tr1_by_club.get((pid, tm), 0) for tm in top_flight[club])
                earlier += max(0, int(apps) - after)
            else:
                earlier += int(apps)
        if unknown:
            row["superlig_appearances"] = None
            stats["unknown"] += 1
        else:
            row["superlig_appearances"] = recent + earlier
            stats["with_wikidata" if earlier else ("zero" if not recent else "exact_only")] += 1

    MASTER.write_text(json.dumps(master, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    meta = json.loads(META.read_text(encoding="utf-8"))
    meta["superlig_scope"] = (
        f"superlig_appearances: Süper Lig league matches. {first_season} onwards from the TR1 appearance log "
        "(exact); earlier seasons from Wikidata club spells at Turkish top-flight clubs (spells overlapping "
        "2012/13 count only the part before it). Null when an earlier spell has no match count."
    )
    meta["superlig_stats"] = stats
    META.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(stats), "top-flight clubs:", len(top_flight))


if __name__ == "__main__":
    sys.exit(main())
