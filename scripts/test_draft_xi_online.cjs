'use strict';
// Draft XI (draft-xi/) online wiring, offline: the mode is registered everywhere the social layer lists games, the
// pages load the Firebase room transport with the DX- namespace, and the match is agreed (tactics + seed) by the host.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const social = read('social/neon-social.js'), safe = read('social/neon-social-safe-v4.js'), drawer = read('social/neon-social-drawer-v1.js');
const broker = read('social/party-match-broker-v1.js'), forfeit = read('social/match-forfeit-v1.js'), consistency = read('social/neon-social-consistency-v1.js');
const rally = read('social/party-rally-v1.js'), notify = read('social/party-ready-notify-v1.js'), home = read('side-games/neon-home-v2.js');
assert(social.includes("draftxi:{label:'Draft XI',path:'draft-xi/draft.html',code:'numeric4',matchable:true,minParty:2,maxParty:2}"), 'neon-social.js MODES');
assert(social.includes("RANDOM_GAMES=['draftxi',") && safe.includes("const RANDOM_GAMES=['draftxi',"), 'random game list uses the new Draft XI');
assert(safe.includes("draftxi:{label:'Draft XI',path:'draft-xi/draft.html',players:2}"), 'safe-v4 MODES');
for (const list of ['LEGACY_MATCH_MODES', 'NUMERIC_ROOM_GAMES']) assert(new RegExp(list + "=new Set\\(\\[[^\\]]*'draftxi'").test(safe), 'safe-v4 ' + list);
assert(drawer.includes("draftxi:{label:'Draft XI',code:'numeric4',minParty:2,maxParty:2}"), 'lobby drawer MODES');
assert(broker.includes("roomPath:code=>`rooms/DX-${code}`") && broker.includes("if(mode==='draftxi')return room.gameType==='draftxi'"), 'party broker mode + room readiness');
assert(/FORFEIT_MODES = new Set\(\[[^\]]*'draftxi'/.test(forfeit), 'forfeit mode');
assert(/allowed=new Set\(\[[^\]]*'draftxi'/.test(consistency), 'party mode whitelist');
assert(rally.includes("'draftxi'") && notify.includes("draftxi:'Draft XI'"), 'rally + ready notification');
assert(home.includes('UI.openChoice("draftxi")'), 'home ONLINE opens the Draft XI chooser');
for (const page of ['draft-xi/draft.html', 'draft-xi/mac.html']) {
  const html = read(page);
  assert(html.includes('firebase-peer-shim-v1.js') && html.includes('data-game-type="draftxi"') && html.includes('data-room-prefix="DX-"') && html.includes('data-prefix="neonxi-draftxi-"'), page + ' loads the DX- room transport');
  assert(html.includes('social/neon-social.js'), page + ' records results');
}
assert(read('draft-xi/draft.html').includes('party-match-broker-v1.js'), 'draft page publishes the host room for party launches');
const online = read('draft-xi/ui/online.mjs'), draft = read('draft-xi/ui/draft.mjs'), mac = read('draft-xi/ui/mac.mjs'), taktik = read('draft-xi/ui/taktik.mjs');
assert(online.includes("PREFIX = 'neonxi-draftxi-'") && online.includes("mode: 'draftxi'"), 'room prefix and result mode');
assert(draft.includes("c: 'try'") && draft.includes("c: 'pick'") && draft.includes('PICK_SURE'), 'host-authoritative picks with a pick clock');
assert(mac.includes("c: 'go', seed") && mac.includes("c: 'tac'"), 'match agreed by the host: both tactics and one seed');
assert(taktik.includes('D?.online ? [D.online.me]'), 'each phone sets only its own tactics');
assert(!read('draft-xi/draft.html').includes('id="dizilis"'), 'the setup does not ask for a formation');
console.log('PASS: Draft XI online — mode registered in the social layer, DX- room transport, host-authoritative draft, shared seed.');
