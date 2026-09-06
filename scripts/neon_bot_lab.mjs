import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL=process.env.NEON_BASE_URL||'http://127.0.0.1:4173/index.html';
const OUT_DIR=process.env.NEON_BOT_OUT||'artifacts/neon-bot-lab';
const TIMEOUT=Number(process.env.NEON_BOT_TIMEOUT||45000);
const runToken=`${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`.slice(-10);
await fs.mkdir(OUT_DIR,{recursive:true});

const report={runToken,baseUrl:BASE_URL,startedAt:new Date().toISOString(),scenarios:[],bots:[],observations:[]};
const safeName=v=>String(v||'artifact').replace(/[^a-zA-Z0-9_-]+/g,'_');

async function shot(page,name){try{await page.screenshot({path:path.join(OUT_DIR,`${safeName(name)}.png`),fullPage:true})}catch{}}
async function scenario(name,fn,pages=[]){
  const started=Date.now();
  try{const detail=await fn();report.scenarios.push({name,status:'PASS',durationMs:Date.now()-started,detail:detail||null});console.log(`PASS  ${name}`);return detail}
  catch(error){report.scenarios.push({name,status:'FAIL',durationMs:Date.now()-started,error:String(error?.stack||error)});console.error(`FAIL  ${name}\n${error?.stack||error}`);await Promise.all(pages.map((p,i)=>shot(p,`FAIL-${name}-${i+1}`)));throw error}
}

async function makeBot(browser,label){
  const username=`nxbot${runToken}${label}`.slice(0,20);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'tr-TR'});
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  const page=await context.newPage();page.setDefaultTimeout(TIMEOUT);
  const bot={label,username,context,page,uid:'',pageErrors:[],consoleErrors:[]};
  page.on('pageerror',e=>bot.pageErrors.push(String(e?.stack||e)));
  page.on('console',m=>{if(m.type()==='error')bot.consoleErrors.push(m.text())});
  await page.goto(BASE_URL,{waitUntil:'domcontentloaded',timeout:TIMEOUT});
  await page.waitForSelector('#bootHome.nx-approved-home-v1 .nx-approved-canvas',{timeout:TIMEOUT});
  return bot;
}

async function guestSignIn(bot){
  const {page,username}=bot;
  await page.locator('#bootHome.nx-approved-home-v1 .h-friends').click();
  const active=page.locator('.nx-social-shade.open .nx-social-view.active');
  await active.locator('[data-act="guest-login"]').click();
  const input=active.locator('#nxUsername');await input.waitFor({state:'visible'});await input.fill(username);await active.locator('[data-act="claim"]').click();
  await page.waitForFunction(name=>document.body.textContent.includes(`@${name}`),username,{timeout:TIMEOUT});
  await page.waitForFunction(()=>Boolean(window.NEON_IDENTITY?.uid),null,{timeout:15000});
  bot.uid=await page.evaluate(()=>window.NEON_IDENTITY.uid);
  assert.ok(bot.uid,`${username}: UID oluşmadı`);
  const close=page.locator('.nx-social-shade.open .nx-social-close');if(await close.isVisible().catch(()=>false))await close.click();
  await page.locator('.nx-social-shade.open').waitFor({state:'hidden',timeout:10000}).catch(()=>{});
  return {username,uid:bot.uid};
}

async function openDrawer(bot,tab='friends'){
  const {page}=bot,layer=page.locator('#bootHome.nx-approved-home-v1 .nx-social-drawer-layer.open');
  if(!(await layer.isVisible().catch(()=>false))){await page.locator('#bootHome.nx-approved-home-v1 .h-friends').click();await layer.waitFor({state:'visible'})}
  await page.locator(`[data-nx-drawer-tab="${tab==='invites'?'invites':'friends'}"]`).click();
  return layer;
}
async function closeDrawer(bot){const layer=bot.page.locator('.nx-social-drawer-layer.open');if(!(await layer.isVisible().catch(()=>false)))return;await layer.locator('.nx-drawer-close').click();await layer.waitFor({state:'hidden',timeout:10000})}

async function addFriend(sender,receiver){
  await openDrawer(sender,'friends');
  const input=sender.page.locator('.nx-social-drawer-layer.open [data-nx-find]');await input.fill(receiver.username);await sender.page.locator('.nx-social-drawer-layer.open [data-nx-find-btn]').click();
  const result=sender.page.locator('.nx-social-drawer-layer.open .nx-drawer-find-card');await result.waitFor({state:'visible'});assert.ok((await result.textContent()).includes(`@${receiver.username}`));await result.locator('button').click();
  await openDrawer(receiver,'invites');const accept=receiver.page.locator('.nx-social-drawer-layer.open [data-nx-friend-accept]');await accept.waitFor({state:'visible'});await accept.click();
  for(const [bot,other] of [[sender,receiver],[receiver,sender]]){await openDrawer(bot,'friends');await bot.page.waitForFunction(name=>[...document.querySelectorAll('.nx-drawer-friend-row')].some(x=>x.textContent.includes(`@${name}`)),other.username,{timeout:TIMEOUT})}
}

async function waitForPartyMembers(bot,leader,member){
  await openDrawer(bot,'friends');
  await bot.page.waitForFunction(({leaderName,memberName})=>{
    const card=document.querySelector('.nx-social-drawer-layer.open .nx-drawer-party');
    const text=card?.textContent||'';
    return text.includes(`@${leaderName}`)&&text.includes(`@${memberName}`);
  },{leaderName:leader.username,memberName:member.username},{timeout:15000});
}

async function makeParty(leader,member){
  await openDrawer(leader,'friends');
  const row=leader.page.locator('.nx-drawer-friend-row').filter({hasText:`@${member.username}`}).first();await row.waitFor({state:'visible'});await row.locator('[data-nx-friend-more]').click();await row.locator('[data-nx-party-invite]').click();
  await openDrawer(member,'invites');const accept=member.page.locator('.nx-social-drawer-layer.open [data-nx-party-accept]');await accept.waitFor({state:'visible'});assert.equal(await accept.isEnabled(),true);await accept.click();
  await Promise.all([waitForPartyMembers(leader,leader,member),waitForPartyMembers(member,leader,member)]);
}

async function leaveParty(bot){
  await openDrawer(bot,'friends');
  const card=bot.page.locator('.nx-social-drawer-layer.open .nx-drawer-party');await card.waitFor({state:'visible'});
  await card.locator('[data-nx-party-leave]').click();
  await card.waitFor({state:'hidden',timeout:15000});
}

async function openDraftMatchmaking(bot){
  await closeDrawer(bot);
  const {page}=bot;
  await page.locator('#bootHome.nx-approved-home-v1 .h-online').click();
  const shade=page.locator('.nx-social-shade.open');await shade.waitFor({state:'visible',timeout:15000});
  const active=shade.locator('.nx-social-view.active'),mode=active.locator('#nxMode');await mode.waitFor({state:'visible'});await mode.selectOption('draft');
  return active;
}

async function draftHandshake(a,b){
  const [viewA,viewB]=await Promise.all([openDraftMatchmaking(a),openDraftMatchmaking(b)]);
  const [matchA,matchB]=[viewA.locator('[data-act="match"]'),viewB.locator('[data-act="match"]')];await Promise.all([matchA.waitFor({state:'visible'}),matchB.waitFor({state:'visible'})]);await Promise.all([matchA.click(),matchB.click()]);
  const hasMatch=url=>{try{return Boolean(new URL(url).searchParams.get('nxMatch'))}catch{return false}};
  await Promise.all([a.page.waitForURL(hasMatch,{timeout:TIMEOUT}),b.page.waitForURL(hasMatch,{timeout:TIMEOUT})]);
  const read=page=>{const u=new URL(page.url());return Object.fromEntries(['nxMatch','nxCode','nxRole','nxOpponent','nxUid','nxAuto'].map(k=>[k,u.searchParams.get(k)]))};
  const x=read(a.page),y=read(b.page);
  assert.ok(x.nxMatch&&y.nxMatch);assert.equal(x.nxMatch,y.nxMatch,'Farklı match ID');assert.equal(x.nxCode,y.nxCode,'Farklı oda kodu');
  assert.deepEqual(new Set([x.nxRole,y.nxRole]),new Set(['host','guest']));assert.equal(x.nxOpponent,b.uid);assert.equal(y.nxOpponent,a.uid);assert.equal(x.nxAuto,'1');assert.equal(y.nxAuto,'1');
  await Promise.all([a.page.waitForSelector('#draftScreen',{state:'attached',timeout:TIMEOUT}),b.page.waitForSelector('#draftScreen',{state:'attached',timeout:TIMEOUT})]);
  return {botA:x,botB:y};
}

async function writeReport(){
  report.finishedAt=new Date().toISOString();const passed=report.scenarios.filter(x=>x.status==='PASS').length,failed=report.scenarios.filter(x=>x.status==='FAIL').length;report.summary={total:report.scenarios.length,passed,failed};
  await fs.writeFile(path.join(OUT_DIR,'report.json'),JSON.stringify(report,null,2));
  const lines=['# NEON XI Bot Lab','',`- Run: \`${runToken}\``,`- Sonuç: **${passed} başarılı / ${failed} hatalı / ${report.scenarios.length} toplam**`,'','## Senaryolar',...report.scenarios.map(x=>`- ${x.status==='PASS'?'✅':'❌'} **${x.name}** — ${x.durationMs} ms${x.error?`\n  - ${x.error.split('\n')[0]}`:''}`),'','## Botlar',...report.bots.map(x=>`- ${x.label}: @${x.username} — UID ${x.uid||'yok'} — page errors ${x.pageErrors.length} — console errors ${x.consoleErrors.length}`),'','## Notlar',...(report.observations.length?report.observations.map(x=>`- ${x}`):['- Ek gözlem yok.'])];
  await fs.writeFile(path.join(OUT_DIR,'report.md'),lines.join('\n'));
}

const browser=await chromium.launch({headless:true});let botA,botB,fatal=null;
try{
  botA=await makeBot(browser,'a');botB=await makeBot(browser,'b');
  await scenario('İki bağımsız misafir hesabı oluşturma',async()=>{const [a,b]=await Promise.all([guestSignIn(botA),guestSignIn(botB)]);assert.notEqual(a.uid,b.uid);return {a,b}},[botA.page,botB.page]);
  await scenario('Arkadaş arama + istek + kabul',()=>addFriend(botA,botB),[botA.page,botB.page]);
  await scenario('Parti daveti + iki tarafta aynı parti görünümü',()=>makeParty(botA,botB),[botA.page,botB.page]);
  await scenario('Eşzamanlı partiden ayrılma veri bütünlüğü',()=>Promise.all([leaveParty(botA),leaveParty(botB)]),[botA.page,botB.page]);
  await scenario('Gerçek iki oturumla Draft matchmaking handshake',()=>draftHandshake(botA,botB),[botA.page,botB.page]);
  report.observations.push('Botlar ayrı Chromium context ve ayrı Firebase misafir oturumları kullanır.');
  report.observations.push('Parti üyeliği iki tarafta gerçek zamanlı olarak yakınsayana kadar doğrulanır.');
  report.observations.push('Parti çıkışı iki oyuncuda eşzamanlı tetiklenir; race-safe transaction sözleşmesi test edilir.');
  report.observations.push('Draft eşleşmesi gerçek ana ekran Online kartı üzerinden başlatılır.');
}catch(error){fatal=error}
finally{
  for(const bot of [botA,botB].filter(Boolean)){report.bots.push({label:bot.label,username:bot.username,uid:bot.uid,pageErrors:bot.pageErrors,consoleErrors:bot.consoleErrors.slice(-30),finalUrl:bot.page.url()});await shot(bot.page,`final-${bot.label}`);try{await bot.context.tracing.stop({path:path.join(OUT_DIR,`trace-${bot.label}.zip`)})}catch{}try{await bot.context.close()}catch{}}
  await browser.close();await writeReport();
}
if(fatal)process.exitCode=1;
