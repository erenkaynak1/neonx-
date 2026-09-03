import {getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,onDisconnect,onValue,ref,remove,runTransaction,set} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const MODES={
  draft:{label:'NEON XI Draft',path:'index.html',players:2},
  xox:{label:'Futbol XOX',path:'side-games/football-xox/index.html',players:2},
  twin:{label:'Kariyer İkizi',path:'side-games/career-twin/index.html',players:2},
  imposter:{label:'Futbol Imposter',path:'side-games/futbol-imposter.html',players:3},
  wordle:{label:'Football Wordle',path:'side-games/football-wordle/online.html',players:2}
};
const base=new URL('../',import.meta.url);
let auth=null,db=null,queueOff=null,currentQueue=null;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function identity(){
  const user=auth?.currentUser,profile=window.NEON_SOCIAL?.profile;
  if(!user||!profile?.username)return null;
  return {uid:user.uid,username:profile.username};
}
function codeFor(mode){
  if(mode==='draft')return [...Array(6)].map(()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
  return String(Math.floor(1000+Math.random()*9000));
}
function targetUrl(mode,data,me){
  const config=MODES[mode],u=new URL(config.path,base);
  const members=Array.isArray(data.members)?data.members:[];
  const others=members.filter(uid=>uid!==me.uid);
  const params={
    nxAuto:'1',
    nxRole:data.role||'guest',
    nxCode:data.roomCode||'',
    nxName:me.username,
    nxUid:me.uid,
    nxOpponent:others[0]||data.opponentUid||'',
    nxMatch:data.matchId||'',
    nxPartySize:String(members.length||config.players),
    nxPlayers:members.join(',')
  };
  Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,String(v)));
  return u.href;
}
function status(text,error=false){
  const el=document.querySelector('.nx-social-status');
  if(el){el.textContent=text;el.classList.toggle('error',error)}
}
function renderSearching(mode){
  const view=document.querySelector('.nx-social-view[data-view="play"]');if(!view)return;
  const need=MODES[mode].players;
  view.innerHTML=`<div class="nx-social-searching"><b>${esc(MODES[mode].label)}</b><div>${need===2?'Çevrimiçi rakip':'Çevrimiçi oyuncular'} aranıyor…</div><small style="display:block;margin:7px 0 13px;color:#91a397">${need===2?'Arkadaş olmanız gerekmez.':'Oyun 3 oyuncuya ulaştığında otomatik başlayacak.'}</small><button class="nx-social-btn nx-social-danger" type="button" data-nx-universal-cancel>ARAMAYI İPTAL ET</button></div>`;
  view.querySelector('[data-nx-universal-cancel]').onclick=cancelSearch;
}
async function cancelSearch(){
  queueOff?.();queueOff=null;
  if(currentQueue&&db){try{await remove(ref(db,`social/universalQueues/${currentQueue.mode}/${currentQueue.uid}`))}catch{}}
  currentQueue=null;status('Eşleşme araması iptal edildi.');window.NEON_SOCIAL?.open?.('play');
}
async function startSearch(mode){
  const config=MODES[mode];if(!config)return;
  const me=identity();if(!me){window.NEON_SOCIAL?.open?.('friends');return}
  await cancelSearch().catch(()=>{});
  const path=`social/universalQueues/${mode}`,joinedAt=Date.now(),selfRef=ref(db,`${path}/${me.uid}`);
  currentQueue={mode,uid:me.uid};
  await set(selfRef,{uid:me.uid,username:me.username,status:'waiting',joinedAt});
  onDisconnect(selfRef).remove().catch(()=>{});
  status(`${config.label}: eşleşme aranıyor…`);renderSearching(mode);

  await runTransaction(ref(db,path),q=>{
    q=q||{};
    if(q[me.uid]?.status!=='waiting')return q;
    const now=Date.now();
    const waiting=Object.values(q)
      .filter(x=>x&&x.status==='waiting'&&now-Number(x.joinedAt||0)<120000)
      .sort((a,b)=>Number(a.joinedAt||0)-Number(b.joinedAt||0));
    if(waiting.length<config.players)return q;
    const group=waiting.slice(0,config.players),members=group.map(x=>x.uid);
    if(!members.includes(me.uid))return q;
    const hostUid=members[0],stamp=Math.min(...group.map(x=>Number(x.joinedAt||now))),matchId=`u_${mode}_${stamp}_${hostUid.slice(0,7)}`,roomCode=codeFor(mode);
    for(const p of group){
      q[p.uid]={...q[p.uid],status:'matched',matchId,roomCode,members,role:p.uid===hostUid?'host':'guest',opponentUid:members.find(x=>x!==p.uid)||''};
    }
    return q;
  },{applyLocally:false});

  queueOff?.();
  queueOff=onValue(selfRef,s=>{
    const data=s.val();if(data?.status!=='matched')return;
    queueOff?.();queueOff=null;currentQueue=null;
    status('Eşleşme bulundu. Oyun açılıyor…');
    setTimeout(()=>{location.href=targetUrl(mode,data,me)},250);
  });
}
function ensureModeOptions(){
  const select=document.querySelector('.nx-social-view[data-view="play"] #nxMode');if(!select)return;
  for(const [value,config] of Object.entries(MODES)){
    if(!select.querySelector(`option[value="${value}"]`)){
      const o=document.createElement('option');o.value=value;o.textContent=config.label;select.appendChild(o);
    }
  }
  const match=document.querySelector('.nx-social-view[data-view="play"] [data-act="match"]');
  if(match){match.textContent='RAKİP BUL';match.title='Seçtiğin oyun için otomatik çevrimiçi eşleşme başlatır.'}
  const hint=document.querySelector('.nx-social-match-hint');
  if(hint)hint.textContent='Arkadaş gerekmez · seçtiğin oyunda çevrimiçi oyuncularla otomatik eşleşirsin.';
}
function bind(){
  document.addEventListener('click',e=>{
    const match=e.target.closest('.nx-social-shade [data-act="match"]');
    if(!match)return;
    const select=document.querySelector('.nx-social-view[data-view="play"] #nxMode');
    const mode=select?.value;
    if(!MODES[mode])return;
    e.preventDefault();e.stopImmediatePropagation();
    startSearch(mode).catch(err=>{console.error(err);status(err?.message||'Eşleşme başlatılamadı.',true);window.NEON_SOCIAL?.open?.('play')});
  },true);
  setInterval(ensureModeOptions,400);
  window.addEventListener('beforeunload',()=>{
    if(currentQueue&&db)remove(ref(db,`social/universalQueues/${currentQueue.mode}/${currentQueue.uid}`)).catch(()=>{});
  });
}
function boot(){
  const timer=setInterval(()=>{
    if(!window.NEON_SOCIAL||!getApps().length)return;
    clearInterval(timer);auth=getAuth(getApp());db=getDatabase(getApp());bind();ensureModeOptions();
  },50);
}
boot();
