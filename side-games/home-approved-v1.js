(() => {
  "use strict";
  const HOME_CLASS="nx-approved-home-v1";
  const VERSION="20260918-crisp-home-v8";
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
#bootHome .nx-foreground{clip-path:url(#nx-foreground-clip)}
#bootHome .nx-idle-navigation{clip-path:inset(89.425% 3.4% 3.145% 3.4% round 5.6%)}
#bootHome .nx-hotspot{cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#bootHome .nx-hit{fill:rgba(255,255,255,.001);stroke:transparent;stroke-width:1.35;vector-effect:non-scaling-stroke;shape-rendering:geometricPrecision;stroke-linejoin:round;transition:stroke .12s ease,fill .12s ease,filter .12s ease,stroke-width .12s ease;pointer-events:all}
#bootHome .nx-outline{fill:none;stroke:transparent;stroke-width:1.2;vector-effect:non-scaling-stroke;pointer-events:none;stroke-linejoin:round;transition:stroke .12s ease,filter .12s ease}
#bootHome .nx-hotspot:is(.nx-pressed,:focus-visible) .nx-outline{stroke:var(--light,#b6ff3c);filter:drop-shadow(0 0 2px var(--light,#b6ff3c))}
#bootHome .nx-approved-status{position:fixed;bottom:max(20px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);z-index:50;color:#fff;background:#101820eF;border:1px solid rgba(255,255,255,.10);border-radius:12px;font:600 13px/1.5 Arial,system-ui,sans-serif;text-align:center;width:min(90%,420px);pointer-events:none}
#bootHome .nx-approved-status:not(:empty){padding:12px 16px}
@media(prefers-reduced-motion:reduce){#bootHome .nx-hit,#bootHome .nx-outline{transition:none}#bootHome *{scroll-behavior:auto!important}}

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
    const hotspot=(action,label,x,y,w,h,r=24,color='#adff27',url='')=>`<a class="nx-hotspot" ${url?`href="./side-games/${url}"`:`role="button" data-action="${action}"`} tabindex="0" aria-label="${label}" style="--light:${color}"><title>${label}</title><rect class="nx-hit" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>${contours[label]||`<rect class="nx-outline" x="${x+2}" y="${y+2}" width="${w-4}" height="${h-4}" rx="${r}"/>`}</a>`;
    stage.innerHTML=`<img class="nx-raster-layer" data-layer="background" src="./side-games/assets/premium-home/neon-xi-background-v4.png" width="853" height="1844" alt="" decoding="async"/>
    <img class="nx-raster-layer nx-foreground" data-layer="foreground" src="./side-games/assets/premium-home/neon-xi-foreground-v4.png" width="853" height="1844" alt="" decoding="async" fetchpriority="high"/>
    <img class="nx-raster-layer nx-idle-navigation" data-layer="idle-navigation" src="./side-games/assets/premium-home/neon-xi-home-idle-v3.png" width="853" height="1844" alt="" decoding="async"/>
    <svg class="nx-home-map nx-approved-canvas" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 853 1844" width="853" height="1844" aria-label="NEON XI oyun menüsü">
      <defs>
        <clipPath id="nx-foreground-clip" clipPathUnits="objectBoundingBox"><path clip-rule="evenodd" d="M0 0H1V0.893709H0Z M0.837 0.020H0.951V0.073H0.837Z"/></clipPath>
        <clipPath id="nx-name-clip"><rect x="142" y="52" width="101" height="34"/></clipPath>
      </defs>
      <g class="nx-home-art" aria-hidden="true">
        <circle cx="762" cy="87" r="44" fill="#09141b" stroke="#233b49"/>
        <circle cx="762" cy="87" r="38" fill="#0c1820" stroke="#a6c9e2" stroke-width="1.7"/>
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
      ${hotspot('home','Ana sayfa',43,1658,182,117)}
      ${hotspot('play','Oyna',231,1658,182,117)}
      ${hotspot('friends','Arkadaşlar',424,1658,194,117,24,'#00eaff')}
      ${hotspot('settings','Ayarlar',628,1658,179,117,24,'#b849ff')}
      </g>
    </svg>`;
    const status=document.createElement('div');status.className='nx-approved-status';status.setAttribute('role','status');
    const actions={single:()=>clickTarget(single,status,'Tek Oyunculu'),bot:()=>clickTarget(bot,status,'Bota Karşı'),online:()=>clickTarget(online,status,'Online'),tournament:()=>clickTarget(tournament,status,'Turnuva'),settings:()=>clickTarget(settings,status,'Ayarlar'),friends:()=>openSocial('friends',status),profile:()=>openSocial('friends',status),notifications:()=>openSocial('invites',status),home:()=>home.scrollTo({top:0,behavior:'smooth'}),play:()=>{const scaledTop=stage.clientWidth*(405/853);home.scrollTo({top:Math.max(0,scaledTop-12),behavior:'smooth'});}};
    const pulse=target=>{target.classList.add('nx-pressed');clearTimeout(target.nxPulseTimer);target.nxPulseTimer=setTimeout(()=>target.classList.remove('nx-pressed'),300)};
    const dispatch=e=>{const target=e.target.closest('.nx-hotspot');if(!target)return;pulse(target);const action=target.dataset.action;if(actions[action]){e.preventDefault();actions[action]()}};
    stage.addEventListener('click',dispatch);
    stage.addEventListener('pointerdown',e=>{const target=e.target.closest('.nx-hotspot');if(target)pulse(target)});
    stage.addEventListener('keydown',e=>{const target=e.target.closest('.nx-hotspot');if(!target)return;if(e.key===' '||(e.key==='Enter'&&target.getAttribute('role')==='button')){e.preventDefault();target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))}});
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
