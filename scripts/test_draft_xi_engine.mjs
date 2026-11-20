// Fast CI checks for the Draft XI v2 prototype engine (design doc 10.1): determinism, event log contract, sanity bounds.
import assert from 'node:assert/strict';
import { simulateMatch, ENGINE_VERSION } from '../draft-xi/engine/match.mjs';
import { SQUADS, BY_ID, PLAYERS } from '../draft-xi/engine/sample-players.mjs';
import { prob, combineTactics, bForBase, makeRng } from '../draft-xi/engine/core.mjs';

const squad = k => ({ name: SQUADS[k].name, formation: SQUADS[k].formation, players: Object.fromEntries(Object.entries(SQUADS[k].slots).map(([s, id]) => [s, BY_ID[id]])) });

// maths core
assert.equal(prob(800, 800, 85, 0), 5000, 'equal skill, no difficulty = 50 %');
assert.ok(prob(900, 800, 85, 0) >= 6900 && prob(900, 800, 85, 0) <= 7100, '10 points with k=0.085 ≈ 70 % (14.1)');
assert.ok(prob(800, 800, 85, 1000) < 5000, 'difficulty B lowers success (formula sign fix, 4.3)');
assert.equal(combineTactics([15, 15]), 22.5, 'two effects: 15 + 7.5 (14.4)');
assert.equal(combineTactics([15, 15, 15, 15]), 25, 'combined effect capped at 25');
assert.equal(combineTactics([15, -15]), 0, 'opposite effects cancel');
assert.ok(Math.abs(prob(500, 500, 54, bForBase(8500)) - 8500) <= 30, 'reference point: 50-rated short pass ≈ 85 %');
const r1 = makeRng(5), r2 = makeRng(5); for (let i = 0; i < 50; i++) assert.equal(r1.roll(), r2.roll(), 'seeded RNG repeats');

// data contract
for (const p of PLAYERS) {
  for (const k of ['fin', 'lon', 'hed', 'posn', 'dri', 'ft', 'sp', 'lp', 'cro', 'vis', 'tac', 'mar', 'pac', 'str']) assert.ok(p.attrs[k] >= 1 && p.attrs[k] <= 99, `${p.id}.${k} in 1–99`);
  if (p.positions.includes('GK')) for (const k of ['ref', 'gpos', 'ghd', 'one']) assert.ok(p.attrs[k] >= 1 && p.attrs[k] <= 99, `${p.id}.${k}`);
  assert.ok(p.weakFoot >= 1 && p.weakFoot <= 5 && p.height > 150, `${p.id} foot/height`);
}

// determinism and event log
const a = simulateMatch({ home: squad('A'), away: squad('B'), seed: 11 });
const b = simulateMatch({ home: squad('A'), away: squad('B'), seed: 11 });
const c = simulateMatch({ home: squad('A'), away: squad('B'), seed: 12 });
assert.equal(a.digest, b.digest, 'same seed → same event log (13.3)');
assert.notEqual(a.digest, c.digest, 'different seed → different match');
assert.equal(a.engine, ENGINE_VERSION);
assert.ok(a.events.length > 300, 'event log is the engine output');
for (const e of a.events) assert.ok(typeof e.type === 'string' && Number.isInteger(e.t), 'event has type and integer time');
assert.equal(a.events.filter(e => e.type === 'goal').length, a.score[0] + a.score[1], 'goals in the log match the score');

// broad sanity over a small batch (the full lab is scripts/draft_xi_lab.mjs)
let goals = 0, shots = 0; const N = 24; const pairs = [['A', 'B'], ['C', 'D'], ['A', 'C'], ['B', 'D']];
for (let i = 0; i < N; i++) { const [h, w] = pairs[i % 4]; const r = simulateMatch({ home: squad(h), away: squad(w), seed: 300 + i, log: false }); goals += r.score[0] + r.score[1]; shots += r.stats[0].shots + r.stats[1].shots; }
assert.ok(goals / N > 1 && goals / N < 7, `goals per match in a broad band: ${(goals / N).toFixed(2)}`);
assert.ok(shots / N > 10 && shots / N < 45, `shots per match in a broad band: ${(shots / N).toFixed(1)}`);
console.log(`draft xi engine ok · v${ENGINE_VERSION} · ${(goals / N).toFixed(2)} goals, ${(shots / N).toFixed(1)} shots per match`);
