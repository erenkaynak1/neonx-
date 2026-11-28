// Draft XI — tournament logic (no DOM): a knockout bracket of 4 or 8 drafted teams. Team 0 is the player; the other
// teams are bots. The player's own match is watched on the match screen; every other match is played here by the same
// deterministic engine. A draw goes to penalties, decided by the takers' finishing and composure against the keeper.
import { HAVUZ_BY_ID } from '../data/havuz-fm.mjs?v=1';
import { simulateMatch } from '../engine/match.mjs?v=12';
import { planTaktik } from './ortak.mjs?v=4';

export const TUR_ADI = { 8: 'ÇEYREK FİNAL', 4: 'YARI FİNAL', 2: 'FİNAL' };
// fictional bot club names (no real clubs)
export const BOT_ADLARI = ['Neon Kartallar', 'Volt United', 'Gece Kurtları', 'Siber Aslanlar', 'Plazma FK', 'Lazer Spor', 'Kuantum SK', 'Turbo Atletik', 'Pulsar FC', 'Nova Gençlik'];

/** engine squad from a drafted team ({name, formation, slots: slot → player id}) */
export const kadro = (t) => ({ name: t.name, formation: t.formation, players: Object.fromEntries(Object.entries(t.slots).map(([s, id]) => [s, HAVUZ_BY_ID[id]])) });
const taktik = (t) => t.tactic || planTaktik(t.plan || 'dengeli');

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** a new bracket: the player meets a random bot first; seeds fixed so a reload replays the same tournament */
export function kur(teams, seed) {
  const r = rng(seed), idx = teams.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const tur0 = [];
  for (let i = 0; i < idx.length; i += 2) tur0.push({ a: idx[i], b: idx[i + 1], seed: Math.floor(r() * 90000) + 1 + i });
  return { teams, seed, turlar: [tur0], tur: 0, sampiyon: null };
}

/** penalties: five each, then sudden death. Taker: finishing, long shot and composure (posn); keeper: reflexes, one-on-one */
export function penaltilar(home, away, seed) {
  const r = rng(seed ^ 0x5eed);
  const takers = (sq) => Object.values(sq.players).filter((p) => !p.positions.includes('GK')).sort((x, y) => (y.attrs.fin + y.attrs.posn) - (x.attrs.fin + x.attrs.posn));
  const gk = (sq) => Object.values(sq.players).find((p) => p.positions.includes('GK')) || { attrs: { ref: 60, one: 60 } };
  const T = [takers(home), takers(away)], G = [gk(away), gk(home)];
  const sira = [[], []], g = [0, 0];
  const at = (s, k) => {
    const p = T[s][k % T[s].length], kl = G[s];
    const pr = Math.min(0.92, Math.max(0.55, 0.76 + (p.attrs.fin + p.attrs.posn - 150) * 0.002 - ((kl.attrs.ref || 60) + (kl.attrs.one || 60) - 150) * 0.002));
    const ok = r() < pr; sira[s].push({ id: p.id, ok }); if (ok) g[s]++;
  };
  for (let k = 0; k < 5; k++) {
    for (const s of [0, 1]) {
      at(s, k);
      const kalan = [5 - sira[0].length, 5 - sira[1].length];
      if (g[0] + kalan[0] < g[1] || g[1] + kalan[1] < g[0]) return { skor: g, sira };   // decided early
    }
  }
  for (let k = 5; g[0] === g[1] && k < 40; k++) { at(0, k); at(1, k); }
  return { skor: g, sira };
}

/** plays one bracket match with the engine (bot vs bot, or the player's match from a known seed and tactics) */
export function oyna(st, m) {
  const A = st.teams[m.a], B = st.teams[m.b];
  const home = kadro(A), away = kadro(B);
  const r = simulateMatch({ home, away, seed: m.seed, tacticHome: taktik(A), tacticAway: taktik(B), log: false });
  sonucYaz(st, m, r.score);
  return m;
}

/** records a score (draws go to penalties) */
export function sonucYaz(st, m, score) {
  m.skor = [score[0], score[1]];
  if (score[0] === score[1]) m.pen = penaltilar(kadro(st.teams[m.a]), kadro(st.teams[m.b]), m.seed);
  m.kazanan = kazanan(m);
  return m;
}
export const kazanan = (m) => (!m.skor ? null : m.skor[0] !== m.skor[1] ? (m.skor[0] > m.skor[1] ? m.a : m.b) : (m.pen.skor[0] > m.pen.skor[1] ? m.a : m.b));

/** the player's match in the current round (or null once knocked out) */
export const benimMac = (st) => st.turlar[st.tur]?.find((m) => m.a === 0 || m.b === 0) || null;
export const elendi = (st) => st.turlar.some((tur) => tur.some((m) => m.kazanan != null && (m.a === 0 || m.b === 0) && m.kazanan !== 0));

/** when every match of the round has a result: next round (winners of 1-2, 3-4 …) or the champion */
export function ilerle(st) {
  const tur = st.turlar[st.tur];
  if (tur.some((m) => m.kazanan == null)) return false;
  if (tur.length === 1) { st.sampiyon = tur[0].kazanan; return true; }
  const r = rng(st.seed + st.tur * 7919), next = [];
  for (let i = 0; i < tur.length; i += 2) next.push({ a: tur[i].kazanan, b: tur[i + 1].kazanan, seed: Math.floor(r() * 90000) + 1 + i });
  st.turlar.push(next); st.tur++;
  return true;
}
