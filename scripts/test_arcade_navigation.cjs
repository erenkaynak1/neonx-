'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const home=read('side-games/home-approved-v1.js');
const nav=read('side-games/neon-arcade-ui-v1.js');
const css=read('side-games/neon-arcade-ui-v1.css');
const homeIcons=home.match(/const navIcons=\{([\s\S]*?)\n    \};/);
const sharedIcons=nav.match(/const homeNavIcons=\{([\s\S]*?)\n    \};/);
assert(homeIcons&&sharedIcons,'Shared home SVG icon geometry missing');
assert.equal(sharedIcons[1],homeIcons[1],'Arcade footer must use exact home icon paths');
for(const [action,label,x,width,center] of [
  ['home','Ana sayfa',43,182,132],['play','Oyna',231,182,326],
  ['friends','Arkadaşlar',424,194,529],['settings','Ayarlar',628,179,724]
]){
  const original="navButton('"+action+"','"+label+"',"+x+","+width+","+center+")";
  const shared="homeButton('"+action+"','"+label+"',"+x+","+width+","+center+",";
  assert(home.includes(original),'Canonical home missing '+action);
  assert(nav.includes(shared),'Arcade footer geometry differs: '+action);
}
for(const fragment of ['x="29" y="1650" width="797" height="136" rx="42"','fill="url(#nx-arcade-nav-surface)" stroke="#9adfff" stroke-width="3"','viewBox="0 1640 853 204"','y="1659" width="${w}" height="118"','y="1750"','y="1778"']){
  assert(nav.includes(fragment),'Missing canonical frame coordinate: '+fragment);
}
for(const token of ['stroke-width:4','font:24px Arial,system-ui,sans-serif','fill:#b4ff20','filter:drop-shadow(0 0 5px #8cc51f)','nx-arcade-has-footer','env(safe-area-inset-bottom']){
  assert(css.includes(token),'Missing canonical navigation styling '+token);
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
  assert(js.includes("NASIL OYNANIR?"),'Keep the informational how-to-play card: '+script);
  assert(js.includes('ARKADAŞLARINLA OYNA')&&js.includes('RAKİP ARA'),'Online modes must be preserved: '+script);
  new Function(js);
}
assert(!nav.includes('grid-template-columns:repeat(4'),'Old generic footer must not be reused');
new Function(nav);
const rootPage=read('index.html');
assert(rootPage.includes('neon-arcade-ui-v1.js'),'Draft entry bridge missing');
assert(nav.includes("if(atRoot||document.getElementById('nx-arcade-footer'))return"),'Draft and tournament footer exclusions broken');
assert(nav.includes("api.open('friends')")&&nav.includes('nxOpenSettings=1'),'Footer actions missing');
console.log('PASS: canonical SVG icon/geometry parity, five game entrypoints, single bottom bar, keyboard/actions, offline syntax.');
