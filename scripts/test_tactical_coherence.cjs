'use strict';
// v7 regression: tactics must reward squads whose attributes suit them; chemistry must stay a small modifier.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {run}=require('./tactical-coherence-lab.cjs');
const core=fs.readFileSync(path.join(__dirname,'..','neon-xi-core.html'),'utf8');

assert.ok(core.includes('const CHEM_MAX_BOOST=.08;'),'chemistry cap must be 8%');
assert.ok(core.includes('function boostFromChem(c){return Math.max(0,Math.min(8,c/10*8))}'),'draft chemistry display must match engine cap');
assert.ok(core.includes('value+=(s.tacticalFit-94)*.25;'),'analysis tactical fit must feed the match');

(async()=>{
  const {rows,fitGain}=await run(undefined,Number(process.env.MATCHES||30));
  assert.ok(fitGain.runners>0.05,`athletic squad should gain from pressing plan: ${fitGain.runners}`);
  assert.ok(fitGain.technicians>0.25,`technical squad should gain from possession plan: ${fitGain.technicians}`);
  assert.ok(rows['runners/press'].gd>rows['runners/possession'].gd,'athletic squad: press beats possession on goal difference');
  assert.ok(rows['technicians/possession'].gd>rows['technicians/press'].gd,'technical squad: possession beats press on goal difference');
  console.log('PASS: plan/attribute coherence',JSON.stringify(fitGain));
})().catch(e=>{console.error(e);process.exit(1);});
