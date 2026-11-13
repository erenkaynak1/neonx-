/* NEON XI — EN 11 match intro.
   The parameter is picked at random and players used to find it only as a small badge. This overlay
   announces it when a match starts: what you build the squad for, whether high or low wins, how the
   seven values are combined and who picks first. Pure presentation: window.EN11_INTRO.show(info) is
   called by the game with data it already has; nothing here reads or changes game state. */
(() => {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const HOLD_MS = 6500;
  let current = null, timer = 0;

  function style() {
    if (document.getElementById('en11-intro-style')) return;
    const st = document.createElement('style'); st.id = 'en11-intro-style';
    st.textContent = `
.e11i{position:fixed;inset:0;z-index:2147483100;display:grid;place-items:center;padding:24px 18px;overflow:hidden;background:rgba(3,5,8,.9);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#f3f6f8;font-family:var(--nxu-body,"Barlow",system-ui,sans-serif);animation:e11iIn .35s ease both;cursor:pointer}
.e11i.out{animation:e11iOut .32s ease both}
@keyframes e11iIn{from{opacity:0}to{opacity:1}}@keyframes e11iOut{to{opacity:0;transform:scale(1.04)}}
.e11i::before{content:"";position:absolute;inset:-20%;background:radial-gradient(40% 30% at 50% 42%,color-mix(in srgb,var(--t) 26%,transparent),transparent 70%),repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 3px);pointer-events:none}
.e11i::after{content:"";position:absolute;left:0;right:0;top:0;height:140px;background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--t) 10%,transparent),transparent);animation:e11iScan 2.6s linear infinite;pointer-events:none}
@keyframes e11iScan{from{transform:translateY(-160px)}to{transform:translateY(100svh)}}
.e11i-box{position:relative;display:grid;justify-items:center;gap:14px;width:min(100%,440px);text-align:center}
.e11i-eyebrow{display:flex;align-items:center;gap:10px;color:var(--t);font:800 12px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.42em;text-indent:.42em;text-shadow:0 0 10px var(--t);animation:e11iUp .5s cubic-bezier(.2,.8,.2,1) .1s both}
.e11i-eyebrow::before,.e11i-eyebrow::after{content:"";width:28px;height:1.5px;background:linear-gradient(90deg,transparent,var(--t))}
.e11i-eyebrow::after{transform:scaleX(-1)}
.e11i-lead{color:#aab6c0;font:700 15px/1.2 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.2em;text-transform:uppercase;animation:e11iUp .5s cubic-bezier(.2,.8,.2,1) .35s both}
.e11i-param{position:relative;margin:2px 0;font:italic 900 clamp(38px,12.5vw,60px)/.96 var(--nxu-display,"Barlow Condensed",sans-serif);text-transform:uppercase;letter-spacing:.01em;color:#fff;text-shadow:0 0 14px var(--t),0 0 44px color-mix(in srgb,var(--t) 60%,transparent);text-wrap:balance}
.e11i-param span{display:inline-block;opacity:0;animation:e11iWord .55s cubic-bezier(.2,.8,.2,1) both}
@keyframes e11iWord{0%{opacity:0;transform:translateY(26px) scale(1.5);filter:blur(10px)}60%{opacity:1;filter:none}100%{opacity:1;transform:none}}
.e11i-line{width:0;height:3px;border-radius:2px;background:var(--t);box-shadow:0 0 14px var(--t);animation:e11iLine .6s cubic-bezier(.2,.8,.2,1) 1.25s both}
@keyframes e11iLine{to{width:min(70%,260px)}}
.e11i-dir{display:inline-flex;align-items:center;gap:10px;padding:10px 18px;background:var(--t);color:#0b1005;font:900 20px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.14em;clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%);animation:e11iStamp .5s cubic-bezier(.2,.8,.2,1) 1.5s both}
.e11i-dir i{font-style:normal;animation:e11iBob .9s ease-in-out 2s infinite}
.e11i[data-dir="low"] .e11i-dir i{animation-name:e11iBobDown}
.e11i[data-dir="target"] .e11i-dir{font-size:24px}.e11i[data-dir="target"] .e11i-dir i{animation-name:e11iPing}
@keyframes e11iPing{50%{transform:scale(1.35)}}
@keyframes e11iStamp{0%{opacity:0;transform:scale(2.2) rotate(-6deg)}70%{opacity:1;transform:scale(.94)}100%{opacity:1;transform:none}}
@keyframes e11iBob{50%{transform:translateY(-4px)}}@keyframes e11iBobDown{50%{transform:translateY(4px)}}
.e11i-rule{max-width:340px;color:#f3f6f8;font:600 15px/1.4 var(--nxu-body,"Barlow",system-ui,sans-serif);animation:e11iUp .5s cubic-bezier(.2,.8,.2,1) 1.95s both}
.e11i-rule b{color:var(--t)}
.e11i-detail{color:#75828d;font-size:12.5px;line-height:1.4;animation:e11iUp .5s cubic-bezier(.2,.8,.2,1) 2.15s both}
.e11i-first{display:inline-flex;align-items:center;gap:8px;margin-top:4px;padding:8px 14px;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.04);color:#aab6c0;font:700 12px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.14em;animation:e11iUp .5s cubic-bezier(.2,.8,.2,1) 2.4s both}
.e11i-first b{color:#f3f6f8}
.e11i-go{margin-top:8px;min-height:50px;padding:0 34px;border:0;border-radius:12px;background:var(--neon-primary,#baff18);color:#0b1005;font:900 17px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.16em;cursor:pointer;box-shadow:0 0 26px rgba(186,255,24,.4);animation:e11iUp .5s cubic-bezier(.2,.8,.2,1) 2.7s both}
.e11i-bar{width:min(60%,220px);height:3px;border-radius:2px;background:rgba(255,255,255,.1);overflow:hidden;animation:e11iUp .4s ease 2.9s both}
.e11i-bar i{display:block;height:100%;background:var(--t);transform-origin:left;animation:e11iBar ${HOLD_MS - 3000}ms linear 3s both}
@keyframes e11iBar{from{transform:scaleX(1)}to{transform:scaleX(0)}}
@keyframes e11iUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.e11f{cursor:default}
.e11f .e11i-lead{color:#f3f6f8;font-size:22px;letter-spacing:.06em}
.e11f-target{animation:e11iStamp .5s cubic-bezier(.2,.8,.2,1) .6s both!important;font-size:24px!important}
.e11f-teams{display:grid;gap:16px;width:100%;margin-top:6px;animation:e11iUp .5s cubic-bezier(.2,.8,.2,1) 1s both}
.e11f-team{--c:var(--neon-primary,#baff18);display:grid;grid-template-columns:1fr auto;align-items:end;gap:4px 10px;padding:14px 14px 12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);text-align:left;transition:opacity .5s,border-color .4s,box-shadow .4s,transform .4s}
.e11f-team.t1{--c:var(--neon-cyan,#00eaff)}
.e11f-name{color:var(--c);font:800 16px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.1em;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.e11f-num{color:#fff;font:italic 900 34px/1 var(--nxu-display,"Barlow Condensed",sans-serif);font-variant-numeric:tabular-nums;text-shadow:0 0 14px var(--c)}
.e11f-track{grid-column:1/-1;position:relative;height:10px;border-radius:5px;background:rgba(255,255,255,.08);overflow:visible}
.e11f-track i{display:block;width:0;height:100%;border-radius:5px;background:linear-gradient(90deg,color-mix(in srgb,var(--c) 40%,transparent),var(--c));box-shadow:0 0 12px var(--c)}
.e11f-track span{position:absolute;top:-6px;bottom:-6px;width:2px;margin-left:-1px;background:#fff;box-shadow:0 0 8px #fff}
.e11f-track span::after{content:"HEDEF";position:absolute;left:50%;top:-13px;transform:translateX(-50%);color:#aab6c0;font:800 8px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.2em}
.e11f-gap{grid-column:1/-1;min-height:14px;color:#aab6c0;font:700 13px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.12em;text-transform:uppercase;opacity:0;transition:opacity .4s}
.e11f-gap.in{opacity:1}
.e11f-team.won{border-color:var(--c);box-shadow:0 0 28px color-mix(in srgb,var(--c) 35%,transparent),inset 0 0 22px color-mix(in srgb,var(--c) 12%,transparent);transform:scale(1.03)}
.e11f-team.won .e11f-gap{color:var(--c)}.e11f-team.lost{opacity:.5}
.e11f-winner{font:italic 900 clamp(30px,9vw,42px)/1 var(--nxu-display,"Barlow Condensed",sans-serif);text-transform:uppercase;color:#fff;text-shadow:0 0 14px var(--neon-primary,#baff18),0 0 40px rgba(186,255,24,.5);animation:e11iStamp .6s cubic-bezier(.2,.8,.2,1) both}
.e11f-go{animation:e11iUp .4s ease both!important}
@media (prefers-reduced-motion:reduce){.e11i,.e11i *,.e11i::after{animation-duration:.01s!important;animation-delay:0s!important}.e11i-line{width:min(70%,260px)}}
`;
    document.head.appendChild(st);
  }

  function close() {
    clearTimeout(timer);
    const el = current; current = null;
    if (!el) return;
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  }

  /* info: {label, detail, direction:'high'|'low'|'target', target (formatted, target matches), mode:'sum'|'avg', firstName, players} */
  function show(info) {
    style(); close();
    const target = info.direction === 'target' && info.target, high = info.direction !== 'low', avg = info.mode === 'avg';
    const el = document.createElement('div');
    el.className = 'e11i'; el.dataset.dir = target ? 'target' : high ? 'high' : 'low';
    el.style.setProperty('--t', high ? 'var(--neon-primary,#baff18)' : 'var(--neon-cyan,#00eaff)');
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Maç görevi');
    const words = String(info.label || '').split(/\s+/).filter(Boolean).map((w, i) => `<span style="animation-delay:${(.6 + i * .16).toFixed(2)}s">${esc(w)}</span>`).join(' ');
    const n = info.players || 7;
    const rule = target
      ? `${n} oyuncunun <b>${avg ? 'ortalaması' : 'toplamı'}</b> hedefe <b>en yakın</b> olan kadro kazanır. Hedefi aşmak da seni uzaklaştırır. <b>Değerler maç sonuna kadar gizli.</b>`
      : `${n} oyuncunun <b>${avg ? 'ortalaması' : 'toplamı'}</b> en <b>${high ? 'yüksek' : 'düşük'}</b> olan kadro kazanır.`;
    el.innerHTML = `<div class="e11i-box">
      <div class="e11i-eyebrow">MAÇ GÖREVİ</div>
      <div class="e11i-lead">${target ? 'Hedefe en yakın kadroyu kur' : 'Kadronu şuna göre kur'}</div>
      <div class="e11i-param">${words}</div>
      <div class="e11i-line"></div>
      <div class="e11i-dir"><i>${target ? '◎' : high ? '▲' : '▼'}</i>${target ? 'HEDEF ' + esc(info.target) : high ? 'EN YÜKSEK' : 'EN DÜŞÜK'}</div>
      <div class="e11i-rule">${rule}</div>
      ${info.detail ? `<div class="e11i-detail">${esc(info.detail)}</div>` : ''}
      ${info.firstName ? `<div class="e11i-first">İLK SEÇİM <b>${esc(info.firstName)}</b></div>` : ''}
      <button type="button" class="e11i-go">BAŞLA</button>
      <div class="e11i-bar"><i></i></div>
    </div>`;
    el.addEventListener('click', close);
    document.body.appendChild(el);
    current = el;
    timer = setTimeout(close, HOLD_MS);
  }

  /* ---------- Target-match finale ----------
     info: {label, target, targetText, totals:[a,b], names:[a,b], winner:0|1|null, format(v), gap(v), onDone()} */
  function finale(info) {
    style(); close();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = document.createElement('div');
    el.className = 'e11i e11f'; el.style.setProperty('--t', 'var(--neon-primary,#baff18)');
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Maç sonucu');
    const scale = Math.max(info.target, info.totals[0], info.totals[1], 1) * 1.12, mark = (info.target / scale * 100).toFixed(2);
    const row = i => `<div class="e11f-team t${i}"><div class="e11f-name">${esc(info.names[i])}</div><div class="e11f-num" data-i="${i}">${esc(info.format(0))}</div>
      <div class="e11f-track"><i data-i="${i}"></i><span style="left:${mark}%"></span></div><div class="e11f-gap" data-i="${i}">&nbsp;</div></div>`;
    el.innerHTML = `<div class="e11i-box">
      <div class="e11i-eyebrow">KADROLAR TAMAM</div>
      <div class="e11i-lead">${esc(info.label)}</div>
      <div class="e11i-dir e11f-target"><i>◎</i>HEDEF ${esc(info.targetText)}</div>
      <div class="e11f-teams">${row(0)}${row(1)}</div>
      <div class="e11f-winner" hidden></div>
      <button type="button" class="e11i-go e11f-go" hidden>KADROLARI GÖR</button>
    </div>`;
    document.body.appendChild(el); current = el;
    const nums = [...el.querySelectorAll('.e11f-num')], bars = [...el.querySelectorAll('.e11f-track i')], gaps = [...el.querySelectorAll('.e11f-gap')];
    const done = () => { if (current === el) close(); try { info.onDone && info.onDone(); } catch {} };
    const reveal = () => {
      if (!el.isConnected) return;
      info.totals.forEach((v, i) => { nums[i].textContent = info.format(v); bars[i].style.width = (v / scale * 100) + '%'; gaps[i].textContent = info.gap(v); gaps[i].classList.add('in'); });
      setTimeout(() => {
        if (!el.isConnected) return;
        const w = el.querySelector('.e11f-winner'); w.hidden = false;
        w.textContent = info.winner == null ? 'BERABERE' : info.names[info.winner] + ' KAZANDI';
        if (info.winner != null) { el.querySelector('.e11f-team.t' + info.winner).classList.add('won'); el.querySelector('.e11f-team.t' + (1 - info.winner)).classList.add('lost'); }
        try { navigator.vibrate?.([30, 40, 80]); } catch {}
        setTimeout(() => { const b = el.querySelector('.e11f-go'); if (b) { b.hidden = false; b.onclick = done; } }, 900);
      }, reduce ? 0 : 900);
    };
    if (reduce) { reveal(); return; }
    // Both totals climb together, slowing down toward the end so the last few steps are the tense ones.
    const start = performance.now() + 1500, dur = 5200;
    const ease = t => 1 - Math.pow(1 - t, 3.2);
    const step = now => {
      if (!el.isConnected) return;
      const t = Math.min(1, Math.max(0, (now - start) / dur)), e = ease(t);
      info.totals.forEach((v, i) => { nums[i].textContent = info.format(v * e); bars[i].style.width = (v * e / scale * 100) + '%'; });
      if (t < 1) requestAnimationFrame(step); else reveal();
    };
    requestAnimationFrame(step);
  }

  window.EN11_INTRO = { show, finale, close, get open() { return !!current; } };
})();
