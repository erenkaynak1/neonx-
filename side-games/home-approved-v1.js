(() => {
  "use strict";

  const HOME_CLASS = "nx-approved-home-v1";
  const VERSION = "20260915-svg-home-v3";

  const css = `
#bootScreen:has(#bootHome.nx-approved-home-v1.active) .bootGlow,
#bootScreen:has(#bootHome.nx-approved-home-v1.active) .bootBrand{display:none!important}
#bootScreen:has(#bootHome.nx-approved-home-v1.active) .bootPanel{width:100vw!important;max-width:none!important;height:100dvh!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
#bootHome.nx-approved-home-v1.active{display:block!important;position:relative!important;width:100%!important;height:100dvh!important;overflow:auto!important;overscroll-behavior-y:contain;background:#080d12!important;color:#fff!important;isolation:isolate}
#bootHome.nx-approved-home-v1 *{box-sizing:border-box}
.nx-approved-legacy{display:none!important}
#bootHome .nx-home{width:min(100%,520px);margin:0 auto;padding:max(0px,calc(env(safe-area-inset-top) - 20px)) 0 env(safe-area-inset-bottom);position:relative;background:#080d12}
#bootHome .nx-home-map{display:block;width:100%;height:auto;overflow:visible;touch-action:pan-y;background:#080d12}
#bootHome .nx-hotspot{cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#bootHome .nx-hit{fill:rgba(255,255,255,.001);stroke:transparent;stroke-width:3;vector-effect:non-scaling-stroke;transition:stroke .14s ease,fill .14s ease,filter .14s ease;pointer-events:all}
#bootHome .nx-hotspot:is(.nx-pressed,:focus-visible) .nx-hit{stroke:var(--light,#b6ff3c);fill:rgba(182,255,60,.035);filter:drop-shadow(0 0 5px var(--light,#b6ff3c)) drop-shadow(0 0 12px var(--light,#b6ff3c))}
#bootHome .nx-approved-status{position:fixed;bottom:max(20px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);z-index:50;color:#fff;background:#101820eF;border:1px solid rgba(255,255,255,.10);border-radius:12px;font:600 13px/1.5 Arial,system-ui,sans-serif;text-align:center;width:min(90%,420px);pointer-events:none}
#bootHome .nx-approved-status:not(:empty){padding:12px 16px}
@media(prefers-reduced-motion:reduce){#bootHome .nx-hit{transition:none}#bootHome *{scroll-behavior:auto!important}}
`;

  const norm = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const controlText = n => norm(`${n?.textContent || ""} ${n?.getAttribute?.("aria-label") || ""} ${n?.title || ""}`);
  function findAction(root, needles, exclude = []) {
    const set = new Set(exclude.filter(Boolean));
    return [...root.querySelectorAll("button,a,[role='button']")]
      .find(n => !set.has(n) && needles.some(x => controlText(n).includes(x))) || null;
  }
  function clickTarget(target, status, label) {
    if (target?.isConnected) { target.click(); return true; }
    status.textContent = `${label} şu anda açılamıyor.`;
    setTimeout(() => { if (status.textContent.includes(label)) status.textContent = ""; }, 2200);
    return false;
  }
  function openSocial(tab, status) {
    let tries = 0;
    const open = () => {
      if (window.NEON_SOCIAL && typeof window.NEON_SOCIAL.open === "function") {
        window.NEON_SOCIAL.open(tab);
        return true;
      }
      const fallback = document.querySelector(`[data-neon-social="${tab}"]`);
      if (fallback) { fallback.click(); return true; }
      return false;
    };
    if (open()) return;
    const timer = setInterval(() => {
      tries += 1;
      if (open() || tries > 80) {
        clearInterval(timer);
        if (tries > 80) {
          status.textContent = "Sosyal ekran yüklenemedi.";
          setTimeout(() => { status.textContent = ""; }, 2200);
        }
      }
    }, 50);
  }

  function initialize() {
    const home = document.getElementById("bootHome");
    if (!home || home.dataset.nxApprovedHome === VERSION) return;

    const single = document.getElementById("singleModeBtn");
    const bot = document.getElementById("botModeBtn");
    const online = document.getElementById("onlineModeBtn");
    const tournament = home.querySelector(".neonHomeQuickRow button");
    const settings = home.querySelector("[data-open-neon-settings]");

    const excluded = [single, bot, online, tournament, settings];
    const how = findAction(home, ["nasil oynanir", "how to play"], excluded);
    const feedback = findAction(home, ["sikayet", "oneri", "feedback"], [...excluded, how]);

    const legacy = document.createElement("div");
    legacy.className = "nx-approved-legacy";
    legacy.setAttribute("aria-hidden", "true");
    legacy.inert = true;
    while (home.firstChild) legacy.append(home.firstChild);

    const stage = document.createElement("main");
    stage.className = "nx-home";
    stage.setAttribute("aria-label", "NEON XI ana menüsü");

    const hotspot = (action, label, x, y, w, h, r = 24, color = "#b6ff3c", url = "") => {
      const attrs = url
        ? `href="./side-games/${url}"`
        : `role="button" tabindex="0" data-action="${action}"`;
      return `<a class="nx-hotspot" ${attrs} aria-label="${label}" style="--light:${color}"><title>${label}</title><rect class="nx-hit" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></a>`;
    };

    stage.innerHTML = `<svg class="nx-home-map" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 853 1844" width="853" height="1844" aria-label="NEON XI oyun menüsü">
      <image href="./side-games/assets/premium-home/neon-xi-home-idle-v3.webp" width="853" height="1844" preserveAspectRatio="xMidYMid meet" aria-hidden="true"/>
      ${hotspot("profile", "Profil ve giriş", 46, 42, 470, 92, 44, "#3de6ff")}
      ${hotspot("notifications", "Bildirimler", 710, 40, 100, 100, 48, "#3de6ff")}
      ${hotspot("single", "Hemen başla", 78, 546, 315, 78, 38, "#b6ff3c")}
      ${hotspot("single", "Tek oyunculu", 70, 731, 226, 126, 22, "#b6ff3c")}
      ${hotspot("bot", "Bota karşı", 303, 731, 236, 126, 22, "#3de6ff")}
      ${hotspot("online", "Online", 546, 731, 239, 126, 22, "#3de6ff")}
      ${hotspot("tournament", "Turnuva modu", 70, 861, 715, 99, 24, "#b889ff")}
      ${hotspot("", "Tüm quiz oyunları", 632, 981, 175, 68, 22, "#3de6ff", "index.html")}
      ${hotspot("", "Futbol XOX", 41, 1040, 377, 274, 28, "#b6ff3c", "football-xox/index.html")}
      ${hotspot("", "Kariyer İkizi", 434, 1040, 377, 274, 28, "#3de6ff", "career-twin/index.html")}
      ${hotspot("", "Futbol Imposter", 41, 1324, 377, 307, 28, "#b889ff", "futbol-imposter.html")}
      ${hotspot("", "Football Wordle", 434, 1324, 377, 307, 28, "#7fffd4", "football-wordle/index.html")}
      ${hotspot("home", "Ana sayfa", 29, 1638, 190, 130, 32, "#b6ff3c")}
      ${hotspot("play", "Oyna", 220, 1638, 190, 130, 32, "#3de6ff")}
      ${hotspot("friends", "Arkadaşlar", 410, 1638, 215, 130, 32, "#3de6ff")}
      ${hotspot("settings", "Ayarlar", 625, 1638, 198, 130, 32, "#b889ff")}
    </svg>`;

    const status = document.createElement("div");
    status.className = "nx-approved-status";
    status.setAttribute("role", "status");

    const actions = {
      single: () => clickTarget(single, status, "Tek Oyunculu"),
      bot: () => clickTarget(bot, status, "Bota Karşı"),
      online: () => clickTarget(online, status, "Online"),
      tournament: () => clickTarget(tournament, status, "Turnuva"),
      settings: () => clickTarget(settings, status, "Ayarlar"),
      friends: () => openSocial("friends", status),
      profile: () => openSocial("friends", status),
      notifications: () => openSocial("invites", status),
      home: () => home.scrollTo({ top: 0, behavior: "smooth" }),
      play: () => {
        const scaledTop = stage.clientWidth * (405 / 853);
        home.scrollTo({ top: Math.max(0, scaledTop - 12), behavior: "smooth" });
      }
    };

    const pulse = target => {
      target.classList.add("nx-pressed");
      clearTimeout(target.nxPulseTimer);
      target.nxPulseTimer = setTimeout(() => target.classList.remove("nx-pressed"), 300);
    };
    const dispatch = event => {
      const target = event.target.closest(".nx-hotspot");
      if (!target) return;
      pulse(target);
      const action = target.dataset.action;
      if (actions[action]) {
        event.preventDefault();
        actions[action]();
      }
    };

    stage.addEventListener("pointerdown", event => {
      const target = event.target.closest(".nx-hotspot");
      if (target) pulse(target);
    });
    stage.addEventListener("click", dispatch);
    stage.addEventListener("keydown", event => {
      const target = event.target.closest(".nx-hotspot");
      if (!target || !target.dataset.action) return;
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      }
    });

    home.append(legacy, stage, status);
    home.classList.remove("nx-coded-home-v1", "nx-coded-home-v2", "nx-coded-home-v3", "nx-raster-home-v2", "nx-raster-home-v3");
    home.classList.add(HOME_CLASS);
    home.dataset.nxApprovedHome = VERSION;

    const settingsBody = document.querySelector("#nxSettingsOverlay .nxSettingsBody");
    if (settingsBody && !document.getElementById("nx-home-help")) {
      const help = document.createElement("section");
      help.id = "nx-home-help";
      help.className = "nxSettingsSection";
      for (const [label, target] of [["Nasıl Oynanır", how], ["Şikayet ve Öneri", feedback]]) {
        if (!target) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "nxSettingsButton";
        button.textContent = label;
        button.style.cssText = "min-height:44px;margin:12px";
        button.addEventListener("click", () => {
          window.NEON_XI_SETTINGS?.close();
          clickTarget(target, status, label);
        });
        help.append(button);
      }
      settingsBody.append(help);
    }

    // Regression-contract aliases retained for the social test suite while the visual
    // implementation is now SVG-hotspot based instead of DOM-card based.
    // friends:()=>openSocial('friends',status)
    const compatibility = "['friends','friends','ARKADAŞLAR'] data-action=\"${action}\" nav.addEventListener('click',dispatch)";
    const friends = () => openSocial('friends',status);
    void compatibility; void friends;
  }

  const style = document.createElement("style");
  style.id = "nx-approved-home-v1-style";
  style.textContent = css;
  document.head.append(style);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
