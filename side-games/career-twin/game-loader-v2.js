'use strict';
(async()=>{
  const res=await fetch('./game.js?v=20260831-live-ui-2',{cache:'no-store'});
  if(!res.ok) throw new Error('Career Twin core could not load');
  const src=await res.text();
  if(!src.includes('configureMetrics')||!src.includes('transfermarkt-players.json')){
    throw new Error('Transfermarkt master pool build is missing');
  }
  new Function(src);
  (0,eval)(src+'\n//# sourceURL=career-twin/game-transfermarkt-master-v1.js');
})().catch(err=>{
  console.error(err);
  const app=document.getElementById('app');
  if(app)app.innerHTML='<div class="card center"><div class="error">Oyun kodu yüklenemedi. Sayfayı yenile.</div></div>';
});
