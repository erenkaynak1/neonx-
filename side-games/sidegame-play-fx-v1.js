/* NEON XI — in-game effects for Football XOX and Career Twin.
   Reads only what the games already render (status notice, phase/round data attributes, result
   classes) and adds animation on top: correct/wrong bursts, round winner reveal, match-end confetti,
   active-turn highlighting and number count-ups. No game state is read or changed. */
(() => {
  'use strict';
  const app = document.getElementById('app');
  if (!app) return;
  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const tone = key => css({ good: '--px-green', bad: '--px-red', lime: '--px-lime', cyan: '--px-cyan', win: '--px-lime' }[key] || '--px-lime') || '#baff18';

  let lastNotice = null, lastRoundKey = '', lastFinal = '', lastCell = -1, lastScreen = '';

  function fx(kind, title, sub, color) {
    if (reduce.matches) return;
    document.querySelectorAll('.px-fx').forEach(n => n.remove());
    const layer = document.createElement('div');
    layer.className = 'px-fx ' + kind;
    layer.setAttribute('aria-hidden', 'true');
    layer.style.setProperty('--fx', color || tone(kind));
    let html = '<span class="px-fx-burst"></span><span class="px-fx-burst b2"></span>';
    const sparks = kind === 'bad' ? 0 : 14;
    for (let i = 0; i < sparks; i++) html += `<span class="px-fx-spark" style="--a:${Math.round(i * 360 / sparks + Math.random() * 12)}deg;animation-delay:${(Math.random() * .08).toFixed(2)}s"></span>`;
    if (kind === 'win') {
      const colors = [tone('lime'), tone('cyan'), tone('good'), '#fff'];
      for (let i = 0; i < 46; i++) html += `<span class="px-fx-confetti" style="left:${(Math.random() * 100).toFixed(1)}%;--c:${colors[i % colors.length]};--d:${(1.6 + Math.random() * 1.4).toFixed(2)}s;--delay:${(Math.random() * .5).toFixed(2)}s;--r:${Math.round(Math.random() * 720 - 360)}deg"></span>`;
    }
    html += `<div class="px-fx-tag"><b>${title}</b>${sub ? `<small>${sub.replace(/[<>&]/g, '')}</small>` : ''}</div>`;
    layer.innerHTML = html;
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), kind === 'win' ? 3200 : 1500);
    if (kind === 'bad') {
      document.documentElement.classList.remove('px-shake'); void document.documentElement.offsetWidth;
      document.documentElement.classList.add('px-shake');
      setTimeout(() => document.documentElement.classList.remove('px-shake'), 500);
      try { navigator.vibrate?.([40, 40, 60]); } catch {}
    } else if (kind === 'good') {
      try { navigator.vibrate?.(25); } catch {}
    }
  }

  function countUp(el) {
    if (reduce.matches || el.dataset.pxCounted) return;
    el.dataset.pxCounted = '1';
    const text = el.textContent;
    const m = text.match(/^(\D*)(\d{1,3}(?:\.\d{3})+|\d+)(\D.*)?$/);
    if (!m) return;
    const target = Number(m[2].replace(/\./g, ''));
    if (!Number.isFinite(target) || target <= 0) return;
    const fmt = n => m[2].includes('.') ? n.toLocaleString('tr-TR') : String(n);
    const start = performance.now(), dur = 700;
    const step = now => {
      if (!el.isConnected) return;
      const t = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - t, 3);
      el.textContent = m[1] + fmt(Math.round(target * e)) + (m[3] || '');
      if (t < 1) requestAnimationFrame(step); else el.textContent = text;
    };
    requestAnimationFrame(step);
  }

  /* ---------- Football XOX ---------- */
  app.addEventListener('pointerdown', e => {
    const cell = e.target.closest?.('.grid .cell');
    if (cell) lastCell = [...app.querySelectorAll('.grid .cell')].indexOf(cell);
  }, true);

  function xox() {
    const turn = body.dataset.xoxTurn;
    const boxes = app.querySelectorAll('.scorebar .playerBox');
    boxes.forEach(box => {
      const mine = box.classList.contains('right') ? 'O' : 'X';
      const over = !!app.querySelector('.winTitle');
      box.classList.toggle('px-active', !over && turn === mine);
      box.classList.toggle('px-idle', !over && !!turn && turn !== mine);
    });
    const status = app.querySelector(':scope > .status');
    const notice = status ? status.textContent.trim() : '';
    if (lastNotice !== null && notice && notice !== lastNotice) {
      status.classList.add('px-flash');
      if (notice.startsWith('✓')) {
        fx('good', 'DOĞRU!', notice.replace(/^✓\s*/, '').replace(/\s*doğru cevap\.?$/i, ''), turn === 'X' ? tone('cyan') : tone('lime'));
      } else if (notice.startsWith('✕')) {
        fx('bad', 'YANLIŞ', 'Sıra rakibe geçti');
        const cells = app.querySelectorAll('.grid .cell');
        const cell = cells[lastCell];
        if (cell && !cell.classList.contains('claimed')) {
          cell.classList.add('px-wrong');
          setTimeout(() => cell.classList.remove('px-wrong'), 900);
        }
      }
    }
    if (notice) lastNotice = notice;
    const win = app.querySelector('.winTitle');
    const key = win ? win.textContent.trim() + '|' + app.querySelectorAll('.grid .cell.claimed').length : '';
    if (win && key !== lastFinal) {
      lastFinal = key;
      const title = win.textContent.trim();
      const draw = /BERABERE/i.test(title);
      setTimeout(() => fx(draw ? 'good' : 'win', draw ? 'BERABERE' : 'KAZANDI!', draw ? 'Tahta doldu' : title.replace(/\s*KAZANDI$/i, ''), draw ? tone('lime') : (/OYUNCU 2/.test(title) ? tone('cyan') : tone('lime'))), 650);
    }
    if (!win) lastFinal = '';
  }

  /* ---------- Career Twin ---------- */
  function twin() {
    app.querySelectorAll('.scorebar .score').forEach(score => {
      const state = (score.querySelector('.scoreState')?.textContent || '').trim();
      score.classList.toggle('px-active', /SENİN SIRAN|TUR GALİBİ/.test(state));
      score.classList.toggle('px-idle', /BEKLİYOR|TUR TAMAMLANDI/.test(state));
    });
    const phase = body.dataset.ctPhase, round = body.dataset.ctRound;
    if (phase === 'reveal') {
      app.querySelectorAll('.arena .statRow:is(.playerValue,.targetValue) .statValue, .resultValue').forEach(countUp);
      const key = round + '|' + (app.querySelector('.winnerText')?.textContent || '');
      if (key !== lastRoundKey) {
        lastRoundKey = key;
        const text = (app.querySelector('.winnerText')?.textContent || '').trim();
        if (text) {
          const draw = /BERABERE/i.test(text);
          const guestWon = app.querySelector('.arena .slot.role-guest.win');
          setTimeout(() => fx('good', draw ? 'BERABERE' : 'TUR KAZANILDI', draw ? 'İki seçim de eşit uzaklıkta' : text.replace(/\s*BU TURU KAZANDI$/i, '') + ' turu kazandı', draw ? tone('lime') : guestWon ? tone('cyan') : tone('good')), 520);
        }
      }
    } else if (phase !== 'final') lastRoundKey = '';
    const final = app.querySelector('.finalTitle');
    const fkey = final ? final.textContent.trim() + '|' + (app.querySelector('.finalScore')?.textContent || '') : '';
    if (final && fkey !== lastFinal) {
      lastFinal = fkey;
      const title = final.textContent.trim(), draw = /BERABERE/i.test(title);
      setTimeout(() => fx(draw ? 'good' : 'win', draw ? 'BERABERE' : 'KAZANDI!', draw ? 'Skor eşit' : title.replace(/\s*KAZANDI$/i, ''), tone('lime')), 600);
    }
    if (!final) lastFinal = lastFinal && phase === 'final' ? lastFinal : '';
  }

  let queued = false;
  function tick() {
    queued = false;
    const screen = body.dataset.ctScreen;
    if (screen !== lastScreen) { lastScreen = screen; lastNotice = null; lastRoundKey = ''; }
    if (screen !== 'game') return;
    if (app.querySelector('.boardWrap')) xox();
    else if (app.querySelector('.arena') || app.querySelector('.finalTitle')) twin();
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
  new MutationObserver(queue).observe(app, { childList: true, subtree: true, characterData: true });
  new MutationObserver(queue).observe(body, { attributes: true, attributeFilter: ['data-ct-screen', 'data-ct-phase', 'data-ct-round', 'data-xox-turn'] });
  queue();
})();
