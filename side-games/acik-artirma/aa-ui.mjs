// NEON XI — Açık Artırma: screens and animations. Rules live in oyun.mjs, topics in konular.mjs, the judge in hakem.mjs.
// Modes: same phone (playable). Online 1v1 comes with the room sync. The AI judge is called through the Worker in
// HAKEM_URL; until it exists the players pick the winner themselves (never a silent random verdict).
import { KONULAR, TURLER } from './konular.mjs';
import { yeniOyun, hamle, secenekler, oynanabilir, harcanan, BUTCE, SECIM, MADDE } from './oyun.mjs';
import { hakemIstegi, hakemCevabi } from './hakem.mjs';

const HAKEM_URL = ''; // Cloudflare Worker adresi; boşken hakem bağlı değil.
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

const UI = { tur: store.get('tur', 'hepsi'), adlar: store.get('adlar', ['Oyuncu 1', 'Oyuncu 2']), sonKonu: store.get('sonKonu', null) };
let S = null; // oyun durumu
let busy = false;
let timer = { id: 0, end: 0 };

const GAVEL = `<svg class="aa-gavel" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="10" width="22" height="12" rx="3" transform="rotate(45 25 16)"/><path d="M30 26 48 44"/><path d="M10 54h26"/><path d="M14 48h18"/></svg>`;

/* ───────────── menu ───────────── */
function menu() {
  stopTimer();
  const turler = [['hepsi', 'Hepsi'], ...Object.entries(TURLER)];
  app.innerHTML = `
  <header class="aa-top">
    <a class="aa-back" href="../index.html" aria-label="Yan oyunlar">‹</a>
    <div class="aa-brand"><small>NEON XI</small><h1>AÇIK <i>ARTIRMA</i></h1></div><span></span>
  </header>
  <div class="aa-menu">
    <section class="aa-hero">
      ${GAVEL}
      <div class="aa-coins" aria-hidden="true"><span class="aa-coin">NP</span><span class="aa-coin">NP</span><span class="aa-coin">NP</span></div>
      <p>${BUTCE} NEON para, ${MADDE} madde, ${SECIM} seçim. En iyi seti topla; kararı yapay zekâ hakem versin.</p>
    </section>
    <section class="aa-box">
      <span class="aa-label">MOD</span>
      <div class="aa-modes">
        <button type="button" class="aa-mode" aria-pressed="true"><b>AYNI TELEFON</b><span>İki kişi, tek ekran</span></button>
        <button type="button" class="aa-mode" disabled><b>ONLINE 1V1</b><span>Yakında</span></button>
      </div>
      <div class="aa-names">
        <label class="aa-name p0"><span>1. OYUNCU</span><input id="aaN0" maxlength="14" value="${esc(UI.adlar[0])}" autocomplete="off"></label>
        <label class="aa-name p1"><span>2. OYUNCU</span><input id="aaN1" maxlength="14" value="${esc(UI.adlar[1])}" autocomplete="off"></label>
      </div>
    </section>
    <section class="aa-box">
      <span class="aa-label">KONU TÜRÜ</span>
      <div class="aa-types" role="group" aria-label="Konu türü">
        ${turler.map(([k, ad]) => `<button type="button" class="aa-type" data-tur="${k}" aria-pressed="${UI.tur === k}">${esc(ad)}</button>`).join('')}
      </div>
    </section>
    <button type="button" class="aa-play" id="aaPlay">BAŞLA</button>
    <details class="aa-box">
      <summary>NASIL OYNANIR</summary>
      <ol class="aa-rules">
        <li>Bir konu çıkar, konudan <b>${MADDE} madde</b> sırayla açık artırmaya gelir.</li>
        <li>Açan her maddede değişir. Açan, parası varsa <b>en az 1 NP</b> ile açmak zorunda.</li>
        <li>Sonra sıran gelince <b>+1 / +2 / +3</b> artır ya da <b>PAS</b> de. Pas diyen çekilir, son teklifi veren alır.</li>
        <li>${SURE} saniyede karar vermezsen pas sayılır (açılışta 1 NP ile açılır).</li>
        <li>Paran biterse rakibin almak istemediği maddeler sana bedava gelir. İkinizin de parası biterse kalan maddeler sırayla dağıtılır.</li>
        <li>${SECIM} seçimini dolduran artık almaz; kalanlar diğer oyuncuya gider.</li>
        <li><b>↓</b> işaretli ters konularda en kötüyü toplayan kazanır.</li>
      </ol>
    </details>
  </div>`;
  app.querySelectorAll('.aa-type').forEach((b) => b.addEventListener('click', () => {
    UI.tur = b.dataset.tur; store.set('tur', UI.tur);
    app.querySelectorAll('.aa-type').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
  document.getElementById('aaPlay').addEventListener('click', () => {
    UI.adlar = [0, 1].map((i) => document.getElementById('aaN' + i).value.trim().slice(0, 14) || `Oyuncu ${i + 1}`);
    store.set('adlar', UI.adlar);
    baslat();
  });
}

function konuSec(sabit) {
  if (sabit) return sabit;
  let havuz = KONU_LISTESI.filter((k) => UI.tur === 'hepsi' || k.tur === UI.tur);
  if (!havuz.length) havuz = KONU_LISTESI;
  if (havuz.length > 1) havuz = havuz.filter((k) => k.id !== UI.sonKonu);
  const k = havuz[Math.floor(Math.random() * havuz.length)];
  UI.sonKonu = k.id; store.set('sonKonu', k.id);
  return k;
}

/* ───────────── game ───────────── */
async function baslat(sabitKonu) {
  S = yeniOyun({ konu: konuSec(sabitKonu), adlar: UI.adlar });
  S.olaylar = [];
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
      <ol>${S.maddeler.map((m, i) => `<li style="--i:${i}">${esc(m.ad)}</li>`).join('')}</ol>
      <p class="aa-who-first p${acan}">İlk maddeyi <b>${esc(S.oyuncular[acan].ad)}</b> açıyor</p>
      <button type="button" class="aa-play">HADİ BAŞLAYALIM</button>`;
    document.body.append(el);
    el.querySelector('button').addEventListener('click', () => {
      el.classList.add('out');
      setTimeout(() => { el.remove(); resolve(); }, 330);
    }, { once: true });
    setTimeout(() => el.querySelector('button')?.focus(), 1900);
  });
}

function slotHTML(p, k) {
  return Array.from({ length: SECIM }, (_, i) => {
    const m = p.secimler[i];
    return m ? `<div class="aa-slot full" data-s="${k}-${i}"><b>${esc(m.ad)}</b><em>${m.fiyat ? m.fiyat + ' NP' : 'BEDAVA'}</em></div>`
      : `<div class="aa-slot" data-s="${k}-${i}">${i + 1}</div>`;
  }).join('');
}

function oyunEkrani() {
  const k = S.konu;
  const side = (i) => `<aside class="aa-side p${i}" aria-label="${esc(S.oyuncular[i].ad)} kadrosu">
      <div class="aa-who" id="aaWho${i}"><span>${esc(S.oyuncular[i].ad)}</span><div class="aa-money" id="aaMoney${i}">${S.oyuncular[i].para}<small> NP</small></div></div>
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
    if (S.bitti || confirm('Oyundan çıkılsın mı? Bu açık artırma kaybolur.')) menu();
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
  document.getElementById('aaTurn').textContent = `SIRA: ${S.oyuncular[sec.kim].ad}${sec.tek ? ' · AL YA DA HEDİYE ET' : !sec.pas ? ' · AÇILIŞ' : ''}`;
  actions.querySelectorAll('.aa-btn.raise').forEach((b) => {
    const x = Number(b.dataset.h);
    const ok = !busy && sec.artirimlar.includes(x);
    b.disabled = !ok;
    b.querySelector('small').textContent = sec.tek ? (x === 1 ? 'al: 1' : '') : `→ ${t.teklif + x}`;
  });
  const pas = actions.querySelector('.aa-btn.pass');
  pas.disabled = busy || !sec.pas;
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
    if (left <= 0) { stopTimer(); const sec = secenekler(S); oyna(sec && !sec.pas ? String(sec.artirimlar[0]) : 'pas', true); return; }
    timer.id = requestAnimationFrame(tick);
  };
  timer.id = requestAnimationFrame(tick);
}
function stopTimer() { cancelAnimationFrame(timer.id); timer.id = 0; }

async function oyna(h, sureDoldu) {
  if (busy || !S || S.bitti) return;
  const sec = secenekler(S);
  const miktar = Number(h);
  if (h !== 'pas' && !sec.artirimlar.includes(miktar)) return;
  if (h === 'pas' && !sec.pas) return;
  busy = true;
  stopTimer();
  siraCiz();
  hamle(S, h === 'pas' ? { tip: 'pas' } : { tip: 'artir', miktar });
  buzz(h === 'pas' ? 8 : 14);
  for (const o of S.olaylar) {
    if (o.tip === 'teklif') {
      chip(o.kim, sureDoldu ? `süre doldu · ${o.teklif}` : `${S.oyuncular[o.kim].ad} ${o.teklif}`);
      teklifGoster(o.kim, o.teklif);
      await wait(260);
    } else if (o.tip === 'pas') {
      chip(o.kim, sureDoldu ? 'süre doldu · pas' : `${S.oyuncular[o.kim].ad} pas`, true);
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
  stamp.textContent = free ? 'BEDAVA!' : `SATILDI · ${o.fiyat} NP`;
  card.append(stamp);
  card.classList.add('sold');
  buzz(free ? [10, 30, 10] : 30);
  if (free && NEDEN[o.neden]) banner(`${NEDEN[o.neden]} → ${S.oyuncular[o.kim].ad}`, o.kim);
  await wait(free ? 900 : 650);
  await ucur(card, o);
  const money = document.getElementById('aaMoney' + o.kim);
  money.innerHTML = `${S.oyuncular[o.kim].para}<small> NP</small>`;
  if (!free) { money.classList.remove('bump'); void money.offsetWidth; money.classList.add('bump'); }
}

async function ucur(card, o) {
  const idx = app.querySelectorAll(`.aa-side.p${o.kim} .aa-slot.full`).length;
  const slot = app.querySelector(`[data-s="${o.kim}-${idx}"]`);
  const fill = () => {
    slot.className = 'aa-slot full land';
    slot.innerHTML = `<b>${esc(o.madde.ad)}</b><em>${o.fiyat ? o.fiyat + ' NP' : 'BEDAVA'}</em>`;
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
      <h3><span>${esc(p.ad)}</span><span>${harcanan(p)} NP</span></h3>
      ${p.secimler.map((m, j) => `<div class="aa-pick" style="--i:${j + i * 0.5}"><div><span>${esc(m.ad)}</span><em>${m.fiyat ? m.fiyat + ' NP' : 'BEDAVA'}</em></div>
        ${karar?.yorumlar?.[m.ad] ? `<p>${esc(karar.yorumlar[m.ad])}</p>` : ''}</div>`).join('')}
    </section>`;
  };
  const head = kazanan == null
    ? `<div class="aa-res-head"><small>${k.yon === 'kotu' ? '↓ EN KÖTÜYÜ TOPLAYAN KAZANIR' : 'SONUÇ'}</small><h2>${esc(k.baslik)}</h2><p>Kadrolar hazır. Söz hakemde.</p></div>`
    : `<div class="aa-res-head win p${kazanan}"><small>${karar.hakem ? 'HAKEM KARARI' : 'SİZİN KARARINIZ'}</small><h2>KAZANAN: ${esc(S.oyuncular[kazanan].ad)}</h2><p>${esc(k.baslik)}</p></div>`;
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
      <button type="button" class="aa-play" id="aaAgain">RÖVANŞ</button>
      <button type="button" class="aa-ghost" id="aaNew">YENİ KONU</button>
    </div>
  </div>`;
  document.getElementById('aaHome').addEventListener('click', menu);
  document.getElementById('aaAgain').addEventListener('click', () => baslat(S.konu));
  document.getElementById('aaNew').addEventListener('click', () => baslat());
  app.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.pick);
    sonuc({ kazanan: i, hakem: false });
    konfeti(i);
  }));
  if (!karar && HAKEM_URL) hakemeSor();
  window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
}

function judgeHTML(karar) {
  if (karar && karar.hakem) {
    return `<section class="aa-judge"><h3>NEON HAKEM</h3><p class="aa-judge-quote">“${esc(karar.ozet)}”</p>
      <div class="aa-cards2"><div class="rob"><small>YILIN SOYGUNU</small><b>${esc(karar.soygun.madde)}</b><span>${esc(karar.soygun.neden)}</span></div>
      <div class="err"><small>EN PAHALI HATA</small><b>${esc(karar.hata.madde)}</b><span>${esc(karar.hata.neden)}</span></div></div></section>`;
  }
  if (karar) return '';
  if (HAKEM_URL) return `<section class="aa-judge" id="aaJudge"><h3>NEON HAKEM</h3><div class="aa-spin" aria-hidden="true"></div><p>Hakem kadroları inceliyor…</p></section>`;
  return `<section class="aa-judge"><h3>NEON HAKEM</h3>
    <p>Yapay zekâ hakem çok yakında burada olacak. Şimdilik kadroları karşılaştırın, kazananı siz seçin:</p>
    <div class="aa-judge-btns">${[0, 1].map((i) => `<button type="button" class="p${i}" data-pick="${i}">${esc(S.oyuncular[i].ad)}</button>`).join('')}</div></section>`;
}

async function hakemeSor() {
  const taraflar = S.oyuncular.map((p) => ({ maddeler: p.secimler.map((m) => ({ ad: m.ad, kunye: m.kunye, fiyat: m.fiyat })) }));
  const istek = hakemIstegi(S.konu, taraflar);
  for (let deneme = 0; deneme < 2; deneme++) {
    try {
      const r = await fetch(HAKEM_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ konu: S.konu.id, metin: istek.metin }) });
      if (r.ok) {
        const k = hakemCevabi(await r.json(), istek, taraflar);
        if (k) { sonuc({ ...k, hakem: true }); konfeti(k.kazanan); return; }
      }
    } catch {}
  }
  const box = document.getElementById('aaJudge');
  if (box) box.innerHTML = `<h3>NEON HAKEM</h3><p>Hakem şu an cevap veremedi; maç hakemsiz bitti ve sonuç kaydedilmedi.</p>
    <button type="button" class="aa-ghost" id="aaRetry">KARARI TEKRAR İSTE</button>`;
  document.getElementById('aaRetry')?.addEventListener('click', () => sonuc());
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

menu();
