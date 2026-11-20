// Draft XI v2 engine: deterministic maths core (design doc 4.3, 13.3, 14).
// Everything here is integer arithmetic so two browsers produce the same match from the same seed.
import { LOGISTIC } from './logistic-table.mjs';

/** Seeded 32-bit PRNG (mulberry32). Integer-only; same sequence on every JS engine. */
export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0);
  };
  return {
    /** integer in [0, n) */
    int: n => next() % n,
    /** roll in [0, 10000) for probabilities expressed per 10 000 */
    roll: () => next() % 10000,
  };
}

/**
 * Success probability per 10 000.
 * P = 1 / (1 + e^-(k·(S − D) − B))
 * S, D: attribute values ×10 (one decimal, integers). k: milli-logit per attribute point. B: difficulty in milli-logit.
 */
export function prob(S10, D10, k, B) {
  const logitMilli = Math.trunc((k * (S10 - D10)) / 10) - B;
  let i = Math.trunc((logitMilli + 8000) / 10);
  if (i < 0) i = 0; else if (i > 1600) i = 1600;
  return LOGISTIC[i];
}

/** milli-logit that gives probability p (per 10 000) at S = D; used to turn reference percentages into B. */
export function bForBase(p10000) {
  // binary search the table (no Math.log at runtime)
  let lo = 0, hi = 1600;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (LOGISTIC[mid] < p10000) lo = mid + 1; else hi = mid; }
  return -((lo - 800) * 10); // B such that −B = logit
}

/**
 * Combine tactic effects on one contest (design doc 14.4): opposite effects cancel first,
 * then largest full, second half, third quarter; total capped at 25 points. Values in points.
 */
export function combineTactics(effects) {
  const pos = effects.filter(v => v > 0).sort((a, b) => b - a);
  const neg = effects.filter(v => v < 0).map(v => -v).sort((a, b) => b - a);
  const fold = arr => arr.reduce((s, v, i) => s + v / (1 << i), 0);
  let t = fold(pos) - fold(neg);
  if (t > 25) t = 25; else if (t < -25) t = -25;
  return t;
}

/** Weighted attribute value ×10. weights: { attr: percent }. */
export function weighted(attrs, weights) {
  let s = 0, w = 0;
  for (const [k, pct] of Object.entries(weights)) { s += (attrs[k] ?? 0) * pct; w += pct; }
  return Math.round((s * 10) / w);
}

/** FNV-1a 32-bit hash of a string (event-log digest for online verification). */
export function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/** Pick an index by integer weights. */
export function pickWeighted(rng, weights) {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) return 0;
  let r = rng.int(total);
  for (let i = 0; i < weights.length; i++) { r -= Math.max(0, weights[i]); if (r < 0) return i; }
  return weights.length - 1;
}
