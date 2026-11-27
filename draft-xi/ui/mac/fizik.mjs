// Draft XI 2D — physics (prompt §1 Physics Engine, §3 movement, §5 ball).
// Runs with a fixed time step in match seconds; rendering interpolates between steps. Players are bodies with
// position, velocity, acceleration limits and a top speed from their Hız (pace); they steer towards a target the
// tactical engine gives them and brake before they reach it (no teleporting, no snapping). The ball has its own
// state: at a player's feet, in flight along the ground or in the air (with height), rolling free, or dead.
import { MX, MY, clamp } from './saha.mjs?v=2';

export const DT = 1 / 50;                       // 50 physics steps per match second
const MODE_SPEED = { walk: 1.7, jog: 4.0, run: 6.0 }; // m/s; 'sprint' = the player's own top speed
const MODE_ACC = { walk: 0.6, jog: 0.85, run: 1, sprint: 1.15 };   // a sprinting man accelerates harder than a jogging one

/** A player body. pac / age come from the player data; gk changes nothing but the drawing. */
export function makeBody({ x, y, pac = 70, age = 26, gk = false }) {
  const top = 6.1 + (3.4 * clamp(pac, 1, 99)) / 99;           // 6.1–9.5 m/s (same range as the engine)
  return { x, y, vx: 0, vy: 0, px: x, py: y, tx: x, ty: y, face: 0, mode: 'jog', top, acc: 3.6 + (3.2 * pac) / 99,
    age, gk, stride: 0, state: '', stateT: 0, lookX: 50, lookY: 50 };
}

/** One step for a body. minute: match minute (fatigue); boost: short burst allowed (e.g. reaching a pass). */
export function stepBody(b, dt, minute) {
  b.px = b.x; b.py = b.y;
  const tired = 1 - 0.10 * (minute / 90) * (b.age >= 31 ? 1.35 : 1);
  // the target the body steers to glides after the tactical target (≈0.3 s), so a target that jumps every retarget
  // tick does not make the player brake and surge again (stop-go); a far jump (a teleport under the cut) is taken at once
  if (b.sx == null || Math.hypot((b.tx - b.sx) * MX, (b.ty - b.sy) * MY) > 25) { b.sx = b.tx; b.sy = b.ty; }
  const kT = 1 - Math.exp(-dt / 0.3);
  b.sx += (b.tx - b.sx) * kT; b.sy += (b.ty - b.sy) * kT;
  const ex = (b.sx - b.x) * MX, ey = (b.sy - b.y) * MY, d = Math.hypot(ex, ey);
  // the speed ceiling follows the chosen pace smoothly (≈2.5 m/s² up, 3.5 m/s² down): a change of pace is a few strides,
  // not a jump — players no longer surge and stall when their pace flips between jog and run
  const capT = (b.mode === 'sprint' ? b.top : Math.min(b.top, MODE_SPEED[b.mode] || 4)) * tired;
  if (b.capS == null) b.capS = capT;
  b.capS += clamp(capT - b.capS, -3.5 * dt, 2.5 * dt);
  const cap = b.capS;
  let vd = d < 0.12 ? 0 : Math.min(cap, d / 0.5);              // arrive: slow down over the last half second
  const dx = d > 1e-6 ? (ex / d) * vd : 0, dy = d > 1e-6 ? (ey / d) * vd : 0;
  let cx = b.vx * MX, cy = b.vy * MY;
  let ax = dx - cx, ay = dy - cy;
  const braking = dx * cx + dy * cy < 0 || vd < Math.hypot(cx, cy);
  const amax = b.acc * (MODE_ACC[b.mode] || 1) * (braking ? 1.35 : 1) * dt;
  const a = Math.hypot(ax, ay);
  if (a > amax) { ax *= amax / a; ay *= amax / a; }
  cx += ax; cy += ay;
  b.vx = cx / MX; b.vy = cy / MY;
  b.x += b.vx * dt; b.y += b.vy * dt;
  const sp = Math.hypot(cx, cy);
  // the body turns at a finite rate (quicker when slow): no snapping round when the run changes direction
  if (sp > 0.7) b.face = turn(b.face, Math.atan2(cy, cx), (sp > 5 ? 7 : 11) * dt);
  else b.face = turn(b.face, Math.atan2((b.lookY - b.y) * MY, (b.lookX - b.x) * MX), 6 * dt);
  b.stride += sp * dt * 1.8;
  if (b.stateT > 0) { b.stateT -= dt; if (b.stateT <= 0) b.state = ''; }
  return sp;
}
const turn = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + clamp(d, -k, k); };
export const speedOf = (b) => Math.hypot(b.vx * MX, b.vy * MY);
export const setState = (b, state, t) => { if (b) { b.state = state; b.stateT = t; } };

// ── ball ──
export function makeBall() {
  return { x: 50, y: 50, z: 0, px: 50, py: 50, pz: 0, vx: 0, vy: 0, owner: null, flight: null, state: 'dead', trail: [] };
}
/**
 * Start a flight from the ball's position to `to` lasting `dur` match seconds.
 * kind: 'ground' (passes along the floor, slowing down), 'air' (lofted: long ball, cross, clearance), 'shot', 'drive'.
 */
// z1: height the ball is at when the flight ends (a cross met by a head); the flight starts at the ball's own height
export function kick(ball, to, dur, kind = 'ground', h = 0, onEnd = null, z1 = 0) {
  globalThis.__kickLog?.push({ x: ball.x, y: ball.y, z: ball.z, kind, state: ball.state }); // test aid (touch audit)
  ball.flight = { fx: ball.x, fy: ball.y, fz: ball.z || 0, z1, tx: to.x, ty: to.y, t: 0, dur: Math.max(0.15, dur), kind, h, onEnd };
  ball.owner = null; ball.state = 'flight'; ball.trail = []; ball.hop = null;
}
export function stepBall(ball, dt, bodies) {
  if (ball.fresh > 0) ball.fresh = Math.max(0, ball.fresh - dt);
  ball.px = ball.x; ball.py = ball.y; ball.pz = ball.z;
  if (ball.state === 'held' && ball.owner) {
    const o = bodies(ball.owner);
    if (o) {
      // dribbling: the faster he runs, the further he pushes the ball ahead between touches (it is not glued on)
      const sp = Math.hypot(o.vx * MX, o.vy * MY), reach = 0.55 + Math.min(sp, 9) * 0.075 * (0.5 + 0.5 * Math.sin(o.stride * 1.6));
      ball.x = o.x + (Math.cos(o.face) * reach) / MX; ball.y = o.y + (Math.sin(o.face) * reach) / MY; ball.z = 0;
    }
  } else if (ball.state === 'flight' && ball.flight) {
    const f = ball.flight;
    f.t += dt;
    const u = Math.min(1, f.t / f.dur);
    // ground: decelerating roll (arrives at 45 % of its start speed); air / shot: straight with height
    const s = f.kind === 'ground' ? u + 0.55 * u * (1 - u) : f.kind === 'drive' ? u + 0.25 * u * (1 - u) : u;
    ball.x = f.fx + (f.tx - f.fx) * s; ball.y = f.fy + (f.ty - f.fy) * s;
    const base = f.fz + (f.z1 - f.fz) * u;   // from the height it was struck at to the height it is met at
    ball.z = f.kind === 'air' ? base + 4 * f.h * u * (1 - u) : f.kind === 'shot' ? base + f.h * Math.sin(Math.PI * u) : f.fz * (1 - u) * (1 - u);
    if (ball.trail.length > 14) ball.trail.shift();
    ball.trail.push([ball.x, ball.y, ball.z]);
    if (u >= 1) {
      const vx = (f.tx - f.fx) / f.dur, vy = (f.ty - f.fy) / f.dur;
      // hand over to the roll at the speed the flight ended with (ground 45 %, drive 75 %); a lofted ball bounces
      const keep = f.z1 > 0.2 ? 0.1 : f.kind === 'ground' ? 0.45 : f.kind === 'drive' ? 0.75 : 0.35;   // met in the air: it drops where it is
      ball.flight = null; ball.state = 'roll'; ball.vx = vx * keep; ball.vy = vy * keep; ball.z = f.z1;
      // a ball still in the air drops to the grass; a lofted ball that lands bounces once
      ball.hop = f.z1 > 0.2 ? { t: 0, dur: 0.3 + 0.15 * f.z1, h: 0.15, z0: f.z1 }
        : f.kind === 'air' && f.h > 2 ? { t: 0, dur: 0.18 + Math.min(f.h, 12) * 0.03, h: Math.min(f.h, 12) * 0.1, z0: 0 } : null;
      f.onEnd?.();
    }
  } else if (ball.state === 'roll') {
    const k = Math.exp(-1.6 * dt);
    ball.vx *= k; ball.vy *= k;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.hop) { const H = ball.hop; H.t += dt; const u = H.t / H.dur; if (u >= 1) { ball.hop = null; ball.z = 0; } else ball.z = H.z0 * (1 - u) + 4 * H.h * u * (1 - u); }
    if (Math.hypot(ball.vx * MX, ball.vy * MY) < 0.2 && !ball.hop) ball.state = 'dead';
  } else if (ball.hop || ball.z) { ball.hop = null; ball.z = 0; }
}
export const giveBall = (ball, id) => { ball.owner = id; ball.state = 'held'; ball.flight = null; ball.trail = []; ball.hop = null; };
