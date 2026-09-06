import {initializeApp,getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,get,onValue,ref,remove,runTransaction,serverTimestamp,set,update} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const CONFIG={apiKey:'AIzaSyBLpXHGGTHXykKrnu8_Hv1i71oc3tpTNvY',authDomain:'neonxi.firebaseapp.com',databaseURL:'https://neonxi-default-rtdb.europe-west1.firebasedatabase.app',projectId:'neonxi',storageBucket:'neonxi.firebasestorage.app',messagingSenderId:'667191549799',appId:'1:667191549799:web:1e40feacbee09ed7f3d9c2'};
const MODES={
  draft:{label:'NEON XI Draft',path:'index.html',code:'alpha6',min:2,max:2,roomPath:code=>`rooms/${code}`},
  xox:{label:'Futbol XOX',path:'side-games/football-xox/index.html',code:'numeric4',min:2,max:2,roomPath:code=>`rooms/XOX-${code}`},
  twin:{label:'Kariyer İkizi',path:'side-games/career-twin/index.html',code:'numeric4',min:2,max:2,roomPath:code=>`rooms/CT-${code}`},
  imposter:{label:'Futbol Imposter',path:'side-games/futbol-imposter.html',code:'alpha5',min:3,max:12,roomPath:code=>`rooms/IMP-${code}`}
};
const app=getApps().length?getApp():initializeApp(CONFIG),auth=getAuth(app),db=getDatabase(app),base=new URL('../',import.meta.url);
const q=new URLSearchParams(location.search);
const READY_TIMEOUT_MS=12000,LAUNCH_TTL_MS=60000,PENDING_TTL_MS=90000,MAX_HOST_ATTEMPTS=3;
let currentUser=null,partyWatchOff=null,pendingWatchOff=null,booted=false;

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const status=(text,error=false)=>{const el=document.querySelector('.nx-social-status');if(!el)return;el.textContent=text;el.classList.toggle('error',Boolean(error))};
const safeSession=(k,v)=>{try{sessionStorage.setItem(k,v)}catch{}};
const codeFor=mode=>{
  const kind=MODES[mode]?.code;
  if(kind==='numeric4')return String(Math.floor(1000+Math.random()*9000));
  const len=kind==='alpha5'?5:6,chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let out='';
  for(let i=0;i<len;i++)out+=chars[Math.floor(Math.random()*chars.length)];
  return out;
};
const modeUrl=(mode,params)=>{const u=new URL(MODES[mode].path,base);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,String(v)));return u.href};
const leasePath=(mode,code)=>`social/partyRoomLeases/${mode}/${code}`;

async function waitForUser(timeout=4000){
  if(auth.currentUser)return auth.currentUser;
  return new Promise(resolve=>{
    let done=false,off=()=>{};
    const finish=u=>{if(done)return;done=true;try{off()}catch{}resolve(u||auth.currentUser||null)};
    off=onAuthStateChanged(auth,finish,()=>finish(null));
    setTimeout(()=>finish(auth.currentUser),timeout);
  });
}

async function partyContext(user){
  const partyId=String((await get(ref(db,`social/userParty/${user.uid}`))).val()||'');
  if(!partyId)throw new Error('Aktif parti bulunamadı.');
  const party=(await get(ref(db,`social/parties/${partyId}`))).val();
  if(!party)throw new Error('Parti kaydı artık mevcut değil.');
  return {partyId,party};
}

function validateParty(mode,party,user){
  const cfg=MODES[mode];if(!cfg)throw new Error('Bu oyun parti brokerı tarafından desteklenmiyor.');
  if(party.leaderUid!==user.uid)throw new Error('Oyunu yalnızca parti lideri başlatabilir.');
  const members=Object.keys(party.members||{});
  if(members.length<cfg.min)throw new Error(`${cfg.label} için en az ${cfg.min} oyuncu gerekli.`);
  if(members.length>cfg.max)throw new Error(`${cfg.label} en fazla ${cfg.max} oyuncuyu destekliyor.`);
  return members;
}

function staleRoom(mode,room){
  if(!room)return true;
  if(room.status==='closed')return true;
  const now=Date.now(),expiry=Number(room.expires_ms||room.expiresAt||0);
  if(expiry&&expiry<now)return true;
  if(mode==='draft'){
    const updated=Number(room.updatedAt||room.createdAt||0),connected=Object.values(room.players||{}).some(p=>p?.connected===true);
    if(updated&&now-updated>15*60*1000&&!connected)return true;
  }
  return false;
}

async function releaseLease(mode,code,matchId){
  if(!mode||!code||!matchId)return;
  try{
    const leaseRef=ref(db,leasePath(mode,code)),lease=(await get(leaseRef)).val();
    if(lease?.matchId===matchId)await remove(leaseRef);
  }catch(e){console.warn('[NEON XI] room lease cleanup skipped',e)}
}

async function pickFreeCode(mode,matchId){
  const cfg=MODES[mode];
  for(let attempt=0;attempt<60;attempt++){
    const code=codeFor(mode),now=Date.now(),leaseRef=ref(db,leasePath(mode,code));
    const leaseTx=await runTransaction(leaseRef,current=>{
      if(current&&Number(current.expiresAt||0)>now&&current.matchId!==matchId)return;
      return {matchId,createdAt:now,expiresAt:now+PENDING_TTL_MS};
    },{applyLocally:false});
    if(!leaseTx.committed)continue;
    const roomRef=ref(db,cfg.roomPath(code)),snap=await get(roomRef),room=snap.val();
    if(!snap.exists())return code;
    if(staleRoom(mode,room)){
      try{await remove(roomRef);return code}catch(e){console.warn('[NEON XI] stale room cleanup skipped',mode,code,e)}
    }
    await releaseLease(mode,code,matchId);
  }
  throw new Error(`${cfg.label} için boş oda kodu bulunamadı.`);
}

function hostTarget(mode,pending,user,party,attempt=0){
  const members=Array.isArray(pending.members)?pending.members:Object.keys(pending.roles||{}),opponent=members.find(uid=>uid!==user.uid)||'',name=party?.members?.[user.uid]?.username||q.get('nxName')||'NEON Oyuncu';
  return modeUrl(mode,{nxParty:pending.partyId,nxLaunch:pending.nonce,nxBroker:'1',nxBrokerAttempt:attempt,nxAuto:'1',nxRole:'host',nxCode:pending.roomCode,nxPartySize:pending.partySize,nxName:name,nxUid:user.uid,nxOpponent:opponent,nxMatch:pending.matchId});
}

async function startBrokeredParty(mode,button){
  button.disabled=true;status('Parti maçı hazırlanıyor…');
  try{
    const user=currentUser||await waitForUser();if(!user)throw new Error('Önce hesabınla giriş yap.');
    const {partyId,party}=await partyContext(user),members=validateParty(mode,party,user),nonce=`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,matchId=`pb_${partyId}_${nonce}`,roomCode=await pickFreeCode(mode,matchId);
    const roles=Object.fromEntries(members.map(uid=>[uid,uid===user.uid?'host':'guest'])),createdMs=Date.now();
    const pending={mode,nonce,matchId,roomCode,hostUid:user.uid,partyId,partySize:members.length,members,roles,status:'host_booting',attempt:0,createdAt:serverTimestamp(),createdMs,expiresAt:createdMs+PENDING_TTL_MS};
    await update(ref(db),{[`social/parties/${partyId}/launch`]:null,[`social/partyPending/${partyId}`]:pending});
    safeSession('nxPartyLaunch',nonce);safeSession('nxPartyBrokerHost',matchId);
    status('Lider odası kuruluyor. Arkadaşların oda hazır olunca otomatik bağlanacak…');
    location.href=hostTarget(mode,pending,user,party,0);
  }catch(e){console.error('[NEON XI] party broker start failed',e);status(e?.message||'Parti maçı hazırlanamadı.',true);button.disabled=false}
}

function roomReady(mode,room,user,code){
  if(!room)return false;
  if(mode==='draft')return room.status!=='closed'&&(room.hostUid===user.uid||room.players?.A?.uid===user.uid);
  if(mode==='twin')return room.gameType==='career-twin'&&room.status!=='closed'&&room.hostUid===user.uid;
  if(mode==='imposter')return room.game_type==='futbol-imposter'&&room.status!=='closed'&&String(room.room_code||'')===String(code);
  if(mode==='xox')return room.game_type==='football-xox'&&room.status!=='closed'&&String(room.room_code||'')===String(code);
  return false;
}

async function markFailed(partyId,nonce,reason){
  const pendingRef=ref(db,`social/partyPending/${partyId}`),snap=await get(pendingRef),p=snap.val();
  if(!p||p.nonce!==nonce)return;
  await update(pendingRef,{status:'failed',failureReason:reason||'ROOM_NOT_READY',failedAt:serverTimestamp(),expiresAt:Date.now()+30000});
}

async function retryHost(user,pending,attempt){
  const oldCode=pending.roomCode,mode=pending.mode,newCode=await pickFreeCode(mode,pending.matchId);
  await releaseLease(mode,oldCode,pending.matchId);
  const pendingRef=ref(db,`social/partyPending/${pending.partyId}`),fresh=(await get(pendingRef)).val();
  if(!fresh||fresh.nonce!==pending.nonce)return false;
  const nextAttempt=attempt+1,next={...fresh,roomCode:newCode,status:'host_retrying',attempt:nextAttempt,expiresAt:Date.now()+PENDING_TTL_MS};
  await update(pendingRef,{roomCode:newCode,status:'host_retrying',attempt:nextAttempt,retryAt:serverTimestamp(),expiresAt:next.expiresAt});
  const party=(await get(ref(db,`social/parties/${pending.partyId}`))).val();
  status(`Oda kurulamadı; otomatik yeniden deneniyor (${nextAttempt+1}/${MAX_HOST_ATTEMPTS})…`);
  location.replace(hostTarget(mode,next,user,party,nextAttempt));
  return true;
}

async function publishReadyLaunch(user){
  const partyId=q.get('nxParty')||'',nonce=q.get('nxLaunch')||'',code=q.get('nxCode')||'',role=q.get('nxRole')||'',attempt=Math.max(0,Number(q.get('nxBrokerAttempt'))||0);
  if(q.get('nxBroker')!=='1'||role!=='host'||!partyId||!nonce||!code)return;
  const pendingRef=ref(db,`social/partyPending/${partyId}`),pending=(await get(pendingRef)).val();
  if(!pending||pending.nonce!==nonce||pending.hostUid!==user.uid){console.warn('[NEON XI] broker pending mismatch');return}
  if(pending.roomCode!==code){console.warn('[NEON XI] broker ignored obsolete host attempt',code);return}
  const mode=pending.mode,cfg=MODES[mode];if(!cfg)return;
  const started=Date.now();let room=null;
  while(Date.now()-started<READY_TIMEOUT_MS){
    const snap=await get(ref(db,cfg.roomPath(code)));room=snap.val();
    if(roomReady(mode,room,user,code))break;
    await sleep(250);
  }
  if(!roomReady(mode,room,user,code)){
    if(attempt+1<MAX_HOST_ATTEMPTS){await retryHost(user,pending,attempt);return}
    await releaseLease(mode,code,pending.matchId);await markFailed(partyId,nonce,'HOST_ROOM_TIMEOUT');
    console.error('[NEON XI] host room did not become ready after retries',mode,code);return;
  }
  const now=Date.now(),launch={mode,nonce,matchId:pending.matchId,at:serverTimestamp(),readyAt:serverTimestamp(),status:'ready',expiresAt:now+LAUNCH_TTL_MS,roomCode:code,partySize:pending.partySize,roles:pending.roles};
  await update(ref(db),{
    [`social/parties/${partyId}/launch`]:launch,
    [`social/partyPending/${partyId}/status`]:'ready',
    [`social/partyPending/${partyId}/readyAt`]:serverTimestamp(),
    [`social/partyPending/${partyId}/expiresAt`]:now+LAUNCH_TTL_MS,
    [`social/partyPending/${partyId}/acks/${user.uid}`]:serverTimestamp()
  });
  console.info('[NEON XI] party room ready',mode,code);
}

async function acknowledgeArrival(user){
  const partyId=q.get('nxParty')||'',nonce=q.get('nxLaunch')||'';
  if(!partyId||!nonce||q.get('nxAuto')!=='1')return;
  const pendingRef=ref(db,`social/partyPending/${partyId}`),p=(await get(pendingRef)).val();
  if(!p||p.nonce!==nonce)return;
  await set(ref(db,`social/partyPending/${partyId}/acks/${user.uid}`),serverTimestamp());
  const fresh=(await get(pendingRef)).val(),ackCount=Object.keys(fresh?.acks||{}).length;
  if(ackCount>=Number(fresh?.partySize||0)){
    setTimeout(async()=>{
      try{
        const latest=(await get(pendingRef)).val();if(!latest||latest.nonce!==nonce)return;
        const launchRef=ref(db,`social/parties/${partyId}/launch`),launch=(await get(launchRef)).val();
        if(launch?.nonce===nonce)await remove(launchRef);
        await releaseLease(latest.mode,latest.roomCode,latest.matchId);await remove(pendingRef);
      }catch(e){console.warn('[NEON XI] broker cleanup skipped',e)}
    },2500);
  }
}

async function cleanupStale(user){
  try{
    const partyId=String((await get(ref(db,`social/userParty/${user.uid}`))).val()||'');if(!partyId)return;
    const now=Date.now(),pendingRef=ref(db,`social/partyPending/${partyId}`),launchRef=ref(db,`social/parties/${partyId}/launch`);
    const [pSnap,lSnap]=await Promise.all([get(pendingRef),get(launchRef)]),p=pSnap.val(),l=lSnap.val();
    if(p?.expiresAt&&Number(p.expiresAt)<now){await releaseLease(p.mode,p.roomCode,p.matchId);await remove(pendingRef)}
    if(l?.nonce&&(!l.expiresAt||Number(l.expiresAt)<now)){safeSession('nxPartyLaunch',l.nonce);await remove(launchRef)}
  }catch(e){console.warn('[NEON XI] broker stale cleanup skipped',e)}
}

function watchPendingForStatus(user){
  partyWatchOff?.();pendingWatchOff?.();
  partyWatchOff=onValue(ref(db,`social/userParty/${user.uid}`),s=>{
    const partyId=String(s.val()||'');pendingWatchOff?.();pendingWatchOff=null;if(!partyId)return;
    pendingWatchOff=onValue(ref(db,`social/partyPending/${partyId}`),p=>{
      const x=p.val();if(!x)return;
      if(x.status==='host_booting'||x.status==='host_retrying')status(x.status==='host_retrying'?'Parti lideri oda bağlantısını yeniden kuruyor…':'Parti lideri oyun odasını hazırlıyor…');
      else if(x.status==='failed')status('Oyun odası kurulamadı. Parti lideri yeniden başlatabilir.',true);
    });
  });
}

document.addEventListener('click',event=>{
  const button=event.target.closest('.nx-social-shade [data-act="launch-party"]');if(!button)return;
  const mode=document.querySelector('.nx-social-shade #nxPartyMode')?.value;if(!MODES[mode])return;
  event.preventDefault();event.stopImmediatePropagation();startBrokeredParty(mode,button);
},true);

onAuthStateChanged(auth,async user=>{
  currentUser=user||null;if(!user)return;
  if(!booted){booted=true;cleanupStale(user).catch(()=>{});watchPendingForStatus(user)}
  try{await publishReadyLaunch(user)}catch(e){console.error('[NEON XI] broker readiness failed',e);const partyId=q.get('nxParty'),nonce=q.get('nxLaunch');if(partyId&&nonce)await markFailed(partyId,nonce,e?.message||'BROKER_ERROR')}
  try{await acknowledgeArrival(user)}catch(e){console.warn('[NEON XI] broker ack skipped',e)}
});

window.NEON_PARTY_BROKER={version:'1.2',modes:Object.keys(MODES)};
