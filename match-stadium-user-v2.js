(() => {
  'use strict';
  if (window.NEON_XI_STADIUM_USER_V2) return;
  window.NEON_XI_STADIUM_USER_V2 = true;

  function mountStadiumLayers() {
    const card = document.getElementById('matchVisualCard');
    const wrap = card?.querySelector('.neonMiniPitchWrap');
    const pitch = card?.querySelector('#neonMiniPitch');
    if (!card || !wrap || !pitch) return;

    const shell = card.querySelector('.nx-stadium-shell');
    if (shell && shell.parentElement !== wrap) {
      wrap.insertBefore(shell, pitch);
    }

    const crowd = card.querySelector('.nx-crowd-celebration');
    if (crowd && crowd.parentElement !== wrap) {
      wrap.append(crowd);
    }

    wrap.classList.add('nx-user-stadium-mounted');
  }

  const observer = new MutationObserver(mountStadiumLayers);
  observer.observe(document.body, { childList: true, subtree: true });
  mountStadiumLayers();
})();
