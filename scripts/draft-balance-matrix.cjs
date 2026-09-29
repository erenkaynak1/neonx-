'use strict';
const {makeLab}=require('./draft-engine-lab.cjs');
const assert=require('node:assert/strict');
(async()=>{
 const lab=makeLab(undefined,true),n=Number(process.env.MATCHES||60),reports=[];
 const cases={balanced:{},press:{tactic:{general:'Hücum Ağırlıklı',pressingPlan:'Önde Baskı',transitionPlan:'Hızlı Hücum'}},counter:{tactic:{general:'Savunma Ağırlıklı',pressingPlan:'Alçak Blok',transitionPlan:'Hızlı Hücum'}},possession:{tactic:{transitionPlan:'Topu Güvenceye Al',attackDirection:'Merkezden Oyna',finalAction:'Ceza Sahasına Pasla Gir'}},shoot:{tactic:{finalAction:'Kaleyi Görünce Vur'}},cross:{tactic:{attackDirection:'Kanatları Kullan',finalAction:'Ortaları Artır'}},strong:{quality:85},weak:{quality:65},red:{red:2}};
 for(const [name,opts]of Object.entries(cases)){
  const sum={goals:0,against:0,shots:0,xG:0,opponentXG:0,possession:0,transitions:0,wins:0,draws:0};
  for(let i=0;i<n;i++)for(const side of ['A','B']){
   const r=await lab.match(side==='A'?opts:{},side==='B'?opts:{},9000+i),opp=side==='A'?'B':'A';
   sum.goals+=r.score[side];sum.against+=r.score[opp];sum.wins+=r.score[side]>r.score[opp]?1:0;sum.draws+=r.score[side]===r.score[opp]?1:0;
   for(const key of ['shots','xG','possession'])sum[key]+=r.stats[side][key];sum.opponentXG+=r.stats[opp].xG;sum.transitions+=r.stats[side].transitionAttacks;
   for(const team of ['A','B']){assert(r.score[team]<=r.stats[team].onTarget);assert(r.stats[team].onTarget<=r.stats[team].shots);assert(r.stats[team].passesCompleted<=r.stats[team].passesAttempted);assert(Number.isFinite(r.stats[team].xG));}
  }
  const row={name,matches:n*2,...Object.fromEntries(Object.entries(sum).map(([key,v])=>[key,+(v/(n*2)).toFixed(4)]))};reports.push(row);console.error('completed',name); 
 }
 const find=name=>reports.find(r=>r.name===name),base=find('balanced');
 assert(find('strong').xG>base.xG);assert(find('weak').xG<base.xG);assert(find('red').opponentXG>base.opponentXG);
 assert(find('shoot').shots>base.shots);assert(find('shoot').xG/find('shoot').shots<base.xG/base.shots);
 assert(find('possession').possession>base.possession);assert(find('counter').transitions>find('possession').transitions);
 // Broad regression guards, not a claim of calibration to a real league.
 for(const row of reports.slice(0,6))assert(row.wins<.65,`${row.name}: runaway preset`);
 console.log(JSON.stringify({seedStart:9000,pairedSides:true,syntheticSquads:true,totalMatches:reports.length*n*2,reports},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
