// Draft XI — draft screen (design doc 16.12): snake order, 11 rounds, whole pool visible with position filter and
// search, every pick must fit an empty position (2.4), formation changeable during the draft, auto pick, bot
// opponent (16.13: easy / medium / hard) or two players on one phone. Ends on the tactics screen.
import { HAVUZ, HAVUZ_BY_ID } from '../data/havuz-fm.mjs?v=1';
import { FORMATIONS, zonePoint } from '../engine/formations.mjs?v=2';
import { uygun, guc, kimya, MEVKI_GRUP, esc } from './ortak.mjs?v=3';

const $ = (id) => document.getElementById(id);
const STYLE = { // medium/hard bot: a playing style chosen at the start (16.13) → attributes it values and its plan
  hiz: { keys: ['pac', 'dri'], plan: 'kontra' }, pas: { keys: ['sp', 'vis', 'ft'], plan: 'tikitaka' },
  kanat: { keys: ['cro', 'pac', 'hed'], plan: 'kanat' }, pres: { keys: ['tac', 'str', 'pac'], plan: 'pres' },
};
const FORMS = Object.keys(FORMATIONS);
let S = null;

// ── setup ──
let mod = 'bot', zor = 'orta';
$('dizilis').innerHTML = FORMS.map((f) => `<option${f === '4-3-3' ? ' selected' : ''}>${f}</option>`).join('');
// mode list → settings sheet (the shared NEON XI menu: .sgm in side-games/sidegame-skin-v2.css)
function openMode(m) {
  mod = m;
  $('ayarBaslik').textContent = m === 'bot' ? 'BOTA KARŞI' : 'AYNI TELEFON';
  $('zorlukSatiri').hidden = m !== 'bot';
  $('ayarNot').textContent = m === 'bot' ? 'Bot, draft başında bir oyun tarzı seçer ve ona göre oyuncu toplar. Diziliş draft sırasında da değiştirilebilir.' : 'Seçim sırası gelen oyuncuya telefonu verin. Diziliş draft sırasında da değiştirilebilir.';
  $('modlar').hidden = true; $('nasil').hidden = true; $('ayar').hidden = false;
  $('basla').focus({ preventScroll: true });
}
document.querySelectorAll('[data-mod]').forEach((b) => b.addEventListener('click', () => openMode(b.dataset.mod)));
$('geri').addEventListener('click', () => { $('ayar').hidden = true; $('modlar').hidden = false; $('nasil').hidden = false; });
document.querySelectorAll('[data-zor]').forEach((b) => b.addEventListener('click', () => {
  zor = b.dataset.zor;
  document.querySelectorAll('[data-zor]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
}));

function start() {
  const styleKeys = Object.keys(STYLE);
  S = {
    mod, zor, pick: 0, selected: null, filter: 'Tümü', query: '', tab: 'havuz',
    teams: [
      { name: mod === 'bot' ? 'Senin takımın' : 'Oyuncu 1', formation: $('dizilis').value, slots: {} },
      { name: mod === 'bot' ? `Bot (${{ kolay: 'Kolay', orta: 'Orta', zor: 'Zor' }[zor]})` : 'Oyuncu 2', formation: FORMS[Math.floor(Math.random() * 6)], slots: {} },
    ],
    style: styleKeys[Math.floor(Math.random() * styleKeys.length)],
    taken: new Set(),
  };
  if (mod === 'iki') S.teams[1].formation = $('dizilis').value;
  $('kur').hidden = true; $('draft').hidden = false;
  render(); botMaybe();
}
$('basla').addEventListener('click', start);
// opened from the NEON XI home: ?mod=bot (against the bot) or ?mod=iki (two players on one phone) preselects the mode
{ const want = new URLSearchParams(location.search).get('mod'); if (want === 'bot' || want === 'iki') openMode(want); }

// ── draft order (snake: 1-2, 2-1, …) ──
const round = () => Math.floor(S.pick / 2);
const cur = () => (round() % 2 === 0 ? S.pick % 2 : 1 - (S.pick % 2));
const isBot = (t) => S.mod === 'bot' && t === 1;
const done = () => S.pick >= 22;

function emptySlots(t) {
  return FORMATIONS[S.teams[t].formation].filter(([slot]) => !S.teams[t].slots[slot]).map(([slot, , mevki]) => ({ slot, mevki }));
}
/** best empty slot for player p in team t, or null */
function bestSlot(t, p) {
  const fits = emptySlots(t).filter(({ mevki }) => uygun(p, mevki));
  if (!fits.length) return null;
  return fits.sort((a, b) => guc(p, b.mevki) - guc(p, a.mevki))[0];
}

function place(t, id, slot) {
  const p = HAVUZ_BY_ID[id];
  const target = slot ? emptySlots(t).find((x) => x.slot === slot && uygun(p, x.mevki)) : bestSlot(t, p);
  if (!target || S.taken.has(id)) return false;
  S.teams[t].slots[target.slot] = id;
  S.taken.add(id);
  S.last = { t, slot: target.slot };
  S.selected = null;
  S.pick++;
  try { navigator.vibrate?.(20); } catch { /* ignore */ }
  if (done()) return finish();
  render(); botMaybe();
  return true;
}

// ── formation change during the draft: placed players move to fitting slots of the new shape ──
function changeFormation(t, f) {
  const tpl = FORMATIONS[f];
  const ids = Object.values(S.teams[t].slots);
  const opts = ids.map((id) => ({ id, slots: tpl.filter(([, , m]) => uygun(HAVUZ_BY_ID[id], m)).map(([s]) => s) })).sort((a, b) => a.slots.length - b.slots.length);
  const used = new Set(), out = {};
  for (const o of opts) {
    const s = o.slots.find((x) => !used.has(x));
    if (!s) return false;
    used.add(s); out[s] = o.id;
  }
  S.teams[t].formation = f; S.teams[t].slots = out;
  return true;
}

// ── scoring for bots and auto pick ──
function chemGain(t, p, slot) {
  const base = kimya(S.teams[t].formation, Object.fromEntries(Object.entries(S.teams[t].slots).map(([s, id]) => [s, HAVUZ_BY_ID[id]])));
  const withP = kimya(S.teams[t].formation, { ...Object.fromEntries(Object.entries(S.teams[t].slots).map(([s, id]) => [s, HAVUZ_BY_ID[id]])), [slot]: p });
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  return sum(withP) - sum(base);
}
function candidates(t) {
  const out = [];
  for (const p of HAVUZ) {
    if (S.taken.has(p.id)) continue;
    const b = bestSlot(t, p);
    if (b) out.push({ p, slot: b.slot, mevki: b.mevki, g: guc(p, b.mevki) });
  }
  return out.sort((a, b) => (b.g - (POS_MEAN[b.mevki] ?? 70)) - (a.g - (POS_MEAN[a.mevki] ?? 70)));
}
function choose(t, level) {
  const cs = candidates(t);
  if (!cs.length) return null;
  if (level === 'kolay') { const top = cs.slice(0, 10); return top[Math.floor(Math.random() * top.length)]; }
  const st = STYLE[S.style];
  // hard: aim at the opponent's weakest flank (slow full-backs → value pace on the wings)
  let paceBias = 0;
  if (level === 'zor') {
    const opp = S.teams[1 - t];
    const backs = FORMATIONS[opp.formation].filter(([s, , m]) => ['LB', 'RB', 'LWB', 'RWB'].includes(m) && opp.slots[s]).map(([s]) => HAVUZ_BY_ID[opp.slots[s]].attrs.pac);
    if (backs.length && backs.reduce((a, b) => a + b, 0) / backs.length < 78) paceBias = 0.25;
  }
  const scored = cs.slice(0, 60).map((c) => {
    const styleV = st.keys.reduce((n, k) => n + (c.p.attrs[k] || 0), 0) / st.keys.length;
    const wing = ['LW', 'RW', 'LM', 'RM'].includes(c.mevki) ? paceBias * c.p.attrs.pac : 0;
    return { ...c, s: c.g + 0.25 * (styleV - 70) + 1.2 * chemGain(t, c.p, c.slot) + wing };
  }).sort((a, b) => b.s - a.s);
  return level === 'orta' ? scored[Math.floor(Math.random() * Math.min(3, scored.length))] : scored[0];
}
function botMaybe() {
  if (done() || !isBot(cur())) return;
  setTimeout(() => {
    if (!S || done() || !isBot(cur())) return;
    const c = choose(1, S.zor);
    if (c) place(1, c.p.id, c.slot);
  }, 650);
}

// ── rendering ──
function teamPanel(t) {
  const tm = S.teams[t], cls = t === 0 ? 'a' : 'b';
  const players = Object.fromEntries(Object.entries(tm.slots).map(([s, id]) => [s, HAVUZ_BY_ID[id]]));
  const chem = kimya(tm.formation, players);
  const sel = S.selected && cur() === t ? HAVUZ_BY_ID[S.selected] : null;
  const count = Object.keys(tm.slots).length;
  const avgChem = count ? (Object.values(chem).reduce((a, b) => a + b, 0) / count).toFixed(1) : '0.0';
  const avgG = count ? Math.round(Object.entries(tm.slots).reduce((n, [s, id]) => n + guc(HAVUZ_BY_ID[id], FORMATIONS[tm.formation].find((x) => x[0] === s)[2]), 0) / count) : 0;
  const canEdit = !isBot(t);
  // formation as lines (GK, then the formation's own numbers, e.g. 4-2-3-1): the template lists slots line by line
  // from the own goal, so cut it into lines of those sizes, left → right inside a line. Rows are flexbox, so cards never overlap.
  const tpl = FORMATIONS[tm.formation];
  const outfield = tpl.filter(([, , m]) => m !== 'GK');
  const lines = [tpl.filter(([, , m]) => m === 'GK')];
  let at = 0;
  for (const n of tm.formation.split('-').map(Number)) {
    lines.push(outfield.slice(at, at + n).map((x) => ({ x, px: zonePoint(x[3]).x })).sort((u, v) => u.px - v.px).map((o) => o.x));
    at += n;
  }
  const card = ([slot, label, mevki]) => {
    const p = players[slot];
    const hedef = !p && sel && uygun(sel, mevki);
    const yeni = S.last && S.last.t === t && S.last.slot === slot;
    return `<div class="slot${p ? ' dolu' : ''}${hedef ? ' hedef' : ''}${yeni ? ' yeni' : ''}"
      ${hedef ? `role="button" tabindex="0" data-yer="${slot}" aria-label="${esc(sel.name)} → ${esc(label)}"` : ''} title="${esc(label)}">
      <span class="mv">${mevki}</span>${p ? `<span class="ad">${esc(p.name.split(' ').slice(-1)[0])}</span><span class="kim">${guc(p, mevki)} · K${chem[slot] ?? 0}</span>` : '<span class="ad bos-ad">—</span>'}</div>`;
  };
  const slots = lines.slice().reverse().map((ln) => `<div class="hat">${ln.map(card).join('')}</div>`).join('');
  return `<div class="${cls}" style="display:contents">
    <div class="th ${cls}"><b>${esc(tm.name)}</b>${canEdit ? `<select data-dizilis="${t}" aria-label="Diziliş">${FORMS.map((f) => `<option${f === tm.formation ? ' selected' : ''}>${f}</option>`).join('')}</select>` : `<span class="tur-no">${tm.formation}</span>`}</div>
    <div class="ozet"><span>Kadro <b>${count}/11</b></span><span>Ort. güç <b>${avgG}</b></span><span>Kimya <b>${avgChem}</b></span></div>
    <div class="saha ${cls}">${slots}</div></div>`;
}

const FILTERS = ['Tümü', 'KL', 'DEF', 'OS', 'FOR', 'Uygun'];
// list order: each player against the average of his own main position (keepers' values sit on a higher scale)
const POS_MEAN = (() => { const s = {}; for (const p of HAVUZ) { const m = p.positions[0]; (s[m] ||= []).push(guc(p)); }
  return Object.fromEntries(Object.entries(s).map(([m, v]) => [m, v.reduce((a, b) => a + b, 0) / v.length])); })();
const rankOf = (p) => guc(p) - (POS_MEAN[p.positions[0]] ?? 70);
function poolList() {
  const t = cur(), q = S.query.trim().toLocaleLowerCase('tr');
  let ps = HAVUZ.filter((p) => !S.taken.has(p.id));
  if (q) ps = ps.filter((p) => p.name.toLocaleLowerCase('tr').includes(q) || p.club.toLocaleLowerCase('tr').includes(q));
  if (S.filter === 'Uygun') ps = ps.filter((p) => bestSlot(t, p));
  else if (S.filter !== 'Tümü') ps = ps.filter((p) => MEVKI_GRUP[p.positions[0]] === S.filter);
  ps = ps.map((p) => ({ p, g: guc(p), r: rankOf(p), fit: !!bestSlot(t, p) })).sort((a, b) => (b.fit - a.fit) || (b.r - a.r)).slice(0, 150);
  if (!ps.length) return '<li class="bos">Oyuncu yok.</li>';
  return ps.map(({ p, g, fit }) => `<li class="oy${fit ? '' : ' uymaz'}${S.selected === p.id ? ' secili' : ''}" data-id="${esc(p.id)}" role="button" tabindex="0" aria-disabled="${!fit}">
    <span class="g${g >= 93 ? " t1" : g >= 88 ? " t2" : ""}">${g}</span><span class="n"><b>${esc(p.name)}</b><small>${esc(p.club)} · ${p.age} · ${p.foot === 'L' ? 'Sol' : 'Sağ'} ayak</small></span>
    <span class="m">${p.positions.map((m) => `<i>${m}</i>`).join('')}</span></li>`).join('');
}

function render() {
  if (!S) return;
  const t = cur();
  const who = S.teams[t].name;
  $('sira').className = 'sira ' + (t === 0 ? 'a' : 'b');
  $('sira').innerHTML = done() ? 'Draft tamam' : isBot(t) ? `${esc(who)} seçiyor…<small>Bot düşünüyor</small>`
    : `Sıra: ${esc(who)}<small>${S.selected ? 'Sahada parlayan yere dokun ya da listeden başka oyuncu seç' : 'Bir oyuncu seç: en uygun boş yere yerleşir'}</small>`;
  $('turNo').textContent = `Tur ${Math.min(11, round() + 1)}/11`;
  $('otomatik').disabled = done() || isBot(t);
  $('panelA').innerHTML = teamPanel(0);
  $('panelB').innerHTML = teamPanel(1);
  $('cipler').innerHTML = FILTERS.map((f) => `<button type="button" data-filtre="${f}" aria-pressed="${S.filter === f}">${f === 'Uygun' ? 'Boş yerime uyan' : f}</button>`).join('');
  $('liste').innerHTML = poolList();
  // phone tabs: follow the team whose turn it is unless the user is browsing the pool
  document.querySelectorAll('[data-sekme]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sekme === S.tab)));
  $('panelA').classList.toggle('acik', S.tab === 'A');
  $('panelB').classList.toggle('acik', S.tab === 'B');
  $('panelHavuz').classList.toggle('acik', S.tab === 'havuz');
  document.querySelectorAll('[data-sekme="A"]').forEach((b) => { b.textContent = S.teams[0].name; });
  document.querySelectorAll('[data-sekme="B"]').forEach((b) => { b.textContent = S.teams[1].name; });
}

// ── interaction ──
$('liste').addEventListener('click', (e) => {
  const li = e.target.closest('.oy'); if (!li || !S || isBot(cur())) return;
  const id = li.dataset.id, t = cur(), p = HAVUZ_BY_ID[id];
  if (!bestSlot(t, p)) return;
  const fits = emptySlots(t).filter(({ mevki }) => uygun(p, mevki));
  const kinds = new Set(fits.map((f) => f.mevki));
  if (kinds.size === 1) { place(t, id); return; }                     // only one kind of slot: place at once
  S.selected = id; S.tab = t === 0 ? 'A' : 'B'; render();              // several: let the user choose on the pitch
});
$('liste').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.closest('.oy')) e.target.click(); });
document.addEventListener('click', (e) => {
  const y = e.target.closest('[data-yer]'); if (!y || !S?.selected) return;
  place(cur(), S.selected, y.dataset.yer);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.closest?.('[data-yer]')) e.target.click(); });
document.addEventListener('change', (e) => {
  const sel = e.target.closest('[data-dizilis]'); if (!sel) return;
  const t = Number(sel.dataset.dizilis), old = S.teams[t].formation;
  if (!changeFormation(t, sel.value)) { alert('Seçtiğin oyuncular bu dizilişe sığmıyor. Başka bir diziliş dene.'); sel.value = old; return; }
  S.last = null; render();
});
$('cipler').addEventListener('click', (e) => { const b = e.target.closest('[data-filtre]'); if (!b) return; S.filter = b.dataset.filtre; render(); });
$('ara').addEventListener('input', (e) => { S.query = e.target.value; $('liste').innerHTML = poolList(); });
document.querySelectorAll('[data-sekme]').forEach((b) => b.addEventListener('click', () => { S.tab = b.dataset.sekme; render(); }));
$('otomatik').addEventListener('click', () => { const t = cur(); const c = choose(t, 'orta'); if (c) place(t, c.p.id, c.slot); });

// ── end: the tactics screen (bot keeps the plan of its draft style), then the match ──
function finish() {
  const data = { mod: S.mod, home: { ...S.teams[0], bot: false }, away: { ...S.teams[1], bot: isBot(1), plan: STYLE[S.style].plan } };
  try { sessionStorage.setItem('draftxi-mac', JSON.stringify(data)); } catch { /* the tactics screen shows a link back */ }
  location.href = './taktik.html';
}
