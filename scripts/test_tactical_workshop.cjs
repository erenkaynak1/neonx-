const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const path=require('node:path');const root=path.resolve(__dirname,'../');
const {condition,multiplier}=require('../tactical-load.js');
const high={pressingPlan:'Önde Baskı',transitionPlan:'Hızlı Hücum'};
const low={pressingPlan:'Alçak Blok',transitionPlan:'Topu Güvenceye Al'};
assert.equal(condition(high,70,0),100);
assert.ok(condition(high,70,90)<condition(low,70,90));
assert.ok(condition(high,90,90)>condition(high,50,90));
assert.ok(multiplier(60,'pace')<multiplier(60,'shortPassing'));
assert.equal(multiplier(60,'heading'),1);
for(const minute of [-1,0,44,45,46,60,90,120,999])for(const d of [30,60,99]){
 const c=condition(high,d,minute);assert.ok(c>=50&&c<=100);assert.ok(Number.isFinite(multiplier(c,'pace')));
}
// Parse every inline classic script without running network or application effects.
const core=fs.readFileSync(path.join(root,'neon-xi-core.html'),'utf8');
let count=0;for(const m of core.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
 if(/type\s*=\s*["']module/.test(m[1]))continue;
 new vm.Script(m[2],{filename:`core-inline-${count++}`});
}
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const m of index.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(m[1]);
const sample='<head>İ Türkçe</head><body>İ oyuncu</body>';
assert.equal(sample.slice(sample.search(/<\/head\s*>/i),sample.search(/<\/head\s*>/i)+7),'</head>');
assert.ok(index.includes("replace(/\\r\\n?/g,'\\n')"));
assert.ok(!core.includes('key==="crossing"?80'));
// Verify live stat integration, using the actual engine stat function.
const source=core.match(/function stat\(member,key,fallback=65\) \{([\s\S]*?)\n  \}/)[0];
const context={baseStat:()=>80,chemistryModifier:()=>1,tactic:()=>high,game:{minute:0},window:{NEON_TACTICAL_LOAD:{condition,multiplier}}};
vm.createContext(context);vm.runInContext(source+';this.read=stat;',context);
const member={team:'A',footballer:{pos:'CM'}};const fresh=context.read(member,'pace');context.game.minute=90;
assert.ok(context.read(member,'pace')<fresh);assert.equal(context.read({team:'A',footballer:{pos:'GK'}},'pace'),80);
console.log(`PASS: tactical load boundaries, plan tradeoffs, real engine integration, Unicode loader, ${count} inline scripts parsed.`);
console.log(JSON.stringify({highPress90:condition(high,70,90),lowBlock90:condition(low,70,90)}));
