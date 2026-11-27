# Draft XI — Match Engine Rebuild (Phase 1)

## Purpose

Restore believable football movement and action continuity without changing the Draft XI product surface or the existing chemistry model.

This is a staged engineering plan, not a claim that the match engine is already a continuous, emergent simulation.

## Non-negotiable invariants

- Do not change the chemistry calculation or chemistry balance.
- Do not change player-pool data, draft flow, squad selection, or the existing 2D renderer in Phase 1.
- Keep the current match engine deterministic for a given seed.
- Keep the current event/statistics contract until a replacement is validated.
- Never merge experimental match-engine work directly into `main`.
- A highlight boundary is a camera/editing boundary, not a physical reset. Preserve player position, velocity, facing, and ball state unless a real football restart requires a reset.
- Do not introduce synthetic velocity impulses to imitate motion.

## Current architecture and diagnosed risks

The current pipeline is:

1. `engine/match.mjs` simulates match events and optional event-time frames.
2. `ui/mac/yonetmen.mjs` converts those events into timed highlight actions.
3. `ui/mac/fizik.mjs` integrates player bodies and ball movement at a fixed step.
4. `ui/mac/taktik.mjs` assigns player movement targets.
5. `ui/mac/cizim.mjs` renders the state.

The key architectural risk is that the match engine decides outcomes before the 2D scene is played. The director then reconstructs those outcomes as physical actions. The physics and tactical layers therefore do not own the same continuous match state as the event simulator. This can produce mismatches between the event log, player trajectories, ball trajectory, and what the viewer sees.

The previous director also contained highlight-boundary position snaps and synthetic velocity injection. PR #163 removes those non-restart corrections and adds pace-limited movement in selected engine actions. That is a useful stabilization step, but it does not by itself turn the event-first architecture into a continuous simulation.

## Phase 1 — Stabilize the existing playback

- Retain the PR #163 movement-continuity changes as the starting point.
- Audit every direct write to player coordinates, velocity, ball coordinates, and ball ownership in the director.
- Classify each write as one of:
  - legitimate restart (kick-off, throw-in, goal kick, free kick, corner, penalty);
  - physical interaction (touch, tackle, header, save);
  - invalid presentation correction (highlight snap, arbitrary reposition, synthetic impulse).
- Remove invalid presentation corrections without changing legitimate restart placement.
- Ensure the director never silently moves a free ball to a player.
- Verify that ball ownership changes only through a logged/physical touch or a documented restart.

## Phase 2 — Continuous match state

Introduce a single authoritative match state updated at a fixed simulation tick. The state must own:

- player position, velocity, acceleration, facing, stamina, and action state;
- ball position, velocity, height, spin/drag approximation, and ownership/contest state;
- team shape, tactical phase, and player intent;
- referee/restart state and match clock.

The renderer must be read-only. It interpolates the authoritative state and must never decide football outcomes.

The event log and statistics should be emitted from state transitions, not used as instructions to teleport or reconstruct the match.

## Phase 3 — Football decision model

Use a decision hierarchy with distinct update rates:

- strategic: team shape, block height, width, build-up and transition plan;
- tactical: pressing triggers, cover shadows, support angles, overloads, marking and runs;
- individual: scan, orient, receive, carry, pass, shoot, tackle, intercept, recover.

Decision inputs should include player attributes, fatigue, body orientation, ball speed, pressure, passing-lane obstruction, teammate options, opponent positions, tactical instructions, and current match phase.

Actions must have physical preconditions and outcomes. A pass cannot complete before the ball reaches a receiver; a tackle cannot win from arbitrary distance; a header requires a reachable aerial contest; a shot must originate from the shooter's actual contact point.

## Phase 4 — Validation gates

Before replacing the existing match engine, validate:

- deterministic repeatability for identical seeds;
- no NaN/infinite positions or velocities;
- players remain within legal pitch bounds except during documented out-of-play events;
- no unexplained player or ball teleportation;
- ball speed and player speed remain within configured limits;
- pass, cross, shot, tackle, and aerial outcomes match the visible contact;
- contrasting tactics create measurably different spatial patterns;
- match statistics are derived from the same simulation state;
- multiple seeds produce plausible distributions rather than one scripted pattern.

Keep a reproducible test set of seeds and compare event statistics and visual recordings against the current release.

## Phase 1 acceptance criteria

- No non-restart player position snap at highlight boundaries.
- No synthetic velocity assignment at highlight boundaries.
- Ball reset/placement only occurs for a documented restart or a new match.
- Existing chemistry, draft, player pool, tactics schema, and renderer remain unchanged.
- Browser/runtime tests pass before merge.

## Deferred work

A fully continuous football simulation is a larger replacement, not a safe one-commit patch. Do not claim it is complete until the continuous state, decision model, event/statistics derivation, and browser validation are implemented.
