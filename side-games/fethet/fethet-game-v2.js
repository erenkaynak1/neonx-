/* NEON XI — Saha Fethi (conquest trivia) on the Turkey map: against bots, or online with 2-4 players through
   the NEON XI lobby (party launch, random match), using the shared Firebase room transport.
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
  const T_MC = 20, T_EST = 25, TOWERS = 3;
  const START_VILLAGES = 3, GRAB_ROUNDS = 4, TIEBREAKS = 3;
  // Battle rounds by player count: the match ends when one empire is left, or after these rounds.
  const roundsFor = () => ({ 2: 8, 3: 6, 4: 5 })[S.players.length] || 6;
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
  const nf0 = new Intl.NumberFormat('tr-TR');
  const nf = { format: v => (v >= 1800 && v < 2100 ? String(v) : nf0.format(v)) };  // years read as years (1990, not 1.990)
  // SPEED (sessionStorage fxSpeed) only shortens pauses for automated tests; players always get 1.
  const SPEED = (() => { try { return Math.max(1, Number(sessionStorage.getItem('fxSpeed')) || 1); } catch { return 1; } })();
  // A guest whose screen has fallen behind the host (slow device, tab in the background) skips pauses and
  // animations until it has caught up, so it never answers a question late.
  const behind = () => NET.role === 'guest' && NET.backlog > 2;
  const sleep = ms => behind() ? Promise.resolve() : new Promise(r => setTimeout(r, ms / SPEED));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];

  const S = { map: null, bank: null, byId: {}, players: [], owner: {}, used: new Set(), phase: 'menu', log: [], level: 'normal', count: 3, name: 'Sen', me: 0 };

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
  // Bots guess like people: off by a plausible amount for the kind of number (a birth year is a few years
  // off, never 2400; a height a few cm; a count of tournaments one or two).
  function botEstimate(truth, unit = '') {
    const { spread } = LEVEL[S.level], e = (Math.random() * 2 - 1) * rnd(0.35, 1.15);
    let v;
    if (!unit && truth > 1800 && truth < 2100) v = Math.min(new Date().getFullYear() - 15, truth + e * spread * 22);  // year
    else if (unit === 'cm') v = truth + e * spread * 26;
    else if (unit === 'turnuva' || truth <= 12) v = truth + e * Math.max(1.2, spread * 6);
    else if (unit === 'şampiyonluk') v = truth + e * Math.max(2, truth * spread);
    else v = truth * (1 + e * spread) + e * 3;
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
        <button type="button" class="fx-play" id="fxPlay">BOTLARA KARŞI OYNA</button>
        <div class="fx-online"><span>ONLINE</span><button type="button" class="fx-ghost" id="fxMatch">RAKİP BUL</button><button type="button" class="fx-ghost" id="fxFriends">ARKADAŞLARLA</button></div>
        <ul class="fx-rules"><li><b>Başlangıç:</b> herkes 3 köyle eşit başlar.</li><li><b>Yerleşme:</b> 4 tahmin sorusu; en yakın 2, ikinci 1 köy seçer.</li><li><b>Savaş:</b> boş köy al ya da komşu rakibe saldır. İkiniz de bilirseniz ek sorular gelir; ikiniz de bilemezseniz saldırı püskürür.</li><li><b>Ana stadyum:</b> 3 kalesi var; son kale düşerse imparatorluk düşer. Tek imparatorluk kalınca ya da turlar bitince maç biter.</li></ul>
      </section>`;
    app.querySelectorAll('[data-count]').forEach(b => b.onclick = () => { S.count = +b.dataset.count; renderMenu(); });
    app.querySelectorAll('[data-level]').forEach(b => b.onclick = () => { S.level = b.dataset.level; renderMenu(); });
    const social = choice => { if (window.NEON_SOCIAL?.chooseMode) window.NEON_SOCIAL.chooseMode('fethet', choice).catch(e => console.warn(e)); else window.NEON_SOCIAL?.open?.('play'); };
    document.getElementById('fxMatch').onclick = () => social('match');
    document.getElementById('fxFriends').onclick = () => social('friends');
    document.getElementById('fxPlay').onclick = () => { S.name = (document.getElementById('fxName').value || 'Sen').trim().slice(0, 16); start(); };
  }

  function start() {
    S.owner = {}; S.used = new Set(); S.log = []; S.me = 0; S.over = false; S.aborted = false; S.round = 0; S.grab = 0; S.turnIdx = null;
    const bases = S.map.starts[String(S.count)];
    S.players = bases.map((base, i) => ({ id: i, name: i === 0 ? S.name : BOT_NAMES[i - 1], kind: i === 0 ? 'local' : 'bot', color: COLORS[i], base, towers: TOWERS, alive: true }));
    S.map.regions.forEach(r => { S.owner[r.id] = null; });
    S.players.forEach(p => { S.owner[p.base] = p.id; });
    S.phase = 'grab';
    renderBoard();
    run(grabLoop);
  }

  /* ---------- board ---------- */
  function renderBoard(highlight = [], onPick = null) {
    const m = S.map;
    const counts = S.players.map(p => regionsOf(p.id).length);
    app.innerHTML = `<header class="fx-hud">${S.players.map((p, i) => `<div class="fx-pl${p.alive ? '' : ' out'}${S.turnIdx === i ? ' turn' : ''}${i === S.me ? ' me' : ''}" style="--c:${p.color}"><b>${esc(p.name)}${i === S.me && online() ? ' · sen' : ''}</b><span>${counts[i]} köy · ${'●'.repeat(p.towers)}${'○'.repeat(TOWERS - p.towers)}</span></div>`).join('')}</header>
      <div class="fx-phase" id="fxPhase">${S.phase === 'grab' ? `YERLEŞME${S.grab ? ` · ${Math.min(S.grab, GRAB_ROUNDS)}/${GRAB_ROUNDS}` : ''}` : S.phase === 'battle' ? `SAVAŞ · TUR ${Math.min(S.round, roundsFor())}/${roundsFor()}` : 'MAÇ SONU'} · <span>${free().length} boş köy</span></div>
      <div class="fx-mapwrap"><div class="fx-stage"><img class="fx-art" src="./assets/map-art.webp?v=20261116-art3" alt="" draggable="false">
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
      if (reduced() || document.hidden || behind()) { step(1); res(); return; }  // a hidden tab gets no frames: do not stall an online match
      const t0 = performance.now(); ms /= SPEED;
      const f = now => { const t = Math.max(0, Math.min(1, (now - t0) / ms)); /* a frame stamp can predate t0 */ step(t); if (t < 1) requestAnimationFrame(f); else res(); };
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
  async function animCapture(id, color, quick = false) {
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
    await sleep(reduced() || quick ? 60 : 240);
    if (!quick) popText(x, y - 46, '+1', color, 22).animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-20px)' }], { duration: 700, delay: 200, fill: 'forwards' }).finished.then(g => g.effect?.target?.remove?.()).catch(() => {});
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
  // Match intro: the players' cards slide in from both sides around a big VS, over a stadium flash.
  async function animIntro() {
    const el = document.createElement('div'); el.className = 'fx-intro';
    el.innerHTML = `<div class="fx-intro-flash"></div><div class="fx-intro-title">SAHA <i>FETHİ</i></div>
      <div class="fx-intro-cards">${S.players.map((p, i) => `<div class="fx-intro-card" style="--c:${p.color};--i:${i};--from:${i % 2 ? 1 : -1}">
        ${crest(S.byId[p.base]?.clubs[0] || '', 44)}<b>${esc(p.name)}</b><small>${esc(S.byId[p.base]?.name || '')}</small></div>${i < S.players.length - 1 ? '<i class="fx-intro-vs">VS</i>' : ''}`).join('')}</div>`;
    document.body.appendChild(el);
    await sleep(reduced() ? 900 : 2600);
    el.classList.add('out'); await sleep(350); el.remove();
  }
  // Whose turn: a sweep in the player's colour.
  async function animTurn(pid) {
    const p = S.players[pid]; if (!p) return;
    const el = document.createElement('div'); el.className = 'fx-turn'; el.style.setProperty('--c', p.color);
    el.innerHTML = `<div><small>SIRA</small><b>${pid === S.me ? 'SENDE' : esc(p.name)}</b></div>`;
    document.body.appendChild(el); await sleep(reduced() ? 500 : 1150); el.remove();
  }
  // Attack/expansion: a glowing arc flies from the attacker's land to the target and hits with a ring.
  async function animArc(fromId, toId, color) {
    const L = fxLayer(); if (!L) return;
    const [x1, y1] = S.byId[fromId].label, [x2, y2] = S.byId[toId].label;
    const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 40 - Math.hypot(x2 - x1, y2 - y1) * 0.25;
    const d = `M${x1},${y1}Q${mx},${my} ${x2},${y2}`;
    const glow = svgEl('path', { d, fill: 'none', stroke: color, 'stroke-width': 7, 'stroke-linecap': 'round', opacity: .25, class: 'fx-arc-glow' }, L);
    const line = svgEl('path', { d, fill: 'none', stroke: color, 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-dasharray': '7 6' }, L);
    const ball = svgEl('circle', { r: 6, fill: '#fff', stroke: color, 'stroke-width': 2.5 }, L);
    const len = line.getTotalLength();
    glow.setAttribute('stroke-dasharray', `${len}`); glow.setAttribute('stroke-dashoffset', `${len}`);
    await tween(820, t => {
      const e = ease(t), pt = line.getPointAtLength(len * e);
      ball.setAttribute('cx', pt.x); ball.setAttribute('cy', pt.y);
      glow.setAttribute('stroke-dashoffset', String(len * (1 - e)));
      line.setAttribute('stroke-dashoffset', String(-t * 60));
    });
    const ring = svgEl('circle', { cx: x2, cy: y2, r: 4, fill: 'none', stroke: color, 'stroke-width': 4 }, L);
    burst(x2, y2, [color, '#fff'], 12).forEach(c => setTimeout(() => c.remove(), 720));
    await tween(420, t => { ring.setAttribute('r', 4 + ease(t) * 46); ring.setAttribute('opacity', String(1 - t)); });
    [glow, line, ball, ring].forEach(e => e.remove());
  }
  // A failed claim: the flag falls and a red cross flashes.
  async function animMiss(id) {
    const [x, y] = S.byId[id].label;
    const g = popText(x, y - 10, '✕', '#ff7a8a', 34);
    await sleep(reduced() ? 300 : 800); g.remove();
  }
  // Winner: their colour washes over the map from their base, ring by ring.
  async function animVictory(pid) {
    const p = S.players[pid]; if (!p || reduced()) return;
    const L = fxLayer(); if (!L) return;
    const d = { [p.base]: 0 }, q = [p.base];
    while (q.length) { const x = q.shift(); for (const y of S.byId[x].neighbors) if (d[y] == null) { d[y] = d[x] + 1; q.push(y); } }
    const els = S.map.regions.map(r => { const e = svgEl('path', { d: r.path, fill: p.color, opacity: 0 }, L);
      e.animate([{ opacity: 0 }, { opacity: .55 }, { opacity: 0 }], { duration: 900, delay: (d[r.id] ?? 6) * 120, easing: 'ease-out', fill: 'forwards' }); return e; });
    await sleep(900 + 120 * Math.max(...Object.values(d)));
    els.forEach(e => e.remove());
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

  /* ---------- net: one host runs the match, everyone else renders it ----------
     The host (or the only player, offline) owns the state and every decision. Each step is a small command:
     emit() sends it to the guests and runs it locally; guests run them in order. A question or a region pick
     is a command addressed to some players; their answers come back over their own connection and the host
     only accepts an answer from the connection that belongs to that player. Questions go out without the
     answer, and any HTML from the host is cleaned before it is shown. */
  const Q = new URLSearchParams(location.search);
  const AUTO = Q.get('nxAuto') === '1' && /^\d{4}$/.test(Q.get('nxCode') || '') ? {
    role: Q.get('nxRole') === 'host' ? 'host' : 'guest', code: Q.get('nxCode'), uid: String(Q.get('nxUid') || '').slice(0, 64),
    name: String(Q.get('nxName') || 'NEON Oyuncu').trim().slice(0, 16) || 'NEON Oyuncu', match: Q.get('nxMatch') || '',
    size: Math.min(4, Math.max(2, Number(Q.get('nxPartySize')) || 2))
  } : null;
  const PREFIX = 'neonxi-fethet-', LOBBY_WAIT = 45000, PICK_MS = 30000;
  const NET = { role: 'off', peer: null, conn: null, conns: [], lobby: [], pending: new Map(), queue: Promise.resolve(), backlog: 0, started: false, rid: 0 };
  const ABORT = new Error('fethet-aborted');
  const cleanName = s => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16) || 'Oyuncu';
  const okColor = c => /^#[0-9a-f]{6}$/i.test(String(c)) ? c : '#baff18';
  const ALLOWED = new Set(['B', 'SPAN', 'DIV', 'OL', 'LI', 'EM', 'I', 'SMALL', 'BR']);
  function clean(html) {  // host HTML for say/reveal: keep simple markup, drop everything else
    const t = document.createElement('template'); t.innerHTML = String(html ?? '');
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) return;
      if (n.nodeType !== 1 || !ALLOWED.has(n.tagName)) { n.replaceWith(document.createTextNode(n.textContent || '')); return; }
      [...n.attributes].forEach(a => { if (a.name !== 'class' && a.name !== 'style') n.removeAttribute(a.name); });
      const st = n.getAttribute('style'); if (st && /url\(|expression|@import/i.test(st)) n.removeAttribute('style');
      walk(n);
    });
    walk(t.content);
    const box = document.createElement('div'); box.appendChild(t.content); return box.innerHTML;
  }
  const online = () => NET.role !== 'off';
  const snap = () => ({ owner: S.owner, phase: S.phase, round: S.round || 0, turnIdx: S.turnIdx ?? -1,
    players: S.players.map(({ id, name, base, towers, alive }) => ({ id, name, base, towers, alive })) });
  function applySnap(st) {
    if (!st || !Array.isArray(st.players)) return;
    const owner = {}; S.map.regions.forEach(r => { const o = st.owner?.[r.id]; owner[r.id] = Number.isInteger(o) && o >= 0 && o < 4 ? o : null; });
    S.owner = owner; S.phase = ['grab', 'battle', 'over'].includes(st.phase) ? st.phase : S.phase; S.round = Number(st.round) || 0;
    S.turnIdx = Number.isInteger(st.turnIdx) && st.turnIdx >= 0 ? st.turnIdx : null;
    S.players = st.players.slice(0, 4).map((p, i) => ({ id: i, name: cleanName(p.name), color: COLORS[i], base: S.byId[p.base] ? p.base : null,
      towers: Math.max(0, Math.min(TOWERS, Number(p.towers) || 0)), alive: p.alive !== false, kind: i === S.me ? 'local' : 'remote' }));
  }
  function wire(m) { return JSON.parse(JSON.stringify(m)); }  // Firebase refuses undefined
  async function emit(m) {
    if (S.aborted) throw ABORT;
    if (NET.role === 'host') {
      const w = wire(m);
      NET.conns.forEach((c, pid) => { if (c && S.players[pid]?.kind === 'remote') { try { c.send(w); } catch (e) { console.warn(e); } } });
    }
    await exec(m);
    if (S.aborted) throw ABORT;
  }
  async function exec(m) {
    if (!m || typeof m !== 'object') return;
    if (m.st && NET.role === 'guest') {
      applySnap(m.st);
      // Safety net: the match is over on the host; if its result screen never reaches us, build it here.
      if (S.phase === 'over' && !S.over && !S.endTimer) S.endTimer = setTimeout(() => { if (!S.over && NET.role === 'guest') end(S.players.map(p => ({ pid: p.id, n: regionsOf(p.id).length, towers: p.towers })).sort((a, b) => b.n - a.n || b.towers - a.towers)); }, 9000);
    }
    switch (m.c) {
      case 'board': {
        const mine = m.pick && m.pick.pid === S.me;
        renderBoard(Array.isArray(m.hl) ? m.hl.filter(id => S.byId[id]) : [], mine ? id => submit(m.pick.rid, id) : null);
        if (m.pick) {
          const p = S.players[m.pick.pid];
          say(mine ? `${esc(m.msg || 'Bir şehir seç.')} <small class="fx-sec">${PICK_MS / 1000} sn</small>` : `<b style="color:${p?.color}">${esc(p?.name)}</b> ${esc(m.wmsg || 'seçiyor…')}`);
        }
        break;
      }
      case 'say': say(clean(m.html)); break;
      case 'wait': await sleep(Math.min(5000, Number(m.ms) || 0)); break;
      case 'banner': await banner(String(m.title || '').slice(0, 40), String(m.sub || '').slice(0, 80)); break;
      case 'ask': showAsk(m); break;
      case 'reveal': await revealCur(clean(m.html), Math.min(6000, Number(m.ms) || 1500), m.picks, m.answer); break;
      case 'cap': if (S.byId[m.id]) await animCapture(m.id, okColor(m.color), !!m.quick); break;
      case 'intro': await animIntro(); break;
      case 'turn': await animTurn(m.pid); break;
      case 'arc': if (S.byId[m.from] && S.byId[m.to]) await animArc(m.from, m.to, okColor(m.color)); break;
      case 'miss': if (S.byId[m.id]) await animMiss(m.id); break;
      case 'tower': if (S.byId[m.id]) await animTower(m.id); break;
      case 'empire': await animEmpire((m.ids || []).filter(id => S.byId[id]), okColor(m.color)); break;
      case 'cinema': await cinema(m); break;
      case 'note': toast(String(m.text || '').slice(0, 120)); break;
      case 'end': await end(Array.isArray(m.table) ? m.table : []); break;
    }
  }
  function submit(rid, v) {
    if (NET.role === 'guest') { try { NET.conn?.send({ c: 'ans', rid, v: v ?? null }); } catch (e) { console.warn(e); } }
    else resolveAnswer(rid, S.me, v);
  }
  function expect(rid, pid, ms, fallback) {
    return new Promise(res => {
      const key = `${rid}:${pid}`;
      const done = v => { if (!NET.pending.has(key)) return; NET.pending.delete(key); clearTimeout(t); res(v); };
      const t = setTimeout(() => done(fallback(true)), ms);
      NET.pending.set(key, { pid, done, fallback });
    });
  }
  const resolveAnswer = (rid, pid, v) => NET.pending.get(`${rid}:${pid}`)?.done(v);
  function dropPlayer(pid) { for (const p of [...NET.pending.values()]) if (p.pid === pid) p.done(p.fallback(false)); }
  function toast(text) {
    const el = document.createElement('div'); el.className = 'fx-toast'; el.textContent = text; document.body.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  /* ---------- question overlay ---------- */
  let CUR = null;  // the open question overlay on this screen
  const publicQ = q => ({ id: q.id, type: q.type, q: q.q, unit: q.unit || '', options: q.options || null, path: q.path || null });
  function showAsk(m) {
    CUR?.el.remove();
    const q = m.q || {}, fu = m.opts?.followUp || null, est = q.type === 'estimate' || !!fu, qq = fu || q;
    const who = Array.isArray(m.who) ? m.who : [], live = who.includes(S.me);
    const el = document.createElement('div'); el.className = 'fx-q';
    const names = who.map(pid => S.players[pid]).filter(Boolean).map(p => `<b style="color:${p.color}">${esc(p.name)}</b>`).join(' · ');
    const head = `${m.opts?.title ? `<small class="fx-qt">${esc(m.opts.title)}</small>` : ''}${live ? '' : `<small class="fx-watch">İZLİYORSUN · ${names || 'botlar'}</small>`}`;
    const body = q.type === 'career' && !fu && Array.isArray(q.path)
      ? `<div class="fx-path">${q.path.map(c => `<span>${esc(c)}</span>`).join('<i>→</i>')}</div><b class="fx-qq">${esc(q.q)}</b>`
      : `<b class="fx-qq">${esc(qq.q)}</b>`;
    const input = est
      ? `<form class="fx-est" id="fxEst"><input id="fxNum" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="${live ? 'Tahminin' : 'Tahmin ediliyor…'}" aria-label="Tahminin"${live ? '' : ' disabled'}>${qq.unit ? `<span>${esc(qq.unit)}</span>` : ''}<button${live ? '' : ' disabled'}>GÖNDER</button></form>`
      : `<div class="fx-opts">${(q.options || []).map(o => `<button type="button" data-o="${esc(o)}"${live ? '' : ' disabled'}>${esc(o)}</button>`).join('')}</div>`;
    const T = est ? T_EST : T_MC;
    el.innerHTML = `<div class="fx-qbox${live ? '' : ' watching'}">${head}${body}${input}<div class="fx-wait" hidden>Cevabın gönderildi · diğerleri bekleniyor…</div><div class="fx-timer"><i style="animation-duration:${T}s"></i></div></div>`;
    document.body.appendChild(el);
    const cur = CUR = { el };
    if (!live) return;
    const t0 = performance.now();
    let done = false;
    const finish = v => {
      if (done) return; done = true; clearTimeout(timer);
      if (v != null) el.querySelector('.fx-wait').hidden = false;
      submit(m.rid, { v: v ?? null, ms: Math.round(performance.now() - t0) });
    };
    const timer = setTimeout(() => finish(null), T * 1000);
    cur.cancel = () => { done = true; clearTimeout(timer); };
    if (est) {
      const num = el.querySelector('#fxNum'); setTimeout(() => num.focus(), 50);
      el.querySelector('#fxEst').onsubmit = e => { e.preventDefault(); const v = parseInt(num.value, 10); if (Number.isFinite(v) && v >= 0) { num.disabled = true; e.target.querySelector('button').disabled = true; finish(v); } };
    } else {
      el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { el.querySelectorAll('[data-o]').forEach(x => x.disabled = true); b.classList.add('picked'); b.style.setProperty('--pc', S.players[S.me]?.color || '#baff18'); finish(b.dataset.o); });
    }
  }
  // Multiple choice: every option shows who picked it, split into those players' colours.
  function paintPicks(box, picks, answer) {
    const btns = box.querySelectorAll('.fx-opts [data-o]');
    if (!btns.length || !picks || typeof picks !== 'object') return;
    btns.forEach(b => {
      const o = b.dataset.o, who = Object.entries(picks).filter(([, v]) => v === o).map(([pid]) => S.players[+pid]).filter(Boolean);
      b.classList.remove('picked'); b.classList.toggle('right', o === answer); b.classList.toggle('wrong', who.length > 0 && o !== answer);
      if (!who.length) return;
      const step = 100 / who.length;
      b.style.background = `linear-gradient(90deg,${who.map((p, i) => `color-mix(in srgb,${p.color} 62%,#05070a) ${(i * step).toFixed(1)}% ${((i + 1) * step).toFixed(1)}%`).join(',')})`;
      b.classList.add('split');
      const tags = document.createElement('span'); tags.className = 'fx-who';
      tags.innerHTML = who.map(p => `<em style="--c:${p.color}">${esc(p.name.split(' ')[0])}</em>`).join('');
      b.appendChild(tags);
    });
  }
  async function revealCur(html, ms, picks, answer) {
    let cur = CUR; CUR = null;
    if (!cur) { const el = document.createElement('div'); el.className = 'fx-q'; el.innerHTML = '<div class="fx-qbox"></div>'; document.body.appendChild(el); cur = { el }; }
    cur.cancel?.();
    const box = cur.el.querySelector('.fx-qbox');
    box.querySelector('.fx-timer')?.remove(); box.querySelector('.fx-wait')?.remove();
    paintPicks(box, picks, typeof answer === 'string' ? answer : null);
    const r = document.createElement('div'); r.className = 'fx-reveal'; r.innerHTML = html; box.appendChild(r);
    await sleep(ms); cur.el.remove();
  }

  /* ---------- host: asking and picking ---------- */
  async function askMany(q, opts, pids) {
    const rid = ++NET.rid, fu = opts.followUp || null, est = q.type === 'estimate' || !!fu, T = (est ? T_EST : T_MC) * 1000;
    const truth = fu ? fu.answer : q.answer;
    const botAns = () => ({ v: est ? botEstimate(truth, fu ? fu.unit : q.unit) : botChoice(q), ms: Math.round(rnd(1500, 9000)) });
    const waits = pids.map(pid => {
      const p = S.players[pid];
      if (p.kind === 'bot') return sleep(rnd(1200, est ? 5500 : 3800)).then(botAns);
      return expect(rid, pid, T + (p.kind === 'remote' ? 6000 : 400), timedOut => !timedOut && S.players[pid].kind === 'bot' ? botAns() : { v: null, ms: 1e9 });
    });
    await emit({ c: 'ask', rid, q: publicQ(q), opts: { title: opts.title || '', followUp: fu ? { q: fu.q, unit: fu.unit || '' } : null }, who: pids.filter(pid => S.players[pid].kind !== 'bot') });
    const got = await Promise.all(waits);
    const out = {};
    pids.forEach((pid, i) => {
      const a = got[i] && typeof got[i] === 'object' ? got[i] : {};
      const v = est ? (Number.isFinite(a.v) && a.v >= 0 ? Math.round(a.v) : null) : (typeof a.v === 'string' && (q.options || []).includes(a.v) ? a.v : null);
      out[pid] = { v, ms: Number.isFinite(a.ms) ? a.ms : 1e9 };
    });
    return out;
  }
  async function pickBy(pid, opts, botPick, msg, wmsg) {
    const p = S.players[pid];
    if (p.kind === 'bot') return botPick();
    const rid = ++NET.rid;
    const w = expect(rid, pid, PICK_MS + (p.kind === 'remote' ? 5000 : 0), () => botPick());
    await emit({ c: 'board', st: snap(), hl: opts, pick: { rid, pid }, msg, wmsg });
    const id = await w;
    return opts.includes(id) ? id : botPick();
  }

  /* ---------- start: equal villages for everyone ---------- */
  // Each player gets their base plus START_VILLAGES-1 villages around it, taken in turns so nobody is boxed in.
  function assignStart() {
    const dist = from => { const d = { [from]: 0 }, q = [from]; while (q.length) { const x = q.shift(); for (const y of S.byId[x].neighbors) if (d[y] == null) { d[y] = d[x] + 1; q.push(y); } } return d; };
    const dists = S.players.map(p => dist(p.base)), out = [];
    for (let k = 1; k < START_VILLAGES; k++) {
      for (const p of S.players) {
        const mine = new Set(regionsOf(p.id));
        const opts = free().filter(id => S.byId[id].neighbors.some(n => mine.has(n)));
        if (!opts.length) continue;
        // closest to the own base, and away from the others
        const id = opts.sort((a, b) => (dists[p.id][a] - dists[p.id][b]) || (otherDist(b, p.id, dists) - otherDist(a, p.id, dists)))[0];
        S.owner[id] = p.id; out.push([id, p.id]);
      }
    }
    return out;
  }
  const otherDist = (id, me, dists) => Math.min(...dists.map((d, i) => i === me ? 99 : d[id] ?? 99));
  async function opening() {
    await emit({ c: 'intro' });
    const given = assignStart();
    given.forEach(([id]) => { S.owner[id] = null; });
    await emit({ c: 'board', st: snap() });
    for (const [id, pid] of given) { emit({ c: 'cap', id, color: S.players[pid].color, quick: 1 }).catch(() => {}); await sleep(220); S.owner[id] = pid; }
    await sleep(700);
    await emit({ c: 'board', st: snap() });
  }

  /* ---------- phase 1: land grab (a few rounds, not the whole map) ---------- */
  async function grabLoop() {
    await opening();
    await emit({ c: 'banner', title: 'YERLEŞME', sub: `${GRAB_ROUNDS} soru · en yakın 2 köy, ikinci 1 köy alır` });
    for (S.grab = 1; S.grab <= GRAB_ROUNDS && free().length; S.grab++) {
      const q = question('estimate');
      await emit({ c: 'board', st: snap() });
      await emit({ c: 'say', html: `Yerleşme sorusu ${S.grab}/${GRAB_ROUNDS} · herkese aynı soru` });
      const ids = alive().map(p => p.id);
      const ans = await askMany(q, { title: `YERLEŞME ${S.grab}/${GRAB_ROUNDS} · EN YAKIN SEÇER` }, ids);
      const ranked = ids.map(pid => ({ p: S.players[pid], v: ans[pid].v, ms: ans[pid].ms }))
        .sort((a, b) => (a.v == null) - (b.v == null) || Math.abs(a.v - q.answer) - Math.abs(b.v - q.answer) || a.ms - b.ms);
      await emit({ c: 'reveal', ms: 3300, html: `<div class="fx-ans">Doğru cevap: <b>${nf.format(q.answer)} ${esc(q.unit || '')}</b></div>
        ${numberLine(ranked, q.answer)}
        <ol class="fx-rank">${ranked.map((r, i) => `<li style="--c:${r.p.color}"><b>${esc(r.p.name)}</b><span>${r.v == null ? 'cevap yok' : nf.format(r.v)}${i === 0 && r.v != null ? ' · +2 köy' : i === 1 && r.v != null ? ' · +1 köy' : ''}</span></li>`).join('')}</ol>` });
      const answered = ranked.filter(r => r.v != null);
      const pickers = answered.length ? [answered[0], answered[0], answered[1]].filter(Boolean) : [];
      for (const r of pickers) {
        if (!free().length) break;
        await pickRegion(r.p);
      }
    }
    S.phase = 'battle'; S.round = 1;
    await emit({ c: 'board', st: snap() });
    await emit({ c: 'banner', title: 'SAVAŞ BAŞLIYOR', sub: `${roundsFor()} tur · boş köyleri al, rakibin şehirlerine saldır` });
    await battleLoop();
  }
  function frontier(i) {
    const mine = new Set(regionsOf(i));
    const f = free().filter(id => S.byId[id].neighbors.some(n => mine.has(n)));
    return f.length ? f : free();
  }
  async function pickRegion(p) {
    const opts = frontier(p.id);
    const botPick = () => opts.slice().sort((a, b) => S.byId[b].neighbors.length - S.byId[a].neighbors.length)[0];
    const id = await pickBy(p.id, opts, botPick, 'Bir köy seç (parlayanlardan).', 'köy seçiyor…');
    await emit({ c: 'board', st: snap(), hl: [id] });
    await emit({ c: 'say', html: `<b style="color:${p.color}">${esc(p.name)}</b> ${esc(S.byId[id].name)}'u aldı.` });
    await emit({ c: 'cap', id, color: p.color });
    S.owner[id] = p.id;
    await emit({ c: 'board', st: snap() });
  }

  /* ---------- phase 2: battle — ends when one empire is left or the rounds run out ---------- */
  async function battleLoop() {
    const R = roundsFor();
    while (S.round <= R && alive().length > 1) {
      await emit({ c: 'board', st: snap() });
      await emit({ c: 'banner', title: S.round === R ? 'SON TUR' : `TUR ${S.round}/${R}`, sub: S.round === R ? 'son saldırılar!' : '' });
      for (const p of S.players) {
        if (!p.alive || alive().length < 2) continue;
        await turn(p);
      }
      S.round++;
    }
    await finishMatch();
  }
  function targets(i) {  // neighbouring rival regions and empty villages
    const mine = new Set(regionsOf(i));
    return S.map.regions.filter(r => S.owner[r.id] !== i && r.neighbors.some(n => mine.has(n))).map(r => r.id);
  }
  async function turn(p) {
    S.turnIdx = p.id;
    const ts = targets(p.id);
    await emit({ c: 'board', st: snap() });
    await emit({ c: 'turn', pid: p.id });
    if (!ts.length) { await emit({ c: 'say', html: `${esc(p.name)} saldıracak komşu bulamadı.` }); await emit({ c: 'wait', ms: 1000 }); return; }
    const botTarget = () => ts.slice().sort((a, b) => score(b, p.id) - score(a, p.id))[0];
    let target;
    if (p.kind === 'bot') {
      target = botTarget();
      await emit({ c: 'board', st: snap(), hl: [target] });
      await emit({ c: 'say', html: `<b style="color:${p.color}">${esc(p.name)}</b> → ${esc(S.byId[target].name)}${S.owner[target] == null ? ' (boş köy)' : ' saldırısı!'}` });
      await emit({ c: 'wait', ms: 900 });
    } else target = await pickBy(p.id, ts, botTarget, 'Boş bir köy al ya da rakip şehre saldır.', 'hamlesini seçiyor…');
    await emit({ c: 'arc', from: originFor(p.id, target), to: target, color: p.color });
    if (S.owner[target] == null) await claim(p, target);
    else await battle(p, S.players[S.owner[target]], target);
  }
  function score(id, me) {  // bots: bases low on towers first, then rivals' land, then empty villages
    const o = S.owner[id];
    if (o == null) return 1.2 + S.byId[id].neighbors.length * 0.1 + Math.random() * 1.5;
    const def = S.players[o];
    return (def.base === id ? 4 - def.towers : 0) * 2 + 1 + S.byId[id].neighbors.length * 0.1 + Math.random();
  }
  // An empty village: answer one question alone; right → it is yours.
  async function claim(p, target) {
    const region = S.byId[target], q = question('mc', region);
    const ans = await askMany(q, { title: `${p.name} · ${region.name} · BOŞ KÖY` }, [p.id]);
    const ok = ans[p.id].v === q.answer;
    await emit({ c: 'reveal', ms: 1900, picks: { [p.id]: ans[p.id].v }, answer: q.answer,
      html: `<div class="fx-ans ${ok ? 'ok' : ''}">${ok ? 'Doğru! Köy senin.' : 'Yanlış — köy boş kaldı.'} <b>${esc(q.answer)}</b></div>` });
    if (ok) { await emit({ c: 'cap', id: target, color: p.color }); S.owner[target] = p.id; }
    else await emit({ c: 'miss', id: target });
    await emit({ c: 'board', st: snap() });
    await emit({ c: 'say', html: ok ? `<b style="color:${p.color}">${esc(p.name)}</b> ${esc(region.name)}'u aldı.` : `${esc(p.name)} ${esc(region.name)}'u alamadı.` });
    await emit({ c: 'wait', ms: 700 });
  }
  // Battle: only the attacker right → attacker wins; attacker wrong (alone or both) → the defender holds.
  // Both right → tie-break estimate questions (the follow-up first), closest wins, up to TIEBREAKS.
  async function battle(att, def, target) {
    const region = S.byId[target];
    const q = question('mc', region);
    const title = `${att.name} ⚔ ${def.name} · ${region.name}`;
    const ans = await askMany(q, { title }, [att.id, def.id]);
    const aOk = ans[att.id].v === q.answer, dOk = ans[def.id].v === q.answer;
    const picks = { [att.id]: ans[att.id].v, [def.id]: ans[def.id].v };
    let winner = null, detail = '';
    if (aOk && !dOk) winner = att;
    else if (!aOk) winner = def;
    else {
      await emit({ c: 'reveal', ms: 1900, picks, answer: q.answer, html: `<div class="fx-ans ok">İkisi de bildi: <b>${esc(q.answer)}</b> — ek soru!</div>` });
      for (let k = 0; k < TIEBREAKS && !winner; k++) {
        const tq = k === 0 && q.followUp ? { id: q.id + ':fu', type: 'estimate', q: q.followUp.q, unit: q.followUp.unit || '', answer: q.followUp.answer } : question('estimate', region);
        const t = await askMany(tq, { title: `EK SORU ${k + 1} · EN YAKIN KAZANIR` }, [att.id, def.id]);
        const av = t[att.id].v, dv = t[def.id].v;
        const da = av == null ? Infinity : Math.abs(av - tq.answer), dd = dv == null ? Infinity : Math.abs(dv - tq.answer);
        if (da < dd) winner = att; else if (dd < da) winner = def;
        const last = winner || k === TIEBREAKS - 1;
        const html = `<div class="fx-ans">Ek soru: <b>${nf.format(tq.answer)} ${esc(tq.unit || '')}</b></div>${numberLine([{ p: att, v: av }, { p: def, v: dv }], tq.answer)}
          <div class="fx-det">${winner ? `<b style="color:${winner.color}">${esc(winner.name)}</b> daha yakın!` : last ? 'Yine eşit — savunan şehri korudu.' : 'Eşit! Bir ek soru daha…'}</div>`;
        if (last) detail = html; else await emit({ c: 'reveal', ms: 2600, html });
      }
      if (!winner) winner = def;
    }
    const won = winner === att;
    let outcome;
    if (won) {
      if (def.base === target) outcome = def.towers - 1 <= 0 ? `${def.name}'in ana stadyumu düştü! Tüm şehirleri ${att.name}'e geçti.` : `${def.name}'in ana stadyumunda bir kale yıkıldı (${def.towers - 1} kaldı).`;
      else outcome = `${att.name}, ${region.name}'u fethetti!`;
    } else outcome = !aOk && !dOk ? `İkisi de bilemedi; saldırı püskürtüldü, ${region.name} ${def.name}'de kaldı.` : `${def.name} ${region.name}'u savundu.`;
    if (detail) await emit({ c: 'reveal', ms: 2800, html: detail });
    else await emit({ c: 'reveal', ms: 2100, picks, answer: q.answer, html: `<div class="fx-ans ${won ? 'ok' : ''}">Doğru: <b>${esc(q.answer)}</b></div>` });
    await emit({ c: 'board', st: snap(), hl: [target] });
    await emit({ c: 'say', html: `<b style="color:${att.color}">${esc(att.name)}</b> → ${esc(region.name)}` });
    await emit({ c: 'cinema', att: att.id, def: def.id, from: originFor(att.id, target), target, won });
    if (won) {
      if (def.base === target) {
        await emit({ c: 'tower', id: target });
        def.towers--;
        if (def.towers <= 0) {
          const lost = regionsOf(def.id);
          def.alive = false;
          await emit({ c: 'board', st: snap() });
          await emit({ c: 'empire', ids: [target, ...lost.filter(id => id !== target)], color: att.color });
          lost.forEach(id => { S.owner[id] = att.id; });
          await emit({ c: 'banner', title: 'İMPARATORLUK DÜŞTÜ', sub: `${def.name} oyundan çıktı` });
        }
      } else { await emit({ c: 'cap', id: target, color: att.color }); S.owner[target] = att.id; }
    }
    await emit({ c: 'board', st: snap() });
    await emit({ c: 'say', html: esc(outcome) });
    await emit({ c: 'wait', ms: 900 });
  }
  // Full-screen battle scene: the siege cannon fires a football at the defender's goal. Offline it plays when
  // you are in the fight; online everyone watches it (the match waits for the slowest screen anyway).
  async function cinema(m) {
    const att = S.players[m.att], def = S.players[m.def], from = S.byId[m.from], to = S.byId[m.target];
    if (!att || !def || !from || !to) return;
    if (window.FX_CINEMA && !document.hidden && !behind() && (online() || att.id === S.me || def.id === S.me)) {
      await window.FX_CINEMA.play({ att, def, attLabel: from.name, defLabel: to.name, won: !!m.won,
        attCrest: crest(S.byId[att.base]?.clubs[0] || from.clubs[0], 40), defCrest: crest(to.clubs[0], 40) });
    } else await sleep(500);
  }

  /* ---------- end ---------- */
  async function finishMatch() {
    S.phase = 'over'; S.turnIdx = null;
    const table = S.players.map(p => ({ pid: p.id, n: regionsOf(p.id).length, towers: p.towers })).sort((a, b) => b.n - a.n || b.towers - a.towers);
    await emit({ c: 'board', st: snap() });
    await emit({ c: 'end', table });
  }
  async function end(table) {
    S.phase = 'over'; S.turnIdx = null; S.over = true;
    renderBoard();
    const rows = table.filter(r => S.players[r.pid]);
    if (!rows.length) return;
    await animVictory(rows[0].pid);
    const top = rows[0], winners = rows.filter(r => r.n === top.n && r.towers === top.towers).map(r => r.pid);
    const mine = winners.includes(S.me), won = mine && winners.length === 1;
    const headline = won ? 'Türkiye senin! 🏆' : mine ? 'Berabere bitti' : `${esc(S.players[top.pid].name)} kazandı`;
    const el = document.createElement('div'); el.className = 'fx-q fx-end';
    el.innerHTML = `<div class="fx-qbox"><small class="fx-qt">MAÇ SONU</small>
      <div class="fx-trophy" style="--c:${S.players[top.pid].color}"><i></i>${crest(S.byId[S.players[top.pid].base]?.clubs[0] || '', 54)}</div><b class="fx-qq">${headline}</b>
      <ol class="fx-rank">${rows.map(r => `<li style="--c:${S.players[r.pid].color}"><b>${esc(S.players[r.pid].name)}${r.pid === S.me && online() ? ' (sen)' : ''}</b><span>${Number(r.n) || 0} köy</span></li>`).join('')}</ol>
      <div class="fx-endbtns">${online()
        ? '<button type="button" class="fx-play" id="fxLobby">LOBİYE DÖN</button><button type="button" class="fx-ghost" id="fxMenu">MENÜ</button>'
        : '<button type="button" class="fx-play" id="fxAgain">TEKRAR OYNA</button><button type="button" class="fx-ghost" id="fxMenu">MENÜ</button>'}</div></div>`;
    document.body.appendChild(el);
    if (won) confetti();
    if (online()) report(won ? 'wins' : mine ? 'draws' : 'losses');
    el.querySelector('#fxAgain')?.addEventListener('click', () => { el.remove(); start(); });
    el.querySelector('#fxLobby')?.addEventListener('click', () => { el.remove(); leaveOnline(); window.NEON_SOCIAL?.open?.('party'); });
    el.querySelector('#fxMenu').onclick = () => { el.remove(); leaveOnline(); renderMenu(); };
  }
  // Online result → leaderboards (neon-social.js listens). Head-to-head only makes sense 1v1.
  function report(result) {
    if (S.reported || !AUTO?.match || document.querySelector('.nxff-end')) return;
    S.reported = true;
    const others = (NET.uids || []).filter((u, i) => i !== S.me && u);
    const opponentUid = S.players.length === 2 ? others[0] || '' : AUTO.uid;  // own uid = no head-to-head entry
    document.dispatchEvent(new CustomEvent('neon-match-result', { detail: { matchId: AUTO.match, mode: 'fethet', result, opponentUid } }));
  }

  /* ---------- online lobby ---------- */
  function renderLobby(msg, error = false) {
    const list = NET.lobby.length ? NET.lobby : [{ name: AUTO.name }];
    app.innerHTML = `<header class="fx-top"><a class="fx-back" href="../index.html" aria-label="Yan oyunlar">‹</a><div class="fx-brand"><small>NEON XI · ONLINE</small><h1>SAHA <i>FETHİ</i></h1></div></header>
      <section class="fx-hero fx-lobby">
        <div class="fx-lobby-title">${error ? 'BAĞLANTI SORUNU' : 'MAÇ ODASI'}</div>
        <ul class="fx-lobby-list">${Array.from({ length: AUTO.size }, (_, i) => {
          const p = list[i];
          return `<li style="--c:${COLORS[i]}" class="${p ? 'in' : ''}"><i></i><b>${p ? esc(p.name) : 'bekleniyor…'}</b>${i === 0 ? '<small>KURUCU</small>' : ''}</li>`;
        }).join('')}</ul>
        <p class="fx-lead${error ? ' bad' : ''}" id="fxLobbyMsg">${esc(msg)}</p>
        ${error ? '<button type="button" class="fx-play" id="fxOffline">BOTLARA KARŞI OYNA</button>' : ''}
      </section>`;
    app.querySelector('#fxOffline')?.addEventListener('click', () => { leaveOnline(); renderMenu(); });
  }
  function lobbyNames() { return NET.lobby.map(x => ({ name: x.name })); }
  function leaveOnline() {
    if (!online()) return;
    S.aborted = true;
    try { NET.conn?.close(); } catch {} try { NET.peer?.destroy(); } catch {}
    NET.role = 'off'; NET.conn = null; NET.peer = null; NET.conns = []; NET.lobby = []; NET.started = false;
    NET.pending.forEach(p => p.done(null)); NET.pending.clear();
    S.me = 0;  // S.aborted stays set so a host loop still running stops at its next step; start() clears it
  }

  function hostOnline() {
    NET.role = 'host'; S.me = 0;
    NET.lobby = [{ name: AUTO.name, uid: AUTO.uid, conn: null }];
    renderLobby('Oda kuruluyor…');
    if (!window.Peer) { renderLobby('Bağlantı modülü yüklenemedi.', true); return; }
    const peer = NET.peer = new window.Peer(PREFIX + AUTO.code, { debug: 0 });
    peer.on('open', () => renderLobby(`Oyuncular bekleniyor (${NET.lobby.length}/${AUTO.size})…`));
    peer.on('error', e => { console.warn('Saha Fethi oda', e); if (!NET.started) renderLobby('Oda kurulamadı. Lobiden yeniden başlatabilirsin.', true); });
    peer.on('connection', conn => {
      conn.on('data', m => onHostData(conn, m));
      conn.on('close', () => onHostClose(conn));
    });
    const deadline = Date.now() + LOBBY_WAIT;
    const tick = setInterval(() => {
      if (NET.role !== 'host' || NET.started) { clearInterval(tick); return; }
      if (!S.map) return;
      if (NET.lobby.length >= AUTO.size || (Date.now() > deadline && NET.lobby.length >= 2)) { clearInterval(tick); startOnline(); }
      else if (Date.now() > deadline + 15000) { clearInterval(tick); renderLobby('Rakip odaya bağlanamadı. Lobiden yeniden deneyebilirsin.', true); }
    }, 500);
  }
  function onHostData(conn, m) {
    if (!m || typeof m !== 'object') return;
    if (m.c === 'hello') {
      if (NET.started || NET.lobby.length >= Math.min(4, AUTO.size)) { try { conn.send({ c: 'full' }); } catch {} return; }
      if (NET.lobby.some(x => x.conn === conn)) { try { conn.send({ c: 'lobby', list: lobbyNames(), size: AUTO.size }); } catch {} return; }
      const uid = String(m.uid || '').slice(0, 64), old = uid && NET.lobby.findIndex(x => x.uid === uid && x.conn);
      if (old > 0) NET.lobby.splice(old, 1);  // the same account reconnected before the start
      NET.lobby.push({ name: cleanName(m.name), uid, conn });
      const list = lobbyNames();
      NET.lobby.forEach(x => { try { x.conn?.send({ c: 'lobby', list, size: AUTO.size }); } catch {} });
      renderLobby(`Oyuncular bekleniyor (${NET.lobby.length}/${AUTO.size})…`);
      return;
    }
    if (m.c === 'ans' && NET.started) {
      const pid = NET.conns.indexOf(conn);
      if (pid > 0 && Number.isInteger(m.rid)) resolveAnswer(m.rid, pid, m.v);
    }
  }
  function onHostClose(conn) {
    if (!NET.started) {
      const i = NET.lobby.findIndex(x => x.conn === conn);
      if (i > 0) { NET.lobby.splice(i, 1); renderLobby(`Oyuncular bekleniyor (${NET.lobby.length}/${AUTO.size})…`); }
      return;
    }
    const pid = NET.conns.indexOf(conn);
    if (pid <= 0 || S.over || S.players[pid]?.kind !== 'remote') return;
    S.players[pid].kind = 'bot'; NET.conns[pid] = null;
    dropPlayer(pid);
    emit({ c: 'note', text: `${S.players[pid].name} oyundan ayrıldı; yerine bot oynuyor.` }).catch(() => {});
  }
  function startOnline() {
    if (NET.started) return;
    NET.started = true;
    const lobby = NET.lobby.slice(0, 4), bases = S.map.starts[String(lobby.length)];
    S.owner = {}; S.used = new Set(); S.over = false; S.reported = false; S.round = 0; S.grab = 0; S.turnIdx = null;
    S.players = lobby.map((x, i) => ({ id: i, name: x.name, color: COLORS[i], base: bases[i], towers: TOWERS, alive: true, kind: i === 0 ? 'local' : 'remote' }));
    NET.conns = lobby.map(x => x.conn); NET.uids = lobby.map(x => x.uid);
    S.map.regions.forEach(r => { S.owner[r.id] = null; });
    S.players.forEach(p => { S.owner[p.base] = p.id; });
    S.phase = 'grab';
    NET.conns.forEach((c, pid) => { if (c) { try { c.send({ c: 'start', pid, uids: NET.uids }); } catch {} } });
    renderBoard();
    run(grabLoop);
  }

  function guestOnline(attempt = 0) {
    NET.role = 'guest';
    renderLobby(attempt ? `Odaya yeniden bağlanılıyor (${attempt + 1}/3)…` : 'Odaya bağlanılıyor…');
    if (!window.Peer) { renderLobby('Bağlantı modülü yüklenemedi.', true); return; }
    const peer = NET.peer = new window.Peer(undefined, { debug: 0 });
    let joined = false;
    const fail = () => {
      if (joined || NET.peer !== peer) return;
      try { peer.destroy(); } catch {}
      if (attempt < 2) setTimeout(() => guestOnline(attempt + 1), 1500);
      else renderLobby('Oyun odasına bağlanılamadı. Lobiden yeniden deneyebilirsin.', true);
    };
    peer.on('error', () => { if (!NET.started) fail(); else hostLost(); });
    peer.on('open', () => {
      const conn = NET.conn = peer.connect(PREFIX + AUTO.code, { reliable: true });
      conn.on('open', () => {
        joined = true;
        // Say hello until the host answers (a lost first message must not leave us outside the room).
        const hello = () => { if (NET.conn !== conn || NET.started || NET.heard) return; try { conn.send({ c: 'hello', uid: AUTO.uid, name: AUTO.name }); } catch {} setTimeout(hello, 4000); };
        hello();
      });
      conn.on('data', m => onGuestData(m));
      conn.on('close', () => hostLost());
      conn.on('error', () => { if (!joined) fail(); });
    });
    setTimeout(() => { if (!joined) fail(); }, 16000);
  }
  function onGuestData(m) {
    if (!m || typeof m !== 'object') return;
    if (m.c === 'lobby' || m.c === 'start' || m.c === 'full') NET.heard = true;
    if (m.c === 'lobby' && !NET.started) { NET.lobby = (m.list || []).slice(0, 4).map(x => ({ name: cleanName(x.name) })); renderLobby(`Oyuncular bekleniyor (${NET.lobby.length}/${AUTO.size})…`); return; }
    if (m.c === 'full') { renderLobby('Bu maç dolu ya da başladı.', true); return; }
    if (m.c === 'start') {
      NET.started = true; S.me = Number.isInteger(m.pid) ? m.pid : 1; NET.uids = Array.isArray(m.uids) ? m.uids.map(String) : [];
      S.over = false; S.reported = false; S.lost = false; S.endTimer = 0; S.used = new Set();
      return;
    }
    if (!NET.started) return;
    NET.backlog++;
    NET.queue = NET.queue.then(() => exec(m)).catch(e => console.warn('Saha Fethi', e)).finally(() => { NET.backlog--; });
  }
  function hostLost() {
    if (NET.role !== 'guest' || S.over || S.lost) return;
    S.lost = true;
    if (document.querySelector('.nxff-end')) return;  // the forfeit screen already explains it
    setTimeout(() => {
      if (S.over || document.querySelector('.nxff-end')) return;
      CUR?.el.remove(); CUR = null;
      const el = document.createElement('div'); el.className = 'fx-q fx-end';
      el.innerHTML = `<div class="fx-qbox"><small class="fx-qt">BAĞLANTI KOPTU</small><b class="fx-qq">Maçı kuran oyuncuyla bağlantı kesildi</b>
        <div class="fx-endbtns"><button type="button" class="fx-play" id="fxLobby">LOBİYE DÖN</button><button type="button" class="fx-ghost" id="fxMenu">MENÜ</button></div></div>`;
      document.body.appendChild(el);
      el.querySelector('#fxLobby').onclick = () => { el.remove(); leaveOnline(); window.NEON_SOCIAL?.open?.('party'); };
      el.querySelector('#fxMenu').onclick = () => { el.remove(); leaveOnline(); renderMenu(); };
    }, 1200);
  }

  // A forfeit screen (social/match-forfeit-v1.js) ends the match: stop the host loop.
  new MutationObserver(() => { if (online() && !S.over && document.querySelector('.nxff-end')) { S.aborted = true; CUR?.el.remove(); CUR = null; } })
    .observe(document.body, { childList: true });
  function run(loop) { loop().catch(e => { if (e !== ABORT) console.error('Saha Fethi', e); }); }

  // Online: open the room at once (the lobby broker waits for it) while the data loads.
  const loaded = load();
  NET.queue = loaded;
  if (AUTO) { if (AUTO.role === 'host') hostOnline(); else guestOnline(); }
  loaded.then(() => { if (!AUTO) renderMenu(); })
    .catch(() => { app.innerHTML = '<div class="fx-error">Oyun verisi yüklenemedi. Sayfayı yenile.</div>'; });
  window.addEventListener('beforeunload', () => { try { NET.conn?.close(); } catch {} try { NET.peer?.destroy(); } catch {} });
  window.NEON_FETHET = { get state() { return S; }, get net() { return NET; }, crest, fx: { animCapture, animTower, animEmpire, banner, renderBoard } };
})();
