(() => {
  'use strict';

  if (window.NEON_XI_CHEM_CLOSE_FIX) return;

  const mobileQuery = window.matchMedia('(max-width: 760px)');

  function looksLikeClose(el) {
    if (!el || el.classList?.contains('nxChemCloseGuard')) return false;
    const text = (el.textContent || '').trim();
    const meta = [
      el.id || '',
      typeof el.className === 'string' ? el.className : '',
      el.getAttribute?.('aria-label') || '',
      el.getAttribute?.('title') || '',
      el.getAttribute?.('data-close') || '',
      el.getAttribute?.('data-dismiss') || ''
    ].join(' ').toLowerCase();

    return /^[x×✕✖]$/i.test(text) || /(kapat|close|dismiss|modal[-_ ]?close|chem[-_ ]?close)/i.test(meta);
  }

  function findNativeClose(inspector) {
    return [...inspector.querySelectorAll('button, [role="button"], [data-close], [data-dismiss]')]
      .find(looksLikeClose) || null;
  }

  function clickNativeClose(inspector) {
    const nativeClose = findNativeClose(inspector);
    if (nativeClose) {
      nativeClose.click();
      return true;
    }
    return false;
  }

  function fallbackClose(inspector) {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true
    }));

    requestAnimationFrame(() => {
      const style = getComputedStyle(inspector);
      const stillVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      if (!stillVisible) return;

      inspector.classList.remove('open', 'show', 'active', 'visible', 'expanded');
      inspector.setAttribute('aria-hidden', 'true');
    });
  }

  function ensureCloseGuard(inspector) {
    if (!inspector || inspector.querySelector('.nxChemCloseGuard')) return;

    const dock = document.createElement('div');
    dock.className = 'nxChemCloseDock';
    dock.setAttribute('aria-hidden', 'false');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nxChemCloseGuard';
    button.setAttribute('aria-label', 'Kimya ekranını kapat');
    button.setAttribute('title', 'Kapat');
    button.textContent = '×';

    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (!clickNativeClose(inspector)) fallbackClose(inspector);
    });

    dock.appendChild(button);
    inspector.prepend(dock);
  }

  function refresh() {
    if (!mobileQuery.matches) return;
    document.querySelectorAll('.chemInspector').forEach(ensureCloseGuard);
  }

  const observer = new MutationObserver(refresh);
  observer.observe(document.documentElement, { subtree: true, childList: true });
  mobileQuery.addEventListener?.('change', refresh);
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('orientationchange', refresh, { passive: true });

  refresh();

  window.NEON_XI_CHEM_CLOSE_FIX = {
    version: '1.0.0',
    refresh
  };
})();
