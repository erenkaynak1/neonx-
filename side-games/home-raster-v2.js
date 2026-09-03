(() => {
  "use strict";

  const STYLE_ID = "nx-raster-home-v5-style";
  const HOME_CLASS = "nx-raster-home-v3";
  const BOUND_VERSION = "5";
  const RASTER_VERSION = "20260903-raster-parts-v1";
  const RASTER_BYTES = 29730;
  const RASTER_FILES = [
    "home-raster-part-0.bin",
    "home-raster-part-1.bin",
    "home-raster-part-2.bin",
    "home-raster-part-3.bin"
  ];

  const styles = `
  #bootScreen:has(#bootHome.${HOME_CLASS}.active){background:#020504!important}
  #bootScreen:has(#bootHome.${HOME_CLASS}.active) .bootGlow,
  #bootScreen:has(#bootHome.${HOME_CLASS}.active) .bootBrand{display:none!important}
  #bootScreen:has(#bootHome.${HOME_CLASS}.active) .bootPanel{
    width:100vw!important;max-width:none!important;height:100dvh!important;padding:0!important;
    border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important
  }
  #bootHome.${HOME_CLASS}.active{
    position:relative!important;display:block!important;width:100%!important;height:100dvh!important;
    min-height:100%!important;overflow:hidden!important;background:#020504!important;isolation:isolate
  }
  #bootHome.${HOME_CLASS} .nx-home-ambient{
    position:fixed;inset:-26px;z-index:0;width:calc(100% + 52px);height:calc(100% + 52px);
    object-fit:cover;object-position:center top;pointer-events:none;user-select:none;-webkit-user-drag:none;
    filter:blur(12px) brightness(.42) saturate(.82);transform:scale(1.035)
  }
  #bootHome.${HOME_CLASS} .nx-home-ambient-shade{
    position:fixed;inset:0;z-index:1;pointer-events:none;
    background:linear-gradient(180deg,rgba(0,7,4,.12),rgba(0,6,4,.24) 62%,rgba(0,4,2,.34))
  }
  #bootHome.${HOME_CLASS} .nx-home-scroll{
    position:relative;z-index:2;width:100%;height:100%;overflow:auto;overscroll-behavior:contain;
    -webkit-overflow-scrolling:touch;scrollbar-width:none;padding:0 0 max(8px,env(safe-area-inset-bottom))
  }
  #bootHome.${HOME_CLASS} .nx-home-scroll::-webkit-scrollbar{display:none}
  #bootHome.${HOME_CLASS} .nx-home-inner{width:min(100%,430px);margin:0 auto}
  #bootHome.${HOME_CLASS} .nx-home-stage{
    position:relative;width:100%;aspect-ratio:941/1672;overflow:hidden;isolation:isolate;
    background:#020504;box-shadow:0 26px 70px rgba(0,0,0,.54)
  }
  #bootHome.${HOME_CLASS} .nx-home-art{
    position:absolute;inset:0;z-index:1;display:block;width:100%;height:100%;object-fit:contain;object-position:center top;
    pointer-events:none;user-select:none;-webkit-user-drag:none
  }
  #bootHome.${HOME_CLASS} .nx-hotspot{
    position:absolute!important;z-index:10!important;display:block!important;margin:0!important;padding:0!important;
    min-width:0!important;min-height:0!important;width:auto;height:auto;
    border:0!important;border-radius:0!important;outline:0;background:transparent!important;background-image:none!important;
    box-shadow:none!important;color:transparent!important;text-shadow:none!important;opacity:1!important;
    cursor:pointer!important;overflow:hidden!important;text-decoration:none!important;appearance:none!important;
    -webkit-appearance:none!important;-webkit-tap-highlight-color:transparent!important;touch-action:manipulation!important;
    filter:none!important;transform:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important
  }
  #bootHome.${HOME_CLASS} .nx-hotspot::before,
  #bootHome.${HOME_CLASS} .nx-hotspot::after{content:none!important;display:none!important}
  #bootHome.${HOME_CLASS} .nx-hotspot>*{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
  #bootHome.${HOME_CLASS} .nx-hotspot:active{background:transparent!important;box-shadow:none!important;filter:none!important;transform:none!important}
  #bootHome.${HOME_CLASS} .nx-hotspot:focus{outline:0!important}
  #bootHome.${HOME_CLASS} .nx-hotspot:focus-visible{outline:2px solid rgba(82,255,160,.82)!important;outline-offset:-2px!important}

  /* Hitbox'lar onaylı 941×1672 raster ekranın gerçek piksel sınırlarından hesaplandı. */
  #bootHome.${HOME_CLASS} .nx-hit-social{left:2.657%!important;top:1.495%!important;width:14.984%!important;height:3.469%!important}
  #bootHome.${HOME_CLASS} .nx-hit-settings-top{left:88.523%!important;top:1.495%!important;width:7.120%!important;height:3.469%!important}
  #bootHome.${HOME_CLASS} .nx-hit-single{left:9.458%!important;top:32.237%!important;width:25.399%!important;height:16.866%!important}
  #bootHome.${HOME_CLASS} .nx-hit-bot{left:35.813%!important;top:32.237%!important;width:26.249%!important;height:16.866%!important}
  #bootHome.${HOME_CLASS} .nx-hit-online{left:63.231%!important;top:32.237%!important;width:25.824%!important;height:16.866%!important}
  #bootHome.${HOME_CLASS} .nx-hit-tournament{left:9.458%!important;top:50.179%!important;width:79.596%!important;height:6.878%!important}
  #bootHome.${HOME_CLASS} .nx-hit-xox{left:6.164%!important;top:62.500%!important;width:19.660%!important;height:17.165%!important}
  #bootHome.${HOME_CLASS} .nx-hit-twin{left:27.099%!important;top:62.500%!important;width:20.935%!important;height:17.165%!important}
  #bootHome.${HOME_CLASS} .nx-hit-imposter{left:49.203%!important;top:62.500%!important;width:20.723%!important;height:17.165%!important}
  #bootHome.${HOME_CLASS} .nx-hit-wordle{left:71.095%!important;top:62.500%!important;width:21.467%!important;height:17.165%!important}
  #bootHome.${HOME_CLASS} .nx-hit-all{left:6.376%!important;top:80.801%!important;width:86.291%!important;height:4.904%!important}
  #bootHome.${HOME_CLASS} .nx-hit-friends{left:6.589%!important;top:87.380%!important;width:21.041%!important;height:7.715%!important}
  #bootHome.${HOME_CLASS} .nx-hit-how{left:27.736%!important;top:87.380%!important;width:21.467%!important;height:7.715%!important}
  #bootHome.${HOME_CLASS} .nx-hit-settings-bottom{left:49.309%!important;top:87.380%!important;width:21.679%!important;height:7.715%!important}
  #bootHome.${HOME_CLASS} .nx-hit-feedback{left:71.095%!important;top:87.380%!important;width:21.679%!important;height:7.715%!important}

  #bootHome.${HOME_CLASS} .nx-home-status{
    position:fixed;z-index:60;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);
    width:min(calc(100% - 32px),398px);min-height:0;padding:0;margin:0;pointer-events:none;
    color:#f3f7f5;font:700 12px/1.35 system-ui,sans-serif;text-align:center
  }
  #bootHome.${HOME_CLASS} .nx-home-status:not(:empty){
    padding:10px 12px;border:1px solid rgba(82,255,160,.28);border-radius:10px;
    background:rgba(4,7,6,.94);box-shadow:0 10px 30px rgba(0,0,0,.55)
  }
  @media(min-width:721px){
    #bootHome.${HOME_CLASS} .nx-home-inner{width:min(430px,calc(100% - 24px))}
    #bootHome.${HOME_CLASS} .nx-home-stage{margin:12px 0;border-radius:14px}
  }
  @media(orientation:landscape) and (max-height:620px){
    #bootHome.${HOME_CLASS} .nx-home-inner{width:min(330px,calc(100% - 16px))}
  }
  `;

  function addStyles() {
    document.getElementById(STYLE_ID)?.remove();
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = styles;
    document.head.appendChild(style);
  }

  function rasterBaseUrl() {
    const sourceScript = [...document.scripts].find(script =>
      String(script.src || "").includes("/side-games/home-raster-v2.js")
    );
    if (sourceScript?.src) {
      return new URL("./assets/premium-home/", sourceScript.src);
    }
    return new URL("./side-games/assets/premium-home/", location.href.split("#")[0]);
  }

  async function loadRasterAsset() {
    const base = rasterBaseUrl();
    const parts = await Promise.all(RASTER_FILES.map(async file => {
      const url = new URL(file, base);
      url.searchParams.set("v", RASTER_VERSION);
      const response = await fetch(url.href, { cache: "no-store" });
      if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
      return response.arrayBuffer();
    }));

    const blob = new Blob(parts, { type: "image/webp" });
    if (blob.size !== RASTER_BYTES) {
      throw new Error(`Raster boyutu hatalı: ${blob.size}/${RASTER_BYTES}`);
    }
    return URL.createObjectURL(blob);
  }

  async function verifyRasterImage(url) {
    const probe = new Image();
    probe.decoding = "async";
    probe.src = url;
    if (typeof probe.decode === "function") {
      await probe.decode();
      return;
    }
    await new Promise((resolve, reject) => {
      probe.onload = resolve;
      probe.onerror = () => reject(new Error("Raster WebP çözümlenemedi"));
    });
  }

  function normalizeText(value) {
    return String(value || "")
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i")
      .replace(/ş/g, "s")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c");
  }

  function controlText(node) {
    return normalizeText([
      node?.textContent,
      node?.getAttribute?.("aria-label"),
      node?.getAttribute?.("title"),
      node?.getAttribute?.("data-action")
    ].filter(Boolean).join(" "));
  }

  function findExistingAction(home, needles, exclude = []) {
    const excluded = new Set(exclude.filter(Boolean));
    return [...home.querySelectorAll("button,a,[role='button']")].find(node => {
      if (excluded.has(node)) return false;
      const text = controlText(node);
      return needles.some(needle => text.includes(needle));
    }) || null;
  }

  function prepareExisting(node, hitClass, label) {
    if (!node) return null;
    node.classList.add("nx-hotspot", hitClass);
    node.setAttribute("aria-label", label);
    node.setAttribute("data-nx-home-control", BOUND_VERSION);
    return node;
  }

  function makeButton(hitClass, label, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `nx-hotspot ${hitClass}`;
    button.setAttribute("aria-label", label);
    button.setAttribute("data-nx-home-control", BOUND_VERSION);
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      handler?.();
    });
    return button;
  }

  function makeLink(hitClass, href, label) {
    const link = document.createElement("a");
    link.className = `nx-hotspot ${hitClass}`;
    link.href = href;
    link.setAttribute("aria-label", label);
    link.setAttribute("data-nx-home-control", BOUND_VERSION);
    return link;
  }

  function openSocial(tab, status) {
    let tries = 0;
    const attempt = () => {
      const api = window.NEON_SOCIAL;
      if (api && typeof api.open === "function") {
        api.open(tab);
        return true;
      }
      return false;
    };
    if (attempt()) return;
    const timer = window.setInterval(() => {
      tries += 1;
      if (attempt() || tries >= 100) {
        window.clearInterval(timer);
        if (tries >= 100 && status) {
          status.textContent = "Sosyal ekran yüklenemedi. Sayfayı yenileyip tekrar deneyin.";
          window.setTimeout(() => { status.textContent = ""; }, 2600);
        }
      }
    }, 50);
  }

  function proxyAction(target, fallbackFinder, status, failureText) {
    if (target?.isConnected) {
      target.click();
      return;
    }
    const fallback = fallbackFinder?.();
    if (fallback && fallback.isConnected) {
      fallback.click();
      return;
    }
    if (status) {
      status.textContent = failureText;
      window.setTimeout(() => { status.textContent = ""; }, 2200);
    }
  }

  async function initialize() {
    const home = document.getElementById("bootHome");
    if (!home || home.dataset.nxRasterHome === BOUND_VERSION || home.dataset.nxRasterLoading === BOUND_VERSION) return;
    home.dataset.nxRasterLoading = BOUND_VERSION;

    let rasterUrl;
    try {
      rasterUrl = await loadRasterAsset();
      await verifyRasterImage(rasterUrl);
    } catch (error) {
      if (rasterUrl) URL.revokeObjectURL(rasterUrl);
      delete home.dataset.nxRasterLoading;
      console.error("NEON XI raster home: ana menü görseli parçaları yüklenemedi.", error);
      return;
    }

    const single = document.getElementById("singleModeBtn");
    const bot = document.getElementById("botModeBtn");
    const online = document.getElementById("onlineModeBtn");
    const tournament = home.querySelector(".neonHomeQuickRow button");
    const settings = home.querySelector("[data-open-neon-settings]");

    if (!single || !bot || !online || !tournament || !settings) {
      URL.revokeObjectURL(rasterUrl);
      delete home.dataset.nxRasterLoading;
      console.error("NEON XI raster home: gerekli mevcut oyun kontrolleri bulunamadı; ana menü korunuyor.");
      return;
    }

    const baseExcludes = [single, bot, online, tournament, settings];
    const howTarget = findExistingAction(home, ["nasil oynanir", "how to play"], baseExcludes);
    const feedbackTarget = findExistingAction(home, ["sikayet", "oneri", "feedback"], [...baseExcludes, howTarget]);

    const ambient = document.createElement("img");
    ambient.className = "nx-home-ambient";
    ambient.src = rasterUrl;
    ambient.alt = "";
    ambient.setAttribute("aria-hidden", "true");

    const shade = document.createElement("div");
    shade.className = "nx-home-ambient-shade";
    shade.setAttribute("aria-hidden", "true");

    const scroll = document.createElement("div");
    scroll.className = "nx-home-scroll";

    const inner = document.createElement("div");
    inner.className = "nx-home-inner";

    const stage = document.createElement("div");
    stage.className = "nx-home-stage";
    stage.setAttribute("aria-label", "NEON XI ana menü");

    const art = document.createElement("img");
    art.className = "nx-home-art";
    art.src = rasterUrl;
    art.alt = "NEON XI ana menüsü";
    art.width = 941;
    art.height = 1672;
    art.loading = "eager";
    art.fetchPriority = "high";

    const status = document.createElement("div");
    status.className = "nx-home-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    const controls = [
      makeButton("nx-hit-social", "Sosyal ekranını aç", () => openSocial("play", status)),
      prepareExisting(settings, "nx-hit-settings-top", "Ayarları aç"),
      prepareExisting(single, "nx-hit-single", "Tek Oyunculu — Kariyer Modu"),
      prepareExisting(bot, "nx-hit-bot", "Bota Karşı"),
      prepareExisting(online, "nx-hit-online", "Online"),
      prepareExisting(tournament, "nx-hit-tournament", "Turnuva Modu"),
      makeLink("nx-hit-xox", "./side-games/football-xox/index.html", "Futbol XOX"),
      makeLink("nx-hit-twin", "./side-games/career-twin/index.html", "Kariyer İkizi"),
      makeLink("nx-hit-imposter", "./side-games/futbol-imposter.html", "Futbol Imposter"),
      makeLink("nx-hit-wordle", "./side-games/football-wordle/index.html", "Football Wordle"),
      makeLink("nx-hit-all", "./side-games/index.html", "Tüm Yan Oyunlar"),
      makeButton("nx-hit-friends", "Arkadaşlar", () => openSocial("friends", status)),
      howTarget
        ? prepareExisting(howTarget, "nx-hit-how", "Nasıl Oynanır")
        : makeButton("nx-hit-how", "Nasıl Oynanır", () => {
            const candidate = findExistingAction(document, ["nasil oynanir", "how to play"], [...stage.querySelectorAll("[data-nx-home-control]")]);
            proxyAction(candidate, null, status, "Nasıl Oynanır ekranı şu anda kullanılamıyor.");
          }),
      makeButton("nx-hit-settings-bottom", "Ayarlar", () => settings.click()),
      feedbackTarget
        ? prepareExisting(feedbackTarget, "nx-hit-feedback", "Şikayet ve Öneri")
        : makeButton("nx-hit-feedback", "Şikayet ve Öneri", () => {
            const candidate = findExistingAction(document, ["sikayet", "oneri", "feedback"], [...stage.querySelectorAll("[data-nx-home-control]")]);
            proxyAction(candidate, null, status, "Şikayet ve Öneri ekranı şu anda kullanılamıyor.");
          })
    ].filter(Boolean);

    stage.append(art, ...controls);
    inner.append(stage, status);
    scroll.append(inner);
    home.replaceChildren(ambient, shade, scroll);
    home.classList.remove("nx-raster-home-v2");
    home.classList.add(HOME_CLASS);
    home.dataset.nxRasterHome = BOUND_VERSION;
    delete home.dataset.nxRasterLoading;
  }

  addStyles();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
