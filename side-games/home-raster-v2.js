(() => {
  "use strict";

  const STYLE_ID = "nx-raster-home-v2-style";
  const HOME_CLASS = "nx-raster-home-v2";
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
    min-height:100%!important;overflow:hidden!important;color:#efffe7!important;background:#000!important;
    isolation:isolate
  }
  #bootHome.${HOME_CLASS} .nx-raster-city{
    position:absolute;inset:0;z-index:0;width:100%;height:100%;object-fit:cover;object-position:center;
    pointer-events:none;user-select:none;-webkit-user-drag:none
  }
  #bootHome.${HOME_CLASS} .nx-raster-veil{
    position:absolute;inset:0;z-index:1;pointer-events:none;background:rgba(0,3,1,.43)
  }
  #bootHome.${HOME_CLASS} .nx-home-scroll{
    position:relative;z-index:2;width:100%;height:100%;overflow:auto;overscroll-behavior:contain;
    -webkit-overflow-scrolling:touch;padding:max(9px,env(safe-area-inset-top)) 8px max(12px,env(safe-area-inset-bottom));
    scrollbar-width:none
  }
  #bootHome.${HOME_CLASS} .nx-home-scroll::-webkit-scrollbar{display:none}
  #bootHome.${HOME_CLASS} .nx-home-inner{width:min(100%,560px);margin:0 auto}
  #bootHome.${HOME_CLASS} .nx-foreground-stage{
    position:relative;width:100%;aspect-ratio:941/1672;isolation:isolate;
    filter:drop-shadow(0 22px 44px rgba(0,0,0,.62))
  }
  #bootHome.${HOME_CLASS} .nx-foreground-art{
    position:absolute;inset:0;z-index:1;display:block;width:100%;height:100%;object-fit:contain;
    pointer-events:none;user-select:none;-webkit-user-drag:none
  }
  #bootHome.${HOME_CLASS} .nx-hotspot{
    position:absolute!important;z-index:3!important;display:block!important;margin:0!important;padding:0!important;
    min-width:0!important;min-height:0!important;border:0!important;border-radius:13px!important;
    color:transparent!important;background:transparent!important;box-shadow:none!important;cursor:pointer!important;
    -webkit-tap-highlight-color:transparent;overflow:visible!important;text-decoration:none!important;
    transition:background .18s ease,box-shadow .18s ease,transform .16s ease,filter .18s ease!important
  }
  #bootHome.${HOME_CLASS} .nx-hotspot::before,
  #bootHome.${HOME_CLASS} .nx-hotspot::after{display:none!important;content:none!important}
  #bootHome.${HOME_CLASS} .nx-hotspot:hover,
  #bootHome.${HOME_CLASS} .nx-hotspot.is-activating{
    background:rgba(177,255,61,.055)!important;
    box-shadow:inset 0 0 24px rgba(167,255,50,.12),0 0 15px rgba(132,255,39,.08)!important
  }
  #bootHome.${HOME_CLASS} .nx-hotspot:focus-visible{
    outline:2px solid #ecffbd!important;outline-offset:2px!important;background:rgba(177,255,61,.08)!important;
    box-shadow:0 0 22px rgba(159,255,47,.34)!important
  }
  #bootHome.${HOME_CLASS} .nx-hotspot:active{transform:scale(.975)!important;filter:brightness(1.2)!important}
  #bootHome.${HOME_CLASS} .nx-hotspot-settings{left:86.4%;top:1.5%;width:10.8%;height:6.5%;border-radius:16px!important}
  #bootHome.${HOME_CLASS} .nx-hotspot-single{left:5.1%;top:33.8%;width:29.1%;height:19.5%}
  #bootHome.${HOME_CLASS} .nx-hotspot-bot{left:35.7%;top:33.8%;width:28.2%;height:19.5%}
  #bootHome.${HOME_CLASS} .nx-hotspot-online{left:65.2%;top:33.8%;width:29.7%;height:19.5%}
  #bootHome.${HOME_CLASS} .nx-hotspot-tournament{left:5.1%;top:54.1%;width:89.5%;height:7.6%}
  #bootHome.${HOME_CLASS} .nx-hotspot-xox{left:5.1%;top:73.1%;width:29.1%;height:17.8%}
  #bootHome.${HOME_CLASS} .nx-hotspot-twin{left:35.7%;top:73.1%;width:28.2%;height:17.8%}
  #bootHome.${HOME_CLASS} .nx-hotspot-imposter{left:65.2%;top:73.1%;width:29.7%;height:17.8%}
  #bootHome.${HOME_CLASS} .nx-hotspot-all{left:5.1%;top:91.7%;width:89.5%;height:6.1%}
  #bootHome.${HOME_CLASS} .nx-home-status{
    position:fixed;z-index:8;left:50%;bottom:max(14px,env(safe-area-inset-bottom));
    width:min(calc(100% - 32px),430px);min-height:0;margin:0;padding:0;transform:translateX(-50%);
    color:#efffe7;font-size:11px;font-weight:700;text-align:center;pointer-events:none;text-shadow:0 2px 7px #000
  }
  #bootHome.${HOME_CLASS} .nx-home-status:not(:empty){
    padding:9px 12px;border:1px solid rgba(169,255,74,.45);border-radius:12px;
    background:rgba(2,10,5,.9);box-shadow:0 8px 28px rgba(0,0,0,.5),0 0 18px rgba(142,255,45,.12);
    backdrop-filter:blur(12px)
  }
  @media(min-width:721px){
    #bootHome.${HOME_CLASS} .nx-home-scroll{
      width:min(580px,calc(100% - 28px));height:min(1000px,calc(100% - 24px));margin:12px auto;
      border:1px solid rgba(141,255,78,.12);border-radius:28px;background:rgba(0,3,1,.24);
      box-shadow:0 28px 100px rgba(0,0,0,.72)
    }
  }
  @media(orientation:landscape) and (max-height:620px){
    #bootHome.${HOME_CLASS} .nx-home-scroll{
      width:min(420px,calc(100% - 16px));height:100%;margin:0 auto;padding:6px 6px max(8px,env(safe-area-inset-bottom));
      border-radius:18px
    }
    #bootHome.${HOME_CLASS} .nx-home-inner{width:100%}
  }
  @media(max-width:370px){
    #bootHome.${HOME_CLASS} .nx-home-scroll{padding-inline:5px}
  }
  @media(prefers-reduced-motion:reduce){
    #bootHome.${HOME_CLASS} .nx-hotspot{transition:none!important}
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

  function initialize() {
    const home = document.getElementById("bootHome");
    if (!home || home.dataset.nxRasterHome === "2") return;

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

    const city = document.createElement("img");
    city.className = "nx-raster-city";
    city.src = `${ASSET_ROOT}/home-city-v2.webp`;
    city.alt = "";
    city.setAttribute("aria-hidden", "true");

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

    const foreground = document.createElement("img");
    foreground.className = "nx-foreground-art";
    foreground.src = `${ASSET_ROOT}/neon-xi-menu-foreground.webp`;
    foreground.alt = "NEON XI — Draft ve Neon Arcade ana menüsü";
    foreground.width = 941;
    foreground.height = 1672;
    foreground.loading = "eager";
    foreground.fetchPriority = "high";

    const status = document.createElement("div");
    status.className = "nx-home-status";
    status.id = "nxRasterHomeStatus";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    foreground.addEventListener("error", () => {
      status.textContent = "Ana menü görseli yüklenemedi. Sayfayı yenileyin.";
    });

    stage.append(
      foreground,
      settings,
      single,
      bot,
      online,
      tournament,
      makeLink("nx-hotspot nx-hotspot-xox", "./side-games/football-xox/index.html", "Futbol XOX"),
      makeLink("nx-hotspot nx-hotspot-twin", "./side-games/career-twin/index.html", "Career Twin"),
      makeLink("nx-hotspot nx-hotspot-imposter", "./side-games/futbol-imposter.html", "Futbol Imposter"),
      makeLink("nx-hotspot nx-hotspot-all", "./side-games/index.html", "Tüm yan oyunları aç")
    );

    inner.append(stage, status);
    scroll.append(inner);

    home.replaceChildren(city, veil, scroll);
    home.classList.add(HOME_CLASS);
    home.dataset.nxRasterHome = "2";
  }

  addStyles();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
