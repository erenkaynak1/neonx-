import {getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,get,onValue,ref,remove,runTransaction,serverTimestamp,set,update} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const DEFAULT_GRACE_MS=30000;
const GRACE_MS=Math.max(750,Number(globalThis.__NEON_SOCIAL_GRACE_MS__||DEFAULT_GRACE_MS));
const HEARTBEAT_MS=Math.max(1000,Math.min(5000,Math.floor(GRACE_MS/3)));
const state={
  auth:null,db:null,user:null,profile:null,
  authOff:null,profileOff:null,friendsOff:null,requestsOff:null,invitesOff:null,pointerOff:null,partyOff:null,connectedOff:null,
  friends:{},requests:{},invites:{},partyId:'',party:null,
  memberPresence:new Map(),offlineTimers:new Map(),joiningParties:new Set(),
  heartbeatTimer:null,connected:false,reconcileBusy:false,booted:false
};

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const now=()=>Date.now();
const connections=value=>Object.keys(value?.connections||value||{}).length;
const activeKey=uid=>`nxSocialIntegrity:lastNetwork:${uid}`;
const disconnectKey=uid=>`nxSocialIntegrity:disconnectAt:${uid}`;

function status(text,error=false){
  const legacy=document.querySelector('.nx-social-status');
  if(legacy){legacy.textContent=text;legacy.classList.toggle('error',Boolean(error))}
  const drawer=document.querySelector('.nx-social-drawer-layer.open .nx-drawer-status');
  if(drawer){drawer.textContent=text;drawer.classList.toggle('error',Boolean(error));drawer.classList.add('show')}
}
function safeStorageGet(key){try{return Number(localStorage.getItem(key)||0)}catch{return 0}}
function safeStorageSet(key,value){try{localStorage.setItem(key,String(value))}catch{}}
function safeStorageRemove(key){try{localStorage.removeItem(key)}catch{}}
function username(){return state.profile?.username||window.NEON_SOCIAL?.profile?.username||'NEON Oyuncu'}

async function loadProfile(){
  if(!state.user)return null;
  if(state.profile?.username)return state.profile;
  state.profile=(await get(ref(state.db,`social/profiles/${state.user.uid}`))).val()||null;
  return state.profile;
}

async function currentPartyId(uid=state.user?.uid,{repair=true}={}){
  if(!uid||!state.db)return '';
  const pointer=ref(state.db,`social/userParty/${uid}`);
  const id=String((await get(pointer)).val()||'');
  if(!id)return '';
  const party=(await get(ref(state.db,`social/parties/${id}`))).val();
  if(party?.members?.[uid])return id;
  if(repair&&uid===state.user?.uid){
    await runTransaction(pointer,value=>String(value||'')===id?null:value,{applyLocally:false});
  }
  return '';
}

function orderedMembers(members={}){
  return Object.entries(members).sort((a,b)=>{
    const at=Number(a[1]?.joinedAt||0),bt=Number(b[1]?.joinedAt||0);
    return at-bt||a[0].localeCompare(b[0]);
  }).map(([uid])=>uid);
}

async function removeMemberFromParty(partyId,uid,{reason='leave'}={}){
  if(!partyId||!uid||!state.db)return {changed:false};
  const partyRef=ref(state.db,`social/parties/${partyId}`);
  const tx=await runTransaction(partyRef,current=>{
    if(!current?.members?.[uid])return current;
    const members={...(current.members||{})};
    delete members[uid];
    const remaining=orderedMembers(members);
    if(!remaining.length)return null;
    const next={...current,members,updatedAt:now()};
    if(next.leaderUid===uid||!members[next.leaderUid])next.leaderUid=remaining[0];
    if(next.launch)delete next.launch;
    return next;
  },{applyLocally:false});
  try{
    await runTransaction(ref(state.db,`social/userParty/${uid}`),value=>String(value||'')===partyId?null:value,{applyLocally:false});
  }catch(error){
    console.warn('[NEON XI] userParty pointer cleanup failed',reason,uid,error);
  }
  if(tx.committed)document.dispatchEvent(new CustomEvent('neon-party-integrity-change',{detail:{partyId,uid,reason}}));
  return {changed:tx.committed,party:tx.snapshot?.val()||null};
}

async function leaveCurrentParty({silent=false,reason='manual'}={}){
  if(!state.user)return {left:false,reason:'NO_USER'};
  const id=await currentPartyId();
  if(!id)return {left:false,reason:'NO_PARTY'};
  await removeMemberFromParty(id,state.user.uid,{reason});
  if(!silent)status('Partiden ayrıldın.');
  return {left:true,partyId:id};
}

async function ensureParty(){
  if(!state.user)throw new Error('Aktif oyuncu oturumu bulunamadı.');
  const profile=await loadProfile();
  if(!profile?.username)throw new Error('Önce oyuncu adını oluştur.');
  for(let attempt=0;attempt<3;attempt++){
    const existing=await currentPartyId();
    if(existing)return existing;
    const candidate=`p_${state.user.uid.slice(0,8)}_${now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
    const candidateRef=ref(state.db,`social/parties/${candidate}`);
    await set(candidateRef,{leaderUid:state.user.uid,createdAt:serverTimestamp(),members:{[state.user.uid]:{username:profile.username,joinedAt:serverTimestamp()}}});
    const pointer=ref(state.db,`social/userParty/${state.user.uid}`);
    const claim=await runTransaction(pointer,value=>value||candidate,{applyLocally:false});
    const chosen=String(claim.snapshot?.val()||'');
    if(chosen===candidate)return candidate;
    await remove(candidateRef).catch(()=>{});
    const valid=await currentPartyId();
    if(valid)return valid;
    await sleep(20+attempt*25);
  }
  throw new Error('Parti üyeliği güvenli biçimde oluşturulamadı.');
}

async function targetActiveParty(uid){
  const id=String((await get(ref(state.db,`social/userParty/${uid}`))).val()||'');
  if(!id)return '';
  const party=(await get(ref(state.db,`social/parties/${id}`))).val();
  return party?.members?.[uid]?id:'';
}

async function inviteToParty(uid){
  if(!state.user||!uid)throw new Error('Oyuncu bulunamadı.');
  if(uid===state.user.uid)throw new Error('Kendini partiye davet edemezsin.');
  const id=await ensureParty();
  const party=(await get(ref(state.db,`social/parties/${id}`))).val();
  if(!party?.members?.[state.user.uid])throw new Error('Aktif parti bulunamadı.');
  if(party.members?.[uid]){
    await remove(ref(state.db,`social/partyInvites/${uid}/${id}`)).catch(()=>{});
    status('Bu oyuncu zaten partide.');
    return {partyId:id,alreadyMember:true};
  }
  const other=await targetActiveParty(uid);
  if(other&&other!==id)throw new Error('Bu oyuncu şu anda başka bir partide.');
  await set(ref(state.db,`social/partyInvites/${uid}/${id}`),{fromUid:state.user.uid,fromName:username(),createdAt:serverTimestamp()});
  status('Parti daveti gönderildi.');
  return {partyId:id,sent:true};
}

async function clearPartyInvites(uid){
  const snap=(await get(ref(state.db,`social/partyInvites/${uid}`))).val()||{};
  const changes={};
  for(const partyId of Object.keys(snap))changes[`social/partyInvites/${uid}/${partyId}`]=null;
  if(Object.keys(changes).length)await update(ref(state.db),changes);
}

async function acceptParty(id){
  if(!state.user||!id)throw new Error('Parti daveti bulunamadı.');
  const uid=state.user.uid;
  const existing=await currentPartyId();
  if(existing===id){
    await remove(ref(state.db,`social/partyInvites/${uid}/${id}`)).catch(()=>{});
    status('Zaten bu partidesin.');
    return {partyId:id,alreadyMember:true};
  }
  if(existing)throw new Error('Zaten aktif bir partidesin.');
  const invitation=(await get(ref(state.db,`social/partyInvites/${uid}/${id}`))).val();
  if(!invitation)throw new Error('Parti daveti artık mevcut değil.');
  const partyRef=ref(state.db,`social/parties/${id}`);
  const initial=(await get(partyRef)).val();
  if(!initial){
    await remove(ref(state.db,`social/partyInvites/${uid}/${id}`)).catch(()=>{});
    throw new Error('Parti artık mevcut değil.');
  }
  const pointer=ref(state.db,`social/userParty/${uid}`);
  state.joiningParties.add(id);
  try{
    const claim=await runTransaction(pointer,value=>!value||value===id?id:undefined,{applyLocally:false});
    if(!claim.committed)throw new Error('Başka bir parti üyeliği aynı anda etkinleşti.');
    const profile=await loadProfile();
    const fresh=(await get(partyRef)).val();
    if(!fresh||fresh.createdAt!==initial.createdAt){
      await runTransaction(pointer,value=>String(value||'')===id?null:value,{applyLocally:false});
      await remove(ref(state.db,`social/partyInvites/${uid}/${id}`)).catch(()=>{});
      throw new Error('Parti artık mevcut değil.');
    }
    const memberRef=ref(state.db,`social/parties/${id}/members/${uid}`);
    await set(memberRef,{username:profile?.username||username(),joinedAt:serverTimestamp()});
    const verified=(await get(partyRef)).val();
    if(!verified||verified.createdAt!==initial.createdAt||!verified.members?.[uid]||!verified.leaderUid){
      await remove(memberRef).catch(()=>{});
      await runTransaction(pointer,value=>String(value||'')===id?null:value,{applyLocally:false});
      await remove(ref(state.db,`social/partyInvites/${uid}/${id}`)).catch(()=>{});
      throw new Error('Parti artık mevcut değil.');
    }
    await clearPartyInvites(uid).catch(()=>{});
    status('Partiye katıldın.');
    return {partyId:id,joined:true};
  }finally{
    state.joiningParties.delete(id);
  }
}

async function connectFriends(otherUid,request=null){
  if(!state.user||!otherUid)throw new Error('Arkadaşlık isteği bulunamadı.');
  const me=state.user.uid,profile=await loadProfile();
  const incoming=request||((await get(ref(state.db,`social/friendRequests/${me}/${otherUid}`))).val());
  const existing=(await get(ref(state.db,`social/friends/${me}/${otherUid}`))).val();
  if(!incoming&&!existing)throw new Error('Arkadaşlık isteği artık mevcut değil.');
  let otherName=incoming?.username||existing?.username||'Oyuncu';
  if(!incoming&&!existing?.username){
    const p=(await get(ref(state.db,`social/profiles/${otherUid}`))).val();
    otherName=p?.username||otherName;
  }
  await update(ref(state.db),{
    [`social/friends/${me}/${otherUid}`]:{username:otherName,since:existing?.since||serverTimestamp()},
    [`social/friends/${otherUid}/${me}`]:{username:profile?.username||username(),since:serverTimestamp()},
    [`social/friendRequests/${me}/${otherUid}`]:null,
    [`social/friendRequests/${otherUid}/${me}`]:null
  });
  status(`@${otherName} arkadaşlara eklendi.`);
  return {friendUid:otherUid};
}

async function sendFriend(uid){
  if(!state.user||!uid)throw new Error('Oyuncu bulunamadı.');
  if(uid===state.user.uid)throw new Error('Kendine arkadaşlık isteği gönderemezsin.');
  const friend=(await get(ref(state.db,`social/friends/${state.user.uid}/${uid}`))).val();
  if(friend){
    await update(ref(state.db),{
      [`social/friendRequests/${state.user.uid}/${uid}`]:null,
      [`social/friendRequests/${uid}/${state.user.uid}`]:null
    });
    return {alreadyFriends:true};
  }
  const target=(await get(ref(state.db,`social/profiles/${uid}`))).val();
  await set(ref(state.db,`social/friendRequests/${uid}/${state.user.uid}`),{username:username(),createdAt:serverTimestamp()});
  return {sent:true,username:target?.username||'Oyuncu'};
}

async function cleanupRequestsForFriends(){
  if(!state.user||!state.db)return;
  const ids=Object.keys(state.friends||{});
  if(!ids.length)return;
  const changes={};
  for(const uid of ids){
    changes[`social/friendRequests/${state.user.uid}/${uid}`]=null;
    changes[`social/friendRequests/${uid}/${state.user.uid}`]=null;
  }
  await update(ref(state.db),changes);
}

async function reconcileFriendRequests(){
  if(state.reconcileBusy||!state.user)return;
  state.reconcileBusy=true;
  try{
    await cleanupRequestsForFriends();
    for(const [uid,request] of Object.entries(state.requests||{})){
      if(state.friends?.[uid])continue;
      const reciprocal=(await get(ref(state.db,`social/friendRequests/${uid}/${state.user.uid}`))).val();
      if(reciprocal)await connectFriends(uid,request);
    }
  }finally{state.reconcileBusy=false}
}

async function cleanupStaleInvites(){
  if(!state.user)return;
  for(const id of Object.keys(state.invites||{})){
    const party=(await get(ref(state.db,`social/parties/${id}`))).val();
    if(!party||party.members?.[state.user.uid]){
      await remove(ref(state.db,`social/partyInvites/${state.user.uid}/${id}`)).catch(()=>{});
    }
  }
}

function clearMemberPresence(){
  for(const off of state.memberPresence.values()){try{off()}catch{}}
  state.memberPresence.clear();
  for(const timer of state.offlineTimers.values())clearTimeout(timer);
  state.offlineTimers.clear();
}
function cancelOfflineCheck(uid){
  const timer=state.offlineTimers.get(uid);
  if(timer)clearTimeout(timer);
  state.offlineTimers.delete(uid);
}
function scheduleOfflineCheck(uid){
  if(!uid||uid===state.user?.uid||state.offlineTimers.has(uid)||!state.partyId)return;
  const partyId=state.partyId;
  const timer=setTimeout(()=>evictIfStillOffline(partyId,uid).catch(error=>console.warn('[NEON XI] offline party cleanup failed',error)),GRACE_MS);
  state.offlineTimers.set(uid,timer);
}
async function evictIfStillOffline(partyId,uid){
  cancelOfflineCheck(uid);
  if(!state.user||state.partyId!==partyId)return;
  const live=(await get(ref(state.db,`social/presence/${uid}/connections`))).val();
  if(connections(live)>0)return;
  const party=(await get(ref(state.db,`social/parties/${partyId}`))).val();
  if(!party?.members?.[uid]||!party.members?.[state.user.uid])return;
  await removeMemberFromParty(partyId,uid,{reason:'offline-timeout'});
}
function bindPartyMemberPresence(party){
  const members=new Set(Object.keys(party?.members||{}).filter(uid=>uid!==state.user?.uid));
  for(const [uid,off] of [...state.memberPresence.entries()]){
    if(members.has(uid))continue;
    try{off()}catch{}
    state.memberPresence.delete(uid);
    cancelOfflineCheck(uid);
  }
  for(const uid of members){
    if(state.memberPresence.has(uid))continue;
    const off=onValue(ref(state.db,`social/presence/${uid}/connections`),snap=>{
      if(connections(snap.val())>0)cancelOfflineCheck(uid);
      else scheduleOfflineCheck(uid);
    });
    state.memberPresence.set(uid,off);
  }
}

async function repairOwnMembershipAfterAbsence(){
  if(!state.user)return;
  const previous=safeStorageGet(activeKey(state.user.uid));
  if(previous&&now()-previous>=GRACE_MS){
    await leaveCurrentParty({silent:true,reason:'local-absence'}).catch(()=>{});
  }
}

function stopHeartbeat(){
  clearInterval(state.heartbeatTimer);
  state.heartbeatTimer=null;
}
function startHeartbeat(){
  if(!state.user)return;
  stopHeartbeat();
  const tick=()=>{if(state.connected&&state.user)safeStorageSet(activeKey(state.user.uid),now())};
  tick();
  state.heartbeatTimer=setInterval(tick,HEARTBEAT_MS);
}
function bindConnectivity(){
  state.connectedOff?.();state.connectedOff=null;
  if(!state.user)return;
  const uid=state.user.uid;
  state.connectedOff=onValue(ref(state.db,'.info/connected'),snap=>{
    const online=snap.val()===true;
    if(!online){
      if(state.connected)safeStorageSet(disconnectKey(uid),now());
      state.connected=false;stopHeartbeat();return;
    }
    const disconnectedAt=safeStorageGet(disconnectKey(uid));
    state.connected=true;
    if(disconnectedAt&&now()-disconnectedAt>=GRACE_MS){
      leaveCurrentParty({silent:true,reason:'network-gap'}).catch(()=>{});
    }
    safeStorageRemove(disconnectKey(uid));
    startHeartbeat();
  });
}

function clearUserBindings(){
  for(const key of ['profileOff','friendsOff','requestsOff','invitesOff','pointerOff','partyOff','connectedOff']){
    try{state[key]?.()}catch{}
    state[key]=null;
  }
  stopHeartbeat();clearMemberPresence();
  state.profile=null;state.friends={};state.requests={};state.invites={};state.partyId='';state.party=null;state.connected=false;
}

async function bindUser(user){
  clearUserBindings();
  state.user=user;
  state.profileOff=onValue(ref(state.db,`social/profiles/${user.uid}`),snap=>{state.profile=snap.val()||null});
  await repairOwnMembershipAfterAbsence();
  state.friendsOff=onValue(ref(state.db,`social/friends/${user.uid}`),snap=>{
    state.friends=snap.val()||{};
    reconcileFriendRequests().catch(error=>console.warn('[NEON XI] friend cleanup failed',error));
  });
  state.requestsOff=onValue(ref(state.db,`social/friendRequests/${user.uid}`),snap=>{
    state.requests=snap.val()||{};
    reconcileFriendRequests().catch(error=>console.warn('[NEON XI] crossed request reconciliation failed',error));
  });
  state.invitesOff=onValue(ref(state.db,`social/partyInvites/${user.uid}`),snap=>{
    state.invites=snap.val()||{};
    cleanupStaleInvites().catch(error=>console.warn('[NEON XI] stale invite cleanup failed',error));
  });
  state.pointerOff=onValue(ref(state.db,`social/userParty/${user.uid}`),snap=>{
    const id=String(snap.val()||'');
    state.partyId=id;
    state.partyOff?.();state.partyOff=null;state.party=null;clearMemberPresence();
    if(!id)return;
    state.partyOff=onValue(ref(state.db,`social/parties/${id}`),partySnap=>{
      const party=partySnap.val()||null;
      state.party=party;
      if(!party?.members?.[user.uid]){
        if(state.joiningParties.has(id))return;
        runTransaction(ref(state.db,`social/userParty/${user.uid}`),value=>String(value||'')===id?null:value,{applyLocally:false}).catch(()=>{});
        clearMemberPresence();return;
      }
      bindPartyMemberPresence(party);
    });
  });
  bindConnectivity();
}

async function safeLogout(){
  const user=state.user;
  if(!user)return;
  await leaveCurrentParty({silent:true,reason:'logout'}).catch(()=>{});
  await signOut(state.auth);
}

function interceptClicks(){
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('button');
    if(!button||!state.user)return;
    let job=null;
    if(button.matches('[data-act="create-party"]'))job=async()=>{const id=await ensureParty();status('Kalıcı parti kuruldu.');return id};
    else if(button.matches('[data-invite]'))job=()=>inviteToParty(button.dataset.invite);
    else if(button.matches('[data-nx-party-invite]'))job=()=>inviteToParty(button.dataset.nxPartyInvite);
    else if(button.matches('[data-party-accept]'))job=()=>acceptParty(button.dataset.partyAccept);
    else if(button.matches('[data-nx-party-accept]'))job=()=>acceptParty(button.dataset.nxPartyAccept);
    else if(button.matches('[data-add]'))job=async()=>{const result=await sendFriend(button.dataset.add);status(result.alreadyFriends?'Bu oyuncu zaten arkadaşın.':`@${result.username} için arkadaşlık isteği gönderildi.`);return result};
    else if(button.matches('[data-accept]'))job=()=>connectFriends(button.dataset.accept);
    else if(button.matches('[data-nx-friend-accept]'))job=()=>connectFriends(button.dataset.nxFriendAccept);
    else if(button.matches('[data-act="leave-party"],[data-nx-party-leave]'))job=()=>leaveCurrentParty();
    else if(button.matches('[data-act="logout"]'))job=()=>safeLogout();
    if(!job)return;
    event.preventDefault();event.stopImmediatePropagation();
    const wasDisabled=button.disabled;button.disabled=true;
    Promise.resolve().then(job).catch(error=>{
      console.error('[NEON XI] social integrity action failed',error);
      status(error?.message||'İşlem tamamlanamadı.',true);
    }).finally(()=>{if(button.isConnected)button.disabled=wasDisabled});
  },true);
}

async function debugRelation(uid){
  if(!state.user)return null;
  const [friend,incoming,outgoing]=await Promise.all([
    get(ref(state.db,`social/friends/${state.user.uid}/${uid}`)),
    get(ref(state.db,`social/friendRequests/${state.user.uid}/${uid}`)),
    get(ref(state.db,`social/friendRequests/${uid}/${state.user.uid}`))
  ]);
  return {friend:friend.val()||null,incoming:incoming.val()||null,outgoing:outgoing.val()||null};
}
async function debugParty(id=''){
  const partyId=id||await currentPartyId();
  if(!partyId)return {partyId:'',party:null};
  return {partyId,party:(await get(ref(state.db,`social/parties/${partyId}`))).val()||null};
}
async function debugInvite(id){
  if(!state.user)return null;
  return (await get(ref(state.db,`social/partyInvites/${state.user.uid}/${id}`))).val()||null;
}

function expose(){
  window.NEON_SOCIAL_INTEGRITY={
    graceMs:GRACE_MS,
    currentPartyId,ensureParty,inviteToParty,acceptParty,leaveCurrentParty,
    sendFriend,acceptFriend:connectFriends,reconcileNow:async()=>{await reconcileFriendRequests();await cleanupStaleInvites()},
    debugRelation,debugParty,debugInvite,safeLogout
  };
}

function boot(){
  if(state.booted)return;state.booted=true;
  interceptClicks();expose();
  const start=()=>{
    if(!getApps().length)return false;
    state.auth=getAuth(getApp());state.db=getDatabase(getApp());
    state.authOff=onAuthStateChanged(state.auth,user=>{
      if(user)bindUser(user).catch(error=>console.error('[NEON XI] social integrity bind failed',error));
      else{clearUserBindings();state.user=null}
    });
    return true;
  };
  if(start())return;
  let tries=0;
  const timer=setInterval(()=>{tries++;if(start()||tries>200)clearInterval(timer)},50);
}

boot();
