// Draft XI v2: builds the first player pool from the ACTIVE NEON XI pool (the one the live Draft uses).
//
//   node scripts/build_draft_xi_pool.mjs --extract   → loads the live game in a headless browser, saves the assembled
//                                                       pool to draft-xi/data/kaynak-havuz.json (needs a local server
//                                                       on :8765: python3 -m http.server 8765)
//   node scripts/build_draft_xi_pool.mjs             → converts kaynak-havuz.json → draft-xi/data/havuz.mjs
//   node scripts/build_draft_xi_pool.mjs --check     → CI: havuz.mjs must match the converter output
//
// Conversion (first pass, to be refined): the active pool has 7 values per outfield player
// [pace, passing, shooting, dribbling, defending, heading, iq] (+ crossing for many) and 4 for keepers
// [reflex, positioning, aerial/catching, distribution]. They are mapped to the v2 engine's 14 attributes with the
// formulas below. Foot, weak foot and height are not in the source: they are estimated and marked `tahmini`.
// Players whose values come from an outside rating source (ratingSource) keep `kaynak` so they can be replaced.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'draft-xi/data/kaynak-havuz.json');
const OUT = path.join(root, 'draft-xi/data/havuz.mjs');

if (process.argv.includes('--extract')) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)('playwright');  // global install (NODE_PATH)
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:8765/index.html');
  await p.waitForFunction(() => window.NEON_XI_TOURNAMENT_PLAYER_POOL?.length, null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  // eslint-disable-next-line no-undef
  const players = await p.evaluate(() => PLAYERS.map((x) => ({
    id: x.id, name: x.name, pos: x.pos, age: x.age, nation: x.nation, club: x.club, league: x.league,
    former: (x.former || []).slice(0, 6), main: x.main || null, gk: x.gk || null, crossing: x.crossing ?? null,
    positions: (x.positionProfile || []).filter((q) => q.tier <= 1).map((q) => q.position), ratingSource: x.ratingSource || null,
  })));
  await b.close();
  fs.mkdirSync(path.dirname(SRC), { recursive: true });
  fs.writeFileSync(SRC, JSON.stringify({ extractedAt: new Date().toISOString().slice(0, 10), count: players.length, players }, null, 0) + '\n');
  console.log(`kaynak havuz: ${players.length} oyuncu → ${path.relative(root, SRC)}`);
  process.exit(0);
}

const clamp = (v) => Math.max(1, Math.min(99, Math.round(v)));
const mix = (...pairs) => pairs.reduce((s, [v, w]) => s + v * w, 0);
const WIDE = new Set(['LB', 'RB', 'LWB', 'RWB', 'LM', 'RM', 'LW', 'RW']);
const LEFT = new Set(['LB', 'LWB', 'LM', 'LW']);
// v2 position names; the source uses the same short codes (AM/LM/RM/WB may appear in positionProfile).
const V2 = new Set(['GK', 'RB', 'RWB', 'CB', 'LB', 'LWB', 'DM', 'CM', 'AM', 'RM', 'LM', 'RW', 'LW', 'ST']);
// The source mixes display names and slugs for the same league; one display name each.
const LIG = { 'premier-league': 'Premier League', laliga: 'La Liga', 'la-liga': 'La Liga', 'serie-a': 'Serie A', bundesliga: 'Bundesliga',
  'ligue-1': 'Ligue 1', 'super-lig': 'Süper Lig', 'super-lig-tr': 'Süper Lig', BRA1: 'Brasileirão', 'liga-portugal': 'Liga Portugal', eredivisie: 'Eredivisie' };
const ligAdi = (l) => LIG[l] || LIG[String(l || '').toLowerCase()] || l || '';
const BOY = { GK: 191, CB: 188, DM: 183, ST: 184, CM: 180, AM: 177, LB: 178, RB: 178, LWB: 177, RWB: 177, LM: 176, RM: 176, LW: 176, RW: 176 };

function cevir(x) {
  const positions = [...new Set([x.pos, ...(x.positions || [])].filter((q) => V2.has(q)))];
  if (!positions.length) return null;
  const ana = positions[0];
  let a, g = null;
  if (x.gk) {
    const [ref, gpos, ghd, dist] = x.gk;
    a = [20, 20, 30, 20, 25, clamp(dist - 8), clamp(dist - 6), clamp(dist), 20, clamp(dist - 14), 25, 25, 50, 72];
    g = [ref, gpos, ghd, clamp(mix([ref, 0.5], [gpos, 0.5]))];  // bire bir: refleks + pozisyon
  } else if (x.main) {
    const [pac, pas, sho, dri, def, hea, iq] = x.main;
    const cro = x.crossing ?? clamp(WIDE.has(ana) ? mix([pas, 0.6], [dri, 0.4]) : pas - 12);
    a = [
      clamp(sho),                                         // fin   Bitiricilik
      clamp(mix([sho, 0.7], [pas, 0.3])),                 // lon   Uzaktan şut
      clamp(hea),                                         // hed   Hava topu
      clamp(mix([iq, 0.5], [sho, 0.5])),                  // posn  Pozisyon alma
      clamp(dri),                                         // dri   Dribling
      clamp(mix([dri, 0.6], [pas, 0.4])),                 // ft    İlk dokunuş
      clamp(pas),                                         // sp    Kısa pas
      clamp(mix([pas, 0.7], [iq, 0.3])),                  // lp    Uzun pas
      clamp(cro),                                         // cro   Orta
      clamp(mix([iq, 0.6], [pas, 0.4])),                  // vis   Vizyon
      clamp(def),                                         // tac   Top kapma
      clamp(mix([def, 0.7], [iq, 0.3])),                  // mar   Markaj
      clamp(pac),                                         // pac   Hız
      clamp(mix([hea, 0.5], [def, 0.3], [pac, 0.2])),     // str   Güç
    ];
  } else return null;
  const hed = g ? g[2] : a[2];
  const boy = Math.round((BOY[ana] || 180) + (hed - 70) * 0.25);
  return {
    id: x.id, name: x.name, positions, foot: LEFT.has(ana) ? 'L' : 'R', weakFoot: 3, height: boy,
    nation: x.nation, club: x.club, league: ligAdi(x.league), former: x.former || [], age: x.age,
    a, g, kaynak: x.ratingSource || 'NEON XI', tahmini: ['foot', 'weakFoot', 'height'],
  };
}

const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const pool = src.players.map(cevir).filter(Boolean);
const lines = pool.map((p) => '  ' + JSON.stringify([p.id, p.name, p.positions, p.foot, p.weakFoot, p.height, p.nation, p.club, p.league, p.former, p.age, p.a, p.g, p.kaynak]));
const out = `// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: draft-xi/data/kaynak-havuz.json (aktif NEON XI havuzu, ${src.extractedAt}),
// dönüştürücü: scripts/build_draft_xi_pool.mjs. İlk geçiş: değerler formülle türetildi; ayak, zayıf ayak ve boy tahmini.
// Sırası: [id, ad, mevkiler, ayak, zayıf ayak, boy, ülke, kulüp, lig, eski kulüpler, yaş, özellikler[14], kaleci[4]|null, değer kaynağı]
export const KEYS = ['fin', 'lon', 'hed', 'posn', 'dri', 'ft', 'sp', 'lp', 'cro', 'vis', 'tac', 'mar', 'pac', 'str'];
export const GK_KEYS = ['ref', 'gpos', 'ghd', 'one'];
const RAW = [
${lines.join(',\n')}
];
export const HAVUZ = RAW.map(([id, name, positions, foot, weakFoot, height, nation, club, league, former, age, a, g, kaynak]) => {
  const attrs = Object.fromEntries(KEYS.map((k, i) => [k, a[i]]));
  if (g) GK_KEYS.forEach((k, i) => { attrs[k] = g[i]; });
  return { id, name, positions, foot, weakFoot, height, nation, club, league, former, age, attrs, kaynak, tahmini: ['foot', 'weakFoot', 'height'] };
});
export const HAVUZ_BY_ID = Object.fromEntries(HAVUZ.map((p) => [p.id, p]));
`;
if (process.argv.includes('--check')) {
  if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== out) { console.error('draft-xi/data/havuz.mjs güncel değil: node scripts/build_draft_xi_pool.mjs'); process.exit(1); }
  console.log(`Draft XI havuzu güncel ✓ (${pool.length} oyuncu)`);
} else {
  fs.writeFileSync(OUT, out);
  const say = (f) => Object.entries(pool.reduce((m, p) => ((m[f(p)] = (m[f(p)] || 0) + 1), m), {})).sort((x, y) => y[1] - x[1]);
  console.log(`havuz.mjs: ${pool.length} oyuncu (atlanan ${src.players.length - pool.length})`);
  console.log('mevki:', JSON.stringify(say((p) => p.positions[0])));
  console.log('lig:', JSON.stringify(say((p) => p.league).slice(0, 12)));
  console.log('değer kaynağı:', JSON.stringify(say((p) => p.kaynak)));
}
