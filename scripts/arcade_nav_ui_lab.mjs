import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const origin=process.env.NEON_ORIGIN||'http://127.0.0.1:4173';
const timeout=Number(process.env.NEON_BOT_TIMEOUT||45000);
const output=path.resolve('artifacts/arcade-navigation');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const cases=[
 ['hub','/side-games/index.html'],
 ['xox','/side-games/football-xox/index.html'],
 ['twin','/side-games/career-twin/index.html'],
 ['imposter','/side-games/futbol-imposter.html'],
 ['wordle','/side-games/football-wordle/index.html']
];
const report={ok:false,cases:[],errors:[]};
try{
 for(const [name,pathname] of cases){
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  page.setDefaultTimeout(timeout);
  try{
   await page.goto(new URL(pathname,origin).href,{waitUntil:'domcontentloaded',timeout});
   const footer=page.locator('#nx-arcade-footer');
   await footer.waitFor({state:'visible',timeout});
   const result=await footer.evaluate(node=>{
    const svg=node.querySelector('svg');
    const buttons=[...node.querySelectorAll('[data-nx-nav]')].map(a=>({action:a.dataset.nxNav,label:a.querySelector('.nx-nav-label')?.textContent,href:a.getAttribute('href'),current:a.getAttribute('aria-current'),bounds:a.getBoundingClientRect().toJSON()}));
    return {viewBox:svg?.getAttribute('viewBox'),width:svg?.getBoundingClientRect().width,height:svg?.getBoundingClientRect().height,buttons};
   });
   assert.equal(result.viewBox,'0 1640 853 204',name+': incorrect canonical SVG viewport');
   assert.deepEqual(result.buttons.map(b=>b.action),['home','play','friends','settings'],name+': wrong actions');
   assert.deepEqual(result.buttons.map(b=>b.label),['Ana sayfa','Oyna','Arkadaşlar','Ayarlar'],name+': labels differ from home');
   assert.equal(result.buttons.filter(b=>b.current==='page').length,1,name+': must have one active nav item');
   assert.equal(result.buttons[1].current,'page',name+': play must be highlighted');
   assert(Math.abs(result.width-390)<2,name+': wrong nav width');
   assert(Math.abs(result.height-(390*204/853))<2,name+': wrong nav scale');
   assert(result.buttons.every(x=>x.bounds.width>50&&x.bounds.height>30),name+': dead tap target');
   if(name==='xox'||name==='twin'){
    await page.waitForSelector('body[data-ct-screen="menu"]',{timeout});
    assert.equal(await page.locator('.menuNav').count(),0,name+': legacy duplicate footer remains');
    assert.equal(await page.locator('.howPanel .howTitle').count()>0,true,name+': help panel must remain');

    const menu=await page.evaluate(()=>{
      const panel=document.querySelector('.menuPanel'),grid=document.querySelector('.modeGrid'),
        buttons=[...document.querySelectorAll('.menuMode')],help=document.querySelector('.howPanel');
      const panelStyle=getComputedStyle(panel),gridStyle=getComputedStyle(grid),helpStyle=getComputedStyle(help);
      const rect=panel.getBoundingClientRect(),icon=buttons[0]?.querySelector('svg')?.getBoundingClientRect();
      return {panelPosition:panelStyle.position,background:panelStyle.backgroundColor,clipPath:panelStyle.clipPath,
        panelRect:rect.toJSON(),gridDisplay:gridStyle.display,buttonCount:buttons.length,
        iconWidth:icon?.width||0,iconHeight:icon?.height||0,helpPosition:helpStyle.position,
        helpRect:help.getBoundingClientRect().toJSON(),bodyBackground:getComputedStyle(document.body).backgroundColor};
    });
    assert.equal(menu.panelPosition,'absolute',name+': game menu lost positioned panel CSS');
    assert.equal(menu.gridDisplay,'grid',name+': game mode cards lost their grid');
    assert.equal(menu.helpPosition,'absolute',name+': help card lost game styling');
    assert.equal(menu.buttonCount,3,name+': mode choices missing');
    assert(menu.panelRect.height>100&&menu.panelRect.height<450,name+': menu panel has invalid size');
    assert(menu.panelRect.width>200&&menu.panelRect.width<=390,name+': menu panel exceeds mobile width');
    assert(menu.iconWidth>10&&menu.iconWidth<90&&menu.iconHeight<90,name+': giant unstyled SVG icon');
    assert(menu.clipPath!=='none',name+': cut-corner panel lost');
    assert(menu.background!=='rgba(0, 0, 0, 0)'&&menu.background!=='transparent',name+': neon panel background lost');
    result.gameMenu=menu;

   }
   await page.screenshot({path:path.join(output,name+'.png'),fullPage:false});
   report.cases.push({name,...result,oldFooterCount:await page.locator('.menuNav').count()});
   if(name==='wordle'){
    await page.locator('[data-nx-nav="play"]').click();
    await page.waitForURL(/\/side-games\/index\.html/,{timeout:15000});
   }
  }finally{await page.close()}
 }
 report.ok=true;
}catch(e){report.errors.push(String(e?.stack||e));throw e}
finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close()}
console.log('PASS: five mobile arcade pages display canonical home footer; legacy footer absent and navigation functions.');
