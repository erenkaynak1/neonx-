/* NEON XI — Saha Fethi battle cinematic. A full-screen scene (not on the map): night stadium backdrop
   (assets/battle-stage.webp), a siege cannon that fires a football at the defender's goal, and the keeper.
   Attacker wins → the ball beats the keeper and bulges the net ("GOL!"); defender wins → the keeper dives and
   holds it ("KURTARDI!"). Scene units 1600x900, matching render_fethet_stage.cjs (goal line y=560, goal x≈1040).
   window.FX_CINEMA.play({ att, def, attLabel, defLabel, attCrest, defCrest, won }) → Promise (tap to skip). */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3), easeIn = t => t * t * t, easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function shade(hex, f) {  // f<0 darker, f>0 lighter
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const m = v => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
    return '#' + [m(r), m(g), m(b)].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  // Goal posts, crossbar and a perspective net (front frame 820..1260 x, crossbar y 360, goal line y 560).
  function goalSVG() {
    const FL = 820, FR = 1260, TOP = 360, GL = 560, BL = 872, BR = 1208, BTOP = 330, BGL = 520;
    let mesh = '';
    for (let i = 0; i <= 14; i++) { const t = i / 14; mesh += `<line x1="${lerp(BL, BR, t)}" y1="${BTOP}" x2="${lerp(BL, BR, t)}" y2="${BGL}"/>`; }
    for (let j = 0; j <= 8; j++) { const t = j / 8; mesh += `<line x1="${BL}" y1="${lerp(BTOP, BGL, t)}" x2="${BR}" y2="${lerp(BTOP, BGL, t)}"/>`; }
    for (let i = 0; i <= 14; i++) { const t = i / 14; mesh += `<line x1="${lerp(FL, FR, t)}" y1="${TOP}" x2="${lerp(BL, BR, t)}" y2="${BTOP}"/>`; }
    for (let j = 0; j <= 8; j++) { const t = j / 8; mesh += `<line x1="${FL}" y1="${lerp(TOP, GL, t)}" x2="${BL}" y2="${lerp(BTOP, BGL, t)}"/><line x1="${FR}" y1="${lerp(TOP, GL, t)}" x2="${BR}" y2="${lerp(BTOP, BGL, t)}"/>`; }
    return `<g class="fc-goal">
      <ellipse cx="1040" cy="566" rx="250" ry="14" fill="#000" opacity=".35" filter="url(#fcBlur4)"/>
      <g class="fc-net" stroke="rgba(235,245,240,.42)" stroke-width="1.3" fill="none">${mesh}</g>
      <path d="M${BL} ${BGL}L${FL} ${GL}M${BR} ${BGL}L${FR} ${GL}" stroke="rgba(230,240,235,.6)" stroke-width="3"/>
      <rect x="${FL - 9}" y="${TOP - 9}" width="18" height="${GL - TOP + 9}" rx="6" fill="url(#fcPost)"/>
      <rect x="${FR - 9}" y="${TOP - 9}" width="18" height="${GL - TOP + 9}" rx="6" fill="url(#fcPost)"/>
      <rect x="${FL - 9}" y="${TOP - 9}" width="${FR - FL + 18}" height="18" rx="6" fill="url(#fcBar)"/>
    </g>`;
  }
  // Goalkeeper facing the camera, feet at (0,0), ~170 units tall, in the defender's colour.
  function keeperSVG(color) {
    const dark = shade(color, -0.45), light = shade(color, 0.25);
    return `<g class="fc-keeper">
      <ellipse cx="0" cy="2" rx="46" ry="9" fill="#000" opacity=".45" filter="url(#fcBlur4)"/>
      <path d="M-20 -6 L-17 -62 L-3 -62 L-6 -6Z" fill="#1d252c"/><path d="M6 -6 L3 -62 L17 -62 L20 -6Z" fill="#1d252c"/>
      <path d="M-21 -20 L-6 -20 L-6 -40 L-19 -40Z" fill="${dark}"/><path d="M6 -20 L21 -20 L19 -40 L6 -40Z" fill="${dark}"/>
      <path d="M-24 -6 q8 -6 18 0 v5 h-20z" fill="#0b0f12"/><path d="M6 -6 q10 -6 18 0 v5 h-18z" fill="#0b0f12"/>
      <path d="M-22 -60 h44 l-2 -22 h-40z" fill="${dark}"/>
      <path d="M-30 -80 q-4 -40 8 -58 q22 -10 44 0 q12 18 8 58z" fill="url(#fcJersey)"/>
      <path d="M-14 -132 q14 8 28 0" stroke="${light}" stroke-width="3" fill="none"/>
      <rect x="-9" y="-112" width="18" height="18" rx="4" fill="${light}" opacity=".85"/>
      <g class="fc-armL"><path d="M-28 -132 q-24 6 -36 -26" stroke="url(#fcJersey)" stroke-width="15" stroke-linecap="round" fill="none"/>
        <circle cx="-66" cy="-162" r="11" fill="#e9ff8a" stroke="#0b0f12" stroke-width="2"/></g>
      <g class="fc-armR"><path d="M28 -132 q24 6 36 -26" stroke="url(#fcJersey)" stroke-width="15" stroke-linecap="round" fill="none"/>
        <circle cx="66" cy="-162" r="11" fill="#e9ff8a" stroke="#0b0f12" stroke-width="2"/></g>
      <rect x="-6" y="-148" width="12" height="10" fill="#c8946b"/>
      <circle cx="0" cy="-160" r="15" fill="url(#fcSkin)"/>
      <path d="M-15 -164 q2 -16 15 -16 q14 0 15 16 q-6 -6 -15 -6 q-9 0 -15 6z" fill="#1a120c"/>
    </g>`;
  }
  // Siege cannon on a wooden carriage; the barrel pivots at (0,-30), aimed by rotating .fc-barrel.
  function cannonSVG(color) {
    const wheel = (x) => `<g transform="translate(${x},0)"><circle r="44" fill="url(#fcWood)" stroke="#2b1a0e" stroke-width="5"/>
      ${Array.from({ length: 10 }, (_, i) => `<line x1="0" y1="0" x2="${(Math.cos(i * Math.PI / 5) * 40).toFixed(1)}" y2="${(Math.sin(i * Math.PI / 5) * 40).toFixed(1)}" stroke="#3a2412" stroke-width="5"/>`).join('')}
      <circle r="44" fill="none" stroke="#6b7680" stroke-width="5"/><circle r="9" fill="#5c656d" stroke="#2b1a0e" stroke-width="3"/></g>`;
    return `<g class="fc-cannon">
      <ellipse cx="0" cy="40" rx="130" ry="16" fill="#000" opacity=".45" filter="url(#fcBlur4)"/>
      <path d="M-120 18 L60 -26 L80 4 L-110 40Z" fill="url(#fcWood)" stroke="#2b1a0e" stroke-width="4"/>
      <g class="fc-barrel" transform="translate(0,-30) rotate(-14)">
        <rect x="-70" y="-26" width="230" height="52" rx="24" fill="url(#fcBronze)" stroke="#5a3a12" stroke-width="3"/>
        <rect x="130" y="-32" width="34" height="64" rx="10" fill="url(#fcBronze)" stroke="#5a3a12" stroke-width="3"/>
        <rect x="20" y="-28" width="14" height="56" rx="4" fill="${color}" opacity=".9"/>
        <ellipse cx="164" cy="0" rx="8" ry="22" fill="#1a1006"/>
        <circle cx="-74" cy="0" r="16" fill="url(#fcBronze)" stroke="#5a3a12" stroke-width="3"/>
      </g>
      ${wheel(-40)}${wheel(44)}
    </g>`;
  }
  function ballSVG() {
    return `<g class="fc-ball"><circle r="22" fill="url(#fcBall)"/>
      <path d="M0 -9 l8.5 6.2 -3.2 10 h-10.6 l-3.2 -10z" fill="#1b1f24"/>
      <path d="M-20 -6 l7 -3 4 6 -5 7 -7 -2z M20 -6 l-7 -3 -4 6 5 7 7 -2z M-8 18 l3 -8 h10 l3 8 -8 3z" fill="#1b1f24" opacity=".9"/>
      <circle r="22" fill="none" stroke="#0b0f12" stroke-width="1.5" opacity=".6"/></g>`;
  }

  function play({ att, def, attLabel = '', defLabel = '', attCrest = '', defCrest = '', won }) {
    return new Promise(resolve => {
      // Portrait phones get their own framing: the camera centres on the goal and the cannon moves in front of it.
      const portrait = innerHeight > innerWidth;
      const L = portrait ? { vb: '600 120 880 780', cx: 800, cy: 790, cs: 0.66, zoom: 0.1, wx: 1040, wy: 300, wsize: 120 }
                         : { vb: '0 0 1600 900', cx: 290, cy: 742, cs: 1, zoom: 0.32, wx: 800, wy: 250, wsize: 170 };
      const el = document.createElement('div');
      el.className = 'fc-shade';
      el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${attLabel} saldırısı`);
      el.innerHTML = `<div class="fc-top"><div class="fc-side" style="--c:${att.color}">${attCrest}<span><b>${esc(att.name)}</b><small>${esc(attLabel)}</small></span></div>
          <i class="fc-vs">VS</i><div class="fc-side r" style="--c:${def.color}"><span><b>${esc(def.name)}</b><small>${esc(defLabel)}</small></span>${defCrest}</div></div>
        <div class="fc-stage"><svg viewBox="${L.vb}" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="fcPost" x1="0" x2="1"><stop offset="0" stop-color="#9aa6b0"/><stop offset=".45" stop-color="#ffffff"/><stop offset="1" stop-color="#b9c3cb"/></linearGradient>
            <linearGradient id="fcBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#a8b3bc"/></linearGradient>
            <radialGradient id="fcBall" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#e6ebef"/><stop offset="1" stop-color="#8e99a3"/></radialGradient>
            <linearGradient id="fcBronze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2b65e"/><stop offset=".35" stop-color="#b47c2c"/><stop offset=".7" stop-color="#7a4f17"/><stop offset="1" stop-color="#4a300c"/></linearGradient>
            <linearGradient id="fcWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a2e"/><stop offset="1" stop-color="#4a2c14"/></linearGradient>
            <linearGradient id="fcJersey" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(def.color, 0.25)}"/><stop offset=".55" stop-color="${def.color}"/><stop offset="1" stop-color="${shade(def.color, -0.5)}"/></linearGradient>
            <radialGradient id="fcSkin" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f3cfa9"/><stop offset="1" stop-color="#b98157"/></radialGradient>
            <radialGradient id="fcFlash"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#ffcf5a" stop-opacity=".9"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>
            <filter id="fcBlur4"><feGaussianBlur stdDeviation="4"/></filter>
            <filter id="fcSmoke"><feGaussianBlur stdDeviation="9"/></filter>
            <filter id="fcGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <g class="fc-zoom"><g class="fc-cam">
            <image href="./assets/battle-stage.webp?v=20261116-stage1" x="0" y="0" width="1600" height="900"/>
            ${goalSVG()}
            <g class="fc-keeperPos" transform="translate(1040,556)">${keeperSVG(def.color)}</g>
            <g class="fc-shadowBall"><ellipse rx="22" ry="7" fill="#000" opacity=".4" filter="url(#fcBlur4)"/></g>
            <g class="fc-cannonPos" transform="translate(${L.cx},${L.cy}) scale(${L.cs})">${cannonSVG(att.color)}</g>
            <g class="fc-smoke"></g>
            <circle class="fc-flash" cx="0" cy="0" r="70" fill="url(#fcFlash)" opacity="0"/>
            <g class="fc-ballPos" transform="translate(-200,-200)">${ballSVG()}</g>
            <g class="fc-fx"></g>
          </g></g>
          <text class="fc-word" x="${L.wx}" y="${L.wy}" text-anchor="middle" opacity="0" style="font-size:${L.wsize}px"></text>
        </svg></div>
        <div class="fc-skip">Geçmek için dokun</div>`;
      document.body.appendChild(el);
      const $ = s => el.querySelector(s);
      const zoom = $('.fc-zoom'), cam = $('.fc-cam'), kp = $('.fc-keeperPos'), keeper = $('.fc-keeper'), ballPos = $('.fc-ballPos'), ball = $('.fc-ball');
      const shadowB = $('.fc-shadowBall'), cannon = $('.fc-cannonPos'), barrel = $('.fc-barrel'), flash = $('.fc-flash');
      const net = $('.fc-net'), smoke = $('.fc-smoke'), fx = $('.fc-fx'), word = $('.fc-word');
      const armL = $('.fc-armL'), armR = $('.fc-armR');
      let skipped = false, raf = 0;
      const finish = () => { if (!el.isConnected) return; cancelAnimationFrame(raf); el.classList.add('out'); setTimeout(() => { el.remove(); resolve(); }, 260); };
      el.addEventListener('click', () => { skipped = true; finish(); });
      if (reduced()) {
        word.textContent = won ? 'GOL!' : 'KURTARDI!'; word.setAttribute('fill', won ? att.color : def.color); word.setAttribute('opacity', 1);
        setTimeout(finish, 1300); return;
      }
      // Where the ball ends: in the side netting (goal) or in the keeper's gloves after his dive (save).
      const diveDir = Math.random() < 0.5 ? -1 : 1;
      const target = won ? { x: 1040 - diveDir * 150, y: 430 } : { x: 1040 + diveDir * 128, y: 452 };
      const muzzle = { x: L.cx + Math.cos(-14 * Math.PI / 180) * 164 * L.cs, y: L.cy + (-30 + Math.sin(-14 * Math.PI / 180) * 164) * L.cs };
      const ctrl = { x: (muzzle.x + target.x) / 2, y: Math.min(muzzle.y, target.y) - 260 };
      const puff = (x, y, delay) => {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 20); c.setAttribute('fill', '#c9d0d6'); c.setAttribute('filter', 'url(#fcSmoke)');
        smoke.appendChild(c);
        c.animate([{ opacity: 0, transform: 'scale(.5)' }, { opacity: .75, transform: 'scale(1.6)', offset: .2 }, { opacity: 0, transform: `translate(${-30 - Math.random() * 40}px,${-60 - Math.random() * 40}px) scale(3.4)` }],
          { duration: 1600, delay, fill: 'forwards', easing: 'ease-out' }).onfinish = () => c.remove();
        c.style.transformOrigin = `${x}px ${y}px`; c.style.transformBox = 'view-box';
      };
      const spark = (x, y, color, n = 24) => {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 140;
          const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 4 + Math.random() * 4); c.setAttribute('fill', i % 3 ? color : '#fff');
          fx.appendChild(c);
          c.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d + 40}px)`, opacity: 0 }], { duration: 900 + Math.random() * 400, fill: 'forwards', easing: 'cubic-bezier(.2,.8,.4,1)' });
        }
      };
      // timeline (ms): 0-700 aim, 700 fire, 700-1650 flight, 1650-3300 result
      const T_AIM = 700, T_FLY = 950, T_END = 3400;
      const t0 = performance.now();
      let fired = false, landed = false;
      const frame = now => {
        if (skipped) return;
        const t = now - t0;
        // keeper idles: small side-to-side shuffle and arm pump until the ball is close
        if (t < T_AIM + T_FLY * 0.55) {
          const s = Math.sin(t / 150) * 7;
          kp.setAttribute('transform', `translate(${1040 + s},556)`);
          armL.setAttribute('transform', `rotate(${Math.sin(t / 120) * 6} -28 -132)`); armR.setAttribute('transform', `rotate(${-Math.sin(t / 120) * 6} 28 -132)`);
        }
        // camera: slow push-in on the goal while the ball flies, settle after the result
        if (t >= T_AIM) {
          const z = t < T_AIM + T_FLY ? 1 + L.zoom * easeInOut((t - T_AIM) / T_FLY) : 1 + L.zoom - 0.05 * easeOut(Math.min(1, (t - T_AIM - T_FLY) / 900));
          const fx0 = 1040, fy0 = 470;  // zoom centre: the goal mouth
          zoom.setAttribute('transform', `translate(${fx0 * (1 - z)},${fy0 * (1 - z)}) scale(${z})`);
        }
        // cannon aims: barrel lifts slightly
        if (t < T_AIM) barrel.setAttribute('transform', `translate(0,-30) rotate(${-8 - easeOut(t / T_AIM) * 6})`);
        if (!fired && t >= T_AIM) {
          fired = true;
          cannon.animate([{ transform: `translate(${L.cx}px,${L.cy}px) scale(${L.cs})` }, { transform: `translate(${L.cx - 24}px,${L.cy + 6}px) scale(${L.cs})` }, { transform: `translate(${L.cx}px,${L.cy}px) scale(${L.cs})` }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
          flash.setAttribute('cx', muzzle.x); flash.setAttribute('cy', muzzle.y);
          flash.animate([{ opacity: 1, transform: 'scale(.4)' }, { opacity: 0, transform: 'scale(1.8)' }], { duration: 380, fill: 'forwards' });
          flash.style.transformOrigin = `${muzzle.x}px ${muzzle.y}px`; flash.style.transformBox = 'view-box';
          for (let i = 0; i < 7; i++) puff(muzzle.x + Math.random() * 30, muzzle.y + (Math.random() - .5) * 30, i * 40);
          cam.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-6px,4px)' }, { transform: 'translate(4px,-3px)' }, { transform: 'translate(0,0)' }], { duration: 300 });
        }
        if (t >= T_AIM) {
          const u = Math.min(1, (t - T_AIM) / T_FLY), e = easeInOut(u) * 0.35 + u * 0.65;
          const x = (1 - e) * (1 - e) * muzzle.x + 2 * (1 - e) * e * ctrl.x + e * e * target.x;
          const y = (1 - e) * (1 - e) * muzzle.y + 2 * (1 - e) * e * ctrl.y + e * e * target.y;
          const sc = lerp(1.25, 0.62, e);  // perspective: smaller as it travels away
          ballPos.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${sc.toFixed(3)})`);
          ball.setAttribute('transform', `rotate(${(u * 1080).toFixed(0)})`);
          const gy = lerp(790, 566, e), gx = lerp(muzzle.x, target.x, e);
          shadowB.setAttribute('transform', `translate(${gx.toFixed(1)},${gy.toFixed(1)}) scale(${lerp(1.6, .7, e).toFixed(2)})`);
          // keeper reacts in the last 40% of the flight
          if (u > 0.6) {
            const k = easeOut((u - 0.6) / 0.4);
            if (won) kp.setAttribute('transform', `translate(${1040 + diveDir * 120 * k},${556 - 30 * Math.sin(k * Math.PI)}) rotate(${diveDir * 72 * k})`);
            else kp.setAttribute('transform', `translate(${1040 + diveDir * 92 * k},${556 - 28 * Math.sin(k * Math.PI)}) rotate(${diveDir * 64 * k})`);
          }
          if (u >= 1 && !landed) {
            landed = true;
            if (won) {
              net.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${-diveDir * 10}px,-14px) scale(1.04,1.08)` }, { transform: 'translate(0,0) scale(1)' }], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' });
              net.style.transformOrigin = '1040px 330px'; net.style.transformBox = 'view-box';
              ballPos.animate([{ opacity: 1 }, { opacity: 1, offset: .6 }, { opacity: .85 }], { duration: 600, fill: 'forwards' });
              cam.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(10px,-6px)' }, { transform: 'translate(-8px,6px)' }, { transform: 'translate(5px,-3px)' }, { transform: 'translate(0,0)' }], { duration: 480 });
              spark(target.x, target.y, att.color, 30);
              word.textContent = 'GOL!'; word.setAttribute('fill', att.color);
            } else {
              const g = document.createElementNS(NS, 'circle'); g.setAttribute('cx', target.x); g.setAttribute('cy', target.y); g.setAttribute('r', 60); g.setAttribute('fill', 'url(#fcFlash)'); fx.appendChild(g);
              g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: 'forwards' });
              spark(target.x, target.y, def.color, 18);
              word.textContent = 'KURTARDI!'; word.setAttribute('fill', def.color);
            }
            word.setAttribute('filter', 'url(#fcGlow)');
            word.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1.15)', offset: .55 }, { opacity: 1, transform: 'scale(1)' }], { duration: 560, fill: 'forwards', easing: 'cubic-bezier(.2,.8,.2,1)' });
            word.style.transformOrigin = `${L.wx}px ${L.wy - 20}px`; word.style.transformBox = 'view-box';
          }
          // after a save the ball stays in the keeper's gloves as he lands
          if (landed && !won) {
            const k = Math.min(1, (t - T_AIM - T_FLY) / 500);
            ballPos.setAttribute('transform', `translate(${(target.x + diveDir * 26 * k).toFixed(1)},${(target.y + 70 * easeIn(k)).toFixed(1)}) scale(.62)`);
            kp.setAttribute('transform', `translate(${1040 + diveDir * (92 + 30 * k)},${556}) rotate(${diveDir * (64 + 22 * k)})`);
          }
          if (landed && won) {
            const k = Math.min(1, (t - T_AIM - T_FLY) / 500);
            ballPos.setAttribute('transform', `translate(${(target.x - diveDir * 18 * k).toFixed(1)},${(target.y + 110 * easeIn(k)).toFixed(1)}) scale(${(.62 - .08 * k).toFixed(3)})`);
            kp.setAttribute('transform', `translate(${1040 + diveDir * (120 + 16 * k)},${556}) rotate(${diveDir * (72 + 18 * k)})`);
          }
        }
        if (t < T_END) raf = requestAnimationFrame(frame); else finish();
      };
      raf = requestAnimationFrame(frame);
    });
  }
  window.FX_CINEMA = { play };
})();
