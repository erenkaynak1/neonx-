// Draft XI — match screen. Layers (see ui/mac/): durum (game state + stats + highlight reel), taktik (tactical engine),
// fizik (players and ball), yonetmen (engine events → actions), cizim (canvas). The match engine computes the whole
// match first; this screen plays its highlights in full with physical movement, and runs the clock between them.
import { HAVUZ, HAVUZ_BY_ID } from '../data/havuz-fm.mjs?v=1';
import { FORMATIONS } from '../engine/formations.mjs?v=2';
import { simulateMatch } from '../engine/match.mjs?v=6';
import { createSpiker, dakika } from './spiker.mjs?v=3';
import { PLANLAR, planTaktik } from './ortak.mjs?v=3';
import { buildState, createStats, highlights } from './mac/durum.mjs?v=2';
import { makeBody, makeBall, stepBody, stepBall, DT } from './mac/fizik.mjs?v=2';
import { basePositions } from './mac/taktik.mjs?v=2';
import { fromRel } from './mac/saha.mjs?v=2';
import { createDirector } from './mac/yonetmen.mjs?v=2';
import { createRenderer } from './mac/cizim.mjs?v=2';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const Q = new URLSearchParams(location.search);
const FAST = Q.has('hizli') ? 12 : 1;                 // test aid: ?hizli plays 12× faster
const RATE = { 1: 1.6, 2: 3.0 };                     // match seconds per real second inside a highlight
const TEXT_RATE = { 1: 60, 2: 120 };                 // commentary only: match seconds per real second (≈ 1.5 min a match)
// viewing modes: commentary only, key moments, long highlights
const MODES = {
  spiker: { ad: 'SADECE SPİKER', alt: 'Saha yok: dakika dakika anlatım ve canlı istatistik.', sure: '≈ 1,5 dk' },
  onemli: { ad: 'ÖNEMLİ ANLAR', alt: 'Goller, pozisyonlar ve kritik anlar sahada oynanır.', sure: '≈ 4 dk', budget: 560, lead: 6 },
  uzun: { ad: 'UZUN ÖZET', alt: 'Daha çok pozisyon, her atak kuruluşundan itibaren.', sure: '≈ 7 dk', budget: 1250, lead: 10 },
};
let izle = 'onemli';
try { if (MODES[localStorage.getItem('nxDraftIzle')]) izle = localStorage.getItem('nxDraftIzle'); } catch { /* default */ }
if (MODES[Q.get('izle')]) izle = Q.get('izle'); // test aid
const modeButtons = (sel) => Object.entries(MODES).map(([id, m]) => `<button type="button" data-izle="${id}" aria-pressed="${sel === id}"><b>${m.ad}</b><span>${m.alt}</span><small>${m.sure}</small></button>`).join('');
function drawModes() { $('izleSec').innerHTML = modeButtons(izle); }
drawModes();
$('izleSec').addEventListener('click', (e) => { const b = e.target.closest('[data-izle]'); if (!b) return; izle = b.dataset.izle; try { localStorage.setItem('nxDraftIzle', izle); } catch { /* ignore */ } drawModes(); });

// ── setup ──────────────────────────────────────────────────────────────────────────────────────────
const clubs = {};
for (const p of HAVUZ) (clubs[p.club] ||= []).push(p);
const bigClubs = Object.keys(clubs).filter((c) => clubs[c].length >= 15).sort((a, b) => a.localeCompare(b, 'tr'));
$('kA').innerHTML = $('kB').innerHTML = bigClubs.map((c) => `<option>${esc(c)}</option>`).join('');
$('pA').innerHTML = $('pB').innerHTML = PLANLAR.map(([id, ad]) => `<option value="${id}">${ad}</option>`).join('');
$('kA').value = bigClubs.includes('Galatasaray') ? 'Galatasaray' : bigClubs[0];
$('kB').value = bigClubs.includes('Fenerbahçe') ? 'Fenerbahçe' : bigClubs[1];
if (Q.get('pA')) $('pA').value = Q.get('pA');
if (Q.get('pB')) $('pB').value = Q.get('pB');
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
function fromDraft() {
  if (!Q.has('draft')) return null;
  try {
    const d = JSON.parse(sessionStorage.getItem('draftxi-mac') || 'null');
    if (!d) return null;
    const sq = (t) => ({ name: t.name, formation: t.formation, players: Object.fromEntries(Object.entries(t.slots).map(([s, id]) => [s, HAVUZ_BY_ID[id]])) });
    const home = sq(d.home), away = sq(d.away);
    if (Object.values(home.players).some((p) => !p) || Object.values(away.players).some((p) => !p)) return null;
    return { home, away, tacA: d.home.tactic || planTaktik(d.home.plan), tacB: d.away.tactic || planTaktik(d.away.plan) };
  } catch { return null; }
}
// classic shirt numbers by slot
const NUM = { GK: 1, RB: 2, RWB: 2, LB: 3, LWB: 3, RCB: 4, CB: 5, LCB: 5, DM: 6, LDM: 6, RDM: 8, RW: 7, RM: 7, RCM: 8, CM: 8, ST: 9, LST: 9, RST: 11, LCM: 10, AM: 10, LAM: 10, RAM: 7, LW: 11, LM: 11 };

// ── match ──────────────────────────────────────────────────────────────────────────────────────────
let M = null;
function start(given) {
  const home = given?.home || bestXI($('kA').value), away = given?.away || bestXI($('kB').value);
  if (home.name === away.name) away.name += ' (2)';
  const fixed = Number(Q.get('tohum'));
  const seed = fixed > 0 ? fixed : (Date.now() % 100000) + 1;
  const r = simulateMatch({ home, away, seed, tacticHome: given?.tacA || planTaktik($('pA').value), tacticAway: given?.tacB || planTaktik($('pB').value), frames: true });
  const S = buildState(r);
  const short = (id) => { const n = HAVUZ_BY_ID[id]?.name || id; const parts = n.split(' '); return parts.length > 1 && n.length > 13 ? parts.slice(-1)[0] : n; };
  // world: one physics body per player, starting from the engine's first positions
  const W = {
    lineup: S.lineup, tactic: S.tactic, time: 0, minute: 0, k: 0,
    base: S.lineup.map((list, s) => basePositions(r.teams[s].formation, list)),
    bodies: S.lineup.map((list, s) => list.map((pl, i) => {
      const p = HAVUZ_BY_ID[pl.id], bp = basePositions(r.teams[s].formation, list)[i].def;
      const q = S.F[0].p[s][i] || fromRel(s, bp.u, Math.min(bp.v * 0.85, 47));   // kick-off shape until the engine places them
      return makeBody({ x: q.x, y: q.y, pac: p?.attrs?.pac ?? 70, age: p?.age ?? 26, gk: pl.mevki === 'GK' });
    })),
    ball: makeBall(),
  };
  const komik = $('komik').checked;
  try { localStorage.setItem('nxDraftKomik', komik ? '1' : '0'); } catch { /* ignore */ }
  M = { r, S, W, seed, short, names: S.names, stats: createStats(S), spiker: createSpiker(r, short, S.names, { jokes: komik, seed }),
    view: izle, reel: izle === 'spiker' ? [] : highlights(S, { budget: MODES[izle].budget, lead: MODES[izle].lead }), hi: -1, tt: 0, mode: 'cut', cutT: 0, cutFrom: 0, playing: true, speed: 1, score: [0, 0],
    acc: 0, last: performance.now(), dim: 0, recent: [], shown: -1 };
  M.render = createRenderer($('saha'), W, {
    number: (s, i) => String(NUM[S.lineup[s][i].slot] ?? ''),
    name: ([s, i]) => short(S.lineup[s][i].id),
    get dim() { return M.dim; },
    get flip() { return M.flip; },
  });
  M.dir = createDirector(S, W, { event: (k) => onEvent(k, false), goal: onGoal, cue: onCue, reshape: () => { W.base = S.lineup.map((list, s) => basePositions(r.teams[s].formation, list)); } });
  $('adA').textContent = M.names[0]; $('adB').textContent = M.names[1];
  $('sA').textContent = '0'; $('sB').textContent = '0'; $('dk').textContent = "1'"; $('spiker').innerHTML = '';
  $('kur').hidden = true; $('son').hidden = true; $('mac').hidden = false;
  $('oynat').textContent = '❚❚'; $('hiz').textContent = '1x';
  window.__draftMac = M; // inspection aid for tests
  M.render.resize();
  renderStats();
  $('mac').classList.toggle('yalniz-spiker', izle === 'spiker');
  if (izle === 'spiker') { M.mode = 'text'; requestAnimationFrame(loop); return; }
  if (Number(Q.get('an')) > 0) M.hi = Math.min(M.reel.length - 1, Number(Q.get('an'))) - 1; // test aid: ?an=N starts at highlight N
  nextHighlight();
  requestAnimationFrame(loop);
}

// between highlights: the pitch dims, the clock runs, skipped events still count (stats, commentary of note)
function nextHighlight() {
  M.hi++;
  const h = M.reel[M.hi];
  if (!h) return finish();
  M.mode = 'cut'; M.cutT = 0; M.cutPlayed = false;
  M.cutFrom = M.stats.done >= 0 ? M.S.E[M.stats.done].t : 0;
  M.cutTo = M.S.E[h.a].t;
  for (let k = M.stats.done + 1; k < h.a; k++) onEvent(k, true);
  M.cutDur = M.hi === 0 ? 0.6 : Math.min(1.4, 0.7 + (M.cutTo - M.cutFrom) / 6000);
  $('ozet').hidden = M.hi === 0;
  $('ozet').textContent = M.hi === 0 ? '' : dakika(M.cutTo);
}
// the cut happens while the pitch is darkest: the players are already in the next highlight's positions when it clears
function playHighlight() {
  const h = M.reel[M.hi];
  M.cutPlayed = true;
  M.dir.play(h, () => { onEvent(h.b, false); nextHighlight(); });
}

// ── events: stats, clock, commentary, on-pitch cues ──
function onEvent(k, silent) {
  if (k <= M.shown) return;
  for (let j = M.shown + 1; j <= k; j++) {
    const ev = M.S.E[j];
    M.stats.add(j);
    if (ev.type === 'half_time') M.flip = true;   // teams change ends
    if (ev.team != null) { M.recent.push(M.S.poss[j]); if (M.recent.length > 40) M.recent.shift(); }
    const lines = M.spiker(ev, j).reverse();
    for (const line of lines) if (!(silent || j < k) || line.kind !== 'build') addLine(ev, line);
    if (ev.type === 'goal' && (silent || j < k)) scoreGoal(ev);   // goals passed in a cut still count
    if (!silent && j === k) {
      if (['pass', 'through', 'cross', 'pass_bad', 'clear'].includes(ev.type)) {
        const a = M.S.F[j].b, b = (M.S.F[j + 1] || M.S.F[j]).b;
        M.render.cue({ kind: 'line', a, b, color: ev.team === 0 ? 'rgba(186,255,24,.9)' : 'rgba(47,224,255,.9)', dash: ev.type === 'pass_bad', life: 1.1 });
      }
      if (ev.type === 'foul' && ev.card === 'red') toast('KIRMIZI KART', 'red');
      else if (ev.type === 'foul' && ev.card === 'yellow') toast('SARI KART', 'yel');
    }
  }
  M.shown = k;
  const ev = M.S.E[k];
  $('dk').textContent = dakika(ev.t);
  M.W.minute = ev.t / 600;
  const sh = M.recent.length ? M.recent.filter((x) => x === 0).length / M.recent.length : 0.5;
  $('baski').style.width = `${Math.round(sh * 100)}%`;
  if (k % 6 === 0 || silent || M.mode === 'text') renderStats();   // commentary only: the stats are on screen, keep them live
}
function scoreGoal(ev) {
  if (M.scored?.has(ev.t + ':' + ev.p)) return;
  (M.scored ||= new Set()).add(ev.t + ':' + ev.p);
  M.score[ev.team]++;
  $('sA').textContent = M.score[0]; $('sB').textContent = M.score[1];
}
function onGoal(k) {
  onEvent(k, false);
  const ev = M.S.E[k];
  scoreGoal(ev);
  renderStats();
  $('kutlamaAd').textContent = `${M.short(ev.p)} · ${M.names[ev.team]}`;
  $('kutlama').className = 'kutlama' + (ev.team === 1 ? ' b' : '');
  $('kutlama').hidden = false;
  try { navigator.vibrate?.([60, 40, 60]); } catch { /* ignore */ }
  setTimeout(() => { $('kutlama').hidden = true; }, reduced() ? 900 : 2200 / FAST);
}
function onCue(c) {
  if (c.kind === 'save') toast('KURTARIŞ!');
  else if (c.kind === 'post') toast('DİREK!');
  else if (c.kind === 'offside') toast('OFSAYT', 'yel');
  else if (c.kind === 'block') toast('BLOK!');
  else if (c.kind === 'net') M.render.cue({ kind: 'net', y: M.W.ball.y, life: 1.4 });
  else if (c.kind === 'whistle' && !c.card) toast('FAUL');
}
function toast(text, tone = '') {
  if (reduced()) return;
  const t = $('anlik');
  t.textContent = text; t.className = 'anlik ' + tone; t.hidden = false;
  clearTimeout(toast.h); toast.h = setTimeout(() => { t.hidden = true; }, 1200 / FAST);
}
function addLine(ev, { kind, text }) {
  const li = document.createElement('li');
  li.className = kind + (kind === 'goal' && ev.team === 1 ? ' b' : '');
  li.innerHTML = `<time>${dakika(ev.t)}</time><span>${esc(text)}</span>`;
  $('spiker').prepend(li);
  while ($('spiker').children.length > 80) $('spiker').lastElementChild.remove();
}

// ── loop: fixed physics steps, rendering at the display rate ──
function loop(now) {
  if (!M || $('mac').hidden) return;
  const real = Math.min(0.1, (now - M.last) / 1000);
  M.last = now;
  if (M.playing && M.mode === 'text') {
    // commentary only: the clock runs, every event is told as it happens
    M.tt += real * TEXT_RATE[M.speed] * FAST;
    const E = M.S.E;
    let k = M.shown + 1;
    while (k < E.length && E[k].t / 10 <= M.tt) {
      if (E[k].type === 'goal') onGoal(k); else onEvent(k, false);
      k++;
    }
    if (M.mode === 'text') $('dk').textContent = dakika(Math.min(M.tt * 10, E[E.length - 1].t));
    if (k >= E.length) { finish(); return; }
    requestAnimationFrame(loop);
    return;
  }
  if (M.playing) {
    if (M.mode === 'cut') {
      M.cutT += real * FAST;
      const u = Math.min(1, M.cutT / M.cutDur);
      M.dim = M.hi === 0 ? 0 : Math.sin(Math.PI * u) * 0.75;
      $('dk').textContent = dakika(M.cutFrom + (M.cutTo - M.cutFrom) * u);
      if (!M.cutPlayed && (u >= 0.5 || M.hi === 0)) playHighlight();
      if (u >= 1) { M.dim = 0; M.mode = 'play'; $('ozet').hidden = true; }
    } else {
      M.acc += real * RATE[M.speed] * FAST * (M.dir.hurry ? 2.6 : 1);   // dead time runs faster
      let n = 0;
      while (M.acc >= DT && n < 400) {
        M.acc -= DT; n++;
        M.W.time += DT;
        M.dir.step(DT);
        const W = M.W;
        for (const team of W.bodies) for (const b of team) if (b) stepBody(b, DT, W.minute);
        stepBall(W.ball, DT, ([s, i]) => W.bodies[s][i]);
        if (M.mode !== 'play') break;   // a highlight ended inside this frame: the cut takes over
      }
    }
  }
  if (M.mode !== 'text') M.render.draw(M.mode === 'play' ? Math.min(1, M.acc / DT) : 1);
  requestAnimationFrame(loop);
}

// ── stats ──────────────────────────────────────────────────────────────────────────────────────────
// short labels for the narrow stats column on phones
const KISA = { 'Topla oynama': 'Top %', 'İsabetli şut': 'İsabetli', 'Pas isabeti': 'Pas %', 'Başarılı çalım': 'Çalım', 'Top kazanma': 'Kazanma', 'Kurtarış': 'Kurtarış' };
function statRows(T) {
  const p = T[0].possession + T[1].possession || 1;
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–');
  const rows = [
    ['Topla oynama', `${Math.round((T[0].possession / p) * 100)}%`, `${Math.round((T[1].possession / p) * 100)}%`, T[0].possession, T[1].possession],
    ['Şut', T[0].shots, T[1].shots], ['İsabetli şut', T[0].onTarget, T[1].onTarget],
    ['Pas', T[0].passes, T[1].passes], ['Pas isabeti', pct(T[0].passesOk, T[0].passes), pct(T[1].passesOk, T[1].passes), T[0].passesOk, T[1].passesOk],
    ['Başarılı çalım', T[0].dribbles, T[1].dribbles], ['Top kazanma', T[0].wins, T[1].wins],
    ['Kurtarış', T[0].saves, T[1].saves], ['Korner', T[0].corners, T[1].corners], ['Ofsayt', T[0].offsides, T[1].offsides],
    ['Faul', T[0].fouls, T[1].fouls], ['Kart', T[0].yellows + T[0].reds, T[1].yellows + T[1].reds],
  ];
  return rows.map(([ad, a, b, va = a, vb = b]) => {
    const t = (Number(va) || 0) + (Number(vb) || 0) || 1;
    return `<div class="st"><span>${a}</span><em><i class="uzun">${ad}</i><i class="kisa">${KISA[ad] || ad}</i></em><span>${b}</span><div class="bar"><i style="width:${((Number(va) || 0) / t) * 100}%"></i><u style="width:${((Number(vb) || 0) / t) * 100}%"></u></div></div>`;
  }).join('');
}
const renderStats = () => { $('ist').innerHTML = statRows(M.stats.T); };

function finish() {
  if (!M) return;
  M.playing = false;
  M.stats.add(M.S.E.length - 1);
  for (let k = M.shown + 1; k < M.S.E.length; k++) if (M.S.E[k].type === 'goal') scoreGoal(M.S.E[k]);
  const r = M.r, P = M.stats.P;
  $('sonSkor').innerHTML = `<span class="a">${esc(M.names[0])}</span><strong>${r.score[0]} – ${r.score[1]}</strong><span class="b">${esc(M.names[1])}</span>`;
  $('sonIst').innerHTML = `<h2>İSTATİSTİK</h2>${statRows(M.stats.T)}`;
  const all = r.ratings.flatMap((list, side) => list.map((x) => ({ ...x, side }))).sort((a, b) => b.rating - a.rating);
  const line = (x) => { const s = P[x.id] || {}; const bits = [s.goals ? `${s.goals} gol` : '', s.assists ? `${s.assists} asist` : '', s.shots ? `${s.shots} şut` : '', s.passes ? `pas %${Math.round(((s.passesOk || 0) / s.passes) * 100)}` : '', s.wins ? `${s.wins} top kazanma` : '', s.saves ? `${s.saves} kurtarış` : ''].filter(Boolean).join(' · '); return bits; };
  $('sonPuan').innerHTML = `<h2>OYUNCULAR</h2>${all.map((x) => `<div class="puan${x.id === r.motm.id ? ' motm' : ''}"><span style="color:${x.side ? 'var(--b)' : 'var(--a)'}">${x.id === r.motm.id ? '★ ' : ''}${esc(M.short(x.id))}<small>${esc(line(x))}</small></span><b>${x.rating.toFixed(1)}</b></div>`).join('')}`;
  $('mac').hidden = true; $('son').hidden = false;
  window.scrollTo(0, 0);
}

// ── controls ───────────────────────────────────────────────────────────────────────────────────────
$('basla').addEventListener('click', () => start());
$('oynat').addEventListener('click', () => { M.playing = !M.playing; M.last = performance.now(); $('oynat').textContent = M.playing ? '❚❚' : '▶'; $('oynat').setAttribute('aria-label', M.playing ? 'Duraklat' : 'Oynat'); });
$('hiz').addEventListener('click', () => { M.speed = M.speed === 1 ? 2 : 1; $('hiz').textContent = `${M.speed}x`; });
$('atla').addEventListener('click', finish);
$('istAc').addEventListener('click', () => { const open = $('istPanel').classList.toggle('acik'); $('istAc').setAttribute('aria-expanded', String(open)); renderStats(); });
$('tekrarOyna').addEventListener('click', () => {
  if (Q.has('draft')) { location.href = './draft.html'; return; }
  $('son').hidden = true; $('kur').hidden = false; M = null;
});
// coming from the draft: ask how to watch, then kick off
{
  const d = fromDraft();
  if (d) {
    $('tekrarOyna').textContent = 'YENİ DRAFT';
    if (Q.get('izle')) start(d);
    else {
      $('kur').hidden = true; $('izleme').hidden = false;
      $('izlemeAlt').textContent = `${d.home.name} – ${d.away.name}`;
      $('izleBuyuk').innerHTML = modeButtons(izle);
      $('izleBuyuk').addEventListener('click', (e) => {
        const b = e.target.closest('[data-izle]'); if (!b) return;
        izle = b.dataset.izle; try { localStorage.setItem('nxDraftIzle', izle); } catch { /* ignore */ }
        $('izleme').hidden = true; start(d);
      });
    }
  }
}
