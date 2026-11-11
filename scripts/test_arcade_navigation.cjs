'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const home=read('side-games/neon-home-v2.js');
const nav=read('side-games/neon-arcade-ui-v1.js');
const css=read('side-games/neon-arcade-ui-v1.css');
// One navigation, built in one place: the home screen must reuse the shared markup, never redraw it.
assert(home.includes('UI.navMarkup("home")'),'Home must render the shared navigation markup');
assert(!/const (navIcons|NAV_ITEMS)=/.test(home),'Home must not carry its own copy of the navigation');
assert(nav.includes("nav.innerHTML=navMarkup('')"),'Side-game footer must render the shared navigation markup');
const items=[...nav.matchAll(/\{key:'([a-z]+)',label:'([^']+)',name:'([^']+)'(,primary:true)?\}/g)].map(m=>({key:m[1],label:m[2],primary:Boolean(m[4])}));
assert.deepEqual(items.map(i=>i.key),['home','friends','play','lobby','leaderboard'],'Navigation destinations changed');
assert.deepEqual(items.map(i=>i.label),['ANA SAYFA','SOSYAL','OYNA','LOBİ','LİDERLİK'],'Navigation labels changed');
assert.deepEqual(items.filter(i=>i.primary).map(i=>i.key),['play'],'Exactly one primary navigation action is allowed');
for(const key of items.map(i=>i.key))assert(new RegExp('\\n'+key+":'<").test(nav),'Missing navigation icon: '+key);
for(const token of ['.nx-nav{position:fixed','grid-template-columns:repeat(5,minmax(0,1fr))','--nxu-nav-h:64px','.nx-nav-item[aria-current="page"]{color:var(--nxu-action)}','nx-arcade-has-footer','env(safe-area-inset-bottom','prefers-reduced-motion:reduce']){
  assert(css.includes(token),'Missing shared navigation styling '+token);
}
// Official palette only (docs/NEON_XI_COLOR_PALETTE.md).
for(const [token,hex] of [['--neon-primary','#BAFF18'],['--neon-lime','#DCFF72'],['--neon-positive','#31FF76'],['--neon-frame','#9ADFFF'],['--neon-led','#3DCFFF'],['--neon-cyan','#00EAFF']]){
  assert(css.includes(token+':'+hex),'Palette token drifted: '+token);
}
assert(!/drop-shadow\(0 0 \d+px #/.test(css),'Always-on neon glow is not allowed on the navigation');
for(const font of ['Barlow-Medium','Barlow-SemiBold','BarlowCondensed-SemiBold','BarlowCondensed-Bold','BarlowCondensed-ExtraBold','BarlowCondensed-ExtraBoldItalic']){
  assert(css.includes('fonts/'+font+'.woff'),'Font face missing: '+font);
  assert(fs.existsSync(path.join(root,'assets/ui/fonts',font+'.woff')),'Font file missing: '+font);
}
for(const page of [
  'side-games/index.html','side-games/football-xox/index.html',
  'side-games/career-twin/index.html','side-games/futbol-imposter.html',
  'side-games/football-wordle/index.html'
]){
  const html=read(page);
  assert(html.includes('neon-arcade-ui-v1.js')&&html.includes('neon-arcade-ui-v1.css'),'Shared nav not loaded in '+page);
}
for(const [script,style] of [
  ['side-games/football-xox/game-v2.js','side-games/football-xox/unified-menu.css'],
  ['side-games/career-twin/game.js','side-games/career-twin/premium-mobile.css']
]){
  const js=read(script),css=read(style);
  assert(!js.includes("'menuNav'")&&!js.includes('navItem('),'Duplicate 3-item footer still rendered: '+script);
  assert(!css.includes('.menuNav'),'Unused old footer CSS not removed: '+style);
  for(const token of [
    'body[data-ct-screen="menu"] .menuPanel{',
    'body[data-ct-screen="menu"] .modeGrid{',
    'body[data-ct-screen="menu"] .menuMode{',
    'body[data-ct-screen="menu"] .menuModeIcon'
  ]) assert(css.includes(token),'Premium game menu styling missing: '+style+' '+token);
  assert(!/\.howPanel,\s*@media/.test(css),'Dangling CSS selector swallowing game menu styles: '+style);
  assert(css.includes('grid-template-rows:repeat(3,minmax(0,1fr))'),'Online mode cards lost their grid layout: '+style);
  assert(js.includes("const panel=E('section','menuPanel')"),'Approved menu panel missing: '+script);
  assert(js.includes("panel.append(title,grid)"),'Mode grid must be attached to menu: '+script);
  assert(js.includes('ARKADAŞLARINLA OYNA')&&js.includes('RAKİP ARA'),'Online modes must be preserved: '+script);
  new Function(js);
}
assert(!nav.includes('viewBox="0 1640 853 204"'),'Retired image-map footer must not return');
new Function(nav);
const rootPage=read('index.html');
assert(rootPage.includes('neon-arcade-ui-v1.js'),'Draft entry bridge missing');
assert(nav.includes("if(atRoot||document.getElementById('nx-arcade-footer'))return"),'Draft and tournament footer exclusions broken');
assert(nav.includes("const tabs={friends:'friends',play:'play',lobby:'party',leaderboard:'leaderboard'}")&&nav.includes('api.open(tab)')&&nav.includes('nxOpenSettings=1'),'Footer actions missing');
console.log('PASS: one shared navigation (5 destinations, 1 primary), palette tokens, self-hosted type, five game entrypoints, single bottom bar, offline syntax.');
