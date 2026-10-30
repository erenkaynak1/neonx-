(() => {
  'use strict';
  let depth = true;
  let trackedBoard = null;
  let scoreObserver = null;
  let celebrationTimer;
  function celebrate(card, team) {
    clearTimeout(celebrationTimer);
    card.classList.remove('nx-crowd-goal');
    card.style.setProperty('--crowd-color', team === 'A' ? '#59d5ff' : '#ff995c');
    void card.offsetWidth;
    card.classList.add('nx-crowd-goal');
    celebrationTimer = setTimeout(() => card.classList.remove('nx-crowd-goal'), 3200);
  }
  function observeScore(card) {
    const board = document.querySelector('#matchSimulation .matchScoreboard');
    if (!board || board === trackedBoard) return;
    scoreObserver?.disconnect();
    trackedBoard = board;
    const read = () => ['A','B'].map(t => Number(board.querySelector('#matchScore'+t)?.textContent.trim()));
    let previous = read();
    scoreObserver = new MutationObserver(() => {
      const next = read();
      if (next.every(Number.isFinite) && previous.every(Number.isFinite)) {
        if (next[0] > previous[0]) celebrate(card, 'A');
        else if (next[1] > previous[1]) celebrate(card, 'B');
      }
      previous = next;
    });
    scoreObserver.observe(board, {childList:true, characterData:true, subtree:true});
  }
  function install() {
    const card = document.getElementById('matchVisualCard');
    if (!card) return;
    observeScore(card);
    if (card.querySelector('.nx-camera-toggle')) return;
    card.querySelectorAll('.nv-goal-top,.nv-goal-bottom').forEach(goal => {
      const net = document.createElement('span');
      net.className = 'nx-volume-net';
      net.setAttribute('aria-hidden', 'true');
      net.innerHTML = '<svg viewBox="0 0 120 48" preserveAspectRatio="none"><defs><pattern id="nx-net-'+(goal.classList.contains('nv-goal-top')?'top':'bottom')+'" width="8" height="7" patternUnits="userSpaceOnUse"><path d="M8 0H0V7" fill="none" stroke="#cadbc7" stroke-opacity=".45" stroke-width=".7"/></pattern></defs><path d="M3 48L16 7H104L117 48Z" fill="#06100b" fill-opacity=".4"/><path d="M3 48L16 7H104L117 48ZM3 48V21H117V48M16 7L3 21M104 7L117 21" fill="url(#nx-net-'+(goal.classList.contains('nv-goal-top')?'top':'bottom')+')" stroke="#d6eacb" stroke-width="2" stroke-linejoin="round"/><path d="M3 48V21H117V48" fill="none" stroke="#f4ffe8" stroke-width="3"/></svg>';
      goal.append(net);
    });
    const controls = document.createElement('div');
    controls.className = 'nx-camera-toggle';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Saha kamerası');
    controls.innerHTML = '<button type="button" data-depth="true">Perspektif</button><button type="button" data-depth="false">Üstten 2D</button>';
    const apply = () => {
      card.classList.toggle('nx-depth', depth);
      controls.querySelectorAll('button[data-depth]').forEach(button => button.setAttribute('aria-pressed', String((button.dataset.depth === 'true') === depth)));
    };
    controls.addEventListener('click', event => {
      const button = event.target.closest('button[data-depth]');
      if (!button) return;
      depth = button.dataset.depth === 'true';
      apply();
    });
    card.querySelector('.matchVisualHead')?.after(controls);
    const shell = document.createElement('div');
    shell.className = 'nx-stadium-shell';
    shell.setAttribute('aria-hidden', 'true');
    card.querySelector('#neonMiniPitch')?.prepend(shell);
    const crowd = document.createElement('div');
    crowd.className = 'nx-crowd-celebration';
    crowd.setAttribute('aria-hidden','true');
    for (let i = 0; i < 18; i++) {
      const spark = document.createElement('i');
      spark.style.setProperty('--x', (4 + i * 5.3) + '%');
      spark.style.setProperty('--delay', (i % 6) * .09 + 's');
      crowd.append(spark);
    }
    shell.append(crowd);
    if (location.pathname.endsWith('/design-preview.html')) {
      const demo = document.createElement('button');
      demo.type = 'button'; demo.textContent = 'Gol kutlamasını dene';
      demo.addEventListener('click', () => celebrate(card, 'A'));
      controls.append(demo);
    }
    apply();
  }
  // Observe creation/recreation of the match card; no animation loop is added.
  const observer = new MutationObserver(install);
  observer.observe(document.body, {childList:true, subtree:true});
  install();
})();
