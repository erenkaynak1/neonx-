#!/usr/bin/env python3
"""Describe Career Twin availability within the canonical Transfermarkt pool.

Career Twin reads the master JSON directly. This script publishes only metadata;
it deliberately does not create a second player universe or fill missing fields.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
MASTER_DIR = ROOT / "side-games" / "data" / "master"
CAREER_DATA = ROOT / "side-games" / "career-twin" / "data"
METRICS = (
    "height_cm",
    "weight_kg",
    "birth_date",
    "club_count",
    "trophies",
    "career_goals",
    "career_assists",
    "peak_market_value_eur",
    "career_appearances",
)
MIN_METRIC_PLAYERS = 100
MIN_ACTIVE_METRICS = 5


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--master", type=Path, default=MASTER_DIR / "transfermarkt-players.json")
    parser.add_argument("--master-meta", type=Path, default=MASTER_DIR / "transfermarkt-meta.json")
    parser.add_argument("--output", type=Path, default=CAREER_DATA / "meta.json")
    parser.add_argument("--min-metric-players", type=int, default=MIN_METRIC_PLAYERS)
    parser.add_argument("--min-active-metrics", type=int, default=MIN_ACTIVE_METRICS)
    return parser.parse_args()


def has_metric(player: dict[str, Any], key: str) -> bool:
    value = player.get(key)
    if value is None or value == "":
        return False
    if key == "birth_date":
        return isinstance(value, str) and len(value) >= 10
    try:
        float(value)
        return True
    except (TypeError, ValueError):
        return False


def select_metrics(players: list[dict[str, Any]], minimum_players: int) -> tuple[list[str], list[dict[str, Any]]]:
    coverage = {
        key: sum(1 for player in players if has_metric(player, key))
        for key in METRICS
    }
    active = [key for key in METRICS if coverage[key] >= minimum_players]
    targets = [player for player in players if all(has_metric(player, key) for key in active)]
    while active and len(targets) < minimum_players:
        weakest = min(active, key=lambda key: (coverage[key], METRICS.index(key)))
        active.remove(weakest)
        targets = [player for player in players if all(has_metric(player, key) for key in active)]
    return active, targets


def build(args: argparse.Namespace) -> dict[str, Any]:
    players = json.loads(args.master.read_text(encoding="utf-8"))
    master_meta = json.loads(args.master_meta.read_text(encoding="utf-8"))
    active_metrics, targets = select_metrics(players, args.min_metric_players)
    if len(active_metrics) < args.min_active_metrics:
        raise RuntimeError(
            f"Career Twin has only {len(active_metrics)} usable metrics; "
            f"minimum is {args.min_active_metrics}"
        )
    coverage = {
        key: sum(1 for player in players if has_metric(player, key))
        for key in METRICS
    }
    meta = {
        "schema_version": 2,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "master_pool": "side-games/data/master/transfermarkt-players.json",
        "provider": master_meta.get("provider"),
        "provider_revision": master_meta.get("provider_revision"),
        "player_count": len(players),
        "target_eligible_count": len(targets),
        "metric_minimum_players": args.min_metric_players,
        "active_metrics": active_metrics,
        "disabled_metrics": [key for key in METRICS if key not in active_metrics],
        "metric_coverage": coverage,
        "career_scope": master_meta.get("career_scope"),
        "physical_data_policy": master_meta.get("physical_data_policy"),
        "fallback_policy": "Missing values remain null; Career Twin skips unavailable rounds.",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


if __name__ == "__main__":
    print(json.dumps(build(parse_args()), ensure_ascii=False, indent=2))
