'use strict';
(async()=>{
  const res=await fetch('./game.js?v=20260825-1',{cache:'no-store'});
  if(!res.ok) throw new Error('Career Twin core could not load');
  const src=await res.text();
  if(!src.includes('SEARCH_PLAYERS')||!src.includes("fetch('./data/candidates.json'")){
    throw new Error('Expanded Career Twin pool build is missing');
  }
  new Function(src);
  (0,eval)(src+'\n//# sourceURL=career-twin/game-expanded-pool-v4.js');
})().catch(err=>{
  console.error(err);
  const app=document.getElementById('app');
  if(app)app.innerHTML='<div class="card center"><div class="error">Oyun kodu yüklenemedi. Sayfayı yenile.</div></div>';
});
