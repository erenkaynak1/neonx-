(function(root){
  'use strict';
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  // Deterministic: same squad, plan and minute produce the same physical cost.
  function condition(plan={},discipline=65,minute=0){
    const time=clamp(Number(minute)||0,0,120);
    const press=plan.pressingPlan==='Önde Baskı'?1.55:plan.pressingPlan==='Alçak Blok'?.78:1;
    const transition=plan.transitionPlan==='Hızlı Hücum'?1.18:plan.transitionPlan==='Topu Güvenceye Al'?.90:1;
    const endurance=clamp(1.25-(Number(discipline)||65)/200,.75,1.05);
    const recovery=time>45?3:0;
    return clamp(100-time*.25*press*transition*endurance+recovery,50,100);
  }
  function multiplier(value,key){
    const loss=(100-clamp(value,50,100))/100;
    if(['pace','pressingDiscipline','tackling','dribbling'].includes(key))return 1-loss*.42;
    if(['decisionMaking','composure','shortPassing','finishing'].includes(key))return 1-loss*.20;
    return 1;
  }
  const api={condition,multiplier};root.NEON_TACTICAL_LOAD=api;
  if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
