/* NEON XI Imposter design skin. Visual-only: keep the canonical room, turn, vote
   and paper-peel implementations intact. Install after all online game patches. */
(()=>{
  'use strict';
  if(typeof render!=='function'||typeof el!=='function'||typeof state==='undefined') return;
  const icons={
    phone:'<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10 5h4M11 18.5h2"/>',
    friends:'<circle cx="9" cy="8.5" r="3.1"/><path d="M3.5 20v-2c0-3.5 2.3-5.4 5.5-5.4s5.5 1.9 5.5 5.4v2M17 6a3 3 0 0 1 0 5.8m1.2 2c2 .6 3 2.2 3 4.6V20"/>',
    search:'<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5M8 10.5h5m-2.5-2.5v5"/>',
    arrow:'<path d="m8 5 7 7-7 7M4 12h11"/>'
  };
  const glyph=(name)=>'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">'+icons[name]+'</svg>';
  const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  function mode(label,description,icon,action){
    const b=make('button','nx-imp-mode');b.type='button';b.setAttribute('aria-label',label+'. '+description);
    const inside=make('span','nx-imp-mode-inside');
    const pict=make('span','nx-imp-mode-icon');pict.innerHTML=glyph(icon);
    const words=make('span','nx-imp-mode-copy');
    words.append(make('strong','',label),make('small','',description));
    const arrow=make('span','nx-imp-mode-arrow');arrow.innerHTML=glyph('arrow');
    inside.append(pict,words,arrow);b.append(inside);b.addEventListener('click',action);return b;
  }
  function chooseOnline(choice){
    const bridge=window.NEON_ARCADE_UI;
    if(bridge&&typeof bridge.choose==='function'){bridge.choose('imposter',choice);return}
    state.screen='online-choice';render();
  }
  // The three user-visible actions use the existing state machine and social bridge.
  renderMenu=function(root){
    root.classList.add('nx-imp-menu');
    const logo=make('div','nx-imp-logo');
    logo.innerHTML='<div class="nx-imp-logo-art"><img src="../assets/neon-xi-logo-outline.png" alt="NEON XI"></div><span>SIDE GAME</span>';
    root.append(logo);
    const title=make('div','title-wrap nx-imp-hero');
    title.append(make('div','crest','NEON XI · SIDE GAME'));
    const headline=make('h1','title');headline.innerHTML='FUTBOL <span>IMPOSTER</span>';
    title.append(headline,make('div','subtitle','Bir kişi gerçeği bilmiyor. Aranızdaki imposteri bul.'));
    root.append(title);
    const symbol=make('img','nx-imp-symbol');
    symbol.src='./assets/imposter-emblem-v1.svg';symbol.alt='';symbol.decoding='async';symbol.draggable=false;
    symbol.setAttribute('aria-hidden','true');root.append(symbol);
    const panel=make('section','nx-imp-menu-panel');
    panel.setAttribute('aria-label','Oyun modu seç');
    panel.append(make('h2','nx-imp-menu-heading','OYUN MODUNU SEÇ'));
    const grid=make('div','nx-imp-mode-grid');
    grid.append(
      mode('TEK TELEFON','Aynı cihazda sırayla oynayın','phone',()=>{state.screen='local-setup';render()}),
      mode('ARKADAŞLARINLA OYNA','Partine katıl, birlikte oyna','friends',()=>chooseOnline('friends')),
      mode('RAKİP ARA','Çevrimiçi bir gruba katıl','search',()=>chooseOnline('match'))
    );
    panel.append(grid);root.append(panel);
  };
  const coreRender=render;
  render=function(...args){
    const result=coreRender.apply(this,args);
    // A class on body controls styling without changing or duplicating any secret card.
    const screen=String(state.screen||'menu');
    document.body.dataset.nxImpScreen=screen;
    const root=document.querySelector('#app > .screen');
    if(root&&screen!=='menu')root.classList.add('nx-imp-active');
    return result;
  };
  render();
})();