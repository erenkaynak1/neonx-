from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")
SYNC = (ROOT / "social/neon-social-identity-sync-v1.js").read_text(encoding="utf-8")
BOT = (ROOT / "scripts/neon_bot_lab.mjs").read_text(encoding="utf-8")


class SocialIdentitySyncTests(unittest.TestCase):
    def test_root_loads_identity_sync_after_social_core(self):
        social_pos = INDEX.index('./social/neon-social.js')
        sync_pos = INDEX.index('./social/neon-social-identity-sync-v1.js')
        safe_pos = INDEX.index('./social/neon-social-safe-v4.js')
        self.assertLess(social_pos, sync_pos)
        self.assertLess(sync_pos, safe_pos)

    def test_identity_is_event_driven_from_auth_and_profile(self):
        self.assertIn('onAuthStateChanged', SYNC)
        self.assertIn('onValue(ref(db,`social/profiles/${user.uid}`)', SYNC)
        self.assertIn('window.NEON_IDENTITY=identity', SYNC)
        self.assertIn("neon-identity-ready", SYNC)
        self.assertIn("localStorage.setItem('nxSocialUid'", SYNC)
        self.assertIn("localStorage.setItem('nxSocialUsername'", SYNC)

    def test_no_permanent_identity_polling_is_reintroduced(self):
        self.assertNotIn('setInterval(()=>{patchOpen();patchPlay();ensureBadge();identity()},1200)', SYNC)
        self.assertIn('tries>=160', SYNC)
        self.assertIn('clearInterval(bootTimer)', SYNC)

    def test_bot_lab_requires_real_identity_bridge(self):
        self.assertIn('window.NEON_IDENTITY?.uid', BOT)
        self.assertIn('İki bağımsız misafir hesabı oluşturma', BOT)
        self.assertIn('Gerçek iki oturumla Draft matchmaking handshake', BOT)


if __name__ == '__main__':
    unittest.main()
