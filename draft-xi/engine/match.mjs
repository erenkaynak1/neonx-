// Draft XI v2 engine: headless match simulation (prototype v0).
// Implements the design doc (docs/draft-xi-v2-tasarim.md) at prototype depth:
// atak-atak flow, zone + coordinate pitch, template positioning with speed-limited movement,
// contest maths from the contest table (14.6), tactic point/frequency effects (16.2), offside geometry,
// fouls/cards, set pieces, second balls, deterministic seeded RNG and an event log as the only output.
import { makeRng, prob, bForBase, combineTactics, weighted, hash, pickWeighted } from './core.mjs';
import { FORMATIONS, zonePoint, PITCH_W, PITCH_L, COL_W, ROW_L } from './formations.mjs';

export const ENGINE_VERSION = '0.5.0';

// k: milli-logit per attribute point (14.1)
const K = { duel: 85, air: 110, short: 54, long: 43, shot: 72, cross: 43 };   // 0.5: shot 85 → 72: finishing still decides, but less steeply (a modest finisher's chance is not near zero)
// tactic point effects are converted with the duel k
const PT = 85;

// Reference difficulties (milli-logit). "Fixed" opponents are attribute 50/60/70 ×10.
const REF = {
  shortFixed: 500, shortB: bForBase(8800), // 50 → 88 % (0.5: team pass accuracy ~77 % → ~82 %)
  longFixed: 600, longB: bForBase(4000), // 60 → 40 % (0.4: direct play was over-rewarded)
  crossFixed: 800, crossB: bForBase(3000),
  shotFixed: 850, shotInB: bForBase(3200), shotOutB: bForBase(3000), headB: bForBase(2600),
  // 0.4: conversion ×0.8 → equal teams, both balanced: ~3 goals a match (user target; open games 5–6, defensive 1–2)
  // 0.5: ×1.1 with the flatter finishing slope (K.shot 72)
  goalB: bForBase(2720), goalHeadB: bForBase(2110), goalOneB: bForBase(3450), goalOutB: bForBase(2500),
  penB: bForBase(7600), interceptB: bForBase(3800), blockB: bForBase(2000), crossBlockB: bForBase(2500),
  fkWallB: bForBase(2200), fkOnB: bForBase(3000), fkGoalB: bForBase(1760),
};

const DEFAULT_TACTIC = { direction: 'balanced', passing: 'mixed', finishing: 'mixed', tempo: 'balanced', onWin: 'settled',
  line: 'mid', press: 'mid', closed: 'balanced', tackling: 'normal', creativity: 'balanced' };

// Attack direction: left (-1) / right (+1) / both wings ('wings') / balanced or centre (0). `onDirSide(T, xFromCentre)`
// tells whether a lateral position lies in the chosen corridor(s).
const CRE_PASS_B = 380, CRE_SAFE_B = 250, CRE_SHAPE_B = 350; // 0.5: free play's passes 250 → 380 (riskier) // creativity: pass difficulty / defensive shape (milli-logit)
const dirOf = (T) => (T.direction === 'left' ? -1 : T.direction === 'right' ? 1 : T.direction === 'wings' ? 'wings' : T.direction === 'centre' ? 'centre' : 0);
const onDirSide = (dir, dx) => (dir === 'wings' ? dx !== 0 : dir === 'centre' ? false : !!dir && Math.sign(dx) === dir);

const W = {
  carrier: { dri: 60, pac: 30, str: 10 },
  tackler: { tac: 50, mar: 25, pac: 25 },
  control: { ft: 70, str: 20, dri: 10 },
  short: { sp: 80, vis: 20 },
  long: { lp: 75, vis: 25 },
  intercept: { tac: 70, vis: 20, mar: 10 },
  runner: { pac: 60, posn: 40 },
  chaser: { pac: 60, mar: 40 },
  cross: { cro: 85, vis: 15 },
  crossBlock: { mar: 60, pac: 40 },
  air: { hed: 70, str: 30 },
  airAtk: { hed: 60, str: 25, posn: 15 },
  shotIn: { fin: 80, ft: 20 },
  shotOut: { lon: 100 },
  head: { hed: 70, fin: 30 },
  fk: { lon: 70, cro: 30 },
  pen: { fin: 100 },
  gkNear: { ref: 70, gpos: 30 }, gkFar: { gpos: 60, ref: 40 }, gkHead: { ghd: 50, gpos: 30, ref: 20 }, gkOne: { one: 70, ref: 30 },
  gkPen: { one: 60, ref: 40 }, gkRush: { one: 70, gpos: 30 },
  block: { mar: 100 },
  reading: { mar: 60, posn: 40 },
};

function isqrt(n) { if (n <= 0) return 0; let x = n, y = (x + 1) >> 1; while (y < x) { x = y; y = (x + Math.trunc(n / x)) >> 1; } return x; }
const dist = (a, b) => isqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** distance from point p to segment a→b (decimetres) */
function segDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y; const L2 = dx * dx + dy * dy;
  if (!L2) return dist(p, a);
  let t = Math.trunc((((p.x - a.x) * dx + (p.y - a.y) * dy) * 1000) / L2); t = clamp(t, 0, 1000);
  return dist(p, { x: a.x + Math.trunc((dx * t) / 1000), y: a.y + Math.trunc((dy * t) / 1000) });
}

/** Chemistry (design doc 7): nearest 4 by template position, best 3 links, cap 10. */
function chemistry(team) {
  const out = team.players.map(() => 0);
  team.players.forEach((p, i) => {
    const near = team.players.map((q, j) => ({ j, d: j === i ? 1e9 : dist(p.homeDef, q.homeDef) })).sort((a, b) => a.d - b.d).slice(0, 4);
    const links = near.map(({ j }) => {
      const a = p.player, b = team.players[j].player;
      let s = 0;
      if (a.nation === b.nation) s += 3;
      if (a.club === b.club) s += 3;
      if (a.league === b.league) s += 2;
      const af = a.former || [], bf = b.former || [];
      if (af.some(c => bf.includes(c)) || af.includes(b.club) || bf.includes(a.club)) s += 2;
      return Math.min(10, s);
    }).sort((x, y) => y - x).slice(0, 3);
    out[i] = Math.min(10, links.reduce((s, v) => s + v, 0));
  });
  return out;
}

function buildTeam(side, squad, tactic) {
  const tpl = FORMATIONS[squad.formation];
  if (!tpl) throw new Error('unknown formation ' + squad.formation);
  const players = tpl.map(([slot, label, mevki, zPoss, zDef]) => {
    const player = squad.players[slot];
    if (!player) throw new Error(`slot ${slot} empty in ${squad.name}`);
    return { slot, label, mevki, player, homePoss: zonePoint(zPoss), homeDef: zonePoint(zDef), cur: null, off: false, yellow: 0 };
  });
  const team = { side, name: squad.name, formation: squad.formation, tactic: { ...DEFAULT_TACTIC, ...(tactic || {}) }, players };
  const chem = chemistry(team);
  players.forEach((p, i) => {
    p.chem = chem[i];
    const boost = 1000 + chem[i] * 8; // +0.8 % per chemistry point
    p.a = {}; for (const [k, v] of Object.entries(p.player.attrs)) p.a[k] = Math.round((v * boost) / 100) / 10; // keep one decimal
  });
  return team;
}

/** team-relative ↔ absolute coordinates. Side 0 attacks towards y = PITCH_L. */
const toAbs = (side, p) => (side === 0 ? { x: p.x, y: p.y } : { x: PITCH_W - p.x, y: PITCH_L - p.y });
const toRel = toAbs; // the mirror is its own inverse

export function simulateMatch({ home, away, seed = 1, tacticHome, tacticAway, log: wantLog = true, frames: wantFrames = false }) {
  const rng = makeRng(seed);
  const teams = [buildTeam(0, home, tacticHome), buildTeam(1, away, tacticAway)];
  const events = [];
  // optional playback frames for the 2D pitch: every logged event also stores where the ball and all players are.
  // Frames never touch the random stream or the event log, so results and digests stay identical.
  const frames = [];
  const stats = teams.map(() => ({ goals: 0, shots: 0, onTarget: 0, xg: 0, passes: 0, passesOk: 0, longPasses: 0, longOk: 0, crosses: 0, crossesOk: 0,
    dribbles: 0, dribblesOk: 0, throughs: 0, throughsOk: 0, offsides: 0, fouls: 0, yellows: 0, reds: 0, corners: 0, possession: 0, headerGoals: 0,
    aerials: 0, aerialsWon: 0, presses: 0, pressWins: 0, freeKickGoals: 0, penalties: 0, attacks: 0, rightCorridorAttacks: 0, leftCorridorAttacks: 0 }));
  // match ratings (16.14): hundredths, start 6.00
  teams.forEach(tm => tm.players.forEach(p => { p.rating = 600; }));
  const rate = (pl, d) => { if (pl) pl.rating += d; };
  const duel = (winner, loser, pWinner) => { const d = Math.trunc((10000 - pWinner) / 1000); rate(winner, d); rate(loser, -d); };
  let t = 0; // deciseconds
  const END = 54000, HALF = 27000;
  let half = 1;
  const st = { poss: 0, holder: null, ball: { x: PITCH_W >> 1, y: PITCH_L >> 1 }, lastDt: 30, counter: 0, chain: 0, beaten: null };

  const log = (type, team, pl, extra = {}) => {
    if (!wantLog) return;
    events.push({ ...extra, t, type, team, p: pl ? pl.player.id : null }); // core fields cannot be overwritten
    if (wantFrames) frames.push({ t, b: [st.ball.x, st.ball.y], p: teams.map(tm => tm.players.map(q => (q.off || !q.cur ? null : [q.cur.x, q.cur.y]))) });
  };
  const active = side => teams[side].players.filter(p => !p.off);
  const tac = side => teams[side].tactic;
  const opp = side => 1 - side;
  const rel = (side, abs) => toRel(side, abs);

  // ---------- positioning (4.5, 15.2, 16.5) ----------
  function layout() {
    for (const team of teams) {
      const s = team.side, has = st.poss === s, T = team.tactic;
      const ballRel = rel(s, st.ball);
      const wingBall = ballRel.x < COL_W || ballRel.x > PITCH_W - COL_W;
      const dirSide = dirOf(T);
      for (const p of team.players) {
        if (p.off) continue;
        const base = { ...(has ? p.homePoss : p.homeDef) };
        if (p.mevki !== 'GK') {
          if (has) {
            if (ballRel.y < PITCH_L / 2) { base.y -= ROW_L; if (p.mevki === 'ST') base.y = Math.max(base.y, 4 * ROW_L); }
            else if (ballRel.y > 4 * ROW_L && ['CM', 'DM', 'AM', 'LB', 'RB', 'LWB', 'RWB'].includes(p.mevki)) base.y += ROW_L >> 1;
            if (dirSide && onDirSide(dirSide, Math.sign(base.x - PITCH_W / 2)) && ['LB', 'RB', 'LWB', 'RWB', 'CM', 'LM', 'RM'].includes(p.mevki)) base.y += ROW_L >> 1;
            if (dirSide === 'centre' && ['CM', 'AM'].includes(p.mevki)) base.y += ROW_L >> 1;  // centre: midfielders step up into the middle
            if (T.tempo === 'fast' && ['ST', 'LW', 'RW'].includes(p.mevki)) base.y = Math.max(base.y, 5 * ROW_L + 40);
          } else {
            // 0.4: a low block drops 10 m (was 17.5 m: it defended for free), a high line steps up 17.5 m
            if (T.line === 'low') base.y -= 100; else if (T.line === 'high') base.y += ROW_L;
            // lateral shift towards the ball (4.5.2)
            const dx = ballRel.x - PITCH_W / 2; const dirB = Math.sign(dx);
            let f = 50; // percent of a column
            if (T.closed === 'wings') f = wingBall && Math.sign(base.x - PITCH_W / 2) === dirB ? 100 : 50;
            else if (T.closed === 'centre') f = (base.x > COL_W && base.x < PITCH_W - COL_W) ? 0 : -50;
            if (Math.abs(dx) > COL_W / 2) base.x += Math.trunc((dirB * COL_W * f) / 100);
          }
        } else if (!has && T.line === 'high') base.y += 50;
        // pull towards the ball (16.5)
        const d = dist(base, ballRel);
        const pull = d < 150 ? 30 : d < 300 ? 10 : 0;
        if (pull) { base.x += Math.trunc(((ballRel.x - base.x) * pull) / 100); base.y += Math.trunc(((ballRel.y - base.y) * pull) / 100); }
        base.x = clamp(base.x, 10, PITCH_W - 10); base.y = clamp(base.y, 10, PITCH_L - 10);
        const target = toAbs(s, base);
        if (!p.cur) { p.cur = target; continue; }
        // speed-limited movement: 6–9.5 m/s from Hız (16.5 / 4.5.10)
        const speed = 60 + Math.trunc((35 * p.a.pac) / 99); // dm per second
        const maxStep = Math.trunc((speed * st.lastDt) / 10);
        const dd = dist(p.cur, target);
        if (dd <= maxStep) p.cur = target;
        else p.cur = { x: p.cur.x + Math.trunc(((target.x - p.cur.x) * maxStep) / dd), y: p.cur.y + Math.trunc(((target.y - p.cur.y) * maxStep) / dd) };
      }
    }
    // marking: defenders step goal-side of the most threatening nearby attacker (4.5.10 / 16.5)
    const ds = opp(st.poss);
    for (const d of active(ds)) {
      if (d.mevki === 'GK' || d === st.beaten) continue;
      const cands = active(st.poss).filter(a => a !== st.holder && dist(a.cur, d.cur) < 120).map(a => {
        const ar = rel(st.poss, a.cur); const goalProx = ar.y > 5 * ROW_L ? 100 : ar.y > PITCH_L / 2 ? 60 : 30;
        const marked = active(ds).some(o => o !== d && dist(o.cur, a.cur) < 25);
        return { a, threat: goalProx * (marked ? 50 : 100) };
      }).sort((x, y) => y.threat - x.threat);
      if (!cands.length) continue;
      const read = weighted(d.a, W.reading); // 50 → 70 %, 90 → 95 %
      const pCorrect = clamp(7000 + Math.trunc(((read - 500) * 2500) / 400), 3000, 9800);
      const pick = cands.length > 1 && rng.roll() >= pCorrect ? cands[1] : cands[0];
      const goal = toAbs(ds, { x: PITCH_W >> 1, y: 0 });
      const gx = pick.a.cur.x + Math.trunc((goal.x - pick.a.cur.x) * 15 / Math.max(1, dist(pick.a.cur, goal)));
      const gy = pick.a.cur.y + Math.trunc((goal.y - pick.a.cur.y) * 15 / Math.max(1, dist(pick.a.cur, goal)));
      d.cur = { x: Math.trunc((d.cur.x + gx) / 2), y: Math.trunc((d.cur.y + gy) / 2) };
    }
  }

  // ---------- helpers ----------
  const nearest = (side, pt, exclude) => { let best = null, bd = 1e9; for (const p of active(side)) { if (p === exclude || p.mevki === 'GK') continue; const d = dist(p.cur, pt); if (d < bd) { bd = d; best = p; } } return [best, bd]; };
  const keeper = side => active(side).find(p => p.mevki === 'GK') || active(side)[0];
  const zoneOf = (side, pt) => { const r = rel(side, pt); return { col: clamp(Math.trunc(r.x / COL_W), 0, 4), row: clamp(Math.trunc(r.y / ROW_L) + 1, 1, 6), r }; };
  const goalPt = side => toAbs(side, { x: PITCH_W >> 1, y: PITCH_L }); // goal side attacks
  const tacticPts = list => combineTactics(list);
  const weakFoot = pl => (pl.player.weakFoot < 5 && rng.int(4) === 0 ? (5 - pl.player.weakFoot) * 50 : 0); // ×10 units
  const durOf = (lo, hi, frac, side) => { const T = tac(side); const m = T.tempo === 'fast' ? 80 : T.tempo === 'patient' ? 125 : 100; return Math.trunc(((lo + Math.trunc(((hi - lo) * clamp(frac, 0, 100)) / 100)) * m) / 100); };
  // line height in possession (0.4): in the opponent half a deep team has fewer players in support (harder passes,
  // through balls easier to read), a high line keeps the team compact; without this the line was a free choice
  const supportB = (side, pt) => { const T = tac(side); if (rel(side, pt).y < PITCH_L / 2) return 0; return T.line === 'low' ? 400 : T.line === 'high' ? -220 : 0; };   // 0.5: a high line's support −400 → −220 (with short passing it carried tiki-taka)
  function advance(dt) { st.lastDt = dt; t += dt; stats[st.poss].possession += dt; }

  function setPoss(side, holder, pt, how) {
    if (side !== st.poss) {
      st.counter = tac(side).onWin === 'counter' ? (tac(opp(side)).line === 'high' ? 3 : 2) : 0; // 0.4: two counter actions (was three); 0.5: three against a high line (space behind)
      // creativity cost / benefit on the turnover: a free-playing team is caught out of shape more often (a counter even
      // for a settled opponent, 1 in 3); a disciplined team is already back in shape (opponent's counter is shorter)
      const loser = st.poss >= 0 ? tac(st.poss).creativity : 'balanced';
      if (loser === 'high' && st.counter === 0 && rng.int(3) === 0) st.counter = 3;
      if (loser === 'low' && st.counter > 0) st.counter = 1;
      st.chain = 0; stats[side].attacks++;
    }
    st.poss = side; st.holder = holder; if (pt) st.ball = { ...pt }; st.beaten = null;
    if (how) log('possession', side, holder, { how });
  }

  // defender-side tactic points for a contest at a given pitch point
  function defPoints(ds, pt, kind) {
    const T = tac(ds); const z = zoneOf(opp(ds), pt); const wing = z.col === 0 || z.col === 4; const list = [];
    // closed area (0.4): wing columns are 2 of 5 and see about a third of the contests, so ±15 / ±15 made closing the
    // centre a free win; wings +20 / −10 and centre +10 / −20 are even on average and still beat the matching attack
    if (T.closed === 'wings') list.push(wing ? 20 : -10); else if (T.closed === 'centre') list.push(wing ? -20 : 10);
    if (kind === 'tackle' || kind === 'press') { if (T.tackling === 'hard') list.push(15); else if (T.tackling === 'careful') list.push(-10); }
    if (kind === 'press') { if (T.press === 'high') list.push(15); else if (T.press === 'low') list.push(-15); }
    return tacticPts(list);
  }

  function foulCheck(def, atk, pt, kind, force = false) {
    const T = tac(def.side ?? opp(st.poss));
    const sert = T.tackling === 'hard' ? 200 : T.tackling === 'careful' ? 55 : 100; // foul-rate multiplier (14.5: hard ~16, careful ~7 fouls)
    const tacV = def.a.tac; const lowTac = 100 + Math.trunc((Math.max(0, 70 - tacV) * 100) / 60);
    const p = Math.trunc((1500 * sert * lowTac) / 10000);
    const z = zoneOf(st.poss, pt);
    const inOwnBox = z.row === 6 && z.col >= 1 && z.col <= 3;
    let pf = Math.trunc((p * (inOwnBox ? 15 : 100) * (kind === 'race' ? 30 : 100)) / 10000);
    if (def.yellow) pf = Math.trunc((pf * 25) / 100); // a booked player plays carefully
    if (!force && rng.roll() >= pf) return false;
    const ds = opp(st.poss); stats[ds].fouls++;
    // card (16.10)
    const others = active(ds).filter(d => d !== def && d.mevki !== 'GK' && rel(st.poss, d.cur).y > z.r.y).length;
    let card = null;
    const dogso = others === 0 && dist(pt, goalPt(st.poss)) < 300 && (kind === 'race' || (inOwnBox && kind === 'tackle'));
    // denying a clear goal chance: red; inside the box with an attempt to play the ball it is penalty + yellow (3 in 4)
    if (dogso && (!inOwnBox || rng.int(4) === 0)) card = 'red';
    else if (dogso) card = def.yellow ? 'red' : 'yellow';
    if (!card && !dogso) {
      // 0.4: a foul that stops a counter is booked 30 % of the time (was 60 %: counter teams got their opponents sent off)
      let pY = kind === 'race' ? 6000 : st.counter > 0 ? 3000 : 1500;
      pY = Math.trunc((pY * (sert === 200 ? 160 : sert === 55 ? 60 : 100)) / 100); // card multiplier (16.10)
      if (sert === 200 && tacV < 55 && rng.roll() < 200) card = 'red';
      else if (rng.roll() < pY) card = def.yellow ? 'red' : 'yellow';
    }
    if (card === 'yellow') { def.yellow = 1; stats[ds].yellows++; }
    if (card === 'red') { def.off = true; stats[ds].reds++; rate(def, -150); reorganize(ds, def); }
    log('foul', ds, def, { on: atk.player.id, card, kind, row: z.row });
    // restart
    const inBox = z.row === 6 && z.col >= 1 && z.col <= 3;
    if (inBox) { penalty(st.poss); return true; }
    freeKick(st.poss, pt);
    return true;
  }

  // red card (3.3): the most attacking player drops into the vacated position, the defence keeps its numbers
  function reorganize(side, gone) {
    const pool = active(side).filter(p => p.mevki !== 'GK');
    if (!pool.length) return;
    const top = pool.reduce((a, b) => (b.homePoss.y > a.homePoss.y ? b : a));
    if (gone.mevki === 'GK') { top.mevki = 'GK'; top.a = { ...top.a, ref: 35, gpos: 35, ghd: 35, one: 35 }; top.homePoss = gone.homePoss; top.homeDef = gone.homeDef; return; }
    if (top.homePoss.y <= gone.homePoss.y) return; // the sent-off player was already the most attacking
    top.homePoss = gone.homePoss; top.homeDef = gone.homeDef; top.mevki = gone.mevki;
    log('reshape', side, top, { into: gone.slot });
  }

  // 0.5: closed area also shuts passing lanes: in the opponent's half a pass into the area they close is harder, into the
  // area they leave open a little easier (closing the centre stops a central plan, and opens the flanks to a wing plan)
  const closedB = (side, pt) => {
    const c = tac(opp(side)).closed, r = rel(side, pt); if (r.y < PITCH_L / 2 || c === 'balanced' || !c) return 0;
    const central = Math.abs(r.x - PITCH_W / 2) <= COL_W;
    return c === 'centre' ? (central ? 320 : -120) : (central ? -120 : 320);
  };
  // defensive quality of a side: its back line and holding midfielders (tackling, marking, pace), ×10
  const defQ = (side) => {
    const v = active(side).filter(p => ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DM'].includes(p.mevki)).map(p => weighted(p.a, { tac: 50, mar: 30, pac: 20 }));
    return v.length ? Math.trunc(v.reduce((x, y) => x + y, 0) / v.length) : 850;
  };
  // ---------- shots (5.5, 14.6) ----------
  function shoot(side, shooter, type, fromPt) {
    const ds = opp(side), gk = keeper(ds); const goal = goalPt(side);
    const d = dist(fromPt, goal); const z = zoneOf(side, fromPt);
    stats[side].shots++;
    log('shot', side, shooter, { shotType: type, row: z.row, col: z.col, dm: Math.trunc(d / 10) });
    // 1) block
    if (type !== 'pen' && type !== 'one' && type !== 'head') {   // 0.5: a header is not blocked like a shot from the ground
      let blocker = null, bd = 1e9; for (const p of active(ds)) { if (p.mevki === 'GK') continue; const sd = segDist(p.cur, fromPt, goal); if (sd < 30 && sd < bd) { bd = sd; blocker = p; } }
      if (blocker) {
        const Sb = weighted(blocker.a, W.block), Ss = weighted(shooter.a, type === 'out' ? W.shotOut : W.shotIn);
        const pB = Math.trunc((prob(Sb, Ss, K.duel, REF.blockB) * (30 - bd)) / 30);
        if (rng.roll() < pB) { log('block', ds, blocker, { by: shooter.player.id }); return secondBall(side, 'block', fromPt); }
      }
    }
    // 2) accuracy
    const Wt = type === 'out' ? W.shotOut : type === 'head' ? W.head : W.shotIn;
    let S = weighted(shooter.a, Wt) - (type === 'head' ? 0 : weakFoot(shooter));
    const angle = Math.abs(rel(side, fromPt).x - PITCH_W / 2);
    const [pressDef, pd] = nearest(ds, fromPt);
    let B = (type === 'out' ? REF.shotOutB : type === 'head' ? REF.headB : REF.shotInB) + Math.max(0, d - 110) * 4 + Math.max(0, angle - 100) * 3 + (pd < 20 ? 400 : 0);
    if (type === 'one') B -= 600;
    // 0.5: a rehearsed set piece: the header is attacked with a run and a clean contact, from close in, hard for the keeper
    const spHead = type === 'head' && st.spHead; st.spHead = false;
    if (spHead) B -= 800;
    if (type === 'out' && tac(ds).line === 'low') B -= 400; // 0.4: a deep block leaves the edge of the box
    if ((type === 'in' || type === 'head') && tac(ds).line === 'low') B += 350; // 0.5: … but the box itself is packed: less time, bodies in the way
    // 0.5: accuracy against the defence in front of him, not a fixed bar: two equal teams of any level create and
    // finish chances at a similar rate (average clubs scored half as much as star teams before)
    const pOn = prob(S, REF.shotFixed + Math.trunc((defQ(ds) - 850) * 9 / 10), K.shot, B); const r = rng.roll();
    if (r >= pOn) {
      const post = r < pOn + 180;
      log(post ? 'post' : 'miss', side, shooter, { shotType: type, p: pOn, roll: r });
      if (post) return secondBall(side, 'post', fromPt);
      return goalKick(ds);
    }
    stats[side].onTarget++;
    // 3) quality = how far inside the accuracy window (0–20 points)
    const q = Math.trunc(((pOn - r) * 60) / Math.max(1, pOn)); // 0–6 points
    // 4) keeper
    const gw = type === 'head' ? W.gkHead : type === 'one' ? W.gkOne : type === 'out' ? W.gkFar : d < 110 ? W.gkNear : W.gkFar;
    const Dk = weighted(gk.a, gw);
    let Bg = (type === 'head' ? REF.goalHeadB : type === 'one' ? REF.goalOneB : type === 'out' ? REF.goalOutB : REF.goalB) + Math.max(0, d - 110) * 3 - (spHead ? 680 : 0);
    const pG = prob(S + q, Dk, K.shot, Bg);
    stats[side].xg += Math.trunc((pOn * pG) / 10000);
    const r2 = rng.roll();
    if (r2 < pG) {
      stats[side].goals++; if (type === 'head') stats[side].headerGoals++;
      // the assist only counts for a team-mate (the last passer may still be an opponent after a turnover)
      const assister = st.lastPasser && st.lastPasser !== shooter && teams[side].players.includes(st.lastPasser) ? st.lastPasser : null;
      rate(shooter, 100); if (assister) rate(assister, 60); duel(shooter, gk, pG);
      log('goal', side, shooter, { shotType: type, pOn, pG, assist: assister?.player.id ?? null });
      return kickoff(ds);
    }
    const margin = r2 - pG;
    rate(gk, 30); duel(gk, shooter, 10000 - pG);
    if (margin > 3500 || type === 'head' && margin > 2000) { log('save', ds, gk, { kind: 'hold', by: shooter.player.id }); return gkBall(ds); }
    log('save', ds, gk, { kind: 'parry', by: shooter.player.id });
    return secondBall(side, 'parry', fromPt);
  }

  function penalty(side) {
    stats[side].penalties++;
    const taker = active(side).filter(p => p.mevki !== 'GK').sort((a, b) => b.a.fin - a.a.fin)[0];
    const gk = keeper(opp(side));
    const pG = prob(weighted(taker.a, W.pen), weighted(gk.a, W.gkPen), K.duel, REF.penB);
    advance(400);
    stats[side].shots++; stats[side].onTarget++;
    if (rng.roll() < pG) { stats[side].goals++; rate(taker, 100); log('goal', side, taker, { shotType: 'pen', pG }); return kickoff(opp(side)); }
    rate(gk, 60);
    log('save', opp(side), gk, { kind: 'penalty', by: taker.player.id });
    return gkBall(opp(side));
  }

  function freeKick(side, pt) {
    advance(300);
    const r = rel(side, pt); const d = dist(pt, goalPt(side)) ; const central = r.x > COL_W && r.x < PITCH_W - COL_W;
    const taker = active(side).filter(p => p.mevki !== 'GK').sort((a, b) => b.a.lon - a.a.lon)[0];
    if (central && d >= 180 && d <= 280 && taker.a.lon >= 75) {
      const wall = d <= 220 ? 5 : 4;
      if (rng.roll() < prob(500 + wall * 20, weighted(taker.a, W.fk), K.duel, REF.fkWallB)) { log('fk_wall', side, taker); return secondBall(side, 'block', pt); }
      stats[side].shots++;
      const pOn = prob(weighted(taker.a, W.fk), REF.shotFixed, K.shot, REF.fkOnB + (d - 180) * 4);
      if (rng.roll() >= pOn) { log('miss', side, taker, { shotType: 'fk' }); return goalKick(opp(side)); }
      stats[side].onTarget++;
      const gk = keeper(opp(side));
      if (rng.roll() < prob(weighted(taker.a, W.fk), weighted(gk.a, W.gkFar), K.shot, REF.fkGoalB)) { stats[side].goals++; stats[side].freeKickGoals++; log('goal', side, taker, { shotType: 'fk' }); return kickoff(opp(side)); }
      log('save', opp(side), gk, { kind: 'fk' }); return secondBall(side, 'parry', pt);
    }
    if (r.y > 4 * ROW_L) return setPieceCross(side, taker, 'fk');
    setPoss(side, taker, pt, 'freekick');
  }

  function corner(side) {
    stats[side].corners++; advance(300);
    const T = tac(side); const myAir = avgAir(side), theirAir = avgAir(opp(side));
    const shortP = T.passing === 'short' && theirAir - myAir >= 80 ? 4000 : 1000;
    const taker = active(side).filter(p => p.mevki !== 'GK').sort((a, b) => b.a.cro - a.a.cro)[0];
    const cornerPt = toAbs(side, { x: rng.int(2) ? 10 : PITCH_W - 10, y: PITCH_L - 10 });
    st.ball = cornerPt;
    if (rng.roll() < shortP) { log('corner_short', side, taker); return setPoss(side, taker, cornerPt, 'corner'); }
    log('corner', side, taker);
    return setPieceCross(side, taker, 'corner');
  }
  const avgAir = side => { const ps = active(side).filter(p => p.mevki !== 'GK').sort((a, b) => b.a.hed - a.a.hed).slice(0, 5); return Math.trunc(ps.reduce((s, p) => s + p.a.hed * 10, 0) / ps.length); };

  // ---------- crosses & aerial duels (5.3, 4.5.9) ----------
  function boxDuel(side, crosser, spotRel, setPiece) {
    const ds = opp(side);
    const spot = toAbs(side, spotRel);
    // attackers / defenders in the box by aerial ability (4.5.9): set pieces bring the tall centre backs up
    const atkPool = active(side).filter(p => p !== crosser && p.mevki !== 'GK' && (setPiece || rel(side, p.cur).y > 4 * ROW_L));
    // 0.5: who attacks the ball is a weighted pick (heading², nearness), not always the best header: the strikers
    // still win most, but wingers, midfielders arriving and — at set pieces — the centre backs score their share
    const aw = (p) => { const near = setPiece && p.mevki === 'CB' ? 1 : Math.max(0.15, 1 - dist(p.cur, spot) / 400); return Math.trunc(p.a.hed * p.a.hed * near * (setPiece && p.mevki === 'CB' ? 1.6 : 1)); };
    const ranked = atkPool.map(p => [p, aw(p)]).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const atk = ranked.length ? ranked[pickWeighted(rng, ranked.map(x => x[1]))][0] : null;
    const defs = active(ds).filter(p => p.mevki !== 'GK').sort((a, b) => dist(a.cur, spot) - dist(b.cur, spot));
    const df = defs[0];
    if (!atk) { log('clear', ds, df); return secondBall(ds, 'clear', spot); }
    stats[side].aerials++;
    const hDiff = atk.player.height - df.player.height;
    // 0.5: numbers in the box: every defender more than attackers around the drop zone (20 m) makes the header harder
    // (a packed low block wins far more crosses; it used to concede 14 headers a match)
    const nd = defs.filter(p => dist(p.cur, spot) < 200).length, na = atkPool.filter(p => dist(p.cur, spot) < 200).length;
    const pA = prob(weighted(atk.a, W.airAtk), weighted(df.a, W.air), K.air, -hDiff * 14 + clamp(nd - na, -3, 5) * 650);
    // 0.5: the duel happens at the delivery spot: both men and the ball are there (the frame used to keep the attacker
    // wherever he was, and the 2D screen sent the corner to him — into his own half)
    st.ball = { ...spot }; atk.cur = { ...spot }; df.cur = toAbs(side, { x: rel(side, spot).x + 12, y: Math.min(PITCH_L - 15, rel(side, spot).y + 18) });
    log('aerial', side, atk, { vs: df.player.id, p: pA });
    if (rng.roll() < pA) { stats[side].aerialsWon++; duel(atk, df, pA); st.lastPasser = crosser; st.spHead = setPiece; return shoot(side, atk, 'head', { x: spot.x, y: spot.y }); }
    duel(df, atk, 10000 - pA);
    log('clear', ds, df);
    return secondBall(ds, 'clear', spot);
  }

  function setPieceCross(side, taker, kind) {
    const pAcc = prob(weighted(taker.a, W.cross), REF.crossFixed, K.cross, REF.crossB - 1100);   // 0.5: a dead-ball delivery reaches the box far more often
    if (rng.roll() >= pAcc) { log('cross_bad', side, taker, { kind }); return gkBall(opp(side)); }
    const spots = [{ x: 280, y: 990 }, { x: 340, y: 940 }, { x: 410, y: 975 }];
    return boxDuel(side, taker, spots[rng.int(3)], true);
  }

  function cross(side, crosser) {
    const ds = opp(side); stats[side].crosses++;
    const [bek, bd] = nearest(ds, crosser.cur);
    if (bek && bd < 20) {
      const pBl = prob(weighted(bek.a, W.crossBlock), weighted(crosser.a, W.cross), K.duel, REF.crossBlockB);
      if (rng.roll() < pBl) { log('cross_block', ds, bek); return rng.int(2) ? corner(side) : secondBall(side, 'block', crosser.cur); }
    }
    const press = bd < 20 ? 600 : bd < 50 ? 300 : 0;
    const crossPts = defPoints(ds, crosser.cur, 'cross');
    const S = weighted(crosser.a, W.cross) - weakFoot(crosser);
    // 0.5: an open flank gives the crosser time (half the closed-area effect), it does not make the ball land: a deep
    // line fills the box, so a cross into it is harder (crosses against the bus were 69 % accurate, 28 % otherwise)
    const packed = tac(ds).line === 'low' ? 750 : tac(ds).line === 'high' ? -150 : 0;
    const pAcc = prob(S, REF.crossFixed, K.cross, REF.crossB + press + Math.trunc(crossPts * PT / 2) + packed);
    const r = rng.roll();
    advance(durOf(30, 50, 50, side));
    if (r >= pAcc) {
      log('cross_bad', side, crosser, { p: pAcc }); const rr = rng.int(10);
      // 0.5: a corner only comes off a defender: the nearest one in the box heads / turns it behind
      if (rr < 4) { const [cl] = nearest(ds, toAbs(side, { x: 340, y: 960 })); if (cl) log('clear', ds, cl); return corner(side); }
      return rr < 7 ? gkBall(ds) : secondBall(ds, 'clear', toAbs(side, { x: 340, y: 950 }));
    }
    stats[side].crossesOk++;
    const near = rel(side, crosser.cur).x < PITCH_W / 2;
    const spots = [{ x: near ? 290 : 390, y: 990 }, { x: 340, y: 935 }, { x: near ? 400 : 280, y: 975 }];
    log('cross', side, crosser, { p: pAcc });
    return boxDuel(side, crosser, spots[rng.int(3)], false);
  }

  // ---------- restarts ----------
  function kickoff(side) {
    advance(500);
    st.ball = { x: PITCH_W >> 1, y: PITCH_L >> 1 };
    teams.forEach(tm => tm.players.forEach(p => { p.cur = null; }));
    st.lastPasser = null;
    const taker = active(side).filter(p => ['CM', 'DM', 'AM'].includes(p.mevki))[0] || active(side).filter(p => p.mevki !== 'GK')[0];
    st.lastDt = 0; setPoss(side, taker, st.ball, 'kickoff');
  }
  function gkBall(side) { const gk = keeper(side); advance(80); setPoss(side, gk, gk.cur || toAbs(side, { x: 340, y: 80 }), 'keeper'); }
  function goalKick(side) {
    advance(250);
    const gk = keeper(side); st.ball = toAbs(side, { x: 340, y: 55 });
    const T = tac(side), oT = tac(opp(side));
    const goLong = T.passing === 'long' || (T.passing !== 'short' && oT.press === 'high');
    if (!goLong) return setPoss(side, gk, st.ball, 'goalkick_short');
    const outfield = active(side).filter(p => p.mevki !== 'GK');
    const target = outfield.filter(p => p.mevki === 'ST' || p.mevki === 'LW' || p.mevki === 'RW')[0] || outfield.reduce((a, b) => (b.homePoss.y > a.homePoss.y ? b : a));
    layout();
    const [df] = nearest(opp(side), target.cur);
    const pA = prob(weighted(target.a, W.air), weighted(df.a, W.air), K.air, -(target.player.height - df.player.height) * 14);
    stats[side].aerials++;
    if (rng.roll() < pA) { stats[side].aerialsWon++; return setPoss(side, target, target.cur, 'goalkick_long'); }
    return secondBall(opp(side), 'clear', target.cur);
  }

  function secondBall(lastSide, kind, pt) {
    // landing distribution (16.8)
    const atkSide = kind === 'clear' ? opp(lastSide) : lastSide; // side that attacked
    const r = rng.roll(); let landRel;
    if (kind === 'parry') { if (r < 2500) { advance(60); return corner(atkSide); } landRel = r < 8500 ? { x: rng.int(2) ? 200 : 480, y: 960 } : { x: 340, y: 820 }; }
    else if (kind === 'block') { if (r < 3000) { advance(60); return corner(atkSide); } landRel = r < 7000 ? { ...rel(atkSide, pt), y: rel(atkSide, pt).y - 40 } : { x: rel(atkSide, pt).x + (rng.int(2) ? 140 : -140), y: rel(atkSide, pt).y - 20 }; }
    else if (kind === 'post') landRel = { x: 340 + (rng.int(2) ? 80 : -80), y: 960 };
    else { // headed clearance: better headers clear further
      const dfAir = 700; landRel = { x: 120 + rng.int(440), y: 820 - Math.trunc((dfAir - 600) / 2) - rng.int(150) };
    }
    landRel.x = clamp(landRel.x, 10, PITCH_W - 10); landRel.y = clamp(landRel.y, 10, PITCH_L - 10);
    const land = toAbs(atkSide, landRel);
    st.ball = land; advance(30); layout();
    const [a, da] = nearest(atkSide, land); const [d, dd] = nearest(opp(atkSide), land);
    const pA = prob(weighted(a.a, W.runner), weighted(d.a, W.chaser), K.duel, (da - dd) * 15);
    if (rng.roll() < pA) { log('second_ball', atkSide, a); return setPoss(atkSide, a, land, 'second'); }
    log('second_ball', opp(atkSide), d); return setPoss(opp(atkSide), d, land, 'second');
  }

  // ---------- open-play actions ----------
  function chooseAction(side, h) {
    const z = zoneOf(side, h.cur); const T = tac(side);
    const wing = z.col === 0 || z.col === 4; const box = z.row === 6 && !wing;
    let opts; // [name, base weight]
    if (z.row <= 3) opts = [['short', 70], ['long', 14], ['carry', 13], ['dribble', 3]];   // 0.5: more passing, fewer take-ons (passes ~330 → real ~450 a team)
    else if (z.row === 4) opts = [['short', 68], ['long', 5], ['through', 4], ['carry', 15], ['dribble', 4], ['shotOut', 4]];
    // 0.5: through on goal around the penalty spot (a run stops there now): he shoots rather than walking it in
    else if (box) opts = dist(h.cur, goalPt(side)) < 130 ? [['shotIn', 10], ['short', 75], ['dribble', 12]] : [['shotIn', 7], ['short', 79], ['dribble', 12]];   // 0.5: shot weights ×0.75 (shots were ~14.5 a team, real ~12.5)
    else if (wing) opts = [['short', 52], ['dribble', 9], ['cross', 32], [z.row === 6 ? 'shotIn' : 'shotOut', z.row === 6 ? 15 : 10]];   // 0.5: wide men cut in and shoot; fewer automatic crosses
    // 0.5: the edge of the box: shots from distance are a real share of football (~35 % of shots), through balls rarer
    else opts = [['short', 64], ['dribble', 7], ['shotOut', 40], ['through', 9]];
    if (h.mevki === 'GK') opts = [['short', 70], ['long', 30]];
    // 0.4.1: nobody shoots from more than 30 m (long shots came from 35–53 m); the carrier drives on instead
    if (dist(h.cur, goalPt(side)) > 300) opts = opts.map(([n, w]) => (n === 'shotOut' ? ['carry', w] : [n, w]));
    // frequency effects (0.4) combine like point effects (14.4): the strongest boost counts in full, the next at half,
    // then a quarter …, capped at ×3; reducing factors multiply. (Fast tempo + through-ball finishing + a counter used to
    // multiply the through ball by ×8.) Short passing: ×2 in build-up, ×1.2 in the final third (it crowded out shots).
    const F = { short: [], long: [], cross: [], through: [], shotOut: [], dribble: [], carry: [], shotIn: [] };
    if (T.passing === 'short') F.short.push(z.row >= 5 ? 1.2 : 2); else if (T.passing === 'long') F.long.push(2);
    if (T.finishing === 'cross') F.cross.push(2); else if (T.finishing === 'through') F.through.push(2);
    else if (T.finishing === 'long') F.shotOut.push(2); else if (T.finishing === 'dribble') F.dribble.push(2);
    if (T.tempo === 'fast') { F.through.push(2); F.carry.push(2); }
    if (T.creativity === 'high') { F.through.push(1.6); F.dribble.push(1.6); F.shotOut.push(1.4); F.short.push(0.85); }
    else if (T.creativity === 'low') { F.through.push(0.6); F.dribble.push(0.6); F.shotOut.push(0.7); F.short.push(1.25); }
    if (st.counter > 0) { F.through.push(1.5); F.long.push(1.5); F.carry.push(1.5); }
    const mult = {};
    for (const [n, fs] of Object.entries(F)) {
      const up = fs.filter((f) => f > 1).sort((x, y) => y - x); let m = 1, w = 1;
      for (const f of up) { m += (f - 1) * w; w *= 0.5; }
      mult[n] = Math.min(3, m) * fs.filter((f) => f < 1).reduce((x, f) => x * f, 1);
    }
    const [, presD] = nearest(opp(side), h.cur), pres = presD <= 25 ? 'yakin' : presD >= 80 ? 'serbest' : 'orta';
    const abil = { short: h.a.sp, long: h.a.lp, cross: h.a.cro, through: h.a.vis, shotOut: h.a.lon, shotIn: h.a.fin, dribble: h.a.dri, carry: h.a.pac };
    // inverted winger: cuts inside to shoot (2.5)
    const inverted = (h.player.foot === 'L' && rel(side, h.cur).x > PITCH_W / 2) || (h.player.foot === 'R' && rel(side, h.cur).x < PITCH_W / 2);
    const weights = opts.map(([n, w]) => {
      let v = Math.trunc((w * Math.round(100 * mult[n]) * 70) / 100) + Math.trunc((w * abil[n] * 100 * 30) / (70 * 100));
      if (wing && inverted && (n === 'shotOut' || n === 'shotIn' || n === 'through')) v = Math.trunc(v * 13 / 10);
      if (wing && inverted && n === 'cross') v = Math.trunc(v * 8 / 10);
      if (wing && !inverted && n === 'cross') v = Math.trunc(v * 12 / 10);
      // Patch 1 — pressure on the ball: a man closed down (≤ 2.5 m) cannot run with it or set himself for a shot, he
      // plays it or takes his man on; a man with time (≥ 8 m free) carries into the space and shoots from distance
      if (pres === 'yakin') v = Math.trunc(v * ({ carry: 0.55, shotOut: 0.7, shotIn: 0.85, dribble: 1.3, through: 1.1 }[n] ?? 1));
      else if (pres === 'serbest') v = Math.trunc(v * ({ carry: 1.3, shotOut: 1.15, through: 1.15, dribble: 0.7 }[n] ?? 1));
      return v;
    });
    return opts[pickWeighted(rng, weights)][0];
  }

  function passTargets(side, h, kind) {
    const T = tac(side); const hr = rel(side, h.cur);
    const dirSide = dirOf(T);
    const cre = T.creativity === 'high' ? 1 : T.creativity === 'low' ? -1 : 0;
    const out = [];
    for (const m of active(side)) {
      if (m === h) continue;
      const d = dist(m.cur, h.cur); const mr = rel(side, m.cur);
      if (kind === 'short' && (d < 40 || d > 280)) continue;
      if (kind === 'long' && (d < 250 || d > 550)) continue;
      // Patch 1 — passing lane: an opponent standing on the line of the pass makes that option much less attractive
      // (the choice ignored lanes before; only the outcome did — so blocked passes were chosen and cut out)
      let lane = 1e9; for (const o of active(opp(side))) if (o.mevki !== 'GK') lane = Math.min(lane, segDist(o.cur, h.cur, m.cur));
      const laneF = lane < 15 ? 0.4 : lane < 30 ? 0.7 : lane < 50 ? 0.9 : 1;
      if (m.mevki === 'GK' && hr.y > PITCH_L / 2) continue;
      const [, od] = nearest(opp(side), m.cur);
      const open = clamp(od, 0, 100);
      let fwd = mr.y - hr.y; fwd = T.tempo === 'patient' ? Math.trunc(fwd / 2) : T.tempo === 'fast' ? fwd * 2 : fwd;
      // creativity: free play values forward runs over free space (riskier passes), disciplined play the opposite
      const openW = cre > 0 ? 2 : cre < 0 ? 4 : 3;
      const fwdW = cre > 0 ? Math.trunc(fwd * 3 / 2) : cre < 0 ? Math.trunc(fwd / 2) : fwd;
      let w = 100 + open * openW + clamp(fwdW, -150, 300);
      if (dirSide && onDirSide(dirSide, Math.sign(mr.x - PITCH_W / 2)) && Math.abs(mr.x - PITCH_W / 2) > COL_W / 2) w = Math.trunc(w * (Math.abs(mr.x - PITCH_W / 2) > COL_W * 3 / 2 ? 55 : 30) / 10);   // 0.5: the touchline lanes most of all
      if (dirSide === 'centre' && Math.abs(mr.x - PITCH_W / 2) <= COL_W) w *= 2;  // centre: the middle corridor
      // vision: better passers favour open, forward options (4.2)
      w = Math.trunc((w * (50 + h.a.vis)) / 100) + (open > 40 ? Math.trunc(h.a.vis) : 0);
      // a plan that asks for a corridor still plays into it when the lane is tight (the lane does not count there)
      const istenen = dirSide && dirSide !== 'centre' && onDirSide(dirSide, Math.sign(mr.x - PITCH_W / 2)) && Math.abs(mr.x - PITCH_W / 2) > COL_W / 2;
      // … and a wings plan commits fewer men centrally, so its central lanes are more crowded (lane counts twice)
      out.push([m, Math.max(5, Math.trunc(w * (istenen ? 1 : dirSide === 'wings' ? laneF * laneF : laneF)))]);
    }
    return out;
  }

  function interceptRun(side, passer, from, to, S, kindName) {
    const ds = opp(side);
    const cands = active(ds).filter(p => p.mevki !== 'GK').map(p => ({ p, d: segDist(p.cur, from, to) })).filter(o => o.d < 100).sort((a, b) => a.d - b.d).slice(0, 2);
    for (const { p, d } of cands) {
      const pts = defPoints(ds, p.cur, 'intercept');
      // a disciplined team keeps its shape without the ball: passing lanes are better covered
      const shape = tac(ds).creativity === 'low' ? CRE_SHAPE_B : 0;
      const pI = Math.trunc((prob(weighted(p.a, W.intercept), S, K.duel, REF.interceptB - pts * PT - shape - supportB(side, to) - (kindName === 'through' ? 300 : 0) /* 0.4: through balls are easier to read */) * (100 - d)) / 100);
      if (rng.roll() < pI) { duel(p, passer, pI); log('intercept', ds, p, { from: passer.player.id, kind: kindName }); return p; }
    }
    return null;
  }

  function control(side, receiver) {
    const ds = opp(side); const [d, dd] = nearest(ds, receiver.cur);
    if (!d || dd > 30) return true;
    const pts = defPoints(ds, receiver.cur, 'press');
    const pC = prob(weighted(receiver.a, W.control), weighted(d.a, W.tackler), K.duel, pts * PT);
    if (rng.roll() < pC) { duel(receiver, d, pC); if (foulCheck(d, receiver, receiver.cur, 'press')) return 'foul'; return true; }
    duel(d, receiver, 10000 - pC);
    log('lost_control', side, receiver, { by: d.player.id });
    setPoss(ds, d, receiver.cur, 'won');
    return false;
  }

  function pass(side, h, kind) {
    const cands = passTargets(side, h, kind);
    if (!cands.length) return dribbleOrCarry(side, h, 'carry');
    const m = cands[pickWeighted(rng, cands.map(c => c[1]))][0];
    const d = dist(m.cur, h.cur);
    const S = weighted(h.a, kind === 'long' ? W.long : W.short);
    // crowded receiving zone: each opponent within 8 m of the target makes the pass harder (situation → B, not D)
    const crowd = active(opp(side)).filter(o => o.mevki !== 'GK' && dist(o.cur, m.cur) < 80).length;
    const B = (kind === 'long' ? REF.longB + Math.max(0, d - 300) * 2 : REF.shortB + Math.max(0, d - 100) * 3) + crowd * 260 + supportB(side, m.cur)
      // 0.5: in the opponent's half a pass is played against their defence's quality, not a fixed bar
      + (rel(side, m.cur).y > PITCH_L / 2 ? Math.trunc((defQ(opp(side)) - 850) * (kind === 'long' ? 4 : 6) / 10 * (kind === 'long' ? K.long : K.short) / 10) : 0)
      + closedB(side, m.cur) - (st.counter > 0 ? 250 : 0)   // 0.5: a counter runs into a defence out of shape
      + (rel(side, m.cur).y >= 5 * ROW_L ? 200 : 0);   // 0.5: the last 30 m are the most crowded part of the pitch
    // creativity: free play forces the ball into tighter windows (harder passes); disciplined play picks the safe one
    // short passing (0.4): combination play is more accurate (it had a frequency effect and no benefit at all)
    const creB = (tac(side).creativity === 'high' ? CRE_PASS_B : tac(side).creativity === 'low' ? -CRE_SAFE_B : 0) - (kind !== 'long' && tac(side).passing === 'short' ? 120 : 0);   // 0.5: 250 → 120 (base short passing got more accurate)
    const pOk = prob(S, kind === 'long' ? REF.longFixed : REF.shortFixed, kind === 'long' ? K.long : K.short, B + creB);
    stats[side].passes++; if (kind === 'long') stats[side].longPasses++;
    advance(kind === 'long' ? durOf(30, 50, Math.trunc((d - 250) / 3), side) : durOf(20, 40, Math.trunc((d - 40) / 2.4), side));
    const from = { ...h.cur };
    // a flank attack is the ball played into a wide lane of the final third from outside the box (0.5: passes inside the box no longer count)
    const zr = zoneOf(side, m.cur); if (zr.row >= 5 && zoneOf(side, h.cur).row < 6) { if (zr.col >= 3) stats[side].rightCorridorAttacks++; else if (zr.col <= 1) stats[side].leftCorridorAttacks++; }
    if (rng.roll() >= pOk) {
      // inaccurate: nearest opponent to the target picks it up
      log('pass_bad', side, h, { to: m.player.id, kind, p: pOk }); rate(h, -Math.trunc(pOk / 2000));
      const rr = rng.int(100);
      if (rr < 35) { // out of play: throw-in for the opponent (16.11)
        const mr = rel(side, m.cur); const tp = toAbs(side, { x: mr.x < PITCH_W / 2 ? 5 : PITCH_W - 5, y: mr.y });
        advance(120); st.ball = tp; layout(); const [o] = nearest(opp(side), tp); return setPoss(opp(side), o, tp, 'throw');
      }
      if (rr < 70) return looseBall(side, m.cur);
      const [o] = nearest(opp(side), m.cur);
      setPoss(opp(side), o, m.cur, 'loose'); return;
    }
    const thief = interceptRun(side, h, from, m.cur, S, kind);
    if (thief) { setPoss(opp(side), thief, thief.cur, 'intercept'); return; }
    stats[side].passesOk++; if (kind === 'long') stats[side].longOk++; rate(h, Math.trunc((10000 - pOk) / 2000));
    st.lastPasser = h; st.ball = { ...m.cur };
    log('pass', side, h, { to: m.player.id, kind });
    if (kind === 'long' && rng.int(2)) { // aerial reception
      const [df, dd] = nearest(opp(side), m.cur);
      if (df && dd < 40) {
        const pA = prob(weighted(m.a, W.air), weighted(df.a, W.air), K.air, -(m.player.height - df.player.height) * 14);
        stats[side].aerials++;
        if (rng.roll() >= pA) { log('aerial', opp(side), df, { vs: m.player.id }); return secondBall(opp(side), 'clear', m.cur); }
        stats[side].aerialsWon++;
      }
    }
    st.holder = m;
    const c = control(side, m); if (c !== true) return;
  }

  function dribbleOrCarry(side, h, kind) {
    const ds = opp(side); const [d, dd] = nearest(ds, h.cur, st.beaten);
    const goal = goalPt(side);
    const stepTo = (len) => {
      const gd = Math.max(1, dist(h.cur, goal)); let drift = rng.int(61) - 30;
      // 0.5: a wings plan carries the ball out towards the nearer touchline
      if (dirOf(tac(side)) === 'wings') drift += (h.cur.x < PITCH_W / 2 ? -1 : 1) * 75;
      const p = { x: clamp(h.cur.x + Math.trunc(((goal.x - h.cur.x) * len) / gd) + drift, 10, PITCH_W - 10), y: clamp(h.cur.y + Math.trunc(((goal.y - h.cur.y) * len) / gd), 10, PITCH_L - 10) };
      // 0.5: nobody runs the ball into the six-yard box: centrally a run stops around the penalty spot, wide near the byline
      const r = rel(side, p), lim = Math.abs(r.x - PITCH_W / 2) < 120 ? PITCH_L - 95 : PITCH_L - 25;
      return r.y > lim ? toAbs(side, { x: r.x, y: lim }) : p;
    };
    // 0.5: a carry is not a take-on: unless a defender is right on him (≤ 2.5 m) he runs with the ball, and only part of
    // the time does a defender 2.5–5 m away step in (take-ons were 43 a team a match, about 16 in real football)
    const engage = dd <= 25 || (dd <= 50 && rng.int(100) < 40);
    if (!d || (kind === 'carry' && !engage)) { advance(durOf(30, 60, 50, side)); h.cur = stepTo(dd > 50 ? 100 : 60); st.ball = { ...h.cur }; log('carry', side, h); return; }
    stats[side].dribbles++;
    const second = active(ds).some(p => p !== d && p.mevki !== 'GK' && dist(p.cur, h.cur) < 60) ? 300 : 0;
    const pts = defPoints(ds, h.cur, 'tackle');
    const wide = zoneOf(side, h.cur).row <= 4;
    const Wc = wide ? W.carrier : { dri: 70, pac: 20, str: 10 };
    const pW = prob(weighted(h.a, Wc), weighted(d.a, W.tackler), K.duel, second + pts * PT);
    advance(durOf(20, 40, 50, side));
    if (rng.roll() < pW) {
      duel(h, d, pW);
      if (foulCheck(d, h, h.cur, 'tackle')) return;
      stats[side].dribblesOk++; h.cur = stepTo(70); st.ball = { ...h.cur }; st.beaten = d; log('dribble', side, h, { past: d.player.id, p: pW });
      // 0.5: past his man inside the box, close in: he shoots (the run stops at the penalty spot now, it is not walked in)
      const zz = zoneOf(side, h.cur);
      if (zz.row === 6 && zz.col >= 1 && zz.col <= 3 && dist(h.cur, goal) < 140) { advance(durOf(10, 20, 50, side)); shoot(side, h, 'in', h.cur); }
      return;
    }
    duel(d, h, 10000 - pW);
    log('tackle', ds, d, { on: h.player.id, p: pW });
    setPoss(ds, d, h.cur, 'tackle');
  }

  function throughBall(side, h) {
    const ds = opp(side); stats[side].throughs++;
    const hr = rel(side, h.cur);
    const runners = active(side).filter(m => m !== h && ['ST', 'LW', 'RW', 'AM', 'LM', 'RM'].includes(m.mevki) && rel(side, m.cur).y > hr.y);
    if (!runners.length) return pass(side, h, 'short');
    // 0.5: the runner is a weighted pick (pace + movement, squared), not always the quickest man
    const rw = runners.map(m => { const v = m.a.pac + m.a.posn; return Math.trunc((v * v / 10) * (['LW', 'RW', 'LM', 'RM'].includes(m.mevki) ? 1.15 : 1)); });   // wide men run in behind too
    const run = runners[pickWeighted(rng, rw)];
    // defensive line = second-last defender (5.6)
    const defY = active(ds).map(p => rel(side, p.cur).y).sort((a, b) => b - a);
    const lineY = defY[1] ?? PITCH_L;
    const runRel = rel(side, run.cur);
    advance(durOf(20, 40, 60, side));
    if (runRel.y >= PITCH_L / 2) {
      const timing = weighted(run.a, { posn: 70 }) * 7 / 10 + weighted(h.a, { vis: 30 }) * 3 / 10; // ×10
      const mag = clamp(15 - Math.trunc((timing * 135) / 9900), 1, 15); // 99 → 1.5 dm … 1 → 15 dm
      const e = rng.int(4 * mag + 1) - 2 * mag; // early (+) or late (−)
      // 0.5: the trap: a high line catches runners who are only a little early, a deep line hardly ever plays offside
      const late = tac(ds).line === 'high' ? 0 : tac(ds).line === 'low' ? 6 : 3;
      if (e > late) { stats[side].offsides++; log('offside', side, run, { by: e }); st.ball = toAbs(side, { x: runRel.x, y: lineY }); return freeKickRestart(ds); }
    }
    const S = weighted(h.a, { vis: 50, ...(dist(run.cur, h.cur) > 250 ? { lp: 50 } : { sp: 50 }) });
    // 0.5: a wide runner bends his run in towards goal
    const target = toAbs(side, { x: runRel.x + Math.trunc(((PITCH_W / 2 - runRel.x) * 45) / 100), y: clamp(lineY + 100, 0, PITCH_L - 60) });
    const thief = interceptRun(side, h, h.cur, target, S, 'through');
    if (thief) { setPoss(ds, thief, thief.cur, 'intercept'); return; }
    // keeper rush vs high line (16.9)
    const dT = tac(ds);
    const gk = keeper(ds);
    if (dT.line === 'high' && rng.roll() < 3500) {
      const pK = prob(weighted(gk.a, W.gkRush), weighted(run.a, { pac: 100 }), K.duel, 0);
      if (rng.roll() < pK) { log('keeper_rush', ds, gk, { on: run.player.id }); return gkBall(ds); }
    }
    const [chaser] = nearest(ds, target);
    const linePts = combineTactics([dT.line === 'high' ? 15 : dT.line === 'low' ? -15 : 0]);
    const pR = prob(weighted(run.a, W.runner), weighted(chaser.a, W.chaser), K.duel, -linePts * PT);
    if (rng.roll() < pR) {
      duel(run, chaser, pR);
      if (foulCheck(chaser, run, target, 'race')) return;
      stats[side].throughsOk++; run.cur = target; st.ball = { ...target }; st.lastPasser = h;
      log('through', side, h, { to: run.player.id, p: pR });
      // 0.5: clean through he runs on into the box before he shoots (behind a high line the ball is collected 35–40 m
      // out; shooting from there made a through ball against a high line almost worthless)
      const tr = rel(side, target);
      const at = tr.y < PITCH_L - 150 ? toAbs(side, { x: tr.x + Math.trunc(((PITCH_W / 2 - tr.x) * 40) / 100), y: PITCH_L - 130 - rng.int(40) }) : target;
      if (at !== target) { advance(durOf(20, 40, 50, side)); run.cur = at; st.ball = { ...at }; }
      return shoot(side, run, 'one', at);
    }
    duel(chaser, run, 10000 - pR);
    log('chase_lost', ds, chaser, { on: run.player.id });
    setPoss(ds, chaser, target, 'chase');
  }
  function looseBall(side, pt) {
    st.ball = { ...pt }; advance(20); layout();
    const [a, da] = nearest(side, pt); const [d, dd] = nearest(opp(side), pt);
    const pA = prob(weighted(a.a, W.runner), weighted(d.a, W.chaser), K.duel, (da - dd) * 15);
    if (rng.roll() < pA) { log('loose_ball', side, a); return setPoss(side, a, pt, 'loose'); }
    log('loose_ball', opp(side), d); return setPoss(opp(side), d, pt, 'loose');
  }
  function freeKickRestart(side) { advance(150); const [p] = nearest(side, st.ball); setPoss(side, p, st.ball, 'freekick'); }

  function pressCheck(side, h) {
    const ds = opp(side); const T = tac(ds); const [d, dd] = nearest(ds, h.cur);
    if (!d || dd > 80 || h.mevki === 'GK' && T.press !== 'high') return false;
    const hr = rel(side, h.cur);
    const trigger = hr.x < 60 || hr.x > PITCH_W - 60 || st.lastAction === 'lost_touch' || (st.lastPasser && st.lastPasser.cur && rel(side, st.lastPasser.cur).y > hr.y + 50);
    let p = trigger ? (T.press === 'high' ? 7500 : T.press === 'low' ? 1500 : 4000) : (T.press === 'high' ? 3000 : T.press === 'low' ? 0 : 1000);
    // 0.5: a team that goes long early gives the press less to press (it bypasses it)
    if (tac(side).passing === 'long') p = Math.trunc(p * 6 / 10);
    // 0.5: a high press tires: from the 65th minute it triggers less often and loses its extra man
    const tired = T.press === 'high' && t > 39000;
    if (tired) p = Math.trunc(p * 6 / 10);
    if (rng.roll() >= p) return false;
    stats[ds].presses++;
    d.cur = { x: Math.trunc((d.cur.x + h.cur.x) / 2), y: Math.trunc((d.cur.y + h.cur.y) / 2) };
    // 0.5: building up short in your own half against a high press is where the press wins the ball (it never did)
    const second = (T.press === 'high' && !tired ? 300 : 0) + (T.press === 'high' && tac(side).passing === 'short' && hr.y < PITCH_L / 2 ? 350 : 0);
    const pts = defPoints(ds, h.cur, 'press');
    const pC = prob(weighted(h.a, W.control), weighted(d.a, W.tackler), K.duel, second + pts * PT);
    advance(15);
    if (rng.roll() < pC) { duel(h, d, pC); st.beaten = d; return foulCheck(d, h, h.cur, 'press'); } // a beaten presser leaves space behind him (6.2)
    duel(d, h, 10000 - pC);
    // pressing carries a foul risk even when the presser gets the ball: he arrives at speed (user decision 2026-11-20)
    const sertP = T.tackling === 'hard' ? 200 : T.tackling === 'careful' ? 55 : 100;
    const rush = Math.trunc(((T.press === 'high' ? 1100 : T.press === 'low' ? 300 : 600) * sertP) / 100);
    if (rng.roll() < rush) return foulCheck(d, h, h.cur, 'press', true);
    stats[ds].pressWins++;
    log('press_win', ds, d, { on: h.player.id, p: pC });
    setPoss(ds, d, h.cur, 'press');
    return true;
  }

  // ---------- main loop ----------
  kickoff(0);
  let guard = 0;
  while (t < END && guard++ < 20000) {
    if (half === 1 && t >= HALF) { half = 2; log('half_time', null, null); kickoff(1); continue; }
    layout();
    const side = st.poss, h = st.holder;
    if (!h || h.off) { gkBall(side); continue; }
    if (pressCheck(side, h)) continue;
    const z = zoneOf(side, h.cur);
    const action = chooseAction(side, h);
    st.lastAction = action;
    if (st.counter > 0) st.counter--;
    st.chain++;
    switch (action) {
      case 'short': case 'long': pass(side, h, action); break;
      case 'carry': case 'dribble': dribbleOrCarry(side, h, action); break;
      case 'cross': cross(side, h); break;
      case 'through': throughBall(side, h); break;
      case 'shotIn': {
        advance(durOf(20, 40, 50, side));
        // 0.5: a wide man cuts inside before he shoots (he does not shoot from the byline)
        if (z.col === 0 || z.col === 4) { h.cur = { x: h.cur.x + Math.trunc(((PITCH_W / 2 - h.cur.x) * 50) / 100), y: h.cur.y }; st.ball = { ...h.cur }; }
        shoot(side, h, zoneOf(side, h.cur).row === 6 ? 'in' : 'out', h.cur); break;
      }
      case 'shotOut': advance(durOf(20, 40, 50, side)); shoot(side, h, 'out', h.cur); break;
    }
  }
  log('full_time', null, null);
  const ratings = teams.map(tm => tm.players.map(p => ({ id: p.player.id, slot: p.slot, rating: clamp(p.rating, 300, 1000) / 100 })));
  const all = ratings.flatMap((r, side) => r.map(x => ({ ...x, side })));
  const winSide = stats[0].goals === stats[1].goals ? -1 : stats[0].goals > stats[1].goals ? 0 : 1;
  const motm = all.sort((a, b) => b.rating - a.rating || (b.side === winSide) - (a.side === winSide))[0];
  log('ratings', null, null, { motm: motm.id });
  const digest = hash(JSON.stringify(events));
  return { engine: ENGINE_VERSION, seed, score: [stats[0].goals, stats[1].goals], stats, events, digest, ratings, motm,
    teams: teams.map(tm => ({ name: tm.name, formation: tm.formation, tactic: tm.tactic, chemistry: tm.players.map(p => [p.player.id, p.chem]),
      lineup: tm.players.map(p => ({ id: p.player.id, slot: p.slot, mevki: p.mevki })) })),
    ...(wantFrames ? { frames, pitch: { w: PITCH_W, l: PITCH_L } } : {}) };
}
