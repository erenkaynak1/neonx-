from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")
CORE = (ROOT / "neon-xi-core.html").read_text(encoding="utf-8")

CONTRACTS = {
    "draft room reservation": 'const roomReference = ref(database, `rooms/${roomCode}`);\n      const result = await runTransaction(',
    "party auto-room guard": 'const automaticRoomLaunch = onlineLaunchParams.get("nxAuto") === "1";',
    "draft auto-match guard": 'if (autoMatch.get("nxAuto") === "1") {',
    "tournament online bridge": 'window.NEON_XI_TOURNAMENT_ONLINE={session,leave};',
}


class CorePatchContractTests(unittest.TestCase):
    def test_loader_fails_loudly_when_contract_drifts(self):
        self.assertIn("const replaceRequired=", INDEX)
        self.assertIn("count!==1", INDEX)
        self.assertIn("Core patch contract failed", INDEX)

    def test_each_core_patch_target_exists_exactly_once(self):
        for label, needle in CONTRACTS.items():
            with self.subTest(label=label):
                self.assertEqual(
                    CORE.count(needle),
                    1,
                    f"{label} patch target must exist exactly once in neon-xi-core.html",
                )

    def test_core_document_boundaries_exist(self):
        self.assertEqual(CORE.lower().count("</head>"), 1)
        self.assertEqual(CORE.lower().count("</body>"), 1)


if __name__ == "__main__":
    unittest.main()
