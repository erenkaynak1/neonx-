(() => {
  'use strict';
  const STYLE='nx-tournament-back-safe-v2-style';
  function addStyle(){
    if(document.getElementById(STYLE))return;
    const s=document.createElement('style');s.id=STYLE;s.textContent=`
      .nx-tournament-back-safe{position:fixed;z-index:410000;left:max(10px,env(safe-area-inset-left));top:max(10px,env(safe-area-inset-top));min-height:38px;padding:0 12px;border:1px solid rgba(186,255,24,.42);border-radius:10px;background:rgba(6,18,11,.94);color:#eaffd5;font:850 10px/1 system-ui,sans-serif;letter-spacing:.07em;cursor:pointer;box-shadow:0 10px 28px rgba(0,0,0,.42),0 0 16px rgba(186,255,24,.08)}
      .nx-tournament-back-safe:active{transform:translateY(1px);filter:brightness(1.15)}
    `;document.head.appendChild(s);
  }
  function isActive(){return Boolean(document.getElementById('bootTournament')?.classList.contains('active'))}
  function goHome(){
    const screen=document.getElementById('bootScreen');screen?.classList.remove('hidden');
    document.querySelectorAll('#bootScreen .bootView').forEach(v=>v.classList.remove('active'));
    document.getElementById('bootHome')?.classList.add('active');
    const tournament=document.getElementById('bootTournament');tournament?.classList.remove('active');
    const frame=tournament?.querySelector('iframe');if(frame)frame.src='about:blank';
    try{history.replaceState(null,'',location.pathname+location.search+'#/menu')}catch{}
    sync();
  }
  function sync(){
    let b=document.querySelector('.nx-tournament-back-safe');
    if(!isActive()){b?.remove();return}
    if(b)return;
    b=document.createElement('button');b.type='button';b.className='nx-tournament-back-safe';b.textContent='← ANA MENÜ';b.onclick=goHome;document.body.appendChild(b);
  }
  document.addEventListener('click',event=>{
    const target=event.target?.closest?.('#bootHome.nx-approved-home-v1 .h-how');
    if(!target)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    location.href='./side-games/how-to-play.html';
  },true);
  addStyle();setInterval(sync,700);sync();
})();
