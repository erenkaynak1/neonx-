'use strict';
(async()=>{
  const res=await fetch('./game.js?v=20260824-1',{cache:'no-store'});
  if(!res.ok) throw new Error('Career Twin core could not load');
  let src=await res.text();

  const targetFn=`function chooseTarget(){
    const ranked=[...PLAYERS].sort((a,b)=>(b.recognition_score||0)-(a.recognition_score||0));
    if(!ranked.length)return null;
    const elite=ranked.slice(0,Math.min(90,ranked.length));
    const famous=ranked.slice(0,Math.min(220,ranked.length));
    const broad=ranked.slice(0,Math.min(500,ranked.length));
    const source=Math.random()<.78?elite:(Math.random()<.88?famous:broad);
    const weights=source.map((p,i)=>{
      const recognition=Math.max(1,Number(p.recognition_score)||1);
      const rankBoost=Math.max(.18,1-(i/Math.max(1,source.length))*0.82);
      return Math.pow(recognition,.72)*rankBoost;
    });
    let r=Math.random()*weights.reduce((a,b)=>a+b,0);
    for(let i=0;i<source.length;i++){r-=weights[i];if(r<=0)return source[i]}
    return source[0];
  }`;

  src=src.replace(/function chooseTarget\(\)\{[\s\S]*?\n  \}\n  function startGame/,targetFn+'\n  function startGame');
  src=src.replace("if(!p||id===g.targetId||g.used[role].includes(id))return;","if(!p||id===g.targetId)return;");
  src=src.replace("g.used.host.push(g.picks.host);g.used.guest.push(g.picks.guest);","");
  src=src.replace("const used=new Set(v.used||[]);let list=PLAYERS.filter(p=>p.id!==target.id&&!used.has(p.id)&&normName(p.name).includes(q));","let list=PLAYERS.filter(p=>p.id!==target.id&&normName(p.name).includes(q));");

  if(src.includes('g.used[role].includes(id)')||src.includes('!used.has(p.id)')){
    throw new Error('Career Twin reuse patch did not apply cleanly');
  }
  (0,eval)(src+'\n//# sourceURL=career-twin/game-patched-v2.js');
})().catch(err=>{
  console.error(err);
  const app=document.getElementById('app');
  if(app)app.innerHTML='<div class="card center"><div class="error">Oyun kodu yüklenemedi. Sayfayı yenile.</div></div>';
});
