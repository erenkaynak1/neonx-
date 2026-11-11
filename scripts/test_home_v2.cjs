'use strict';
// Contract test for the live home screen (side-games/neon-home-v2.*). Runs offline.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('side-games/neon-home-v2.js'),css=read('side-games/neon-home-v2.css'),skin=read('social/neon-social-skin-v2.css'),screens=read('side-games/neon-screens-v2.css'),index=read('index.html');
new Function(js);

// Every existing entry point is still wired.
for(const action of ['single','bot','online','tournament','settings','home','profile','notifications','friends','lobby','play','leaderboard']){
  assert(new RegExp('\\n\\s+'+action+':\\(\\)=>').test(js),'Home action missing: '+action);
}
for(const [id,why] of [['singleModeBtn','single player'],['botModeBtn','vs bot'],['onlineModeBtn','online']])assert(js.includes('getElementById("'+id+'")'),'Legacy '+why+' entry not forwarded');
assert(js.includes('.neonHomeQuickRow button')&&js.includes('[data-open-neon-settings]'),'Tournament/settings must forward to the legacy controls');
assert(js.includes('legacy.inert=true')&&js.includes('while(home.firstChild)legacy.append(home.firstChild)'),'Legacy home must be kept, hidden and inert');
for(const mode of ['single','bot','online','tournament'])assert(js.includes('{action:"'+mode+'"'),'Draft XI mode missing from the hero: '+mode);

// Game shelf: every link resolves and every thumbnail is a real image asset at the shared size.
const games=[...js.matchAll(/\{href:"([^"]+)",name:"([^"]+)",label:"[^"]+",tag:"[^"]+",art:"([^"]+)"\}/g)].map(m=>({href:m[1],name:m[2],art:m[3]}));
assert.equal(games.length,6,'Six quiz games are expected on the home shelf');
const webpSize=file=>{const b=fs.readFileSync(file);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');const kind=b.toString('ascii',12,16);if(kind==='VP8 ')return [b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff];if(kind==='VP8L'){const v=b.readUInt32LE(21);return [(v&0x3fff)+1,((v>>14)&0x3fff)+1]}return [b.readUIntLE(24,3)+1,b.readUIntLE(27,3)+1]};
for(const g of games){
  assert(fs.existsSync(path.join(root,'side-games',g.href)),'Broken game link: '+g.href);
  assert.deepEqual(webpSize(path.join(root,'assets/ui',g.art)),[704,396],'Thumbnail must be 704x396: '+g.art);
}
for(const asset of ['bg-city.webp','hero-draft.webp','logo-neon-xi.webp'])assert(fs.existsSync(path.join(root,'assets/ui',asset)),'Missing interface asset: '+asset);
assert(fs.existsSync(path.join(root,'side-games/how-to-play.html')),'Help page missing');

// Compatibility hooks other modules and the lab scripts rely on.
for(const hook of ['nx-approved-home-v1','nx-home nx-approved-canvas','nx-home-map','nx-approved-status','data-action="profile"','data-action="notifications"','data-action="settings"'])assert(js.includes(hook),'Compatibility hook missing: '+hook);
for(const file of ['neon-arcade-ui-v1.css','neon-home-v2.css','neon-screens-v2.css','neon-arcade-ui-v1.js','neon-home-v2.js'])assert(index.includes('./side-games/'+file+"?v='+VERSION"),'Root must load '+file);
assert(index.indexOf('neon-arcade-ui-v1.js')<index.indexOf('neon-home-v2.js'),'Shared UI must load before the home screen');
assert(index.includes("./social/neon-social-skin-v2.css?v='+VERSION"),'Root must load the social skin');

// Design system rules: palette colours come from tokens, motion can be switched off, no baked screenshot.
const allowed=new Set(['#fff']);
for(const [name,sheet] of [['home',css],['social skin',skin],['connected screens',screens]]){
  const stray=[...new Set((sheet.replace(/url\("data:[^"]*"\)/g,'').match(/#[0-9a-fA-F]{3,8}\b/g)||[]).map(x=>x.toLowerCase()))].filter(x=>!allowed.has(x)&&!/^#(boot|nx)/.test(x));
  assert.deepEqual(stray.filter(x=>/^#[0-9a-f]{3}([0-9a-f]{3})?([0-9a-f]{2})?$/.test(x)&&!sheet.includes(x+'-')),[],name+' stylesheet must use design tokens, found raw colours');
  assert(sheet.includes('prefers-reduced-motion:reduce'),name+' must honour reduced motion');
}
assert(!js.includes('foreground-ice')&&!js.includes('viewBox="0 0 853 1844"'),'The baked-image hotspot home must not return');
assert(css.includes('overflow-x:hidden')&&css.includes('env(safe-area-inset-bottom'),'Mobile overflow and safe-area handling missing');
assert(skin.includes('grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto'),'Drawer must prioritise Friends and Invitations');
// Connected screens are restyled by scope only; the settings, bot, room and tournament markup stays in the core.
for(const hook of ['#bootScreen .bootPrimaryBtn','#bootScreen .botDifficultyCard','.nxSettingsPanel','.nxSettingToggle[aria-checked="true"]','.tournamentHostBar','.nx-social-launch'])assert(screens.includes('html.nx-home-v2 '+hook),'Connected screen not covered: '+hook);
assert(!/display:none[^}]*\}/.test(screens.replace(/\.bootGlow\{display:none!important\}|-webkit-details-marker\{display:none\}/g,'')),'Connected-screen skin must not hide working controls');
assert(js.includes('nx-v2-tokens')&&js.includes('frame.contentDocument'),'Tournament hub must receive the shared tokens');
const presentation=read('social/neon-social-presentation.js');
assert(presentation.includes("document.addEventListener('keydown',stray)")&&presentation.includes("document.removeEventListener('keydown',record.stray)"),'Escape must close a panel after focus is lost');
const drawer=read('social/neon-social-drawer-v1.js');
assert(drawer.indexOf('data-nx-drawer-tab="friends"')<drawer.indexOf('data-nx-drawer-tab="invites"')&&drawer.indexOf('data-nx-drawer-tab="invites"')<drawer.indexOf('data-nx-drawer-tab="lobby"'),'Drawer tab order: Friends, Invitations, Lobby');
const safe=read('social/neon-social-safe-v4.js');
assert(safe.includes("seni partisine çağırıyor.`,'invites')")&&safe.includes("arkadaşın olmak istiyor.`,'invites')"),'Toasts must open the Invitations section');
console.log('PASS: connected screens, 12 wired actions, 6 linked games with 704x396 art, compatibility hooks, token-only colours, reduced motion, drawer order, toast routing.');
