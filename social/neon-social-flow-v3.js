import {getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,get,onValue,ref,remove,runTransaction,update} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const MODE_PATHS={
  draft:'index.html',
  xox:'side-games/football-xox/index.html',
  twin:'side-games/career-twin/index.html'
};
const MATCHABLE=new Set(Object.keys(MODE_PATHS));
const rootBase=new URL('../',import.meta.url);

const state={
  ready:false,
  auth:null,
  db:null,
  userOff:null,
  requestOff:null,
  inviteOff:null,
  hostRoomOff:null,
  hostRoom:null,
  notifications:0,
  profileName:''
};

function injectStyle(){
  if(document.getElementById('nx-social-flow-v3-style'))return;
  const s=document.createElement('style');
  s.id='nx-social-flow-v3-style';
  s.textContent=`
    .nx-social-toast-stack{position:fixed;z-index:500500;right:16px;top:16px;width:min(360px,calc(100vw - 32px));display:grid;gap:9px;pointer-events:none;font-family:system-ui,sans-serif}
    .nx-social-toast{pointer-events:auto;border:1px solid rgba(186,255,24,.46);border-radius:15px;background:linear-gradient(180deg,rgba(8,22,15,.98),rgba(2,9,6,.98));box-shadow:0 18px 50px rgba(0,0,0,.5),0 0 22px rgba(186,255,24,.09);padding:12px 12px 11px;color:#f5fff7;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;animation:nxToastIn .2s ease both}
    .nx-social-toast b{display:block;color:#cfff54;font-size:10px;letter-spacing:.1em;margin-bottom:4px}.nx-social-toast span{font-size:12px;line-height:1.35}.nx-social-toast button{border:1px solid rgba(186,255,24,.4);border-radius:9px;background:rgba(186,255,24,.08);color:#dfff79;min-height:34px;padding:0 10px;font-weight:850;font-size:10px;cursor:pointer}
    @keyframes nxToastIn{from{opacity:0;transform:translateY(-10px) scale(.98)}to{opacity:1;transform:none}}
    .nx-social-room-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.nx-social-room-code{font-size:21px;font-weight:950;letter-spacing:.16em;color:#cfff4d;margin-top:8px}.nx-social-room-status{min-height:17px;margin-top:7px;color:#9eaea4;font-size:11px}.nx-social-room-status.error{color:#ff93aa}.nx-social-match-hint{margin:-1px 0 10px;color:#8fa297;font-size:11px;text-align:center}
    .nx-social-home-badge{position:absolute;z-index:20;left:16.7%;top:3.05%;min-width:25px;height:25px;padding:0 6px;border:2px solid #08120c;border-radius:999px;background:#ff496b;color:white;display:none;place-items:center;font:900 11px/1 system-ui,sans-serif;box-shadow:0 0 13px rgba(255,73,107,.56);pointer-events:none}.nx-social-home-badge.show{display:grid}
    @media(max-width:560px){.nx-social-toast-stack{left:10px;right:10px;top:max(10px,env(safe-area-inset-top));width:auto}.nx-social-room-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
}

function toast(title,text,tab='play',ttl=6500){
  let stack=document.querySelector('.nx-social-toast-stack');
  if(!stack){stack=document.createElement('div');stack.className='nx-social-toast-stack';document.body.appendChild(stack)}
  const item=document.createElement('div');item.className='nx-social-toast';
  item.innerHTML=`<div><b>${escapeHtml(title)}</b><span>${escapeHtml(text)}</span></div><button type="button">GÖR</button>`;
  item.querySelector('button').onclick=()=>{item.remove();window.NEON_SOCIAL?.open?.(tab)};
  stack.appendChild(item);
  const timer=setTimeout(()=>item.remove(),ttl);
  item.addEventListener('mouseenter',()=>clearTimeout(timer),{once:true});
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function socialMessage(text,error=false){
  const el=document.querySelector('.nx-social-status');
  if(el){el.textContent=text;el.classList.toggle('error',error)}
  if(error)toast('NEON XI SOSYAL',text,'play',5000);
}
function identity(){
  const user=state.auth?.currentUser;
  const profile=window.NEON_SOCIAL?.profile;
  if(!user||!profile?.username)return null;
  state.profileName=profile.username;
  try{localStorage.setItem('nxSocialUsername',profile.username);localStorage.setItem('nxSocialUid',user.uid)}catch{}
  window.NEON_IDENTITY={uid:user.uid,username:profile.username,guest:Boolean(user.isAnonymous)};
  return {uid:user.uid,username:profile.username};
}
function modeCode(mode){
  if(mode==='draft')return [...Array(6)].map(()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
  return String(Math.floor(1000+Math.random()*9000));
}
function modeUrl(mode,params={}){
  const path=MODE_PATHS[mode];if(!path)return null;
  const u=new URL(path,rootBase);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,String(v)));return u.href;
}
function navigateRoom(mode,role,code,me,opponentUid,matchId){
  const target=modeUrl(mode,{nxAuto:'1',nxRole:role,nxCode:code,nxName:me.username,nxUid:me.uid,nxOpponent:opponentUid||'',nxMatch:matchId});
  if(!target)return;
  location.href=target;
}

async function leavePartyFixed(){
  const me=identity();if(!me){socialMessage('Önce giriş yapmalısın.',true);return}
  const idSnap=await get(ref(state.db,`social/userParty/${me.uid}`));
  const partyId=String(idSnap.val()||'');
  if(!partyId){socialMessage('Aktif bir partide değilsin.');window.NEON_SOCIAL?.open?.('party');return}
  const partyRef=ref(state.db,`social/parties/${partyId}`),party=(await get(partyRef)).val();
  if(!party){await remove(ref(state.db,`social/userParty/${me.uid}`));socialMessage('Eski parti kaydı temizlendi.');window.NEON_SOCIAL?.open?.('party');return}
  const remaining=Object.keys(party.members||{}).filter(uid=>uid!==me.uid),leader=party.leaderUid===me.uid;
  const changes={[`social/userParty/${me.uid}`]:null};
  if(!remaining.length){
    changes[`social/parties/${partyId}`]=null;
  }else{
    changes[`social/parties/${partyId}/members/${me.uid}`]=null;
    if(leader)changes[`social/parties/${partyId}/leaderUid`]=remaining[0];
  }
  await update(ref(state.db),changes);
  socialMessage('Partiden ayrıldın.');
  toast('PARTİ','Partiden başarıyla ayrıldın.','party',3500);
  setTimeout(()=>window.NEON_SOCIAL?.open?.('party'),50);
}

function roomStatus(text,error=false){
  const el=document.querySelector('[data-nx-room-status]');if(!el)return;el.textContent=text;el.classList.toggle('error',error);
}
function setRoomCode(code=''){
  const el=document.querySelector('[data-nx-room-code]');if(el)el.textContent=code?`ODA KODU: ${code}`:'';
}
async function cancelHostRoom(){
  state.hostRoomOff?.();state.hostRoomOff=null;
  const room=state.hostRoom;state.hostRoom=null;
  if(room)try{await remove(ref(state.db,`social/openRooms/${room.mode}/${room.code}`))}catch{}
  setRoomCode('');roomStatus('Oda kapatıldı.');
}
async function createOpenRoom(mode){
  const me=identity();if(!me){window.NEON_SOCIAL?.open?.('friends');return}
  if(!MATCHABLE.has(mode)){roomStatus('Bu mod için kodlu oda yerine Parti sistemini kullan.',true);return}
  await cancelHostRoom();
  for(let i=0;i<8;i++){
    const code=modeCode(mode),createdAt=Date.now(),matchId=`r_${mode}_${code}_${createdAt}`,r=ref(state.db,`social/openRooms/${mode}/${code}`);
    const tx=await runTransaction(r,current=>{
      if(current&&Date.now()-Number(current.createdAt||0)<10*60*1000)return;
      return {mode,code,hostUid:me.uid,hostName:me.username,createdAt,matchId,status:'waiting'};
    },{applyLocally:false});
    if(!tx.committed)continue;
    state.hostRoom={mode,code,status:'waiting'};
    setRoomCode(code);roomStatus('Oda oluşturuldu. Kodu arkadaşına gönder; katıldığında maç otomatik açılacak.');
    toast('ONLINE ODA',`${code} kodlu oda oluşturuldu.`,'play',4500);
    state.hostRoomOff=onValue(r,s=>{
      const room=s.val();if(!room)return;
      state.hostRoom.status=room.status||'waiting';
      if(room.guestUid&&room.status==='matched'){
        state.hostRoomOff?.();state.hostRoomOff=null;
        roomStatus(`@${room.guestName||'Oyuncu'} katıldı. Maç açılıyor…`);
        setTimeout(()=>navigateRoom(mode,'host',code,me,room.guestUid,room.matchId||matchId),250);
      }
    });
    return;
  }
  roomStatus('Boş oda kodu üretilemedi. Tekrar dene.',true);
}
async function joinOpenRoom(mode,rawCode){
  const me=identity();if(!me){window.NEON_SOCIAL?.open?.('friends');return}
  if(!MATCHABLE.has(mode)){roomStatus('Bu mod için kodlu oda yerine Parti sistemini kullan.',true);return}
  const code=String(rawCode||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
  if(code.length<4){roomStatus('Geçerli oda kodunu yaz.',true);return}
  const r=ref(state.db,`social/openRooms/${mode}/${code}`),before=(await get(r)).val();
  if(!before||Date.now()-Number(before.createdAt||0)>10*60*1000){roomStatus('Bu oda bulunamadı veya süresi doldu.',true);return}
  if(before.hostUid===me.uid){roomStatus('Bu oda zaten sana ait.',true);return}
  const tx=await runTransaction(r,current=>{
    if(!current||current.status!=='waiting'||current.guestUid)return;
    if(Date.now()-Number(current.createdAt||0)>10*60*1000)return;
    return {...current,guestUid:me.uid,guestName:me.username,status:'matched',matchedAt:Date.now()};
  },{applyLocally:false});
  if(!tx.committed){roomStatus('Oda dolu ya da artık açık değil.',true);return}
  const room=tx.snapshot.val();
  roomStatus(`@${room.hostName||'Oyuncu'} odasına katıldın. Maç açılıyor…`);
  setTimeout(()=>navigateRoom(mode,'guest',code,me,room.hostUid,room.matchId||`r_${mode}_${code}`),250);
}

function patchPlayView(){
  const api=window.NEON_SOCIAL;if(!api?.profile)return;
  const view=document.querySelector('.nx-social-view[data-view="play"]');
  const select=view?.querySelector('#nxMode');if(!view||!select)return;
  const match=view.querySelector('[data-act="match"]');
  if(match){match.textContent='OTOMATİK EŞLEŞME';match.title='Arkadaşın olmasa da çevrimiçi bir rakip bulur.'}
  if(!view.querySelector('.nx-social-match-hint')){
    const hint=document.createElement('div');hint.className='nx-social-match-hint';hint.textContent='Arkadaş gerekmez · uygun çevrimiçi rakiple otomatik eşleşirsin.';
    view.querySelector('.nx-social-choice')?.after(hint);
  }
  if(view.querySelector('[data-nx-room-card]'))return;
  const legacy=view.querySelector('[data-act="room-code"]')?.closest('.nx-social-card');
  const card=document.createElement('div');card.className='nx-social-card';card.dataset.nxRoomCard='1';
  card.innerHTML=`<span class="nx-social-label">ONLINE ODA</span><div class="nx-social-muted">Kendi odanı oluştur veya gelen kodla doğrudan katıl. Oyuncu adın hesabından otomatik alınır.</div><div class="nx-social-room-actions"><button class="nx-social-btn primary" type="button" data-nx-create-room>ODA OLUŞTUR</button><button class="nx-social-btn nx-social-danger" type="button" data-nx-cancel-room>ODAYI KAPAT</button></div><div class="nx-social-row" style="margin-top:8px"><input class="nx-social-input" data-nx-room-input maxlength="8" autocomplete="off" placeholder="ODA KODU"><button class="nx-social-btn" type="button" data-nx-join-room>KATIL</button></div><div class="nx-social-room-code" data-nx-room-code></div><div class="nx-social-room-status" data-nx-room-status></div>`;
  legacy?.replaceWith(card);if(!legacy)view.appendChild(card);
  card.querySelector('[data-nx-create-room]').onclick=()=>createOpenRoom(select.value).catch(e=>roomStatus(e?.message||'Oda oluşturulamadı.',true));
  card.querySelector('[data-nx-cancel-room]').onclick=()=>cancelHostRoom().catch(()=>{});
  card.querySelector('[data-nx-join-room]').onclick=()=>joinOpenRoom(select.value,card.querySelector('[data-nx-room-input]').value).catch(e=>roomStatus(e?.message||'Odaya katılınamadı.',true));
  if(state.hostRoom){setRoomCode(state.hostRoom.code);roomStatus(state.hostRoom.status==='waiting'?'Oda açık; rakip bekleniyor.':'Rakip bulundu.');}
}

function ensureHomeBadge(){
  const canvas=document.querySelector('#bootHome.nx-approved-home-v1 .nx-approved-canvas');if(!canvas)return null;
  let badge=canvas.querySelector('.nx-social-home-badge');if(!badge){badge=document.createElement('div');badge.className='nx-social-home-badge';canvas.appendChild(badge)}return badge;
}
function updateBadge(count){
  state.notifications=count;
  const badge=ensureHomeBadge();if(!badge)return;
  badge.textContent=count>99?'99+':String(count);badge.classList.toggle('show',count>0);
}
function seenKey(type,userUid,key){return `nxSocialSeen:${type}:${userUid}:${key}`}
function bindNotifications(user){
  state.requestOff?.();state.inviteOff?.();state.requestOff=state.inviteOff=null;
  state.requestOff=onValue(ref(state.db,`social/friendRequests/${user.uid}`),s=>{
    const data=s.val()||{};
    for(const [fromUid,x] of Object.entries(data)){
      const k=seenKey('friend',user.uid,fromUid);if(sessionStorage.getItem(k))continue;sessionStorage.setItem(k,'1');
      toast('ARKADAŞLIK İSTEĞİ',`${x?.username||'Bir oyuncu'} arkadaşın olmak istiyor.`,'friends');
    }
    refreshNotificationCount(user.uid);
  });
  state.inviteOff=onValue(ref(state.db,`social/partyInvites/${user.uid}`),s=>{
    const data=s.val()||{};
    for(const [partyId,x] of Object.entries(data)){
      const k=seenKey('party',user.uid,partyId);if(sessionStorage.getItem(k))continue;sessionStorage.setItem(k,'1');
      toast('PARTİ DAVETİ',`${x?.fromName||'Bir oyuncu'} seni partisine çağırıyor.`,'party');
    }
    refreshNotificationCount(user.uid);
  });
}
async function refreshNotificationCount(uid){
  try{
    const [r,i]=await Promise.all([get(ref(state.db,`social/friendRequests/${uid}`)),get(ref(state.db,`social/partyInvites/${uid}`))]);
    updateBadge(Object.keys(r.val()||{}).length+Object.keys(i.val()||{}).length);
  }catch{}
}

function bindDomPatches(){
  const observer=new MutationObserver(()=>{identity();patchPlayView();ensureHomeBadge();updateBadge(state.notifications)});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setInterval(()=>{identity();patchPlayView();ensureHomeBadge();updateBadge(state.notifications)},750);
  document.addEventListener('click',e=>{
    const leave=e.target.closest('.nx-social-shade [data-act="leave-party"]');
    if(leave){e.preventDefault();e.stopImmediatePropagation();leave.disabled=true;leavePartyFixed().catch(err=>{leave.disabled=false;socialMessage(err?.message||'Partiden çıkılamadı.',true)});return}
    const online=e.target.closest('#bootHome.nx-approved-home-v1 .h-online');
    if(online){e.preventDefault();e.stopImmediatePropagation();window.NEON_SOCIAL?.open?.('play');}
  },true);
}

function boot(){
  injectStyle();bindDomPatches();
  const wait=setInterval(()=>{
    if(!window.NEON_SOCIAL||!getApps().length)return;
    clearInterval(wait);state.ready=true;state.auth=getAuth(getApp());state.db=getDatabase(getApp());
    state.userOff=onAuthStateChanged(state.auth,user=>{
      state.requestOff?.();state.inviteOff?.();state.requestOff=state.inviteOff=null;updateBadge(0);
      if(!user)return;
      bindNotifications(user);setTimeout(()=>{identity();patchPlayView()},100);
    });
  },50);
}

window.addEventListener('beforeunload',()=>{
  if(state.hostRoom?.status==='waiting')remove(ref(state.db,`social/openRooms/${state.hostRoom.mode}/${state.hostRoom.code}`)).catch(()=>{});
});
boot();
