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
  function pickChallenger(q, stay) {
    const pool = S.pool, sv = valueOf(q, stay);
    // Early on: famous players and clear gaps. The longer the streak, the deeper and closer it gets.
    const depth = Math.min(pool.length, 500 + S.streak * 120);
    const close = S.streak >= 6;
    const ratioCap = Math.max(0.12, 1.1 - S.streak * 0.07);
    const candidates = [];
    for (let i = 0; i < depth; i++) {
      const p = pool[i]; if (p.id === stay.id || S.used.has(p.id)) continue;
      const v = valueOf(q, p); if (v === sv) continue;
      if (close && q.key !== 'b' && sv > 0 && v > 0 && Math.abs(Math.log(v / sv)) > ratioCap) continue;
      if (close && q.key === 'b' && Math.abs(v - sv) > Math.max(400, 4000 - S.streak * 220)) continue;
      candidates.push(p);
    }
    const list = candidates.length ? candidates : pool.filter(p => p.id !== stay.id && !S.used.has(p.id) && valueOf(q, p) !== sv);
    if (!list.length) return null;
    return list[Math.floor(Math.random() * Math.min(list.length, 260))];
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
    const best = store.get('best', 0), byQ = store.get('bestByQ', {});
    const qBest = QUESTIONS.filter(q => byQ[q.id]).sort((a, b) => byQ[b.id] - byQ[a.id]).slice(0, 4);
    app.innerHTML = `<header class="hl-top"><a class="hl-back" href="../index.html" aria-label="Yan oyunlar">‹</a><div class="hl-brand"><small>NEON XI · SIDE GAME</small><h1>HIGHER <i>OR</i> LOWER</h1></div></header>
      <section class="hl-hero">
        <div class="hl-arrows" aria-hidden="true"><span>▲</span><span>▼</span></div>
        <p>İki futbolcu, tek soru. Doğru olanı seç, seriyi büyüt. İlk hatada oyun biter; her yeni oyunda soru değişir.</p>
        <button type="button" class="hl-play" id="hlPlay">OYNA</button>
        <div class="hl-mybest"><span>KİŞİSEL REKOR</span><b>${best}</b></div>
        ${qBest.length ? `<div class="hl-qbest">${qBest.map(q => `<span><em>${esc(q.q.replace(/^Hangisi(nin)? /, '').replace(/\?$/, ''))}</em><b>${byQ[q.id]}</b></span>`).join('')}</div>` : ''}
      </section>
      <section class="hl-board" aria-label="Rekorlar">
        <div class="hl-tabs"><button type="button" data-board="weekly" class="${S.board === 'weekly' ? 'on' : ''}">HAFTALIK</button><button type="button" data-board="all" class="${S.board === 'all' ? 'on' : ''}">TÜM ZAMANLAR</button></div>
        <div class="hl-rows" id="hlRows"><div class="hl-empty">Rekorlar yükleniyor…</div></div>
      </section>`;
    document.getElementById('hlPlay').onclick = start;
    app.querySelectorAll('[data-board]').forEach(b => b.onclick = () => { S.board = b.dataset.board; renderMenu(); });
    fillBoard();
  }
  function fillBoard() {
    const box = document.getElementById('hlRows'); if (!box) return;
    const api = window.NEON_HL_RECORDS;
    if (!api) { box.innerHTML = '<div class="hl-empty">Liderlik tablosu için giriş yapman gerekir.</div>'; return; }
    api.top(S.board).then(rows => {
      if (!document.getElementById('hlRows')) return;
      box.innerHTML = rows.length ? rows.map((r, i) => `<div class="hl-row${r.me ? ' me' : ''}"><span class="rk">${i + 1}</span><span class="nm">@${esc(r.username)}</span><span class="qq">${esc(r.questionLabel || '')}</span><b>${r.best}</b></div>`).join('')
        : `<div class="hl-empty">${S.board === 'weekly' ? 'Bu hafta henüz rekor yok. İlk sen ol!' : 'Henüz rekor yok.'}</div>`;
    }).catch(e => { box.innerHTML = `<div class="hl-empty">${esc(e && e.message || 'Liderlik tablosu şu an açılamıyor.')}</div>`; });
  }
  function start() {
    S.q = chooseQuestion(); S.pool = poolFor(S.q).sort((a, b) => b.r - a.r); S.streak = 0; S.used = new Set(); S.busy = false;
    const first = S.pool[Math.floor(Math.random() * Math.min(S.pool.length, 180))];
    S.stay = first; S.used.add(first.id); S.chal = pickChallenger(S.q, first); S.used.add(S.chal.id);
    S.revealStay = false; renderGame(true);
    intro();
  }
  function intro() {
    const el = document.createElement('div'); el.className = 'hl-intro';
    el.innerHTML = `<small>BU OYUNUN SORUSU</small><b>${esc(S.q.q)}</b>${S.q.sub ? `<em>${esc(S.q.sub)}</em>` : ''}`;
    document.body.appendChild(el); setTimeout(() => el.classList.add('out'), 1900); setTimeout(() => el.remove(), 2300);
  }
  function renderGame(enter) {
    S.screen = 'game';
    app.innerHTML = `<header class="hl-top"><button type="button" class="hl-back" id="hlQuit" aria-label="Oyundan çık">‹</button><div class="hl-streak"><small>SERİ</small><b id="hlStreak">${S.streak}</b></div><div class="hl-best"><small>REKOR</small><b>${store.get('best', 0)}</b></div></header>
      <section class="hl-question"><b>${esc(S.q.q)}</b>${S.q.sub ? `<small>${esc(S.q.sub)}</small>` : ''}</section>
      <section class="hl-duel">${card(S.stay, 'stay', S.revealStay)}<div class="hl-vs">VS</div>${card(S.chal, 'chal' + (enter ? ' enter' : ''), false)}</section>
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
  function next(winner, loser) {
    const chal = pickChallenger(S.q, winner);
    if (!chal) { gameOver(true); return; }
    S.stay = winner; S.chal = chal; S.used.add(chal.id); S.revealStay = true; S.busy = false;
    const out = app.querySelector(`.hl-card[data-pick="${loser.id}"]`); if (out) out.classList.add('leave');
    setTimeout(() => renderGame(true), 260);
  }
  function gameOver(cleared) {
    S.screen = 'over'; S.busy = false;
    const prev = store.get('best', 0), byQ = store.get('bestByQ', {}), prevQ = byQ[S.q.id] || 0;
    const record = S.streak > prev, qRecord = S.streak > prevQ;
    if (record) store.set('best', S.streak);
    if (qRecord) { byQ[S.q.id] = S.streak; store.set('bestByQ', byQ); }
    store.set('games', store.get('games', 0) + 1);
    window.NEON_HL_RECORDS?.submit({ streak: S.streak, question: S.q.id, questionLabel: S.q.q }).catch(() => {});
    const el = document.createElement('div'); el.className = 'hl-over' + (record ? ' record' : '');
    el.innerHTML = `<div class="hl-over-box">
      <small>${cleared ? 'HAVUZ TÜKENDİ!' : 'SERİ BİTTİ'}</small>
      <div class="hl-over-q">${esc(S.q.q)}</div>
      <div class="hl-over-num" id="hlOverNum">0</div>
      <div class="hl-over-label">DOĞRU CEVAP</div>
      ${record ? '<div class="hl-over-rec">★ YENİ KİŞİSEL REKOR ★</div>' : qRecord && S.streak ? '<div class="hl-over-rec q">Bu soruda yeni rekor</div>' : `<div class="hl-over-prev">Rekorun: ${Math.max(prev, S.streak)}</div>`}
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
