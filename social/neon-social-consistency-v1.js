import {getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,get,onValue,ref,remove,runTransaction,serverTimestamp,set,update} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const DEFAULT_GRACE_MS=30000;
const graceMs=()=>Math.max(250,Number(globalThis.NEON_SOCIAL_OFFLINE_GRACE_MS||DEFAULT_GRACE_MS));
const state={auth:null,db:null,user:null,profile:null,partyId:'',partyOff:null,userOffs:[],memberOffs:new Map(),memberTimers:new Map(),busy:new Set()};

const norm=s=>String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9_]/g,'').slice(0,20);
const partyKey=uid=>`social/userParty/${uid}`;
const friendKey=(a,b)=>`social/friends/${a}/${b}`;
const requestKey=(to,from)=>`social/friendRequests/${to}/${from}`;
const partyRef=id=>ref(state.db,`social/parties/${id}`);
const connections=p=>Object.keys(p?.connections||{}).length;

function announce(text,error=false){
  const legacy=document.querySelector('.nx-social-status');
  if(legacy){legacy.textContent=text;legacy.classList.toggle('error',Boolean(error))}
  const drawer=document.querySelector('.nx-social-drawer-layer.open .nx-drawer-status');
  if(drawer){drawer.textContent=text;drawer.classList.toggle('error',Boolean(error));drawer.classList.add('show')}
}

async function profileFor(uid){return (await get(ref(state.db,`social/profiles/${uid}`))).val()||null}
async function currentProfile(){
  if(!state.user)return null;
  const live=window.NEON_SOCIAL?.profile;
  if(live?.username)return live;
  state.profile=await profileFor(state.user.uid);
  return state.profile;
}

async function validPartyFor(uid){
  const pointer=ref(state.db,partyKey(uid)),id=String((await get(pointer)).val()||'');
  if(!id)return '';
  const party=(await get(partyRef(id))).val();
  if(party?.members?.[uid])return id;
  await runTransaction(pointer,current=>String(current||'')===id?null:current,{applyLocally:false});
  return '';
}

async function ensureParty(){
  if(!state.user)throw new Error('Aktif oyuncu oturumu yok.');
  const profile=await currentProfile();if(!profile?.username)throw new Error('Önce oyuncu adını oluştur.');
  const uid=state.user.uid,existing=await validPartyFor(uid);if(existing)return existing;
  const id=`p_${uid.slice(0,8)}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
  const pointer=ref(state.db,partyKey(uid));
  const claim=await runTransaction(pointer,current=>current||id,{applyLocally:false});
  const claimed=String(claim.snapshot.val()||'');
  if(!claim.committed)throw new Error('Parti üyeliği alınamadı.');
  if(claimed!==id){
    const valid=await validPartyFor(uid);
    if(valid)return valid;
    throw new Error('Aynı anda başka bir parti işlemi oluştu. Tekrar dene.');
  }
  const created=await runTransaction(partyRef(id),current=>current||({leaderUid:uid,createdAt:Date.now(),members:{[uid]:{username:profile.username,joinedAt:Date.now()}}}),{applyLocally:false});
  if(!created.committed){await runTransaction(pointer,current=>String(current||'')===id?null:current,{applyLocally:false});throw new Error('Parti oluşturulamadı.');}
  announce('Kalıcı parti kuruldu.');
  return id;
}

async function acceptFriend(uid){
  if(!state.user||!uid)throw new Error('Arkadaşlık isteği geçersiz.');
  const me=state.user.uid,profile=await currentProfile(),incoming=(await get(ref(state.db,requestKey(me,uid)))).val(),other=await profileFor(uid);
  if(!incoming&&!(await get(ref(state.db,friendKey(me,uid)))).exists())throw new Error('Arkadaşlık isteği artık mevcut değil.');
  const otherName=incoming?.username||other?.username||'Oyuncu';
  await update(ref(state.db),{
    [friendKey(me,uid)]:{username:otherName,since:serverTimestamp()},
    [friendKey(uid,me)]:{username:profile?.username||'Oyuncu',since:serverTimestamp()},
    [requestKey(me,uid)]:null,
    [requestKey(uid,me)]:null
  });
  announce(`@${otherName} arkadaşlara eklendi.`);
  return true;
}

async function sendFriend(uid,username=''){ 
  if(!state.user||!uid||uid===state.user.uid)throw new Error('Bu oyuncuya istek gönderilemez.');
  const me=state.user.uid,profile=await currentProfile();if(!profile?.username)throw new Error('Önce oyuncu adını oluştur.');
  if((await get(ref(state.db,friendKey(me,uid)))).exists()){announce(`@${username||'Oyuncu'} zaten arkadaşın.`);return {already:true}}
  const reverse=(await get(ref(state.db,requestKey(me,uid)))).val();
  if(reverse){await acceptFriend(uid);return {accepted:true}}
  const target=ref(state.db,requestKey(uid,me));
  await runTransaction(target,current=>current||({username:profile.username,createdAt:Date.now()}),{applyLocally:false});
  const crossed=(await get(ref(state.db,requestKey(me,uid)))).val();
  if(crossed){await acceptFriend(uid);return {accepted:true}}
  announce(`@${username||'Oyuncu'} için arkadaşlık isteği gönderildi.`);
  return {sent:true};
}

async function removeFriend(uid){
  if(!state.user||!uid)return;
  const me=state.user.uid,other=(await get(ref(state.db,friendKey(me,uid)))).val();
  await update(ref(state.db),{
    [friendKey(me,uid)]:null,[friendKey(uid,me)]:null,
    [requestKey(me,uid)]:null,[requestKey(uid,me)]:null
  });
  announce(`@${other?.username||'Oyuncu'} arkadaş listesinden çıkarıldı.`);
}

async function inviteFriend(uid){
  if(!state.user||!uid)throw new Error('Oyuncu bulunamadı.');
  const me=state.user.uid,profile=await currentProfile();
  if(!(await get(ref(state.db,friendKey(me,uid)))).exists())throw new Error('Parti daveti yalnızca arkadaşlara gönderilebilir.');
  const id=await ensureParty(),targetParty=await validPartyFor(uid);
  if(targetParty===id){await remove(ref(state.db,`social/partyInvites/${uid}/${id}`));announce('Bu oyuncu zaten senin partinde.');return {already:true}}
  if(targetParty)throw new Error('Bu oyuncu zaten başka bir aktif partide.');
  await set(ref(state.db,`social/partyInvites/${uid}/${id}`),{fromUid:me,fromName:profile?.username||'Oyuncu',createdAt:serverTimestamp()});
  announce('Parti daveti gönderildi.');
  return {sent:true,partyId:id};
}

async function acceptParty(id){
  if(!state.user||!id)throw new Error('Parti daveti geçersiz.');
  const uid=state.user.uid,profile=await currentProfile(),existing=await validPartyFor(uid);
  if(existing===id){await remove(ref(state.db,`social/partyInvites/${uid}/${id}`));announce('Zaten bu partidesin.');return {already:true}}
  if(existing)throw new Error('Zaten aktif bir partidesin. Önce mevcut partiden ayrıl.');
  const pointer=ref(state.db,partyKey(uid)),claim=await runTransaction(pointer,current=>!current||current===id?id:undefined,{applyLocally:false});
  if(!claim.committed)throw new Error('Başka bir parti üyeliği aynı anda etkinleşti.');
  const joined=await runTransaction(partyRef(id),current=>{
    if(!current)return;
    const members={...(current.members||{})};
    members[uid]=members[uid]||{username:profile?.username||'Oyuncu',joinedAt:Date.now()};
    const next={...current,members};
    if(!next.leaderUid||!members[next.leaderUid])next.leaderUid=Object.keys(members)[0];
    return next;
  },{applyLocally:false});
  if(!joined.committed){
    await runTransaction(pointer,current=>String(current||'')===id?null:current,{applyLocally:false});
    await remove(ref(state.db,`social/partyInvites/${uid}/${id}`));
    throw new Error('Parti artık mevcut değil. Davet temizlendi.');
  }
  await remove(ref(state.db,`social/partyInvites/${uid}/${id}`));
  announce('Partiye katıldın.');
  return {joined:true,partyId:id};
}

async function leaveOwnParty(){
  if(!state.user)return false;
  if(window.NEON_PARTY_MEMBERSHIP?.leaveCurrentParty){const result=await window.NEON_PARTY_MEMBERSHIP.leaveCurrentParty();return Boolean(result?.left)}
  const uid=state.user.uid,id=await validPartyFor(uid);if(!id)return false;
  await cleanupMember(id,uid,true);return true;
}

async function cleanupMember(id,uid,force=false){
  if(!id||!uid)return false;
  if(!force){
    const p=(await get(ref(state.db,`social/presence/${uid}`))).val()||{};
    if(connections(p)>0)return false;
    const last=Number(p.lastSeen||0);if(last&&Date.now()-last<graceMs())return false;
  }
  const tx=await runTransaction(partyRef(id),current=>{
    if(!current?.members?.[uid])return current;
    const members={...(current.members||{})};delete members[uid];const remaining=Object.keys(members);
    if(!remaining.length)return null;
    const next={...current,members};if(next.leaderUid===uid||!members[next.leaderUid])next.leaderUid=remaining[0];return next;
  },{applyLocally:false});
  await runTransaction(ref(state.db,partyKey(uid)),current=>String(current||'')===id?null:current,{applyLocally:false});
  await remove(ref(state.db,`social/partyInvites/${uid}/${id}`)).catch(()=>{});
  return Boolean(tx.committed);
}

function clearMemberWatchers(){
  for(const off of state.memberOffs.values())try{off()}catch{}
  state.memberOffs.clear();
  for(const timer of state.memberTimers.values())clearTimeout(timer);
  state.memberTimers.clear();
}

function scheduleOfflineCleanup(id,uid,presence){
  const old=state.memberTimers.get(uid);if(old)clearTimeout(old);
  if(connections(presence)>0){state.memberTimers.delete(uid);return}
  const last=Number(presence?.lastSeen||Date.now()),delay=Math.max(0,graceMs()-(Date.now()-last));
  state.memberTimers.set(uid,setTimeout(async()=>{
    state.memberTimers.delete(uid);
    try{await cleanupMember(id,uid,false)}catch(error){console.warn('[NEON XI] offline party cleanup failed',error)}
  },delay+50));
}

function watchParty(id){
  clearMemberWatchers();state.partyOff?.();state.partyOff=null;if(!id)return;
  state.partyOff=onValue(partyRef(id),snap=>{
    const party=snap.val();if(!party?.members){clearMemberWatchers();return}
    const active=new Set(Object.keys(party.members).filter(uid=>uid!==state.user?.uid));
    for(const [uid,off] of state.memberOffs){if(active.has(uid))continue;try{off()}catch{}state.memberOffs.delete(uid);const timer=state.memberTimers.get(uid);if(timer)clearTimeout(timer);state.memberTimers.delete(uid)}
    for(const uid of active){if(state.memberOffs.has(uid))continue;const off=onValue(ref(state.db,`social/presence/${uid}`),s=>scheduleOfflineCleanup(id,uid,s.val()||{}));state.memberOffs.set(uid,off)}
  });
}

function clearUserBindings(){
  state.userOffs.splice(0).forEach(off=>{try{off()}catch{}});state.partyOff?.();state.partyOff=null;clearMemberWatchers();state.partyId='';state.profile=null;
}

function bindUser(user){
  clearUserBindings();state.user=user;
  state.userOffs.push(onValue(ref(state.db,`social/profiles/${user.uid}`),s=>{state.profile=s.val()||null}));
  state.userOffs.push(onValue(ref(state.db,partyKey(user.uid)),s=>{state.partyId=String(s.val()||'');watchParty(state.partyId)}));
}

async function uidFromFindButton(button){
  if(button?.dataset?.add)return button.dataset.add;
  const card=button?.closest?.('.nx-drawer-find-card');const text=card?.querySelector('b')?.textContent||'';const key=norm(text.replace(/^@/,''));if(!key)return '';
  return String((await get(ref(state.db,`social/usernames/${key}`))).val()||'');
}

async function handleAction(button){
  if(!state.user||!button)return false;
  if(button.matches('[data-act="create-party"]')){await ensureParty();return true}
  if(button.matches('[data-add],.nx-drawer-find-card button:not([disabled])')){const uid=await uidFromFindButton(button);if(!uid)throw new Error('Oyuncu bulunamadı.');const name=button.closest('.nx-drawer-find-card')?.querySelector('b')?.textContent?.replace(/^@/,'')||'';await sendFriend(uid,name);return true}
  if(button.matches('[data-accept],[data-nx-friend-accept]')){await acceptFriend(button.dataset.accept||button.dataset.nxFriendAccept);return true}
  if(button.matches('[data-invite],[data-nx-party-invite]')){await inviteFriend(button.dataset.invite||button.dataset.nxPartyInvite);return true}
  if(button.matches('[data-party-accept],[data-nx-party-accept]')){await acceptParty(button.dataset.partyAccept||button.dataset.nxPartyAccept);return true}
  if(button.matches('[data-nx-confirm-remove]')){const uid=button.closest('[data-nx-friend-menu]')?.dataset?.nxFriendMenu;if(uid)await removeFriend(uid);return Boolean(uid)}
  if(button.matches('[data-act="logout"]')){await leaveOwnParty().catch(()=>{});await window.NEON_SOCIAL?.signOut?.();return true}
  return false;
}

function installActionGuard(){
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('button');if(!button)return;
    const guarded=button.matches('[data-act="create-party"],[data-add],.nx-drawer-find-card button:not([disabled]),[data-accept],[data-nx-friend-accept],[data-invite],[data-nx-party-invite],[data-party-accept],[data-nx-party-accept],[data-nx-confirm-remove],[data-act="logout"]');
    if(!guarded)return;
    event.preventDefault();event.stopImmediatePropagation();
    const lock=`${button.dataset.act||button.outerHTML.slice(0,80)}`;if(state.busy.has(lock))return;state.busy.add(lock);button.disabled=true;
    handleAction(button).catch(error=>{console.error('[NEON XI] social consistency action failed',error);announce(error?.message||'Sosyal işlem tamamlanamadı.',true)}).finally(()=>{state.busy.delete(lock);if(button.isConnected)button.disabled=false});
  },true);
}

async function diagnostics(){
  if(!state.user)return {uid:'',partyId:'',friends:{},requests:{},invites:{},party:null};
  const uid=state.user.uid,partyId=await validPartyFor(uid);
  const [friends,requests,invites,party]=await Promise.all([
    get(ref(state.db,`social/friends/${uid}`)),get(ref(state.db,`social/friendRequests/${uid}`)),get(ref(state.db,`social/partyInvites/${uid}`)),partyId?get(partyRef(partyId)):Promise.resolve({val:()=>null})
  ]);
  return {uid,partyId,friends:friends.val()||{},requests:requests.val()||{},invites:invites.val()||{},party:party.val?.()||null};
}

function boot(){
  installActionGuard();
  const start=()=>{
    if(!getApps().length)return false;
    state.auth=getAuth(getApp());state.db=getDatabase(getApp());
    onAuthStateChanged(state.auth,user=>{if(user)bindUser(user);else{clearUserBindings();state.user=null}});
    return true;
  };
  if(start())return;
  let tries=0;const timer=setInterval(()=>{tries++;if(start()||tries>160)clearInterval(timer)},100);
}

window.NEON_SOCIAL_CONSISTENCY={ensureParty,sendFriend,acceptFriend,removeFriend,inviteFriend,acceptParty,leaveOwnParty,cleanupMember,diagnostics,get graceMs(){return graceMs()}};
boot();
