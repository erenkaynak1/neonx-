(() => {
  const addSideGamesButton = () => {
    if (document.getElementById('sideGamesBtn')) return;
    const online = document.getElementById('onlineModeBtn');
    if (!online) return;

    const button = document.createElement('button');
    button.id = 'sideGamesBtn';
    button.className = 'neonHomeBtn neonPrimaryMode';
    button.type = 'button';
    button.innerHTML = `
      <span>
        <strong>YAN OYUNLAR</strong>
        <span class="neonHomeSub">Futbol Imposter ve yeni NEON XI mini oyunlarını aç.</span>
      </span>
      <span class="neonHomeIcon" aria-hidden="true">◇</span>
    `;
    button.addEventListener('click', () => {
      window.location.href = './side-games/index.html';
    });
    online.insertAdjacentElement('afterend', button);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addSideGamesButton, { once: true });
  } else {
    addSideGamesButton();
  }

  // Bazı boot katmanları DOM'u sonradan yenileyebildiği için kısa bir güvenlik kontrolü.
  setTimeout(addSideGamesButton, 250);
  setTimeout(addSideGamesButton, 1000);
})();
