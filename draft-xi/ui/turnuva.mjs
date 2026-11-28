// Draft XI — tournament page: the knockout bracket. Your match → tactics screen → match screen → back here; every other
// match is played here by the same engine. Knocked out: the rest of the tournament can be played out at once.
import { HAVUZ_BY_ID } from '../data/havuz-fm.mjs?v=1';
import { kur, oyna, sonucYaz, ilerle, benimMac, elendi, kazanan, TUR_ADI } from './turnuva-ortak.mjs?v=2';
import { esc } from './ortak.mjs?v=4';

const $ = (id) => document.getElementById(id);
const KEY = 'draftxi-turnuva';
const oku = (k) => { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch { return null; } };
const yaz = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: the page still works until reload */ } };
const sil = (k) => { try { sessionStorage.removeItem(k); } catch { /* ignore */ } };

let st = oku(KEY);
const Q = new URLSearchParams(location.search);
if (Q.has('yeni')) {
  const y = oku('draftxi-turnuva-yeni');
  if (y?.teams?.length >= 4) { st = kur(y.teams, (Date.now() % 100000) + 1); st.zor = y.zor; yaz(KEY, st); }
  sil('draftxi-turnuva-yeni');
  history.replaceState(null, '', './turnuva.html');
}
const gecerli = st && Array.isArray(st.teams) && st.teams.every((t) => Object.values(t.slots || {}).length === 11 && Object.values(t.slots).every((id) => HAVUZ_BY_ID[id]));
if (!gecerli) { $('yok').hidden = false; throw new Error('no tournament'); }
$('ekran').hidden = false;

let son = null;   // the last round's results to show on top: { tur, mac (yours), list }

// your result from the match screen
{
  const r = oku('draftxi-turnuva-sonuc'), m = benimMac(st);
  if (r && m && r.tur === st.tur && m.seed === r.seed && m.kazanan == null && Array.isArray(r.skor)) {
    const d = oku('draftxi-mac'), benim = d && (m.a === 0 ? d.home : d.away);   // your tactic carries over to the next round
    if (benim?.tactic) { st.teams[0].tactic = benim.tactic; st.teams[0].plan = benim.plan; }
    sonucYaz(st, m, r.skor);
    turuBitir();
  }
  sil('draftxi-turnuva-sonuc');
}

/** plays the other matches of the round and moves on */
function turuBitir() {
  const tur = st.tur, list = st.turlar[tur];
  for (const m of list) if (m.kazanan == null && m.a !== 0 && m.b !== 0) oyna(st, m);
  son = { tur, list: list.map((m) => ({ ...m })) };
  ilerle(st); yaz(KEY, st);
}

const ad = (i) => esc(st.teams[i]?.name ?? '—');
const turAdi = (n) => TUR_ADI[n] || `${n} TAKIM`;
const skorYazi = (m) => (!m.skor ? 'v' : `${m.skor[0]} – ${m.skor[1]}${m.pen ? ` <small>(pen. ${m.pen.skor[0]}-${m.pen.skor[1]})</small>` : ''}`);
const sen = (i) => (i === 0 ? ' sen' : '');

function macKart(m) {
  if (!m) return '<div class="tv-mac bos"><span>—</span><span>—</span></div>';
  const w = kazanan(m), cls = (i) => `${sen(i)}${w == null ? '' : w === i ? ' kazandi' : ' elendi'}`;
  return `<div class="tv-mac${m.a === 0 || m.b === 0 ? ' benim' : ''}">
    <span class="tk${cls(m.a)}">${ad(m.a)}</span><b class="sk">${m.skor ? m.skor[0] : ''}</b>
    <span class="tk${cls(m.b)}">${ad(m.b)}</span><b class="sk">${m.skor ? m.skor[1] : ''}</b>
    ${m.pen ? `<small class="pen">Penaltılar ${m.pen.skor[0]}-${m.pen.skor[1]}</small>` : ''}</div>`;
}

function render() {
  const n0 = st.teams.length, cols = [];
  for (let n = n0, k = 0; n >= 2; n /= 2, k++) {
    const list = st.turlar[k] || Array.from({ length: n / 2 }, () => null);
    cols.push(`<div class="tv-tur"><h2>${turAdi(n)}</h2><div class="tv-tur-ic">${list.map(macKart).join('')}</div></div>`);
  }
  if (st.sampiyon != null) cols.push(`<div class="tv-tur sampiyon"><h2>ŞAMPİYON</h2><div class="tv-tur-ic"><div class="tv-kupa${sen(st.sampiyon)}">🏆<b>${ad(st.sampiyon)}</b></div></div></div>`);
  $('agac').innerHTML = cols.join('');

  // last round's results (your match first, with its penalties)
  if (son) {
    const mine = son.list.find((m) => m.a === 0 || m.b === 0);
    const diger = son.list.filter((m) => m !== mine);
    let baslik = '';
    if (mine) {
      const kaz = kazanan(mine) === 0;
      baslik = `<p class="tv-sonuc ${kaz ? 'iyi' : 'kotu'}">${kaz ? (st.sampiyon === 0 ? 'ŞAMPİYONSUN!' : 'TUR ATLADIN') : 'ELENDİN'}</p>
        <p class="tv-skor">${ad(mine.a)} <b>${skorYazi(mine)}</b> ${ad(mine.b)}</p>${mine.pen ? penSira(mine) : ''}`;
    }
    $('son').innerHTML = `<h2>${turAdi(son.list.length * 2)} SONUÇLARI</h2>${baslik}${diger.length ? `<ul class="tv-diger">${diger.map((m) => `<li><span>${ad(m.a)}</span><b>${skorYazi(m)}</b><span>${ad(m.b)}</span></li>`).join('')}</ul>` : ''}`;
    $('son').hidden = false;
  }

  // what to do now
  const m = benimMac(st), out = elendi(st);
  if (st.sampiyon != null) {
    $('durum').textContent = st.sampiyon === 0 ? 'Kupa senin! Draft ettiğin takım turnuvayı kazandı.' : `Turnuva bitti. Şampiyon: ${st.teams[st.sampiyon].name}.`;
    $('aksiyon').innerHTML = '<a class="tv-btn" href="./draft.html?mod=turnuva">YENİ TURNUVA</a>';
  } else if (out) {
    $('durum').textContent = 'Turnuvadan elendin. Kalan maçlar aynı motorla oynanabilir.';
    $('aksiyon').innerHTML = '<button type="button" class="tv-btn" id="kalan">KALAN MAÇLARI OYNAT</button><a class="tv-btn ikincil" href="./draft.html?mod=turnuva">YENİ TURNUVA</a>';
  } else if (m) {
    const rakip = m.a === 0 ? m.b : m.a;
    $('durum').innerHTML = `${turAdi(st.turlar[st.tur].length * 2)}: rakibin <b>${ad(rakip)}</b> (${esc(st.teams[rakip].formation)}).`;
    $('aksiyon').innerHTML = '<button type="button" class="tv-btn" id="hazirlan">MAÇINA HAZIRLAN</button>';
  }
}

function penSira(m) {
  const sira = (s) => m.pen.sira[s].map((x) => `<i class="${x.ok ? 'gol' : 'kacti'}" title="${esc(HAVUZ_BY_ID[x.id]?.name || '')}">${x.ok ? '●' : '○'}</i>`).join('');
  return `<div class="tv-pen"><span>${ad(m.a)}</span><span class="dz">${sira(0)}</span><span>${ad(m.b)}</span><span class="dz">${sira(1)}</span></div>`;
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#hazirlan')) {
    const m = benimMac(st); if (!m) return;
    const T = (i) => ({ ...st.teams[i] });
    yaz('draftxi-mac', { mod: 'turnuva', home: T(m.a), away: T(m.b), online: null, turnuva: { tur: st.tur, seed: m.seed } });
    location.href = './taktik.html';
  }
  if (e.target.closest('#kalan')) {
    $('durum').textContent = 'Maçlar oynanıyor…'; $('aksiyon').innerHTML = '';
    setTimeout(() => {
      while (st.sampiyon == null) turuBitir();
      render();
    }, 30);
  }
});
render();
