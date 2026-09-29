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
assert.ok(load.multiplier(60,'pace')<load.multiplier(60,'shortPassing'));
assert.equal(load.multiplier(60,'heading'),1);
assert.ok(load.transitionWindow(high,high,60,2)>load.transitionWindow(high,high,95,2));
assert.ok(load.transitionWindow(high,high,70,2)>load.transitionWindow(high,low,70,2));
assert.ok(load.transitionWindow(high,high,70,4)<load.transitionWindow(high,high,70,1));
const c={clamp,boostFromChem:null,chemistryFor:(_team,member)=>member.chem,game:{squad:{A:[{footballer:{ability:80},chem:10},{footballer:{ability:60},chem:0}],B:[]}},basePlayerPower:p=>p.ability};
vm.createContext(c);
vm.runInContext(core.match(/function boostFromChem\(c\)\{[^}]*\}/)[0]+'\n'+extract('chemistryModifier')+'\n'+extract('teamBasePower'),c);
assert.equal(c.boostFromChem(0),0);
assert.equal(c.boostFromChem(10),8);
assert.equal(c.boostFromChem(200),8);
assert.equal(c.chemistryModifier('A',{chem:10}),1.08);
assert.equal(c.teamBasePower('A'),70,'baseline cannot double count chemistry');
const ctx={clamp,rng:()=>.2,other:t=>t==='A'?'B':'A',
 game:{minute:0,score:{A:0,B:0}},
 window:{NEON_TACTICAL_LOAD:load},
 v3Config:t=>t==='A'?high:balanced,
 teamStructure:t=>({outlet:2,runner:2,restDefense:t==='B'?2:2,roleFit:70,press:1.5,cover:2.3,buildup:1.7,creator:2.2,width:2,finisher:1,aerial:1,outfieldCount:10,risk:1}),
 average:()=>70};
vm.createContext(ctx);
vm.runInContext(extract('v5TransitionChance')+'\n'+extract('v5GameStateAdjustment')+'\n'+extract('v5TacticRoleAdjustment'),ctx);
ctx.v3Config=t=>t==='A'?high:high;
const earlyTransition=ctx.v5TransitionChance('A');
ctx.game.minute=90;
const lateTransition=ctx.v5TransitionChance('A');
assert.ok(lateTransition>earlyTransition,'fatigued high press must expose transitions');
ctx.v3Config=t=>t==='A'?high:low;
assert.ok(lateTransition>ctx.v5TransitionChance('A'),'low block must suppress transitions');
ctx.v3Config=t=>t==='B'?high:balanced;
ctx.game.minute=0;
const earlyPress=ctx.v5TacticRoleAdjustment('B','defense',1,'center');
ctx.game.minute=90;
const latePress=ctx.v5TacticRoleAdjustment('B','defense',1,'center');
assert.ok(earlyPress>latePress,'high press must not retain its first-minute intensity');
const phaseCtx={clamp,v3Config:()=>({attackDirection:'Kanatları Kullan',finalAction:'Ortaları Artır',defenseTactic:'Dengeli Savunma'}),
 v5ActionAffordance:()=>1,v3Choice:w=>w};
vm.createContext(phaseCtx);
vm.runInContext(['v3DirectionKey','v3CrossRates','v3WorkRates','v3DefenseMatchFactor','v3AdjustedRate','v3ScaleRemainder','v3FinalAction'].map(extract).join('\n'),phaseCtx);
const w=phaseCtx.v3FinalAction('A','B',false,'wing');
const m=phaseCtx.v3FinalAction('A','B',false,'center');
const t=phaseCtx.v3FinalAction('A','B',false,'transition');
assert.ok(w.cross>m.cross&&m.cross>t.cross,'cross access must follow actual corridor');
assert.ok([w,m,t].every(x=>Object.values(x).every(y=>y>=0&&Number.isFinite(y))));
assert.ok(core.includes('const pressureBonus=pressPlan==='));
console.log('PASS: tactical balance load, physical proxy, capped chemistry, no duplicate team bonus, fatigue-sensitive high press, counter transitions and corridor realism.');
