(() => {
  'use strict';
  if (window.NEON_XI_2D_COMPOSITOR_V2) return;
  window.NEON_XI_2D_COMPOSITOR_V2 = true;

  const style = document.createElement('style');
  style.id = 'nx2d-compositor-v2-style';
  style.textContent = `
    /*
      V2 compositor: the simulation may keep writing percentage left/top values,
      but the visible player/ball layers are rendered only with GPU-friendly
      transforms. This keeps engine state authoritative while avoiding layout
      movement on every animation frame.
    */
    #matchSimulation:not(.hidden) .neonMiniPitch.nx2d-compositor-v2 .nv-player,
    #matchSimulation:not(.hidden) .neonMiniPitch.nx2d-compositor-v2 #nvBall,
    #matchSimulation:not(.hidden) .neonMiniPitch.nx2d-compositor-v2 #nvBallShadow{
      left:0!important;
      top:0!important;
      transform:translate3d(var(--nx2d-x,0px),var(--nx2d-y,0px),0) var(--nx2d-core-transform,translate3d(-50%,-50%,0))!important;
      will-change:transform,opacity!important;
      backface-visibility:hidden!important;
      -webkit-backface-visibility:hidden!important;
      transition:none!important;
    }
    #matchSimulation:not(.hidden) .neonMiniPitch.nx2d-compositor-v2{
      transform:translateZ(0);
      isolation:isolate;
    }
  `;
  document.head.appendChild(style);

  const state = new Map();
  let pitch = null;
  let overlay = null;
  let lastNow = 0;
  let lastRefresh = 0;
  let lastWidth = 0;
  let lastHeight = 0;
  let visible = false;
  let fpsWindowStart = performance.now();
  let fpsFrames = 0;
  let measuredFps = 60;

  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));

  function percentValue(el,key,fallback=50){
    const value = Number.parseFloat(el?.style?.[key] || '');
    return Number.isFinite(value) ? value : fallback;
  }

  function isPlayer(el){ return el?.classList?.contains('nv-player'); }
  function isBall(el){ return el?.id === 'nvBall'; }
  function isShadow(el){ return el?.id === 'nvBallShadow'; }

  function refreshElements(now,force=false){
    if(!force && now-lastRefresh < 220) return;
    lastRefresh = now;
    overlay = document.getElementById('matchSimulation');
    const nextPitch = document.getElementById('neonMiniPitch');
    if(nextPitch !== pitch){
      pitch?.classList.remove('nx2d-compositor-v2');
      pitch = nextPitch;
      state.clear();
    }
    if(!pitch) return;
    pitch.classList.add('nx2d-compositor-v2');
    const nodes = [...pitch.querySelectorAll('.nv-player,#nvBall,#nvBallShadow')];
    const live = new Set(nodes);
    for(const node of nodes){
      if(!state.has(node)) state.set(node,{x:NaN,y:NaN,lastTargetX:NaN,lastTargetY:NaN});
    }
    for(const node of [...state.keys()]){
      if(!live.has(node)) state.delete(node);
    }
  }

  function renderNode(el,record,dt,width,height,snapAll){
    const xPercent = percentValue(el,'left',50);
    const yPercent = percentValue(el,'top',50);
    const targetX = xPercent * width / 100;
    const targetY = yPercent * height / 100;

    // Preserve the core director's scale / lift / rotation. CSS !important owns
    // the visible transform, while the inline transform remains readable here.
    const coreTransform = el.style.transform || 'translate3d(-50%,-50%,0)';
    el.style.setProperty('--nx2d-core-transform', coreTransform);

    if(!Number.isFinite(record.x) || !Number.isFinite(record.y)){
      record.x = targetX;
      record.y = targetY;
    }

    const dx = targetX-record.x;
    const dy = targetY-record.y;
    const distance = Math.hypot(dx,dy);
    const pitchDiagonal = Math.hypot(width,height) || 1;

    // A genuine reset / tunnel entrance / kickoff reposition should not drag
    // slowly across the whole pitch. Small and medium changes are interpolated.
    const hardTeleport = distance > pitchDiagonal * .34;
    if(snapAll || hardTeleport){
      record.x = targetX;
      record.y = targetY;
    }else{
      let response;
      if(isBall(el) || isShadow(el)){
        // Ball must remain sharp enough for passes/shots but still filter the
        // sub-pixel jitter caused by the simulation's lower-frequency targets.
        response = 30 + Math.min(20,distance*.22);
      }else{
        const active = el.classList.contains('active') || el.classList.contains('carrier');
        const runner = el.classList.contains('runner') || el.classList.contains('pressing');
        response = active ? 22 : runner ? 20 : 17;
        response += Math.min(11,distance*.09);
      }
      const alpha = 1-Math.exp(-response*dt);
      record.x += dx*alpha;
      record.y += dy*alpha;

      // Prevent tiny target oscillations from becoming visible shimmer.
      if(Math.abs(targetX-record.x)<.055) record.x=targetX;
      if(Math.abs(targetY-record.y)<.055) record.y=targetY;
    }

    record.lastTargetX = targetX;
    record.lastTargetY = targetY;
    el.style.setProperty('--nx2d-x', `${record.x.toFixed(3)}px`);
    el.style.setProperty('--nx2d-y', `${record.y.toFixed(3)}px`);
  }

  function loop(now){
    refreshElements(now);
    const overlayVisible = !!(overlay && !overlay.classList.contains('hidden'));
    if(!pitch || !overlayVisible){
      visible = false;
      lastNow = now;
      requestAnimationFrame(loop);
      return;
    }

    const width = Math.max(1,pitch.clientWidth);
    const height = Math.max(1,pitch.clientHeight);
    const sizeChanged = Math.abs(width-lastWidth)>.5 || Math.abs(height-lastHeight)>.5;
    const becameVisible = !visible;
    visible = true;
    lastWidth=width;
    lastHeight=height;

    const dt = clamp((now-(lastNow||now))/1000,1/240,.04);
    lastNow = now;

    for(const [el,record] of state){
      if(!el.isConnected) continue;
      renderNode(el,record,dt,width,height,sizeChanged||becameVisible);
    }

    fpsFrames++;
    if(now-fpsWindowStart>=1000){
      measuredFps=Math.round(fpsFrames*1000/(now-fpsWindowStart));
      fpsFrames=0;
      fpsWindowStart=now;
      window.NEON_XI_2D_COMPOSITOR_V2_STATS={fps:measuredFps,nodes:state.size,mode:'transform'};
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
