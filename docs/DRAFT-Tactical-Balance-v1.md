# NEON XI Draft XI | Tactical Balance v1

Status: experimental engine changes on a dedicated branch. Do not treat unit checks as proof of full-match balance.

## Why this exists

A Football Manager-inspired engine needs explainable causes, not a fixed bonus for selecting a fashionable tactic. The simulation already has role models, action phases, route-specific shot choices, 2D event synchronization and chemistry. This iteration keeps those interfaces intact and corrects several inconsistent incentives.

## Implemented in v1

- Chemistry: on-screen and in-match player boosts share an 8% ceiling (previously 25%). Raw team quality no longer applies chemistry a second time, while player actions still benefit once.
- Physical workload: a high press and fast transitions have cumulative costs; low blocks and secure transitions conserve energy. The current database has no dedicated stamina attribute. Until verified stamina data exists, strength/pace/teamwork supply an explicitly named resilience **proxy**, while pressing discipline describes efficient execution. If a player has a valid explicit stamina attribute it overrides the proxy.
- High press: the initial phase-one pressing bonus weakens with condition. Transition cover is more fragile as the press tires.
- Counterattacks: the opponent's pressing level, current condition and rest defense influence transition opportunity; low blocks trade territory for less space behind the line.
- High turnovers: pressure modifies the likelihood of an actual turnover becoming a counter, rather than always applying the same percentage.
- Crossing: execution still depends on player ability, and the *actual* attack corridor now governs access. A central move can switch the ball wide, but is less likely to immediately finish with a cross than a genuine wing attack.
- Existing score, shot log, event pipeline, xG, ratings and 2D director contracts are retained.

## Balance invariants

1. Changing tactical setting has a measurable benefit and a cost. No universal tactic should dominate every opponent, squad and minute.
2. Physical load and role fit never depend on the side label (A/B).
3. Better athletic resilience and better discipline must not accelerate fatigue.
4. High press must not remain at minute-one efficiency at 90'.
5. A low block must reduce transition space but still concede territory and opportunities elsewhere.
6. Chemistry has a bounded effect and does not transform a technically weak footballer into an elite one.
7. Live visuals must describe the event the engine actually resolved, without independent goal or card rolls.
8. All randomness must go through the seeded match RNG for reproducible analysis.
9. When the same sides and squads are swapped, statistical bias must be measured rather than hidden.

## Next stages, not claimed as complete

1. Replace the current fixed-ish possession/attack clock with a calibrated event scheduler. The current engine advances by 1-3 minutes and samples one attack, which is not yet a possession-level simulator.
2. Link shot type/xG to actual sequence geometry, defenders and pass origin, then calibrate xG separately from finishing and goalkeeper skill. Ground shots and aerial shots currently estimate xG differently.
3. Add off-ball occupation: width, half-spaces, opponent fullback gaps, pressing traps, rest defense and coherent 2D player targets from the same state.
4. Track player-specific exertion by position, repeated sprints, pressing, tackles, match tempo and substitutions. Do not label the resilience proxy as real measured stamina.
5. Run seeded Monte Carlo comparisons with mirrored rosters and sides: win/draw/loss, shots, xG, xG-to-goal calibration, possessions, route distribution, card frequency and late-game pressing effect. Publish confidence intervals and investigate regressions.
6. Test against every supported formation and tactic combination, including red cards, lopsided squads, set-piece specialists, positional mismatches and mobile/online match replay.

## Promotion gate

Do not merge this branch because a handful of static unit tests are green. The next release gate is full-match balance evidence, mirrored-seed bias checks and intact 2D/social/mobile regressions.
