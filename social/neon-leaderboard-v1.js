/* NEON XI — shared leaderboard view.
   window.NEON_LB.html(rows, opts) draws a podium (gold / silver / bronze frames) for the top three and a ranked
   list for the rest, with each player's avatar. A player outside the visible list gets a pinned "your rank" row.
   Rows: {uid, username, score, sub?, podSub? (shorter line under a podium place)}. opts: {me, unit, limit, empty, id}.
   Calling html() again for the same `id` compares with the previous call, so live updates show what moved:
   a new score flashes and rank changes get ▲/▼ markers.
   Each place carries data-lb-player / data-lb-name so the page can open that player's card.
   NEON_LB.paint(root, loadAvatar) fills the avatar slots; loadAvatar(uid) resolves to the stored avatar id.
   Pure presentation: no Firebase access here. Loads neon-avatars-v1.js on demand. */
(() => {
  'use strict';
  if (window.NEON_LB) return;
  const SRC = document.currentScript?.src || location.href;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('tr-TR');
  const MEDAL = ['gold', 'silver', 'bronze'];
  const prev = new Map(); // id -> Map(uid -> {rank, score})
  const cache = new Map(), pending = new Map();

  let libPromise = null;
  function ensure() {
    injectStyle();
    if (window.NEON_AVATARS) return Promise.resolve(true);
    if (!libPromise) libPromise = new Promise(res => {
      const s = document.createElement('script');
      s.src = new URL('./neon-avatars-v1.js?v=20261116-karaboga', SRC).href;
      s.onload = () => res(true); s.onerror = () => res(false);
      document.head.appendChild(s);
    });
    return libPromise;
  }

  const slot = (uid, name) => `<span class="nxlb-av" data-lb-uid="${esc(uid)}"><b>${esc(String(name || '?').slice(0, 1).toUpperCase())}</b></span>`;

  function html(rows, opts = {}) {
    injectStyle();
    const limit = opts.limit || 20, unit = opts.unit || '', me = opts.me || '';
    const list = rows.slice().sort((a, b) => b.score - a.score);
    if (!list.length) return `<div class="nxlb-empty">${esc(opts.empty || 'Henüz kayıt yok.')}</div>`;
    // Equal scores share a rank (1, 2, 2, 4).
    let rank = 0, last = null;
    list.forEach((r, i) => { if (r.score !== last) { rank = i + 1; last = r.score; } r.rank = rank; });
    const before = opts.id ? prev.get(opts.id) : null, now = new Map();
    list.forEach(r => now.set(r.uid, { rank: r.rank, score: r.score }));
    if (opts.id) prev.set(opts.id, now);
    const delta = r => {
      const p = before?.get(r.uid); if (!before) return { cls: '', mark: '' };
      if (!p) return { cls: ' is-new', mark: '<i class="nxlb-mv up">YENİ</i>' };
      const cls = r.score !== p.score ? ' is-changed' : '';
      if (p.rank > r.rank) return { cls, mark: `<i class="nxlb-mv up">▲${p.rank - r.rank}</i>` };
      if (p.rank < r.rank) return { cls, mark: `<i class="nxlb-mv down">▼${r.rank - p.rank}</i>` };
      return { cls, mark: '' };
    };
    // Every place opens the player's card (NEON_SOCIAL listens for clicks on [data-lb-player]).
    const who = r => `data-lb-player="${esc(r.uid)}" data-lb-name="${esc(r.username)}" role="button" tabindex="0" aria-label="@${esc(r.username)} profilini aç"`;
    const score = r => `${nf.format(r.score)}${unit ? `<small>${esc(unit)}</small>` : ''}`;
    const podium = list.slice(0, 3), rest = list.slice(3, limit);
    const order = podium.length === 3 ? [podium[1], podium[0], podium[2]] : podium.length === 2 ? [podium[1], podium[0]] : podium;
    const pod = order.map(r => {
      const m = MEDAL[Math.min(r.rank, 3) - 1], d = delta(r);
      return `<div class="nxlb-pod ${m}${r.uid === me ? ' me' : ''}${d.cls}" ${who(r)}>
        ${r.rank === 1 ? '<span class="nxlb-crown" aria-hidden="true">♛</span>' : ''}
        <span class="nxlb-ring">${slot(r.uid, r.username)}<em>${r.rank}</em></span>
        <b class="nxlb-name">@${esc(r.username)}</b>
        <strong class="nxlb-score">${score(r)}</strong>
        ${(r.podSub || r.sub) ? `<small class="nxlb-sub">${esc(r.podSub || r.sub)}</small>` : ''}${d.mark}
        <span class="nxlb-step" aria-hidden="true"></span>
      </div>`;
    }).join('');
    const row = r => {
      const d = delta(r), m = r.rank <= 3 ? ` ${MEDAL[r.rank - 1]}` : '';
      return `<div class="nxlb-row${m}${r.uid === me ? ' me' : ''}${d.cls}" ${who(r)}><span class="nxlb-rk">${r.rank}</span>${slot(r.uid, r.username)}
        <span class="nxlb-who"><b>@${esc(r.username)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span>${d.mark}<strong>${score(r)}</strong></div>`;
    };
    const mine = me ? list.find(r => r.uid === me) : null;
    const pinned = mine && list.indexOf(mine) >= limit
      ? `<div class="nxlb-mine"><span>SENİN SIRAN</span>${row(mine)}${(() => { const above = list[list.indexOf(mine) - 1]; return above ? `<p>Bir üst sıra için <b>${nf.format(above.score - mine.score + (above.score === mine.score ? 0 : 1))}</b> ${esc(unit || 'puan')} daha.</p>` : ''; })()}</div>` : '';
    return `<div class="nxlb"><div class="nxlb-podium n${podium.length}">${pod}</div>${rest.length ? `<div class="nxlb-list">${rest.map(row).join('')}</div>` : ''}${pinned}</div>`;
  }

  function paint(root, loadAvatar) {
    if (!root) return;
    ensure().then(() => {
      const A = window.NEON_AVATARS; if (!A) return;
      root.querySelectorAll('.nxlb-av[data-lb-uid]').forEach(el => {
        const uid = el.dataset.lbUid;
        const put = id => { const r = A.resolve(id || '', uid); if (el.dataset.av === r) return; el.dataset.av = r; el.innerHTML = A.html(r, 'small'); };
        if (cache.has(uid)) { put(cache.get(uid)); return; }
        put('');
        if (!loadAvatar) return;
        if (!pending.has(uid)) pending.set(uid, Promise.resolve(loadAvatar(uid)).then(id => { cache.set(uid, String(id || '')); return cache.get(uid); }).catch(() => '').finally(() => pending.delete(uid)));
        pending.get(uid).then(put);
      });
    });
  }
  const setAvatar = (uid, id) => cache.set(uid, String(id || ''));

  // Time left until the weekly board resets (Monday 00:00 UTC, the same ISO week key the boards use).
  function weekLeft(now = new Date()) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 8 - day);
    const ms = d - now, h = Math.floor(ms / 3600000);
    return h >= 24 ? `${Math.floor(h / 24)}g ${h % 24}s` : `${h}s ${Math.floor(ms / 60000) % 60}dk`;
  }

  let styled = false;
  function injectStyle() {
    if (styled || !document.head) return; styled = true;
    const st = document.createElement('style'); st.id = 'nxlb-style';
    st.textContent = `
.nxlb{--g1:#fff3b0;--g2:#ffd23f;--g3:#a87a00;--s1:#ffffff;--s2:#c9d3db;--s3:#6f7d88;--b1:#ffd0a6;--b2:#d9874a;--b3:#7c3f14;display:grid;gap:12px}
.nxlb-podium{display:grid;grid-template-columns:1fr 1.18fr 1fr;align-items:end;gap:8px;padding-top:22px}
.nxlb-podium.n1{grid-template-columns:minmax(0,180px);justify-content:center}.nxlb-podium.n2{grid-template-columns:1fr 1.18fr;max-width:320px;margin:0 auto;width:100%}
.nxlb-pod{position:relative;display:grid;justify-items:center;gap:4px;min-width:0;text-align:center;animation:nxlbRise .55s cubic-bezier(.2,.8,.2,1) both}
.nxlb-pod.silver{animation-delay:.08s}.nxlb-pod.bronze{animation-delay:.16s}
.nxlb-ring{position:relative;display:grid;place-items:center;width:62px;height:62px;padding:4px;border-radius:50%}
.nxlb-pod.gold .nxlb-ring{width:82px;height:82px;background:conic-gradient(from 210deg,var(--g1),var(--g2),var(--g3),var(--g2),var(--g1));box-shadow:0 0 22px rgba(255,210,63,.55)}
.nxlb-pod.silver .nxlb-ring{background:conic-gradient(from 210deg,var(--s1),var(--s2),var(--s3),var(--s2),var(--s1));box-shadow:0 0 16px rgba(201,211,219,.4)}
.nxlb-pod.bronze .nxlb-ring{background:conic-gradient(from 210deg,var(--b1),var(--b2),var(--b3),var(--b2),var(--b1));box-shadow:0 0 16px rgba(217,135,74,.4)}
.nxlb-ring .nxlb-av{width:100%;height:100%;box-shadow:0 0 0 3px #090c10}
.nxlb-ring em{position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);display:grid;place-items:center;min-width:24px;height:24px;padding:0 6px;border-radius:12px;color:#14100a;font:italic 900 14px/1 var(--nxu-display,"Barlow Condensed",sans-serif);box-shadow:0 0 0 2px #090c10}
.nxlb-pod.gold em{background:linear-gradient(180deg,var(--g1),var(--g2))}.nxlb-pod.silver em{background:linear-gradient(180deg,var(--s1),var(--s2))}.nxlb-pod.bronze em{background:linear-gradient(180deg,var(--b1),var(--b2))}
.nxlb-crown{position:absolute;top:-24px;left:50%;transform:translateX(-50%) rotate(-8deg);color:var(--g2);font-size:26px;line-height:1;text-shadow:0 0 12px rgba(255,210,63,.8);animation:nxlbCrown 2.4s ease-in-out infinite}
.nxlb-name{max-width:100%;margin-top:6px;overflow:hidden;color:#fff;font:800 14px/1.1 var(--nxu-display,"Barlow Condensed",sans-serif);text-overflow:ellipsis;white-space:nowrap}
.nxlb-score{font:italic 900 24px/1 var(--nxu-display,"Barlow Condensed",sans-serif);font-variant-numeric:tabular-nums}
.nxlb-pod.gold .nxlb-score{color:var(--g2);text-shadow:0 0 12px rgba(255,210,63,.5);font-size:30px}.nxlb-pod.silver .nxlb-score{color:var(--s2)}.nxlb-pod.bronze .nxlb-score{color:var(--b2)}
.nxlb-score small,.nxlb-row strong small{margin-left:3px;font-size:.45em;font-style:normal;letter-spacing:.08em;opacity:.75}
.nxlb-sub{max-width:100%;overflow:hidden;color:rgba(255,255,255,.5);font-size:10px;line-height:1.2;text-overflow:ellipsis;white-space:nowrap}
.nxlb-step{width:100%;height:34px;margin-top:4px;border-radius:10px 10px 4px 4px;background:linear-gradient(180deg,rgba(255,255,255,.1),rgba(255,255,255,.02));box-shadow:inset 0 1px 0 rgba(255,255,255,.18)}
.nxlb-pod.gold .nxlb-step{height:52px;background:linear-gradient(180deg,rgba(255,210,63,.32),rgba(255,210,63,.04));box-shadow:inset 0 2px 0 var(--g2)}
.nxlb-pod.silver .nxlb-step{background:linear-gradient(180deg,rgba(201,211,219,.24),rgba(201,211,219,.03));box-shadow:inset 0 2px 0 var(--s2)}
.nxlb-pod.bronze .nxlb-step{height:24px;background:linear-gradient(180deg,rgba(217,135,74,.26),rgba(217,135,74,.03));box-shadow:inset 0 2px 0 var(--b2)}
.nxlb-pod.me .nxlb-name{color:#baff18}
[data-lb-player]{cursor:pointer;-webkit-tap-highlight-color:transparent}.nxlb-row[data-lb-player]:hover{background:rgba(255,255,255,.07)}.nxlb-pod[data-lb-player]:active,.nxlb-row[data-lb-player]:active{transform:scale(.98)}[data-lb-player]:focus-visible{outline:2px solid #baff18;outline-offset:3px;border-radius:12px}
.nxlb-av{position:relative;display:grid;place-items:center;flex:none;width:36px;height:36px;overflow:hidden;border-radius:50%;background:#1a2128;color:rgba(255,255,255,.7);font:800 15px/1 var(--nxu-display,"Barlow Condensed",sans-serif)}
.nxlb-av img,.nxlb-av svg{display:block;width:100%;height:100%}
.nxlb-list{display:grid;gap:6px}
.nxlb-row{display:grid;grid-template-columns:28px 36px minmax(0,1fr) auto auto;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.035);box-shadow:inset 0 0 0 1px rgba(255,255,255,.05)}
.nxlb-rk{color:rgba(255,255,255,.5);font:800 15px/1 var(--nxu-display,"Barlow Condensed",sans-serif);text-align:center;font-variant-numeric:tabular-nums}
.nxlb-row.gold .nxlb-av{box-shadow:0 0 0 2px var(--g2)}.nxlb-row.silver .nxlb-av{box-shadow:0 0 0 2px var(--s2)}.nxlb-row.bronze .nxlb-av{box-shadow:0 0 0 2px var(--b2)}
.nxlb-who{display:grid;gap:2px;min-width:0}.nxlb-who b{overflow:hidden;color:#fff;font:800 15px/1.1 var(--nxu-display,"Barlow Condensed",sans-serif);text-overflow:ellipsis;white-space:nowrap}
.nxlb-who small{overflow:hidden;color:rgba(255,255,255,.5);font-size:11px;text-overflow:ellipsis;white-space:nowrap}
.nxlb-row strong{color:#baff18;font:italic 900 22px/1 var(--nxu-display,"Barlow Condensed",sans-serif);font-variant-numeric:tabular-nums}
.nxlb-row.me{background:rgba(186,255,24,.08);box-shadow:inset 3px 0 0 #baff18,inset 0 0 0 1px rgba(186,255,24,.25)}
.nxlb-mv{font:800 11px/1 var(--nxu-display,"Barlow Condensed",sans-serif);font-style:normal;letter-spacing:.06em}
.nxlb-mv.up{color:#baff18}.nxlb-mv.down{color:#ff5a6e}.nxlb-row .nxlb-mv{justify-self:end}
.nxlb-pod .nxlb-mv{position:absolute;top:0;right:4px}
.is-changed .nxlb-score,.is-changed>strong,.is-new .nxlb-score,.is-new>strong{animation:nxlbFlash 1.4s ease-out}
.nxlb-row.is-new,.nxlb-row.is-changed{animation:nxlbRow 1.4s ease-out}
.nxlb-mine{display:grid;gap:6px;padding-top:10px;border-top:1px dashed rgba(255,255,255,.14)}
.nxlb-mine>span{color:#baff18;font:800 10px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.24em}
.nxlb-mine p{margin:0;color:rgba(255,255,255,.6);font-size:12px}.nxlb-mine p b{color:#fff}
.nxlb-empty{padding:18px 8px;text-align:center;color:rgba(255,255,255,.6);font-size:13px}
.nxlb-live{display:inline-flex;align-items:center;gap:6px;color:#ff5a6e;font:800 10px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.2em}
.nxlb-live:before{content:"";width:7px;height:7px;border-radius:50%;background:#ff5a6e;box-shadow:0 0 8px #ff5a6e;animation:nxlbPulse 1.4s ease-in-out infinite}
.nx-lb-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.nx-lb-head .nx-social-label{margin:0}
.nx-lb-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:12px 0 8px}
.nx-lb-tabs button{min-height:36px;padding:0 6px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:rgba(255,255,255,.03);color:rgba(255,255,255,.62);font:800 11px/1.1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.12em;cursor:pointer}
.nx-lb-tabs button.on{border-color:#baff18;background:rgba(186,255,24,.08);color:#baff18}
.nx-lb-note{margin:0 0 4px;font-size:12px}.nx-lb-note b,.nx-lb-sum b{color:#baff18}.nx-lb-sum{margin:12px 0 0;font-size:12px;text-align:center}
@keyframes nxlbRise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes nxlbCrown{50%{transform:translateX(-50%) rotate(6deg) translateY(-2px)}}
@keyframes nxlbFlash{0%{transform:scale(1.35);filter:brightness(1.8)}100%{transform:none;filter:none}}
@keyframes nxlbRow{0%{background:rgba(186,255,24,.22)}100%{background:rgba(255,255,255,.035)}}
@keyframes nxlbPulse{50%{opacity:.35}}
@media (max-width:360px){.nxlb-row{grid-template-columns:24px 32px minmax(0,1fr) auto auto;gap:8px}.nxlb-av{width:32px;height:32px}}
@media (prefers-reduced-motion:reduce){.nxlb *{animation:none!important}}`;
    document.head.appendChild(st);
  }

  window.NEON_LB = Object.freeze({ html, paint, ensure, setAvatar, weekLeft });
})();
