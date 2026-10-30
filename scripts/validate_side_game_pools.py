#!/usr/bin/env python3
"""Validate the canonical Transfermarkt pool and its game-specific views."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
MASTER_DIR = ROOT / "side-games" / "data" / "master"
CAREER_DATA = ROOT / "side-games" / "career-twin" / "data"
MIN_MASTER = 50_000
MIN_XOX = 30_000
MIN_CAREER_TARGETS = 100
CAREER_METRICS = {
    "height_cm",
    "weight_kg",
    "birth_date",
    "club_count",
    "trophies",
    "career_goals",
    "career_assists",
    "peak_market_value_eur",
    "career_appearances",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--master", type=Path, default=MASTER_DIR / "transfermarkt-players.json")
    parser.add_argument("--master-meta", type=Path, default=MASTER_DIR / "transfermarkt-meta.json")
    parser.add_argument("--xox", type=Path, default=MASTER_DIR / "xox-players.json")
    parser.add_argument("--xox-meta", type=Path, default=MASTER_DIR / "xox-meta.json")
    parser.add_argument("--rules", type=Path, default=MASTER_DIR / "xox-rules.json")
    parser.add_argument("--career-meta", type=Path, default=CAREER_DATA / "meta.json")
    parser.add_argument("--min-master", type=int, default=MIN_MASTER)
    parser.add_argument("--min-xox", type=int, default=MIN_XOX)
    parser.add_argument("--min-career-targets", type=int, default=MIN_CAREER_TARGETS)
    return parser.parse_args()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_master(players: list[dict[str, Any]], meta: dict[str, Any], minimum: int) -> None:
    require(len(players) >= minimum, f"master player count is {len(players)}; minimum {minimum}")
    ids = [player.get("id") for player in players]
    require(all(isinstance(player_id, int) and player_id > 0 for player_id in ids), "invalid master id")
    require(len(ids) == len(set(ids)), "duplicate Transfermarkt id in master pool")
    require(all(str(player.get("name") or "").strip() for player in players), "missing master name")
    require(meta.get("provider") == "dcaribou/transfermarkt-datasets", "unexpected master provider")
    require(meta.get("primary_key") == "Transfermarkt player_id", "unexpected master identity")
    require(all(player.get("weight_kg") is None for player in players), "weight must stay null")
    require(all(player.get("trophies") is None for player in players), "trophies must stay null")
    historical = sum(1 for player in players if player.get("status") in {"recent", "legend"})
    require(historical >= max(1, minimum // 10), "master pool lacks historical players")
    require(meta.get("historical_player_count") == historical, "master historical count mismatch")
    for player in players:
        height = player.get("height_cm")
        if height is not None:
            require(140 <= int(height) <= 220, f"invalid height for {player['id']}")
        appearances = player.get("career_appearances")
        goals = player.get("career_goals")
        assists = player.get("career_assists")
        if appearances is not None:
            require(int(appearances) >= 0, f"negative appearances for {player['id']}")
        if goals is not None:
            require(int(goals) >= 0, f"negative goals for {player['id']}")
        if assists is not None:
            require(int(assists) >= 0, f"negative assists for {player['id']}")


def validate_xox(
    players: list[dict[str, Any]],
    meta: dict[str, Any],
    rules: dict[str, Any],
    master_ids: set[int],
    minimum: int,
) -> dict[str, int]:
    audience_profile = rules.get("audience_profile") or {}
    audience_minimum = int(audience_profile.get("minimum_runtime_players") or 0)
    required_minimum = max(minimum, audience_minimum)
    require(len(players) >= required_minimum, f"XOX player count is {len(players)}; minimum {required_minimum}")
    require(meta.get("master_provider") == "dcaribou/transfermarkt-datasets", "XOX master mismatch")
    historical = sum(1 for player in players if player.get("status") in {"recent", "legend"})
    require(historical >= max(1, minimum // 10), "XOX pool lacks historical players")
    require(meta.get("historical_player_count") == historical, "XOX historical count mismatch")
    allowed_clubs = {club for values in rules["clubs"].values() for club in values}
    allowed_leagues = set(rules["leagues"])
    allowed_nationalities = set(rules["nationalities"])
    ids = set()
    players_by_id = {}
    condition_counts: Counter[str] = Counter()
    for player in players:
        player_id = int(player["id"])
        require(player_id in master_ids, f"XOX player {player_id} is outside master pool")
        require(player_id not in ids, f"duplicate XOX player {player_id}")
        ids.add(player_id)
        players_by_id[player_id] = player
        clubs = set(player.get("clubs") or [])
        leagues = set(player.get("leagues") or [])
        nationality = player.get("nationality")
        require(clubs <= allowed_clubs, f"non-whitelisted XOX club for {player_id}")
        require(leagues <= allowed_leagues, f"non-whitelisted XOX league for {player_id}")
        require(nationality is None or nationality in allowed_nationalities, f"bad nationality for {player_id}")
        for club in clubs:
            condition_counts[f"club:{club}"] += 1
        for league in leagues:
            condition_counts[f"league:{league}"] += 1
        if nationality:
            condition_counts[f"nationality:{nationality}"] += 1
    expected = (
        {f"club:{value}" for value in allowed_clubs}
        | {f"league:{value}" for value in allowed_leagues}
        | {f"nationality:{value}" for value in allowed_nationalities}
    )
    missing = sorted(key for key in expected if condition_counts[key] == 0)
    require(not missing, "XOX conditions without players: " + ", ".join(missing))
    missing_core = []
    mismatched_core = []
    for expected_player in audience_profile.get("core_players") or []:
        player_id = int(expected_player["id"])
        player = players_by_id.get(player_id)
        if not player:
            missing_core.append(expected_player["name"])
        elif player["name"] != expected_player["name"]:
            mismatched_core.append(f"{expected_player['name']} -> {player['name']}")
    require(not missing_core, "XOX Turkish-audience core players missing: " + ", ".join(missing_core))
    require(not mismatched_core, "XOX core player identity mismatch: " + ", ".join(mismatched_core))
    require(
        meta.get("audience_core_player_count") == len(audience_profile.get("core_players") or []),
        "XOX audience core count mismatch",
    )
    return dict(condition_counts)


def validate_career(meta: dict[str, Any], minimum_targets: int) -> None:
    require(meta.get("provider") == "dcaribou/transfermarkt-datasets", "Career Twin provider mismatch")
    active = set(meta.get("active_metrics") or [])
    disabled = set(meta.get("disabled_metrics") or [])
    require(active | disabled == CAREER_METRICS, "Career Twin metric partition is incomplete")
    require(active & disabled == set(), "Career Twin metric partition overlaps")
    require(int(meta.get("target_eligible_count") or 0) >= minimum_targets, "Career Twin target pool is too small")
    require("weight_kg" in disabled, "weight must remain disabled until a physical source exists")
    require("trophies" in disabled, "trophies must remain disabled until a source exists")


def main() -> None:
    args = parse_args()
    master = load(args.master)
    master_meta = load(args.master_meta)
    xox = load(args.xox)
    xox_meta = load(args.xox_meta)
    rules = load(args.rules)
    career_meta = load(args.career_meta)
    validate_master(master, master_meta, args.min_master)
    coverage = validate_xox(xox, xox_meta, rules, {int(row["id"]) for row in master}, args.min_xox)
    validate_career(career_meta, args.min_career_targets)
    print(
        json.dumps(
            {
                "master_players": len(master),
                "xox_players": len(xox),
                "xox_conditions": len(coverage),
                "career_targets": career_meta["target_eligible_count"],
                "career_metrics": career_meta["active_metrics"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
