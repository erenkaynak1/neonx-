(()=>{
  'use strict';
  const init=()=>{
    const board=document.querySelector('#matchSimulation .matchScoreboard');
    const a=document.getElementById('matchScoreA');
    const b=document.getElementById('matchScoreB');
    if(!board||!a||!b)return false;
    if(board.dataset.nxPremiumScoreboard==='1')return true;
    board.dataset.nxPremiumScoreboard='1';

    const lightning=document.createElement('div');
    lightning.className='nx-goal-lightning';
    lightning.setAttribute('aria-hidden','true');
    board.appendChild(lightning);

    let oldA=Number(a.textContent)||0;
    let oldB=Number(b.textContent)||0;
    let cleanupTimer=0;

    const animateGoal=(team,target)=>{
      if(document.body.classList.contains('nx-reduced-effects')){
        target.classList.remove('nx-goal-number');
        void target.offsetWidth;
        target.classList.add('nx-goal-number');
        setTimeout(()=>target.classList.remove('nx-goal-number'),120);
        return;
      }
      clearTimeout(cleanupTimer);
      board.classList.remove('nx-goal-flash','nx-goal-team-a','nx-goal-team-b');
      target.classList.remove('nx-goal-number');
      void board.offsetWidth;
      board.classList.add('nx-goal-flash',team==='A'?'nx-goal-team-a':'nx-goal-team-b');
      target.classList.add('nx-goal-number');
      cleanupTimer=setTimeout(()=>{
        board.classList.remove('nx-goal-flash','nx-goal-team-a','nx-goal-team-b');
        target.classList.remove('nx-goal-number');
      },1050);
    };

    const watch=(el,team)=>new MutationObserver(()=>{
      const current=Number(el.textContent)||0;
      if(team==='A'){
        if(current>oldA)animateGoal('A',el);
        oldA=current;
      }else{
        if(current>oldB)animateGoal('B',el);
        oldB=current;
      }
    }).observe(el,{childList:true,characterData:true,subtree:true});

    watch(a,'A');
    watch(b,'B');
    return true;
  };
  if(!init()){
    let tries=0;
    const timer=setInterval(()=>{tries++;if(init()||tries>80)clearInterval(timer)},100);
  }
})();
