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

// attribute labels (full and 3-letter) — draft card, pool rows and the tactics screen
export const ATTR_AD = { fin: 'Bitiricilik', lon: 'Uzaktan şut', hed: 'Kafa', posn: 'Pozisyon alma', dri: 'Çalım', ft: 'İlk dokunuş', sp: 'Kısa pas', lp: 'Uzun pas',
  cro: 'Orta', vis: 'Vizyon', tac: 'Top kapma', mar: 'Markaj', pac: 'Hız', str: 'Güç', ref: 'Refleks', gpos: 'Kaleci pozisyonu', ghd: 'Kaleci hava', one: 'Bire bir' };
export const ATTR_KISA = { fin: 'BİT', lon: 'UZK', hed: 'KAF', posn: 'POZ', dri: 'ÇLM', ft: 'İLK', sp: 'KPS', lp: 'UPS', cro: 'ORT', vis: 'VİZ', tac: 'KAP', mar: 'MRK', pac: 'HIZ', str: 'GÜÇ',
  ref: 'REF', gpos: 'KPO', ghd: 'KHV', one: 'BİR' };
/** the four attributes that matter most for a main position (pool rows) */
export const ANA_OZELLIK = { GK: ['ref', 'gpos', 'one', 'ghd'], CB: ['tac', 'mar', 'hed', 'str'], LB: ['pac', 'tac', 'cro', 'mar'], RB: ['pac', 'tac', 'cro', 'mar'],
  LWB: ['pac', 'cro', 'tac', 'dri'], RWB: ['pac', 'cro', 'tac', 'dri'], DM: ['tac', 'mar', 'sp', 'str'], CM: ['sp', 'vis', 'dri', 'tac'], AM: ['vis', 'sp', 'dri', 'lon'],
  LM: ['pac', 'cro', 'dri', 'sp'], RM: ['pac', 'cro', 'dri', 'sp'], LW: ['pac', 'dri', 'cro', 'fin'], RW: ['pac', 'dri', 'cro', 'fin'], ST: ['fin', 'posn', 'pac', 'hed'] };
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ── tactics (design doc 16.2): options, what each does in the engine (facts only, no advice), one-tap plans ──
export const TAKTIK = [
  { grup: 'TOPLA', k: 'direction', ad: 'Hücum yönü', o: [
    ['balanced', 'Dengeli', 'Pasların yönü oyunun akışına bırakılır.'],
    ['left', 'Sol', 'Sol koridora pas ağırlığı ×2.'], ['centre', 'Merkez', 'Merkeze pas ağırlığı ×2.'],
    ['right', 'Sağ', 'Sağ koridora pas ağırlığı ×2.'], ['wings', 'Kanatlar', 'İki kanada da pas ağırlığı ×2.']] },
  { grup: 'TOPLA', k: 'passing', ad: 'Pas tarzı', o: [
    ['mixed', 'Karışık', 'Kısa ve uzun pas eşit ağırlıkta.'], ['short', 'Kısa', 'Kısa pas ağırlığı ×2 (son üçte birde ×1,2); kısa paslar daha isabetli.'],
    ['long', 'Uzun', 'Uzun pas ağırlığı ×2; top çoğu zaman havadan forvete gider, uzun pasın isabeti kısa pastan düşük.']] },
  { grup: 'TOPLA', k: 'tempo', ad: 'Tempo', o: [
    ['balanced', 'Dengeli', 'Aksiyon süreleri normal.'],
    ['patient', 'Sabırlı', 'Aksiyonlar %25 yavaş; ileri pas eğilimi yarıya iner.'],
    ['fast', 'Hızlı', 'Aksiyonlar %20 hızlı; ara pası ve top sürme ×2 (başka bir artışla birlikteyse ikincisi yarım sayılır, en fazla ×3); forvetler önde bekler.']] },
  { grup: 'TOPLA', k: 'finishing', ad: 'Bitiriş', o: [
    ['mixed', 'Karışık', 'Bitiriş türleri eşit ağırlıkta.'], ['cross', 'Orta', 'Kanattan orta ağırlığı ×2.'],
    ['through', 'Ara pası', 'Ara pası ağırlığı ×2.'], ['long', 'Uzaktan', 'Ceza sahası dışından şut ağırlığı ×2.'],
    ['dribble', 'Çalım', 'Çalım ağırlığı ×2.']] },
  { grup: 'TOPLA', k: 'creativity', ad: 'Yaratıcılık', o: [
    ['balanced', 'Dengeli', 'Pas seçimi normal.'],
    ['low', 'Disiplinli', 'Ara pası ve çalım ×0,6, uzaktan şut ×0,7, kısa pas ×1,25; daha güvenli pas açısı; top kaybında şekil korunur.'],
    ['high', 'Serbest', 'Ara pası ve çalım ×1,6, uzaktan şut ×1,4; daha dar pas açıları; top kaybında takım açık yakalanır.']] },
  { grup: 'GEÇİŞ', k: 'onWin', ad: 'Top kazanınca', o: [
    ['settled', 'Yerleşik', 'Top kazanılınca takım yerleşip oyunu kurar.'],
    ['counter', 'Kontra', 'Top kazanılınca ilk 2 aksiyon kontra: ara pası, uzun pas ve top sürme ×1,5.']] },
  { grup: 'TOPSUZ', k: 'line', ad: 'Hat yüksekliği', o: [
    ['mid', 'Orta', 'Savunma hattı normal yükseklikte.'],
    ['low', 'Alçak', 'Savunma 10 m geride; ofsayt ve arkaya koşu mücadelesinde −15. Rakip yarı sahada destek az: paslar zorlaşır; ceza sahası önü boş kalır: rakibin uzaktan şutları kolaylaşır.'],
    ['high', 'Yüksek', 'Takım 17,5 m ileride; ofsayt ve arkaya koşu mücadelesinde +15; ofsayt tuzağı dener. Rakip yarı sahada takım derli toplu: paslar kolaylaşır.']] },
  { grup: 'TOPSUZ', k: 'press', ad: 'Pres', o: [
    ['mid', 'Orta', 'Pres tetiklenince %40 basar; pres mücadelesi normal.'],
    ['low', 'Az', 'Pres tetiklenince %15 basar; pres mücadelesinde −15.'],
    ['high', 'Yoğun', 'Pres tetiklenince %75 basar, ikinci presçi gelir, kaleciye de basılır; pres mücadelesinde +15.']] },
  { grup: 'TOPSUZ', k: 'closed', ad: 'Kapatılan alan', o: [
    ['balanced', 'Dengeli', 'Kanat ve merkez eşit korunur.'],
    ['wings', 'Kanatlar', 'Kanattaki mücadelelerde +20, merkezdekilerde −10.'],
    ['centre', 'Merkez', 'Merkezdeki mücadelelerde +10, kanattakilerde −20.']] },
  { grup: 'TOPSUZ', k: 'tackling', ad: 'Müdahale', o: [
    ['normal', 'Normal', 'Müdahale ve faul oranı normal.'],
    ['careful', 'Temkinli', 'Top kapma mücadelesinde −10; faul oranı ×0,55.'],
    ['hard', 'Sert', 'Top kapma mücadelesinde +15; faul oranı ×2.']] },
];
export const VARSAYILAN = Object.fromEntries(TAKTIK.map((s) => [s.k, s.o[0][0]]));
export const PLANLAR = [
  ['dengeli', 'Dengeli', {}],
  ['tikitaka', 'Tiki-taka', { passing: 'short', tempo: 'patient', line: 'high', press: 'high', finishing: 'through', direction: 'centre', creativity: 'high' }],
  ['kontra', 'Kontra atak', { line: 'low', press: 'low', onWin: 'counter', passing: 'long', tempo: 'fast', finishing: 'through' }],
  ['kanat', 'Kanat oyunu', { direction: 'wings', finishing: 'cross' }],
  ['pres', 'Yüksek pres', { press: 'high', line: 'high', tackling: 'hard', tempo: 'fast' }],
  ['otobus', 'Otobüs çek', { line: 'low', press: 'low', closed: 'centre', creativity: 'low', onWin: 'counter', tempo: 'patient' }],
];
/** Full tactic for a plan id (every setting filled). */
export const planTaktik = (id) => ({ ...VARSAYILAN, ...(PLANLAR.find((x) => x[0] === id) || PLANLAR[0])[2] });
/** Plan id whose settings equal tactic t, or null (custom). */
export const hangiPlan = (t) => (PLANLAR.find(([id]) => { const p = planTaktik(id); return TAKTIK.every((s) => p[s.k] === t[s.k]); }) || [null])[0];
