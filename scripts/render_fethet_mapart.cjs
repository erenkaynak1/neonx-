// Renders the neon base art of the conquest map → side-games/fethet/assets/map-art.png (convert to webp after).
// Reads side-games/fethet/data/map-tr.json (regions/outline from build_fethet_map.py). Run: node scripts/render_fethet_mapart.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'side-games/fethet/data/map-tr.json'), 'utf8'));
const [, , W, H] = map.viewBox;
const PAD = 40;
const vb = `${-PAD} ${-PAD} ${W + PAD * 2} ${H + PAD * 2}`;
const regions = map.regions.map(r => `<path d="${r.path}"/>`).join('');
const cities = map.regions.map(r => `<circle cx="${r.city[0]}" cy="${r.city[1]}" r="3.2"/>`).join('');
const html = `<!doctype html><html><head><style>html,body{margin:0;background:#04070a}svg{display:block}</style></head><body>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${W + PAD * 2}" height="${H + PAD * 2}">
<defs>
  <radialGradient id="sea" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#0b1a22"/><stop offset=".6" stop-color="#061017"/><stop offset="1" stop-color="#03070a"/></radialGradient>
  <linearGradient id="land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#18241f"/><stop offset=".55" stop-color="#101a17"/><stop offset="1" stop-color="#0b1311"/></linearGradient>
  <pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="#baff18" stroke-opacity=".05" stroke-width=".8"/></pattern>
  <pattern id="dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".8" fill="#baff18" fill-opacity=".09"/></pattern>
  <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" fill-opacity=".18"/></pattern>
  <filter id="glow" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="soft" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="2.2"/></filter>
  <filter id="cityglow" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <radialGradient id="bloom"><stop offset="0" stop-color="#baff18" stop-opacity=".16"/><stop offset=".45" stop-color="#baff18" stop-opacity=".06"/><stop offset="1" stop-color="#baff18" stop-opacity="0"/></radialGradient>
  <clipPath id="landclip"><path d="${map.outline}"/></clipPath>
</defs>
<rect x="${-PAD}" y="${-PAD}" width="${W + PAD * 2}" height="${H + PAD * 2}" fill="url(#sea)"/>
<rect x="${-PAD}" y="${-PAD}" width="${W + PAD * 2}" height="${H + PAD * 2}" fill="url(#grid)"/>
<!-- outer neon halo -->
<path d="${map.outline}" fill="none" stroke="#baff18" stroke-opacity=".35" stroke-width="10" filter="url(#glow)"/>
<path d="${map.outline}" fill="url(#land)"/>
<g clip-path="url(#landclip)">
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#dots)"/>
  <!-- stadium-light blooms over the big football cities -->
  ${['İST', 'TRA', 'ANK', 'İZM'].map(id => { const r = map.regions.find(x => x.id === id); return r ? `<circle cx="${r.city[0]}" cy="${r.city[1]}" r="85" fill="url(#bloom)"/>` : ''; }).join('')}
  <g fill="none" stroke="#baff18" stroke-opacity=".22" stroke-width="1.2" stroke-dasharray="3 3">${regions}</g>
</g>
<path d="${map.outline}" fill="none" stroke="#d6ff6a" stroke-width="1.6"/>
<g fill="#eaff9c" filter="url(#cityglow)">${cities}</g>
<rect x="${-PAD}" y="${-PAD}" width="${W + PAD * 2}" height="${H + PAD * 2}" fill="url(#scan)"/>
</svg></body></html>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: W + PAD * 2, height: H + PAD * 2 }, deviceScaleFactor: 3 });  // 3x: sharp on phones, where the map is twice the screen width
  await p.setContent(html);
  await p.waitForTimeout(300);
  const out = path.join(ROOT, 'side-games/fethet/assets/map-art.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await p.screenshot({ path: out });
  await b.close();
  fs.writeFileSync(path.join(ROOT, 'side-games/fethet/assets/map-art.json'), JSON.stringify({ viewBox: vb.split(' ').map(Number) }));
  console.log('wrote', out);
})();
