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

// ── Consistency (roadmap step 9: tutarlılık testleri) ──
const V2 = new Set(['GK', 'RB', 'RWB', 'CB', 'LB', 'LWB', 'DM', 'CM', 'AM', 'RM', 'LM', 'RW', 'LW', 'ST']);
const clubs = {};
for (const p of HAVUZ) {
  assert.ok(p.positions.every((q) => V2.has(q)), p.id + ' bilinmeyen mevki ' + p.positions);
  assert.ok(p.weakFoot >= 1 && p.weakFoot <= 5, p.id + ' zayıf ayak');
  assert.ok(p.age >= 15 && p.age <= 45, p.id + ' yaş ' + p.age);
  assert.ok(p.club && p.league, p.id + ' kulüp/lig');
  (clubs[p.club] ||= []).push(p);
}
for (const [club, ps] of Object.entries(clubs)) {
  if (ps.length < 15) continue;  // the 55 squads; stars and movers may stand alone at other clubs
  assert.ok(ps.filter((p) => p.positions.includes('GK')).length >= 2, club + ': en az 2 kaleci');
  const names = ps.map((p) => p.name);
  assert.equal(new Set(names).size, names.length, club + ': aynı oyuncu iki kez');
}
// position profiles point the right way (averages per main position)
const mean = (pos, k) => { const ps = HAVUZ.filter((p) => p.positions[0] === pos); return ps.reduce((t, p) => t + p.attrs[k], 0) / ps.length; };
const W = (k) => (mean('LW', k) + mean('RW', k)) / 2;
assert.ok(mean('CB', 'tac') > mean('CM', 'tac') && mean('CM', 'tac') > W('tac') && W('tac') > mean('ST', 'tac') - 3, 'top kapma: stoper > orta saha > kanat ≈ forvet');
assert.ok(mean('ST', 'fin') > W('fin') && W('fin') > mean('CM', 'fin') && mean('CM', 'fin') > mean('CB', 'fin'), 'bitiricilik: forvet > kanat > orta saha > stoper');
assert.ok(W('pac') > mean('CB', 'pac') && W('cro') > mean('CB', 'cro'), 'kanat: hız ve orta stoperden yüksek');
assert.ok(mean('CB', 'hed') > mean('CM', 'hed') && mean('AM', 'vis') > mean('CB', 'vis'), 'stoper kafada, 10 numara vizyonda önde');
for (const p of HAVUZ.filter((q) => q.positions[0] === 'CB')) assert.ok(p.attrs.tac > p.attrs.fin, p.id + ' stoper: top kapma > bitiricilik');
for (const p of HAVUZ.filter((q) => q.positions[0] === 'ST')) assert.ok(p.attrs.fin > p.attrs.tac, p.id + ' forvet: bitiricilik > top kapma');

// real squads: each club's best XI against another — goal totals stay football-like
const lv = (p) => (p.positions.includes('GK') ? p.attrs.ref + p.attrs.gpos + p.attrs.ghd + p.attrs.one : p.attrs.fin + p.attrs.dri + p.attrs.sp + p.attrs.vis + p.attrs.tac + p.attrs.mar + p.attrs.pac + p.attrs.str);
const big = Object.keys(clubs).filter((c) => clubs[c].length >= 15).sort();
function xi(club) {
  const used = new Set(), players = {};
  for (const [slot, , m] of FORMATIONS['4-3-3']) {
    let c = clubs[club].filter((p) => !used.has(p.id) && p.positions.includes(m));
    if (!c.length) c = clubs[club].filter((p) => !used.has(p.id) && (m === 'GK') === p.positions.includes('GK'));
    const p = c.sort((a, b) => lv(b) - lv(a) || (a.id < b.id ? -1 : 1))[0]; used.add(p.id); players[slot] = p;
  }
  return { name: club, formation: '4-3-3', players };
}
let cg = 0, cn = 0;
for (let i = 0; i < Math.min(N, 160); i++) {
  const a = big[i % big.length], b = big[(i * 7 + 3) % big.length]; if (a === b) continue;
  const r = simulateMatch({ home: xi(a), away: xi(b), seed: 700 + i, log: false }); cg += r.score[0] + r.score[1]; cn++;
}
assert.ok(cg / cn > 1.8 && cg / cn < 3.4, 'kulüp 11leri: maç başına gol gerçekçi aralıkta: ' + (cg / cn).toFixed(2));
console.log(`Draft XI havuzu: ${HAVUZ.length} oyuncu, ${N} rastgele maç hatasız · gol/maç ${g.toFixed(2)} · şut/takım ${s.toFixed(1)} · kulüp 11leri gol/maç ${(cg / cn).toFixed(2)} · tutarlılık ✓`);
