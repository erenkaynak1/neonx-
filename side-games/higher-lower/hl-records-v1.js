/* NEON XI — Higher or Lower records.
   Stores each signed-in player's best streak at social/higherLower/allTime/{uid} and per ISO week at
   social/higherLower/weekly/{week}/{uid}, only when it beats the stored one (transaction), and reads
   the top 20 of either board. Guests without a profile keep their personal record locally only. */
import {getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,get,limitToLast,orderByChild,query,ref,runTransaction,serverTimestamp,update} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const weekKey=(date=new Date())=>{const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()-day+1);return d.toISOString().slice(0,10)};
async function ready(){for(let i=0;i<200&&!getApps().length;i++)await new Promise(r=>setTimeout(r,100));if(!getApps().length)throw new Error('Bağlantı kurulamadı.');const app=getApp();return {db:getDatabase(app),auth:getAuth(app)}}
const me=()=>{const u=window.NEON_IDENTITY||null,p=window.NEON_SOCIAL?.profile;return p?.username?{username:p.username}:u}

async function bump(db,path,entry){
  return runTransaction(ref(db,path),cur=>{if(cur&&Number(cur.best||0)>=entry.best)return;return {...entry,at:Date.now()}},{applyLocally:false});
}

window.NEON_HL_RECORDS={
  async submit({streak,question,questionLabel}){
    const {db,auth}=await ready(),user=auth.currentUser,profile=me();
    if(!user||!profile?.username||!(streak>0))return false;
    const entry={username:profile.username,best:Number(streak),question:String(question||''),questionLabel:String(questionLabel||'').slice(0,80)};
    await Promise.all([bump(db,`social/higherLower/allTime/${user.uid}`,entry),bump(db,`social/higherLower/weekly/${weekKey()}/${user.uid}`,entry)]);
    // Mirror the all-time best on the profile so the profile screen can show it without reading the board.
    const snap=await get(ref(db,`social/higherLower/allTime/${user.uid}/best`));
    await update(ref(db,`social/profiles/${user.uid}`),{higherLowerBest:Number(snap.val()||streak)}).catch(()=>{});
    window.NEON_HL?.refreshBoard();
    return true;
  },
  async top(board){
    const {db,auth}=await ready(),uid=auth.currentUser?.uid||'';
    const path=board==='weekly'?`social/higherLower/weekly/${weekKey()}`:'social/higherLower/allTime';
    let snap;
    try{snap=await get(query(ref(db,path),orderByChild('best'),limitToLast(20)))}
    catch(e){if(/permission/i.test(String(e?.code||e?.message||'')))throw new Error('Liderlik tablosu için giriş yapman gerekir.');throw new Error('Liderlik tablosu şu an açılamıyor.')}
    const rows=[];snap.forEach(c=>{const v=c.val()||{};rows.push({uid:c.key,username:v.username||'oyuncu',best:Number(v.best||0),questionLabel:v.questionLabel||'',me:c.key===uid})});
    return rows.sort((a,b)=>b.best-a.best);
  }
};
window.NEON_HL?.refreshBoard();
