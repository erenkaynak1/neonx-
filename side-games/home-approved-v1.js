(() => {
  "use strict";

  const HOME_CLASS = "nx-approved-home-v1";
  const STYLE_ID = "nx-approved-home-v1-style";
  const VERSION = "20260903-approved-home-v1";
  const ART = `./side-games/assets/premium-home/neon-xi-approved-home-20260903.png?v=${VERSION}`;

  const css = `
    #bootScreen:has(#bootHome.${HOME_CLASS}.active){background:#010403!important}
    #bootScreen:has(#bootHome.${HOME_CLASS}.active) .bootGlow,
    #bootScreen:has(#bootHome.${HOME_CLASS}.active) .bootBrand{display:none!important}
    #bootScreen:has(#bootHome.${HOME_CLASS}.active) .bootPanel{
      width:100vw!important;max-width:none!important;height:100dvh!important;min-height:100dvh!important;
      padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important
    }
    #bootHome.${HOME_CLASS}.active{
      position:relative!important;display:block!important;width:100%!important;height:100dvh!important;overflow:auto!important;
      background:#010403!important;color:#fff!important;isolation:isolate
    }
    #bootHome.${HOME_CLASS} *{box-sizing:border-box}
    #bootHome.${HOME_CLASS} .nx-approved-legacy{
      position:fixed!important;left:-99999px!important;top:0!important;width:1px!important;height:1px!important;
      overflow:hidden!important;visibility:hidden!important;pointer-events:none!important
    }
    #bootHome.${HOME_CLASS} .nx-approved-stage{
      position:relative;z-index:1;width:100%;min-height:100dvh;display:flex;justify-content:center;align-items:flex-start;
      overflow:hidden;background:#010403
    }
    #bootHome.${HOME_CLASS} .nx-approved-stage::before{
      content:"";position:fixed;inset:-42px;z-index:-2;background-image:url("${ART}");background-position:center;background-size:cover;background-repeat:no-repeat;
      filter:blur(25px) saturate(.48) brightness(.33);transform:scale(1.10);opacity:.82;pointer-events:none
    }
    #bootHome.${HOME_CLASS} .nx-approved-stage::after{
      content:"";position:fixed;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.22),rgba(0,5,3,.42) 62%,rgba(0,0,0,.70));pointer-events:none
    }
    #bootHome.${HOME_CLASS} .nx-approved-canvas{
      position:relative;width:min(100vw,941px);aspect-ratio:941/1672;flex:0 0 auto;overflow:hidden;background:#010403;
      box-shadow:0 0 50px rgba(0,0,0,.30)
    }
    #bootHome.${HOME_CLASS} .nx-approved-art{
      position:absolute;inset:0;width:100%;height:100%;display:block;object-fit:contain;pointer-events:none;user-select:none;-webkit-user-drag:none;
      image-rendering:auto;transform:translateZ(0)
    }
    #bootHome.${HOME_CLASS} .nx-approved-hit{
      position:absolute;z-index:8;border:0!important;padding:0!important;margin:0!important;background:transparent!important;
      color:transparent!important;opacity:0!important;cursor:pointer!important;-webkit-tap-highlight-color:transparent!important;
      text-decoration:none!important;touch-action:manipulation
    }
    #bootHome.${HOME_CLASS} .nx-approved-hit:focus-visible{opacity:1!important;outline:2px solid rgba(174,255,39,.82)!important;outline-offset:-2px!important;background:rgba(174,255,39,.035)!important;border-radius:10px!important}

    /* Coordinates are traced from the approved 941 x 1672 artwork. */
    #bootHome.${HOME_CLASS} .h-social{left:3.55%;top:3.48%;width:15.25%;height:4.55%}
    #bootHome.${HOME_CLASS} .h-settings{left:85.65%;top:3.48%;width:9.75%;height:4.55%}
    #bootHome.${HOME_CLASS} .h-start{left:7.25%;top:29.90%;width:26.55%;height:4.05%}
    #bootHome.${HOME_CLASS} .h-single{left:7.05%;top:35.48%;width:27.05%;height:19.78%}
    #bootHome.${HOME_CLASS} .h-bot{left:35.45%;top:35.48%;width:27.25%;height:19.78%}
    #bootHome.${HOME_CLASS} .h-online{left:64.20%;top:35.48%;width:27.15%;height:19.78%}
    #bootHome.${HOME_CLASS} .h-tournament{left:6.85%;top:56.34%;width:84.85%;height:7.13%}

    #bootHome.${HOME_CLASS} .h-xox{left:6.15%;top:66.15%;width:20.35%;height:16.88%}
    #bootHome.${HOME_CLASS} .h-twin{left:27.45%;top:66.15%;width:20.55%;height:16.88%}
    #bootHome.${HOME_CLASS} .h-imposter{left:48.85%;top:66.15%;width:20.65%;height:16.88%}
    #bootHome.${HOME_CLASS} .h-wordle{left:70.45%;top:66.15%;width:21.70%;height:16.88%}
    #bootHome.${HOME_CLASS} .h-allgames{left:6.25%;top:83.43%;width:85.65%;height:4.65%}

    #bootHome.${HOME_CLASS} .h-friends{left:4.45%;top:89.20%;width:22.15%;height:8.05%}
    #bootHome.${HOME_CLASS} .h-how{left:26.60%;top:89.20%;width:22.65%;height:8.05%}
    #bootHome.${HOME_CLASS} .h-settings-bottom{left:49.25%;top:89.20%;width:21.75%;height:8.05%}
    #bootHome.${HOME_CLASS} .h-feedback{left:71.00%;top:89.20%;width:24.55%;height:8.05%}

    #bootHome.${HOME_CLASS} .nx-approved-status{
      position:fixed;z-index:1000;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);
      width:min(calc(100% - 32px),440px);pointer-events:none;text-align:center;color:#f6f7f5;font:700 12px/1.35 system-ui,sans-serif
    }
    #bootHome.${HOME_CLASS} .nx-approved-status:not(:empty){padding:10px 12px;border:1px solid rgba(170,255,39,.35);border-radius:10px;background:rgba(2,9,7,.96)}

    @media (min-width:942px){
      #bootHome.${HOME_CLASS} .nx-approved-canvas{width:min(941px,calc(100dvh * 941 / 1672))}
    }
  `;

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=css;
    document.head.appendChild(style);
  }

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
  function hit(tag,cls,label,extra=""){
    const el=document.createElement(tag);
    el.className=`nx-approved-hit ${cls}`;
    el.setAttribute("aria-label",label);
    if(tag==="button") el.type="button";
    if(tag==="a") el.href=extra;
    return el;
  }

  function activate(home,img){
    if(home.dataset.nxApprovedHome===VERSION) return;

    const single=document.getElementById("singleModeBtn");
    const bot=document.getElementById("botModeBtn");
    const online=document.getElementById("onlineModeBtn");
    const tournament=home.querySelector(".neonHomeQuickRow button");
    const settings=home.querySelector("[data-open-neon-settings]");
    const exclude=[single,bot,online,tournament,settings];
    const how=findAction(home,["nasil oynanir","how to play"],exclude);
    const feedback=findAction(home,["sikayet","oneri","feedback"],[...exclude,how]);

    const legacy=document.createElement("div");
    legacy.className="nx-approved-legacy";
    legacy.setAttribute("aria-hidden","true");
    while(home.firstChild) legacy.appendChild(home.firstChild);

    const stage=document.createElement("div");
    stage.className="nx-approved-stage";
    const canvas=document.createElement("main");
    canvas.className="nx-approved-canvas";
    canvas.setAttribute("aria-label","NEON XI ana menüsü");
    img.className="nx-approved-art";
    img.alt="";
    img.setAttribute("aria-hidden","true");
    canvas.appendChild(img);

    const social=hit("button","h-social","Sosyal");
    const topSettings=hit("button","h-settings","Ayarlar");
    const start=hit("button","h-start","Hemen Başla");
    const hSingle=hit("button","h-single","Tek Oyunculu");
    const hBot=hit("button","h-bot","Bota Karşı");
    const hOnline=hit("button","h-online","Online");
    const hTournament=hit("button","h-tournament","Turnuva Modu");
    const xox=hit("a","h-xox","Futbol XOX","./side-games/football-xox/index.html");
    const twin=hit("a","h-twin","Kariyer İkizi","./side-games/career-twin/index.html");
    const imposter=hit("a","h-imposter","Futbol Imposter","./side-games/futbol-imposter.html");
    const wordle=hit("a","h-wordle","Football Wordle","./side-games/football-wordle/index.html");
    const allGames=hit("a","h-allgames","Tüm Yan Oyunlar","./side-games/index.html");
    const friends=hit("button","h-friends","Arkadaşlar");
    const howBtn=hit("button","h-how","Nasıl Oynanır");
    const bottomSettings=hit("button","h-settings-bottom","Ayarlar");
    const feedbackBtn=hit("button","h-feedback","Şikayet ve Öneri");

    canvas.append(social,topSettings,start,hSingle,hBot,hOnline,hTournament,xox,twin,imposter,wordle,allGames,friends,howBtn,bottomSettings,feedbackBtn);
    stage.appendChild(canvas);
    const status=document.createElement("div");
    status.className="nx-approved-status";
    status.setAttribute("role","status");
    status.setAttribute("aria-live","polite");

    social.addEventListener("click",()=>openSocial("play",status));
    friends.addEventListener("click",()=>openSocial("friends",status));
    topSettings.addEventListener("click",()=>clickTarget(settings,status,"Ayarlar"));
    bottomSettings.addEventListener("click",()=>clickTarget(settings,status,"Ayarlar"));
    start.addEventListener("click",()=>clickTarget(single,status,"Tek Oyunculu"));
    hSingle.addEventListener("click",()=>clickTarget(single,status,"Tek Oyunculu"));
    hBot.addEventListener("click",()=>clickTarget(bot,status,"Bota Karşı"));
    hOnline.addEventListener("click",()=>clickTarget(online,status,"Online"));
    hTournament.addEventListener("click",()=>clickTarget(tournament,status,"Turnuva"));
    howBtn.addEventListener("click",()=>clickTarget(how,status,"Nasıl Oynanır"));
    feedbackBtn.addEventListener("click",()=>clickTarget(feedback,status,"Şikayet ve Öneri"));

    home.append(legacy,stage,status);
    home.classList.remove("nx-coded-home-v1","nx-coded-home-v2","nx-coded-home-v3","nx-raster-home-v2","nx-raster-home-v3");
    home.classList.add(HOME_CLASS);
    home.dataset.nxApprovedHome=VERSION;
  }

  function initialize(){
    const home=document.getElementById("bootHome");
    if(!home||home.dataset.nxApprovedHome===VERSION) return;
    const img=new Image();
    img.decoding="async";
    img.fetchPriority="high";
    img.onload=()=>activate(home,img);
    img.onerror=()=>console.error("NEON XI approved home artwork failed to load",ART);
    img.src=ART;
  }

  addStyle();
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
