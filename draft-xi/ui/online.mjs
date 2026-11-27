// Draft XI — online 1v1 on the shared NEON XI transport (side-games/career-twin/firebase-peer-shim-v1.js: a Peer-like
// API over Firebase rooms, here rooms/DX-<code>). The social layer (lobby, party launch, random match) opens
// draft.html with ?nxAuto=1&nxRole=host|guest&nxCode=…; the info is kept in sessionStorage so the later pages of the
// same match (tactics, match) can find their way back into the room. The host is authoritative.
export const PREFIX = 'neonxi-draftxi-';
const KEY = 'draftxi-online';
const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

/** Online info from the lobby link (stored for the rest of the match), or null. */
export function autoFromUrl() {
  const q = new URLSearchParams(location.search);
  if (q.get('nxAuto') !== '1' || !/^\d{4}$/.test(q.get('nxCode') || '')) return null;
  const info = { role: q.get('nxRole') === 'host' ? 'host' : 'guest', code: q.get('nxCode'), uid: clean(q.get('nxUid'), 64),
    name: clean(q.get('nxName'), 16) || 'NEON Oyuncu', match: clean(q.get('nxMatch'), 120), opponent: clean(q.get('nxOpponent'), 64) };
  info.me = info.role === 'host' ? 0 : 1;
  try { sessionStorage.setItem(KEY, JSON.stringify(info)); } catch { /* the draft still works; later pages need it */ }
  return info;
}
/** The online info of the match in progress (tactics / match pages), or null. */
export function savedOnline() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; } }
export function clearOnline() { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } }

/**
 * Join the match room. handlers: onOpen() when the other side is connected, onData(msg), onLost(text).
 * The guest keeps trying for `patience` ms (the host may still be on the previous screen).
 * Returns { send(msg), close() }; close() is silent (the other side is moving on too).
 */
export function connectRoom(info, { onOpen, onData, onLost } = {}, patience = 300000) {
  const P = window.Peer;
  if (!P) { setTimeout(() => onLost?.('Bağlantı modülü yüklenemedi.'), 0); return { send() {}, close() {} }; }
  const st = { peer: null, conn: null, closed: false, started: Date.now() };
  const lost = (t) => { if (!st.closed) onLost?.(t); };
  if (info.role === 'host') {
    st.peer = new P(PREFIX + info.code, { debug: 0 });
    st.peer.on('error', () => lost('Maç odası kurulamadı.'));
    st.peer.on('connection', (c) => {
      st.conn = c;
      c.on('data', (m) => { if (!st.closed && m && typeof m === 'object') onData?.(m); });
      c.on('close', () => { if (c === st.conn) lost('Rakibinle bağlantı kesildi.'); });
      onOpen?.();
    });
  } else {
    const tryJoin = () => {
      if (st.closed) return;
      try { st.peer?.destroy(); } catch { /* ignore */ }
      const peer = st.peer = new P(undefined, { debug: 0 });
      let opened = false;
      const again = () => { if (st.closed || opened) return; if (Date.now() - st.started > patience) lost('Rakibe bağlanılamadı.'); else setTimeout(tryJoin, 2500); };
      peer.on('error', () => { if (opened) lost('Maçı kuran oyuncuyla bağlantı kesildi.'); else again(); });
      peer.on('open', () => {
        const c = st.conn = peer.connect(PREFIX + info.code, { reliable: true });
        c.on('open', () => { opened = true; onOpen?.(); });
        c.on('data', (m) => { if (!st.closed && m && typeof m === 'object') onData?.(m); });
        c.on('close', () => { if (opened) lost('Maçı kuran oyuncuyla bağlantı kesildi.'); });
        c.on('error', again);
      });
    };
    tryJoin();
  }
  return {
    send(m) { try { st.conn?.send(m); } catch { /* the other side re-asks */ } },
    close() { st.closed = true; try { st.conn?.close(true); } catch { /* ignore */ } try { st.peer?.destroy(); } catch { /* ignore */ } },
  };
}

/** Result of an online match → leaderboards, head-to-head and rally (social/neon-social.js, party-rally-v1.js listen). */
export function reportResult(info, myGoals, theirGoals) {
  if (!info?.match) return;
  const result = myGoals > theirGoals ? 'wins' : myGoals < theirGoals ? 'losses' : 'draws';
  document.dispatchEvent(new CustomEvent('neon-match-result', { detail: { matchId: info.match, mode: 'draftxi', result, opponentUid: info.opponent || '' } }));
}
