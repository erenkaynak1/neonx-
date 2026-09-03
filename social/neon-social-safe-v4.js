import {getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,get,onDisconnect,onValue,ref,remove,runTransaction,set,update} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const MODES={
  draft:{label:'NEON XI Draft',path:'index.html',players:2},
  xox:{label:'Futbol XOX',path:'side-games/football-xox/index.html',players:2},
  twin:{label:'Kariyer İkizi',path:'side-games/career-twin/index.html',players:2},
  imposter:{label:'Futbol Imposter',path:'side-games/futbol-imposter.html',players:3},
  wordle:{label:'Football Wordle',path:'side-games/football-wordle/online.html',players:2}
};
const base=new URL('../',import.meta.url);
const state={
  auth:null,db:null,user:null,
  queue:null,queueOff:null,
  room:null,roomOff:null,
  requestOff:null,inviteOff:null,
  requestCount:0,inviteCount:0,
  patchedOpen:false
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));

function profile(){return window.NEON_SOCIAL?.profile||null}
function identity(){
  const p=profile(),u=state.auth?.currentUser;
  if(!u||!p?.username)return null;
  try{localStorage.setItem('nxSocialUsername',p.username);localStorage.setItem('nxSocialUid',u.uid)}catch{}
  window.NEON_IDENTITY={uid:u.uid,username:p.username,guest:Boolean(u.isAnonymous)};
  return {uid:u.uid,username:p.username};
}
function status(text,error=false){
  const el=document.querySelector('.nx-social-status');
  if(!el)return;
  if(el.textContent!==text)el.textContent=text;
  el.classList.toggle('error',Boolean(error));
}
function addStyle(){
  if(document.getElementById('nx-social-safe-v4-style'))return;
  const s=document.createElement('style');s.id='nx-social-safe-v4-style';s.textContent=`
    .nx-safe-toast-stack{position:fixed;z-index:500600;right:14px;top:max(14px,env(safe-area-inset-top));width:min(360px,calc(100vw - 28px));display:grid;gap:8px;pointer-events:none;font-family:system-ui,sans-serif}
    .nx-safe-toast{pointer-events:auto;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid rgba(186,255,24,.46);border-radius:14px;background:linear-gradient(180deg,rgba(8,22,15,.98),rgba(2,9,6,.98));box-shadow:0 18px 48px rgba(0,0,0,.46),0 0 22px rgba(186,255,24,.09);padding:11px 12px;color:#f5fff7}
    .nx-safe-toast b{display:block;color:#cfff54;font-size:10px;letter-spacing:.08em;margin-bottom:3px}.nx-safe-toast span{font-size:12px;line-height:1.35}.nx-safe-toast button{min-height:34px;padding:0 10px;border:1px solid rgba(186,255,24,.42);border-radius:9px;background:rgba(186,255,24,.08);color:#dcff76;font-weight:850;font-size:10px;cursor:pointer}
    .nx-safe-room-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.nx-safe-room-code{font-size:20px;font-weight:950;letter-spacing:.15em;color:#cfff4d;margin-top:8px}.nx-safe-room-state{min-height:18px;margin-top:7px;color:#9eaea4;font-size:11px}.nx-safe-room-state.error{color:#ff93aa}.nx-safe-match-hint{margin:-1px 0 10px;color:#8fa297;font-size:11px;text-align:center}
    .nx-safe-home-badge{position:absolute;z-index:30;left:16.7%;top:3.05%;min-width:25px;height:25px;padding:0 6px;border:2px solid #08120c;border-radius:999px;background:#ff496b;color:#fff;display:none;place-items:center;font:900 11px/1 system-ui,sans-serif;box-shadow:0 0 13px rgba(255,73,107,.56);pointer-events:none}.nx-safe-home-badge.show{display:grid}
    @media(max-width:560px){.nx-safe-toast-stack{left:10px;right:10px;width:auto}.nx-safe-room-actions{grid-template-columns:1fr}}
  `;document.head.appendChild(s);
}
function toast(title,text,tab='play',ttl=6500){
  let stack=document.querySelector('.nx-safe-toast-stack');
  if(!stack){stack=document.createElement('div');stack.className='nx-safe-toast-stack';document.body.appendChild(stack)}
  const item=document.createElement('div');item.className='nx-safe-toast';
  item.innerHTML=`<div><b>${esc(title)}</b><span>${esc(text)}</span></div><button type="button">GÖR</button>`;
  item.querySelector('button').onclick=()=>{item.remove();window.NEON_SOCIAL?.open?.(tab)};
  stack.appendChild(item);setTimeout(()=>item.remove(),ttl);
}
function ensureBadge(){
  const canvas=document.querySelector('#bootHome.nx-approved-home-v1 .nx-approved-canvas');if(!canvas)return;
  let b=canvas.querySelector('.nx-safe-home-badge');
  if(!b){b=document.createElement('div');b.className='nx-safe-home-badge';canvas.appendChild(b)}
  const count=state.requestCount+state.inviteCount;
  const text=count>99?'99+':String(count);
  if(b.textContent!==text)b.textContent=text;
  b.classList.toggle('show',count>0);
}
function seen(type,uid,key){const k=`nxSeenV4:${type}:${uid}:${key}`;if(sessionStorage.getItem(k))return true;sessionStorage.setItem(k,'1');return false}
function bindNotifications(user){
  state.requestOff?.();state.inviteOff?.();
  state.requestOff=onValue(ref(state.db,`social/friendRequests/${user.uid}`),s=>{
    const data=s.val()||{};state.requestCount=Object.keys(data).length;ensureBadge();
    for(const [fromUid,x] of Object.entries(data)){if(seen('friend',user.uid,fromUid))continue;toast('ARKADAŞLIK İSTEĞİ',`${x?.username||'Bir oyuncu'} arkadaşın olmak istiyor.`,'friends')}
  });
  state.inviteOff=onValue(ref(state.db,`social/partyInvites/${user.uid}`),s=>{
    const data=s.val()||{};state.inviteCount=Object.keys(data).length;ensureBadge();
    for(const [partyId,x] of Object.entries(data)){if(seen('party',user.uid,partyId))continue;toast('PARTİ DAVETİ',`${x?.fromName||'Bir oyuncu'} seni partisine çağırıyor.`,'party')}
  });
}
function code(){return [...Array(6)].map(()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('')}
function targetUrl(mode,data,me){
  const c=MODES[mode];if(!c)return null;
  const u=new URL(c.path,base),members=Array.isArray(data.members)?data.members:[];
  const others=members.filter(x=>x!==me.uid);
  const params={nxAuto:'1',nxRole:data.hostUid===me.uid?'host':'guest',nxCode:data.roomCode||data.code||'',nxName:me.username,nxUid:me.uid,nxOpponent:others[0]||'',nxMatch:data.matchId||'',nxPartySize:String(members.length||c.players),nxPlayers:members.join(',')};
  Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,String(v)));
  return u.href;
}
function searchingMarkup(mode){
  const v=document.querySelector('.nx-social-view[data-view="play"]');if(!v)return;
  const c=MODES[mode];
  v.dataset.nxSafeSearching='1';
  v.innerHTML=`<div class="nx-social-searching"><b>${esc(c.label)}</b><div>${c.players===2?'Rakip':'Oyuncular'} aranıyor…</div><small style="display:block;margin:7px 0 13px;color:#91a397">Arkadaş olmanız gerekmez${c.players>2?` · ${c.players} oyuncu olduğunda oyun başlayacak.`:'.'}</small><button class="nx-social-btn nx-social-danger" type="button" data-nx-safe-cancel>ARAMAYI İPTAL ET</button></div>`;
  v.querySelector('[data-nx-safe-cancel]').onclick=()=>cancelSearch(true);
}
async function cancelSearch(reopen=false){
  const q=state.queue;state.queue=null;state.queueOff?.();state.queueOff=null;
  if(q&&state.db){try{await remove(ref(state.db,`social/universalQueuesV2/${q.mode}/${q.uid}`))}catch{}}
  if(reopen){status('Eşleşme araması iptal edildi.');window.NEON_SOCIAL?.open?.('play');setTimeout(patchPlay,0)}
}
async function startSearch(mode){
  const c=MODES[mode],me=identity();if(!c)return;if(!me){window.NEON_SOCIAL?.open?.('friends');return}
  await cancelSearch(false);
  const path=`social/universalQueuesV2/${mode}`,self=ref(state.db,`${path}/${me.uid}`),joinedAt=Date.now();
  state.queue={mode,uid:me.uid};await set(self,{uid:me.uid,username:me.username,status:'waiting',joinedAt});onDisconnect(self).remove().catch(()=>{});
  searchingMarkup(mode);status(`${c.label}: eşleşme aranıyor…`);
  await runTransaction(ref(state.db,path),q=>{
    q=q||{};if(q[me.uid]?.status!=='waiting')return q;
    const now=Date.now(),waiting=Object.values(q).filter(x=>x&&x.status==='waiting'&&now-Number(x.joinedAt||0)<120000).sort((a,b)=>Number(a.joinedAt||0)-Number(b.joinedAt||0));
    if(waiting.length<c.players)return q;
    const group=waiting.slice(0,c.players),members=group.map(x=>x.uid);if(!members.includes(me.uid))return q;
    const hostUid=members[0],stamp=Math.min(...group.map(x=>Number(x.joinedAt||now))),matchId=`m2_${mode}_${stamp}_${hostUid.slice(0,7)}`,roomCode=code();
    for(const p of group)q[p.uid]={...q[p.uid],status:'matched',members,hostUid,matchId,roomCode};
    return q;
  },{applyLocally:false});
  state.queueOff=onValue(self,s=>{
    const data=s.val();if(data?.status!=='matched')return;
    const url=targetUrl(mode,data,me);state.queueOff?.();state.queueOff=null;state.queue=null;status('Eşleşme bulundu. Oyun açılıyor…');
    if(url)setTimeout(()=>{location.href=url},250);
  });
}
function roomState(text,error=false){const el=document.querySelector('[data-nx-safe-room-state]');if(!el)return;if(el.textContent!==text)el.textContent=text;el.classList.toggle('error',Boolean(error))}
function roomCode(text=''){const el=document.querySelector('[data-nx-safe-room-code]');if(el&&el.textContent!==text)el.textContent=text}
function listenRoom(mode,roomCodeValue,me){
  state.roomOff?.();const r=ref(state.db,`social/openRoomsV2/${mode}/${roomCodeValue}`);
  state.roomOff=onValue(r,s=>{
    const x=s.val();if(!x){roomState('Oda kapatıldı.',true);state.room=null;return}
    const members=Object.keys(x.members||{});state.room={...x,mode,code:roomCodeValue};
    roomCode(`ODA KODU: ${roomCodeValue}`);
    if(x.status==='matched'&&members.length>=MODES[mode].players){
      const data={...x,members,roomCode:roomCodeValue};const url=targetUrl(mode,data,me);state.roomOff?.();state.roomOff=null;roomState('Oyuncular tamam. Oyun açılıyor…');if(url)setTimeout(()=>{location.href=url},250);
    }else roomState(`${members.length}/${MODES[mode].players} oyuncu · rakip bekleniyor.`);
  });
}
async function createRoom(mode){
  const c=MODES[mode],me=identity();if(!c)return;if(!me){window.NEON_SOCIAL?.open?.('friends');return}
  await cancelRoom();
  for(let i=0;i<10;i++){
    const roomCodeValue=code(),createdAt=Date.now(),r=ref(state.db,`social/openRoomsV2/${mode}/${roomCodeValue}`),matchId=`r2_${mode}_${roomCodeValue}_${createdAt}`;
    const tx=await runTransaction(r,current=>{if(current&&Date.now()-Number(current.createdAt||0)<600000)return;return {mode,code:roomCodeValue,hostUid:me.uid,createdAt,matchId,status:'waiting',members:{[me.uid]:{username:me.username,joinedAt:createdAt}}}},{applyLocally:false});
    if(!tx.committed)continue;state.room={mode,code:roomCodeValue,hostUid:me.uid,status:'waiting'};listenRoom(mode,roomCodeValue,me);toast('ONLINE ODA',`${roomCodeValue} kodlu oda oluşturuldu.`,'play',4200);return;
  }
  roomState('Boş oda kodu üretilemedi. Tekrar dene.',true);
}
async function joinRoom(mode,raw){
  const c=MODES[mode],me=identity();if(!c)return;if(!me){window.NEON_SOCIAL?.open?.('friends');return}
  const roomCodeValue=String(raw||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);if(roomCodeValue.length<4){roomState('Geçerli oda kodunu yaz.',true);return}
  const r=ref(state.db,`social/openRoomsV2/${mode}/${roomCodeValue}`),now=Date.now();
  const tx=await runTransaction(r,current=>{
    if(!current||now-Number(current.createdAt||0)>600000)return;
    const members=current.members||{};if(!members[me.uid]&&Object.keys(members).length>=c.players)return;
    members[me.uid]={username:me.username,joinedAt:now};current.members=members;
    if(Object.keys(members).length>=c.players)current.status='matched';return current;
  },{applyLocally:false});
  if(!tx.committed){roomState('Oda bulunamadı, dolu veya süresi dolmuş.',true);return}
  state.room={mode,code:roomCodeValue};listenRoom(mode,roomCodeValue,me);
}
async function cancelRoom(){
  const me=identity(),r=state.room;state.roomOff?.();state.roomOff=null;state.room=null;if(!r||!state.db){roomCode('');return}
  try{
    if(me&&r.hostUid===me.uid)await remove(ref(state.db,`social/openRoomsV2/${r.mode}/${r.code}`));
    else if(me)await remove(ref(state.db,`social/openRoomsV2/${r.mode}/${r.code}/members/${me.uid}`));
  }catch{}
  roomCode('');roomState('Oda kapatıldı.');
}
async function leaveParty(){
  const me=identity();if(!me)return;
  const partyId=String((await get(ref(state.db,`social/userParty/${me.uid}`))).val()||'');if(!partyId){status('Aktif bir partide değilsin.');return}
  const party=(await get(ref(state.db,`social/parties/${partyId}`))).val();
  if(!party){await remove(ref(state.db,`social/userParty/${me.uid}`));status('Eski parti kaydı temizlendi.');window.NEON_SOCIAL?.open?.('party');return}
  const remaining=Object.keys(party.members||{}).filter(uid=>uid!==me.uid),changes={[`social/userParty/${me.uid}`]:null};
  if(!remaining.length)changes[`social/parties/${partyId}`]=null;
  else{changes[`social/parties/${partyId}/members/${me.uid}`]=null;if(party.leaderUid===me.uid)changes[`social/parties/${partyId}/leaderUid`]=remaining[0]}
  await update(ref(state.db),changes);status('Partiden ayrıldın.');toast('PARTİ','Partiden ayrıldın.','party',3200);setTimeout(()=>window.NEON_SOCIAL?.open?.('party'),80);
}
function patchPlay(){
  const v=document.querySelector('.nx-social-view[data-view="play"]');if(!v||!v.classList.contains('active'))return;
  if(state.queue){if(!v.dataset.nxSafeSearching)searchingMarkup(state.queue.mode);return}
  const select=v.querySelector('#nxMode');if(!select)return;
  for(const [key,c] of Object.entries(MODES))if(!select.querySelector(`option[value="${key}"]`)){const o=document.createElement('option');o.value=key;o.textContent=c.label;select.appendChild(o)}
  const match=v.querySelector('[data-act="match"]');if(match&&match.textContent!=='RAKİP BUL')match.textContent='RAKİP BUL';
  if(!v.querySelector('.nx-safe-match-hint')){const h=document.createElement('div');h.className='nx-safe-match-hint';h.textContent='Arkadaş gerekmez · seçtiğin oyunda çevrimiçi oyuncularla otomatik eşleşirsin.';v.querySelector('.nx-social-choice')?.after(h)}
  if(v.querySelector('[data-nx-safe-room-card]'))return;
  const legacy=v.querySelector('[data-act="room-code"]')?.closest('.nx-social-card'),card=document.createElement('div');card.className='nx-social-card';card.dataset.nxSafeRoomCard='1';
  card.innerHTML=`<span class="nx-social-label">ONLINE ODA</span><div class="nx-social-muted">Oda oluştur veya kodla katıl. Oyuncu adın hesabından otomatik alınır.</div><div class="nx-safe-room-actions"><button class="nx-social-btn primary" type="button" data-nx-safe-create>ODA OLUŞTUR</button><button class="nx-social-btn nx-social-danger" type="button" data-nx-safe-close>ODAYI KAPAT</button></div><div class="nx-social-row" style="margin-top:8px"><input class="nx-social-input" data-nx-safe-room-input maxlength="8" autocomplete="off" placeholder="ODA KODU"><button class="nx-social-btn" type="button" data-nx-safe-join>KATIL</button></div><div class="nx-safe-room-code" data-nx-safe-room-code></div><div class="nx-safe-room-state" data-nx-safe-room-state></div>`;
  legacy?.replaceWith(card);if(!legacy)v.appendChild(card);
  card.querySelector('[data-nx-safe-create]').onclick=()=>createRoom(select.value).catch(e=>roomState(e?.message||'Oda oluşturulamadı.',true));
  card.querySelector('[data-nx-safe-close]').onclick=()=>cancelRoom();
  card.querySelector('[data-nx-safe-join]').onclick=()=>joinRoom(select.value,card.querySelector('[data-nx-safe-room-input]').value).catch(e=>roomState(e?.message||'Odaya katılınamadı.',true));
  if(state.room){roomCode(`ODA KODU: ${state.room.code}`);roomState('Oda açık; oyuncu bekleniyor.')}
}
function bindClicks(){
  document.addEventListener('click',e=>{
    const leave=e.target.closest('.nx-social-shade [data-act="leave-party"]');if(leave){e.preventDefault();e.stopImmediatePropagation();leaveParty().catch(err=>status(err?.message||'Partiden çıkılamadı.',true));return}
    const match=e.target.closest('.nx-social-shade [data-act="match"]');if(match){const select=document.querySelector('.nx-social-view[data-view="play"] #nxMode');if(!select)return;e.preventDefault();e.stopImmediatePropagation();startSearch(select.value).catch(err=>{status(err?.message||'Eşleşme başlatılamadı.',true);window.NEON_SOCIAL?.open?.('play')});return}
    const online=e.target.closest('#bootHome.nx-approved-home-v1 .h-online');if(online){e.preventDefault();e.stopImmediatePropagation();window.NEON_SOCIAL?.open?.('play');setTimeout(patchPlay,0);return}
    if(e.target.closest('.nx-social-shade [data-tab="play"]'))setTimeout(patchPlay,0);
  },true);
}
function patchOpen(){
  if(state.patchedOpen||!window.NEON_SOCIAL?.open)return;
  const original=window.NEON_SOCIAL.open.bind(window.NEON_SOCIAL);
  window.NEON_SOCIAL.open=(tab='play')=>{original(tab);if(tab==='play')setTimeout(patchPlay,0)};state.patchedOpen=true;
}
function boot(){
  addStyle();bindClicks();
  const wait=setInterval(()=>{
    if(!window.NEON_SOCIAL||!getApps().length)return;
    clearInterval(wait);state.auth=getAuth(getApp());state.db=getDatabase(getApp());patchOpen();
    onAuthStateChanged(state.auth,user=>{state.user=user;state.requestOff?.();state.inviteOff?.();state.requestCount=0;state.inviteCount=0;ensureBadge();if(user)bindNotifications(user)});
    setInterval(()=>{patchOpen();patchPlay();ensureBadge();identity()},1200);
  },80);
}
window.addEventListener('beforeunload',()=>{if(state.queue)remove(ref(state.db,`social/universalQueuesV2/${state.queue.mode}/${state.queue.uid}`)).catch(()=>{});state.roomOff?.()});
boot();
