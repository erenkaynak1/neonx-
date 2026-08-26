#!/usr/bin/env python3
"""Derive the Football XOX runtime pool from the Transfermarkt master pool."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
MASTER_DIR = ROOT / "side-games" / "data" / "master"
DEFAULT_MIN_PLAYERS = 800
DEFAULT_MAX_PLAYERS = 5_000
MIN_PLAYERS_PER_CONDITION = 12


COUNTRY_MAP = {
    "Turkey": "Türkiye",
    "Türkiye": "Türkiye",
    "Argentina": "Arjantin",
    "Brazil": "Brezilya",
    "France": "Fransa",
    "Spain": "İspanya",
    "Germany": "Almanya",
    "Italy": "İtalya",
    "England": "İngiltere",
    "Portugal": "Portekiz",
    "Netherlands": "Hollanda",
    "Belgium": "Belçika",
    "Croatia": "Hırvatistan",
    "Serbia": "Sırbistan",
    "Colombia": "Kolombiya",
    "Morocco": "Fas",
    "Algeria": "Cezayir",
    "Egypt": "Mısır",
    "Nigeria": "Nijerya",
    "Senegal": "Senegal",
    "Cote d'Ivoire": "Fildişi Sahili",
    "Côte d'Ivoire": "Fildişi Sahili",
    "Ivory Coast": "Fildişi Sahili",
    "Japan": "Japonya",
    "Norway": "Norveç",
    "Sweden": "İsveç",
}

CLUB_ALIASES = {
    "Fenerbahçe": ["Fenerbahce", "Fenerbahçe SK", "Fenerbahçe"],
    "Galatasaray": ["Galatasaray", "Galatasaray SK"],
    "Beşiktaş": ["Besiktas", "Beşiktaş JK", "Besiktas JK", "Beşiktaş"],
    "Trabzonspor": ["Trabzonspor"],
    "Real Madrid": ["Real Madrid"],
    "Barcelona": ["FC Barcelona", "Barcelona"],
    "Atlético Madrid": ["Atlético de Madrid", "Atletico de Madrid", "Atlético Madrid"],
    "Sevilla": ["Sevilla FC", "Sevilla"],
    "Manchester United": ["Manchester United"],
    "Manchester City": ["Manchester City"],
    "Liverpool": ["Liverpool FC", "Liverpool"],
    "Arsenal": ["Arsenal FC", "Arsenal"],
    "Chelsea": ["Chelsea FC", "Chelsea"],
    "Tottenham Hotspur": ["Tottenham Hotspur"],
    "Newcastle United": ["Newcastle United"],
    "Juventus": ["Juventus FC", "Juventus"],
    "Inter": ["Inter Milan", "Inter", "FC Internazionale", "Inter Milan FC"],
    "AC Milan": ["AC Milan", "Milan"],
    "Roma": ["AS Roma", "Roma"],
    "Napoli": ["SSC Napoli", "Napoli"],
    "Bayern Münih": ["Bayern Munich", "Bayern München", "FC Bayern Munich", "FC Bayern München"],
    "Borussia Dortmund": ["Borussia Dortmund"],
    "Bayer Leverkusen": ["Bayer 04 Leverkusen", "Bayer Leverkusen"],
    "RB Leipzig": ["RB Leipzig"],
    "Paris Saint-Germain": ["Paris Saint-Germain", "Paris SG"],
    "Olympique Marseille": ["Olympique Marseille", "Marseille"],
    "Olympique Lyon": ["Olympique Lyon", "Olympique Lyonnais"],
    "Ajax": ["Ajax Amsterdam", "Ajax"],
    "PSV": ["PSV Eindhoven", "PSV"],
    "Feyenoord": ["Feyenoord Rotterdam", "Feyenoord"],
    "Benfica": ["SL Benfica", "Benfica"],
    "Porto": ["FC Porto", "Porto"],
    "Sporting CP": ["Sporting CP", "Sporting Lisbon"],
}

LEAGUE_ALIASES = {
    "Süper Lig": ["Süper Lig", "Super Lig"],
    "Premier League": ["Premier League"],
    "LaLiga": ["LaLiga", "Primera División", "Primera Division"],
    "Serie A": ["Serie A"],
    "Bundesliga": ["Bundesliga"],
    "Ligue 1": ["Ligue 1"],
    "Eredivisie": ["Eredivisie"],
    "Primeira Liga": ["Liga Portugal", "Primeira Liga"],
    "Saudi Pro League": ["Saudi Pro League", "Saudi Professional League", "Saudi League"],
    "MLS": ["Major League Soccer", "MLS"],
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--master", type=Path, default=MASTER_DIR / "transfermarkt-players.json")
    parser.add_argument("--master-meta", type=Path, default=MASTER_DIR / "transfermarkt-meta.json")
    parser.add_argument("--rules", type=Path, default=MASTER_DIR / "xox-rules.json")
    parser.add_argument("--output", type=Path, default=MASTER_DIR / "xox-players.json")
    parser.add_argument("--meta", type=Path, default=MASTER_DIR / "xox-meta.json")
    parser.add_argument("--min-players", type=int, default=DEFAULT_MIN_PLAYERS)
    parser.add_argument("--max-players", type=int, default=DEFAULT_MAX_PLAYERS)
    return parser.parse_args()


def norm(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = text.encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "", text)


def alias_index(source: dict[str, list[str]]) -> dict[str, str]:
    index: dict[str, str] = {}
    for canonical, aliases in source.items():
        for alias in [canonical, *aliases]:
            index[norm(alias)] = canonical
    return index


CLUB_INDEX = alias_index(CLUB_ALIASES)
LEAGUE_INDEX = alias_index(LEAGUE_ALIASES)
COUNTRY_INDEX = {norm(key): value for key, value in COUNTRY_MAP.items()}


def mapped_values(values: list[Any], index: dict[str, str], allowed: set[str]) -> list[str]:
    mapped = set()
    for value in values:
        canonical = index.get(norm(value))
        if canonical in allowed:
            mapped.add(canonical)
    return sorted(mapped)


def condition_members(player: dict[str, Any], condition_type: str, value: str) -> bool:
    if condition_type == "nationality":
        return player.get("nationality") == value
    return value in (player.get(f"{condition_type}s") or [])


def balanced_runtime_pool(
    records: list[dict[str, Any]],
    conditions: list[tuple[str, str]],
    maximum: int,
) -> list[dict[str, Any]]:
    """Keep the most recognisable players without starving a valid XOX condition."""
    selected: list[dict[str, Any]] = []
    selected_ids: set[int] = set()
    for condition_type, value in conditions:
        matches = [
            player
            for player in records
            if condition_members(player, condition_type, value)
        ][:MIN_PLAYERS_PER_CONDITION]
        for player in matches:
            player_id = int(player["id"])
            if player_id not in selected_ids and len(selected) < maximum:
                selected.append(player)
                selected_ids.add(player_id)
    for player in records:
        player_id = int(player["id"])
        if player_id not in selected_ids and len(selected) < maximum:
            selected.append(player)
            selected_ids.add(player_id)
    selected.sort(key=lambda row: (-row["recognitionScore"], row["name"], row["id"]))
    return selected


def build(args: argparse.Namespace) -> dict[str, Any]:
    master = json.loads(args.master.read_text(encoding="utf-8"))
    master_meta = json.loads(args.master_meta.read_text(encoding="utf-8"))
    rules = json.loads(args.rules.read_text(encoding="utf-8"))
    allowed_nationalities = set(rules["nationalities"])
    allowed_clubs = {club for clubs in rules["clubs"].values() for club in clubs}
    allowed_leagues = set(rules["leagues"])

    records = []
    for player in master:
        national_source = player.get("national_team") or player.get("nationality")
        nationality = COUNTRY_INDEX.get(norm(national_source))
        clubs = mapped_values(player.get("clubs") or [], CLUB_INDEX, allowed_clubs)
        leagues = mapped_values(player.get("leagues") or [], LEAGUE_INDEX, allowed_leagues)
        if nationality not in allowed_nationalities and not clubs and not leagues:
            continue
        records.append(
            {
                "id": int(player["id"]),
                "name": str(player["name"]),
                "nationality": nationality,
                "nationalTeam": nationality,
                "currentClub": player.get("current_club"),
                "clubs": clubs,
                "leagues": leagues,
                "status": player.get("status") or "unknown",
                "recognitionScore": float(player.get("recognition_score") or 0),
            }
        )

    records.sort(key=lambda row: (-row["recognitionScore"], row["name"], row["id"]))
    conditions = (
        [("nationality", value) for value in sorted(allowed_nationalities)]
        + [("club", value) for value in sorted(allowed_clubs)]
        + [("league", value) for value in sorted(allowed_leagues)]
    )
    records = balanced_runtime_pool(records, conditions, args.max_players)
    if len(records) < args.min_players:
        raise RuntimeError(f"XOX pool contains {len(records)} players; minimum is {args.min_players}")

    args.output.write_text(
        json.dumps(records, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    meta = {
        "schema_version": 2,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "player_count": len(records),
        "minimum_required": args.min_players,
        "maximum_runtime_players": args.max_players,
        "minimum_players_per_available_condition": MIN_PLAYERS_PER_CONDITION,
        "master_pool": "side-games/data/master/transfermarkt-players.json",
        "master_provider": master_meta.get("provider"),
        "master_provider_revision": master_meta.get("provider_revision"),
        "identity": "Transfermarkt player_id",
        "club_rule": "At least one dcaribou senior-club appearance, plus current-club membership.",
        "league_rule": "At least one dcaribou appearance in the whitelisted league.",
        "nationality_rule": "Senior national-team country when available, otherwise citizenship.",
        "rules": "side-games/data/master/xox-rules.json",
    }
    args.meta.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


if __name__ == "__main__":
    print(json.dumps(build(parse_args()), ensure_ascii=False, indent=2))
