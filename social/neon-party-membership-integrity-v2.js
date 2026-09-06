import {getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,get,ref,runTransaction} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

let busy=false;

function status(text,error=false){
  const legacy=document.querySelector('.nx-social-status');
  if(legacy){legacy.textContent=text;legacy.classList.toggle('error',Boolean(error))}
  const drawer=document.querySelector('.nx-social-drawer-layer.open .nx-drawer-status');
  if(drawer){drawer.textContent=text;drawer.classList.toggle('error',Boolean(error));drawer.classList.add('show')}
}

async function leaveCurrentParty(){
  if(!getApps().length)throw new Error('Sosyal bağlantı henüz hazır değil.');
  const app=getApp(),auth=getAuth(app),db=getDatabase(app),user=auth.currentUser;
  if(!user)throw new Error('Aktif oyuncu oturumu bulunamadı.');

  const pointer=ref(db,`social/userParty/${user.uid}`);
  const partyId=String((await get(pointer)).val()||'');
  if(!partyId)return {left:false,reason:'NO_PARTY'};

  const partyRef=ref(db,`social/parties/${partyId}`);
  await runTransaction(partyRef,current=>{
    if(!current)return current;
    const members={...(current.members||{})};
    delete members[user.uid];
    const remaining=Object.keys(members);
    if(!remaining.length)return null;
    const next={...current,members};
    if(next.leaderUid===user.uid||!members[next.leaderUid])next.leaderUid=remaining[0];
    return next;
  },{applyLocally:false});

  await runTransaction(pointer,current=>String(current||'')===partyId?null:current,{applyLocally:false});
  document.dispatchEvent(new CustomEvent('neon-party-left',{detail:{uid:user.uid,partyId}}));
  return {left:true,partyId};
}

function isLeaveButton(target){
  return target?.closest?.('.nx-social-drawer-layer [data-nx-party-leave], .nx-social-shade [data-act="leave-party"]')||null;
}

document.addEventListener('click',event=>{
  const button=isLeaveButton(event.target);if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(busy)return;
  busy=true;button.disabled=true;status('Partiden ayrılıyorsun…');
  leaveCurrentParty()
    .then(result=>status(result.left?'Partiden ayrıldın.':'Aktif bir partide değilsin.'))
    .catch(error=>{console.error('[NEON XI] race-safe party leave failed',error);status(error?.message||'Partiden ayrılamadın.',true)})
    .finally(()=>{busy=false;if(button.isConnected)button.disabled=false});
},true);

window.NEON_PARTY_MEMBERSHIP={leaveCurrentParty};
