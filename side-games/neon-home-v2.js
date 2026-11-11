/* NEON XI home screen v2.
   Presentation only: every control forwards to the existing game, settings and social
   entry points. The legacy home markup is kept (hidden and inert) so its buttons, ids and
   inline handlers keep working exactly as before.
   Requires neon-arcade-ui-v1.js (shared icons + navigation) to be loaded first. */
(() => {
  "use strict";
  const HOME_CLASS="nx-approved-home-v1"; // compatibility contract for the boot guard and social modules
  const VERSION="20261111-home-v2";
  const ASSETS="./assets/ui/";
  const UI=window.NEON_ARCADE_UI;
  const icon=name=>UI?.svg?UI.svg(name):"";

  /* Draft XI entry modes and the quiz shelf. `href` is relative to ./side-games/. */
  const MODES=[
    {action:"single",label:"TEK OYUNCULU",name:"Tek oyunculu",icon:"single"},
    {action:"bot",label:"BOTA KARŞI",name:"Bota karşı",icon:"bot"},
    {action:"online",label:"ONLINE",name:"Online",icon:"online"},
    {action:"tournament",label:"TURNUVA",name:"Turnuva modu, 4 veya 8 takım",icon:"tournament"}
  ];
  const GAMES=[
    {href:"football-xox/index.html",name:"Futbol XOX",label:"FUTBOL XOX",tag:"KESİŞİM",art:"thumb-xox.webp"},
    {href:"career-twin/index.html",name:"Kariyer İkizi",label:"KARİYER İKİZİ",tag:"EŞLEŞTİRME",art:"thumb-twin.webp"},
    {href:"futbol-imposter.html",name:"Futbol Imposter",label:"FUTBOL IMPOSTER",tag:"SOSYAL TAHMİN",art:"thumb-imposter.webp"},
    {href:"football-wordle/index.html",name:"Football Wordle",label:"FOOTBALL WORDLE",tag:"HARF TAHMİNİ",art:"thumb-wordle.webp"},
    {href:"reverse-xi/index.html",name:"RE:VERSE",label:"RE:VERSE",tag:"SES TAKLİDİ",art:"thumb-reverse.webp"},
    {href:"en11/index.html",name:"EN 11",label:"EN 11",tag:"KADRO DRAFTI",art:"thumb-en11.webp"}
  ];

  /* The tournament hub is an embedded document: hand it the shared tokens so it matches the app.
     Colour and type only; its layout, logic and messaging are untouched. */
  const TOURNAMENT_SKIN=`:root{--bg:#050708;--panel:#10151A;--panel2:#171D23;--line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.16);--text:#F3F6F8;--muted:#AAB6C0;--green:#BAFF18;--green2:#31FF76;--purple:#9ADFFF;--gold:#DCFF72;--blue:#3DCFFF;--shadow:0 16px 44px rgba(0,0,0,.45);--r:12px;--r2:8px}
@font-face{font-family:"Barlow";font-weight:500;src:url("${new URL("./assets/ui/fonts/Barlow-Medium.woff",document.baseURI).href}") format("woff")}
@font-face{font-family:"Barlow";font-weight:600 900;src:url("${new URL("./assets/ui/fonts/Barlow-SemiBold.woff",document.baseURI).href}") format("woff")}
@font-face{font-family:"Barlow Condensed";font-weight:600 900;src:url("${new URL("./assets/ui/fonts/BarlowCondensed-Bold.woff",document.baseURI).href}") format("woff")}
html,body{font-family:"Barlow",system-ui,sans-serif}body{background:#050708}.app:before{display:none}
.topbar{background:#0A0D10;backdrop-filter:none}.logo{border-radius:8px;border-color:rgba(255,255,255,.16);background:#171D23;box-shadow:none}
.card{background:#10151A;box-shadow:none}.pill{border-radius:4px}
.eyebrow,.brand strong,.btn{font-family:"Barlow Condensed","Barlow",system-ui,sans-serif;letter-spacing:.12em}
.eyebrow{font-size:12px}.screenHead h1{font-family:"Barlow Condensed","Barlow",system-ui,sans-serif;font-style:italic;font-weight:800;letter-spacing:.01em;text-transform:uppercase}
.btn{border-radius:8px;background:transparent;box-shadow:none;font-size:15px}.btn:hover{transform:none;border-color:rgba(255,255,255,.3)}
.btn.primary{background:#BAFF18;color:#0B1005;box-shadow:none}.btn.primary:hover{background:#DCFF72}
.btn.purple{background:#171D23;border-color:rgba(154,223,255,.5);color:#F3F6F8}
.modeCard:before{display:none}.modeCard.tournament,.sizeChoice.active{background:#171D23;box-shadow:inset 3px 0 0 #BAFF18}.newTag{border-radius:4px;color:#0B1005}
input,select{border-radius:8px!important}`;
  function skinTournament(){
    const frame=document.getElementById("neonTournamentFrame");if(!frame||frame.dataset.nxSkin)return;frame.dataset.nxSkin="1";
    const paint=()=>{try{const doc=frame.contentDocument;if(!doc?.head||doc.getElementById("nx-v2-tokens"))return;const style=doc.createElement("style");style.id="nx-v2-tokens";style.textContent=TOURNAMENT_SKIN;doc.head.append(style)}catch{}};
    frame.addEventListener("load",paint);paint();
  }

  const norm=s=>(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
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
  /* Social panels are owned by the social modules; this only asks them to open. */
  function openSocial(tab,status,after){
    let tries=0;
    const open=()=>{
      if(window.NEON_SOCIAL&&typeof window.NEON_SOCIAL.open==="function"){window.NEON_SOCIAL.open(tab);after?.();return true;}
      const fallback=document.querySelector(`[data-neon-social="${tab}"]`);
      if(fallback){fallback.click();after?.();return true;}
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
  /* The account sheet lives in the classic social panel. Label it for the entry that opened it. */
  function frameSheet(mode){
    const shade=document.querySelector(".nx-social-shade");if(!shade)return;
    if(shade.classList.contains("nx-profile-mode")!==(mode==="profile"))shade.classList.toggle("nx-profile-mode",mode==="profile");
    const title=shade.querySelector(".nx-social-brand strong");
    if(title)title.textContent={profile:"Profil",play:"Oyna",leaderboard:"Liderlik"}[mode]||"Sosyal";
    if(mode==="profile"&&window.NEON_SOCIAL?.profile)shade.querySelector('.nx-social-tabs [data-tab="friends"]')?.click();
    if(!shade.nxSheetWatch){
      // Guarded: writing an unchanged class list still queues a mutation record and would loop.
      shade.nxSheetWatch=new MutationObserver(()=>{if(!shade.classList.contains("open")&&shade.classList.contains("nx-profile-mode"))shade.classList.remove("nx-profile-mode")});
      shade.nxSheetWatch.observe(shade,{attributes:true,attributeFilter:["class"]});
    }
  }

  function markup(){
    const modes=MODES.map(m=>`<button type="button" class="nxh-mode" data-action="${m.action}" aria-label="${m.name}">${icon(m.icon)}<span>${m.label}</span></button>`).join("");
    const games=GAMES.map(g=>`<a class="nxh-tile" href="./side-games/${g.href}" aria-label="${g.name}"><img src="${ASSETS}${g.art}" width="704" height="396" alt="" loading="lazy" decoding="async"><span class="nxh-tile-copy"><small>${g.tag}</small><strong>${g.label}</strong></span></a>`).join("");
    return `<div class="nxh-bg" aria-hidden="true"></div>
    <div class="nxh-scroll nx-home-map">
      <div class="nxh-wrap">
        <header class="nxh-top">
          <button type="button" class="nxh-profile" data-action="profile" aria-label="Profil ve giriş"><span class="nxh-avatar" aria-hidden="true">${icon("single")}</span><span class="nxh-profile-copy"><span class="nxh-profile-name">Misafir</span><span class="nxh-profile-sub">Giriş yap</span></span></button>
          <div class="nxh-top-actions">
            <button type="button" class="nxh-icon-btn" data-action="notifications" aria-label="Bildirimler">${icon("bell")}<span class="nxh-dot" hidden></span></button>
            <button type="button" class="nxh-icon-btn" data-action="settings" aria-label="Ayarlar">${icon("settings")}</button>
          </div>
        </header>
        <div class="nxh-brand"><img src="${ASSETS}logo-neon-xi.webp" width="640" height="141" alt="NEON XI" decoding="async" fetchpriority="high"><span aria-hidden="true">FUTBOL YÖNETİMİ</span></div>
        <div class="nxh-main">
          <button type="button" class="nxh-party" data-action="lobby" hidden><span class="nxh-party-faces" aria-hidden="true"></span><span class="nxh-party-copy"><b>AKTİF PARTİ</b><span></span></span>${icon("chevron")}</button>
          <section class="nxh-hero" aria-labelledby="nxh-draft-title">
            <div class="nxh-hero-stage">
              <img class="nxh-hero-art" src="${ASSETS}hero-draft.webp" width="941" height="538" alt="" decoding="async" fetchpriority="high">
              <div class="nxh-hero-copy">
                <span class="nxh-eyebrow">ANA OYUN</span>
                <h1 id="nxh-draft-title">DRAFT XI</h1>
                <p>Kadronu kur. Oyuna yön ver.</p>
                <button type="button" class="nxh-cta" data-action="single" aria-label="Hemen başla">HEMEN BAŞLA${icon("arrow")}</button>
              </div>
            </div>
            <div class="nxh-modes" role="group" aria-label="Draft XI oyun modları">${modes}</div>
          </section>
        </div>
        <section class="nxh-quiz" aria-labelledby="nxh-quiz-title">
          <div class="nxh-section-head"><h2 id="nxh-quiz-title">QUIZ OYUNLARI <small>${GAMES.length} OYUN</small></h2><a class="nxh-more" href="./side-games/index.html" aria-label="Tüm quiz oyunları">TÜMÜ${icon("chevron")}</a></div>
          <div class="nxh-grid">${games}</div>
        </section>
        <footer class="nxh-foot">
          <a class="nxh-link" href="./side-games/how-to-play.html" data-help="how">${icon("help")}Nasıl oynanır</a>
          <a class="nxh-link" href="https://github.com/erenkaynak1/neonx-/issues/new" target="_blank" rel="noopener noreferrer" data-help="feedback">${icon("message")}Şikayet ve öneri</a>
        </footer>
      </div>
    </div>
    <nav class="nx-nav nx-home-nav" aria-label="Ana navigasyon">${UI?.navMarkup?UI.navMarkup("home"):""}</nav>`;
  }

  function initialize(){
    const home=document.getElementById("bootHome");
    if(!home||home.dataset.nxApprovedHome===VERSION)return;
    const single=document.getElementById("singleModeBtn"),bot=document.getElementById("botModeBtn"),online=document.getElementById("onlineModeBtn");
    const tournament=home.querySelector(".neonHomeQuickRow button"),settings=home.querySelector("[data-open-neon-settings]");
    const excluded=[single,bot,online,tournament,settings];
    const how=findAction(home,["nasil oynanir","how to play"],excluded);
    const feedback=findAction(home,["sikayet","oneri","feedback"],[...excluded,how]);
    const legacy=document.createElement("div");legacy.className="nx-approved-legacy";legacy.setAttribute("aria-hidden","true");legacy.inert=true;
    while(home.firstChild)legacy.append(home.firstChild);

    const stage=document.createElement("main");
    stage.className="nx-home nx-approved-canvas nxh nxh-enter";stage.setAttribute("aria-label","NEON XI ana menüsü");
    stage.innerHTML=markup();
    const status=document.createElement("div");status.className="nx-approved-status";status.setAttribute("role","status");
    stage.append(status);
    const scroller=stage.querySelector(".nxh-scroll"),nav=stage.querySelector(".nx-nav");

    const actions={
      single:()=>clickTarget(single,status,"Tek Oyunculu"),
      bot:()=>clickTarget(bot,status,"Bota Karşı"),
      online:()=>clickTarget(online,status,"Online"), // normally intercepted by the shared online chooser
      tournament:()=>clickTarget(tournament,status,"Turnuva"),
      settings:()=>clickTarget(settings,status,"Ayarlar"),
      home:()=>scroller.scrollTo({top:0,behavior:"smooth"}),
      profile:()=>window.NEON_SOCIAL?.profile?openSocial("play",status,()=>frameSheet("profile")):openSocial("friends",status,()=>frameSheet("profile")),
      notifications:()=>openSocial("invites",status),
      friends:()=>openSocial("friends",status),
      lobby:()=>openSocial("party",status),
      play:()=>openSocial("play",status,()=>frameSheet("play")),
      leaderboard:()=>openSocial("leaderboard",status,()=>frameSheet("leaderboard"))
    };
    const launch=target=>{target.classList.remove("is-launching");void target.offsetWidth;target.classList.add("is-launching");setTimeout(()=>target.classList.remove("is-launching"),320)};
    const calm=()=>matchMedia("(prefers-reduced-motion: reduce)").matches||document.body.classList.contains("nx-reduced-effects");
    stage.addEventListener("click",e=>{
      const tile=e.target.closest("a.nxh-tile");
      if(tile){
        // Let the lime wash read before leaving; never hijack new-tab gestures.
        if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||calm())return;
        e.preventDefault();launch(tile);const href=tile.href;setTimeout(()=>{location.href=href},170);return;
      }
      const target=e.target.closest("[data-action]");if(!target)return;
      const action=target.dataset.action;if(!actions[action])return;
      e.preventDefault();
      if(target.matches(".nxh-mode,.nxh-cta"))launch(target);
      actions[action]();
    });
    UI?.bindNavFeedback?.(nav);
    stage.addEventListener("animationend",e=>{if(e.target===nav)stage.classList.remove("nxh-enter")});
    setTimeout(()=>stage.classList.remove("nxh-enter"),1200);

    home.append(legacy,stage);
    home.classList.remove("nx-coded-home-v1","nx-coded-home-v2","nx-coded-home-v3","nx-raster-home-v2","nx-raster-home-v3");
    home.classList.add(HOME_CLASS);home.dataset.nxApprovedHome=VERSION;
    document.documentElement.classList.add("nx-home-v2");
    skinTournament();

    // Help stays reachable from Settings as before.
    const settingsBody=document.querySelector("#nxSettingsOverlay .nxSettingsBody");
    if(settingsBody&&!document.getElementById("nx-home-help")){
      const help=document.createElement("section");help.id="nx-home-help";help.className="nxSettingsSection";
      for(const [label,target] of [["Nasıl Oynanır",how],["Şikayet ve Öneri",feedback]]){if(!target)continue;const button=document.createElement("button");button.type="button";button.className="nxSettingsButton";button.textContent=label;button.style.cssText="min-height:44px;margin:12px";button.addEventListener("click",()=>{window.NEON_XI_SETTINGS?.close();clickTarget(target,status,label)});help.append(button)}
      if(!how){const guide=document.createElement("details");guide.style.cssText="padding:16px;color:#a8b2bd;font:14px/1.6 Arial";guide.innerHTML="<summary style=\"min-height:44px;cursor:pointer;color:white\">Nasıl Oynanır</summary><p>Draft XI’da oyuncu havuzundan kadronu seç. Dizilişini ve oyuncu görevlerini belirle; kimya uyumunu kontrol et. Taktiklerini hazırladıktan sonra maçı başlat.</p><p>Bota Karşı ile yapay zekâyla, Online ile gerçek rakiplerle oyna. Turnuva Modu 4 veya 8 takımla oynanır. Yan oyunları ana menüdeki kartlardan açabilirsin.</p>";help.append(guide)}
      if(!feedback){const link=document.createElement("a");link.className="nxSettingsButton";link.href="https://github.com/erenkaynak1/neonx-/issues/new";link.target="_blank";link.rel="noopener noreferrer";link.textContent="Şikayet ve Öneri · GitHub’da aç";link.style.cssText="display:inline-flex;align-items:center;min-height:44px;margin:12px;color:white";help.append(link)}
      settingsBody.append(help);
    }
    if(how)stage.querySelector('[data-help="how"]').addEventListener("click",e=>{e.preventDefault();clickTarget(how,status,"Nasıl Oynanır")});
    if(feedback)stage.querySelector('[data-help="feedback"]').addEventListener("click",e=>{e.preventDefault();clickTarget(feedback,status,"Şikayet ve Öneri")});

    /* Live state: identity, pending notifications, active party. Read-only. */
    const profile=stage.querySelector(".nxh-profile"),avatar=profile.querySelector(".nxh-avatar"),nameEl=profile.querySelector(".nxh-profile-name"),subEl=profile.querySelector(".nxh-profile-sub");
    const bell=stage.querySelector('[data-action="notifications"]'),dot=bell.querySelector(".nxh-dot");
    const party=stage.querySelector(".nxh-party"),faces=party.querySelector(".nxh-party-faces"),partyLine=party.querySelector(".nxh-party-copy span");
    let lastIdentity="",lastParty="",lastCount=-1;
    const syncIdentity=()=>{
      const name=window.NEON_SOCIAL?.profile?.username||"";
      const signedIn=Boolean(name)||document.querySelector(".nx-social-launch")?.textContent==="SOSYAL";
      const key=`${name}|${signedIn}`;if(key===lastIdentity)return;lastIdentity=key;
      profile.classList.toggle("is-signed",Boolean(name));
      if(name){avatar.textContent=name.trim()[0]||"N";nameEl.textContent=name;subEl.textContent="Profilim";profile.setAttribute("aria-label",`${name}, profilim`)}
      else{avatar.innerHTML=icon("single");nameEl.textContent=signedIn?"Oyuncu":"Misafir";subEl.textContent=signedIn?"Oyuncu adını seç":"Giriş yap";profile.setAttribute("aria-label","Profil ve giriş")}
    };
    const syncCount=count=>{
      UI?.setNavBadge?.(nav,count);
      if(count===lastCount)return;
      const grew=count>lastCount&&lastCount>=0;lastCount=count;
      dot.hidden=!count;dot.textContent=count>99?"99+":String(count);
      bell.setAttribute("aria-label",count?`Bildirimler, ${count} bekleyen davet veya istek`:"Bildirimler");
      bell.classList.toggle("has-news",false);if(count&&grew){void bell.offsetWidth;bell.classList.add("has-news")}
    };
    const syncParty=()=>{
      const p=window.NEON_SOCIAL?.party,members=Object.entries(p?.members||{});
      const key=members.length?`${p.leaderUid}|${members.map(([uid,m])=>uid+":"+(m?.username||"")).join(",")}`:"";
      if(key===lastParty)return;lastParty=key;
      if(!members.length){party.hidden=true;return}
      const leader=p.members?.[p.leaderUid]?.username||"";
      members.sort((a,b)=>a[0]===p.leaderUid?-1:b[0]===p.leaderUid?1:0);
      faces.innerHTML=members.slice(0,3).map(([,m])=>`<i>${esc((m?.username||"N").trim()[0]||"N")}</i>`).join("");
      partyLine.textContent=`${members.length} oyuncu${leader?` · Lider @${leader}`:""}`;
      party.setAttribute("aria-label",`Aktif parti, ${members.length} oyuncu${leader?`, lider ${leader}`:""}. Lobiyi aç`);
      party.hidden=false;
    };
    const sync=()=>{syncIdentity();syncParty()};
    sync();
    if(UI?.watchSocialCount)UI.watchSocialCount(syncCount);
    setInterval(()=>{if(home.classList.contains("active")&&!document.hidden)sync()},1000);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})();
