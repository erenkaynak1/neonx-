// Draft XI 2D — physics (prompt §1 Physics Engine, §3 movement, §5 ball).
// Runs with a fixed time step in match seconds; rendering interpolates between steps. Players are bodies with
// position, velocity, acceleration limits and a top speed from their Hız (pace); they steer towards a target the
// tactical engine gives them and brake before they reach it (no teleporting, no snapping). The ball has its own
// state: at a player's feet, in flight along the ground or in the air (with height), rolling free, or dead.
import { MX, MY, clamp } from './saha.mjs?v=1';

export const DT = 1 / 50;                       // 50 physics steps per match second
const MODE_SPEED = { walk: 1.7, jog: 4.0, run: 6.0 }; // m/s; 'sprint' = the player's own top speed

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
  const ex = (b.tx - b.x) * MX, ey = (b.ty - b.y) * MY, d = Math.hypot(ex, ey);
  const cap = (b.mode === 'sprint' ? b.top : Math.min(b.top, MODE_SPEED[b.mode] || 4)) * tired;
  let vd = d < 0.12 ? 0 : Math.min(cap, d / 0.5);              // arrive: slow down over the last half second
  const dx = d > 1e-6 ? (ex / d) * vd : 0, dy = d > 1e-6 ? (ey / d) * vd : 0;
  let cx = b.vx * MX, cy = b.vy * MY;
  let ax = dx - cx, ay = dy - cy;
  const braking = dx * cx + dy * cy < 0 || vd < Math.hypot(cx, cy);
  const amax = b.acc * (braking ? 1.7 : 1) * dt;
  const a = Math.hypot(ax, ay);
  if (a > amax) { ax *= amax / a; ay *= amax / a; }
  cx += ax; cy += ay;
  b.vx = cx / MX; b.vy = cy / MY;
  b.x += b.vx * dt; b.y += b.vy * dt;
  const sp = Math.hypot(cx, cy);
  if (sp > 0.7) b.face = Math.atan2(cy, cx);
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
export function kick(ball, to, dur, kind = 'ground', h = 0, onEnd = null) {
  ball.flight = { fx: ball.x, fy: ball.y, tx: to.x, ty: to.y, t: 0, dur: Math.max(0.15, dur), kind, h, onEnd };
  ball.owner = null; ball.state = 'flight'; ball.trail = [];
}
export function stepBall(ball, dt, bodies) {
  ball.px = ball.x; ball.py = ball.y; ball.pz = ball.z;
  if (ball.state === 'held' && ball.owner) {
    const o = bodies(ball.owner);
    if (o) { ball.x = o.x + (Math.cos(o.face) * 0.62) / MX; ball.y = o.y + (Math.sin(o.face) * 0.62) / MY; ball.z = 0; }
  } else if (ball.state === 'flight' && ball.flight) {
    const f = ball.flight;
    f.t += dt;
    const u = Math.min(1, f.t / f.dur);
    // ground: decelerating roll (arrives at 45 % of its start speed); air / shot: straight with height
    const s = f.kind === 'ground' ? u + 0.55 * u * (1 - u) : f.kind === 'drive' ? u + 0.25 * u * (1 - u) : u;
    ball.x = f.fx + (f.tx - f.fx) * s; ball.y = f.fy + (f.ty - f.fy) * s;
    ball.z = f.kind === 'air' ? 4 * f.h * u * (1 - u) : f.kind === 'shot' ? f.h * Math.sin(Math.PI * u) : 0;
    if (ball.trail.length > 14) ball.trail.shift();
    ball.trail.push([ball.x, ball.y, ball.z]);
    if (u >= 1) {
      const vx = (f.tx - f.fx) / f.dur, vy = (f.ty - f.fy) / f.dur;
      ball.flight = null; ball.state = 'roll'; ball.vx = vx * 0.35; ball.vy = vy * 0.35; ball.z = 0;
      f.onEnd?.();
    }
  } else if (ball.state === 'roll') {
    const k = Math.exp(-1.6 * dt);
    ball.vx *= k; ball.vy *= k;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (Math.hypot(ball.vx * MX, ball.vy * MY) < 0.2) ball.state = 'dead';
  }
}
export const giveBall = (ball, id) => { ball.owner = id; ball.state = 'held'; ball.flight = null; ball.trail = []; };
