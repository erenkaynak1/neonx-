// Draft XI — spiker (tasarım belgesi 9.1 ve 16.15).
// Anlamlı anlarda konuşur, "neden"i olay kaydındaki gerçek bilgilerden ve taktiklerden anlatır, her ~10 dakikada
// bir taktik gözlemi yapar, olaya bağlı espriler ekler (maç başına ~10–14, tekrarsız, aynı türden iki espri arasında
// en az 5 dakika). Metinler spiker-metinler.mjs dosyasında; kod değişmeden eklenip çıkarılabilir.
import { OLAY, SEBEP, GOZLEM, ESPRI } from './spiker-metinler.mjs?v=4';

/** Match minute shown on the scoreboard for an engine time in deciseconds. */
export const dakika = (t) => `${Math.min(90, Math.floor(t / 600) + 1)}'`;

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// joke chance per type (tuned for ~10–14 per match together with the 5-minute gap and the cap)
const ESPRI_SANS = { gol: 0.85, kurtaris: 0.35, kacti: 0.14, direk: 0.85, ofsayt: 0.45, faul_sert: 0.6, calim: 0.05, orta_kotu: 0.05, pres: 0.25, sert_sut: 0.5, hata: 0.12 };
const ESPRI_TAVAN = 14, ESPRI_ARA = 3000, ESPRI_GENEL_ARA = 900, MAC = 54000; // deciseconds: 5 / 1.5 match minutes

/**
 * @param {object} r  engine result (events, teams with tactic)
 * @param {(id: string) => string} nm  player id → display name
 * @param {string[]} teams  team names
 * @param {{jokes?: boolean, seed?: number}} opts
 * @returns {(ev: object, k: number) => Array<{kind: string, text: string}>}
 */
export function createSpiker(r, nm, teams, { jokes = true, seed = 1 } = {}) {
  const rand = rng(seed * 7919 + 13);
  const last = {};                 // bank key → last index (no repeat in a row)
  const usedJokes = new Set();     // joke text used this match
  const lastJokeAt = {};           // joke type → time
  let jokeCount = 0, lastAny = -1e9, lastPress = -1e9;
  const tac = r.teams.map((t) => t.tactic || {});
  const E = r.events;
  // observation state
  const win = { poss: [0, 0], shots: [0, 0], cross: [0, 0], through: [0, 0], press: [0, 0] };
  let nextObs = 6000;              // first observation around the 10th minute
  const lastObs = {};

  const pick = (bank, key) => {
    const list = bank[key];
    if (!list?.length) return '';
    let i = Math.floor(rand() * list.length);
    if (list.length > 1 && i === last[key]) i = (i + 1) % list.length;
    last[key] = i;
    return list[i];
  };
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ''));

  function joke(type, t) {
    if (!jokes || jokeCount >= ESPRI_TAVAN) return null;
    if (jokeCount >= 2 + ESPRI_TAVAN * (t / MAC)) return null;          // spread over the whole match
    if (t - lastAny < ESPRI_GENEL_ARA) return null;                     // no two jokes back to back
    if (t - (lastJokeAt[type] ?? -1e9) < ESPRI_ARA) return null;
    if (rand() > (ESPRI_SANS[type] ?? 0)) return null;
    const fresh = (ESPRI[type] || []).filter((x) => !usedJokes.has(x));
    if (!fresh.length) return null;
    const text = fresh[Math.floor(rand() * fresh.length)];
    usedJokes.add(text); lastJokeAt[type] = t; lastAny = t; jokeCount++;
    return { kind: 'joke', text };
  }

  // what happened just before event k (for "why" lines)
  const recent = (k, secs, test) => { for (let j = k - 1; j >= 0 && E[k].t - E[j].t <= secs * 10; j--) if (test(E[j])) return E[j]; return null; };

  function goalReasons(ev, k, v) {
    const side = ev.team, other = 1 - side, out = [];
    const st = ev.shotType;
    const won = recent(k, 25, (e) => e.team === side && ['tackle', 'intercept', 'press_win'].includes(e.type));
    if (won?.type === 'press_win') out.push(pick(SEBEP, 'gol_pres'));
    else if (won && tac[side].onWin === 'counter') out.push(pick(SEBEP, 'gol_kontra'));
    else if (st === 'one') out.push(pick(SEBEP, tac[other].line === 'high' ? 'gol_ara_yuksek_hat' : 'gol_ara'));
    else if (st === 'head') out.push(pick(SEBEP, tac[side].direction === 'wings' || tac[side].finishing === 'cross' ? 'gol_kafa_kanat' : 'gol_kafa'));
    else if (st === 'out') out.push(pick(SEBEP, 'gol_uzak'));
    else if (st === 'pen') out.push(pick(SEBEP, 'gol_pen'));
    else if (st === 'fk') out.push(pick(SEBEP, 'gol_fk'));
    else out.push(pick(SEBEP, tac[side].passing === 'short' ? 'gol_kisa_pas' : 'gol_ceza'));
    if (ev.pG != null && ev.pG < 1500) out.push(pick(SEBEP, 'surpriz_gol'));
    if (ev.assist && ev.assist !== ev.p) out.push(pick(SEBEP, 'gol_asist'));
    return out.filter(Boolean).map((s) => ({ kind: 'reason', text: fill(s, v) }));
  }

  function observation(t) {
    const totalPoss = win.poss[0] + win.poss[1] || 1;
    const cands = [];
    const lead = win.poss[0] >= win.poss[1] ? 0 : 1, share = Math.round((win.poss[lead] / totalPoss) * 100);
    if (share >= 58) cands.push(['topa_sahip', lead, share]);
    const sLead = win.shots[0] >= win.shots[1] ? 0 : 1;
    if (win.shots[sLead] >= 3 && win.shots[sLead] >= 2 * win.shots[1 - sLead]) cands.push(['sut_farki', sLead, win.shots[sLead]]);
    const cLead = win.cross[0] >= win.cross[1] ? 0 : 1;
    if (win.cross[cLead] >= 4) cands.push(['kanat', cLead, win.cross[cLead]]);
    const tLead = win.through[0] >= win.through[1] ? 0 : 1;
    if (win.through[tLead] >= 2) cands.push(['ara_pasi', tLead, win.through[tLead]]);
    const pLead = win.press[0] >= win.press[1] ? 0 : 1;
    if (win.press[pLead] >= 2) cands.push(['pres', pLead, win.press[pLead]]);
    if (!cands.length) cands.push(['sakin', 0, 0]);
    const fresh = cands.filter(([key]) => t - (lastObs[key] ?? -1e9) >= 9000); // same observation not within 15 minutes
    if (!fresh.length) return null;
    const [key, side, n] = fresh[Math.floor(rand() * fresh.length)];
    lastObs[key] = t;
    for (const o of Object.values(win)) { o[0] = 0; o[1] = 0; }
    return { kind: 'obs', text: fill(pick(GOZLEM, key), { t: teams[side], n }) };
  }

  return function spik(ev, k) {
    const out = [];
    const tm = ev.team, v = { o: ev.p ? nm(ev.p) : '', t: tm != null ? teams[tm] : '', k: tm != null ? teams[1 - tm] : '' };
    // observation window
    if (tm != null) {
      const nextT = E[k + 1]?.t ?? ev.t;
      win.poss[tm] += Math.max(0, nextT - ev.t);
    }
    if (ev.type === 'shot') win.shots[tm]++;
    if (ev.type === 'cross' || ev.type === 'cross_bad') win.cross[tm]++;
    if (ev.type === 'through') win.through[tm]++;
    if (ev.type === 'press_win') win.press[tm]++;

    const say = (key, extra = {}, kind = 'build') => out.push({ kind, text: fill(pick(OLAY, key), { ...v, ...extra }) });
    const shot = ev.type === 'goal' || ev.type === 'save' || ev.type === 'miss' || ev.type === 'post' ? recent(k, 1, (e) => e.type === 'shot') : null;
    switch (ev.type) {
      case 'goal': {
        say('gol', {}, 'goal');
        out.push(...goalReasons(ev, k, { ...v, r: ev.assist ? nm(ev.assist) : '' }));
        const j = shot?.shotType === 'out' ? joke('sert_sut', ev.t) || joke('gol', ev.t) : joke('gol', ev.t);
        if (j) out.push(j);
        break;
      }
      case 'save': {
        say('kurtaris', { r: ev.by ? nm(ev.by) : 'rakip' }, 'chance');
        if (shot?.shotType === 'one' || shot?.shotType === 'pen') out.push({ kind: 'reason', text: fill(pick(SEBEP, 'kurtaris_net'), { ...v, r: ev.by ? nm(ev.by) : '' }) });
        const j = shot?.shotType === 'out' ? joke('sert_sut', ev.t) : joke('kurtaris', ev.t);
        if (j) out.push(j);
        break;
      }
      case 'miss': { say('kacti', {}, 'chance'); const j = joke('kacti', ev.t); if (j) out.push(j); break; }
      case 'post': { say('direk', {}, 'chance'); const j = joke('direk', ev.t); if (j) out.push(j); break; }
      case 'block': say('blok', {}, 'info'); break;
      case 'through': say('ara_pasi', { r: ev.to ? nm(ev.to) : '' }, 'chance'); break;
      case 'cross': say('orta', {}, 'build'); break;
      case 'cross_bad': { if (rand() < 0.4) { say('orta_kotu'); const j = joke('orta_kotu', ev.t); if (j) out.push(j); } break; }
      case 'corner': say('korner', {}, 'info'); break;
      case 'foul': {
        const r2 = { r: ev.on ? nm(ev.on) : '' };
        if (ev.card === 'red') { say('kirmizi', r2, 'card-r'); const j = joke('faul_sert', ev.t); if (j) out.push(j); }
        else if (ev.card === 'yellow') { say('sari', r2, 'card-y'); const j = joke('faul_sert', ev.t); if (j) out.push(j); }
        else if (rand() < 0.3) say('faul', r2);
        break;
      }
      case 'offside': { say('ofsayt', {}, 'info'); const j = joke('ofsayt', ev.t); if (j) out.push(j); break; }
      case 'dribble': { if (rand() < 0.35) { say('calim', { r: ev.past ? nm(ev.past) : 'rakibini' }); const j = joke('calim', ev.t); if (j) out.push(j); } break; }
      case 'press_win': {
        if (ev.t - lastPress < 900) break; // not every won ball: at most one press line per 1.5 minutes
        lastPress = ev.t; say('pres'); const j = joke('pres', ev.t); if (j) out.push(j); break;
      }
      case 'tackle': case 'intercept': if (rand() < 0.2) say('top_kapti'); break;
      case 'lost_control': { const j = joke('hata', ev.t); if (j) { say('hata'); out.push(j); } break; }
      case 'keeper_rush': say('kaleci_cikis', {}, 'info'); break;
      case 'possession': if (ev.how === 'kickoff' && k === 0) say('santra', {}, 'info'); break;
      case 'half_time': say('devre', {}, 'info'); break;
      case 'full_time': say('bitis', {}, 'info'); break;
      case 'reshape': out.push({ kind: 'card-r', text: `${v.t} 10 kişi kaldı; ${v.o} boşalan bölgeye kaydı.` }); break;
      default: break;
    }
    if (ev.t >= nextObs && !['goal', 'half_time', 'full_time'].includes(ev.type)) {
      nextObs = ev.t + 6000;
      const o = observation(ev.t);
      if (o) out.push(o);
    }
    return out;
  };
}
