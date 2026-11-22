// Draft XI — shared helpers for the screens: position fit (design doc 2.4), suitability per position (bot +
// display only; the engine never uses it, doc 16.13), chemistry preview (same rule as the engine, doc 7).
import { FORMATIONS, zonePoint } from '../engine/formations.mjs?v=2';

export const MEVKI_AD = { GK: 'Kaleci', CB: 'Stoper', LB: 'Sol bek', RB: 'Sağ bek', LWB: 'Sol kanat bek', RWB: 'Sağ kanat bek', DM: 'Ön libero',
  CM: 'Merkez orta saha', AM: '10 numara', LM: 'Sol orta saha', RM: 'Sağ orta saha', LW: 'Sol kanat', RW: 'Sağ kanat', ST: 'Forvet' };
export const MEVKI_GRUP = { GK: 'KL', CB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF', DM: 'OS', CM: 'OS', AM: 'OS', LM: 'OS', RM: 'OS', LW: 'FOR', RW: 'FOR', ST: 'FOR' };

// default extra positions (doc 2.4): what a player of this main position can also play
const EK = { LB: ['LWB'], RB: ['RWB'], LWB: ['LB'], RWB: ['RB'], LW: ['LM'], RW: ['RM'], LM: ['LW'], RM: ['RW'], DM: ['CM'], AM: ['CM'] };
/** Can player p take a slot whose position is `mevki`? */
export const uygun = (p, mevki) => p.positions.includes(mevki) || (EK[p.positions[0]] || []).includes(mevki);

export const ONEMLI = {
  GK: [['ref', 'Refleks'], ['gpos', 'Pozisyon'], ['ghd', 'Hava'], ['one', 'Bire bir']],
  CB: [['tac', 'Top kapma'], ['mar', 'Markaj'], ['hed', 'Hava topu'], ['str', 'Güç']],
  LB: [['pac', 'Hız'], ['tac', 'Top kapma'], ['cro', 'Orta'], ['sp', 'Pas']],
  DM: [['tac', 'Top kapma'], ['sp', 'Pas'], ['vis', 'Vizyon'], ['mar', 'Markaj']],
  CM: [['sp', 'Pas'], ['vis', 'Vizyon'], ['ft', 'İlk dokunuş'], ['lp', 'Uzun pas']],
  AM: [['vis', 'Vizyon'], ['dri', 'Dribling'], ['ft', 'İlk dokunuş'], ['lon', 'Uzaktan şut']],
  LW: [['pac', 'Hız'], ['dri', 'Dribling'], ['cro', 'Orta'], ['fin', 'Bitiricilik']],
  ST: [['fin', 'Bitiricilik'], ['posn', 'Pozisyon alma'], ['hed', 'Kafa'], ['pac', 'Hız']],
};
for (const k of ['RB', 'LWB', 'RWB']) ONEMLI[k] = ONEMLI.LB;
for (const k of ['RW', 'LM', 'RM']) ONEMLI[k] = ONEMLI.LW;
/** Suitability of p for a position (average of that position's key attributes). */
export const guc = (p, mevki = p.positions[0]) => { const w = ONEMLI[mevki] || ONEMLI.CM; return Math.round(w.reduce((n, [k]) => n + (p.attrs[k] || 0), 0) / w.length); };

/** Chemistry preview per slot for a (partly) filled lineup {slot: player}; same rule as the engine. */
export function kimya(formation, players) {
  const tpl = FORMATIONS[formation];
  const filled = tpl.map(([slot, , , , zDef]) => ({ slot, p: players[slot], pt: zonePoint(zDef) })).filter((x) => x.p);
  const out = {};
  for (const a of filled) {
    const near = filled.filter((b) => b !== a).map((b) => ({ b, d: Math.hypot(a.pt.x - b.pt.x, a.pt.y - b.pt.y) })).sort((x, y) => x.d - y.d).slice(0, 4);
    const links = near.map(({ b }) => {
      const x = a.p, y = b.p; let s = 0;
      if (x.nation === y.nation) s += 3;
      if (x.club === y.club) s += 3;
      if (x.league === y.league) s += 2;
      const xf = x.former || [], yf = y.former || [];
      if (xf.some((c) => yf.includes(c)) || xf.includes(y.club) || yf.includes(x.club)) s += 2;
      return Math.min(10, s);
    }).sort((u, v) => v - u).slice(0, 3);
    out[a.slot] = Math.min(10, links.reduce((t, v) => t + v, 0));
  }
  return out;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
