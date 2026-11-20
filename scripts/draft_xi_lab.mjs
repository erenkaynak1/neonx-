// Draft XI v2 validation lab (design doc section 10): plays many headless matches and reports
// event frequencies, determinism, tactic and attribute isolation. Run: node scripts/draft_xi_lab.mjs [matches]
import { simulateMatch, ENGINE_VERSION } from '../draft-xi/engine/match.mjs';
import { SQUADS, BY_ID } from '../draft-xi/engine/sample-players.mjs';

const N = Number(process.argv[2] || 400);
const squad = (k, tweak) => {
  const s = SQUADS[k];
  const players = Object.fromEntries(Object.entries(s.slots).map(([slot, id]) => {
    const p = BY_ID[id]; return [slot, tweak ? tweak(slot, p) : p];
  }));
  return { name: s.name, formation: s.formation, players };
};
const PAIRS = [['A', 'B'], ['C', 'D'], ['A', 'C'], ['B', 'D'], ['A', 'D'], ['B', 'C']];

function run(n, opts = {}) {
  const tot = {}; let draws = 0, homeWins = 0, goalsHist = {}; const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const [h, a] = opts.pair || PAIRS[i % PAIRS.length];
    const r = simulateMatch({ home: squad(h, opts.tweakHome), away: squad(a, opts.tweakAway), seed: (opts.seedBase || 1000) + i,
      tacticHome: opts.tacticHome, tacticAway: opts.tacticAway, log: !!opts.log });
    const g = r.score[0] + r.score[1]; goalsHist[g] = (goalsHist[g] || 0) + 1;
    if (r.score[0] === r.score[1]) draws++; else if (r.score[0] > r.score[1]) homeWins++;
    r.stats.forEach((s, side) => { for (const [k, v] of Object.entries(s)) { tot[`${k}`] = (tot[k] || 0) + v; tot[`${side}.${k}`] = (tot[`${side}.${k}`] || 0) + v; } });
  }
  const per = k => tot[k] / n; const perTeam = k => tot[k] / (2 * n);
  return { n, per, perTeam, draws: draws / n, homeWins: homeWins / n, ms: (Date.now() - t0) / n, tot, goalsHist };
}

const f1 = v => v.toFixed(1), pct = v => (v * 100).toFixed(0) + '%';
console.log(`Draft XI v2 lab · engine ${ENGINE_VERSION} · ${N} matches`);

// 1) determinism (10.1)
const a = simulateMatch({ home: squad('A'), away: squad('B'), seed: 42 }), b = simulateMatch({ home: squad('A'), away: squad('B'), seed: 42 });
const c = simulateMatch({ home: squad('A'), away: squad('B'), seed: 43 });
console.log(`\n[Tekrarlanabilirlik] aynı tohum aynı özet: ${a.digest === b.digest ? 'EVET' : 'HAYIR'} (${a.digest}); farklı tohum farklı: ${a.digest !== c.digest ? 'EVET' : 'HAYIR'}`);

// 2) frequencies (14.5)
const base = run(N);
const rows = [
  ['Maç başına gol', f1(base.per('goals')), '3–3,5'],
  ['Beraberlik', pct(base.draws), '~%22–27'],
  ['Şut / takım', f1(base.perTeam('shots')), '~12–14'],
  ['İsabetli şut / takım', f1(base.perTeam('onTarget')), '~4–5'],
  ['İsabetli şutun gole dönüşü', pct(base.tot.goals / base.tot.onTarget), '~%30–35'],
  ['Pas / takım', f1(base.perTeam('passes')), '~400–550 (prototip: aksiyonlar daha iri)'],
  ['Pas isabeti', pct(base.tot.passesOk / base.tot.passes), '~%80–90'],
  ['Uzun pas isabeti', pct(base.tot.longOk / Math.max(1, base.tot.longPasses)), '~%50–60'],
  ['Orta / takım', f1(base.perTeam('crosses')), '~15–20'],
  ['Orta isabeti', pct(base.tot.crossesOk / Math.max(1, base.tot.crosses)), '~%25–35'],
  ['Çalım başarısı', pct(base.tot.dribblesOk / Math.max(1, base.tot.dribbles)), '~%50–60'],
  ['Faul / takım', f1(base.perTeam('fouls')), '~10–12'],
  ['Sarı kart / takım', f1(base.perTeam('yellows')), '~2'],
  ['Kırmızı kart / maç', f1(base.per('reds')), '~0,05–0,1'],
  ['Ofsayt / takım', f1(base.perTeam('offsides')), '~1–2 (az)'],
  ['Korner / takım', f1(base.perTeam('corners')), '~5'],
  ['Penaltı / maç', f1(base.per('penalties')), '~0,25'],
];
console.log(`\n[Olay sıklıkları] (izlenen göstergeler, hedef değil) · ${base.ms.toFixed(1)} ms/maç`);
for (const [k, v, tgt] of rows) console.log(`  ${k.padEnd(30)} ${String(v).padStart(7)}   gerçek futbol: ${tgt}`);

// 3) tactic isolation (10, 16.2): finishing = cross must raise crosses
const M = Math.max(100, Math.trunc(N / 2));
const cr0 = run(M, { pair: ['A', 'B'] }), cr1 = run(M, { pair: ['A', 'B'], tacticHome: { finishing: 'cross' } });
console.log(`\n[Taktik izolasyonu] Bitiriş: Orta → Takım A orta/maç ${f1(cr0.per('0.crosses'))} → ${f1(cr1.per('0.crosses'))}`);
const th0 = cr0, th1 = run(M, { pair: ['A', 'B'], tacticHome: { finishing: 'through' } });
console.log(`[Taktik izolasyonu] Bitiriş: Ara pası → Takım A ara pası/maç ${f1(th0.per('0.throughs'))} → ${f1(th1.per('0.throughs'))}`);
const dr1 = run(M, { pair: ['A', 'B'], tacticHome: { direction: 'right' } });
console.log(`[Taktik izolasyonu] Hücum yönü: Sağ → sağ koridor atağı ${f1(cr0.per('0.rightCorridorAttacks'))} → ${f1(dr1.per('0.rightCorridorAttacks'))}, sol ${f1(cr0.per('0.leftCorridorAttacks'))} → ${f1(dr1.per('0.leftCorridorAttacks'))}`);
const ps1 = run(M, { pair: ['A', 'B'], tacticAway: { press: 'high' } });
console.log(`[Taktik izolasyonu] Rakip pres: Yoğun → Takım B pres/maç ${f1(cr0.per('1.presses'))} → ${f1(ps1.per('1.presses'))}, faul ${f1(cr0.per('1.fouls'))} → ${f1(ps1.per('1.fouls'))}`);
const hd1 = run(M, { pair: ['A', 'B'], tacticAway: { tackling: 'hard' } });
console.log(`[Taktik izolasyonu] Rakip müdahale: Sert → Takım B faul ${f1(cr0.per('1.fouls'))} → ${f1(hd1.per('1.fouls'))}, sarı ${f1(cr0.per('1.yellows'))} → ${f1(hd1.per('1.yellows'))}`);

// 4) attribute isolation (10.1): +20 aerial for team A outfielders → header goals
const boostHed = (slot, p) => (p.positions[0] === 'GK' ? p : { ...p, attrs: { ...p.attrs, hed: Math.min(99, p.attrs.hed + 20) } });
const hb = run(M, { pair: ['A', 'B'], tacticHome: { finishing: 'cross' }, tweakHome: boostHed });
console.log(`\n[Yetenek izolasyonu] Takım A hava topu +20 (orta planıyla) → kafa golü/maç ${f1(cr1.per('0.headerGoals'))} → ${f1(hb.per('0.headerGoals'))}, hava topu kazanma ${pct(cr1.tot['0.aerialsWon'] / Math.max(1, cr1.tot['0.aerials']))} → ${pct(hb.tot['0.aerialsWon'] / Math.max(1, hb.tot['0.aerials']))}`);
const boostFin = (slot, p) => (p.positions[0] === 'GK' ? p : { ...p, attrs: { ...p.attrs, fin: Math.min(99, p.attrs.fin + 20) } });
const fb = run(M, { pair: ['A', 'B'], tweakHome: boostFin });
console.log(`[Yetenek izolasyonu] Takım A bitiricilik +20 → gol/maç ${f1(cr0.per('0.goals'))} → ${f1(fb.per('0.goals'))}`);

// 5) squad strength vs result (no target ratio; just shows the spread)
const ab = run(M, { pair: ['A', 'D'] });
console.log(`\n[Sonuç dağılımı] A–D: A kazanır ${pct(ab.homeWins)}, beraberlik ${pct(ab.draws)}, D kazanır ${pct(1 - ab.homeWins - ab.draws)}`);
