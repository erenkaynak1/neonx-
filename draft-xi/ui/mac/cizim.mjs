// Draft XI 2D — rendering (prompt §1 Rendering Engine, §9 animations, §11 performance).
// Canvas renderer, independent of the simulation: it reads body and ball state and interpolates between the last
// two physics steps (alpha), so motion stays smooth at any frame rate. The pitch is drawn once into an offscreen
// canvas and reused; each frame draws 22 players and the ball only. Coordinates come in 0–100 pitch units.
import { MX, MY, GOAL_HALF, BOX } from './saha.mjs?v=2';

const COL = ['#baff18', '#2fe0ff'], KEEPER = ['#ffd34d', '#ff8ad8'], DARK = '#070b0a';

export function createRenderer(canvas, W, info) {
  const ctx = canvas.getContext('2d');
  let dpr = 1, cw = 0, ch = 0, pitch = null, box = { x: 0, y: 0, w: 1, h: 1 };
  const cues = [];   // short-lived drawings: pass lines, net ripple, flashes
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cw = Math.max(200, r.width); ch = Math.max(240, r.height);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    // fit a 68 × 105 pitch (plus a margin for the goals) into the canvas
    const m = cw < 330 ? 6 : 14, aspect = 68 / 105;   // small pitch panels (phones) waste less space
    let h = ch - m * 2, w = h * aspect;
    if (w > cw - m * 2) { w = cw - m * 2; h = w / aspect; }
    box = { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
    pitch = drawPitch();
  }
  // home attacks upwards in the first half; the teams change ends at half time (the view turns round)
  const sx = (x) => box.x + ((info.flip ? 100 - x : x) / 100) * box.w;
  const sy = (y) => box.y + ((info.flip ? y : 100 - y) / 100) * box.h;
  const fa = (a) => (info.flip ? a + Math.PI : a);           // facing on screen
  const sx0 = (x) => box.x + (x / 100) * box.w, sy0 = (y) => box.y + ((100 - y) / 100) * box.h; // the pitch itself (symmetric)
  const unit = () => box.w / 68;                            // pixels per metre

  function drawPitch() {
    const sx = sx0, sy = sy0;
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    g.clearRect(0, 0, cw, ch);
    g.shadowColor = 'rgba(186,255,24,.25)'; g.shadowBlur = 18; g.fillStyle = '#0e3119'; g.fillRect(box.x, box.y, box.w, box.h); g.shadowBlur = 0;
    for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#0e3119' : '#11391d'; g.fillRect(box.x, box.y + (i * box.h) / 12, box.w, box.h / 12 + 0.5); }
    g.strokeStyle = 'rgba(236,255,228,.55)'; g.lineWidth = Math.max(1.2, unit() * 0.14);
    g.strokeRect(box.x, box.y, box.w, box.h);
    g.beginPath(); g.moveTo(box.x, sy(50)); g.lineTo(box.x + box.w, sy(50)); g.stroke();
    g.beginPath(); g.arc(sx(50), sy(50), 9.15 * unit(), 0, Math.PI * 2); g.stroke();
    dot(g, sx(50), sy(50), unit() * 0.35);
    for (const end of [0, 100]) {
      const s = end === 0 ? 1 : -1;
      const bx = sx(50 - BOX.halfW), bw = (2 * BOX.halfW / 100) * box.w;
      g.strokeRect(bx, end === 0 ? sy(BOX.depth) : sy(100), bw, (BOX.depth / 100) * box.h);
      const sxx = sx(50 - BOX.sixHalfW), sw = (2 * BOX.sixHalfW / 100) * box.w;
      g.strokeRect(sxx, end === 0 ? sy(BOX.sixDepth) : sy(100), sw, (BOX.sixDepth / 100) * box.h);
      dot(g, sx(50), sy(end + s * BOX.spot), unit() * 0.3);
      // the D
      g.beginPath();
      const cy = sy(end + s * BOX.spot), r = 9.15 * unit();
      const ang = Math.acos(Math.min(1, ((BOX.depth - BOX.spot) * MY) / 9.15));
      if (end === 0) g.arc(sx(50), cy, r, -Math.PI / 2 - ang, -Math.PI / 2 + ang); else g.arc(sx(50), cy, r, Math.PI / 2 - ang, Math.PI / 2 + ang);
      g.stroke();
      // goal and net
      const gx = sx(50 - GOAL_HALF), gw = (2 * GOAL_HALF / 100) * box.w, depth = 2 * unit();
      g.fillStyle = 'rgba(236,255,228,.10)';
      const gy = end === 0 ? sy(0) : sy(100) - depth;
      g.fillRect(gx, gy, gw, depth);
      g.strokeStyle = 'rgba(236,255,228,.85)'; g.strokeRect(gx, gy, gw, depth);
      g.strokeStyle = 'rgba(236,255,228,.18)'; g.lineWidth = 1;
      for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(gx + (gw * i) / 8, gy); g.lineTo(gx + (gw * i) / 8, gy + depth); g.stroke(); }
      g.strokeStyle = 'rgba(236,255,228,.55)'; g.lineWidth = Math.max(1.2, unit() * 0.14);
    }
    // corner arcs
    for (const [x, y, a0] of [[0, 0, -Math.PI / 2], [100, 0, Math.PI], [0, 100, 0], [100, 100, Math.PI / 2]]) { g.beginPath(); g.arc(sx(x), sy(y), unit(), a0, a0 + Math.PI / 2); g.stroke(); }
    return c;
  }
  const dot = (g, x, y, r) => { g.fillStyle = 'rgba(236,255,228,.7)'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };

  function cue(c) { cues.push({ ...c, t0: performance.now() }); }

  function draw(alpha) {
    if (!pitch) resize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(pitch, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const now = performance.now(), u = unit();
    // short-lived cues under the players
    for (let n = cues.length - 1; n >= 0; n--) {
      const c = cues[n], age = (now - c.t0) / 1000;
      if (age > (c.life || 0.9)) { cues.splice(n, 1); continue; }
      const k = 1 - age / (c.life || 0.9);
      if (c.kind === 'line') {
        ctx.strokeStyle = c.color; ctx.globalAlpha = 0.55 * k; ctx.lineWidth = Math.max(1.5, u * 0.3); ctx.setLineDash(c.dash ? [6, 6] : []);
        ctx.beginPath(); ctx.moveTo(sx(c.a.x), sy(c.a.y)); ctx.lineTo(sx(c.b.x), sy(c.b.y)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      } else if (c.kind === 'net') {
        const top = c.y > 50, gx = sx(50 - GOAL_HALF), gw = (2 * GOAL_HALF / 100) * box.w, depth = 2 * u;
        ctx.strokeStyle = `rgba(255,255,255,${0.9 * k})`; ctx.lineWidth = 2;
        const gy = top ? sy(100) - depth : sy(0);
        for (let i = 0; i <= 8; i++) { const wob = Math.sin(age * 30 + i) * 3 * k; ctx.beginPath(); ctx.moveTo(gx + (gw * i) / 8, gy); ctx.lineTo(gx + (gw * i) / 8 + wob, gy + depth); ctx.stroke(); }
      } else if (c.kind === 'ring') {
        ctx.strokeStyle = c.color; ctx.globalAlpha = k; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(sx(c.x), sy(c.y), u * (1.5 + age * 6), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    const ball = W.ball;
    const bx = ball.px + (ball.x - ball.px) * alpha, by = ball.py + (ball.y - ball.py) * alpha, bz = ball.pz + (ball.z - ball.pz) * alpha;
    // players (back to front so nearer ones overlap correctly)
    const list = [];
    for (let s = 0; s < 2; s++) W.bodies[s].forEach((b, i) => { if (b) list.push({ b, s, i }); });
    list.sort((p, q) => q.b.y - p.b.y);
    const r = Math.max(5.5, u * 1.05);
    for (const { b, s, i } of list) {
      const x = sx(b.px + (b.x - b.px) * alpha), y = sy(b.py + (b.y - b.py) * alpha);
      const sp = Math.hypot(b.vx * MX, b.vy * MY);
      const st = b.state;
      let scale = 1, lift = 0;
      if (st === 'jump') { const k = Math.sin(Math.PI * Math.min(1, (0.55 - b.stateT) / 0.55)); scale = 1 + 0.28 * k; lift = r * 0.9 * k; }
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.ellipse(x + lift * 0.4, y + r * 0.55 + lift * 0.2, r * 0.95, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      // running feet: two small marks alternating with the stride
      if (sp > 0.6 && !st.startsWith('dive') && st !== 'slide') {
        const F = fa(b.face), ph = Math.sin(b.stride * 3.2), fx = -Math.sin(F), fy = -Math.cos(F);
        const ax = Math.cos(F) * ph * r * 0.55, ay = -Math.sin(F) * ph * r * 0.55;
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.beginPath(); ctx.arc(x + fx * r * 0.35 + ax, y + fy * r * 0.35 + ay, r * 0.22, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x - fx * r * 0.35 - ax, y - fy * r * 0.35 - ay, r * 0.22, 0, Math.PI * 2); ctx.fill();
      }
      const keeper = W.lineup[s][i].mevki === 'GK';
      const col = COL[s], fill = keeper ? KEEPER[s] : DARK;
      ctx.save();
      ctx.translate(x, y - lift);
      if (st === 'slide' || st.startsWith('dive') || st === 'lunge') {
        // stretched body: a slide along the run, a dive across the goal
        const ang = st.startsWith('dive') ? ((st === 'diveR') !== !!info.flip ? 0 : Math.PI) : -fa(b.face);
        ctx.rotate(ang);
        ctx.scale(st === 'lunge' ? 1.25 : 1.7, st === 'lunge' ? 0.9 : 0.72);
      } else if (st === 'beaten') ctx.scale(0.9, 0.9);
      ctx.scale(scale, scale);
      ctx.shadowColor = col; ctx.shadowBlur = 8;
      ctx.fillStyle = fill; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.8, r * 0.28);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
      // facing notch
      if (!st.startsWith('dive') && st !== 'slide') {
        ctx.fillStyle = col;
        const nx = x + Math.cos(-fa(b.face)) * r * 1.05, ny = y - lift + Math.sin(-fa(b.face)) * r * 1.05;
        ctx.beginPath(); ctx.arc(nx, ny, r * 0.22, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = keeper ? DARK : col;
      ctx.font = `800 ${Math.round(r * 0.95)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(info.number(s, i), x, y - lift + r * 0.05);
      if (st === 'kick') { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, Math.PI * 2); ctx.stroke(); }
    }
    // ball: depth is shown three ways — the ball rises above its shadow, grows as it comes up, and the shadow
    // shrinks and fades the higher it goes (a lofted ball is unmistakable)
    const ground = { x: sx(bx), y: sy(by) };
    const H = 1.55;                                        // screen lift per metre of height (in pitch-metre units)
    const zpx = bz * u * H;
    const sh = 1 / (1 + bz * 0.22);                        // shadow scale: 1 on the ground, smaller in the air
    ctx.fillStyle = `rgba(0,0,0,${0.5 * sh + 0.1})`;
    ctx.beginPath(); ctx.ellipse(ground.x + zpx * 0.28, ground.y + 1, u * 0.62 * sh + 1, u * 0.36 * sh + 0.6, 0, 0, Math.PI * 2); ctx.fill();
    if (ball.trail.length > 2) {
      // the flight path drawn at its height; a faint line down to the ground marks the highest point
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = Math.max(1, u * 0.22); ctx.beginPath();
      ball.trail.forEach(([tx, ty, tz], n) => { const X = sx(tx) + tz * u * H * 0.28, Y = sy(ty) - tz * u * H; if (n) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
      ctx.stroke();
    }
    if (bz > 0.8) {
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(ground.x + zpx * 0.28, ground.y); ctx.lineTo(ground.x, ground.y - zpx); ctx.stroke(); ctx.setLineDash([]);
    }
    const br = Math.max(3, u * (0.55 + Math.min(bz, 14) * 0.085));
    ctx.globalAlpha = ball.fresh > 0 ? 1 - ball.fresh / 0.45 : 1;   // a new ball for a restart fades in
    if (bz > 1.5) { ctx.shadowColor = 'rgba(255,255,255,.65)'; ctx.shadowBlur = Math.min(16, bz * 1.4); }
    ctx.fillStyle = '#fff'; ctx.strokeStyle = DARK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(ground.x, ground.y - zpx, br, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    // name of the man on the ball
    const owner = ball.owner && W.bodies[ball.owner[0]][ball.owner[1]];
    if (owner) {
      const x = sx(owner.x), y = sy(owner.y) + r * 2.2;
      ctx.font = `700 ${Math.max(10, Math.round(r * 1.05))}px system-ui,sans-serif`; ctx.textAlign = 'center';
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(7,11,10,.9)'; ctx.strokeText(info.name(ball.owner), x, y);
      ctx.fillStyle = '#fff'; ctx.fillText(info.name(ball.owner), x, y);
    }
    // dimming during a cut between highlights
    if (info.dim > 0) { ctx.fillStyle = `rgba(7,11,10,${info.dim})`; ctx.fillRect(0, 0, cw, ch); }
  }
  new ResizeObserver(() => resize()).observe(canvas);
  return { draw, cue, resize, toScreen: (p) => ({ x: sx(p.x), y: sy(p.y) }) };
}
