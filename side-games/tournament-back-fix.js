(() => {
  'use strict';
  const STYLE_ID='nx-tournament-back-fix-style';
  function addStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
      .nx-tournament-back-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:36px;padding:0 12px;border:1px solid rgba(186,255,24,.38);border-radius:10px;background:rgba(186,255,24,.055);color:#eaffd5;font:850 10px/1 system-ui,sans-serif;letter-spacing:.07em;cursor:pointer;white-space:nowrap}
      .nx-tournament-back-btn:active{transform:translateY(1px);filter:brightness(1.15)}
      .nx-tournament-back-fallback{position:fixed;z-index:410000;left:max(10px,env(safe-area-inset-left));top:max(10px,env(safe-area-inset-top));box-shadow:0 8px 28px rgba(0,0,0,.42)}
    `;document.head.appendChild(s);
  }
  function goHome(){
    const screen=document.getElementById('bootScreen');
    screen?.classList.remove('hidden');
    document.querySelectorAll('#bootScreen .bootView').forEach(v=>v.classList.remove('active'));
    document.getElementById('bootHome')?.classList.add('active');
    const frame=document.querySelector('#bootTournament iframe,.tournamentFrame');
    if(frame&&frame.tagName==='IFRAME')frame.src='about:blank';
    try{history.replaceState(null,'',location.pathname+location.search+'#/menu')}catch{}
    ensure();
  }
  function ensure(){
    const tournament=document.getElementById('bootTournament');
    const active=tournament?.classList.contains('active');
    document.querySelectorAll('.nx-tournament-back-fallback').forEach(x=>{if(!active)x.remove()});
    if(!active)return;
    const bar=tournament.querySelector('.tournamentHostBar');
    if(bar){
      if(bar.querySelector('.nx-tournament-back-btn'))return;
      const b=document.createElement('button');b.type='button';b.className='nx-tournament-back-btn';b.textContent='← ANA MENÜ';b.onclick=goHome;bar.prepend(b);return;
    }
    if(!document.querySelector('.nx-tournament-back-fallback')){
      const b=document.createElement('button');b.type='button';b.className='nx-tournament-back-btn nx-tournament-back-fallback';b.textContent='← ANA MENÜ';b.onclick=goHome;document.body.appendChild(b);
    }
  }
  addStyle();
  const obs=new MutationObserver(ensure);obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  setInterval(ensure,700);ensure();
})();
