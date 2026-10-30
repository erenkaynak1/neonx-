'use strict';
// Runs the production possession, shot, discipline and rating functions. No outcome mocks.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const neutral={general:'Dengeli',attackDirection:'Dengeli',finalAction:'Dengeli',transitionPlan:'Dengeli',pressingPlan:'Orta Blok',defenseDirection:'Dengeli',defenseTactic:'Dengeli Savunma',tasks:{}};
function seeded(seed){let x=seed>>>0;return()=>{x+=0x6D2B79F5;let t=Math.imul(x^x>>>15,1|x);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
function makeLab(file=path.join(root,'neon-xi-core.html'),native=false){
 const core=fs.readFileSync(file,'utf8'),source=core.slice(core.indexOf('  const game = {',core.indexOf('const speedButtons = []')),core.indexOf('  startButton.onclick=async()=>'));
 const c={window:{NEON_TACTICAL_LOAD:require('../tactical-load.js')},style:{textContent:''},$:()=>null,analysisOverlay:{addEventListener(){}},document:{addEventListener(){}},console,setTimeout,clearTimeout,
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),state:{tactics:{A:{...neutral},B:{...neutral}}},
 details:p=>p.attributes,mainObj:p=>p.attributes,chemMap:()=>({}),teamChem:()=>0,basePlayerPower:p=>p.quality};
 const exportsCode=`{game,simulateAttack,finishMatch,initializeStats,initializeRouteStats,initializeRating,createProfile,teamStructure,stat,v3PhaseScores,v3PhaseProbability,v3FinalAdjustment,v5TransitionChance,chooseAttackingTeam,baseStat,advanceMatchClock:typeof advanceMatchClock==='function'?advanceMatchClock:()=>{game.minute=Math.min(90,game.minute+Math.floor(1+game.random()*3));},v6RecoverPossession:typeof v6RecoverPossession==='function'?v6RecoverPossession:null}`;
 if(native)c.lab=new Function(...Object.keys(c),source+'\nreturn '+exportsCode+';')(...Object.values(c));
 else{vm.createContext(c);vm.runInContext(source+'\nthis.lab='+exportsCode+';',c);}
 const positions=['GK','LB','CB','CB','RB','DM','CM','CM','LW','ST','RW'];
 const roles=['','Dengeli Bek','Sigorta Stoper','Pasör Stoper','Dengeli Bek','Defansçı Orta Saha','Oyun Kurucu','Çift Yönlü','Dengeli Kanat','Bitirici','Dengeli Kanat'];
 const keys=['pace','shortPassing','longPassing','passing','vision','iq','decisionMaking','composure','positioning','defending','aerialDefending','tackling','aggression','pressingDiscipline','teamwork','strength','crossing','dribbling','finishing','shooting','heading','passingGK','reflexes','oneOnOnes','longShots','shotPower','stamina'];
 function setup(a={},b={},seed=1){const g=c.lab.game;Object.assign(g,{minute:0,token:1,running:true,finished:false,testMode:true,score:{A:0,B:0},possession:{A:50,B:50},possessionSeconds:{A:1,B:1},ratings:{A:{},B:{}},shots:[],eventLog:[],visualTimeline:[],visualSeq:0,visualAttackSeq:0,visualContext:null,visualSide:{A:'left',B:'right'},forcedAttack:null,penaltyPlan:{events:[],count:0,contextual:true},random:seeded(seed)});
  for(const [team,opts]of [['A',a],['B',b]]){c.state.tactics[team]={...neutral,...opts.tactic};g.squad[team]=positions.map((pos,i)=>{const quality=opts.quality??75;return{team,position:pos,role:opts.roles?.[i]??roles[i],slot:{id:String(i),pos},footballer:{id:team+i,name:team+' Player '+i,pos,quality,attributes:{...Object.fromEntries(keys.map(k=>[k,quality])),...opts.attributes,...opts.playerAttributes?.[i]}}};});g.stats[team]=c.lab.initializeStats();g.routeStats[team]=c.lab.initializeRouteStats();for(const m of g.squad[team])g.ratings[team][m.footballer.id]=c.lab.initializeRating(m);if(opts.red)g.ratings[team][team+opts.red].red=true;g.profiles[team]=c.lab.createProfile(team);}
  return g;
 }
 async function match(a,b,seed){const g=setup(a,b,seed);while(g.minute<90){c.lab.advanceMatchClock();if(g.minute>=90)break;await c.lab.simulateAttack(g.token);}await c.lab.finishMatch(g.token);return JSON.parse(JSON.stringify({score:g.score,stats:g.stats,routes:g.routeStats,shots:g.shots}));}
 return{c,setup,match};
}
module.exports={makeLab,seeded,neutral};
if(require.main===module)(async()=>{const lab=makeLab(process.argv[2]);const n=Number(process.env.MATCHES||40);const cases={balanced:{},press:{tactic:{general:'Hücum Ağırlıklı',pressingPlan:'Önde Baskı',transitionPlan:'Hızlı Hücum'}},counter:{tactic:{general:'Savunma Ağırlıklı',pressingPlan:'Alçak Blok',transitionPlan:'Hızlı Hücum'}},possession:{tactic:{transitionPlan:'Topu Güvenceye Al',attackDirection:'Merkezden Oyna',finalAction:'Ceza Sahasına Pasla Gir'}},shoot:{tactic:{finalAction:'Kaleyi Görünce Vur'}},cross:{tactic:{attackDirection:'Kanatları Kullan',finalAction:'Ortaları Artır'}},strong:{quality:85},weak:{quality:65},red:{red:2}};for(const[name,opts]of Object.entries(cases)){const sum={goals:0,against:0,shots:0,xG:0,possession:0,transitions:0};for(let i=0;i<n;i++){const r=await lab.match(opts,{},1234+i);sum.goals+=r.score.A;sum.against+=r.score.B;for(const k of ['shots','xG','possession'])sum[k]+=r.stats.A[k];sum.transitions+=r.stats.A.transitionAttacks;}console.log(name,JSON.stringify(Object.fromEntries(Object.entries(sum).map(([k,v])=>[k,+(v/n).toFixed(3)]))));}})().catch(e=>{console.error(e);process.exit(1)});
