# NEON XI — abuse-surface assessment (authorized)

Scope: NEON XI's own Firebase Realtime Database and client write paths. Nothing outside the project was
tested. This is a defensive review of our own game so we can close the gaps before launch.

## How the game stores data

NEON XI is a static site; every write to the database is made by the **player's own browser**. That means a
player can open the browser console and call the same functions the game calls, with any values they like.
The only thing standing between an attacker and the database is the **Realtime Database security rules**.
If those rules are open (the Firebase default while prototyping is often `".read": true, ".write": true`),
anyone can write anything.

## Findings

### 1. Leaderboard / record forgery — HIGH (confirmed)
From the Higher or Lower page, running
```js
NEON_HL_RECORDS.submit({ streak: 999999, question: 'pv', questionLabel: 'x' })
```
wrote `best: 999999` straight to `social/higherLower/allTime/<uid>` and the weekly board. Reproduced against
the local stub. The same is possible for the main leaderboard (`wins`, `games`) and the profile
`higherLowerBest`, because all of them are written by the client.

**Fix (shipped):**
- Client cap (defense in depth): `hl-records-v1.js` now rejects a streak that is not an integer in 1..10000
  before writing. This stops the `submit()` path but **not** a direct `set()` from the console.
- Database rules (the real fix, `security/database.rules.json`): `best`/`hlBest` must be a number in
  0..10000 and may only increase; every score path is writable **only by the matching uid**.

**Residual risk:** RTDB rules cannot recompute a game, so a determined attacker can still write *a* score up
to the cap (e.g. 10000) for their own account. Eliminating that needs a **Cloud Function** that receives the
move log, replays the game server-side and writes the score itself (clients get read-only access to the
boards). Recommended before any prize or ranking that matters.

### 2. Writing to another player's data — HIGH (if rules are open)
Paths like `social/presence/<uid>/match`, `social/stats/<uid>`, `social/leaderboards/.../<uid>` are all keyed
by uid. Without ownership rules, a player could write a forfeit win/loss onto someone else, or overwrite a
rival's stats. The forfeit system we just added writes to `social/presence/<uid>/match`, so this matters.

**Fix (shipped):** every one of these paths is `".write": "auth.uid === $uid"` in the rules — you can only
write under your own uid.

### 3. Guest-account flooding — MEDIUM
Anyone can create unlimited anonymous accounts and push junk onto the public boards. Custom names are already
blocked for guests. Options: keep guest scores on a separate board, or require a Google account to appear on
the all-time board. Not fixed here — a product decision.

### 4. Online-match trust — MEDIUM
In EN 11 / XOX / Career Twin the host trusts the values the guest sends. A cheating client could send a fake
player id or value. The host should verify the pick exists in the pool and recompute the value locally (it has
the pool). Partially mitigated (picks are looked up by id), worth a dedicated pass.

### 5. Shape / size abuse — LOW
Oversized strings (usernames, question labels) could bloat the database. The rules now cap string lengths and
reject unknown fields on the Higher or Lower records.

## What to do now

1. **Paste `security/database.rules.json` into the Firebase console** (Realtime Database → Rules → Publish).
   This is the single most important step; without it the client caps are cosmetic. Test in the console's
   Rules Playground with a few writes (own uid vs. another uid, in-range vs. out-of-range score).
2. Ship the client cap (done in this branch).
3. Decide on the guest-board policy (finding 3).
4. When a ranking starts to matter, move score-writing into a Cloud Function (finding 1 residual).

## Note on testing

The rules file could not be tested against live Firebase from this environment (the database host is
unreachable here). It was written to match the exact paths and value shapes the app uses, and the JSON is
valid. Verify it in the Firebase console Rules Playground, or with the Firebase emulator, before relying on it.

### Personal avatars (a17 Admin, a18 Karaboğa) — LOW
The picker offers these only to the verified Google account whose e-mail hash matches (social/neon-profile-v1.js).
The database rules do not check `social/profiles/{uid}/avatar`, so a player who edits the client can still save one
of them on their own profile. Enforcing it in the rules needs the owners' Firebase uids (e.g. a grants path
writable only from the console); it is left out until those uids are known.
