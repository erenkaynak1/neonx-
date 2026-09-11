import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL=process.env.NEON_BASE_URL||'http://127.0.0.1:4173/index.html';
const TIMEOUT=Number(process.env.NEON_BOT_TIMEOUT||45000);
const OUT=process.env.NEON_STRESS_OUT||'artifacts/neon-social-stress';
const token=`${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`.slice(-11);
await fs.mkdir(OUT,{recursive:true});
const report={token,startedAt:new Date().toISOString(),baseUrl:BASE_URL,scenarios:[],bots:[]};

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function scenario(name,fn){const started=Date.now();try{const detail=await fn();report.scenarios.push({name,status:'PASS',durationMs:Date.now()-started,detail:detail||null});console.log(`PASS  ${name}`);return detail}catch(error){report.scenarios.push({name,status:'FAIL',durationMs:Date.now()-started,error:String(error?.stack||error)});console.error(`FAIL  ${name}\n${error?.stack||error}`);throw error}}
async function waitUntil(fn,label,timeout=TIMEOUT){const end=Date.now()+timeout;let last;while(Date.now()<end){try{last=await fn();if(last)return last}catch{}await sleep(120)}throw new Error(`Timeout: ${label}; last=${JSON.stringify(last)}`)}

async function makeBot(browser,label){
  const username=`stress${token}${label}`.slice(0,20);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'tr-TR'});
  await context.addInitScript(()=>{globalThis.NEON_SOCIAL_OFFLINE_GRACE_MS=1200});
  const page=await context.newPage();page.setDefaultTimeout(TIMEOUT);
  const bot={label,username,context,page,uid:'',errors:[]};
  page.on('pageerror',e=>bot.errors.push(String(e?.stack||e)));
  page.on('console',m=>{if(m.type()==='error')bot.errors.push(m.text())});
  await page.goto(BASE_URL,{waitUntil:'domcontentloaded',timeout:TIMEOUT});
  await page.waitForSelector('#bootHome.nx-approved-home-v1 .nx-approved-canvas',{timeout:TIMEOUT});
  await page.waitForFunction(()=>Boolean(window.NEON_SOCIAL_CONSISTENCY),null,{timeout:TIMEOUT});
  return bot;
}

async function signIn(bot){
  const p=bot.page;
  await p.locator('#bootHome.nx-approved-home-v1 .h-friends').click();
  const active=p.locator('.nx-social-shade.open .nx-social-view.active');
  await active.locator('[data-act="guest-login"]').click();
  const input=active.locator('#nxUsername');await input.waitFor({state:'visible'});await input.fill(bot.username);await active.locator('[data-act="claim"]').click();
  await p.waitForFunction(name=>document.body.textContent.includes(`@${name}`),bot.username,{timeout:TIMEOUT});
  await p.waitForFunction(()=>Boolean(window.NEON_IDENTITY?.uid&&window.NEON_SOCIAL_CONSISTENCY),null,{timeout:TIMEOUT});
  bot.uid=await p.evaluate(()=>window.NEON_IDENTITY.uid);assert.ok(bot.uid);
  const close=p.locator('.nx-social-shade.open .nx-social-close');if(await close.isVisible().catch(()=>false))await close.click();
  return {uid:bot.uid,username:bot.username};
}

async function call(bot,method,...args){return bot.page.evaluate(async({method,args})=>{const api=window.NEON_SOCIAL_CONSISTENCY;if(!api||typeof api[method]!=='function')throw new Error(`Missing consistency method ${method}`);return await api[method](...args)},{method,args})}
async function diag(bot){return call(bot,'diagnostics')}
async function expectReject(promise,pattern){let error=null;try{await promise}catch(e){error=e}assert.ok(error,'İşlem beklenen şekilde reddedilmedi');if(pattern)assert.match(String(error?.message||error),pattern);return String(error?.message||error)}
async function befriend(a,b){await Promise.all([call(a,'sendFriend',b.uid,b.username),call(b,'sendFriend',a.uid,a.username)]);await waitUntil(async()=>{const [da,db]=await Promise.all([diag(a),diag(b)]);return da.friends?.[b.uid]&&db.friends?.[a.uid]&&Object.keys(da.requests||{}).length===0&&Object.keys(db.requests||{}).length===0},`${a.label}-${b.label} friendship convergence`)}

const browser=await chromium.launch({headless:true});let a,b,c,cloneA,fatal=null;
try{
  a=await makeBot(browser,'a');b=await makeBot(browser,'b');c=await makeBot(browser,'c');
  await scenario('Üç bağımsız Firebase misafir oturumu',async()=>{const ids=await Promise.all([signIn(a),signIn(b),signIn(c)]);assert.equal(new Set(ids.map(x=>x.uid)).size,3);return ids});

  await scenario('Karşılıklı eşzamanlı arkadaşlık isteği tek arkadaşlığa yakınsar',async()=>{await befriend(a,b);const [da,db]=await Promise.all([diag(a),diag(b)]);assert.equal(Object.keys(da.requests).length,0);assert.equal(Object.keys(db.requests).length,0);return {aFriends:Object.keys(da.friends).length,bFriends:Object.keys(db.friends).length}});

  await scenario('Zaten arkadaşken tekrar istek stale request üretmez',async()=>{const result=await call(a,'sendFriend',b.uid,b.username);const [da,db]=await Promise.all([diag(a),diag(b)]);assert.ok(result.already);assert.equal(Object.keys(da.requests).length,0);assert.equal(Object.keys(db.requests).length,0)});

  await scenario('Aynı hesap iki sekmede eşzamanlı parti kurunca tek partyId oluşur',async()=>{
    cloneA=await a.context.newPage();cloneA.setDefaultTimeout(TIMEOUT);await cloneA.goto(BASE_URL,{waitUntil:'domcontentloaded',timeout:TIMEOUT});
    await cloneA.waitForFunction(uid=>window.NEON_IDENTITY?.uid===uid&&Boolean(window.NEON_SOCIAL_CONSISTENCY),a.uid,{timeout:TIMEOUT});
    const [one,two]=await Promise.all([
      call(a,'ensureParty'),
      cloneA.evaluate(async()=>window.NEON_SOCIAL_CONSISTENCY.ensureParty())
    ]);
    assert.equal(one,two);const da=await diag(a);assert.equal(da.partyId,one);assert.equal(Object.keys(da.party?.members||{}).length,1);return {partyId:one};
  });

  await scenario('Başka partideki oyuncuya davet engellenir',async()=>{
    const bParty=await call(b,'ensureParty');
    const msg=await expectReject(call(a,'inviteFriend',b.uid),/başka bir aktif partide/i);
    const db=await diag(b);assert.equal(db.partyId,bParty);return {message:msg,bParty};
  });

  await scenario('Aktif partideyken ikinci parti kabulü veri değiştirmez',async()=>{
    await befriend(b,c);const cParty=await call(c,'ensureParty');const before=await diag(b);
    const msg=await expectReject(call(b,'acceptParty',cParty),/Zaten aktif bir partidesin/i);
    const after=await diag(b);assert.equal(after.partyId,before.partyId);return {message:msg};
  });

  await scenario('Offline parti lideri grace sonrası çıkar ve liderlik devredilir',async()=>{
    await call(c,'leaveOwnParty');
    await befriend(a,c);
    const aParty=(await diag(a)).partyId;await call(a,'inviteFriend',c.uid);await call(c,'acceptParty',aParty);
    await waitUntil(async()=>{const d=await diag(c);return d.partyId===aParty&&d.party?.members?.[a.uid]&&d.party?.members?.[c.uid]},'A-C party join');
    await cloneA?.close().catch(()=>{});cloneA=null;
    await a.context.close();
    await waitUntil(async()=>{const d=await diag(c);return d.partyId===aParty&&!d.party?.members?.[a.uid]&&d.party?.members?.[c.uid]&&d.party?.leaderUid===c.uid},'offline leader failover',12000);
    const dc=await diag(c);return {partyId:dc.partyId,leaderUid:dc.party?.leaderUid,members:Object.keys(dc.party?.members||{})};
  });

  await scenario('Silinmiş partiye ait eski davet kabulde temizlenir',async()=>{
    await call(b,'leaveOwnParty');
    const cParty=(await diag(c)).partyId;await call(c,'inviteFriend',b.uid);
    await waitUntil(async()=>Boolean((await diag(b)).invites?.[cParty]),'B receives C invite');
    await call(c,'leaveOwnParty');
    const msg=await expectReject(call(b,'acceptParty',cParty),/Parti artık mevcut değil/i);
    await waitUntil(async()=>!((await diag(b)).invites?.[cParty]),'stale invite cleanup');
    const db=await diag(b);assert.equal(db.partyId,'');return {message:msg};
  });

  await scenario('Çıkış/leave işlemi userParty pointerını ve son üyeliği temizler',async()=>{
    const id=await call(b,'ensureParty');assert.ok(id);assert.equal((await diag(b)).partyId,id);await call(b,'leaveOwnParty');await waitUntil(async()=>!(await diag(b)).partyId,'B leave cleanup');
  });

  for(const bot of [b,c]){assert.equal(bot.errors.filter(x=>!/favicon|404/i.test(x)).length,0,`${bot.label} console/page errors: ${bot.errors.join(' | ')}`)}
}catch(error){fatal=error}
finally{
  for(const bot of [a,b,c].filter(Boolean)){try{report.bots.push({label:bot.label,username:bot.username,uid:bot.uid,errors:bot.errors.slice(-20),finalUrl:bot.page?.url?.()||''})}catch{}try{await bot.context.close()}catch{}}
  try{await cloneA?.close()}catch{}
  await browser.close();
  report.finishedAt=new Date().toISOString();report.summary={total:report.scenarios.length,passed:report.scenarios.filter(x=>x.status==='PASS').length,failed:report.scenarios.filter(x=>x.status==='FAIL').length};
  await fs.writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
  const md=['# NEON XI Social Stress Lab','',`- Run: \`${token}\``,`- Sonuç: **${report.summary.passed} başarılı / ${report.summary.failed} hatalı / ${report.summary.total} toplam**`,'',...report.scenarios.map(x=>`- ${x.status==='PASS'?'✅':'❌'} **${x.name}** — ${x.durationMs} ms${x.error?`\n  - ${x.error.split('\n')[0]}`:''}`)];
  await fs.writeFile(path.join(OUT,'report.md'),md.join('\n'));
}
if(fatal)process.exitCode=1;
