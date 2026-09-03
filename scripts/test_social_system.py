import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]


class SocialSystemTests(unittest.TestCase):
    def test_shared_social_layer_is_loaded_everywhere(self):
        expected = {
            "index.html": "./social/neon-social.js",
            "side-games/index.html": "../social/neon-social.js",
            "side-games/football-xox/index.html": "../../social/neon-social.js",
            "side-games/career-twin/index.html": "../../social/neon-social.js",
            "side-games/football-wordle/index.html": "../../social/neon-social.js",
            "side-games/futbol-imposter.html": "../social/neon-social.js",
        }
        for filename, asset in expected.items():
            with self.subTest(filename=filename):
                self.assertIn(asset, (ROOT / filename).read_text(encoding="utf-8"))

    def test_social_data_model_and_actions_exist(self):
        source = (ROOT / "social/neon-social.js").read_text(encoding="utf-8")
        for token in (
            "social/usernames/",
            "social/profiles/",
            "social/friendRequests/",
            "social/friends/",
            "social/parties/",
            "social/userParty/",
            "social/matchQueues/",
            "runTransaction",
            "ARKADAŞLARLA OYNA",
            "RAKİP ARA",
            "ODA KODU",
        ):
            with self.subTest(token=token):
                self.assertIn(token, source)

    def test_matchmaking_adapters_accept_fixed_room_codes(self):
        core = (ROOT / "neon-xi-core.html").read_text(encoding="utf-8")
        xox = (ROOT / "side-games/football-xox/game-v2.js").read_text(encoding="utf-8")
        twin = (ROOT / "side-games/career-twin/game.js").read_text(encoding="utf-8")
        twin_loader = (ROOT / "side-games/career-twin/game-loader-v2.js").read_text(encoding="utf-8")
        imposter = (ROOT / "side-games/online-base44-imposter.js").read_text(encoding="utf-8")
        self.assertIn("NEON_XI_MATCHMAKING", core)
        self.assertIn('autoMatch.get("nxAuto")', core)
        self.assertIn("createRoom(name,forcedCode='')", xox)
        self.assertIn("createRoom(name,forcedCode='')", twin)
        self.assertIn("q.get('nxAuto')==='1'", xox)
        self.assertIn("q.get('nxAuto')==='1'", twin)
        self.assertIn("q.get('nxAuto')==='1'", twin_loader)
        self.assertIn("createLobby=async function(name,forcedCode='')", imposter)
        self.assertIn("launchPartyRoom", imposter)
        self.assertIn("maybeAutoStart", imposter)

    def test_party_launch_reloads_same_mode_and_hides_manual_room_flow(self):
        social = (ROOT / "social/neon-social.js").read_text(encoding="utf-8")
        core = (ROOT / "neon-xi-core.html").read_text(encoding="utf-8")
        xox = (ROOT / "side-games/football-xox/game-v2.js").read_text(encoding="utf-8")
        twin = (ROOT / "side-games/career-twin/game.js").read_text(encoding="utf-8")
        self.assertIn("nxLaunch", social)
        self.assertIn("nxPartySize", social)
        self.assertNotIn("location.pathname===new URL(target).pathname", social)
        self.assertIn("setBootView(bootLobby)", core)
        self.assertIn("OTOMATİK PARTİ BAĞLANTISI", xox)
        self.assertIn("OTOMATİK PARTİ BAĞLANTISI", twin)

    def test_membership_supports_google_and_explicit_guest_auth(self):
        core = (ROOT / "neon-xi-core.html").read_text(encoding="utf-8")
        social = (ROOT / "social/neon-social.js").read_text(encoding="utf-8")
        combined = core + social
        self.assertIn("signInAnonymously", social)
        self.assertNotIn("signInAnonymously", core)
        self.assertNotIn("GoogleAuthProvider", core)
        self.assertIn("GoogleAuthProvider", social)
        self.assertIn("signInWithPopup", combined)
        self.assertIn("linkWithPopup", combined)
        self.assertIn("GOOGLE İLE GİRİŞ YAP", social)
        self.assertIn("MİSAFİR OLARAK DEVAM ET", social)
        self.assertIn("GOOGLE’A BAĞLA", social)
        self.assertIn("Yalnızca bu tarayıcıda korunur", social)
        self.assertIn("signOut", social)
        self.assertIn("Devam etmek için benzersiz oyuncu adını seç", social)
        self.assertIn("if(state.user&&!state.profile)", social)
        self.assertIn("if(user)bindUser(user)", social)
        self.assertIn("ensurePlayerUser", core)
        self.assertNotIn("ensureGoogleUser", core)


if __name__ == "__main__":
    unittest.main()
