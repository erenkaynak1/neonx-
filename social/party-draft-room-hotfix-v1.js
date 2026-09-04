import {initializeApp,getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,get,ref,remove,runTransaction,serverTimestamp,set} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

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

async function reserveDraftRoom(user,teamName){
  for(let attempt=0;attempt<30;attempt++){
    const roomCode=randomDraftCode();
    const roomReference=ref(db,`rooms/${roomCode}`);
    const result=await runTransaction(roomReference,currentRoom=>{
      if(currentRoom!==null)return;
      return {
        version:'1.19-online-match-sync',
        status:'waiting',
        createdAt:serverTimestamp(),
        updatedAt:serverTimestamp(),
        hostUid:user.uid,
        players:{
          A:{
            uid:user.uid,
            name:teamName||'NEON Oyuncu',
            connected:true,
            joinedAt:serverTimestamp()
          }
        }
      };
    },{applyLocally:false});
    if(result.committed)return roomCode;
  }
  throw new Error('Draft odası oluşturulamadı. Lütfen tekrar dene.');
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
  status('Parti için Draft odası oluşturuluyor…');
  let createdRoomCode='';
  try{
    const {user,partyId,party}=await currentPartyContext();
    if(party.leaderUid!==user.uid)throw new Error('Oyunu yalnızca parti lideri başlatabilir.');
    const members=Object.keys(party.members||{});
    if(members.length!==2)throw new Error('Draft 1v1 için partide tam iki oyuncu olmalı.');

    if(party.launch)await remove(ref(db,`social/parties/${partyId}/launch`));

    const teamName=party.members?.[user.uid]?.username||'NEON Oyuncu';
    const roomCode=await reserveDraftRoom(user,teamName);
    createdRoomCode=roomCode;
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
    status('Draft odası hazır. İki oyuncu da aynı lobiye aktarılıyor…');
  }catch(error){
    if(createdRoomCode){
      try{await remove(ref(db,`rooms/${createdRoomCode}`));}catch(cleanupError){console.warn('[NEON XI] failed to clean reserved room',cleanupError)}
    }
    console.error('[NEON XI] safe party Draft launch failed',error);
    status(error?.message||'Parti Draft odası kurulamadı.',true);
    button.disabled=false;
  }
}

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
