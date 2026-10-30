'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const core=fs.readFileSync(path.join(__dirname,'../neon-xi-core.html'),'utf8');
function extract(name){
  const start=core.indexOf(`  function ${name}(`);
  assert.ok(start>=0,name);
  const end=core.indexOf('\n  }',start)+4;
  return core.slice(start,end);
}
const sentOff={footballer:{id:'red',pos:'ST'},ability:99};
const available={footballer:{id:'active',pos:'ST'},ability:60};
const c={game:{squad:{A:[sentOff,available]}},activeSquad:()=>[available],stat:m=>m.ability,
  tactic:()=>({penalty:'red'}),clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),rng:()=>.5};
vm.createContext(c);
vm.runInContext(['average','selectedSetPieceMember','v3DefenseMatchFactor','v3AdjustedRate'].map(extract).join('\n'),c);
assert.equal(c.average('A',['finishing']),60,'sent-off player must not boost team ability');
assert.equal(c.average('A',['finishing'],()=>false),65,'empty position group uses finite fallback');
assert.equal(c.selectedSetPieceMember('A','penalty'),null,'sent-off designated taker is unavailable');
const penalty=core.slice(core.indexOf('  async function simulatePenalty('),core.indexOf('  async function v5MaybePenalty('));
const selection=penalty.slice(penalty.indexOf('    const selectedId='),penalty.indexOf('    const keeper='));
vm.runInContext(`function pickPenalty(attackingTeam){${selection};return taker;}`,c);
assert.equal(c.pickPenalty('A'),available,'penalty fallback must use an active player');
for(const [action,defense] of [['Kaleyi Görünce Vur','Şut Savunması'],['Ortaları Artır','Yan Top Savunması'],['Ceza Sahasına Pasla Gir','Pas Kanallarını Kapat']]){
  const neutral=c.v3AdjustedRate(20,50,action,action,'Dengeli Savunma');
  const counter=c.v3AdjustedRate(20,50,action,action,defense);
  assert.ok(counter>20&&counter<neutral,'counter reduces preference without cancelling it');
}
const shot=core.slice(core.indexOf('  async function resolveShot('),core.indexOf('  async function simulatePenalty('));
const probabilityCode=shot.slice(shot.indexOf('    const totalOnTargetChance='),shot.indexOf('    if(roll<goalChance){'));
c.applyMicroRating=()=>{};c.incrementRatingStat=()=>{};c.shot={team:'A'};c.shooter={};
for(const goal of [.01,.2,.6,.95])for(const target of [.18,.5,.86]){
  c.goalChance=goal;c.onTargetChance=target;
  const actual=vm.runInContext(`(()=>{${probabilityCode};return saveExpected;})()`,c);
  const totalOnTarget=goal+(1-goal)*target;
  assert.ok(Math.abs(actual-c.clamp(1-goal/totalOnTarget,.25,.92))<1e-12,'keeper expectation must use total on-target probability');
}
console.log('PASS: red-card ability exclusion, penalty eligibility, tactical counters, 12 keeper probability cases.');

// Exercise production phase bookkeeping with controlled participants and outcomes.
c.v3PhaseParticipants=()=>({primary:available,carrier:available,defender:sentOff,support:available});
c.v3ClampRating=v=>v;c.setVisualPhase=()=>{};c.visualMemberIds=()=>[];
c.game.teamNames={A:'A',B:'B'};
vm.runInContext(extract('v3RecordPhaseMicro'),c);
for(const success of [false,true])for(const phase of [2,3,4]){
  const micro=c.v3RecordPhaseMicro('A','B',phase,'wing',success,.65);
  assert.equal(micro.carrySuccess,success,'dribble display must agree with phase possession');
  assert.equal(micro.carryExpected,.65);
}
// Every awarded second yellow is an expulsion; both counters include the card.
c.v3Config=()=>({});c.game.profiles={B:{foulRisk:.04}};
c.weightedMember=()=>available;c.recordRoleEvent=()=>{};c.adjustRating=()=>{};c.addEvent=()=>{};
vm.runInContext(extract('v5AccrueIncidentalFoul'),c);
for(const prior of [0,1]){
  const rec={yellow:prior,red:false};c.record=()=>rec;
  c.game.stats={B:{fouls:0,yellowCards:0,yellow:0,redCards:0,red:0}};
  c.rng=()=>.1;
  c.v5AccrueIncidentalFoul('B','center');
  assert.equal(rec.yellow,prior+1);assert.equal(rec.red,prior===1);
  assert.equal(c.game.stats.B.yellowCards,1);
  assert.equal(c.game.stats.B.redCards,prior);
}
// Execution corridor is independent of the coach's preferred corridor.
vm.runInContext(['v3DirectionKey','v3CrossRates','v3WorkRates','v3ScaleRemainder','v3FinalAction'].map(extract).join('\n'),c);
c.v3Config=()=>({attackDirection:'Kanatları Kullan',finalAction:'Dengeli'});
c.v3Choice=w=>w;
for(const route of ['wing','center','transition']){
  const calls=[];c.v5ActionAffordance=(_a,_b,action,corridor)=>{calls.push([action,corridor]);return 1;};
  const weights=c.v3FinalAction('A','B',false,route);
  assert.equal(calls.find(x=>x[0]==='shot')[1],route);
  assert.equal(calls.find(x=>x[0]==='workBall')[1],route);
  assert.ok(Object.values(weights).every(x=>Number.isFinite(x)&&x>=0));
}
console.log('PASS: six possession/visual cases, first/second yellow, three actual attack corridors.');

vm.runInContext(['v3ApplyAdjustment','v3PhaseProbability'].map(extract).join('\n'),c);
let comparisons=0;
for(const phase of [1,2,3,4])for(const attack of [40,60,80])for(const defense of [40,60,80]){
  const base=c.v3PhaseProbability(attack,defense,0,0,phase);
  assert.ok(base>=.22&&base<=.94);
  assert.ok(c.v3PhaseProbability(attack+10,defense,0,0,phase)>=base);
  assert.ok(c.v3PhaseProbability(attack,defense+10,0,0,phase)<=base);
  assert.ok(c.v3PhaseProbability(attack,defense,6,0,phase)>=base);
  assert.ok(c.v3PhaseProbability(attack,defense,0,6,phase)<=base);
  comparisons++;
}
console.log(`PASS: ${comparisons} phase/ability/tactical monotonicity combinations (not full-match balance tests).`);
