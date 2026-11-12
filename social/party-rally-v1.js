// NEON XI — Rally mode for two-player parties: XOX → Kariyer İkizi → NEON XI Draft, played back to back.
// Each game is started through the existing party broker (window.NEON_PARTY_BROKER.start), each player
// records their own result from the game's `neon-match-result` event, and the party leader scores the
// game (win 3 / draw 1) and starts the next one. Ties are broken by the last game (Draft).
import {getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,onValue,ref,runTransaction,set} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const GAMES=['xox','twin','draft'];
const LABELS={xox:'Futbol XOX',twin:'Kariyer İkizi',draft:'NEON XI Draft'};
const POINTS={wins:3,draws:1,losses:0};
const NEXT_DELAY_MS=6000;
const q=new URLSearchParams(location.search);
const state={db:null,user:null,partyId:'',party:null,partyOff:null,pointerOff:null,pending:[],countdown:0,lobbyObserver:null};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const once=(key)=>{try{if(sessionStorage.getItem(key))return false;sessionStorage.setItem(key,'1')}catch{}return true};
const rallyRef=()=>ref(state.db,`social/parties/${state.partyId}/rally`);
const rally=()=>state.party?.rally||null;
const members=()=>Object.keys(state.party?.members||{});
const isLeader=()=>state.party?.leaderUid===state.user?.uid;
const nameOf=uid=>rally()?.names?.[uid]||state.party?.members?.[uid]?.username||'Oyuncu';
const inThisParty=()=>q.get('nxParty')&&q.get('nxParty')===state.partyId;

/* ---------- styles ---------- */
function addStyle(){
  if(document.getElementById('nx-rally-style'))return;
  const s=document.createElement('style');s.id='nx-rally-style';
  s.textContent=`
  .nx-rally-card{margin:12px 0;padding:14px;border:1px solid rgba(186,255,24,.32);border-radius:14px;background:linear-gradient(180deg,rgba(23,29,35,.92),rgba(13,17,21,.94))}
  .nx-rally-card h4{margin:0;color:#f3f6f8;font:italic 800 20px/1 "Barlow Condensed","Arial Narrow",sans-serif;letter-spacing:.02em}
  .nx-rally-card h4 span{color:#baff18}
  .nx-rally-steps{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:8px 0 4px;color:#aab6c0;font:700 12px/1.2 "Barlow Condensed","Arial Narrow",sans-serif;letter-spacing:.06em}
  .nx-rally-steps b{padding:3px 8px;border:1px solid rgba(255,255,255,.12);border-radius:999px;color:#f3f6f8;font-weight:700}
  .nx-rally-steps b.done{border-color:rgba(186,255,24,.5);color:#dcff72}
  .nx-rally-steps b.now{background:#baff18;border-color:transparent;color:#0b1005}
  .nx-rally-card p{margin:6px 0 0;color:#aab6c0;font-size:12px;line-height:1.4}
  .nx-rally-card button{display:flex!important;align-items:center;justify-content:center!important;text-align:center!important;padding:0 14px!important;width:100%;min-height:46px;margin-top:10px;border:0;border-radius:12px;background:#baff18;color:#0b1005;font:800 15px/1 "Barlow Condensed","Arial Narrow",sans-serif;letter-spacing:.1em;cursor:pointer}
  .nx-rally-card button:disabled{background:rgba(255,255,255,.08);color:#75828d;cursor:not-allowed}
  .nx-rally-hud{position:fixed;z-index:400000;left:50%;top:max(8px,env(safe-area-inset-top));transform:translateX(-50%);display:flex;align-items:center;gap:8px;max-width:calc(100vw - 20px);padding:6px 12px;border:1px solid rgba(186,255,24,.45);border-radius:999px;background:rgba(10,13,16,.92);box-shadow:0 8px 20px rgba(0,0,0,.45);color:#f3f6f8;font:700 13px/1 "Barlow Condensed","Arial Narrow",sans-serif;letter-spacing:.06em;white-space:nowrap;pointer-events:none}
  .nx-rally-hud em{font-style:normal;color:#baff18}
  .nx-rally-hud span{color:#aab6c0}
  .nx-rally-overlay{position:fixed;inset:0;z-index:400100;display:grid;place-items:center;padding:20px;background:rgba(3,5,6,.82);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
  .nx-rally-panel{width:min(100%,420px);padding:22px 20px;border:1px solid rgba(186,255,24,.35);border-radius:18px;background:linear-gradient(180deg,#171d23,#0d1115);box-shadow:0 20px 50px rgba(0,0,0,.6);color:#f3f6f8;text-align:center;font-family:"Barlow",system-ui,sans-serif}
  .nx-rally-panel small{display:block;color:#baff18;font:800 12px/1 "Barlow Condensed","Arial Narrow",sans-serif;letter-spacing:.22em}
  .nx-rally-panel h3{margin:8px 0 4px;font:italic 800 34px/1 "Barlow Condensed","Arial Narrow",sans-serif}
  .nx-rally-score{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin:16px 0}
  .nx-rally-score div{min-width:0}
  .nx-rally-score b{display:block;font:800 44px/1 "Barlow Condensed","Arial Narrow",sans-serif}
  .nx-rally-score span{display:block;margin-top:4px;overflow:hidden;color:#aab6c0;font-size:13px;text-overflow:ellipsis;white-space:nowrap}
  .nx-rally-score i{color:#75828d;font:700 14px/1 "Barlow Condensed",sans-serif;font-style:normal}
  .nx-rally-score .lead b{color:#baff18}
  .nx-rally-list{display:grid;gap:6px;margin:0 0 14px;text-align:left}
  .nx-rally-list div{display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.03);font-size:13px}
  .nx-rally-list div b{font-family:"Barlow Condensed",sans-serif;letter-spacing:.04em}
  .nx-rally-panel p{margin:0;color:#aab6c0;font-size:14px;line-height:1.45}
  .nx-rally-panel button{width:100%;min-height:48px;margin-top:14px;border:0;border-radius:12px;background:#baff18;color:#0b1005;font:800 15px/1 "Barlow Condensed",sans-serif;letter-spacing:.1em;cursor:pointer}
  .nx-rally-final{position:relative;overflow:hidden}
  .nx-rally-trophy{width:64px;height:64px;margin:4px auto 6px;color:#baff18;filter:drop-shadow(0 0 14px rgba(186,255,24,.6));animation:nxRallyPop .7s cubic-bezier(.2,1.6,.4,1) both}
  .nx-rally-trophy svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
  .nx-rally-final h3{animation:nxRallyRise .5s ease .25s both}
  .nx-rally-duel{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}
  .nx-rally-side{padding:14px 8px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.03);animation:nxRallyRise .5s ease .45s both}
  .nx-rally-side b{display:block;font:800 48px/1 "Barlow Condensed","Arial Narrow",sans-serif}
  .nx-rally-side span{display:block;margin-top:6px;overflow:hidden;font:700 15px/1.1 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-overflow:ellipsis;white-space:nowrap}
  .nx-rally-side small{display:block;margin-top:6px;color:#75828d;font:700 11px/1 "Barlow Condensed",sans-serif;letter-spacing:.18em}
  .nx-rally-side.win{border-color:rgba(186,255,24,.7);background:rgba(186,255,24,.1);box-shadow:0 0 28px rgba(186,255,24,.25);animation:nxRallyWin .7s cubic-bezier(.2,1.4,.4,1) .6s both}
  .nx-rally-side.win b,.nx-rally-side.win small{color:#baff18}
  .nx-rally-side.lose{animation:nxRallyLose .7s ease .6s both}
  .nx-rally-confetti{position:absolute;inset:0;pointer-events:none;overflow:hidden}
  .nx-rally-confetti i{position:absolute;top:-12px;width:7px;height:12px;border-radius:2px;opacity:0;animation:nxRallyFall 2.6s linear infinite}
  @keyframes nxRallyPop{from{transform:scale(.2) rotate(-20deg);opacity:0}to{transform:none;opacity:1}}
  @keyframes nxRallyRise{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}
  @keyframes nxRallyWin{0%{transform:scale(.85);opacity:0}70%{transform:scale(1.06);opacity:1}100%{transform:scale(1.02);opacity:1}}
  @keyframes nxRallyLose{from{opacity:0;transform:translateY(10px)}to{opacity:.55;transform:scale(.96);filter:grayscale(.6)}}
  @keyframes nxRallyFall{0%{opacity:0;transform:translateY(0) rotate(0)}10%{opacity:1}100%{opacity:0;transform:translateY(560px) rotate(720deg)}}
  @media (prefers-reduced-motion:reduce){.nx-rally-trophy,.nx-rally-final h3,.nx-rally-side,.nx-rally-confetti i{animation:none!important}.nx-rally-side.lose{opacity:.55}}
  .nx-rally-panel button.ghost{background:rgba(255,255,255,.06);color:#f3f6f8;border:1px solid rgba(255,255,255,.14)}
  `;
  document.head.appendChild(s);
}

/* ---------- lobby card ---------- */
function stepsMarkup(r){
  return GAMES.map((g,i)=>{const cls=!r?'':r.status==='finished'||i<r.index?'done':i===r.index?'now':'';return `<b class="${cls}">${i+1}. ${esc(LABELS[g])}</b>`}).join('<span aria-hidden="true">→</span>');
}
function scoreLine(r){const [a,b]=Object.keys(r?.points||{});if(!a||!b)return '';return `${esc(nameOf(a))} ${r.points[a]} – ${r.points[b]} ${esc(nameOf(b))}`}
function patchLobby(){
  const layer=document.querySelector('.nx-social-drawer-layer');if(!layer)return;
  const hero=layer.querySelector('.nx-lobby-hero');
  let card=layer.querySelector('.nx-rally-card');
  if(!hero||!state.party){card?.remove();return}
  if(!card){card=document.createElement('section');card.className='nx-rally-card';hero.after(card)}
  const r=rally(),list=members(),readyAll=list.every(uid=>uid===state.party.leaderUid||state.party.members?.[uid]?.ready===true);
  const playing=r?.status==='playing';
  let note,button='';
  if(playing){note=`Rally sürüyor · ${r.index+1}/${GAMES.length} · ${scoreLine(r)}`;if(isLeader())button='<button type="button" data-nx-rally-resume>SIRADAKİ OYUNU BAŞLAT</button>'}
  else if(list.length!==2){note='Rally iki kişilik partide oynanır.'}
  else if(!isLeader()){note=r?.status==='finished'?`Son Rally: ${scoreLine(r)}. Yenisini lider başlatır.`:'Rally\'yi parti lideri başlatır.'}
  else{note=readyAll?'Galibiyet 3, beraberlik 1 puan. Eşitlikte Draft\'ı kazanan Rally\'yi alır.':'Rakibinin hazır olması bekleniyor.';button=`<button type="button" data-nx-rally-start ${readyAll?'':'disabled'}>RALLY BAŞLAT</button>`}
  const html=`<h4>RALLY <span>MODU</span></h4><div class="nx-rally-steps">${stepsMarkup(playing?r:null)}</div><p>${note}</p>${button}`;
  if(card.dataset.html!==html){card.dataset.html=html;card.innerHTML=html;
    card.querySelector('[data-nx-rally-start]')?.addEventListener('click',e=>startRally(e.currentTarget).catch(err=>lobbyStatus(err?.message||'Rally başlatılamadı.',true)));
    card.querySelector('[data-nx-rally-resume]')?.addEventListener('click',e=>launchGame(r.games[r.index],e.currentTarget))}
}
function lobbyStatus(text,error){const el=document.querySelector('.nx-social-drawer-layer.open .nx-drawer-status');if(el){el.textContent=text;el.classList.toggle('error',Boolean(error))}}
function watchLobby(){
  if(state.lobbyObserver)return;
  state.lobbyObserver=new MutationObserver(()=>{const layer=document.querySelector('.nx-social-drawer-layer .nx-lobby-hero');if(layer&&!layer.parentElement.querySelector('.nx-rally-card'))patchLobby()});
  state.lobbyObserver.observe(document.documentElement,{subtree:true,childList:true});
}

/* ---------- start / launch ---------- */
async function startRally(button){
  const p=state.party,list=members();
  if(!isLeader())throw new Error('Rally\'yi yalnızca parti lideri başlatabilir.');
  if(list.length!==2)throw new Error('Rally iki kişilik partide oynanır.');
  if(list.some(uid=>uid!==p.leaderUid&&p.members?.[uid]?.ready!==true))throw new Error('Rakibinin hazır olması gerekiyor.');
  button.disabled=true;
  const id=`r_${Date.now().toString(36)}`;
  await set(rallyRef(),{id,games:GAMES,index:0,status:'playing',leaderUid:p.leaderUid,startedAt:Date.now(),
    points:Object.fromEntries(list.map(uid=>[uid,0])),names:Object.fromEntries(list.map(uid=>[uid,p.members?.[uid]?.username||'Oyuncu'])),results:{}});
  launchGame(GAMES[0],button);
}
function launchGame(mode,button){
  const broker=window.NEON_PARTY_BROKER;
  if(typeof broker?.start!=='function'){lobbyStatus('Parti başlatıcısı hazır değil. Sayfayı yenileyip tekrar dene.',true);return}
  broker.start(mode,button||document.createElement('button'));
}

/* ---------- results ---------- */
function onMatchResult(e){
  const d=e.detail||{};if(!['wins','draws','losses'].includes(d.result))return;
  state.pending.push({mode:String(d.mode||''),result:d.result});flushResults();
}
function flushResults(){
  const r=rally();if(!r||r.status!=='playing'||!state.user||!inThisParty()){return}
  const game=r.games[r.index],idx=r.index,uid=state.user.uid;
  const item=state.pending.find(x=>x.mode===game);state.pending=[];if(!item)return;
  // First result per game wins (XOX can report several boards).
  runTransaction(ref(state.db,`social/parties/${state.partyId}/rally/results/${idx}/${uid}`),cur=>cur?undefined:{result:item.result,at:Date.now()},{applyLocally:false}).catch(err=>console.warn('[NEON XI] rally result not saved',err));
}
function decideWinner(r){
  const [a,b]=Object.keys(r.points||{});if(!a||!b)return '';
  if(r.points[a]!==r.points[b])return r.points[a]>r.points[b]?a:b;
  const last=r.results?.[r.games.length-1]||{};
  if(last[a]?.result==='wins')return a;if(last[b]?.result==='wins')return b;return '';
}
function maybeScore(){
  const r=rally();if(!r||r.status!=='playing'||!isLeader())return;
  const idx=r.index,res=r.results?.[idx]||{},list=Object.keys(r.points||{});
  if(!list.length||list.some(uid=>!res[uid]))return;
  runTransaction(rallyRef(),cur=>{
    if(!cur||cur.status!=='playing'||cur.index!==idx)return;
    const now=cur.results?.[idx]||{},ids=Object.keys(cur.points||{});if(ids.some(uid=>!now[uid]))return;
    for(const uid of ids)cur.points[uid]=(cur.points[uid]||0)+(POINTS[now[uid].result]||0);
    if(idx+1>=cur.games.length){cur.status='finished';cur.winner=decideWinner(cur);cur.finishedAt=Date.now()}
    else{cur.index=idx+1;cur.nextAt=Date.now()+NEXT_DELAY_MS}
    return cur;
  },{applyLocally:false}).catch(err=>console.warn('[NEON XI] rally scoring failed',err));
}

/* ---------- on-page UI ---------- */
function renderHud(){
  let hud=document.querySelector('.nx-rally-hud');const r=rally();
  if(!r||r.status!=='playing'||!inThisParty()){hud?.remove();return}
  if(!hud){hud=document.createElement('div');hud.className='nx-rally-hud';hud.setAttribute('role','status');document.body.appendChild(hud)}
  const html=`<em>RALLY ${r.index+1}/${r.games.length}</em><span>${esc(LABELS[r.games[r.index]])}</span>· ${scoreLine(r)}`;
  if(hud.dataset.html!==html){hud.dataset.html=html;hud.innerHTML=html}
}
function overlay(html){let o=document.querySelector('.nx-rally-overlay');if(!o){o=document.createElement('div');o.className='nx-rally-overlay';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');document.body.appendChild(o)}o.innerHTML=`<div class="nx-rally-panel">${html}</div>`;return o}
function closeOverlay(){document.querySelector('.nx-rally-overlay')?.remove();clearInterval(state.countdown);state.countdown=0}
function scoreBoard(r){
  const ids=Object.keys(r.points||{}),[a,b]=ids,lead=r.points[a]===r.points[b]?'':r.points[a]>r.points[b]?a:b;
  return `<div class="nx-rally-score"><div class="${lead===a?'lead':''}"><b>${r.points[a]??0}</b><span>${esc(nameOf(a))}</span></div><i>–</i><div class="${lead===b?'lead':''}"><b>${r.points[b]??0}</b><span>${esc(nameOf(b))}</span></div></div>`;
}
function gameList(r,upto){
  const label={wins:'kazandı',draws:'berabere',losses:'kaybetti'};
  return `<div class="nx-rally-list">${r.games.slice(0,upto).map((g,i)=>{const res=r.results?.[i]||{},w=Object.keys(res).find(uid=>res[uid]?.result==='wins'),draw=Object.values(res).some(x=>x?.result==='draws');return `<div><b>${i+1}. ${esc(LABELS[g])}</b><span>${w?esc(nameOf(w))+' '+label.wins:draw?label.draws:'—'}</span></div>`}).join('')}</div>`;
}
function renderInterstitial(){
  const r=rally();
  if(!r||!inThisParty()){return}
  if(r.status==='finished'){
    if(!once(`nxRallyFinal:${r.id}`))return;
    const w=r.winner,me=state.user?.uid,ids=Object.keys(r.points||{});
    const side=uid=>{const cls=!w?'':uid===w?'win':'lose';return `<div class="nx-rally-side ${cls}"><b data-count="${r.points[uid]||0}">0</b><span>${esc(nameOf(uid))}</span><small>${!w?'BERABERE':uid===w?'KAZANAN':'KAYBEDEN'}</small></div>`};
    const colours=['#baff18','#dcff72','#31ff76','#f3f6f8','#9adfff'];
    const confetti=w===me?`<div class="nx-rally-confetti" aria-hidden="true">${Array.from({length:28},(_,i)=>`<i style="left:${(i*37)%100}%;background:${colours[i%colours.length]};animation-delay:${(i%14)*.18}s;animation-duration:${2.2+(i%5)*.3}s"></i>`).join('')}</div>`:'';
    const trophy='<div class="nx-rally-trophy" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M8 6H5v1.5a3 3 0 0 0 3 3M16 6h3v1.5a3 3 0 0 1-3 3M12 13v3.5M8.5 20h7M10 16.5h4V20h-4Z"/></svg></div>';
    const o=overlay(`${confetti}<small>RALLY BİTTİ</small>${trophy}<h3>${w?(w===me?'RALLY SENİN!':esc(nameOf(w))+' KAZANDI'):'BERABERE'}</h3><div class="nx-rally-duel">${ids.map(side).join('')}</div>${gameList(r,r.games.length)}<button type="button" data-nx-rally-lobby>LOBİYE DÖN</button><button type="button" class="ghost" data-nx-rally-close>KAPAT</button>`);
    o.querySelector('.nx-rally-panel').classList.add('nx-rally-final');
    // count the points up
    o.querySelectorAll('[data-count]').forEach(el=>{const target=Number(el.dataset.count)||0,start=performance.now()+600;const step=t=>{const k=Math.min(1,Math.max(0,(t-start)/900));el.textContent=String(Math.round(target*k));if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)});
    o.querySelector('[data-nx-rally-close]').onclick=closeOverlay;
    o.querySelector('[data-nx-rally-lobby]').onclick=()=>{closeOverlay();window.NEON_SOCIAL?.open?.('party')};
    return;
  }
  // playing: a finished previous game with the next one queued
  if(r.status!=='playing'||!r.index||!r.nextAt)return;
  const doneIdx=r.index-1,key=`nxRallyNext:${r.id}:${r.index}`;
  if(!r.results?.[doneIdx])return;
  if(document.querySelector('.nx-rally-overlay')?.dataset.key===key)return;
  const next=r.games[r.index];
  const o=overlay(`<small>RALLY · ${r.index}/${r.games.length} TAMAMLANDI</small><h3>${esc(LABELS[r.games[doneIdx]])} bitti</h3>${scoreBoard(r)}${gameList(r,r.index)}<p data-nx-rally-next>Sıradaki oyun: <b>${esc(LABELS[next])}</b></p>`);
  o.dataset.key=key;
  clearInterval(state.countdown);
  const line=o.querySelector('[data-nx-rally-next]');
  const tick=()=>{const left=Math.max(0,Math.ceil((r.nextAt-Date.now())/1000));
    if(isLeader()){line.innerHTML=left>0?`Sıradaki oyun <b>${esc(LABELS[next])}</b> ${left} sn içinde başlıyor…`:`<b>${esc(LABELS[next])}</b> başlatılıyor…`;
      if(left<=0){clearInterval(state.countdown);state.countdown=0;if(once(key))launchGame(next)}}
    else line.innerHTML=left>0?`Sıradaki oyun <b>${esc(LABELS[next])}</b> ${left} sn içinde başlıyor…`:`Lider <b>${esc(LABELS[next])}</b> oyununu başlatıyor…`};
  tick();state.countdown=setInterval(tick,500);
}

/* ---------- data ---------- */
function onParty(party){
  state.party=party||null;
  if(!party){renderHud();patchLobby();return}
  flushResults();maybeScore();renderHud();renderInterstitial();patchLobby();
}
function bindUser(user){
  state.user=user;state.pointerOff?.();state.partyOff?.();state.partyOff=null;state.partyId='';state.party=null;
  if(!user)return;
  state.pointerOff=onValue(ref(state.db,`social/userParty/${user.uid}`),s=>{
    const id=String(s.val()||'');if(id===state.partyId)return;
    state.partyOff?.();state.partyOff=null;state.partyId=id;state.party=null;
    if(id)state.partyOff=onValue(ref(state.db,`social/parties/${id}`),p=>onParty(p.val()));else onParty(null);
  });
}
function boot(){
  addStyle();watchLobby();
  document.addEventListener('neon-match-result',onMatchResult);
  const wait=setInterval(()=>{if(!getApps().length)return;clearInterval(wait);
    state.db=getDatabase(getApp());onAuthStateChanged(getAuth(getApp()),bindUser)},100);
}
window.NEON_PARTY_RALLY={version:'1.0',games:GAMES,points:POINTS};
boot();
