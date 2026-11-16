'use strict';
// Contract test: Saha Fethi is wired into the lobby like every online game. Runs offline (no browser).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const game=read('side-games/fethet/fethet-game-v2.js'),page=read('side-games/fethet/index.html');
new Function(game);

// Lobby, matchmaking, party broker, forfeits and labels all know the mode.
const social=read('social/neon-social.js'),safe=read('social/neon-social-safe-v4.js'),drawer=read('social/neon-social-drawer-v1.js');
const broker=read('social/party-match-broker-v1.js'),forfeit=read('social/match-forfeit-v1.js'),consistency=read('social/neon-social-consistency-v1.js');
assert(/fethet:\{label:'Saha Fethi',path:'side-games\/fethet\/index\.html',code:'numeric4',matchable:true,minParty:2,maxParty:4\}/.test(social),'neon-social.js MODES');
assert(social.includes("RANDOM_GAMES=['draft','xox','twin','en11','fethet']"),'random game list (neon-social.js)');
assert(safe.includes("fethet:{label:'Saha Fethi',path:'side-games/fethet/index.html',players:2}"),'safe-v4 MODES');
for(const list of ['LEGACY_MATCH_MODES','NUMERIC_ROOM_GAMES'])assert(new RegExp(list+"=new Set\\(\\[[^\\]]*'fethet'").test(safe),'safe-v4 '+list);
assert(safe.includes("const RANDOM_GAMES=['draft','xox','twin','en11','fethet']"),'random game list (safe-v4) must match neon-social.js');
assert(drawer.includes("fethet:{label:'Saha Fethi',code:'numeric4',minParty:2,maxParty:4}"),'lobby drawer MODES');
assert(broker.includes("roomPath:code=>`rooms/FX-${code}`")&&broker.includes("if(mode==='fethet')return room.gameType==='fethet'"),'party broker mode + room readiness');
assert(/FORFEIT_MODES = new Set\(\[[^\]]*'fethet'/.test(forfeit),'forfeit mode');
assert(consistency.includes("'en11','fethet'"),'party mode allow-list');
for(const f of ['social/party-ready-notify-v1.js','social/neon-profile-v1.js'])assert(read(f).includes("fethet:'Saha Fethi'"),'mode label: '+f);

// The page loads the room transport with its own namespace, the broker and the social layer.
assert(/firebase-peer-shim-v1\.js[^"]*" data-game-type="fethet" data-prefix="neonxi-fethet-" data-room-prefix="FX-"/.test(page),'room transport attributes');
for(const s of ['party-match-broker-v1.js','neon-social.js','party-ready-notify-v1.js','fethet-game-v2.js','fethet-cinema-v2.js'])assert(page.includes(s),'page script missing: '+s);
assert(game.includes("const PREFIX = 'neonxi-fethet-'"),'game uses the same peer prefix as the page');

// Host authority: questions go out without the answer; guest answers are matched to their own connection.
const pub=game.match(/const publicQ = q => \(\{([^}]*)\}\)/);
assert(pub&&!/answer/.test(pub[1]),'publicQ must not send the answer');
assert(game.includes('const pid = NET.conns.indexOf(conn);')&&game.includes('resolveAnswer(m.rid, pid, m.v)'),'answers must be bound to the sender connection');
assert(game.includes('say(clean(m.html))')&&game.includes('revealCur(clean(m.html)'),'host HTML must be cleaned on guests');
assert(game.includes("new CustomEvent('neon-match-result'")&&game.includes("mode: 'fethet'"),'online result reporting');

// Database rules open the paths online play needs.
// Firebase rules allow // comment lines; strip them before parsing.
const rules=JSON.parse(read('security/database.rules.json').split('\n').map(l=>/^\s*\/\//.test(l)?'':l).join('\n')).rules;
for(const p of ['matchQueues','universalQueuesV2','partyPending','partyRoomLeases'])assert(rules.social[p],'rules missing social/'+p);
assert(rules.rooms&&rules.rooms.$room&&rules.reverseXI?.rooms?.$room,'rules missing game rooms');
// Firebase refuses keys with / . # [ ] (rule keys start with a dot): the file must paste cleanly into the console.
const walk=(o,path)=>{for(const k of Object.keys(o)){if(!k.startsWith('.'))assert(!/[\/.#\[\]]/.test(k),'invalid rules key: '+path+'/'+k);if(o[k]&&typeof o[k]==='object')walk(o[k],path+'/'+k)}};
walk(rules,'rules');
console.log('fethet online contract ok');
