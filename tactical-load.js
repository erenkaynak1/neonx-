(function(root){
  'use strict';
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):min));
  /*
   * NEON XI load model v2. Match-time cost is deterministic and squad-dependent.
   * Discipline controls wasted effort; resilience is explicit stamina when available,
   * otherwise the match engine supplies a strength/pace/teamwork proxy.
   */
  function condition(plan={},discipline=65,minute=0,resilience=65){
    const time=clamp(minute,0,120);
    const press=plan.pressingPlan==='Önde Baskı'?1.55:plan.pressingPlan==='Alçak Blok'?.78:1;
    const transition=plan.transitionPlan==='Hızlı Hücum'?1.18:plan.transitionPlan==='Topu Güvenceye Al'?.90:1;
    const efficiency=clamp(1.28-clamp(resilience,25,99)/230-clamp(discipline,25,99)/600,.72,1.08);
    const recovery=time>45?3:0;
    return clamp(100-time*.25*press*transition*efficiency+recovery,45,100);
  }
  function multiplier(value,key){
    const loss=(100-clamp(value,45,100))/100;
    if(['pace','dribbling'].includes(key))return 1-loss*.48;
    if(['pressingDiscipline','tackling','defending','positioning'].includes(key))return 1-loss*.42;
    if(['decisionMaking','composure','shortPassing','finishing','crossing'].includes(key))return 1-loss*.23;
    if(['longPassing','vision','shooting','shotPower'].includes(key))return 1-loss*.14;
    return 1;
  }
  // A high press opens transitional space, increasingly so as fatigue grows.
  // A deeper block protects space but concedes the initiative elsewhere.
  function transitionWindow(attacker={},defender={},defenderCondition=100,restDefense=2){
    let exposure=0;
    if(defender.pressingPlan==='Önde Baskı')exposure=.055+(100-clamp(defenderCondition,45,100))*.0012;
    if(defender.pressingPlan==='Alçak Blok')exposure=-.04;
    exposure-=Math.max(0,clamp(restDefense,0,8)-1.7)*.018;
    return clamp(exposure,-.08,.14);
  }
  // Explicit measured stamina wins; missing values use an unboosted physical proxy.
  function resilience(stamina,strength=65,pace=65,teamwork=65){
    if(stamina!=null && Number.isFinite(Number(stamina)) && Number(stamina)>0)return clamp(stamina,25,99);
    return clamp(clamp(strength,25,99)*.42+clamp(pace,25,99)*.30+clamp(teamwork,25,99)*.28,25,99);
  }
  const api={version:'2.1.0',condition,multiplier,transitionWindow,resilience};
  root.NEON_TACTICAL_LOAD=api;
  if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
