'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('social/party-match-broker-v1.js','utf8');
const start=source.indexOf('async function startBrokeredParty('),end=source.indexOf('\nfunction roomReady(',start);
const production=source.slice(start,end);
async function run(mode,count,router=true){
 const calls=[],members=Array.from({length:count},(_,i)=>'u'+i),button={disabled:false};
 const c={currentUser:{uid:'u0'},window:{NEON_DRAFT_PARTY_ROUTER:router?{launchTournament:async b=>{assert.equal(b,button);calls.push('tournament')}}:{}},
  status:()=>{},console:{error:()=>{}},partyContext:async()=>({partyId:'p',party:{}}),validateParty:()=>members,
  pickFreeCode:async()=>{calls.push('allocate');return 'ABCDEF'},serverTimestamp:()=>0,PENDING_TTL_MS:100,
  update:async()=>calls.push('pending'),ref:()=>({}),db:{},safeSession:()=>{},hostTarget:()=>'/1v1',location:{href:''}};
 vm.createContext(c);vm.runInContext(production,c);await c.startBrokeredParty(mode,button);
 return {calls,button,url:c.location.href};
}
(async()=>{
 for(const n of [3,4,5,8]){const r=await run('draft',n);assert.deepEqual(r.calls,['tournament']);assert.equal(r.url,'');}
 const two=await run('draft',2);assert.deepEqual(two.calls,['allocate','pending']);assert.equal(two.url,'/1v1');
 const unavailable=await run('draft',3,false);assert.deepEqual(unavailable.calls,[]);assert.equal(unavailable.button.disabled,false);assert.equal(unavailable.url,'');
 const side=await run('imposter',3);assert.deepEqual(side.calls,['allocate','pending']);assert.equal(side.url,'/1v1');
 const social=fs.readFileSync('social/neon-social.js','utf8');
 const navigation=social.slice(social.indexOf('function navigateParty('),social.indexOf('async function startMatch('));
 const saved=new Map(),redirects=[];
 const ctx={state:{user:{uid:'host'},profile:{username:'Host'},partyId:'party'},sessionStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},modeUrl:(mode,params)=>{redirects.push({mode,params});return '/draft'},location:{href:''}};
 vm.createContext(ctx);vm.runInContext(navigation,ctx);
 for(const size of [4,8]){
  ctx.navigateParty({mode:'draft',nonce:'t'+size,roomCode:'ROOM',partySize:size,tournament:true,tournamentSize:size,roles:{host:'host',guest:'guest'}});
  assert.equal(redirects.at(-1).params.nxTournament,'1');assert.equal(redirects.at(-1).params.nxTournamentSize,String(size));
 }
 ctx.state.user.uid='guest';ctx.navigateParty({mode:'draft',nonce:'guest',roomCode:'ROOM',partySize:3,tournament:true,tournamentSize:4,roles:{host:'host',guest:'guest'}});
 assert.equal(redirects.at(-1).params.nxRole,'guest');assert.equal(redirects.at(-1).params.nxTournament,'1');
 ctx.navigateParty({mode:'draft',nonce:'two',roomCode:'ROOM',partySize:2,roles:{host:'host',guest:'guest'}});
 assert.equal(redirects.at(-1).params.nxTournament,undefined);
 const n=redirects.length;ctx.navigateParty({mode:'draft',nonce:'two',roomCode:'ROOM'});assert.equal(redirects.length,n);
 console.log('PASS: authoritative Draft party size selects tournament once before any 1v1 allocation; two-player and side-game paths preserved; unavailable router fails safely.');
})().catch(e=>{console.error(e);process.exit(1)});
