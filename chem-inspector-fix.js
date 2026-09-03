(() => {
  "use strict";

  const BUTTON_ID = "nxChemFloatingClose";
  const STYLE_ID = "nxChemFloatingCloseStyle";
  let lastInspector = null;
  let wasOpen = false;
  let raf = 0;

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID}{
        position:fixed;z-index:10050;width:44px;height:44px;
        display:none;place-items:center;padding:0;margin:0;
        border:1px solid rgba(190,255,45,.68);border-radius:14px;
        background:rgba(2,12,7,.96);color:#e7ff8a;
        font:900 25px/1 system-ui,-apple-system,sans-serif;
        box-shadow:0 8px 26px rgba(0,0,0,.58),0 0 18px rgba(186,255,24,.16);
        -webkit-tap-highlight-color:transparent;touch-action:manipulation;
        backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)
      }
      #${BUTTON_ID}.show{display:grid}
      #${BUTTON_ID}:active{transform:scale(.96)}
    `;
    document.head.appendChild(style);
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 40 && rect.height > 40 && rect.bottom > 0 && rect.right > 0;
  }

  function findNativeClose(inspector) {
    const inspectorRect = inspector.getBoundingClientRect();
    const candidates = [...inspector.querySelectorAll("button,[role='button'],[data-close],[aria-label],[title],[onclick],[class*='close'],[id*='close']")];
    let best = null;
    let bestScore = -Infinity;

    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;

      const text = (el.textContent || "").trim();
      const meta = `${text} ${el.getAttribute("aria-label") || ""} ${el.getAttribute("title") || ""} ${el.getAttribute("data-action") || ""} ${typeof el.className === "string" ? el.className : ""} ${el.id || ""}`.toLocaleLowerCase("tr-TR");
      let score = 0;

      if (/(kapat|close|dismiss)/.test(meta)) score += 120;
      if (/^(x|×|✕|✖)$/i.test(text)) score += 100;
      if (rect.width <= 84 && rect.height <= 84) score += 10;
      score += Math.max(0, 32 - Math.abs(inspectorRect.right - rect.right) / 4);
      score += Math.max(0, 32 - Math.abs(inspectorRect.top - rect.top) / 4);

      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    return bestScore >= 40 ? best : null;
  }

  function getButton() {
    let button = document.getElementById(BUTTON_ID);
    if (button) return button;

    button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "×";
    button.setAttribute("aria-label", "Kimya ekranını kapat");
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const inspector = document.getElementById("chemInspector");
      if (!inspector) return;

      const nativeClose = findNativeClose(inspector);
      if (nativeClose) {
        nativeClose.click();
      } else {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      }
      requestAnimationFrame(sync);
    });
    document.body.appendChild(button);
    return button;
  }

  function positionButton(inspector, button) {
    const rect = inspector.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportWidth = viewport ? viewport.width : window.innerWidth;
    const viewportHeight = viewport ? viewport.height : window.innerHeight;
    const offsetLeft = viewport ? viewport.offsetLeft : 0;
    const offsetTop = viewport ? viewport.offsetTop : 0;
    const size = 44;
    const gap = 8;

    let left = Math.min(rect.right - size - gap, offsetLeft + viewportWidth - size - 8);
    left = Math.max(offsetLeft + 8, left);

    let top = Math.max(offsetTop + 8, rect.top + gap);
    top = Math.min(top, offsetTop + viewportHeight - size - 8);

    const nextLeft = `${Math.round(left)}px`;
    const nextTop = `${Math.round(top)}px`;
    if (button.style.left !== nextLeft) button.style.left = nextLeft;
    if (button.style.top !== nextTop) button.style.top = nextTop;
  }

  function sync() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const inspector = document.getElementById("chemInspector");
      const open = isVisible(inspector);
      const button = getButton();

      if (!open) {
        button.classList.remove("show");
        wasOpen = false;
        lastInspector = inspector || null;
        return;
      }

      if (!wasOpen || lastInspector !== inspector) {
        inspector.scrollTop = 0;
      }

      lastInspector = inspector;
      wasOpen = true;
      inspector.style.overscrollBehavior = "contain";
      inspector.style.webkitOverflowScrolling = "touch";
      positionButton(inspector, button);
      button.classList.add("show");
    });
  }

  installStyle();
  const observer = new MutationObserver(mutations => {
    const ownButton = document.getElementById(BUTTON_ID);
    if (ownButton && mutations.length && mutations.every(m => m.target === ownButton || ownButton.contains(m.target))) return;
    sync();
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "style", "hidden", "aria-hidden"]
  });

  document.addEventListener("click", () => requestAnimationFrame(sync), true);
  window.addEventListener("resize", sync, { passive: true });
  window.addEventListener("scroll", sync, { passive: true });
  window.visualViewport?.addEventListener("resize", sync, { passive: true });
  window.visualViewport?.addEventListener("scroll", sync, { passive: true });
  sync();
})();
