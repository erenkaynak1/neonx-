const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('side-games/football-xox/game-v2.js', 'utf8');
function element(tag, cls, html) {
  return {tag, cls, html, children: [], hidden: false, attrs: {},
    append(...nodes) { this.children.push(...nodes); },
    appendChild(node) { this.children.push(node); return node; },
    setAttribute(key, value) { this.attrs[key] = value; },
    get childElementCount() { return this.children.length; }};
}
const players = JSON.parse(fs.readFileSync('side-games/data/master/xox-players.json'));
const context = vm.createContext({PLAYERS: players, E: element, B: (text, primary, onclick) => Object.assign(element('button'), {textContent:text, onclick}), esc: value => value});
vm.runInContext(source.slice(source.indexOf('  function matches('), source.indexOf('  function conditionKey(')) + source.slice(source.indexOf('  let revealedAnswerRound'), source.indexOf('  function renderGame(')), context);
const game = {over: true, matchRound: 'test-1', used: [], board: Array(9).fill(null), challenge: {rows: Array(3).fill({type:'nationality',value:'İtalya'}),cols: Array(3).fill({type:'club',value:'Tottenham Hotspur'})}};
context.g = game;
assert(vm.runInContext('remainingAnswers(g,0).some(p=>p.id===397033)', context));
game.used = [397033];
assert(!vm.runInContext('remainingAnswers(g,0).some(p=>p.id===397033)', context));
game.used=[]; game.board[1]={playerId:397033,mark:'X'};
assert(!vm.runInContext('remainingAnswers(g,0).some(p=>p.id===397033)', context));
assert.equal(vm.runInContext('remainingAnswers(g,1).length', context),0);
game.over=false;
const hidden=element('div');context.container=hidden;vm.runInContext('appendAnswerReview(container,g)',context);assert.equal(hidden.children.length,0);
game.over=true;
const review=element('div');context.container=review;vm.runInContext('appendAnswerReview(container,g)',context);
const [button,panel]=review.children;
assert.equal(button.textContent,'Cevapları Gör');assert(panel.hidden);button.onclick();assert(!panel.hidden);assert.equal(panel.children.length,9);assert.equal(button.attrs['aria-expanded'],'true');button.onclick();assert(panel.hidden);
button.onclick();const refreshed=element('div');context.container=refreshed;vm.runInContext('appendAnswerReview(container,g)',context);assert(!refreshed.children[1].hidden);
game.matchRound='test-2';const next=element('div');context.container=next;vm.runInContext('appendAnswerReview(container,g)',context);assert(next.children[1].hidden);
game.board.fill({playerId:397033,mark:'X'});const full=element('div');context.container=full;vm.runInContext('appendAnswerReview(container,g)',context);assert.equal(full.children.length,1);assert.equal(full.children[0].cls,'hint');
console.log('PASS: eligibility, used/claimed exclusions, pre-match gate, reveal/hide, online re-render, new round reset, full board');
