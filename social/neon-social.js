import {initializeApp,getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {GoogleAuthProvider,getAuth,linkWithPopup,onAuthStateChanged,signInAnonymously,signInWithPopup,signOut} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,get,onDisconnect,onValue,ref,remove,runTransaction,serverTimestamp,set,update} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const CONFIG={apiKey:'AIzaSyBLpXHGGTHXykKrnu8_Hv1i71oc3tpTNvY',authDomain:'neonxi.firebaseapp.com',databaseURL:'https://neonxi-default-rtdb.europe-west1.firebasedatabase.app',projectId:'neonxi',storageBucket:'neonxi.firebasestorage.app',messagingSenderId:'667191549799',appId:'1:667191549799:web:1e40feacbee09ed7f3d9c2'};
const MODES={draft:{label:'NEON XI Draft',path:'index.html',code:'alpha6',matchable:true},xox:{label:'Futbol XOX',path:'side-games/football-xox/index.html',code:'numeric4',matchable:true},twin:{label:'Career Twin',path:'side-games/career-twin/index.html',code:'numeric4',matchable:true},imposter:{label:'Futbol Imposter',path:'side-games/futbol-imposter.html',code:'alpha5',matchable:false,minParty:3,maxParty:12}};
const base=new URL('../',import.meta.url),app=getApps().length?getApp():initializeApp(CONFIG),auth=getAuth(app),db=getDatabase(app);
const state={user:null,profile:null,friends:{},requests:{},invites:{},party:null,partyId:'',queueOff:null,partyOff:null,userOffs:[],friendOffs:[],presenceOff:null,presenceConnection:null,friendPresence:{},headToHead:{},weekly:{},allTime:{},launchNonce:'',tab:'play'};
let statusEl,shade,button;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9_]/g,'').slice(0,20);
const clean=s=>String(s||'').replace(/[^A-Za-zÇĞİÖŞÜçğıöşü0-9_]/g,'').slice(0,20);
const modeUrl=(mode,params={})=>{const u=new URL(MODES[mode].path,base);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));return u.href};
const codeFor=mode=>MODES[mode].code==='numeric4'?String(Math.floor(1000+Math.random()*9000)):[...Array(MODES[mode].code==='alpha5'?5:6)].map(()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
const emptyStats=()=>({wins:0,losses:0,draws:0,games:0});
const weekKey=(date=new Date())=>{const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()-day+1);return d.toISOString().slice(0,10)};
const statValue=(stats,key)=>Number(stats?.[key]||0);
const winRate=stats=>statValue(stats,'games')?Math.round(statValue(stats,'wins')/statValue(stats,'games')*100):0;
const safeKey=value=>String(value||'match').replace(/[.#$\[\]/]/g,'_').slice(0,180);

function message(text,error=false){if(!statusEl)return;statusEl.textContent=text;statusEl.classList.toggle('error',error)}
const googleProvider=new GoogleAuthProvider();googleProvider.setCustomParameters({prompt:'select_account'});

async function signInGoogle(){
  message('Google hesabı açılıyor…');
  const current=auth.currentUser,guestUid=current?.isAnonymous?current.uid:'';
  try{
    const result=current?.isAnonymous?await linkWithPopup(current,googleProvider):await signInWithPopup(auth,googleProvider);
    state.user=result.user;
    if(guestUid&&result.user.uid===guestUid&&state.profile)await update(ref(db,`social/profiles/${guestUid}`),{accountType:'google',googleEmail:result.user.email||'',displayName:result.user.displayName||'',updatedAt:serverTimestamp()});
    message('Google hesabınla giriş yapıldı.');
  }catch(e){
    if(e?.code==='auth/credential-already-in-use'||e?.code==='auth/email-already-in-use'){
      const result=await signInWithPopup(auth,googleProvider);state.user=result.user;message('Bu Google hesabındaki mevcut oyuncu profili açıldı.');return;
    }
    const detail=e?.code==='auth/popup-closed-by-user'?'Google giriş penceresi kapatıldı.':e?.code==='auth/unauthorized-domain'?'Bu alan adı Firebase Google girişinde yetkilendirilmemiş.':e?.code==='auth/operation-not-allowed'?'Firebase panelinde Google giriş sağlayıcısı etkinleştirilmemiş.':(e?.message||'Google ile giriş yapılamadı.');
    message(detail,true);throw e;
  }
}
async function continueAsGuest(){message('Misafir hesabı hazırlanıyor…');try{const result=auth.currentUser?{user:auth.currentUser}:await signInAnonymously(auth);state.user=result.user;message('Misafir olarak devam ediyorsun. Şimdi oyun içi adını seç.')}catch(e){const detail=e?.code==='auth/operation-not-allowed'?'Firebase panelinde Anonim giriş sağlayıcısı etkinleştirilmemiş.':(e?.message||'Misafir hesabı oluşturulamadı.');message(detail,true);throw e}}
async function signOutGoogle(){await stopPresence();await signOut(auth);message('Hesaptan çıkış yapıldı.')}

function shell(){
  document.head.insertAdjacentHTML('beforeend',`<link rel="stylesheet" href="${new URL('neon-social.css?v=20260903-social-leaderboard-v1',import.meta.url).href}">`);
  button=document.createElement('button');button.className='nx-social-launch';button.type='button';button.textContent='SOSYAL';button.dataset.count='0';button.onclick=()=>open('play');document.body.appendChild(button);
  shade=document.createElement('div');shade.className='nx-social-shade';shade.innerHTML=`<section class="nx-social-panel" role="dialog" aria-modal="true" aria-label="NEON XI Sosyal"><div class="nx-social-head"><strong>NEON XI SOSYAL</strong><button class="nx-social-close" type="button" aria-label="Kapat">×</button></div><div class="nx-social-tabs"><button data-tab="play">OYNA</button><button data-tab="friends">ARKADAŞLAR</button><button data-tab="party">PARTİ</button><button data-tab="leaderboard">LİDERLİK</button></div><div class="nx-social-view" data-view="play"></div><div class="nx-social-view" data-view="friends"></div><div class="nx-social-view" data-view="party"></div><div class="nx-social-view" data-view="leaderboard"></div><div class="nx-social-status" role="status"></div></section>`;
  document.body.appendChild(shade);statusEl=shade.querySelector('.nx-social-status');shade.querySelector('.nx-social-close').onclick=close;
  shade.addEventListener('click',e=>{if(e.target===shade)close();const tab=e.target.closest('[data-tab]');if(tab)render(tab.dataset.tab)});
}
function open(tab='play'){shade.classList.add('open');render(tab)}
function close(){if(state.user&&!state.profile){message('Devam etmek için benzersiz oyuncu adını seç.',true);render('friends');return}shade.classList.remove('open')}
function requireProfile(){if(!state.user){message('Önce Google hesabınla giriş yap veya misafir olarak devam et.',true);render('friends');return false}if(state.profile)return true;message('Önce benzersiz oyuncu adını oluştur.',true);render('friends');return false}
function signedOutMarkup(){return `<div class="nx-social-card"><span class="nx-social-label">NEON XI ÜYELİĞİ</span><b>Nasıl devam etmek istersin?</b><p class="nx-social-muted">Google hesabı verilerini kalıcı tutar. Misafir hesabı yalnızca bu tarayıcıda korunur.</p><div class="nx-social-choice"><button class="nx-social-btn primary" data-act="google-login">GOOGLE İLE GİRİŞ YAP</button><button class="nx-social-btn" data-act="guest-login">MİSAFİR OLARAK DEVAM ET</button></div></div>`}
function render(tab=state.tab){
  state.tab=tab;shade.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));shade.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===tab));
  if(!state.user){shade.querySelectorAll('[data-view]').forEach(v=>{v.innerHTML=signedOutMarkup();v.querySelector('[data-act="google-login"]').onclick=()=>signInGoogle().catch(()=>{});v.querySelector('[data-act="guest-login"]').onclick=()=>continueAsGuest().catch(()=>{})});return}
  renderPlay();renderFriends();renderParty();renderLeaderboard();
}
function renderPlay(){
  const v=shade.querySelector('[data-view="play"]');
  v.innerHTML=`<div class="nx-social-choice"><button class="nx-social-btn primary" data-act="party-play">ARKADAŞLARLA OYNA</button><button class="nx-social-btn" data-act="match">RAKİP ARA</button></div><div class="nx-social-card"><label class="nx-social-label">OYUN MODU</label><select class="nx-social-select" id="nxMode">${Object.entries(MODES).map(([k,m])=>`<option value="${k}">${m.label}</option>`).join('')}</select></div><div class="nx-social-card"><span class="nx-social-label">ODA KODU · YEDEK YÖNTEM</span><div class="nx-social-muted">Her oyunun mevcut “oda oluştur / kodla katıl” ekranı korunuyor.</div><button class="nx-social-btn" data-act="room-code">ODA KODU EKRANINA GİT</button></div>`;
  v.querySelector('[data-act="party-play"]').onclick=()=>{if(!requireProfile())return;render('party')};v.querySelector('[data-act="match"]').onclick=()=>startMatch(v.querySelector('#nxMode').value);v.querySelector('[data-act="room-code"]').onclick=()=>{const mode=v.querySelector('#nxMode').value;close();location.href=modeUrl(mode,{nxRoomCode:'1'})};
}
function renderFriends(){
  const v=shade.querySelector('[data-view="friends"]'),guest=state.user.isAnonymous,accountLabel=guest?'MİSAFİR HESABI':'GOOGLE HESABI',accountText=guest?'Yalnızca bu tarayıcıda korunur':(state.user.email||state.user.displayName||'Bağlı'),connect=guest?'<button class="nx-social-btn primary" data-act="connect-google">GOOGLE’A BAĞLA</button>':'';
  if(!state.profile){
    const suggested=clean(state.user.displayName||'').replace(/\s/g,'');
    v.innerHTML=`<div class="nx-social-card"><span class="nx-social-label">${accountLabel}</span><b>${esc(accountText)}</b>${guest?'<p class="nx-social-muted">Tarayıcı verileri silinirse bu hesaba tekrar ulaşılamaz.</p>':''}${connect}</div><div class="nx-social-card nx-username-gate"><label class="nx-social-label">OYUN İÇİ KULLANICI ADINI SEÇ</label><div class="nx-social-row"><input class="nx-social-input" id="nxUsername" maxlength="20" value="${esc(suggested)}" placeholder="oyuncu_adi"><button class="nx-social-btn primary" data-act="claim">OLUŞTUR</button></div><div class="nx-social-muted">3–20 karakter; harf, rakam ve alt çizgi. Bu ad arkadaş aramasında ve liderlikte görünecek.</div></div><button class="nx-social-btn nx-social-danger" data-act="logout">ÇIKIŞ YAP</button>`;
    v.querySelector('[data-act="claim"]').onclick=()=>claim(v.querySelector('#nxUsername').value);v.querySelector('[data-act="connect-google"]')?.addEventListener('click',()=>signInGoogle().catch(()=>{}));v.querySelector('[data-act="logout"]').onclick=signOutGoogle;return;
  }
  const req=Object.entries(state.requests||{}),friends=Object.entries(state.friends||{});
  v.innerHTML=`<div class="nx-social-card"><span class="nx-social-label">OYUNCU ADIN</span><b>@${esc(state.profile.username)}</b><br><small class="nx-social-muted">${esc(guest?'Misafir · yalnızca bu tarayıcı':(state.user.email||'Google hesabı'))}</small>${connect}</div><div class="nx-social-card"><label class="nx-social-label">İSİMLE ARKADAŞ ARA</label><div class="nx-social-row"><input class="nx-social-input" id="nxFind" placeholder="tam oyuncu adı"><button class="nx-social-btn" data-act="find">ARA</button></div><div id="nxFindResult"></div></div><div class="nx-social-card"><span class="nx-social-label">İSTEKLER (${req.length})</span><div class="nx-social-list">${req.length?req.map(([uid,x])=>friendItem(uid,x.username,'request')).join(''):'<span class="nx-social-muted">Bekleyen istek yok.</span>'}</div></div><div class="nx-social-card"><span class="nx-social-label">ARKADAŞLAR (${friends.length})</span><div class="nx-social-list">${friends.length?friends.map(([uid,x])=>friendItem(uid,x.username,'friend')).join(''):'<span class="nx-social-muted">Henüz arkadaş eklenmedi.</span>'}</div></div><button class="nx-social-btn nx-social-danger" data-act="logout">ÇIKIŞ YAP</button>`;
  v.querySelector('[data-act="find"]').onclick=()=>findPlayer(v.querySelector('#nxFind').value);v.querySelectorAll('[data-accept]').forEach(b=>b.onclick=()=>acceptFriend(b.dataset.accept));v.querySelectorAll('[data-reject]').forEach(b=>b.onclick=()=>remove(ref(db,`social/friendRequests/${state.user.uid}/${b.dataset.reject}`)));v.querySelectorAll('[data-invite]').forEach(b=>b.onclick=()=>invite(b.dataset.invite));v.querySelector('[data-act="connect-google"]')?.addEventListener('click',()=>signInGoogle().catch(()=>{}));v.querySelector('[data-act="logout"]').onclick=signOutGoogle;
}
function friendItem(uid,name,type){
  if(type!=='friend')return `<div class="nx-social-item"><div><b>@${esc(name)}</b><br><small>Arkadaşlık isteği</small></div><div class="nx-social-actions"><button class="nx-social-btn primary" data-accept="${uid}">KABUL</button><button class="nx-social-btn nx-social-danger" data-reject="${uid}">RED</button></div></div>`;
  const online=Object.keys(state.friendPresence[uid]?.connections||{}).length>0,stats=state.headToHead[uid]||emptyStats();
  return `<div class="nx-social-item nx-friend-item"><div class="nx-friend-copy"><b>@${esc(name)}</b><span class="nx-presence ${online?'online':'offline'}"><i aria-hidden="true"></i>${online?'Çevrimiçi':'Çevrimdışı'}</span><small>${statValue(stats,'wins')} G · ${statValue(stats,'losses')} M · %${winRate(stats)} kazanma</small></div><div class="nx-social-actions"><button class="nx-social-btn" data-invite="${uid}">PARTİYE ÇAĞIR</button></div></div>`;
}
function renderParty(){
  const v=shade.querySelector('[data-view="party"]'),inv=Object.entries(state.invites||{});if(!state.profile){v.innerHTML='<div class="nx-social-card nx-social-muted">Parti için önce Arkadaşlar sekmesinden oyuncu adı oluştur.</div>';return}
  if(!state.party){v.innerHTML=`${inv.map(([id,x])=>`<div class="nx-social-card"><b>@${esc(x.fromName)}</b> seni partisine çağırdı.<div class="nx-social-actions"><button class="nx-social-btn primary" data-party-accept="${id}">KABUL</button><button class="nx-social-btn" data-party-reject="${id}">RED</button></div></div>`).join('')}<button class="nx-social-btn primary" data-act="create-party">YENİ PARTİ KUR</button>`;v.querySelector('[data-act="create-party"]').onclick=createParty;v.querySelectorAll('[data-party-accept]').forEach(b=>b.onclick=()=>acceptParty(b.dataset.partyAccept));v.querySelectorAll('[data-party-reject]').forEach(b=>b.onclick=()=>remove(ref(db,`social/partyInvites/${state.user.uid}/${b.dataset.partyReject}`)));return}
  const members=Object.entries(state.party.members||{}),leader=state.party.leaderUid===state.user.uid;
  v.innerHTML=`<div class="nx-social-card"><span class="nx-social-label">KALICI PARTİ</span><span class="nx-social-pill">${leader?'LİDER':'ÜYE'}</span><div class="nx-social-list">${members.map(([uid,x])=>`<div class="nx-social-item"><b>@${esc(x.username)}</b>${uid===state.party.leaderUid?'<small>Lider</small>':''}</div>`).join('')}</div></div>${leader?`<div class="nx-social-card"><label class="nx-social-label">PARTİYLE MODA GEÇ</label><select class="nx-social-select" id="nxPartyMode">${Object.entries(MODES).map(([k,m])=>`<option value="${k}">${m.label}</option>`).join('')}</select><button class="nx-social-btn primary" data-act="launch-party">OYUNU OTOMATİK BAŞLAT</button></div>`:'<div class="nx-social-card nx-social-muted">Parti lideri oyun seçtiğinde herkes otomatik olarak aynı maça alınır.</div>'}<button class="nx-social-btn nx-social-danger" data-act="leave-party">PARTİDEN AYRIL</button>`;
  v.querySelector('[data-act="launch-party"]')?.addEventListener('click',()=>launchParty(v.querySelector('#nxPartyMode').value));v.querySelector('[data-act="leave-party"]').onclick=leaveParty;
}
function leaderboardRows(data){
  const rows=Object.entries(data||{}).map(([uid,x])=>({uid,...x})).sort((a,b)=>statValue(b,'wins')-statValue(a,'wins')||winRate(b)-winRate(a)||statValue(b,'games')-statValue(a,'games')).slice(0,50);
  if(!rows.length)return '<div class="nx-social-muted nx-leader-empty">Henüz tamamlanmış maç yok.</div>';
  return `<div class="nx-leader-list">${rows.map((row,i)=>`<div class="nx-leader-row ${row.uid===state.user?.uid?'me':''}"><span class="nx-rank">${i+1}</span><div><b>@${esc(row.username||'Oyuncu')}</b><small>${statValue(row,'wins')} G · ${statValue(row,'losses')} M · ${statValue(row,'draws')} B</small></div><strong>%${winRate(row)}</strong></div>`).join('')}</div>`;
}
function renderLeaderboard(){
  const v=shade.querySelector('[data-view="leaderboard"]');if(!state.profile){v.innerHTML='<div class="nx-social-card nx-social-muted">Liderlik listesini görmek için önce oyuncu adını oluştur.</div>';return}
  v.innerHTML=`<div class="nx-social-card"><span class="nx-social-label">HAFTALIK ZİRVE</span><p class="nx-social-muted">Pazartesi başlayan bu haftanın en çok kazananları.</p>${leaderboardRows(state.weekly)}</div><div class="nx-social-card"><span class="nx-social-label">TÜM ZAMANLAR · ALL-TIME WINNERS</span><p class="nx-social-muted">Tamamlanan online maçların kalıcı sıralaması.</p>${leaderboardRows(state.allTime)}</div>`;
}

async function claim(raw){const username=clean(raw),key=norm(username);if(key.length<3){message('Oyuncu adı en az 3 karakter olmalı.',true);return}try{const result=await runTransaction(ref(db,`social/usernames/${key}`),v=>v&&v!==state.user.uid?undefined:state.user.uid,{applyLocally:false});if(!result.committed)throw new Error('Bu oyuncu adı kullanılıyor.');await update(ref(db),{[`social/profiles/${state.user.uid}`]:{username,key,accountType:state.user.isAnonymous?'guest':'google',googleEmail:state.user.email||'',displayName:state.user.displayName||'',updatedAt:serverTimestamp()}});message(`@${username} oluşturuldu.`)}catch(e){message(e.message||'Oyuncu adı oluşturulamadı.',true)}}
async function findPlayer(raw){const key=norm(raw),box=shade.querySelector('#nxFindResult');if(!key){message('Aranacak oyuncu adını yaz.',true);return}const s=await get(ref(db,`social/usernames/${key}`)),uid=s.val();if(!uid||uid===state.user.uid){box.innerHTML='<div class="nx-social-muted">Oyuncu bulunamadı.</div>';return}const p=(await get(ref(db,`social/profiles/${uid}`))).val();box.innerHTML=`<div class="nx-social-item"><b>@${esc(p?.username||raw)}</b><button class="nx-social-btn primary" data-add="${uid}">EKLE</button></div>`;box.querySelector('[data-add]').onclick=()=>sendFriend(uid,p.username)}
async function sendFriend(uid,username){await set(ref(db,`social/friendRequests/${uid}/${state.user.uid}`),{username:state.profile.username,createdAt:serverTimestamp()});message(`@${username} arkadaşlık isteği gönderildi.`)}
async function acceptFriend(uid){const req=state.requests[uid];await update(ref(db),{[`social/friends/${state.user.uid}/${uid}`]:{username:req.username,since:serverTimestamp()},[`social/friends/${uid}/${state.user.uid}`]:{username:state.profile.username,since:serverTimestamp()},[`social/friendRequests/${state.user.uid}/${uid}`]:null});message(`@${req.username} arkadaşlara eklendi.`)}
async function createParty(){const id=`p_${state.user.uid.slice(0,8)}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;await update(ref(db),{[`social/parties/${id}`]:{leaderUid:state.user.uid,createdAt:serverTimestamp(),members:{[state.user.uid]:{username:state.profile.username,joinedAt:serverTimestamp()}}},[`social/userParty/${state.user.uid}`]:id});message('Kalıcı parti kuruldu.');return id}
async function invite(uid){const partyId=state.party?.members?state.partyId:await createParty();await set(ref(db,`social/partyInvites/${uid}/${partyId}`),{fromUid:state.user.uid,fromName:state.profile.username,createdAt:serverTimestamp()});message('Parti daveti gönderildi.');render('party')}
async function acceptParty(id){const ps=(await get(ref(db,`social/parties/${id}`))).val();if(!ps)throw new Error('Parti artık mevcut değil.');await update(ref(db),{[`social/parties/${id}/members/${state.user.uid}`]:{username:state.profile.username,joinedAt:serverTimestamp()},[`social/userParty/${state.user.uid}`]:id,[`social/partyInvites/${state.user.uid}/${id}`]:null});message('Partiye katıldın.')}
async function leaveParty(){if(!state.partyId)return;const id=state.partyId,leader=state.party.leaderUid===state.user.uid,members=Object.keys(state.party.members||{}).filter(x=>x!==state.user.uid);const changes={[`social/userParty/${state.user.uid}`]:null,[`social/parties/${id}/members/${state.user.uid}`]:null};if(leader&&members.length)changes[`social/parties/${id}/leaderUid`]=members[0];if(!members.length)changes[`social/parties/${id}`]=null;await update(ref(db),changes);message('Partiden ayrıldın.')}
async function launchParty(mode){const nonce=`${Date.now()}_${Math.random().toString(36).slice(2,7)}`,members=Object.keys(state.party.members||{}),config=MODES[mode];if(config.matchable&&members.length!==2){message('Bu 1v1 mod için partide tam iki oyuncu olmalı.',true);return}if(config.minParty&&members.length<config.minParty){message(`${config.label} için partide en az ${config.minParty} oyuncu olmalı.`,true);return}if(config.maxParty&&members.length>config.maxParty){message(`${config.label} en fazla ${config.maxParty} oyuncuyu destekliyor.`,true);return}const launch={mode,nonce,matchId:`p_${state.partyId}_${nonce}`,at:serverTimestamp(),roomCode:codeFor(mode),partySize:members.length,roles:Object.fromEntries(members.map(uid=>[uid,uid===state.party.leaderUid?'host':'guest']))};await set(ref(db,`social/parties/${state.partyId}/launch`),launch);navigateParty(launch)}
function navigateParty(launch){const {mode,nonce}=launch||{};if(!mode||!nonce||state.launchNonce===nonce||sessionStorage.getItem('nxPartyLaunch')===nonce)return;const members=Object.keys(launch.roles||{}),opponent=members.find(uid=>uid!==state.user.uid)||'',params={nxParty:state.partyId,nxLaunch:nonce};if(launch.roomCode&&launch.roles?.[state.user.uid])Object.assign(params,{nxAuto:'1',nxRole:launch.roles[state.user.uid],nxCode:launch.roomCode,nxPartySize:String(launch.partySize||members.length),nxName:state.profile?.username||state.party?.members?.[state.user.uid]?.username||'NEON Oyuncu',nxUid:state.user.uid,nxOpponent:opponent,nxMatch:launch.matchId||`p_${state.partyId}_${nonce}`});const target=modeUrl(mode,params);state.launchNonce=nonce;sessionStorage.setItem('nxPartyLaunch',nonce);location.href=target}
async function startMatch(mode){if(!requireProfile())return;if(!MODES[mode]?.matchable){message('Bu mod grup partisiyle oynanır; 1v1 rakip arama Draft, XOX ve Career Twin için açık.',true);return}message('Uygun rakip aranıyor…');const path=`social/matchQueues/${mode}`,uid=state.user.uid,joinedAt=Date.now();await set(ref(db,`${path}/${uid}`),{uid,username:state.profile.username,status:'waiting',joinedAt});onDisconnect(ref(db,`${path}/${uid}`)).remove().catch(()=>{});await runTransaction(ref(db,path),q=>{q=q||{};if(q[uid]?.status!=='waiting')return q;const other=Object.values(q).filter(x=>x&&x.uid!==uid&&x.status==='waiting'&&joinedAt-Number(x.joinedAt||0)<60000).sort((a,b)=>a.joinedAt-b.joinedAt)[0];if(!other)return q;const host=other.joinedAt<=joinedAt?other.uid:uid,matchId=`m_${Math.min(joinedAt,other.joinedAt)}_${host.slice(0,7)}`,roomCode=codeFor(mode);q[uid]={...q[uid],status:'matched',matchId,roomCode,role:uid===host?'host':'guest',opponentUid:other.uid};q[other.uid]={...q[other.uid],status:'matched',matchId,roomCode,role:other.uid===host?'host':'guest',opponentUid:uid};return q},{applyLocally:false});if(state.queueOff)state.queueOff();state.queueOff=onValue(ref(db,`${path}/${uid}`),s=>{const x=s.val();if(x?.status==='matched'){state.queueOff?.();state.queueOff=null;message('Rakip bulundu. Maç otomatik başlatılıyor…');setTimeout(()=>{location.href=modeUrl(mode,{nxAuto:'1',nxRole:x.role,nxCode:x.roomCode,nxName:state.profile.username,nxUid:uid,nxOpponent:x.opponentUid,nxMatch:x.matchId})},350)}});renderSearching(mode)}
function renderSearching(mode){const v=shade.querySelector('[data-view="play"]');v.innerHTML=`<div class="nx-social-searching"><b>${esc(MODES[mode].label)}</b><div>Rakip aranıyor…</div><button class="nx-social-btn nx-social-danger" data-act="cancel">ARAMAYI İPTAL ET</button></div>`;v.querySelector('[data-act="cancel"]').onclick=async()=>{state.queueOff?.();state.queueOff=null;await remove(ref(db,`social/matchQueues/${mode}/${state.user.uid}`));message('Arama iptal edildi.');render('play')}}

async function startPresence(user){
  await stopPresence();
  const session=(globalThis.crypto?.randomUUID?.()||`${Date.now()}_${Math.random()}`).replace(/[^a-zA-Z0-9_-]/g,''),connection=ref(db,`social/presence/${user.uid}/connections/${session}`),lastSeen=ref(db,`social/presence/${user.uid}/lastSeen`);
  state.presenceConnection=connection;
  state.presenceOff=onValue(ref(db,'.info/connected'),async snap=>{if(snap.val()!==true)return;try{await onDisconnect(connection).remove();await onDisconnect(lastSeen).set(serverTimestamp());await set(connection,true);await set(lastSeen,serverTimestamp())}catch(e){console.warn('Presence kurulamadı',e)}});
}
async function stopPresence(){state.presenceOff?.();state.presenceOff=null;if(state.presenceConnection){try{await remove(state.presenceConnection)}catch{}state.presenceConnection=null}}
function bindFriendDetails(){
  state.friendOffs.splice(0).forEach(off=>{try{off()}catch{}});state.friendPresence={};state.headToHead={};
  for(const uid of Object.keys(state.friends||{})){
    state.friendOffs.push(onValue(ref(db,`social/presence/${uid}`),s=>{state.friendPresence[uid]=s.val()||{};if(state.tab==='friends')renderFriends()}));
    state.friendOffs.push(onValue(ref(db,`social/headToHead/${state.user.uid}/${uid}`),s=>{state.headToHead[uid]=s.val()||emptyStats();if(state.tab==='friends')renderFriends()}));
  }
}
async function incrementStats(path,result){
  return runTransaction(ref(db,path),current=>{const next={...emptyStats(),...(current||{})};next[result]=statValue(next,result)+1;next.games=statValue(next,'games')+1;next.updatedAt=Date.now();return next},{applyLocally:false});
}
async function recordResult(detail={}){
  if(!state.user||!state.profile)return;
  const result=['wins','losses','draws'].includes(detail.result)?detail.result:null,rawMatch=detail.matchId||new URLSearchParams(location.search).get('nxMatch'),matchId=rawMatch?safeKey(rawMatch):'';
  if(!result||!matchId)return;
  const receipt=await runTransaction(ref(db,`social/resultReceipts/${state.user.uid}/${matchId}`),value=>value?undefined:{result,mode:String(detail.mode||''),at:Date.now()},{applyLocally:false});
  if(!receipt.committed)return;
  const own=await incrementStats(`social/stats/${state.user.uid}`,result),opponentUid=String(detail.opponentUid||new URLSearchParams(location.search).get('nxOpponent')||'');
  if(opponentUid&&opponentUid!==state.user.uid)await incrementStats(`social/headToHead/${state.user.uid}/${opponentUid}`,result);
  const stats=own.snapshot.val()||emptyStats(),entry={username:state.profile.username,wins:statValue(stats,'wins'),losses:statValue(stats,'losses'),draws:statValue(stats,'draws'),games:statValue(stats,'games'),winRate:winRate(stats),updatedAt:serverTimestamp()};
  await update(ref(db),{[`social/leaderboards/allTime/${state.user.uid}`]:entry,[`social/leaderboards/weekly/${weekKey()}/${state.user.uid}`]:await weeklyEntry(result,entry)});
}
async function weeklyEntry(result,identity){
  const path=`social/weeklyStats/${weekKey()}/${state.user.uid}`,tx=await incrementStats(path,result),stats=tx.snapshot.val()||emptyStats();
  return {...identity,wins:statValue(stats,'wins'),losses:statValue(stats,'losses'),draws:statValue(stats,'draws'),games:statValue(stats,'games'),winRate:winRate(stats)};
}
function clearUserBindings(){state.userOffs.splice(0).forEach(off=>{try{off()}catch{}});state.friendOffs.splice(0).forEach(off=>{try{off()}catch{}});state.partyOff?.();state.partyOff=null;Object.assign(state,{profile:null,friends:{},requests:{},invites:{},party:null,partyId:'',friendPresence:{},headToHead:{},weekly:{},allTime:{}})}
function bindUser(user){
  clearUserBindings();state.user=user;button.textContent='SOSYAL';startPresence(user);
  const watch=(path,fn)=>state.userOffs.push(onValue(ref(db,path),fn,e=>message(`Sosyal bağlantı hatası: ${e.message}`,true)));
  watch(`social/profiles/${user.uid}`,s=>{state.profile=s.val();if(!state.profile){open('friends');message(user.isAnonymous?'Misafir moduna geçtin. Devam etmek için benzersiz oyuncu adını seç.':'Google hesabın bağlandı. Devam etmek için benzersiz oyuncu adını seç.')}else render()});
  watch(`social/friends/${user.uid}`,s=>{state.friends=s.val()||{};bindFriendDetails();render()});
  watch(`social/friendRequests/${user.uid}`,s=>{state.requests=s.val()||{};button.dataset.count=String(Object.keys(state.requests).length+Object.keys(state.invites).length);render()});
  watch(`social/partyInvites/${user.uid}`,s=>{state.invites=s.val()||{};button.dataset.count=String(Object.keys(state.requests).length+Object.keys(state.invites).length);render()});
  watch(`social/leaderboards/weekly/${weekKey()}`,s=>{state.weekly=s.val()||{};if(state.tab==='leaderboard')renderLeaderboard()});
  watch('social/leaderboards/allTime',s=>{state.allTime=s.val()||{};if(state.tab==='leaderboard')renderLeaderboard()});
  watch(`social/userParty/${user.uid}`,s=>{state.partyId=s.val()||'';state.partyOff?.();state.party=null;if(!state.partyId){render();return}state.partyOff=onValue(ref(db,`social/parties/${state.partyId}`),p=>{state.party=p.val();const l=state.party?.launch;if(l?.mode&&l?.nonce)navigateParty(l);render()})});
}
function bind(){onAuthStateChanged(auth,user=>{if(user)bindUser(user);else{stopPresence();clearUserBindings();state.user=null;button.textContent='GİRİŞ';button.dataset.count='0';render()}})}

shell();bind();
window.NEON_SOCIAL={open,close,signIn:signInGoogle,continueAsGuest,signOut:signOutGoogle,recordResult,modes:MODES,get profile(){return state.profile},get party(){return state.party}};
document.addEventListener('neon-match-result',e=>recordResult(e.detail||{}).catch(error=>{console.error('Maç sonucu kaydedilemedi',error);message('Maç sonucu liderliğe kaydedilemedi.',true)}));
document.addEventListener('click',e=>{const b=e.target.closest('[data-neon-social]');if(b){e.preventDefault();open(b.dataset.neonSocial||'play')}});
window.addEventListener('beforeunload',()=>{if(state.presenceConnection)remove(state.presenceConnection).catch(()=>{})});
