(() => {
  'use strict';
  if (window.NEON_XI_2D_PREBUFFER_V1) return;
  window.NEON_XI_2D_PREBUFFER_V1 = true;

  const MIN_HOLD_MS = 850;
  const TARGET_HOLD_MS = 1350;
  const MAX_HOLD_MS = 2100;
  const MIN_TIMELINE_FRAMES = 4;
  const MIN_RENDER_NODES = 20;

  let overlay = null;
  let wasVisible = false;
  let activeRun = null;
  let observer = null;
  let runSerial = 0;
  const completedTokens = new Set();

  const now = () => performance.now();

  function game(){
    return window.KADRO_MATCH_PRESENTATION || null;
  }

  function matchVisible(){
    return !!(overlay && !overlay.classList.contains('hidden'));
  }

  function timelineSize(){
    const timeline = game()?.visualTimeline;
    return Array.isArray(timeline) ? timeline.length : 0;
  }

  function renderNodeCount(){
    const pitch = document.getElementById('neonMiniPitch');
    if (!pitch) return 0;
    return pitch.querySelectorAll('.nv-player,#nvBall,#nvBallShadow').length;
  }

  function compositorReady(){
    const stats = window.NEON_XI_2D_COMPOSITOR_V2_STATS;
    if (!stats) return false;
    return Number(stats.nodes || 0) >= MIN_RENDER_NODES && Number(stats.fps || 0) >= 35;
  }

  function tokenForRun(){
    const g = game();
    if (g && g.token != null) return `g:${String(g.token)}`;
    return `run:${Date.now()}:${++runSerial}`;
  }

  function forceWarmup(){
    const pitch = document.getElementById('neonMiniPitch');
    if (!pitch) return;

    // One deliberate layout read during the covered loading phase. Never done
    // in the live per-frame loop; it primes layout/compositor before reveal.
    void pitch.offsetWidth;
    void pitch.offsetHeight;

    const nodes = pitch.querySelectorAll('.nv-player,#nvBall,#nvBallShadow');
    nodes.forEach((el) => {
      el.style.setProperty('will-change', 'transform,opacity');
      el.style.setProperty('backface-visibility', 'hidden');
      el.style.setProperty('-webkit-backface-visibility', 'hidden');
    });
  }

  function updateSplashCopy(root, phase){
    if (!root) return;
    const subtitle = root.querySelector('.subtitle');
    const tip = root.querySelector('#tip');
    if (subtitle) subtitle.textContent = 'MAÇ HAZIRLANIYOR';
    if (tip) {
      const messages = {
        start: 'Maç motoru ve 2D saha hazırlanıyor…',
        timeline: 'Pozisyon akışı hazırlanıyor…',
        render: 'Saha görüntüsü senkronize ediliyor…',
        ready: 'Maç hazır.'
      };
      tip.textContent = messages[phase] || messages.start;
      tip.classList.add('visible');
    }
  }

  function lockExistingSplash(){
    const splash = window.NX_SPLASH;
    if (!splash || typeof splash.show !== 'function' || typeof splash.hide !== 'function') return null;

    const originalHide = splash.hide;
    let held = true;

    splash.hide = function(...args){
      if (held) return;
      return originalHide.apply(this, args);
    };

    splash.show();
    updateSplashCopy(splash.root, 'start');

    return {
      splash,
      release(){
        if (!held) return;
        held = false;
        splash.hide = originalHide;
        updateSplashCopy(splash.root, 'ready');
        originalHide.call(splash);
      }
    };
  }

  function finishRun(reason){
    const run = activeRun;
    if (!run) return;
    activeRun = null;
    clearInterval(run.poll);
    clearTimeout(run.maxTimer);
    completedTokens.add(run.token);
    run.splashLock?.release();
    document.documentElement.classList.remove('nx2d-prebuffering');
    window.dispatchEvent(new CustomEvent('neon-xi-2d-prebuffer-ready', {
      detail: {
        token: run.token,
        reason,
        elapsedMs: Math.round(now() - run.startedAt),
        timelineFrames: timelineSize(),
        renderNodes: renderNodeCount()
      }
    }));
  }

  function pollRun(){
    const run = activeRun;
    if (!run) return;
    if (!matchVisible()) {
      finishRun('match-hidden');
      return;
    }

    const elapsed = now() - run.startedAt;
    const frames = timelineSize();
    const nodes = renderNodeCount();
    const timelineReady = frames >= MIN_TIMELINE_FRAMES;
    const nodesReady = nodes >= MIN_RENDER_NODES;
    const gpuReady = compositorReady();

    if (run.splashLock?.splash?.root) {
      if (!timelineReady) updateSplashCopy(run.splashLock.splash.root, 'timeline');
      else if (!nodesReady || !gpuReady) updateSplashCopy(run.splashLock.splash.root, 'render');
    }

    // Prefer opening with real runway. If a specific match mode does not expose
    // enough timeline frames, never punish the user: TARGET_HOLD is the soft
    // fallback and MAX_HOLD is the absolute safety cap.
    const fullyReady = timelineReady && nodesReady && gpuReady;
    const softReady = elapsed >= TARGET_HOLD_MS && nodesReady;
    if (elapsed >= MIN_HOLD_MS && (fullyReady || softReady)) {
      finishRun(fullyReady ? 'buffer-ready' : 'warmup-ready');
    }
  }

  function beginRun(){
    if (activeRun || !matchVisible()) return;
    const token = tokenForRun();
    if (completedTokens.has(token)) return;

    const splashLock = lockExistingSplash();
    document.documentElement.classList.add('nx2d-prebuffering');

    activeRun = {
      token,
      splashLock,
      startedAt: now(),
      poll: 0,
      maxTimer: 0
    };

    // Give the hidden-under-splash scene two browser frames to build layers,
    // then prime layout once. The live compositor remains the only continuous RAF.
    requestAnimationFrame(() => requestAnimationFrame(forceWarmup));

    activeRun.poll = setInterval(pollRun, 55);
    activeRun.maxTimer = setTimeout(() => finishRun('max-timeout'), MAX_HOLD_MS);
    pollRun();
  }

  function checkTransition(){
    const visible = matchVisible();
    if (visible && !wasVisible) beginRun();
    wasVisible = visible;
  }

  function attach(){
    const nextOverlay = document.getElementById('matchSimulation');
    if (!nextOverlay) return false;
    if (overlay === nextOverlay && observer) return true;

    observer?.disconnect();
    overlay = nextOverlay;
    wasVisible = matchVisible();
    observer = new MutationObserver(checkTransition);
    observer.observe(overlay, {attributes:true, attributeFilter:['class','style']});
    return true;
  }

  if (!attach()) {
    const bootstrap = new MutationObserver(() => {
      if (!attach()) return;
      bootstrap.disconnect();
    });
    bootstrap.observe(document.documentElement, {childList:true, subtree:true});
  }

  window.addEventListener('pagehide', () => {
    observer?.disconnect();
    if (activeRun) finishRun('pagehide');
  }, {once:true});
})();
