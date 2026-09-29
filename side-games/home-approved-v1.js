(() => {
  "use strict";
  const HOME_CLASS="nx-approved-home-v1";
  const VERSION="20260929-brown-frames-v1";
  const css=`
#bootScreen:has(#bootHome.nx-approved-home-v1.active) .bootGlow,
#bootScreen:has(#bootHome.nx-approved-home-v1.active) .bootBrand{display:none!important}
#bootScreen:has(#bootHome.nx-approved-home-v1.active) .bootPanel{width:100vw!important;max-width:none!important;height:100dvh!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
#bootHome.nx-approved-home-v1.active{display:block!important;position:relative!important;width:100%!important;height:100dvh!important;overflow:auto!important;overscroll-behavior-y:contain;background:#080d12!important;color:#fff!important;isolation:isolate}
#bootHome.nx-approved-home-v1 *{box-sizing:border-box}
.nx-approved-legacy{display:none!important}
#bootHome .nx-home{width:min(100%,520px);margin:0 auto;padding:max(0px,calc(env(safe-area-inset-top) - 20px)) 0 env(safe-area-inset-bottom);position:relative;background:#080d12}
#bootHome .nx-home-map{display:block;position:relative;width:100%;height:auto;overflow:visible;touch-action:pan-y;background:transparent}
#bootHome .nx-raster-layer{position:absolute;top:0;left:0;width:100%;height:auto;display:block;pointer-events:none;user-select:none;image-rendering:auto}
#bootHome .nx-raster-layer[data-layer="background"]{filter:blur(2px) saturate(.72) brightness(.86);opacity:.94;clip-path:inset(0)}
#bootHome .nx-foreground{clip-path:url(#nx-foreground-clip)}

#bootHome .nx-hotspot{cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#bootHome .nx-hit{fill:rgba(255,255,255,.001);stroke:transparent;stroke-width:1.35;vector-effect:non-scaling-stroke;shape-rendering:geometricPrecision;stroke-linejoin:round;transition:stroke .12s ease,fill .12s ease,filter .12s ease,stroke-width .12s ease;pointer-events:all}
#bootHome .nx-outline{fill:none;stroke:transparent;stroke-width:1.2;vector-effect:non-scaling-stroke;pointer-events:none;stroke-linejoin:round;transition:stroke .12s ease,filter .12s ease}
#bootHome .nx-hotspot:is(.nx-pressed,:focus-visible) .nx-outline{stroke:#483A2A;stroke-width:2;filter:drop-shadow(0 0 3px #483A2A)}
#bootHome .nx-hotspot.nx-pressed .nx-hit{fill:rgba(72,58,42,.18)}
#bootHome .nx-icon-feedback{opacity:0;fill:none;stroke:#b4ff20;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;pointer-events:none;transition:opacity .12s ease;filter:drop-shadow(0 0 4px #91dd19)}
#bootHome .nx-hotspot.nx-pressed .nx-icon-feedback{opacity:1}
#bootHome .nx-nav-glyph{color:#afcce9;fill:none;stroke:currentColor;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;transition:color .18s ease,filter .18s ease,transform .18s ease;transform-box:fill-box;transform-origin:center;pointer-events:none}
#bootHome .nx-nav-label{font:24px Arial,system-ui,sans-serif;fill:#afcce9;text-anchor:middle;pointer-events:none;transition:fill .18s ease}
#bootHome .nx-nav-marker{fill:#b4ff20;opacity:0;transition:opacity .18s ease;pointer-events:none}
#bootHome .nx-home-nav .nx-hotspot[aria-current="page"] .nx-nav-glyph,#bootHome .nx-home-nav .nx-hotspot.nx-pressed .nx-nav-glyph{color:#b4ff20;filter:drop-shadow(0 0 5px #8cc51f)}
#bootHome .nx-home-nav .nx-hotspot[aria-current="page"] .nx-nav-label{fill:#b4ff20}
#bootHome .nx-home-nav .nx-hotspot[aria-current="page"] .nx-nav-marker{opacity:1}
#bootHome .nx-home-nav .nx-hotspot.nx-pressed .nx-nav-glyph{transform:scale(.91)}
#bootHome .nx-home-nav [data-action="play"][aria-current="page"] .nx-nav-glyph{fill:rgba(180,255,32,.18)}
#bootHome .nx-home-nav .nx-outline{stroke-width:1}
#bootHome .nx-home-nav .nx-hit{fill:transparent}
#bootHome .nx-home-nav .nx-hotspot.nx-pressed .nx-hit{fill:rgba(72,58,42,.12)}
#bootHome .nx-approved-status{position:fixed;bottom:max(20px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);z-index:50;color:#fff;background:#101820eF;border:1px solid rgba(255,255,255,.10);border-radius:12px;font:600 13px/1.5 Arial,system-ui,sans-serif;text-align:center;width:min(90%,420px);pointer-events:none}
#bootHome .nx-approved-status:not(:empty){padding:12px 16px}
@media(prefers-reduced-motion:reduce){#bootHome .nx-hit,#bootHome .nx-outline,#bootHome .nx-nav-glyph,#bootHome .nx-nav-label,#bootHome .nx-nav-marker,#bootHome .nx-icon-feedback{transition:none}#bootHome .nx-home-nav .nx-hotspot.nx-pressed .nx-nav-glyph{transform:none}#bootHome *{scroll-behavior:auto!important}}

#bootHome .nx-home-art{pointer-events:none;user-select:none}
#bootHome .nx-live-name{font:bold 24px Arial;fill:white;pointer-events:none}
`;
  const norm=s=>(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const controlText=n=>norm(`${n?.textContent||""} ${n?.getAttribute?.("aria-label")||""} ${n?.title||""}`);
  function findAction(root,needles,exclude=[]){
    const set=new Set(exclude.filter(Boolean));
    return [...root.querySelectorAll("button,a,[role='button']")].find(n=>!set.has(n)&&needles.some(x=>controlText(n).includes(x)))||null;
  }
  function clickTarget(target,status,label){
    if(target?.isConnected){target.click();return true;}
    status.textContent=`${label} şu anda açılamıyor.`;
    setTimeout(()=>{if(status.textContent.includes(label))status.textContent=""},2200);
    return false;
  }
  function openSocial(tab,status){
    let tries=0;
    const open=()=>{
      if(window.NEON_SOCIAL&&typeof window.NEON_SOCIAL.open==="function"){window.NEON_SOCIAL.open(tab);return true;}
      const fallback=document.querySelector(`[data-neon-social="${tab}"]`);
      if(fallback){fallback.click();return true;}
      return false;
    };
    if(open()) return;
    const timer=setInterval(()=>{
      tries++;
      if(open()||tries>80){
        clearInterval(timer);
        if(tries>80){status.textContent="Sosyal ekran yüklenemedi.";setTimeout(()=>status.textContent="",2200);}
      }
    },50);
  }

  function initialize(){
    const home=document.getElementById('bootHome');
    if(!home||home.dataset.nxApprovedHome===VERSION)return;
    const single=document.getElementById('singleModeBtn'),bot=document.getElementById('botModeBtn'),online=document.getElementById('onlineModeBtn');
    const tournament=home.querySelector('.neonHomeQuickRow button'),settings=home.querySelector('[data-open-neon-settings]');
    const excluded=[single,bot,online,tournament,settings];
    const how=findAction(home,['nasil oynanir','how to play'],excluded);
    const feedback=findAction(home,['sikayet','oneri','feedback'],[...excluded,how]);
    const legacy=document.createElement('div');legacy.className='nx-approved-legacy';legacy.setAttribute('aria-hidden','true');legacy.inert=true;
    while(home.firstChild)legacy.append(home.firstChild);
    const stage=document.createElement('main');stage.className='nx-home nx-approved-canvas';stage.setAttribute('aria-label','NEON XI ana menüsü');
    // Coordinates are in source-image pixels. Image and interaction outlines share
    // one viewBox, so resizing never moves a hotspot away from its visible button.
    // Touch targets stay generous; visible feedback follows the artwork independently.
    const contours={
      'Profil ve giriş':'<path class="nx-outline" d="M126 50 H210 Q250 50 250 88 Q250 125 210 125 H125 A44 44 0 1 1 126 50 Z"/>',
      'Bildirimler':'<circle class="nx-outline" cx="762" cy="87" r="38"/>',
      'Tek oyunculu':'<rect class="nx-outline" x="107" y="762" width="148" height="91" rx="12"/>',
      'Bota karşı':'<rect class="nx-outline" x="369" y="762" width="119" height="91" rx="12"/>',
      'Online':'<rect class="nx-outline" x="628" y="762" width="89" height="91" rx="12"/>',
      'Turnuva modu':'<path class="nx-outline" d="M80 869 H775 M80 969 H775"/>',
      'Ana sayfa':'<rect class="nx-outline" x="83" y="1669" width="103" height="91" rx="12"/>',
      'Oyna':'<rect class="nx-outline" x="290" y="1669" width="72" height="91" rx="12"/>',
      'Arkadaşlar':'<rect class="nx-outline" x="472" y="1669" width="115" height="91" rx="12"/>',
      'Ayarlar':'<rect class="nx-outline" x="684" y="1669" width="88" height="91" rx="12"/>'
    };
    const icons={
      'Tek oyunculu':'<circle cx="181" cy="775" r="10"/><path d="M161 813V804Q162 790 180 790Q200 790 201 804V813Z"/>',
      'Bota karşı':'<rect x="411" y="777" width="37" height="31" rx="7"/><path d="M429 777V770M407 787V799M452 787V799M420 810V816M439 810V816M420 789h1M438 789h1M423 801h12"/>',
      'Online':'<circle cx="674" cy="789" r="23"/><ellipse cx="674" cy="789" rx="11" ry="23"/><path d="M652 789H696M655 778Q674 787 693 778M655 800Q674 791 693 800"/>',
      'Turnuva modu':'<path d="M111 897H139V914Q137 928 125 929Q113 927 111 914ZM111 901H101V910Q102 920 113 920M139 901H149V910Q148 920 137 920M125 929V940M113 944Q125 936 137 944Z"/>',
      'Bildirimler':'<path d="M748 96Q752 91 752 82Q752 74 760 73V71Q762 67 764 71V73Q772 74 772 82Q772 91 776 96ZM758 102Q762 109 766 102"/>'
    };
    const navIcons={
      home:'<path d="M113 1692L132 1675L150 1692V1712H113Z"/>',
      play:'<path d="M312 1679Q312 1675 316 1678L340 1693Q344 1695 340 1698L316 1712Q312 1715 312 1711Z"/>',
      friends:'<circle cx="519" cy="1685" r="9"/><path d="M533 1679Q544 1676 544 1686Q544 1695 534 1694M504 1714V1708Q505 1698 519 1698Q533 1698 533 1708V1714M540 1700Q550 1703 550 1714"/>',
      settings:'<path d="M718 1675H729L732 1682L739 1683L743 1692L738 1698L739 1705L731 1711L724 1707L717 1711L709 1705L710 1698L705 1692L709 1683L716 1682Z"/><circle cx="724" cy="1693" r="8"/>'
    };
    const hotspot=(action,label,x,y,w,h,r=24,color='#483A2A',url='')=>`<a class="nx-hotspot" ${url?`href="./side-games/${url}"`:`role="button" data-action="${action}"`} tabindex="0" aria-label="${label}"><title>${label}</title><rect class="nx-hit" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>${contours[label]||`<rect class="nx-outline" x="${x+2}" y="${y+2}" width="${w-4}" height="${h-4}" rx="${r}"/>`}${icons[label]?`<g class="nx-icon-feedback" aria-hidden="true">${icons[label]}</g>`:''}</a>`;
    const navButton=(action,label,x,w,cx)=>`<a class="nx-hotspot" role="button" data-action="${action}" tabindex="0" aria-label="${label}" ${action==='home'?'aria-current="page"':''}><title>${label}</title><rect class="nx-hit" x="${x}" y="1659" width="${w}" height="118" rx="24"/><rect class="nx-outline" x="${x+9}" y="1663" width="${w-18}" height="110" rx="21"/><g class="nx-nav-glyph" aria-hidden="true">${navIcons[action]}</g><text class="nx-nav-label" x="${cx}" y="1750" aria-hidden="true">${label}</text><rect class="nx-nav-marker" x="${cx-26}" y="1778" width="52" height="4" rx="2" aria-hidden="true"/></a>`;
    stage.innerHTML=`<img class="nx-raster-layer" data-layer="background" src="./side-games/assets/premium-home/neon-xi-background-v4.png" width="853" height="1844" alt="" decoding="async"/>
    <img class="nx-raster-layer nx-foreground" data-layer="foreground" src="./side-games/assets/premium-home/neon-xi-foreground-brown-v6.png" width="853" height="1844" alt="" decoding="async" fetchpriority="high"/>
    <svg class="nx-home-map nx-approved-canvas" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 853 1844" width="853" height="1844" aria-label="NEON XI oyun menüsü">
      <defs>
        <linearGradient id="nx-nav-surface" x2="0" y2="1"><stop stop-color="#15242b"/><stop offset="1" stop-color="#0b151c"/></linearGradient>
        <clipPath id="nx-foreground-clip" clipPathUnits="objectBoundingBox"><path clip-rule="evenodd" d="M0 0H1V0.893709H0Z M0.837 0.020H0.951V0.073H0.837Z"/></clipPath>
        <clipPath id="nx-name-clip"><rect x="142" y="52" width="101" height="34"/></clipPath>
      </defs>
      <g class="nx-home-art" aria-hidden="true">
        <circle cx="762" cy="87" r="44" fill="#09141b" stroke="#483A2A"/>
        <circle cx="762" cy="87" r="38" fill="#0c1820" stroke="#483A2A" stroke-width="1.7"/>
        <path d="M748 96 Q752 91 752 82 Q752 74 760 73 V71 Q762 67 764 71 V73 Q772 74 772 82 Q772 91 776 96 Z M758 102 Q762 109 766 102" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <g class="nx-profile-name" visibility="hidden" aria-hidden="true" clip-path="url(#nx-name-clip)"><rect x="142" y="52" width="101" height="34" fill="#101b24"/><text class="nx-live-name" x="145" y="79"></text></g>
      ${hotspot('profile','Profil ve giriş',46,46,205,82,40,'#36e9ff')}
      ${hotspot('notifications','Bildirimler',718,46,85,85,43,'#36e9ff')}
      ${hotspot('single','Hemen başla',83,559,305,64,32)}
      <g class="nx-modes">
      ${hotspot('single','Tek oyunculu',65,752,238,111)}
      ${hotspot('bot','Bota karşı',311,752,233,111,24,'#00eaff')}
      ${hotspot('online','Online',551,752,233,111,24,'#00eaff')}
      </g>
      ${hotspot('tournament','Turnuva modu',65,874,719,90,24,'#b849ff')}
      ${hotspot('','Tüm quiz oyunları',638,1000,174,46,23,'#36e9ff','index.html')}
      ${hotspot('','Futbol XOX',42,1058,379,272,30,'#adff27','football-xox/index.html')}
      ${hotspot('','Kariyer İkizi',434,1058,380,272,30,'#00eaff','career-twin/index.html')}
      ${hotspot('','Futbol Imposter',42,1343,379,305,30,'#b849ff','futbol-imposter.html')}
      ${hotspot('','Football Wordle',434,1343,380,305,30,'#adff27','football-wordle/index.html')}
      <g class="nx-home-nav" role="navigation" aria-label="Ana navigasyon">
      <rect x="29" y="1650" width="797" height="136" rx="42" fill="url(#nx-nav-surface)" stroke="#483A2A" stroke-width="3" style="filter:drop-shadow(0 0 4px #483A2A)" aria-hidden="true"/>
      ${navButton('home','Ana sayfa',43,182,132)}
      ${navButton('play','Oyna',231,182,326)}
      ${navButton('friends','Arkadaşlar',424,194,529)}
      ${navButton('settings','Ayarlar',628,179,724)}
      </g>
    </svg>`;
    const status=document.createElement('div');status.className='nx-approved-status';status.setAttribute('role','status');
    const actions={single:()=>clickTarget(single,status,'Tek Oyunculu'),bot:()=>clickTarget(bot,status,'Bota Karşı'),online:()=>clickTarget(online,status,'Online'),tournament:()=>clickTarget(tournament,status,'Turnuva'),settings:()=>clickTarget(settings,status,'Ayarlar'),friends:()=>openSocial('friends',status),profile:()=>openSocial('friends',status),notifications:()=>openSocial('invites',status),home:()=>home.scrollTo({top:0,behavior:'smooth'}),play:()=>{const scaledTop=stage.clientWidth*(405/853);home.scrollTo({top:Math.max(0,scaledTop-12),behavior:'smooth'});}};
    const selectNav=action=>{
      stage.querySelectorAll('.nx-home-nav .nx-hotspot').forEach(n=>{
        if(n.dataset.action===action)n.setAttribute('aria-current','page');
        else n.removeAttribute('aria-current');
      });
    };
    const pulse=target=>{target.classList.add('nx-pressed');clearTimeout(target.nxPulseTimer);target.nxPulseTimer=setTimeout(()=>target.classList.remove('nx-pressed'),280)};
    const release=()=>stage.querySelectorAll('.nx-pressed').forEach(n=>{clearTimeout(n.nxPulseTimer);n.classList.remove('nx-pressed')});
    const dispatch=e=>{
      const target=e.target.closest('.nx-hotspot');if(!target)return;
      pulse(target);
      const action=target.dataset.action;
      if(action==='home'||action==='play')selectNav(action);
      if(actions[action]){e.preventDefault();actions[action]();}
    };
    stage.addEventListener('click',dispatch);
    stage.addEventListener('pointerdown',e=>{const target=e.target.closest('.nx-hotspot');if(target)pulse(target)});
    stage.addEventListener('pointercancel',release);
    home.addEventListener('scroll',release,{passive:true});
    stage.addEventListener('keydown',e=>{const target=e.target.closest('.nx-hotspot');if(!target||e.repeat)return;if(e.key===' '||(e.key==='Enter'&&target.getAttribute('role')==='button')){e.preventDefault();target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))}});
    home.append(legacy,stage,status);
    home.classList.remove('nx-coded-home-v1','nx-coded-home-v2','nx-coded-home-v3','nx-raster-home-v2','nx-raster-home-v3');home.classList.add(HOME_CLASS);home.dataset.nxApprovedHome=VERSION;
    const settingsBody=document.querySelector('#nxSettingsOverlay .nxSettingsBody');
    if(settingsBody&&!document.getElementById('nx-home-help')){
      const help=document.createElement('section');help.id='nx-home-help';help.className='nxSettingsSection';
      for(const [label,target] of [['Nasıl Oynanır',how],['Şikayet ve Öneri',feedback]]){if(!target)continue;const button=document.createElement('button');button.type='button';button.className='nxSettingsButton';button.textContent=label;button.style.cssText='min-height:44px;margin:12px';button.addEventListener('click',()=>{window.NEON_XI_SETTINGS?.close();clickTarget(target,status,label)});help.append(button)}
      if(!how){const guide=document.createElement('details');guide.style.cssText='padding:16px;color:#a8b2bd;font:14px/1.6 Arial';guide.innerHTML='<summary style="min-height:44px;cursor:pointer;color:white">Nasıl Oynanır</summary><p>Draft XI’da oyuncu havuzundan kadronu seç. Dizilişini ve oyuncu görevlerini belirle; kimya uyumunu kontrol et. Taktiklerini hazırladıktan sonra maçı başlat.</p><p>Bota Karşı ile yapay zekâyla, Online ile gerçek rakiplerle oyna. Turnuva Modu 4 veya 8 takımla oynanır. Yan oyunları ana menüdeki kartlardan açabilirsin.</p>';help.append(guide)}
      if(!feedback){const link=document.createElement('a');link.className='nxSettingsButton';link.href='https://github.com/erenkaynak1/neonx-/issues/new';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Şikayet ve Öneri · GitHub’da aç';link.style.cssText='display:inline-flex;align-items:center;min-height:44px;margin:12px;color:white';help.append(link)}
      settingsBody.append(help);
    }
    const syncIdentity=()=>{const name=window.NEON_SOCIAL?.profile?.username;stage.querySelector('.nx-live-name').textContent=name||'';stage.querySelector('.nx-profile-name').setAttribute('visibility',name?'visible':'hidden');stage.querySelector('[data-action="profile"]').setAttribute('aria-label',name?`${name}, Profilim`:'Profil ve giriş');const count=Number(document.querySelector('.nx-social-launch')?.dataset.count)||0;stage.querySelector('[data-action="notifications"]').setAttribute('aria-label',count?`Bildirimler, ${count} bekleyen istek`:'Bildirimler');};
    syncIdentity();setInterval(()=>{if(home.classList.contains('active')&&!document.hidden)syncIdentity()},1500);
  }
  const style=document.createElement('style');style.id='nx-approved-home-v1-style';style.textContent=css;document.head.append(style);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
