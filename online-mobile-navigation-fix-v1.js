(() => {
  'use strict';
  const MARK='nx-online-mobile-flow';
  const TEXTS=['Arkadaşlarla Oyna','Rakip Ara','Oda Kodu'];
  const style=document.createElement('style');
  style.id='nx-online-mobile-navigation-fix-v1';
  style.textContent=`
    .${MARK}{overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y!important;overscroll-behavior-y:contain!important;scrollbar-gutter:stable;max-height:100dvh!important;min-height:100dvh!important;padding-bottom:max(32px,env(safe-area-inset-bottom))!important}
    .${MARK} *{touch-action:pan-y}
    .${MARK} button,.${MARK} a,.${MARK} input,.${MARK} select{touch-action:manipulation}
    .nx-online-back-fix{position:fixed;z-index:500200;left:max(14px,env(safe-area-inset-left));top:max(14px,env(safe-area-inset-top));width:42px;height:42px;border:1px solid rgba(164,255,205,.35);border-radius:999px;background:rgba(3,14,9,.86);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#eafff2;display:grid;place-items:center;padding:0;box-shadow:0 8px 24px rgba(0,0,0,.28);font:500 0/1 system-ui;cursor:pointer;-webkit-tap-highlight-color:transparent}
    .nx-online-back-fix::before{content:'';width:11px;height:11px;border-left:2px solid currentColor;border-bottom:2px solid currentColor;transform:translateX(2px) rotate(45deg)}
    .nx-online-back-fix:active{border-color:#9cff3a;box-shadow:0 0 10px rgba(156,255,58,.22)}
  `;
  document.head.appendChild(style);

  let active=null,back=null;
  const visible=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
  const hasFlowText=el=>{const t=el?.innerText||'';return TEXTS.every(x=>t.includes(x))};
  function chooseScroller(seed){
    let el=seed,best=null;
    while(el&&el!==document.body&&el!==document.documentElement){
      if(visible(el)){
        const cs=getComputedStyle(el),r=el.getBoundingClientRect();
        const screenLike=r.width>=innerWidth*.78&&r.height>=innerHeight*.55;
        const scrollLike=el.scrollHeight>el.clientHeight+24||/(auto|scroll)/.test(cs.overflowY);
        if(screenLike&&(scrollLike||/screen|online|lobby|menu|panel|view/i.test(el.className||'')))best=el;
      }
      el=el.parentElement;
    }
    return best||seed.closest('main,section,[class*="screen"],[class*="Screen"],[class*="online"],[class*="Online"]')||seed.parentElement;
  }
  function goBack(){
    const candidates=[...document.querySelectorAll('button,a,[role="button"]')].filter(visible);
    const native=candidates.find(el=>/geri|back|kapat|ana sayfa/i.test(`${el.textContent||''} ${el.getAttribute('aria-label')||''}`)&&!el.classList.contains('nx-online-back-fix'));
    if(native){native.click();return}
    const home=document.getElementById('bootHome');
    if(home){
      document.querySelectorAll('.screen.active,.Screen.active').forEach(x=>x.classList.remove('active'));
      home.classList.add('active');home.style.display='block';home.scrollTop=0;return;
    }
    if(history.length>1)history.back();else location.href='./index.html';
  }
  function installBack(){
    if(back?.isConnected)return;
    back=document.createElement('button');back.type='button';back.className='nx-online-back-fix';back.setAttribute('aria-label','Geri');back.addEventListener('click',goBack);document.body.appendChild(back);
  }
  function clear(){if(active){active.classList.remove(MARK);active=null}back?.remove();back=null}
  function scan(){
    const seeds=[...document.querySelectorAll('main,section,div')].filter(el=>visible(el)&&hasFlowText(el));
    if(!seeds.length){clear();return}
    seeds.sort((a,b)=>a.getBoundingClientRect().width*a.getBoundingClientRect().height-b.getBoundingClientRect().width*b.getBoundingClientRect().height);
    const next=chooseScroller(seeds[0]);
    if(!next)return;
    if(active!==next){active?.classList.remove(MARK);active=next;active.classList.add(MARK);active.scrollTop=Math.max(0,active.scrollTop)}
    installBack();
  }
  const observer=new MutationObserver(()=>requestAnimationFrame(scan));
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']});
  addEventListener('resize',scan,{passive:true});
  addEventListener('pageshow',scan,{passive:true});
  setInterval(scan,700);
  scan();
})();
