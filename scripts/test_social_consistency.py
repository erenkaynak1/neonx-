from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / 'index.html').read_text(encoding='utf-8')
CONSISTENCY = (ROOT / 'social/neon-social-consistency-v1.js').read_text(encoding='utf-8')


class SocialConsistencyTests(unittest.TestCase):
    def test_consistency_guard_loads_after_core_membership_and_before_drawer(self):
        base = INDEX.index('./social/neon-social.js')
        membership = INDEX.index('./social/neon-party-membership-integrity-v2.js')
        consistency = INDEX.index('./social/neon-social-consistency-v1.js')
        drawer = INDEX.index('./social/neon-social-drawer-v1.js')
        self.assertLess(base, membership)
        self.assertLess(membership, consistency)
        self.assertLess(consistency, drawer)

    def test_friendship_operations_remove_crossed_and_stale_requests(self):
        self.assertIn('[requestKey(user.uid,uid)]:null', CONSISTENCY)
        self.assertIn('[requestKey(uid,user.uid)]:null', CONSISTENCY)
        self.assertIn('const crossed=(await get(ref(state.db,requestKey(user.uid,uid)))).val()', CONSISTENCY)
        self.assertIn('if(crossed){await acceptFriend(uid)', CONSISTENCY)
        self.assertIn('if(reverse){await acceptFriend(uid)', CONSISTENCY)
        self.assertIn('async function reconcileRequest(fromUid,request)', CONSISTENCY)
        self.assertIn('if(already){await update(ref(state.db)', CONSISTENCY)

    def test_legacy_friend_add_and_accept_clicks_are_not_intercepted(self):
        guarded = "const guarded=button.matches('[data-act=\"create-party\"],[data-invite],[data-nx-party-invite],[data-party-accept],[data-nx-party-accept],[data-nx-confirm-remove],[data-act=\"logout\"]')"
        self.assertIn(guarded, CONSISTENCY)
        self.assertNotIn("const guarded=button.matches('[data-act=\"create-party\"],[data-add]", CONSISTENCY)
        self.assertNotIn('[data-nx-friend-accept]', guarded)

    def test_party_creation_reserves_user_pointer_transactionally(self):
        self.assertIn('const claim=await runTransaction(pointer,current=>current||id', CONSISTENCY)
        self.assertIn('if(claimed!==id)', CONSISTENCY)
        self.assertIn('for(let i=0;i<12;i++)', CONSISTENCY)
        self.assertIn('const created=await runTransaction(partyRef(id),current=>current||', CONSISTENCY)
        self.assertIn("String(current||'')===claimed?null:current", CONSISTENCY)

    def test_party_accept_is_two_phase_and_rolls_back_stale_invites(self):
        self.assertIn('runTransaction(pointer,current=>!current||current===id?id:undefined', CONSISTENCY)
        self.assertIn('const joined=await runTransaction(partyRef(id),current=>', CONSISTENCY)
        self.assertIn("throw new Error('Parti artık mevcut değil. Davet temizlendi.')", CONSISTENCY)
        self.assertIn('social/partyInvites/${uid}/${id}', CONSISTENCY)

    def test_invite_rejects_same_party_and_other_active_party(self):
        self.assertIn('if(targetParty===id)', CONSISTENCY)
        self.assertIn('Bu oyuncu zaten senin partinde', CONSISTENCY)
        self.assertIn('Bu oyuncu zaten başka bir aktif partide', CONSISTENCY)

    def test_offline_cleanup_has_grace_period_and_leader_failover(self):
        self.assertIn('const DEFAULT_GRACE_MS=30000', CONSISTENCY)
        self.assertIn('social/presence/${uid}', CONSISTENCY)
        self.assertIn('Date.now()-last<graceMs()', CONSISTENCY)
        self.assertIn('if(next.leaderUid===uid||!members[next.leaderUid])next.leaderUid=remaining[0]', CONSISTENCY)
        self.assertIn('delete members[uid]', CONSISTENCY)
        self.assertIn('clearMemberWatchers()', CONSISTENCY)

    def test_logout_leaves_party_before_signout(self):
        self.assertIn("button.matches('[data-act=\"logout\"]')", CONSISTENCY)
        self.assertIn('await leaveOwnParty().catch(()=>{})', CONSISTENCY)
        self.assertIn('await window.NEON_SOCIAL?.signOut?.()', CONSISTENCY)

    def test_capture_guard_only_wraps_risky_party_remove_and_logout_actions(self):
        for token in ('[data-invite]', '[data-party-accept]', '[data-nx-party-invite]', '[data-nx-party-accept]', '[data-nx-confirm-remove]', '[data-act="create-party"]'):
            with self.subTest(token=token):
                self.assertIn(token, CONSISTENCY)
        self.assertIn('event.stopImmediatePropagation()', CONSISTENCY)
        self.assertIn('if(!button||!ensureRuntime()||!me())return', CONSISTENCY)

    def test_debug_api_exists_for_browser_stress_lab(self):
        self.assertIn('window.NEON_SOCIAL_CONSISTENCY={', CONSISTENCY)
        self.assertIn('diagnostics', CONSISTENCY)
        self.assertIn('cleanupMember', CONSISTENCY)
        self.assertIn('get graceMs()', CONSISTENCY)


if __name__ == '__main__':
    unittest.main()
