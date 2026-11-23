// Draft XI 2D — director: engine events → physical actions on the pitch (prompt §4–§6 visualised, §1 separation).
// The match engine has already decided everything; the director turns each logged event into an action with a
// realistic duration: the ball is kicked from where it is to where the engine says it ended up (pass, cross,
// clearance, shot), carried at a player's feet, won in a tackle, saved by a keeper who moves to the shot, and so on.
// Players get roles for the action (holder, receiver, runner, presser) and the tactical engine moves everybody
// else. Several engine events can share one timestamp (cross → header → miss); durations therefore come from the
// action and the distance, not from the log clock, and an outcome event is played inside its shot.
import { MX, MY, clamp, lerp, metres, rng, GOAL_HALF, fromRel } from './saha.mjs?v=1';
import { kick, giveBall, setState } from './fizik.mjs?v=1';
import { updateTargets } from './taktik.mjs?v=1';

const SPEED = { short: 13.5, long: 18, cross: 19, clear: 22, shot: 26, through: 15 }; // m/s along the path
const OUTCOME = new Set(['miss', 'goal', 'save', 'post', 'block']);
const ENGINE_BLEND = 0.3; // share of the engine's own off-ball positions in every target (simulation stays the source)

export function createDirector(S, W, hooks) {
  const id2 = (id) => { const w = S.where[id]; return w ? [w.side, w.i] : null; };
  const body = (key) => (key ? W.bodies[key[0]][key[1]] : null);
  const R = rng((S.r.digest ? parseInt(String(S.r.digest).slice(0, 8), 16) : 7) || 7);
  let beats = [], bi = 0, bt = 0, tick = 0, ctl = null, onDone = null;

  // ── plan a highlight ──
  function play(h, done) {
    onDone = done;
    beats = [];
    for (let k = h.a; k <= h.b; k++) {
      const e = S.E[k];
      if (OUTCOME.has(e.type) && S.E[k - 1]?.type === 'shot') continue; // played inside its shot
      beats.push(k);
    }
    bi = -1; bt = 0;
    // teleport into the engine's positions at the start (a cut, like a TV replay), then settle
    const f = S.F[h.a];
    // players sent off before this highlight leave the pitch; an empty position at the very start (before the
    // engine has placed anyone) keeps the body where it is
    const off = new Set(S.E.slice(0, h.a + 1).filter((e) => e.type === 'foul' && e.card === 'red').map((e) => e.p));
    for (let s = 0; s < 2; s++) W.bodies[s].forEach((b, i) => {
      const q = f.p[s][i];
      if (!b) return;
      if (off.has(W.lineup[s][i].id)) { W.bodies[s][i] = null; return; }
      if (!q) return;
      b.x = b.px = b.tx = q.x; b.y = b.py = b.ty = q.y; b.vx = b.vy = 0; b.state = '';
    });
    W.ball.x = W.ball.px = f.b.x; W.ball.y = W.ball.py = f.b.y; W.ball.z = 0; W.ball.flight = null; W.ball.trail = [];
    const prev = h.a > 0 ? S.holder[h.a - 1] : null;
    W.ball.state = 'dead'; W.ball.owner = null;
    ctl = { poss: S.poss[h.a], holder: prev ? id2(prev) : null, receiver: null, runner: null, presser: null, set: null, celebrate: null, dead: false, counter: false };
    W.k = h.a;
    // the previous holder keeps the ball only if he is next to it (then it sits at his feet straight away)
    const pk = prev && id2(prev), pb = pk && body(pk);
    if (pb && metres(pb, W.ball) < 2.5) {
      giveBall(W.ball, pk);
      W.ball.x = W.ball.px = pb.x + Math.cos(pb.face) * 0.62 / MX; W.ball.y = W.ball.py = pb.y + Math.sin(pb.face) * 0.62 / MY;
    } else ctl.holder = null;
    // still under the dim of the cut: everybody steps into the tactical shape around the engine's positions, so the
    // highlight opens on a team shape instead of the engine's zone grid
    updateTargets(W, ctl);
    for (const team of W.bodies) for (const b of team) if (b) { b.x = b.px = lerp(b.x, b.tx, 0.7); b.y = b.py = lerp(b.y, b.ty, 0.7); }
    if (W.ball.owner) { const ob = body(W.ball.owner); if (ob) { W.ball.x = W.ball.px = ob.x + Math.cos(ob.face) * 0.62 / MX; W.ball.y = W.ball.py = ob.y + Math.sin(ob.face) * 0.62 / MY; } }
    next();
  }

  function next() {
    bi++;
    if (bi >= beats.length) { const d = onDone; onDone = null; beats = []; d?.(); return; }
    bt = 0;
    const k = beats[bi];
    W.k = k;
    begin(k);
    retarget();
  }

  // ── event → action ──
  function begin(k) {
    const e = S.E[k], fN = S.F[k + 1] || S.F[k];
    hooks.event(k);
    const cur = { x: W.ball.x, y: W.ball.y };
    const to = fN.b;
    const actor = id2(e.p);
    ctl.claim = null; ctl.poss = S.poss[k]; ctl.receiver = null; ctl.runner = null; ctl.presser = null; ctl.dead = false;
    // a set piece lasts until it is taken: a corner until the delivery, a free kick at goal / penalty until the shot
    if (ctl.set) {
      const keep = (['corner', 'fk_box'].includes(ctl.set.kind) && ['cross', 'cross_bad', 'corner_short'].includes(e.type))
        || (['fk_wall', 'penalty'].includes(ctl.set.kind) && ['shot', 'goal', 'miss', 'save', 'fk_wall'].includes(e.type))
        || (['kickoff', 'goalkick', 'fk'].includes(ctl.set.kind) && ['pass'].includes(e.type) && ctl.setFresh);
      if (!keep) ctl.set = null;
    }
    ctl.setFresh = false;
    ctl.celebrate = null;
    const dist = metres(cur, to);
    const flight = (kind, speed, h = 0, receiverId = null, end = null) => {
      const dur = clamp(dist / speed, kind === 'air' ? 0.7 : 0.35, 2.8);
      const rcv = receiverId && id2(receiverId);
      if (rcv) ctl.receiver = { side: rcv[0], i: rcv[1], at: { ...to } };
      if (actor) setState(body(actor), 'kick', 0.25);
      kick(W.ball, to, dur, kind, h, () => { if (rcv) claim(rcv); end?.(); });
      ctl.holder = null;
      return dur + (rcv ? 0.25 : 0.1);
    };
    let dur = 0.4;
    switch (e.type) {
      case 'possession': {
        ctl.holder = actor;
        ctl.setFresh = true;
        if (e.how === 'kickoff') { ctl.set = { kind: 'kickoff', side: e.team, at: { x: 50, y: 50 }, taker: actor }; place({ x: 50, y: 50 }); dur = 1.6; }
        else if (e.how === 'freekick') {
          const r = rel(e.team, S.F[k].b);
          ctl.set = { kind: r.v > 62 && Math.abs(r.u - 50) < 26 ? 'fk_wall' : 'fk', side: e.team, at: { ...S.F[k].b }, taker: actor };
          place(S.F[k].b); dur = ctl.set.kind === 'fk_wall' ? 2.4 : 1.2;
        } else if (e.how === 'goalkick_short' || e.how === 'goalkick') { ctl.set = { kind: 'goalkick', side: e.team, at: { ...S.F[k].b }, taker: actor }; place(S.F[k].b); dur = 1.6; }
        else if (e.how === 'corner') { dur = 0.3; }
        else dur = 0.3;
        if (actor && body(actor) && W.ball.state !== 'flight') claim(actor);
        break;
      }
      case 'pass': dur = e.kind === 'long' ? flight('air', SPEED.long, 4 + R() * 3, e.to) : flight('ground', SPEED.short, 0, e.to); break;
      case 'corner_short': ctl.set = null; dur = flight('ground', SPEED.short, 0, S.E[k + 1]?.p); break;
      case 'pass_bad': dur = e.kind === 'long' ? flight('air', SPEED.long, 4) : flight('ground', SPEED.short); break;
      case 'through': {
        const rc = id2(e.to);
        if (rc) ctl.runner = Object.assign([rc[0], rc[1]], { at: { ...to } });
        dur = flight('ground', SPEED.through, 0, e.to);
        break;
      }
      case 'intercept': {
        const thief = actor; if (thief) { setState(body(thief), 'lunge', 0.4); ctl.presser = thief; }
        dur = flight('ground', SPEED.short) * 0.7;
        break;
      }
      case 'carry': case 'dribble': {
        if (!W.ball.owner && actor) claim(actor);
        ctl.holder = actor;
        if (actor) { const b = body(actor); b.tx = to.x; b.ty = to.y; }
        ctl.carryTo = { ...to };
        dur = clamp(dist / 6.2, e.type === 'dribble' ? 1.2 : 0.8, 3.2);
        if (e.type === 'dribble') { const d = id2(e.past); if (d) { ctl.presser = d; setTimeout0(() => body(d) && setState(body(d), 'beaten', 0.8), dur * 0.45); } }
        break;
      }
      case 'tackle': case 'press_win': case 'lost_control': {
        const winner = e.type === 'lost_control' ? id2(e.by) : actor;
        if (winner) { ctl.presser = winner; setState(body(winner), e.type === 'tackle' ? 'slide' : 'lunge', 0.6); }
        dur = 0.8;
        if (winner) ctl.receiver = { side: winner[0], i: winner[1], at: { x: W.ball.x, y: W.ball.y } };
        setTimeout0(() => { if (winner) claim(winner); ctl.holder = winner; ctl.poss = winner?.[0] ?? ctl.poss; }, 0.45);
        break;
      }
      case 'loose_ball': case 'second_ball': case 'chase_lost': {
        dur = clamp(dist / 9, 0.45, 1.4);
        kick(W.ball, to, dur * 0.85, e.type === 'second_ball' ? 'air' : 'ground', e.type === 'second_ball' ? 1.5 : 0);
        if (actor) ctl.receiver = { side: actor[0], i: actor[1], at: { ...to } };
        setTimeout0(() => actor && claim(actor), dur * 0.9);
        break;
      }
      case 'aerial': {
        const loser = id2(e.vs);
        [actor, loser].forEach((x) => x && body(x) && setState(body(x), 'jump', 0.55));
        if (actor) ctl.receiver = { side: actor[0], i: actor[1], at: { ...cur } };
        if (loser) { const b = body(loser); b.tx = cur.x; b.ty = cur.y; }
        dur = 0.6;
        break;
      }
      case 'clear': if (actor) setState(body(actor), 'kick', 0.3); dur = flight('air', SPEED.clear, 7); break;
      case 'cross': case 'cross_bad': {
        const tgt = S.E[k + 1] && ['aerial', 'shot'].includes(S.E[k + 1].type) ? S.E[k + 1].p : null;
        dur = flight('air', SPEED.cross, 3.5 + R() * 2, tgt);
        break;
      }
      case 'cross_block': dur = flight('ground', 10); if (actor) setState(body(actor), 'slide', 0.5); break;
      case 'corner': {
        const at = { x: S.F[k].b.x < 50 ? 0.6 : 99.4, y: S.F[k].b.y < 50 ? 0.6 : 99.4 };
        ctl.set = { kind: 'corner', side: e.team, at, taker: actor };
        place(at); if (actor) claim(actor); ctl.holder = actor;
        dur = 2.6;
        break;
      }
      case 'keeper_rush': if (actor) { ctl.presser = actor; ctl.receiver = { side: actor[0], i: actor[1], at: { ...to } }; } dur = 0.8; break;
      case 'foul': {
        ctl.dead = true; ctl.holder = null; if (W.ball.state === 'held') { W.ball.state = 'dead'; W.ball.owner = null; }
        hooks.cue({ kind: 'whistle', card: e.card });
        if (actor) setState(body(actor), 'slide', 0.5);
        dur = e.card ? 2.0 : 1.3;
        break;
      }
      case 'offside': ctl.dead = true; hooks.cue({ kind: 'offside' }); dur = 1.3; break;
      case 'fk_wall': dur = shot(k, 'wall'); break;
      case 'shot': dur = shot(k, S.E[k + 1]?.type || 'miss'); break;
      case 'goal': case 'miss': case 'save': case 'post': case 'block':
        // a direct free kick or penalty (no 'shot' event before it)
        if (e.type === 'goal' || e.shotType === 'fk' || e.kind === 'fk' || e.kind === 'penalty') {
          if (e.shotType === 'pen' || e.kind === 'penalty') { ctl.set = { kind: 'penalty', side: e.type === 'save' ? 1 - e.team : e.team, at: fromRel(e.type === 'save' ? 1 - e.team : e.team, 50, 89.5) }; place(ctl.set.at); }
          dur = shot(k, e.type, true);
        } else dur = 0.5;
        break;
      case 'reshape': { const w = id2(e.p); if (w) W.lineup[w[0]][w[1]].slot = e.into; hooks.reshape?.(); dur = 0.05; break; }
      case 'half_time': case 'full_time': ctl.dead = true; dur = 1.2; break;
      default: dur = 0.4;
    }
    beatDur = dur;
  }
  let beatDur = 0.4;
  const timers = [];
  const setTimeout0 = (fn, t) => timers.push({ at: bt + t, fn });

  // the ball is never handed to a player far from it: he runs to it and takes it when he gets there
  function claim(key) {
    const b = body(key);
    if (!b) return;
    if (metres(b, W.ball) < 1.6 && W.ball.state !== 'flight') { giveBall(W.ball, key); ctl.claim = null; }
    else { ctl.claim = key; ctl.receiver = { side: key[0], i: key[1], at: { x: W.ball.x, y: W.ball.y } }; }
  }
  const rel = (side, p) => (side === 0 ? { u: p.x, v: p.y } : { u: 100 - p.x, v: 100 - p.y });
  // a dead ball is carried to its spot (free kick, corner flag, centre spot): a short glide, never a jump
  function place(p) {
    W.ball.owner = null;
    if (metres(W.ball, p) < 0.5) { W.ball.state = 'dead'; return; }
    kick(W.ball, p, clamp(metres(W.ball, p) / 14, 0.25, 0.9), 'ground', 0, () => { W.ball.state = 'dead'; W.ball.vx = W.ball.vy = 0; });
    W.ball.trail = [];
  }

  // shot + outcome as one action: the keeper moves to the ball, a save parries it, a goal goes into the net
  function shot(k, outcome, direct = false) {
    const e = S.E[k];
    const att = e.type === 'save' && direct ? 1 - e.team : e.team;
    const shooter = id2(direct && e.type === 'save' ? e.by : e.p) || id2(e.p);
    const keeperKey = W.lineup[1 - att].findIndex((pl, i) => pl.mevki === 'GK' && W.bodies[1 - att][i]);
    const gk = keeperKey >= 0 ? [1 - att, keeperKey] : null;
    const goalY = att === 0 ? 100 : 0, inY = att === 0 ? 101.6 : -1.6;
    const head = e.shotType === 'head';
    let tx, ty = goalY, h = head ? 0.8 : 0.6;
    const side = R() < 0.5 ? -1 : 1;
    if (outcome === 'goal') { tx = 50 + side * (1.2 + R() * (GOAL_HALF - 1.8)); ty = inY; }
    else if (outcome === 'save') tx = 50 + side * (R() * (GOAL_HALF - 1));
    else if (outcome === 'post') tx = 50 + side * GOAL_HALF;
    else if (outcome === 'block') { const bl = id2(S.E[k + 1]?.p); const bp = bl && body(bl) ? body(bl) : W.ball; tx = bp.x; ty = bp.y; }
    else if (outcome === 'wall') { const g = { x: 50, y: goalY }; tx = W.ball.x + (g.x - W.ball.x) * 0.1; ty = W.ball.y + (g.y - W.ball.y) * 0.1; }
    else { tx = 50 + side * (GOAL_HALF + 1 + R() * 6); ty = att === 0 ? 100.8 : -0.8; h = R() < 0.4 ? 2.6 : 0.8; } // wide or over
    const d = metres(W.ball, { x: tx, y: ty });
    const fly = clamp(d / (head ? 14 : SPEED.shot), 0.25, 1.3);
    if (shooter && body(shooter)) setState(body(shooter), head ? 'jump' : 'kick', 0.35);
    ctl.holder = null;
    kick(W.ball, { x: tx, y: ty }, fly, 'shot', h, () => {
      if (outcome === 'goal') { hooks.cue({ kind: 'net' }); W.ball.state = 'dead'; W.ball.vx = W.ball.vy = 0; }
      else if (outcome === 'save') { hooks.cue({ kind: 'save' }); const rb = S.F[k + 2]?.b || { x: tx + side * 6, y: att === 0 ? 92 : 8 }; if (e.kind === 'hold') { gk && claim(gk); } else kick(W.ball, rb, 0.5, 'air', 1.2); }
      else if (outcome === 'post') { hooks.cue({ kind: 'post' }); const rb = S.F[k + 2]?.b || { x: 50, y: att === 0 ? 90 : 10 }; kick(W.ball, rb, 0.6, 'air', 1.0); }
      else if (outcome === 'block') { hooks.cue({ kind: 'block' }); const rb = S.F[k + 2]?.b || W.ball; kick(W.ball, rb, 0.5, 'ground'); }
      else W.ball.state = 'dead';
    });
    // the keeper reads the shot: moves along the line towards it and dives when it is close
    if (gk && body(gk) && outcome !== 'wall' && outcome !== 'block') {
      const g = body(gk), reach = outcome === 'goal' ? 0.55 : 1;
      ctl.receiver = { side: gk[0], i: gk[1], at: { x: lerp(g.x, clamp(tx, 50 - GOAL_HALF, 50 + GOAL_HALF), reach), y: att === 0 ? 98.6 : 1.4 } };
      setTimeout0(() => body(gk) && setState(body(gk), Math.abs(tx - g.x) > 1.6 ? (tx > g.x ? 'diveR' : 'diveL') : 'set', 0.9), fly * 0.45);
    }
    if (outcome === 'goal') {
      const scorer = id2(direct ? e.p : S.E[k + 1].p) || shooter;
      setTimeout0(() => {
        hooks.goal(direct ? k : k + 1);
        const flagX = (scorer && body(scorer) ? body(scorer).x : 50) < 50 ? 4 : 96;
        ctl.celebrate = scorer ? { side: scorer[0], i: scorer[1], flag: { x: flagX, y: att === 0 ? 96 : 4 } } : null;
        ctl.set = null; ctl.receiver = null; retarget();
      }, fly + 0.15);
      return fly + 5.2;
    }
    if (!direct && OUTCOME.has(outcome)) setTimeout0(() => hooks.event(k + 1), fly);
    return fly + (outcome === 'save' || outcome === 'post' ? 0.9 : 0.7);
  }

  // ── per physics step ──
  function step(dt) {
    if (!beats.length) return;
    bt += dt; tick += dt;
    for (let n = timers.length - 1; n >= 0; n--) if (timers[n].at <= bt) { const t = timers.splice(n, 1)[0]; t.fn(); }
    if (ctl.claim) {
      const b = body(ctl.claim);
      if (!b) ctl.claim = null;
      else if (W.ball.state !== 'flight' && metres(b, W.ball) < 1.4) { giveBall(W.ball, ctl.claim); ctl.holder = ctl.claim; ctl.claim = null; ctl.receiver = null; }
      else if (W.ball.state !== 'flight') { b.tx = W.ball.x; b.ty = W.ball.y; b.mode = 'sprint'; }
    }
    // the holder drives the ball where the engine says he goes
    if (ctl.carryTo && ctl.holder && W.ball.owner && W.ball.owner[0] === ctl.holder[0] && W.ball.owner[1] === ctl.holder[1]) {
      const b = body(ctl.holder); if (b) { b.tx = ctl.carryTo.x; b.ty = ctl.carryTo.y; b.mode = 'run'; }
    }
    if (tick >= 0.2) { tick = 0; retarget(); }
    if (bt >= beatDur) { ctl.carryTo = null; timers.length = 0; next(); }
  }

  function retarget() {
    if (!ctl) return;
    const k = W.k;
    if (W.ball.owner) ctl.holder = W.ball.owner;
    updateTargets(W, ctl);
    // keep the engine's own positions in the mix for everybody without a job in the action
    if (ctl.set || ctl.celebrate) return;
    const f0 = S.F[k], f1 = S.F[k + 1] || f0, u = clamp(bt / Math.max(0.01, beatDur), 0, 1);
    const busy = new Set([ctl.holder, ctl.presser, ctl.receiver && [ctl.receiver.side, ctl.receiver.i], ctl.runner].filter(Boolean).map((x) => x[0] + ':' + x[1]));
    for (let s = 0; s < 2; s++) W.bodies[s].forEach((b, i) => {
      if (!b || busy.has(s + ':' + i)) return;
      const p = f0.p[s][i], q = f1.p[s][i] || p;
      if (!p || W.lineup[s][i].mevki === 'GK') return;
      b.tx = lerp(b.tx, lerp(p.x, q.x, u), ENGINE_BLEND); b.ty = lerp(b.ty, lerp(p.y, q.y, u), ENGINE_BLEND);
    });
  }

  return { play, step, get active() { return beats.length > 0; }, get ctl() { return ctl; } };
}
export { MX, MY };
