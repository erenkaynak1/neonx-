(()=>{
'use strict';
const GAME_TYPE='career-twin';
const PREFIX='neonxi-career-twin-';
const ROOM_PREFIX='CT-';
const TTL_MS=3*60*60*1000;
const CONFIG={apiKey:'AIzaSyBLpXHGGTHXykKrnu8_Hv1i71oc3tpTNvY',authDomain:'neonxi.firebaseapp.com',databaseURL:'https://neonxi-default-rtdb.europe-west1.firebasedatabase.app',projectId:'neonxi',storageBucket:'neonxi.firebasestorage.app',messagingSenderId:'667191549799',appId:'1:667191549799:web:1e40feacbee09ed7f3d9c2'};
const later=fn=>setTimeout(fn,0);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const makeId=()=>{try{return crypto.randomUUID()}catch{return 'ct-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)}};

const firebaseReady=Promise.all([
  import('https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js'),
  import('https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js')
]).then(([appMod,authMod,dbMod])=>{
  const app=appMod.getApps().length?appMod.getApp():appMod.initializeApp(CONFIG);
  return {app,auth:authMod.getAuth(app),db:dbMod.getDatabase(app),...authMod,...dbMod};
});

async function ensureUser(ctx){
  if(ctx.auth.currentUser)return ctx.auth.currentUser;
  const restored=await new Promise(resolve=>{
    let done=false,off=()=>{};
    const finish=user=>{if(done)return;done=true;try{off()}catch{}resolve(user||null)};
    off=ctx.onAuthStateChanged(ctx.auth,finish,()=>finish(null));
    setTimeout(()=>finish(ctx.auth.currentUser),1400);
  });
  if(restored)return restored;
  const cred=await ctx.signInAnonymously(ctx.auth);
  return cred.user;
}

class Emitter{
  constructor(){this._events=new Map();this._opened=false}
  on(type,fn){if(typeof fn!=='function')return this;if(!this._events.has(type))this._events.set(type,[]);this._events.get(type).push(fn);if(type==='open'&&this._opened)later(()=>{try{fn(this.id)}catch(e){console.warn(e)}});return this}
  _emit(type,...args){for(const fn of (this._events.get(type)||[]).slice()){try{fn(...args)}catch(e){console.warn('Career Twin Firebase listener',e)}}}
}

class FirebaseConnection extends Emitter{
  constructor(owner,remoteId){super();this.owner=owner;this.peer=remoteId;this.open=false;this._closed=false}
  _markOpen(){if(this._closed||this.open)return;this.open=true;this._opened=true;later(()=>this._emit('open'))}
  send(payload){if(!this.open||this._closed)return;this.owner._sendEnvelope(this.peer,'data',payload).catch(e=>this._emit('error',e))}
  close(silent=false){if(this._closed)return;this._closed=true;const wasOpen=this.open;this.open=false;if(wasOpen&&!silent)this.owner._sendEnvelope(this.peer,'close',null).catch(()=>{});later(()=>this._emit('close'))}
  _remoteClose(){if(this._closed)return;this._closed=true;this.open=false;later(()=>this._emit('close'))}
  _data(payload){if(!this._closed)later(()=>this._emit('data',payload))}
}

class FirebasePeer extends Emitter{
  constructor(id){
    super();
    this.id=id||('career-'+makeId());
    this.destroyed=false;
    this._host=String(this.id).startsWith(PREFIX);
    this._code=this._host?String(this.id).slice(PREFIX.length):'';
    this._ctx=null;this._user=null;this._roomRef=null;this._actionsRef=null;this._connections=new Map();this._unsubActions=null;this._unsubRoom=null;this._disconnect=null;
    this._init();
  }
  async _init(){
    try{
      this._ctx=await firebaseReady;
      this._user=await ensureUser(this._ctx);
      if(this.destroyed)return;
      if(this._host)await this._createHostRoom();
      this._opened=true;
      later(()=>this._emit('open',this.id));
    }catch(e){if(!this.destroyed)later(()=>this._emit('error',e))}
  }
  _roomKey(code=this._code){return ROOM_PREFIX+String(code)}
  async _createHostRoom(){
    const c=this._ctx,t=Date.now(),roomRef=c.ref(c.db,`rooms/${this._roomKey()}`);
    const result=await c.runTransaction(roomRef,current=>{
      const stale=current&&current.gameType===GAME_TYPE&&Number(current.expiresAt||0)<t;
      if(current&&!stale)return;
      return {version:'career-twin-firebase-v2',gameType:GAME_TYPE,status:'waiting',hostPeerId:this.id,hostUid:this._user.uid,createdAt:t,updatedAt:t,expiresAt:t+TTL_MS,hostConnected:true,actions:{}};
    },{applyLocally:false});
    if(!result.committed){const err=new Error('room-code-in-use');err.type='unavailable-id';throw err}
    this._roomRef=roomRef;this._actionsRef=c.ref(c.db,`rooms/${this._roomKey()}/actions`);
    this._disconnect=c.onDisconnect(roomRef);await this._disconnect.remove();
    this._watchActions();
  }
  connect(targetId){
    const target=String(targetId||''),conn=new FirebaseConnection(this,target);this._connections.set(target,conn);
    (async()=>{
      try{
        if(!this._ctx){this._ctx=await firebaseReady;this._user=await ensureUser(this._ctx)}
        const code=target.startsWith(PREFIX)?target.slice(PREFIX.length):'';
        if(!code)throw Object.assign(new Error('peer-unavailable'),{type:'peer-unavailable'});
        this._code=code;
        const roomRef=this._ctx.ref(this._ctx.db,`rooms/${this._roomKey(code)}`);
        let room=null;
        for(let attempt=0;attempt<30&&!room&&!this.destroyed;attempt++){
          const snap=await this._ctx.get(roomRef),candidate=snap.val();
          if(candidate&&candidate.gameType===GAME_TYPE&&candidate.status!=='closed'&&Number(candidate.expiresAt||0)>=Date.now())room=candidate;
          else if(attempt<29)await wait(400);
        }
        if(!room)throw Object.assign(new Error('peer-unavailable'),{type:'peer-unavailable'});
        this._roomRef=roomRef;this._actionsRef=this._ctx.ref(this._ctx.db,`rooms/${this._roomKey(code)}/actions`);
        this._watchActions();this._watchRoom();
        await this._sendEnvelope(target,'connect',null);conn._markOpen();
      }catch(e){later(()=>{conn._emit('error',e);this._emit('error',e)})}
    })();
    return conn;
  }
  _watchActions(){
    if(!this._ctx||!this._actionsRef||this._unsubActions)return;
    this._unsubActions=this._ctx.onChildAdded(this._actionsRef,snap=>this._consume(snap));
  }
  _watchRoom(){
    if(!this._ctx||!this._roomRef||this._host||this._unsubRoom)return;
    this._unsubRoom=this._ctx.onValue(this._roomRef,snap=>{
      if(this.destroyed)return;const room=snap.val();
      if(!room||room.status==='closed'){const err=Object.assign(new Error('peer-unavailable'),{type:'peer-unavailable'});this._emit('error',err);for(const c of this._connections.values())c._remoteClose()}
    });
  }
  async _sendEnvelope(remoteId,kind,payload){
    if(this.destroyed||!this._ctx||!this._actionsRef)throw new Error('room-not-ready');
    const actionRef=this._ctx.push(this._actionsRef);
    await this._ctx.set(actionRef,{kind,from:this.id,to:String(remoteId),payload:payload??null,createdAt:this._ctx.serverTimestamp()});
  }
  _ensureIncoming(remoteId){let conn=this._connections.get(remoteId);if(conn)return conn;conn=new FirebaseConnection(this,remoteId);this._connections.set(remoteId,conn);conn._markOpen();later(()=>this._emit('connection',conn));return conn}
  async _consume(snap){
    const a=snap.val();if(!a||a.to!==this.id)return;
    try{
      if(a.kind==='connect')this._ensureIncoming(a.from);
      else if(a.kind==='data'){const conn=this._host?this._ensureIncoming(a.from):this._connections.get(a.from);if(conn){if(!conn.open)conn._markOpen();conn._data(a.payload)}}
      else if(a.kind==='close'){const conn=this._connections.get(a.from);if(conn)conn._remoteClose()}
    }finally{try{await this._ctx.remove(snap.ref)}catch{}}
  }
  async destroy(){
    if(this.destroyed)return;this.destroyed=true;
    try{this._unsubActions&&this._unsubActions()}catch{}try{this._unsubRoom&&this._unsubRoom()}catch{}this._unsubActions=this._unsubRoom=null;
    for(const c of this._connections.values()){try{c.close(true)}catch{}}this._connections.clear();
    try{this._disconnect&&await this._disconnect.cancel()}catch{}
    if(this._host&&this._roomRef&&this._ctx){try{await this._ctx.remove(this._roomRef)}catch{}}
    this._roomRef=this._actionsRef=null;later(()=>this._emit('close'));
  }
}

window.Peer=FirebasePeer;
window.NXCareerTwinTransport='firebase-realtime-v2';
window.NXCareerTwinFirebaseReady=firebaseReady;
})();
