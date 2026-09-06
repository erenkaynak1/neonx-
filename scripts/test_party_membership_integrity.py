from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / 'index.html').read_text(encoding='utf-8')
GUARD = (ROOT / 'social/neon-party-membership-integrity-v2.js').read_text(encoding='utf-8')
BOT = (ROOT / 'scripts/neon_bot_lab.mjs').read_text(encoding='utf-8')


class PartyMembershipIntegrityTests(unittest.TestCase):
    def test_root_loads_party_integrity_before_safe_and_drawer_layers(self):
        guard_pos = INDEX.index('./social/neon-party-membership-integrity-v2.js')
        safe_pos = INDEX.index('./social/neon-social-safe-v4.js')
        drawer_pos = INDEX.index('./social/neon-social-drawer-v1.js')
        self.assertLess(guard_pos, safe_pos)
        self.assertLess(guard_pos, drawer_pos)

    def test_leave_uses_latest_party_state_in_firebase_transaction(self):
        self.assertIn('runTransaction(partyRef,current=>', GUARD)
        self.assertIn('delete members[user.uid]', GUARD)
        self.assertIn('if(!remaining.length)return null', GUARD)
        self.assertIn('if(next.leaderUid===user.uid||!members[next.leaderUid])', GUARD)
        self.assertIn('runTransaction(pointer,current=>String(current||\'\')===partyId?null:current', GUARD)

    def test_guard_intercepts_both_current_party_leave_buttons(self):
        self.assertIn('[data-nx-party-leave]', GUARD)
        self.assertIn('[data-act="leave-party"]', GUARD)
        self.assertIn('event.stopImmediatePropagation()', GUARD)

    def test_bot_lab_exercises_simultaneous_leave_race(self):
        self.assertIn('Eşzamanlı partiden ayrılma veri bütünlüğü', BOT)
        self.assertIn('Promise.all([leaveParty(botA),leaveParty(botB)])', BOT)
        self.assertIn(".h-online", BOT)


if __name__ == '__main__':
    unittest.main()
