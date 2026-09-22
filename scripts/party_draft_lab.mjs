import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL=process.env.NEON_BASE_URL||'http://127.0.0.1:4173/index.html';
const TIMEOUT=Number(process.env.NEON_BOT_TIMEOUT||45000);
const OUT_DIR='artifacts/party-draft-lab';
const token=`${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`.slice(-10);
const HOME_READY='#bootHome.nx-approved-home-v1 .nx-home-map';
const FRIENDS_ENTRY='#bootHome.nx-approved-home-v1 .nx-hotspot[data-action="friends"]';
await fs.mkdir(OUT_DIR,{recursive:true});

const report={ok:false,token,startedAt:new Date().toISOString(),steps:[],bots:[],error:null};
const mark=(name,detail={})=>{report.steps.push({name,at:new Date().toISOString(),...detail});console.log(`STEP  ${name}`)};
const shot=async(page,name)=>{try{await page.screenshot({path:path.join(OUT_DIR,`${name}.png`),fullPage:true})}catch{}};

async function makeBot(browser,label){
  const username=`nxpd${token}${label}`.slice(0,20);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'tr-TR'});
  const page=await context.newPage();page.setDefaultTimeout(TIMEOUT);
  const bot={label,username,uid:'',context,page,pageErrors:[],consoleErrors:[]};
  page.on('pageerror',e=>bot.pageErrors.push(String(e?.stack||e)));
  page.on('console',m=>{if(m.type()==='error')bot.consoleErrors.push(m.text())});
  await page.goto(BASE_URL,{waitUntil:'domcontentloaded',timeout:TIMEOUT});
  await page.waitForSelector(HOME_READY,{timeout:TIMEOUT});
  return bot;
}

async function guestSignIn(bot){
  const {page,username}=bot;
  await page.locator(FRIENDS_ENTRY).click();
  const shade=page.locator('.nx-social-shade.open');await shade.waitFor({state:'visible'});
  const active=shade.locator('.nx-social-view.active');await active.locator('[data-act="guest-login"]').click();
  const input=active.locator('#nxUsername');await input.waitFor({state:'visible'});await input.fill(username);await active.locator('[data-act="claim"]').click();
  await page.waitForFunction(name=>document.body.textContent.includes(`@${name}`),username,{timeout:TIMEOUT});
  await page.waitForFunction(()=>Boolean(window.NEON_IDENTITY?.uid&&window.NEON_SOCIAL_CONSISTENCY?.diagnostics),null,{timeout:15000});
  bot.uid=await page.evaluate(()=>window.NEON_IDENTITY.uid);assert.ok(bot.uid,`${username}: UID oluşmadı`);
  const close=shade.locator('.nx-social-close');if(await close.isVisible().catch(()=>false))await close.click();await shade.waitFor({state:'hidden',timeout:10000}).catch(()=>{});
}

async function api(bot,method,...args){return bot.page.evaluate(async({method,args})=>{const x=window.NEON_SOCIAL_CONSISTENCY;if(!x||typeof x[method]!=='function')throw new Error(`Consistency API missing: ${method}`);return await x[method](...args)},{method,args})}
async function diagnostics(bot){return api(bot,'diagnostics')}
async function readRoom(page,code){return page.evaluate(async roomCode=>{const [{getApp,getApps},{getDatabase,get,ref}]=await Promise.all([import('https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js')]);if(!getApps().length)return null;return (await get(ref(getDatabase(getApp()),`rooms/${roomCode}`))).val()},code)}
async function waitRoom(page,code,predicate,timeout=20000){const start=Date.now();let room=null;while(Date.now()-start<timeout){room=await readRoom(page,code);if(predicate(room))return room;await new Promise(r=>setTimeout(r,250))}return room}

async function setupParty(leader,member){
  await api(leader,'sendFriend',member.uid,member.username);await api(member,'acceptFriend',leader.uid);
  const invitation=await api(leader,'inviteFriend',member.uid);const partyId=invitation.partyId||await api(leader,'ensureParty');
  await api(member,'acceptParty',partyId);await api(leader,'setPartyMode','draft');await api(member,'setPartyReady',true);
  const [a,b]=await Promise.all([diagnostics(leader),diagnostics(member)]);assert.equal(a.partyId,partyId);assert.equal(b.partyId,partyId);assert.equal(a.party?.leaderUid,leader.uid);assert.equal(a.party?.selectedMode,'draft');assert.equal(a.party?.members?.[member.uid]?.ready,true,'Üye hazır görünmüyor');return partyId;
}
function launchParams(page){const u=new URL(page.url());return Object.fromEntries(['nxParty','nxLaunch','nxBroker','nxAuto','nxRole','nxCode','nxPartySize','nxUid','nxOpponent','nxMatch'].map(k=>[k,u.searchParams.get(k)]))}
const hasDraftLaunch=(url,partyId,role)=>{const q=new URL(url).searchParams;return q.get('nxParty')===partyId&&q.get('nxAuto')==='1'&&q.get('nxRole')===role&&Boolean(q.get('nxCode'))&&Boolean(q.get('nxMatch'))};

async function launchDraftFromParty(leader,member,partyId){
  await leader.page.evaluate(()=>window.NEON_SOCIAL?.openDrawer?.('party'));const layer=leader.page.locator('.nx-social-drawer-layer.open');await layer.waitFor({state:'visible'});
  const select=layer.locator('[data-nx-lobby-mode]');await select.waitFor({state:'visible'});assert.equal(await select.inputValue(),'draft');
  const launch=layer.locator('[data-nx-party-launch]');await launch.waitFor({state:'visible'});assert.equal(await launch.isEnabled(),true,'Parti Draft başlat butonu pasif');mark('Lider OYUNU BAŞLAT düğmesine basıyor',{partyId});await launch.click();
  await leader.page.waitForURL(url=>hasDraftLaunch(url,partyId,'host'),{timeout:TIMEOUT});const host=launchParams(leader.page);assert.equal(host.nxParty,partyId);assert.equal(host.nxRole,'host');assert.equal(host.nxAuto,'1');assert.equal(host.nxPartySize,'2');assert.ok(host.nxCode);assert.ok(host.nxMatch);mark('Lider Draft launch URL ile yönlendi',{host});
  await leader.page.waitForSelector('#draftScreen',{state:'visible',timeout:TIMEOUT});mark('Lider Draft ekranı görünür şekilde açıldı');
  await member.page.waitForURL(url=>hasDraftLaunch(url,partyId,'guest'),{timeout:TIMEOUT});const guest=launchParams(member.page);assert.equal(guest.nxParty,partyId);assert.equal(guest.nxRole,'guest');assert.equal(guest.nxAuto,'1');assert.equal(guest.nxCode,host.nxCode,'Parti üyeleri farklı Draft odasına gitti');assert.equal(guest.nxMatch,host.nxMatch,'Parti üyeleri farklı match kimliği aldı');assert.equal(guest.nxOpponent,leader.uid);assert.equal(host.nxOpponent,member.uid);mark('Üye aynı Draft odasına otomatik çekildi',{guest});
  await member.page.waitForSelector('#draftScreen',{state:'visible',timeout:TIMEOUT});mark('Üye Draft ekranı görünür şekilde açıldı');
  const room=await waitRoom(leader.page,host.nxCode,r=>{const ids=Object.values(r?.players||{}).map(x=>x?.uid).filter(Boolean);return ids.includes(leader.uid)&&ids.includes(member.uid)});
  assert.ok(room,`Draft Firebase odası bulunamadı: ${host.nxCode}`);const playerIds=Object.values(room.players||{}).map(x=>x?.uid).filter(Boolean);assert.ok(playerIds.includes(leader.uid),'Lider gerçek Draft odasında yok');assert.ok(playerIds.includes(member.uid),'Parti üyesi gerçek Draft odasında yok');assert.equal(room.hostUid,leader.uid,'Draft oda lideri parti lideri değil');mark('İki parti üyesi aynı gerçek Draft Firebase odasında',{roomCode:host.nxCode,status:room.status,playerIds});
  return {host,guest,room:{hostUid:room.hostUid,status:room.status,playerIds}};
}

const browser=await chromium.launch({headless:true});let leader,member;
try{leader=await makeBot(browser,'a');member=await makeBot(browser,'b');await Promise.all([guestSignIn(leader),guestSignIn(member)]);mark('İki bağımsız misafir oturumu hazır',{leader:leader.uid,member:member.uid});const partyId=await setupParty(leader,member);mark('İki kişilik Draft partisi hazır',{partyId});report.launch=await launchDraftFromParty(leader,member,partyId);report.ok=true}
catch(error){report.error=String(error?.stack||error);console.error(report.error);if(leader)await shot(leader.page,'FAIL-leader');if(member)await shot(member.page,'FAIL-member')}
finally{for(const bot of [leader,member].filter(Boolean)){let diag=null;try{diag=await diagnostics(bot)}catch{}report.bots.push({label:bot.label,username:bot.username,uid:bot.uid,url:bot.page.url(),diagnostics:diag,pageErrors:bot.pageErrors,consoleErrors:bot.consoleErrors.slice(-40)});await shot(bot.page,`final-${bot.label}`);try{await bot.context.close()}catch{}}await browser.close();report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(OUT_DIR,'report.json'),JSON.stringify(report,null,2))}
if(!report.ok)process.exitCode=1;
