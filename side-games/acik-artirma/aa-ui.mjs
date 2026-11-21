// NEON XI — Açık Artırma: screens and animations. Rules live in oyun.mjs, topics in konular.mjs, the judge in hakem.mjs.
// Modes: same phone, and online 1v1 through the NEON XI lobby (party launch, random match, rally) on the shared
// Firebase room transport (career-twin/firebase-peer-shim-v1.js, rooms/AA-<code>).
// Online: the host's device runs the rules (oyun.mjs). The guest sends the move it wants ({c:'try'}); the host checks it
// is the guest's turn and a legal move, then sends every applied move ({c:'mv'}) to the guest, so both screens replay the
// same move list on the same starting state. Timeouts are decided by the host only.
// The AI judge is called through the Worker in HAKEM_URL. Until it exists the players pick the winner themselves
// (same phone: one tap; online: both vote, a disagreement is a draw) — never a silent random verdict.
import { KONULAR } from './konular.mjs';
import { yeniOyun, hamle, secenekler, oynanabilir, harcanan, BUTCE, SECIM, MADDE } from './oyun.mjs';
import { hakemCevabi } from './hakem.mjs';
import { hakemSec, pikselSVG } from './hakemler.mjs';

const HAKEM_URL = 'https://neonxi-hakem.erenkynk50.workers.dev'; // Cloudflare Worker (worker/README.md); boşken hakem bağlı değil.
const SURE = 10; // saniye / hamle

const app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wait = (ms) => new Promise((r) => setTimeout(r, reduced() ? Math.min(ms, 60) : ms));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const buzz = (p) => { try { navigator.vibrate?.(p); } catch {} };
const store = {
  get(k, d) { try { const v = localStorage.getItem('nxAA:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('nxAA:' + k, JSON.stringify(v)); } catch {} },
};
const KONU_LISTESI = oynanabilir(KONULAR);
// NEON para: the coin image next to every amount (alt text keeps it readable for screen readers).
const NP = '<img class="aa-np" src="./assets/neon-para.webp" alt=" NEON para" width="96" height="96" decoding="async">';
const np = (n) => `${n}${NP}`;

const UI = { adlar: store.get('adlar', ['Oyuncu 1', 'Oyuncu 2']), sonKonu: store.get('sonKonu', null) };
let S = null; // oyun durumu
let busy = false;
let oylama = false; // the AI judge did not answer: the players decide (vote online)
let hakemHatasi = ''; // short reason shown when the judge fails (status + Worker message), for diagnosis
let timer = { id: 0, end: 0 };

/* ───────────── online state ───────────── */
const Q = new URLSearchParams(location.search);
const AUTO = Q.get('nxAuto') === '1' && /^\d{4}$/.test(Q.get('nxCode') || '') ? {
  role: Q.get('nxRole') === 'host' ? 'host' : 'guest', code: Q.get('nxCode'), uid: String(Q.get('nxUid') || '').slice(0, 64),
  name: String(Q.get('nxName') || 'NEON Oyuncu').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 14) || 'NEON Oyuncu', match: Q.get('nxMatch') || '',
} : null;
const PREFIX = 'neonxi-auction-';
const NET = { role: 'off', peer: null, conn: null, me: 0, uids: ['', ''], started: false, queue: Promise.resolve(), votes: [null, null], final: undefined, reported: false };
const online = () => NET.role !== 'off';
const cleanName = (v) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 14) || 'Rakip';
const send = (m) => { try { NET.conn?.send(m); } catch (e) { console.warn('Açık Artırma', e); } };
const enqueue = (fn) => { NET.queue = NET.queue.then(fn).catch((e) => console.warn('Açık Artırma', e)); return NET.queue; };

/* ───────────── menu ───────────── */
// Menu: the shared NEON XI side-game menu (sidegame-skin-v2.css .sgm), the same as EN 11 / XOX / Imposter / Re:Verse.
// The skin class is only on <body> while the menu is shown, so the game screens keep their own type and backdrop.
const SGM_ICONS = {
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10 5h4M11 18.5h2"/>',
  friends: '<circle cx="9" cy="8.5" r="3.1"/><path d="M3.5 20v-2c0-3.5 2.3-5.4 5.5-5.4s5.5 1.9 5.5 5.4v2M17 6a3 3 0 0 1 0 5.8m1.2 2c2 .6 3 2.2 3 4.6V20"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5M8 10.5h5m-2.5-2.5v5"/>',
  arrow: '<path d="m9 6 6 6-6 6"/>',
};
const sgmIcon = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${SGM_ICONS[n]}</svg>`;
const sgmMode = (view, label, detail, icon, disabled) => `<button type="button" class="sgm-mode"${disabled ? ' disabled' : ` data-view="${view}"`} aria-label="${esc(label + '. ' + detail)}"><span class="sgm-mode-icon">${sgmIcon(icon)}</span><span class="sgm-mode-copy"><strong>${esc(label)}</strong><small>${esc(detail)}</small></span>${disabled ? '<span class="sgm-soon">YAKINDA</span>' : `<span class="sgm-mode-arrow">${sgmIcon('arrow')}</span>`}</button>`;
const sgmFrame = (inner) => `<div class="sgm"><a class="sgm-logo" href="../index.html" aria-label="Yan oyunlara dön"><img src="../../assets/ui/logo-neon-xi.svg" alt="NEON XI"><span>YAN OYUNLAR</span></a>
  <div class="sgm-hero"><h1>AÇIK <span>ARTIRMA</span></h1></div>
  <img class="sgm-emblem" src="../assets/auction-emblem-v1.svg" alt="" aria-hidden="true" decoding="async" draggable="false">${inner}</div>`;

function setSkin(on) { document.body.classList.toggle('sg-skin', on); document.body.classList.toggle('sg-auction', on); }

function menu(view = 'modes') {
  stopTimer();
  setSkin(true);
  let inner;
  if (view === 'local') {
    inner = `<section class="sgm-panel" aria-label="Tek telefon"><h2 class="sgm-heading">TEK TELEFON<button type="button" class="sgm-back" id="aaMenuBack">← GERİ</button></h2><div class="sgm-sheet">
      <div class="sgm-field"><label for="aaN0">1. OYUNCU</label><input id="aaN0" maxlength="14" placeholder="Oyuncu 1" value="${esc(UI.adlar[0])}" autocomplete="off"></div>
      <div class="sgm-field"><label for="aaN1">2. OYUNCU</label><input id="aaN1" maxlength="14" placeholder="Oyuncu 2" value="${esc(UI.adlar[1])}" autocomplete="off"></div>
      <button type="button" class="sgm-btn primary" id="aaPlay">OYUNU BAŞLAT</button>
      <p class="sgm-note">Aynı telefonda sırayla teklif verirsiniz. Konu her maçta rastgele gelir.</p></div></section>`;
  } else {
    inner = `<section class="sgm-panel" aria-label="Oyun modu seç"><h2 class="sgm-heading">OYUN MODUNU SEÇ</h2><div class="sgm-grid">
      ${sgmMode('local', 'TEK TELEFON', 'Aynı cihazda sırayla teklif verin', 'phone')}
      ${sgmMode('friends', 'ARKADAŞLARINLA OYNA', 'Partini kur, arkadaşını davet et', 'friends')}
      ${sgmMode('match', 'RAKİP ARA', 'Çevrimiçi bir rakiple eşleş', 'search')}
      </div></section>
      <section class="sgm-how" aria-label="Nasıl oynanır"><div class="sgm-how-badge" aria-hidden="true">?</div><div><h3>NASIL OYNANIR?</h3><p>Konudan ${MADDE} madde sırayla açık artırmaya çıkar. Açan en az 1 NP ile açar; sıra gelen +1/+2/+3 der ya da pas geçer. ${SECIM} seçimini topla; en iyi seti hakem seçer. ↓ işaretli ters konularda en kötüyü toplayan kazanır.</p></div></section>`;
  }
  app.innerHTML = sgmFrame(inner);
  app.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.view;
    if (v === 'friends' || v === 'match') social(v); else menu(v);
  }));
  document.getElementById('aaMenuBack')?.addEventListener('click', () => menu());
  document.getElementById('aaPlay')?.addEventListener('click', () => {
    UI.adlar = [0, 1].map((i) => document.getElementById('aaN' + i).value.trim().slice(0, 14) || `Oyuncu ${i + 1}`);
    store.set('adlar', UI.adlar);
    baslat();
  });
  window.scrollTo(0, 0);
}

// Online modes go through the NEON XI lobby (party + broker, or the matchmaking queue), like every other side game.
function social(choice) {
  if (window.NEON_SOCIAL?.chooseMode) window.NEON_SOCIAL.chooseMode('auction', choice).catch((e) => console.warn(e));
  else window.NEON_SOCIAL?.open?.('play');
}

// Konu her zaman rastgele gelir (seçilemez), ama torba usulü: her konu bir kez çıkmadan hiçbiri tekrar gelmez.
// Torba boşalınca yeniden dolar; bir önceki konu yeni turun ilk konusu olmaz. Kalanlar cihazda saklanır.
function konuSec() {
  const ids = new Set(KONU_LISTESI.map((k) => k.id));
  let torba = store.get('torba', []).filter((id) => ids.has(id));
  if (!torba.length) torba = [...ids];
  let aday = torba.length > 1 ? torba.filter((id) => id !== UI.sonKonu) : torba;
  const id = aday[Math.floor(Math.random() * aday.length)];
  store.set('torba', torba.filter((x) => x !== id));
  UI.sonKonu = id; store.set('sonKonu', id);
  return KONU_LISTESI.find((k) => k.id === id);
}

/* ───────────── game ───────────── */
async function baslat() {
  S = yeniOyun({ konu: konuSec(), adlar: UI.adlar });
  await oyunAkisi();
}

async function oyunAkisi() {
  S.olaylar = [];
  S.hakem = hakemSec(S.maddeler);  // same on both screens online (derived from the items)
  oylama = false;
  busy = true;
  setSkin(false);
  oyunEkrani();
  window.scrollTo(0, 0);
  await konuTanitimi();
  await maddeGir({ i: 0, madde: S.maddeler[0] });
  sirayiBaslat();
}

function konuTanitimi() {
  return new Promise((resolve) => {
    const k = S.konu;
    const acan = S.tur.acan;
    const el = document.createElement('div');
    el.className = 'aa-intro';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Konu');
    el.innerHTML = `<small>KONU</small><h2>${esc(k.baslik)}</h2>
      <span class="aa-dir ${k.yon}">${k.yon === 'kotu' ? '↓ EN KÖTÜYÜ TOPLAYAN KAZANIR' : '↑ EN İYİYİ TOPLAYAN KAZANIR'}</span>
      <p class="aa-who-first p${acan}">İlk maddeyi <b>${esc(adi(acan))}</b> açıyor</p>
      ${online() ? '<p class="aa-who-first">Açık artırma birazdan başlıyor…</p>' : '<button type="button" class="aa-play">HADİ BAŞLAYALIM</button>'}`;
    document.body.append(el);
    const kapat = () => { if (!el.isConnected) return; el.classList.add('out'); setTimeout(() => { el.remove(); resolve(); }, 330); };
    // Online both screens close the intro on a timer, so neither player's clock starts while the other still reads.
    if (online()) setTimeout(kapat, reduced() ? 600 : 3400);
    else {
      el.querySelector('button').addEventListener('click', kapat, { once: true });
      setTimeout(() => el.querySelector('button')?.focus(), 1100);
    }
  });
}

const adi = (i) => (online() && i === NET.me ? `${S.oyuncular[i].ad} (SEN)` : S.oyuncular[i].ad);

function slotHTML(p, k) {
  return Array.from({ length: SECIM }, (_, i) => {
    const m = p.secimler[i];
    return m ? `<div class="aa-slot full" data-s="${k}-${i}"><b>${esc(m.ad)}</b><em>${m.fiyat ? np(m.fiyat) : 'BEDAVA'}</em></div>`
      : `<div class="aa-slot" data-s="${k}-${i}">${i + 1}</div>`;
  }).join('');
}

function oyunEkrani() {
  const k = S.konu;
  const side = (i) => `<aside class="aa-side p${i}" aria-label="${esc(S.oyuncular[i].ad)} kadrosu">
      <div class="aa-who" id="aaWho${i}"><span>${esc(online() && i === NET.me ? 'SEN' : S.oyuncular[i].ad)}</span><div class="aa-money" id="aaMoney${i}">${np(S.oyuncular[i].para)}</div></div>
      ${slotHTML(S.oyuncular[i], i)}</aside>`;
  app.innerHTML = `
  <div class="aa-game">
    <div class="aa-hud">
      <button type="button" class="aa-back" id="aaQuit" aria-label="Oyundan çık">‹</button>
      <div class="aa-topic"><b>${esc(k.baslik)}</b><small class="${k.yon === 'kotu' ? 'ters' : ''}">${k.yon === 'kotu' ? '↓ EN KÖTÜYÜ TOPLA' : '↑ EN İYİYİ TOPLA'}</small></div>
      <div class="aa-count" aria-live="polite"><span id="aaCount">1<small>/${MADDE}</small></span></div>
    </div>
    <div class="aa-board">
      ${side(0)}
      <section class="aa-stage" aria-live="polite">
        <article class="aa-card" id="aaCard"></article>
        <div class="aa-bid" id="aaBid">
          <svg viewBox="0 0 132 132" aria-hidden="true"><circle class="bg" cx="66" cy="66" r="58"/><circle class="fg" id="aaRing" cx="66" cy="66" r="58" stroke-dasharray="364.4" stroke-dashoffset="0"/></svg>
          <div class="aa-bid-in"><small>TEKLİF</small><div class="aa-bid-num" id="aaBidNum">–</div><div class="aa-bid-who" id="aaBidWho">AÇILIŞ</div></div>
        </div>
        <div class="aa-hist" id="aaHist"></div>
      </section>
      ${side(1)}
    </div>
    <div class="aa-actions" id="aaActions">
      <div class="aa-turn"><span id="aaTurn">—</span><span id="aaTime"></span></div>
      <div class="aa-btns">
        <button type="button" class="aa-btn pass" data-h="pas">PAS</button>
        ${[1, 2, 3].map((x) => `<button type="button" class="aa-btn raise" data-h="${x}">+${x}<small></small></button>`).join('')}
      </div>
    </div>
  </div>`;
  document.getElementById('aaQuit').addEventListener('click', () => {
    if (S.bitti || confirm(online() ? 'Maçtan çıkılsın mı? Rakibin maçı kazanır.' : 'Oyundan çıkılsın mı? Bu açık artırma kaybolur.')) { leaveOnline(); menu(); }
  });
  app.querySelectorAll('.aa-btn').forEach((b) => b.addEventListener('click', () => oyna(b.dataset.h)));
}

function kartiCiz(o) {
  const i = o.i;
  const m = o.madde;
  const card = document.getElementById('aaCard');
  card.className = 'aa-card';
  card.innerHTML = `<small>MADDE ${i + 1} / ${MADDE}</small><h2>${esc(m.ad)}</h2><p>${esc(m.kunye)}</p>`;
  void card.offsetWidth;
  card.classList.add('enter');
  document.getElementById('aaCount').innerHTML = `${i + 1}<small>/${MADDE}</small>`;
  document.getElementById('aaHist').innerHTML = '';
  teklifCiz(false, true);
}

function teklifCiz(bump, bos) {
  const t = bos ? null : S.tur;
  const num = document.getElementById('aaBidNum');
  const who = document.getElementById('aaBidWho');
  const bid = document.getElementById('aaBid');
  if (!t || t.lider === null) {
    num.textContent = '–'; num.style.removeProperty('--lc');
    who.textContent = t && t.mod === 'tek' ? '1 NP\'YE AL YA DA PAS' : 'AÇILIŞ'; who.style.removeProperty('--lc');
  } else {
    const c = `var(--aa-p${t.lider})`;
    num.textContent = t.teklif; num.style.setProperty('--lc', c);
    who.textContent = S.oyuncular[t.lider].ad; who.style.setProperty('--lc', c);
    if (bump) { num.classList.remove('bump'); void num.offsetWidth; num.classList.add('bump'); }
  }
  bid.className = `aa-bid${S.tur ? ' p' + S.tur.sira : ''}`;
}

function teklifGoster(kim, teklif) {
  const num = document.getElementById('aaBidNum');
  const who = document.getElementById('aaBidWho');
  const c = `var(--aa-p${kim})`;
  num.textContent = teklif; num.style.setProperty('--lc', c);
  who.textContent = S.oyuncular[kim].ad; who.style.setProperty('--lc', c);
  num.classList.remove('bump'); void num.offsetWidth; num.classList.add('bump');
}

function siraCiz() {
  const sec = secenekler(S);
  const actions = document.getElementById('aaActions');
  [0, 1].forEach((i) => document.getElementById('aaWho' + i).classList.toggle('turn', !!sec && sec.kim === i));
  if (!sec) return;
  actions.className = `aa-actions p${sec.kim}`;
  const t = S.tur;
  const benim = !online() || sec.kim === NET.me;
  const kimde = online() ? (benim ? 'SEN' : S.oyuncular[sec.kim].ad) : S.oyuncular[sec.kim].ad;
  document.getElementById('aaTurn').textContent = `SIRA: ${kimde}${sec.tek ? ' · AL YA DA HEDİYE ET' : !sec.pas ? ' · AÇILIŞ' : ''}`;
  actions.querySelectorAll('.aa-btn.raise').forEach((b) => {
    const x = Number(b.dataset.h);
    const ok = !busy && benim && sec.artirimlar.includes(x);
    b.disabled = !ok;
    b.querySelector('small').textContent = sec.tek ? (x === 1 ? 'al: 1' : '') : `→ ${t.teklif + x}`;
  });
  const pas = actions.querySelector('.aa-btn.pass');
  pas.disabled = busy || !benim || !sec.pas;
  pas.title = sec.pas ? '' : 'Açılışta pas yok: en az 1 NP ile aç';
}

function sirayiBaslat() {
  if (S.bitti) return;
  busy = false;
  teklifCiz(false);
  siraCiz();
  timer.end = performance.now() + SURE * 1000;
  stopTimer();
  const ring = document.getElementById('aaRing');
  const time = document.getElementById('aaTime');
  const bid = document.getElementById('aaBid');
  const tick = () => {
    const left = Math.max(0, timer.end - performance.now());
    ring.setAttribute('stroke-dashoffset', String(364.4 * (1 - left / (SURE * 1000))));
    time.textContent = Math.ceil(left / 1000) + ' sn';
    bid.classList.toggle('hurry', left < 3000);
    if (left <= 0) {
      stopTimer();
      if (NET.role === 'guest') return;  // the host decides timeouts online
      const sec = secenekler(S);
      oyna(sec && !sec.pas ? String(sec.artirimlar[0]) : 'pas', true);
      return;
    }
    timer.id = requestAnimationFrame(tick);
  };
  timer.id = requestAnimationFrame(tick);
}
function stopTimer() { cancelAnimationFrame(timer.id); timer.id = 0; }

const gecerli = (sec, h) => !!sec && (h === 'pas' ? sec.pas : sec.artirimlar.includes(Number(h)));

// A move from this screen (button or timer). Online it is routed through the host.
function oyna(h, sureDoldu) {
  if (busy || !S || S.bitti) return;
  const sec = secenekler(S);
  if (!gecerli(sec, h)) return;
  if (!online()) { uygula(h, sureDoldu); return; }
  if (NET.role === 'host') {
    if (sec.kim !== 0 && !sureDoldu) return;
    busy = true;
    send({ c: 'mv', h, s: !!sureDoldu, n: S.i });
    enqueue(() => uygula(h, sureDoldu));
    return;
  }
  if (sec.kim !== NET.me || sureDoldu) return;
  busy = true;
  stopTimer();
  siraCiz();
  send({ c: 'try', h });
}

// Applies one move to the rules state and plays its animations; ends by starting the next turn.
async function uygula(h, sureDoldu) {
  if (!S || S.bitti) return;
  const sec = secenekler(S);
  if (!gecerli(sec, h)) return;
  const miktar = Number(h);
  busy = true;
  stopTimer();
  siraCiz();
  hamle(S, h === 'pas' ? { tip: 'pas' } : { tip: 'artir', miktar });
  buzz(h === 'pas' ? 8 : 14);
  for (const o of S.olaylar) {
    if (o.tip === 'teklif') {
      chip(o.kim, sureDoldu ? `süre doldu · ${o.teklif}` : `${adi(o.kim)} ${o.teklif}`);
      teklifGoster(o.kim, o.teklif);
      await wait(260);
    } else if (o.tip === 'pas') {
      chip(o.kim, sureDoldu ? 'süre doldu · pas' : `${adi(o.kim)} pas`, true);
      await wait(200);
    } else if (o.tip === 'satildi') {
      await satildi(o);
    } else if (o.tip === 'madde') {
      await maddeGir(o);
    } else if (o.tip === 'bitti') {
      await bitti();
      return;
    }
  }
  sirayiBaslat();
}

function chip(kim, text, pas) {
  const el = document.createElement('span');
  el.className = `aa-chip p${kim}${pas ? ' pas' : ''}`;
  el.textContent = text;
  const hist = document.getElementById('aaHist');
  hist.append(el);
  while (hist.children.length > 6) hist.firstElementChild.remove();
}

async function maddeGir(o) {
  kartiCiz(o);
  await wait(650);
}

const NEDEN = { dolu: 'SEÇİMİ DOLU', parasiz: 'PARA BİTTİ · SIRAYLA', hediye: 'HEDİYE' };

async function satildi(o) {
  const card = document.getElementById('aaCard');
  const free = o.fiyat === 0;
  const stamp = document.createElement('div');
  stamp.className = `aa-stamp ${free ? 'free' : 'p' + o.kim}`;
  stamp.innerHTML = free ? 'BEDAVA!' : `SATILDI · ${np(o.fiyat)}`;
  card.append(stamp);
  card.classList.add('sold');
  buzz(free ? [10, 30, 10] : 30);
  if (free && NEDEN[o.neden]) banner(`${NEDEN[o.neden]} → ${S.oyuncular[o.kim].ad}`, o.kim);
  await wait(free ? 900 : 650);
  await ucur(card, o);
  const money = document.getElementById('aaMoney' + o.kim);
  money.innerHTML = np(S.oyuncular[o.kim].para);
  if (!free) { money.classList.remove('bump'); void money.offsetWidth; money.classList.add('bump'); }
}

async function ucur(card, o) {
  const idx = app.querySelectorAll(`.aa-side.p${o.kim} .aa-slot.full`).length;
  const slot = app.querySelector(`[data-s="${o.kim}-${idx}"]`);
  const fill = () => {
    slot.className = 'aa-slot full land';
    slot.innerHTML = `<b>${esc(o.madde.ad)}</b><em>${o.fiyat ? np(o.fiyat) : 'BEDAVA'}</em>`;
  };
  if (!slot) return;
  if (reduced() || !card.animate) { fill(); return; }
  const a = card.getBoundingClientRect();
  const b = slot.getBoundingClientRect();
  const g = document.createElement('div');
  g.className = `aa-ghostcard p${o.kim}`;
  g.textContent = o.madde.ad;
  Object.assign(g.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
  document.body.append(g);
  card.style.visibility = 'hidden';
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const sx = b.width / a.width, sy = b.height / a.height;
  await g.animate([
    { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 40}px) scale(${(1 + sx) / 2}) rotate(${o.kim ? 6 : -6}deg)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy}) rotate(0)`, opacity: 0.9 },
  ], { duration: 620, easing: 'cubic-bezier(.5,0,.3,1)' }).finished.catch(() => {});
  g.remove();
  card.style.visibility = '';
  fill();
  await wait(200);
}

function banner(text, kim) {
  const el = document.createElement('div');
  el.className = `aa-banner p${kim}`;
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.remove(), 1250);
}

/* ───────────── end + judge ───────────── */
async function bitti() {
  stopTimer();
  busy = true;
  [0, 1].forEach((i) => document.getElementById('aaWho' + i).classList.remove('turn'));
  banner('AÇIK ARTIRMA BİTTİ!', 0);
  await wait(1300);
  sonuc();
}

function sonuc(karar) {
  const k = S.konu;
  const kazanan = karar ? karar.kazanan : null;
  const squad = (i) => {
    const p = S.oyuncular[i];
    return `<section class="aa-squad p${i}${kazanan === i ? ' winner' : ''}">
      <h3><span>${esc(p.ad)}</span><span>${np(harcanan(p))}</span></h3>
      ${p.secimler.map((m, j) => `<div class="aa-pick" style="--i:${j + i * 0.5}"><div><span>${esc(m.ad)}</span><em>${m.fiyat ? np(m.fiyat) : 'BEDAVA'}</em></div>
        ${karar?.yorumlar?.[m.ad] ? `<p>${esc(tarafAdlari(karar.yorumlar[m.ad], karar))}</p>` : ''}</div>`).join('')}
    </section>`;
  };
  const head = kazanan == null
    ? `<div class="aa-res-head"><small>${k.yon === 'kotu' ? '↓ EN KÖTÜYÜ TOPLAYAN KAZANIR' : 'SONUÇ'}</small><h2>${esc(k.baslik)}</h2><p>Kadrolar hazır. Söz hakemde.</p></div>`
    : kazanan === 'berabere'
      ? `<div class="aa-res-head"><small>OYLAR FARKLI</small><h2>BERABERE</h2><p>İkiniz farklı kazanan seçtiniz; maç berabere yazıldı.</p></div>`
      : `<div class="aa-res-head win p${kazanan}"><small>${karar.hakem ? esc(S.hakem.karari) : 'SİZİN KARARINIZ'}</small><h2>KAZANAN: ${esc(adi(kazanan))}</h2><p>${esc(k.baslik)}</p></div>`;
  setSkin(false);
  app.innerHTML = `
  <header class="aa-top">
    <button type="button" class="aa-back" id="aaHome" aria-label="Menüye dön">‹</button>
    <div class="aa-brand"><small>NEON XI</small><h1>AÇIK <i>ARTIRMA</i></h1></div><span></span>
  </header>
  <div class="aa-result">
    ${head}
    ${judgeHTML(karar)}
    <div class="aa-squads">${squad(0)}${squad(1)}</div>
    <div class="aa-end-btns">
      ${online() ? '<button type="button" class="aa-play" id="aaLobby">LOBİYE DÖN</button>' : '<button type="button" class="aa-play" id="aaNew">YENİ OYUN</button>'}
      <button type="button" class="aa-ghost" id="aaMenu">MENÜ</button>
    </div>
  </div>`;
  document.getElementById('aaHome').addEventListener('click', () => { leaveOnline(); menu(); });
  document.getElementById('aaNew')?.addEventListener('click', () => baslat());
  document.getElementById('aaLobby')?.addEventListener('click', () => { leaveOnline(); menu(); window.NEON_SOCIAL?.open?.('party'); });
  document.getElementById('aaMenu').addEventListener('click', () => { leaveOnline(); menu(); });
  app.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.pick);
    if (online()) { oyVer(i); return; }
    sonuc({ kazanan: i, hakem: false });
    konfeti(i);
  }));
  if (!karar && HAKEM_URL && !oylama) beklemeSatirlari();
  if (!karar && HAKEM_URL && !oylama && (!online() || NET.role === 'host')) hakemeSor();
  window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
}

// The judge only knows "Taraf 1 / Taraf 2"; show the players' names instead.
const tarafAdlari = (text, karar) => String(text ?? '').replace(/Taraf\s*([12])/g, (m, d) => {
  const kim = Array.isArray(karar?.sira) ? karar.sira[Number(d) - 1] : null;
  return kim === 0 || kim === 1 ? adi(kim) : m;
});

function judgeHTML(karar) {
  if (karar && karar.hakem) {
    const t = (x) => esc(tarafAdlari(x, karar));
    return `<section class="aa-judge"><div class="aa-judge-who">${pikselSVG(S.hakem, 0, 56, 'aa-px')}<div><h3>${esc(S.hakem.ad)}</h3><small>${esc(S.hakem.unvan)}</small></div></div><p class="aa-judge-quote">“${t(karar.ozet)}”</p>
      <div class="aa-cards2"><div class="rob"><small>YILIN SOYGUNU</small><b>${esc(karar.soygun.madde)}</b><span>${t(karar.soygun.neden)}</span></div>
      <div class="err"><small>EN PAHALI HATA</small><b>${esc(karar.hata.madde)}</b><span>${t(karar.hata.neden)}</span></div></div></section>`;
  }
  if (karar) return '';
  if (HAKEM_URL && !oylama) return beklemeHTML();
  const neden = oylama ? `Hakem şu an cevap veremedi${hakemHatasi && (!online() || NET.role === 'host') ? ` <small class="aa-judge-err">(${esc(hakemHatasi)})</small>` : ''}.` : 'Yapay zekâ hakem çok yakında burada olacak.';
  if (online()) {
    const oy = NET.votes[NET.me];
    return `<section class="aa-judge" id="aaJudge"><h3>NEON HAKEM</h3>
    <p>${neden} İkiniz de kazananı seçin: aynı kişiyi seçerseniz sonuç o olur, farklı seçerseniz maç berabere yazılır.</p>
    ${oy == null ? `<div class="aa-judge-btns">${[0, 1].map((i) => `<button type="button" class="p${i}" data-pick="${i}">${esc(adi(i))}</button>`).join('')}</div>`
      : `<p><b>${esc(adi(oy))}</b> dedin. Rakibinin oyu bekleniyor…</p><div class="aa-spin" aria-hidden="true"></div>`}</section>`;
  }
  return `<section class="aa-judge"><h3>NEON HAKEM</h3>
    <p>${neden} Kadroları karşılaştırın, kazananı siz seçin:</p>
    <div class="aa-judge-btns">${[0, 1].map((i) => `<button type="button" class="p${i}" data-pick="${i}">${esc(S.oyuncular[i].ad)}</button>`).join('')}</div></section>`;
}

// Firebase ID token for the judge Worker (it only answers signed-in players; guests sign in anonymously).
// The web config is public (same as every NEON XI page); it is not a secret.
const FB_CONFIG = { apiKey: 'AIzaSyBLpXHGGTHXykKrnu8_Hv1i71oc3tpTNvY', authDomain: 'neonxi.firebaseapp.com', databaseURL: 'https://neonxi-default-rtdb.europe-west1.firebasedatabase.app', projectId: 'neonxi', storageBucket: 'neonxi.firebasestorage.app', messagingSenderId: '667191549799', appId: '1:667191549799:web:1e40feacbee09ed7f3d9c2' };
async function kimlikJetonu() {
  const [appMod, authMod] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js'),
  ]);
  const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(FB_CONFIG);
  const auth = authMod.getAuth(app);
  let user = auth.currentUser || await new Promise((res) => {
    const off = authMod.onAuthStateChanged(auth, (u) => { off(); res(u); });
    setTimeout(() => res(auth.currentUser), 1500);
  });
  if (!user) user = (await authMod.signInAnonymously(auth)).user;
  return user.getIdToken();
}

// The Worker builds the judge prompt itself from topic + item ids (no free text), shuffles the two sides and returns
// { sira, karar }; hakemCevabi() checks the verdict and maps "Taraf 1/2" back to the players.
// Waiting for the verdict: the judge character "thinks" (pixel art, blinking, thought bubble, rotating lines).
function beklemeHTML() {
  const h = S.hakem;
  return `<section class="aa-judge aa-wait" id="aaJudge" aria-live="polite">
    ${h.gorsel ? `<img class="aa-wait-gif" src="${h.gorsel}" width="264" height="234" alt="${esc(h.ad)} düşünüyor">`
      : `<div class="aa-wait-stage">
      <div class="aa-bubble" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="aa-wait-px">${pikselSVG(h, 0, 132, 'aa-px f0')}${pikselSVG(h, 1, 132, 'aa-px f1')}</div>
    </div>`}
    <h3>${esc(h.ad)} DÜŞÜNÜYOR…</h3>
    <p id="aaWaitLine">${esc(h.satirlar[0])}</p>
    ${h.gorsel ? '<small class="aa-parodi">Yapay zekâ parodisi · sözler gerçek değildir</small>' : ''}
  </section>`;
}
function beklemeSatirlari() {
  let i = 0;
  const id = setInterval(() => {
    const el = document.getElementById('aaWaitLine');
    if (!el || !document.querySelector('.aa-wait')) { clearInterval(id); return; }
    i = (i + 1) % S.hakem.satirlar.length;
    el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    el.textContent = S.hakem.satirlar[i];
  }, 1800);
}

async function hakemeSor() {
  const taraflar = S.oyuncular.map((p) => ({ maddeler: p.secimler.map((m) => ({ ad: m.ad, kunye: m.kunye, fiyat: m.fiyat })) }));
  const govde = { konu: S.konu.id, hakem: S.hakem.id, taraflar: S.oyuncular.map((p) => p.secimler.map((m) => ({ id: m.id, fiyat: m.fiyat }))) };
  hakemHatasi = '';
  for (let deneme = 0; deneme < 2; deneme++) {
    try {
      let token;
      try { token = await kimlikJetonu(); } catch (e) { hakemHatasi = 'giriş yapılamadı'; throw e; }
      const ctl = new AbortController();
      const zaman = setTimeout(() => ctl.abort(), 100000); // the Worker tries up to a few models (40 s each at most)
      const r = await fetch(HAKEM_URL, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify(govde), signal: ctl.signal }).finally(() => clearTimeout(zaman));
      if (r.ok) {
        const cevap = await r.json();
        const k = Array.isArray(cevap?.sira) && hakemCevabi(cevap.karar, { sira: cevap.sira }, taraflar);
        if (k) { if (online()) { send({ c: 'karar', k }); rapor(k.kazanan); } sonuc({ ...k, hakem: true }); konfeti(k.kazanan); return; }
        hakemHatasi = 'cevap biçimi bozuk';
      } else {
        let x = {}; try { x = await r.json(); } catch {}
        hakemHatasi = `kod ${r.status}${x.durum ? '/' + x.durum : ''}${x.hata ? ': ' + x.hata : ''}${x.detay ? ' (' + x.detay + ')' : ''}`;
        if (r.status === 429 || r.status === 401 || r.status === 503 || r.status === 504) break;
      }
    } catch (e) {
      console.warn('NEON Hakem', e);
      if (!hakemHatasi) hakemHatasi = e?.name === 'AbortError' ? 'zaman aşımı' : 'bağlantı kurulamadı';
      if (e?.name === 'AbortError') break;  // a second full wait would only double the delay
    }
  }
  // No verdict after two tries: never a silent random result — the players decide (online: both vote).
  oylama = true;
  if (online()) send({ c: 'oylama' });
  sonuc();
}

function konfeti(kim) {
  if (reduced()) return;
  const el = document.createElement('div');
  el.className = 'aa-confetti';
  const renk = [kim ? '#ff9f43' : '#00e1ff', '#baff18', '#ffd23f', '#ffffff'];
  el.innerHTML = Array.from({ length: 70 }, () => `<i style="--x:${Math.random() * 100}vw;--dx:${(Math.random() - 0.5) * 160}px;--r:${Math.random() * 900 - 450}deg;--d:${1.6 + Math.random() * 1.4}s;--w:${Math.random() * 0.5}s;--c:${renk[Math.floor(Math.random() * renk.length)]}"></i>`).join('');
  document.body.append(el);
  buzz([20, 40, 20, 40, 60]);
  setTimeout(() => el.remove(), 3800);
}

/* ───────────── online ───────────── */
function lobiEkrani(msg, hata) {
  setSkin(true);
  const me = { name: AUTO.name };
  const list = NET.role === 'host' ? [me, NET.conn ? { name: NET.rakip || 'Rakip' } : null] : [{ name: NET.rakip || 'Maçı kuran' }, me];
  app.innerHTML = sgmFrame(`<section class="sgm-panel aa-lobby" aria-label="Maç odası"><h2 class="sgm-heading">${hata ? 'BAĞLANTI SORUNU' : 'MAÇ ODASI'}</h2><div class="sgm-sheet">
    <ul class="aa-lobby-list">${list.map((p, i) => `<li class="p${i}${p ? ' in' : ''}"><i></i><b>${p ? esc(p.name) : 'bekleniyor…'}</b>${i === 0 ? '<small>KURUCU</small>' : ''}</li>`).join('')}</ul>
    <p class="sgm-note">${esc(msg)}</p>
    ${hata ? '<button type="button" class="sgm-btn primary" id="aaBack">MENÜYE DÖN</button>' : ''}
  </div></section>`);
  document.getElementById('aaBack')?.addEventListener('click', () => { leaveOnline(); menu(); });
}

function hostOnline() {
  NET.role = 'host'; NET.me = 0; NET.uids = [AUTO.uid, ''];
  lobiEkrani('Rakibin bekleniyor…');
  if (!window.Peer) { lobiEkrani('Bağlantı modülü yüklenemedi.', true); return; }
  const peer = NET.peer = new window.Peer(PREFIX + AUTO.code, { debug: 0 });
  peer.on('error', (e) => { console.warn('Açık Artırma oda', e); if (!NET.started) lobiEkrani('Oda kurulamadı. Lobiden yeniden başlatabilirsin.', true); });
  peer.on('connection', (conn) => {
    conn.on('data', (m) => hostVeri(conn, m));
    conn.on('close', () => { if (conn === NET.conn) rakipGitti(); });
  });
  setTimeout(() => { if (NET.role === 'host' && !NET.started) lobiEkrani('Rakip odaya gelmedi.', true); }, 60000);
}

function hostVeri(conn, m) {
  if (!m || typeof m !== 'object') return;
  if (m.c === 'hello') {
    if (NET.started) { if (conn !== NET.conn) { try { conn.send({ c: 'full' }); } catch {} } return; }
    NET.conn = conn; NET.rakip = cleanName(m.name); NET.uids[1] = String(m.uid || '').slice(0, 64);
    NET.started = true;
    const konu = konuSec();
    S = yeniOyun({ konu, adlar: [AUTO.name, NET.rakip] });
    send({ c: 'start', konu: konu.id, maddeler: S.maddeler.map((x) => x.id), ilkAcan: S.ilkAcan, adlar: [AUTO.name, NET.rakip], uids: NET.uids });
    enqueue(() => oyunAkisi());
    return;
  }
  if (conn !== NET.conn) return;
  if (m.c === 'try') {
    // Checked when it is applied, in order: it must be the guest's turn and a legal move at that point.
    enqueue(() => {
      if (!S || S.bitti) return;
      const sec = secenekler(S);
      const h = m.h === 'pas' ? 'pas' : String(Number(m.h));
      if (!sec || sec.kim !== 1 || !gecerli(sec, h)) { send({ c: 'nope' }); return; }
      stopTimer();
      send({ c: 'mv', h, s: false, n: S.i });
      return uygula(h, false);
    });
    return;
  }
  if (m.c === 'vote') oyGeldi(1, m.v);
}

function guestOnline() {
  NET.role = 'guest'; NET.me = 1;
  lobiEkrani('Maç odasına bağlanılıyor…');
  if (!window.Peer) { lobiEkrani('Bağlantı modülü yüklenemedi.', true); return; }
  const peer = NET.peer = new window.Peer(undefined, { debug: 0 });
  let tries = 0;
  const fail = () => { if (!NET.started) lobiEkrani('Maç odasına bağlanılamadı. Lobiden yeniden dene.', true); };
  peer.on('error', () => { if (!NET.started) fail(); else hostGitti(); });
  peer.on('open', () => {
    const conn = NET.conn = peer.connect(PREFIX + AUTO.code, { reliable: true });
    conn.on('open', () => {
      const hello = () => { if (NET.conn !== conn || NET.started) return; if (++tries > 15) { fail(); return; } send({ c: 'hello', uid: AUTO.uid, name: AUTO.name }); setTimeout(hello, 4000); };
      hello();
    });
    conn.on('data', (m) => misafirVeri(m));
    conn.on('close', () => hostGitti());
  });
}

function misafirVeri(m) {
  if (!m || typeof m !== 'object') return;
  if (m.c === 'full') { lobiEkrani('Bu maç dolu.', true); return; }
  if (m.c === 'start' && !NET.started) {
    const konu = KONULAR.find((k) => k.id === m.konu);
    const maddeler = Array.isArray(m.maddeler) ? m.maddeler.map((id) => konu?.maddeler.find((x) => x.id === id)) : [];
    if (!konu || maddeler.length !== MADDE || maddeler.some((x) => !x)) { lobiEkrani('Oyun verisi uyuşmuyor. Sayfayı yenileyip tekrar dene.', true); return; }
    NET.started = true;
    NET.rakip = cleanName(m.adlar?.[0]);
    NET.uids = Array.isArray(m.uids) ? m.uids.map((u) => String(u || '').slice(0, 64)) : ['', AUTO.uid];
    S = yeniOyun({ konu, maddeler, adlar: [NET.rakip, AUTO.name], rnd: () => (m.ilkAcan === 1 ? 0.9 : 0.1) });
    enqueue(() => oyunAkisi());
    return;
  }
  if (!NET.started) return;
  if (m.c === 'mv') { const h = m.h === 'pas' ? 'pas' : String(Number(m.h)); enqueue(() => { stopTimer(); return uygula(h, !!m.s); }); return; }
  if (m.c === 'nope') { busy = false; siraCiz(); return; }
  if (m.c === 'final') { enqueue(() => sonOy(m.v)); return; }
  if (m.c === 'oylama') { enqueue(() => { if (NET.final === undefined) { oylama = true; sonuc(); } }); return; }
  if (m.c === 'karar' && m.k) { enqueue(() => { rapor(m.k.kazanan); sonuc({ ...m.k, hakem: true }); konfeti(m.k.kazanan); }); }
}

// Interim verdict until the AI judge is connected: both players vote; the host settles it.
function oyVer(v) {
  if (NET.votes[NET.me] != null || NET.final !== undefined) return;
  NET.votes[NET.me] = v;
  if (NET.role === 'host') oyGeldi(0, v); else send({ c: 'vote', v });
  sonuc();
}
function oyGeldi(pid, v) {
  if (NET.role !== 'host' || NET.final !== undefined || (v !== 0 && v !== 1)) return;
  NET.votes[pid] = v;
  if (NET.votes[0] == null || NET.votes[1] == null) return;
  const final = NET.votes[0] === NET.votes[1] ? NET.votes[0] : null;
  send({ c: 'final', v: final });
  enqueue(() => sonOy(final));
}
function sonOy(v) {
  if (NET.final !== undefined) return;
  NET.final = v;
  rapor(v);
  if (v === 0 || v === 1) { sonuc({ kazanan: v, hakem: false }); konfeti(v); } else sonuc({ kazanan: 'berabere', hakem: false });
}

// Online result → leaderboards and rally (neon-social.js / party-rally-v1.js listen).
function rapor(kazanan) {
  if (NET.reported || !AUTO?.match || document.querySelector('.nxff-end')) return;
  NET.reported = true;
  const result = kazanan === NET.me ? 'wins' : (kazanan === 0 || kazanan === 1) ? 'losses' : 'draws';
  document.dispatchEvent(new CustomEvent('neon-match-result', { detail: { matchId: AUTO.match, mode: 'auction', result, opponentUid: NET.uids[1 - NET.me] || '' } }));
}

function baglantiKoptu(baslik) {
  if (!S || NET.final !== undefined || document.querySelector('.nxff-end')) return;
  stopTimer(); busy = true;
  const el = document.createElement('div');
  el.className = 'aa-intro';
  el.innerHTML = `<small>BAĞLANTI</small><h2>${esc(baslik)}</h2><button type="button" class="aa-play" id="aaLost">LOBİYE DÖN</button>`;
  document.body.append(el);
  el.querySelector('#aaLost').addEventListener('click', () => { el.remove(); leaveOnline(); menu(); window.NEON_SOCIAL?.open?.('party'); });
}
function hostGitti() { if (NET.role === 'guest' && NET.started) baglantiKoptu('Maçı kuran oyuncuyla bağlantı kesildi'); }
function rakipGitti() {
  if (NET.role !== 'host') return;
  if (!NET.started) { NET.conn = null; lobiEkrani('Rakibin bekleniyor…'); return; }
  baglantiKoptu('Rakibin maçtan ayrıldı');
}

function leaveOnline() {
  if (!online()) return;
  stopTimer();
  try { NET.conn?.close(); } catch {} try { NET.peer?.destroy(); } catch {}
  Object.assign(NET, { role: 'off', peer: null, conn: null, me: 0, started: false, queue: Promise.resolve(), votes: [null, null], final: undefined });
  document.querySelectorAll('.aa-intro').forEach((x) => x.remove());
}

// A forfeit screen (social/match-forfeit-v1.js) ends the match: stop the clock.
new MutationObserver(() => { if (online() && document.querySelector('.nxff-end')) { stopTimer(); busy = true; } }).observe(document.body, { childList: true });
window.addEventListener('beforeunload', () => { try { NET.conn?.close(); } catch {} try { NET.peer?.destroy(); } catch {} });

if (AUTO) { if (AUTO.role === 'host') hostOnline(); else guestOnline(); } else menu();
