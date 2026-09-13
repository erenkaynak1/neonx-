(() => {
  'use strict';
  if (window.NEON_XI_STADIUM_USER_V3) return;
  window.NEON_XI_STADIUM_USER_V3 = true;

  const FRAME_SRC = './assets/match-stadium-frame-user.webp?v=20260913-stadium-v3';

  function ensureLayers() {
    const card = document.getElementById('matchVisualCard');
    const wrap = card?.querySelector('.neonMiniPitchWrap');
    const pitch = card?.querySelector('#neonMiniPitch');
    if (!card || !wrap || !pitch) return;

    let backdrop = Array.from(wrap.children).find(el => el.classList?.contains('nx-user-stadium-backdrop'));
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'nx-user-stadium-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      wrap.insertBefore(backdrop, pitch);
    }

    let frame = Array.from(wrap.children).find(el => el.classList?.contains('nx-user-stadium-frame'));
    if (!frame) {
      frame = document.createElement('img');
      frame.className = 'nx-user-stadium-frame';
      frame.alt = '';
      frame.setAttribute('aria-hidden', 'true');
      frame.decoding = 'async';
      frame.src = FRAME_SRC;
      wrap.append(frame);
    } else if (frame.getAttribute('src') !== FRAME_SRC) {
      frame.src = FRAME_SRC;
    }

    /* The legacy shell is intentionally ignored/hidden. Keep celebration as
       a direct wrap child so future match-card recreation cannot bury it. */
    const crowd = card.querySelector('.nx-crowd-celebration');
    if (crowd && crowd.parentElement !== wrap) wrap.append(crowd);

    wrap.dataset.nxStadium = 'v3';
    window.NEON_XI_STADIUM_USER_V3_STATE = {
      mounted: true,
      frameComplete: !!frame.complete,
      frameNaturalWidth: frame.naturalWidth || 0,
      frameNaturalHeight: frame.naturalHeight || 0
    };

    frame.addEventListener('load', () => {
      window.NEON_XI_STADIUM_USER_V3_STATE = {
        mounted: true,
        frameComplete: true,
        frameNaturalWidth: frame.naturalWidth,
        frameNaturalHeight: frame.naturalHeight
      };
    }, { once: true });

    frame.addEventListener('error', () => {
      window.NEON_XI_STADIUM_USER_V3_STATE = {
        mounted: true,
        frameComplete: true,
        frameNaturalWidth: 0,
        frameNaturalHeight: 0,
        assetError: true
      };
    }, { once: true });
  }

  const observer = new MutationObserver(ensureLayers);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  ensureLayers();
})();
