# Draft XI v2 — prototype engine

Headless match engine for the Draft XI rebuild. The design and every rule it implements are in
[`docs/draft-xi-v2-tasarim.md`](../docs/draft-xi-v2-tasarim.md); lab results are in
[`docs/draft-xi-v2-lab-raporu.md`](../docs/draft-xi-v2-lab-raporu.md).

- `engine/core.mjs`: integer maths (seeded RNG, logistic lookup, tactic combination, event-log hash). No `Math.exp`/`Math.random`, so every browser computes the same match.
- `engine/logistic-table.mjs`: precomputed logistic table.
- `engine/formations.mjs`: prototype formation templates (4-3-3, 4-4-2, 4-2-3-1, 3-5-2).
- `engine/sample-players.mjs`: 44 sample players in four squads. First-pass values for testing, not reviewed.
- `engine/match.mjs`: `simulateMatch({ home, away, seed, tacticHome, tacticAway })` → `{ score, stats, events, digest }`.

Run the lab: `node scripts/draft_xi_lab.mjs 400`. Fast CI checks: `node scripts/test_draft_xi_engine.mjs`.

Not wired into the site yet; the live Draft XI still runs on `neon-xi-core.html`.
