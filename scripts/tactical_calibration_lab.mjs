import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const BASE=process.env.NEON_BASE_URL||'http://127.0.0.1:4173/index.html';
const N=Number(process.env.NEON_BALANCE_SEEDS||12);
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'tr-TR'});
page.setDefaultTimeout(45000);
const issues=[],results=[];
const scenarios=[
 {name:'balanced-mirror',A:{},B:{}},
 {name:'press-vs-lowblock',A:{general:'Hücum Ağırlıklı',pressingPlan:'Önde Baskı',transitionPlan:'Hızlı Hücum'},B:{general:'Savunma Ağırlıklı',pressingPlan:'Alçak Blok',transitionPlan:'Topu Güvenceye Al'}},
 {name:'wide-cross-vs-center',A:{attackDirection:'Kanatları Kullan',finalAction:'Ortaları Artır'},B:{attackDirection:'Merkezden Oyna',finalAction:'Ceza Sahasına Pasla Gir'}},
 {name:'counter-vs-possession',A:{general:'Savunma Ağırlıklı',pressingPlan:'Alçak Blok',transitionPlan:'Hızlı Hücum'},B:{general:'Hücum Ağırlıklı',pressingPlan:'Önde Baskı',transitionPlan:'Topu Güvenceye Al'}}
];
try{
 await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>Boolean(window.KADRO_ENGINE_TESTS?.runFast&&window.NEON_TACTICAL_LOAD?.transitionWindow),null,{timeout:45000});
 const setup=await page.evaluate(()=>{
  if(typeof state==='undefined'||typeof PLAYERS==='undefined'||typeof FORMATIONS==='undefined')throw Error('Core globals unavailable');
  const s=FORMATIONS['433'].slots,used=new Set(),a={},b={};
  const rating=p=>basePlayerPower(p);
  for(const slot of s){
   const available=PLAYERS.filter(p=>p.pos===slot.pos&&!used.has(p.id))
     .sort((x,y)=>Math.abs(rating(x)-77)-Math.abs(rating(y)-77)||String(x.id).localeCompare(String(y.id)));
   if(available.length<2)throw Error('Insufficient pool for '+slot.pos);
   a[slot.id]=available[0].id;b[slot.id]=available[1].id;
   used.add(available[0].id);used.add(available[1].id);
  }
  state.teams.A.formation='433';state.teams.B.formation='433';
  const p=team=>{const t=baseTactics();for(const slot of s)t.tasks[slot.id]=defaultRole(slot.pos);return t;};
  state.teams.A.slots={...a};state.teams.B.slots={...b};
  state.tactics.A=p('A');state.tactics.B=p('B');
  return {a,b,rawA:teamPower('A').base,rawB:teamPower('B').base,chemA:teamPower('A').chem,chemB:teamPower('B').chem};
 });
 for(const scenario of scenarios)for(let i=0;i<N;i++)for(const reversed of [false,true]){
  const entry=await page.evaluate(async({scenario,index,reversed,setup})=>{
   const seed=(0x9e3779b9+index*4099+scenario.name.length*10007)>>>0;
   const rng=()=>{let t=(x+=0x6d2b79f5);t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};let x=seed;
   state.teams.A.slots={...(reversed?setup.b:setup.a)};
   state.teams.B.slots={...(reversed?setup.a:setup.b)};
   const A={...baseTactics(),...(reversed?scenario.B:scenario.A)};
   const B={...baseTactics(),...(reversed?scenario.A:scenario.B)};
   const result=await window.KADRO_ENGINE_TESTS.runFast({random:rng,tactics:{A,B},summaryOnly:true});
   const score=result.score,stats=result.stats;
   if(!Number.isFinite(stats.A.xG)||!Number.isFinite(stats.B.xG))throw Error('Invalid xG');
   for(const team of ['A','B']){
    const row=stats[team],goals=score[team];
    if(!(row.shots>=row.onTarget&&row.onTarget>=goals&&row.shots>=0&&goals>=0))throw Error('Shot-score incoherence '+team+JSON.stringify({row,goals}));
    if(row.xG<0||!Number.isFinite(row.possession)||row.possession<0||row.possession>100)throw Error('Invalid stats '+team);
   }
   if(Math.abs(stats.A.possession+stats.B.possession-100)>.001)throw Error('Possession does not sum to 100');
   return {scenario:scenario.name,seed,index,reversed,A:{score:score.A,shots:stats.A.shots,xG:stats.A.xG,poss:stats.A.possession,turnovers:stats.A.turnovers,highTurnovers:stats.A.highTurnovers},B:{score:score.B,shots:stats.B.shots,xG:stats.B.xG,poss:stats.B.possession,turnovers:stats.B.turnovers,highTurnovers:stats.B.highTurnovers}};
  },{scenario,index:i,reversed,setup});
  results.push(entry);
 }
 const avg=(rows,selector)=>rows.reduce((a,b)=>a+selector(b),0)/Math.max(1,rows.length);
 const groups=scenarios.map(x=>{
  const rows=results.filter(r=>r.scenario===x.name);
  return {scenario:x.name,matches:rows.length,
   goalsPerMatch:avg(rows,r=>r.A.score+r.B.score),
   shotsPerMatch:avg(rows,r=>r.A.shots+r.B.shots),
   xGPerMatch:avg(rows,r=>r.A.xG+r.B.xG),
   AGoalMargin:avg(rows,r=>r.A.score-r.B.score),
   avgHighTurnovers:avg(rows,r=>r.A.highTurnovers+r.B.highTurnovers),
   mirroredABias:avg(rows.filter(r=>!r.reversed),r=>r.A.score-r.B.score)+avg(rows.filter(r=>r.reversed),r=>r.A.score-r.B.score)};
 });
 await fs.mkdir('artifacts/tactical-balance',{recursive:true});
 await fs.writeFile('artifacts/tactical-balance/report.json',JSON.stringify({N,setup,groups,results,issues},null,2));
 console.log(JSON.stringify({N,setup:{rawA:setup.rawA,rawB:setup.rawB,chemA:setup.chemA,chemB:setup.chemB},groups},null,2));
 assert.equal(results.length,scenarios.length*N*2);
 assert.ok(N>=12,'Use at least 12 mirrored seeds per scenario');
 for(const group of groups){
  assert.ok(group.goalsPerMatch>=.3&&group.goalsPerMatch<=7,'Implausible goal volume: '+group.scenario);
  assert.ok(group.shotsPerMatch>=3&&group.shotsPerMatch<=60,'Implausible shot volume: '+group.scenario);
  assert.ok(Math.abs(group.mirroredABias)<=2,'Large mirrored side bias: '+group.scenario);
 }
 // These broad smoke bounds do not establish universal tactical balance.

}finally{await page.close();await browser.close();}
