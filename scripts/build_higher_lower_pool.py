#!/usr/bin/env python3
"""Build the Higher or Lower player pool from NEON XI's master pool.

Only well-known players (highest recognition) are kept, so every comparison is between names people
know. Each player carries the values the game asks about; a missing value stays absent (never 0), and
the game only pairs players who both have the value of the current question.

Output: side-games/higher-lower/data/players.json (compact keys) and meta.json.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_xox_master_pool import COUNTRY_INDEX, norm  # Turkish country names shared with XOX
MASTER = ROOT / "side-games" / "data" / "master" / "transfermarkt-players.json"
OUT_DIR = ROOT / "side-games" / "higher-lower" / "data"

# compact key -> master field
FIELDS = {
    "caps": "international_caps",
    "ig": "international_goals",
    "yc": "career_yellow_cards",
    "rc": "career_red_cards",
    "pv": "peak_market_value_eur",
    "cv": "current_market_value_eur",
    "g": "career_goals",
    "a": "career_assists",
    "ap": "career_appearances",
    "h": "height_cm",
    "cl": "club_count",
    "sl": "superlig_appearances",
    "wc": "world_cups",
}
MIN_PER_METRIC = 150


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--master", type=Path, default=MASTER)
    parser.add_argument("--out-dir", type=Path, default=OUT_DIR)
    parser.add_argument("--size", type=int, default=2600, help="how many of the best-known players to keep")
    return parser.parse_args()


def number(value):
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) and value >= 0 else None


def build(args: argparse.Namespace) -> dict:
    master = json.loads(args.master.read_text(encoding="utf-8"))
    ranked = sorted(
        (p for p in master if p.get("id") and p.get("name") and p.get("position") in {"Goalkeeper", "Defender", "Midfield", "Attack"}),
        key=lambda p: -float(p.get("recognition_score") or 0),
    )
    # Süper Lig questions need Turkish-league names people know, legends included: add the best-known
    # players with Süper Lig matches who fall outside the recognition cut.
    chosen = ranked[: args.size]
    seen = {p["id"] for p in chosen}
    chosen += [p for p in ranked if p["id"] not in seen and (p.get("superlig_appearances") or 0) >= 60][:900]
    rows = []
    for p in chosen:
        row = {
            "id": int(p["id"]),
            "n": str(p["name"]).strip(),
            "nat": COUNTRY_INDEX.get(norm(p.get("nationality") or "")) or p.get("nationality") or None,
            "pos": p["position"],
            "club": p.get("current_club") if p.get("status") == "active" else None,
            "st": p.get("status") or "unknown",
            "b": p.get("birth_date") if isinstance(p.get("birth_date"), str) and len(p["birth_date"]) == 10 else None,
            "r": round(float(p.get("recognition_score") or 0), 1),
        }
        for key, field in FIELDS.items():
            value = number(p.get(field))
            # Current market value only means something for players still playing.
            if key == "cv" and p.get("status") != "active":
                value = None
            # "Whole-career league" questions only use whole-career league totals (Wikidata), never the
            # 2012+ Transfermarkt counts, which miss earlier seasons and include cup matches.
            if key in ("g", "ap") and p.get("career_stats_source") not in ("wikidata_league", "wikipedia_infobox"):
                value = None
            if key == "h" and value is not None and not 140 <= value <= 220:
                value = None
            if value is not None:
                row[key] = value
        rows.append({k: v for k, v in row.items() if v is not None})
    coverage = {key: sum(1 for r in rows if key in r) for key in list(FIELDS) + ["b"]}
    active = [key for key, count in coverage.items() if count >= MIN_PER_METRIC]
    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / "players.json").write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    meta = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "side-games/data/master/transfermarkt-players.json",
        "player_count": len(rows),
        "coverage": coverage,
        "active_metrics": active,
        "notes": {
            "yc": "Sarı kartlar: 2012/13 sezonundan bu yana resmî kulüp maçları (dcaribou/transfermarkt-datasets).",
            "rc": "Kırmızı kartlar: 2012/13 sezonundan bu yana resmî kulüp maçları.",
            "a": "Asistler: 2012/13 sezonundan bu yana resmî kulüp maçları.",
            "g": "Goller: kulüp kariyeri boyunca lig golleri (Wikidata, yalnızca tüm kariyeri kapsayan veriler).",
            "wc": "Dünya Kupası kadroları (erkekler, 1930-2026): Wikidata ve Fjelstul World Cup Database (CC-BY-SA 4.0). Yalnızca en az bir Dünya Kupası kadrosunda yer almış oyuncular sorulur.",
            "sl": "Süper Lig maçları: 2012/13 sonrası maç kayıtları, öncesi için Wikidata kulüp istatistikleri. Yalnızca Süper Lig'de oynamış oyuncular sorulur.",
        },
    }
    (args.out_dir / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


if __name__ == "__main__":
    print(json.dumps(build(parse_args()), ensure_ascii=False, indent=2))
