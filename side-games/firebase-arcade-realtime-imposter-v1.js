(()=>{
'use strict';
const CONFIG={apiKey:'AIzaSyBLpXHGGTHXykKrnu8_Hv1i71oc3tpTNvY',authDomain:'neonxi.firebaseapp.com',databaseURL:'https://neonxi-default-rtdb.europe-west1.firebasedatabase.app',projectId:'neonxi',storageBucket:'neonxi.firebasestorage.app',messagingSenderId:'667191549799',appId:'1:667191549799:web:1e40feacbee09ed7f3d9c2'};
const ROOM_PREFIX='IMP-';
const DEFAULT_TTL=3*60*60*1000;
const actionRooms=new Map();
const safeJSON=(value,fallback)=>{try{return JSON.parse(value)}catch{return fallback}};
const makeId=()=>{try{return crypto.randomUUID()}catch{return 'nx-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12)}};

const ready=Promise.all([
  import('https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js'),
  import('https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js')
]).then(async([appMod,authMod,dbMod])=>{
  const app=appMod.getApps().length?appMod.getApp():appMod.initializeApp(CONFIG);
  const auth=authMod.getAuth(app),db=dbMod.getDatabase(app);
  const ensureUser=async()=>{
    if(auth.currentUser)return auth.currentUser;
    const restored=await new Promise(resolve=>{
      let done=false,off=()=>{};
      const finish=user=>{if(done)return;done=true;try{off()}catch{}resolve(user||null)};
      off=authMod.onAuthStateChanged(auth,finish,()=>finish(null));
      setTimeout(()=>finish(auth.currentUser),1400);
    });
    if(restored)return restored;
    return (await authMod.signInAnonymously(auth)).user;
  };
  await ensureUser();

  const roomKey=code=>ROOM_PREFIX+String(code||'').toUpperCase();
  const roomRefById=id=>dbMod.ref(db,`rooms/${id}`);
  const rawRoom=(id,value)=>value?{id,...value}:null;
  const decodeRoom=room=>room?{...room,members:safeJSON(room.members_json,[]),state:safeJSON(room.state_json,{})}:null;
  const decodeAction=record=>record?{...record,action:safeJSON(record.action_json,{})}:null;

  async function findRoom(gameType,code){
    const id=roomKey(code),snap=await dbMod.get(roomRefById(id));
    if(!snap.exists())return null;
    const r=rawRoom(id,snap.val()),t=Date.now();
    if(r.game_type!==gameType||r.status==='closed'||Number(r.expires_ms||0)<=t)return null;
    return r;
  }

  async function createRoom({gameType,code,ownerId,members,state,status='waiting',ttlMs=DEFAULT_TTL}){
    const id=roomKey(code),ref=roomRefById(id),t=Date.now();
    const result=await dbMod.runTransaction(ref,current=>{
      const stale=current&&(current.status==='closed'||Number(current.expires_ms||0)<=t);
      const mine=current&&current.game_type===gameType&&current.owner_id===String(ownerId)&&current.status==='waiting';
      if(current&&!stale&&!mine)return;
      return {
        room_code:String(code),game_type:gameType,owner_id:String(ownerId),status,
        members_json:JSON.stringify(members||[]),state_json:JSON.stringify(state||{}),actions_json:'[]',
        revision:Number(mine?current.revision:0)+1,updated_ms:t,expires_ms:t+ttlMs,
        created_ms:mine?Number(current.created_ms||t):t
      };
    },{applyLocally:false});
    if(!result.committed)throw new Error('room-code-in-use');
    const room=rawRoom(id,result.snapshot.val());
    try{await dbMod.onDisconnect(ref).remove()}catch(e){console.warn('Imposter disconnect cleanup skipped',e)}
    return room;
  }

  async function updateRoom(roomId,patch={}){
    const ref=roomRefById(roomId),snap=await dbMod.get(ref);
    if(!snap.exists())throw new Error('room-not-found');
    const current=snap.val(),data={...patch,updated_ms:Date.now()};
    if('members' in data){data.members_json=JSON.stringify(data.members||[]);delete data.members}
    if('state' in data){data.state_json=JSON.stringify(data.state||{});delete data.state}
    await dbMod.update(ref,data);
    return rawRoom(roomId,{...current,...data});
  }

  async function sendAction({roomId,roomCode,gameType,senderId,action}){
    const actionsRef=dbMod.ref(db,`rooms/${roomId}/arcadeActions`),ref=dbMod.push(actionsRef),created=Date.now();
    const rec={room_id:String(roomId),room_code:String(roomCode),game_type:gameType,sender_id:String(senderId),action_json:JSON.stringify(action||{}),created_ms:created};
    actionRooms.set(ref.key,roomId);
    await dbMod.set(ref,rec);
    return {id:ref.key,...rec};
  }

  function subscribeRoom(roomId,callback){
    const ref=roomRefById(roomId);
    return dbMod.onValue(ref,snap=>callback({id:roomId,type:snap.exists()?'update':'delete',data:snap.exists()?rawRoom(roomId,snap.val()):null}));
  }

  function subscribeActions(roomId,callback){
    const ref=dbMod.ref(db,`rooms/${roomId}/arcadeActions`);
    return dbMod.onChildAdded(ref,snap=>{
      actionRooms.set(snap.key,roomId);
      callback({type:'create',data:{id:snap.key,...snap.val()}});
    });
  }

  async function listActions(roomId,sinceMs=0){
    const snap=await dbMod.get(dbMod.ref(db,`rooms/${roomId}/arcadeActions`)),out=[];
    snap.forEach(child=>{const v=child.val();if(Number(v?.created_ms||0)>Number(sinceMs||0)){actionRooms.set(child.key,roomId);out.push({id:child.key,...v})}});
    return out.sort((a,b)=>Number(a.created_ms||0)-Number(b.created_ms||0));
  }

  async function deleteAction(id){
    const roomId=actionRooms.get(String(id));
    if(!roomId)return null;
    actionRooms.delete(String(id));
    try{await dbMod.remove(dbMod.ref(db,`rooms/${roomId}/arcadeActions/${id}`));return true}catch{return null}
  }

  async function closeRoom(roomId){
    try{await dbMod.update(roomRefById(roomId),{status:'closed',updated_ms:Date.now(),expires_ms:Date.now()+60000});return true}catch{return null}
  }

  return {makeId,findRoom,createRoom,updateRoom,sendAction,subscribeRoom,subscribeActions,listActions,deleteAction,closeRoom,decodeRoom,decodeAction};
});

window.NXArcadeRealtime={ready,makeId};
window.NXImposterTransport='firebase-realtime-v1';
})();
