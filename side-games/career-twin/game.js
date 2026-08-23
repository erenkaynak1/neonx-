'use strict';
(() => {
  const PREFIX='neonxi-career-twin-';
  const METRICS=[
    ['height_cm','BOY'],
    ['weight_kg','KİLO'],
    ['birth_date','DOĞUM TARİHİ'],
    ['club_count','KULÜP SAYISI'],
    ['trophies','KUPA SAYISI'],
    ['career_goals','TOPLAM GOL SAYISI'],
    ['career_assists','TOPLAM ASİST SAYISI'],
    ['peak_market_value_eur','EN YÜKSEK PİYASA DEĞERİ'],
    ['career_appearances','TOPLAM MAÇ SAYISI']
  ].map(([key,label])=>({key,label}));

  const app=document.getElementById('app');
  let PLAYERS=[],BY_ID=new Map(),peer=null,hostConn=null,guestConn=null,hostGame=null,remote=null;
  const S={screen:'boot',role:null,name:'',code:'',error:'',pending:false,search:''};

  const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const E=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!==undefined)e.innerHTML=html;return e};
  const btn=(txt,primary,fn)=>{const b=E('button','btn'+(primary?' primary':''),esc(txt));b.type='button';b.onclick=fn;return b};

  function top(){
    const t=E('div','topbar');
    const a=E('a','back','← YAN OYUNLAR');
    a.href='../index.html';
    t.append(a,E('div','pool',''));
    app.appendChild(t);
  }
  function brand(sub){
    const b=E('div','brand');
    b.innerHTML='<div class="eyebrow">NEON XI · SIDE GAME</div><h1>KARİYER <span>İKİZİ</span></h1><div class="subtitle">'+esc(sub||'Hedef futbolcuya en yakın kariyeri seç')+'</div>';
    app.appendChild(b);
  }
  function field(label,placeholder,value,max){
    const w=E('div'); w.appendChild(E('div','label',esc(label)));
    const i=E('input','field'); i.placeholder=placeholder;i.value=value||'';if(max)i.maxLength=max;
    w.appendChild(i); return [w,i];
  }
  function render(){
    app.innerHTML='';top();
    if(S.screen==='boot')return renderBoot();
    if(S.screen==='menu')return renderMenu();
    if(S.screen==='create')return renderCreate();
    if(S.screen==='join')return renderJoin();
    if(S.screen==='lobby')return renderLobby();
    if(S.screen==='game')return renderGame();
  }
  function renderBoot(){brand('Oyuncu verileri yükleniyor…');app.appendChild(E('div','card center','<div class="spinner"></div><div class="hint">Doğrulanmış kariyer verileri hazırlanıyor.</div>'))}
  function renderMenu(){
    brand();
    const c=E('div','card');
    c.append(E('div','label','2 OYUNCULU ONLINE OYUN'),btn('ODA KUR',true,()=>{S.screen='create';S.error='';render()}),btn('KODLA KATIL',false,()=>{S.screen='join';S.error='';render()}));
    app.appendChild(c);
    app.appendChild(E('div','card','<div class="label">NASIL OYNANIR?</div><div class="hint">Aynı hedef futbolcu 9 tur boyunca ortada kalır. Her tur bir kariyer parametresi açılır. Futbolcunu seçtiğin anda seçimin kilitlenir; rakibin de seçene kadar ismin ona gösterilmez. Hedef değere daha yakın seçim puanı alır.</div>'));
  }
  function renderCreate(){
    brand('4 haneli oda oluştur');const c=E('div','card');const [w,n]=field('ADIN','Adın',S.name,24);
    c.append(w,btn('ODAYI KUR',true,()=>createRoom(n.value.trim())),E('div','error',esc(S.error)));app.appendChild(c);
  }
  function renderJoin(){
    brand('Arkadaşının oda kodunu gir');const c=E('div','card');const [cw,ci]=field('ODA KODU','1234',S.code,4);const [nw,ni]=field('ADIN','Adın',S.name,24);
    ci.inputMode='numeric';ci.oninput=()=>{ci.value=ci.value.replace(/\D/g,'').slice(0,4);S.code=ci.value};
    c.append(cw,nw,btn('KATIL',true,()=>joinRoom(ci.value.trim(),ni.value.trim())),E('div','error',esc(S.error)));app.appendChild(c);
  }
  function renderLobby(){
    brand(S.role==='host'?'Oda hazır · ikinci oyuncu bekleniyor':'Odaya bağlanılıyor…');
    const c=E('div','card center');c.append(E('div','label','ODA KODU'),E('div','code',esc(S.code)),E('div','spinner'),E('div','hint',S.role==='host'?'Bu kodu arkadaşınla paylaş. İkinci oyuncu girince oyun otomatik başlar.':'Oda sahibine bağlanılıyor…'));app.appendChild(c);
    if(S.error)app.appendChild(E('div','error',esc(S.error)));
  }

  async function loadPeer(){
    if(window.Peer)return;
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('PeerJS'));document.head.appendChild(s)});
  }
  function cleanup(){try{hostConn&&hostConn.close()}catch{}try{guestConn&&guestConn.close()}catch{}try{peer&&peer.destroy()}catch{}peer=hostConn=guestConn=null;hostGame=remote=null;S.pending=false}
  const roomCode=()=>String(Math.floor(1000+Math.random()*9000));
  async function createRoom(name){
    if(!name){S.error='Önce adını yaz.';render();return}cleanup();S.name=name;S.role='host';S.screen='lobby';S.error='';render();
    try{await loadPeer();await tryHost(0)}catch{S.error='Oda kurulamadı. Tekrar dene.';render()}
  }
  function tryHost(attempt){
    return new Promise((resolve,reject)=>{
      if(attempt>=8)return reject(new Error('room'));
      const code=roomCode();S.code=code;const p=new Peer(PREFIX+code,{debug:0});peer=p;let opened=false;
      p.on('open',()=>{opened=true;p.on('connection',c=>{if(hostConn&&hostConn.open){c.on('open',()=>c.send({type:'reject',message:'Oda dolu.'}));return}hostConn=c;bindHostConnection(c)});render();resolve()});
      p.on('error',e=>{if(!opened&&(e.type==='unavailable-id'||e.type==='invalid-id')){try{p.destroy()}catch{}tryHost(attempt+1).then(resolve,reject)}else if(!opened)reject(e)});
    });
  }
  function bindHostConnection(c){
    let joined=false;
    c.on('data',m=>{
      if(!m||typeof m!=='object')return;
      if(m.type==='join'&&!joined){const name=String(m.name||'').trim().slice(0,24);if(!name){c.send({type:'reject',message:'Geçersiz isim.'});return}joined=true;c.send({type:'accepted'});startGame(name);return}
      if(!joined||!hostGame)return;
      if(m.type==='select')hostSelect('guest',Number(m.playerId),Number(m.round));
      if(m.type==='next')advanceRound(Number(m.round));
      if(m.type==='rematch'&&hostGame.phase==='final')startGame(hostGame.players.guest);
    });
    c.on('close',()=>{if(joined){S.screen='lobby';S.error='Diğer oyuncunun bağlantısı koptu.';hostGame=null;render()}});
  }
  async function joinRoom(code,name){
    if(!/^\d{4}$/.test(code)){S.error='4 haneli oda kodu gir.';render();return}if(!name){S.error='Önce adını yaz.';render();return}
    cleanup();S.code=code;S.name=name;S.role='guest';S.screen='lobby';S.error='';render();
    try{
      await loadPeer();peer=new Peer(undefined,{debug:0});
      peer.on('open',()=>{guestConn=peer.connect(PREFIX+code,{reliable:true});bindGuestConnection(guestConn,name)});
      peer.on('error',()=>{if(S.screen==='lobby'){S.error='Bağlantı kurulamadı.';render()}});
      setTimeout(()=>{if(S.screen==='lobby'&&!remote){S.error='Oda bulunamadı veya bağlantı kurulamadı.';render()}},8000);
    }catch{S.error='Bağlantı servisi yüklenemedi.';render()}
  }
  function bindGuestConnection(c,name){
    c.on('open',()=>c.send({type:'join',name}));
    c.on('data',m=>{if(!m||typeof m!=='object')return;if(m.type==='reject'){S.error=m.message||'Odaya katılamadın.';render();return}if(m.type==='state'){remote=m;S.screen='game';S.pending=false;render()}});
    c.on('close',()=>{S.screen='lobby';S.error='Oda sahibi bağlantıyı kapattı.';remote=null;render()});
  }

  function chooseTarget(){
    const active=PLAYERS.filter(p=>p.status==='active');
    const source=(active.length>120&&Math.random()<.85?active:PLAYERS).slice().sort((a,b)=>(b.recognition_score||0)-(a.recognition_score||0));
    const cap=source.slice(0,Math.min(600,source.length));
    const weights=cap.map((p,i)=>Math.max(1,Math.sqrt(Math.max(1,p.recognition_score||1))*(1-i/(cap.length*1.4))));
    let r=Math.random()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<cap.length;i++){r-=weights[i];if(r<=0)return cap[i]}return cap[0];
  }
  function startGame(guestName){
    const target=chooseTarget();if(!target)return;
    hostGame={players:{host:S.name,guest:guestName},phase:'pick',round:0,targetId:target.id,scores:{host:0,guest:0},picks:{host:null,guest:null},used:{host:[],guest:[]},roundResult:null,revision:1};
    S.screen='game';S.search='';S.pending=false;broadcast();render();
  }
  function publicState(role){
    const g=hostGame,opp=role==='host'?'guest':'host',reveal=g.phase==='reveal'||g.phase==='final';
    return {type:'state',role,players:g.players,phase:g.phase,round:g.round,targetId:g.targetId,scores:g.scores,ownPick:g.picks[role],oppPicked:!!g.picks[opp],picks:reveal?g.picks:null,used:g.used[role],roundResult:reveal?g.roundResult:null,revision:g.revision};
  }
  function broadcast(){if(hostGame&&hostConn&&hostConn.open)hostConn.send(publicState('guest'))}
  function view(){return S.role==='host'&&hostGame?publicState('host'):remote}
  function numeric(p,key){if(!p)return NaN;if(key==='birth_date'){const d=Date.parse(p[key]);return Number.isFinite(d)?d/86400000:NaN}return Number(p[key])}
  function format(v,key){
    if(key==='birth_date'){const d=new Date(v);if(Number.isNaN(d.getTime()))return '—';return String(d.getUTCDate()).padStart(2,'0')+'.'+String(d.getUTCMonth()+1).padStart(2,'0')+'.'+d.getUTCFullYear()}
    if(key==='height_cm')return v+' cm';if(key==='weight_kg')return v+' kg';if(key==='club_count')return v+' kulüp';if(key==='trophies')return v+' kupa';
    if(key==='career_goals')return v+' gol';if(key==='career_assists')return v+' asist';if(key==='career_appearances')return v+' maç';
    if(key==='peak_market_value_eur'){if(v>=1e6)return '€'+(v/1e6).toLocaleString('tr-TR',{maximumFractionDigits:1})+' M';if(v>=1e3)return '€'+(v/1e3).toLocaleString('tr-TR',{maximumFractionDigits:0})+' B';return '€'+Number(v).toLocaleString('tr-TR')}
    return String(v);
  }
  function diffText(d,key){if(key==='birth_date')return (d/365.2425).toLocaleString('tr-TR',{maximumFractionDigits:1})+' yıl fark';return format(d,key)+' fark'}
  function hostSelect(role,id,round){
    const g=hostGame;if(!g||g.phase!=='pick'||round!==g.round||g.picks[role])return;const p=BY_ID.get(id);if(!p||id===g.targetId||g.used[role].includes(id))return;
    g.picks[role]=id;g.revision++;if(g.picks.host&&g.picks.guest)resolveRound();broadcast();render();
  }
  function resolveRound(){
    const g=hostGame,m=METRICS[g.round],t=BY_ID.get(g.targetId),a=BY_ID.get(g.picks.host),b=BY_ID.get(g.picks.guest);
    const tv=numeric(t,m.key),av=numeric(a,m.key),bv=numeric(b,m.key),da=Math.abs(av-tv),db=Math.abs(bv-tv);
    let winner='draw';if(da<db)winner='host';else if(db<da)winner='guest';if(winner!=='draw')g.scores[winner]++;
    g.used.host.push(g.picks.host);g.used.guest.push(g.picks.guest);g.roundResult={winner,targetValue:t[m.key],hostValue:a[m.key],guestValue:b[m.key],hostDiff:da,guestDiff:db};g.phase='reveal';g.revision++;
  }
  function advanceRound(round){
    const g=hostGame;if(!g||g.phase!=='reveal'||g.round!==round)return;
    if(g.round>=METRICS.length-1){g.phase='final';g.revision++}else{g.round++;g.phase='pick';g.picks={host:null,guest:null};g.roundResult=null;g.revision++;S.search=''}
    broadcast();render();
  }
  function submit(id){
    const v=view();if(!v||v.phase!=='pick'||v.ownPick||S.pending)return;
    if(S.role==='host')hostSelect('host',id,v.round);else if(guestConn&&guestConn.open){S.pending=true;guestConn.send({type:'select',playerId:id,round:v.round});render()}
  }
  function requestNext(v){if(S.role==='host')advanceRound(v.round);else if(guestConn&&guestConn.open)guestConn.send({type:'next',round:v.round})}

  function progress(v){const p=E('div','progress');for(let i=0;i<9;i++)p.appendChild(E('div','pip'+(i<v.round?' done':i===v.round?' now':'')));app.appendChild(p)}
  function picked(v,role){if(v.phase==='reveal'||v.phase==='final')return v.picks&&BY_ID.get(v.picks[role]);if(role===v.role&&v.ownPick)return BY_ID.get(v.ownPick);return null}
  function arena(v,target,m){
    const a=E('div','arena');
    ['host','target','guest'].forEach(role=>{
      const targetSlot=role==='target',s=E('div','slot'+(targetSlot?' target':'')),label=targetSlot?'HEDEF':v.players[role];s.appendChild(E('div','who',esc(label)));
      if(targetSlot){s.appendChild(E('div','name',esc(target.name)));if(v.phase==='reveal')s.appendChild(E('div','val',esc(format(target[m.key],m.key))))}
      else{
        const p=picked(v,role);
        if(p){s.appendChild(E('div','name',esc(p.name)));if(v.phase==='reveal'){const r=v.roundResult,val=role==='host'?r.hostValue:r.guestValue,d=role==='host'?r.hostDiff:r.guestDiff;s.appendChild(E('div','val',esc(format(val,m.key))));s.appendChild(E('div','hint',esc(diffText(d,m.key))));if(r.winner===role)s.classList.add('win');if(r.winner==='draw')s.classList.add('draw')}else s.appendChild(E('div','lock','SEÇİM KİLİTLENDİ'))}
        else{const own=role===v.role,done=own?!!v.ownPick:!!v.oppPicked;s.appendChild(E('div','name',done?'••••••':'BEKLİYOR'));if(done&&!own)s.appendChild(E('div','lock','RAKİP SEÇTİ'))}
      }
      a.appendChild(s);
    });
    app.appendChild(a);
  }
  function norm(s){return String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
  function picker(v,target){
    if(v.ownPick||S.pending){app.appendChild(E('div','statusBox',S.pending?'Seçimin kaydediliyor…':'Seçimin kilitlendi.<br>Rakibin seçimi bekleniyor.'));return}
    const c=E('div','card');const h=E('div','searchHead','<b>FUTBOLCU ARA</b><span>seçim anında kilitlenir</span>');const i=E('input','field');i.placeholder='Oyuncu ismi yaz…';i.autocomplete='off';i.value=S.search;const r=E('div','results');
    i.oninput=()=>{S.search=i.value;fillResults(r,v,target)};c.append(h,i,r);fillResults(r,v,target);app.appendChild(c);
  }
  function fillResults(box,v,target){
    box.innerHTML='';const q=norm(S.search.trim());
    if(!q){box.appendChild(E('div','statusBox','Oyuncu ismi yazdığında eşleşen futbolcular burada görünecek.'));return}
    const used=new Set(v.used||[]);let list=PLAYERS.filter(p=>p.id!==target.id&&!used.has(p.id)&&norm(p.name).includes(q));
    list.sort((a,b)=>{const an=norm(a.name),bn=norm(b.name),ae=an.startsWith(q)?1:0,be=bn.startsWith(q)?1:0;return be-ae||(b.recognition_score||0)-(a.recognition_score||0)});list=list.slice(0,14);
    if(!list.length){box.appendChild(E('div','statusBox','Eşleşen oyuncu bulunamadı.'));return}
    list.forEach(p=>{const b=E('button','playerBtn');b.type='button';b.innerHTML='<b>'+esc(p.name)+'</b><span class="arrow">›</span>';b.onclick=()=>submit(p.id);box.appendChild(b)});
  }
  function reveal(v,target,m){
    const r=v.roundResult;if(!r)return;
    const panel=E('div','card center');panel.appendChild(E('div','revealTitle','TUR SONUCU'));
    const text=r.winner==='draw'?'BERABERE':(r.winner==='host'?v.players.host:v.players.guest)+' BU TURU KAZANDI';
    panel.appendChild(E('div','winnerText'+(r.winner==='draw'?' draw':''),esc(text)));
    const line=E('div','hint');line.innerHTML='<b>'+esc(v.players.host)+'</b>: '+esc(format(r.hostValue,m.key))+' · '+esc(diffText(r.hostDiff,m.key))+'<br><b>HEDEF</b>: '+esc(format(r.targetValue,m.key))+'<br><b>'+esc(v.players.guest)+'</b>: '+esc(format(r.guestValue,m.key))+' · '+esc(diffText(r.guestDiff,m.key));panel.appendChild(line);
    panel.appendChild(btn(v.round===8?'SONUCU GÖR':'SONRAKİ PARAMETRE',true,()=>requestNext(v)));
    app.appendChild(panel);
  }
  function renderGame(){
    const v=view();if(!v){brand('Oyun durumu bekleniyor…');app.appendChild(E('div','card center','<div class="spinner"></div>'));return}
    if(v.phase==='final')return final(v);
    brand('Hedef futbolcuya en yakın kariyeri seç');
    const m=METRICS[v.round],target=BY_ID.get(v.targetId);if(!target){app.appendChild(E('div','error','Hedef oyuncu verisi bulunamadı.'));return}
    const s=E('div','scorebar');s.innerHTML='<div class="score"><div class="n">'+esc(v.players.host)+'</div><div class="p">'+v.scores.host+'</div></div><div class="roundBadge">'+(v.round+1)+' / 9</div><div class="score right"><div class="n">'+esc(v.players.guest)+'</div><div class="p">'+v.scores.guest+'</div></div>';app.appendChild(s);
    const mt=E('div','metricTitle','<span>PARAMETRE</span><b>'+esc(m.label)+'</b>');app.appendChild(mt);progress(v);arena(v,target,m);if(v.phase==='pick')picker(v,target);else reveal(v,target,m);
  }
  function final(v){
    brand('9 parametre tamamlandı');const c=E('div','card center');const hs=v.scores.host,gs=v.scores.guest,title=hs===gs?'OYUN BERABERE':hs>gs?v.players.host+' KAZANDI':v.players.guest+' KAZANDI';
    c.append(E('div','label','FİNAL'),E('div','finalTitle',esc(title.toUpperCase())),E('div','finalScore',hs+' — '+gs));const t=BY_ID.get(v.targetId);if(t)c.appendChild(E('div','hint','Hedef futbolcu: <b>'+esc(t.name)+'</b>'));app.appendChild(c);
    if(S.role==='host')app.appendChild(btn('AYNI ODAYLA YENİ OYUN',true,()=>startGame(hostGame.players.guest)));else app.appendChild(E('div','statusBox','Oda sahibi yeni oyun başlatabilir.'));
    app.appendChild(btn('YAN OYUNLARA DÖN',false,()=>{cleanup();location.href='../index.html'}));
  }

  async function init(){
    render();
    try{
      const res=await fetch('./data/players.json',{cache:'no-store'});if(!res.ok)throw new Error('data');const raw=await res.json();
      PLAYERS=raw.filter(p=>p&&METRICS.every(m=>p[m.key]!==null&&p[m.key]!==undefined&&p[m.key]!==''));BY_ID=new Map(PLAYERS.map(p=>[Number(p.id),p]));
      if(PLAYERS.length<2)throw new Error('empty');S.screen='menu';render();
    }catch(e){app.innerHTML='';top();brand('Oyuncu verileri yüklenemedi');app.appendChild(E('div','card center','<div class="error">Veri dosyası açılamadı. Biraz sonra tekrar dene.</div>'))}
  }
  window.addEventListener('beforeunload',cleanup);init();
})();