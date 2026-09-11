#!/usr/bin/env python3
"""Regression checks for Football XOX career-history enrichment and flags."""

from __future__ import annotations

import json
import unittest
from pathlib import Path

import build_xox_transfer_supplement as supplement_builder


ROOT = Path(__file__).resolve().parents[1]
XOX_DIR = ROOT / "side-games" / "football-xox"
MASTER = ROOT / "side-games" / "data" / "master"


class XoxDataIntegrityTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.index = (XOX_DIR / "index.html").read_text(encoding="utf-8")
        cls.runtime = (XOX_DIR / "xox-data-integrity-v1.js").read_text(encoding="utf-8")
        cls.rules = json.loads((MASTER / "xox-rules.json").read_text(encoding="utf-8"))
        cls.players = json.loads((MASTER / "xox-players.json").read_text(encoding="utf-8"))
        cls.supplement = json.loads((MASTER / "xox-club-supplement.json").read_text(encoding="utf-8"))

    def test_integrity_layer_runs_before_xox_game(self) -> None:
        integrity = self.index.index("./xox-data-integrity-v1.js")
        game = self.index.index("./game-v2.js")
        self.assertLess(integrity, game)
        self.assertIn("xox-club-supplement.json", self.runtime)
        self.assertIn("mergeSupplement", self.runtime)
        self.assertIn("NX_XOX_DATA_INTEGRITY", self.runtime)

    def test_transfer_supplement_recovers_real_missing_club_links(self) -> None:
        data = self.supplement
        self.assertEqual(data.get("version"), 1)
        self.assertGreaterEqual(int(data.get("player_count") or 0), 1000)
        self.assertGreaterEqual(int(data.get("matching_transfer_rows") or 0), 1000)
        self.assertEqual(int(data["player_count"]), len(data["players"]))

        allowed = {club for clubs in self.rules["clubs"].values() for club in clubs}
        self.assertTrue(all(set(clubs) <= allowed for clubs in data["players"].values()))

        by_id = {str(row["id"]): row for row in self.players}
        enriched = 0
        added = 0
        for player_id, clubs in data["players"].items():
            row = by_id.get(player_id)
            if not row:
                continue
            missing = set(clubs) - set(row.get("clubs") or [])
            if missing:
                enriched += 1
                added += len(missing)
        self.assertGreaterEqual(enriched, 400)
        self.assertGreaterEqual(added, 400)

    def test_high_recognition_careers_remain_covered_after_merge(self) -> None:
        by_id = {str(row["id"]): row for row in self.players}
        extras = self.supplement["players"]
        expected = {
            "3924": {"Chelsea", "Galatasaray"},
            "4673": {"Galatasaray", "Inter"},
            "4380": {"Fenerbahçe", "Feyenoord", "Manchester United"},
            "4188": {"Beşiktaş", "Porto"},
            "6288": {"Bayern Münih", "Beşiktaş"},
            "28396": {"Fenerbahçe", "Inter", "Manchester City", "Roma"},
            "33706": {"Fenerbahçe", "Manchester United", "Sporting CP"},
            "39152": {"Atlético Madrid", "Chelsea", "Galatasaray", "Manchester United", "Porto"},
            "68863": {"Galatasaray", "Inter", "Paris Saint-Germain"},
            "861410": {"Fenerbahçe", "Real Madrid"},
        }
        for player_id, required in expected.items():
            self.assertIn(player_id, by_id)
            merged = set(by_id[player_id].get("clubs") or []) | set(extras.get(player_id, []))
            self.assertTrue(required <= merged, f"{player_id}: missing {sorted(required - merged)}")

    def test_every_xox_nationality_has_a_visual_flag_mapping(self) -> None:
        self.assertIn("flagcdn.com", self.runtime)
        self.assertIn("MutationObserver", self.runtime)
        for nationality in self.rules["nationalities"]:
            self.assertIn(repr(nationality), self.runtime, f"missing flag mapping for {nationality}")

    def test_transfer_builder_maps_curated_club_ids_and_aliases(self) -> None:
        self.assertEqual(supplement_builder.canonical_club(141, "ignored"), "Galatasaray")
        self.assertEqual(supplement_builder.canonical_club(36, "ignored"), "Fenerbahçe")
        self.assertEqual(supplement_builder.canonical_club(None, "Manchester United"), "Manchester United")
        self.assertEqual(supplement_builder.canonical_club(None, "FC Barcelona"), "Barcelona")
        self.assertIsNone(supplement_builder.canonical_club(None, "Some Other Club"))


if __name__ == "__main__":
    unittest.main()
