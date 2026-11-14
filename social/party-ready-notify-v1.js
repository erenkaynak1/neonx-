/* NEON XI — party ready notifications.
   Members kept missing the lobby's "HAZIR OL" button. This module:
   - shows a non-ready member a bottom bar ("@lider seni bekliyor · HAZIRIM") they can answer from anywhere,
   - tells the leader when someone joins, gets ready or un-readies, and when everyone is ready,
   - lets the leader nudge everyone who is not ready (lobby button [data-nx-nudge] → parties/{id}/nudge).
   It only reads the party and writes the member's own ready flag (through NEON_SOCIAL_CONSISTENCY when present)
   or the leader's nudge stamp. Nothing shows while a game is in progress. */
import {getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,onValue,ref,runTransaction,update} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const MODE_LABEL={draft:'NEON XI Draft',xox:'Futbol XOX',twin:'Kariyer İkizi',imposter:'Futbol Imposter',reverse:'RE:VERSE',wordle:'Football Wordle',en11:'EN 11'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={uid:'',partyId:'',party:null,prev:null,dismissedAt:0,lastNudge:0,offParty:null,offPointer:null,allReadyShown:'',bar:null};
let db=null;

// A game in progress (party/matchmaking launch, or a side game past its menu) gets no prompts.
function inGame(){
  const q=new URLSearchParams(location.search);
  if(q.get('nxAuto')==='1'||q.get('nxParty'))return true;
  const screen=document.body.dataset.ctScreen||document.body.dataset.nxImpScreen||'';
  if(screen&&screen!=='menu')return true;
  return !!document.querySelector('#matchSimulation:not(.hidden),#game:not([hidden]) .action-panel:not([hidden])');
}

/* ---------- toasts ---------- */
function stack(){let s=document.getElementById('nxr-stack');if(!s){s=document.createElement('div');s.id='nxr-stack';s.setAttribute('aria-live','polite');document.body.appendChild(s)}return s}
function toast(title,text,{tone='lime',action='',onAction=null,ttl=4200}={}){
  if(inGame())return;
  const el=document.createElement('div');el.className='nxr-toast '+tone;
  el.innerHTML=`<span class="nxr-dot"></span><span class="nxr-copy"><b>${esc(title)}</b>${text?`<small>${esc(text)}</small>`:''}</span>${action?`<button type="button">${esc(action)}</button>`:''}`;
  if(action&&onAction)el.querySelector('button').onclick=()=>{onAction();el.remove()};
  stack().appendChild(el);requestAnimationFrame(()=>el.classList.add('in'));
  setTimeout(()=>{el.classList.remove('in');setTimeout(()=>el.remove(),300)},ttl);
}
const buzz=p=>{try{navigator.vibrate?.(p)}catch{}};

/* ---------- member bar ---------- */
async function setReady(){
  const api=window.NEON_SOCIAL_CONSISTENCY;
  if(api?.setPartyReady)return api.setPartyReady(true);
  const uid=state.uid,id=state.partyId;
  const tx=await runTransaction(ref(db,`social/parties/${id}/members/${uid}`),m=>m?{...m,ready:true}:undefined,{applyLocally:false});
  if(!tx.committed)throw new Error('Hazır durumu güncellenemedi.');
}
function openLobby(){const hot=[...document.querySelectorAll('[data-action="lobby"],.nx-nav-item')].find(el=>el.offsetParent&&(el.dataset.action==='lobby'||/LOB/.test(el.textContent||'')));if(hot){hot.click();return}window.NEON_SOCIAL?.open?.('party')}
function renderBar(){
  const p=state.party,me=p?.members?.[state.uid];
  const need=p&&me&&p.leaderUid!==state.uid&&me.ready!==true&&Object.keys(p.members||{}).length>=2;
  const nudged=Number(p?.nudge?.at||0)>state.dismissedAt;
  const show=need&&!inGame()&&(nudged||!state.dismissedAt);
  if(!show){if(state.bar){state.bar.classList.remove('in');const b=state.bar;state.bar=null;setTimeout(()=>b.remove(),250)}return}
  const leader=p.members?.[p.leaderUid]?.username||'Lider',mode=MODE_LABEL[p.selectedMode]||'Parti maçı';
  if(!state.bar){state.bar=document.createElement('div');state.bar.className='nxr-bar';document.body.appendChild(state.bar);requestAnimationFrame(()=>state.bar?.classList.add('in'))}
  const sig=leader+'|'+mode;if(state.bar.dataset.sig===sig)return;state.bar.dataset.sig=sig;
  state.bar.innerHTML=`<span class="nxr-pulse"></span><span class="nxr-copy"><b>@${esc(leader)} seni bekliyor</b><small>${esc(mode)} · Hazır olduğunda lider oyunu başlatabilir</small></span><button type="button" class="nxr-ready">HAZIRIM</button><button type="button" class="nxr-close" aria-label="Kapat">✕</button>`;
  state.bar.querySelector('.nxr-ready').onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='…';try{await setReady();buzz(20);toast('Hazırsın ✓','Lider oyunu başlattığında otomatik olarak oyuna alınacaksın.',{tone:'green'})}catch(x){b.disabled=false;b.textContent='HAZIRIM';toast('Hazır olunamadı',x?.message||'Tekrar dene.',{tone:'red'})}};
  state.bar.querySelector('.nxr-close').onclick=()=>{state.dismissedAt=Date.now();renderBar()};
}

/* ---------- leader notifications ---------- */
function diff(prev,next){
  if(!prev||!next||next.leaderUid!==state.uid)return;
  const before=prev.members||{},after=next.members||{};
  for(const [uid,m] of Object.entries(after)){
    if(uid===state.uid)continue;const name='@'+(m?.username||'Oyuncu');
    if(!before[uid]){toast(name+' partiye katıldı','Hazır olmasını bekliyoruz.',{tone:'cyan'});continue}
    if(m?.ready===true&&before[uid]?.ready!==true){toast(name+' hazır ✓',MODE_LABEL[next.selectedMode]||'',{tone:'green'});buzz(25)}
    else if(m?.ready!==true&&before[uid]?.ready===true)toast(name+' hazırı geri aldı','',{tone:'amber'});
  }
  for(const [uid,m] of Object.entries(before))if(!after[uid]&&uid!==state.uid)toast('@'+(m?.username||'Oyuncu')+' partiden ayrıldı','',{tone:'amber'});
  const others=Object.entries(after).filter(([uid])=>uid!==next.leaderUid),all=others.length>0&&others.every(([,m])=>m?.ready===true);
  const key=others.map(([uid])=>uid).sort().join(',')+'|'+next.selectedMode;
  if(all&&state.allReadyShown!==key){state.allReadyShown=key;toast('Herkes hazır!',`${MODE_LABEL[next.selectedMode]||'Oyun'} başlatılabilir.`,{tone:'lime',action:'LOBİYİ AÇ',onAction:openLobby,ttl:7000})}
  if(!all)state.allReadyShown='';
}
async function nudge(){
  const p=state.party;if(!p||p.leaderUid!==state.uid)return;
  const waiting=Object.entries(p.members||{}).filter(([uid,m])=>uid!==p.leaderUid&&m?.ready!==true);
  if(!waiting.length){toast('Herkes zaten hazır','',{tone:'green'});return}
  if(Date.now()-Number(p.nudge?.at||0)<8000){toast('Biraz bekle','Az önce hatırlatma gönderildi.',{tone:'amber'});return}
  try{await update(ref(db,`social/parties/${state.partyId}`),{nudge:{at:Date.now(),by:state.uid,byName:p.members?.[state.uid]?.username||''}});toast('Hatırlatma gönderildi',waiting.map(([,m])=>'@'+(m?.username||'Oyuncu')).join(', ')+' bildirim aldı.',{tone:'cyan'})}
  catch(e){toast('Hatırlatma gönderilemedi',e?.message||'',{tone:'red'})}
}
// Capture phase: the lobby drawer handles its own clicks and may stop propagation.
document.addEventListener('click',e=>{if(e.target.closest('[data-nx-nudge]')){e.preventDefault();e.stopPropagation();nudge()}},true);
window.NEON_PARTY_READY={nudge,get party(){return state.party},get partyId(){return state.partyId},get debug(){return {dismissedAt:state.dismissedAt,bar:!!state.bar,uid:state.uid}}};

// Leader's lobby: a nudge button under "N oyuncunun hazır olması bekleniyor."
function decorateLobby(){
  const p=state.party;if(!p||p.leaderUid!==state.uid)return;
  const waiting=Object.entries(p.members||{}).some(([uid,m])=>uid!==p.leaderUid&&m?.ready!==true);
  document.querySelectorAll('.nx-lobby-hint').forEach(h=>{
    const has=h.nextElementSibling?.matches?.('[data-nx-nudge]');
    if(waiting&&!has)h.insertAdjacentHTML('afterend','<button type="button" class="nxr-nudge" data-nx-nudge>🔔 HAZIR OLMALARINI İSTE</button>');
    if(!waiting&&has)h.nextElementSibling.remove();
  });
}

function onParty(p){
  const prev=state.party;state.party=p;
  if(p&&prev)diff(prev,p);
  // A member receives a nudge: bring the bar back and alert them.
  const at=Number(p?.nudge?.at||0),me=p?.members?.[state.uid];
  if(p&&at>state.lastNudge){
    const fresh=state.lastNudge!==0&&Date.now()-at<60000;state.lastNudge=at;
    if(fresh&&p.leaderUid!==state.uid&&me&&me.ready!==true){state.dismissedAt=0;buzz([60,40,60]);toast(`@${p.nudge.byName||p.members?.[p.leaderUid]?.username||'Lider'} hazır olmanı istiyor`,'Aşağıdaki HAZIRIM butonuna dokun.',{tone:'lime',ttl:6000})}
  }else if(p&&!state.lastNudge)state.lastNudge=at||1;
  renderBar();decorateLobby();
}

function injectStyle(){
  if(document.getElementById('nxr-style'))return;
  const st=document.createElement('style');st.id='nxr-style';
  st.textContent=`
#nxr-stack{position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:2147483200;display:grid;gap:8px;width:min(92vw,420px);pointer-events:none}
.nxr-toast{--t:var(--neon-primary,#baff18);display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:12px;background:rgba(12,16,19,.96);border:1px solid color-mix(in srgb,var(--t) 45%,transparent);box-shadow:0 10px 30px rgba(0,0,0,.45),inset 0 0 22px color-mix(in srgb,var(--t) 10%,transparent);color:#f3f6f8;pointer-events:auto;opacity:0;transform:translateY(-12px);transition:opacity .25s,transform .25s cubic-bezier(.2,.8,.2,1)}
.nxr-toast.in{opacity:1;transform:none}.nxr-toast.green{--t:var(--neon-positive,#31ff76)}.nxr-toast.cyan{--t:var(--neon-cyan,#00eaff)}.nxr-toast.amber{--t:#ffc94a}.nxr-toast.red{--t:var(--nxu-danger,#ff7a8a)}
.nxr-dot{flex:none;width:9px;height:9px;border-radius:50%;background:var(--t);box-shadow:0 0 10px var(--t)}
.nxr-copy{display:grid;gap:2px;min-width:0;flex:1}.nxr-copy b{font:800 15px/1.15 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.02em}.nxr-copy small{color:#aab6c0;font-size:12px;line-height:1.3}
.nxr-toast button{flex:none;padding:8px 10px;border-radius:8px;border:0;background:var(--t);color:#0b1005;font:800 12px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.1em;cursor:pointer}
.nxr-bar{position:fixed;left:50%;bottom:calc(var(--nxu-nav-h,64px) + 16px + env(safe-area-inset-bottom,0px));transform:translate(-50%,24px);z-index:2147483100;display:flex;align-items:center;gap:10px;width:min(94vw,460px);padding:12px;border-radius:14px;background:linear-gradient(100deg,rgba(186,255,24,.16),rgba(12,16,19,.97) 45%);border:1px solid rgba(186,255,24,.55);box-shadow:0 14px 34px rgba(0,0,0,.5),0 0 24px rgba(186,255,24,.18);color:#f3f6f8;opacity:0;transition:opacity .25s,transform .3s cubic-bezier(.2,.8,.2,1)}
.nxr-bar.in{opacity:1;transform:translate(-50%,0)}
.nxr-pulse{flex:none;width:12px;height:12px;border-radius:50%;background:var(--neon-primary,#baff18);animation:nxrPulse 1.4s ease-out infinite}
@keyframes nxrPulse{0%{box-shadow:0 0 0 0 rgba(186,255,24,.7)}100%{box-shadow:0 0 0 12px rgba(186,255,24,0)}}
.nxr-ready{flex:none;min-height:42px;padding:0 16px;border:0;border-radius:10px;background:var(--neon-primary,#baff18);color:#0b1005;font:900 15px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.12em;cursor:pointer;box-shadow:0 0 18px rgba(186,255,24,.4)}
.nxr-ready:disabled{opacity:.6}.nxr-close{flex:none;width:30px;height:30px;border:0;border-radius:8px;background:rgba(255,255,255,.06);color:#aab6c0;cursor:pointer}
.nxr-nudge{display:block;width:100%;margin:8px 0 0;min-height:38px;border-radius:10px;border:1px solid rgba(0,234,255,.45);background:rgba(0,234,255,.08);color:var(--neon-cyan,#00eaff);font:800 13px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.1em;cursor:pointer}
@media (prefers-reduced-motion:reduce){.nxr-toast,.nxr-bar{transition:none}.nxr-pulse{animation:none}}
`;
  document.head.appendChild(st);
}

async function boot(){
  for(let i=0;i<200&&!getApps().length;i++)await new Promise(r=>setTimeout(r,100));
  if(!getApps().length)return;
  const app=getApp();db=getDatabase(app);injectStyle();
  onAuthStateChanged(getAuth(app),user=>{
    state.offPointer?.();state.offParty?.();state.offPointer=state.offParty=null;state.uid=user?.uid||'';state.party=null;state.partyId='';renderBar();
    if(!user)return;
    state.offPointer=onValue(ref(db,`social/userParty/${user.uid}`),s=>{
      const id=String(s.val()||'');if(id===state.partyId)return;
      state.offParty?.();state.offParty=null;state.partyId=id;state.party=null;state.lastNudge=0;state.dismissedAt=0;renderBar();
      if(id)state.offParty=onValue(ref(db,`social/parties/${id}`),p=>onParty(p.val()));
    });
  });
  let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorateLobby();renderBar()})}).observe(document.body,{childList:true,subtree:true});
}
boot();
