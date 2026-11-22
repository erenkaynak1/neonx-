// Draft XI — match screen (design doc 9.1): vertical 2D pitch, commentary, live stats, 1x/2x, skip to result,
// goal replay + celebration. The engine computes the whole match first; this screen only plays it back.
import { HAVUZ } from '../data/havuz.mjs?v=3';
import { FORMATIONS } from '../engine/formations.mjs?v=2';
import { simulateMatch } from '../engine/match.mjs?v=4';
import { spikerLine, dakika } from './spiker.mjs?v=1';

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
const RATE = { 1: 22 * FAST, 2: 44 * FAST }; // match seconds per real second

function start() {
  const home = bestXI($('kA').value), away = bestXI($('kB').value);
  if (home.name === away.name) { away.name += ' (2)'; }
  const seed = (Date.now() % 100000) + 1;
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
    return { g, id: pl.id };
  }));
  M = { r, names: r.teams.map((t) => t.name), short, layers, discs, k: 0, u: 0, speed: 1, playing: true, score: [0, 0],
    live: { poss: [0, 0], shots: [0, 0], on: [0, 0], pass: [0, 0], passOk: [0, 0], corners: [0, 0], fouls: [0, 0], cards: [0, 0] },
    recent: [], last: performance.now(), busy: false };
  $('adA').textContent = M.names[0]; $('adB').textContent = M.names[1];
  $('sA').textContent = '0'; $('sB').textContent = '0'; $('dk').textContent = "1'"; $('spiker').innerHTML = '';
  $('kur').hidden = true; $('son').hidden = true; $('mac').hidden = false;
  $('oynat').textContent = '❚❚'; $('hiz').textContent = '1x';
  enterFrame(0); renderStats(); requestAnimationFrame(loop);
}

const frameDur = (k) => {
  const f = M.r.frames, a = f[k], b = f[k + 1];
  if (!b) return Infinity;
  return Math.min(2.2, Math.max(0.14 / FAST, (b.t - a.t) / 10 / RATE[M.speed]));
};
const ease = (u) => u * u * (3 - 2 * u);

function place(k, u) {
  const f = M.r.frames, a = f[k], b = f[Math.min(k + 1, f.length - 1)];
  const e = reduced() ? 1 : ease(u);
  for (let side = 0; side < 2; side++) M.discs[side].forEach((d, i) => {
    const p = a.p[side][i], q = b.p[side][i] || p;
    if (!p) { d.g.style.display = 'none'; return; }
    d.g.style.display = '';
    d.g.setAttribute('transform', `translate(${sx(p[0] + (q[0] - p[0]) * e)},${sy(p[1] + (q[1] - p[1]) * e)})`);
  });
  const bx = a.b[0] + (b.b[0] - a.b[0]) * e, by = a.b[1] + (b.b[1] - a.b[1]) * e;
  M.layers.ball.setAttribute('cx', sx(bx)); M.layers.ball.setAttribute('cy', sy(by));
}

function passLine(k) {
  const ev = M.r.events[k];
  if (!['pass', 'through', 'cross', 'pass_bad'].includes(ev.type)) return;
  const a = M.r.frames[k], b = M.r.frames[Math.min(k + 1, M.r.frames.length - 1)];
  const ln = el('line', { x1: sx(a.b[0]), y1: sy(a.b[1]), x2: sx(b.b[0]), y2: sy(b.b[1]), stroke: ev.team === 0 ? '#baff18' : '#2fe0ff',
    'stroke-width': ev.type === 'through' ? 5 : 3, 'stroke-dasharray': ev.type === 'pass_bad' ? '10 8' : '', opacity: 0.85, 'stroke-linecap': 'round' }, M.layers.lines);
  ln.animate?.([{ opacity: 0.85 }, { opacity: 0 }], { duration: 900, fill: 'forwards' });
  setTimeout(() => ln.remove(), 950);
}

function enterFrame(k) {
  M.k = k; M.u = 0;
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
  passLine(k);
  const line = spikerLine(ev, M.short, M.names);
  if (line) addLine(ev, line);
  if (ev.type === 'goal') goal(k, ev);
  if (k % 8 === 0) renderStats();
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
        const step = (now) => { const u = Math.min(1, (now - t0) / 650); place(i, u); if (u < 1) requestAnimationFrame(step); else res(); };
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

function loop(now) {
  if (!M || $('mac').hidden) return;
  if (M.playing && !M.busy) {
    const dt = (now - M.last) / 1000;
    M.u += dt / frameDur(M.k);
    while (M.u >= 1 && M.k < M.r.frames.length - 1 && !M.busy) { const carry = M.u - 1; enterFrame(M.k + 1); M.u = M.busy ? 0 : carry * 0.5; }
    if (M.k >= M.r.frames.length - 1) return finish();
    if (!M.busy) place(M.k, Math.min(1, M.u));
  }
  // holder label follows the ball
  M.layers.label.setAttribute('x', M.layers.ball.getAttribute('cx'));
  M.layers.label.setAttribute('y', Number(M.layers.ball.getAttribute('cy')) + 44);
  M.last = now;
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
