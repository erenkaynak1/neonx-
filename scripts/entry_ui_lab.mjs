import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const base=process.env.NEON_BASE_URL||'http://127.0.0.1:4173/index.html';
const timeout=Number(process.env.NEON_BOT_TIMEOUT||45000);
const out='artifacts/entry-ui-lab';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'tr-TR'});
const page=await context.newPage();
page.setDefaultTimeout(timeout);
const report={ok:false,steps:[],error:null};
const mark=(name,detail)=>{report.steps.push({name,detail});console.log('PASS '+name)};
try{
  await page.goto(base,{waitUntil:'domcontentloaded',timeout});
  await page.waitForFunction(()=>document.getElementById('nxEntry')?.dataset.phase==='welcome',null,{timeout});
  await page.waitForFunction(()=>document.querySelector('#nxEntry .nx-entry-art')?.naturalWidth===941,null,{timeout});
  const geometry=await page.evaluate(()=>{
    const el=document.querySelector('#nxEntry'),img=el.querySelector('img'),svg=el.querySelector('svg');
    return {width:img.naturalWidth,height:img.naturalHeight,svgViewBox:svg.getAttribute('viewBox'),
      buttons:[...el.querySelectorAll('[data-entry-action]')].map(b=>({name:b.dataset.entryAction,rect:b.getBoundingClientRect().toJSON()}))};
  });
  assert.deepEqual([geometry.width,geometry.height],[941,1672]);
  assert.equal(geometry.svgViewBox,'0 0 941 1672');
  assert.deepEqual(geometry.buttons.map(b=>b.name),['help','google','guest']);
  assert(geometry.buttons.every(b=>b.rect.width>90&&b.rect.height>32),'Mobile image hotspots need adequate touch size');
  await page.screenshot({path:path.join(out,'first-login.png'),fullPage:false});
  mark('Initial signed-out image and exact interactive hotspots',geometry);

  await page.locator('#nxEntry [data-entry-action="help"]').click();
  assert(await page.locator('#nxEntryGuide').isVisible(),'Help dialog does not open');
  assert((await page.locator('#nxEntryGuide').textContent()).includes('DRAFT XI'));
  await page.keyboard.press('Escape');
  assert(!(await page.locator('#nxEntryGuide').isVisible()),'Help dialog does not close');
  mark('How to play button works without signing in');

  await page.waitForFunction(()=>typeof window.NEON_SOCIAL?.signIn==='function',null,{timeout});
  await page.evaluate(()=>{
    window.__nxGoogleOriginal=window.NEON_SOCIAL.signIn;
    window.NEON_SOCIAL.signIn=()=>{
      window.__nxGoogleTaps=(window.__nxGoogleTaps||0)+1;
      return Promise.reject({code:'auth/popup-closed-by-user'});
    };
  });
  await page.locator('#nxEntry [data-entry-action="google"]').click();
  await page.waitForFunction(()=>window.__nxGoogleTaps===1,null,{timeout});
  await page.waitForFunction(()=>document.querySelector('#nxEntry .nx-entry-status').textContent.includes('kapatıldı'),null,{timeout});
  await page.evaluate(()=>{window.NEON_SOCIAL.signIn=window.__nxGoogleOriginal;document.querySelector('#nxEntry .nx-entry-status').textContent=''});
  mark('Google hotspot delegates to existing auth once; cancellation keeps sign-in screen');

  await page.locator('#nxEntry [data-entry-action="guest"]').click();
  await page.locator('#nxEntry[hidden]').waitFor({state:'attached',timeout});
  await page.waitForFunction(()=>document.getElementById('nxEntry')?.hidden===true,null,{timeout});
  await page.locator('.nx-social-shade.open #nxUsername').waitFor({state:'visible',timeout});
  const uid=await page.evaluate(async()=>{
    const {getApp}=await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js');
    const {getAuth}=await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js');
    return getAuth(getApp()).currentUser?.uid||null;
  });
  assert(uid,'Guest session was not established');
  mark('Guest login uses Firebase and opens username selection',{uid:uid.slice(0,8)});

  await page.reload({waitUntil:'domcontentloaded',timeout});
  await page.waitForFunction(()=>window.NEON_XI_ENTRY&&document.getElementById('nxEntry').hidden===true,null,{timeout});
  const returning=await page.evaluate(()=>({hidden:document.getElementById('nxEntry').hidden,source:document.querySelector('#nxEntry .nx-entry-art').getAttribute('src')}));
  assert(returning.hidden&&returning.source===null,'Returning signed-in user must skip login artwork without downloading it');
  mark('Restored guest session skips first-login screen and image request');

  await page.waitForFunction(()=>typeof window.NEON_SOCIAL?.signOut==='function',null,{timeout});
  await page.evaluate(()=>window.NEON_SOCIAL.signOut());
  await page.waitForFunction(()=>document.getElementById('nxEntry')?.dataset.phase==='welcome'&&!document.getElementById('nxEntry').hidden,null,{timeout});
  mark('Signing out shows sign-in screen again');
  report.ok=true;
}catch(error){report.error=String(error?.stack||error);await page.screenshot({path:path.join(out,'entry-failure.png'),fullPage:false}).catch(()=>{});throw error}
finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await context.close();await browser.close()}
console.log('PASS: first login, actual controls, Google cancellation, guest username, restored session and sign-out.');
