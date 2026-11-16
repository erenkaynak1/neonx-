/* NEON XI — Saha Fethi battle cinematic v2. A full-screen scene (not on the map): night stadium backdrop
   (assets/battle-stage.webp), a siege cannon that fires a football at the defender's goal, and the keeper.
   Attacker wins → the ball beats the keeper and the net bulges ("GOL!"); defender wins → the keeper flies
   and holds it ("KURTARDI!").
   v2: closer camera, an articulated keeper (hips, knees, shoulders, elbows) with a real dive, a net that
   deforms around the point of impact, a glowing ball trail, slow motion just before the ball arrives,
   floodlight beams, camera flashes in the stands and confetti for a goal.
   Scene units 1600x900 (render_fethet_stage.cjs: goal line y=560, goal centre x=1040).
   window.FX_CINEMA.play({ att, def, attLabel, defLabel, attCrest, defCrest, won }) → Promise (tap to skip). */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = t => Math.max(0, Math.min(1, t));
  const easeOut = t => 1 - Math.pow(1 - t, 3), easeIn = t => t * t * t, easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const okColor = c => /^#[0-9a-f]{6}$/i.test(String(c)) ? c : '#baff18';
  function shade(hex, f) {  // f<0 darker, f>0 lighter
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const m = v => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
    return '#' + [m(r), m(g), m(b)].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };

  /* ---------- goal: posts, bar, and a net we can deform ---------- */
  const G = { FL: 820, FR: 1260, TOP: 360, GL: 560, BL: 872, BR: 1208, BTOP: 330, BGL: 520, VX: 1040, VY: 300 };
  const NX = 16, NY = 9;
  function backPoint(i, j) { return [lerp(G.BL, G.BR, i / NX), lerp(G.BTOP, G.BGL, j / NY)]; }
  // Net lines with a bulge: points near the impact move toward the vanishing point (deeper into the net).
  function netPaths(hit, amount) {
    const warp = ([x, y]) => {
      if (!hit || !amount) return [x, y];
      const d2 = ((x - hit.x) ** 2) / (120 * 120) + ((y - hit.y) ** 2) / (90 * 90);
      const k = amount * Math.exp(-d2) * 0.32;
      return [x + (G.VX - x) * k + (hit.dx || 0) * amount * Math.exp(-d2) * 14, y + (G.VY - y) * k];
    };
    const line = pts => 'M' + pts.map(p => warp(p).map(v => v.toFixed(1)).join(',')).join('L');
    let d = '';
    for (let i = 0; i <= NX; i++) d += line(Array.from({ length: NY + 1 }, (_, j) => backPoint(i, j)));
    for (let j = 0; j <= NY; j++) d += line(Array.from({ length: NX + 1 }, (_, i) => backPoint(i, j)));
    // roof and side panels (front frame → back frame)
    for (let i = 0; i <= NX; i++) d += line([[lerp(G.FL, G.FR, i / NX), G.TOP], backPoint(i, 0)]);
    for (let j = 0; j <= NY; j++) {
      const t = j / NY;
      d += line([[G.FL, lerp(G.TOP, G.GL, t)], backPoint(0, j)]) + line([[G.FR, lerp(G.TOP, G.GL, t)], backPoint(NX, j)]);
    }
    return d;
  }
  function goalSVG() {
    return `<g class="fc-goal">
      <ellipse cx="1040" cy="568" rx="270" ry="16" fill="#000" opacity=".4" filter="url(#fcBlur6)"/>
      <path class="fc-netShade" d="M${G.BL} ${G.BTOP}H${G.BR}V${G.BGL}H${G.BL}Z" fill="#05090c" opacity=".35"/>
      <path class="fc-net" d="${netPaths(null, 0)}" stroke="rgba(236,246,241,.5)" stroke-width="1.25" fill="none" stroke-linejoin="round"/>
      <path d="M${G.BL} ${G.BGL}L${G.FL} ${G.GL}M${G.BR} ${G.BGL}L${G.FR} ${G.GL}M${G.BL} ${G.BTOP}L${G.FL} ${G.TOP}M${G.BR} ${G.BTOP}L${G.FR} ${G.TOP}" stroke="rgba(230,240,235,.7)" stroke-width="3"/>
      <rect x="${G.FL - 10}" y="${G.TOP - 10}" width="20" height="${G.GL - G.TOP + 10}" rx="7" fill="url(#fcPost)" filter="url(#fcSoftGlow)"/>
      <rect x="${G.FR - 10}" y="${G.TOP - 10}" width="20" height="${G.GL - G.TOP + 10}" rx="7" fill="url(#fcPost)" filter="url(#fcSoftGlow)"/>
      <rect x="${G.FL - 10}" y="${G.TOP - 10}" width="${G.FR - G.FL + 20}" height="20" rx="7" fill="url(#fcBar)" filter="url(#fcSoftGlow)"/>
    </g>`;
  }

  /* ---------- keeper: jointed figure, feet at (0,0), hips at (0,-92), ~190 units tall ---------- */
  function keeperSVG(color) {
    const dark = shade(color, -0.5), mid = shade(color, -0.15), light = shade(color, 0.35);
    const limb = (cls, d, w, stroke) => `<path class="${cls}" d="${d}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
    const leg = side => `<g class="fc-k-thigh${side}" transform="translate(${side === 'L' ? -11 : 11},-92)">
        ${limb('', 'M0 0 L0 44', 22, dark)}
        <g class="fc-k-shin${side}" transform="translate(0,44)">
          ${limb('', 'M0 0 L0 40', 17, '#e9eef2')}${limb('', 'M0 6 L0 38', 15, mid)}
          <path d="M-9 38 q0 10 6 10 h${side === 'L' ? -10 : 16} q6 0 6 -6 l-2 -6z" fill="#0b0f12"/>
        </g></g>`;
    const arm = side => {
      const s = side === 'L' ? -1 : 1;
      return `<g class="fc-k-arm${side}" transform="translate(${s * 25},-150)">
        ${limb('', 'M0 0 L0 36', 15, `url(#fcJersey)`)}
        <g class="fc-k-fore${side}" transform="translate(0,36)">
          ${limb('', 'M0 0 L0 30', 13, mid)}
          <g class="fc-k-glove${side}" transform="translate(0,34)"><ellipse rx="11" ry="13" fill="url(#fcGlove)" stroke="#0b0f12" stroke-width="2"/><path d="M-6 -6 h12" stroke="#0b0f12" stroke-width="1.5" opacity=".5"/></g>
        </g></g>`;
    };
    return `<g class="fc-keeper"><g class="fc-k-body">
      ${leg('L')}${leg('R')}
      <path d="M-22 -100 h44 l-3 -18 h-38z" fill="${dark}"/>
      <path d="M-27 -112 q-6 -34 4 -46 q23 -8 46 0 q10 12 4 46z" fill="url(#fcJersey)"/>
      <path d="M-27 -112 q-6 -34 4 -46 l6 0 q-6 18 -2 46z" fill="#000" opacity=".18"/>
      <path d="M-20 -150 l40 0 M-24 -138 l48 0" stroke="${light}" stroke-width="2.5" opacity=".55"/>
      <text x="0" y="-122" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="900" font-size="20" fill="${light}" opacity=".9">1</text>
      ${arm('L')}${arm('R')}
      <rect x="-6" y="-166" width="12" height="10" rx="3" fill="#c48e66"/>
      <g class="fc-k-head" transform="translate(0,-178)">
        <circle r="15" fill="url(#fcSkin)"/>
        <path d="M-15 -3 q1 -16 15 -16 q15 0 15 16 q-5 -7 -15 -7 q-10 0 -15 7z" fill="#1a120c"/>
        <circle cx="-5" cy="1" r="1.6" fill="#1a120c"/><circle cx="5" cy="1" r="1.6" fill="#1a120c"/>
      </g>
    </g></g>`;
  }
  // Poses: angles in degrees. arm 0 = hanging down, 180 = straight up; leg 0 = straight down.
  const POSE = {
    ready: { body: 0, lift: 0, armL: 40, foreL: -30, armR: -40, foreR: 30, thighL: 14, shinL: -18, thighR: -14, shinR: 18, crouch: 8 },
    reach: { body: 0, lift: 0, armL: 150, foreL: 10, armR: -150, foreR: -10, thighL: 18, shinL: -10, thighR: -18, shinR: 10, crouch: 0 },
    dive: { body: 74, lift: 46, armL: 168, foreL: 6, armR: -176, foreR: -4, thighL: -10, shinL: 18, thighR: -30, shinR: 30, crouch: 0 },
    land: { body: 86, lift: 0, armL: 160, foreL: 30, armR: -168, foreR: 34, thighL: -16, shinL: 30, thighR: -26, shinR: 44, crouch: 0 },
  };
  const mix = (a, b, t) => Object.fromEntries(Object.keys(a).map(k => [k, lerp(a[k], b[k], t)]));

  /* ---------- cannon ---------- */
  function cannonSVG(color) {
    const wheel = x => `<g transform="translate(${x},0)"><circle r="46" fill="url(#fcWood)" stroke="#2b1a0e" stroke-width="5"/>
      ${Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="0" x2="${(Math.cos(i * Math.PI / 6) * 41).toFixed(1)}" y2="${(Math.sin(i * Math.PI / 6) * 41).toFixed(1)}" stroke="#3a2412" stroke-width="4.5"/>`).join('')}
      <circle r="46" fill="none" stroke="url(#fcIron)" stroke-width="6"/><circle r="11" fill="url(#fcIron)" stroke="#1b1f24" stroke-width="3"/></g>`;
    return `<g class="fc-cannon">
      <ellipse cx="0" cy="44" rx="150" ry="18" fill="#000" opacity=".5" filter="url(#fcBlur6)"/>
      <path d="M-130 20 L62 -26 L84 6 L-118 44Z" fill="url(#fcWood)" stroke="#2b1a0e" stroke-width="4"/>
      <path d="M-124 26 L60 -18" stroke="#b5814c" stroke-width="3" opacity=".5"/>
      <g class="fc-barrel" transform="translate(0,-30) rotate(-14)">
        <rect x="-74" y="-27" width="236" height="54" rx="25" fill="url(#fcBronze)" stroke="#5a3a12" stroke-width="3"/>
        <rect x="-60" y="-21" width="210" height="10" rx="5" fill="#fff3cc" opacity=".35"/>
        ${[-30, 40, 100].map(x => `<rect x="${x}" y="-29" width="10" height="58" rx="3" fill="url(#fcBronzeBand)"/>`).join('')}
        <rect x="132" y="-33" width="36" height="66" rx="10" fill="url(#fcBronze)" stroke="#5a3a12" stroke-width="3"/>
        <rect x="56" y="-28" width="16" height="56" rx="4" fill="${color}" opacity=".95"/>
        <ellipse cx="168" cy="0" rx="9" ry="23" fill="#120a03"/>
        <circle cx="-78" cy="0" r="17" fill="url(#fcBronze)" stroke="#5a3a12" stroke-width="3"/>
      </g>
      ${wheel(-44)}${wheel(48)}
    </g>`;
  }
  function ballSVG() {
    return `<g class="fc-ball"><circle r="24" fill="url(#fcBall)"/>
      <path d="M0 -10 l9.5 6.9 -3.6 11.1 h-11.8 l-3.6 -11.1z" fill="#1b1f24"/>
      <path d="M-22 -7 l8 -3 4.5 6.5 -5.5 7.5 -7.5 -2z M22 -7 l-8 -3 -4.5 6.5 5.5 7.5 7.5 -2z M-9 20 l3.5 -9 h11 l3.5 9 -9 3.5z M-6 -23 h12 l-2 5 h-8z" fill="#1b1f24" opacity=".92"/>
      <circle r="24" fill="none" stroke="#0b0f12" stroke-width="1.5" opacity=".55"/>
      <ellipse cx="-8" cy="-10" rx="8" ry="5" fill="#fff" opacity=".7"/></g>`;
  }

  function play({ att, def, attLabel = '', defLabel = '', attCrest = '', defCrest = '', won }) {
    const aC = okColor(att.color), dC = okColor(def.color);
    return new Promise(resolve => {
      // Portrait phones: the camera centres on the goal and the cannon sits in front of it.
      const portrait = innerHeight > innerWidth;
      // Portrait phones show a narrow slice around the goal, so the dive and the shot stay closer to the middle.
      const L = portrait ? { vb: '600 140 880 760', cx: 905, cy: 780, cs: 0.6, zoom: 0, wx: 1040, wy: 330, wsize: 104, reach: 0.55 }
                         : { vb: '220 150 1240 698', cx: 520, cy: 712, cs: 1.0, zoom: 0.12, wx: 860, wy: 340, wsize: 140, reach: 1 };
      const root = document.createElement('div');
      root.className = 'fc-shade';
      root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', `${attLabel} saldırısı`);
      root.innerHTML = `<div class="fc-top"><div class="fc-side" style="--c:${aC}">${attCrest}<span><b>${esc(att.name)}</b><small>${esc(attLabel)}</small></span></div>
          <i class="fc-vs">VS</i><div class="fc-side r" style="--c:${dC}"><span><b>${esc(def.name)}</b><small>${esc(defLabel)}</small></span>${defCrest}</div></div>
        <div class="fc-stage"><svg viewBox="${L.vb}" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="fcPost" x1="0" x2="1"><stop offset="0" stop-color="#8f9ba6"/><stop offset=".45" stop-color="#ffffff"/><stop offset="1" stop-color="#b3bec7"/></linearGradient>
            <linearGradient id="fcBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#a1adb7"/></linearGradient>
            <radialGradient id="fcBall" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#e8edf1"/><stop offset="1" stop-color="#8a95a0"/></radialGradient>
            <linearGradient id="fcBronze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0c56a"/><stop offset=".3" stop-color="#c08833"/><stop offset=".7" stop-color="#7d5119"/><stop offset="1" stop-color="#43290a"/></linearGradient>
            <linearGradient id="fcBronzeBand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2a0"/><stop offset=".5" stop-color="#a06c22"/><stop offset="1" stop-color="#3d2508"/></linearGradient>
            <linearGradient id="fcIron" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a3adb6"/><stop offset="1" stop-color="#3c444b"/></linearGradient>
            <linearGradient id="fcWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#94633a"/><stop offset="1" stop-color="#4a2c14"/></linearGradient>
            <linearGradient id="fcJersey" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(dC, 0.3)}"/><stop offset=".55" stop-color="${dC}"/><stop offset="1" stop-color="${shade(dC, -0.5)}"/></linearGradient>
            <radialGradient id="fcGlove" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#e9ff8a"/><stop offset="1" stop-color="#9fbf2a"/></radialGradient>
            <radialGradient id="fcSkin" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f3cfa9"/><stop offset="1" stop-color="#b98157"/></radialGradient>
            <radialGradient id="fcFlash"><stop offset="0" stop-color="#fffbe0"/><stop offset=".3" stop-color="#ffd76a" stop-opacity=".95"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>
            <radialGradient id="fcHit"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="${aC}" stop-opacity=".8"/><stop offset="1" stop-color="${aC}" stop-opacity="0"/></radialGradient>
            <linearGradient id="fcBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaffc0" stop-opacity=".28"/><stop offset="1" stop-color="#eaffc0" stop-opacity="0"/></linearGradient>
            <radialGradient id="fcVig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>
            <filter id="fcBlur6"><feGaussianBlur stdDeviation="6"/></filter>
            <filter id="fcBg"><feGaussianBlur stdDeviation="1.6"/></filter>
            <filter id="fcSmoke" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
            <filter id="fcSoftGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="fcGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <g class="fc-zoom"><g class="fc-cam">
            <image href="./assets/battle-stage.webp?v=20261116-stage2" x="0" y="0" width="1600" height="900" filter="url(#fcBg)"/>
            <g class="fc-crowd"></g>
            <path d="M120 0 L330 0 L760 640 L420 640Z M1480 0 L1270 0 L1320 640 L1660 640Z" fill="url(#fcBeam)" style="mix-blend-mode:screen"/>
            ${goalSVG()}
            <ellipse class="fc-kShadow" cx="1040" cy="562" rx="52" ry="10" fill="#000" opacity=".5" filter="url(#fcBlur6)"/>
            <g class="fc-keeperPos" transform="translate(1040,556)">${keeperSVG(dC)}</g>
            <ellipse class="fc-shadowBall" rx="24" ry="7" fill="#000" opacity=".45" filter="url(#fcBlur6)"/>
            <g class="fc-cannonPos" transform="translate(${L.cx},${L.cy}) scale(${L.cs})">${cannonSVG(aC)}</g>
            <g class="fc-smoke"></g>
            <circle class="fc-flash" cx="0" cy="0" r="80" fill="url(#fcFlash)" opacity="0"/>
            <path class="fc-trail" fill="none" stroke="${aC}" stroke-linecap="round" stroke-linejoin="round" opacity="0" filter="url(#fcGlow)"/>
            <path class="fc-trailCore" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" opacity="0"/>
            <g class="fc-ballPos" transform="translate(-200,-200)">${ballSVG()}</g>
            <g class="fc-fx"></g>
          </g></g>
          <rect x="-400" y="-400" width="2400" height="1700" fill="url(#fcVig)" pointer-events="none"/>
          <text class="fc-word" x="${L.wx}" y="${L.wy}" text-anchor="middle" opacity="0" style="font-size:${L.wsize}px"></text>
        </svg></div>
        <div class="fc-skip">Geçmek için dokun</div>`;
      document.body.appendChild(root);
      const $ = s => root.querySelector(s);
      const zoom = $('.fc-zoom'), cam = $('.fc-cam'), kp = $('.fc-keeperPos'), kShadow = $('.fc-kShadow'), ballPos = $('.fc-ballPos'), ball = $('.fc-ball');
      const shadowB = $('.fc-shadowBall'), cannon = $('.fc-cannonPos'), barrel = $('.fc-barrel'), flash = $('.fc-flash');
      const net = $('.fc-net'), smoke = $('.fc-smoke'), fx = $('.fc-fx'), word = $('.fc-word'), crowd = $('.fc-crowd');
      const trail = $('.fc-trail'), trailCore = $('.fc-trailCore');
      const J = {}; ['k-body', 'k-thighL', 'k-thighR', 'k-shinL', 'k-shinR', 'k-armL', 'k-armR', 'k-foreL', 'k-foreR'].forEach(k => { J[k] = $('.fc-' + k); });
      const base = { 'k-thighL': [-11, -92], 'k-thighR': [11, -92], 'k-shinL': [0, 44], 'k-shinR': [0, 44], 'k-armL': [-25, -150], 'k-armR': [25, -150], 'k-foreL': [0, 36], 'k-foreR': [0, 36] };
      const setPose = (p, x, dir) => {
        // dir mirrors the dive side; angles are applied around each joint.
        const s = dir;
        for (const [k, a] of [['k-thighL', p.thighL], ['k-thighR', p.thighR], ['k-shinL', p.shinL], ['k-shinR', p.shinR], ['k-armL', p.armL], ['k-armR', p.armR], ['k-foreL', p.foreL], ['k-foreR', p.foreR]]) {
          const [bx, by] = base[k];
          J[k].setAttribute('transform', `translate(${bx},${by + (k.startsWith('k-thigh') ? p.crouch : 0)}) rotate(${(a * s).toFixed(1)})`);
        }
        J['k-body'].setAttribute('transform', `translate(0,${p.crouch.toFixed(1)}) rotate(${(p.body * s).toFixed(1)} 0 -92)`);
        kp.setAttribute('transform', `translate(${x.toFixed(1)},${(556 - p.lift).toFixed(1)})`);
        kShadow.setAttribute('cx', (x + s * p.body * 0.9).toFixed(1));
        kShadow.setAttribute('rx', (52 + p.body * 0.9).toFixed(1));
        kShadow.setAttribute('opacity', (0.5 - p.lift / 200).toFixed(2));
      };
      const svgRoot = root.querySelector('.fc-stage svg'), camG = root.querySelector('.fc-cam');
      const gloves = () => {  // midpoint of both gloves, in scene units (inside the zoomed camera group)
        const inv = camG.getScreenCTM().inverse(), pts = ['.fc-k-gloveL', '.fc-k-gloveR'].map(sel => {
          const r = root.querySelector(sel).getBoundingClientRect(), p = svgRoot.createSVGPoint();
          p.x = r.left + r.width / 2; p.y = r.top + r.height / 2; return p.matrixTransform(inv);
        });
        return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      };
      let skipped = false, raf = 0;
      const finish = () => { if (!root.isConnected) return; cancelAnimationFrame(raf); root.classList.add('out'); setTimeout(() => { root.remove(); resolve(); }, 260); };
      root.addEventListener('click', () => { skipped = true; finish(); });
      if (reduced()) {
        word.textContent = won ? 'GOL!' : 'KURTARDI!'; word.setAttribute('fill', won ? aC : dC); word.setAttribute('opacity', 1);
        setTimeout(finish, 1300); return;
      }
      // Crowd: twinkling phone lights in the stands; a burst of flashes on the result.
      const twinkle = (n, burst) => {
        for (let i = 0; i < n; i++) {
          const c = el('circle', { cx: (Math.random() * 1600).toFixed(0), cy: (70 + Math.random() * 150).toFixed(0), r: burst ? 3 + Math.random() * 3 : 1.6, fill: burst && Math.random() < .5 ? (won ? aC : dC) : '#ffffff' }, crowd);
          c.animate([{ opacity: 0 }, { opacity: burst ? 1 : .8 }, { opacity: 0 }], { duration: burst ? 500 + Math.random() * 500 : 1200 + Math.random() * 1600, delay: Math.random() * (burst ? 600 : 2400), iterations: burst ? 1 : Infinity, fill: 'forwards' });
        }
      };
      twinkle(70, false);
      const diveDir = Math.random() < 0.5 ? -1 : 1;
      // Goal: the ball beats the keeper into the far corner. Save: it goes where the keeper flies.
      let target = won ? { x: 1040 - diveDir * 158 * Math.max(0.75, L.reach), y: 418 } : { x: 1040 + diveDir * 150 * L.reach, y: 436 };
      if (!won) {  // a save: aim the ball exactly where his gloves will be at full stretch
        setPose(POSE.dive, 1040 + diveDir * 64 * L.reach, diveDir);
        const g = gloves();
        if (Number.isFinite(g.x) && Math.abs(g.x - 1040) < 205 && g.y > 340 && g.y < 560) target = g;
      }
      const muzzle = { x: L.cx + Math.cos(-14 * Math.PI / 180) * 168 * L.cs, y: L.cy + (-30 + Math.sin(-14 * Math.PI / 180) * 168) * L.cs };
      const ctrl = { x: (muzzle.x + target.x) / 2, y: Math.min(muzzle.y, target.y) - 250 };
      const puff = (x, y, delay, big) => {
        const c = el('circle', { cx: x, cy: y, r: big ? 26 : 18, fill: big ? '#d6dbe0' : '#aeb6bd', filter: 'url(#fcSmoke)' }, smoke);
        c.style.transformOrigin = `${x}px ${y}px`; c.style.transformBox = 'view-box';
        c.animate([{ opacity: 0, transform: 'scale(.5)' }, { opacity: .8, transform: 'scale(1.6)', offset: .18 }, { opacity: 0, transform: `translate(${-40 - Math.random() * 50}px,${-70 - Math.random() * 50}px) scale(3.8)` }],
          { duration: 1900, delay, fill: 'forwards', easing: 'ease-out' }).onfinish = () => c.remove();
      };
      const sparks = (x, y, colors, n, spread = 160) => {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * spread;
          const c = el('circle', { cx: x, cy: y, r: 2.5 + Math.random() * 4, fill: colors[i % colors.length] }, fx);
          c.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d + 50}px)`, opacity: 0 }],
            { duration: 800 + Math.random() * 500, fill: 'forwards', easing: 'cubic-bezier(.2,.8,.4,1)' });
        }
      };
      const confetti = () => {
        for (let i = 0; i < 70; i++) {
          const x = 700 + Math.random() * 700, r = el('rect', { x, y: 120, width: 7, height: 12, rx: 2, fill: i % 3 ? aC : '#ffffff' }, fx);
          r.style.transformOrigin = `${x}px 120px`; r.style.transformBox = 'view-box';
          r.animate([{ transform: 'translate(0,-60px) rotate(0)', opacity: 0 }, { opacity: 1, offset: .1 }, { transform: `translate(${(Math.random() - .5) * 220}px,${460 + Math.random() * 120}px) rotate(${Math.random() * 900}deg)`, opacity: 0 }],
            { duration: 1800 + Math.random() * 900, delay: Math.random() * 500, fill: 'forwards', easing: 'cubic-bezier(.3,.6,.4,1)' });
        }
      };
      // Timeline (ms). Flight time is warped: the last stretch plays in slow motion.
      const T_AIM = 800, T_FLY = 1250, T_END = 4300;
      const warpU = u => u < 0.72 ? u * 0.86 / 0.72 : 0.86 + (u - 0.72) / 0.28 * 0.14;  // 0..1 → 0..1, slower near the end
      const t0 = performance.now();
      const hist = [];
      let fired = false, landed = false, landT = 0;
      setPose(POSE.ready, 1040, diveDir);
      const ballAt = e => ({
        x: (1 - e) * (1 - e) * muzzle.x + 2 * (1 - e) * e * ctrl.x + e * e * target.x,
        y: (1 - e) * (1 - e) * muzzle.y + 2 * (1 - e) * e * ctrl.y + e * e * target.y,
      });
      const frame = now => {
        if (skipped) return;
        const t = now - t0;
        // keeper: ready shuffle, then reach, then the dive in the last part of the flight
        const fu = t < T_AIM ? 0 : clamp01((t - T_AIM) / T_FLY), u = warpU(fu);
        if (!landed) {
          if (u < 0.5) {
            const sway = Math.sin(t / 140) * 9;
            const p = mix(POSE.ready, POSE.reach, clamp01((u - 0.3) / 0.2) * 0.4);
            p.crouch += Math.abs(Math.sin(t / 140)) * 3;
            setPose(p, 1040 + sway, diveDir);
          } else {
            const k = easeOut(clamp01((u - 0.5) / 0.5));
            const reachX = (won ? 118 : 64) * L.reach;  // a goal: he dives the wrong way
            setPose(mix(POSE.reach, POSE.dive, k), 1040 + diveDir * reachX * k, diveDir);
          }
        }
        // camera: push in on the goal mouth during the flight, ease back a little afterwards
        if (t >= T_AIM) {
          const z = !landed ? 1 + L.zoom * easeInOut(u) : 1 + L.zoom - 0.05 * easeOut(clamp01((t - landT) / 900));
          const cx = 1040, cy = 460;
          zoom.setAttribute('transform', `translate(${cx * (1 - z)},${cy * (1 - z)}) scale(${z})`);
        }
        if (t < T_AIM) barrel.setAttribute('transform', `translate(0,-30) rotate(${-6 - easeOut(t / T_AIM) * 8})`);
        if (!fired && t >= T_AIM) {
          fired = true;
          cannon.animate([{ transform: `translate(${L.cx}px,${L.cy}px) scale(${L.cs})` }, { transform: `translate(${L.cx - 30}px,${L.cy + 8}px) scale(${L.cs})` }, { transform: `translate(${L.cx}px,${L.cy}px) scale(${L.cs})` }], { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)' });
          flash.setAttribute('cx', muzzle.x); flash.setAttribute('cy', muzzle.y);
          flash.style.transformOrigin = `${muzzle.x}px ${muzzle.y}px`; flash.style.transformBox = 'view-box';
          flash.animate([{ opacity: 1, transform: 'scale(.4)' }, { opacity: 0, transform: 'scale(2.2)' }], { duration: 420, fill: 'forwards' });
          for (let i = 0; i < 10; i++) puff(muzzle.x + Math.random() * 40, muzzle.y + (Math.random() - .5) * 36, i * 35, i < 4);
          sparks(muzzle.x, muzzle.y, ['#ffd76a', '#ff9a3c', '#fff'], 16, 90);
          cam.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-8px,5px)' }, { transform: 'translate(5px,-4px)' }, { transform: 'translate(0,0)' }], { duration: 320 });
          trail.setAttribute('opacity', '.85'); trailCore.setAttribute('opacity', '.9');
        }
        if (t >= T_AIM && !landed) {
          const e = easeInOut(u) * 0.3 + u * 0.7, p = ballAt(e);
          const sc = lerp(1.3, 0.6, e);  // perspective: smaller as it flies away
          ballPos.setAttribute('transform', `translate(${p.x.toFixed(1)},${p.y.toFixed(1)}) scale(${sc.toFixed(3)})`);
          ball.setAttribute('transform', `rotate(${(u * 1440).toFixed(0)})`);
          shadowB.setAttribute('transform', `translate(${lerp(muzzle.x, target.x, e).toFixed(1)},${lerp(800, 566, e).toFixed(1)}) scale(${lerp(1.7, .7, e).toFixed(2)})`);
          hist.push([p.x, p.y]); if (hist.length > 14) hist.shift();
          const d = 'M' + hist.map(q => q.map(v => v.toFixed(1)).join(',')).join('L');
          trail.setAttribute('d', d); trail.setAttribute('stroke-width', (16 * sc).toFixed(1));
          trailCore.setAttribute('d', d); trailCore.setAttribute('stroke-width', (5 * sc).toFixed(1));
          if (u >= 1) {
            landed = true; landT = t;
            trail.animate([{ opacity: .85 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
            trailCore.animate([{ opacity: .9 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
            twinkle(80, true);
            const hit = el('circle', { cx: target.x, cy: target.y, r: 70, fill: won ? 'url(#fcHit)' : 'url(#fcFlash)' }, fx);
            hit.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' });
            if (won) {
              sparks(target.x, target.y, [aC, '#ffffff'], 34);
              confetti();
              cam.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(12px,-7px)' }, { transform: 'translate(-9px,6px)' }, { transform: 'translate(5px,-3px)' }, { transform: 'translate(0,0)' }], { duration: 520 });
              word.textContent = 'GOL!'; word.setAttribute('fill', aC);
            } else {
              sparks(target.x, target.y, [dC, '#ffffff', '#e9ff8a'], 22, 110);
              word.textContent = 'KURTARDI!'; word.setAttribute('fill', dC);
            }
            word.setAttribute('filter', 'url(#fcGlow)');
            word.style.transformOrigin = `${L.wx}px ${L.wy - 20}px`; word.style.transformBox = 'view-box';
            word.animate([{ opacity: 0, transform: 'scale(.3) rotate(-6deg)' }, { opacity: 1, transform: 'scale(1.18) rotate(2deg)', offset: .55 }, { opacity: 1, transform: 'scale(1) rotate(0)' }], { duration: 620, fill: 'forwards', easing: 'cubic-bezier(.2,.8,.2,1)' });
          }
        }
        if (landed) {
          const k = clamp01((t - landT) / 650);
          if (won) {
            // net bulges then springs back; the ball drops down the back of the net
            const amt = Math.sin(Math.min(1, (t - landT) / 900) * Math.PI) * (1 - 0.4 * clamp01((t - landT - 900) / 600)) + 0;
            net.setAttribute('d', netPaths({ x: target.x, y: target.y, dx: -diveDir }, Math.max(0, amt) * 1.15));
            const bx = target.x + (G.VX - target.x) * 0.22 * Math.min(1, k * 1.6), by = target.y + (G.VY - target.y) * 0.22 * Math.min(1, k * 1.6) + 120 * easeIn(clamp01((t - landT - 300) / 600));
            ballPos.setAttribute('transform', `translate(${bx.toFixed(1)},${Math.min(by, 515).toFixed(1)}) scale(${(.6 - .1 * k).toFixed(3)})`);
            setPose(mix(POSE.dive, POSE.land, easeOut(k)), 1040 + diveDir * (118 + 14 * k) * L.reach, diveDir);
          } else {
            // the keeper holds it and lands with the ball in his gloves
            setPose(mix(POSE.dive, POSE.land, easeOut(k)), 1040 + diveDir * (64 + 24 * k) * L.reach, diveDir);
            const g = gloves(), b = { x: lerp(target.x, g.x, Math.min(1, k * 4)), y: lerp(target.y, g.y, Math.min(1, k * 4)) };
            ballPos.setAttribute('transform', `translate(${b.x.toFixed(1)},${b.y.toFixed(1)}) scale(.6)`);
          }
          shadowB.setAttribute('opacity', '0');
        }
        if (t < T_END) raf = requestAnimationFrame(frame); else finish();
      };
      raf = requestAnimationFrame(frame);
    });
  }
  window.FX_CINEMA = { play };
})();
