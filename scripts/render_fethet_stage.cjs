// Renders the night-stadium backdrop of the conquest battle cinematic → side-games/fethet/assets/battle-stage.webp
// (1600x900 scene units, rendered at 2x). The goal, keeper, cannon and ball are drawn live on top by the game
// (fethet-game-v1.js, battleCinematic), in the same 1600x900 coordinates: goal line y=560, goal centre x=1040.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const W = 1600, H = 900, HORIZON = 330;
const rand = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
// crowd: tiny heads in the stands, a few lit in team colours
let crowd = '';
for (let row = 0; row < 15; row++) {
  const y = 150 + row * 11, n = 140;
  for (let i = 0; i < n; i++) {
    const x = (i / n) * W + rand() * 9;
    const lit = rand() < 0.05, c = lit ? ['#baff18', '#00eaff', '#ffffff'][Math.floor(rand() * 3)] : `rgba(${60 + rand() * 40},${70 + rand() * 40},${80 + rand() * 40},${0.35 + rand() * 0.35})`;
    crowd += `<circle cx="${x.toFixed(1)}" cy="${(y + rand() * 3).toFixed(1)}" r="${(2.2 + rand() * 1.4).toFixed(1)}" fill="${c}"/>`;
  }
}
// pitch stripes in perspective (vanishing point above the goal)
const VX = 1040, VY = -900;
let stripes = '';
for (let i = -12; i < 14; i++) {
  const x1 = VX + (i * 260 - VX) * 0, xb = i * 150 + 120;
  const toH = (x) => VX + (x - VX) * ((HORIZON - VY) / (H - VY));
  const a = xb, b = xb + 150;
  stripes += `<path d="M${toH(a).toFixed(1)} ${HORIZON}L${toH(b).toFixed(1)} ${HORIZON}L${b} ${H}L${a} ${H}Z" fill="${i % 2 ? '#2f7a3a' : '#2a6e34'}"/>`;
}
const html = `<!doctype html><html><head><style>html,body{margin:0;background:#000}svg{display:block}</style></head><body>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 2}" height="${H * 2}">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03060a"/><stop offset=".6" stop-color="#0a1620"/><stop offset="1" stop-color="#13232c"/></linearGradient>
  <linearGradient id="stand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1117"/><stop offset="1" stop-color="#151f27"/></linearGradient>
  <radialGradient id="flood" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbe6"/><stop offset=".25" stop-color="#f5f1c8" stop-opacity=".55"/><stop offset="1" stop-color="#f5f1c8" stop-opacity="0"/></radialGradient>
  <radialGradient id="pool" cx=".55" cy=".3" r=".7"><stop offset="0" stop-color="#fff9d9" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <linearGradient id="pitchShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".35" stop-color="#000" stop-opacity=".15"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
  <radialGradient id="vignette" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>
  <filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="blur2"><feGaussianBlur stdDeviation="1.6"/></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .05 0"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<!-- floodlight towers -->
${[180, 560, 1080, 1460].map(x => `<g><rect x="${x - 3}" y="40" width="6" height="110" fill="#0f161c"/><rect x="${x - 34}" y="22" width="68" height="26" rx="3" fill="#1b252d"/>
  ${[0, 1, 2, 3].map(i => `<circle cx="${x - 24 + i * 16}" cy="35" r="5" fill="#fffdf0"/>`).join('')}
  <circle cx="${x}" cy="35" r="150" fill="url(#flood)"/></g>`).join('')}
<!-- stands -->
<path d="M0 140 L${W} 140 L${W} ${HORIZON} L0 ${HORIZON} Z" fill="url(#stand)"/>
<g>${crowd}</g>
<rect x="0" y="${HORIZON - 34}" width="${W}" height="34" fill="#0d151b"/>
<!-- LED advertising boards: neutral neon strips -->
<rect x="0" y="${HORIZON - 30}" width="${W}" height="22" fill="#08110a"/>
${Array.from({ length: 16 }, (_, i) => `<rect x="${i * 100 + 6}" y="${HORIZON - 26}" width="88" height="14" rx="2" fill="${i % 3 === 0 ? '#baff18' : i % 3 === 1 ? '#00eaff' : '#1d2a22'}" opacity="${i % 3 === 2 ? 1 : .55}"/>`).join('')}
<!-- pitch -->
<g>${stripes}</g>
<rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="url(#pitchShade)"/>
<rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="url(#pool)"/>
<!-- lines: goal line, 6-yard box, penalty box, penalty spot (perspective) -->
<g fill="none" stroke="#e9f3ea" stroke-opacity=".75" stroke-linecap="round">
  <path d="M-40 560 L1640 560" stroke-width="3"/>
  <path d="M820 560 L770 640 L1310 640 L1260 560" stroke-width="3"/>
  <path d="M560 560 L430 760 L1650 760 L1520 560" stroke-width="3.4"/>
  <path d="M760 760 Q1040 840 1320 760" stroke-width="3.4"/>
</g>
<ellipse cx="1040" cy="700" rx="7" ry="3" fill="#e9f3ea" opacity=".8"/>
<rect width="${W}" height="${H}" filter="url(#grain)"/>
<rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg></body></html>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: W * 2, height: H * 2 } });
  await p.setContent(html);
  await p.waitForTimeout(400);
  const out = path.join(ROOT, 'side-games/fethet/assets/battle-stage.png');
  await p.screenshot({ path: out });
  await b.close();
  console.log('wrote', out);
})();
