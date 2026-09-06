'use strict';

const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const path=require('path');

const source=fs.readFileSync(path.join(__dirname,'..','draft-player-integrity-v1.js'),'utf8');
const context={
  console:{warn(){},error(){},log(){}},
  queueMicrotask(fn){fn();},
  PLAYERS:[
    {id:'st1',name:'Victor Osimhen',club:'Galatasaray',former:['Napoli']},
    {id:'duplicate-osimhen',name:'Víctor  Osimhen',club:'Old Club',former:['Lille','Napoli']},
    {id:'rw1',name:'Mohamed Salah',club:'Trabzonspor'},
    {id:'rw1',name:'Different Label',club:'Duplicate ID Club'},
  ],
  state:{selectedPlayer:'duplicate-osimhen',drafted:new Set()},
  renderPool(){return 'pool';},
  render(){return 'render';},
};
context.window=context;
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'draft-player-integrity-v1.js'});

assert.strictEqual(context.PLAYERS.length,2,'duplicate name/id records must be removed');
assert.deepStrictEqual(context.PLAYERS.map(p=>p.id),['st1','rw1']);
assert.strictEqual(context.state.selectedPlayer,null,'selection pointing to a removed duplicate must reset');
assert.ok(context.PLAYERS[0].former.includes('Lille'),'useful former-club history should be merged');
assert.strictEqual(context.NEON_DRAFT_PLAYER_INTEGRITY.report.removedCount,2);

context.PLAYERS.push({id:'late-copy',name:'VICTOR OSIMHEN',club:'Late Patch'});
context.renderPool();
assert.strictEqual(context.PLAYERS.length,2,'late data patches must be deduplicated before render');

console.log('Draft player integrity regression test passed.');
