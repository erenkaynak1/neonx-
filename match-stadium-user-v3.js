(() => {
  'use strict';
  if (window.NEON_XI_STADIUM_USER_V3) return;
  window.NEON_XI_STADIUM_USER_V3 = true;
  const FRAME_SRC = './assets/match-stadium-user-v6.png';
  let currentCard, currentWrap, currentPitch, currentFrame;
  let scheduled = false;
  // Vector screens cover the baked-in lettering and share the artwork camera.
  const PANELS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1060 1484" preserveAspectRatio="none" class="nx-stadium-panels" aria-hidden="true">
    <g fill="#03151b" stroke="#32e3ed" stroke-width="2">
      <path d="M113 151 L216 119 L216 209 L111 246 Z"/>
      <path d="M845 121 L944 150 L950 246 L844 210 Z"/>
      <path d="M7 412 L63 441 L62 576 L7 603 Z"/>
      <path d="M1000 440 L1051 412 L1051 603 L999 576 Z"/>
      <path d="M86 1314 L209 1360 L208 1418 L82 1372 Z"/>
      <path d="M850 1359 L973 1311 L978 1373 L851 1420 Z"/>
      <path d="M422 91 L636 91 L636 160 L422 160 Z"/>
    </g>
    <g fill="#6cf8ff" font-family="Arial, sans-serif" font-weight="900" text-anchor="middle" font-size="21" letter-spacing="1">
      <text transform="translate(164 185) rotate(-17)"><tspan x="0">NEON XI</tspan></text>
      <text transform="translate(896 185) rotate(17)"><tspan x="0">DRAFT XI</tspan></text>
      <text transform="translate(35 495)" font-size="16"><tspan x="0">NEON</tspan><tspan x="0" dy="23">XI</tspan></text>
      <text transform="translate(1026 495)" font-size="16"><tspan x="0">DRAFT</tspan><tspan x="0" dy="23">XI</tspan></text>
      <text transform="translate(146 1374) rotate(20)" font-size="20">DRAFT XI</text>
      <text transform="translate(914 1374) rotate(-20)" font-size="20">NEON XI</text>
      <text x="529" y="108" font-size="12">NEON XI · DRAFT XI</text>
      <text x="529" y="146" font-size="36" letter-spacing="4" data-stadium-score>– : –</text>
    </g>
  </svg>`;
  function syncScore() {
    const target = currentFrame?.querySelector('[data-stadium-score]');
    if (!target) return;
    const a = document.getElementById('matchScoreA')?.textContent.trim();
    const b = document.getElementById('matchScoreB')?.textContent.trim();
    const score = `${a || '–'} : ${b || '–'}`;
    if (target.textContent !== score) target.textContent = score;
  }
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
    syncScore();
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
      frame = document.createElement('div');
      frame.className = 'nx-user-stadium-frame';
      frame.setAttribute('aria-hidden', 'true');
      frame.innerHTML = PANELS;
      wrap.append(frame);
    }
    currentFrame = frame;
    const artwork = document.createElement('img');
    artwork.alt = '';
    artwork.decoding = 'async';
    artwork.className = 'nx-stadium-artwork';
    frame.querySelector('.nx-stadium-artwork')?.remove();
    frame.prepend(artwork);
    const report = () => {
      frame.dataset.loaded = String(artwork.naturalWidth > 0);
      window.NEON_XI_STADIUM_USER_V3_STATE = {
        mounted: true, frameComplete: artwork.complete,
        frameNaturalWidth: artwork.naturalWidth, frameNaturalHeight: artwork.naturalHeight,
        assetError: artwork.complete && !artwork.naturalWidth
      };
      scheduleAlignment();
    };
    artwork.onload = report;
    artwork.onerror = report;
    artwork.src = FRAME_SRC;
    report();
    syncScore();
    const crowd = card.querySelector('.nx-crowd-celebration');
    if (crowd && crowd.parentElement !== wrap) wrap.append(crowd);
    wrap.dataset.nxStadium = 'v3';
    resize.observe(wrap);
    resize.observe(pitch);
    camera.observe(card, { attributes: true, attributeFilter: ['class'] });
    wrap.addEventListener('transitionend', scheduleAlignment);
  }
  new MutationObserver(ensureLayers).observe(document.documentElement, { childList: true, characterData: true, subtree: true });
  window.addEventListener('resize', scheduleAlignment);
  ensureLayers();
})();
