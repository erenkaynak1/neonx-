// Draft XI v2 player pool: every player is engine-ready, and random squads drawn from the pool play clean matches.
import assert from 'node:assert/strict';
import { HAVUZ, KEYS, GK_KEYS } from '../draft-xi/data/havuz.mjs';
import { FORMATIONS } from '../draft-xi/engine/formations.mjs';
import { simulateMatch } from '../draft-xi/engine/match.mjs';

const ids = new Set();
for (const p of HAVUZ) {
  assert.ok(!ids.has(p.id), 'tekrarlanan oyuncu: ' + p.id); ids.add(p.id);
  assert.ok(p.name && p.positions.length, p.id);
  for (const k of KEYS) assert.ok(Number.isInteger(p.attrs[k]) && p.attrs[k] >= 1 && p.attrs[k] <= 99, `${p.id}.${k}`);
  if (p.positions.includes('GK')) for (const k of GK_KEYS) assert.ok(p.attrs[k] >= 1 && p.attrs[k] <= 99, `${p.id}.${k}`);
  assert.ok(p.foot === 'L' || p.foot === 'R'); assert.ok(p.height >= 160 && p.height <= 210, p.id + ' boy ' + p.height);
}

// Random squads: each slot takes a pool player who can play that position (mevki); no player twice in one match.
let seed = 99;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const forms = Object.keys(FORMATIONS);
function kadro(name, used) {
  const formation = forms[Math.floor(rnd() * forms.length)];
  const players = {};
  for (const [slot, , mevki] of FORMATIONS[formation]) {
    const uygun = HAVUZ.filter((p) => !used.has(p.id) && p.positions.includes(mevki));
    const havuz = uygun.length ? uygun : HAVUZ.filter((p) => !used.has(p.id) && (mevki === 'GK') === p.positions.includes('GK'));
    const p = havuz[Math.floor(rnd() * havuz.length)];
    used.add(p.id); players[slot] = p;
  }
  return { name, formation, players };
}
const N = Number(process.argv[2] || 300);
let goals = 0, shots = 0;
for (let i = 0; i < N; i++) {
  const used = new Set();
  const r = simulateMatch({ home: kadro('Ev', used), away: kadro('Deplasman', used), seed: 5000 + i, log: false });
  goals += r.score[0] + r.score[1]; shots += r.stats[0].shots + r.stats[1].shots;
}
const g = goals / N, s = shots / N / 2;
assert.ok(g > 1 && g < 7, 'maç başına gol makul aralıkta: ' + g);
assert.ok(s > 5 && s < 25, 'takım başına şut makul aralıkta: ' + s);
console.log(`Draft XI havuzu: ${HAVUZ.length} oyuncu, ${N} rastgele maç hatasız · gol/maç ${g.toFixed(2)} · şut/takım ${s.toFixed(1)} ✓`);
