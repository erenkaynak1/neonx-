"""The guards index.html used to patch into the core at load time now live in neon-xi-core.html itself."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")
CORE = (ROOT / "neon-xi-core.html").read_text(encoding="utf-8")

BUILT_IN = {
    "draft room reservation": "const existingPartyRoom = (await get(roomReference)).val();",
    "party auto-room guard": 'const automaticRoomLaunch = onlineLaunchParams.get("nxAuto") === "1" && Number(onlineLaunchParams.get("nxPartySize") || 0) <= 2;',
    "draft auto-match guard": 'if (autoMatch.get("nxAuto") === "1" && Number(autoMatch.get("nxPartySize") || 0) <= 2) {',
    "tournament online bridge": "window.NEON_XI_TOURNAMENT_ONLINE={session,leave,join,watch};",
    "tournament join": "async function join(name,roomCode){await user();name=cleanName(name);roomCode=cleanCode(roomCode);const rr=ref(db,`rooms/${roomCode}`);let off=()=>{},settled=false,timer;",
}


class CorePatchContractTests(unittest.TestCase):
    def test_loader_no_longer_patches_core_strings(self):
        self.assertNotIn("replaceRequired", INDEX)

    def test_each_guard_is_built_into_core_once(self):
        for label, code in BUILT_IN.items():
            with self.subTest(label=label):
                self.assertEqual(CORE.count(code), 1, f"{label} must exist exactly once in neon-xi-core.html")

    def test_core_document_boundaries_exist(self):
        lower = CORE.lower()
        self.assertGreaterEqual(lower.count("</head>"), 1)
        self.assertGreaterEqual(lower.count("</body>"), 1)
        self.assertGreater(lower.rfind("</body>"), lower.rfind("</head>"))


if __name__ == "__main__":
    unittest.main()
