// Draft XI — match screen (design doc 9.1): vertical 2D pitch, commentary, live stats, 1x/2x, skip to result,
// goal replay + celebration. The engine computes the whole match first; this screen only plays it back.
import { HAVUZ } from '../data/havuz.mjs?v=3';
import { FORMATIONS } from '../engine/formations.mjs?v=2';
import { simulateMatch } from '../engine/match.mjs?v=5';
import { createSpiker, dakika } from './spiker.mjs?v=3';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg';

// one-tap plans (same six as the tactics screen)
const PLANS = [
  ['dengeli', 'Dengeli', {}],
  ['tikitaka', 'Tiki-taka', { passing: 'short', tempo: 'patient', line: 'high', press: 'high', finishing: 'through', direction: 'centre', creativity: 'high' }],
  ['kontra', 'Kontra atak', { line: 'low', press: 'low', onWin: 'counter', passing: 'long', tempo: 'fast', finishing: 'through' }],
  ['kanat', 'Kanat oyunu', { direction: 'wings', finishing: 'cross' }],
  ['pres', 'Yüksek pres', { press: 'high', line: 'high', tackling: 'hard', tempo: 'fast' }],
  ['otobus', 'Otobüs çek', { line: 'low', press: 'low', closed: 'centre', creativity: 'low', onWin: 'counter', tempo: 'patient' }],
];

// ── setup ──────────────────────────────────────────────────────────────────────────────────────────
const clubs = {};
for (const p of HAVUZ) (clubs[p.club] ||= []).push(p);
const bigClubs = Object.keys(clubs).filter((c) => clubs[c].length >= 15).sort((a, b) => a.localeCompare(b, 'tr'));
const clubOpts = bigClubs.map((c) => `<option>${esc(c)}</option>`).join('');
const planOpts = PLANS.map(([id, ad]) => `<option value="${id}">${ad}</option>`).join('');
$('kA').innerHTML = clubOpts; $('kB').innerHTML = clubOpts; $('pA').innerHTML = planOpts; $('pB').innerHTML = planOpts;
$('kA').value = bigClubs.includes('Galatasaray') ? 'Galatasaray' : bigClubs[0];
$('kB').value = bigClubs.includes('Fenerbahçe') ? 'Fenerbahçe' : bigClubs[1];
try { $('komik').checked = localStorage.getItem('nxDraftKomik') !== '0'; } catch { /* default on */ }

const lv = (p) => (p.positions.includes('GK') ? p.attrs.ref + p.attrs.gpos + p.attrs.ghd + p.attrs.one
  : p.attrs.fin + p.attrs.dri + p.attrs.sp + p.attrs.vis + p.attrs.tac + p.attrs.mar + p.attrs.pac + p.attrs.str);
function bestXI(club) {
  const used = new Set(), players = {};
  for (const [slot, , m] of FORMATIONS['4-3-3']) {
    let c = clubs[club].filter((p) => !used.has(p.id) && p.positions.includes(m));
    if (!c.length) c = clubs[club].filter((p) => !used.has(p.id) && (m === 'GK') === p.positions.includes('GK'));
    const p = c.sort((a, b) => lv(b) - lv(a))[0]; used.add(p.id); players[slot] = p;
  }
  return { name: club, formation: '4-3-3', players };
}
const tactic = (id) => ({ ...PLANS.find((x) => x[0] === id)[2] });
// shirt numbers by slot (classic numbering)
const NUM = { GK: 1, RB: 2, LB: 3, RCB: 4, LCB: 5, CB: 5, DM: 6, RW: 7, RM: 7, RCM: 8, CM1: 8, ST: 9, LCM: 10, CM2: 10, AM: 10, LW: 11, LM: 11, LST: 9, RST: 11 };

// ── pitch drawing ──────────────────────────────────────────────────────────────────────────────────
const W = 680, L = 1050;
const svg = $('saha');
const el = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
function drawPitch() {
  svg.innerHTML = '';
  const g = el('g', {});
  for (let i = 0; i < 10; i++) el('rect', { x: 0, y: i * 105, width: W, height: 105, fill: i % 2 ? 'var(--grass2)' : 'var(--grass1)' }, g);
  const line = { fill: 'none', stroke: 'rgba(232,255,228,.45)', 'stroke-width': 3 };
  el('rect', { x: 0, y: 0, width: W, height: L, ...line }, g);
  el('line', { x1: 0, y1: L / 2, x2: W, y2: L / 2, ...line }, g);
  el('circle', { cx: W / 2, cy: L / 2, r: 91, ...line }, g);
  for (const top of [true, false]) {
    const y = top ? 0 : L, s = top ? 1 : -1;
    el('rect', { x: 138, y: top ? 0 : L - 165, width: 404, height: 165, ...line }, g);
    el('rect', { x: 248, y: top ? 0 : L - 55, width: 184, height: 55, ...line }, g);
    el('rect', { x: 303, y: top ? -14 : L, width: 74, height: 14, fill: 'rgba(232,255,228,.75)' }, g);
    el('circle', { cx: W / 2, cy: y + s * 110, r: 4, fill: 'rgba(232,255,228,.6)' }, g);
  }
  return { lines: el('g', {}), players: el('g', {}), ball: el('circle', { r: 9, fill: '#fff', stroke: '#070b0a', 'stroke-width': 3 }), label: el('text', { class: 'lbl', 'text-anchor': 'middle', fill: '#fff', 'font-size': 26, 'font-weight': 700, 'paint-order': 'stroke', stroke: '#070b0a', 'stroke-width': 6 }) };
}
// engine coordinates: x across (0–680), y along (0 = home goal). Home attacks upwards on screen.
const sx = (x) => x, sy = (y) => L - y;

// ── playback ───────────────────────────────────────────────────────────────────────────────────────
let M = null;          // { r, names, layers, discs, frames, events, k, u, speed, playing, ... }
const FAST = new URLSearchParams(location.search).has('hizli') ? 25 : 1; // test aid: ?hizli plays 25× faster

function start() {
  const home = bestXI($('kA').value), away = bestXI($('kB').value);
  if (home.name === away.name) { away.name += ' (2)'; }
  const fixed = Number(new URLSearchParams(location.search).get('tohum')); // test aid: ?tohum=N replays the same match
  const seed = fixed > 0 ? fixed : (Date.now() % 100000) + 1;
  const r = simulateMatch({ home, away, seed, tacticHome: tactic($('pA').value), tacticAway: tactic($('pB').value), frames: true });
  const byId = Object.fromEntries(HAVUZ.map((p) => [p.id, p]));
  const short = (id) => { const n = byId[id]?.name || id; const parts = n.split(' '); return parts.length > 1 && n.length > 14 ? parts.slice(-1)[0] : n; };
  const layers = drawPitch();
  const discs = r.teams.map((tm, side) => tm.lineup.map((pl) => {
    const g = el('g', { class: 'disc' }, layers.players);
    const c = side === 0 ? '#baff18' : '#2fe0ff';
    el('circle', { r: 19, fill: '#070b0a', stroke: c, 'stroke-width': 4, style: `filter:drop-shadow(0 0 6px ${c})` }, g);
    const t = el('text', { 'text-anchor': 'middle', y: 8, fill: c, 'font-size': 21, 'font-weight': 800 }, g);
    t.textContent = NUM[pl.slot] ?? '';
    return { g, id: pl.id, ring: g.firstChild };
  }));
  const display = directFrames(r);
  const komik = $('komik').checked;
  try { localStorage.setItem('nxDraftKomik', komik ? '1' : '0'); } catch { /* ignore */ }
  M = { r, display, spiker: createSpiker(r, short, r.teams.map((t) => t.name), { jokes: komik, seed }), names: r.teams.map((t) => t.name), short, layers, discs, k: 0, u: 0, speed: 1, playing: true, score: [0, 0],
    live: { poss: [0, 0], shots: [0, 0], on: [0, 0], pass: [0, 0], passOk: [0, 0], corners: [0, 0], fouls: [0, 0], cards: [0, 0] },
    recent: [], last: performance.now(), busy: false };
  $('adA').textContent = M.names[0]; $('adB').textContent = M.names[1];
  $('sA').textContent = '0'; $('sB').textContent = '0'; $('dk').textContent = "1'"; $('spiker').innerHTML = '';
  $('kur').hidden = true; $('son').hidden = true; $('mac').hidden = false;
  $('oynat').textContent = '❚❚'; $('hiz').textContent = '1x';
  M.plan = buildPlan(r); M.si = 0; M.u = 0;
  initMotion(); beginStep(); renderStats(); requestAnimationFrame(loop);
}

// ── visual director: the engine's positions plus what a viewer expects to see ──
// holder glued to the ball (so receivers run onto passes), the two nearest opponents pressing the holder.
// Visual only: the result comes from the engine and never changes.
const ENDS_WITH = { possession: 'p', pass: 'to', through: 'to', carry: 'p', dribble: 'p', tackle: 'p', intercept: 'p', press_win: 'p',
  aerial: 'p', second_ball: 'p', loose_ball: 'p', keeper_rush: 'p', save: 'p', clear: null, goal: null, miss: null, shot: null };
function directFrames(r) {
  const where = {};
  r.teams.forEach((tm, side) => tm.lineup.forEach((pl, i) => { where[pl.id] = [side, i]; }));
  let holder = null;
  return r.frames.map((f, k) => {
    const ev = r.events[k];
    const pos = f.p.map((team) => team.map((q) => (q ? [q[0], q[1]] : null)));
    if (ev.type in ENDS_WITH) holder = ENDS_WITH[ev.type] ? ev[ENDS_WITH[ev.type]] : holder;
    if (['goal', 'miss', 'half_time', 'full_time'].includes(ev.type)) holder = null;
    const h = holder && where[holder];
    if (h && pos[h[0]][h[1]]) {
      const own = h[0] === 0 ? -1 : 1; // stand just behind the ball, towards the own goal
      pos[h[0]][h[1]] = [f.b[0], f.b[1] + own * 14];
      const opp = 1 - h[0];
      const near = pos[opp].map((q, i) => (q ? [Math.hypot(q[0] - f.b[0], q[1] - f.b[1]), i] : [1e9, i]))
        .filter(([d, i]) => d < 260 && r.teams[opp].lineup[i].mevki !== 'GK').sort((a, b) => a[0] - b[0]).slice(0, 2);
      near.forEach(([d, i], n) => {
        const q = pos[opp][i], keep = n === 0 ? 30 : 70; // first presser to ~3 m, second to ~7 m
        const t = Math.max(0, (d - keep) / d) * (n === 0 ? 0.8 : 0.45);
        pos[opp][i] = [q[0] + (f.b[0] - q[0]) * t, q[1] + (f.b[1] - q[1]) * t];
      });
    }
    return pos;
  });
}

// ── playback plan: key moments slow and complete, ordinary passing fast-forwarded ──────────────────────
// The engine logs ~1,200 events a match; shown one by one in 3–4 minutes nothing could look smooth. A scene is a
// key moment (shot and its outcome, corner, through ball, offside, card, keeper rush, kick-off, half/full time)
// with the 3 moves before it and 1 after; scenes play slowly. Between scenes the clock runs fast and players
// glide once to where the next scene starts; stats and commentary still process every skipped event.
const KEY = new Set(['shot', 'goal', 'save', 'miss', 'post', 'block', 'corner', 'through', 'offside', 'keeper_rush', 'half_time', 'full_time', 'reshape']);
function buildPlan(r) {
  const E = r.events, n = E.length;
  const key = E.map((e) => KEY.has(e.type) || (e.type === 'foul' && e.card) || (e.type === 'possession' && e.how === 'kickoff'));
  const inScene = new Array(n).fill(false);
  key.forEach((k, i) => { if (k) for (let j = Math.max(0, i - 3); j <= Math.min(n - 1, i + 1); j++) inScene[j] = true; });
  inScene[0] = true; inScene[n - 1] = true;
  const ranges = [];
  for (let i = 0; i < n; i++) if (inScene[i]) { if (ranges.length && ranges[ranges.length - 1][1] === i - 1) ranges[ranges.length - 1][1] = i; else ranges.push([i, i]); }
  const steps = [];
  ranges.forEach(([s0, e0], ri) => {
    for (let k = s0; k < e0; k++) steps.push({ t: 'play', k });
    if (ri < ranges.length - 1) steps.push({ t: 'jump', a: e0, b: ranges[ri + 1][0] });
    else steps.push({ t: 'end', k: e0 });
  });
  return steps;
}
const PLAY_RATE = 10; // match seconds per real second inside a scene
function stepDur(st) {
  const f = M.r.frames, sp = M.speed === 2 ? 0.55 : 1;
  if (st.t === 'play') return Math.min(1.4, Math.max(0.55, 0.35 + (f[st.k + 1].t - f[st.k].t) / 10 / PLAY_RATE)) * sp / FAST;
  if (st.t === 'jump') return Math.min(1.6, 0.9 + (f[st.b].t - f[st.a].t) / 10 / 400) * sp / FAST;
  return 0;
}

// ── motion: continuous, individual, physical ─────────────────────────────────────────────────────────
// Each event gives a target position. The target slides linearly between events (no stop at every event);
// every player follows his target like a critically damped spring with his own response (faster players react
// quicker), a top speed, and his own slow off-ball drift. Result: smooth, individual movement, no block shifting.
const VMAX = 1150;   // pitch units (dm) per real second at 1x — playback compresses match time
function initMotion() {
  const byId = Object.fromEntries(HAVUZ.map((p) => [p.id, p]));
  M.motion = M.r.teams.map((tm, side) => tm.lineup.map((pl, i) => {
    const p0 = M.display[0][side][i] || [W / 2, L / 2];
    const pac = byId[pl.id]?.attrs?.pac ?? 70;
    const rnd = (n) => { const x = Math.sin((i + 1) * 12.9898 + (side + 1) * 78.233 + n * 37.719) * 43758.5453; return x - Math.floor(x); };
    return { x: p0[0], y: p0[1], vx: 0, vy: 0, w: (3.6 + pac / 20) * (0.85 + rnd(6) * 0.3), f1: 0.11 + rnd(1) * 0.18, f2: 0.09 + rnd(2) * 0.16,
      ph1: rnd(3) * 6.28, ph2: rnd(4) * 6.28, amp: 9 + rnd(5) * 10 };
  }));
}

function place(k, u, dt) {
  const f = M.r.frames, last = f.length - 1, k2 = Math.min(k + 1, last);
  const passing = ['pass', 'through', 'cross', 'pass_bad', 'clear'].includes(M.r.events[k].type);
  placeBetween(M.display[k], M.display[k2], f[k], f[k2], u, dt, passing);
}

function placeBetween(A, B, a, b, u, dt, passing) {
  // ball: straight for passes with a slight slow-down at the end, plain glide otherwise
  const eb = passing ? 1 - (1 - u) * (1 - u) : u;
  const bx = a.b[0] + (b.b[0] - a.b[0]) * eb, by = a.b[1] + (b.b[1] - a.b[1]) * eb;
  M.layers.ball.setAttribute('cx', sx(bx)); M.layers.ball.setAttribute('cy', sy(by));
  const now = performance.now() / 1000;
  const step = Math.min(dt || 0.016, 0.05);
  for (let side = 0; side < 2; side++) M.discs[side].forEach((d, i) => {
    const p = A[side][i], q = B[side][i] || p;
    if (!p) { d.g.style.display = 'none'; return; }
    d.g.style.display = '';
    const m = M.motion[side][i];
    let tx = p[0] + (q[0] - p[0]) * u, ty = p[1] + (q[1] - p[1]) * u;
    const nearBall = Math.hypot(tx - bx, ty - by) < 40;
    if (!nearBall) { // own slow wandering, different for every player
      tx += Math.sin(now * m.f1 * 6.28 + m.ph1) * m.amp;
      ty += Math.sin(now * m.f2 * 6.28 + m.ph2) * m.amp * 0.8;
    }
    if (reduced()) { m.x = tx; m.y = ty; m.vx = m.vy = 0; }
    else {
      // the man on the ball stays with it; others react the slower the farther they are from the ball
      const dBall = Math.hypot(m.x - bx, m.y - by);
      const w = nearBall ? 14 : m.w * (1.25 - Math.min(0.7, dBall / 1100));
      for (let t = 0; t < step; t += 0.01) { // small sub-steps keep the spring stable
        const h = Math.min(0.01, step - t);
        m.vx += (w * w * (tx - m.x) - 2 * w * m.vx) * h;
        m.vy += (w * w * (ty - m.y) - 2 * w * m.vy) * h;
        const v = Math.hypot(m.vx, m.vy), vmax = VMAX * (M.speed === 2 ? 1.6 : 1);
        if (v > vmax) { m.vx *= vmax / v; m.vy *= vmax / v; }
        m.x += m.vx * h; m.y += m.vy * h;
      }
    }
    d.g.setAttribute('transform', `translate(${sx(m.x).toFixed(1)},${sy(m.y).toFixed(1)})`);
  });
}

function passLine(k) {
  const ev = M.r.events[k];
  if (!['pass', 'through', 'cross', 'pass_bad'].includes(ev.type)) return;
  const a = M.r.frames[k], b = M.r.frames[Math.min(k + 1, M.r.frames.length - 1)];
  const ln = el('line', { x1: sx(a.b[0]), y1: sy(a.b[1]), x2: sx(b.b[0]), y2: sy(b.b[1]), stroke: ev.team === 0 ? '#baff18' : '#2fe0ff',
    'stroke-width': ev.type === 'through' ? 5 : 3, 'stroke-dasharray': ev.type === 'pass_bad' ? '10 8' : '', opacity: 0.85, 'stroke-linecap': 'round' }, M.layers.lines);
  ln.animate?.([{ opacity: 0.85 }, { opacity: 0 }], { duration: 900, fill: 'forwards' });
  while (M.layers.lines.childElementCount > 3) M.layers.lines.firstElementChild.remove(); // only the latest passes
  setTimeout(() => ln.remove(), 950);
}

function enterFrame(k, silent = false) {
  M.k = k;
  const ev = M.r.events[k];
  // live stats from events
  const L2 = M.live, tm = ev.team;
  if (tm != null) {
    const nextT = M.r.events[k + 1]?.t ?? ev.t;
    L2.poss[tm] += Math.max(0, nextT - ev.t);
    M.recent.push(tm); if (M.recent.length > 40) M.recent.shift();
  }
  if (ev.type === 'shot') L2.shots[tm]++;
  if (ev.type === 'goal') L2.on[tm]++;
  if (ev.type === 'save') L2.on[1 - tm]++;
  if (ev.type === 'pass' || ev.type === 'through') { L2.pass[tm]++; L2.passOk[tm]++; }
  if (ev.type === 'pass_bad') L2.pass[tm]++;
  if (ev.type === 'intercept') L2.pass[1 - tm]++; // the intercepted pass was the other team's
  if (ev.type === 'corner') L2.corners[tm]++;
  if (ev.type === 'foul') { L2.fouls[tm]++; if (ev.card) L2.cards[tm]++; }
  $('dk').textContent = dakika(ev.t);
  const sh = M.recent.length ? M.recent.filter((x) => x === 0).length / M.recent.length : 0.5;
  $('baski').style.width = `${Math.round(sh * 100)}%`;
  // holder label
  const holder = ev.type === 'possession' || ev.type === 'pass' ? (ev.type === 'pass' ? ev.to : ev.p) : ev.p;
  M.layers.label.textContent = holder ? M.short(holder) : '';
  if (silent) { for (const line of M.spiker(ev, k).reverse()) if (line.kind !== 'build') addLine(ev, line); return; }
  passLine(k);
  // duel highlight: both players glow for a moment
  const rival = ev.past || ev.on || ev.vs || ev.by;
  if (['dribble', 'tackle', 'aerial', 'press_win', 'foul'].includes(ev.type) && ev.p && rival) flash([ev.p, rival]);
  // key moments written on the pitch
  if (ev.type === 'save') toast('KURTARIŞ!');
  if (ev.type === 'post') toast('DİREK!');
  if (ev.type === 'foul' && ev.card === 'red') toast('KIRMIZI KART', 'red');
  if (ev.type === 'foul' && ev.card === 'yellow') toast('SARI KART', 'yel');
  for (const line of M.spiker(ev, k).reverse()) addLine(ev, line); // newest on top, but a goal stays above its reasons
  if (ev.type === 'goal') goal(k, ev);
  if (k % 8 === 0) renderStats();
}

function flash(ids) {
  for (const side of M.discs) for (const d of side) if (ids.includes(d.id)) {
    d.ring.animate?.([{ strokeWidth: 4, r: 19 }, { strokeWidth: 8, r: 24 }, { strokeWidth: 4, r: 19 }], { duration: 650 });
  }
}
function toast(text, tone = '') {
  if (reduced()) return;
  const t = $('anlik');
  t.textContent = text; t.className = 'anlik ' + tone; t.hidden = false;
  clearTimeout(toast.h); toast.h = setTimeout(() => { t.hidden = true; }, 1300);
}

function addLine(ev, { kind, text }) {
  const li = document.createElement('li');
  li.className = kind + (kind === 'goal' && ev.team === 1 ? ' b' : '');
  li.innerHTML = `<time>${dakika(ev.t)}</time><span>${esc(text)}</span>`;
  $('spiker').prepend(li);
  while ($('spiker').children.length > 80) $('spiker').lastElementChild.remove();
}

const wait = (ms) => new Promise((res) => setTimeout(res, ms));
async function goal(k, ev) {
  M.busy = true;
  if (!reduced()) {
    // replay: the last few moves before the goal, slowly
    $('tekrar').hidden = false;
    const from = Math.max(0, k - 5);
    for (let i = from; i < k; i++) {
      const t0 = performance.now();
      await new Promise((res) => {
        let prev = t0;
        const step = (now) => { const u = Math.min(1, (now - t0) / 650); place(i, u, (now - prev) / 1000); prev = now; if (u < 1) requestAnimationFrame(step); else res(); };
        requestAnimationFrame(step);
      });
    }
    $('tekrar').hidden = true;
  }
  M.score[ev.team]++;
  $('sA').textContent = M.score[0]; $('sB').textContent = M.score[1];
  $('kutlamaAd').textContent = `${M.short(ev.p)} · ${M.names[ev.team]}`;
  $('kutlama').className = 'kutlama' + (ev.team === 1 ? ' b' : '');
  $('kutlama').hidden = false;
  try { navigator.vibrate?.([60, 40, 60]); } catch { /* ignore */ }
  await wait(reduced() ? 900 : 1800);
  $('kutlama').hidden = true;
  M.busy = false; M.last = performance.now();
}

function beginStep() {
  const st = M.plan[M.si];
  if (!st) return;
  if (st.t === 'play') enterFrame(st.k);
  else if (st.t === 'jump') { enterFrame(st.a); for (let j = st.a + 1; j < st.b; j++) enterFrame(j, true); }
  else if (st.t === 'end') enterFrame(st.k);
}

function loop(now) {
  if (!M || $('mac').hidden) return;
  const dt = Math.min(0.1, (now - M.last) / 1000);
  M.last = now;
  if (M.playing && !M.busy) {
    let st = M.plan[M.si];
    M.u += dt / Math.max(0.001, stepDur(st));
    while (M.u >= 1 && !M.busy) {
      const carry = (M.u - 1) * stepDur(st);              // leftover real time carried in full
      M.si++; st = M.plan[M.si];
      if (!st || st.t === 'end') { if (st) beginStep(); return finish(); }
      beginStep();
      M.u = M.busy ? 0 : carry / Math.max(0.001, stepDur(st));
    }
    if (!M.busy && st) {
      const f = M.r.frames;
      if (st.t === 'play') place(st.k, Math.min(1, M.u), dt);
      else if (st.t === 'jump') {
        const u = Math.min(1, M.u), e = u * u * (3 - 2 * u); // one smooth glide to the next scene
        placeBetween(M.display[st.a], M.display[st.b], f[st.a], f[st.b], e, dt, false);
        $('dk').textContent = dakika(f[st.a].t + (f[st.b].t - f[st.a].t) * u);
      }
    }
  } else if (!M.busy) {
    const st = M.plan[M.si];
    if (st?.t === 'play') place(st.k, Math.min(1, M.u), dt); // players settle while paused
  }
  // holder label follows the ball
  M.layers.label.setAttribute('x', M.layers.ball.getAttribute('cx'));
  M.layers.label.setAttribute('y', Number(M.layers.ball.getAttribute('cy')) + 44);
  requestAnimationFrame(loop);
}

// ── stats ──────────────────────────────────────────────────────────────────────────────────────────
function statRows(s) {
  const total = s.poss[0] + s.poss[1] || 1;
  const rows = [
    ['Topa sahip olma', `${Math.round((s.poss[0] / total) * 100)}%`, `${Math.round((s.poss[1] / total) * 100)}%`, s.poss[0], s.poss[1]],
    ['Şut', s.shots[0], s.shots[1]], ['İsabetli şut', s.on[0], s.on[1]],
    ['Pas isabeti', s.pass[0] ? `${Math.round((s.passOk[0] / s.pass[0]) * 100)}%` : '–', s.pass[1] ? `${Math.round((s.passOk[1] / s.pass[1]) * 100)}%` : '–', s.passOk[0], s.passOk[1]],
    ['Korner', s.corners[0], s.corners[1]], ['Faul', s.fouls[0], s.fouls[1]], ['Kart', s.cards[0], s.cards[1]],
  ];
  return rows.map(([ad, a, b, va = a, vb = b]) => {
    const t = (Number(va) || 0) + (Number(vb) || 0) || 1;
    return `<div class="st"><span>${a}</span><em>${ad}</em><span>${b}</span><div class="bar"><i style="width:${((Number(va) || 0) / t) * 100}%"></i><u style="width:${((Number(vb) || 0) / t) * 100}%"></u></div></div>`;
  }).join('');
}
const renderStats = () => { $('ist').innerHTML = statRows(M.live); };

function finish() {
  if (!M) return;
  const r = M.r;
  M.playing = false;
  const s = r.stats;
  const fin = { poss: [s[0].possession, s[1].possession], shots: [s[0].shots, s[1].shots], on: [s[0].onTarget, s[1].onTarget],
    pass: [s[0].passes, s[1].passes], passOk: [s[0].passesOk, s[1].passesOk], corners: [s[0].corners, s[1].corners],
    fouls: [s[0].fouls, s[1].fouls], cards: [s[0].yellows + s[0].reds, s[1].yellows + s[1].reds] };
  $('sonSkor').innerHTML = `<span class="a">${esc(M.names[0])}</span><strong>${r.score[0]} – ${r.score[1]}</strong><span class="b">${esc(M.names[1])}</span>`;
  $('sonIst').innerHTML = `<h2>İSTATİSTİK</h2>${statRows(fin)}`;
  const all = r.ratings.flatMap((list, side) => list.map((x) => ({ ...x, side }))).sort((a, b) => b.rating - a.rating);
  $('sonPuan').innerHTML = `<h2>OYUNCU PUANLARI</h2>${all.slice(0, 22).map((x) => `<div class="puan${x.id === r.motm.id ? ' motm' : ''}"><span style="color:${x.side ? 'var(--b)' : 'var(--a)'}">${x.id === r.motm.id ? '★ ' : ''}${esc(M.short(x.id))}</span><b>${x.rating.toFixed(1)}</b></div>`).join('')}`;
  $('mac').hidden = true; $('son').hidden = false;
  window.scrollTo(0, 0);
}

// ── controls ───────────────────────────────────────────────────────────────────────────────────────
$('basla').addEventListener('click', start);
$('oynat').addEventListener('click', () => { M.playing = !M.playing; M.last = performance.now(); $('oynat').textContent = M.playing ? '❚❚' : '▶'; $('oynat').setAttribute('aria-label', M.playing ? 'Duraklat' : 'Oynat'); });
$('hiz').addEventListener('click', () => { M.speed = M.speed === 1 ? 2 : 1; $('hiz').textContent = `${M.speed}x`; });
$('atla').addEventListener('click', finish);
$('istAc').addEventListener('click', () => { const open = $('istPanel').classList.toggle('acik'); $('istAc').setAttribute('aria-expanded', String(open)); renderStats(); });
$('tekrarOyna').addEventListener('click', () => { $('son').hidden = true; $('kur').hidden = false; M = null; });
