/* NEON XI — Higher or Lower (single player).
   Each game draws one question ("Hangisi daha çok millî maça çıktı?") and keeps it until the first
   mistake. Two players are shown; pick the one with the higher value (or the older/younger one for the
   age questions). Right: the winner stays, the other card is replaced. Wrong: the streak is shown and
   saved as a personal record; hl-records-v1.js adds weekly and all-time leaderboards when signed in.
   A new game always starts with a different question than the last one. */
(() => {
  'use strict';
  const app = document.getElementById('app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });
  const today = new Date();
  const ageOf = b => { if (!b) return null; const d = new Date(b + 'T00:00:00Z'); let a = today.getUTCFullYear() - d.getUTCFullYear(); if (today.getUTCMonth() < d.getUTCMonth() || (today.getUTCMonth() === d.getUTCMonth() && today.getUTCDate() < d.getUTCDate())) a--; return a; };
  const days = b => b ? Date.parse(b + 'T00:00:00Z') / 864e5 : null;
  const money = v => v >= 1e6 ? nf.format(v / 1e6) + ' M€' : nf.format(v / 1e3) + ' B€';
  const POS = { Goalkeeper: 'Kaleci', Defender: 'Defans', Midfield: 'Orta saha', Attack: 'Forvet' };

  /* Question bank. value(p) must return a comparable number or null; higher wins unless low:true. */
  const QUESTIONS = [
    { id: 'caps', q: 'Hangisi daha çok millî maça çıktı?', key: 'caps', fmt: v => nf.format(v) + ' millî maç' },
    { id: 'ig', q: 'Hangisi millî takımda daha çok gol attı?', key: 'ig', fmt: v => nf.format(v) + ' millî gol' },
    { id: 'yc', q: 'Hangisi daha çok sarı kart gördü?', sub: '2012/13 sezonundan bu yana resmî kulüp maçlarında', key: 'yc', fmt: v => nf.format(v) + ' sarı kart' },
    { id: 'rc', q: 'Hangisi daha çok kırmızı kart gördü?', sub: '2012/13 sezonundan bu yana resmî kulüp maçlarında', key: 'rc', fmt: v => nf.format(v) + ' kırmızı kart' },
    { id: 'pv', q: 'Hangisinin piyasa değeri daha yükseğe çıktı?', sub: 'Kariyerindeki en yüksek piyasa değeri', key: 'pv', fmt: money },
    { id: 'cv', q: 'Hangisinin güncel piyasa değeri daha yüksek?', sub: 'Bugünkü Transfermarkt değeri', key: 'cv', fmt: money },
    { id: 'old', q: 'Hangisi daha yaşlı?', key: 'b', value: p => p.b ? -days(p.b) : null, fmt: (v, p) => ageOf(p.b) + ' yaş · ' + p.b.slice(0, 4) },
    { id: 'young', q: 'Hangisi daha genç?', key: 'b', value: p => p.b ? days(p.b) : null, fmt: (v, p) => ageOf(p.b) + ' yaş · ' + p.b.slice(0, 4) },
    { id: 'g', q: 'Hangisi kariyerinde daha çok lig golü attı?', sub: 'Kulüp kariyeri boyunca lig golleri', key: 'g', fmt: v => nf.format(v) + ' gol' },
    { id: 'a', q: 'Hangisi daha çok asist yaptı?', sub: '2012/13 sezonundan bu yana resmî kulüp maçlarında', key: 'a', fmt: v => nf.format(v) + ' asist' },
    { id: 'ap', q: 'Hangisi daha çok lig maçına çıktı?', sub: 'Kulüp kariyeri boyunca lig maçları', key: 'ap', fmt: v => nf.format(v) + ' maç' },
    { id: 'h', q: 'Hangisi daha uzun?', key: 'h', fmt: v => nf.format(v) + ' cm' },
    { id: 'short', q: 'Hangisi daha kısa?', key: 'h', value: p => p.h != null ? -p.h : null, fmt: (v, p) => nf.format(p.h) + ' cm' },
    { id: 'cl', q: 'Hangisi daha çok kulüpte forma giydi?', sub: 'A takım kulüpleri (altyapı ve B takımları hariç)', key: 'cl', fmt: v => nf.format(v) + ' kulüp' },
    { id: 'sl', q: "Hangisi Süper Lig'de daha çok maça çıktı?", sub: 'Tüm zamanlar · eski oyuncular dahil', key: 'sl', positive: true, fmt: v => nf.format(v) + ' Süper Lig maçı' }
  ];
  const valueOf = (q, p) => q.value ? q.value(p) : (typeof p[q.key] === 'number' ? p[q.key] : null);
  const shown = (q, p) => q.fmt(p[q.key], p);

  const store = {
    get(k, d) { try { const v = localStorage.getItem('nxHL:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('nxHL:' + k, JSON.stringify(v)); } catch {} }
  };
  const S = { players: [], meta: null, screen: 'boot', q: null, stay: null, chal: null, streak: 0, used: new Set(), busy: false, lastPick: null, board: 'weekly' };

  /* ---------- pairing ---------- */
  // positive: only players who have the stat at all (Süper Lig questions skip players who never played there).
  function poolFor(q) { return S.players.filter(p => { const v = valueOf(q, p); return v != null && (!q.positive || v > 0); }); }
  // Returns a challenger for `stay`. The newcomer is higher or lower than the stayer with equal odds,
  // so "always keep the player on screen" is no strategy. `want` forces a direction ('up'/'down').
  // Gap between two values on a fair scale: counts and money by ratio (so 3 vs 4 cards is as close as
  // 30 vs 40 matches), birth dates in days, heights in cm.
  function gap(q, a, b) {
    if (q.key === 'b') return Math.abs(a - b) / 365;     // years
    if (q.key === 'h') return Math.abs(a - b) / 6;       // 6 cm ≈ one "step"
    return Math.abs(Math.log((Math.abs(a) + 1) / (Math.abs(b) + 1)));
  }
  // Returns a challenger for `stay` whose value is close to the stayer's: the nearest few players on one
  // side (at least minGap apart), chosen among well-known players. The side is random (higher or lower with equal odds), so
  // "always keep the player on screen" is no strategy. The longer the streak, the nearer the pick.
  function pickChallenger(q, stay, want) {
    const pool = S.pool, sv = valueOf(q, stay);
    const dir = want || (Math.random() < 0.5 ? 'up' : 'down');
    const depth = Math.min(pool.length, 700 + S.streak * 150);
    const nearest = Math.max(5, 14 - S.streak);          // 14 closest at the start, 5 from streak 9
    // A minimum gap that shrinks as the streak grows: ~22% apart (or 3 cm, 2 years) on the first answers,
    // half of that at streak 6, the very nearest values from streak 12.
    const minGap = (q.key === 'b' ? 2 : q.key === 'h' ? 0.5 : 0.22) * Math.max(0, 1 - S.streak / 12);
    const onSide = p => { const v = valueOf(q, p); return dir === 'up' ? v > sv : v < sv; };
    const free = p => p.id !== stay.id && !S.used.has(p.id);
    let list = pool.slice(0, depth).filter(p => free(p) && onSide(p));
    if (!list.length) list = pool.filter(p => free(p) && onSide(p));
    if (!list.length) return null; // nobody on that side (e.g. the stayer is the top value): caller draws a new pair
    list.sort((x, y) => gap(q, valueOf(q, x), sv) - gap(q, valueOf(q, y), sv));
    const wide = list.filter(p => gap(q, valueOf(q, p), sv) >= minGap);
    if (wide.length) list = wide;
    return list[Math.floor(Math.random() * Math.min(list.length, nearest))];
  }
  function chooseQuestion() {
    const active = new Set(S.meta?.active_metrics || []);
    const ok = QUESTIONS.filter(q => active.has(q.key) || (q.key === 'b' && active.has('b')));
    const last = store.get('lastQ', ''), recent = store.get('recentQ', []);
    let options = ok.filter(q => q.id !== last && !recent.slice(-3).includes(q.id));
    if (!options.length) options = ok.filter(q => q.id !== last);
    const q = options[Math.floor(Math.random() * options.length)];
    store.set('lastQ', q.id); store.set('recentQ', recent.concat(q.id).slice(-6));
    return q;
  }

  /* ---------- screens ---------- */
  function initials(name) { return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toLocaleUpperCase('tr-TR'); }
  function card(p, role, reveal) {
    const q = S.q, hidden = !reveal;
    return `<button type="button" class="hl-card ${role}" data-pick="${p.id}" aria-label="${esc(p.n)} seç">
      <span class="hl-mono">${esc(initials(p.n))}</span>
      <span class="hl-name">${esc(p.n)}</span>
      <span class="hl-meta">${esc([POS[p.pos], p.nat].filter(Boolean).join(' · '))}</span>
      <span class="hl-club">${esc(p.club || (p.st === 'active' ? 'Kulüpsüz' : 'Emekli / eski oyuncu'))}</span>
      <span class="hl-value${hidden ? ' hidden' : ''}" data-value="${p.id}">${hidden ? '?' : esc(shown(q, p))}</span>
    </button>`;
  }
  function renderMenu() {
    S.screen = 'menu';
    const best = store.get('best', 0);
    app.innerHTML = `<header class="hl-top"><a class="hl-back" href="../index.html" aria-label="Yan oyunlar">‹</a><div class="hl-brand"><small>NEON XI · SIDE GAME</small><h1 class="sr">Higher or Lower</h1></div></header>
      <section class="hl-hero">
        <img class="hl-logo" src="./assets/hl-logo-v1.webp" width="760" height="420" alt="Higher or Lower" decoding="async">
        <p>İki futbolcu, tek soru. Doğru olanı seç, seriyi büyüt. İlk hatada oyun biter; her yeni oyunda soru değişir.</p>
        <button type="button" class="hl-play" id="hlPlay">OYNA</button>
        <div class="hl-mybest"><span>KİŞİSEL REKOR</span><b>${best}</b></div>
      </section>
      <section class="hl-board" aria-label="Rekorlar">
        <div class="hl-board-head"><span class="hl-board-title">REKORLAR</span><span class="nxlb-live">CANLI</span></div>
        <div class="hl-tabs"><button type="button" data-board="weekly" class="${S.board === 'weekly' ? 'on' : ''}">HAFTALIK</button><button type="button" data-board="all" class="${S.board === 'all' ? 'on' : ''}">TÜM ZAMANLAR</button></div>
        ${S.board === 'weekly' && window.NEON_LB ? `<p class="hl-board-note">Yeni hafta başlamasına <b>${window.NEON_LB.weekLeft()}</b></p>` : ''}
        <div class="hl-rows" id="hlRows"><div class="hl-empty">Rekorlar yükleniyor…</div></div>
      </section>`;
    document.getElementById('hlPlay').onclick = start;
    app.querySelectorAll('[data-board]').forEach(b => b.onclick = () => { S.board = b.dataset.board; renderMenu(); });
    fillBoard();
  }
  // Live board: re-renders on every database change while the menu is open.
  function fillBoard() {
    S.boardOff?.(); S.boardOff = null;
    const box = document.getElementById('hlRows'); if (!box) return;
    const api = window.NEON_HL_RECORDS, LB = window.NEON_LB;
    if (!api || !LB) { box.innerHTML = '<div class="hl-empty">Rekorlar yükleniyor…</div>'; return; }
    const board = S.board;
    S.boardOff = api.watch(board, (rows, err) => {
      const el = document.getElementById('hlRows'); if (!el || S.board !== board || S.screen !== 'menu') return;
      if (!rows) { el.innerHTML = `<div class="hl-empty">${esc(err && err.message || 'Liderlik tablosu şu an açılamıyor.')}</div>`; return; }
      el.innerHTML = LB.html(rows.map(r => ({ uid: r.uid, username: r.username, score: r.best })), {
        id: 'hl-' + board, me: (rows.find(r => r.me) || {}).uid, unit: 'SERİ', limit: 20,
        empty: board === 'weekly' ? 'Bu hafta henüz rekor yok. İlk sen ol!' : 'Henüz rekor yok.'
      });
      LB.paint(el, uid => api.avatar(uid));
    });
  }
  function start() {
    S.boardOff?.(); S.boardOff = null;
    S.q = chooseQuestion(); S.pool = poolFor(S.q).sort((a, b) => b.r - a.r); S.streak = 0; S.stayRuns = 0; S.used = new Set(); S.busy = false;
    const pair = freshPair();
    if (!pair) { renderMenu(); return; }
    S.stay = pair.stay; S.chal = pair.chal;
    S.revealStay = false; renderGame(true);
    intro();
  }
  function intro() {
    const el = document.createElement('div'); el.className = 'hl-intro';
    el.innerHTML = `<small>BU OYUNUN SORUSU</small><b>${esc(S.q.q)}</b>${S.q.sub ? `<em>${esc(S.q.sub)}</em>` : ''}`;
    document.body.appendChild(el); setTimeout(() => el.classList.add('out'), 1900); setTimeout(() => el.remove(), 2300);
  }
  function renderGame(enter, both) {
    S.screen = 'game';
    app.innerHTML = `<header class="hl-top"><button type="button" class="hl-back" id="hlQuit" aria-label="Oyundan çık">‹</button><div class="hl-streak"><small>SERİ</small><b id="hlStreak">${S.streak}</b></div><div class="hl-best"><small>REKOR</small><b>${store.get('best', 0)}</b></div></header>
      <section class="hl-question"><b>${esc(S.q.q)}</b>${S.q.sub ? `<small>${esc(S.q.sub)}</small>` : ''}</section>
      <section class="hl-duel">${card(S.stay, 'stay' + (both ? ' enter' : ''), S.revealStay)}<div class="hl-vs">VS</div>${card(S.chal, 'chal' + (enter ? ' enter' : ''), false)}</section>
      <p class="hl-tip">Doğru olduğunu düşündüğün futbolcuya dokun.</p>`;
    document.getElementById('hlQuit').onclick = () => { if (!S.busy) renderMenu(); };
    app.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => pick(Number(b.dataset.pick)));
  }
  function countUp(el, q, p, ms) {
    const target = p[q.key], isDate = q.key === 'b';
    if (isDate || typeof target !== 'number' || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = shown(q, p); return; }
    const t0 = performance.now();
    const step = now => { const t = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - t, 3); const fake = { ...p, [q.key]: Math.round(target * e * 10) / 10 }; el.textContent = q.fmt(q.key === 'pv' || q.key === 'cv' ? Math.round(target * e) : Math.round(target * e), fake); if (t < 1) requestAnimationFrame(step); else el.textContent = shown(q, p); };
    requestAnimationFrame(step);
  }
  function pick(id) {
    if (S.busy || S.screen !== 'game') return; S.busy = true;
    const q = S.q, a = S.stay, b = S.chal, va = valueOf(q, a), vb = valueOf(q, b);
    const winner = va >= vb ? a : b, loser = winner === a ? b : a, correct = va === vb || id === winner.id;
    const cards = { [a.id]: app.querySelector(`.hl-card[data-pick="${a.id}"]`), [b.id]: app.querySelector(`.hl-card[data-pick="${b.id}"]`) };
    app.querySelectorAll('.hl-card').forEach(c => c.disabled = true);
    for (const p of [a, b]) { const el = app.querySelector(`[data-value="${p.id}"]`); el.classList.remove('hidden'); el.classList.add('revealed'); countUp(el, q, p, 900); }
    setTimeout(() => {
      cards[winner.id].classList.add('win'); cards[loser.id].classList.add('lose');
      cards[winner.id].insertAdjacentHTML('beforeend', `<span class="hl-stamp up">▲ ${q.low ? 'DAHA AZ' : 'KAZANAN'}</span>`);
      cards[loser.id].insertAdjacentHTML('beforeend', '<span class="hl-stamp down">▼</span>');
      cards[id].classList.add(correct ? 'right' : 'wrong');
      if (correct) {
        S.streak++; const s = document.getElementById('hlStreak'); s.textContent = S.streak; s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump');
        burst(cards[id], true); try { navigator.vibrate?.(18); } catch {}
        setTimeout(() => next(winner, loser), 1150);
      } else {
        burst(cards[id], false); try { navigator.vibrate?.([50, 40, 70]); } catch {}
        app.querySelector('.hl-duel').classList.add('shake');
        setTimeout(gameOver, 1500);
      }
    }, 950);
  }
  function burst(el, good) {
    const r = el.getBoundingClientRect(), fx = document.createElement('div');
    fx.className = 'hl-burst ' + (good ? 'good' : 'bad'); fx.style.left = (r.left + r.width / 2) + 'px'; fx.style.top = (r.top + r.height / 2) + 'px';
    fx.innerHTML = good ? '<b>+1</b>' + Array.from({ length: 12 }, (_, i) => `<i style="--a:${i * 30}deg"></i>`).join('') : '<b>✕</b>';
    document.body.appendChild(fx); setTimeout(() => fx.remove(), 900);
  }
  const MAX_STAYS = 2;
  // Fresh pair: a new stayer (value hidden again) and a challenger for it.
  function freshPair() {
    const depth = Math.min(S.pool.length, 400 + S.streak * 120);
    for (let tries = 0; tries < 40; tries++) {
      const stay = S.pool[Math.floor(Math.random() * depth)];
      if (!stay || S.used.has(stay.id)) continue;
      const chal = pickChallenger(S.q, stay);
      if (chal) { S.used.add(stay.id); S.used.add(chal.id); return { stay, chal }; }
    }
    return null;
  }
  function next(winner, loser) {
    S.stayRuns = winner === S.stay ? (S.stayRuns || 0) + 1 : 1;
    let chal = S.stayRuns < MAX_STAYS ? pickChallenger(S.q, winner) : null;
    const out = app.querySelector(`.hl-card[data-pick="${loser.id}"]`);
    if (chal) {
      S.stay = winner; S.chal = chal; S.used.add(chal.id); S.revealStay = true; S.busy = false;
      if (out) out.classList.add('leave');
      setTimeout(() => renderGame(true), 260);
      return;
    }
    // The stayer has had its run (or nobody can beat it, like Messi on market value): both cards change.
    const pair = freshPair();
    if (!pair) { gameOver(true); return; }
    S.stay = pair.stay; S.chal = pair.chal; S.stayRuns = 0; S.revealStay = false; S.busy = false;
    app.querySelectorAll('.hl-card').forEach(c => c.classList.add('leave'));
    const tag = document.createElement('div'); tag.className = 'hl-swap'; tag.textContent = 'YENİ İKİLİ';
    document.body.appendChild(tag); setTimeout(() => tag.remove(), 1100);
    setTimeout(() => renderGame(true, true), 300);
  }
  function gameOver(cleared) {
    S.screen = 'over'; S.busy = false;
    // One record for the whole game, whatever the question was.
    const prev = store.get('best', 0), record = S.streak > prev;
    if (record) store.set('best', S.streak);
    store.set('games', store.get('games', 0) + 1);
    window.NEON_HL_RECORDS?.submit({ streak: S.streak, question: S.q.id, questionLabel: S.q.q }).catch(() => {});
    const el = document.createElement('div'); el.className = 'hl-over' + (record ? ' record' : '');
    el.innerHTML = `<div class="hl-over-box">
      <small>${cleared ? 'HAVUZ TÜKENDİ!' : 'SERİ BİTTİ'}</small>
      <div class="hl-over-q">${esc(S.q.q)}</div>
      <div class="hl-over-num" id="hlOverNum">0</div>
      <div class="hl-over-label">DOĞRU CEVAP</div>
      ${record ? '<div class="hl-over-rec">★ YENİ KİŞİSEL REKOR ★</div>' : `<div class="hl-over-prev">Rekorun: ${Math.max(prev, S.streak)}</div>`}
      <div class="hl-over-btns"><button type="button" class="hl-play" id="hlAgain">YENİ OYUN · YENİ SORU</button><button type="button" class="hl-ghost" id="hlMenu">REKORLAR</button></div>
    </div>`;
    document.body.appendChild(el);
    const num = el.querySelector('#hlOverNum'), t0 = performance.now(), dur = Math.min(2200, 500 + S.streak * 90);
    const step = now => { const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3); num.textContent = Math.round(S.streak * e); if (t < 1) requestAnimationFrame(step); else num.classList.add('done'); };
    setTimeout(() => requestAnimationFrame(step), 450);
    el.querySelector('#hlAgain').onclick = () => { el.remove(); start(); };
    el.querySelector('#hlMenu').onclick = () => { el.remove(); renderMenu(); };
  }

  async function init() {
    app.innerHTML = '<div class="hl-loading">Oyuncular yükleniyor…</div>';
    try {
      const meta = await (await fetch('./data/meta.json', { cache: 'no-cache' })).json();
      const rows = await (await fetch('./data/players.json?v=' + encodeURIComponent(meta.generated_at || ''), { cache: 'force-cache' })).json();
      S.meta = meta; S.players = rows; renderMenu();
    } catch (e) { app.innerHTML = '<div class="hl-loading">Oyuncu verisi yüklenemedi. Sayfayı yenile.</div>'; }
  }
  window.NEON_HL = { refreshBoard: () => { if (S.screen === 'menu') fillBoard(); }, questions: QUESTIONS };
  init();
})();
