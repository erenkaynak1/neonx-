(() => {
  'use strict';
  // v7 match figures: inline, animated SVG players (running gait, arm swing, facing, back view).
  // Position stays owned by the match engine + compositor; this file only draws the body.
  if (window.NEON_XI_PLAYERS_V7) return;
  window.NEON_XI_PLAYERS_V7 = true;

  const SCOPE = 'body #matchSimulation #matchVisualCard';
  const style = document.createElement('style');
  style.id = 'nx7-players-style';
  style.textContent = `
    ${SCOPE} .nv-player .nv-core.nx7,
    ${SCOPE}.nx-depth .nv-player .nv-core.nx7,
    ${SCOPE}.nx-depth .nv-player.teamA .nv-core.nx7,
    ${SCOPE}.nx-depth .nv-player.teamB .nv-core.nx7,
    ${SCOPE}.nx-depth .nv-player.gk .nv-core.nx7{
      background:none!important;border:0!important;box-shadow:none!important;color:transparent!important;
      font-size:0!important;overflow:visible!important;width:32px!important;height:54px!important;
      transform:translateY(-15px)!important;display:block!important;padding:0!important;filter:none!important;
    }
    ${SCOPE} .nv-player .nv-core.nx7 svg{width:100%;height:100%;overflow:visible;display:block;
      transform-origin:50% 92%;transition:transform .22s ease-out;}
    ${SCOPE} .nv-player{--kit:#60ceee;--kit2:#164b72;--trim:#eaf7ff;--skin:#c99571;--hair:#29211e;--boot:#141c22;--shorts:#16222d}
    ${SCOPE} .nv-player.teamB{--kit:#ff8a4c;--kit2:#8c3413;--trim:#fff2e8;--shorts:#25150f}
    ${SCOPE} .nv-player.gk{--kit:#b6ff3c;--kit2:#4b7d10;--trim:#10200a;--shorts:#16220d}
    ${SCOPE} .nv-player[data-skin="1"]{--skin:#8d5a3b;--hair:#1a1310}
    ${SCOPE} .nv-player[data-skin="2"]{--skin:#e2b48f;--hair:#6b4a2b}
    ${SCOPE} .nv-player[data-skin="3"]{--skin:#5e3a26;--hair:#120d0b}

    .nx7-shadow{fill:#020805;opacity:.32}
    .nx7-skin{fill:var(--skin)}
    .nx7-kit{fill:var(--kit);stroke:var(--kit2);stroke-width:.8}
    .nx7-kit2{fill:var(--kit2)}
    .nx7-trim{fill:none;stroke:var(--trim);stroke-width:1.8;stroke-linecap:round}
    .nx7-shorts{fill:var(--shorts)}
    .nx7-sock{fill:var(--kit)}
    .nx7-boot{fill:var(--boot)}
    .nx7-hair{fill:var(--hair)}
    .nx7-face{fill:none;stroke:#3a2a20;stroke-width:1;stroke-linecap:round}
    .nx7-num{fill:var(--trim);font:700 13px/1 "Barlow Condensed",Arial,sans-serif;text-anchor:middle;opacity:0}

    .nx7-leg,.nx7-arm,.nx7-body{transform-box:view-box}
    .nx7-leg.l{transform-origin:28px 64px}.nx7-leg.r{transform-origin:36px 64px}
    .nx7-arm.l{transform-origin:22px 31px}.nx7-arm.r{transform-origin:42px 31px}
    .nx7-body{transform-origin:32px 104px}

    /* Idle: slow breathing sway. */
    .nv-player .nx7-body{animation:nx7Breath 2.6s ease-in-out infinite}
    .nv-player[data-gait="jog"] .nx7-body{animation:nx7Bob .46s ease-in-out infinite}
    .nv-player[data-gait="jog"] .nx7-leg.l{animation:nx7LegA .46s ease-in-out infinite}
    .nv-player[data-gait="jog"] .nx7-leg.r{animation:nx7LegB .46s ease-in-out infinite}
    .nv-player[data-gait="jog"] .nx7-arm.l{animation:nx7ArmB .46s ease-in-out infinite}
    .nv-player[data-gait="jog"] .nx7-arm.r{animation:nx7ArmA .46s ease-in-out infinite}
    .nv-player[data-gait="run"] .nx7-body{animation:nx7Bob .32s ease-in-out infinite}
    .nv-player[data-gait="run"] .nx7-leg.l{animation:nx7LegA .32s ease-in-out infinite}
    .nv-player[data-gait="run"] .nx7-leg.r{animation:nx7LegB .32s ease-in-out infinite}
    .nv-player[data-gait="run"] .nx7-arm.l{animation:nx7ArmB .32s ease-in-out infinite}
    .nv-player[data-gait="run"] .nx7-arm.r{animation:nx7ArmA .32s ease-in-out infinite}
    /* Desynchronise strides so the team never moves like one machine. */
    .nv-player[data-phase="1"] .nx7-g *{animation-delay:-.11s!important}
    .nv-player[data-phase="2"] .nx7-g *{animation-delay:-.21s!important}
    .nv-player[data-phase="3"] .nx7-g *{animation-delay:-.07s!important}

    /* Facing: side profile is narrower and leans into the run; "u" shows the back with number. */
    .nv-player[data-face="l"] .nv-core.nx7 svg{transform:scaleX(-.86)}
    .nv-player[data-face="r"] .nv-core.nx7 svg{transform:scaleX(.86)}
    .nv-player[data-gait="run"][data-face="l"] .nv-core.nx7 svg{transform:scaleX(-.86) skewX(7deg)}
    .nv-player[data-gait="run"][data-face="r"] .nv-core.nx7 svg{transform:scaleX(.86) skewX(-7deg)}
    .nv-player[data-face="u"] .nx7-front{opacity:0}
    .nv-player[data-face="u"] .nx7-num{opacity:.95}
    .nv-player[data-face="u"] .nx7-hairback{opacity:1}
    .nx7-hairback{opacity:0}

    @keyframes nx7Breath{0%,100%{transform:translateY(0)}50%{transform:translateY(-.6px)}}
    @keyframes nx7Bob{0%,50%,100%{transform:translateY(0)}25%,75%{transform:translateY(-2.2px)}}
    @keyframes nx7LegA{0%,100%{transform:rotate(26deg)}50%{transform:rotate(-24deg)}}
    @keyframes nx7LegB{0%,100%{transform:rotate(-24deg)}50%{transform:rotate(26deg)}}
    @keyframes nx7ArmA{0%,100%{transform:rotate(30deg)}50%{transform:rotate(-26deg)}}
    @keyframes nx7ArmB{0%,100%{transform:rotate(-26deg)}50%{transform:rotate(30deg)}}

    @media (prefers-reduced-motion:reduce){.nv-player .nx7-g *{animation:none!important}}
    #matchSimulation .neonMiniPitch.nx2d-adaptive-lite .nv-player[data-gait] .nx7-arm{animation:none!important}
  `;
  document.head.appendChild(style);

  function leg(side) {
    const x = side === 'l' ? 0 : 8;
    return `<g class="nx7-leg ${side}">
      <path class="nx7-skin" d="M${24 + x} 64L${23 + x} 84L${30 + x} 84L${31 + x} 64Z"/>
      <path class="nx7-sock" d="M${23 + x} 84L${23 + x} 98L${30 + x} 98L${30 + x} 84Z"/>
      <path class="nx7-boot" d="M${22 + x} 97L${31 + x} 97L${33 + x} 103Q${27 + x} 106 ${21 + x} 103Z"/>
    </g>`;
  }
  function arm(side) {
    const d = side === 'l'
      ? 'M22 30L15 44L13 56Q13 60 17 60L19 56L22 45L27 34Z'
      : 'M42 30L49 44L51 56Q51 60 47 60L45 56L42 45L37 34Z';
    const sleeve = side === 'l' ? 'M22 28L16 40L22 43L27 33Z' : 'M42 28L48 40L42 43L37 33Z';
    return `<g class="nx7-arm ${side}"><path class="nx7-skin" d="${d}"/><path class="nx7-kit" d="${sleeve}"/></g>`;
  }
  function figure(number) {
    return `<svg viewBox="0 0 64 112" aria-hidden="true" focusable="false">
      <ellipse class="nx7-shadow" cx="32" cy="104" rx="15" ry="3.6"/>
      <g class="nx7-g nx7-body">
        ${arm('l')}${leg('l')}${leg('r')}
        <path class="nx7-shorts" d="M22 54L42 54L44 70L34 71L32 64L30 71L20 70Z"/>
        <path class="nx7-kit" d="M24 23L17 27L21 42L22 56Q32 59 42 56L43 42L47 27L40 23Z"/>
        <path class="nx7-trim" d="M25 24Q32 30 39 24"/>
        <text class="nx7-num" x="32" y="47">${number}</text>
        ${arm('r')}
        <path class="nx7-skin" d="M28 18L28 25Q32 28 36 25L36 18Z"/>
        <ellipse class="nx7-skin" cx="32" cy="13" rx="7.6" ry="9.2"/>
        <path class="nx7-hair" d="M24.6 13L24 8Q25 2 32 2Q40 2 39.6 9L39 14L37.5 8Q31 10 27 7Z"/>
        <path class="nx7-hair nx7-hairback" d="M24.4 9Q25 3 32 3Q39.5 3 39.6 10L39.4 17Q32 20 24.6 17Z"/>
        <g class="nx7-front"><path class="nx7-face" d="M28.6 13.5H30M34 13.5H35.4M30 19Q32 20.2 34 19"/></g>
      </g>
    </svg>`;
  }
  function hash(text) { let h = 0; for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); }

  function decorate(player) {
    const core = player.querySelector('.nv-core');
    if (!core || core.classList.contains('nx7')) return;
    const id = player.dataset.id || core.textContent;
    const seed = hash(id);
    const team = [...player.parentElement.querySelectorAll(`.nv-player.team${player.dataset.team || ''}`)];
    const number = player.classList.contains('gk') ? 1 : (team.indexOf(player) + 1 || (seed % 98) + 2);
    player.dataset.skin = String(seed % 4);
    player.dataset.phase = String((seed >> 3) % 4);
    if (!player.dataset.gait) player.dataset.gait = 'idle';
    if (!player.dataset.face) player.dataset.face = player.dataset.team === 'B' ? 'd' : 'u';
    core.classList.add('nx7');
    core.insertAdjacentHTML('beforeend', figure(number));
  }

  function scan() {
    const pitch = document.getElementById('neonMiniPitch');
    if (pitch) pitch.querySelectorAll('.nv-player .nv-core:not(.nx7)').forEach(core => decorate(core.closest('.nv-player')));
  }
  setInterval(scan, 400);
  window.NEON_XI_PLAYERS_V7_SCAN = scan;
})();
