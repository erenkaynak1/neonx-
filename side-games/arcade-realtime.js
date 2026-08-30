(()=>{
'use strict';
const APP_ID='6a8c3a6925e1b6cff7f5b6e3';
const SDK_URL='https://esm.sh/@base44/sdk?bundle';
const safeJSON=(value,fallback)=>{try{return JSON.parse(value)}catch{return fallback}};
const now=()=>Date.now();
const makeId=()=>{try{return crypto.randomUUID()}catch{return 'nx-'+now().toString(36)+'-'+Math.random().toString(36).slice(2,12)}};
const ready=import(SDK_URL).then(({createClient})=>{
  const base44=createClient({appId:APP_ID,options:{onError:e=>console.warn('NEON XI realtime',e)}});
  const rooms=base44.entities.ArcadeRoom;
  const actions=base44.entities.ArcadeAction;
  async function findRoom(gameType,code){
    const list=await rooms.filter({game_type:gameType,room_code:String(code)},'-created_date',12);
    const t=now();
    return list.find(r=>r.status!=='closed'&&Number(r.expires_ms||0)>t)||null;
  }
  async function createRoom({gameType,code,ownerId,members,state,status='waiting',ttlMs=3*60*60*1000}){
    const existing=await findRoom(gameType,code);
    if(existing)throw new Error('room-code-in-use');
    const t=now();
    return rooms.create({
      room_code:String(code),game_type:gameType,owner_id:String(ownerId),status,
      members_json:JSON.stringify(members||[]),state_json:JSON.stringify(state||{}),actions_json:'[]',
      revision:1,updated_ms:t,expires_ms:t+ttlMs
    });
  }
  async function updateRoom(roomId,patch={}){
    const data={...patch,updated_ms:now()};
    if('members' in data){data.members_json=JSON.stringify(data.members||[]);delete data.members}
    if('state' in data){data.state_json=JSON.stringify(data.state||{});delete data.state}
    return rooms.update(roomId,data);
  }
  async function sendAction({roomId,roomCode,gameType,senderId,action}){
    return actions.create({room_id:String(roomId),room_code:String(roomCode),game_type:gameType,sender_id:String(senderId),action_json:JSON.stringify(action||{}),created_ms:now()});
  }
  function subscribeRoom(roomId,callback){
    return rooms.subscribe(ev=>{if(ev?.id===roomId)callback({...ev,data:ev.data||{}})});
  }
  function subscribeActions(roomId,callback){
    return actions.subscribe(ev=>{if(ev?.type==='create'&&ev?.data?.room_id===roomId)callback({...ev,data:ev.data||{}})});
  }
  async function listActions(roomId,sinceMs=0){return actions.filter({room_id:roomId,created_ms:{$gt:Number(sinceMs)||0}},'created_ms',500)}
  async function deleteAction(id){try{return await actions.delete(id)}catch{return null}}
  async function closeRoom(roomId){try{return await rooms.update(roomId,{status:'closed',updated_ms:now(),expires_ms:now()+60000})}catch{return null}}
  function decodeRoom(room){return room?{...room,members:safeJSON(room.members_json,[]),state:safeJSON(room.state_json,{})}:null}
  function decodeAction(record){return record?{...record,action:safeJSON(record.action_json,{})}:null}
  return {base44,makeId,findRoom,createRoom,updateRoom,sendAction,subscribeRoom,subscribeActions,listActions,deleteAction,closeRoom,decodeRoom,decodeAction};
});
window.NXArcadeRealtime={ready,makeId};
})();
