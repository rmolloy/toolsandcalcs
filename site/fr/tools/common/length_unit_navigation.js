(function attachLengthUnitNavigation(runtime) {
  const PARAMETER = 'tl-length-unit';

  function createLengthUnitNavigation(runtime, controller, scriptUrl) {
    if (runtime.location.protocol !== 'file:' || !controller) return null;
    return new LengthUnitNavigation(runtime, controller, new URL('../', scriptUrl));
  }

  class LengthUnitNavigation {
    constructor(runtime, controller, toolsRoot) {
      Object.assign(this, { runtime, controller, toolsRoot });
    }

    attach() {
      this.controller.subscribe(({ unit }) => this.refreshCurrentUnit(unit));
      this.runtime.document.addEventListener('click', (event) => this.prepareAnchor(event), true);
    }

    destinationHref(href) {
      const destination = readDestination(href, this.runtime.location.href);
      const roots = readPublishedToolRoots(this.runtime, this.toolsRoot);
      if (!roots.some((root) => isPackagedTool(destination, root))) return href;
      destination.searchParams.set(PARAMETER, this.controller.read());
      return destination.href;
    }

    refreshCurrentUnit(unit) {
      const current = new URL(this.runtime.location.href);
      if (current.searchParams.get(PARAMETER) === unit) return;
      current.searchParams.set(PARAMETER, unit);
      replaceCurrentUrl(this.runtime, current.href);
    }

    prepareAnchor(event) {
      if (!isOrdinaryClick(event) || hasFullscreenNavigation(this.runtime)) return;
      const anchor = event.target.closest?.('a[href]');
      if (!isOrdinaryAnchor(anchor)) return;
      anchor.href = this.destinationHref(anchor.getAttribute('href'));
    }
  }

  function readDestination(href, currentHref) {
    if (typeof href !== 'string' || !href.trim() || href.trim().startsWith('#')) return null;
    try { return new URL(href, currentHref); }
    catch { return null; }
  }

  function readPublishedToolRoots(runtime, toolsRoot) {
    const toolPath = runtime.location.pathname.slice(toolsRoot.pathname.length);
    const locales = readPublishedLocales(runtime.document);
    const roots = locales.map((locale) => readLocaleToolRoot(locale?.href, runtime.location.href, toolPath));
    return [toolsRoot, ...roots.filter(Boolean)];
  }

  function readPublishedLocales(document) {
    const config = document.getElementById('tool_locale_config');
    try { return readLocaleArray(JSON.parse(config?.textContent || '{}')); }
    catch { return []; }
  }

  function readLocaleArray(config) {
    return Array.isArray(config?.locales) ? config.locales : [];
  }

  function readLocaleToolRoot(href, currentHref, toolPath) {
    const destination = readDestination(href, currentHref);
    if (!destination?.pathname.endsWith(`/tools/${toolPath}`)) return null;
    destination.pathname = destination.pathname.slice(0, -toolPath.length);
    return destination;
  }

  function isPackagedTool(destination, toolsRoot) {
    if (!destination || destination.protocol !== 'file:' || toolsRoot.protocol !== 'file:') return false;
    if (destination.host !== toolsRoot.host || !destination.pathname.startsWith(toolsRoot.pathname)) return false;
    return /^(?:[^/]+\/)+index\.html$/.test(destination.pathname.slice(toolsRoot.pathname.length));
  }

  function isOrdinaryClick(event) {
    return !event.defaultPrevented && event.button === 0
      && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  }

  function isOrdinaryAnchor(anchor) {
    if (!anchor || anchor.hasAttribute('download')) return false;
    return !anchor.target || anchor.target === '_self';
  }

  function hasFullscreenNavigation(runtime) {
    const navigation = runtime.ToolFullscreenNavigation;
    return Boolean(navigation?.stateRead().active || navigation?.parentState || navigation?.frames?.size);
  }

  function replaceCurrentUrl(runtime, href) {
    try { runtime.history.replaceState(runtime.history.state, '', href); }
    catch { return; }
  }

  const api = Object.freeze({ createLengthUnitNavigation });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!runtime.document) return;
  runtime.ToolLengthUnitNavigation = createLengthUnitNavigation(runtime, runtime.ToolLengthUnits, runtime.document.currentScript?.src);
  runtime.ToolLengthUnitNavigation?.attach();
})(typeof window !== 'undefined' ? window : globalThis);
