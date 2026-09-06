import {initializeApp,getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,get,ref,runTransaction,serverTimestamp,set,update} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const CONFIG={apiKey:'AIzaSyBLpXHGGTHXykKrnu8_Hv1i71oc3tpTNvY',authDomain:'neonxi.firebaseapp.com',databaseURL:'https://neonxi-default-rtdb.europe-west1.firebasedatabase.app',projectId:'neonxi',storageBucket:'neonxi.firebasestorage.app',messagingSenderId:'667191549799',appId:'1:667191549799:web:1e40feacbee09ed7f3d9c2'};
const app=getApps().length?getApp():initializeApp(CONFIG),auth=getAuth(app),db=getDatabase(app),base=new URL('../',import.meta.url);
const CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const status=(text,error=false)=>{const el=document.querySelector('.nx-social-status');if(!el)return;el.textContent=text;el.classList.toggle('error',Boolean(error))};
const code=()=>{let out='';for(let i=0;i<6;i++)out+=CHARS[Math.floor(Math.random()*CHARS.length)];return out};
const safeSession=(k,v)=>{try{sessionStorage.setItem(k,v)}catch{}};

async function waitUser(timeout=4000){
  if(auth.currentUser)return auth.currentUser;
  return new Promise(resolve=>{
    let done=false,off=()=>{};
    const finish=u=>{if(done)return;done=true;try{off()}catch{}resolve(u||auth.currentUser||null)};
    off=onAuthStateChanged(auth,finish,()=>finish(null));
    setTimeout(()=>finish(auth.currentUser),timeout);
  });
}

async function createTournamentRoom(user,name,size){
  for(let attempt=0;attempt<50;attempt++){
    const roomCode=code(),now=Date.now(),rr=ref(db,`rooms/${roomCode}`);
    const tx=await runTransaction(rr,current=>{
      if(current!==null)return;
      return {
        version:'2.0-online-tournament',mode:'tournament',status:'lobby',size,
        hostUid:user.uid,createdAt:now,updatedAt:now,
        players:{[user.uid]:{uid:user.uid,name,teamIndex:0,connected:true,joinedAt:now}}
      };
    },{applyLocally:false});
    if(tx.committed)return roomCode;
  }
  throw new Error('Turnuva odası oluşturulamadı. Lütfen tekrar dene.');
}

async function launchTournament(button){
  button.disabled=true;
  try{
    const user=await waitUser();if(!user)throw new Error('Önce hesabınla giriş yap.');
    const partyId=String((await get(ref(db,`social/userParty/${user.uid}`))).val()||'');
    if(!partyId)throw new Error('Aktif parti bulunamadı.');
    const party=(await get(ref(db,`social/parties/${partyId}`))).val();
    if(!party)throw new Error('Parti artık mevcut değil.');
    if(party.leaderUid!==user.uid)throw new Error('Turnuvayı yalnızca parti lideri başlatabilir.');
    const members=Object.keys(party.members||{});
    if(members.length<=2)throw new Error('Turnuva yönlendirmesi için en az 3 oyuncu gerekli.');
    if(members.length>8)throw new Error('NEON XI turnuvası en fazla 8 parti oyuncusunu destekliyor.');
    const tournamentSize=members.length<=4?4:8;
    const name=party.members?.[user.uid]?.username||window.NEON_SOCIAL?.profile?.username||'NEON Oyuncu';
    status(`${members.length} kişilik parti algılandı. ${tournamentSize}'li turnuva hazırlanıyor…`);
    const roomCode=await createTournamentRoom(user,name,tournamentSize);
    const nonce=`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,matchId=`pt_${partyId}_${nonce}`;
    const roles=Object.fromEntries(members.map(uid=>[uid,uid===user.uid?'host':'guest']));
    const launch={mode:'draft',nonce,matchId,at:serverTimestamp(),status:'ready',roomCode,partySize:members.length,tournament:true,tournamentSize,roles};
    await update(ref(db),{[`social/partyPending/${partyId}`]:null,[`social/parties/${partyId}/launch`]:launch});
    safeSession('nxPartyLaunch',nonce);
    const opponent=members.find(uid=>uid!==user.uid)||'';
    const target=new URL('index.html',base);
    const params={nxParty:partyId,nxLaunch:nonce,nxAuto:'1',nxTournament:'1',nxTournamentSize:tournamentSize,nxRole:'host',nxCode:roomCode,nxPartySize:members.length,nxName:name,nxUid:user.uid,nxOpponent:opponent,nxMatch:matchId};
    Object.entries(params).forEach(([k,v])=>target.searchParams.set(k,String(v)));
    status('Turnuva odası hazır. Parti turnuvaya aktarılıyor…');
    location.href=target.href;
  }catch(e){console.error('[NEON XI] party tournament routing failed',e);status(e?.message||'Turnuva başlatılamadı.',true);button.disabled=false}
}

document.addEventListener('click',event=>{
  const button=event.target.closest('.nx-social-shade [data-act="launch-party"]');if(!button)return;
  const mode=document.querySelector('.nx-social-shade #nxPartyMode')?.value;if(mode!=='draft')return;
  const party=window.NEON_SOCIAL?.party,members=Object.keys(party?.members||{});
  if(members.length<=2)return;
  event.preventDefault();event.stopImmediatePropagation();
  launchTournament(button);
},true);

window.NEON_DRAFT_PARTY_ROUTER={version:'1.0',rule:'2=1v1,3-4=4-team,5-8=8-team'};
