(() => {
  'use strict';
  document.addEventListener('click', (event) => {
    const target = event.target && event.target.closest ? event.target.closest('#bootHome.nx-approved-home-v1 .h-how') : null;
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    window.location.href = './side-games/how-to-play.html';
  }, true);
})();
