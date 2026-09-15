(() => {
  "use strict";
  const HOME_CLASS="nx-approved-home-v1";
  const VERSION="20260915-calm-home-v2";
  const css=`
#bootScreen:has(#bootHome.nx-approved-home-v1.active) .bootGlow,#bootScreen:has(#bootHome.nx-approved-home-v1.active) .bootBrand{display:none!important}
#bootScreen:has(#bootHome.nx-approved-home-v1.active) .bootPanel{width:100vw!important;max-width:none!important;height:100dvh!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
#bootHome.nx-approved-home-v1.active{display:block!important;position:relative!important;width:100%!important;height:100dvh!important;overflow:auto!important;background:#05070a!important;color:#fff!important;isolation:isolate}
#bootHome.nx-approved-home-v1 *{box-sizing:border-box}
.nx-approved-legacy{display:none!important}
#bootHome .nx-home{--accent:#b6ff3c;--secondary:#a8b2bd;max-width:760px;margin:auto;padding:max(24px,env(safe-area-inset-top)) 24px calc(128px + env(safe-area-inset-bottom));font-family:Arial,system-ui,sans-serif;text-align:left;position:relative}
#bootHome.nx-approved-home-v1:before{content:"";position:fixed;inset:0;z-index:-1;background:linear-gradient(#05070ac9,#05070aeb),url('./side-games/assets/premium-home/home-city-v2.webp') center/cover;pointer-events:none}
#bootHome .nx-home button,#bootHome .nx-home a,#bootHome .nx-home-nav button{font:inherit;color:inherit;text-decoration:none;cursor:pointer;min-height:44px;margin:0;letter-spacing:normal;box-shadow:none;text-shadow:none;transform:none}
#bootHome .nx-home button,#bootHome .nx-home-nav button{appearance:none}
#bootHome .nx-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
#bootHome .nx-profile{display:flex;align-items:center;gap:12px;border:0;background:none;padding:0;text-align:left;max-width:80%}
#bootHome .nx-avatar{width:44px;height:44px;display:grid;place-items:center;background:#121820;border:1px solid #ffffff14;border-radius:50%}
#bootHome .nx-username{display:block;max-width:200px;overflow:hidden;text-overflow:ellipsis;font-size:14px;font-weight:700}
#bootHome .nx-muted{display:block;color:var(--secondary);font-size:12px;margin-top:4px}
#bootHome .nx-bell{position:relative;display:grid;place-items:center;width:44px;border:1px solid #ffffff14;border-radius:12px;background:#0d1117}
#bootHome .nx-badge{position:absolute;right:-4px;top:-4px;background:#a8b2bd;color:#05070a;border-radius:12px;padding:2px 5px;font-size:11px}
#bootHome .nx-brand{margin:0 auto 32px;text-align:center}
#bootHome .nx-brand img{display:block;width:min(100%,320px);height:76px;object-fit:contain;margin:auto;filter:drop-shadow(0 0 12px #b6ff3c66)}
#bootHome .nx-brand p{font-size:10px;color:#a8b2bd;letter-spacing:5px;margin:8px 0 0}
#bootHome .nx-hero{position:relative;isolation:isolate;overflow:hidden;padding:24px 16px;border:1px solid #ffffff14;border-radius:16px;background:#0d1117;min-height:216px}
#bootHome .nx-hero:before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,#05070af2 12%,#05070ab8 54%,#05070a33),url('./assets/prematch-cyber-stadium.webp') 65% center/cover}
#bootHome .nx-eyebrow{margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:1px;color:#a8b2bd}
#bootHome .nx-hero h1{font-size:40px;letter-spacing:-.4px;line-height:1.05;font-weight:800;margin:0 0 12px;color:#fff}
#bootHome .nx-hero p:not(.nx-eyebrow){font-size:13px;line-height:1.6;color:#a8b2bd;max-width:200px;margin:0 0 24px}
#bootHome .nx-home .nx-primary{display:inline-flex;align-items:center;gap:16px;background:#b6ff3c;color:#111806;border:0;border-radius:12px;padding:12px 16px;font-size:14px;font-weight:700;letter-spacing:.56px;box-shadow:0 0 24px #b6ff3c55}
#bootHome .nx-modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:32px;scroll-margin-top:24px}
#bootHome .nx-card{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center;padding:16px 8px;gap:12px;background:rgba(13,17,23,.72);backdrop-filter:blur(20px);border:1px solid #ffffff14;border-radius:16px;min-width:0}
#bootHome .nx-card svg{width:28px;height:28px;color:#a8b2bd;flex-shrink:0}
#bootHome .nx-card strong{font-size:16px;line-height:1.25;font-weight:700}
#bootHome .nx-card small{font-size:13px;line-height:1.4;color:#a8b2bd}
#bootHome .nx-row{width:100%;display:flex;align-items:center;gap:16px;padding:16px;background:rgba(13,17,23,.72);border:1px solid #ffffff14;border-radius:16px;text-align:left}
#bootHome .nx-tournament{margin-top:32px!important}
#bootHome .nx-row>svg:first-child{color:#a8b2bd;width:28px;height:28px;flex-shrink:0}
#bootHome .nx-row>svg:last-child{margin-left:auto;color:#a8b2bd;flex-shrink:0}
#bootHome .nx-row strong{font-size:16px}#bootHome .nx-row small{display:block;margin-top:4px;font-size:13px;color:#a8b2bd}
#bootHome .nx-games-section{margin-top:32px}#bootHome .nx-games-section h2{font-size:12px;letter-spacing:.96px;font-weight:600;color:#a8b2bd;margin:0 0 12px}
#bootHome .nx-games{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
#bootHome .nx-games .nx-card{padding:16px 4px;gap:12px;justify-content:center;min-height:116px}
#bootHome .nx-games strong{font-size:11px;line-height:1.5;overflow-wrap:normal}
#bootHome .nx-all{margin-top:12px!important;font-size:14px!important}
#bootHome .nx-home-nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:min(100%,760px);z-index:30;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));padding:8px 12px max(8px,env(safe-area-inset-bottom));background:#0d1117f5;backdrop-filter:blur(20px);border-top:1px solid #ffffff14}
#bootHome:not(.active) .nx-home-nav{display:none}
#bootHome .nx-home-nav button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:56px;border:0;background:none;padding:4px;color:#a8b2bd;font-size:11px}
#bootHome .nx-home-nav button[aria-current]{color:#b6ff3c}
#bootHome .nx-home svg,#bootHome .nx-home-nav svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
#bootHome .nx-home :is(button,a):focus-visible,#bootHome .nx-home-nav button:focus-visible{outline:2px solid #b6ff3c;outline-offset:4px}
@media(hover:hover){#bootHome .nx-card:hover,#bootHome .nx-row:hover{border-color:#b6ff3c66;background:#121820}}
#bootHome .nx-card:active,#bootHome .nx-row:active{border-color:#b6ff3c66;box-shadow:0 0 12px #b6ff3c40}
#bootHome .nx-approved-status{position:fixed;bottom:88px;left:50%;transform:translateX(-50%);z-index:50;color:#fff;background:#121820;border-radius:12px;font:13px/1.5 Arial;text-align:center;width:min(90%,420px)}
#bootHome .nx-approved-status:not(:empty){padding:12px}
@media(min-width:600px){#bootHome .nx-home{padding-left:32px;padding-right:32px}#bootHome .nx-hero{padding:32px;min-height:260px}#bootHome .nx-hero h1{font-size:56px}#bootHome .nx-card{padding:24px 16px}#bootHome .nx-games strong{font-size:14px}}
@media(prefers-reduced-motion:reduce){#bootHome *{scroll-behavior:auto!important}}
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

  const icons={
    user:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    bell:'<path d="M5 16h14l-2-3V8a5 5 0 0 0-10 0v5zM10 20h4"/>',
    bot:'<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4M8 12h1m6 0h1m-7 4h6M1 11v5m22-5v5"/>',
    globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
    trophy:'<path d="M7 3h10v7a5 5 0 0 1-10 0zM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 15v6m-4 0h8"/>',
    arrow:'<path d="m9 5 7 7-7 7"/>',
    xox:'<path d="m3 3 6 6m0-6L3 9m12 6 6 6m0-6-6 6"/><circle cx="18" cy="6" r="4"/><circle cx="6" cy="18" r="4"/>',
    twin:'<path d="M10 21v-5H6v-4H3l3-5a6 6 0 0 1 4-4m4 18v-5h4v-4h3l-3-5a6 6 0 0 0-4-4M12 2v20"/>',
    imposter:'<path d="M5 21V9a7 7 0 0 1 14 0v12h-5v-4h-4v4z"/><rect x="10" y="6" width="12" height="6" rx="3"/>',
    wordle:'<rect x="1" y="8" width="6" height="8" rx="1"/><rect x="9" y="8" width="6" height="8" rx="1" stroke="#6e9e2e"/><rect x="17" y="8" width="6" height="8" rx="1"/><path d="M3 14v-4h2m-2 2h2m6-2h2m-1 0v4m7-4v4h2v-2h-2m0-2h2v2" stroke-width=".7"/>',
    home:'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',
    play:'<path d="m8 4 12 8-12 8z"/>',
    friends:'<circle cx="9" cy="7" r="4"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 3a4 4 0 0 1 0 8m2 3a6 6 0 0 1 3 5v2"/>',
    settings:'<path d="m9 3-1 3-3 1-2 4 2 3v4l4 3 3-1 3 1 4-3v-4l2-3-2-4-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>'
  };
  const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
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
    const stage=document.createElement('main');stage.className='nx-home';stage.setAttribute('aria-label','NEON XI ana menüsü');
    const card=(action,title,desc,symbol)=>`<button type="button" class="nx-card" data-action="${action}">${icon(symbol)}<strong>${title}</strong><small>${desc}</small></button>`;
    const game=(url,title,symbol)=>`<a class="nx-card" href="./side-games/${url}">${icon(symbol)}<strong>${title}</strong></a>`;
    stage.innerHTML=`
      <header class="nx-top"><button type="button" class="nx-profile" data-action="profile" aria-label="Profil ve giriş"><span class="nx-avatar">${icon('user')}</span><span><span class="nx-username">Oyuncu</span><span class="nx-muted nx-account-label">Giriş yap / Misafir oyna</span></span></button><button type="button" class="nx-bell" data-action="notifications" aria-label="Bildirimler">${icon('bell')}<span class="nx-badge" hidden></span></button></header>
      <div class="nx-brand"><img src="./assets/neon-xi-logo-outline.png" alt="NEON XI" width="320" height="76"><p>FUTBOL YÖNETİMİ</p></div>
      <section class="nx-hero" aria-labelledby="nx-draft-title"><p class="nx-eyebrow">ANA OYUN</p><h1 id="nx-draft-title">DRAFT XI</h1><p>Hayalindeki kadroyu kur,<br>zafer için sahaya sür.</p><button type="button" class="nx-primary" data-action="single">HEMEN BAŞLA ${icon('arrow')}</button></section>
      <section class="nx-modes" aria-label="Oyun modları" tabindex="-1">${card('single','TEK<br>OYUNCULU','Kariyer modu','user')}${card('bot','BOTA<br>KARŞI','Yapay zekâya karşı','bot')}${card('online','ONLINE','Gerçek rakiplere karşı','globe')}</section>
      <button type="button" class="nx-row nx-tournament" data-action="tournament">${icon('trophy')}<span><strong>TURNUVA MODU</strong><small>4 takım · 8 takım</small></span>${icon('arrow')}</button>
      <section class="nx-games-section" aria-labelledby="nx-side-title"><h2 id="nx-side-title">YAN OYUNLAR</h2><div class="nx-games">${game('football-xox/index.html','FUTBOL XOX','xox')}${game('career-twin/index.html','KARİYER İKİZİ','twin')}${game('futbol-imposter.html','FUTBOL IMPOSTER','imposter')}${game('football-wordle/index.html','FOOTBALL WORDLE','wordle')}</div><a class="nx-row nx-all" href="./side-games/index.html">TÜM YAN OYUNLAR ${icon('arrow')}</a></section>`;
    const nav=document.createElement('nav');nav.className='nx-home-nav';nav.setAttribute('aria-label','Ana navigasyon');
    nav.innerHTML=[['home','home','ANA SAYFA'],['play','play','OYNA'],['friends','friends','ARKADAŞLAR'],['settings','settings','AYARLAR']].map(([action,symbol,label])=>`<button type="button" data-action="${action}" ${action==='home'?'aria-current="page"':''}>${icon(symbol)}${label}</button>`).join('');
    const status=document.createElement('div');status.className='nx-approved-status';status.setAttribute('role','status');
    const actions={single:()=>clickTarget(single,status,'Tek Oyunculu'),bot:()=>clickTarget(bot,status,'Bota Karşı'),online:()=>clickTarget(online,status,'Online'),tournament:()=>clickTarget(tournament,status,'Turnuva'),settings:()=>clickTarget(settings,status,'Ayarlar'),friends:()=>openSocial('friends',status),profile:()=>openSocial('friends',status),notifications:()=>openSocial('invites',status),home:()=>home.scrollTo({top:0,behavior:'smooth'}),play:()=>{const modes=stage.querySelector('.nx-modes');modes.scrollIntoView({behavior:'smooth',block:'start'});modes.focus({preventScroll:true});}};
    const dispatch=e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(actions[action])actions[action]()};
    stage.addEventListener('click',dispatch);nav.addEventListener('click',dispatch);
    home.append(legacy,stage,nav,status);
    home.classList.remove('nx-coded-home-v1','nx-coded-home-v2','nx-coded-home-v3','nx-raster-home-v2','nx-raster-home-v3');home.classList.add(HOME_CLASS);home.dataset.nxApprovedHome=VERSION;
    const settingsBody=document.querySelector('#nxSettingsOverlay .nxSettingsBody');
    if(settingsBody&&!document.getElementById('nx-home-help')){
      const help=document.createElement('section');help.id='nx-home-help';help.className='nxSettingsSection';
      for(const [label,target] of [['Nasıl Oynanır',how],['Şikayet ve Öneri',feedback]]){if(!target)continue;const button=document.createElement('button');button.type='button';button.className='nxSettingsButton';button.textContent=label;button.style.cssText='min-height:44px;margin:12px';button.addEventListener('click',()=>{window.NEON_XI_SETTINGS?.close();clickTarget(target,status,label)});help.append(button)}
      if(!how){const guide=document.createElement('details');guide.style.cssText='padding:16px;color:#a8b2bd;font:14px/1.6 Arial';guide.innerHTML='<summary style="min-height:44px;cursor:pointer;color:white">Nasıl Oynanır</summary><p>Draft XI’da oyuncu havuzundan kadronu seç. Dizilişini ve oyuncu görevlerini belirle; kimya uyumunu kontrol et. Taktiklerini hazırladıktan sonra maçı başlat.</p><p>Bota Karşı ile yapay zekâyla, Online ile gerçek rakiplerle oyna. Turnuva Modu 4 veya 8 takımla oynanır. Yan oyunları ana menüdeki kartlardan açabilirsin.</p>';help.append(guide)}
      if(!feedback){const link=document.createElement('a');link.className='nxSettingsButton';link.href='https://github.com/erenkaynak1/neonx-/issues/new';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Şikayet ve Öneri · GitHub’da aç';link.style.cssText='display:inline-flex;align-items:center;min-height:44px;margin:12px;color:white';help.append(link)}
      settingsBody.append(help);
    }
    const syncIdentity=()=>{const name=window.NEON_SOCIAL?.profile?.username;stage.querySelector('.nx-username').textContent=name||'Oyuncu';stage.querySelector('.nx-account-label').textContent=name?'Profilim':'Giriş yap / Misafir oyna';const count=Number(document.querySelector('.nx-social-launch')?.dataset.count)||0;const badge=stage.querySelector('.nx-badge');badge.hidden=!count;badge.textContent=count>99?'99+':String(count);stage.querySelector('.nx-bell').setAttribute('aria-label',count?`Bildirimler, ${count} bekleyen istek`:'Bildirimler');};
    syncIdentity();setInterval(()=>{if(home.classList.contains('active')&&!document.hidden)syncIdentity()},1500);
  }
  const style=document.createElement('style');style.id='nx-approved-home-v1-style';style.textContent=css;document.head.append(style);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
