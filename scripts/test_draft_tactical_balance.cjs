'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm');
const {makeLab}=require('./draft-engine-lab.cjs');
(async()=>{
 const lab=makeLab(),{c}=lab;let g=lab.setup();
 // Detailed ability wins over a broad fallback; null never becomes a zero-rated attribute.
 const m=g.squad.A[1];m.footballer.attributes.shortPassing=92;m.footballer.attributes.passing=40;
 assert.equal(c.lab.baseStat(m,'shortPassing'),92);
 m.footballer.attributes.shortPassing=null;assert.equal(c.lab.baseStat(m,'shortPassing'),40);
 // Actual deployed positions govern cohorts; natural CB at ST cannot cover both lines.
 g=lab.setup();g.squad.A[2].position='ST';
 assert.equal(vm.runInContext('v3Members("A",["CB"]).length',c),1);
 const before=c.lab.teamStructure('A');g.ratings.A.A3.red=true;const after=c.lab.teamStructure('A');
 assert(after.buildup<before.buildup);assert.equal(after.outfieldCount,9);
 const control=vm.runInContext('v6Control("A")',c);g.ratings.A.A3.red=false;assert(vm.runInContext('v6Control("A")',c)>control);
 // Focused defensive instructions help their target but have an opportunity cost.
 for(const [focus,action] of [['Şut Savunması','shot'],['Yan Top Savunması','cross'],['Pas Kanallarını Kapat','workBall']]){
  lab.setup();const base=c.lab.v3FinalAdjustment('B','defense',5,'center',action);
  c.state.tactics.B.defenseTactic=focus;assert(c.lab.v3FinalAdjustment('B','defense',5,'center',action)>base);
  const other=action==='shot'?'cross':'shot';const focused=c.lab.v3FinalAdjustment('B','defense',5,'center',other);
  c.state.tactics.B.defenseTactic='Dengeli Savunma';assert(c.lab.v3FinalAdjustment('B','defense',5,'center',other)>focused);
 }
 lab.setup({tactic:{transitionPlan:'Hızlı Hücum'}},{tactic:{general:'Hücum Ağırlıklı',pressingPlan:'Önde Baskı'}});
 const exposed=c.lab.v5TransitionChance('A','B',3);c.state.tactics.B.general='Savunma Ağırlıklı';c.state.tactics.B.pressingPlan='Alçak Blok';assert(exposed>c.lab.v5TransitionChance('A','B',3));
 const fast=c.lab.v5TransitionChance('A','B',3);c.state.tactics.A.transitionPlan='Topu Güvenceye Al';assert(fast>c.lab.v5TransitionChance('A','B',3));
 // A first possession cannot be a counter without a regain.
 g=lab.setup({}, {},71);await c.lab.simulateAttack(g.token);assert.equal(g.stats.A.transitionAttacks+g.stats.B.transitionAttacks,0);
 // Forced counter must traverse defensive recovery before any shot.
 g=lab.setup({}, {},72);g.forcedAttack={team:'A',route:'transition'};await c.lab.simulateAttack(g.token);
 assert(g.visualTimeline.some(frame=>frame.phase===4&&frame.success!==null),'counter recovery phase missing');
 // Preserve the custom chemistry curve and ensure score alone cannot grant a comeback buff.
 g=lab.setup();const fresh=c.lab.stat(g.squad.A[1],'shortPassing');
 c.chemMap=()=>({'1':10});assert(c.lab.stat(g.squad.A[1],'shortPassing')>fresh);c.chemMap=()=>({});
 g.minute=85;const neutralAdjustment=c.lab.v3FinalAdjustment('A','attack',3,'center');g.score.B=3;
 assert.equal(c.lab.v3FinalAdjustment('A','attack',3,'center'),neutralAdjustment);
 // Full-match repeatability, accounting and watched/fast parity with presentation only disabled.
 const r1=await lab.match({}, {},81),r2=await lab.match({}, {},81);assert.deepEqual(r1,r2);
 for(const team of ['A','B']){assert(r1.stats[team].onTarget<=r1.stats[team].shots);assert(r1.score[team]<=r1.stats[team].onTarget);assert(r1.stats[team].passesCompleted<=r1.stats[team].passesAttempted);assert(Math.abs(r1.shots.filter(s=>s.team===team).reduce((n,s)=>n+s.xG,0)-r1.stats[team].xG)<1e-8);}
 g=lab.setup({}, {},81);
 vm.runInContext('render=()=>{};wait=async()=>true;showHalftime=async()=>true;setReason=()=>{};',c);
 await vm.runInContext('runMatch(game.token)',c);
 assert.deepEqual(JSON.parse(JSON.stringify(g.score)),r1.score);
 assert.deepEqual(JSON.parse(JSON.stringify(g.stats)),r1.stats);
 assert.deepEqual(await makeLab(undefined,true).match({}, {},81),r1);
 console.log('PASS: attribute precedence, null fallback, positional eligibility, red-card structure/control, three counter tradeoffs, regain context, transition defense, repeatability, match accounting, watched/fast parity.');
})().catch(e=>{console.error(e);process.exit(1)});
