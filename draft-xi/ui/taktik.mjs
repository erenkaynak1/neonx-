// Draft XI — tactics screen between the draft and the match (design doc 9.3: formation, settings and numbers only,
// no advice). One-tap plans fill every setting; each setting is fine-tuned with chips. The selected option shows the
// relevant attributes of our and the opponent's players in the match-up it sets up; the pitch draws what the focused setting changes. Bots keep the plan of their draft style.
import { HAVUZ_BY_ID } from '../data/havuz-fm.mjs?v=1';
import { FORMATIONS, zonePoint, PITCH_W, PITCH_L, COL_W } from '../engine/formations.mjs?v=2';
import { TAKTIK, PLANLAR, planTaktik, hangiPlan, esc } from './ortak.mjs?v=3';

const $ = (id) => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const ATTR = { pac: 'Hız', dri: 'Çalım', cro: 'Orta', tac: 'Top kapma', mar: 'Markaj', str: 'Güç', sp: 'Kısa pas', lp: 'Uzun pas',
  vis: 'Vizyon', ft: 'İlk dokunuş', hed: 'Kafa', fin: 'Bitiricilik', posn: 'Pozisyon alma', lon: 'Uzaktan şut', ref: 'Refleks', ghd: 'Kaleci hava' };

// ── data from the draft ──
let D = null;
try { D = JSON.parse(sessionStorage.getItem('draftxi-mac') || 'null'); } catch { D = null; }
const ok = D && [D.home, D.away].every((t) => t && FORMATIONS[t.formation] && Object.values(t.slots || {}).length === 11 && Object.values(t.slots).every((id) => HAVUZ_BY_ID[id]));
if (!ok) { $('yok').hidden = false; $('ekran').hidden = true; throw new Error('no draft data'); }

/** Lineup of a team: slot, position, player, column of the attacking (zPoss) and defensive (zDef) shape. */
const dizilis = (t) => FORMATIONS[t.formation].map(([slot, label, mevki, zPoss, zDef]) => ({
  slot, label, mevki, p: HAVUZ_BY_ID[t.slots[slot]], pos: zonePoint(zPoss), def: zonePoint(zDef), col: zPoss.charCodeAt(0) - 65, colD: zDef.charCodeAt(0) - 65,
}));
const TEAMS = [D.home, D.away].map((t) => ({ ...t, xi: dizilis(t) }));

// ── groups used by the match-ups ──
const OUT = (xi) => xi.filter((x) => x.mevki !== 'GK');
const DEFN = ['CB', 'LB', 'RB', 'LWB', 'RWB'];
const G = {
  gk: (xi) => xi.filter((x) => x.mevki === 'GK'),
  cb: (xi) => xi.filter((x) => x.mevki === 'CB'),
  def: (xi) => xi.filter((x) => DEFN.includes(x.mevki)),
  mid: (xi) => xi.filter((x) => ['DM', 'CM', 'AM', 'LM', 'RM'].includes(x.mevki)),
  front: (xi) => OUT(xi).slice().sort((a, b) => b.pos.y - a.pos.y).slice(0, 3),
  box: (xi) => xi.filter((x) => ['ST', 'AM'].includes(x.mevki)),
  att: (xi) => xi.filter((x) => ['ST', 'LW', 'RW', 'AM', 'LM', 'RM'].includes(x.mevki)),
  // attackers in a corridor (columns of the attacking shape), no centre-backs
  koridor: (xi, cols) => OUT(xi).filter((x) => x.mevki !== 'CB' && cols.includes(x.col)),
  // defenders facing a corridor: their own columns mirrored, deep part of the defensive shape
  karsi: (xi, cols) => OUT(xi).filter((x) => cols.map((c) => 4 - c).includes(x.colD) && x.def.y < 3 * 175),
  centreAtt: (xi) => G.att(xi).filter((x) => x.col >= 1 && x.col <= 3),
  wideAtt: (xi) => G.att(xi).filter((x) => x.col === 0 || x.col === 4),
  wideDef: (xi) => G.def(xi).filter((x) => x.mevki !== 'CB'),
  holders: (xi) => xi.filter((x) => ['CB', 'DM'].includes(x.mevki)),
  topLon: (xi) => OUT(xi).slice().sort((a, b) => b.p.attrs.lon - a.p.attrs.lon).slice(0, 3),
};
// match-up per option: [label, our players(xi), attribute] lists for us and the opponent; null = no specific match-up
const L = [0], R = [4], MID = [1, 2, 3];
const ESLES = {
  direction: {
    left: (b, r) => ({ biz: [['Sol koridor', G.koridor(b, L), ['pac', 'dri', 'cro']]], rakip: [['Karşısı (sağları)', G.karsi(r, L), ['pac', 'tac', 'mar']]] }),
    right: (b, r) => ({ biz: [['Sağ koridor', G.koridor(b, R), ['pac', 'dri', 'cro']]], rakip: [['Karşısı (solları)', G.karsi(r, R), ['pac', 'tac', 'mar']]] }),
    centre: (b, r) => ({ biz: [['Merkez', G.koridor(b, MID), ['vis', 'dri', 'ft']]], rakip: [['Merkezleri', G.karsi(r, MID), ['tac', 'mar', 'str']]] }),
    wings: (b, r) => ({ biz: [['İki kanat', G.koridor(b, [0, 4]), ['pac', 'dri', 'cro']]], rakip: [['Kanatları', G.karsi(r, [0, 4]), ['pac', 'tac', 'mar']]] }),
  },
  passing: {
    short: (b, r) => ({ biz: [['Oyuncular', OUT(b), ['sp', 'ft']]], rakip: [['Önde basanlar', G.front(r).concat(G.mid(r)), ['tac', 'pac']]] }),
    long: (b, r) => ({ biz: [['Pası atan', G.def(b).concat(G.mid(b)), ['lp']], ['Topu alan', G.box(b).length ? G.box(b) : G.front(b), ['hed', 'str']]], rakip: [['Stoperler', G.cb(r), ['hed', 'str']]] }),
  },
  tempo: {
    fast: (b, r) => ({ biz: [['Hücumcular', G.att(b), ['pac']], ['Orta saha', G.mid(b), ['vis']]], rakip: [['Defans', G.def(r), ['pac']]] }),
    patient: (b, r) => ({ biz: [['Orta saha', G.mid(b), ['sp', 'ft']]], rakip: [['Orta saha', G.mid(r), ['tac', 'mar']]] }),
  },
  finishing: {
    cross: (b, r) => ({ biz: [['Ortacılar', G.wideAtt(b).concat(G.wideDef(b)), ['cro']], ['Ceza sahası', G.box(b), ['hed', 'str']]], rakip: [['Stoperler', G.cb(r), ['hed', 'str']], ['Kaleci', G.gk(r), ['ghd']]] }),
    through: (b, r) => ({ biz: [['Pası atan', G.mid(b), ['vis', 'sp']], ['Koşan', G.box(b).length ? G.box(b) : G.front(b), ['pac', 'posn']]], rakip: [['Stoperler', G.cb(r), ['pac', 'mar']]] }),
    long: (b, r) => ({ biz: [['En iyi 3 şutçu', G.topLon(b), ['lon']]], rakip: [['Kaleci', G.gk(r), ['ref']], ['Orta saha', G.mid(r), ['mar']]] }),
    dribble: (b, r) => ({ biz: [['Hücumcular', G.att(b), ['dri', 'pac']]], rakip: [['Defans', G.def(r), ['tac', 'pac']]] }),
  },
  creativity: {
    high: (b, r) => ({ biz: [['Oyuncular', OUT(b), ['vis', 'ft']]], rakip: [['Pas arası', G.def(r).concat(G.mid(r)), ['tac', 'vis']]] }),
    low: (b, r) => ({ biz: [['Oyuncular', OUT(b), ['sp', 'ft']]], rakip: [['Önde basanlar', G.front(r).concat(G.mid(r)), ['tac', 'pac']]] }),
  },
  onWin: {
    counter: (b, r) => ({ biz: [['Önde koşan', G.front(b), ['pac']], ['Pası atan', G.mid(b), ['lp', 'vis']]], rakip: [['Defans', G.def(r), ['pac']]] }),
  },
  line: {
    high: (b, r) => ({ biz: [['Stoperler', G.cb(b), ['pac']]], rakip: [['Önde koşan', G.front(r), ['pac', 'posn']]] }),
    low: (b, r) => ({ biz: [['Stoperler', G.cb(b), ['hed', 'mar']]], rakip: [['Ceza sahası', G.box(r).length ? G.box(r) : G.front(r), ['hed', 'str']]] }),
  },
  press: {
    high: (b, r) => ({ biz: [['Önde basan', G.front(b), ['pac', 'tac', 'str']]], rakip: [['Oyun kuran', G.def(r).concat(G.gk(r)), ['sp', 'ft']]] }),
    low: (b, r) => ({ biz: [['Defans', G.def(b), ['mar']]], rakip: [['Orta saha', G.mid(r), ['sp', 'vis']]] }),
  },
  closed: {
    wings: (b, r) => ({ biz: [['Bekler', G.wideDef(b), ['tac', 'pac']]], rakip: [['Kanatçıları', G.wideAtt(r), ['dri', 'cro']]] }),
    centre: (b, r) => ({ biz: [['Stoper + ön libero', G.holders(b), ['tac', 'mar']]], rakip: [['Merkez hücumcuları', G.centreAtt(r), ['vis', 'fin']]] }),
  },
  tackling: {
    hard: (b, r) => ({ biz: [['Defans', G.def(b), ['tac', 'str']]], rakip: [['Hücumcuları', G.att(r), ['dri']]] }),
    careful: (b, r) => ({ biz: [['Defans', G.def(b), ['tac', 'mar']]], rakip: [['Hücumcuları', G.att(r), ['dri']]] }),
  },
};
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
/** Numbers of a match-up: per group the players and the average of each attribute; side average; gap. */
function sayilar(k, v, t) {
  const f = ESLES[k]?.[v]; if (!f) return null;
  const m = f(TEAMS[t].xi, TEAMS[1 - t].xi);
  const side = (list) => list.map(([ad, xs, keys]) => ({ ad, xs, keys: keys.map((a) => [a, xs.length ? Math.round(mean(xs.map((x) => x.p.attrs[a]))) : null]) }));
  const biz = side(m.biz), rakip = side(m.rakip);
  return { biz, rakip };
}

// ── state ──
const order = [0, 1].filter((t) => !TEAMS[t].bot);
let step = 0, focus = 'direction', view = 'plan';
const tac = TEAMS.map((tm) => (tm.bot ? planTaktik(tm.plan || 'dengeli') : planTaktik('dengeli')));

function render() {
  const t = order[step], tm = TEAMS[t], T = tac[t], plan = hangiPlan(T);
  document.body.dataset.taraf = t ? 'b' : 'a';
  $('planEkran').hidden = view !== 'plan'; $('ince').hidden = view !== 'ince';
  $('inceBtn').textContent = view === 'plan' ? 'İNCE AYAR' : '← HAZIR PLANLAR';
  $('hazir').textContent = order.length > 1 && step === 0 ? 'HAZIR · SIRA OYUNCU 2' : 'MAÇA ÇIK';
  if (view === 'plan') { planRender(); return; }
  $('baslik').innerHTML = `TAKTİK · <span>${esc(tm.name)}</span>`;
  $('alt').textContent = `${tm.formation} · rakip: ${TEAMS[1 - t].name} (${TEAMS[1 - t].formation})`;
  $('planlar').innerHTML = PLANLAR.map(([id, ad, s]) => {
    const ozet = TAKTIK.filter((x) => s[x.k]).slice(0, 3).map((x) => x.o.find((o) => o[0] === s[x.k])[1]).join(' · ') || 'Her ayar orta';
    return `<button type="button" class="plan" data-plan="${id}" aria-pressed="${plan === id}"><b>${ad}</b><small>${esc(ozet)}</small></button>`;
  }).join('') + `<span class="plan ozel" aria-hidden="${plan !== null}"${plan === null ? '' : ' hidden'}><b>Özel</b><small>Kendi ayarların</small></span>`;
  let grup = '';
  $('ayarlar').innerHTML = TAKTIK.map((s) => {
    const head = s.grup !== grup ? `${grup ? '</div>' : ''}<h2>${s.grup === 'TOPLA' ? 'TOP BİZDEYKEN' : s.grup === 'GEÇİŞ' ? 'GEÇİŞ' : 'TOP RAKİPTEYKEN'}</h2><div class="kart">` : '';
    grup = s.grup;
    const v = T[s.k], sec = s.o.find((o) => o[0] === v), n = sayilar(s.k, v, t);
    const chips = s.o.map(([id, ad]) => `<button type="button" class="cip" data-k="${s.k}" data-v="${id}" aria-pressed="${id === v}">${ad}</button>`).join('');
    const detay = n ? `<div class="sayi"><div class="yan biz"><em>BİZ</em>${n.biz.map(grupHtml).join('')}</div><div class="yan rakip"><em>RAKİP</em>${n.rakip.map(grupHtml).join('')}</div></div>` : '';
    return `${head}<section class="ayar${focus === s.k ? ' odak' : ''}" data-ayar="${s.k}"><div class="ayar-ust"><b>${s.ad}</b></div>
      <div class="cipler" role="group" aria-label="${s.ad}">${chips}</div><p class="etki">${esc(sec[2])}</p>${detay}</section>`;
  }).join('') + '</div>';
  ciz();
}
const grupHtml = (g) => `<div class="g"><small>${esc(g.ad)}${g.xs.length ? ` · ${g.xs.map((x) => esc(x.p.name.split(' ').slice(-1)[0])).join(', ')}` : ''}</small>
  <div class="vals">${g.keys.map(([a, n]) => `<span>${ATTR[a]} <b>${n ?? '—'}</b></span>`).join('')}</div></div>`;

// ── pitch: our shape (attacking or defensive depending on the focused setting) and the focused setting's effect ──
function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e; }
const Y = (y) => PITCH_L - y;
function ciz() {
  const t = order[step], T = tac[t], xi = TEAMS[t].xi, svg = $('saha');
  svg.innerHTML = '';
  const s = TAKTIK.find((x) => x.k === focus), topsuz = s.grup === 'TOPSUZ';
  const line = 'rgba(232,255,228,.25)';
  for (let i = 0; i < 6; i++) el('rect', { x: 0, y: i * 175, width: PITCH_W, height: 175, fill: i % 2 ? '#0b2414' : '#0d2a17' }, svg);
  el('rect', { x: 4, y: 4, width: PITCH_W - 8, height: PITCH_L - 8, fill: 'none', stroke: line, 'stroke-width': 3 }, svg);
  el('line', { x1: 0, y1: PITCH_L / 2, x2: PITCH_W, y2: PITCH_L / 2, stroke: line, 'stroke-width': 3 }, svg);
  el('circle', { cx: PITCH_W / 2, cy: PITCH_L / 2, r: 91, fill: 'none', stroke: line, 'stroke-width': 3 }, svg);
  for (const yy of [0, PITCH_L]) {
    const top = yy === 0;
    el('rect', { x: 138, y: top ? 4 : PITCH_L - 169, width: 404, height: 165, fill: 'none', stroke: line, 'stroke-width': 3 }, svg);
    el('rect', { x: 248, y: top ? 4 : PITCH_L - 59, width: 184, height: 55, fill: 'none', stroke: line, 'stroke-width': 3 }, svg);
  }
  const fx = el('g', {}, svg), pl = el('g', {}, svg);
  const shift = topsuz ? (T.line === 'low' ? -175 : T.line === 'high' ? 175 : 0) : 0;
  const pts = xi.map((x) => { const p = topsuz ? x.def : x.pos; return { x, X: p.x, Yv: Y(x.mevki === 'GK' ? p.y : Math.max(60, p.y + shift)) }; });
  const A = 'var(--tk)', ylw = '#ffd34d';
  const arrow = (x1, y1, x2, y2, c = ylw, w = 8, dash) => {
    el('line', { x1, y1, x2, y2, stroke: c, 'stroke-width': w, 'stroke-linecap': 'round', ...(dash ? { 'stroke-dasharray': dash } : {}), opacity: 0.85 }, fx);
    const a = Math.atan2(y2 - y1, x2 - x1), h = 28;
    el('path', { d: `M${x2},${y2} L${x2 - h * Math.cos(a - 0.5)},${y2 - h * Math.sin(a - 0.5)} L${x2 - h * Math.cos(a + 0.5)},${y2 - h * Math.sin(a + 0.5)} Z`, fill: c, opacity: 0.9 }, fx);
  };
  const v = T[focus];
  if (focus === 'direction') {
    const lanes = { left: [0], right: [4], centre: [1, 2, 3], wings: [0, 4], balanced: [] }[v];
    for (const c of lanes) el('rect', { x: c * COL_W, y: 0, width: COL_W, height: PITCH_L / 2, fill: ylw, opacity: 0.12 }, fx);
    const tgt = { left: [[340, 700, 90, 260]], right: [[340, 700, 590, 260]], centre: [[340, 760, 340, 220]], wings: [[300, 700, 90, 260], [380, 700, 590, 260]], balanced: [[340, 760, 340, 300]] }[v];
    tgt.forEach(([a, b, c, d]) => arrow(a, b, c, d, ylw, 8, v === 'balanced' ? '18 14' : null));
  } else if (focus === 'passing' || focus === 'creativity') {
    const near = (p, n) => pts.filter((q) => q !== p).sort((a, b) => Math.hypot(a.X - p.X, a.Yv - p.Yv) - Math.hypot(b.X - p.X, b.Yv - p.Yv)).slice(0, n);
    const longP = focus === 'passing' && v === 'long', shortP = focus === 'passing' ? v === 'short' : v === 'low';
    if (longP) { const fr = pts.slice().sort((a, b) => a.Yv - b.Yv).slice(0, 2); pts.filter((p) => DEFN.includes(p.x.mevki)).slice(0, 3).forEach((p, i) => arrow(p.X, p.Yv, fr[i % 2].X, fr[i % 2].Yv + 30, ylw, 6)); }
    else if (focus === 'creativity' && v === 'high') { const fr = pts.slice().sort((a, b) => a.Yv - b.Yv); pts.filter((p) => G.mid([p.x]).length).forEach((p, i) => arrow(p.X, p.Yv, fr[i % 3].X + (i % 2 ? 40 : -40), fr[i % 3].Yv - 40, ylw, 5, '14 10')); }
    else { const seen = new Set(); pts.filter((p) => p.x.mevki !== 'GK').forEach((p) => near(p, shortP ? 3 : 2).forEach((q) => { const key = [p.x.slot, q.x.slot].sort().join(); if (seen.has(key)) return; seen.add(key); el('line', { x1: p.X, y1: p.Yv, x2: q.X, y2: q.Yv, stroke: ylw, 'stroke-width': shortP ? 5 : 3, opacity: shortP ? 0.7 : 0.35 }, fx); })); }
  } else if (focus === 'tempo') {
    const n = v === 'fast' ? 3 : v === 'patient' ? 1 : 2;
    for (let i = 0; i < n; i++) arrow(200 + i * 140, 760, 200 + i * 140, v === 'patient' ? 560 : 360 - i * 30, ylw, 7, v === 'patient' ? '12 12' : null);
  } else if (focus === 'finishing') {
    const st = pts.slice().sort((a, b) => a.Yv - b.Yv)[0];
    if (v === 'cross') { arrow(70, 260, 300, 110, ylw, 6); arrow(610, 260, 380, 110, ylw, 6); }
    else if (v === 'through') { arrow(340, 560, 340, 140, ylw, 7); el('rect', { x: 240, y: 200, width: 200, height: 60, fill: ylw, opacity: 0.12 }, fx); }
    else if (v === 'long') { arrow(st.X, 260, 330, 20, ylw, 6); arrow(200, 280, 300, 20, ylw, 6); el('rect', { x: 138, y: 4, width: 404, height: 165, fill: ylw, opacity: 0.08 }, fx); }
    else if (v === 'dribble') { el('path', { d: `M${st.X - 90},430 l50,-40 l-50,-40 l50,-40 l-50,-40 l50,-40`, fill: 'none', stroke: ylw, 'stroke-width': 7, 'stroke-linejoin': 'round', opacity: 0.85 }, fx); }
    else ['cross', 'through', 'long'].forEach((_, i) => arrow(160 + i * 180, 360, 250 + i * 90, 120, ylw, 4, '12 10'));
  } else if (focus === 'onWin') {
    if (v === 'counter') { arrow(340, 900, 340, 200, ylw, 9); arrow(200, 780, 120, 320, ylw, 6, '14 10'); arrow(480, 780, 560, 320, ylw, 6, '14 10'); }
    else { el('path', { d: 'M340,880 C150,820 150,700 260,640 S520,560 420,480', fill: 'none', stroke: ylw, 'stroke-width': 7, 'stroke-dasharray': '16 12', opacity: 0.8 }, fx); }
  } else if (focus === 'line') {
    const defY = mean(pts.filter((p) => DEFN.includes(p.x.mevki)).map((p) => p.Yv));
    el('rect', { x: 0, y: defY + 30, width: PITCH_W, height: Math.max(0, PITCH_L - 60 - defY - 30), fill: '#ff6b7d', opacity: 0.1 }, fx);
    el('line', { x1: 10, y1: defY, x2: PITCH_W - 10, y2: defY, stroke: ylw, 'stroke-width': 6, 'stroke-dasharray': '22 12' }, fx);
    const txt = el('text', { x: PITCH_W / 2, y: Math.min(PITCH_L - 200, defY + 150), 'text-anchor': 'middle', fill: '#ff9aa6', 'font-size': 30, 'font-weight': 700 }, fx);
    txt.textContent = `arkadaki alan ~${Math.round((PITCH_L - defY - 60) / 10)} m`;
  } else if (focus === 'press') {
    const n = { low: 1, mid: 2, high: 3 }[v], op = { low: 0.35, mid: 0.6, high: 0.9 }[v];
    pts.slice().sort((a, b) => a.Yv - b.Yv).slice(0, n).forEach((p) => { el('circle', { cx: p.X, cy: p.Yv, r: 58, fill: 'none', stroke: ylw, 'stroke-width': 6, opacity: op, 'stroke-dasharray': '10 8' }, fx); arrow(p.X, p.Yv - 30, p.X, p.Yv - 130, ylw, 5); });
    if (v === 'high') arrow(340, 300, 340, 90, ylw, 4, '10 10');
  } else if (focus === 'closed') {
    if (v === 'wings') { el('rect', { x: 0, y: PITCH_L / 2, width: COL_W, height: PITCH_L / 2, fill: ylw, opacity: 0.16 }, fx); el('rect', { x: PITCH_W - COL_W, y: PITCH_L / 2, width: COL_W, height: PITCH_L / 2, fill: ylw, opacity: 0.16 }, fx); }
    else if (v === 'centre') el('rect', { x: COL_W, y: PITCH_L / 2, width: PITCH_W - 2 * COL_W, height: PITCH_L / 2, fill: ylw, opacity: 0.16 }, fx);
    else el('rect', { x: 0, y: PITCH_L / 2, width: PITCH_W, height: PITCH_L / 2, fill: ylw, opacity: 0.06 }, fx);
  } else if (focus === 'tackling') {
    const r = { careful: 40, normal: 52, hard: 66 }[v];
    pts.filter((p) => DEFN.includes(p.x.mevki) || p.x.mevki === 'DM').forEach((p) => el('circle', { cx: p.X, cy: p.Yv, r, fill: v === 'hard' ? '#ff6b7d' : ylw, opacity: v === 'hard' ? 0.22 : 0.14 }, fx));
  }
  for (const { x, X, Yv } of pts) {
    const g = el('g', {}, pl);
    el('circle', { cx: X, cy: Yv, r: 26, fill: '#070b0a', stroke: A, 'stroke-width': 5 }, g);
    const m = el('text', { x: X, y: Yv + 9, 'text-anchor': 'middle', fill: '#e8efe9', 'font-size': 23, 'font-weight': 800 }, g); m.textContent = x.mevki;
    const n = el('text', { x: X, y: Yv + 58, 'text-anchor': 'middle', fill: '#e8efe9', 'font-size': 23, 'font-weight': 700, stroke: '#070b0a', 'stroke-width': 6, 'paint-order': 'stroke' }, g);
    const sn = x.p.name.split(' ').slice(-1)[0]; n.textContent = sn.length > 9 ? sn.slice(0, 8) + '.' : sn;
  }
  $('sahaEtiket').textContent = `${s.ad}: ${s.o.find((o) => o[0] === v)[1]} · ${topsuz ? 'top rakipteyken' : 'top bizdeyken'}`;
}

// ── plan screen (first view): big pitch with the team's own players, the ball acting out the chosen plan ──
const PLAN_METIN = {
  dengeli: ['Her şey orta karar', 'Pas karışık, tempo dengeli, hat orta, pres orta.', 'Belirgin bir üstünlük de yok.'],
  tikitaka: ['Kısa pas, topa sahip ol', 'Kısa pas, sabırlı tempo, yüksek hat, yoğun pres, ara pasıyla bitir.', 'Hattın arkası boş: hızlı forvete karşı tehlikeli.'],
  kontra: ['Geride bekle, hızlı çık', 'Alçak hat, az pres, top kazanınca kontra, uzun pas, hızlı tempo.', 'Rakibe topu bırakırsın; uzaktan şuta açık.'],
  kanat: ['İki kanattan orta', 'Hücum yönü kanatlar, bitiriş orta, bekler öne çıkar.', 'Merkez boşalır; hava topu zayıf forvette verim düşer.'],
  pres: ['Rakibi kendi alanında boğ', 'Yoğun pres, yüksek hat, sert müdahale, hızlı tempo.', 'Faul ve kart riski; pres kırılırsa arka boş.'],
  otobus: ['Kaleyi kapat, puanı koru', 'Alçak hat, merkezi kapat, disiplinli oyun, kontra.', 'Az gol atarsın; ortalara açık kalırsın.'],
};
let anim = null, lastPos = {}; // running ball animation; dot positions of the previous render (for the glide)
/** Player dots for a plan: attacking shape, or the defensive shape for the deep plans; the line moves with the plan. */
function planNoktalar(xi, id, T) {
  const deep = id === 'kontra' || id === 'otobus';
  const shift = T.line === 'low' ? -110 : T.line === 'high' ? 120 : 0;
  return xi.map((x) => {
    const p = deep ? x.def : x.pos;
    let y = p.y;
    if (x.mevki !== 'GK') {
      const back = DEFN.includes(x.mevki) || x.mevki === 'DM';
      y += back ? shift : Math.trunc(shift * 0.6);
      if (id === 'kanat' && ['LB', 'RB', 'LWB', 'RWB'].includes(x.mevki)) { // overlap: up the flank, just behind the wide man
        const side = Math.sign(p.x - PITCH_W / 2), wide = xi.filter((o) => o !== x && o.mevki !== 'GK' && Math.sign(o.pos.x - PITCH_W / 2) === side && Math.abs(o.pos.x - PITCH_W / 2) > 150 && o.pos.y > p.y);
        const cap = wide.length ? Math.min(...wide.map((o) => o.pos.y)) - 150 : y + 230;
        y = Math.max(y, Math.min(y + 230, cap));
      }
      if (id === 'otobus' && G.mid([x]).length) y -= 60;
    }
    return { x, X: p.x, Y: Y(x.mevki === 'GK' ? p.y : Math.max(DEFN.includes(x.mevki) ? 250 : 340, Math.min(PITCH_L - 90, y))) };
  });
}
/** Ball route for a plan from the team's own players: [x, y, ms to get there, colour]. Goal is at the top. */
function planYol(pts, id) {
  const by = (f) => pts.filter((p) => f(p.x));
  const top = (list) => list.slice().sort((a, b) => a.Y - b.Y)[0];
  const st = top(by((x) => x.mevki !== 'GK')) || pts[0];
  const mids = by((x) => ['DM', 'CM', 'AM', 'LM', 'RM'].includes(x.mevki)).sort((a, b) => a.X - b.X);
  const mid = mids[Math.floor(mids.length / 2)] || st;
  const wideR = top(by((x) => ['RW', 'RM'].includes(x.mevki))) || top(by((x) => x.X > 470 && x.mevki !== 'GK')) || st;
  const backR = by((x) => ['RB', 'RWB'].includes(x.mevki))[0] || wideR;
  const wideL = top(by((x) => ['LW', 'LM'].includes(x.mevki))) || top(by((x) => x.X < 210 && x.mevki !== 'GK')) || st;
  const cb = by((x) => x.mevki === 'CB').sort((a, b) => b.X - a.X)[0] || mid;
  const goal = [PITCH_W / 2, 30];
  const P = (p, ms, c) => [p.X, p.Y - 2, ms, c];
  const W = '#ffffff', RED = '#ff6b7d';
  if (id === 'tikitaka') {
    const a = mids[0] || mid, b = mid, c = mids[mids.length - 1] || mid;
    return [P(a, 0, W), P(b, 380, W), P(c, 380, W), P(wideR, 420, W), P(c, 380, W), P(b, 380, W), P(a, 380, W), P(b, 380, W), P(st, 520, W), [...goal, 420, W]];
  }
  if (id === 'kontra') return [P(cb, 0, W), P(cb, 500, W), P(st, 900, W), [st.X, st.Y - 170, 520, W], [...goal, 380, W]];
  if (id === 'kanat') return [P(mid, 0, W), P(backR, 600, W), P(wideR, 600, W), [Math.min(PITCH_W - 50, wideR.X + 40), 190, 520, W], P(st, 560, W), [...goal, 380, W]];
  if (id === 'pres') {
    const rakip = [wideL.X + 30, Math.max(110, st.Y - 40)], kap = [st.X + 50, st.Y + 30];
    return [[...rakip, 0, RED], [...kap, 800, RED], [...kap, 260, RED, 'halka'], [...kap, 140, W], P(st, 380, W), [...goal, 420, W]];
  }
  if (id === 'otobus') { const yy = Math.min(...pts.filter((p) => p.x.mevki !== 'GK').map((p) => p.Y)) - 70; return [[90, yy, 0, RED], [340, yy - 40, 1500, RED], [590, yy, 1500, RED], [340, yy - 40, 1500, RED], [90, yy, 1500, RED]]; }
  return [P(mid, 0, W), P(mids[0] || mid, 700, W), P(wideL, 800, W), P(st, 800, W), [...goal, 480, W]]; // dengeli
}
function planRender() {
  const t = order[step], tm = TEAMS[t], T = tac[t], plan = hangiPlan(T), id = plan || 'dengeli';
  $('pBaslik').innerHTML = `TAKTİK · <span>${esc(tm.name)}</span>`;
  $('pAlt').textContent = `${tm.formation} · rakip: ${TEAMS[1 - t].name}`;
  $('pKartlar').innerHTML = PLANLAR.map(([pid, ad]) => `<button type="button" class="pk" data-plan="${pid}" aria-pressed="${plan === pid}"><b>${ad}</b><small>${PLAN_METIN[pid][0]}</small></button>`).join('');
  const m = PLAN_METIN[id];
  $('pOzet').innerHTML = plan
    ? `<em>BU PLANDA</em><span>${m[1]}</span><span class="risk">Risk: ${m[2]}</span>`
    : `<em>ÖZEL AYAR</em><span>${TAKTIK.map((s) => s.o.find((o) => o[0] === T[s.k])[1]).join(' · ')}</span><span class="risk">İnce ayarda kendi seçimlerini yaptın.</span>`;
  $('pEtiket').textContent = plan ? PLANLAR.find((x) => x[0] === plan)[1].toLocaleUpperCase('tr') : 'ÖZEL';
  planSaha(TEAMS[t].xi, id, T, !!plan);
}
function planSaha(xi, id, T, animate) {
  const svg = $('pSaha'); svg.innerHTML = '';
  const line = 'rgba(236,255,228,.35)';
  for (let i = 0; i < 10; i++) el('rect', { x: 0, y: i * 105, width: PITCH_W, height: 105, fill: i % 2 ? '#0f3d20' : '#124726' }, svg);
  el('rect', { x: 14, y: 14, width: PITCH_W - 28, height: PITCH_L - 28, fill: 'none', stroke: line, 'stroke-width': 4, rx: 4 }, svg);
  el('line', { x1: 14, y1: PITCH_L / 2, x2: PITCH_W - 14, y2: PITCH_L / 2, stroke: line, 'stroke-width': 4 }, svg);
  el('circle', { cx: PITCH_W / 2, cy: PITCH_L / 2, r: 88, fill: 'none', stroke: line, 'stroke-width': 4 }, svg);
  for (const top of [true, false]) {
    el('rect', { x: 140, y: top ? 14 : PITCH_L - 180, width: 400, height: 166, fill: 'none', stroke: line, 'stroke-width': 4 }, svg);
    el('rect', { x: 250, y: top ? 14 : PITCH_L - 70, width: 180, height: 56, fill: 'none', stroke: line, 'stroke-width': 4 }, svg);
  }
  const pts = planNoktalar(xi, id, T);
  const fx = el('g', {}, svg), pl = el('g', {}, svg);
  const defs = el('defs', {}, svg), gr = el('linearGradient', { id: 'okg', x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
  el('stop', { offset: 0, 'stop-color': 'var(--tk)', 'stop-opacity': 0.08 }, gr); el('stop', { offset: 1, 'stop-color': 'var(--tk)', 'stop-opacity': 1 }, gr);
  const ok = (x, y1, y2) => (y2 = Math.max(40, y2), el('rect', { x: x - 5, y: y2, width: 10, height: Math.max(0, y1 - y2), rx: 5, fill: 'url(#okg)', style: 'filter:drop-shadow(0 0 8px var(--tk))' }, fx));
  const by = (f) => pts.filter((p) => f(p.x));
  if (id === 'tikitaka') by((x) => ['CM', 'DM', 'AM'].includes(x.mevki)).slice(0, 2).forEach((p) => ok(p.X, p.Y - 30, p.Y - 230));
  if (id === 'kontra') ok(PITCH_W / 2, 760, 230);
  if (id === 'kanat') { ok(90, 690, 270); ok(PITCH_W - 90, 690, 270); }
  if (id === 'pres') pts.slice().sort((a, b) => a.Y - b.Y).slice(0, 3).forEach((p) => ok(p.X, p.Y - 30, p.Y - 180));
  if (id === 'otobus') { const yy = Math.max(...by((x) => DEFN.includes(x.mevki)).map((p) => p.Y)); el('rect', { x: 120, y: yy - 120, width: PITCH_W - 240, height: PITCH_L - 30 - (yy - 120), fill: 'var(--tk)', opacity: 0.07, rx: 18 }, fx); }
  for (const { x, X, Y: yy } of pts) {
    const o = lastPos[x.slot] || [X, yy];
    const g = el('g', { class: 'nokta', style: `transform:translate(${o[0]}px,${o[1]}px)` }, pl);
    requestAnimationFrame(() => requestAnimationFrame(() => { g.style.transform = `translate(${X}px,${yy}px)`; }));
    lastPos[x.slot] = [X, yy];
    el('circle', { r: 22, fill: x.mevki === 'GK' ? '#ffd23f' : 'var(--tk)', stroke: '#070b0a', 'stroke-width': 6, style: 'filter:drop-shadow(0 0 10px var(--tk))' }, g);
    const n = el('text', { y: 54, 'text-anchor': 'middle', fill: '#f3f6f8', 'font-size': 24, 'font-weight': 700, stroke: '#070b0a', 'stroke-width': 6, 'paint-order': 'stroke' }, g);
    const sn = x.p.name.split(' ').slice(-1)[0]; n.textContent = sn.length > 10 ? sn.slice(0, 9) + '.' : sn;
  }
  // ball: follows the plan's route in a loop (fades in at the start and out at the goal)
  if (anim) cancelAnimationFrame(anim.raf);
  anim = null;
  if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const route = planYol(pts, id), loop = id === 'otobus';
  const ring = el('circle', { r: 26, fill: 'none', stroke: '#ff6b7d', 'stroke-width': 5, opacity: 0 }, svg);
  const ball = el('circle', { r: 13, fill: '#fff', stroke: '#070b0a', 'stroke-width': 5, style: 'filter:drop-shadow(0 0 10px rgba(255,255,255,.8))' }, svg);
  const times = []; let acc = 0; for (const r of route) { acc += r[2]; times.push(acc); }
  const total = acc + (loop ? 0 : 700); // short pause at the goal
  const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
  const t0 = performance.now();
  const tick = (now) => {
    const tt = (now - t0) % total;
    let i = times.findIndex((v) => v >= tt); if (i < 0) i = route.length - 1;
    const a = route[Math.max(0, i - 1)], b = route[i], seg = b[2] || 1, u = i === 0 ? 1 : ease(Math.min(1, (tt - (times[i] - seg)) / seg));
    const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
    ball.setAttribute('cx', x); ball.setAttribute('cy', y); ball.setAttribute('fill', b[3]);
    const op = loop ? 1 : tt < 250 ? tt / 250 : tt > acc ? Math.max(0, 1 - (tt - acc) / 400) : 1;
    ball.setAttribute('opacity', op);
    const h = route.findIndex((r) => r[4] === 'halka');
    if (h >= 0) { const s0 = times[h] - route[h][2], k = (tt - s0) / 700; ring.setAttribute('cx', route[h][0]); ring.setAttribute('cy', route[h][1]); ring.setAttribute('opacity', k > 0 && k < 1 ? 1 - k : 0); ring.setAttribute('r', 20 + 50 * Math.max(0, Math.min(1, k))); }
    anim.raf = requestAnimationFrame(tick);
  };
  anim = { raf: requestAnimationFrame(tick) };
}
$('pKartlar').addEventListener('click', (e) => { const b = e.target.closest('[data-plan]'); if (!b) return; tac[order[step]] = planTaktik(b.dataset.plan); render(); });

// ── events ──
$('planlar').addEventListener('click', (e) => { const b = e.target.closest('[data-plan]'); if (!b) return; tac[order[step]] = planTaktik(b.dataset.plan); render(); });
$('ayarlar').addEventListener('click', (e) => {
  const c = e.target.closest('[data-k]');
  if (c) { tac[order[step]][c.dataset.k] = c.dataset.v; focus = c.dataset.k; render(); return; }
  const a = e.target.closest('[data-ayar]'); if (a && focus !== a.dataset.ayar) { focus = a.dataset.ayar; render(); }
});
$('hazir').addEventListener('click', () => {
  if (step < order.length - 1) { step++; focus = 'direction'; $('ekran').hidden = true; $('devir').hidden = false; $('devirAd').textContent = TEAMS[order[step]].name; window.scrollTo(0, 0); return; }
  const out = { ...D, home: { ...D.home, tactic: tac[0], plan: hangiPlan(tac[0]) || 'ozel' }, away: { ...D.away, tactic: tac[1], plan: hangiPlan(tac[1]) || 'ozel' } };
  try { sessionStorage.setItem('draftxi-mac', JSON.stringify(out)); } catch { /* the match screen falls back to plan ids */ }
  location.href = './mac.html?draft=1';
});
$('inceBtn').addEventListener('click', () => { view = view === 'plan' ? 'ince' : 'plan'; render(); window.scrollTo(0, 0); });
$('devam').addEventListener('click', () => { view = 'plan'; $('devir').hidden = true; $('ekran').hidden = false; render(); window.scrollTo(0, 0); });
window.__taktik = { TEAMS, tac, sayilar, get view() { return view; } };
render();
