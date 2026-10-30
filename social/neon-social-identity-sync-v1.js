import {getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,onValue,ref} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

let authOff=null;
let profileOff=null;
let bootTimer=null;

function clearProfileWatch(){
  try{profileOff?.()}catch{}
  profileOff=null;
}

function publish(user,profile){
  if(!user||!profile?.username){
    delete window.NEON_IDENTITY;
    return;
  }
  const identity={uid:user.uid,username:profile.username,guest:Boolean(user.isAnonymous)};
  try{
    localStorage.setItem('nxSocialUsername',identity.username);
    localStorage.setItem('nxSocialUid',identity.uid);
  }catch{}
  window.NEON_IDENTITY=identity;
  document.dispatchEvent(new CustomEvent('neon-identity-ready',{detail:identity}));
}

function attach(){
  if(!getApps().length)return false;
  const app=getApp(),auth=getAuth(app),db=getDatabase(app);
  authOff=onAuthStateChanged(auth,user=>{
    clearProfileWatch();
    if(!user){publish(null,null);return}
    profileOff=onValue(ref(db,`social/profiles/${user.uid}`),snap=>publish(user,snap.val()||null));
  });
  return true;
}

function boot(){
  if(attach())return;
  let tries=0;
  bootTimer=setInterval(()=>{
    tries++;
    if(attach()||tries>=160){clearInterval(bootTimer);bootTimer=null}
  },50);
}

window.addEventListener('beforeunload',()=>{
  if(bootTimer)clearInterval(bootTimer);
  try{authOff?.()}catch{}
  clearProfileWatch();
},{once:true});

boot();
