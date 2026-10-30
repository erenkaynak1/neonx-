(() => {
  "use strict";

  if (window.NEON_XI_DRAFT_MOBILE?.version) return;

  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const draftScreen = document.getElementById("draftScreen");
  const tacticsScreen = document.getElementById("tacticsScreen");
  const completeScreen = document.getElementById("complete");
  const validViews = new Set(["pool", "team-a", "team-b"]);
  let activeView = "pool";
  let nav = null;
  let squadPeek = null;
  let squadPeekSignature = "";
  let lastTurnTeam = "A";
  let refreshQueued = false;
  let prematchWasActive = false;

  function isVisible(element) {
    return Boolean(element && !element.classList.contains("hidden"));
  }

  function countFor(team) {
    const metric = document.querySelector(`#teamCard${team} .metric b`);
    return metric?.textContent?.trim() || "0/11";
  }

  function turnLabel() {
    const sub = document.getElementById("turnSub")?.textContent || "";
    const selection = sub.match(/Seçim\s+(\d+)/i)?.[1];
    return selection ? `Seçim ${selection}` : "Oyuncu seç";
  }

  function currentTurnTeam() {
    const turn = document.getElementById("turnText")?.textContent || "";
    const match = turn.match(/Takım\s+([AB])/i);
    if (match) lastTurnTeam = match[1].toUpperCase();
    return lastTurnTeam;
  }

  function metricsFor(team) {
    const values = [...document.querySelectorAll(`#teamCard${team} .teamStats .metric b`)]
      .map(metric => metric.textContent?.trim() || "");
    return {
      count: values[0] || "0/11",
      chemistry: values[1] || "0.0/10"
    };
  }

  function ensureNavigation() {
    if (!draftScreen) return null;
    nav = document.getElementById("nxDraftMobileNav");
    if (nav) return nav;

    nav = document.createElement("nav");
    nav.id = "nxDraftMobileNav";
    nav.className = "nxDraftMobileNav";
    nav.setAttribute("aria-label", "Draft görünümü");
    nav.innerHTML = `
      <button type="button" data-draft-view="team-a">
        <span>Takım A</span><b data-draft-count="A">0/11</b>
      </button>
      <button type="button" data-draft-view="pool" class="active">
        <span>Oyuncu Havuzu</span><b data-draft-turn>Oyuncu seç</b>
      </button>
      <button type="button" data-draft-view="team-b">
        <span>Takım B</span><b data-draft-count="B">0/11</b>
      </button>`;

    const title = draftScreen.querySelector(":scope > .screenTitle");
    title?.insertAdjacentElement("afterend", nav);

    nav.addEventListener("click", event => {
      const button = event.target.closest("[data-draft-view]");
      if (!button) return;
      setView(button.dataset.draftView, true);
    });
    return nav;
  }

  function ensureSquadPeek() {
    if (!draftScreen) return null;
    squadPeek = document.getElementById("nxDraftSquadPeek");
    if (squadPeek) return squadPeek;

    squadPeek = document.createElement("section");
    squadPeek.id = "nxDraftSquadPeek";
    squadPeek.className = "nxDraftSquadPeek";
    squadPeek.setAttribute("aria-label", "Aktif takımın canlı formasyonu");
    squadPeek.innerHTML = `
      <header class="nxDraftSquadPeekHead">
        <div class="nxDraftSquadPeekIdentity">
          <span>Aktif kadro</span>
          <strong data-nx-squad-team>Takım A</strong>
          <small data-nx-squad-metrics>Kadro 0/11 · Kimya 0.0/10</small>
        </div>
        <label class="nxDraftSquadFormation">
          <span>Formasyon</span>
          <select data-nx-squad-formation aria-label="Aktif takım formasyonu"></select>
        </label>
        <button type="button" data-nx-open-squad>Kadroyu Aç</button>
      </header>
      <div class="nxDraftChemLegend" aria-label="Kimya renkleri">
        <b>Kimya</b>
        <span><i class="good"></i>İyi</span>
        <span><i class="mid"></i>Orta</span>
        <span><i class="bad"></i>Zayıf</span>
      </div>
      <div class="pitch nxDraftSquadPeekPitch" data-nx-squad-pitch aria-hidden="true"></div>`;

    ensureNavigation()?.insertAdjacentElement("afterend", squadPeek);
    squadPeek.querySelector("[data-nx-open-squad]")?.addEventListener("click", () => {
      setView(`team-${currentTurnTeam().toLowerCase()}`, true);
    });
    squadPeek.querySelector("[data-nx-squad-formation]")?.addEventListener("change", event => {
      const team = currentTurnTeam();
      const source = document.querySelector(`#teamCard${team} .formationSelect[data-team="${team}"]`);
      if (!source || source.disabled) {
        event.target.value = source?.value || event.target.value;
        return;
      }
      source.value = event.target.value;
      source.dispatchEvent(new Event("change", { bubbles: true }));
      queueRefresh();
    });
    return squadPeek;
  }

  function ensureTopbarLogo() {
    const topbar = document.querySelector(".topbar");
    if (!topbar) return null;
    let logo = document.getElementById("nxDraftTopLogo");
    if (logo) return logo;

    logo = document.createElement("div");
    logo.id = "nxDraftTopLogo";
    logo.className = "nxDraftTopLogo";
    const image = document.createElement("img");
    image.src = "./assets/neon-xi-logo-outline.png";
    image.alt = "NEON XI";
    logo.appendChild(image);
    topbar.querySelector(".topMeta")?.insertAdjacentElement("beforebegin", logo);
    return logo;
  }

  function refreshSquadPeek() {
    const peek = ensureSquadPeek();
    if (!peek) return;

    const team = currentTurnTeam();
    const sourcePitch = document.querySelector(`#teamCard${team} .pitch`);
    const sourceFormation = document.querySelector(`#teamCard${team} .formationSelect[data-team="${team}"]`);
    const metrics = metricsFor(team);
    const pitchHTML = sourcePitch?.innerHTML || "";
    const formationValue = sourceFormation?.value || "";
    const formationOptions = sourceFormation?.innerHTML || "";
    const formationDisabled = Boolean(sourceFormation?.disabled);
    const formationSelect = peek.querySelector("[data-nx-squad-formation]");
    const signature = `${team}|${metrics.count}|${metrics.chemistry}|${formationValue}|${formationDisabled}|${pitchHTML}`;
    document.body.dataset.nxDraftTurn = team;

    if (formationSelect && sourceFormation) {
      if (formationSelect.innerHTML !== formationOptions) formationSelect.innerHTML = formationOptions;
      formationSelect.value = formationValue;
      formationSelect.disabled = formationDisabled;
      formationSelect.setAttribute("aria-label", `Takım ${team} formasyonu`);
      formationSelect.title = sourceFormation.title || (formationDisabled
        ? "İlk seçimden sonra formasyon kilitlenir."
        : "Formasyonu ilk oyuncu seçimine kadar değiştirebilirsin.");
    }

    if (signature === squadPeekSignature) return;
    squadPeekSignature = signature;
    const teamLabel = peek.querySelector("[data-nx-squad-team]");
    const metricLabel = peek.querySelector("[data-nx-squad-metrics]");
    const pitch = peek.querySelector("[data-nx-squad-pitch]");
    if (teamLabel) teamLabel.textContent = `Takım ${team}`;
    if (metricLabel) metricLabel.textContent = `Kadro ${metrics.count} · Kimya ${metrics.chemistry}`;
    if (pitch) pitch.innerHTML = pitchHTML;
  }

  function setView(nextView, focusPanel = false) {
    if (!validViews.has(nextView)) nextView = "pool";
    activeView = nextView;
    document.body.dataset.nxDraftView = activeView;

    ensureNavigation()?.querySelectorAll("[data-draft-view]").forEach(button => {
      const selected = button.dataset.draftView === activeView;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-current", selected ? "page" : "false");
    });

    if (focusPanel && mobileQuery.matches) {
      nav?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function refreshCounters() {
    ensureNavigation();
    const a = nav?.querySelector('[data-draft-count="A"]');
    const b = nav?.querySelector('[data-draft-count="B"]');
    const turn = nav?.querySelector("[data-draft-turn]");
    if (a) a.textContent = countFor("A");
    if (b) b.textContent = countFor("B");
    if (turn) turn.textContent = turnLabel();
    refreshSquadPeek();
  }

  function refreshMode() {
    refreshQueued = false;
    const draftActive = isVisible(draftScreen);
    const tacticsActive = isVisible(tacticsScreen);
    const prematchActive = isVisible(completeScreen) && completeScreen?.classList.contains("nx-prematch");
    document.body.classList.toggle("nx-draft-active", draftActive);
    document.body.classList.toggle("nx-tactics-active", tacticsActive);
    document.body.classList.toggle("nx-prematch-active", prematchActive);

    if (prematchActive) {
      draftScreen?.classList.add("hidden");
      tacticsScreen?.classList.add("hidden");
      document.getElementById("tacticFooter")?.classList.add("hidden");
      document.getElementById("handover")?.classList.add("hidden");
      document.getElementById("stageLabel")?.replaceChildren("Analiz");
      ensureTopbarLogo();
      if (!prematchWasActive) {
        completeScreen.scrollTop = 0;
        window.scrollTo(0, 0);
      }
    }
    prematchWasActive = prematchActive;

    if (draftActive) {
      ensureTopbarLogo();
      ensureNavigation();
      setView(activeView);
      refreshCounters();
    } else if (tacticsActive || prematchActive) {
      ensureTopbarLogo();
    }
  }

  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(refreshMode);
  }

  const observer = new MutationObserver(queueRefresh);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class"]
  });

  mobileQuery.addEventListener?.("change", () => {
    if (!mobileQuery.matches) setView("pool");
    queueRefresh();
  });
  window.addEventListener("hashchange", queueRefresh);
  window.addEventListener("neon-xi-route-changed", queueRefresh);

  ensureNavigation();
  ensureSquadPeek();
  ensureTopbarLogo();
  setView("pool");
  refreshMode();

  window.NEON_XI_DRAFT_MOBILE = {
    version: "1.5.0",
    setView,
    refresh: refreshMode,
    get view() { return activeView; }
  };
})();
