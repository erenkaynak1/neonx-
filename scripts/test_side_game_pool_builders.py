#!/usr/bin/env python3
"""Small end-to-end fixture test for the side-game player-pool pipeline."""

from __future__ import annotations

import json
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path
from types import SimpleNamespace

import duckdb

import build_career_twin_pool as career_builder
import build_transfermarkt_master_pool as master_builder
import build_xox_master_pool as xox_builder
import validate_side_game_pools as validator


ROOT = Path(__file__).resolve().parents[1]
RULES = ROOT / "side-games" / "data" / "master" / "xox-rules.json"

# Keep the synthetic fixture synchronized with every canonical nationality
# understood by the XOX builder. This avoids duplicating a stale country list
# in the test whenever the production pool is expanded.
ENGLISH_COUNTRIES = []
_seen_countries = set()
for _source_country, _canonical_country in xox_builder.COUNTRY_MAP.items():
    if _canonical_country in _seen_countries:
        continue
    ENGLISH_COUNTRIES.append(_source_country)
    _seen_countries.add(_canonical_country)


def create_fixture(path: Path, player_count: int = 300) -> None:
    connection = duckdb.connect(str(path))
    connection.execute(
        """
        CREATE TABLE competitions(competition_id VARCHAR, name VARCHAR);
        CREATE TABLE clubs(club_id INTEGER, name VARCHAR, domestic_competition_id VARCHAR);
        CREATE TABLE national_teams(national_team_id INTEGER, name VARCHAR, country_name VARCHAR);
        CREATE TABLE players(
          player_id INTEGER, name VARCHAR, player_code VARCHAR, date_of_birth DATE,
          height_in_cm INTEGER, position VARCHAR, sub_position VARCHAR, foot VARCHAR,
          current_club_id INTEGER, current_club_name VARCHAR,
          current_club_domestic_competition_id VARCHAR, country_of_citizenship VARCHAR,
          current_national_team_id INTEGER, market_value_in_eur BIGINT,
          highest_market_value_in_eur BIGINT, international_caps INTEGER,
          international_goals INTEGER, last_season INTEGER
        );
        CREATE TABLE appearances(
          appearance_id VARCHAR, game_id INTEGER, player_id INTEGER, player_club_id INTEGER,
          date DATE, competition_id VARCHAR, goals INTEGER, assists INTEGER
        );
        """
    )
    leagues = list(xox_builder.LEAGUE_ALIASES)
    connection.executemany(
        "INSERT INTO competitions VALUES (?, ?)",
        [(f"L{index}", league) for index, league in enumerate(leagues, 1)],
    )
    clubs = list(xox_builder.CLUB_ALIASES)
    reserved_ids = [36, 141, 114, 449]
    club_rows = []
    for index, club in enumerate(clubs):
        club_id = reserved_ids[index] if index < len(reserved_ids) else 1_000 + index
        league_index = index % len(leagues)
        club_rows.append((club_id, club, f"L{league_index + 1}"))
    connection.executemany("INSERT INTO clubs VALUES (?, ?, ?)", club_rows)
    connection.executemany(
        "INSERT INTO national_teams VALUES (?, ?, ?)",
        [(index + 1, country, country) for index, country in enumerate(ENGLISH_COUNTRIES)],
    )

    player_rows = []
    appearance_rows = []
    start = date(1990, 1, 1)
    for index in range(player_count):
        player_id = 10_000 + index
        club_id, club_name, league_id = club_rows[index % len(club_rows)]
        country = ENGLISH_COUNTRIES[index % len(ENGLISH_COUNTRIES)]
        player_rows.append(
            (
                player_id,
                f"Fixture Player {index:03d}",
                f"fixture-player-{index}",
                start + timedelta(days=index * 23),
                165 + index % 35,
                ["Attack", "Defender", "Midfield", "Goalkeeper"][index % 4],
                None,
                "right",
                club_id,
                club_name,
                league_id,
                country,
                index % len(ENGLISH_COUNTRIES) + 1,
                1_000_000 + index * 25_000,
                2_000_000 + index * 50_000,
                index % 100,
                index % 30,
                2010 if index % 3 == 0 else 2025,
            )
        )
        for appearance in range(3):
            appearance_rows.append(
                (
                    f"a-{player_id}-{appearance}",
                    player_id * 10 + appearance,
                    player_id,
                    club_id,
                    date(2024, 8, 1) + timedelta(days=appearance),
                    league_id,
                    1 if appearance == 0 else 0,
                    1 if appearance == 1 else 0,
                )
            )
    connection.executemany("INSERT INTO players VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", player_rows)
    connection.executemany("INSERT INTO appearances VALUES (?, ?, ?, ?, ?, ?, ?, ?)", appearance_rows)
    connection.close()


class SideGamePoolPipelineTest(unittest.TestCase):
    def test_master_and_views_use_one_transfermarkt_identity(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            database = root / "fixture.duckdb"
            master_path = root / "transfermarkt-players.json"
            master_meta_path = root / "transfermarkt-meta.json"
            xox_path = root / "xox-players.json"
            xox_meta_path = root / "xox-meta.json"
            career_meta_path = root / "career-meta.json"
            create_fixture(database)
            original_revision = master_builder.upstream_revision
            master_builder.upstream_revision = lambda: "f" * 40
            try:
                master_builder.build(
                    SimpleNamespace(
                        database=database,
                        output=master_path,
                        meta=master_meta_path,
                        min_players=100,
                        max_players=0,
                    )
                )
            finally:
                master_builder.upstream_revision = original_revision
            xox_builder.build(
                SimpleNamespace(
                    master=master_path,
                    master_meta=master_meta_path,
                    rules=RULES,
                    output=xox_path,
                    meta=xox_meta_path,
                    min_players=100,
                    max_players=0,
                )
            )
            career_builder.build(
                SimpleNamespace(
                    master=master_path,
                    master_meta=master_meta_path,
                    output=career_meta_path,
                    min_metric_players=100,
                    min_active_metrics=5,
                )
            )

            master = json.loads(master_path.read_text(encoding="utf-8"))
            master_meta = json.loads(master_meta_path.read_text(encoding="utf-8"))
            xox = json.loads(xox_path.read_text(encoding="utf-8"))
            xox_meta = json.loads(xox_meta_path.read_text(encoding="utf-8"))
            rules = json.loads(RULES.read_text(encoding="utf-8"))
            career_meta = json.loads(career_meta_path.read_text(encoding="utf-8"))
            validator.validate_master(master, master_meta, 100)
            validator.validate_xox(xox, xox_meta, rules, {row["id"] for row in master}, 100)
            validator.validate_career(career_meta, 100)
            self.assertEqual(len(master), 300)
            self.assertEqual(len(xox), 300)
            self.assertEqual(master_meta["historical_player_count"], 100)
            self.assertEqual(xox_meta["historical_player_count"], 100)
            self.assertTrue(all(player["weight_kg"] is None for player in master))
            self.assertIn("weight_kg", career_meta["disabled_metrics"])
            self.assertNotIn("weight_kg", career_meta["active_metrics"])


if __name__ == "__main__":
    unittest.main()
