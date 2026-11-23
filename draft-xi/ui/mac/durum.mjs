// Draft XI 2D — game state (prompt §1 Game State, §10 statistics).
// Built once from the engine result: the event log with each event's ball and player positions (normalized), who
// holds the ball after every event, possession chains, live team and player statistics (counted only from engine
// events, so the screen can never show something that did not happen) and the highlight reel the director plays.
import { fromEngine } from './saha.mjs?v=1';

// who has the ball once the event is over (null: the ball is in flight or dead)
const HOLDER_AFTER = { possession: 'p', pass: 'to', through: 'to', carry: 'p', dribble: 'p', tackle: 'p', intercept: 'p', press_win: 'p',
  aerial: 'p', second_ball: 'p', loose_ball: 'p', keeper_rush: 'p', corner: 'p', corner_short: 'p', lost_control: 'by' };

export function buildState(r) {
  const E = r.events.filter((e) => e.type !== 'ratings');
  const F = r.frames.slice(0, E.length).map((f) => ({
    t: f.t / 10, b: fromEngine(f.b[0], f.b[1]),
    p: f.p.map((team) => team.map((q) => (q ? fromEngine(q[0], q[1]) : null))),
  }));
  const lineup = r.teams.map((tm) => tm.lineup.map((pl) => ({ ...pl })));
  const where = {};
  lineup.forEach((list, side) => list.forEach((pl, i) => { where[pl.id] = { side, i }; }));
  // holder and side in possession after each event
  const holder = new Array(E.length).fill(null), poss = new Array(E.length).fill(null);
  let h = null, ps = 0;
  E.forEach((e, k) => {
    const key = HOLDER_AFTER[e.type];
    if (key && e[key] && where[e[key]]) h = e[key];
    else if (['pass_bad', 'clear', 'shot', 'cross', 'cross_bad', 'miss', 'goal', 'post', 'block', 'save', 'foul', 'offside', 'half_time', 'full_time', 'chase_lost', 'cross_block'].includes(e.type)) h = e.type === 'save' && e.kind === 'hold' ? e.p : null;
    if (h) ps = where[h].side; else if (e.team != null) ps = e.type === 'intercept' || e.type === 'tackle' ? e.team : ps;
    holder[k] = h; poss[k] = ps;
  });
  // possession chains: a new chain whenever the side in possession changes or play restarts
  const chain = new Array(E.length).fill(0);
  let c = 0;
  E.forEach((e, k) => { if (k && (poss[k] !== poss[k - 1] || (e.type === 'possession' && ['kickoff', 'freekick', 'goalkick', 'corner'].includes(e.how)))) c++; chain[k] = c; });
  return { r, E, F, lineup, where, holder, poss, chain, names: r.teams.map((t) => t.name), tactic: r.teams.map((t) => ({ ...(t.tactic || {}) })) };
}

/** Live statistics: call add(k) once for every event, in order. */
export function createStats(S) {
  const team = () => ({ possession: 0, passes: 0, passesOk: 0, shots: 0, onTarget: 0, goals: 0, dribbles: 0, wins: 0, losses: 0,
    fouls: 0, yellows: 0, reds: 0, corners: 0, offsides: 0, saves: 0 });
  const T = [team(), team()];
  const P = {};
  const pl = (id) => (P[id] ||= { passes: 0, passesOk: 0, shots: 0, onTarget: 0, goals: 0, assists: 0, dribbles: 0, wins: 0, losses: 0, fouls: 0, saves: 0 });
  const sideOf = (id) => S.where[id]?.side;
  let done = -1;
  function add(k) {
    if (k <= done) return;
    for (let j = done + 1; j <= k; j++) one(j);
    done = k;
  }
  function one(k) {
    const e = S.E[k], next = S.E[k + 1];
    if (next && S.poss[k] != null && e.type !== 'half_time') T[S.poss[k]].possession += Math.max(0, next.t - e.t);
    const s = e.team, p = e.p;
    switch (e.type) {
      case 'pass': T[s].passes++; T[s].passesOk++; pl(p).passes++; pl(p).passesOk++; break;  // through balls are counted apart (as in the engine)
      case 'pass_bad': T[s].passes++; T[s].losses++; pl(p).passes++; pl(p).losses++; break;
      case 'intercept': T[s].wins++; pl(p).wins++; if (e.from && e.kind !== 'through' && sideOf(e.from) != null) { const o = sideOf(e.from); T[o].passes++; T[o].losses++; pl(e.from).passes++; pl(e.from).losses++; } break;
      case 'tackle': case 'press_win': T[s].wins++; pl(p).wins++; if (e.on && sideOf(e.on) != null) { T[sideOf(e.on)].losses++; pl(e.on).losses++; } break;
      case 'lost_control': T[s].losses++; pl(p).losses++; if (e.by && sideOf(e.by) != null) { T[sideOf(e.by)].wins++; pl(e.by).wins++; } break;
      case 'dribble': T[s].dribbles++; pl(p).dribbles++; break;
      case 'cross_bad': T[s].losses++; pl(p).losses++; break;
      case 'shot': T[s].shots++; pl(p).shots++; break;
      case 'miss': if (e.shotType === 'fk') { T[s].shots++; pl(p).shots++; } break;   // direct free kicks have no 'shot' event
      case 'goal': if (e.shotType === 'fk' || e.shotType === 'pen') { T[s].shots++; pl(p).shots++; }
        T[s].goals++; T[s].onTarget++; pl(p).goals++; pl(p).onTarget++; if (e.assist && sideOf(e.assist) === s) pl(e.assist).assists++; break;
      case 'save': T[s].saves++; pl(p).saves++;
        if (e.kind === 'fk') { T[1 - s].shots++; T[1 - s].onTarget++; }                      // direct free kick
        else if (e.by && sideOf(e.by) != null) { const o = sideOf(e.by); T[o].onTarget++; pl(e.by).onTarget++; if (e.kind === 'penalty') { T[o].shots++; pl(e.by).shots++; } }
        break;
      case 'foul': T[s].fouls++; pl(p).fouls++; if (e.card === 'yellow') T[s].yellows++; if (e.card === 'red') T[s].reds++; break;
      case 'corner': case 'corner_short': T[s].corners++; break;
      case 'offside': T[s].offsides++; break;
      default: break;
    }
  }
  return { add, T, P, get done() { return done; } };
}

// ── highlight reel (prompt §11: decide what to show once, not every frame) ──
// A match logs ~1,300 events; the reel shows the moments that matter in full, at a watchable pace: every goal,
// penalty and red card, then shots, big chances, corners and cards by importance until the time budget is used.
// Each highlight starts a few moves before its key event (inside the same attack) so the build-up is visible.
const WEIGHT = { goal: 100, save: 40, post: 45, miss: 28, block: 22, through: 14, corner: 10, offside: 6, keeper_rush: 12 };
export function highlights(S, { budget = 300 } = {}) {
  const { E, chain } = S;
  const cand = [];
  E.forEach((e, k) => {
    let w = WEIGHT[e.type] || 0;
    if (e.type === 'foul' && e.card === 'red') w = 60;
    else if (e.type === 'foul' && e.card === 'yellow') w = 9;
    if (e.type === 'shot' && e.shotType === 'pen') w = 80;
    if (!w) return;
    // an outcome (save, miss, post, block, goal) belongs to the shot just before it: the attack is anchored there
    let anchor = k;
    if (['save', 'miss', 'post', 'block', 'goal'].includes(e.type) && E[k - 1]?.type === 'shot') anchor = k - 1;
    // start: up to 6 events earlier inside the same attack; a very short attack also shows how the ball was won
    let a = anchor;
    while (a > 0 && anchor - a < 6 && chain[a - 1] === chain[anchor] && !['half_time', 'goal'].includes(E[a - 1].type)) a--;
    if (anchor - a < 2) while (a > 0 && anchor - a < 3 && !['half_time', 'goal', 'full_time'].includes(E[a - 1].type)) a--;
    if (e.type === 'corner') a = k;
    // end: the outcome and what follows it (a goal keeps the celebration and stops before the kick-off)
    let b = k;
    while (b + 1 < E.length && b - k < 4 && E[b + 1].t - E[k].t < 60 && !['possession'].includes(E[b + 1].type)) b++;
    if (E[b + 1]?.type === 'possession' && b - k < 4 && e.type !== 'goal') b++;
    cand.push({ a, b, k, w: w + (e.t > 52000 ? 4 : 0) });
  });
  const cost = (h) => 4 + (h.b - h.a + 1) * 2.2 + (E[h.k].type === 'goal' ? 7 : 0); // match seconds, roughly
  cand.sort((x, y) => y.w - x.w || x.k - y.k);
  const chosen = [];
  let used = 0;
  for (const h of cand) {
    if (chosen.some((c) => h.a <= c.b + 1 && h.b >= c.a - 1)) {   // overlaps: merge into the existing highlight
      const c = chosen.find((c2) => h.a <= c2.b + 1 && h.b >= c2.a - 1);
      if (h.w >= 40 || used + 3 < budget) { used -= cost(c); c.a = Math.min(c.a, h.a); c.b = Math.max(c.b, h.b); c.w = Math.max(c.w, h.w); used += cost(c); }
      continue;
    }
    if (h.w < 60 && used + cost(h) > budget) continue;
    chosen.push({ ...h }); used += cost(h);
  }
  chosen.sort((x, y) => x.a - y.a);
  // the opening kick-off is always shown briefly
  if (!chosen.length || chosen[0].a > 0) chosen.unshift({ a: 0, b: Math.min(5, E.length - 1), k: 0, w: 1 });
  // a highlight that grew while merging can reach into the next one: join them so no event is played twice
  const out = [];
  for (const h of chosen) {
    const last = out[out.length - 1];
    if (last && h.a <= last.b) { last.b = Math.max(last.b, h.b); if (h.w > last.w) { last.w = h.w; last.k = h.k; } }
    else out.push({ ...h });
  }
  return out;
}
