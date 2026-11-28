// Draft XI tournament logic (draft-xi/ui/turnuva-ortak.mjs): a bracket of 4 or 8 drafted teams plays down to one
// champion, every match has a winner (draws on penalties), the player's match is found each round, and a replay of the
// same seeds gives the same tournament.
import assert from 'node:assert/strict';
import { HAVUZ } from '../draft-xi/data/havuz-fm.mjs';
import { FORMATIONS } from '../draft-xi/engine/formations.mjs';
import { kur, oyna, sonucYaz, ilerle, benimMac, elendi, kazanan, penaltilar, kadro } from '../draft-xi/ui/turnuva-ortak.mjs';

// simple drafted teams: walk the pool and fill each team's 4-3-3 with players who can play the slot
function teams(n) {
  const used = new Set(), out = [];
  for (let t = 0; t < n; t++) {
    const slots = {};
    for (const [slot, , m] of FORMATIONS['4-3-3']) { const p = HAVUZ.find((x) => !used.has(x.id) && x.positions.includes(m)); used.add(p.id); slots[slot] = p.id; }
    out.push({ name: `T${t}`, formation: '4-3-3', slots, bot: t !== 0, plan: ['dengeli', 'kontra', 'pres', 'kanat'][t % 4] });
  }
  return out;
}
let pens = 0, draws = 0;
for (const n of [4, 8]) for (const seed of [11, 22, 33]) {
  const st = kur(teams(n), seed);
  assert.equal(st.turlar[0].length, n / 2);
  assert.deepEqual(st.turlar[0].flatMap((m) => [m.a, m.b]).sort((a, b) => a - b), [...Array(n).keys()], 'every team once in round 1');
  let rounds = 0;
  while (st.sampiyon == null) {
    const m = benimMac(st);
    if (!elendi(st)) assert.ok(m, 'player still in → has a match this round');
    if (m && m.kazanan == null) sonucYaz(st, m, [1, 1]);   // the player's match from the match screen: a draw → penalties
    for (const x of st.turlar[st.tur]) if (x.kazanan == null) oyna(st, x);
    for (const x of st.turlar[st.tur]) { assert.ok(x.kazanan === x.a || x.kazanan === x.b); if (x.skor[0] === x.skor[1]) { draws++; assert.ok(x.pen && x.pen.skor[0] !== x.pen.skor[1]); pens++; } }
    assert.ok(ilerle(st)); rounds++;
  }
  assert.equal(rounds, Math.log2(n));
  // same seeds → same champion
  const again = kur(teams(n), seed);
  while (again.sampiyon == null) { const m = benimMac(again); if (m && m.kazanan == null) sonucYaz(again, m, [1, 1]); for (const x of again.turlar[again.tur]) if (x.kazanan == null) oyna(again, x); ilerle(again); }
  assert.equal(again.sampiyon, st.sampiyon, 'deterministic');
}
// penalties: better takers vs a weaker keeper win more often
const T = teams(2), A = kadro(T[0]), B = kadro(T[1]);
const boost = (sq, f) => ({ ...sq, players: Object.fromEntries(Object.entries(sq.players).map(([s, p]) => [s, { ...p, attrs: { ...p.attrs, ...f(p) } }])) });
const strong = boost(A, (p) => (p.positions.includes('GK') ? { ref: 90, one: 90 } : { fin: 92, posn: 90 }));
const weak = boost(B, (p) => (p.positions.includes('GK') ? { ref: 50, one: 50 } : { fin: 50, posn: 50 }));
let w = 0; for (let s = 1; s <= 400; s++) { const r = penaltilar(strong, weak, s); assert.notEqual(r.skor[0], r.skor[1]); if (r.skor[0] > r.skor[1]) w++; }
assert.ok(w / 400 > 0.7, `strong side wins shootouts ${w}/400`);
console.log(`draft xi turnuva ok · 6 tournaments, ${draws} draws all settled on penalties · strong side wins ${Math.round(w / 4)}% of shootouts`);
