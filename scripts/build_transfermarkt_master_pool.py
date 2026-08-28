#!/usr/bin/env python3
"""Build NEON XI's canonical player pool from dcaribou/transfermarkt-datasets.

The generated JSON is the only player-universe input for side games. Fields that
do not exist in the upstream dataset (currently weight and trophies) stay null;
this builder never estimates or name-joins them from another provider.
"""

from __future__ import annotations

import argparse
import json
import math
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import duckdb
import requests


ROOT = Path(__file__).resolve().parents[1]
MASTER_DIR = ROOT / "side-games" / "data" / "master"
DEFAULT_DB = ROOT / ".tmp-transfermarkt.duckdb"
DATASET_URL = (
    "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/"
    "data/transfermarkt-datasets.duckdb"
)
UPSTREAM_REPOSITORY = "dcaribou/transfermarkt-datasets"
UPSTREAM_COMMIT_API = (
    "https://api.github.com/repos/dcaribou/transfermarkt-datasets/commits/master"
)
DEFAULT_MIN_PLAYERS = 50_000
DEFAULT_MAX_PLAYERS = 0  # 0 keeps the complete upstream player table.
BIG_THREE_CLUB_IDS = {36, 141, 114}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", type=Path, default=DEFAULT_DB)
    parser.add_argument("--output", type=Path, default=MASTER_DIR / "transfermarkt-players.json")
    parser.add_argument("--meta", type=Path, default=MASTER_DIR / "transfermarkt-meta.json")
    parser.add_argument("--min-players", type=int, default=DEFAULT_MIN_PLAYERS)
    parser.add_argument("--max-players", type=int, default=DEFAULT_MAX_PLAYERS)
    return parser.parse_args()


def download_database(path: Path) -> None:
    if path.exists() and path.stat().st_size >= 20_000_000:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".part")
    with requests.get(
        DATASET_URL,
        stream=True,
        timeout=(30, 600),
        headers={"User-Agent": "NEON-XI-Transfermarkt-Master/1.0"},
    ) as response:
        response.raise_for_status()
        with temporary.open("wb") as handle:
            for chunk in response.iter_content(1024 * 1024):
                if chunk:
                    handle.write(chunk)
    if temporary.stat().st_size < 20_000_000:
        temporary.unlink(missing_ok=True)
        raise RuntimeError("dcaribou DuckDB download is incomplete")
    temporary.replace(path)


def query_dicts(connection: duckdb.DuckDBPyConnection, sql: str) -> list[dict[str, Any]]:
    cursor = connection.execute(sql)
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (date, datetime)):
        return value.isoformat()[:10]
    text = str(value).strip()
    return text[:10] or None


def integer(value: Any) -> int | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return int(round(number))


def bounded_integer(value: Any, minimum: int, maximum: int) -> int | None:
    number = integer(value)
    return number if number is not None and minimum <= number <= maximum else None


def clean_strings(values: Any) -> list[str]:
    if not values:
        return []
    return sorted({str(value).strip() for value in values if str(value or "").strip()})


def upstream_revision() -> str | None:
    try:
        response = requests.get(
            UPSTREAM_COMMIT_API,
            timeout=20,
            headers={"Accept": "application/vnd.github+json", "User-Agent": "NEON-XI/1.0"},
        )
        response.raise_for_status()
        sha = str(response.json().get("sha") or "")
        return sha if len(sha) == 40 else None
    except Exception:
        return None


def status_for(last_season: int | None, latest_season: int) -> str:
    if last_season is None:
        return "unknown"
    if last_season >= latest_season - 1:
        return "active"
    if last_season >= latest_season - 10:
        return "recent"
    return "legend"


def recognition_score(profile: dict[str, Any], history: dict[str, Any], latest: int) -> float:
    current_value = integer(profile.get("market_value_in_eur")) or 0
    peak_value = integer(profile.get("highest_market_value_in_eur")) or 0
    caps = integer(profile.get("international_caps")) or 0
    appearances = integer(history.get("career_appearances")) or 0
    clubs = integer(history.get("club_count")) or 0
    season = integer(profile.get("last_season")) or 0
    active_bonus = 110 if season >= latest - 1 else 50 if season >= latest - 4 else 0
    big_three_bonus = 180 if history.get("turkish_familiar") else 0
    return round(
        current_value / 1_000_000 * 2.0
        + peak_value / 1_000_000 * 0.55
        + caps * 0.75
        + math.sqrt(max(0, appearances)) * 2.5
        + clubs * 5
        + active_bonus
        + big_three_bonus,
        2,
    )


def build(args: argparse.Namespace) -> dict[str, Any]:
    if args.max_players > 0 and args.max_players < args.min_players:
        raise ValueError("--max-players must be greater than or equal to --min-players")
    if args.database == DEFAULT_DB:
        download_database(args.database)
    elif not args.database.exists():
        raise FileNotFoundError(args.database)

    connection = duckdb.connect(str(args.database), read_only=True)
    try:
        profiles = query_dicts(
            connection,
            """
            SELECT
                p.player_id,
                p.name,
                p.player_code,
                p.date_of_birth,
                p.height_in_cm,
                p.position,
                p.sub_position,
                p.foot,
                p.current_club_id,
                p.current_club_name,
                p.current_club_domestic_competition_id,
                p.country_of_citizenship,
                COALESCE(nt.country_name, nt.name) AS national_team,
                p.market_value_in_eur,
                p.highest_market_value_in_eur,
                p.international_caps,
                p.international_goals,
                p.last_season
            FROM players p
            LEFT JOIN national_teams nt
              ON p.current_national_team_id = nt.national_team_id
            WHERE p.player_id IS NOT NULL AND p.name IS NOT NULL
            """,
        )
        histories = query_dicts(
            connection,
            """
            SELECT
                a.player_id,
                count(*)::BIGINT AS career_appearances,
                sum(COALESCE(a.goals, 0))::BIGINT AS career_goals,
                sum(COALESCE(a.assists, 0))::BIGINT AS career_assists,
                count(DISTINCT a.player_club_id)::INTEGER AS club_count,
                list(DISTINCT a.player_club_id ORDER BY a.player_club_id) AS club_ids,
                list(DISTINCT c.name ORDER BY c.name) AS clubs,
                list(DISTINCT comp.name ORDER BY comp.name) AS leagues,
                min(a.date) AS first_appearance,
                max(a.date) AS last_appearance,
                bool_or(a.player_club_id IN (36, 141, 114)) AS turkish_familiar
            FROM appearances a
            INNER JOIN clubs c ON a.player_club_id = c.club_id
            LEFT JOIN competitions comp ON a.competition_id = comp.competition_id
            GROUP BY a.player_id
            """,
        )
        competition_rows = query_dicts(
            connection,
            "SELECT competition_id, name FROM competitions WHERE competition_id IS NOT NULL",
        )
        latest_row = connection.execute(
            "SELECT max(last_season), max(date) FROM players CROSS JOIN (SELECT max(date) date FROM appearances)"
        ).fetchone()
    finally:
        connection.close()

    histories_by_id = {int(row["player_id"]): row for row in histories}
    competition_names = {
        str(row["competition_id"]): str(row["name"])
        for row in competition_rows
        if row.get("name")
    }
    seasons = [integer(profile.get("last_season")) for profile in profiles]
    latest_season = max((season for season in seasons if season is not None), default=2025)

    records: list[dict[str, Any]] = []
    for profile in profiles:
        player_id = int(profile["player_id"])
        history = histories_by_id.get(player_id, {})
        clubs = clean_strings(history.get("clubs"))
        club_ids = sorted({int(value) for value in (history.get("club_ids") or []) if value is not None})
        leagues = clean_strings(history.get("leagues"))
        current_club = str(profile.get("current_club_name") or "").strip() or None
        current_club_id = integer(profile.get("current_club_id"))
        current_league_id = str(profile.get("current_club_domestic_competition_id") or "")
        current_league = competition_names.get(current_league_id)
        if current_club and current_club not in clubs:
            clubs.append(current_club)
            clubs.sort()
        if current_club_id is not None and current_club_id not in club_ids:
            club_ids.append(current_club_id)
            club_ids.sort()
        last_season = integer(profile.get("last_season"))
        record = {
            "id": player_id,
            "name": str(profile["name"]).strip(),
            "slug": str(profile.get("player_code") or "").strip() or None,
            "status": status_for(last_season, latest_season),
            "recognition_score": 0.0,
            "nationality": str(profile.get("country_of_citizenship") or "").strip() or None,
            "national_team": str(profile.get("national_team") or "").strip() or None,
            "current_club": current_club,
            "current_league": current_league,
            "position": str(profile.get("position") or "").strip() or None,
            "sub_position": str(profile.get("sub_position") or "").strip() or None,
            "foot": str(profile.get("foot") or "").strip() or None,
            "birth_date": iso(profile.get("date_of_birth")),
            "height_cm": bounded_integer(profile.get("height_in_cm"), 140, 220),
            "weight_kg": None,
            "club_ids": club_ids,
            "clubs": clubs,
            "leagues": leagues,
            "club_count": integer(history.get("club_count")),
            "trophies": None,
            "career_goals": integer(history.get("career_goals")),
            "career_assists": integer(history.get("career_assists")),
            "career_appearances": integer(history.get("career_appearances")),
            "peak_market_value_eur": integer(profile.get("highest_market_value_in_eur")),
            "current_market_value_eur": integer(profile.get("market_value_in_eur")),
            "international_caps": integer(profile.get("international_caps")),
            "international_goals": integer(profile.get("international_goals")),
            "last_season": last_season,
            "first_appearance": iso(history.get("first_appearance")),
            "last_appearance": iso(history.get("last_appearance")),
            "turkish_familiar": bool(history.get("turkish_familiar")),
        }
        record["recognition_score"] = recognition_score(profile, history, latest_season)
        records.append(record)

    records.sort(key=lambda row: (-float(row["recognition_score"]), row["name"], row["id"]))
    if args.max_players > 0:
        records = records[: args.max_players]
    if len(records) < args.min_players:
        raise RuntimeError(
            f"master pool contains {len(records)} players; minimum is {args.min_players}"
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(records, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    status_counts = {
        status: sum(1 for player in records if player["status"] == status)
        for status in ("active", "recent", "legend", "unknown")
    }
    generated_at = datetime.now(timezone.utc).isoformat()
    meta = {
        "schema_version": 2,
        "generated_at": generated_at,
        "provider": UPSTREAM_REPOSITORY,
        "provider_revision": upstream_revision(),
        "dataset_url": DATASET_URL,
        "dataset_last_appearance": iso(latest_row[1] if latest_row else None),
        "latest_season": latest_season,
        "player_count": len(records),
        "status_counts": status_counts,
        "historical_player_count": status_counts["recent"] + status_counts["legend"],
        "minimum_required": args.min_players,
        "maximum_runtime_players": args.max_players or None,
        "selection_policy": "The complete upstream player table is retained without a recognition cap.",
        "primary_key": "Transfermarkt player_id",
        "career_scope": (
            "Official senior-club appearances present in dcaribou/transfermarkt-datasets; "
            "national-team rows are excluded."
        ),
        "physical_data_policy": (
            "weight_kg is intentionally null until a separate physical dataset is supplied; "
            "no value is estimated."
        ),
        "unavailable_upstream_fields": ["weight_kg", "trophies"],
        "source_policy": (
            "Profiles, club history, competition history, appearances, goals, assists and "
            "market values come only from dcaribou/transfermarkt-datasets."
        ),
    }
    args.meta.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


if __name__ == "__main__":
    print(json.dumps(build(parse_args()), ensure_ascii=False, indent=2))
