'use strict';
(() => {
  let round, previous = [], lastWin = '', observer;
  window.NX_XOX_BOARD = (grid, game, winning) => {
    observer?.disconnect();
    const key = game.matchRound || JSON.stringify(game.challenge);
    if (round !== key) { round = key; previous = []; lastWin = ''; }
    const cells = [...grid.querySelectorAll('.cell')];
    cells.forEach((cell, i) => {
      const claim = game.board[i];
      const signature = claim ? `${claim.mark}:${claim.playerId || claim.player}` : '';
      if (signature && signature !== previous[i]) cell.classList.add('claim-enter');
      previous[i] = signature;
    });
    const winKey = winning ? `${game.winner}:${winning.join(',')}` : '';
    if (!winKey) { lastWin = ''; return; }
    winning.forEach(i => cells[i].classList.add('winning-cell'));
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', `win-stroke ${game.winner.toLowerCase()}${lastWin !== winKey ? ' win-enter' : ''}`);
    svg.setAttribute('aria-hidden', 'true');
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('pathLength', '1');
    svg.appendChild(line); grid.appendChild(svg);
    const place = () => {
      if (!grid.isConnected) { observer?.disconnect(); return; }
      const base = grid.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${base.width} ${base.height}`);
      [winning[0], winning[2]].forEach((i, end) => {
        const rect = cells[i].getBoundingClientRect();
        line.setAttribute(`x${end + 1}`, rect.left + rect.width / 2 - base.left);
        line.setAttribute(`y${end + 1}`, rect.top + rect.height / 2 - base.top);
      });
    };
    place();
    observer = new ResizeObserver(place); observer.observe(grid);
    lastWin = winKey;
  };
})();
