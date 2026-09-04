(() => {
  'use strict';
  if (window.NEON_XI_2D_PERF_SYNC_V1) return;
  window.NEON_XI_2D_PERF_SYNC_V1 = true;

  const STYLE_ID = 'nx2d-performance-sync-v1-style';
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
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
    #matchSimulation:not(.hidden) .nv-player .nv-core{filter:none!important}
    @media (max-width:720px), (pointer:coarse){
      #matchSimulation:not(.hidden) .nv-player::before{opacity:.08!important}
      #matchSimulation:not(.hidden) .nv-player .nv-core{
        box-shadow:0 0 6px currentColor,inset 0 0 0 1px rgba(255,255,255,.10)!important;
      }
      #matchSimulation:not(.hidden) .nv-ball::after{filter:none!important;opacity:.28!important}
    }

    .nx2d-goal-flight{
      position:absolute;left:0;top:0;z-index:30;width:15px;height:15px;border-radius:50%;pointer-events:none;
      background:radial-gradient(circle at 35% 30%,#fff,#e4ffef 55%,#8ff7bc 100%);
      box-shadow:0 0 12px rgba(255,255,255,.82),0 0 26px rgba(79,255,166,.46);
      will-change:transform,opacity;backface-visibility:hidden;
    }
    .nx2d-goal-flight::after{
      content:"";position:absolute;left:50%;top:50%;width:24px;height:3px;border-radius:999px;
      transform:translate(-100%,-50%);background:linear-gradient(90deg,transparent,rgba(215,255,233,.52));opacity:.5;
    }
    .nx2d-goal-shadow{
      position:absolute;left:0;top:0;z-index:29;width:14px;height:6px;border-radius:50%;pointer-events:none;
      background:radial-gradient(closest-side,rgba(0,0,0,.5),transparent 78%);
      will-change:transform,opacity;backface-visibility:hidden;
    }
    .neonMiniPitch.nx2d-goal-flight-active #nvBall,
    .neonMiniPitch.nx2d-goal-flight-active #nvBallShadow{opacity:0!important}
    .neonMiniPitch.nx2d-goal-confirmed{
      box-shadow:inset 0 0 58px rgba(55,255,139,.18),inset 0 0 0 1px rgba(119,255,169,.12),0 0 34px rgba(42,255,128,.14)!important;
    }
  `;
  document.head.appendChild(style);

  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const seenGoalFrames = new Set();
  let lastToken = null;
  let cleanupTimer = 0;
  let netTimer = 0;

  function game(){ return window.KADRO_MATCH_PRESENTATION || null; }
  function numericStyle(el,key,fallback){
    const value=Number.parseFloat(el?.style?.[key]||'');
    return Number.isFinite(value)?value:fallback;
  }
  function removeFlight(pitch){
    pitch?.querySelectorAll('.nx2d-goal-flight,.nx2d-goal-shadow').forEach(el=>el.remove());
    pitch?.classList.remove('nx2d-goal-flight-active','nx2d-goal-confirmed');
  }
  function rippleNet(pitch,team){
    const side=team==='A'?'top':'bottom';
    const net=pitch.querySelector(`.nv-goal-net-hit.${side}`);
    if(!net)return;
    net.classList.remove('hit');void net.offsetWidth;net.classList.add('hit');
  }
  function transformAt(x,y,lift=0,scale=1){
    return `translate3d(${x.toFixed(2)}px,${(y-lift).toFixed(2)}px,0) translate3d(-50%,-50%,0) scale(${scale})`;
  }

  function playGoalFlight(frame){
    const pitch=document.getElementById('neonMiniPitch');
    const originalBall=document.getElementById('nvBall');
    if(!pitch||!originalBall||pitch.closest('#matchSimulation')?.classList.contains('hidden'))return;

    clearTimeout(cleanupTimer);clearTimeout(netTimer);removeFlight(pitch);
    const rect=pitch.getBoundingClientRect();
    const width=Math.max(1,pitch.clientWidth||rect.width||1),height=Math.max(1,pitch.clientHeight||rect.height||1);
    const startXPct=clamp(numericStyle(originalBall,'left',50),8,92);
    const startYPct=clamp(numericStyle(originalBall,'top',50),6,94);
    const attackingTop=frame.team==='A';
    const goalLineYPct=attackingTop?7.7:92.3;
    const netDepthYPct=attackingTop?5.15:94.85;
    const laneSeed=Number(frame.id??frame.sourceId??0)||0;
    const seededLane=46.1+((Math.abs(laneSeed*37)%79)/79)*7.8;
    const targetXPct=clamp(startXPct+(seededLane-startXPct)*.88,44.7,55.3);
    const midXPct=startXPct+(targetXPct-startXPct)*.58;
    const midYPct=startYPct+(goalLineYPct-startYPct)*.58;
    const px=(p)=>p*width/100,py=(p)=>p*height/100;

    const start={x:px(startXPct),y:py(startYPct)};
    const mid={x:px(midXPct),y:py(midYPct)};
    const line={x:px(targetXPct),y:py(goalLineYPct)};
    const net={x:px(targetXPct),y:py(netDepthYPct)};

    const ball=document.createElement('div');ball.className='nx2d-goal-flight';
    const shadow=document.createElement('div');shadow.className='nx2d-goal-shadow';
    ball.style.transform=transformAt(start.x,start.y,0,1);
    shadow.style.transform=transformAt(start.x,start.y,0,1);
    pitch.append(shadow,ball);pitch.classList.add('nx2d-goal-flight-active');

    const duration=760;
    const ballAnim=ball.animate([
      {transform:transformAt(start.x,start.y,0,1),offset:0},
      {transform:transformAt(mid.x,mid.y,16,1.18),offset:.52},
      {transform:transformAt(line.x,line.y,7,1.10),offset:.80},
      {transform:transformAt(net.x,net.y,0,.96),offset:1}
    ],{duration,easing:'cubic-bezier(.18,.72,.18,1)',fill:'forwards'});

    shadow.animate([
      {transform:transformAt(start.x,start.y,0,1),opacity:.48,offset:0},
      {transform:transformAt(mid.x,mid.y,0,.48),opacity:.18,offset:.52},
      {transform:transformAt(line.x,line.y,0,.72),opacity:.34,offset:.80},
      {transform:transformAt(net.x,net.y,0,.60),opacity:.20,offset:1}
    ],{duration,easing:'cubic-bezier(.18,.72,.18,1)',fill:'forwards'});

    netTimer=setTimeout(()=>{
      rippleNet(pitch,frame.team);pitch.classList.add('nx2d-goal-confirmed');
      window.dispatchEvent(new CustomEvent('neon-xi-2d-goal-crossed-line',{detail:{frameId:frame.id,sourceId:frame.sourceId??frame.id,team:frame.team}}));
    },Math.round(duration*.79));
    ballAnim.finished.catch(()=>{}).then(()=>{cleanupTimer=setTimeout(()=>removeFlight(pitch),360)});
  }

  function scanAuthoritativeTimeline(){
    const g=game(),overlay=document.getElementById('matchSimulation');
    if(!g||!overlay||overlay.classList.contains('hidden'))return;
    if(lastToken!==g.token){lastToken=g.token;seenGoalFrames.clear();removeFlight(document.getElementById('neonMiniPitch'))}
    const timeline=Array.isArray(g.visualTimeline)?g.visualTimeline:[];
    const stageText=`${document.getElementById('nvStageText')?.textContent||''} ${document.getElementById('nvActionType')?.textContent||''}`.toLocaleUpperCase('tr-TR');
    if(!stageText.includes('GOL'))return;
    for(let i=timeline.length-1;i>=Math.max(0,timeline.length-8);i--){
      const frame=timeline[i];if(!frame||frame.stage!=='goal')continue;
      const id=String(frame.id??frame.sourceId??`${frame.team}-${frame.minute}-${i}`);
      if(seenGoalFrames.has(id))continue;
      seenGoalFrames.add(id);playGoalFlight(frame);break;
    }
  }

  const watcher=setInterval(scanAuthoritativeTimeline,70);
  window.addEventListener('pagehide',()=>clearInterval(watcher),{once:true});
})();
