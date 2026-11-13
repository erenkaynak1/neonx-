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

  /* info: {label, detail, direction:'high'|'low', mode:'sum'|'avg', firstName, players} */
  function show(info) {
    style(); close();
    const high = info.direction !== 'low', avg = info.mode === 'avg';
    const el = document.createElement('div');
    el.className = 'e11i'; el.dataset.dir = high ? 'high' : 'low';
    el.style.setProperty('--t', high ? 'var(--neon-primary,#baff18)' : 'var(--neon-cyan,#00eaff)');
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Maç görevi');
    const words = String(info.label || '').split(/\s+/).filter(Boolean).map((w, i) => `<span style="animation-delay:${(.6 + i * .16).toFixed(2)}s">${esc(w)}</span>`).join(' ');
    const n = info.players || 7;
    const rule = `${n} oyuncunun <b>${avg ? 'ortalaması' : 'toplamı'}</b> en <b>${high ? 'yüksek' : 'düşük'}</b> olan kadro kazanır.`;
    el.innerHTML = `<div class="e11i-box">
      <div class="e11i-eyebrow">MAÇ GÖREVİ</div>
      <div class="e11i-lead">Kadronu şuna göre kur</div>
      <div class="e11i-param">${words}</div>
      <div class="e11i-line"></div>
      <div class="e11i-dir"><i>${high ? '▲' : '▼'}</i>${high ? 'EN YÜKSEK' : 'EN DÜŞÜK'}</div>
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

  window.EN11_INTRO = { show, close, get open() { return !!current; } };
})();
