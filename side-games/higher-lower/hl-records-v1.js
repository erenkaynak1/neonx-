/* NEON XI — Higher or Lower records.
   Each signed-in player's best streak goes to social/higherLower/allTime/{uid} and, per ISO week, to
   social/higherLower/weekly/{week}/{uid}, only when it beats the stored one (transaction). If the database
   rules do not allow those paths, the best is kept on the player's existing leaderboard entry instead
   (social/leaderboards/{allTime|weekly/{week}}/{uid}: hlBest, hlQuestionLabel), which every player can read.
   Boards are read only after the sign-in state is restored. Guests without a profile keep their record locally. */
import {getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,get,limitToLast,onValue,orderByChild,query,ref,runTransaction,update} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const weekKey=(date=new Date())=>{const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()-day+1);return d.toISOString().slice(0,10)};
const denied=e=>/permission|denied/i.test(String(e?.code||'')+' '+String(e?.message||''));
let ctx=null;
async function ready(){
  if(ctx)return ctx;
  for(let i=0;i<200&&!getApps().length;i++)await new Promise(r=>setTimeout(r,100));
  if(!getApps().length)throw new Error('Bağlantı kurulamadı.');
  const app=getApp(),auth=getAuth(app);
  // Wait for the first auth emission so a returning player is not read as signed out.
  await new Promise(res=>{const off=onAuthStateChanged(auth,()=>{off();res()},()=>res());setTimeout(res,6000)});
  ctx={db:getDatabase(app),auth};
  onAuthStateChanged(auth,()=>window.NEON_HL?.refreshBoard());
  return ctx;
}
const me=()=>{const p=window.NEON_SOCIAL?.profile;return p?.username?{username:p.username}:(window.NEON_IDENTITY||null)};
async function profileName(db,uid){const p=me();if(p?.username)return p.username;try{return String((await get(ref(db,`social/profiles/${uid}/username`))).val()||'')}catch{return ''}}

const bump=(db,path,entry)=>runTransaction(ref(db,path),cur=>{if(cur&&Number(cur.best||0)>=entry.best)return;return {...entry,at:Date.now()}},{applyLocally:false});
// Fallback: merge hlBest into the player's leaderboard entry without touching the match stats.
const bumpBoard=(db,path,entry)=>runTransaction(ref(db,path),cur=>{if(cur&&Number(cur.hlBest||0)>=entry.best)return;return {...(cur||{}),username:(cur&&cur.username)||entry.username,hlBest:entry.best,hlQuestionLabel:entry.questionLabel,hlAt:Date.now()}},{applyLocally:false});

window.NEON_HL_RECORDS={
  async submit({streak,question,questionLabel}){
    const {db,auth}=await ready(),user=auth.currentUser;
    // Defense in depth: the database rules cap this too, but reject impossible values before writing.
    if(!user||!Number.isInteger(streak)||streak<1||streak>10000)return false;
    const username=await profileName(db,user.uid);if(!username)return false;
    const entry={username,best:Number(streak),question:String(question||''),questionLabel:String(questionLabel||'').slice(0,80)};
    const wk=weekKey();
    let best=entry.best;
    try{
      await Promise.all([bump(db,`social/higherLower/allTime/${user.uid}`,entry),bump(db,`social/higherLower/weekly/${wk}/${user.uid}`,entry)]);
      best=Number((await get(ref(db,`social/higherLower/allTime/${user.uid}/best`))).val()||best);
    }catch(e){
      if(!denied(e))throw e;
      await Promise.all([bumpBoard(db,`social/leaderboards/allTime/${user.uid}`,entry),bumpBoard(db,`social/leaderboards/weekly/${wk}/${user.uid}`,entry)]);
      best=Number((await get(ref(db,`social/leaderboards/allTime/${user.uid}/hlBest`))).val()||best);
    }
    // Mirror the all-time best on the profile so the profile screen can show it without reading a board.
    await update(ref(db,`social/profiles/${user.uid}`),{higherLowerBest:best}).catch(()=>{});
    window.NEON_HL?.refreshBoard();
    return true;
  },
  async top(board){
    const {db,auth}=await ready(),uid=auth.currentUser?.uid||'',wk=weekKey();
    const rows=new Map(),add=(key,best,username,label)=>{best=Number(best||0);if(!(best>0))return;const old=rows.get(key);if(!old||old.best<best)rows.set(key,{uid:key,username:username||'oyuncu',best,questionLabel:label||'',me:key===uid})};
    let ok=false,lastErr=null;
    const primary=board==='weekly'?`social/higherLower/weekly/${wk}`:'social/higherLower/allTime';
    try{(await get(query(ref(db,primary),orderByChild('best'),limitToLast(20)))).forEach(c=>{const v=c.val()||{};add(c.key,v.best,v.username,v.questionLabel)});ok=true}catch(e){lastErr=e}
    const fallback=board==='weekly'?`social/leaderboards/weekly/${wk}`:'social/leaderboards/allTime';
    try{(await get(ref(db,fallback))).forEach(c=>{const v=c.val()||{};add(c.key,v.hlBest,v.username,v.hlQuestionLabel)});ok=true}catch(e){lastErr=lastErr||e}
    if(!ok)throw new Error(denied(lastErr)?'Liderlik tablosu için giriş yapman gerekir.':'Liderlik tablosu şu an açılamıyor.');
    return [...rows.values()].sort((a,b)=>b.best-a.best).slice(0,20);
  },
  // Live board: calls cb(rows) on every change of either source, cb(null, error) if neither can be read.
  // Returns an unsubscribe function.
  watch(board,cb){
    let offs=[],stopped=false;
    ready().then(({db,auth})=>{
      if(stopped)return;
      const wk=weekKey(),src={primary:null,fallback:null},failed={primary:false,fallback:false};
      const emit=()=>{
        if(stopped)return;
        if(failed.primary&&failed.fallback){cb(null,new Error('Liderlik tablosu şu an açılamıyor.'));return}
        if(src.primary===null&&src.fallback===null&&!(failed.primary||failed.fallback))return;
        const uid=auth.currentUser?.uid||'',rows=new Map();
        const add=(key,best,username,label)=>{best=Number(best||0);if(!(best>0))return;const old=rows.get(key);if(!old||old.best<best)rows.set(key,{uid:key,username:username||'oyuncu',best,questionLabel:label||'',me:key===uid})};
        Object.entries(src.primary||{}).forEach(([k,v])=>add(k,v?.best,v?.username,v?.questionLabel));
        Object.entries(src.fallback||{}).forEach(([k,v])=>add(k,v?.hlBest,v?.username,v?.hlQuestionLabel));
        cb([...rows.values()].sort((a,b)=>b.best-a.best));
      };
      const primary=board==='weekly'?`social/higherLower/weekly/${wk}`:'social/higherLower/allTime';
      const fallback=board==='weekly'?`social/leaderboards/weekly/${wk}`:'social/leaderboards/allTime';
      offs.push(onValue(query(ref(db,primary),orderByChild('best'),limitToLast(50)),s=>{src.primary=s.val()||{};emit()},()=>{failed.primary=true;src.primary={};emit()}));
      offs.push(onValue(ref(db,fallback),s=>{src.fallback=s.val()||{};emit()},()=>{failed.fallback=true;src.fallback={};emit()}));
    }).catch(e=>cb(null,e));
    return ()=>{stopped=true;offs.forEach(off=>{try{off()}catch{}});offs=[]};
  },
  async avatar(uid){const {db}=await ready();return String((await get(ref(db,`social/profiles/${uid}/avatar`))).val()||'')},
  async me(){const {auth}=await ready();return auth.currentUser?.uid||''}
};
ready().then(()=>window.NEON_HL?.refreshBoard()).catch(()=>window.NEON_HL?.refreshBoard());
