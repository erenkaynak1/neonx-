(() => {
  'use strict';
  if (window.NEON_XI_STADIUM_USER_V3) return;
  window.NEON_XI_STADIUM_USER_V3 = true;
  const FRAME_SRC = './assets/match-stadium-user-v6.png';
  let currentCard, currentWrap, currentPitch, currentFrame;
  let scheduled = false;
  function alignFrame() {
    scheduled = false;
    if (!currentCard?.classList.contains('nx-depth') || !currentPitch?.isConnected) return;
    const fieldWidth = currentPitch.offsetWidth;
    const fieldHeight = currentPitch.offsetHeight;
    if (!fieldWidth || !fieldHeight) return;
    const cameraStyle = getComputedStyle(currentPitch);
    const origin = cameraStyle.transformOrigin.split(' ').map(parseFloat);
    // Fit the opening BEFORE projection, then share the pitch's camera matrix
    // and world-space pivot. Bounding rectangles lose the trapezoid's corners.
    const width = fieldWidth / .70;
    const height = fieldHeight / .63;
    Object.assign(currentFrame.style, {
      width: `${width}px`, height: `${height}px`,
      left: `${currentPitch.offsetLeft - width * .15}px`,
      top: `${currentPitch.offsetTop - height * .21}px`,
      transform: cameraStyle.transform,
      transformOrigin: `${origin[0] + width * .15}px ${origin[1] + height * .21}px ${origin[2] || 0}px`
    });
  }
  function scheduleAlignment() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(alignFrame);
  }
  const resize = new ResizeObserver(scheduleAlignment);
  const camera = new MutationObserver(scheduleAlignment);
  function ensureLayers() {
    const card = document.getElementById('matchVisualCard');
    const wrap = card?.querySelector('.neonMiniPitchWrap');
    const pitch = card?.querySelector('#neonMiniPitch');
    if (!card || !wrap || !pitch) return;
    if (wrap === currentWrap && pitch === currentPitch && currentFrame?.parentElement === wrap) return;
    resize.disconnect();
    camera.disconnect();
    currentWrap?.removeEventListener('transitionend', scheduleAlignment);
    currentCard = card;
    currentWrap = wrap;
    currentPitch = pitch;
    let frame = Array.from(wrap.children).find(el => el.classList?.contains('nx-user-stadium-frame'));
    if (!frame) {
      frame = document.createElement('img');
      frame.className = 'nx-user-stadium-frame';
      frame.alt = '';
      frame.setAttribute('aria-hidden', 'true');
      frame.decoding = 'async';
      wrap.append(frame);
    }
    currentFrame = frame;
    const report = () => {
      frame.dataset.loaded = String(frame.naturalWidth > 0);
      window.NEON_XI_STADIUM_USER_V3_STATE = {
        mounted: true, frameComplete: frame.complete,
        frameNaturalWidth: frame.naturalWidth, frameNaturalHeight: frame.naturalHeight,
        assetError: frame.complete && !frame.naturalWidth
      };
      scheduleAlignment();
    };
    frame.onload = report;
    frame.onerror = report;
    frame.src = FRAME_SRC;
    report();
    const crowd = card.querySelector('.nx-crowd-celebration');
    if (crowd && crowd.parentElement !== wrap) wrap.append(crowd);
    wrap.dataset.nxStadium = 'v3';
    resize.observe(wrap);
    resize.observe(pitch);
    camera.observe(card, { attributes: true, attributeFilter: ['class'] });
    wrap.addEventListener('transitionend', scheduleAlignment);
  }
  new MutationObserver(ensureLayers).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', scheduleAlignment);
  ensureLayers();
})();
