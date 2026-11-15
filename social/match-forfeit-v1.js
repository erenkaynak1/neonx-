/* NEON XI — forfeits for online 1v1 matches (Draft, XOX, Career Twin, EN 11).

   While a matched game is running, each player marks the match on their own presence node:
     social/presence/{uid}/match = {id, at}            (removed automatically when the connection drops)
   and watches the opponent's. The guard arms once both players have been seen in the same match.

   * Leaving on purpose (a link, the back button, closing the tab): a warning says the player will lose by
     forfeit. Confirming marks {left:true}, records the loss and leaves; the opponent wins at once.
   * Connection lost: the opponent sees the mark disappear and gets a countdown. If the player is not back
     within GRACE_MS, the opponent wins by forfeit, the game is ended for them, and their mark gets
     {wonByForfeit:true}. The player who dropped records the loss when they reconnect or open the site again.
   * The guard stands down as soon as the game reports a normal result (neon-match-result).

   Stats are only ever written by each player for themselves (social/stats/{uid}), through NEON_SOCIAL's
   recordResult, with the match id `{nxMatch}:forfeit`. */
import {onDisconnect,onValue,ref,remove,serverTimestamp,set,update} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const GRACE_MS = 45000;
const STORE = 'nxActiveMatch';
const FORFEIT_MODES = new Set(['draft', 'xox', 'twin', 'en11']);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const readStore = uid => { try { return JSON.parse(localStorage.getItem(`${STORE}:${uid}`) || 'null'); } catch { return null; } };
const writeStore = (uid, v) => { if (!uid) return; try { v ? localStorage.setItem(`${STORE}:${uid}`, JSON.stringify(v)) : localStorage.removeItem(`${STORE}:${uid}`); } catch {} };

export function initForfeit({ db, auth, mode, recordResult, getProfile, onAuth }) {
  const q = new URLSearchParams(location.search);
  const match = q.get('nxMatch') || '', opponent = q.get('nxOpponent') || '';
  const size = Number(q.get('nxPartySize') || 2);
  const live = q.get('nxAuto') === '1' && match && opponent && size === 2 && q.get('nxTournament') !== '1' && FORFEIT_MODES.has(mode);

  // Report a result for this user once a profile exists (recordResult needs it).
  async function report(detail) {
    for (let i = 0; i < 100 && !getProfile(); i++) await new Promise(r => setTimeout(r, 200));
    if (!getProfile()) return false;
    try { await recordResult(detail); return true; } catch (e) { console.warn('Hükmen sonuç kaydedilemedi', e); return false; }
  }

  // A match left without a result on an earlier page: settle it as a forfeit loss.
  onAuth(user => {
    const old = user ? readStore(user.uid) : null;
    if (!old || (live && old.match === match)) return;
    writeStore(user.uid, null);
    report({ matchId: `${old.match}:forfeit`, opponentUid: old.opponent, mode: old.mode, result: 'losses' })
      .then(ok => ok && toast('Yarıda bıraktığın maç hükmen mağlubiyet olarak kaydedildi.'));
  });
  if (!live) return;

  const S = { uid: '', armed: false, done: false, seen: false, oppGoneAt: 0, timer: 0, tick: 0, connected: true, offs: [] };
  const finish = () => { S.done = true; S.armed = false; writeStore(S.uid, null); clearInterval(S.tick); clearTimeout(S.timer); hideBanner(); };

  // The game reported a normal result: no forfeit from here on.
  document.addEventListener('neon-match-result', e => {
    if (S.done || String(e.detail?.matchId || '').endsWith(':forfeit')) return;
    finish(); if (S.uid) update(ref(db, `social/presence/${S.uid}/match`), { finished: true }).catch(() => {});
  });

  onAuth(user => {
    S.offs.splice(0).forEach(off => { try { off(); } catch {} });
    S.uid = user?.uid || '';
    if (!user || S.done) return;
    const mine = ref(db, `social/presence/${user.uid}/match`);
    S.offs.push(onValue(ref(db, '.info/connected'), snap => {
      S.connected = snap.val() === true;
      if (!S.connected) return;
      onDisconnect(mine).remove().then(() => set(mine, { id: match, mode, at: serverTimestamp() })).catch(() => {});
    }));
    S.offs.push(onValue(ref(db, `social/presence/${opponent}/match`), snap => onOpponent(snap.val()), () => {}));
    // Refresh the mark now and then, so a write lost to a flaky connection does not leave the opponent unarmed.
    const beat = setInterval(() => { if (S.done) { clearInterval(beat); return; } if (S.connected) update(mine, { id: match, mode, at: serverTimestamp() }).catch(() => {}); }, 15000);
    S.offs.push(() => clearInterval(beat));
  });

  function arm() {
    if (S.armed || S.done) return;
    S.armed = true;
    writeStore(S.uid, { uid: S.uid, match, opponent, mode, at: Date.now() });
    history.pushState({ nxForfeitGuard: 1 }, '');
  }

  function onOpponent(v) {
    if (S.done) return;
    const here = v && v.id === match;
    if (here && v.wonByForfeit) { lostByForfeit(); return; }
    if (here && v.left) { wonByForfeit('Rakibin oyundan ayrıldı.'); return; }
    if (here && v.finished) { finish(); return; }
    if (here) { S.seen = true; arm(); S.oppGoneAt = 0; clearTimeout(S.timer); clearInterval(S.tick); hideBanner(); return; }
    if (!S.seen || S.oppGoneAt) return;
    // The opponent's mark disappeared: wait for them to come back.
    S.oppGoneAt = Date.now();
    showBanner();
    S.tick = setInterval(showBanner, 1000);
    S.timer = setTimeout(function check() {
      if (S.done || !S.oppGoneAt) return;
      if (!S.connected) { S.oppGoneAt = Date.now(); S.timer = setTimeout(check, GRACE_MS); return; } // it is us who is offline
      wonByForfeit('Rakibinin bağlantısı koptu ve geri dönmedi.');
    }, GRACE_MS);
  }

  async function wonByForfeit(reason) {
    if (S.done) return;
    finish();
    update(ref(db, `social/presence/${S.uid}/match`), { wonByForfeit: true }).catch(() => {});
    overlay('HÜKMEN GALİBİYET', `${esc(reason)} Maç bitti ve <b>hükmen galip</b> sayıldın.`, 'win');
    await report({ matchId: `${match}:forfeit`, opponentUid: opponent, mode, result: 'wins' });
  }

  async function lostByForfeit() {
    if (S.done) return;
    finish();
    overlay('HÜKMEN MAĞLUBİYET', 'Bağlantın uzun süre koptuğu için maç bitti ve <b>hükmen mağlup</b> sayıldın.', 'loss');
    await report({ matchId: `${match}:forfeit`, opponentUid: opponent, mode, result: 'losses' });
  }

  // Leaving on purpose.
  async function leave(go) {
    finish();
    try {
      await update(ref(db, `social/presence/${S.uid}/match`), { left: true });
      await onDisconnect(ref(db, `social/presence/${S.uid}/match`)).cancel();
    } catch {}
    await report({ matchId: `${match}:forfeit`, opponentUid: opponent, mode, result: 'losses' });
    setTimeout(() => remove(ref(db, `social/presence/${S.uid}/match`)).catch(() => {}), 4000);
    go();
  }

  document.addEventListener('click', e => {
    if (!S.armed || S.done || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = e.target.closest('a[href]'); if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const to = new URL(a.href, location.href);
    if (to.pathname === location.pathname && to.search === location.search) return; // in-page link
    e.preventDefault(); e.stopPropagation();
    confirmLeave(() => leave(() => { location.href = to.href; }));
  }, true);
  window.addEventListener('popstate', () => {
    if (!S.armed || S.done) return;
    history.pushState({ nxForfeitGuard: 1 }, '');
    confirmLeave(() => leave(() => history.go(-2)));
  });
  // Left through the browser's own leave prompt (or the page was closed): tell the opponent right away.
  // The loss itself is recorded on the next visit from the stored active match.
  window.addEventListener('pagehide', () => {
    if (S.armed && !S.done && S.uid) update(ref(db, `social/presence/${S.uid}/match`), { left: true }).catch(() => {});
  });
  window.addEventListener('beforeunload', e => {
    if (!S.armed || S.done) return;
    e.preventDefault(); e.returnValue = 'Oyundan çıkarsan hükmen mağlup sayılırsın.';
  });
  window.NEON_FORFEIT = Object.freeze({ get armed() { return S.armed; }, leave: go => S.armed && !S.done ? confirmLeave(() => leave(go || (() => history.back()))) : (go || (() => history.back()))() });

  /* ---------- UI ---------- */
  function confirmLeave(ok) {
    style();
    const el = document.createElement('div'); el.className = 'nxff-shade'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="nxff-box"><span class="nxff-icon">!</span><b class="nxff-title">OYUNDAN ÇIKILSIN MI?</b>
      <p>Maç devam ediyor. Şimdi çıkarsan <b>hükmen mağlup</b> sayılırsın ve rakibin galibiyeti alır.</p>
      <div class="nxff-btns"><button type="button" class="nxff-stay">OYUNA DÖN</button><button type="button" class="nxff-leave">ÇIK · HÜKMEN MAĞLUP</button></div></div>`;
    document.body.appendChild(el);
    const close = () => el.remove();
    el.querySelector('.nxff-stay').onclick = close;
    el.querySelector('.nxff-leave').onclick = () => { el.querySelector('.nxff-leave').disabled = true; el.querySelector('.nxff-leave').textContent = 'KAYDEDİLİYOR…'; ok(); };
    el.addEventListener('click', e => { if (e.target === el) close(); });
    el.querySelector('.nxff-stay').focus();
  }
  function showBanner() {
    style();
    let el = document.querySelector('.nxff-banner');
    if (!el) { el = document.createElement('div'); el.className = 'nxff-banner'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    const left = Math.max(0, Math.ceil((GRACE_MS - (Date.now() - S.oppGoneAt)) / 1000));
    el.innerHTML = `<i></i><span>Rakibinin bağlantısı koptu. <b>${left} sn</b> içinde dönmezse hükmen galip sayılacaksın.</span>`;
  }
  function hideBanner() { document.querySelector('.nxff-banner')?.remove(); }
  function overlay(title, html, kind) {
    style();
    document.querySelector('.nxff-shade')?.remove();
    const el = document.createElement('div'); el.className = `nxff-shade nxff-end ${kind}`; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true');
    const home = new URL('../index.html', import.meta.url).href;
    el.innerHTML = `<div class="nxff-box"><span class="nxff-icon">${kind === 'win' ? '★' : '✕'}</span><b class="nxff-title">${title}</b><p>${html}</p>
      <div class="nxff-btns one"><a class="nxff-stay" href="${home}">ANA SAYFAYA DÖN</a></div></div>`;
    document.body.appendChild(el);
  }
}

function toast(text) {
  style();
  const el = document.createElement('div'); el.className = 'nxff-toast'; el.textContent = text;
  document.body.appendChild(el); setTimeout(() => el.remove(), 5200);
}

let styled = false;
function style() {
  if (styled) return; styled = true;
  const st = document.createElement('style');
  st.textContent = `
.nxff-shade{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:16px;background:rgba(3,5,7,.78);backdrop-filter:blur(6px);animation:nxffIn .2s ease both}
.nxff-box{width:min(100%,380px);display:grid;justify-items:center;gap:12px;padding:24px 20px 20px;border-radius:20px;background:linear-gradient(180deg,#141a20,#0a0e12);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),0 0 0 1px rgba(255,90,110,.35),0 24px 60px rgba(0,0,0,.6);color:#fff;text-align:center;font-family:var(--nxu-body,"Barlow",system-ui,sans-serif);animation:nxffPop .28s cubic-bezier(.2,.8,.2,1) both}
.nxff-icon{display:grid;place-items:center;width:52px;height:52px;border-radius:50%;background:rgba(255,90,110,.14);color:#ff5a6e;font:900 28px/1 var(--nxu-display,"Barlow Condensed",sans-serif);box-shadow:0 0 0 2px #ff5a6e,0 0 24px rgba(255,90,110,.45)}
.nxff-title{font:italic 900 26px/1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.04em}
.nxff-box p{margin:0;color:rgba(255,255,255,.72);font-size:14px;line-height:1.45}.nxff-box p b{color:#fff}
.nxff-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;margin-top:4px}.nxff-btns.one{grid-template-columns:1fr}
.nxff-btns button,.nxff-btns a{display:grid;place-items:center;min-height:46px;padding:0 10px;border:0;border-radius:12px;font:800 13px/1.1 var(--nxu-display,"Barlow Condensed",sans-serif);letter-spacing:.1em;text-decoration:none;cursor:pointer}
.nxff-stay{background:#baff18;color:#0a0f02}.nxff-leave{background:rgba(255,90,110,.12);color:#ff7a8a;box-shadow:inset 0 0 0 1px rgba(255,90,110,.6)}
.nxff-leave:disabled{opacity:.6}
.nxff-end.win .nxff-box{box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),0 0 0 1px rgba(186,255,24,.5),0 0 50px rgba(186,255,24,.18)}
.nxff-end.win .nxff-icon{background:rgba(186,255,24,.12);color:#baff18;box-shadow:0 0 0 2px #baff18,0 0 24px rgba(186,255,24,.5)}
.nxff-end.win .nxff-title{color:#baff18;text-shadow:0 0 16px rgba(186,255,24,.5)}
.nxff-banner{position:fixed;left:50%;top:max(12px,env(safe-area-inset-top));z-index:2147482000;transform:translateX(-50%);display:flex;align-items:center;gap:10px;width:min(calc(100% - 24px),460px);padding:11px 14px;border-radius:14px;background:rgba(20,10,12,.94);box-shadow:0 0 0 1px rgba(255,90,110,.6),0 10px 30px rgba(0,0,0,.5);color:#fff;font:500 13px/1.35 var(--nxu-body,"Barlow",system-ui,sans-serif);animation:nxffIn .25s ease both}
.nxff-banner i{flex:none;width:9px;height:9px;border-radius:50%;background:#ff5a6e;box-shadow:0 0 10px #ff5a6e;animation:nxffPulse 1s ease-in-out infinite}.nxff-banner b{color:#ff8a98}
.nxff-toast{position:fixed;left:50%;bottom:max(90px,env(safe-area-inset-bottom));z-index:2147482000;transform:translateX(-50%);width:min(calc(100% - 24px),420px);padding:12px 14px;border-radius:12px;background:rgba(12,16,20,.96);box-shadow:0 0 0 1px rgba(255,90,110,.5);color:#fff;font:500 13px/1.35 var(--nxu-body,"Barlow",system-ui,sans-serif);text-align:center;animation:nxffIn .25s ease both}
@keyframes nxffIn{from{opacity:0}}@keyframes nxffPop{from{opacity:0;transform:scale(.92)}}@keyframes nxffPulse{50%{opacity:.3}}`;
  document.head.appendChild(st);
}
