(() => {
  'use strict';
  let depth = true;
  function install() {
    const card = document.getElementById('matchVisualCard');
    if (!card || card.querySelector('.nx-camera-toggle')) return;
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
      controls.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String((button.dataset.depth === 'true') === depth)));
    };
    controls.addEventListener('click', event => {
      const button = event.target.closest('button[data-depth]');
      if (!button) return;
      depth = button.dataset.depth === 'true';
      apply();
    });
    card.querySelector('.matchVisualHead')?.after(controls);
    apply();
  }
  // Observe creation/recreation of the match card; no animation loop is added.
  const observer = new MutationObserver(install);
  observer.observe(document.body, {childList:true, subtree:true});
  install();
})();
