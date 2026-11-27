// Draft XI 2D — tactical engine (prompt §1 Tactical Engine, §3, §7, §8).
// Gives every player a target and a pace each decision tick. Movement is never "run at the ball": it comes from
// the team's shape (formation slots, line height, block width), the phase of play and the player's position on
// the field, adjusted by the team's tactic settings (the same settings the match engine uses):
//   without the ball — a flat back line that steps up and drops with the ball and the line height; the block slides
//   towards the ball by the closed area; the nearest player presses goal-side and shows the carrier outside, the
//   next one covers behind him, a high press sends a third onto the nearest passing option; in the last third the
//   defenders pick up runners (zone + man); the keeper sits on the line between ball and goal centre.
//   with the ball — centre-backs split in build-up, the holding midfielder screens, wide players give width (or
//   tuck in for "centre"), full-backs push on the ball side and overlap for "wings", the two closest team-mates
//   offer a safe and a forward angle, the striker holds the last line and runs in behind on through-ball / fast /
//   counter plans, crosses fill near post, far post and the penalty spot.
// Player roles are not used: behaviour follows the position the player plays (the user's decision).
import { FORMATIONS, zonePoint } from '../../engine/formations.mjs?v=2';
import { MX, MY, clamp, lerp, toRel, fromRel, onPitch, metres, GOAL_HALF, BOX } from './saha.mjs?v=2';
import { speedOf } from './fizik.mjs?v=4';

const DEF = new Set(['CB', 'LB', 'RB', 'LWB', 'RWB']), FULL = new Set(['LB', 'RB', 'LWB', 'RWB']);
const WIDE = new Set(['LM', 'RM', 'LW', 'RW']), MID = new Set(['DM', 'CM', 'AM']);

/** Formation slots → base positions in the team frame (u lateral, v depth), with and without the ball. */
export function basePositions(formation, lineup) {
  const tpl = Object.fromEntries((FORMATIONS[formation] || FORMATIONS['4-3-3']).map((s) => [s[0], s]));
  return lineup.map((pl) => {
    const s = tpl[pl.slot] || [pl.slot, '', pl.mevki, 'C3', 'C3'];
    const a = zonePoint(s[3]), d = zonePoint(s[4]);
    return { poss: { u: a.x / 6.8, v: a.y / 10.5 }, def: { u: d.x / 6.8, v: d.y / 10.5 } };
  });
}

/**
 * W: { bodies[side][i], ball, lineup[side][i] {id, mevki}, base[side][i], tactic[side], minute }
 * P (from the director): { poss, holder: [side,i] | null, receiver: {side,i,at} | null, runner: [side,i] | null,
 *   presser: [side,i] | null, set: { kind, side, at } | null, celebrate: { side, i } | null, dead: bool, counter: bool }
 */
export function updateTargets(W, P) {
  const ball = { x: W.ball.x, y: W.ball.y };
  for (let side = 0; side < 2; side++) {
    const out = W.bodies[side].map(() => null);
    if (P.celebrate) celebration(W, P, side, out);
    else if (P.set) setPiece(W, P, side, out, ball);
    else if (P.poss === side) attack(W, P, side, out, ball);
    else defend(W, P, side, out, ball);
    spacing(W, side, out, P);
    W.bodies[side].forEach((b, i) => {
      const o = out[i];
      if (!o || !b) return;
      // people, not a rigid block: each player in shape drifts a little on his own slow rhythm (the back line much less,
      // so it stays a line); players in the action (sprinting / free) and set pieces are left exactly where they are sent
      if (!P.set && !P.celebrate && !o.free && o.mode !== 'sprint' && W.lineup[side][i].mevki !== 'GK') {
        const t = W.time || 0, ph = (side * 11 + i) * 1.7, back = DEF.has(W.lineup[side][i].mevki);
        o.x += (Math.sin(t * (0.23 + (i % 4) * 0.04) + ph) * (back ? 0.9 : 1.8)) / MX;
        o.y += (Math.cos(t * (0.19 + (i % 3) * 0.05) + ph * 0.7) * (back ? 0.4 : 1.4)) / MY;
      }
      const p = onPitch(o, o.free ? -1 : 0.8);
      b.tx = p.x; b.ty = p.y;
      b.mode = o.mode || paceFor(b, p);
      b.lookX = ball.x; b.lookY = ball.y;
    });
  }
}

// pace from the distance to cover: no sprinting to stand in shape
function paceFor(b, p) {
  const d = Math.hypot((p.x - b.x) * MX, (p.y - b.y) * MY);
  return d > 16 ? 'sprint' : d > 7 ? 'run' : d > 2.5 ? 'jog' : 'walk';
}

// ── without the ball ──
function defend(W, P, side, out, ball) {
  const T = W.tactic[side] || {}, b = toRel(side, ball), L = W.lineup[side], B = W.base[side], bodies = W.bodies[side];
  const lineBase = T.line === 'low' ? 18 : T.line === 'high' ? 36 : 27;
  // the back line follows the depth of the ball but stays goal-side of it; crosses from the flank drop it to the six-yard box
  let lineV = clamp(lineBase + (b.v - 50) * 0.34, 6.5, Math.max(6.5, b.v - 4.5));
  const wideDanger = (b.u < 20 || b.u > 80) && b.v < 30;
  if (wideDanger) lineV = Math.min(lineV, 9);
  const midV = lineV + (T.press === 'high' ? 14 : 12.5), fwdV = lineV + (T.press === 'low' ? 21 : T.press === 'high' ? 33 : 27);
  const shift = T.closed === 'centre' ? 0.34 : T.closed === 'wings' ? 0.58 : 0.46;
  const width = T.closed === 'centre' ? 0.6 : 0.76;
  const cu = 50 + (b.u - 50) * shift;
  L.forEach((pl, i) => {
    if (!bodies[i]) return;
    const m = pl.mevki, base = B[i].def;
    if (m === 'GK') { out[i] = keeper(side, ball, T); return; }
    const v = DEF.has(m) ? lineV : m === 'DM' ? lineV + 6.5 : base.v > 52 || m === 'ST' ? fwdV : midV;
    let u = cu + (base.u - 50) * (DEF.has(m) ? width + 0.06 : width);
    if (FULL.has(m) && Math.sign(base.u - 50) === Math.sign(b.u - 50) && Math.abs(b.u - 50) > 25) u = lerp(u, b.u, 0.35); // full-back steps out to the winger
    out[i] = { ...fromRel(side, u, v) };
  });
  // pressure, cover and press triggers
  const nPress = T.press === 'high' ? 3 : T.press === 'low' ? 1 : 2;
  const range = T.press === 'high' ? 30 : T.press === 'low' ? 13 : 20;   // metres from the ball
  const cand = L.map((pl, i) => ({ i, d: bodies[i] && pl.mevki !== 'GK' ? metres(bodies[i], ball) : 1e9 })).sort((x, y) => x.d - y.d);
  const ownHalf = b.v < 50;
  const goal = fromRel(side, 50, 0);
  const toGoal = norm({ x: (goal.x - ball.x) * MX, y: (goal.y - ball.y) * MY });
  if (P.presser && P.presser[0] === side) cand.unshift({ i: P.presser[1], d: 0, forced: true });
  const engaged = new Set();
  if (P.poss !== null && P.poss !== side && !P.dead) {
    const first = cand[0];
    if (first && (first.d < range || ownHalf || first.forced)) {
      // a man running with the ball is met where he will be, not chased from behind: aim ahead of him (lead time from
      // how far away the defender is), goal-side and a little inside so he is shown towards the touchline
      const o = W.ball.owner, ob = o && W.bodies[o[0]]?.[o[1]];
      const lead = (d) => (ob ? clamp(d / 7, 0, 1.1) : 0);
      const ahead = (d) => ({ x: ball.x + (ob ? ob.vx * lead(d) : 0), y: ball.y + (ob ? ob.vy * lead(d) : 0) });
      const inside = (50 - toRel(side, ball).u) > 0 ? 1 : -1;
      const a1 = ahead(first.d);
      const p = { x: a1.x + (toGoal.x * 1.5 + (side === 0 ? inside : -inside) * 0.6) / MX, y: a1.y + (toGoal.y * 1.5) / MY };
      out[first.i] = { ...p, mode: 'sprint' }; engaged.add(first.i);
      const second = cand.find((c) => !engaged.has(c.i));
      if (second && (nPress >= 2 || ob && speedOf(ob) > 4) && second.d < range + 12) {   // cover: behind the presser, on the line to goal (always when he is running at them)
        const a2 = ahead(second.d);
        out[second.i] = { x: a2.x + (toGoal.x * 6) / MX, y: a2.y + (toGoal.y * 6) / MY, mode: ob && speedOf(ob) > 4 ? 'sprint' : 'run' }; engaged.add(second.i);
      }
      if (nPress >= 3 && b.v > 40) {                          // high press: a third player jumps the nearest passing option
        const opp = W.bodies[1 - side];
        const holder = P.holder && P.holder[0] !== side ? opp[P.holder[1]] : null;
        const option = opp.map((o, j) => ({ o, j, d: o && (!holder || o !== holder) ? metres(o, ball) : 1e9 })).filter((x) => W.lineup[1 - side][x.j].mevki !== 'GK').sort((x, y) => x.d - y.d)[0];
        const third = option && cand.filter((c) => !engaged.has(c.i)).sort((x, y) => metres(bodies[x.i], option.o) - metres(bodies[y.i], option.o))[0];
        if (third && option.d < 25) { out[third.i] = { x: option.o.x + (toGoal.x * 1.2) / MX, y: option.o.y + (toGoal.y * 1.2) / MY, mode: 'sprint' }; engaged.add(third.i); }
      }
    }
  }
  // last third: defenders and the holding midfielder pick up attackers near their zone (goal-side)
  if (b.v < 40) {
    const opp = W.bodies[1 - side], taken = new Set();
    L.forEach((pl, i) => {
      if (engaged.has(i) || !out[i] || !(DEF.has(pl.mevki) || pl.mevki === 'DM')) return;
      let best = -1, bd = 11;
      opp.forEach((o, j) => { if (!o || taken.has(j) || W.lineup[1 - side][j].mevki === 'GK') return; const d = metres(o, out[i]); if (d < bd) { bd = d; best = j; } });
      if (best < 0) return;
      taken.add(best);
      const o = opp[best], g = norm({ x: (goal.x - o.x) * MX, y: (goal.y - o.y) * MY });
      const man = { x: o.x + (g.x * 1.3) / MX, y: o.y + (g.y * 1.3) / MY };
      out[i] = { x: lerp(out[i].x, man.x, 0.7), y: lerp(out[i].y, man.y, 0.7) };
    });
  }
}

function keeper(side, ball, T) {
  const b = toRel(side, ball);
  const depth = clamp(1.6 + (b.v / 100) * (T.line === 'high' ? 16 : 10), 1.6, T.line === 'high' ? 17 : 11);
  // on the line between the ball and the centre of the goal
  const k = depth / Math.max(depth, b.v);
  const u = 50 + (b.u - 50) * Math.min(0.55, k * 1.2);
  return { ...fromRel(side, clamp(u, 50 - GOAL_HALF - 2, 50 + GOAL_HALF + 2), depth), mode: b.v < 25 ? 'run' : 'jog' };
}

// ── with the ball ──
function attack(W, P, side, out, ball) {
  const T = W.tactic[side] || {}, b = toRel(side, ball), L = W.lineup[side], B = W.base[side], bodies = W.bodies[side];
  const phase = b.v < 36 ? 'build' : b.v < 66 ? 'mid' : 'final';
  // the opponent's last line, measured from their players (in our frame)
  const oppDef = W.bodies[1 - side].map((o, j) => (o && DEF.has(W.lineup[1 - side][j].mevki) ? toRel(side, o).v : null)).filter((v) => v != null).sort((x, y) => y - x);
  const lastLine = oppDef.length > 1 ? oppDef[1] : oppDef[0] ?? 80;
  const dir = T.direction || 'balanced';
  const ballSide = b.u < 50 ? -1 : 1;
  const flank = (u) => (u < 50 ? -1 : 1);
  const usesFlank = (u) => dir === 'wings' || (dir === 'left' && u < 50) || (dir === 'right' && u >= 50);
  const nST = L.filter((pl) => pl.mevki === 'ST').length;
  let stSeen = 0;
  L.forEach((pl, i) => {
    if (!bodies[i]) return;
    const m = pl.mevki, base = B[i].poss;
    let u = base.u, v = base.v;
    if (m === 'GK') { const d = clamp(3 + b.v * 0.12, 3, T.line === 'high' ? 19 : 13); out[i] = { ...fromRel(side, 50 + (b.u - 50) * 0.08, d), mode: 'jog' }; return; }
    if (m === 'CB') {
      u = phase === 'build' ? 50 + (base.u - 50) * 1.75 : 50 + (base.u - 50) * 1.15 + (b.u - 50) * 0.18;
      v = clamp(b.v - (phase === 'build' ? 13 : 25), 9, T.line === 'high' ? 58 : T.line === 'low' ? 42 : 50);
    } else if (FULL.has(m)) {
      const onBall = flank(base.u) === ballSide;
      const wb = m === 'LWB' || m === 'RWB' ? 4 : 0;
      u = flank(base.u) < 0 ? (phase === 'build' ? 11 : 7) : (phase === 'build' ? 89 : 93);
      if (phase === 'build') v = b.v - 2 + wb;
      else if (phase === 'mid') v = onBall ? b.v + (usesFlank(base.u) ? 7 : 0) + wb : b.v - 9 + wb;
      else v = onBall && usesFlank(base.u) ? Math.min(90, b.v + 3 + wb) : onBall ? b.v - 7 + wb : Math.max(45, b.v - 20 + wb); // overlap on the "wings" plan
      if (dir === 'centre') u = lerp(u, 50, 0.18);
    } else if (m === 'DM') {
      u = 50 + (b.u - 50) * 0.32; v = clamp(b.v - 11, 17, 64);
    } else if (m === 'CM') {
      u = 50 + (base.u - 50) * 0.9 + (b.u - 50) * 0.32; v = clamp(b.v + (base.v - 50) * 0.45 - 1, 22, 78);
    } else if (m === 'AM') {
      u = 50 + (b.u - 50) * 0.3; v = clamp(lastLine - 9, 42, 86);
    } else if (WIDE.has(m)) {
      const narrow = dir === 'centre' || (dir === 'left' && base.u >= 50) || (dir === 'right' && base.u < 50);
      u = flank(base.u) < 0 ? (narrow ? 24 : 6) : (narrow ? 76 : 94);
      v = clamp(b.v + 9, 38, lastLine - 1);
      if (phase === 'final' && flank(base.u) !== ballSide) { u = flank(base.u) < 0 ? 38 : 62; v = Math.max(v, 84); } // far-side winger attacks the back post
    } else if (m === 'ST') {
      const spread = nST > 1 ? (stSeen++ === 0 ? -7 : 7) : 0;
      u = 50 + spread + (b.u - 50) * 0.24; v = clamp(lastLine - 1, 52, 93);
      // runs in behind on through-ball / fast / counter plans, in rhythm (not glued offside)
      const runs = T.finishing === 'through' || T.tempo === 'fast' || P.counter;
      if (runs && phase !== 'build' && Math.sin(W.time * 0.9 + i) > 0.25) { v = Math.min(95, lastLine + 6); }
    }
    out[i] = { ...fromRel(side, u, v) };
  });
  // the box fills for a cross: near post, far post, penalty spot, edge of the box
  if (phase === 'final' && (b.u < 19 || b.u > 81) && b.v > 64) {
    const near = b.u < 50 ? 44 : 56, far = b.u < 50 ? 59 : 41;
    const spots = [[near, 94.5], [far, 92.5], [50, 87.5], [50 + (b.u < 50 ? 9 : -9), 79]];
    const pool = L.map((pl, i) => ({ i, m: pl.mevki })).filter((x) => bodies[x.i] && ['ST', 'AM', 'CM', 'LW', 'RW', 'LM', 'RM'].includes(x.m) && !(P.holder && P.holder[0] === side && P.holder[1] === x.i));
    const order = pool.sort((x, y) => (x.m === 'ST' ? -2 : WIDE.has(x.m) ? -1 : 0) - (y.m === 'ST' ? -2 : WIDE.has(y.m) ? -1 : 0));
    spots.forEach(([u, v], n) => { const x = order[n]; if (x) out[x.i] = { ...fromRel(side, u, v), mode: 'run' }; });
  }
  // two support angles around the ball: one safe (behind and to the side), one forward diagonal
  const holderIdx = P.holder && P.holder[0] === side ? P.holder[1] : -1;
  if (!P.dead) {
    const pool = L.map((pl, i) => ({ i, m: pl.mevki, d: bodies[i] && i !== holderIdx ? metres(bodies[i], ball) : 1e9 }))
      .filter((x) => x.m !== 'GK' && x.m !== 'ST' && !(x.m === 'CB' && phase !== 'build') && (!P.receiver || P.receiver.side !== side || P.receiver.i !== x.i))
      .sort((x, y) => x.d - y.d).slice(0, 2);
    const lat = b.u < 50 ? 1 : -1;  // support from the inside
    const angles = [[lat * 9, -6], [lat * -7, 11]];
    pool.forEach((x, n) => {
      if (x.d > 32) return;
      const p = fromRel(side, b.u + angles[n][0] / MX, b.v + angles[n][1] / MY);
      out[x.i] = { x: lerp(out[x.i].x, p.x, 0.75), y: lerp(out[x.i].y, p.y, 0.75), mode: 'run' };
    });
  }
  // the man on the ball and the man the ball is going to
  if (holderIdx >= 0 && bodies[holderIdx]) out[holderIdx] = { x: ball.x, y: ball.y, mode: 'sprint', free: true };
  if (P.receiver && P.receiver.side === side && bodies[P.receiver.i]) out[P.receiver.i] = { ...P.receiver.at, mode: 'sprint', free: true };
  if (P.runner && P.runner[0] === side && P.runner.at && bodies[P.runner[1]]) out[P.runner[1]] = { ...P.runner.at, mode: 'sprint' };
}

// ── set pieces (corner, free kick, goal kick, kick-off, penalty, throw) ──
function setPiece(W, P, side, out, ball) {
  const s = P.set, L = W.lineup[side], bodies = W.bodies[side], B = W.base[side];
  const att = s.side === side;
  const T = W.tactic[side] || {};
  L.forEach((pl, i) => {
    if (!bodies[i]) return;
    const m = pl.mevki, base = B[i].def;
    let p;
    if (s.kind === 'kickoff') {
      // both sides in their own half, in shape; the side not kicking off stays outside the centre circle
      let v = clamp(base.v * 0.82, 4, 46.5);
      let u = base.u;
      if (m === 'GK') v = 4;
      if (!att) { const d = Math.hypot((u - 50) * MX, (v - 50) * MY); if (d < 10.5) { const k = 10.5 / Math.max(d, 0.1); v = 50 - (50 - v) * k; u = 50 + (u - 50) * k; if (v > 47) v = 47; } }
      p = fromRel(side, u, v);
    } else if (s.kind === 'goalkick') {
      const r = att ? (m === 'GK' ? { u: 50, v: 5 } : m === 'CB' ? { u: base.u < 50 ? 30 : 70, v: 15 } : { u: base.u, v: clamp(base.v + 6, 18, 66) })
        : { u: base.u, v: clamp(base.v * 0.9 + 8, 20, 72) };
      p = fromRel(side, r.u, r.v);
    } else if (s.kind === 'corner' || s.kind === 'fk_box') {
      const goalV = att ? 100 : 0;
      if (m === 'GK') p = att ? fromRel(side, 50, 40) : fromRel(side, 50, 1.5);
      else if (att) {
        const n = i % 6;
        const spots = [[44, 93], [53, 94], [58, 91], [47, 88], [50, 82], [61, 85]];
        p = (DEF.has(m) && !FULL.has(m)) || m === 'ST' || m === 'AM' || m === 'CM' ? fromRel(side, spots[n][0], spots[n][1]) : fromRel(side, base.u, clamp(base.v, 40, 62));
      } else {
        const n = i % 7;
        const zone = [[44, 4], [50, 4.5], [56, 4], [47, 9], [53, 9], [45, 13], [55, 13]];
        p = DEF.has(m) || MID.has(m) || m === 'ST' ? fromRel(side, zone[n][0], zone[n][1]) : fromRel(side, base.u, 30);
      }
      void goalV;
    } else if (s.kind === 'penalty') {
      if (m === 'GK') p = att ? fromRel(side, 50, 40) : fromRel(side, 50, 0.8);
      else { const n = i % 8; p = fromRel(side, 34 + n * 4.5, att ? 79 : 21); if (!att) p = fromRel(side, 34 + n * 4.5, 19.5); else p = fromRel(side, 34 + n * 4.5, 80); }
    } else if (s.kind === 'fk_wall') {
      // defending wall 9.15 m from the ball on the line to goal; attackers on the edge of the box
      if (att) p = m === 'GK' ? fromRel(side, 50, 30) : fromRel(side, base.u, clamp(base.v + 10, 45, 84));
      else if (m === 'GK') p = fromRel(side, 50, 1.2);
      else {
        const goal = fromRel(side, 50, 0);
        const g = norm({ x: (goal.x - s.at.x) * MX, y: (goal.y - s.at.y) * MY });
        const w = { x: s.at.x + (g.x * 9.15) / MX, y: s.at.y + (g.y * 9.15) / MY };
        const n = i % 4, perp = { x: -g.y, y: g.x };
        p = DEF.has(m) && n < 4 && i % 3 === 0 ? { x: w.x + (perp.x * (n - 1.5) * 0.7) / MX, y: w.y + (perp.y * (n - 1.5) * 0.7) / MY } : fromRel(side, base.u, clamp(base.v, 8, 30));
      }
    } else {
      p = fromRel(side, base.u, base.v);
    }
    out[i] = { ...p };
  });
  if (s.taker && s.taker[0] === side && bodies[s.taker[1]]) out[s.taker[1]] = { ...s.at, mode: 'run', free: true };
  if (s.kind === 'kickoff' && att) {   // a second player next to the ball (a striker if there is one)
    const partner = L.map((pl, i) => ({ i, m: pl.mevki })).filter((x) => bodies[x.i] && x.m !== 'GK' && !(s.taker && s.taker[1] === x.i)).sort((a, b) => (b.m === 'ST') - (a.m === 'ST') || B[b.i].def.v - B[a.i].def.v)[0];
    if (partner) out[partner.i] = { ...fromRel(side, 50 + 3.5, 48.8), mode: 'jog', free: true };
  }
  void T;
}

// ── goal celebration: the scorer runs to the corner flag, team-mates chase him; the other side walks back ──
function celebration(W, P, side, out) {
  const c = P.celebrate, bodies = W.bodies[side];
  if (side === c.side) {
    const scorer = W.bodies[side][c.i];
    const flag = c.flag;
    bodies.forEach((b, i) => {
      if (!b) return;
      if (i === c.i) out[i] = { ...flag, mode: 'sprint', free: true };
      else if (W.lineup[side][i].mevki === 'GK') out[i] = { x: b.x, y: b.y, mode: 'walk' };
      else { const a = (i / 11) * Math.PI * 2; out[i] = { x: scorer.x + Math.cos(a) * 2.6, y: scorer.y + Math.sin(a) * 1.8, mode: metres(b, scorer) > 12 ? 'sprint' : 'run', free: true }; }
    });
  } else {
    bodies.forEach((b, i) => { if (b) { const r = W.base[side][i].def; out[i] = { ...fromRel(side, r.u, Math.min(r.v, 45)), mode: 'walk' }; } });
  }
}

// keep team-mates from standing on top of each other (≈ 4 m apart, 2 m for opponents is handled by physics)
function spacing(W, side, out, P) {
  const pts = out.map((o, i) => (o && W.bodies[side][i] ? { o, fixed: !!o.free } : null)).filter(Boolean);
  for (let pass = 0; pass < 3; pass++) for (let a = 0; a < pts.length; a++) for (let c = a + 1; c < pts.length; c++) {
    const A = pts[a], C = pts[c];
    const dx = (C.o.x - A.o.x) * MX, dy = (C.o.y - A.o.y) * MY, d = Math.hypot(dx, dy) || 0.01;
    const min = P.set || P.celebrate ? 1.6 : 4;
    if (d >= min) continue;
    const push = (min - d) / 2, nx = dx / d, ny = dy / d;
    if (!A.fixed) { A.o.x -= (nx * push * (C.fixed ? 2 : 1)) / MX; A.o.y -= (ny * push * (C.fixed ? 2 : 1)) / MY; }
    if (!C.fixed) { C.o.x += (nx * push * (A.fixed ? 2 : 1)) / MX; C.o.y += (ny * push * (A.fixed ? 2 : 1)) / MY; }
  }
}

const norm = (v) => { const d = Math.hypot(v.x, v.y) || 1; return { x: v.x / d, y: v.y / d }; };
export { BOX };
