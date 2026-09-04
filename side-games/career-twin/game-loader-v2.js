'use strict';
(async()=>{
  const res=await fetch('./game.js?v=20260904-career-twin-firebase-v5',{cache:'no-store'});
  if(!res.ok) throw new Error('Career Twin core could not load');
  let src=await res.text();
  if(!src.includes('configureMetrics')||!src.includes('transfermarkt-players.json')){
    throw new Error('Transfermarkt master pool build is missing');
  }

  // Keep the canonical game source compact while applying the search hot-path
  // optimization before evaluation. Every boundary is asserted so a future
  // source change fails loudly instead of silently applying a stale patch.
  const replaceBlock=(label,start,end,replacement)=>{
    const from=src.indexOf(start),to=from<0?-1:src.indexOf(end,from+start.length);
    if(from<0||to<0) throw new Error('Career Twin performance patch mismatch: '+label);
    src=src.slice(0,from)+replacement+'\n'+src.slice(to);
  };

  replaceBlock(
    'room-create',
    "  async function createRoom(name,forcedCode=''){",
    "  function tryHost(attempt,forcedCode=''){",
    `  async function createRoom(name,forcedCode=''){if(!name){S.error='Önce adını yaz.';render();return}cleanup();S.name=name;S.role='host';S.screen='lobby';S.error='';render();try{await loadPeer();await tryHost(0,forcedCode)}catch(e){console.error('Career Twin room create failed',e);const code=String(e?.code||'').toLowerCase(),detail=String(e?.message||'').trim(),low=detail.toLowerCase();if(code.includes('permission')||low.includes('permission'))S.error='Oda kurulamadı · Firebase erişimi reddetti.';else if(code.includes('network')||low.includes('network'))S.error='Oda kurulamadı · Ağ bağlantısı kurulamadı.';else if(low.includes('room-code-in-use'))S.error='Oda kodu kullanımda · Partiyi yeniden başlat.';else S.error='Oda kurulamadı · '+(detail||code||'Bilinmeyen bağlantı hatası.').slice(0,96);render()}}`
  );

  replaceBlock(
    'picker',
    '  function picker(v,target){',
    '  function renderPass(v){',
    `  function picker(v,target){if(S.localPass)return renderPass(v);if(v.ownPick||S.pending){const waiting=E('div','statusBox pickWaiting',S.pending?'Seçimin kaydediliyor…':'Seçimin kilitlendi. Rakibin seçimi bekleniyor.');waiting.setAttribute('role','status');app.appendChild(waiting);return}const c=E('section','card pickerCard'),h=E('div','searchHead','<b>FUTBOLCU ARA</b><span>SEÇİM KİLİTLENİR</span>'),i=E('input','field');i.placeholder='Oyuncu ismi yaz…';i.autocomplete='off';i.spellcheck=false;i.value=S.search;i.setAttribute('aria-label','Futbolcu ara');const r=E('div','results');r.setAttribute('aria-live','polite');let searchTimer=null;i.oninput=()=>{S.search=i.value;c.classList.toggle('has-query',!!i.value.trim());clearTimeout(searchTimer);searchTimer=setTimeout(()=>{searchTimer=null;fillResults(r,v,target)},45)};c.classList.toggle('has-query',!!i.value.trim());c.append(h,i,r);fillResults(r,v,target);app.appendChild(c)}`
  );

  replaceBlock(
    'fillResults',
    '  function fillResults(box,v,target){',
    '  function reveal(v,target,m){',
    `  function fillResults(box,v,target){const q=normName(S.search.trim());box.innerHTML='';if(!q){box.appendChild(E('div','statusBox','Oyuncu ismi yazdığında eşleşen futbolcular burada görünecek.'));return}const used=new Set(v.used||[]),m=metricFor(v);if(!m)return;const metricIndex=GAME_METRICS.findIndex(x=>x.key===m.key),metricBit=metricIndex<0?0:(1<<metricIndex);if(!metricBit)return;const prefix=[],contains=[];for(let x=0;x<SEARCH_PLAYERS.length;x++){const p=SEARCH_PLAYERS[x];if(p.id===target.id||used.has(p.id)||!(p._ctMetricMask&metricBit))continue;const n=p._ctSearchName;if(!n.includes(q))continue;if(n.startsWith(q)){if(prefix.length<14)prefix.push(p);if(prefix.length===14)break}else if(contains.length<14)contains.push(p)}const list=prefix.concat(contains).slice(0,14);if(!list.length){box.appendChild(E('div','statusBox','Bu parametre için verisi olan eşleşen oyuncu bulunamadı.'));return}const frag=document.createDocumentFragment();list.forEach(p=>{const b=E('button','playerBtn');b.type='button';b.innerHTML='<b>'+esc(p.name)+'</b><span class="chooseCopy">SEÇ</span>';b.setAttribute('aria-label',p.name+' oyuncusunu seç');b.onclick=()=>submit(p.id);frag.appendChild(b)});box.appendChild(frag)}`
  );

  replaceBlock(
    'init',
    '  async function init(){',
    "  window.addEventListener('beforeunload',cleanup);",
    `  async function init(){injectCss();render();try{const response=await fetch('../data/master/transfermarkt-players.json',{cache:'no-store'});if(!response.ok)throw new Error('data');const master=await response.json(),all=new Map();master.forEach(p=>{if(p&&p.id&&p.name)all.set(Number(p.id),p)});PLAYERS=[...all.values()];BY_ID=all;const configured=configureMetrics(PLAYERS);GAME_METRICS=configured.metrics;TARGET_PLAYERS=configured.targets;SEARCH_PLAYERS=PLAYERS.map(p=>{p._ctSearchName=normName(p.name);p._ctRecognition=Number(p.recognition_score)||0;p._ctMetricMask=GAME_METRICS.reduce((mask,m,idx)=>hasMetric(p,m.key)?mask|(1<<idx):mask,0);return p}).sort((a,b)=>b._ctRecognition-a._ctRecognition);if(GAME_METRICS.length<5||TARGET_PLAYERS.length<20||SEARCH_PLAYERS.length<100)throw new Error('empty');S.screen='menu';render();const q=new URLSearchParams(location.search);if(q.get('nxAuto')==='1'){const name=String(q.get('nxName')||'NEON Oyuncu').slice(0,24),code=String(q.get('nxCode')||'');if(q.get('nxRole')==='host')await createRoom(name,code);else{S.screen='lobby';S.name=name;S.code=code;render();await new Promise(r=>setTimeout(r,350));await joinRoom(code,name)}}}catch(e){console.error(e);app.innerHTML='';top();brand('Oyuncu verileri yüklenemedi');app.appendChild(E('div','card center','<div class="error">Transfermarkt master havuzu açılamadı. Biraz sonra tekrar dene.</div>'))}}`
  );

  new Function(src);
  (0,eval)(src+'\n//# sourceURL=career-twin/game-transfermarkt-master-search-perf-v1.js');
})().catch(err=>{
  console.error(err);
  const app=document.getElementById('app');
  if(app)app.innerHTML='<div class="card center"><div class="error">Oyun kodu yüklenemedi. Sayfayı yenile.</div></div>';
});
