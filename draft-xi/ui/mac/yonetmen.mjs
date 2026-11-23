// Draft XI 2D — director: engine events → physical actions on the pitch (prompt §4–§6 visualised, §1 separation).
// The match engine has already decided everything; the director turns each logged event into an action. Rules that
// keep it believable:
//   • the ball only moves when a player touches it: a pass, cross, clearance or shot waits until the kicker is at
//     the ball (he runs to it first); headers are struck by the player who won the header; loose balls are run onto,
//     never pulled to a player; a save is made where the keeper can reach.
//   • dead balls: a ball still on the pitch is carried to the spot by the taker; a ball out of play is replaced
//     at the spot (as a ball boy would); a corner is always preceded by the ball going out over the goal line.
//   • kick-offs start from both halves in shape (taker and partner on the ball, the other side outside the circle).
// Several engine events can share one timestamp (cross → header → miss); durations therefore come from the action
// and the distance, not from the log clock, and an outcome event is played inside its shot.
import { MX, MY, clamp, lerp, metres, rng, GOAL_HALF, fromRel } from './saha.mjs?v=2';
import { kick, giveBall, setState } from './fizik.mjs?v=2';
import { updateTargets } from './taktik.mjs?v=2';

const SPEED = { short: 13.5, long: 18, cross: 19, clear: 22, shot: 26, through: 15 }; // m/s along the path
const OUTCOME = new Set(['miss', 'goal', 'save', 'post', 'block']);
const ENGINE_BLEND = 0.3; // share of the engine's own off-ball positions in every target (simulation stays the source)
const REACH = 1.1;        // metres: a player at the ball can play it
const inPlay = (p) => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100;

export function createDirector(S, W, hooks) {
  const id2 = (id) => { const w = S.where[id]; return w ? [w.side, w.i] : null; };
  const body = (key) => (key ? W.bodies[key[0]][key[1]] : null);
  const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];
  const owns = (key) => same(W.ball.owner, key);
  const atBall = (key) => { const b = body(key); return !!b && (owns(key) || (W.ball.state !== 'flight' && metres(b, W.ball) < REACH)); };
  const R = rng((S.r.digest ? parseInt(String(S.r.digest).slice(0, 8), 16) : 7) || 7);
  let beats = [], bi = 0, bt = 0, tick = 0, ctl = null, onDone = null, beatDur = 0.4;
  const timers = [];
  const later = (fn, t) => timers.push({ at: bt + t, fn });

  // ── plan a highlight ──
  function play(h, done) {
    onDone = done;
    beats = [];
    for (let k = h.a; k <= h.b; k++) {
      const e = S.E[k];
      if (OUTCOME.has(e.type) && S.E[k - 1]?.type === 'shot') continue; // played inside its shot
      beats.push(k);
    }
    bi = -1; bt = 0; timers.length = 0;
    const first = S.E[h.a];
    const kickoff = first.type === 'possession' && first.how === 'kickoff';
    // players sent off before this highlight leave the pitch
    const off = new Set(S.E.slice(0, h.a + 1).filter((e) => e.type === 'foul' && e.card === 'red').map((e) => e.p));
    const f = S.F[h.a];
    for (let s = 0; s < 2; s++) W.bodies[s].forEach((b, i) => {
      if (!b) return;
      if (off.has(W.lineup[s][i].id)) { W.bodies[s][i] = null; return; }
      const q = f.p[s][i];
      if (q && !kickoff) { b.x = b.px = b.tx = q.x; b.y = b.py = b.ty = q.y; }
      b.vx = b.vy = 0; b.state = '';
    });
    const prev = h.a > 0 ? S.holder[h.a - 1] : null;
    resetBall(kickoff ? { x: 50, y: 50 } : f.b);
    ctl = { poss: S.poss[h.a], holder: null, receiver: null, runner: null, presser: null, set: null, celebrate: null, dead: false, counter: false, gate: null };
    if (kickoff) ctl.set = { kind: 'kickoff', side: first.team, at: { x: 50, y: 50 }, taker: id2(first.p) };
    W.k = h.a;
    // still under the dim of the cut: everybody steps into shape (kick-off formation, or the tactical shape around
    // the engine's positions), and the previous holder keeps the ball only if he is next to it
    updateTargets(W, ctl);
    const k = kickoff ? 1 : 0.7;
    for (const team of W.bodies) for (const b of team) if (b) { b.x = b.px = lerp(b.x, b.tx, k); b.y = b.py = lerp(b.y, b.ty, k); }
    const pk = kickoff ? id2(first.p) : prev && id2(prev), pb = pk && body(pk);
    if (pb && (kickoff || metres(pb, W.ball) < 2.5)) {
      if (kickoff) { pb.x = pb.px = 50; pb.y = pb.py = 50 + (first.team === 0 ? -0.8 : 0.8); pb.face = first.team === 0 ? Math.PI / 2 : -Math.PI / 2; }
      giveBall(W.ball, pk); ctl.holder = pk;
      W.ball.x = W.ball.px = pb.x + (Math.cos(pb.face) * 0.62) / MX; W.ball.y = W.ball.py = pb.y + (Math.sin(pb.face) * 0.62) / MY;
    }
    next();
  }
  function resetBall(p, fresh = false) { const b = W.ball; b.x = b.px = p.x; b.y = b.py = p.y; b.z = b.pz = 0; b.flight = null; b.trail = []; b.state = 'dead'; b.owner = null; b.vx = b.vy = 0; if (fresh) b.fresh = 0.45; }

  function next() {
    bi++;
    if (bi >= beats.length) { const d = onDone; onDone = null; beats = []; d?.(); return; }
    bt = 0; timers.length = 0;
    const k = beats[bi];
    W.k = k;
    begin(k);
    retarget();
  }

  // ── gates: an action that needs a player at the ball waits for him ──
  // touch(key, fn): run fn (which starts the action and returns its duration) once `key` can play the ball.
  function touch(key, fn) {
    if (!key || !body(key) || atBall(key)) return fn();
    ctl.gate = { key, cond: () => atBall(key), then: fn, until: bt + 6 };
    return null; // the beat lasts until the gate opens
  }
  function waitUntil(cond, then, key = null, timeout = 4) { ctl.gate = { key, cond, then, until: bt + timeout }; return null; }

  // where the ball has to go after event k: to the player who touches it next, where the engine has him then (the
  // engine does not move its ball for every action, e.g. crosses and headers, but it always knows the next toucher)
  const TOUCHER = { pass: 'p', through: 'p', possession: 'p', intercept: 'p', aerial: 'p', shot: 'p', clear: 'p', carry: 'p', dribble: 'p',
    loose_ball: 'p', second_ball: 'p', keeper_rush: 'p', save: 'p', block: 'p', cross: 'p', cross_bad: 'p', corner_short: 'p', chase_lost: 'p', fk_wall: 'p' };
  function landing(k, fallback) {
    for (let j = k + 1; j < Math.min(S.E.length, k + 5); j++) {
      const x = S.E[j];
      if (['foul', 'offside', 'corner', 'half_time', 'full_time', 'goal', 'miss', 'post'].includes(x.type)) break;
      const key = TOUCHER[x.type] && id2(x[TOUCHER[x.type]]);
      if (!key) continue;
      // the engine logs each event after it happened: a mover (carry, dribble) was where the previous frame has him
      const fr = ['carry', 'dribble'].includes(x.type) ? S.F[j - 1] : S.F[j];
      const q = fr.p[key[0]][key[1]], b = fr.b;
      if (q) return metres(q, b) < 3 ? { ...b } : { ...q };
    }
    return fallback || { ...(S.F[k + 1] || S.F[k]).b };
  }
  // where player `id` is in event k's own frame (the engine writes the frame after the event: a pass's receiver,
  // a carrier at the end of his run, a shooter where he shoots from)
  const atNow = (k, id) => { const w = id2(id); const q = w && S.F[k].p[w[0]][w[1]]; return q ? { ...q } : landing(k); };
  const atNext = atNow;

  // ── event → action ──
  function begin(k) {
    const e = S.E[k], fN = S.F[k + 1] || S.F[k];
    hooks.event(k);
    const to = fN.b;
    const actor = id2(e.p);
    const nextE = S.E[k + 1];
    ctl.carryFast = false; ctl.claim = null; ctl.poss = S.poss[k]; ctl.receiver = null; ctl.runner = null; ctl.presser = null; ctl.dead = false; ctl.gate = null; ctl.carryTo = null;
    // a set piece lasts until it is taken: a corner until the delivery, a free kick at goal / penalty until the shot
    if (ctl.set) {
      const keep = (ctl.set.kind === 'corner' && ['cross', 'cross_bad', 'corner_short'].includes(e.type))
        || (['fk_wall', 'penalty'].includes(ctl.set.kind) && ['shot', 'goal', 'miss', 'save', 'fk_wall'].includes(e.type))
        || (['kickoff', 'goalkick', 'fk'].includes(ctl.set.kind) && e.type === 'pass' && ctl.setFresh);
      if (!keep) ctl.set = null;
    }
    ctl.setFresh = false;
    ctl.celebrate = null;
    // a kicked ball: the kicker must be on it; returns the beat length once the ball is on its way
    const flight = (kicker, kind, speed, h = 0, receiverId = null, dest = to, end = null) => touch(kicker, () => {
      const dist = metres(W.ball, dest);
      const dur = clamp(dist / speed, kind === 'air' ? 0.7 : 0.35, 2.8);
      const rcv = receiverId && id2(receiverId);
      if (rcv) ctl.receiver = { side: rcv[0], i: rcv[1], at: { ...dest } };
      if (kicker) setState(body(kicker), 'kick', 0.25);
      kick(W.ball, dest, dur, kind, h, () => { if (rcv) claim(rcv); end?.(); });
      ctl.holder = null;
      return dur + (rcv ? 0.25 : 0.1);
    });
    // aerial duel: both go up, the winner heads it on to the next toucher (or keeps it)
    const header = () => {
      const loser = id2(e.vs), land = nextE && nextE.type !== 'shot' ? landing(k) : null;
      [actor, loser].forEach((x) => setState(body(x), 'jump', 0.55));
      if (land && actor) { const hd = clamp(metres(W.ball, land) / 12, 0.4, 1.4); kick(W.ball, land, hd, 'air', 1.4); return hd + 0.1; }
      if (actor) giveBall(W.ball, actor);
      return 0.45;
    };
    ctl.afterFlight = null;
    let dur = 0.4;
    switch (e.type) {
      case 'possession': {
        ctl.setFresh = true;
        const spot = S.F[k].b;
        if (e.how === 'kickoff') { ctl.set = { kind: 'kickoff', side: e.team, at: { x: 50, y: 50 }, taker: actor }; ctl.holder = actor; dur = 1.4; }
        else if (e.how === 'freekick') {
          const r = rel(e.team, spot);
          ctl.set = { kind: r.v > 62 && Math.abs(r.u - 50) < 26 ? 'fk_wall' : 'fk', side: e.team, at: { ...spot }, taker: actor };
          dur = restart(actor, spot, ctl.set.kind === 'fk_wall' ? 2.2 : 0.9);
        } else if (e.how === 'goalkick_short' || e.how === 'goalkick') {
          const at = fromRel(e.team, 50, 5.2);
          ctl.set = { kind: 'goalkick', side: e.team, at, taker: actor };
          dur = restart(actor, at, 1.0);
        } else {
          dur = 0.3;
          if (actor && body(actor) && W.ball.state !== 'flight') claim(actor);
        }
        break;
      }
      case 'pass': dur = e.kind === 'long' ? flight(actor, 'air', SPEED.long, 7 + R() * 5, e.to, atNext(k, e.to)) : flight(actor, 'ground', SPEED.short, 0, e.to, atNext(k, e.to)); break;
      case 'corner_short': ctl.set = null; dur = flight(actor, 'ground', SPEED.short, 0, nextE?.p, landing(k)); break;
      case 'pass_bad': dur = e.kind === 'long' ? flight(actor, 'air', SPEED.long, 7, null, landing(k)) : flight(actor, 'ground', SPEED.short, 0, null, landing(k)); break;
      case 'through': {
        const rc = id2(e.to);
        if (rc) ctl.runner = Object.assign([rc[0], rc[1]], { at: { ...to } });
        dur = flight(actor, 'ground', SPEED.through, 0, e.to, landing(k));
        break;
      }
      case 'intercept': {
        // the pass is played by its passer and cut out by the interceptor where the engine says
        const thief = actor, cut = thief ? atNext(k, e.p) : to;
        if (thief) { ctl.presser = thief; ctl.receiver = { side: thief[0], i: thief[1], at: { ...cut } }; }
        const passer = id2(e.from) || W.ball.owner;
        dur = flight(passer, 'ground', SPEED.short, 0, null, cut, () => { if (thief) { setState(body(thief), 'lunge', 0.35); claim(thief); } });
        break;
      }
      case 'carry': case 'dribble': {
        if (actor && !owns(actor)) claim(actor);
        ctl.holder = actor;
        const runTo = atNow(k, e.p);
        ctl.carryTo = { ...runTo };
        dur = clamp(metres(W.ball, runTo) / 6.2, e.type === 'dribble' ? 1.2 : 0.8, 3.2);
        if (e.type === 'dribble') { const d = id2(e.past); if (d) { ctl.presser = d; later(() => setState(body(d), 'beaten', 0.8), dur * 0.45); } }
        break;
      }
      case 'tackle': case 'press_win': case 'lost_control': {
        // the winner has to get to the ball carrier: the duel happens when he arrives
        const winner = e.type === 'lost_control' ? id2(e.by) : actor;
        if (!winner || !body(winner)) { dur = 0.5; break; }
        ctl.presser = winner;
        dur = waitUntil(() => metres(body(winner), W.ball) < 1.6, () => {
          setState(body(winner), e.type === 'tackle' ? 'slide' : 'lunge', 0.5);
          giveBall(W.ball, winner); ctl.holder = winner; ctl.poss = winner[0];
          return 0.55;
        }, winner, 3);
        break;
      }
      case 'loose_ball': case 'second_ball': case 'chase_lost': {
        // nobody touches the ball here: the player runs onto it where it is (or where it is rolling)
        if (actor) claim(actor);
        dur = actor ? waitUntil(() => owns(actor), () => 0.2, actor, 3) : 0.6;
        break;
      }
      case 'aerial': {
        // both go up for it; the winner heads it on to where the engine says it lands next
        const loser = id2(e.vs);
        const land = nextE && nextE.type !== 'shot' ? landing(k) : null;
        if (loser && body(loser)) { const b = body(loser); b.tx = W.ball.x; b.ty = W.ball.y; }
        // the ball has to reach the duel first: a long goal kick / clearance the engine logs only as the header
        const spot = actor && S.F[k].p[actor[0]][actor[1]] ? { ...S.F[k].p[actor[0]][actor[1]] } : { x: W.ball.x, y: W.ball.y };
        if (metres(W.ball, spot) > 8) {
          // kicked by whoever had it: the holder, else the last holder of the side in possession, else their nearest man
          let kicker = W.ball.owner || ctl.holder || (S.holder[k - 1] && id2(S.holder[k - 1]));
          if (!kicker) { const side = S.poss[k - 1] ?? 0; let bd = 1e9; W.bodies[side].forEach((b, i) => { if (b) { const d = metres(b, W.ball); if (d < bd) { bd = d; kicker = [side, i]; } } }); }
          if (actor) ctl.receiver = { side: actor[0], i: actor[1], at: { ...spot } };
          if (loser && body(loser)) { body(loser).tx = spot.x; body(loser).ty = spot.y; }
          dur = flight(kicker, 'air', SPEED.long, 11, null, spot, () => {});
          ctl.afterFlight = () => touchLoose(actor, () => header());
          break;
        }
        dur = touchLoose(actor, () => header());
        break;
      }
      case 'aerial_unused': {
        dur = touchLoose(actor, () => {
          [actor, loser].forEach((x) => setState(body(x), 'jump', 0.55));
          if (land && actor) { const hd = clamp(metres(W.ball, land) / 12, 0.4, 1.4); kick(W.ball, land, hd, 'air', 1.4); return hd + 0.1; }
          if (actor) giveBall(W.ball, actor);
          return 0.45;
        });
        break;
      }
      case 'clear': dur = flight(actor, 'air', SPEED.clear, 12, null, nextE?.type === 'corner' ? outBehind(1 - e.team, W.ball.x) : landing(k)); break;
      case 'cross': case 'cross_bad': {
        const tgt = nextE && ['aerial', 'shot'].includes(nextE.type) ? nextE.p : null;
        const dest = e.type === 'cross_bad' && nextE?.type === 'corner' ? outBehind(e.team, W.ball.x < 50 ? 70 + R() * 15 : 15 + R() * 15) : landing(k);
        dur = flight(actor, 'air', SPEED.cross, 5 + R() * 3, tgt, dest);
        break;
      }
      case 'cross_block': {
        // the cross hits the defender in front of the crosser and deflects (behind for a corner, or loose)
        const crosser = W.ball.owner;
        const blocker = actor;
        const bp = blocker && body(blocker) ? { x: body(blocker).x, y: body(blocker).y } : W.ball;
        const after = nextE?.type === 'corner' ? outBehind(S.poss[k - 1] ?? 1 - e.team, W.ball.x) : landing(k);
        if (blocker) setState(body(blocker), 'slide', 0.5);
        dur = touch(crosser, () => { kick(W.ball, bp, 0.25, 'ground', 0, () => kick(W.ball, after, clamp(metres(bp, after) / 12, 0.4, 1.4), 'ground')); return 0.25 + clamp(metres(bp, after) / 12, 0.4, 1.4) + 0.1; });
        break;
      }
      case 'corner': {
        const at = { x: W.ball.x < 50 ? 0.6 : 99.4, y: rel(e.team, W.ball).v > 50 === (e.team === 0) ? 99.4 : 0.6 };
        at.y = e.team === 0 ? 99.4 : 0.6;
        ctl.set = { kind: 'corner', side: e.team, at, taker: actor };
        // the ball has gone out over the goal line: a new ball at the corner flag, the taker runs over to it
        resetBall(at, true);
        dur = actor && body(actor) ? waitUntil(() => metres(body(actor), at) < 1.2, () => { placeAt(at, actor); return 1.6; }, actor, 9) : 2.2;
        break;
      }
      case 'keeper_rush': if (actor) { ctl.presser = actor; claim(actor); } dur = 0.8; break;
      case 'foul': {
        ctl.dead = true; ctl.holder = null;
        if (W.ball.state === 'held') { W.ball.state = 'dead'; W.ball.owner = null; }
        hooks.cue({ kind: 'whistle', card: e.card });
        if (actor) setState(body(actor), 'slide', 0.5);
        dur = e.card ? 2.0 : 1.3;
        break;
      }
      case 'offside': ctl.dead = true; if (W.ball.state === 'held') { W.ball.state = 'dead'; W.ball.owner = null; } hooks.cue({ kind: 'offside' }); dur = 1.3; break;
      case 'fk_wall': dur = touch(actor, () => shot(k, 'wall')); break;
      case 'shot': {
        // the shot is taken where the engine has the shooter (its distance matches the engine's own): if the ball is
        // not there yet he takes it there first
        const from = atNow(k, e.p);
        const go = () => shot(k, nextE?.type || 'miss');
        if (actor && metres(W.ball, from) > 2.5 && W.ball.state !== 'flight') {
          claim(actor); ctl.carryTo = { ...from }; ctl.carryFast = true;   // drives into the shooting position at pace
          dur = waitUntil(() => owns(actor) && metres(body(actor), from) < 1.5, () => { ctl.carryTo = null; ctl.carryFast = false; return touch(actor, go) ?? 0.3; }, actor, 10);
        } else dur = touch(actor, go);
        break;
      }
      case 'goal': case 'miss': case 'save': case 'post': case 'block':
        // a direct free kick or penalty (no 'shot' event before it)
        if (e.type === 'goal' || e.shotType === 'fk' || e.kind === 'fk' || e.kind === 'penalty') {
          const taker = id2(e.type === 'save' ? e.by : e.p);
          if (e.shotType === 'pen' || e.kind === 'penalty') {
            const as = e.type === 'save' ? 1 - e.team : e.team;
            ctl.set = { kind: 'penalty', side: as, at: fromRel(as, 50, 89.5), taker };
            dur = restart(taker, ctl.set.at, 1.4, () => touch(taker, () => shot(k, e.type, true)));
          } else dur = touch(taker, () => shot(k, e.type, true));
        } else dur = 0.5;
        break;
      case 'reshape': { const w = id2(e.p); if (w) W.lineup[w[0]][w[1]].slot = e.into; hooks.reshape?.(); dur = 0.05; break; }
      case 'half_time': case 'full_time': ctl.dead = true; dur = 1.2; break;
      default: dur = 0.4;
    }
    beatDur = dur == null ? Infinity : dur;
  }

  // a loose / dropping ball: the player has to reach it (within header reach) before he plays it
  function touchLoose(key, fn) {
    if (!key || !body(key)) return fn();
    if (W.ball.state !== 'flight' && metres(body(key), W.ball) < 1.8) return fn();
    ctl.receiver = { side: key[0], i: key[1], at: { x: W.ball.x, y: W.ball.y } };
    return waitUntil(() => W.ball.state !== 'flight' && metres(body(key), W.ball) < 1.8, fn, key, 7);
  }

  // restart from a dead ball: a ball that left the pitch is replaced at the spot, a ball still on it is carried
  // there by the taker; the taker then stands over it and the set-up time runs; `then` (optional) takes over after
  function restart(taker, spot, setup, then = null) {
    const finish = () => (then ? then() : setup);
    if (!inPlay(W.ball) || W.ball.state === 'dead' && !taker) {
      resetBall(spot, !inPlay(W.ball));   // a new ball (fades in)
      if (!taker || !body(taker)) return setup;
      return waitUntil(() => metres(body(taker), spot) < 1.2, () => { giveBall(W.ball, taker); W.ball.owner = taker; W.ball.state = 'held'; placeAt(spot); return finish(); }, taker, 5);
    }
    if (!taker || !body(taker)) { resetBall(spot); return setup; }
    if (metres(W.ball, spot) < 1.5) { resetBall(spot); return waitUntil(() => metres(body(taker), spot) < 1.2, () => { placeAt(spot, taker); return finish(); }, taker, 5); }
    // carry: take the ball, walk it to the spot, put it down
    claim(taker);
    ctl.carryTo = { ...spot };
    return waitUntil(() => owns(taker) && metres(body(taker), spot) < 0.9, () => { placeAt(spot, taker); ctl.carryTo = null; return finish(); }, taker, 6);
  }
  // the ball sits on the spot, the taker stands just behind it (he will run onto it when he plays it)
  function placeAt(spot, taker = null) {
    resetBall(spot);
    if (taker) giveBall(W.ball, taker);
    W.ball.x = W.ball.px = spot.x; W.ball.y = W.ball.py = spot.y;
    if (taker) { W.ball.state = 'held'; W.ball.owner = taker; }
  }
  // a point just over the goal line that `att` attacks, on the side of x (never inside the goal mouth)
  function outBehind(att, x) {
    let u = clamp(x + (R() - 0.5) * 16, 4, 96);
    if (Math.abs(u - 50) < GOAL_HALF + 2) u = 50 + Math.sign(u - 50 || 1) * (GOAL_HALF + 3 + R() * 4);
    return { x: u, y: att === 0 ? 101.8 : -1.8 };
  }

  // the ball is never handed to a player far from it: he runs to it and takes it when he gets there
  function claim(key) {
    const b = body(key);
    if (!b) return;
    if (metres(b, W.ball) < 1.4 && W.ball.state !== 'flight') { giveBall(W.ball, key); ctl.claim = null; ctl.holder = key; }
    else { ctl.claim = key; ctl.receiver = { side: key[0], i: key[1], at: { x: W.ball.x, y: W.ball.y } }; }
  }
  const rel = (side, p) => (side === 0 ? { u: p.x, v: p.y } : { u: 100 - p.x, v: 100 - p.y });

  // shot + outcome as one action: the keeper moves to the ball, a save is made within his reach, a goal goes in
  function shot(k, outcome, direct = false) {
    const e = S.E[k];
    const att = e.type === 'save' && direct ? 1 - e.team : e.team;
    const shooter = id2(direct && e.type === 'save' ? e.by : e.p) || id2(e.p);
    const keeperKey = W.lineup[1 - att].findIndex((pl, i) => pl.mevki === 'GK' && W.bodies[1 - att][i]);
    const gk = keeperKey >= 0 ? [1 - att, keeperKey] : null;
    const g = gk && body(gk);
    const goalY = att === 0 ? 100 : 0, inY = att === 0 ? 101.6 : -1.6, lineY = att === 0 ? 99.2 : 0.8;
    const head = e.shotType === 'head';
    let tx, ty = goalY, h = head ? 0.8 : 0.6;
    const side = R() < 0.5 ? -1 : 1;
    const est = clamp(metres(W.ball, { x: 50, y: goalY }) / (head ? 14 : SPEED.shot), 0.25, 1.3);
    const reachU = (1.4 + 4.2 * est) / MX;                       // how far the keeper can get across in that time
    const kx = g ? g.x : 50;
    if (outcome === 'goal') {
      // out of the keeper's reach when possible, otherwise into the far corner
      const far = kx < 50 ? 1 : -1;
      tx = 50 + far * (GOAL_HALF - 0.8 - R() * 1.5);
      if (Math.abs(tx - kx) < reachU * 0.8) tx = 50 + far * (GOAL_HALF - 0.6);
      ty = inY;
    } else if (outcome === 'save') tx = clamp(kx + side * R() * (1.2 / MX), 50 - GOAL_HALF - 1, 50 + GOAL_HALF + 1); // within a dive of where he stands
    else if (outcome === 'post') tx = 50 + side * GOAL_HALF;
    else if (outcome === 'block') {
      // the blocker steps into the line of the shot, between the ball and the goal
      const bl = id2(S.E[k + 1]?.p); const bp = bl && body(bl) ? body(bl) : W.ball;
      tx = lerp(W.ball.x, bp.x, 0.85); ty = lerp(W.ball.y, bp.y, 0.85);
      if (bl) { ctl.blocker = bl; ctl.receiver = { side: bl[0], i: bl[1], at: { x: tx, y: ty } }; }
    }
    else if (outcome === 'wall') { tx = W.ball.x + (50 - W.ball.x) * 0.1; ty = W.ball.y + (goalY - W.ball.y) * 0.1; }
    else { tx = 50 + side * (GOAL_HALF + 1 + R() * 6); ty = att === 0 ? 100.8 : -0.8; h = R() < 0.4 ? 2.6 : 0.8; } // wide or over
    if (outcome === 'save') ty = g ? clamp(g.y, 0.8, 99.2) : lineY;   // met where the keeper stands
    const d = metres(W.ball, { x: tx, y: ty });
    const fly = clamp(d / (head ? 14 : SPEED.shot), 0.25, 1.3);
    if (shooter) setState(body(shooter), head ? 'jump' : 'kick', 0.35);
    ctl.holder = null;
    const after = S.E[k + (direct ? 1 : 2)];
    const toCorner = after?.type === 'corner';
    kick(W.ball, { x: tx, y: ty }, fly, 'shot', h, () => {
      if (outcome === 'goal') { hooks.cue({ kind: 'net' }); W.ball.state = 'dead'; W.ball.vx = W.ball.vy = 0; }
      else if (outcome === 'save') {
        hooks.cue({ kind: 'save' });
        if (e.kind === 'hold' && gk) { claim(gk); return; }
        const rb = toCorner ? { x: 50 + side * (GOAL_HALF + 2 + R() * 3), y: att === 0 ? 101.8 : -1.8 } : landing(direct ? k : k + 1, { x: tx + side * 6, y: att === 0 ? 92 : 8 });
        kick(W.ball, rb, 0.5, 'air', toCorner ? 2.2 : 1.2);   // parried (round the post for a corner)
      } else if (outcome === 'post') { hooks.cue({ kind: 'post' }); kick(W.ball, landing(direct ? k : k + 1, { x: 50, y: att === 0 ? 90 : 10 }), 0.6, 'air', 1.0); }
      else if (outcome === 'block') { hooks.cue({ kind: 'block' }); kick(W.ball, toCorner ? outBehind(att, tx) : landing(direct ? k : k + 1, { x: W.ball.x, y: W.ball.y }), 0.5, 'ground'); }
      else W.ball.state = 'dead';
    });
    // the keeper reads the shot: moves along his line towards it and dives when it is close
    if (g && outcome !== 'wall' && outcome !== 'block') {
      ctl.receiver = outcome === 'save' ? { side: gk[0], i: gk[1], at: { x: tx, y: ty } }
        : { side: gk[0], i: gk[1], at: { x: lerp(g.x, clamp(tx, 50 - GOAL_HALF, 50 + GOAL_HALF), outcome === 'goal' ? 0.5 : 1), y: att === 0 ? 98.6 : 1.4 } };
      later(() => setState(body(gk), Math.abs(tx - g.x) > 1.6 ? (tx > g.x ? 'diveR' : 'diveL') : 'set', 0.9), fly * 0.45);
    }
    if (outcome === 'goal') {
      const scorer = id2(direct ? e.p : S.E[k + 1].p) || shooter;
      later(() => {
        hooks.goal(direct ? k : k + 1);
        const flagX = (scorer && body(scorer) ? body(scorer).x : 50) < 50 ? 4 : 96;
        ctl.celebrate = scorer ? { side: scorer[0], i: scorer[1], flag: { x: flagX, y: att === 0 ? 96 : 4 } } : null;
        ctl.set = null; ctl.receiver = null; retarget();
      }, fly + 0.15);
      return fly + 5.2;
    }
    if (!direct && OUTCOME.has(outcome)) later(() => hooks.event(k + 1), fly);
    return fly + (outcome === 'save' || outcome === 'post' ? 0.9 : 0.7);
  }

  // ── per physics step ──
  function step(dt) {
    if (!beats.length) return;
    bt += dt; tick += dt;
    for (let n = timers.length - 1; n >= 0; n--) if (timers[n].at <= bt) { const t = timers.splice(n, 1)[0]; t.fn(); }
    if (ctl.gate) {
      const g = ctl.gate;
      if (g.cond() || bt > g.until) {
        if (!g.cond()) globalThis.__gateLog?.push({ ev: S.E[W.k].type, who: g.key && W.lineup[g.key[0]][g.key[1]].mevki, d: g.key && body(g.key) ? metres(body(g.key), W.ball).toFixed(1) : null, ball: W.ball.state }); // test aid
        ctl.gate = null;
        const d = g.then();
        if (ctl.gate == null) beatDur = typeof d === 'number' ? bt + d : bt + 0.3;
      }
    }
    if (ctl.claim) {
      const b = body(ctl.claim);
      if (!b) ctl.claim = null;
      else if (W.ball.state !== 'flight' && metres(b, W.ball) < 1.4) { giveBall(W.ball, ctl.claim); ctl.holder = ctl.claim; ctl.claim = null; ctl.receiver = null; }
    }
    if (tick >= 0.2) { tick = 0; retarget(); }
    drive();
    if (bt >= beatDur) {
      if (ctl.afterFlight) { const f = ctl.afterFlight; ctl.afterFlight = null; const d = f(); beatDur = d == null ? Infinity : bt + d; return; }
      next();
    }
  }

  // the players the action is waiting for, and the holder carrying the ball, move with priority over the shape
  function drive() {
    const go = (key, p, mode = 'sprint') => { const b = body(key); if (b) { b.tx = p.x; b.ty = p.y; b.mode = mode; } };
    if (ctl.claim && W.ball.state !== 'flight') go(ctl.claim, W.ball);
    if (ctl.gate?.key && !owns(ctl.gate.key)) go(ctl.gate.key, W.ball.state === 'flight' && W.ball.flight ? { x: W.ball.flight.tx, y: W.ball.flight.ty } : W.ball);
    if (ctl.carryTo && W.ball.owner && body(W.ball.owner)) go(W.ball.owner, ctl.carryTo, ctl.set ? 'jog' : ctl.carryFast ? 'sprint' : 'run');
    if (ctl.gate?.key && owns(ctl.gate.key) && ctl.carryTo) go(ctl.gate.key, ctl.carryTo, 'jog');
  }

  function retarget() {
    if (!ctl) return;
    const k = W.k;
    if (W.ball.owner) ctl.holder = W.ball.owner;
    updateTargets(W, ctl);
    // keep the engine's own positions in the mix for everybody without a job in the action
    if (!ctl.set && !ctl.celebrate) {
      const f0 = S.F[k], f1 = S.F[k + 1] || f0, u = beatDur === Infinity ? 0 : clamp(bt / Math.max(0.01, beatDur), 0, 1);
      const busy = new Set([ctl.holder, ctl.presser, ctl.claim, ctl.gate?.key, ctl.receiver && [ctl.receiver.side, ctl.receiver.i], ctl.runner].filter(Boolean).map((x) => x[0] + ':' + x[1]));
      for (let s = 0; s < 2; s++) W.bodies[s].forEach((b, i) => {
        if (!b || busy.has(s + ':' + i)) return;
        const p = f0.p[s][i], q = f1.p[s][i] || p;
        if (!p || W.lineup[s][i].mevki === 'GK') return;
        b.tx = lerp(b.tx, lerp(p.x, q.x, u), ENGINE_BLEND); b.ty = lerp(b.ty, lerp(p.y, q.y, u), ENGINE_BLEND);
      });
    }
    drive();
  }

  // dead time (a set piece being set up, a player walking to a restart) is played faster, never skipped
  const hurry = () => !!(ctl && ctl.gate && (ctl.set || ctl.dead || (ctl.gate.key && !owns(ctl.gate.key) && bt > 1.2)));
  return { play, step, get active() { return beats.length > 0; }, get ctl() { return ctl; }, get hurry() { return hurry(); } };
}
export { MX, MY };
