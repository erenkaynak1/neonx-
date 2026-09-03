import {getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,get,ref} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

let boundBadge=null;

async function openPendingNotifications(){
  const api=window.NEON_SOCIAL;
  if(!api?.open){return;}

  try{
    if(!getApps().length){api.open('friends');return;}
    const app=getApp();
    const user=getAuth(app).currentUser;
    if(!user){api.open('friends');return;}

    const db=getDatabase(app);
    const [friendSnap,partySnap]=await Promise.all([
      get(ref(db,`social/friendRequests/${user.uid}`)),
      get(ref(db,`social/partyInvites/${user.uid}`))
    ]);

    const friendCount=Object.keys(friendSnap.val()||{}).length;
    const partyCount=Object.keys(partySnap.val()||{}).length;

    if(friendCount>0){api.open('friends');return;}
    if(partyCount>0){api.open('party');return;}
    api.open('play');
  }catch{
    api.open('friends');
  }
}

function bindBadge(){
  const badge=document.querySelector('#bootHome.nx-approved-home-v1 .nx-safe-home-badge');
  if(!badge||badge===boundBadge)return;

  boundBadge=badge;
  badge.style.pointerEvents='auto';
  badge.style.cursor='pointer';
  badge.setAttribute('role','button');
  badge.setAttribute('tabindex','0');
  badge.setAttribute('aria-label','Bildirimleri aç');
  badge.title='Bildirimleri aç';

  const activate=e=>{
    e.preventDefault();
    e.stopPropagation();
    openPendingNotifications();
  };

  badge.addEventListener('click',activate);
  badge.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){activate(e);}
  });
}

bindBadge();
setInterval(bindBadge,500);
