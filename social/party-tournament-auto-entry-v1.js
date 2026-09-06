import {initializeApp,getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

const CONFIG={apiKey:'AIzaSyBLpXHGGTHXykKrnu8_Hv1i71oc3tpTNvY',authDomain:'neonxi.firebaseapp.com',databaseURL:'https://neonxi-default-rtdb.europe-west1.firebasedatabase.app',projectId:'neonxi',storageBucket:'neonxi.firebasestorage.app',messagingSenderId:'667191549799',appId:'1:667191549799:web:1e40feacbee09ed7f3d9c2'};
const app=getApps().length?getApp():initializeApp(CONFIG),auth=getAuth(app);
const q=new URLSearchParams(location.search),partySize=Math.max(0,Number(q.get('nxPartySize'))||0);
const active=q.get('nxAuto')==='1'&&!!q.get('nxParty')&&(q.get('nxTournament')==='1'||partySize>2);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function waitUser(timeout=5000){
  if(auth.currentUser)return auth.currentUser;
  return new Promise(resolve=>{
    let done=false,off=()=>{};
    const finish=u=>{if(done)return;done=true;try{off()}catch{}resolve(u||auth.currentUser||null)};
    off=onAuthStateChanged(auth,finish,()=>finish(null));
    setTimeout(()=>finish(auth.currentUser),timeout);
  });
}
async function waitFor(getter,timeout=10000){const start=Date.now();while(Date.now()-start<timeout){const v=getter();if(v)return v;await sleep(100)}return null}
async function openTournament(){
  const menu=await waitFor(()=>window.NEON_MENU,9000);if(!menu)throw new Error('Turnuva menüsü hazırlanamadı.');
  const frame=document.getElementById('neonTournamentFrame');if(!frame)throw new Error('Turnuva ekranı bulunamadı.');
  if(frame.dataset.loaded)return frame;
  const loaded=new Promise(resolve=>{const done=()=>resolve(frame);frame.addEventListener('load',done,{once:true});setTimeout(done,4500)});
  menu.openTournament?.();
  await loaded;
  return frame;
}
async function start(){
  if(!active)return;
  const user=await waitUser();if(!user)throw new Error('Turnuva için kullanıcı oturumu açılamadı.');
  const roomCode=String(q.get('nxCode')||'').toUpperCase(),name=String(q.get('nxName')||'NEON Oyuncu').slice(0,22);
  if(roomCode.length!==6)throw new Error('Turnuva oda kodu geçersiz.');
  await openTournament();
  const api=await waitFor(()=>window.NEON_XI_TOURNAMENT_ONLINE?.join?window.NEON_XI_TOURNAMENT_ONLINE:null,9000);
  if(!api)throw new Error('Turnuva bağlantısı hazırlanamadı.');
  await api.join(name,roomCode);
  document.documentElement.dataset.nxPartyTournament='connected';
  console.info('[NEON XI] party member entered tournament',roomCode,user.uid);
}
start().catch(e=>{
  console.error('[NEON XI] automatic tournament entry failed',e);
  const el=document.createElement('div');
  el.style.cssText='position:fixed;z-index:999999;left:12px;right:12px;top:max(12px,env(safe-area-inset-top));padding:12px 14px;border:1px solid rgba(255,90,110,.5);border-radius:12px;background:#16090d;color:#ffd5dc;font:700 12px system-ui;text-align:center';
  el.textContent=e?.message||'Turnuva bağlantısı kurulamadı.';document.body.appendChild(el);
});
