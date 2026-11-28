// Online regressions found in the real-Firebase lobby / random-match run (2026-11-28):
// 1) a guest's name was overwritten on every game page (claimGuestName ran before the stored profile was read);
// 2) a party member was kicked at every launch (offline cleanup measured from the stale connect-time lastSeen);
// 3) EN 11's guest never got the game (Firebase drops empty arrays / nulls, so peer messages travel as JSON text).
const fs = require('fs'), assert = require('assert');
const read = (p) => fs.readFileSync(require('path').join(__dirname, '..', p), 'utf8');
const social = read('social/neon-social.js');
assert(/async function claimGuestName\(\)\{if\([^)]*!state\.profileReady/.test(social), 'claimGuestName must wait for the stored profile');
assert(social.includes('state.profileReady=true'), 'the profile listener marks the profile as read');
assert(social.includes('state.profileReady=false'), 'a new sign-in resets the profile-read flag');
assert(/beforeunload[^\n]*lastSeen[^\n]*remove\(state\.presenceConnection\)/.test(social), 'leaving a page stamps lastSeen before dropping the connection');
const cons = read('social/neon-social-consistency-v1.js');
assert(/function scheduleOfflineCleanup[^\n]*const delay=graceMs\(\);/.test(cons), 'the offline grace period starts when the member is seen leaving');
const shim = read('side-games/career-twin/firebase-peer-shim-v1.js');
assert(shim.includes('{__json:JSON.stringify(payload)}'), 'peer messages are sent as JSON text');
assert(shim.includes("typeof a.payload.__json==='string'?JSON.parse(a.payload.__json):a.payload"), 'peer messages are parsed back from JSON');
// every page loads the same shim version (a mix would break messages between two phones)
const pages = ['draft-xi/draft.html', 'draft-xi/mac.html', 'side-games/en11/index.html', 'side-games/fethet/index.html', 'side-games/acik-artirma/index.html', 'side-games/career-twin/index.html'];
const versions = new Set(pages.map((p) => (read(p).match(/firebase-peer-shim-v1\.js\?v=([^"']+)/) || [])[1]));
assert.equal(versions.size, 1, 'one shim version on every online page: ' + [...versions].join(', '));
console.log('PASS: online regressions — guest name kept, party member not kicked on page change, peer messages keep empty arrays/nulls.');
