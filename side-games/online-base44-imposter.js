(()=>{
'use strict';
const GAME_TYPE='futbol-imposter';
let RT=null,room=null,unsubRoom=null,unsubActions=null,pollTimer=null,writeChain=Promise.resolve();
const fakeGuests=new Map(),processedActions=new Set();
const clone=v=>JSON.parse(JSON.stringify(v));
const O=()=>state.online;
async function getRT(){if(RT)return RT;if(!window.NXArcadeRealtime?.ready)throw new Error('realtime-loader');RT=await window.NXArcadeRealtime.ready;return RT}
function membersFromPlayers(){const o=O();return (o.players||[]).map(p=>({id:p.id,name:p.name,role:p.id===(o.hostId||o.myId)?'host':'guest'}))}
function resetOnlineState(){const o=O();o.code='';o.players=[];o.status='idle';o.isHost=false;o.hostId=null;o.footballer=null;o.imposterId=null;o.round=0;o.revealed=false;o.err='';o.gamePhase='idle';o.responses=[];o.readyPlayers=[];o.votes={};o.voteCount=0;o.voteRound=0;o.turnIndex=0;o.turnDeadline=0;o.phaseRevision=0;o.tiebreakNo=0;o.result=null;o.tieTally=null;o.myVoteSubmitted=false;o.myReadySent=false}
function stopWatch(){try{unsubRoom&&unsubRoom()}catch{}try{unsubActions&&unsubActions()}catch{}unsubRoom=unsubActions=null;if(pollTimer){clearInterval(pollTimer);pollTimer=null}processedActions.clear();fakeGuests.forEach(c=>{try{c.__silentClose=true;c.close()}catch{}});fakeGuests.clear()}
function makeFakeGuest(playerId){if(fakeGuests.has(playerId))return fakeGuests.get(playerId);const handlers=new Map();const conn={peer:'base44-'+playerId,open:true,__neonPlayerId:playerId,__silentClose:false,on(type,fn){if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push(fn);return this},send(){return true},close(){if(!this.open)return;this.open=false;if(!this.__silentClose)(handlers.get('close')||[]).forEach(fn=>{try{fn()}catch{}})},__emit(type,payload){(handlers.get(type)||[]).slice().forEach(fn=>{try{fn(payload)}catch(e){console.warn('NEON XI fake conn',e)}})}};fakeGuests.set(playerId,conn);bindHostConnection(conn);return conn}
function makeGuestUplink(){return{peer:'base44-host',open:true,on(){return this},close(){this.open=false},send(payload){if(!this.open||!room||!RT)return;RT.sendAction({roomId:room.id,roomCode:O().code,gameType:GAME_TYPE,senderId:O().myId,action:payload}).catch(e=>{O().err='Mesaj gönderilemedi. Bağlantı yeniden deneniyor.';console.warn(e);if(state.screen==='online-lobby')render()})}}}
function scheduleRoomWrite(snapshot,status){if(!room||!O().isHost)return;const snap=clone(snapshot);writeChain=writeChain.then(async()=>{const rt=await getRT();const next=await rt.updateRoom(room.id,{state:snap,members:membersFromPlayers(),status:status||((snap.status==='playing')?'playing':'waiting'),revision:Number(room.revision||0)+1,expires_ms:Date.now()+3*60*60*1000});room=rt.decodeRoom(next)}).catch(e=>console.warn('Imposter room sync',e))}
function handleClosed(){const o=O();stopWatch();room=null;o.err='Lobi kurucusu lobiden ayrıldı.';o.players=[];o.status='idle';o.isHost=false;state.screen='online-choice';render()}
function applyRoomRecord(raw){if(!raw)return;const r=RT.decodeRoom(raw);if(r.status==='closed'){if(!O().isHost)handleClosed();return}room=r;if(!O().isHost&&r.state){applyLobbyState(r.state);if(state.screen==='online-lobby')render()}}
async function processActionRecord(rec){if(!rec||processedActions.has(rec.id)||!O().isHost)return;processedActions.add(rec.id);const decoded=RT.decodeAction(rec),payload=decoded.action||{};try{const sender=String(rec.sender_id||'');if(sender&&sender!==O().myId){const fake=makeFakeGuest(sender);fake.__emit('data',payload)}await RT.deleteAction(rec.id)}catch(e){console.warn('Imposter action',e)}}
async function pollBackend(){if(!room||!RT)return;try{const latest=await RT.findRoom(GAME_TYPE,O().code);if(!latest){if(!O().isHost)handleClosed();return}applyRoomRecord(latest);if(O().isHost){const actions=await RT.listActions(room.id,0);for(const rec of actions)await processActionRecord(rec)}}catch(e){console.warn('Imposter poll',e)}}
function watchRoom(){stopWatch();unsubRoom=RT.subscribeRoom(room.id,ev=>{if(ev.type==='delete'){if(!O().isHost)handleClosed();return}applyRoomRecord(ev.data)});if(O().isHost)unsubActions=RT.subscribeActions(room.id,ev=>processActionRecord(ev.data));pollTimer=setInterval(pollBackend,2200)}

clearP2P=function(){stopWatch();p2pHostConnection=null;p2pHostConnections.clear();try{p2pPeer&&p2pPeer.destroy?.()}catch{}p2pPeer=null};
ensurePeerJS=async function(){return null};
openPeer=async function(){return null};
broadcastLobbyState=function(){if(!O().isHost||!room)return;const snap=lobbySnapshot();scheduleRoomWrite(snap,snap.status==='playing'?'playing':'waiting')};

createLobby=async function(name){
  const o=O();stopWatch();room=null;o.isHost=true;o.myName=name;o.hostId=o.myId;o.players=[{id:o.myId,name}];o.status='waiting';o.round=0;o.footballer=null;o.imposterId=null;o.revealed=false;o.err='';o.gamePhase='idle';o.responses=[];o.readyPlayers=[];o.votes={};o.voteCount=0;o.voteRound=0;o.turnIndex=0;o.turnDeadline=0;o.phaseRevision=0;o.tiebreakNo=0;o.result=null;o.tieTally=null;o.myVoteSubmitted=false;o.myReadySent=false;state.screen='online-lobby';render();
  try{const rt=await getRT();let created=null,code='';for(let tries=0;tries<15&&!created;tries++){code=makeCode();try{const initial=lobbySnapshot();initial.code=code;initial.hostId=o.myId;initial.players=clone(o.players);initial.status='waiting';created=await rt.createRoom({gameType:GAME_TYPE,code,ownerId:o.myId,members:membersFromPlayers(),state:initial})}catch(e){if(String(e?.message||e).includes('room-code-in-use'))continue;throw e}}if(!created)throw new Error('code-collision');o.code=code;room=rt.decodeRoom(created);watchRoom();render()}catch(e){console.error(e);stopWatch();room=null;o.err='Lobi oluşturulamadı. Online servise bağlanılamadı.';state.screen='online-create';render()}
};

joinLobby=async function(code,name){
  const o=O();stopWatch();room=null;o.isHost=false;o.code=code;o.myName=name;o.players=[];o.status='connecting';o.round=0;o.revealed=false;o.err='';state.screen='online-lobby';render();
  try{const rt=await getRT();const found=await rt.findRoom(GAME_TYPE,code);if(!found)throw new Error('not-found');room=rt.decodeRoom(found);const members=Array.isArray(room.members)?room.members.slice():[];if(room.status!=='waiting')throw new Error('started');if(members.length>=12)throw new Error('full');if(!members.some(m=>m.id===o.myId))members.push({id:o.myId,name,role:'guest'});const updated=await rt.updateRoom(room.id,{members,status:'waiting',revision:Number(room.revision||0)+1,expires_ms:Date.now()+3*60*60*1000});room=rt.decodeRoom(updated);p2pHostConnection=makeGuestUplink();watchRoom();if(room.state)applyLobbyState(room.state);state.screen='online-lobby';render();await rt.sendAction({roomId:room.id,roomCode:code,gameType:GAME_TYPE,senderId:o.myId,action:{type:'join',player:{id:o.myId,name}}})}catch(e){console.error(e);stopWatch();room=null;o.err=String(e?.message||e).includes('full')?'Lobi dolu.':String(e?.message||e).includes('started')?'Bu lobide oyun zaten başladı.':'Lobi bulunamadı veya online servise bağlanılamadı.';state.screen='online-join';render()}
};

leaveLobby=async function(){
  const o=O(),wasHost=o.isHost,currentRoom=room;try{if(currentRoom&&RT){if(wasHost)await RT.closeRoom(currentRoom.id);else await RT.sendAction({roomId:currentRoom.id,roomCode:o.code,gameType:GAME_TYPE,senderId:o.myId,action:{type:'leave',playerId:o.myId}})}}catch(e){console.warn('leave lobby',e)}stopWatch();room=null;p2pHostConnection=null;p2pHostConnections.clear();resetOnlineState();state.screen='menu';render()
};

window.addEventListener('beforeunload',()=>{try{const o=O();if(!room||!RT)return;if(o.isHost)RT.closeRoom(room.id);else RT.sendAction({roomId:room.id,roomCode:o.code,gameType:GAME_TYPE,senderId:o.myId,action:{type:'leave',playerId:o.myId}})}catch{}});
})();
