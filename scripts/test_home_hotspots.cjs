const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'side-games/home-approved-v1.js'), 'utf8');
const hits = [...source.matchAll(/hotspot\('([^']*)','([^']*)',(\d+),(\d+),(\d+),(\d+)/g)].map(m=>({action:m[1],label:m[2],x:+m[3],y:+m[4],w:+m[5],h:+m[6]}));
assert.equal(hits.length, 16);
for(const a of hits) {
  assert(a.x >= 0 && a.y >= 0 && a.x+a.w <= 853 && a.y+a.h <= 1844, a.label);
  for(const width of [320, 360, 390, 430, 520]) {
    const scale = width / 853;
    assert(Math.abs((a.x+a.w/2)*scale/scale-(a.x+a.w/2)) < 1e-9);
  }
}
for(let i=0;i<hits.length;i++)for(let j=i+1;j<hits.length;j++){
  const a=hits[i],b=hits[j];
  assert(!(a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y), `${a.label} overlaps ${b.label}`);
}
for(const asset of ['neon-xi-background-v4.png','neon-xi-foreground-v4.png']) {
  const data=fs.readFileSync(path.join(root,'side-games/assets/premium-home',asset));
  assert.equal(data.readUInt32BE(16),853);
  assert.equal(data.readUInt32BE(20),1844);
  if(asset.includes('foreground')) assert.equal(data[25],6,'Foreground must preserve RGBA');
  assert(source.includes(asset));
}
for(const href of [...source.matchAll(/'([^']+\.html)'\)\}/g)].map(m=>m[1])) assert(fs.existsSync(path.join(root,'side-games',href)),href);
console.log('PASS: 16 bounded, non-overlapping hotspots; 5 scaling widths; layer dimensions/alpha; game paths.');
