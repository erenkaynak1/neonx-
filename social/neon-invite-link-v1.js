/* NEON XI — friend invite link.
   Sosyal › Arkadaşlar gets a "share invite link" button. The link is the home page with ?davet=<uid>.
   Whoever opens it is signed in as usual (guest or Google); once their profile exists a friend request is
   sent to the inviter through the normal consistency layer. Nothing new is written to the database: it is
   the same request a username search would send, and the inviter still has to accept it. */
import {getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,get,ref} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const KEY='nxPendingInvite';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const flash=msg=>{if(window.NEON_ARCADE_UI?.flash)window.NEON_ARCADE_UI.flash(msg);else console.info('[NEON XI]',msg)};
const validId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{6,64}$/.test(v);

// 1) Keep the inviter id from the URL, then clean the address bar so a reload or share does not repeat it.
try{
  const url=new URL(location.href),inviter=url.searchParams.get('davet');
  if(inviter!==null){
    if(validId(inviter))sessionStorage.setItem(KEY,inviter);
    url.searchParams.delete('davet');history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  }
}catch{}

let auth=null,db=null,user=null,busy=false;
async function runtime(){for(let i=0;i<200;i++){if(getApps().length){const app=getApp();auth=getAuth(app);db=getDatabase(app);return true}await sleep(100)}return false}
const linkFor=uid=>{const u=new URL('index.html',document.baseURI);u.searchParams.set('davet',uid);return u.href};

// 2) Redeem the stored invite once the player has a profile.
async function redeem(){
  const inviter=sessionStorage.getItem(KEY);if(!inviter||!user||busy)return;
  busy=true;
  try{
    for(let i=0;i<120&&!window.NEON_SOCIAL?.profile?.username;i++)await sleep(250);
    if(!window.NEON_SOCIAL?.profile?.username)return; // try again on the next auth change
    sessionStorage.removeItem(KEY);
    if(inviter===user.uid){flash('Bu senin kendi davet bağlantın.');return}
    const profile=(await get(ref(db,`social/profiles/${inviter}`))).val();
    if(!profile?.username){flash('Davet bağlantısı geçersiz ya da oyuncu bulunamadı.');return}
    if((await get(ref(db,`social/friends/${user.uid}/${inviter}`))).exists()){flash(`@${profile.username} zaten arkadaşın.`);return}
    for(let i=0;i<40&&!window.NEON_SOCIAL_CONSISTENCY?.sendFriend;i++)await sleep(150);
    const api=window.NEON_SOCIAL_CONSISTENCY;if(!api?.sendFriend){flash('Arkadaşlık isteği şu anda gönderilemedi.');return}
    const result=await api.sendFriend(inviter,profile.username);
    flash(result?.accepted?`@${profile.username} ile artık arkadaşsınız.`:`@${profile.username} adlı oyuncuya arkadaşlık isteği gönderildi.`);
  }catch(e){flash(e?.message||'Davet bağlantısı işlenemedi.')}
  finally{busy=false}
}

// 3) Share button inside Sosyal › Arkadaşlar (re-added whenever the drawer re-renders that view).
async function share(button){
  if(!user)return;
  const url=linkFor(user.uid),name=window.NEON_SOCIAL?.profile?.username;
  const text=`NEON XI'de benimle oyna${name?` (@${name})`:''}! Bağlantıya dokun, arkadaşlık isteğin otomatik gelsin.`;
  try{if(navigator.share){await navigator.share({title:'NEON XI',text,url});return}}catch(e){if(e?.name==='AbortError')return}
  try{await navigator.clipboard.writeText(url);button.querySelector('span').textContent='BAĞLANTI KOPYALANDI';setTimeout(()=>{if(button.isConnected)button.querySelector('span').textContent='DAVET LİNKİNİ PAYLAŞ'},2200)}
  catch{window.prompt('Davet bağlantını kopyala:',url)}
}
function inject(){
  if(!user)return;
  const search=document.querySelector('.nx-social-drawer-layer.open .nx-drawer-search');
  if(!search||search.nextElementSibling?.classList?.contains('nx-invite-share'))return;
  const b=document.createElement('button');b.type='button';b.className='nx-invite-share';
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg><span>DAVET LİNKİNİ PAYLAŞ</span>';
  b.setAttribute('aria-label','Davet bağlantısını paylaş: bağlantıyı açan oyuncudan sana arkadaşlık isteği gelir');
  b.addEventListener('click',()=>share(b));
  search.after(b);
}
const style=document.createElement('style');
style.textContent=`.nx-invite-share{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:44px;margin:10px 0 4px;border:1px dashed rgba(186,255,24,.45);border-radius:12px;background:rgba(186,255,24,.06);color:#dcff76;font:800 13px/1 "Barlow Condensed","Barlow",system-ui,sans-serif;letter-spacing:.1em;cursor:pointer}
.nx-invite-share svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.nx-invite-share:focus-visible{outline:2px solid #baff18;outline-offset:2px}`;
document.head.appendChild(style);

(async()=>{
  if(!await runtime())return;
  onAuthStateChanged(auth,u=>{user=u||null;if(user)redeem()});
  let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;inject()})}).observe(document.body,{childList:true,subtree:true});
})();
window.NEON_INVITE_LINK={linkFor};
