/* NEON XI — shared side-game loading screen.
   Shown while a side game boots (player data, online services), instead of the plain
   "yükleniyor" cards. It removes itself as soon as the game's menu or board exists.
   Usage: <script src="../sidegame-loader-v1.js" data-title="FUTBOL XOX"></script> as early as possible.
   If the game is ready within ~140 ms the loader never becomes visible (no flash). */
(()=>{
 'use strict';
 const me=document.currentScript;if(!me||window.NX_SG_LOADER)return;window.NX_SG_LOADER=true;
 const title=me.dataset.title||'NEON XI',instant=me.dataset.instant==='1';
 const logo=new URL('../assets/ui/logo-neon-xi.svg',me.src).href;
 const READY=['.menuPanel .menuMode','.sgm .sgm-mode','.nx-imp-menu .nx-imp-mode','#board .tile','.pitch','#game:not([hidden])','.error','.status.error:not(:empty)'];
 const font=f=>new URL('../assets/ui/fonts/'+f,me.src).href;
 const css=`
 @font-face{font-family:"Barlow Condensed";font-weight:700;font-display:swap;src:url("${font('BarlowCondensed-Bold.woff')}") format("woff")}
 @font-face{font-family:"Barlow Condensed";font-weight:800;font-style:italic;font-display:swap;src:url("${font('BarlowCondensed-ExtraBoldItalic.woff')}") format("woff")}
 .nx-sgl{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:radial-gradient(ellipse 70% 45% at 50% 38%,rgba(186,255,24,.09),transparent 70%),linear-gradient(180deg,#0a0d10,#050708 70%);opacity:0;transition:opacity .28s ease;pointer-events:all}
 .nx-sgl.show{opacity:1}.nx-sgl.hide{opacity:0;pointer-events:none}
 .nx-sgl-box{display:grid;justify-items:center;gap:14px;width:min(86vw,340px);text-align:center}
 .nx-sgl-logo{width:min(56vw,200px);height:auto;filter:drop-shadow(0 0 12px rgba(186,255,24,.25))}
 .nx-sgl-title{color:#f3f6f8;font:italic 800 clamp(26px,8vw,36px)/1 "Barlow Condensed","Arial Narrow",Impact,sans-serif;letter-spacing:.01em;text-transform:uppercase}
 .nx-sgl-pitch{position:relative;width:100%;height:46px;border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(90deg,transparent,rgba(186,255,24,.08) 18%,rgba(186,255,24,.08) 82%,transparent)}
 .nx-sgl-pitch::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(255,255,255,.14)}
 .nx-sgl-pitch::after{content:"";position:absolute;left:50%;top:50%;width:18px;height:18px;border:1px solid rgba(255,255,255,.14);border-radius:50%;transform:translate(-50%,-50%)}
 .nx-sgl-goal{position:absolute;top:7px;bottom:7px;width:11px;border:2px solid #baff18;background:repeating-linear-gradient(45deg,rgba(186,255,24,.18) 0 2px,transparent 2px 5px);box-shadow:0 0 8px rgba(186,255,24,.35)}
 .nx-sgl-goal.l{left:0;border-left:0;border-radius:0 3px 3px 0;animation:nxSglGoalL 2.4s ease-in-out infinite}
 .nx-sgl-goal.r{right:0;border-right:0;border-radius:3px 0 0 3px;animation:nxSglGoalR 2.4s ease-in-out infinite}
 .nx-sgl-ball{position:absolute;top:50%;left:14px;width:22px;height:22px;margin-top:-11px;background:url("BALL") center/100% 100% no-repeat;filter:drop-shadow(0 3px 3px rgba(0,0,0,.55));animation:nxSglBall 2.4s ease-in-out infinite}
 .nx-sgl-text{color:#aab6c0;font:700 13px/1 "Barlow Condensed","Arial Narrow",sans-serif;letter-spacing:.26em}
 .nx-sgl-text b{color:#baff18;font-weight:700}
 .nx-sgl-bar{position:relative;width:62%;height:2px;overflow:hidden;border-radius:2px;background:rgba(255,255,255,.08)}
 .nx-sgl-bar::after{content:"";position:absolute;inset:0;width:40%;background:linear-gradient(90deg,transparent,#baff18,transparent);animation:nxSglBar 1.3s ease-in-out infinite}
 @keyframes nxSglBall{0%{left:14px;transform:rotate(0)}46%,50%{left:calc(100% - 36px);transform:rotate(600deg)}96%,100%{left:14px;transform:rotate(0)}}
 @keyframes nxSglGoalR{0%,40%,58%,100%{background-color:transparent}48%{background-color:rgba(186,255,24,.3);box-shadow:0 0 18px rgba(186,255,24,.8)}}
 @keyframes nxSglGoalL{0%,6%,90%,100%{background-color:rgba(186,255,24,.3);box-shadow:0 0 18px rgba(186,255,24,.8)}16%,82%{background-color:transparent}}
 @keyframes nxSglBar{from{transform:translateX(-110%)}to{transform:translateX(260%)}}
 @media (prefers-reduced-motion:reduce){.nx-sgl-ball,.nx-sgl-goal,.nx-sgl-bar::after{animation:none!important}.nx-sgl-ball{left:calc(50% - 11px)}}`.replace('BALL','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%2032%2032%27%3E%3Cdefs%3E%3CradialGradient%20id%3D%27g%27%20cx%3D%27.38%27%20cy%3D%27.32%27%20r%3D%27.75%27%3E%3Cstop%20offset%3D%270%27%20stop-color%3D%27%23ffffff%27/%3E%3Cstop%20offset%3D%27.7%27%20stop-color%3D%27%23e9eef0%27/%3E%3Cstop%20offset%3D%271%27%20stop-color%3D%27%23aeb8bd%27/%3E%3C/radialGradient%3E%3C/defs%3E%3Ccircle%20cx%3D%2716%27%20cy%3D%2716%27%20r%3D%2715%27%20fill%3D%27url%28%23g%29%27%20stroke%3D%27%230b1005%27%20stroke-width%3D%271.2%27/%3E%3Cpath%20d%3D%27M16%2010.2%2021.4%2014.1%2019.4%2020.4H12.6L10.6%2014.1Z%27%20fill%3D%27%230d1214%27/%3E%3Cpath%20d%3D%27M16%201.6V10.2M21.4%2014.1%2029.8%2011.6M19.4%2020.4%2024.6%2027.6M12.6%2020.4%207.4%2027.6M10.6%2014.1%202.2%2011.6%27%20stroke%3D%27%230d1214%27%20stroke-width%3D%271.3%27%20fill%3D%27none%27/%3E%3Cpath%20d%3D%27M13%201.9%2016%204.3%2019%201.9ZM29.4%209%2028.6%2013.6%2031%2015.2ZM26.3%2026.1%2022%2027.4%2022.6%2030.2ZM9.7%2027.4%205.7%2026.1%209.4%2030.2ZM.9%2015.2%203.4%2013.6%202.6%209Z%27%20fill%3D%27%230d1214%27/%3E%3C/svg%3E');
 const style=document.createElement('style');style.id='nx-sgl-style';style.textContent=css;(document.head||document.documentElement).appendChild(style);
 const el=document.createElement('div');el.className='nx-sgl';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
 el.innerHTML=`<div class="nx-sgl-box"><img class="nx-sgl-logo" src="${logo}" alt="NEON XI"><div class="nx-sgl-title"></div><div class="nx-sgl-pitch" aria-hidden="true"><span class="nx-sgl-goal l"></span><span class="nx-sgl-ball"></span><span class="nx-sgl-goal r"></span></div><div class="nx-sgl-text">YÜKLENİYOR</div><div class="nx-sgl-bar" aria-hidden="true"></div></div>`;
 el.querySelector('.nx-sgl-title').textContent=title;
 (document.body||document.documentElement).appendChild(el);
 const started=performance.now();let done=false;
 const showTimer=setTimeout(()=>{if(!done)el.classList.add('show')},instant?0:140);
 if(instant)el.classList.add('show');
 const finish=()=>{if(done)return;done=true;clearTimeout(showTimer);clearInterval(poll);observer?.disconnect();
   if(!el.classList.contains('show')){el.remove();return}
   const wait=Math.max(0,450-(performance.now()-started));
   setTimeout(()=>{el.classList.add('hide');setTimeout(()=>el.remove(),320)},wait)};
 const ready=()=>READY.some(sel=>{try{const n=document.querySelector(sel);return n&&!el.contains(n)}catch{return false}});
 const check=()=>{if(document.body&&el.parentNode!==document.body)document.body.appendChild(el);if(ready())finish()};
 const observer=typeof MutationObserver==='function'?new MutationObserver(check):null;
 observer?.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class']});
 const poll=setInterval(check,200);
 setTimeout(finish,20000);
 window.NX_SG_LOADER_DONE=finish;
})();
