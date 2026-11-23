// Draft XI 2D — pitch and coordinate system (prompt §2).
// Every position is in normalized pitch coordinates 0–100: x across the pitch (home team's left → right), y along it
// (home goal y = 0 → away goal y = 100). The home side attacks towards +y. One x unit is 0.68 m, one y unit 1.05 m,
// so distances and speeds are converted to metres where physics needs them. Screen pixels never enter the simulation.
export const PITCH = { w: 68, l: 105 };            // metres
export const MX = PITCH.w / 100, MY = PITCH.l / 100; // metres per unit
export const GOAL_HALF = 3.66 / MX;                // half goal width in x units (≈ 5.4)
export const BOX = { halfW: 20.16 / MX, depth: 16.5 / MY, sixHalfW: 9.16 / MX, sixDepth: 5.5 / MY, spot: 11 / MY, arc: 9.15 };

/** Engine (680 × 1050 decimetres, absolute) → normalized. */
export const fromEngine = (x, y) => ({ x: x / 6.8, y: y / 10.5 });
/** Distance in metres between two normalized points. */
export const metres = (a, b) => Math.hypot((b.x - a.x) * MX, (b.y - a.y) * MY);
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerpP = (p, q, t) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });

/** Team-relative frame: u lateral, v depth from the team's own goal (0) to the opponent's goal (100). */
export const toRel = (side, p) => (side === 0 ? { u: p.x, v: p.y } : { u: 100 - p.x, v: 100 - p.y });
export const fromRel = (side, u, v) => (side === 0 ? { x: u, y: v } : { x: 100 - u, y: 100 - v });
/** Move a point by metres in the team-relative frame (du lateral, dv forward). */
export const offsetRel = (side, p, du, dv) => { const r = toRel(side, p); return fromRel(side, r.u + du / MX, r.v + dv / MY); };
/** Keep a point on the pitch (a small margin outside the lines is allowed for throw-ins and corners). */
export const onPitch = (p, m = 1.2) => ({ x: clamp(p.x, m, 100 - m), y: clamp(p.y, m, 100 - m) });

/** Small seeded generator (mulberry32): the same match always looks the same. */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
