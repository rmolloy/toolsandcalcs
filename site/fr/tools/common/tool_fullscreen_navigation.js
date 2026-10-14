(function defineToolFullscreenNavigation() {
  const channel = "tonelab.fullscreen-tools.v1";
  const toolNames = new Set(["resonance_reader", "dof_model", "plate_thickness", "monopole_mobility",
    "flexural_rigidity", "brace_calc", "fret_calculator", "guitar_setup_calculator", "fit_design"]);

  function toolDestinationRead(href, toolsRoot) {
    if (typeof href !== "string") return null;
    let url;
    try { url = new URL(href, toolsRoot); }
    catch { return null; }
    if (url.origin !== toolsRoot.origin || url.protocol !== toolsRoot.protocol) return null;
    const roots = [toolsRoot.pathname];
    if (toolsRoot.pathname === "/tools/") roots.push("/lab/tools/");
    if (toolsRoot.pathname === "/lab/tools/") roots.push("/tools/");
    const prefix = roots.find(root => url.pathname.startsWith(root));
    if (!prefix) return null;
    const relative = url.pathname.slice(prefix.length).replace(/(?:\/index\.html|\/)$/, "");
    const name = relative === "flexural_rigidity/brace_calc" ? "brace_calc" : relative;
    return toolNames.has(name) ? { name, url } : null;
  }

  class ToolFullscreenNavigation {
    constructor(runtime, scriptUrl) {
      this.runtime = runtime;
      this.document = runtime.document;
      this.toolsRoot = new URL("../", scriptUrl);
      this.rootHref = runtime.location.href.replace(/#tool=.*/, "");
      this.rootName = toolDestinationRead(this.rootHref, this.toolsRoot)?.name;
      this.rootTitle = this.document.title;
      this.frames = new Map();
      this.activeFrame = null;
      this.parentState = runtime.parent !== runtime && runtime.name.startsWith("tonelab-tool-")
        ? { active: false, enabled: false } : null;
      this.pendingToggle = null;
    }

    initialize() {
      if (this.initialized) return;
      this.initialized = true;
      this.document.addEventListener("click", event => this.linkFollow(event));
      this.document.addEventListener("fullscreenchange", () => this.stateBroadcast());
      this.runtime.addEventListener("message", event => this.messageReceive(event));
      this.runtime.addEventListener("popstate", () => this.historyRestore());
      this.parentSend({ type: "ready", title: this.document.title });
      this.historyRestore();
    }

    stateRead() {
      return this.parentState || {
        active: Boolean(this.document.fullscreenElement),
        enabled: Boolean(this.document.fullscreenEnabled),
      };
    }

    toggle() {
      if (!this.parentState) return this.nativeToggle();
      return new Promise((resolve, reject) => {
        const timeout = this.runtime.setTimeout(() => { this.pendingToggle = null; reject(new Error("Fullscreen host unavailable")); }, 3000);
        this.pendingToggle = { resolve, reject, timeout };
        this.parentSend({ type: "toggle" });
      });
    }

    nativeToggle() {
      if (this.document.fullscreenElement) return this.document.exitFullscreen();
      return this.document.documentElement.requestFullscreen();
    }

    navigate(href) {
      const target = toolDestinationRead(href, this.toolsRoot);
      if (!target || (!this.stateRead().active && !this.parentState && this.frames.size === 0)) return false;
      if (this.parentState) this.parentSend({ type: "navigate", href: target.url.href });
      else this.destinationShow(target, true);
      return true;
    }

    linkFollow(event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.("a[href]");
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href);
      if (url.hash && url.pathname === this.runtime.location.pathname && url.search === this.runtime.location.search) return;
      if (!this.navigate(url.href)) return;
      event.preventDefault();
      anchor.closest("details")?.removeAttribute("open");
    }

    destinationShow(target, pushHistory) {
      if (pushHistory) this.historyPush(target.url.href);
      this.activeVisibilitySet(false);
      const existing = this.frames.get(target.name);
      if (target.name === this.rootName && !existing && (!target.url.search || target.url.search === new URL(this.rootHref).search)) this.rootShow();
      else this.frameShow(target, existing);
    }

    frameShow(target, existing) {
      const entry = this.frameResolve(target, existing);
      this.activeFrame = entry;
      this.document.body.dataset.toolFrameActive = "true";
      entry.frame.hidden = false;
      this.frameSend(entry, { type: "visibility", visible: true });
      this.document.title = entry.title;
      this.runtime.scrollTo(0, 0);
    }

    frameResolve(target, existing) {
      if (!existing) return this.frameCreate(target);
      if (!target.url.search || existing.href === target.url.href) return existing;
      existing.frame.remove();
      return this.frameCreate(target);
    }

    frameCreate(target) {
      const frame = this.document.createElement("iframe");
      const title = target.name.replaceAll("_", " ");
      const entry = { frame, title, href: target.url.href, token: `tonelab-tool-${this.runtime.crypto.randomUUID()}` };
      frame.name = entry.token;
      frame.title = title;
      frame.allow = target.url.protocol === "file:" ? "fullscreen; microphone *" : "fullscreen; microphone";
      frame.src = entry.href;
      frame.hidden = true;
      this.frames.set(target.name, entry);
      this.framesContainer().appendChild(frame);
      return entry;
    }

    framesContainer() {
      const existing = this.document.querySelector(".tool-fullscreen-frames");
      if (existing) return existing;
      const container = this.document.createElement("div");
      container.className = "tool-fullscreen-frames";
      this.document.body.appendChild(container);
      return container;
    }

    rootShow() {
      this.activeFrame = null;
      delete this.document.body.dataset.toolFrameActive;
      this.document.title = this.rootTitle;
      this.visibilityDispatch(true);
    }

    activeVisibilitySet(visible) {
      if (!this.activeFrame) return this.visibilityDispatch(visible);
      this.frameSend(this.activeFrame, { type: "visibility", visible });
      this.activeFrame.frame.hidden = !visible;
    }

    visibilityDispatch(visible) {
      this.runtime.dispatchEvent(new this.runtime.CustomEvent("tool-visibility-change", { detail: { visible } }));
      if (visible) this.runtime.dispatchEvent(new this.runtime.Event("resize"));
    }

    historyPush(href) {
      if (!this.runtime.history.state?.toolFullscreenHref) {
        this.runtime.history.replaceState({ ...this.runtime.history.state, toolFullscreenHref: this.rootHref }, "");
      }
      this.runtime.history.pushState({ toolFullscreenHref: href }, "", `#tool=${encodeURIComponent(href)}`);
    }

    historyRestore() {
      if (this.parentState) return;
      const href = this.runtime.history.state?.toolFullscreenHref || this.historyHrefRead();
      if (!href) return;
      const target = toolDestinationRead(href, this.toolsRoot);
      if (target) this.destinationShow(target, false);
    }

    historyHrefRead() {
      const hash = this.runtime.location.hash;
      if (!hash.startsWith("#tool=")) return null;
      try { return decodeURIComponent(hash.slice(6)); }
      catch { return null; }
    }

    parentSend(message) {
      if (this.runtime.parent === this.runtime || !this.runtime.name.startsWith("tonelab-tool-")) return;
      this.runtime.parent.postMessage({ channel, token: this.runtime.name, ...message }, "*");
    }

    frameSend(entry, message) {
      entry.frame.contentWindow?.postMessage({ channel, token: entry.token, ...message }, "*");
    }

    messageReceive(event) {
      if (event.data?.channel !== channel) return;
      if (event.source === this.runtime.parent && this.runtime.parent !== this.runtime && event.data.token === this.runtime.name) {
        this.parentMessageReceive(event.data);
        return;
      }
      const entry = [...this.frames.values()].find(item => item.frame.contentWindow === event.source && item.token === event.data.token);
      if (entry) this.frameMessageReceive(entry, event.data);
    }

    parentMessageReceive(message) {
      if (message.type === "state") {
        this.parentState = { active: message.active === true, enabled: message.enabled === true };
        this.document.dispatchEvent(new this.runtime.Event("tool-fullscreen-change"));
      }
      if (message.type === "visibility") this.visibilityDispatch(message.visible === true);
      if (message.type === "toggle-result" && this.pendingToggle) this.toggleComplete(message.ok);
    }

    frameMessageReceive(entry, message) {
      if (message.type === "ready") {
        entry.title = String(message.title || entry.title);
        entry.frame.title = entry.title;
        if (entry === this.activeFrame) this.document.title = entry.title;
        this.frameSend(entry, { type: "state", ...this.stateRead() });
      }
      if (entry !== this.activeFrame) return;
      if (message.type === "navigate") this.navigate(message.href);
      if (message.type === "toggle") void this.frameToggle(entry);
    }

    async frameToggle(entry) {
      try { await this.nativeToggle(); this.frameSend(entry, { type: "toggle-result", ok: true }); }
      catch { this.frameSend(entry, { type: "toggle-result", ok: false }); }
      this.stateBroadcast();
    }

    toggleComplete(ok) {
      const pending = this.pendingToggle;
      this.pendingToggle = null;
      this.runtime.clearTimeout(pending.timeout);
      if (ok) pending.resolve();
      else pending.reject(new Error("Fullscreen denied"));
    }

    stateBroadcast() {
      for (const entry of this.frames.values()) this.frameSend(entry, { type: "state", ...this.stateRead() });
    }
  }

  if (typeof window === "undefined") {
    module.exports = { ToolFullscreenNavigation, toolDestinationRead };
    return;
  }
  const navigation = new ToolFullscreenNavigation(window, document.currentScript.src);
  window.ToolFullscreenNavigation = navigation;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => navigation.initialize());
  else navigation.initialize();
})();
