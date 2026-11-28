// Draft XI — draft screen (design doc 16.12): snake order, 11 rounds, whole pool visible with position filter and
// search, every pick must fit an empty position (2.4), formation changeable during the draft, auto pick, bot
// opponent (16.13: easy / medium / hard) or two players on one phone. Ends on the tactics screen.
import { HAVUZ, HAVUZ_BY_ID } from '../data/havuz-fm.mjs?v=1';
import { autoFromUrl, connectRoom, clearOnline } from './online.mjs?v=1';
import { FORMATIONS, zonePoint } from '../engine/formations.mjs?v=2';
import { uygun, guc, kimya, MEVKI_GRUP, esc, ATTR_AD, ATTR_KISA, ANA_OZELLIK } from './ortak.mjs?v=4';
import { BOT_ADLARI } from './turnuva-ortak.mjs?v=2';

const $ = (id) => document.getElementById(id);
const STYLE = { // medium/hard bot: a playing style chosen at the start (16.13) → attributes it values and its plan
  hiz: { keys: ['pac', 'dri'], plan: 'kontra' }, pas: { keys: ['sp', 'vis', 'ft'], plan: 'tikitaka' },
  kanat: { keys: ['cro', 'pac', 'hed'], plan: 'kanat' }, pres: { keys: ['tac', 'str', 'pac'], plan: 'pres' },
};
const FORMS = Object.keys(FORMATIONS);
let S = null;

// ── setup ──
let mod = 'bot', zor = 'orta', boy = 8;   // boy: number of teams in a tournament (4 or 8)
// everyone starts on 4-3-3; the shape is changed in the team panel during the draft (it is not asked up front)
const START_FORM = '4-3-3';
// mode list → settings sheet (the shared NEON XI menu: .sgm in side-games/sidegame-skin-v2.css)
function openMode(m) {
  mod = m;
  $('ayarBaslik').textContent = { bot: 'BOTA KARŞI', iki: 'AYNI TELEFON', turnuva: 'TURNUVA' }[m];
  $('zorlukSatiri').hidden = m === 'iki';
  $('boySatiri').hidden = m !== 'turnuva';
  $('ayarNot').textContent = m === 'bot' ? 'Bot, draft başında bir oyun tarzı seçer ve ona göre oyuncu toplar. Takımın 4-3-3 ile başlar; dizilişi draft sırasında takım panelinden değiştirebilirsin.'
    : m === 'turnuva' ? 'Sen ve botlar aynı havuzdan yılan sırasıyla seçersiniz; her bot kendi oyun tarzıyla kadro kurar. Sonra eleme usulü turnuva: kendi maçlarını izlersin, diğerleri aynı motorla oynanır. Berabere biten maç penaltılarla biter.'
    : 'Seçim sırası gelen oyuncuya telefonu verin. İki takım da 4-3-3 ile başlar; diziliş draft sırasında değiştirilebilir.';
  $('modlar').hidden = true; $('nasil').hidden = true; $('ayar').hidden = false;
  $('basla').focus({ preventScroll: true });
}
document.querySelectorAll('[data-mod]').forEach((b) => b.addEventListener('click', () => openMode(b.dataset.mod)));
$('geri').addEventListener('click', () => { $('ayar').hidden = true; $('modlar').hidden = false; $('nasil').hidden = false; });
document.querySelectorAll('[data-boy]').forEach((b) => b.addEventListener('click', () => {
  boy = Number(b.dataset.boy);
  document.querySelectorAll('[data-boy]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
}));
document.querySelectorAll('[data-zor]').forEach((b) => b.addEventListener('click', () => {
  zor = b.dataset.zor;
  document.querySelectorAll('[data-zor]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
}));

function start(o = {}) {
  const styleKeys = Object.keys(STYLE), pickStyle = () => styleKeys[Math.floor(Math.random() * styleKeys.length)];
  if (o.names) mod = 'online';
  const teams = [
    { name: o.names?.[0] || (mod === 'bot' || mod === 'turnuva' ? 'Senin takımın' : 'Oyuncu 1'), formation: START_FORM, slots: {} },
    { name: o.names?.[1] || (mod === 'bot' ? `Bot (${{ kolay: 'Kolay', orta: 'Orta', zor: 'Zor' }[zor]})` : 'Oyuncu 2'), formation: mod === 'bot' ? FORMS[Math.floor(Math.random() * 6)] : START_FORM, slots: {} },
  ];
  if (mod === 'turnuva') {   // you + (boy-1) bots, each with its own name, shape and style
    const adlar = BOT_ADLARI.slice().sort(() => Math.random() - 0.5);
    teams.length = 1;
    for (let i = 1; i < boy; i++) teams.push({ name: adlar[i - 1], formation: FORMS[Math.floor(Math.random() * 6)], slots: {} });
  }
  S = {
    mod, zor, pick: 0, selected: null, filter: 'Tümü', query: '', tab: 'havuz',
    teams, style: pickStyle(), styles: teams.map(pickStyle), lastBot: 1,
    taken: new Set(),
  };
  $('kur').hidden = true; $('draft').hidden = false; S.listeAnim = true;
  render(); botMaybe(); saat();
}
$('basla').addEventListener('click', () => start());
// ONLINE: the shared NEON XI chooser (play with friends / random opponent) → lobby → back here with ?nxAuto=1
document.querySelector('[data-online]')?.addEventListener('click', () => {
  if (window.NEON_ARCADE_UI?.openChoice) window.NEON_ARCADE_UI.openChoice('draftxi');
  else alert('Online bağlantı yükleniyor, birazdan tekrar dene.');
});
// opened from the NEON XI home: ?mod=bot (against the bot) or ?mod=iki (two players on one phone) preselects the mode
{ const want = new URLSearchParams(location.search).get('mod'); if (want === 'bot' || want === 'iki' || want === 'turnuva') openMode(want); }

// ── draft order (snake: 1-2-…-N, N-…-2-1, …) ──
const NT = () => S.teams.length;
const round = () => Math.floor(S.pick / NT());
const cur = () => (round() % 2 === 0 ? S.pick % NT() : NT() - 1 - (S.pick % NT()));
const isBot = (t) => (S.mod === 'bot' && t === 1) || (S.mod === 'turnuva' && t !== 0);
const mine = (t) => !NET.on || t === NET.me;   // online: only your own team is yours to pick for
const done = () => S.pick >= 11 * NT();
// the second team panel: the opponent (tournament: the bot on the clock, or the last bot that picked)
const ikinci = () => (S.mod !== 'turnuva' ? 1 : cur() !== 0 && !done() ? cur() : S.lastBot);

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
  if (S.mod === 'turnuva' && t !== 0) S.lastBot = t;
  S.selected = null;
  if (!isBot(t) && mine(t)) S.tab = 'havuz';   // after your pick (also after choosing the slot on the pitch) back to the pool
  S.pick++;
  kartKapat();
  bildir(t, p, target);
  if (NET.on && NET.host) NET.send({ c: 'pick', id, slot: target.slot, n: S.pick - 1 });
  try { navigator.vibrate?.(20); } catch { /* ignore */ }
  if (done()) return finish();
  render(); botMaybe(); saat();
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
  const st = STYLE[S.styles?.[t] || S.style];
  // hard: aim at the opponent's weakest flank (slow full-backs → value pace on the wings)
  let paceBias = 0;
  if (level === 'zor') {
    const opp = S.teams[t === 0 ? 1 : 0];
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
    const t = cur(), c = choose(t, S.zor);
    if (c) place(t, c.p.id, c.slot);
  }, S.mod === 'turnuva' ? 240 : 650);
}

// ── rendering ──
function teamPanel(t) {
  const tm = S.teams[t], cls = t === 0 ? 'a' : 'b';
  const pickOf = S.mod === 'turnuva' ? `<span class="tur-no">${t + 1}/${NT()}</span>` : '';
  const players = Object.fromEntries(Object.entries(tm.slots).map(([s, id]) => [s, HAVUZ_BY_ID[id]]));
  const chem = kimya(tm.formation, players);
  const sel = S.selected && cur() === t ? HAVUZ_BY_ID[S.selected] : null;
  const count = Object.keys(tm.slots).length;
  const avgChem = count ? (Object.values(chem).reduce((a, b) => a + b, 0) / count).toFixed(1) : '0.0';
  const avgG = count ? Math.round(Object.entries(tm.slots).reduce((n, [s, id]) => n + guc(HAVUZ_BY_ID[id], FORMATIONS[tm.formation].find((x) => x[0] === s)[2]), 0) / count) : 0;
  const canEdit = !isBot(t) && mine(t);
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
      <span class="mv">${mevki}</span>${p ? `<span class="ad">${esc(p.name.split(' ').slice(-1)[0])}</span><span class="kim">Kimya ${chem[slot] ?? 0}</span>` : '<span class="ad bos-ad">—</span>'}</div>`;
  };
  const slots = lines.slice().reverse().map((ln) => `<div class="hat">${ln.map(card).join('')}</div>`).join('');
  return `<div class="${cls}" style="display:contents">
    <div class="th ${cls}"><b>${esc(tm.name)}</b>${pickOf}${canEdit ? `<select data-dizilis="${t}" aria-label="Diziliş">${FORMS.map((f) => `<option${f === tm.formation ? ' selected' : ''}>${f}</option>`).join('')}</select>` : `<span class="tur-no">${tm.formation}</span>`}</div>
    <div class="ozet"><span>Kadro <b>${count}/11</b></span><span>Kimya <b>${avgChem}</b></span></div>
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
    <span class="g gr-${MEVKI_GRUP[p.positions[0]]}">${p.positions[0]}</span><span class="n"><b>${esc(p.name)}</b><small>${esc(p.club)} · ${p.age} · ${p.foot === 'L' ? 'Sol' : 'Sağ'} ayak</small>
    <span class="oz">${(ANA_OZELLIK[p.positions[0]] || []).map((k) => `<span class="${seviye(p.attrs[k])}"><em>${ATTR_KISA[k]}</em>${p.attrs[k]}</span>`).join('')}</span></span>
    <span class="m">${p.positions.map((m) => `<i>${m}</i>`).join('')}</span></li>`).join('');
}

const seviye = (v) => (v >= 85 ? 'v1' : v >= 75 ? 'v2' : v >= 65 ? 'v3' : 'v4');

// ── player card: every attribute, where he fits, chemistry links with the team on the clock ──
const GRUPLAR = [['HÜCUM', ['fin', 'lon', 'hed', 'posn']], ['TEKNİK', ['dri', 'ft', 'sp', 'lp', 'cro', 'vis']], ['SAVUNMA', ['tac', 'mar']], ['FİZİK', ['pac', 'str']]];
const GK_GRUPLAR = [['KALECİLİK', ['ref', 'gpos', 'ghd', 'one']], ['OYUN KURMA', ['sp', 'lp', 'ft', 'vis']], ['FİZİK', ['pac', 'str']]];
function kartAc(id) {
  const p = HAVUZ_BY_ID[id]; if (!p || !S) return;
  const t = cur(), tm = S.teams[t], benim = !isBot(t) && mine(t), b = bestSlot(t, p), g = guc(p);
  const bag = Object.entries(tm.slots).map(([, oid]) => HAVUZ_BY_ID[oid]).map((o) => {
    const ortak = [o.nation === p.nation && 'ülke', o.club === p.club && 'kulüp', o.league === p.league && 'lig', (o.former || []).some((c) => c === p.club || (p.former || []).includes(c)) && 'eski takım'].filter(Boolean);
    return ortak.length ? { o, ortak } : null;
  }).filter(Boolean);
  const grup = (p.positions[0] === 'GK' ? GK_GRUPLAR : GRUPLAR).map(([ad, ks]) => `<div class="kg"><h4>${ad}</h4>${ks.map((k, i) => `<div class="kb ${seviye(p.attrs[k])}">
      <span>${ATTR_AD[k]}</span><b>${p.attrs[k]}</b><i style="--w:${p.attrs[k]}%;--d:${i * 40}ms"></i></div>`).join('')}</div>`).join('');
  $('kart').innerHTML = `<div class="kart-ic ${t === 0 ? 'a' : 'b'}" role="dialog" aria-modal="true" aria-labelledby="kartAd">
    <button type="button" class="kart-x" data-kapat aria-label="Kapat">×</button>
    <div class="kart-bas"><span class="kart-g gr-${MEVKI_GRUP[p.positions[0]]}">${p.positions[0]}</span>
      <div><h3 id="kartAd">${esc(p.name)}</h3><p>${esc(p.club)} · ${esc(p.league)}</p>
      <p class="kart-m">${p.positions.map((m) => `<i>${m}</i>`).join('')}<span>${esc(p.nation)} · ${p.age} yaş · ${p.height || '—'} cm · ${p.foot === 'L' ? 'Sol' : 'Sağ'} ayak (zayıf ${p.weakFoot || '—'}/5)</span></p></div></div>
    <div class="kart-gr">${grup}</div>
    <div class="kart-alt">${b ? `<p class="kart-yer">Takımına <b>${b.mevki}</b> olarak girer</p>` : `<p class="kart-yer yok">Takımında bu oyuncuya uyan boş yer yok.</p>`}
      ${bag.length ? `<p class="kart-bag">Kimya bağı: ${bag.map(({ o, ortak }) => `<b>${esc(o.name.split(' ').slice(-1)[0])}</b> (${ortak.join(', ')})`).join(' · ')}</p>` : ''}
      <button type="button" class="kart-al" data-al="${esc(p.id)}" ${b && benim ? '' : 'disabled'}>${benim ? 'KADROYA AL' : NET.on ? 'SIRA RAKİPTE' : 'SIRA BOTTA'}</button></div></div>`;
  $('kart').hidden = false;
  requestAnimationFrame(() => $('kart').classList.add('acik'));
  $('kart').querySelector('.kart-al:not(:disabled), .kart-x')?.focus({ preventScroll: true });
}
function kartKapat() { const k = $('kart'); if (!k || k.hidden) return; k.classList.remove('acik'); k.hidden = true; }

// ── pick banner: who went where (slides in, team colour) ──
let bildirimH = null;
function bildir(t, p, target) {
  const el = $('bildirim'); if (!el) return;
  el.className = 'dx-bildirim ' + (t === 0 ? 'a' : 'b');
  el.innerHTML = `<b>${target.mevki}</b><span>${esc(p.name)}</span>`;
  el.hidden = false; void el.offsetWidth; el.classList.add('gor');
  clearTimeout(bildirimH); bildirimH = setTimeout(() => { el.classList.remove('gor'); setTimeout(() => { el.hidden = true; }, 260); }, 1500);
}

function render() {
  if (!S) return;
  const t = cur();
  const who = S.teams[t].name;
  const siraKey = `${S.pick}:${t}`;
  $('sira').className = 'sira ' + (t === 0 ? 'a' : 'b') + (S.siraKey !== siraKey ? ' gel' : '');
  S.siraKey = siraKey;
  $('sira').innerHTML = done() ? 'Draft tamam' : (isBot(t) || !mine(t)) ? `${esc(who)} seçiyor<span class="dusun" aria-hidden="true"><i></i><i></i><i></i></span><small>${NET.on ? `Rakibin seçiyor<span id="saatEl">${saatYazi()}</span>` : S.mod === 'turnuva' ? `Sıradaki seçimin: ${siradaki()}` : 'Bot düşünüyor'}</small>`
    : `Sıra: ${NET.on ? 'SENDE' : esc(who)}<small>${S.bekliyor ? 'Seçimin iletiliyor…' : S.selected ? 'Sahada parlayan yere dokun ya da listeden başka oyuncu seç' : 'Bir oyuncu seç: en uygun boş yere yerleşir'}<span id="saatEl">${saatYazi()}</span></small>`;
  $('turNo').textContent = `Tur ${Math.min(11, round() + 1)}/11`;
  $('otomatik').disabled = done() || isBot(t) || !mine(t) || !!S.bekliyor;
  $('panelA').innerHTML = teamPanel(0);
  $('panelB').innerHTML = teamPanel(ikinci());
  $('cipler').innerHTML = FILTERS.map((f) => `<button type="button" data-filtre="${f}" aria-pressed="${S.filter === f}">${f === 'Uygun' ? 'Boş yerime uyan' : f}</button>`).join('');
  $('liste').innerHTML = poolList();
  $('liste').classList.toggle('gir', !!S.listeAnim); S.listeAnim = false;
  // phone tabs: follow the team whose turn it is unless the user is browsing the pool
  document.querySelectorAll('[data-sekme]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sekme === S.tab)));
  $('panelA').classList.toggle('acik', S.tab === 'A');
  $('panelB').classList.toggle('acik', S.tab === 'B');
  $('panelHavuz').classList.toggle('acik', S.tab === 'havuz');
  document.querySelectorAll('[data-sekme="A"]').forEach((b) => { b.textContent = S.teams[0].name; });
  document.querySelectorAll('[data-sekme="B"]').forEach((b) => { b.textContent = S.mod === 'turnuva' ? 'Rakipler' : S.teams[1].name; });
}

// ── interaction ──
$('liste').addEventListener('click', (e) => {
  const li = e.target.closest('.oy'); if (!li || !S) return;
  kartAc(li.dataset.id);
});
// "KADROYA AL" on the card: straight in when only one kind of slot fits, else glow the slots on the pitch
function al(id) {
  const t = cur(), p = HAVUZ_BY_ID[id];
  if (!S || isBot(t) || !mine(t) || !bestSlot(t, p)) return;
  const fits = emptySlots(t).filter(({ mevki }) => uygun(p, mevki));
  const kinds = new Set(fits.map((f) => f.mevki));
  if (kinds.size === 1) { sec(t, id); return; }                       // only one kind of slot: place at once
  kartKapat();
  S.selected = id; S.tab = t === 0 ? 'A' : 'B'; render();              // several: let the user choose on the pitch
}
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-al]')) { al(e.target.closest('[data-al]').dataset.al); return; }
  if (e.target.closest('[data-kapat]') || e.target.id === 'kart') kartKapat();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') kartKapat(); });
$('liste').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.closest('.oy')) e.target.click(); });
/** a pick made on this phone: offline straight in; online the host applies it, the guest asks the host */
function sec(t, id, slot) {
  if (!mine(t)) return false;
  if (NET.on && !NET.host) { NET.send({ c: 'try', id, slot: slot || null, n: S.pick }); S.selected = null; kartKapat(); bekle(true); return true; }
  return place(t, id, slot);
}
document.addEventListener('click', (e) => {
  const y = e.target.closest('[data-yer]'); if (!y || !S?.selected) return;
  sec(cur(), S.selected, y.dataset.yer);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.closest?.('[data-yer]')) e.target.click(); });
document.addEventListener('change', (e) => {
  const sel = e.target.closest('[data-dizilis]'); if (!sel) return;
  const t = Number(sel.dataset.dizilis), old = S.teams[t].formation;
  if (!mine(t)) { sel.value = old; return; }
  if (!changeFormation(t, sel.value)) { alert('Seçtiğin oyuncular bu dizilişe sığmıyor. Başka bir diziliş dene.'); sel.value = old; return; }
  if (NET.on) NET.send({ c: 'form', t, f: sel.value });
  S.last = null; render();
});
$('cipler').addEventListener('click', (e) => { const b = e.target.closest('[data-filtre]'); if (!b) return; S.filter = b.dataset.filtre; S.listeAnim = true; render(); });
$('ara').addEventListener('input', (e) => { S.query = e.target.value; $('liste').innerHTML = poolList(); });
document.querySelectorAll('[data-sekme]').forEach((b) => b.addEventListener('click', () => { S.tab = b.dataset.sekme; render(); }));
$('otomatik').addEventListener('click', () => { const t = cur(); if (!mine(t)) return; const c = choose(t, 'orta'); if (c) sec(t, c.p.id, c.slot); });

// tournament: how many picks until your turn
function siradaki() { for (let k = 1; k <= 2 * NT(); k++) { const p = S.pick + k, r = Math.floor(p / NT()), c = r % 2 === 0 ? p % NT() : NT() - 1 - (p % NT()); if (c === 0) return k === 1 ? 'hemen sonra' : `${k} seçim sonra`; } return '—'; }

// ── end: the tactics screen (bot keeps the plan of its draft style), then the match ──
function finish() {
  if (S.mod === 'turnuva') {   // the bracket page takes over: every team with its bot plan, the player's team first
    const turnuva = { zor: S.zor, teams: S.teams.map((tm, i) => ({ ...tm, bot: i !== 0, plan: i ? STYLE[S.styles[i]].plan : undefined })) };
    try { sessionStorage.setItem('draftxi-turnuva-yeni', JSON.stringify(turnuva)); } catch { /* the bracket page shows a link back */ }
    location.href = './turnuva.html?yeni=1'; return;
  }
  const data = { mod: S.mod, home: { ...S.teams[0], bot: false }, away: { ...S.teams[1], bot: isBot(1), plan: STYLE[S.style].plan },
    online: NET.on ? { ...NET.info, me: NET.me } : null };
  try { sessionStorage.setItem('draftxi-mac', JSON.stringify(data)); } catch { /* the tactics screen shows a link back */ }
  if (!NET.on) { location.href = './taktik.html'; return; }
  NET.bitti = true; clearTimeout(NET.saatH);
  render();
  setTimeout(() => { NET.room?.close(); location.href = './taktik.html'; }, 900);   // let the last pick reach the other phone
}

// ── online (host authoritative) ──
const PICK_SURE = 45;   // seconds per pick online; the host auto-picks when it runs out
const NET = { on: false, host: false, me: 0, info: null, room: null, send() {}, started: false, bitti: false, saatH: 0, saatBas: 0 };
const saatYazi = () => (NET.on && NET.started && !done() ? ` · ${Math.max(0, PICK_SURE - Math.floor((Date.now() - NET.saatBas) / 1000))} sn` : '');
function saat() {
  if (!NET.on || !S || done()) return;
  NET.saatBas = Date.now(); clearInterval(NET.saatI);
  NET.saatI = setInterval(() => { if (!S || done()) { clearInterval(NET.saatI); return; } const el = $('saatEl'); if (el) el.textContent = saatYazi(); }, 1000);
  clearTimeout(NET.saatH);
  if (NET.host) {
    const n = S.pick;
    NET.saatH = setTimeout(() => { if (!S || done() || S.pick !== n) return; const t = cur(); const c = choose(t, 'orta'); if (c) place(t, c.p.id, c.slot); }, PICK_SURE * 1000 + (cur() === 1 ? 1500 : 0));
  }
}
function bekle(on) { S.bekliyor = on; render(); }
function oda(liste, not, hata = false) {
  $('modlar').hidden = true; $('nasil').hidden = true; $('ayar').hidden = true; $('oda').hidden = false;
  $('odaBaslik').textContent = hata ? 'BAĞLANTI SORUNU' : 'MAÇ ODASI';
  $('odaListe').innerHTML = liste.map((x, i) => `<li class="${x ? 'in' : ''}"><i></i><b>${x ? esc(x) : 'bekleniyor…'}</b>${i === 0 ? '<small>KURUCU</small>' : ''}</li>`).join('');
  $('odaNot').textContent = not; $('odaGeri').hidden = !hata;
}
function koptu(text) {
  if (NET.bitti) return;
  clearTimeout(NET.saatH); clearInterval(NET.saatI);
  if (!NET.started) { oda([NET.info.name, null], text, true); return; }
  $('draft').hidden = true; $('kur').hidden = false;
  oda([S.teams[0].name, S.teams[1].name], `${text} Draft yarıda kaldı.`, true);
}
$('odaGeri').addEventListener('click', () => { NET.room?.close(); clearOnline(); location.href = '../index.html'; });
function hostData(m) {
  if (m.c === 'hello') {
    if (NET.started) { NET.send({ c: 'start', names: S.teams.map((x) => x.name), state: durum() }); return; }   // repeat (lost reply / reconnect)
    NET.started = true;
    const names = [NET.info.name, String(m.name || 'Rakip').replace(/[\u0000-\u001f<>]/g, '').slice(0, 16) || 'Rakip'];
    NET.info.opponent = NET.info.opponent || String(m.uid || '').slice(0, 64);
    start({ names });
    NET.send({ c: 'start', names, state: durum() });
    return;
  }
  if (!NET.started || !S) return;
  if (m.c === 'try') {
    if (cur() !== 1 || m.n !== S.pick || !HAVUZ_BY_ID[m.id] || S.taken.has(m.id) || !place(1, m.id, m.slot || undefined)) NET.send({ c: 'nope', state: durum() });
    return;
  }
  if (m.c === 'form' && m.t === 1 && FORMS.includes(m.f)) { if (changeFormation(1, m.f)) { S.last = null; render(); } NET.send({ c: 'state', state: durum() }); }
}
// the whole draft state, so a guest that missed something is put right
const durum = () => ({ pick: S.pick, forms: S.teams.map((x) => x.formation), slots: S.teams.map((x) => x.slots) });
function uygulaDurum(st) {
  if (!st || !S) return;
  S.pick = st.pick; S.teams.forEach((x, i) => { x.formation = st.forms[i]; x.slots = { ...st.slots[i] }; });
  S.taken = new Set(S.teams.flatMap((x) => Object.values(x.slots)));
  S.bekliyor = false;
  if (done()) { finish(); return; }
  render(); saat();
}
function guestData(m) {
  if (m.c === 'start') {
    if (!NET.started) { NET.started = true; start({ names: m.names }); }
    uygulaDurum(m.state); return;
  }
  if (!NET.started || !S) return;
  if (m.c === 'pick') {
    if (m.n === S.pick && HAVUZ_BY_ID[m.id]) { S.bekliyor = false; place(cur(), m.id, m.slot); }
    else if (m.n > S.pick) NET.send({ c: 'hello', name: NET.info.name, uid: NET.info.uid });   // missed one: ask for the state
    return;
  }
  if (m.c === 'nope') { uygulaDurum(m.state); return; }
  if (m.c === 'state') { uygulaDurum(m.state); return; }
  if (m.c === 'form' && m.t === 0 && FORMS.includes(m.f)) { if (changeFormation(0, m.f)) { S.last = null; render(); } }
}
{
  const info = autoFromUrl();
  if (info) {
    Object.assign(NET, { on: true, host: info.role === 'host', me: info.me, info });
    oda(NET.host ? [info.name, null] : ['Maçı kuran', info.name], NET.host ? 'Rakibin bekleniyor…' : 'Maç odasına bağlanılıyor…');
    NET.room = connectRoom(info, {
      onOpen() {
        if (NET.host) return;
        const hello = () => { if (NET.started || NET.bitti) return; NET.send({ c: 'hello', name: info.name, uid: info.uid }); setTimeout(hello, 3000); };
        hello();
      },
      onData: (m) => (NET.host ? hostData(m) : guestData(m)),
      onLost: koptu,
    }, 60000);
    NET.send = (m) => NET.room.send(m);
  }
}
