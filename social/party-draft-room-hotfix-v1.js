import {initializeApp,getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,get,ref,remove,serverTimestamp,set} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const CONFIG={apiKey:'AIzaSyBLpXHGGTHXykKrnu8_Hv1i71oc3tpTNvY',authDomain:'neonxi.firebaseapp.com',databaseURL:'https://neonxi-default-rtdb.europe-west1.firebasedatabase.app',projectId:'neonxi',storageBucket:'neonxi.firebasestorage.app',messagingSenderId:'667191549799',appId:'1:667191549799:web:1e40feacbee09ed7f3d9c2'};
const app=getApps().length?getApp():initializeApp(CONFIG);
const auth=getAuth(app);
const db=getDatabase(app);
const CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STALE_LAUNCH_MS=2*60*1000;

function status(text,error=false){
  const el=document.querySelector('.nx-social-status');
  if(!el)return;
  el.textContent=text;
  el.classList.toggle('error',Boolean(error));
}

function randomDraftCode(){
  let out='';
  for(let i=0;i<6;i++)out+=CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)];
  return out;
}

async function currentPartyContext(){
  const user=auth.currentUser;
  if(!user)throw new Error('Önce hesabınla giriş yap.');
  const partyId=String((await get(ref(db,`social/userParty/${user.uid}`))).val()||'');
  if(!partyId)throw new Error('Aktif bir parti bulunamadı.');
  const party=(await get(ref(db,`social/parties/${partyId}`))).val();
  if(!party)throw new Error('Parti artık mevcut değil.');
  return {user,partyId,party};
}

async function findUnusedDraftRoomCode(){
  for(let attempt=0;attempt<30;attempt++){
    const roomCode=randomDraftCode();
    const room=await get(ref(db,`rooms/${roomCode}`));
    if(!room.exists())return roomCode;
  }
  throw new Error('Boş Draft odası üretilemedi. Tekrar dene.');
}

async function clearStaleLaunchForLeader(user){
  try{
    const partyId=String((await get(ref(db,`social/userParty/${user.uid}`))).val()||'');
    if(!partyId)return;
    const partyRef=ref(db,`social/parties/${partyId}`);
    const party=(await get(partyRef)).val();
    if(!party||party.leaderUid!==user.uid||!party.launch)return;
    const at=Number(party.launch.at||0);
    if(at&&Date.now()-at>STALE_LAUNCH_MS)await remove(ref(db,`social/parties/${partyId}/launch`));
  }catch(error){
    console.warn('[NEON XI] stale party launch cleanup skipped',error);
  }
}

async function launchDraftPartySafely(button){
  button.disabled=true;
  status('Parti için boş Draft odası hazırlanıyor…');
  try{
    const {user,partyId,party}=await currentPartyContext();
    if(party.leaderUid!==user.uid)throw new Error('Oyunu yalnızca parti lideri başlatabilir.');
    const members=Object.keys(party.members||{});
    if(members.length!==2)throw new Error('Draft 1v1 için partide tam iki oyuncu olmalı.');

    // Eski launch verisini yeni oyuna taşımıyoruz. Yeni deneme her zaman yeni nonce + yeni oda kodu alır.
    if(party.launch)await remove(ref(db,`social/parties/${partyId}/launch`));

    const roomCode=await findUnusedDraftRoomCode();
    const nonce=`${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const launch={
      mode:'draft',
      nonce,
      matchId:`p_${partyId}_${nonce}`,
      at:serverTimestamp(),
      roomCode,
      partySize:members.length,
      roles:Object.fromEntries(members.map(uid=>[uid,uid===party.leaderUid?'host':'guest']))
    };

    await set(ref(db,`social/parties/${partyId}/launch`),launch);
    status('Boş oda bulundu. İki oyuncu da Draft lobisine aktarılıyor…');
    // neon-social.js parti launch dinleyicisi iki oyuncuyu da aynı nxCode ile otomatik yönlendirir.
  }catch(error){
    console.error('[NEON XI] safe party Draft launch failed',error);
    status(error?.message||'Parti Draft odası kurulamadı.',true);
    button.disabled=false;
  }
}

// Base social handler hedef butonda çalışmadan önce Draft parti başlatmasını güvenli akışa al.
document.addEventListener('click',event=>{
  const button=event.target.closest('.nx-social-shade [data-act="launch-party"]');
  if(!button)return;
  const mode=document.querySelector('.nx-social-shade #nxPartyMode')?.value;
  if(mode!=='draft')return;
  event.preventDefault();
  event.stopImmediatePropagation();
  launchDraftPartySafely(button);
},true);

onAuthStateChanged(auth,user=>{if(user)clearStaleLaunchForLeader(user)});
