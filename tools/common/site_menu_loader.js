(function attachSiteMenus() {
  function menuConfigUrlResolve(panel) {
    return panel.getAttribute("data-menu-config") || "../common/site_menu.json";
  }

  async function menuConfigLoadFromUrl(url) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  function menuItemsResolve(panel, config) {
    if (Array.isArray(config.items)) return config.items;
    const profile = panel.getAttribute("data-menu-profile") || config.activeProfile || "tonelab";
    const profiles = config.profiles || {};
    return Array.isArray(profiles[profile]) ? profiles[profile] : [];
  }

  function menuItemAnchorBuild(item) {
    const anchor = document.createElement("a");
    anchor.textContent = String(item.label || "");
    anchor.href = String(item.href || "#");
    if (typeof item.className === "string" && item.className) anchor.className = item.className;
    if (typeof item.ariaCurrent === "string" && item.ariaCurrent) anchor.setAttribute("aria-current", item.ariaCurrent);
    return anchor;
  }

  function menuPanelPopulate(panel, items) {
    panel.innerHTML = "";
    items.forEach((item) => panel.appendChild(menuItemAnchorBuild(item || {})));
  }

  function menuToggleVisibilitySync(panel, items, hideWhenEmpty) {
    const details = panel.closest("details.hero-menu");
    if (!details) return;
    const shouldHide = Boolean(hideWhenEmpty) && items.length === 0;
    details.hidden = shouldHide;
  }

  async function siteMenusAttach() {
    const panels = document.querySelectorAll("nav.hero-menu-panel[data-site-menu]");
    for (const panel of panels) {
      const config = (await menuConfigLoadFromUrl(menuConfigUrlResolve(panel))) || {};
      const items = menuItemsResolve(panel, config);
      menuPanelPopulate(panel, items);
      menuToggleVisibilitySync(panel, items, config.hideWhenEmpty !== false);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", siteMenusAttach);
    return;
  }
  siteMenusAttach();
})(typeof window !== "undefined" ? window : globalThis);
