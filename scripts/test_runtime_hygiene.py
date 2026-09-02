#!/usr/bin/env python3
"""Regression checks for removed design layers and active production routes."""

from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class RuntimeHygieneTest(unittest.TestCase):
    def test_obsolete_design_artifacts_stay_removed(self) -> None:
        obsolete_paths = (
            "design-qa.md",
            "qa",
            "side-games/home-premium-final.js",
            "side-games/home-premium-hotfix.js",
            "side-games/inject-home.js",
            "side-games/ui-system-preview.html",
            "side-games/neon-side-ui.css",
            "side-games/neon-side-icons.svg",
            "side-games/career-twin/approved-reference.css",
            "side-games/career-twin/assets/career-twin-approved.png",
            "side-games/football-xox/game.js",
        )
        leftovers = [path for path in obsolete_paths if (ROOT / path).exists()]
        self.assertEqual(leftovers, [], f"obsolete design/runtime artifacts returned: {leftovers}")

    def test_entrypoints_only_load_current_runtime_layers(self) -> None:
        root_index = (ROOT / "index.html").read_text(encoding="utf-8")
        xox_index = (ROOT / "side-games/football-xox/index.html").read_text(encoding="utf-8")
        career_index = (ROOT / "side-games/career-twin/index.html").read_text(encoding="utf-8")

        for active_asset in (
            "./side-games/home-raster-v2.js",
            "./draft-mobile.css",
            "./draft-mobile-ui.js",
        ):
            self.assertIn(active_asset, root_index)
        self.assertNotIn("home-premium", root_index)
        self.assertNotIn("inject-home", root_index)

        self.assertIn("./game-v2.js", xox_index)
        self.assertIn("./unified-menu.css", xox_index)
        self.assertIn("./unified-game.css", xox_index)
        self.assertNotIn("./game.js", xox_index)
        self.assertNotIn("approved-reference", career_index)


if __name__ == "__main__":
    unittest.main()
