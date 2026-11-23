// Draft XI match screen, game-state layer (draft-xi/ui/mac/durum.mjs): live stats counted from the event log match the
// engine's own totals, every goal is in the highlight reel, and the reel fits a 2–4 minute watch.
import assert from 'node:assert/strict';
import { simulateMatch } from '../draft-xi/engine/match.mjs';
import { SQUADS, BY_ID } from '../draft-xi/engine/sample-players.mjs';
import { buildState, createStats, highlights } from '../draft-xi/ui/mac/durum.mjs';

const squad = (k) => ({ name: SQUADS[k].name, formation: SQUADS[k].formation, players: Object.fromEntries(Object.entries(SQUADS[k].slots).map(([s, id]) => [s, BY_ID[id]])) });
const pairs = [['A', 'B'], ['C', 'D'], ['A', 'D'], ['B', 'C']];
let reelSecs = 0;
for (let seed = 1; seed <= 24; seed++) {
  const [h, w] = pairs[seed % 4];
  const r = simulateMatch({ home: squad(h), away: squad(w), seed, frames: true });
  const S = buildState(r);
  assert.equal(S.F.length, S.E.length, 'one frame per event');
  const st = createStats(S); st.add(S.E.length - 1);
  for (const s of [0, 1]) for (const k of ['goals', 'shots', 'onTarget', 'passes', 'passesOk', 'corners', 'fouls', 'offsides'])
    assert.equal(st.T[s][k], r.stats[s][k], `seed ${seed} side ${s} ${k}: screen ${st.T[s][k]} vs engine ${r.stats[s][k]}`);
  const H = highlights(S, { budget: 700 });
  S.E.forEach((e, k) => { if (e.type === 'goal') assert.ok(H.some((x) => x.a <= k && k <= x.b), `seed ${seed}: goal at event ${k} is in the reel`); });
  for (let i = 1; i < H.length; i++) assert.ok(H[i].a > H[i - 1].b, 'highlights in order, no overlap');
  reelSecs += H.reduce((t, x) => t + 4 + (x.b - x.a + 1) * 2.2, 0);
}
const avg = reelSecs / 24;
assert.ok(avg > 300 && avg < 800, `reel length in budget: ${avg.toFixed(0)}`);
console.log(`draft xi match screen state ok · stats = engine in 24 matches · reel ≈ ${avg.toFixed(0)} match-seconds`);
