from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
DRAWER = (ROOT / "social/neon-social-drawer-v1.js").read_text(encoding="utf-8")


class SocialDrawerIntegrityTests(unittest.TestCase):
    def test_party_membership_is_transactionally_claimed(self):
        self.assertIn("runTransaction(pointer,value=>!value||value===id?id:undefined", DRAWER)
        self.assertIn("if(existing)throw new Error('Zaten aktif bir partidesin.')", DRAWER)
        self.assertIn("Başka bir parti üyeliği aynı anda etkinleşti", DRAWER)
        self.assertIn("await remove(pointer);state.partyId='';state.party=null;return ''", DRAWER)

    def test_boot_polling_stops_after_initialization(self):
        self.assertIn("const initialize=()=>", DRAWER)
        self.assertIn("if(initialize())clearInterval(timer)", DRAWER)
        self.assertNotIn("const timer=setInterval(()=>{\n    ensureShell();patchOpen();", DRAWER)


if __name__ == "__main__":
    unittest.main()
