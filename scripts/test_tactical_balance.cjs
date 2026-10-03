'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const core=fs.readFileSync(path.join(root,'neon-xi-core.html'),'utf8');
const load=require('../tactical-load.js');
const extract=name=>{
 const start=core.indexOf('  function '+name+'(');
 assert.ok(start>=0,'missing production function '+name);
 const end=core.indexOf('\n  }',start);
 assert.ok(end>start,'missing end '+name);
 return core.slice(start,end+4);
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const high={pressingPlan:'Önde Baskı',transitionPlan:'Hızlı Hücum'};
const low={pressingPlan:'Alçak Blok',transitionPlan:'Topu Güvenceye Al'};
const balanced={pressingPlan:'Orta Blok',transitionPlan:'Dengeli Geçiş'};
assert.equal(load.condition(high,65,0,65),100);
assert.ok(load.condition(high,65,90,65)<load.condition(balanced,65,90,65));
assert.ok(load.condition(balanced,65,90,65)<load.condition(low,65,90,65));
assert.ok(load.condition(high,85,90,85)>load.condition(high,45,90,45));
assert.ok(load.condition(high,85,90,45)<load.condition(high,85,90,85));
for(const minute of [-5,0,45,46,70,90,120,999]){
 for(const resilience of [25,65,99]){
  const value=load.condition(high,65,minute,resilience);
  assert.ok(Number.isFinite(value)&&value>=45&&value<=100);
  for(const key of ['pace','tackling','finishing','vision','heading'])
   assert.ok(Number.isFinite(load.multiplier(value,key))&&load.multiplier(value,key)>0);
 }
}
assert.equal(load.resilience(90,25,25,25),90);
assert.equal(load.resilience(null,75,75,75),75);
assert.equal(load.resilience(NaN,75,75,75),75);
assert.ok(load.multiplier(60,'pace')<load.multiplier(60,'shortPassing'));
assert.equal(load.multiplier(60,'heading'),1);
assert.ok(load.transitionWindow(high,high,60,2)>load.transitionWindow(high,high,95,2));
assert.ok(load.transitionWindow(high,high,70,2)>load.transitionWindow(high,low,70,2));
assert.ok(load.transitionWindow(high,high,70,4)<load.transitionWindow(high,high,70,1));
// Run actual v6 production functions with complete squads and real workload integration.
const {makeLab}=require('./draft-engine-lab.cjs');
const lab=makeLab(),c=lab.c;
let g=lab.setup({tactic:high},{tactic:high});
const earlyTransition=c.lab.v5TransitionChance('A','B',3);
g.minute=90;
assert.ok(c.lab.v5TransitionChance('A','B',3)>earlyTransition,'fatigued high press exposes transitions');
c.state.tactics.B={...c.state.tactics.B,...low};
assert.ok(c.lab.v5TransitionChance('A','B',3)<earlyTransition,'low block limits counter space');
c.state.tactics.B={...c.state.tactics.B,...high};
g.minute=0;
const earlyPress=vm.runInContext('v5TacticRoleAdjustment("B","defense",1,"center")',c);
g.minute=90;
assert.ok(vm.runInContext('v5TacticRoleAdjustment("B","defense",1,"center")',c)<earlyPress);
const member=g.squad.A[1];
member.footballer.stamina=99;const durable=c.lab.memberCondition(member,90);
member.footballer.stamina=25;assert(c.lab.memberCondition(member,90)<durable);
delete member.footballer.stamina;member.footballer.attributes.stamina=99;
g.attributeCache=new WeakMap();assert.equal(c.lab.memberCondition(member,90),durable);
delete member.footballer.attributes.stamina;g.attributeCache=new WeakMap();
assert.equal(c.lab.memberCondition(member,90),load.condition(high,75,90,75));
const expected=g.squad.A.slice(1).reduce((sum,m)=>sum+c.lab.memberCondition(m,90),0)/10;
assert.equal(c.lab.teamCondition('A',90),expected);
// The user explicitly asked to preserve the existing chemistry behavior.
const hash=source=>require('node:crypto').createHash('sha256').update(source).digest('hex');
assert.equal(hash(extract('chemistryModifier')),'bda4ba8d341a556b472dacea9ec57a77189af504db33ba1c2bdf4c893d7ed49c','Preserve main chemistry: chemistryModifier');
assert.equal(hash(extract('teamBasePower')),'281cc061a730a2a7210256d95304b692bcb7564ad60e306cf3b5c6e0f1aea524','Preserve main chemistry: teamBasePower');
assert.equal(hash(core.match(/function boostFromChem\(c\)\{[^}]*\}/)[0]),'ff2307b2b5488fdbbbc0ac2383ee1f469bad6ed670167886a4ec159e8627a4f2','Preserve main chemistry: boostFromChem');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(index.includes("const VERSION='20260929-tactical-engine-v6'"),'Keep the approved main asset cache token');
assert.ok(index.includes("encodeURIComponent(TACTICAL_VERSION)"),'Changed engine requires a separate cache key');
for(const file of ['tactical-load.js','tactical-workshop.js'])assert.ok(index.includes('./'+file+"?v='+TACTICAL_VERSION"),'Version changed tactical assets');
const phaseCtx={clamp,v3Config:()=>({attackDirection:'Kanatları Kullan',finalAction:'Ortaları Artır',defenseTactic:'Dengeli Savunma'}),
 v5ActionAffordance:()=>1,v3Choice:w=>w};
vm.createContext(phaseCtx);
vm.runInContext(['v3DirectionKey','v3CrossRates','v3WorkRates','v3DefenseMatchFactor','v3AdjustedRate','v3ScaleRemainder','v3FinalAction'].map(extract).join('\n'),phaseCtx);
const w=phaseCtx.v3FinalAction('A','B',false,'wing');
const m=phaseCtx.v3FinalAction('A','B',false,'center');
const t=phaseCtx.v3FinalAction('A','B',false,'transition');
assert.ok(w.cross>m.cross&&m.cross>t.cross,'cross access must follow actual corridor');
assert.ok([w,m,t].every(x=>Object.values(x).every(y=>y>=0&&Number.isFinite(y))));
assert.ok(core.includes('const transitionTriggered=v6RecoverPossession(attackingTeam,defendingTeam,phase)'));
console.log('PASS: tactical balance load, physical proxy, unchanged chemistry, fatigue-sensitive high press, counter transitions and corridor realism.');
