(()=>{
'use strict';
const GAME_TYPE='career-twin';
const PREFIX='neonxi-career-twin-';
const later=fn=>setTimeout(fn,0);
class Emitter{
  constructor(){this._events=new Map();this._opened=false}
  on(type,fn){if(typeof fn!=='function')return this;if(!this._events.has(type))this._events.set(type,[]);this._events.get(type).push(fn);if(type==='open'&&this._opened)later(()=>{try{fn(this.id)}catch(e){console.warn(e)}});return this}
  _emit(type,...args){for(const fn of (this._events.get(type)||[]).slice()){try{fn(...args)}catch(e){console.warn('NEON XI realtime listener',e)}}}
}
class RealtimeConnection extends Emitter{
  constructor(owner,remoteId){super();this.owner=owner;this.peer=remoteId;this.open=false;this._closed=false}
  _markOpen(){if(this._closed||this.open)return;this.open=true;this._opened=true;later(()=>this._emit('open'))}
  send(payload){if(!this.open||this._closed)return;this.owner._send(this.peer,payload).catch(e=>this._emit('error',e))}
  close(silent=false){if(this._closed)return;this._closed=true;const wasOpen=this.open;this.open=false;if(wasOpen&&!silent)this.owner._sendEnvelope(this.peer,'close',null).catch(()=>{});later(()=>this._emit('close'))}
  _remoteClose(){if(this._closed)return;this._closed=true;this.open=false;later(()=>this._emit('close'))}
  _data(payload){if(!this._closed)later(()=>this._emit('data',payload))}
}
class Base44Peer extends Emitter{
  constructor(id){super();this.id=id||('career-'+(window.NXArcadeRealtime?.makeId?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)));this.destroyed=false;this._host=String(this.id).startsWith(PREFIX);this._code=this._host?String(this.id).slice(PREFIX.length):'';this._rt=null;this._room=null;this._connections=new Map();this._processed=new Set();this._unsub=null;this._poll=null;this._init()}
  async _init(){try{if(!window.NXArcadeRealtime?.ready)throw new Error('realtime-loader');this._rt=await window.NXArcadeRealtime.ready;if(this.destroyed)return;if(this._host){try{const created=await this._rt.createRoom({gameType:GAME_TYPE,code:this._code,ownerId:this.id,members:[],state:{transport:'base44-peer-shim'}});this._room=this._rt.decodeRoom(created)}catch(e){const err=e instanceof Error?e:new Error(String(e));if(String(err.message).includes('room-code-in-use'))err.type='unavailable-id';throw err}this._watch()}this._opened=true;later(()=>this._emit('open',this.id))}catch(e){if(!this.destroyed)later(()=>this._emit('error',e))}}
  connect(targetId){const target=String(targetId||'');const conn=new RealtimeConnection(this,target);this._connections.set(target,conn);(async()=>{try{if(!this._rt)this._rt=await window.NXArcadeRealtime.ready;const code=target.startsWith(PREFIX)?target.slice(PREFIX.length):'';const found=await this._rt.findRoom(GAME_TYPE,code);if(!found)throw Object.assign(new Error('peer-unavailable'),{type:'peer-unavailable'});this._room=this._rt.decodeRoom(found);this._code=code;this._watch();await this._sendEnvelope(target,'connect',null);conn._markOpen()}catch(e){later(()=>{conn._emit('error',e);this._emit('error',e)})}})();return conn}
  async _send(remoteId,payload){return this._sendEnvelope(remoteId,'data',payload)}
  async _sendEnvelope(remoteId,kind,payload){if(this.destroyed||!this._room||!this._rt)throw new Error('room-not-ready');return this._rt.sendAction({roomId:this._room.id,roomCode:this._code,gameType:GAME_TYPE,senderId:this.id,action:{__b44peer:1,kind,from:this.id,to:String(remoteId),payload}})}
  _ensureIncoming(remoteId){let conn=this._connections.get(remoteId);if(conn)return conn;conn=new RealtimeConnection(this,remoteId);this._connections.set(remoteId,conn);conn._markOpen();later(()=>this._emit('connection',conn));return conn}
  async _consume(record){if(!record||this._processed.has(record.id)||!this._rt)return;const d=this._rt.decodeAction(record),a=d?.action;if(!a||a.__b44peer!==1||a.to!==this.id)return;this._processed.add(record.id);try{if(a.kind==='connect'){this._ensureIncoming(a.from)}else if(a.kind==='data'){const conn=this._host?this._ensureIncoming(a.from):this._connections.get(a.from);if(conn){if(!conn.open)conn._markOpen();conn._data(a.payload)}}else if(a.kind==='close'){const conn=this._connections.get(a.from);if(conn)conn._remoteClose()}await this._rt.deleteAction(record.id)}catch(e){console.warn('Career Twin realtime action',e)}}
  _watch(){if(!this._room||!this._rt||this._unsub)return;this._unsub=this._rt.subscribeActions(this._room.id,ev=>this._consume(ev.data));this._poll=setInterval(async()=>{if(this.destroyed||!this._room)return;try{const latest=await this._rt.findRoom(GAME_TYPE,this._code);if(!latest){if(!this._host){const err=Object.assign(new Error('peer-unavailable'),{type:'peer-unavailable'});this._emit('error',err);for(const c of this._connections.values())c._remoteClose()}return}const actions=await this._rt.listActions(this._room.id,0);for(const r of actions)await this._consume(r)}catch(e){console.warn('Career Twin realtime poll',e)}},1800)}
  destroy(){if(this.destroyed)return;this.destroyed=true;try{this._unsub&&this._unsub()}catch{}this._unsub=null;if(this._poll){clearInterval(this._poll);this._poll=null}for(const c of this._connections.values()){try{c.close(true)}catch{}}this._connections.clear();if(this._host&&this._room&&this._rt)this._rt.closeRoom(this._room.id).catch(()=>{});this._room=null;later(()=>this._emit('close'))}
}
window.Peer=Base44Peer;
window.NXCareerTwinTransport='base44-realtime';
})();
