#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'side-games', 'online-base44-imposter.js'),
  'utf8'
);
const loader = fs.readFileSync(
  path.join(__dirname, '..', 'side-games', 'futbol-imposter.html'),
  'utf8'
);

assert.match(
  loader,
  /online-base44-imposter\.js\?v=20260911-guest-render-v1/,
  'the game loader must invalidate the cached realtime transport'
);

const snapshot = {
  code: 'ABCDE',
  hostId: 'host',
  status: 'playing',
  players: [
    {id: 'host', name: 'Host'},
    {id: 'guest', name: 'Guest'},
    {id: 'third', name: 'Third'},
  ],
  round: 1,
  footballer: 'Messi',
  imposterId: 'third',
  gamePhase: 'discussion',
  phaseRevision: 3,
  turnIndex: 1,
  turnDeadline: 123456,
  responses: [],
  readyPlayers: ['host', 'guest', 'third'],
  voteCount: 0,
  voteRound: 0,
  tiebreakNo: 0,
  tieTally: null,
  result: null,
};

let roomListener = null;
let applyCount = 0;
let renderCount = 0;
const room = {
  id: 'IMP-ABCDE',
  room_code: 'ABCDE',
  game_type: 'futbol-imposter',
  owner_id: 'host',
  status: 'waiting',
  revision: 1,
  members: [{id: 'host', name: 'Host', role: 'host'}],
  state: snapshot,
};
const realtime = {
  findRoom: async () => room,
  decodeRoom: value => value,
  updateRoom: async (_id, patch) => ({...room, ...patch}),
  subscribeRoom: (_id, callback) => {
    roomListener = callback;
    return () => {};
  },
  subscribeActions: () => () => {},
  sendAction: async () => ({}),
  listActions: async () => [],
  deleteAction: async () => true,
  closeRoom: async () => true,
};

const context = {
  console,
  JSON,
  Map,
  Promise,
  URLSearchParams,
  location: {search: ''},
  setTimeout,
  clearTimeout,
  setInterval: () => 1,
  clearInterval: () => {},
  window: {
    NXArcadeRealtime: {ready: Promise.resolve(realtime)},
    addEventListener: () => {},
  },
  state: {
    screen: 'online-join',
    online: {
      myId: 'guest',
      myName: '',
      code: '',
      isHost: false,
      players: [],
      status: 'idle',
    },
  },
  p2pHostConnection: null,
  p2pHostConnections: new Map(),
  p2pPeer: null,
  bindHostConnection: () => {},
  lobbySnapshot: () => ({}),
  startOnlineRound: () => {},
  render: () => { renderCount += 1; },
  applyLobbyState: data => {
    applyCount += 1;
    context.state.online = {...context.state.online, ...data};
  },
};
context.globalThis = context;

vm.runInNewContext(source, context, {filename: 'online-base44-imposter.js'});

(async () => {
  await context.joinLobby('ABCDE', 'Guest');
  assert.equal(applyCount, 1, 'joining should apply the initial room state once');
  assert.equal(typeof roomListener, 'function', 'guest should subscribe to room updates');

  roomListener({type: 'update', data: {...room, updated_ms: 1}});
  roomListener({type: 'update', data: {...room, updated_ms: 2}});
  assert.equal(
    applyCount,
    1,
    'polling or metadata-only updates must not rebuild a guest screen'
  );

  const changed = {...snapshot, phaseRevision: 4, turnIndex: 2};
  roomListener({type: 'update', data: {...room, revision: 2, state: changed}});
  assert.equal(applyCount, 2, 'a real game-state change must still reach the guest');
  assert.equal(renderCount, 1, 'the transport must not add redundant renders');

  process.stdout.write('Imposter guest realtime render regression test passed.\n');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
