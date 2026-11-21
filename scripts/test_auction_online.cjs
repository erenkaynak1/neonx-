'use strict';
// Contract test: Açık Artırma is wired into the lobby like every online game (party, random match, rally). Offline.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ui=read('side-games/acik-artirma/aa-ui.mjs'),page=read('side-games/acik-artirma/index.html');

// Lobby, matchmaking, party broker, forfeits, rally and labels all know the mode.
const social=read('social/neon-social.js'),safe=read('social/neon-social-safe-v4.js'),drawer=read('social/neon-social-drawer-v1.js');
const broker=read('social/party-match-broker-v1.js'),forfeit=read('social/match-forfeit-v1.js'),consistency=read('social/neon-social-consistency-v1.js');
assert(social.includes("auction:{label:'Açık Artırma',path:'side-games/acik-artirma/index.html',code:'numeric4',matchable:true,minParty:2,maxParty:2}"),'neon-social.js MODES');
assert(/RANDOM_GAMES=\[[^\]]*'auction'/.test(social),'random game list (neon-social.js)');
assert(safe.includes("auction:{label:'Açık Artırma',path:'side-games/acik-artirma/index.html',players:2}"),'safe-v4 MODES');
for(const list of ['LEGACY_MATCH_MODES','NUMERIC_ROOM_GAMES'])assert(new RegExp(list+"=new Set\\(\\[[^\\]]*'auction'").test(safe),'safe-v4 '+list);
assert(/const RANDOM_GAMES=\[[^\]]*'auction'/.test(safe),'random game list (safe-v4)');
assert(drawer.includes("auction:{label:'Açık Artırma',code:'numeric4',minParty:2,maxParty:2}"),'lobby drawer MODES');
assert(broker.includes("roomPath:code=>`rooms/AA-${code}`")&&broker.includes("if(mode==='auction')return room.gameType==='auction'"),'party broker mode + room readiness');
assert(/FORFEIT_MODES = new Set\(\[[^\]]*'auction'/.test(forfeit),'forfeit mode');
assert(consistency.includes("'fethet','auction'"),'party mode allow-list');
for(const f of ['social/party-ready-notify-v1.js','social/neon-profile-v1.js'])assert(read(f).includes("auction:'Açık Artırma'"),'mode label: '+f);
const rally=read('social/party-rally-v1.js');
assert(/const GAMES=\[[^\]]*'auction'/.test(rally)&&rally.includes("auction:'Açık Artırma'"),'rally game list + label');

// The page loads the room transport with its own namespace, the broker, the social layer and the rally.
assert(/firebase-peer-shim-v1\.js[^"]*" data-game-type="auction" data-prefix="neonxi-auction-" data-room-prefix="AA-"/.test(page),'room transport attributes');
for(const s of ['party-match-broker-v1.js','neon-social.js','party-ready-notify-v1.js','party-rally-v1.js','aa-ui.mjs','sidegame-skin-v2.css'])assert(page.includes(s),'page script missing: '+s);
assert(ui.includes("const PREFIX = 'neonxi-auction-'"),'game uses the same peer prefix as the page');

// Host authority: guest moves are checked on the host (turn + legality) before every screen applies them.
assert(ui.includes("if (!sec || sec.kim !== 1 || !gecerli(sec, h)) { send({ c: 'nope' }); return; }"),'host must validate guest moves');
assert(ui.includes("if (NET.role === 'guest') return;  // the host decides timeouts online"),'only the host decides timeouts');
assert(ui.includes("new CustomEvent('neon-match-result'")&&ui.includes("mode: 'auction'"),'online result reporting');
assert(ui.includes("window.NEON_SOCIAL.chooseMode('auction', choice)"),'menu opens the lobby for friends / match');
// Standard side-game menu (CLAUDE.md).
assert(ui.includes('class="sgm"')&&ui.includes("sgmMode('local', 'TEK TELEFON'")&&ui.includes("sgmMode('friends', 'ARKADAŞLARINLA OYNA'")&&ui.includes("sgmMode('match', 'RAKİP ARA'"),'standard menu modes');
console.log('auction online contract ok');
