from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
ENTRY = (ROOT / 'social/neon-social.js').read_text(encoding='utf-8')
CORE = (ROOT / 'social/neon-social-core-v1.js').read_text(encoding='utf-8')
GUARD = (ROOT / 'social/neon-social-integrity-v3.js').read_text(encoding='utf-8')
RACE = (ROOT / 'scripts/neon_social_race_lab.mjs').read_text(encoding='utf-8')


class SocialIntegrityV3Tests(unittest.TestCase):
    def test_stable_entrypoint_loads_core_before_integrity_guard(self):
        self.assertIn("import './neon-social-core-v1.js'", ENTRY)
        self.assertIn("import './neon-social-integrity-v3.js'", ENTRY)
        self.assertLess(ENTRY.index('neon-social-core-v1.js'), ENTRY.index('neon-social-integrity-v3.js'))
        self.assertIn('window.NEON_SOCIAL={', CORE)
        self.assertLess(len(ENTRY), 1000)

    def test_party_creation_is_single_pointer_claim_with_loser_cleanup(self):
        self.assertIn('async function ensureParty()', GUARD)
        self.assertIn('runTransaction(pointer,value=>value||candidate', GUARD)
        self.assertIn('if(chosen===candidate)return candidate', GUARD)
        self.assertIn('await remove(candidateRef)', GUARD)
        self.assertIn('const valid=await currentPartyId()', GUARD)

    def test_party_accept_requires_invite_and_cannot_recreate_deleted_party(self):
        self.assertIn("social/partyInvites/${uid}/${id}", GUARD)
        self.assertIn("throw new Error('Parti daveti artık mevcut değil.')", GUARD)
        self.assertIn('const join=await runTransaction(partyRef,current=>', GUARD)
        self.assertIn('if(!current)return;', GUARD)
        self.assertIn("value=>String(value||'')===id?null:value", GUARD)
        self.assertIn('await clearPartyInvites(uid)', GUARD)

    def test_friendship_converges_and_clears_both_request_directions(self):
        self.assertIn('async function reconcileFriendRequests()', GUARD)
        self.assertIn('if(reciprocal)await connectFriends(uid,request)', GUARD)
        self.assertIn('[`social/friendRequests/${me}/${otherUid}`]:null', GUARD)
        self.assertIn('[`social/friendRequests/${otherUid}/${me}`]:null', GUARD)
        self.assertIn('if(friend){', GUARD)
        self.assertIn('return {alreadyFriends:true}', GUARD)

    def test_offline_members_have_grace_period_and_race_safe_leader_transfer(self):
        self.assertIn('const DEFAULT_GRACE_MS=30000', GUARD)
        self.assertIn('scheduleOfflineCheck(uid)', GUARD)
        self.assertIn('evictIfStillOffline(partyId,uid)', GUARD)
        self.assertIn('if(next.leaderUid===uid||!members[next.leaderUid])', GUARD)
        self.assertIn('if(next.launch)delete next.launch', GUARD)
        self.assertIn("reason:'offline-timeout'", GUARD)
        self.assertIn("reason:'network-gap'", GUARD)
        self.assertIn("reason:'local-absence'", GUARD)

    def test_logout_leaves_party_before_auth_signout(self):
        leave = GUARD.index("leaveCurrentParty({silent:true,reason:'logout'})")
        signout = GUARD.index('await signOut(state.auth)')
        self.assertLess(leave, signout)
        self.assertIn('[data-act="logout"]', GUARD)

    def test_legacy_and_drawer_critical_buttons_are_intercepted(self):
        for token in (
            '[data-act="create-party"]', '[data-add]', '[data-invite]', '[data-nx-party-invite]',
            '[data-party-accept]', '[data-nx-party-accept]', '[data-accept]',
            '[data-nx-friend-accept]', '[data-act="leave-party"]', '[data-nx-party-leave]'
        ):
            with self.subTest(token=token):
                self.assertIn(token, GUARD)
        self.assertIn('event.stopImmediatePropagation()', GUARD)

    def test_race_lab_covers_the_high_risk_social_state_machine(self):
        for scenario in (
            'Karşılıklı aynı anda arkadaşlık isteği tek arkadaşlığa yakınsar',
            'Mevcut arkadaşa tekrar istek pending kayıt üretmez',
            'Aynı hesap iki sekmede eşzamanlı parti kurunca tek parti oluşur',
            'İki farklı parti davetini aynı anda kabul etmede yalnızca biri kazanır',
            'Silinmiş partiye ait davet otomatik temizlenir',
            'Davet kabulü ile parti silinmesi yarışında zombi parti oluşmaz',
            'Çevrimdışı lider grace sonrası çıkar ve liderlik üyeye geçer',
        ):
            with self.subTest(scenario=scenario):
                self.assertIn(scenario, RACE)
        self.assertIn('__NEON_SOCIAL_GRACE_MS__', RACE)
        self.assertIn('Promise.allSettled', RACE)


if __name__ == '__main__':
    unittest.main()
