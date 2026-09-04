(() => {
  'use strict';
  if (window.NEON_XI_2D_COMPOSITOR_V3) return;
  window.NEON_XI_2D_COMPOSITOR_V3 = true;
  window.NEON_XI_2D_COMPOSITOR_V2 = true;

  const FIXED_STEP = 1 / 60;
  const MAX_CATCHUP_STEPS = 5;
  const TARGET_EPSILON = 0.018;

  const style = document.createElement('style');
  style.id = 'nx2d-compositor-v3-style';
  style.textContent = `
    /*
      V3 fixed-timestep compositor.
      The match engine remains authoritative and can keep updating its percentage
      coordinates at its own cadence. Visible motion is re-sampled onto a stable
      60 Hz render timeline and drawn with compositor-only transforms.
    */
    #matchSimulation:not(.hidden) .neonMiniPitch.nx2d-compositor-v3 .nv-player,
    #matchSimulation:not(.hidden) .neonMiniPitch.nx2d-compositor-v3 #nvBall,
    #matchSimulation:not(.hidden) .neonMiniPitch.nx2d-compositor-v3 #nvBallShadow{
      left:0!important;
      top:0!important;
      transform:translate3d(var(--nx2d-x,0px),var(--nx2d-y,0px),0) var(--nx2d-core-transform,translate3d(-50%,-50%,0))!important;
      will-change:transform,opacity!important;
      backface-visibility:hidden!important;
      -webkit-backface-visibility:hidden!important;
      transition:none!important;
      animation-timing-function:linear!important;
    }
    #matchSimulation:not(.hidden) .neonMiniPitch.nx2d-compositor-v3{
      transform:translateZ(0);
      isolation:isolate;
      contain:layout paint style;
    }
  `;
  document.head.appendChild(style);

  const records = new Map();
  let pitch = null;
  let overlay = null;
  let lastNow = 0;
  let accumulator = 0;
  let lastRefresh = 0;
  let lastWidth = 0;
  let lastHeight = 0;
  let visible = false;
  let fpsWindowStart = performance.now();
  let fpsFrames = 0;
  let measuredFps = 60;
  let sampledChanges = 0;
  let sampledIntervalTotal = 0;

  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const lerp = (a,b,t) => a + (b-a)*t;

  function percentValue(el,key,fallback=50){
    const value = Number.parseFloat(el?.style?.[key] || '');
    return Number.isFinite(value) ? value : fallback;
  }

  function isBallLike(el){
    return el?.id === 'nvBall' || el?.id === 'nvBallShadow';
  }

  function createRecord(el,width,height,now){
    const x = percentValue(el,'left',50) * width / 100;
    const y = percentValue(el,'top',50) * height / 100;
    return {
      targetX:x,targetY:y,
      targetVX:0,targetVY:0,
      rawX:x,rawY:y,rawTime:now,
      simX:x,simY:y,prevX:x,prevY:y,
      vx:0,vy:0,
      initialized:true
    };
  }

  function refreshElements(now,force=false){
    if(!force && now-lastRefresh < 180) return;
    lastRefresh = now;
    overlay = document.getElementById('matchSimulation');
    const nextPitch = document.getElementById('neonMiniPitch');
    if(nextPitch !== pitch){
      pitch?.classList.remove('nx2d-compositor-v2','nx2d-compositor-v3');
      pitch = nextPitch;
      records.clear();
      accumulator = 0;
    }
    if(!pitch) return;
    pitch.classList.remove('nx2d-compositor-v2');
    pitch.classList.add('nx2d-compositor-v3');

    const width = Math.max(1,pitch.clientWidth || 1);
    const height = Math.max(1,pitch.clientHeight || 1);
    const nodes = [...pitch.querySelectorAll('.nv-player,#nvBall,#nvBallShadow')];
    const live = new Set(nodes);
    for(const node of nodes){
      if(!records.has(node)) records.set(node,createRecord(node,width,height,now));
    }
    for(const node of [...records.keys()]){
      if(!live.has(node)) records.delete(node);
    }
  }

  function snapRecord(record,x,y,now){
    record.targetX = record.rawX = record.simX = record.prevX = x;
    record.targetY = record.rawY = record.simY = record.prevY = y;
    record.targetVX = record.targetVY = record.vx = record.vy = 0;
    record.rawTime = now;
  }

  function sampleTarget(el,record,width,height,now,snapAll){
    const x = percentValue(el,'left',50) * width / 100;
    const y = percentValue(el,'top',50) * height / 100;

    const coreTransform = el.style.transform || 'translate3d(-50%,-50%,0)';
    el.style.setProperty('--nx2d-core-transform', coreTransform);

    if(snapAll || !record.initialized){
      snapRecord(record,x,y,now);
      record.initialized = true;
      return;
    }

    const dx = x-record.rawX;
    const dy = y-record.rawY;
    const changed = Math.abs(dx)>TARGET_EPSILON || Math.abs(dy)>TARGET_EPSILON;
    if(!changed) return;

    const elapsedMs = Math.max(1,now-record.rawTime);
    const rawDt = clamp(elapsedMs/1000,1/240,.14);
    const diagonal = Math.hypot(width,height) || 1;
    const jump = Math.hypot(x-record.simX,y-record.simY);

    // Kickoff, formation reset, resize and tunnel entry are true discontinuities;
    // they should snap instead of being interpreted as extreme velocity.
    if(jump > diagonal*.30 || elapsedMs>180){
      snapRecord(record,x,y,now);
      return;
    }

    const maxTargetVelocity = isBallLike(el) ? diagonal*5.4 : diagonal*2.15;
    const measuredVX = clamp(dx/rawDt,-maxTargetVelocity,maxTargetVelocity);
    const measuredVY = clamp(dy/rawDt,-maxTargetVelocity,maxTargetVelocity);

    // Low-pass the source velocity, not the position. This preserves sharp passes
    // and sprints while removing the 55 ms target cadence from the visible motion.
    const velocityBlend = isBallLike(el) ? .72 : .52;
    record.targetVX = lerp(record.targetVX,measuredVX,velocityBlend);
    record.targetVY = lerp(record.targetVY,measuredVY,velocityBlend);
    record.targetX = x;
    record.targetY = y;
    record.rawX = x;
    record.rawY = y;
    record.rawTime = now;

    sampledChanges++;
    sampledIntervalTotal += elapsedMs;
  }

  function responseFor(el){
    if(isBallLike(el)) return {omega:28,maxFactor:5.6};
    const carrier = el.classList.contains('carrier') || el.classList.contains('active');
    const runner = el.classList.contains('runner') || el.classList.contains('pressing');
    if(carrier) return {omega:19.5,maxFactor:2.55};
    if(runner) return {omega:18,maxFactor:2.35};
    return {omega:15.5,maxFactor:2.05};
  }

  function fixedUpdate(el,record,width,height){
    record.prevX = record.simX;
    record.prevY = record.simY;

    const {omega,maxFactor} = responseFor(el);
    const diagonal = Math.hypot(width,height) || 1;
    const maxVelocity = diagonal*maxFactor;

    // Critically damped moving-target spring with target-velocity feed-forward.
    // This is integrated at exactly 1/60 s regardless of requestAnimationFrame jitter.
    const ax = omega*omega*(record.targetX-record.simX) + 2*omega*(record.targetVX-record.vx);
    const ay = omega*omega*(record.targetY-record.simY) + 2*omega*(record.targetVY-record.vy);
    record.vx = clamp(record.vx + ax*FIXED_STEP,-maxVelocity,maxVelocity);
    record.vy = clamp(record.vy + ay*FIXED_STEP,-maxVelocity,maxVelocity);
    record.simX += record.vx*FIXED_STEP;
    record.simY += record.vy*FIXED_STEP;

    // Stop sub-pixel shimmer when a player has essentially settled.
    if(Math.abs(record.targetX-record.simX)<.045 && Math.abs(record.vx)<2.2){
      record.simX = record.targetX;
      record.vx = record.targetVX*0.35;
    }
    if(Math.abs(record.targetY-record.simY)<.045 && Math.abs(record.vy)<2.2){
      record.simY = record.targetY;
      record.vy = record.targetVY*0.35;
    }
  }

  function renderNode(el,record,alpha){
    const x = lerp(record.prevX,record.simX,alpha);
    const y = lerp(record.prevY,record.simY,alpha);
    el.style.setProperty('--nx2d-x',`${x.toFixed(3)}px`);
    el.style.setProperty('--nx2d-y',`${y.toFixed(3)}px`);
  }

  function loop(now){
    refreshElements(now);
    const overlayVisible = !!(overlay && !overlay.classList.contains('hidden'));
    if(!pitch || !overlayVisible){
      visible = false;
      lastNow = now;
      accumulator = 0;
      requestAnimationFrame(loop);
      return;
    }

    const width = Math.max(1,pitch.clientWidth);
    const height = Math.max(1,pitch.clientHeight);
    const sizeChanged = Math.abs(width-lastWidth)>.5 || Math.abs(height-lastHeight)>.5;
    const becameVisible = !visible;
    visible = true;
    lastWidth = width;
    lastHeight = height;

    let frameDt = (now-(lastNow||now))/1000;
    const longFrame = frameDt>.10;
    frameDt = clamp(frameDt,0,0.05);
    lastNow = now;

    const snapAll = sizeChanged || becameVisible || longFrame;
    for(const [el,record] of records){
      if(!el.isConnected) continue;
      sampleTarget(el,record,width,height,now,snapAll);
    }

    if(snapAll) accumulator = 0;
    accumulator += frameDt;
    let steps = 0;
    while(accumulator>=FIXED_STEP && steps<MAX_CATCHUP_STEPS){
      for(const [el,record] of records){
        if(el.isConnected) fixedUpdate(el,record,width,height);
      }
      accumulator -= FIXED_STEP;
      steps++;
    }
    if(steps===MAX_CATCHUP_STEPS && accumulator>=FIXED_STEP){
      accumulator = accumulator % FIXED_STEP;
    }

    const alpha = clamp(accumulator/FIXED_STEP,0,1);
    for(const [el,record] of records){
      if(el.isConnected) renderNode(el,record,alpha);
    }

    fpsFrames++;
    if(now-fpsWindowStart>=1000){
      measuredFps = Math.round(fpsFrames*1000/(now-fpsWindowStart));
      const avgSourceInterval = sampledChanges ? sampledIntervalTotal/sampledChanges : 0;
      window.NEON_XI_2D_COMPOSITOR_V3_STATS = {
        fps:measuredFps,
        nodes:records.size,
        mode:'fixed-60hz-transform',
        sourceIntervalMs:Number(avgSourceInterval.toFixed(1))
      };
      fpsFrames = 0;
      sampledChanges = 0;
      sampledIntervalTotal = 0;
      fpsWindowStart = now;
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
