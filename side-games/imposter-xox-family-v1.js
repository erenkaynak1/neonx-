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
    const logo=make('a','nx-imp-logo');logo.href='./index.html';logo.setAttribute('aria-label','Yan oyunlara dön');
    logo.innerHTML='<div class="nx-imp-logo-art"><img src="../assets/ui/logo-neon-xi.svg" alt="NEON XI"></div><span>YAN OYUNLAR</span>';
    root.append(logo);
    const title=make('div','title-wrap nx-imp-hero');
    title.append(make('div','crest','NEON XI · YAN OYUN'));
    const headline=make('h1','title');headline.innerHTML='FUTBOL <span>IMPOSTER</span>';
    title.append(headline,make('div','subtitle','Bir kişi gerçeği bilmiyor. Aranızdaki imposteri bul.'));
    root.append(title);
    const symbol=make('img','nx-imp-symbol');
    symbol.src='./assets/imposter-emblem-v2.svg';symbol.alt='';symbol.decoding='async';symbol.draggable=false;
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
  // Single-phone setup: the shared NEON XI settings sheet (.sgm-panel + .sgm-sheet, sidegame-skin-v2.css), not a
  // screen of its own. Same state and start function as before.
  renderLocalSetup=function(root){
    syncLocalNames();
    const L=state.local;
    root.classList.add('nx-imp-setup');
    const frame=make('div','sgm');
    frame.innerHTML='<a class="sgm-logo" href="./index.html" aria-label="Yan oyunlara dön"><img src="../assets/ui/logo-neon-xi.svg" alt="NEON XI"><span>YAN OYUNLAR</span></a>'+
      '<div class="sgm-hero"><h1>FUTBOL<br><span>IMPOSTER</span></h1><p>Bir kişi gerçeği bilmiyor. Aranızdaki imposteri bul.</p></div>'+
      '<img class="sgm-emblem" src="./assets/imposter-emblem-v2.svg" alt="" aria-hidden="true" decoding="async" draggable="false">';
    const panel=make('section','sgm-panel');panel.setAttribute('aria-label','Tek telefon');
    const head=make('h2','sgm-heading','TEK TELEFON');
    const back=make('button','sgm-back','← GERİ');back.type='button';back.onclick=()=>{state.screen='menu';render()};
    head.append(back);panel.append(head);
    const sheet=make('div','sgm-sheet');
    // player count
    const cf=make('div','sgm-field nx-imp-count');
    const cl=make('label','','OYUNCU SAYISI');cl.id='nxImpCountLbl';
    const row=make('div','nx-imp-stepper');row.setAttribute('role','group');row.setAttribute('aria-labelledby','nxImpCountLbl');
    const minus=make('button','','−');minus.type='button';minus.setAttribute('aria-label','Bir oyuncu azalt');minus.disabled=L.count<=3;
    const out=make('output','',String(L.count));out.setAttribute('aria-live','polite');
    const plus=make('button','','+');plus.type='button';plus.setAttribute('aria-label','Bir oyuncu ekle');plus.disabled=L.count>=12;
    minus.onclick=()=>{if(L.count>3){L.count--;syncLocalNames();render();}};
    plus.onclick=()=>{if(L.count<12){L.count++;syncLocalNames();render();}};
    row.append(minus,out,plus);cf.append(cl,row,make('small','','3 ile 12 kişi arası'));sheet.append(cf);
    // names (optional), two per row
    const nf=make('div','sgm-field nx-imp-names');
    nf.append(make('label','','İSİMLER (İSTEĞE BAĞLI)'));
    const grid=make('div','nx-imp-name-grid');
    L.names.forEach((n,i)=>{
      const w=make('label','nx-imp-name');
      w.append(make('b','',String(i+1)));
      const input=make('input');input.type='text';input.maxLength=14;input.autocomplete='off';input.placeholder='Oyuncu '+(i+1);input.value=n;
      input.setAttribute('aria-label',(i+1)+'. oyuncunun adı');
      input.oninput=(e)=>{L.names[i]=e.target.value};
      input.onkeydown=(e)=>{if(e.key==='Enter'){const nx=grid.querySelectorAll('input')[i+1];if(nx)nx.focus();else startLocalGame();}};
      w.append(input);grid.append(w);
    });
    nf.append(grid);sheet.append(nf);
    const go=make('button','sgm-btn primary','OYUNU BAŞLAT');go.type='button';go.onclick=()=>startLocalGame();
    sheet.append(go);
    sheet.append(make('p','sgm-note','Telefon sırayla elden ele geçer: herkes kendi kartına tek başına bakar.'));
    panel.append(sheet);frame.append(panel);root.append(frame);
  };
  const coreRender=render;
  render=function(...args){
    const result=coreRender.apply(this,args);
    // A class on body controls styling without changing or duplicating any secret card.
    const screen=String(state.screen||'menu');
    document.body.dataset.nxImpScreen=screen;
    document.body.classList.toggle('sg-skin',screen==='local-setup');   // the shared menu skin only on the setup sheet
    const root=document.querySelector('#app > .screen');
    if(root&&screen!=='menu')root.classList.add('nx-imp-active');
    return result;
  };
  render();
})();