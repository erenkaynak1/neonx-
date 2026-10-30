#!/usr/bin/env python3
"""Build EN 11's compact player pool from the current Neon XI master pool."""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
MASTER_PATH = ROOT / "side-games" / "data" / "master" / "transfermarkt-players.json"
MASTER_META_PATH = ROOT / "side-games" / "data" / "master" / "transfermarkt-meta.json"
XOX_POOL_PATH = ROOT / "side-games" / "data" / "master" / "xox-players.json"
OUTPUT_PATH = ROOT / "side-games" / "en11" / "data" / "players.json"
META_PATH = ROOT / "side-games" / "en11" / "data" / "meta.json"
MAX_PLAYERS = 5000
POSITIONS = {"Goalkeeper", "Defender", "Midfield", "Attack"}

FIELDS = {
    "id": "id",
    "name": "name",
    "position": "position",
    "subPosition": "sub_position",
    "nation": "nationality",
    "recognition": "recognition_score",
    "birthDate": "birth_date",
    "heightCm": "height_cm",
    "clubCount": "club_count",
    "careerGoals": "career_goals",
    "careerAssists": "career_assists",
    "careerAppearances": "career_appearances",
    "internationalCaps": "international_caps",
    "internationalGoals": "international_goals",
    "peakValue": "peak_market_value_eur",
}


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8-sig") as source:
        return json.load(source)


def compact_player(player: dict[str, Any]) -> dict[str, Any]:
    return {target: player.get(source) for target, source in FIELDS.items()}


def main() -> None:
    master = read_json(MASTER_PATH)
    xox = read_json(XOX_POOL_PATH)
    master_meta = read_json(MASTER_META_PATH)
    eligible_ids = {int(player["id"]) for player in xox if player.get("id") is not None}

    candidates = [
        player
        for player in master
        if player.get("id") is not None
        and int(player["id"]) in eligible_ids
        and player.get("position") in POSITIONS
        and player.get("name")
    ]
    candidates.sort(
        key=lambda player: (
            float(player.get("recognition_score") or 0),
            str(player.get("name") or "").casefold(),
        ),
        reverse=True,
    )
    players = [compact_player(player) for player in candidates[:MAX_PLAYERS]]

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8", newline="\n") as output:
        json.dump(players, output, ensure_ascii=False, separators=(",", ":"))
        output.write("\n")

    position_counts = Counter(player["position"] for player in players)
    metric_fields = {
        "heightCm": "heightCm",
        "birthDate": "birthDate",
        "clubCount": "clubCount",
        "careerGoals": "careerGoals",
        "careerAssists": "careerAssists",
        "careerAppearances": "careerAppearances",
        "internationalCaps": "internationalCaps",
        "internationalGoals": "internationalGoals",
        "peakValue": "peakValue",
    }
    coverage = {
        key: sum(player.get(field) is not None for player in players)
        for key, field in metric_fields.items()
    }
    coverage["trophies"] = 0
    coverage["debutAge"] = 0

    metadata = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "provider": master_meta.get("provider"),
        "provider_revision": master_meta.get("provider_revision"),
        "source_files": [
            "side-games/data/master/transfermarkt-players.json",
            "side-games/data/master/xox-players.json",
        ],
        "selection": "Top 5,000 by recognition score from the current XOX-eligible master pool.",
        "player_count": len(players),
        "position_counts": dict(position_counts),
        "metric_coverage": coverage,
        "disabled_metrics": {
            "trophies": "The current master source has no verified trophy table.",
            "debutAge": "The current master source has no first senior national-team appearance date.",
        },
    }
    with META_PATH.open("w", encoding="utf-8", newline="\n") as output:
        json.dump(metadata, output, ensure_ascii=False, indent=2)
        output.write("\n")

    print(f"Built {len(players):,} EN 11 players at {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
