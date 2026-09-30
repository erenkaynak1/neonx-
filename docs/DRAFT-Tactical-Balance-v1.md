# Draft XI — PR #13 integration on v6

This integration keeps main's contextual v6 engine and approved home screen.

## Preserved

- Custom chemistry is unchanged: all link calculations, the 25% boost curve, chemistryModifier and teamBasePower remain identical to main 57da47b. The PR's proposed 8% ceiling and removal of the team chemistry factor are explicitly excluded at the user's request.
- v6 regain-context counters, recovery defense before transition shots, deployed-position cohorts, red-card effects, smooth phase probabilities, xG accounting and watched/fast clock parity remain intact.
- Main artwork, ice palette, hotspot geometry and the base cache token `20260929-tactical-engine-v6` remain intact. The core and the two changed tactical scripts use a separate `-pr13-load-v2` suffix so returning visitors receive the new engine without changing home asset versions.

## Integrated

- Deterministic physical workload accepts independent stamina, including detailed attribute data. Missing stamina uses an unboosted strength/pace/teamwork proxy (42/30/28). This proxy is not measured stamina.
- Player execution, team pressing and the coach forecast share per-player condition. The coach reads the mean 90-minute forecast directly from the production engine preview.
- Pressing effectiveness fades with condition. Main's defensive recovery-speed penalty is retained without adding a second penalty for the same fatigued recovery speed.
- A tired high press exposes more counter space inside v6's existing regain-context calculation. The old v1 random counter initiation and pressureBonus branch are not restored.
- Crossing access follows the actual corridor: wing 1, center .60, transition .40.
- Runtime Integrity enforces v6, workload, chemistry preservation and approved-home checks. The browser calibration workflow also enforces the mirrored 1,080-match v6 balance matrix.

## Local validation

`MATCHES=60 node scripts/draft-balance-matrix.cjs` completed 1,080 production-engine matches (9 scenarios, 60 seeds, both sides). All accounting and balance regression gates passed. Equal-quality presets won 27.5–39.2% against balanced opponents in this synthetic sample. Strong/weak squad ordering, red-card disadvantage, early-shot volume/quality cost, possession retention and counter frequency gates passed.

Raw results: `docs/engine/tactical-balance-pr13-integration.json`. The previous v6 JSON remains historical evidence, not the integrated version's results.

The invariant tests exercise real engine functions for explicit stamina, missing-stamina proxy, team-condition averaging, late pressing, transition exposure, crossing corridor and unchanged chemistry. Main's entry artwork and mobile hotspot tests passed.

Browser and multiplayer results must be read from the integration commit's Actions runs before merge. This environment could not download a local Chromium runtime, so local static/headless checks do not claim mobile visual or Firebase multiplayer coverage.

## Limits

The motor is still phase/event based. Synthetic 4-3-3 squads do not represent every formation or the real player database. The browser lab uses 96 mirrored matches from a real-player subset and broad smoke bounds; a green result is not evidence of universal tactical balance. Geometry-based possession scheduling, per-player exertion/substitutions and all-formation round-robin calibration remain future work.
