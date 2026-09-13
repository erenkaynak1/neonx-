import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL=process.env.NEON_BASE_URL||'http://127.0.0.1:4173/index.html';
const TIMEOUT=Number(process.env.NEON_BOT_TIMEOUT||45000);
const OUT_DIR='artifacts/party-draft-tournament-lab';
const token=`${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`.slice(-10);
await fs.mkdir(OUT_DIR,{recursive:true});
const report={ok:false,token,startedAt:new Date().toISOString(),steps:[],bots:[],error:null};
const mark=(name,detail={})=>{report.steps.push({name,at:new Date().toISOString(),...detail});console.log(`STEP  ${name}`)};
const shot=async(page,name)=>{try{await page.screenshot({path:path.join(OUT_DIR,`${name}.png`),fullPage:true})}catch{}};

async function makeBot(browser,label){
  const username=`nxtd${token}${label}`.slice(0,20);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'tr-TR'});
  const page=await context.newPage();page.setDefaultTimeout(TIMEOUT);
  const bot={label,username,uid:'',context,page,pageErrors:[],consoleErrors:[]};
  page.on('pageerror',e=>bot.pageErrors.push(String(e?.stack||e)));
  page.on('console',m=>{if(m.type()==='error')bot.consoleErrors.push(m.text())});
  await page.goto(BASE_URL,{waitUntil:'domcontentloaded',timeout:TIMEOUT});
  await page.waitForSelector('#bootHome.nx-approved-home-v1 .nx-approved-canvas',{timeout:TIMEOUT});
  return bot;
}
async function guest(bot){
  const {page,username}=bot;await page.locator('#bootHome.nx-approved-home-v1 .h-friends').click();
  const shade=page.locator('.nx-social-shade.open');await shade.waitFor({state:'visible'});const active=shade.locator('.nx-social-view.active');
  await active.locator('[data-act="guest-login"]').click();const input=active.locator('#nxUsername');await input.waitFor({state:'visible'});await input.fill(username);await active.locator('[data-act="claim"]').click();
  await page.waitForFunction(name=>document.body.textContent.includes(`@${name}`),username,{timeout:TIMEOUT});
  await page.waitForFunction(()=>Boolean(window.NEON_IDENTITY?.uid&&window.NEON_SOCIAL_CONSISTENCY?.diagnostics),null,{timeout:15000});bot.uid=await page.evaluate(()=>window.NEON_IDENTITY.uid);assert.ok(bot.uid);
  const close=shade.locator('.nx-social-close');if(await close.isVisible().catch(()=>false))await close.click();await shade.waitFor({state:'hidden',timeout:10000}).catch(()=>{});
}
async function api(bot,method,...args){return bot.page.evaluate(async({method,args})=>{const x=window.NEON_SOCIAL_CONSISTENCY;if(!x||typeof x[method]!=='function')throw new Error(`API missing ${method}`);return await x[method](...args)},{method,args})}
async function diagnostics(bot){return api(bot,'diagnostics')}

async function addToParty(leader,member,partyId=''){
  await api(leader,'sendFriend',member.uid,member.username);await api(member,'acceptFriend',leader.uid);
  const invitation=await api(leader,'inviteFriend',member.uid);const id=partyId||invitation.partyId||await api(leader,'ensureParty');
  assert.equal(invitation.partyId,id);await api(member,'acceptParty',id);return id;
}
function params(page){const u=new URL(page.url());return Object.fromEntries(['nxParty','nxLaunch','nxAuto','nxTournament','nxTournamentSize','nxRole','nxCode','nxPartySize','nxUid','nxMatch'].map(k=>[k,u.searchParams.get(k)]))}

async function setupThree(leader,b,c){
  let id=await addToParty(leader,b);id=await addToParty(leader,c,id);await api(leader,'setPartyMode','draft');await Promise.all([api(b,'setPartyReady',true),api(c,'setPartyReady',true)]);
  const d=await diagnostics(leader);assert.equal(Object.keys(d.party?.members||{}).length,3);assert.equal(d.party?.members?.[b.uid]?.ready,true);assert.equal(d.party?.members?.[c.uid]?.ready,true);return id;
}

async function launch(leader,members,partyId){
  await leader.page.evaluate(()=>window.NEON_SOCIAL?.openDrawer?.('party'));const layer=leader.page.locator('.nx-social-drawer-layer.open');await layer.waitFor({state:'visible'});
  assert.equal(await layer.locator('[data-nx-lobby-mode]').inputValue(),'draft');const button=layer.locator('[data-nx-party-launch]');assert.equal(await button.isEnabled(),true);await button.click();mark('3 kişilik parti Draft başlatıldı',{partyId});
  await leader.page.waitForURL(url=>new URL(url).searchParams.get('nxTournament')==='1',{timeout:TIMEOUT});const host=params(leader.page);assert.equal(host.nxParty,partyId);assert.equal(host.nxRole,'host');assert.equal(host.nxTournament,'1');assert.equal(host.nxTournamentSize,'4');assert.equal(host.nxPartySize,'3');assert.ok(host.nxCode);mark('Lider 4 takımlı turnuva yoluna girdi',{host});
  await leader.page.waitForFunction(()=>document.documentElement.dataset.nxPartyTournament==='connected',null,{timeout:TIMEOUT});mark('Lider turnuva odasına bağlandı');
  const guestParams=[];
  for(const bot of members){
    await bot.page.waitForURL(url=>{const q=new URL(url).searchParams;return q.get('nxParty')===partyId&&q.get('nxAuto')==='1'&&q.get('nxPartySize')==='3'},{timeout:TIMEOUT});
    const p=params(bot.page);assert.equal(p.nxCode,host.nxCode);assert.equal(p.nxMatch,host.nxMatch);assert.equal(p.nxRole,'guest');guestParams.push(p);
    await bot.page.waitForFunction(()=>document.documentElement.dataset.nxPartyTournament==='connected',null,{timeout:TIMEOUT});mark(`${bot.label} aynı turnuva odasına bağlandı`,{params:p});
  }
  return {host,guests:guestParams};
}

const browser=await chromium.launch({headless:true});let a,b,c;
try{
  [a,b,c]=await Promise.all(['a','b','c'].map(x=>makeBot(browser,x)));await Promise.all([guest(a),guest(b),guest(c)]);mark('Üç bağımsız hesap hazır');
  const partyId=await setupThree(a,b,c);mark('Üç kişilik Draft partisi hazır',{partyId});report.launch=await launch(a,[b,c],partyId);report.ok=true;
}catch(error){report.error=String(error?.stack||error);console.error(report.error);for(const bot of [a,b,c].filter(Boolean))await shot(bot.page,`FAIL-${bot.label}`)}
finally{
  for(const bot of [a,b,c].filter(Boolean)){let diag=null;try{diag=await diagnostics(bot)}catch{}report.bots.push({label:bot.label,uid:bot.uid,username:bot.username,url:bot.page.url(),diagnostics:diag,pageErrors:bot.pageErrors,consoleErrors:bot.consoleErrors.slice(-40)});await shot(bot.page,`final-${bot.label}`);try{await bot.context.close()}catch{}}
  await browser.close();report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(OUT_DIR,'report.json'),JSON.stringify(report,null,2));
}
if(!report.ok)process.exitCode=1;
