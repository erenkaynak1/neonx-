/* NEON XI — RE:VERSE name matcher. The speech recogniser runs in Turkish, so foreign names come back spelled by
   ear ("ırling holand", "kilyan embape", "cud belingım"). Both what was heard and every player name are turned
   into the same rough sound spelling, then compared (full name, surname, first name; whole spelling and the
   consonant skeleton). Data: data/names.json (scripts/build_reverse_names.py).
   window.NX_NAME_MATCH.ready → Promise; .suggest(heardTexts[], k=3) → [{ name, score }] best first. */
(() => {
  'use strict';
  const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Turkish spelling (what the recogniser writes, and Turkish players' names).
  function trKey(s) {
    return String(s).toLocaleLowerCase('tr-TR')
      .replace(/ğ/g, '').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
      .replace(/ç/g, 'C').replace(/ş/g, 'S').replace(/c/g, 'J')          // C = ch sound, S = sh, J = j/dj sound
      .replace(/[^a-zCSJ ]/g, ' ');
  }
  // Foreign spelling → the same sound alphabet (English/Spanish/Portuguese/German/French/Slavic habits,
  // roughly). `ch` is ambiguous (Chelsea / Kimmich / Chiesa): chVariant picks C, S or k.
  function foreignKey(s, chVariant = 'C') {
    let t = String(s).toLowerCase().replace(/ñ/g, 'ny').replace(/ç/g, 's').replace(/ß/g, 'ss').replace(/æ/g, 'e').replace(/ø/g, 'o').replace(/ł/g, 'l')
      .replace(/[ćč]/g, 'C').replace(/š/g, 'S').replace(/ž/g, 'j').replace(/đ/g, 'J');
    t = strip(t);
    t = t.replace(/\b(\w{3,}v?i)c\b/g, '$1C')                       // Slavic -ic/-vic without the accent: Tadic, Kovacic
      .replace(/a([bdfgklmnprstvz])e\b/g, 'ey$1')                       // English a_e: Kane, Wade
      .replace(/uy/g, 'oy').replace(/ij/g, 'ay').replace(/eu/g, 'oy')     // Dutch uy/ij (Bruyne, Dijk), German eu (Neuer)
      .replace(/tsch|tch/g, 'C').replace(/sch|sh|sz/g, 'S').replace(/zh/g, 'j').replace(/ch/g, chVariant).replace(/cz/g, 'C')
      .replace(/dzh|dj|dz/g, 'J').replace(/ph/g, 'f').replace(/th/g, 't').replace(/ck/g, 'k').replace(/qu/g, 'k').replace(/gh/g, 'g')
      .replace(/j/g, 'J').replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k').replace(/x/g, 'ks').replace(/w/g, 'v').replace(/q/g, 'k')
      .replace(/ee|ea|ie/g, 'i').replace(/oo|ou/g, 'u').replace(/ae|ai/g, 'e').replace(/ue/g, 'u').replace(/ei/g, 'ay').replace(/au/g, 'o')
      .replace(/y(?![aeiou])/g, 'i').replace(/h\b/g, '')
      .replace(/[^a-zCSJ ]/g, ' ');
    return t;
  }
  const tidy = k => k.replace(/(.)\1+/g, '$1').replace(/\s+/g, ' ').trim();
  const skeleton = k => k.replace(/[aeiou]/g, '').replace(/(.)\1+/g, '$1');

  function jaroWinkler(a, b) {
    if (a === b) return 1;
    const la = a.length, lb = b.length;
    if (!la || !lb) return 0;
    const range = Math.max(0, Math.floor(Math.max(la, lb) / 2) - 1);
    const ma = new Array(la).fill(false), mb = new Array(lb).fill(false);
    let m = 0;
    for (let i = 0; i < la; i++) {
      for (let j = Math.max(0, i - range); j < Math.min(lb, i + range + 1); j++) {
        if (!mb[j] && a[i] === b[j]) { ma[i] = mb[j] = true; m++; break; }
      }
    }
    if (!m) return 0;
    let t = 0, k = 0;
    for (let i = 0; i < la; i++) if (ma[i]) { while (!mb[k]) k++; if (a[i] !== b[k]) t++; k++; }
    const jaro = (m / la + m / lb + (m - t / 2) / m) / 3;
    let p = 0; while (p < 4 && a[p] === b[p]) p++;
    return jaro + p * 0.1 * (1 - jaro);
  }
  const sim = (x, y) => 0.55 * jaroWinkler(x, y) + 0.45 * jaroWinkler(skeleton(x), skeleton(y));

  let NAMES = [];
  const ready = fetch(new URL('./data/names.json?v=1', document.currentScript?.src || location.href)).then(r => r.json()).then(d => {
    NAMES = [];
    for (const [name, rec, tr] of d.names || []) {
      const keys = tr || /[ğşıçöüİ]/.test(name) ? [trKey(name)] : (/ch/i.test(name) ? ['C', 'S', 'k'].map(v => foreignKey(name, v)) : [foreignKey(name)]);
      for (const raw of new Set(keys.map(tidy))) {
        const parts = raw.split(' ');
        NAMES.push({ name, rec: rec || 0, key: raw, first: parts[0], last: parts.length > 1 ? parts.slice(1).join(' ') : '', lastWord: parts[parts.length - 1] });
      }
    }
  }).catch(() => { NAMES = []; });

  function scoreOne(heardKeys, n) {
    let best = 0;
    for (const h of heardKeys) {
      const words = h.split(' ').length;
      best = Math.max(best, sim(h, n.key));
      if (words === 1) {  // people often say the surname only ("Haaland"), the first name ("Vinicius") or a one-word name ("Pedri")
        if (n.lastWord) best = Math.max(best, sim(h, n.lastWord) - 0.02);
        if (n.last) best = Math.max(best, sim(h, n.last) - 0.02);
        if (n.last) best = Math.max(best, sim(h, n.first) - 0.04);
      } else if (n.last) {
        best = Math.max(best, sim(h, n.first + ' ' + n.lastWord) - 0.01, sim(h, n.last) - 0.02);
      }
    }
    return best;
  }
  function suggest(heard, k = 3) {
    const texts = [...new Set((Array.isArray(heard) ? heard : [heard]).map(t => String(t || '').trim()).filter(Boolean))];
    if (!texts.length || !NAMES.length) return [];
    const keys = [...new Set(texts.flatMap(t => [tidy(trKey(t)), tidy(foreignKey(t))]).filter(Boolean))];
    const oneWord = keys.every(x => !x.includes(' '));
    const best = new Map();
    for (const n of NAMES) {
      // fame breaks near ties; it counts more when only one word was said (many players share a surname)
      const s = scoreOne(keys, n) + Math.min(n.rec, 800) / (oneWord ? 9000 : 20000);
      if (s > 0.72 && s > (best.get(n.name) || 0)) best.set(n.name, s);
    }
    return [...best].map(([name, s]) => ({ name, score: Math.round(s * 1000) / 1000 })).sort((a, b) => b.score - a.score).slice(0, k);
  }
  window.NX_NAME_MATCH = { ready, suggest, _keys: { trKey, foreignKey, tidy } };
})();
