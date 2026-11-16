/* NEON XI — Saha Fethi (conquest trivia). Prototype: one human + bots on the Turkey map.
   Phase 1 (land grab): everyone answers the same estimate question; the closest picks a free region next to
   their land, the second closest picks next. Phase 2 (battle): on your turn attack a neighbouring region; both
   sides answer one multiple-choice question; if both are right the open-ended follow-up decides (closest wins).
   A base has 3 towers; taking the last one takes the whole empire. Most regions after the battle rounds wins.
   Data: data/map-tr.json (build_fethet_map.py), data/questions.json (build_fethet_questions.py). */
(() => {
  'use strict';
  const app = document.getElementById('app');
  const COLORS = ['#baff18', '#00eaff', '#ff8a3d', '#a77bff'];
  const BOT_NAMES = ['Kaptan Bot', 'Libero Bot', 'Forvet Bot'];
  const LEVEL = { easy: { acc: 0.45, spread: 0.45 }, normal: { acc: 0.62, spread: 0.28 }, hard: { acc: 0.78, spread: 0.15 } };
  const T_MC = 20, T_EST = 25, BATTLE_ROUNDS = 3, TOWERS = 3;
  // Club colours for our own representative crests (no real logos: those are trademarks).
  const CLUB_COLORS = {
    Galatasaray: ['#a90432', '#fdb912'], Fenerbahçe: ['#163962', '#ffed00'], Beşiktaş: ['#111111', '#ffffff'], Başakşehir: ['#f37021', '#0a2240'],
    Trabzonspor: ['#6d1f3b', '#79bce7'], Bursaspor: ['#007a3d', '#ffffff'], Göztepe: ['#f2c700', '#c8102e'], Kocaelispor: ['#007a3d', '#111111'],
    Eskişehirspor: ['#c8102e', '#111111'], Antalyaspor: ['#e30613', '#ffffff'], 'Mersin İdmanyurdu': ['#c8102e', '#003da5'],
    'Adana Demirspor': ['#00a3e0', '#003b71'], Hatayspor: ['#7a1f2b', '#ffffff'], Ankaragücü: ['#003da5', '#ffd200'], Gençlerbirliği: ['#c8102e', '#111111'],
    Konyaspor: ['#007a3d', '#ffffff'], Kayserispor: ['#e30613', '#ffd200'], Sivasspor: ['#e30613', '#ffffff'], Samsunspor: ['#e30613', '#ffffff'],
    Rizespor: ['#007a3d', '#003da5'], Erzurumspor: ['#003da5', '#ffffff'], Malatyaspor: ['#ffd200', '#111111'], Gaziantep: ['#e30613', '#111111'],
    Amedspor: ['#007a3d', '#e30613'], Vanspor: ['#003da5', '#e30613'], Balıkesirspor: ['#e30613', '#ffffff'], Denizlispor: ['#007a3d', '#111111']
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('tr-TR');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];

  const S = { map: null, bank: null, byId: {}, players: [], owner: {}, used: new Set(), phase: 'menu', log: [], level: 'normal', count: 3, name: 'Sen' };

  /* ---------- crest: our own shield (club colours + initials) ---------- */
  function initials(club) {
    const fixed = { Galatasaray: 'GS', Fenerbahçe: 'FB', Beşiktaş: 'BJK', Trabzonspor: 'TS', Başakşehir: 'İBFK', 'Adana Demirspor': 'ADS', 'Mersin İdmanyurdu': 'MİY', Gençlerbirliği: 'GB' };
    if (fixed[club]) return fixed[club];
    return club.replace(/spor$/i, '').slice(0, 3).toLocaleUpperCase('tr-TR');
  }
  function crest(club, size = 30) {
    const [a, b] = CLUB_COLORS[club] || ['#2a3138', '#baff18'];
    const t = initials(club);
    return `<svg class="fx-crest" viewBox="0 0 40 46" width="${size}" height="${size * 1.15}" aria-hidden="true">
      <defs><clipPath id="cs${t}"><path d="M20 1 38 7v16c0 11-8 18-18 22C10 41 2 34 2 23V7z"/></clipPath></defs>
      <g clip-path="url(#cs${t})"><rect width="40" height="46" fill="${a}"/><rect x="20" width="20" height="46" fill="${b}"/></g>
      <path d="M20 1 38 7v16c0 11-8 18-18 22C10 41 2 34 2 23V7z" fill="none" stroke="#05070a" stroke-width="2.4"/>
      <text x="20" y="${t.length > 3 ? 27 : 28}" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="900"
        font-size="${t.length > 3 ? 10 : t.length > 2 ? 12 : 15}" fill="#fff" stroke="#05070a" stroke-width="2.6" paint-order="stroke">${esc(t)}</text></svg>`;
  }

  /* ---------- data ---------- */
  async function load() {
    const [map, bank, art] = await Promise.all([fetch('./data/map-tr.json').then(r => r.json()), fetch('./data/questions.json').then(r => r.json()),
      fetch('./assets/map-art.json').then(r => r.json()).catch(() => null)]);
    S.map = map; S.bank = bank.questions; S.artVB = art?.viewBox || map.viewBox;
    map.regions.forEach(r => { S.byId[r.id] = r; });
  }
  const regionsOf = i => S.map.regions.filter(r => S.owner[r.id] === i).map(r => r.id);
  const free = () => S.map.regions.filter(r => S.owner[r.id] == null).map(r => r.id);
  const alive = () => S.players.filter(p => p.alive);

  function question(kind, region) {
    let pool = S.bank.filter(q => !S.used.has(q.id) && (kind === 'estimate' ? q.type === 'estimate' : q.type !== 'estimate'));
    if (kind === 'estimate') pool = pool.filter(q => q.difficulty !== 'hard' || Math.random() < 0.25);
    if (region && Math.random() < 0.55) {
      const themed = pool.filter(q => (q.clubs || []).some(c => region.clubs.includes(c)));
      if (themed.length) pool = themed;
    }
    if (kind === 'mc') {  // career path is the favourite: weight it
      const career = pool.filter(q => q.type === 'career' && q.difficulty !== 'hard');
      if (career.length && Math.random() < 0.45) pool = career;
    }
    const q = pickOne(pool.length ? pool : S.bank.filter(q => kind === 'estimate' ? q.type === 'estimate' : q.type !== 'estimate'));
    S.used.add(q.id);
    return q;
  }

  /* ---------- bots ---------- */
  function botEstimate(truth) {
    const { spread } = LEVEL[S.level];
    const v = truth * (1 + (Math.random() * 2 - 1) * spread * rnd(0.3, 1.2));
    return Math.max(0, Math.round(v));
  }
  function botChoice(q) {
    const { acc } = LEVEL[S.level];
    const bonus = q.difficulty === 'easy' ? 0.12 : q.difficulty === 'hard' ? -0.12 : 0;
    return Math.random() < acc + bonus ? q.answer : pickOne(q.options.filter(o => o !== q.answer));
  }

  /* ---------- screens ---------- */
  function renderMenu() {
    S.phase = 'menu';
    app.innerHTML = `<header class="fx-top"><a class="fx-back" href="../index.html" aria-label="Yan oyunlar">‹</a><div class="fx-brand"><small>NEON XI · SIDE GAME</small><h1>SAHA <i>FETHİ</i></h1></div></header>
      <section class="fx-hero">
        <p class="fx-lead">Türkiye haritasında futbol bilginle şehir fethet. Tahmin sorusuyla toprak kap, savaşta rakibin şehrine saldır, kariyer yollarını çöz ve ana stadyumunu koru.</p>
        <label class="fx-field"><span>ADIN</span><input id="fxName" maxlength="16" value="${esc(S.name)}"></label>
        <div class="fx-seg" role="group" aria-label="Oyuncu sayısı"><span>OYUNCU</span>${[2, 3, 4].map(n => `<button type="button" data-count="${n}" class="${S.count === n ? 'on' : ''}">${n}</button>`).join('')}</div>
        <div class="fx-seg" role="group" aria-label="Bot seviyesi"><span>BOTLAR</span>${[['easy', 'KOLAY'], ['normal', 'NORMAL'], ['hard', 'ZOR']].map(([k, l]) => `<button type="button" data-level="${k}" class="${S.level === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <button type="button" class="fx-play" id="fxPlay">MAÇA BAŞLA</button>
        <ul class="fx-rules"><li><b>1. Yerleşme:</b> tahmin sorusunda en yakın olan önce şehir seçer.</li><li><b>2. Savaş:</b> komşu şehre saldır; ikiniz de bilirseniz ek soruda en yakın kazanır.</li><li><b>Ana stadyum:</b> 3 kalesi var; son kale düşerse tüm toprakları gider.</li></ul>
      </section>`;
    app.querySelectorAll('[data-count]').forEach(b => b.onclick = () => { S.count = +b.dataset.count; renderMenu(); });
    app.querySelectorAll('[data-level]').forEach(b => b.onclick = () => { S.level = b.dataset.level; renderMenu(); });
    document.getElementById('fxPlay').onclick = () => { S.name = (document.getElementById('fxName').value || 'Sen').trim().slice(0, 16); start(); };
  }

  function start() {
    S.owner = {}; S.used = new Set(); S.log = [];
    const bases = S.map.starts[String(S.count)];
    S.players = bases.map((base, i) => ({ id: i, name: i === 0 ? S.name : BOT_NAMES[i - 1], bot: i > 0, color: COLORS[i], base, towers: TOWERS, alive: true }));
    S.map.regions.forEach(r => { S.owner[r.id] = null; });
    S.players.forEach(p => { S.owner[p.base] = p.id; });
    S.phase = 'grab';
    renderBoard();
    grabLoop();
  }

  /* ---------- board ---------- */
  function renderBoard(highlight = [], onPick = null) {
    const m = S.map;
    const counts = S.players.map(p => regionsOf(p.id).length);
    app.innerHTML = `<header class="fx-hud">${S.players.map((p, i) => `<div class="fx-pl${p.alive ? '' : ' out'}${S.turnIdx === i ? ' turn' : ''}" style="--c:${p.color}"><b>${esc(p.name)}</b><span>${counts[i]} şehir · ${'●'.repeat(p.towers)}${'○'.repeat(TOWERS - p.towers)}</span></div>`).join('')}</header>
      <div class="fx-phase" id="fxPhase">${S.phase === 'grab' ? 'YERLEŞME' : S.phase === 'battle' ? `SAVAŞ · TUR ${Math.min(S.round, BATTLE_ROUNDS)}/${BATTLE_ROUNDS}` : 'MAÇ SONU'}</div>
      <div class="fx-mapwrap"><div class="fx-stage"><img class="fx-art" src="./assets/map-art.webp?v=20261116-art2" alt="" draggable="false">
      <svg class="fx-map" viewBox="${S.artVB.join(' ')}" role="img" aria-label="Türkiye haritası">
        ${m.regions.map(r => {
          const o = S.owner[r.id], p = o == null ? null : S.players[o], hl = highlight.includes(r.id);
          return `<path class="fx-reg${p ? ' own' : ''}${hl ? ' hl' : ''}" data-id="${r.id}" d="${r.path}" style="--c:${p ? p.color : '#baff18'}"/>`;
        }).join('')}
        ${m.regions.map(r => {
          const isBase = S.players.find(p => p.base === r.id && p.alive);
          const [x, y] = r.label;
          return `<g class="fx-lbl" transform="translate(${x},${y})">${isBase ? `<g transform="translate(-13,-44)">${crest(r.clubs[0], 26)}</g><text class="fx-tw" y="-48">${'♜'.repeat(isBase.towers)}</text>` : ''}<text y="4">${esc(r.name)}</text></g>`;
        }).join('')}
        <g id="fxFx"></g>
      </svg></div></div>
      <p class="fx-panhint">Haritayı kaydırmak için sağa-sola sürükle</p>
      <div class="fx-msg" id="fxMsg" role="status"></div>`;
    // Keep the playable regions in view on phones (the map is wider than the screen there).
    const wrap = app.querySelector('.fx-mapwrap'), first = app.querySelector('.fx-reg.hl');
    if (wrap && first && wrap.scrollWidth > wrap.clientWidth) {
      const r = first.getBBox(), k = wrap.scrollWidth / S.artVB[2];
      wrap.scrollLeft = Math.max(0, (r.x - S.artVB[0] + r.width / 2) * k - wrap.clientWidth / 2);
    }
    if (onPick) app.querySelectorAll('.fx-reg.hl').forEach(el => el.addEventListener('click', () => onPick(el.dataset.id)));
  }
  const say = html => { const el = document.getElementById('fxMsg'); if (el) el.innerHTML = html; };

  /* ---------- animations ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fxLayer = () => document.getElementById('fxFx');
  function svgEl(tag, attrs = {}, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  const ease = t => 1 - Math.pow(1 - t, 3);
  function tween(ms, step) {
    return new Promise(res => {
      if (reduced()) { step(1); res(); return; }
      const t0 = performance.now();
      const f = now => { const t = Math.min(1, (now - t0) / ms); step(t); if (t < 1) requestAnimationFrame(f); else res(); };
      requestAnimationFrame(f);
    });
  }
  const centerOf = id => S.byId[id].label;
  function originFor(attIdx, target) {
    const mine = regionsOf(attIdx).filter(id => S.byId[target].neighbors.includes(id));
    return mine[0] || S.players[attIdx].base;
  }
  function popText(x, y, text, color, size) {
    const g = svgEl('g', { class: 'fx-pop' }, fxLayer());
    const t = svgEl('text', { x, y, 'font-size': size, fill: color }, g); t.textContent = text;
    t.animate([{ transform: 'translateY(8px) scale(.4)', opacity: 0 }, { transform: 'translateY(-6px) scale(1.18)', opacity: 1 }, { transform: 'translateY(-8px) scale(1)', opacity: 1 }],
      { duration: 520, fill: 'forwards', easing: 'cubic-bezier(.2,.8,.2,1)' });
    return g;
  }
  function burst(x, y, colors, n = 16) {
    const L = fxLayer(), out = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 50;
      const c = svgEl('circle', { cx: x, cy: y, r: 3.6, fill: colors[i % colors.length] }, L); out.push(c);
      c.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px)`, opacity: 0 }], { duration: 700, fill: 'forwards', easing: 'ease-out' });
    }
    return out;
  }
  // A captured region: colour ripples out from the city and a flag drops in.
  async function animCapture(id, color) {
    const L = fxLayer(); if (!L) return;
    const r = S.byId[id], [x, y] = r.label;
    const clip = svgEl('clipPath', { id: 'fxclip' + id }, L); svgEl('path', { d: r.path }, clip);
    const wave = svgEl('circle', { cx: x, cy: y, r: 0, fill: color, opacity: .5, 'clip-path': `url(#fxclip${id})` }, L);
    const ring = svgEl('circle', { cx: x, cy: y, r: 0, fill: 'none', stroke: color, 'stroke-width': 3, 'clip-path': `url(#fxclip${id})` }, L);
    const flag = svgEl('g', { transform: `translate(${x},${y - 8})` }, L);
    const flagIn = svgEl('g', { transform: 'scale(1.6)' }, flag);
    svgEl('line', { x1: 0, y1: 0, x2: 0, y2: -26, stroke: '#e8edf1', 'stroke-width': 2 }, flagIn);
    svgEl('path', { d: 'M0-26l16 5-16 5z', fill: color }, flagIn);
    flagIn.animate([{ transform: 'translateY(-50px)', opacity: 0 }, { transform: 'translateY(3px)', opacity: 1 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 420, fill: 'forwards', easing: 'cubic-bezier(.2,.8,.2,1)' });
    await tween(600, t => { wave.setAttribute('r', ease(t) * 150); ring.setAttribute('r', ease(t) * 150); ring.setAttribute('opacity', String(1 - t)); });
    await sleep(reduced() ? 80 : 240);
    [wave, ring, flag, clip].forEach(e => e.remove());
  }
  async function animTower(id) {
    const [x, y] = S.byId[id].label;
    const L = fxLayer(); if (!L) return;
    const t = svgEl('text', { x, y: y - 48, class: 'fx-twfall', 'font-size': 18, fill: '#ff7a8a', 'text-anchor': 'middle' }, L); t.textContent = '♜';
    await t.animate([{ transform: 'translate(0,0) rotate(0)' }, { transform: 'translate(-3px,0) rotate(-8deg)' }, { transform: 'translate(3px,0) rotate(8deg)' }, { transform: 'translate(6px,22px) rotate(40deg)', opacity: 0 }],
      { duration: 700, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
    burst(x, y - 30, ['#ff7a8a', '#fff'], 10).forEach(c => setTimeout(() => c.remove(), 750));
    t.remove();
  }
  async function animEmpire(ids, color) {
    const L = fxLayer(); if (!L) return;
    const [x, y] = S.byId[ids[0]].label;
    const shock = svgEl('circle', { cx: x, cy: y, r: 0, fill: 'none', stroke: color, 'stroke-width': 6 }, L);
    tween(950, t => { shock.setAttribute('r', ease(t) * 320); shock.setAttribute('opacity', String(1 - t)); }).then(() => shock.remove());
    const runs = ids.map((id, i) => sleep(reduced() ? 0 : i * 130).then(() => animCapture(id, color)));
    await Promise.all(runs);
  }
  async function banner(title, sub = '') {
    const el = document.createElement('div'); el.className = 'fx-banner';
    el.innerHTML = `<div><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</div>`;
    document.body.appendChild(el); await sleep(reduced() ? 700 : 1700); el.remove();
  }
  // Estimate result: every answer slides onto a number line, the correct value drops in last.
  function numberLine(answers, truth) {
    const given = answers.filter(a => a.v != null);
    const vals = given.map(a => a.v).concat(truth);
    let lo = Math.min(...vals), hi = Math.max(...vals); if (hi === lo) { hi += 1; lo -= 1; }
    const pad = (hi - lo) * 0.1, pos = v => ((v - lo + pad) / (hi - lo + pad * 2) * 100).toFixed(1);
    return `<div class="fx-line"><i class="fx-axis"></i>
      ${given.map((a, i) => `<span class="fx-mark" style="--x:${pos(a.v)}%;--c:${a.p.color};--d:${i * 140}ms"><em>${esc(a.p.name.split(' ')[0])}</em></span>`).join('')}
      <span class="fx-truth" style="--x:${pos(truth)}%;--d:${given.length * 140 + 200}ms"><b>${nf.format(truth)}</b></span></div>`;
  }
  function confetti() {
    if (reduced()) return;
    const box = document.createElement('div'); box.className = 'fx-confetti';
    for (let i = 0; i < 90; i++) {
      const c = document.createElement('i');
      c.style.cssText = `left:${Math.random() * 100}%;--c:${COLORS[i % 4]};--d:${(Math.random() * 1.2).toFixed(2)}s;--x:${((Math.random() - .5) * 160).toFixed(0)}px;--r:${(Math.random() * 720).toFixed(0)}deg;--t:${(2.2 + Math.random() * 1.6).toFixed(2)}s`;
      box.appendChild(c);
    }
    document.body.appendChild(box); setTimeout(() => box.remove(), 4500);
  }

  /* ---------- question overlay (resolves with the human's answer) ---------- */
  function ask(q, opts = {}) {
    return new Promise(resolve => {
      const est = q.type === 'estimate' || opts.followUp;
      const qq = opts.followUp || q;
      const el = document.createElement('div'); el.className = 'fx-q';
      const head = opts.title ? `<small class="fx-qt">${esc(opts.title)}</small>` : '';
      const body = q.type === 'career' && !opts.followUp
        ? `<div class="fx-path">${q.path.map(c => `<span>${esc(c)}</span>`).join('<i>→</i>')}</div><b class="fx-qq">${esc(q.q)}</b>`
        : `<b class="fx-qq">${esc(qq.q)}</b>`;
      const input = est
        ? `<form class="fx-est" id="fxEst"><input id="fxNum" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="Tahminin" aria-label="Tahminin">${qq.unit ? `<span>${esc(qq.unit)}</span>` : ''}<button>GÖNDER</button></form>`
        : `<div class="fx-opts">${q.options.map(o => `<button type="button" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
      const T = est ? T_EST : T_MC;
      el.innerHTML = `<div class="fx-qbox">${head}${body}${input}<div class="fx-timer"><i style="animation-duration:${T}s"></i></div></div>`;
      document.body.appendChild(el);
      const t0 = performance.now();
      let done = false;
      const finish = v => { if (done) return; done = true; clearTimeout(timer); resolve({ value: v, ms: performance.now() - t0, el }); };
      const timer = setTimeout(() => finish(null), T * 1000);
      if (est) {
        const num = el.querySelector('#fxNum'); setTimeout(() => num.focus(), 50);
        el.querySelector('#fxEst').onsubmit = e => { e.preventDefault(); const v = parseInt(num.value, 10); if (Number.isFinite(v)) finish(v); };
      } else {
        el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { el.querySelectorAll('[data-o]').forEach(x => x.disabled = true); b.classList.add('picked'); finish(b.dataset.o); });
      }
    });
  }
  async function reveal(el, html, ms = 2200) {
    const box = el.querySelector('.fx-qbox');
    box.querySelector('.fx-timer')?.remove();
    const r = document.createElement('div'); r.className = 'fx-reveal'; r.innerHTML = html; box.appendChild(r);
    await sleep(ms); el.remove();
  }

  /* ---------- phase 1: land grab ---------- */
  async function grabLoop() {
    await banner('YERLEŞME', 'Tahminde en yakın olan önce şehir seçer');
    while (free().length) {
      const q = question('estimate');
      renderBoard();
      say('Herkese aynı tahmin sorusu…');
      const human = S.players[0];
      const answers = await Promise.all(S.players.map(async p => {
        if (!p.alive) return null;
        if (p.bot) { await sleep(rnd(1500, 6000)); return { p, v: botEstimate(q.answer), ms: rnd(1500, 9000) }; }
        const a = await ask(q, { title: 'YERLEŞME · EN YAKIN SEÇER' }); human._el = a.el; return { p, v: a.value, ms: a.ms };
      }));
      const ranked = answers.filter(Boolean).sort((a, b) => (a.v == null) - (b.v == null) || Math.abs(a.v - q.answer) - Math.abs(b.v - q.answer) || a.ms - b.ms);
      await reveal(human._el, `<div class="fx-ans">Doğru cevap: <b>${nf.format(q.answer)} ${esc(q.unit || '')}</b></div>
        ${numberLine(ranked, q.answer)}
        <ol class="fx-rank">${ranked.map(r => `<li style="--c:${r.p.color}"><b>${esc(r.p.name)}</b><span>${r.v == null ? 'cevap yok' : nf.format(r.v)}</span></li>`).join('')}</ol>`, 3300);
      const pickers = ranked.filter(r => r.v != null).slice(0, S.players.length > 2 ? 2 : 1);
      for (const r of pickers) {
        if (!free().length) break;
        await pickRegion(r.p);
      }
    }
    S.phase = 'battle'; S.round = 1;
    renderBoard();
    await banner('SAVAŞ BAŞLIYOR', `${BATTLE_ROUNDS} tur · komşu şehirlere saldır`);
    battleLoop();
  }
  function frontier(i) {
    const mine = new Set(regionsOf(i));
    const f = free().filter(id => S.byId[id].neighbors.some(n => mine.has(n)));
    return f.length ? f : free();
  }
  async function pickRegion(p) {
    const opts = frontier(p.id);
    if (p.bot) {
      const id = opts.sort((a, b) => S.byId[b].neighbors.length - S.byId[a].neighbors.length)[0];
      renderBoard([id]); say(`<b style="color:${p.color}">${esc(p.name)}</b> ${esc(S.byId[id].name)}'u aldı.`);
      await animCapture(id, p.color); S.owner[id] = p.id; renderBoard(); return;
    }
    await new Promise(res => {
      renderBoard(opts, async id => { renderBoard(); await animCapture(id, p.color); S.owner[id] = p.id; renderBoard(); res(); });
      say('Bir şehir seç (parlayanlardan).');
    });
  }

  /* ---------- phase 2: battle ---------- */
  async function battleLoop() {
    while (S.round <= BATTLE_ROUNDS && alive().length > 1) {
      for (const p of S.players) {
        if (!p.alive || alive().length < 2) continue;
        await turn(p);
      }
      S.round++;
    }
    end();
  }
  function targets(i) {
    const mine = new Set(regionsOf(i));
    return S.map.regions.filter(r => S.owner[r.id] != null && S.owner[r.id] !== i && r.neighbors.some(n => mine.has(n))).map(r => r.id);
  }
  async function turn(p) {
    S.turnIdx = p.id;
    const ts = targets(p.id);
    renderBoard();
    if (!ts.length) { say(`${esc(p.name)} saldıracak komşu bulamadı.`); await sleep(1000); return; }
    let target;
    if (p.bot) {
      target = ts.sort((a, b) => score(b) - score(a))[0];
      renderBoard([target]); say(`<b style="color:${p.color}">${esc(p.name)}</b> → ${esc(S.byId[target].name)} saldırısı!`); await sleep(1100);
    } else {
      target = await new Promise(res => {
        renderBoard(ts, id => res(id));
        say('Saldıracağın komşu şehri seç.');
      });
    }
    await battle(p, S.players[S.owner[target]], target);
  }
  function score(id) {  // bots: prefer bases low on towers, then regions next to many of theirs
    const def = S.players[S.owner[id]];
    return (def.base === id ? 4 - def.towers : 0) * 2 + S.byId[id].neighbors.length * 0.1 + Math.random();
  }
  async function battle(att, def, target) {
    const region = S.byId[target];
    const q = question('mc', region);
    const involved = [att, def];
    const human = involved.find(p => !p.bot);
    const title = `${att.name} ⚔ ${def.name} · ${region.name}`;
    let a, d, el;
    if (human) {
      const res = await ask(q, { title });
      el = res.el;
      a = att.bot ? botChoice(q) : res.value; d = def.bot ? botChoice(q) : res.value;
    } else {
      a = botChoice(q); d = botChoice(q);
    }
    const aOk = a === q.answer, dOk = d === q.answer;
    let winner = null, detail = '';
    if (aOk && !dOk) winner = att;
    else if (dOk && !aOk) winner = def;
    else if (aOk && dOk && q.followUp) {
      // both right: open-ended follow-up, closest wins
      let av, dv;
      if (human) {
        await reveal(el, `<div class="fx-ans ok">İkiniz de bildiniz: <b>${esc(q.answer)}</b> — ek soru!</div>`, 1500);
        const res = await ask(q, { title: 'EK SORU · EN YAKIN KAZANIR', followUp: q.followUp });
        el = res.el;
        av = att.bot ? botEstimate(q.followUp.answer) : res.value; dv = def.bot ? botEstimate(q.followUp.answer) : res.value;
      } else { av = botEstimate(q.followUp.answer); dv = botEstimate(q.followUp.answer); }
      const da = av == null ? Infinity : Math.abs(av - q.followUp.answer), dd = dv == null ? Infinity : Math.abs(dv - q.followUp.answer);
      winner = da < dd ? att : def;  // equal distance: the defender holds
      detail = `Ek soru: <b>${nf.format(q.followUp.answer)} ${esc(q.followUp.unit || '')}</b> · ${esc(att.name)} ${av == null ? '—' : nf.format(av)} · ${esc(def.name)} ${dv == null ? '—' : nf.format(dv)}`;
    } else if (aOk && dOk) winner = def;
    const won = winner === att;
    let outcome;
    if (won) {
      if (def.base === target) outcome = def.towers - 1 <= 0 ? `${def.name}'in ana stadyumu düştü! Tüm şehirleri ${att.name}'e geçti.` : `${def.name}'in ana stadyumunda bir kale yıkıldı (${def.towers - 1} kaldı).`;
      else outcome = `${att.name}, ${region.name}'u fethetti!`;
    } else outcome = winner ? `${def.name} ${region.name}'u savundu.` : `Kimse bilemedi; ${region.name} el değiştirmedi.`;
    const html = `<div class="fx-ans ${won ? 'ok' : ''}">Doğru: <b>${esc(q.answer)}</b></div>${detail ? `<div class="fx-det">${detail}</div>` : ''}`;
    if (human && el) await reveal(el, html, 1700);
    renderBoard([target]);
    say(`<b style="color:${att.color}">${esc(att.name)}</b> → ${esc(region.name)}`);
    if (human && window.FX_CINEMA) {
      // Full-screen battle scene: the siege cannon fires a football at the defender's goal.
      const from = S.byId[originFor(att.id, target)];
      await window.FX_CINEMA.play({ att, def, attLabel: from.name, defLabel: region.name, won,
        attCrest: crest(S.byId[att.base].clubs[0], 40), defCrest: crest(region.clubs[0], 40) });
    } else await sleep(500);
    if (won) {
      if (def.base === target) {
        await animTower(target);
        def.towers--;
        if (def.towers <= 0) {
          const lost = regionsOf(def.id);
          def.alive = false;
          renderBoard();
          await animEmpire([target, ...lost.filter(id => id !== target)], att.color);
          lost.forEach(id => { S.owner[id] = att.id; });
        }
      } else { await animCapture(target, att.color); S.owner[target] = att.id; }
    }
    renderBoard();
    say(esc(outcome));
    await sleep(900);
  }

  /* ---------- end ---------- */
  function end() {
    S.phase = 'over'; S.turnIdx = null;
    const table = S.players.map(p => ({ p, n: regionsOf(p.id).length })).sort((a, b) => b.n - a.n || b.p.towers - a.p.towers);
    renderBoard();
    const won = table[0].p.id === 0;
    const el = document.createElement('div'); el.className = 'fx-q fx-end';
    el.innerHTML = `<div class="fx-qbox"><small class="fx-qt">MAÇ SONU</small><b class="fx-qq">${won ? 'Türkiye senin! 🏆' : `${esc(table[0].p.name)} kazandı`}</b>
      <ol class="fx-rank">${table.map(r => `<li style="--c:${r.p.color}"><b>${esc(r.p.name)}</b><span>${r.n} şehir</span></li>`).join('')}</ol>
      <div class="fx-endbtns"><button type="button" class="fx-play" id="fxAgain">TEKRAR OYNA</button><button type="button" class="fx-ghost" id="fxMenu">MENÜ</button></div></div>`;
    document.body.appendChild(el);
    if (won) confetti();
    el.querySelector('#fxAgain').onclick = () => { el.remove(); start(); };
    el.querySelector('#fxMenu').onclick = () => { el.remove(); renderMenu(); };
  }

  load().then(renderMenu).catch(() => { app.innerHTML = '<div class="fx-error">Oyun verisi yüklenemedi. Sayfayı yenile.</div>'; });
  window.NEON_FETHET = { get state() { return S; }, crest, fx: { animCapture, animTower, animEmpire, banner, renderBoard } };
})();
