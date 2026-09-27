(function attachPageFullscreen() {
  function pageFullscreenInitialize(document = window.document) {
    pageFullscreenControlMount(document);
    const button = document.querySelector("#btn_fullscreen");
    if (!button || button.dataset.fullscreenBound) return;
    button.dataset.fullscreenBound = "true";
    button.addEventListener("click", () => void pageFullscreenToggle(document, button));
    document.addEventListener("fullscreenchange", () => pageFullscreenButtonRender(document, button));
    document.addEventListener("tool-fullscreen-change", () => pageFullscreenButtonRender(document, button));
    pageFullscreenButtonRender(document, button);
  }

  function pageFullscreenControlMount(document) {
    if (document.getElementById("btn_fullscreen")) return;
    const actions = document.querySelector(".hero-actions, .fit-actions");
    if (!actions) return;
    const button = pageFullscreenButtonCreate(document);
    actions.insertBefore(button, actions.querySelector(".hero-help-link") || actions.firstChild);
    const status = document.createElement("span");
    status.id = "fullscreen_status";
    status.className = "sr-only";
    status.setAttribute("role", "status");
    actions.appendChild(status);
  }

  function pageFullscreenButtonCreate(document) {
    const button = document.createElement("button");
    button.id = "btn_fullscreen";
    button.type = "button";
    button.className = "hero-icon-button";
    button.disabled = true;
    // Unmodified Lucide maximize/minimize icons; see lucide-LICENSE.txt.
    button.innerHTML = `
      <svg data-fullscreen-enter xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
      </svg>
      <svg data-fullscreen-exit xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" hidden>
        <path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" />
      </svg>`;
    return button;
  }

  async function pageFullscreenToggle(document, button) {
    button.disabled = true;
    try {
      await pageFullscreenRequest(document);
      pageFullscreenButtonRender(document, button);
    } catch {
      pageFullscreenButtonRender(document, button);
      pageFullscreenFailureReport(document, button);
    }
  }

  function pageFullscreenRequest(document) {
    const navigation = document.defaultView?.ToolFullscreenNavigation;
    if (navigation) return navigation.toggle();
    if (document.fullscreenElement) return document.exitFullscreen();
    return document.documentElement.requestFullscreen();
  }

  function pageFullscreenButtonRender(document, button) {
    const state = document.defaultView?.ToolFullscreenNavigation?.stateRead();
    const active = state ? state.active : Boolean(document.fullscreenElement);
    const enabled = state ? state.enabled : Boolean(document.fullscreenEnabled);
    button.disabled = !enabled;
    button.setAttribute("aria-pressed", String(active));
    pageFullscreenLabelRender(button, enabled ? (active ? "Exit fullscreen" : "Enter fullscreen") : "Fullscreen unavailable in this browser or embedded page");
    pageFullscreenIconsRender(button, active);
    document.getElementById("fullscreen_status")?.replaceChildren();
  }

  function pageFullscreenLabelRender(button, label) {
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  function pageFullscreenIconsRender(button, active) {
    button.querySelector("[data-fullscreen-enter]")?.toggleAttribute("hidden", active);
    button.querySelector("[data-fullscreen-exit]")?.toggleAttribute("hidden", !active);
  }

  function pageFullscreenFailureReport(document, button) {
    const message = "Fullscreen could not be changed. Your current analysis is unchanged.";
    button.title = message;
    document.getElementById("fullscreen_status")?.replaceChildren(message);
  }

  if (typeof window === "undefined" && typeof module === "object" && module.exports) {
    module.exports = { pageFullscreenInitialize };
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => pageFullscreenInitialize());
  } else {
    pageFullscreenInitialize();
  }
})();
