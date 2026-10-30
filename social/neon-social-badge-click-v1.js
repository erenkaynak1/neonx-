import {getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,get,ref} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

// The approved home is now an SVG-based screen. The social drawer still asks
// for `.nx-approved-canvas` as its mount host, and appending HTML <div>s into
// the SVG makes the drawer structurally present but visually hidden. Keep the
// SVG compatibility class, but also mark its HTML stage ancestor so
// querySelector resolves to a real HTML mount host first.
function ensureDrawerMountHost(){
  const home=document.querySelector('#bootHome.nx-approved-home-v1');
  const stage=home?.querySelector('.nx-home');
  if(!stage)return false;
  stage.classList.add('nx-approved-canvas');
  return true;
}

ensureDrawerMountHost();
const mountObserver=new MutationObserver(()=>ensureDrawerMountHost());
const observeMount=()=>{
  const target=document.getElementById('bootHome')||document.body||document.documentElement;
  if(target)mountObserver.observe(target,{subtree:true,childList:true});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureDrawerMountHost();observeMount()},{once:true});
else observeMount();

async function openPendingNotifications(){
  const api=window.NEON_SOCIAL;
  if(!api?.open)return;
  try{
    if(!getApps().length){api.open('friends');return;}
    const user=getAuth(getApp()).currentUser;
    if(!user){api.open('friends');return;}
    const db=getDatabase(getApp());
    const [friendSnap,partySnap]=await Promise.all([
      get(ref(db,`social/friendRequests/${user.uid}`)),
      get(ref(db,`social/partyInvites/${user.uid}`))
    ]);
    if(Object.keys(friendSnap.val()||{}).length){api.open('friends');return;}
    if(Object.keys(partySnap.val()||{}).length){api.open('party');return;}
    api.open('play');
  }catch{
    api.open('friends');
  }
}

// One delegated listener replaces the old 500 ms polling loop. It keeps the
// fallback badge action working even if the approved-home canvas is rebuilt.
document.addEventListener('click',event=>{
  const badge=event.target.closest?.('#bootHome.nx-approved-home-v1 .nx-safe-home-badge');
  if(!badge)return;
  event.preventDefault();
  event.stopPropagation();
  openPendingNotifications();
});

document.addEventListener('keydown',event=>{
  if(event.key!=='Enter'&&event.key!==' ')return;
  const badge=event.target.closest?.('#bootHome.nx-approved-home-v1 .nx-safe-home-badge');
  if(!badge)return;
  event.preventDefault();
  openPendingNotifications();
});
