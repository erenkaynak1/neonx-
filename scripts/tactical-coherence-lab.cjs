'use strict';
// Tactical coherence lab: does a tactic help the squad whose attributes suit it, and hurt the one that does not?
// Uses the production engine through draft-engine-lab (no outcome mocks).
const {makeLab}=require('./draft-engine-lab.cjs');

const profiles={
  // Athletic, hard-working, technically limited.
  runners:{pace:86,stamina:86,pressingDiscipline:86,teamwork:84,aggression:82,tackling:80,strength:80,
    shortPassing:64,longPassing:62,passing:64,vision:62,composure:62,decisionMaking:66,iq:64,dribbling:68},
  // Technical, calm, slow.
  technicians:{pace:62,stamina:66,pressingDiscipline:62,teamwork:72,aggression:60,tackling:66,strength:64,
    shortPassing:86,longPassing:84,passing:86,vision:86,composure:86,decisionMaking:84,iq:84,dribbling:82}
};
const plans={
  press:{general:'Hücum Ağırlıklı',pressingPlan:'Önde Baskı',transitionPlan:'Hızlı Hücum'},
  possession:{transitionPlan:'Topu Güvenceye Al',attackDirection:'Merkezden Oyna',finalAction:'Ceza Sahasına Pasla Gir'}
};

async function run(file,n=Number(process.env.MATCHES||60)){
  const lab=makeLab(file,true),rows={};
  for(const [pName,attrs]of Object.entries(profiles))for(const [tName,tactic]of Object.entries(plans)){
    const s={gd:0,xgd:0,wins:0,games:0};
    for(let i=0;i<n;i++)for(const side of ['A','B']){
      const me={attributes:attrs,tactic},r=await lab.match(side==='A'?me:{},side==='B'?me:{},7000+i),opp=side==='A'?'B':'A';
      s.gd+=r.score[side]-r.score[opp];s.xgd+=r.stats[side].xG-r.stats[opp].xG;s.wins+=r.score[side]>r.score[opp]?1:0;s.games++;
    }
    rows[pName+'/'+tName]={gd:+(s.gd/s.games).toFixed(3),xgd:+(s.xgd/s.games).toFixed(3),win:+(s.wins/s.games).toFixed(3)};
  }
  // Coherence = how much better each squad does with its fitting plan than with the other plan (xG difference).
  const fitGain={
    runners:+(rows['runners/press'].xgd-rows['runners/possession'].xgd).toFixed(3),
    technicians:+(rows['technicians/possession'].xgd-rows['technicians/press'].xgd).toFixed(3)
  };
  return{rows,fitGain};
}
module.exports={run,profiles,plans};
if(require.main===module)run(process.argv[2]).then(r=>console.log(JSON.stringify(r,null,1))).catch(e=>{console.error(e);process.exit(1);});
