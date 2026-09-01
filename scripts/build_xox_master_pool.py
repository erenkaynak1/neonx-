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
DEFAULT_MIN_PLAYERS = 30_000
DEFAULT_MAX_PLAYERS = 0  # 0 keeps every matching master player.
MIN_PLAYERS_PER_CONDITION = 12
TURKISH_FAN_CLUB_IDS = {36, 141, 114, 449}


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
    "Uruguay": "Uruguay",
    "Romania": "Romanya",
    "Bosnia-Herzegovina": "Bosna Hersek",
    "Bosnia and Herzegovina": "Bosna Hersek",
    "Ghana": "Gana",
    "Cameroon": "Kamerun",
    "Poland": "Polonya",
    "South Korea": "Güney Kore",
    "Korea, South": "Güney Kore",
    "Korea Republic": "Güney Kore",
    "Republic of Korea": "Güney Kore",
    "Denmark": "Danimarka",
    "Switzerland": "İsviçre",
    "Austria": "Avusturya",
    "Mexico": "Meksika",
    "United States": "ABD",
    "United States of America": "ABD",
    "USA": "ABD",
    "Czech Republic": "Çekya",
    "Czechia": "Çekya",
    "Ukraine": "Ukrayna",
    "Georgia": "Gürcistan",
    "Greece": "Yunanistan",
    "Slovakia": "Slovakya",
    "Slovenia": "Slovenya",
    "Wales": "Galler",
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

# Stable Transfermarkt club identities prevent display-name changes from
# silently removing a valid XOX condition.
CLUB_ID_MAP = {
    36: "Fenerbahçe", 141: "Galatasaray", 114: "Beşiktaş", 449: "Trabzonspor",
    418: "Real Madrid", 131: "Barcelona", 13: "Atlético Madrid", 368: "Sevilla",
    985: "Manchester United", 281: "Manchester City", 31: "Liverpool", 11: "Arsenal",
    631: "Chelsea", 148: "Tottenham Hotspur", 762: "Newcastle United",
    506: "Juventus", 46: "Inter", 5: "AC Milan", 12: "Roma", 6195: "Napoli",
    27: "Bayern Münih", 16: "Borussia Dortmund", 15: "Bayer Leverkusen", 23826: "RB Leipzig",
    583: "Paris Saint-Germain", 244: "Olympique Marseille", 1041: "Olympique Lyon",
    610: "Ajax", 383: "PSV", 234: "Feyenoord", 294: "Benfica", 720: "Porto", 336: "Sporting CP",
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


def xox_recognition_score(player: dict[str, Any]) -> float:
    """Favor names a Turkish football audience is especially likely to know."""
    try:
        base = float(player.get("recognition_score") or 0)
    except (TypeError, ValueError):
        base = 0.0

    club_ids: set[int] = set()
    for value in player.get("club_ids") or []:
        try:
            club_ids.add(int(value))
        except (TypeError, ValueError):
            continue
    club_bonus = 180.0 if club_ids & TURKISH_FAN_CLUB_IDS else 0.0

    national_source = player.get("national_team") or player.get("nationality")
    turkey_bonus = 0.0
    if COUNTRY_INDEX.get(norm(national_source)) == "Türkiye":
        try:
            caps = max(0, int(player.get("international_caps") or 0))
        except (TypeError, ValueError):
            caps = 0
        turkey_bonus = 40.0 + min(140.0, caps * 1.5)

    return round(base + club_bonus + turkey_bonus, 2)


def condition_members(player: dict[str, Any], condition_type: str, value: str) -> bool:
    if condition_type == "nationality":
        return player.get("nationality") == value
    return value in (player.get(f"{condition_type}s") or [])


def balanced_runtime_pool(
    records: list[dict[str, Any]],
    conditions: list[tuple[str, str]],
    maximum: int,
) -> list[dict[str, Any]]:
    """Retain every match, or protect conditions when an explicit cap is set."""
    if maximum <= 0:
        return records
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
        clubs = set(mapped_values(player.get("clubs") or [], CLUB_INDEX, allowed_clubs))
        clubs.update(
            CLUB_ID_MAP[club_id]
            for value in (player.get("club_ids") or [])
            if (club_id := int(value)) in CLUB_ID_MAP and CLUB_ID_MAP[club_id] in allowed_clubs
        )
        league_sources = [*(player.get("leagues") or []), player.get("current_league")]
        leagues = mapped_values(league_sources, LEAGUE_INDEX, allowed_leagues)
        if nationality not in allowed_nationalities and not clubs and not leagues:
            continue
        records.append(
            {
                "id": int(player["id"]),
                "name": str(player["name"]),
                "nationality": nationality,
                "nationalTeam": nationality,
                "currentClub": player.get("current_club"),
                "clubs": sorted(clubs),
                "leagues": leagues,
                "status": player.get("status") or "unknown",
                "recognitionScore": xox_recognition_score(player),
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
    status_counts = {
        status: sum(1 for player in records if player["status"] == status)
        for status in ("active", "recent", "legend", "unknown")
    }
    meta = {
        "schema_version": 3,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "player_count": len(records),
        "status_counts": status_counts,
        "historical_player_count": status_counts["recent"] + status_counts["legend"],
        "minimum_required": args.min_players,
        "maximum_runtime_players": args.max_players or None,
        "selection_policy": "Every rule-matching master player is retained; Turkish-football familiarity only affects ranking.",
        "minimum_players_per_available_condition": MIN_PLAYERS_PER_CONDITION,
        "master_pool": "side-games/data/master/transfermarkt-players.json",
        "master_provider": master_meta.get("provider"),
        "master_provider_revision": master_meta.get("provider_revision"),
        "identity": "Transfermarkt player_id",
        "club_rule": "At least one dcaribou senior-club appearance, plus current-club membership.",
        "league_rule": "dcaribou appearance history, plus current domestic-league membership.",
        "nationality_rule": "Senior national-team country when available, otherwise citizenship.",
        "ranking_rule": "Base recognition plus a Turkish national-team and Big Four familiarity boost.",
        "rules": "side-games/data/master/xox-rules.json",
    }
    args.meta.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


if __name__ == "__main__":
    print(json.dumps(build(parse_args()), ensure_ascii=False, indent=2))
