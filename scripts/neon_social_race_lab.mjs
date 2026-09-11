import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL=process.env.NEON_BASE_URL||'http://127.0.0.1:4173/index.html';
const OUT_DIR=process.env.NEON_RACE_OUT||'artifacts/neon-social-race-lab';
const TIMEOUT=Number(process.env.NEON_BOT_TIMEOUT||45000);
const TEST_GRACE_MS=1200;
const runToken=`${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`.slice(-11);
await fs.mkdir(OUT_DIR,{recursive:true});

const report={runToken,baseUrl:BASE_URL,startedAt:new Date().toISOString(),scenarios:[],bots:[],partyIds:[],observations:[]};
const safeName=v=>String(v||'artifact').replace(/[^a-zA-Z0-9_-]+/g,'_');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function shot(page,name){if(!page||page.isClosed())return;try{await page.screenshot({path:path.join(OUT_DIR,`${safeName(name)}.png`),fullPage:true})}catch{}}
async function scenario(name,fn,pages=[]){
  const started=Date.now();
  try{const detail=await fn();report.scenarios.push({name,status:'PASS',durationMs:Date.now()-started,detail:detail||null});console.log(`PASS  ${name}`);return detail}
  catch(error){report.scenarios.push({name,status:'FAIL',durationMs:Date.now()-started,error:String(error?.stack||error)});console.error(`FAIL  ${name}\n${error?.stack||error}`);await Promise.all(pages.map((p,i)=>shot(p,`FAIL-${name}-${i+1}`)));throw error}
}
async function preparePage(page){page.setDefaultTimeout(TIMEOUT);await page.goto(BASE_URL,{waitUntil:'domcontentloaded',timeout:TIMEOUT});await page.waitForSelector('#bootHome.nx-approved-home-v1 .nx-approved-canvas',{timeout:TIMEOUT});await page.waitForFunction(()=>Boolean(window.NEON_SOCIAL_INTEGRITY),null,{timeout:TIMEOUT})}
async function makeBot(browser,label){
  const username=`nxrace${runToken}${label}`.slice(0,20),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'tr-TR'});
  await context.addInitScript(grace=>{globalThis.__NEON_SOCIAL_GRACE_MS__=grace},TEST_GRACE_MS);await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  const page=await context.newPage(),bot={label,username,context,page,uid:'',pageErrors:[],consoleErrors:[]};
  const wire=p=>{p.on('pageerror',e=>bot.pageErrors.push(String(e?.stack||e)));p.on('console',m=>{if(m.type()==='error')bot.consoleErrors.push(m.text())})};wire(page);bot.wire=wire;await preparePage(page);return bot;
}
async function guestSignIn(bot){
  const {page,username}=bot;await page.locator('#bootHome.nx-approved-home-v1 .h-friends').click();const shade=page.locator('.nx-social-shade.open');await shade.waitFor({state:'visible'});const active=shade.locator('.nx-social-view.active');await active.locator('[data-act="guest-login"]').click();
  const input=active.locator('#nxUsername');await input.waitFor({state:'visible'});await input.fill(username);await active.locator('[data-act="claim"]').click();await page.waitForFunction(name=>document.body.textContent.includes(`@${name}`),username,{timeout:TIMEOUT});await page.waitForFunction(()=>Boolean(window.NEON_IDENTITY?.uid&&window.NEON_SOCIAL_INTEGRITY),null,{timeout:TIMEOUT});
  bot.uid=await page.evaluate(()=>window.NEON_IDENTITY.uid);assert.ok(bot.uid,`${username}: UID oluşmadı`);const close=shade.locator('.nx-social-close');if(await close.isVisible().catch(()=>false))await close.click();await shade.waitFor({state:'hidden',timeout:10000}).catch(()=>{});return {username,uid:bot.uid};
}
async function api(bot,method,...args){assert.ok(bot.page&&!bot.page.isClosed(),`${bot.label}: aktif sayfa yok`);return bot.page.evaluate(async ({method,args})=>{const api=window.NEON_SOCIAL_INTEGRITY;if(!api||typeof api[method]!=='function')throw new Error(`Integrity API missing: ${method}`);return await api[method](...args)},{method,args})}
async function waitFor(fn,{timeout=TIMEOUT,interval=100,label='condition'}={}){const started=Date.now();let last;while(Date.now()-started<timeout){try{last=await fn();if(last)return last}catch(error){last=error}await sleep(interval)}throw new Error(`Timeout waiting for ${label}: ${String(last?.message||last||'false')}`)}
async function relation(bot,uid){return api(bot,'debugRelation',uid)}
async function party(bot,id=''){return api(bot,'debugParty',id)}
async function membership(bot){return api(bot,'currentPartyId')}
async function rememberParty(id){if(id&&!report.partyIds.includes(id))report.partyIds.push(id);return id}
async function leaveIfNeeded(bot){if(!bot?.page||bot.page.isClosed())return;try{const id=await membership(bot);if(id)await api(bot,'leaveCurrentParty',{silent:true,reason:'race-lab-cleanup'})}catch{}}
async function reopenBot(bot){const page=await bot.context.newPage();bot.wire(page);bot.page=page;await preparePage(page);await page.waitForFunction(uid=>window.NEON_IDENTITY?.uid===uid,bot.uid,{timeout:TIMEOUT});return page}
async function writeReport(){report.finishedAt=new Date().toISOString();const passed=report.scenarios.filter(x=>x.status==='PASS').length,failed=report.scenarios.filter(x=>x.status==='FAIL').length;report.summary={total:report.scenarios.length,passed,failed};await fs.writeFile(path.join(OUT_DIR,'report.json'),JSON.stringify(report,null,2));const lines=['# NEON XI Social Race Lab','',`- Run: \`${runToken}\``,`- Sonuç: **${passed} başarılı / ${failed} hatalı / ${report.scenarios.length} toplam**`,`- Offline grace test değeri: **${TEST_GRACE_MS} ms** (production: 30000 ms)`,'','## Senaryolar',...report.scenarios.map(x=>`- ${x.status==='PASS'?'✅':'❌'} **${x.name}** — ${x.durationMs} ms${x.error?`\n  - ${x.error.split('\n')[0]}`:''}`),'','## Gözlemler',...report.observations.map(x=>`- ${x}`)];await fs.writeFile(path.join(OUT_DIR,'report.md'),lines.join('\n'))}

const browser=await chromium.launch({headless:true});let a,b,c,fatal=null;
try{
  a=await makeBot(browser,'a');b=await makeBot(browser,'b');c=await makeBot(browser,'c');
  await scenario('Üç bağımsız Firebase misafir oturumu',async()=>{const users=await Promise.all([guestSignIn(a),guestSignIn(b),guestSignIn(c)]);assert.equal(new Set(users.map(x=>x.uid)).size,3);return users},[a.page,b.page,c.page]);
  await scenario('Karşılıklı aynı anda arkadaşlık isteği tek arkadaşlığa yakınsar',async()=>{await Promise.all([api(a,'sendFriend',b.uid),api(b,'sendFriend',a.uid)]);await waitFor(async()=>{const [ra,rb]=await Promise.all([relation(a,b.uid),relation(b,a.uid)]);return ra.friend&&rb.friend&&!ra.incoming&&!ra.outgoing&&!rb.incoming&&!rb.outgoing?{ra,rb}:false},{label:'crossed friend reconciliation'})},[a.page,b.page]);
  await scenario('Mevcut arkadaşa tekrar istek pending kayıt üretmez',async()=>{const result=await api(a,'sendFriend',b.uid);assert.equal(result.alreadyFriends,true);const [ra,rb]=await Promise.all([relation(a,b.uid),relation(b,a.uid)]);assert.ok(ra.friend&&rb.friend);assert.equal(ra.incoming,null);assert.equal(ra.outgoing,null);assert.equal(rb.incoming,null);assert.equal(rb.outgoing,null)},[a.page,b.page]);
  await scenario('Normal arkadaşlık isteği kabulü iki yönlü ve temiz',async()=>{await api(a,'sendFriend',c.uid);await waitFor(async()=>Boolean((await relation(c,a.uid)).incoming),{label:'incoming friend request'});await api(c,'acceptFriend',a.uid);const [ra,rc]=await Promise.all([relation(a,c.uid),relation(c,a.uid)]);assert.ok(ra.friend&&rc.friend);assert.equal(ra.incoming,null);assert.equal(ra.outgoing,null);assert.equal(rc.incoming,null);assert.equal(rc.outgoing,null)},[a.page,c.page]);
  await scenario('Aynı hesap iki sekmede eşzamanlı parti kurunca tek parti oluşur',async()=>{const second=await a.context.newPage();a.wire(second);await preparePage(second);await second.waitForFunction(uid=>window.NEON_IDENTITY?.uid===uid,a.uid,{timeout:TIMEOUT});const call=page=>page.evaluate(()=>window.NEON_SOCIAL_INTEGRITY.ensureParty());const [p1,p2]=await Promise.all([call(a.page),call(second)]);assert.equal(p1,p2);await rememberParty(p1);const view=await party(a,p1);assert.ok(view.party?.members?.[a.uid]);assert.equal(Object.keys(view.party.members).length,1);await second.close();return {partyId:p1}},[a.page]);
  await scenario('İki farklı parti davetini aynı anda kabul etmede yalnızca biri kazanır',async()=>{const pA=await rememberParty(await membership(a)),pC=await rememberParty(await api(c,'ensureParty'));await Promise.all([api(a,'inviteToParty',b.uid),api(c,'inviteToParty',b.uid)]);const results=await b.page.evaluate(async ({pA,pC})=>{const api=window.NEON_SOCIAL_INTEGRITY,settled=await Promise.allSettled([api.acceptParty(pA),api.acceptParty(pC)]);return settled.map(x=>({status:x.status,value:x.value||null,reason:String(x.reason?.message||x.reason||'')}))},{pA,pC});assert.equal(results.filter(x=>x.status==='fulfilled').length,1,JSON.stringify(results));assert.equal(results.filter(x=>x.status==='rejected').length,1,JSON.stringify(results));const chosen=await membership(b);assert.ok(chosen===pA||chosen===pC);const [va,vc]=await Promise.all([party(a,pA),party(c,pC)]);assert.equal(Boolean(va.party?.members?.[b.uid])+Boolean(vc.party?.members?.[b.uid]),1);await waitFor(async()=>!(await api(b,'debugInvite',pA))&&!(await api(b,'debugInvite',pC)),{label:'other party invites cleanup'});await api(b,'leaveCurrentParty',{silent:true});return {chosen,results}},[a.page,b.page,c.page]);
  await scenario('Silinmiş partiye ait davet otomatik temizlenir',async()=>{await leaveIfNeeded(c);const p=await rememberParty(await api(c,'ensureParty'));await api(c,'inviteToParty',b.uid);await waitFor(async()=>Boolean(await api(b,'debugInvite',p)),{label:'party invite arrival'});await api(c,'leaveCurrentParty',{silent:true});await waitFor(async()=>!(await api(b,'debugInvite',p)),{timeout:10000,label:'stale invite cleanup'})},[b.page,c.page]);
  await scenario('Davet kabulü ile parti silinmesi yarışında zombi parti oluşmaz',async()=>{const p=await rememberParty(await api(c,'ensureParty'));await api(c,'inviteToParty',b.uid);await waitFor(async()=>Boolean(await api(b,'debugInvite',p)),{label:'race invite arrival'});const settled=await Promise.allSettled([api(b,'acceptParty',p),api(c,'leaveCurrentParty',{silent:true})]);await sleep(300);const pointer=await membership(b),view=await party(b,p);if(pointer){assert.equal(pointer,p);assert.ok(view.party?.members?.[b.uid],'Pointer var ama parti/üyelik yok');await api(b,'leaveCurrentParty',{silent:true})}else assert.ok(!view.party||!view.party.members?.[b.uid],'Pointer yokken zombi üyelik kaldı');return settled.map(x=>x.status)},[b.page,c.page]);
  await scenario('Çevrimdışı lider grace sonrası çıkar ve liderlik üyeye geçer',async()=>{await Promise.all([leaveIfNeeded(a),leaveIfNeeded(b)]);const p=await rememberParty(await api(a,'ensureParty'));await api(a,'inviteToParty',b.uid);await api(b,'acceptParty',p);await waitFor(async()=>{const v=await party(b,p);return v.party?.members?.[a.uid]&&v.party?.members?.[b.uid]?true:false},{label:'two-member party'});await a.page.close();await waitFor(async()=>{const v=await party(b,p);return v.party&&!v.party.members?.[a.uid]&&v.party.members?.[b.uid]&&v.party.leaderUid===b.uid?v:false},{timeout:12000,interval:150,label:'offline leader eviction'});await reopenBot(a);await waitFor(async()=>(await membership(a))===''?true:false,{timeout:10000,label:'offline leader pointer cleanup'});await api(b,'leaveCurrentParty',{silent:true})},[b.page]);
  report.observations.push('Race Lab üç ayrı Chromium/Firebase oturumuyla gerçek RTDB üzerinde çalıştı.');report.observations.push('Offline testi production 30 saniye kuralını değiştirmeden test override ile 1.2 saniyeye sıkıştırdı.');report.observations.push('Her kritik race sonrasında userParty pointer ve parties/members birlikte doğrulandı.');
}catch(error){fatal=error}
finally{
  for(const bot of [a,b,c].filter(Boolean)){if((!bot.page||bot.page.isClosed())&&bot.context)try{await reopenBot(bot)}catch{}}
  for(const bot of [a,b,c].filter(Boolean)){try{await leaveIfNeeded(bot)}catch{}}
  for(const bot of [a,b,c].filter(Boolean)){report.bots.push({label:bot.label,username:bot.username,uid:bot.uid,pageErrors:bot.pageErrors,consoleErrors:bot.consoleErrors.slice(-30),finalUrl:bot.page&&!bot.page.isClosed()?bot.page.url():'closed'});await shot(bot.page,`final-${bot.label}`);try{await bot.context.tracing.stop({path:path.join(OUT_DIR,`trace-${bot.label}.zip`)})}catch{}try{await bot.context.close()}catch{}}
  await browser.close();await writeReport();
}
if(fatal)process.exitCode=1;
