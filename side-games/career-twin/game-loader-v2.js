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

  const initFn=`async function init(){
    injectCss();render();
    try{
      const [verifiedRes,candidateRes]=await Promise.all([
        fetch('./data/players.json',{cache:'no-store'}),
        fetch('./data/candidates.json',{cache:'no-store'})
      ]);
      if(!verifiedRes.ok)throw new Error('verified-data');
      const verifiedRaw=await verifiedRes.json();
      const candidateRaw=candidateRes.ok?await candidateRes.json():[];
      const complete=p=>p&&METRICS.every(m=>p[m.key]!==null&&p[m.key]!==undefined&&p[m.key]!=='');
      const sane=p=>{
        if(!complete(p))return false;
        const h=Number(p.height_cm),w=Number(p.weight_kg),clubs=Number(p.club_count),t=Number(p.trophies),g=Number(p.career_goals),a=Number(p.career_assists),apps=Number(p.career_appearances),mv=Number(p.peak_market_value_eur),dob=Date.parse(p.birth_date);
        if(![h,w,clubs,t,g,a,apps,mv,dob].every(Number.isFinite))return false;
        if(h<155||h>210||w<48||w>125||clubs<1||clubs>25||t<0||t>70||apps<1||apps>1400||g<0||g>1100||a<0||a>700||mv<1000||mv>300000000)return false;
        if(g>apps*1.5||a>apps*1.5)return false;
        const reasons=Array.isArray(p.validation_reasons)?p.validation_reasons:[];
        if(reasons.some(r=>String(r).startsWith('missing:')||String(r).includes('_range')||['non_numeric','birth_date','duplicate_name'].includes(String(r))))return false;
        return true;
      };
      const merged=new Map();
      candidateRaw.filter(sane).forEach(p=>merged.set(Number(p.id),p));
      verifiedRaw.filter(p=>complete(p)&&sane(p)).forEach(p=>merged.set(Number(p.id),p));
      PLAYERS=[...merged.values()].sort((a,b)=>(b.recognition_score||0)-(a.recognition_score||0));
      BY_ID=new Map(PLAYERS.map(p=>[Number(p.id),p]));
      window.__CAREER_TWIN_POOL_INFO__={verified:verifiedRaw.length,candidateFallback:Math.max(0,PLAYERS.length-verifiedRaw.length),total:PLAYERS.length};
      if(PLAYERS.length<2)throw new Error('empty');
      S.screen='menu';render();
    }catch(err){
      console.error(err);app.innerHTML='';top();brand('Oyuncu verileri yüklenemedi');app.appendChild(E('div','card center','<div class="error">Veri dosyası açılamadı. Sayfayı yenile.</div>'));
    }
  }`;

  src=src.replace(/function chooseTarget\(\)\{[\s\S]*?\n  \}\n  function startGame/,targetFn+'\n  function startGame');
  src=src.replace("if(!p||id===g.targetId||g.used[role].includes(id))return;","if(!p||id===g.targetId)return;");
  src=src.replace("g.used.host.push(g.picks.host);g.used.guest.push(g.picks.guest);","");
  src=src.replace("const used=new Set(v.used||[]);let list=PLAYERS.filter(p=>p.id!==target.id&&!used.has(p.id)&&normName(p.name).includes(q));","let list=PLAYERS.filter(p=>p.id!==target.id&&normName(p.name).includes(q));");
  src=src.replace(/async function init\(\)\{[\s\S]*?\n  window\.addEventListener\('beforeunload',cleanup\);init\(\);/,initFn+"\n  window.addEventListener('beforeunload',cleanup);init();");

  if(src.includes('g.used[role].includes(id)')||src.includes('!used.has(p.id)')||!src.includes('__CAREER_TWIN_POOL_INFO__')){
    throw new Error('Career Twin pool patch did not apply cleanly');
  }
  (0,eval)(src+'\n//# sourceURL=career-twin/game-patched-v3.js');
})().catch(err=>{
  console.error(err);
  const app=document.getElementById('app');
  if(app)app.innerHTML='<div class="card center"><div class="error">Oyun kodu yüklenemedi. Sayfayı yenile.</div></div>';
});
