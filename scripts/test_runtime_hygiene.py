#!/usr/bin/env python3
"""Regression checks for active runtime layers and removed legacy artifacts."""

from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class RuntimeHygieneTest(unittest.TestCase):
    def test_obsolete_runtime_artifacts_stay_removed(self) -> None:
        obsolete_paths = (
            "design-qa.md",
            "qa",
            "scripts/integrate_side_games.py",
            "side-games/.integration-trigger",
            "side-games/.parts",
            "side-games/home-coded-v1.js",
            "side-games/home-coded-v2.js",
            "side-games/home-coded-v3.js",
            "side-games/home-coded-v2-desktop.css",
            "side-games/home-coded-v2-polish.css",
            "side-games/home-coded-v3-trace2.css",
            "side-games/home-raster-v2.js",
            "side-games/tournament-back-fix.js",
            "social/neon-social-flow-v3.js",
            "social/neon-social-matchmaking-v4.js",
            "side-games/career-twin/data/pipeline-career-error.log",
            "side-games/career-twin/data/pipeline-status.json",
        )
        leftovers = [path for path in obsolete_paths if (ROOT / path).exists()]
        self.assertEqual(leftovers, [], f"obsolete runtime artifacts returned: {leftovers}")

    def test_entrypoints_only_load_current_runtime_layers(self) -> None:
        root_index = (ROOT / "index.html").read_text(encoding="utf-8")
        xox_index = (ROOT / "side-games/football-xox/index.html").read_text(encoding="utf-8")
        career_index = (ROOT / "side-games/career-twin/index.html").read_text(encoding="utf-8")
        public_guard = (ROOT / "public-source-ui-guard-v1.js").read_text(encoding="utf-8")

        for active_asset in (
            "./side-games/home-approved-v1.js",
            "./draft-mobile.css",
            "./draft-mobile-ui.js",
            "./public-source-ui-guard-v1.js",
        ):
            self.assertIn(active_asset, root_index)
        self.assertNotIn("home-raster-v2", root_index)
        self.assertNotIn("home-coded-v", root_index)
        self.assertIn("draft-player-integrity-v1.js", public_guard)

        self.assertIn("./game-v2.js", xox_index)
        self.assertIn("./unified-menu.css", xox_index)
        self.assertIn("./unified-game.css", xox_index)
        self.assertNotIn("./game.js", xox_index)
        self.assertNotIn("approved-reference", career_index)

    def test_boot_keeps_loader_fresh_but_allows_versioned_core_cache(self) -> None:
        root_index = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('no-cache, no-store, must-revalidate', root_index)
        self.assertIn("const VERSION='", root_index)
        self.assertIn("fetch('./neon-xi-core.html?v='+encodeURIComponent(VERSION),{cache:'default'})", root_index)
        self.assertNotIn("fetch('./neon-xi-core.html?v='+encodeURIComponent(VERSION),{cache:'no-store'})", root_index)
        self.assertIn('<link rel="preconnect" href="https://www.gstatic.com" crossorigin>', root_index)

    def test_boot_masks_legacy_home_until_approved_home_is_ready(self) -> None:
        root_index = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('#bootHome:not(.nx-approved-home-v1){visibility:hidden!important', root_index)
        self.assertIn('body::before{content:"NEON XI YÜKLENİYOR"', root_index)
        self.assertIn('const ready=()=>!!document.querySelector("#bootHome.nx-approved-home-v1")', root_index)
        self.assertIn('requestAnimationFrame(reveal)', root_index)
        self.assertIn('setTimeout(()=>{o.disconnect();reveal();},9000)', root_index)

    def test_imposter_uses_runtime_parts_not_legacy_build_parts(self) -> None:
        loader = (ROOT / "side-games/futbol-imposter.html").read_text(encoding="utf-8")
        self.assertIn("fetch('./parts/'+n", loader)
        self.assertFalse((ROOT / "side-games/.parts").exists())
        self.assertFalse((ROOT / "scripts/integrate_side_games.py").exists())


if __name__ == "__main__":
    unittest.main()
