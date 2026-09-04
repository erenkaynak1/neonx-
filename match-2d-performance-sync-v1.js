(() => {
  'use strict';
  if (window.NEON_XI_2D_PERF_SYNC_V1) return;
  window.NEON_XI_2D_PERF_SYNC_V1 = true;

  const STYLE_ID = 'nx2d-performance-sync-v1-style';
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* 2D mobile performance pass: keep the field isolated and remove expensive
       per-player backdrop filtering while the match is running. */
    #matchSimulation:not(.hidden) .neonMiniPitch{
      isolation:isolate;
      backface-visibility:hidden;
      -webkit-backface-visibility:hidden;
      transform:translateZ(0);
    }
    #matchSimulation:not(.hidden) .nv-player,
    #matchSimulation:not(.hidden) .nv-ball,
    #matchSimulation:not(.hidden) .nv-ball-shadow{
      backface-visibility:hidden;
      -webkit-backface-visibility:hidden;
    }
    #matchSimulation:not(.hidden) .nv-player .nv-name{
      backdrop-filter:none!important;
      -webkit-backdrop-filter:none!important;
      box-shadow:none!important;
      background:rgba(4,10,7,.82)!important;
    }
    #matchSimulation:not(.hidden) .nv-player .nv-core{
      filter:none!important;
    }
    @media (max-width:720px), (pointer:coarse){
      #matchSimulation:not(.hidden) .nv-player::before{opacity:.08!important}
      #matchSimulation:not(.hidden) .nv-player .nv-core{
        box-shadow:0 0 6px currentColor,inset 0 0 0 1px rgba(255,255,255,.10)!important;
      }
      #matchSimulation:not(.hidden) .nv-ball::after{
        filter:none!important;
        opacity:.28!important;
      }
    }

    /* Authoritative goal-flight overlay. It is driven only by an engine goal
       frame; it never decides whether a goal happened. */
    .nx2d-goal-flight{
      position:absolute;
      z-index:30;
      width:15px;
      height:15px;
      border-radius:50%;
      pointer-events:none;
      background:radial-gradient(circle at 35% 30%,#fff,#e4ffef 55%,#8ff7bc 100%);
      box-shadow:0 0 12px rgba(255,255,255,.82),0 0 26px rgba(79,255,166,.46);
      will-change:left,top,transform,opacity;
      transform:translate3d(-50%,-50%,0);
    }
    .nx2d-goal-flight::after{
      content:"";
      position:absolute;
      left:50%;top:50%;
      width:24px;height:3px;
      border-radius:999px;
      transform:translate(-100%,-50%);
      background:linear-gradient(90deg,transparent,rgba(215,255,233,.52));
      opacity:.5;
    }
    .nx2d-goal-shadow{
      position:absolute;
      z-index:29;
      width:14px;height:6px;
      border-radius:50%;
      pointer-events:none;
      background:radial-gradient(closest-side,rgba(0,0,0,.5),transparent 78%);
      will-change:left,top,transform,opacity;
      transform:translate3d(-50%,-50%,0);
    }
    .neonMiniPitch.nx2d-goal-flight-active #nvBall,
    .neonMiniPitch.nx2d-goal-flight-active #nvBallShadow{
      opacity:0!important;
    }
    .neonMiniPitch.nx2d-goal-confirmed{
      box-shadow:inset 0 0 58px rgba(55,255,139,.18),inset 0 0 0 1px rgba(119,255,169,.12),0 0 34px rgba(42,255,128,.14)!important;
    }
  `;
  document.head.appendChild(style);

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const seenGoalFrames = new Set();
  let lastToken = null;
  let cleanupTimer = 0;
  let netTimer = 0;

  function game() {
    return window.KADRO_MATCH_PRESENTATION || null;
  }

  function numericStyle(el, key, fallback) {
    const value = Number.parseFloat(el?.style?.[key] || '');
    return Number.isFinite(value) ? value : fallback;
  }

  function removeFlight(pitch) {
    pitch?.querySelectorAll('.nx2d-goal-flight,.nx2d-goal-shadow').forEach(el => el.remove());
    pitch?.classList.remove('nx2d-goal-flight-active','nx2d-goal-confirmed');
  }

  function rippleNet(pitch, team) {
    const side = team === 'A' ? 'top' : 'bottom';
    const net = pitch.querySelector(`.nv-goal-net-hit.${side}`);
    if (!net) return;
    net.classList.remove('hit');
    void net.offsetWidth;
    net.classList.add('hit');
  }

  function playGoalFlight(frame) {
    const pitch = document.getElementById('neonMiniPitch');
    const originalBall = document.getElementById('nvBall');
    if (!pitch || !originalBall || pitch.closest('#matchSimulation')?.classList.contains('hidden')) return;

    clearTimeout(cleanupTimer);
    clearTimeout(netTimer);
    removeFlight(pitch);

    const startX = clamp(numericStyle(originalBall, 'left', 50), 8, 92);
    const startY = clamp(numericStyle(originalBall, 'top', 50), 6, 94);
    const attackingTop = frame.team === 'A';
    const goalLineY = attackingTop ? 7.7 : 92.3;
    const netDepthY = attackingTop ? 5.15 : 94.85;
    const laneSeed = Number(frame.id ?? frame.sourceId ?? 0) || 0;
    const seededLane = 46.1 + ((Math.abs(laneSeed * 37) % 79) / 79) * 7.8;
    const targetX = clamp(startX + (seededLane - startX) * .88, 44.7, 55.3);
    const midX = startX + (targetX - startX) * .58;
    const midY = startY + (goalLineY - startY) * .58;

    const ball = document.createElement('div');
    ball.className = 'nx2d-goal-flight';
    ball.style.left = `${startX}%`;
    ball.style.top = `${startY}%`;

    const shadow = document.createElement('div');
    shadow.className = 'nx2d-goal-shadow';
    shadow.style.left = `${startX}%`;
    shadow.style.top = `${startY}%`;

    pitch.append(shadow, ball);
    pitch.classList.add('nx2d-goal-flight-active');

    const duration = 760;
    const ballAnim = ball.animate([
      {left:`${startX}%`, top:`${startY}%`, transform:'translate3d(-50%,-50%,0) scale(1)', offset:0},
      {left:`${midX}%`, top:`${midY}%`, transform:'translate3d(-50%,-92%,0) scale(1.18)', offset:.52},
      {left:`${targetX}%`, top:`${goalLineY}%`, transform:'translate3d(-50%,-64%,0) scale(1.10)', offset:.80},
      {left:`${targetX}%`, top:`${netDepthY}%`, transform:'translate3d(-50%,-50%,0) scale(.96)', offset:1}
    ], {duration, easing:'cubic-bezier(.18,.72,.18,1)', fill:'forwards'});

    shadow.animate([
      {left:`${startX}%`,top:`${startY}%`,opacity:.48,transform:'translate3d(-50%,-50%,0) scale(1)'},
      {left:`${midX}%`,top:`${midY}%`,opacity:.18,transform:'translate3d(-50%,-50%,0) scale(.48)',offset:.52},
      {left:`${targetX}%`,top:`${goalLineY}%`,opacity:.34,transform:'translate3d(-50%,-50%,0) scale(.72)',offset:.80},
      {left:`${targetX}%`,top:`${netDepthY}%`,opacity:.20,transform:'translate3d(-50%,-50%,0) scale(.60)'}
    ], {duration, easing:'cubic-bezier(.18,.72,.18,1)', fill:'forwards'});

    netTimer = setTimeout(() => {
      rippleNet(pitch, frame.team);
      pitch.classList.add('nx2d-goal-confirmed');
      window.dispatchEvent(new CustomEvent('neon-xi-2d-goal-crossed-line', {
        detail: {frameId: frame.id, sourceId: frame.sourceId ?? frame.id, team: frame.team}
      }));
    }, Math.round(duration * .79));

    ballAnim.finished.catch(() => {}).then(() => {
      cleanupTimer = setTimeout(() => removeFlight(pitch), 360);
    });
  }

  function scanAuthoritativeTimeline() {
    const g = game();
    const overlay = document.getElementById('matchSimulation');
    if (!g || !overlay || overlay.classList.contains('hidden')) return;

    if (lastToken !== g.token) {
      lastToken = g.token;
      seenGoalFrames.clear();
      removeFlight(document.getElementById('neonMiniPitch'));
    }

    const timeline = Array.isArray(g.visualTimeline) ? g.visualTimeline : [];
    for (let i = Math.max(0, timeline.length - 8); i < timeline.length; i++) {
      const frame = timeline[i];
      if (!frame || frame.stage !== 'goal') continue;
      const id = String(frame.id ?? frame.sourceId ?? `${frame.team}-${frame.minute}-${i}`);
      if (seenGoalFrames.has(id)) continue;
      seenGoalFrames.add(id);
      playGoalFlight(frame);
    }
  }

  // Timeline observation is intentionally low-frequency; the existing 2D director
  // remains the only per-frame movement loop.
  const watcher = setInterval(scanAuthoritativeTimeline, 70);
  window.addEventListener('pagehide', () => clearInterval(watcher), {once:true});
})();
