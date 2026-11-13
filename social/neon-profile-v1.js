/* NEON XI — profile screen: avatar, avatar picker and game statistics.
   Fills the home "Profil" sheet (the Sosyal panel in nx-profile-mode) and paints avatars wherever the
   social UI used to show an initial (home profile chip, friend rows, lobby members).
   Data: social/profiles/{uid}/avatar (chosen avatar id), social/stats/{uid} (totals) and
   social/resultReceipts/{uid}/{matchId} = {result, mode, at} (one per finished online match). */
import {getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,get,onValue,ref,update} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const MODE_LABEL={draft:'NEON XI Draft',xox:'Futbol XOX',twin:'Kariyer İkizi',imposter:'Futbol Imposter',reverse:'RE:VERSE',wordle:'Football Wordle',en11:'EN 11'};
const state={uid:'',avatar:'',pickerOpen:false,stats:null,statsAt:0,statsUid:'',loading:false,avatars:new Map(),pending:new Map()};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let db=null,auth=null;

async function waitFor(test,ms=20000){const t0=Date.now();while(!test()){if(Date.now()-t0>ms)return false;await new Promise(r=>setTimeout(r,100))}return true}

/* ---------- avatars of other players ---------- */
function avatarOf(uid){
  if(!uid||!db)return Promise.resolve('');
  if(state.avatars.has(uid))return Promise.resolve(state.avatars.get(uid));
  if(!state.pending.has(uid))state.pending.set(uid,get(ref(db,`social/profiles/${uid}/avatar`)).then(s=>{const v=String(s.val()||'');state.avatars.set(uid,v);return v}).catch(()=>'').finally(()=>state.pending.delete(uid)));
  return state.pending.get(uid);
}
function paint(el,uid,id){const A=window.NEON_AVATARS;if(!A)return;const resolved=A.resolve(id,uid);if(el.dataset.nxAvatar===resolved&&el.querySelector('img.nx-avatar-img'))return;el.dataset.nxAvatar=resolved;el.innerHTML=A.html(resolved);el.classList.add('nx-has-avatar')}
function paintAll(){
  if(!window.NEON_AVATARS)return;
  document.querySelectorAll('.nx-drawer-avatar[data-uid]').forEach(el=>{const uid=el.dataset.uid;if(uid===state.uid){paint(el,uid,state.avatar);return}if(state.avatars.has(uid))paint(el,uid,state.avatars.get(uid));else{paint(el,uid,'');avatarOf(uid).then(id=>paint(el,uid,id))}});
  const chip=document.querySelector('.nxh-profile.is-signed .nxh-avatar');
  if(chip&&state.uid)paint(chip,state.uid,state.avatar);
}

/* ---------- statistics ---------- */
async function loadStats(force=false){
  if(!state.uid||!db||state.loading)return;
  if(!force&&state.statsUid===state.uid&&Date.now()-state.statsAt<30000)return;
  state.loading=true;
  try{
    const [totals,receipts]=await Promise.all([get(ref(db,`social/stats/${state.uid}`)),get(ref(db,`social/resultReceipts/${state.uid}`))]);
    const t=totals.val()||{},perMode={};
    for(const r of Object.values(receipts.val()||{})){
      if(!r||!['wins','losses','draws'].includes(r.result))continue;
      const m=MODE_LABEL[r.mode]?r.mode:'other',x=perMode[m]||(perMode[m]={games:0,wins:0,losses:0,draws:0,last:0});
      x.games++;x[r.result]++;x.last=Math.max(x.last,Number(r.at)||0);
    }
    const sum=Object.values(perMode).reduce((a,x)=>({games:a.games+x.games,wins:a.wins+x.wins,losses:a.losses+x.losses,draws:a.draws+x.draws}),{games:0,wins:0,losses:0,draws:0});
    // social/stats is the long-running total; receipts give the per-game split.
    const games=Math.max(Number(t.games)||0,sum.games),wins=Math.max(Number(t.wins)||0,sum.wins),losses=Math.max(Number(t.losses)||0,sum.losses),draws=Math.max(Number(t.draws)||0,sum.draws);
    state.stats={games,wins,losses,draws,perMode};state.statsAt=Date.now();state.statsUid=state.uid;
  }catch{state.stats=state.stats||{games:0,wins:0,losses:0,draws:0,perMode:{},error:true}}
  finally{state.loading=false;render()}
}
const pct=(w,g)=>g?Math.round(w/g*100):0;
function statsMarkup(){
  const s=state.stats;
  if(!s)return '<div class="nxp-stats nxp-loading"><span></span><span></span><span></span></div>';
  if(!s.games)return `<div class="nxp-empty"><b>Henüz istatistik yok</b><span>Çevrimiçi ya da arkadaşlarınla maç oynadıkça burada en çok oynadığın oyunlar ve kazanma oranın görünecek.</span></div>`;
  const modes=Object.entries(s.perMode).filter(([m])=>m!=='other').sort((a,b)=>b[1].games-a[1].games||b[1].wins-a[1].wins);
  const most=modes[0],best=[...modes].filter(([,x])=>x.games>=1).sort((a,b)=>b[1].wins-a[1].wins||pct(b[1].wins,b[1].games)-pct(a[1].wins,a[1].games))[0];
  const max=Math.max(1,...modes.map(([,x])=>x.games)),rate=pct(s.wins,s.games);
  const ring=`<div class="nxp-ring" style="--p:${rate}"><b>${rate}<small>%</small></b><span>KAZANMA</span></div>`;
  return `<div class="nxp-stats">
    <div class="nxp-top">${ring}<div class="nxp-nums">
      <div><b>${s.games}</b><span>MAÇ</span></div><div class="win"><b>${s.wins}</b><span>GALİBİYET</span></div>
      <div><b>${s.draws}</b><span>BERABERLİK</span></div><div class="loss"><b>${s.losses}</b><span>MAĞLUBİYET</span></div>
    </div></div>
    ${most?`<div class="nxp-badges"><div><span>EN ÇOK OYNADIĞIN</span><b>${esc(MODE_LABEL[most[0]])}</b><small>${most[1].games} maç</small></div>${best&&best[1].wins?`<div><span>EN ÇOK KAZANDIĞIN</span><b>${esc(MODE_LABEL[best[0]])}</b><small>${best[1].wins} galibiyet · %${pct(best[1].wins,best[1].games)}</small></div>`:''}</div>`:''}
    ${modes.length?`<div class="nxp-modes">${modes.map(([m,x])=>`<div class="nxp-mode"><div class="nxp-mode-head"><b>${esc(MODE_LABEL[m])}</b><span>${x.games} maç · %${pct(x.wins,x.games)}</span></div><div class="nxp-bar"><i style="width:${Math.max(4,Math.round(x.games/max*100))}%"><em style="width:${pct(x.wins,x.games)}%"></em></i></div></div>`).join('')}</div>`:''}
  </div>`;
}

/* ---------- profile sheet ---------- */
async function chooseAvatar(id){
  if(!window.NEON_AVATARS?.valid(id)||!state.uid)return;
  const previous=state.avatar;state.avatar=id;state.pickerOpen=false;render();paintAll();
  try{await update(ref(db,`social/profiles/${state.uid}`),{avatar:id})}
  catch{state.avatar=previous;render();paintAll()}
}
function heroMarkup(profile){
  const A=window.NEON_AVATARS,current=A.resolve(state.avatar,state.uid);
  const picker=state.pickerOpen?`<div class="nxp-picker" role="listbox" aria-label="Avatar seç">${A.ids.map(id=>`<button type="button" role="option" class="nxp-option${id===current?' is-active':''}" data-nxp-avatar="${id}" aria-selected="${id===current}" aria-label="${esc(A.names[id])}"><span>${A.html(id)}</span><small>${esc(A.names[id])}</small></button>`).join('')}</div>`:'';
  return `<div class="nxp-hero">
    <button type="button" class="nxp-avatar" data-nxp-toggle aria-label="Avatarı değiştir">${A.html(current)}<span class="nxp-edit">✎</span></button>
    <div class="nxp-id"><b>@${esc(profile?.username||'oyuncu')}</b><span>${esc(A.names[current])} · ${profile?.accountType==='google'?'Google hesabı':'Misafir hesabı'}</span>
      <button type="button" class="nxp-change" data-nxp-toggle>${state.pickerOpen?'KAPAT':'AVATARI DEĞİŞTİR'}</button></div>
  </div>${picker}`;
}
function render(){
  const shade=document.querySelector('.nx-social-shade.nx-profile-mode.open');if(!shade||!window.NEON_AVATARS)return;
  const view=shade.querySelector('[data-view="friends"]');const profile=window.NEON_SOCIAL?.profile;
  if(!view||!profile||!state.uid)return;
  let box=view.querySelector(':scope > .nxp-box');
  if(!box){box=document.createElement('div');box.className='nxp-box';view.prepend(box)}
  // Avatar SVGs carry unique ids per copy, so compare a state signature instead of the markup.
  const sig=JSON.stringify([state.uid,state.avatar,state.pickerOpen,profile.username,profile.accountType,state.stats]);
  if(box.dataset.sig!==sig){box.dataset.sig=sig;box.innerHTML=`${heroMarkup(profile)}<div class="nxp-section"><span class="nxp-label">İSTATİSTİKLER</span>${statsMarkup()}</div>`}
  if(!state.stats||state.statsUid!==state.uid)loadStats();
}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-nxp-toggle]')){e.preventDefault();state.pickerOpen=!state.pickerOpen;render();return}
  const opt=e.target.closest('[data-nxp-avatar]');if(opt){e.preventDefault();chooseAvatar(opt.dataset.nxpAvatar)}
});

function injectStyle(){
  if(document.getElementById('nxp-style'))return;
  const st=document.createElement('style');st.id='nxp-style';
  st.textContent=`
.nx-social-shade:not(.nx-profile-mode) .nxp-box{display:none}
.nxp-box{display:grid;gap:12px;margin:0 0 12px}
.nxp-hero{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:16px;padding:16px;border-radius:14px;background:linear-gradient(120deg,rgba(186,255,24,.12),rgba(16,21,26,.92) 55%,rgba(0,234,255,.08));border:1px solid rgba(186,255,24,.22)}
.nxp-avatar{position:relative;width:92px;height:92px;padding:0;border:0;border-radius:50%;background:none;cursor:pointer;filter:drop-shadow(0 0 14px rgba(186,255,24,.25));transition:transform .2s}
.nxp-avatar:active{transform:scale(.96)}.nxp-avatar img{width:100%;height:100%;display:block}
.nxp-edit{position:absolute;right:0;bottom:2px;width:28px;height:28px;display:grid;place-items:center;border-radius:50%;background:var(--neon-primary,#baff18);color:#0b1005;font-size:14px;font-weight:900;box-shadow:0 0 0 3px #10151a}
.nxp-id{display:grid;gap:4px;min-width:0}.nxp-id b{font:800 22px/1.1 var(--nxu-display,"Barlow Condensed",sans-serif);color:#f3f6f8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nxp-id>span{color:#aab6c0;font-size:13px}
.nxp-change{justify-self:start;margin-top:6px;padding:8px 12px;border-radius:8px;border:1px solid rgba(186,255,24,.4);background:rgba(186,255,24,.08);color:var(--neon-primary,#baff18);font:800 12px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.12em;cursor:pointer}
.nxp-picker{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:12px;border-radius:14px;background:#10151a;border:1px solid rgba(255,255,255,.08);animation:nxpIn .25s ease both}
@keyframes nxpIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.nxp-option{display:grid;justify-items:center;gap:4px;padding:6px 2px;border:1px solid transparent;border-radius:12px;background:none;color:#aab6c0;cursor:pointer;transition:background .15s,border-color .15s,transform .15s}
.nxp-option span{width:100%;max-width:64px;aspect-ratio:1}.nxp-option img{width:100%;height:100%;display:block}
.nxp-option small{font:700 11px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.06em}
.nxp-option:hover{background:rgba(255,255,255,.04)}.nxp-option:active{transform:scale(.95)}
.nxp-option.is-active{border-color:var(--neon-primary,#baff18);background:rgba(186,255,24,.1);color:#f3f6f8}
.nxp-section{display:grid;gap:10px;padding:16px;border-radius:14px;background:#171d23;border:1px solid rgba(255,255,255,.08)}
.nxp-label{color:#75828d;font:800 12px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.2em}
.nxp-top{display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center}
.nxp-ring{--p:0;width:96px;height:96px;border-radius:50%;display:grid;place-content:center;justify-items:center;background:radial-gradient(closest-side,#171d23 78%,transparent 80%),conic-gradient(var(--neon-primary,#baff18) calc(var(--p)*1%),rgba(255,255,255,.08) 0)}
.nxp-ring b{font:900 28px/1 var(--nxu-display,"Barlow Condensed",sans-serif);color:#f3f6f8}.nxp-ring small{font-size:15px;color:#aab6c0}
.nxp-ring span{font:800 9px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.18em;color:#75828d;margin-top:3px}
.nxp-nums{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.nxp-nums div{display:grid;gap:2px;padding:8px 10px;border-radius:10px;background:#10151a}
.nxp-nums b{font:900 22px/1 var(--nxu-display,"Barlow Condensed",sans-serif);color:#f3f6f8}.nxp-nums span{font:800 9px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.14em;color:#75828d}
.nxp-nums .win b{color:var(--neon-positive,#31ff76)}.nxp-nums .loss b{color:#ff7a8a}
.nxp-badges{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.nxp-badges div{display:grid;gap:3px;padding:10px 12px;border-radius:10px;background:linear-gradient(135deg,rgba(186,255,24,.1),#10151a 70%);border:1px solid rgba(186,255,24,.18)}
.nxp-badges div+div{background:linear-gradient(135deg,rgba(0,234,255,.1),#10151a 70%);border-color:rgba(0,234,255,.2)}
.nxp-badges span{font:800 9px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.14em;color:#75828d}
.nxp-badges b{font:800 16px/1.1 var(--nxu-display,"Barlow Condensed",sans-serif);color:#f3f6f8}.nxp-badges small{color:#aab6c0;font-size:12px}
.nxp-modes{display:grid;gap:9px}.nxp-mode{display:grid;gap:5px}
.nxp-mode-head{display:flex;justify-content:space-between;gap:8px;font-size:13px}.nxp-mode-head b{color:#f3f6f8}.nxp-mode-head span{color:#aab6c0}
.nxp-bar{height:8px;border-radius:4px;background:rgba(255,255,255,.06);overflow:hidden}
.nxp-bar i{display:block;height:100%;border-radius:4px;background:rgba(0,234,255,.35);animation:nxpGrow .7s cubic-bezier(.2,.8,.2,1) both}
.nxp-bar em{display:block;height:100%;border-radius:4px;background:var(--neon-primary,#baff18)}
@keyframes nxpGrow{from{transform:scaleX(0);transform-origin:left}to{transform:none;transform-origin:left}}
.nxp-empty{display:grid;gap:6px;padding:14px;border-radius:10px;background:#10151a;border:1px dashed rgba(255,255,255,.12)}.nxp-empty b{color:#f3f6f8}.nxp-empty span{color:#aab6c0;font-size:13px;line-height:1.4}
.nxp-loading{display:grid;gap:8px}.nxp-loading span{height:18px;border-radius:6px;background:linear-gradient(90deg,#10151a,#1d252c,#10151a);background-size:200% 100%;animation:nxpShimmer 1.2s linear infinite}
@keyframes nxpShimmer{to{background-position:-200% 0}}
.nx-drawer-avatar.nx-has-avatar,.nxh-avatar.nx-has-avatar{padding:0!important;overflow:visible!important;background:none!important;font-size:0!important;border:0!important;border-radius:0!important;box-shadow:none!important}
.nx-drawer-avatar.nx-has-avatar img,.nxh-avatar.nx-has-avatar img{width:100%;height:100%;display:block;object-fit:contain}
@media (prefers-reduced-motion:reduce){.nxp-picker,.nxp-bar i,.nxp-loading span{animation:none}}
`;
  document.head.appendChild(st);
}

async function boot(){
  if(!await waitFor(()=>getApps().length&&window.NEON_AVATARS))return;
  const app=getApp();db=getDatabase(app);auth=getAuth(app);injectStyle();
  let offAvatar=null;
  onAuthStateChanged(auth,user=>{
    offAvatar?.();offAvatar=null;state.uid=user?.uid||'';state.avatar='';state.stats=null;state.pickerOpen=false;
    if(user)offAvatar=onValue(ref(db,`social/profiles/${user.uid}/avatar`),s=>{state.avatar=String(s.val()||'');state.avatars.set(user.uid,state.avatar);render();paintAll()});
  });
  let queued=false;
  const tick=()=>{queued=false;render();paintAll()};
  new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(tick)}}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  tick();
}
boot();
