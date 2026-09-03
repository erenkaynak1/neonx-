(() => {
  "use strict";

  const STYLE_ID = "nx-raster-home-v3-style";
  const HOME_CLASS = "nx-raster-home-v3";
  const ASSET_ROOT = "./side-games/assets/premium-home";

  const styles = `
  #bootScreen:has(#bootHome.${HOME_CLASS}.active){background:#000!important}
  #bootScreen:has(#bootHome.${HOME_CLASS}.active) .bootGlow,
  #bootScreen:has(#bootHome.${HOME_CLASS}.active) .bootBrand{display:none!important}
  #bootScreen:has(#bootHome.${HOME_CLASS}.active) .bootPanel{
    width:100vw!important;max-width:none!important;height:100dvh!important;padding:0!important;
    border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important
  }
  #bootHome.${HOME_CLASS}.active{
    position:relative!important;display:block!important;width:100%!important;height:100dvh!important;
    min-height:100%!important;overflow:hidden!important;color:#f5ffe8!important;background:#020503!important;
    isolation:isolate
  }
  #bootHome.${HOME_CLASS} .nx-raster-ambient{
    position:absolute;inset:-4%;z-index:0;width:108%;height:108%;object-fit:cover;object-position:center;
    filter:blur(9px) brightness(.42) saturate(1.08);transform:scale(1.035);
    pointer-events:none;user-select:none;-webkit-user-drag:none
  }
  #bootHome.${HOME_CLASS} .nx-raster-veil{
    position:absolute;inset:0;z-index:1;pointer-events:none;
    background:linear-gradient(180deg,rgba(0,7,5,.18),rgba(0,3,2,.48)),radial-gradient(circle at 50% 20%,transparent 0 34%,rgba(0,0,0,.32) 88%)
  }
  #bootHome.${HOME_CLASS} .nx-home-scroll{
    position:relative;z-index:2;width:100%;height:100%;overflow:auto;overscroll-behavior:contain;
    -webkit-overflow-scrolling:touch;padding:max(7px,env(safe-area-inset-top)) 6px max(10px,env(safe-area-inset-bottom));
    scrollbar-width:none
  }
  #bootHome.${HOME_CLASS} .nx-home-scroll::-webkit-scrollbar{display:none}
  #bootHome.${HOME_CLASS} .nx-home-inner{width:min(100%,560px);margin:0 auto}
  #bootHome.${HOME_CLASS} .nx-foreground-stage{
    position:relative;width:100%;aspect-ratio:941/1672;isolation:isolate;overflow:hidden;
    border-radius:clamp(12px,2.2vw,24px);filter:drop-shadow(0 22px 44px rgba(0,0,0,.68))
  }
  #bootHome.${HOME_CLASS} .nx-stage-city,
  #bootHome.${HOME_CLASS} .nx-foreground-art{
    position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover;object-position:center;
    pointer-events:none;user-select:none;-webkit-user-drag:none
  }
  #bootHome.${HOME_CLASS} .nx-stage-city{z-index:0}
  #bootHome.${HOME_CLASS} .nx-foreground-art{z-index:1;object-fit:contain}
  #bootHome.${HOME_CLASS} .nx-stage-fx{
    position:absolute;inset:0;z-index:2;pointer-events:none;opacity:.18;
    background:linear-gradient(180deg,transparent 0 48%,rgba(205,255,63,.11) 49%,transparent 50% 100%);
    background-size:100% 7px;mix-blend-mode:screen
  }
  #bootHome.${HOME_CLASS} .nx-hotspot{
    position:absolute!important;z-index:4!important;display:block!important;margin:0!important;padding:0!important;
    min-width:0!important;min-height:0!important;border:0!important;border-radius:15px!important;
    color:transparent!important;background:transparent!important;box-shadow:none!important;cursor:pointer!important;
    -webkit-tap-highlight-color:transparent;overflow:hidden!important;text-decoration:none!important;
    transform:translateZ(0);transition:background .18s ease,box-shadow .18s ease,transform .14s ease,filter .18s ease!important
  }
  #bootHome.${HOME_CLASS} .nx-hotspot::before{
    content:""!important;display:block!important;position:absolute;inset:2px;pointer-events:none;border-radius:inherit;
    border:1px solid transparent;opacity:0;transition:opacity .18s ease,border-color .18s ease,box-shadow .18s ease
  }
  #bootHome.${HOME_CLASS} .nx-hotspot::after{
    content:""!important;display:block!important;position:absolute;top:-40%;bottom:-40%;left:-46%;width:24%;pointer-events:none;
    opacity:0;transform:skewX(-18deg);background:linear-gradient(90deg,transparent,rgba(241,255,194,.48),transparent)
  }
  #bootHome.${HOME_CLASS} .nx-hotspot:hover,
  #bootHome.${HOME_CLASS} .nx-hotspot.is-activating{
    background:rgba(190,255,53,.045)!important;
    box-shadow:inset 0 0 28px rgba(172,255,47,.13),0 0 20px rgba(144,255,35,.13)!important
  }
  #bootHome.${HOME_CLASS} .nx-hotspot:hover::before,
  #bootHome.${HOME_CLASS} .nx-hotspot.is-activating::before{
    opacity:1;border-color:rgba(222,255,112,.46);box-shadow:inset 0 0 13px rgba(183,255,54,.13)
  }
  #bootHome.${HOME_CLASS} .nx-hotspot.is-activating::after{animation:nxHotspotSweep .38s ease-out}
  #bootHome.${HOME_CLASS} .nx-hotspot:focus-visible{
    outline:2px solid #efffb6!important;outline-offset:2px!important;background:rgba(190,255,53,.07)!important;
    box-shadow:0 0 24px rgba(178,255,54,.34)!important
  }
  #bootHome.${HOME_CLASS} .nx-hotspot:active{transform:scale(.972)!important;filter:brightness(1.18)!important}
  #bootHome.${HOME_CLASS} .nx-hotspot-settings{left:86.4%;top:1.5%;width:10.8%;height:6.5%;border-radius:18px!important}
  #bootHome.${HOME_CLASS} .nx-hotspot-single{left:5.1%;top:33.8%;width:29.1%;height:19.5%}
  #bootHome.${HOME_CLASS} .nx-hotspot-bot{left:35.7%;top:33.8%;width:28.2%;height:19.5%}
  #bootHome.${HOME_CLASS} .nx-hotspot-online{left:65.2%;top:33.8%;width:29.7%;height:19.5%}
  #bootHome.${HOME_CLASS} .nx-hotspot-tournament{left:5.1%;top:54.1%;width:89.5%;height:7.6%}
  #bootHome.${HOME_CLASS} .nx-hotspot-xox{left:5.1%;top:73.1%;width:29.1%;height:17.8%}
  #bootHome.${HOME_CLASS} .nx-hotspot-twin{left:35.7%;top:73.1%;width:28.2%;height:17.8%}
  #bootHome.${HOME_CLASS} .nx-hotspot-imposter{left:65.2%;top:73.1%;width:29.7%;height:17.8%}
  #bootHome.${HOME_CLASS} .nx-hotspot-all{left:5.1%;top:91.7%;width:89.5%;height:6.1%}
  #bootHome.${HOME_CLASS} .nx-home-friends{
    position:absolute;z-index:6;left:3.2%;top:1.65%;min-height:44px;padding:0 15px;border:1px solid rgba(211,255,94,.58);
    border-radius:14px;background:rgba(3,14,8,.9);color:#eaffac;font:900 10px/1 system-ui,sans-serif;letter-spacing:.1em;
    box-shadow:0 8px 24px rgba(0,0,0,.36),0 0 18px rgba(179,255,52,.12);cursor:pointer;backdrop-filter:blur(10px)
  }
  #bootHome.${HOME_CLASS} .nx-home-friends:hover,#bootHome.${HOME_CLASS} .nx-home-friends:focus-visible{background:#baff18;color:#071005;outline:none}
  #bootHome.${HOME_CLASS} .nx-home-friends:active{transform:scale(.97)}
  #bootHome.${HOME_CLASS} .nx-home-status{
    position:fixed;z-index:8;left:50%;bottom:max(14px,env(safe-area-inset-bottom));
    width:min(calc(100% - 32px),430px);min-height:0;margin:0;padding:0;transform:translateX(-50%);
    color:#f2ffe9;font-size:11px;font-weight:700;text-align:center;pointer-events:none;text-shadow:0 2px 7px #000
  }
  #bootHome.${HOME_CLASS} .nx-home-status:not(:empty){
    padding:9px 12px;border:1px solid rgba(198,255,70,.45);border-radius:12px;
    background:rgba(2,10,5,.91);box-shadow:0 8px 28px rgba(0,0,0,.5),0 0 18px rgba(171,255,46,.14);
    backdrop-filter:blur(12px)
  }
  @keyframes nxHotspotSweep{
    0%{left:-46%;opacity:0}18%{opacity:.85}100%{left:126%;opacity:0}
  }
  @media(min-width:721px){
    #bootHome.${HOME_CLASS} .nx-home-scroll{
      width:min(580px,calc(100% - 28px));height:min(1000px,calc(100% - 24px));margin:12px auto;
      border:1px solid rgba(190,255,65,.2);border-radius:28px;background:rgba(0,3,1,.22);
      box-shadow:0 28px 100px rgba(0,0,0,.75),0 0 44px rgba(135,255,26,.08)
    }
  }
  @media(orientation:landscape) and (max-height:620px){
    #bootHome.${HOME_CLASS} .nx-home-scroll{
      width:min(420px,calc(100% - 16px));height:100%;margin:0 auto;padding:5px 5px max(8px,env(safe-area-inset-bottom));
      border-radius:18px
    }
    #bootHome.${HOME_CLASS} .nx-home-inner{width:100%}
  }
  @media(max-width:370px){#bootHome.${HOME_CLASS} .nx-home-scroll{padding-inline:4px}}
  @media(prefers-reduced-motion:reduce){
    #bootHome.${HOME_CLASS} .nx-hotspot{transition:none!important}
    #bootHome.${HOME_CLASS} .nx-hotspot.is-activating::after{animation:none!important}
    #bootHome.${HOME_CLASS} .nx-stage-fx{display:none}
  }
  `;

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = styles;
    document.head.appendChild(style);
  }

  function prepareControl(node, className, label) {
    node.className = className;
    node.setAttribute("aria-label", label);
    node.replaceChildren();
    return node;
  }

  function makeLink(className, href, label) {
    const link = document.createElement("a");
    link.className = className;
    link.href = href;
    link.setAttribute("aria-label", label);
    return link;
  }

  function bindPressAnimation(node) {
    const on = () => {
      node.classList.remove("is-activating");
      void node.offsetWidth;
      node.classList.add("is-activating");
    };
    const off = () => window.setTimeout(() => node.classList.remove("is-activating"), 390);
    node.addEventListener("pointerdown", on, { passive: true });
    node.addEventListener("pointerup", off, { passive: true });
    node.addEventListener("pointercancel", off, { passive: true });
    node.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") on();
    });
  }

  function initialize() {
    const home = document.getElementById("bootHome");
    if (!home || home.dataset.nxRasterHome === "3") return;

    const single = document.getElementById("singleModeBtn");
    const bot = document.getElementById("botModeBtn");
    const online = document.getElementById("onlineModeBtn");
    const tournament = home.querySelector(".neonHomeQuickRow button");
    const settings = home.querySelector("[data-open-neon-settings]");

    if (!single || !bot || !online || !tournament || !settings) {
      console.error("NEON XI premium home: mevcut oyun kontrolleri bulunamadı; ana menü korunuyor.");
      return;
    }

    prepareControl(settings, "neonTopControl neonTopIconOnly nx-hotspot nx-hotspot-settings", "Ayarları aç");
    prepareControl(single, "neonHomeAction nx-hotspot nx-hotspot-single", "Tek Oyunculu — Kariyer Modu");
    prepareControl(bot, "neonHomeAction nx-hotspot nx-hotspot-bot", "Bota Karşı — Çevrimiçi veya çevrimdışı");
    prepareControl(online, "neonHomeAction nx-hotspot nx-hotspot-online", "Online — Çok oyunculu karşılaşmalar");
    prepareControl(tournament, "neonHomeQuickBtn nx-hotspot nx-hotspot-tournament", "Turnuva Modu — 4 takım veya 8 takım");

    const ambient = document.createElement("img");
    ambient.className = "nx-raster-ambient";
    ambient.src = `${ASSET_ROOT}/home-city-v2.webp`;
    ambient.alt = "";
    ambient.setAttribute("aria-hidden", "true");

    const veil = document.createElement("div");
    veil.className = "nx-raster-veil";
    veil.setAttribute("aria-hidden", "true");

    const scroll = document.createElement("div");
    scroll.className = "nx-home-scroll";

    const inner = document.createElement("div");
    inner.className = "nx-home-inner";

    const stage = document.createElement("div");
    stage.className = "nx-foreground-stage";
    stage.setAttribute("aria-label", "NEON XI ana menü");

    /* Arka plan ve ön plan artık AYNI 941×1672 sahnede kilitli. Böylece şehir
       köşelere/viewport'a ayrı düşmez; kullanıcının onayladığı kompozisyon korunur. */
    const stageCity = document.createElement("img");
    stageCity.className = "nx-stage-city";
    stageCity.src = `${ASSET_ROOT}/home-city-v2.webp`;
    stageCity.alt = "";
    stageCity.setAttribute("aria-hidden", "true");

    const foreground = document.createElement("img");
    foreground.className = "nx-foreground-art";
    foreground.src = `${ASSET_ROOT}/neon-xi-menu-foreground.webp`;
    foreground.alt = "NEON XI — Draft ve Neon Arcade ana menüsü";
    foreground.width = 941;
    foreground.height = 1672;
    foreground.loading = "eager";
    foreground.fetchPriority = "high";

    const stageFx = document.createElement("div");
    stageFx.className = "nx-stage-fx";
    stageFx.setAttribute("aria-hidden", "true");

    const status = document.createElement("div");
    status.className = "nx-home-status";
    status.id = "nxRasterHomeStatus";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    const friends = document.createElement("button");
    friends.className = "nx-home-friends";
    friends.type = "button";
    friends.dataset.neonSocial = "friends";
    friends.textContent = "ARKADAŞLAR";
    friends.setAttribute("aria-label", "Arkadaşlar ekranını aç");

    foreground.addEventListener("error", () => {
      status.textContent = "Ana menü görseli yüklenemedi. Sayfayı yenileyin.";
    });

    const controls = [
      settings,
      single,
      bot,
      online,
      tournament,
      makeLink("nx-hotspot nx-hotspot-xox", "./side-games/football-xox/index.html", "Futbol XOX"),
      makeLink("nx-hotspot nx-hotspot-twin", "./side-games/career-twin/index.html", "Career Twin"),
      makeLink("nx-hotspot nx-hotspot-imposter", "./side-games/futbol-imposter.html", "Futbol Imposter"),
      makeLink("nx-hotspot nx-hotspot-all", "./side-games/index.html", "Tüm yan oyunları aç"),
      friends
    ];

    controls.forEach(bindPressAnimation);
    stage.append(stageCity, foreground, stageFx, ...controls);
    inner.append(stage, status);
    scroll.append(inner);

    home.replaceChildren(ambient, veil, scroll);
    home.classList.remove("nx-raster-home-v2");
    home.classList.add(HOME_CLASS);
    home.dataset.nxRasterHome = "3";
  }

  addStyles();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
